import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X, Volume2, Languages, Sparkles, RefreshCw } from 'lucide-react';
import api from '../lib/api';

const LANGS = [
  { code: 'en', label: 'English' }, { code: 'hi', label: 'Hindi' }, { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' }, { code: 'ja', label: 'Japanese' }, { code: 'de', label: 'German' },
  { code: 'zh', label: 'Chinese' }, { code: 'ar', label: 'Arabic' }, { code: 'ko', label: 'Korean' }, { code: 'ta', label: 'Tamil' },
];

// BCP47 language tags for correct SpeechSynthesis voice matching
const LANG_BCP47: Record<string, string> = {
  en: 'en-US', hi: 'hi-IN', es: 'es-ES', fr: 'fr-FR',
  ja: 'ja-JP', de: 'de-DE', zh: 'zh-CN', ar: 'ar-SA',
  ko: 'ko-KR', ta: 'ta-IN',
};

interface ChatBlock {
  id: string;
  sourceText: string;
  translatedText: string;
}

export default function VoiceTranslateWidget() {
  const [open, setOpen] = useState(false);
  const [listening, setListen] = useState(false);
  const [history, setHistory] = useState<ChatBlock[]>([]);
  const [interimSource, setInterimSource] = useState('');
  const [interimTranslated, setInterimTranslated] = useState('');
  const [lang, setLang] = useState('hi');
  const [error, setErr] = useState('');
  const [levels, setLevels] = useState<number[]>(Array(7).fill(10));
  const [autoSpeak, setAutoSpeak] = useState(true);
  
  const recRef = useRef<any>(null);
  const translatorTimeoutRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const srcScrollRef = useRef<HTMLDivElement>(null);
  // Use ref to track listening state so closures always have the latest value
  const listeningRef = useRef(false);
  // Track in-flight translation requests to cancel stale ones
  const translationIdRef = useRef(0);

  // Keep ref in sync
  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  // Auto-scroll both panels to bottom of conversation
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    if (srcScrollRef.current) {
      srcScrollRef.current.scrollTop = srcScrollRef.current.scrollHeight;
    }
  }, [history, interimSource, interimTranslated]);

  // Audio visualizer 
  useEffect(() => {
    let id: any;
    if (listening) id = setInterval(() => setLevels(Array.from({ length: 7 }, () => 8 + Math.random() * 22)), 90);
    else setLevels(Array(7).fill(10));
    return () => clearInterval(id);
  }, [listening]);

  // Preload voices when lang changes
  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices(); // triggers load
    }
  }, [lang]);

  // Translate function — returns translated text, cancellable via id
  const fetchTranslation = useCallback(async (text: string, isFinal: boolean) => {
    if (!text.trim()) return;
    
    const thisId = ++translationIdRef.current;
    
    try {
      const { data } = await api.post('/translate', {
        text,
        sourceLang: 'Auto',
        targetLang: LANGS.find(l => l.code === lang)?.label || lang,
      });

      // If a newer request has been issued, discard this result
      if (translationIdRef.current !== thisId) return;

      if (isFinal) {
        const translatedText = data.translated || text;
        setHistory(prev => [...prev, { 
          id: Math.random().toString(36), 
          sourceText: text, 
          translatedText 
        }]);
        setInterimSource('');
        setInterimTranslated('');
        
        // Auto-speak the final translation
        if (autoSpeak && translatedText && !translatedText.startsWith('[')) {
          speak(translatedText);
        }
      } else {
        setInterimTranslated(data.translated || '...');
      }
    } catch {
      if (translationIdRef.current !== thisId) return;
      if (!isFinal) setInterimTranslated('...');
      else setErr('Translation failed. Check your connection.');
    }
  }, [lang, autoSpeak]);

  // Debounced translation hook for interim text
  useEffect(() => {
    if (!interimSource.trim()) {
      setInterimTranslated('');
      return;
    }
    if (translatorTimeoutRef.current) clearTimeout(translatorTimeoutRef.current);
    translatorTimeoutRef.current = setTimeout(() => {
      fetchTranslation(interimSource, false);
    }, 350); // 350ms debounce — slightly longer for stability
    return () => clearTimeout(translatorTimeoutRef.current);
  }, [interimSource, fetchTranslation]);

  const startListen = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setErr('Speech recognition not supported on this browser.'); return; }
    
    // Stop any existing recognition first
    if (recRef.current) {
      try { recRef.current.abort(); } catch {}
      recRef.current = null;
    }

    const r = new SR();
    r.continuous = true; 
    r.interimResults = true;
    r.maxAlternatives = 1;
    // Don't set r.lang — let browser auto-detect
    
    r.onresult = (e: any) => {
      let currentInterim = '';
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        const result = e.results[i];
        if (result.isFinal) {
          const finalText = result[0].transcript.trim();
          if (finalText) {
            // Clear interim immediately for responsiveness
            setInterimSource('');
            setInterimTranslated('');
            fetchTranslation(finalText, true);
          }
        } else {
          currentInterim += result[0].transcript;
        }
      }
      if (currentInterim) setInterimSource(currentInterim);
    };

    r.onend = () => {
      // Use ref to check current listening state (avoids stale closure)
      if (listeningRef.current) {
        // Auto-restart for continuous listening
        try { 
          setTimeout(() => {
            if (listeningRef.current && recRef.current) {
              try { recRef.current.start(); } catch { setListen(false); }
            }
          }, 100); // Small delay before restart
        } catch { 
          setListen(false); 
        }
      }
    };
    
    r.onerror = (e: any) => { 
      if (e.error === 'not-allowed') {
        setListen(false);
        setErr('Microphone access denied.'); 
      } else if (e.error === 'no-speech') {
        // Silence timeout — just let onend restart
      } else if (e.error === 'aborted') {
        // Intentional abort, ignore
      } else {
        console.warn('SpeechRecognition error:', e.error);
      }
    };

    recRef.current = r; 
    try {
      r.start(); 
      setListen(true); 
      setErr('');
    } catch (err) {
      setErr('Could not start microphone.');
    }
  }, [fetchTranslation]);

  const stopListen = useCallback(() => { 
    setListen(false); 
    listeningRef.current = false;
    if (recRef.current) {
      try { recRef.current.abort(); } catch {}
      recRef.current = null;
    }
  }, []);

  // Enhanced speak function with proper voice selection and queue management
  const speak = useCallback((text: string) => {
    if (!text || !window.speechSynthesis) return;
    
    // Cancel any ongoing speech to prevent overlap/lag
    window.speechSynthesis.cancel();
    
    const u = new SpeechSynthesisUtterance(text);
    const bcp47 = LANG_BCP47[lang] || lang;
    u.lang = bcp47;
    u.rate = 0.95;
    u.pitch = 1;
    u.volume = 1;
    
    // Try to find best matching voice
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      // Prefer Google/Microsoft voices (higher quality)
      const preferred = voices.find(v => 
        v.lang.startsWith(lang) && (v.name.includes('Google') || v.name.includes('Microsoft'))
      );
      const fallback = voices.find(v => v.lang.startsWith(lang));
      const exactMatch = voices.find(v => v.lang === bcp47);
      
      u.voice = preferred || exactMatch || fallback || null;
    }

    // Chrome bug workaround: long utterances get cut off
    // Split into sentences for long text
    if (text.length > 150) {
      const sentences = text.match(/[^.!?।]+[.!?।]+|[^.!?।]+$/g) || [text];
      sentences.forEach((sentence, i) => {
        const part = new SpeechSynthesisUtterance(sentence.trim());
        part.lang = u.lang;
        part.rate = u.rate;
        part.pitch = u.pitch;
        part.volume = u.volume;
        part.voice = u.voice;
        window.speechSynthesis.speak(part);
      });
    } else {
      window.speechSynthesis.speak(u);
    }
  }, [lang]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recRef.current) {
        try { recRef.current.abort(); } catch {}
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Cleanup when panel closes
  useEffect(() => {
    if (!open) {
      stopListen();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    }
  }, [open, stopListen]);

  return (
    <>
      {/* Floating button */}
      <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 1000 }}>
        {!open && (
          <motion.div
            animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
            style={{ position: 'absolute', inset: -6, borderRadius: '50%', background: 'rgba(229,88,3,0.2)', zIndex: -1 }} />
        )}
        <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }} onClick={() => setOpen(!open)}
          style={{ width: 54, height: 54, borderRadius: '50%', background: open ? '#0e2125' : '#e55803', color: '#fff6e0', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(229,88,3,0.35)' }}>
          <Languages size={22} />
        </motion.button>
      </div>

      {/* Split-screen interpreter panel */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.95 }}
            style={{ position: 'fixed', bottom: 96, right: 28, zIndex: 1001, width: '90vw', maxWidth: 800, height: '70vh', maxHeight: 600, background: '#fff', border: '1px solid #f0dfc0', borderRadius: 24, boxShadow: '0 20px 80px rgba(14,33,37,0.2)', overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: 'DM Sans, sans-serif' }}>

            {/* Header */}
            <div style={{ background: '#0e2125', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(229,88,3,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={18} style={{ color: '#e55803' }} />
                </div>
                <div>
                  <h3 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 16, color: '#fff', margin: 0, lineHeight: 1.2 }}>Live Interpreter</h3>
                  <p style={{ fontSize: 11, color: '#a19782', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Real-time streaming</p>
                </div>
              </div>
              <button className="hover:bg-white/10 rounded-full transition-colors" onClick={() => setOpen(false)} style={{ color: '#a19782', background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
                <X size={20} />
              </button>
            </div>

            {/* Split Screen Content */}
            <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
              
              {/* Left Side: Source (User Input) */}
              <div style={{ flex: 1, borderRight: '1px solid #f0dfc0', display: 'flex', flexDirection: 'column', background: '#fffbf4' }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #f0dfc0', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#6b5c45', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Source (Auto)</span>
                  {listening && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#e55803', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} style={{ width: 8, height: 8, borderRadius: '50%', background: '#e55803' }} />
                      LISTENING
                    </span>
                  )}
                </div>
                
                <div ref={srcScrollRef} style={{ flex: 1, padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {history.map(b => (
                    <div key={b.id + 's'} style={{ fontSize: 15, color: '#0e2125', fontWeight: 500, lineHeight: 1.5 }}>
                      {b.sourceText}
                    </div>
                  ))}
                  
                  {/* Streaming Interim chunk */}
                  {interimSource && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: 15, color: '#6b5c45', fontWeight: 500, lineHeight: 1.5, position: 'relative' }}>
                      {interimSource}
                      <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1 }}>|</motion.span>
                    </motion.div>
                  )}
                  {history.length === 0 && !interimSource && !listening && (
                    <div style={{ margin: 'auto', textAlign: 'center', color: '#b5a48a', fontSize: 14 }}>
                      <Mic size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                      Tap the microphone to begin speaking.
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side: Translated Output */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff' }}>
                <div style={{ padding: '12px 24px', borderBottom: '1px solid #f0dfc0', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#e55803', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Translation</span>
                  </div>
                  <select value={lang} onChange={e => setLang(e.target.value)}
                    style={{ background: '#fef3c7', border: '1px solid #fcd34d', outline: 'none', padding: '6px 12px', borderRadius: 99, fontFamily: 'DM Sans,sans-serif', fontWeight: 800, fontSize: 13, color: '#92400e', cursor: 'pointer' }}>
                    {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                </div>
                
                <div ref={scrollRef} style={{ flex: 1, padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {history.map(b => (
                    <div key={b.id + 't'} className="group relative" style={{ fontSize: 16, color: '#e55803', fontWeight: 700, fontFamily: 'Syne, sans-serif', lineHeight: 1.4 }}>
                      {b.translatedText}
                      <button onClick={() => speak(b.translatedText)} style={{ position: 'absolute', left: -32, top: 0, padding: 6, borderRadius: '50%', background: '#fff7ed', color: '#e55803', border: 'none', cursor: 'pointer', opacity: 0, transition: 'opacity 0.2s' }}
                        className="group-hover:!opacity-100"
                        title="Play translation">
                        <Volume2 size={14} />
                      </button>
                    </div>
                  ))}

                  {/* Streaming Interim Translated chunk */}
                  {interimSource && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: 16, color: '#fca5a5', fontWeight: 700, fontFamily: 'Syne, sans-serif', lineHeight: 1.4 }}>
                      {interimTranslated || <span style={{ opacity: 0.5 }}>Translating...</span>}
                    </motion.div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Control Bar */}
            <div style={{ padding: '16px 24px', background: '#fff', borderTop: '1px solid #f0dfc0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: 60, flexShrink: 0 }}>
                {levels.map((h, i) => (
                  <motion.div key={i} animate={{ height: h }}
                    style={{ width: 4, borderRadius: 99, background: listening ? '#e55803' : '#f0dfc0', transition: 'background 0.2s' }} />
                ))}
              </div>

              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={listening ? stopListen : startListen}
                style={{ width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s',
                  background: listening ? 'rgba(229,88,3,0.12)' : '#fde8d8',
                  border: listening ? '3px solid #e55803' : '3px solid #fdba74',
                  color: listening ? '#e55803' : '#c44a00',
                  boxShadow: listening ? '0 0 0 6px rgba(229,88,3,0.12)' : 'none' }}>
                {listening ? <MicOff size={26} /> : <Mic size={26} />}
              </motion.button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button 
                  onClick={() => setAutoSpeak(!autoSpeak)} 
                  title={autoSpeak ? 'Auto-speak ON' : 'Auto-speak OFF'}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: autoSpeak ? '#e55803' : '#6b5c45', background: autoSpeak ? '#fff7ed' : 'none', border: autoSpeak ? '1px solid #fed7aa' : '1px solid transparent', borderRadius: 99, cursor: 'pointer', padding: '4px 10px' }}>
                  <Volume2 size={14} />
                </button>
                <button onClick={() => { setHistory([]); setInterimSource(''); setInterimTranslated(''); if (window.speechSynthesis) window.speechSynthesis.cancel(); }} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#6b5c45', background: 'none', border: 'none', cursor: 'pointer', opacity: history.length ? 1 : 0.5 }} disabled={!history.length}>
                  <RefreshCw size={14} /> Clear Log
                </button>
              </div>
            </div>
            
            {error && (
              <motion.div 
                initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                style={{ position: 'absolute', top: 60, left: 0, right: 0, background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 600, padding: '8px 24px', textAlign: 'center', cursor: 'pointer' }}
                onClick={() => setErr('')}>
                {error} <span style={{ opacity: 0.7, fontSize: 11 }}>(tap to dismiss)</span>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
