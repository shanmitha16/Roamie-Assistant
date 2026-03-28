import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X, Volume2, Languages, Sparkles } from 'lucide-react';
import api from '../lib/api';

const LANGS = [
  { code:'en',label:'English' },{ code:'hi',label:'Hindi' },{ code:'es',label:'Spanish' },
  { code:'fr',label:'French' },{ code:'ja',label:'Japanese' },{ code:'de',label:'German' },
  { code:'zh',label:'Chinese' },{ code:'ar',label:'Arabic' },{ code:'ko',label:'Korean' },{ code:'ta',label:'Tamil' },
];

export default function VoiceTranslateWidget() {
  const [open, setOpen]         = useState(false);
  const [listening, setListen]  = useState(false);
  const [transcript, setTxt]    = useState('');
  const [translated, setTrans]  = useState('');
  const [lang, setLang]         = useState('hi');
  const [loading, setLoad]      = useState(false);
  const [error, setErr]         = useState('');
  const [levels, setLevels]     = useState<number[]>(Array(7).fill(10));
  const recRef = useRef<any>(null);

  useEffect(() => {
    let id: any;
    if (listening) id = setInterval(() => setLevels(Array.from({length:7},()=>8+Math.random()*22)), 90);
    else setLevels(Array(7).fill(10));
    return () => clearInterval(id);
  }, [listening]);

  const startListen = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setErr('Speech recognition not supported.'); return; }
    const r = new SR();
    r.continuous = false; r.interimResults = true; r.lang = 'en-US';
    r.onresult = (e: any) => setTxt(e.results[e.results.length-1][0].transcript);
    r.onend    = () => setListen(false);
    r.onerror  = (e: any) => { setListen(false); if (e.error==='not-allowed') setErr('Microphone access denied.'); };
    recRef.current = r; r.start(); setListen(true); setErr(''); setTrans('');
  };
  const stopListen = () => { recRef.current?.stop(); setListen(false); };

  const translate = async () => {
    if (!transcript.trim()) return;
    setLoad(true); setErr('');
    try {
      const { data } = await api.post('/translate', {
        text: transcript, sourceLang: 'English',
        targetLang: LANGS.find(l=>l.code===lang)?.label || lang,
      });
      setTrans(data.translated);
    } catch { setErr('Translation failed.'); }
    setLoad(false);
  };

  const speak = () => {
    if (!translated || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(translated);
    u.lang = lang; u.rate = 0.9;
    window.speechSynthesis.speak(u);
  };

  return (
    <>
      {/* Floating button with pulse ring */}
      <div style={{ position:'fixed', bottom:28, right:28, zIndex:1000 }}>
        {!open && (
          <motion.div
            animate={{ scale:[1,1.15,1] }} transition={{ repeat:Infinity, duration:2.5, ease:'easeInOut' }}
            style={{ position:'absolute', inset:-6, borderRadius:'50%', background:'rgba(229,88,3,0.2)', zIndex:-1 }} />
        )}
        <motion.button whileHover={{ scale:1.08 }} whileTap={{ scale:0.93 }} onClick={() => setOpen(!open)}
          style={{ width:54, height:54, borderRadius:'50%', background: open?'#0e2125':'#e55803', color:'#fff6e0', display:'flex', alignItems:'center', justifyContent:'center', border:'none', cursor:'pointer', boxShadow:'0 4px 20px rgba(229,88,3,0.35)' }}>
          <Languages size={22}/>
        </motion.button>
      </div>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity:0, y:20, scale:0.95 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, y:20, scale:0.95 }}
            style={{ position:'fixed', bottom:96, right:28, zIndex:1001, width:320, background:'#fff', border:'1px solid #f0dfc0', borderRadius:20, boxShadow:'0 20px 60px rgba(14,33,37,0.18)', overflow:'hidden' }}>

            {/* Header */}
            <div style={{ background:'#0e2125', padding:'14px 18px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Sparkles size={15} style={{ color:'#e55803' }}/>
                <span style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, color:'#fff6e0' }}>Live Translator</span>
              </div>
              <button onClick={() => setOpen(false)} style={{ color:'rgba(255,246,224,0.5)', background:'none', border:'none', cursor:'pointer', padding:4 }}>
                <X size={18}/>
              </button>
            </div>

            <div style={{ padding:18 }}>
              {/* Language selector */}
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:10, background:'#f5e8ca', border:'1px solid #f0dfc0', marginBottom:18 }}>
                <span style={{ fontSize:11, fontWeight:700, color:'#6b5c45', textTransform:'uppercase', letterSpacing:'0.08em', whiteSpace:'nowrap' }}>Translate to</span>
                <select value={lang} onChange={e=>setLang(e.target.value)}
                  style={{ flex:1, background:'transparent', border:'none', outline:'none', fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:14, color:'#0e2125', cursor:'pointer' }}>
                  {LANGS.map(l=><option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </div>

              {/* Visualizer + mic */}
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14, marginBottom:16 }}>
                <div style={{ display:'flex', alignItems:'center', gap:4, height:40 }}>
                  {levels.map((h,i)=>(
                    <motion.div key={i} animate={{ height:h }}
                      style={{ width:4, borderRadius:99, background: listening?'#e55803':'#f0dfc0', transition:'background 0.2s' }}/>
                  ))}
                </div>
                <motion.button whileHover={{ scale:1.08 }} whileTap={{ scale:0.93 }}
                  onClick={listening ? stopListen : startListen}
                  style={{ width:64, height:64, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.2s',
                    background: listening?'rgba(229,88,3,0.12)':'#fde8d8',
                    border: listening?'2.5px solid #e55803':'2.5px solid #fdba74',
                    color: listening?'#e55803':'#c44a00',
                    boxShadow: listening?'0 0 0 6px rgba(229,88,3,0.12)':'none' }}>
                  {listening ? <MicOff size={26}/> : <Mic size={26}/>}
                </motion.button>
                <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color: listening?'#e55803':'#6b5c45' }}>
                  {listening ? '● Recording…' : 'Tap to speak'}
                </p>
              </div>

              {/* Transcript */}
              {transcript && (
                <div style={{ marginBottom:12, padding:'10px 14px', borderRadius:10, background:'#f5e8ca', border:'1px solid #f0dfc0' }}>
                  <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#6b5c45', marginBottom:4 }}>Source (EN)</p>
                  <p style={{ fontSize:14, color:'#0e2125', fontWeight:500 }}>{transcript}</p>
                </div>
              )}

              {/* Translate button */}
              {transcript && !listening && !translated && (
                <button className="btn btn-primary" style={{ width:'100%', marginBottom:12 }} disabled={loading} onClick={translate}>
                  {loading
                    ? <><motion.span animate={{ rotate:360 }} transition={{ repeat:Infinity,duration:1 }}><Sparkles size={15}/></motion.span> Translating…</>
                    : 'Translate Now'}
                </button>
              )}

              {/* Result */}
              <AnimatePresence>
                {translated && (
                  <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }}
                    style={{ padding:'12px 14px', borderRadius:12, background:'#fde8d8', border:'1px solid #fdba74' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                      <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#e55803' }}>
                        Translation ({lang.toUpperCase()})
                      </p>
                      <button onClick={speak} style={{ width:30, height:30, borderRadius:'50%', background:'rgba(229,88,3,0.12)', color:'#e55803', display:'flex', alignItems:'center', justifyContent:'center', border:'none', cursor:'pointer' }}>
                        <Volume2 size={14}/>
                      </button>
                    </div>
                    <p style={{ fontFamily:'Syne,sans-serif', fontWeight:600, fontSize:16, color:'#0e2125', lineHeight:1.4 }}>{translated}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {error && (
                <p style={{ fontSize:12, fontWeight:600, color:'#dc2626', textAlign:'center', marginTop:10, padding:'8px', borderRadius:8, background:'#fef2f2', border:'1px solid #fca5a5' }}>{error}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
