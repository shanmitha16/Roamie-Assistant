import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Plane, Check, Calendar, Zap, Timer, ShieldAlert, Wallet
} from 'lucide-react';
import { useStore } from '../stores/useStore';

const STEPS = [
  { label: 'Coordinator Alert', icon: AlertTriangle },
  { label: 'SearchAgent Scan',  icon: Plane },
  { label: 'Booking Isolator',  icon: ShieldAlert },
  { label: 'Clawbot Draft',     icon: Calendar },
  { label: 'Clawbot Secure',    icon: Check },
];

const HOLD_SECS = 15 * 60;

function getBudget(tid: string) {
  try { return JSON.parse(localStorage.getItem('rb-' + tid) || 'null'); } catch { return null; }
}
const CURR: Record<string, string> = { INR:'₹',USD:'$',EUR:'€',GBP:'£',SGD:'S$',JPY:'¥' };

export default function Disruption() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentTrip, triggerDisruption } = useStore();
  const cart = useStore(s => s.cart);

  const [resolution, setResolution]   = useState<any>(null);
  const [disrupting, setDisrupting]   = useState(false);
  const [showBanner, setShowBanner]   = useState(false);
  const [showFlights, setShowFlights] = useState(false);
  const [showQR, setShowQR]           = useState(false);
  const [step, setStep]               = useState(-1);
  const [confirmed, setConfirmed]     = useState<'confirmed'|'cancelled'|null>(null);
  const [holdLeft, setHoldLeft]       = useState(0);
  const [holdOn, setHoldOn]           = useState(false);

  const flight = currentTrip?.flights?.[0] || (currentTrip ? {
    id: `demo-${currentTrip.id}`, flightNumber: '6E-2341', airline: 'IndiGo',
    origin: 'DEL', destination: currentTrip.destination?.slice(0,3).toUpperCase() || 'BOM',
    departureTime: new Date(currentTrip.startDate).toISOString(),
    arrivalTime: new Date(new Date(currentTrip.startDate).getTime() + 5*3600000).toISOString(),
    status: 'confirmed',
  } : null);

  const budget = currentTrip ? getBudget(currentTrip.id) : null;
  const budgetSym = budget ? (CURR[budget.currency] || '') : '';

  useEffect(() => {
    if (!holdOn || holdLeft <= 0) return;
    const id = setInterval(() => setHoldLeft(p => { if (p <= 1) { setHoldOn(false); return 0; } return p-1; }), 1000);
    return () => clearInterval(id);
  }, [holdOn, holdLeft]);

  const fmtCd = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  const fmtT  = (iso: string) => { try { return new Date(iso).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}); } catch { return '--:--'; } };

  const doDisrupt = async (zeroFlights = false) => {
    if (!currentTrip || !flight) return;
    setDisrupting(true); setShowBanner(false); setShowFlights(false); setShowQR(false);
    setConfirmed(null); setStep(0); setHoldOn(false);
    try {
      const res = await triggerDisruption(currentTrip.id, flight.id, 'cancelled', zeroFlights);
      setResolution(res);
      for (let i = 0; i < 5; i++) { await new Promise(r => setTimeout(r, i===0?300:350)); setStep(i+1); }
      await new Promise(r => setTimeout(r, 300)); setShowBanner(true);
      if (res.status === 'resolved') {
        await new Promise(r => setTimeout(r, 600)); setShowFlights(true);
        await new Promise(r => setTimeout(r, 600)); setShowQR(true);
        setHoldLeft(HOLD_SECS); setHoldOn(true);
      }
    } catch {
      const airlines = ['Air India','Vistara','Emirates'], codes = ['AI','UK','EK'];
      const base = new Date(currentTrip.startDate);
      const alts = airlines.map((name,i) => ({
        flightNumber: `${codes[i]}-${1000+Math.floor(Math.random()*9000)}`,
        airline: name, price: 4000 + Math.floor(Math.random()*12000),
        duration: `${2+Math.floor(Math.random()*4)}h ${Math.floor(Math.random()*60)}m`,
        seatsAvailable: 3 + Math.floor(Math.random()*15),
        departureTime: new Date(base.getTime() + (8+(i+1)*3)*3600000),
        bookingUrl: 'https://www.skyscanner.co.in/', score: 0.95-(i*0.1),
      }));
      const fallback = {
        status:'resolved', alternativeFlights: alts, selectedFlight: alts[0],
        confirmationToken: `demo-${Date.now()}`,
        clawbotMessage: 'Flight cancelled — but I intercepted it! Here are the best budget-friendly alternatives:',
      };
      for (let i = 0; i < 5; i++) { await new Promise(r => setTimeout(r,300)); setStep(i+1); }
      setResolution(fallback); await new Promise(r=>setTimeout(r,300)); setShowBanner(true);
      await new Promise(r=>setTimeout(r,600)); setShowFlights(true);
      await new Promise(r=>setTimeout(r,600)); setShowQR(true);
      setHoldLeft(HOLD_SECS); setHoldOn(true);
    }
    setDisrupting(false);
  };

  const handleConfirm = () => {
    if (!resolution?.confirmationToken) return;
    setHoldOn(false);
    navigate(`/payment/${resolution.confirmationToken}`, {
      state: { amount: resolution.selectedFlight?.price, flightNumber: resolution.selectedFlight?.flightNumber }
    });
  };

  // Card styles
  const card: React.CSSProperties = { background:'#fff', border:'1px solid #f0dfc0', borderRadius:16, boxShadow:'0 2px 12px rgba(14,33,37,0.06)' };

  return (
    <div style={{ maxWidth:860, margin:'0 auto', padding:'28px 28px 80px', fontFamily:'DM Sans,sans-serif' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:26, color:'#0e2125', display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
          <ShieldAlert size={24} style={{ color:'#e55803' }} /> Disruption Shield
        </h1>
        <p style={{ color:'#6b5c45', fontSize:14 }}>AI-powered disruption resolution — watch autonomous agents fix your trip in real-time.</p>
      </div>

      {/* ── Budget awareness banner ── */}
      {budget && (
        <motion.div initial={{ opacity:0,y:-8 }} animate={{ opacity:1,y:0 }}
          style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderRadius:12, background:'#fde8d8', border:'1px solid #fdba74', marginBottom:20 }}>
          <Wallet size={15} style={{ color:'#e55803', flexShrink:0 }} />
          <p style={{ fontSize:13, color:'#0e2125', fontWeight:500 }}>
            Budget active: <strong style={{ fontFamily:'Syne,sans-serif' }}>{budgetSym}{budget.total.toLocaleString()} {budget.currency}</strong>
            {' '}— replanned flights will respect your budget{budget.preferences ? ` (${budget.preferences})` : ''}.
          </p>
        </motion.div>
      )}

      {/* ── Current flight card ── */}
      {flight && (
        <motion.div initial={{ opacity:0,y:10 }} animate={{ opacity:1,y:0 }}
          style={{ ...card, padding:24, marginBottom:20, position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,rgba(229,88,3,0.04) 0%,transparent 60%)', pointerEvents:'none' }} />
          <div style={{ position:'relative', zIndex:1 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:48, height:48, borderRadius:12, background:'#fde8d8', border:'1px solid #fdba74', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Plane size={22} style={{ color:'#e55803' }} />
                </div>
                <div>
                  <p style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:20, color:'#0e2125' }}>{flight.flightNumber}</p>
                  <p style={{ fontSize:13, color:'#6b5c45', fontWeight:500 }}>{flight.airline}</p>
                </div>
              </div>
              <span style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'6px 14px', borderRadius:99, background:'#dcfce7', border:'1px solid #86efac', fontSize:12, fontWeight:700, color:'#15803d', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                <span style={{ width:7, height:7, borderRadius:'50%', background:'#22c55e', animation:'pulse 1.5s infinite' }} />
                {flight.status || 'Confirmed'}
              </span>
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 8px', flexWrap:'wrap', gap:16 }}>
              <div style={{ textAlign:'center' }}>
                <p style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:36, color:'#0e2125', lineHeight:1 }}>{flight.origin}</p>
                <p style={{ fontSize:12, color:'#6b5c45', marginTop:4 }}>{fmtT(flight.departureTime)}</p>
              </div>
              <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, margin:'0 16px' }}>
                <div style={{ flex:1, height:1, background:'#f0dfc0' }} />
                <div style={{ padding:'4px 12px', borderRadius:99, background:'#fff6e0', border:'1px solid #f0dfc0', fontSize:10, fontWeight:700, color:'#6b5c45', whiteSpace:'nowrap' }}>DIRECT</div>
                <Plane size={16} style={{ color:'#e55803' }} />
                <div style={{ flex:1, height:1, background:'#f0dfc0' }} />
              </div>
              <div style={{ textAlign:'center' }}>
                <p style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:36, color:'#0e2125', lineHeight:1 }}>{flight.destination}</p>
                <p style={{ fontSize:12, color:'#6b5c45', marginTop:4 }}>{fmtT(flight.arrivalTime)}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Trigger buttons ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:28 }} className="grid grid-cols-1 md:grid-cols-2">
        <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
          onClick={() => doDisrupt(false)} disabled={disrupting||!flight}
          className="btn btn-primary"
          style={{ height:56, fontSize:15, borderRadius:12, width:'100%', gap:10 }}>
          {disrupting
            ? <><motion.span animate={{ rotate:360 }} transition={{ repeat:Infinity,duration:1.5,ease:'linear' }}><Zap size={18}/></motion.span> AI Agents Running…</>
            : <><Zap size={18}/> Simulate Flight Cancellation</>}
        </motion.button>
        <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
          onClick={() => doDisrupt(true)} disabled={disrupting||!flight}
          className="btn btn-secondary"
          style={{ height:56, fontSize:15, borderRadius:12, width:'100%', gap:10 }}>
          <ShieldAlert size={18}/> Force Zero Flights
        </motion.button>
      </div>

      {/* ── Pipeline steps ── */}
      <AnimatePresence>
        {step >= 0 && (
          <motion.div initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} style={{ marginBottom:28 }}>
            <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'#6b5c45', marginBottom:14 }}>
              Agentic Pipeline
            </p>
            <div style={{ ...card, padding:'28px 24px', position:'relative' }}>
              {/* Progress track */}
              <div style={{ position:'absolute', top:'50%', left:40, right:40, height:3, background:'#f5e8ca', transform:'translateY(-50%)', borderRadius:99, overflow:'hidden', zIndex:0 }}>
                <motion.div style={{ height:'100%', background:'linear-gradient(90deg,#e55803,#22c55e)', borderRadius:99 }}
                  initial={{ width:'0%' }} animate={{ width:`${(step/5)*100}%` }} transition={{ duration:0.5 }} />
              </div>
              <div style={{ position:'relative', zIndex:1, display:'flex', justifyContent:'space-between' }}>
                {STEPS.map((s,i) => {
                  const Icon = s.icon;
                  const done = i < step, active = i === step-1;
                  return (
                    <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
                      <motion.div
                        initial={{ scale:0.7 }}
                        animate={{ scale: active ? 1.18 : done ? 1 : 0.75,
                          background: done ? '#dcfce7' : active ? '#fde8d8' : '#f5e8ca',
                          borderColor: done ? '#86efac' : active ? '#fdba74' : '#f0dfc0' }}
                        style={{ width:52, height:52, borderRadius:14, border:'2px solid', display:'flex', alignItems:'center', justifyContent:'center',
                          color: done ? '#15803d' : active ? '#e55803' : '#b5a48a',
                          boxShadow: active ? '0 0 0 5px rgba(229,88,3,0.12)' : 'none' }}>
                        {done ? <Check size={22} strokeWidth={2.5}/> : <Icon size={20}/>}
                      </motion.div>
                      <span style={{ fontSize:10, fontWeight:700, color: done?'#15803d': active?'#e55803':'#b5a48a', whiteSpace:'nowrap' }}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Resolution banner ── */}
      <AnimatePresence>
        {showBanner && (
          <motion.div initial={{ opacity:0,scale:0.96 }} animate={{ opacity:1,scale:1 }}
            style={{ ...card, padding:20, marginBottom:24, display:'flex', alignItems:'flex-start', gap:14, borderColor: resolution?.status==='failed'?'#fca5a5':'#86efac', background: resolution?.status==='failed'?'#fef2f2':'#f0fdf4' }}>
            <div style={{ width:44, height:44, borderRadius:12, background: resolution?.status==='failed'?'#fee2e2':'#dcfce7', color: resolution?.status==='failed'?'#dc2626':'#16a34a', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <ShieldAlert size={22}/>
            </div>
            <div>
              <p style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:16, color: resolution?.status==='failed'?'#dc2626':'#15803d', marginBottom:4 }}>
                OpenClaw Agent Report
              </p>
              <p style={{ fontSize:14, color:'#0e2125', fontStyle:'italic', lineHeight:1.55 }}>"{resolution?.clawbotMessage}"</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Alternative flights ── */}
      <AnimatePresence>
        {showFlights && resolution?.alternativeFlights && (
          <motion.div initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} style={{ marginBottom:28 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:10 }}>
              <h3 style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:18, color:'#0e2125' }}>Secured Alternatives</h3>
              {budget && (
                <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 12px', borderRadius:99, background:'#fde8d8', border:'1px solid #fdba74', fontSize:11, fontWeight:700, color:'#e55803' }}>
                  <Wallet size={11}/> Budget-filtered results
                </span>
              )}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }} className="grid grid-cols-1 md:grid-cols-2">
              {resolution.alternativeFlights.map((alt: any, i: number) => {
                const isBest = alt.flightNumber === resolution.selectedFlight?.flightNumber;
                const overBudget = budget && alt.price > budget.breakdown?.transport;
                return (
                  <motion.div key={i} whileHover={{ y:-3 }}
                    style={{ ...card, padding:20, cursor:'pointer', position:'relative', overflow:'hidden',
                      borderColor: isBest?'#e55803':'#f0dfc0',
                      background: isBest?'#fffbf5':'#fff',
                      boxShadow: isBest?'0 0 0 2px rgba(229,88,3,0.15)':'0 2px 12px rgba(14,33,37,0.06)' }}>
                    {isBest && <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,rgba(229,88,3,0.06) 0%,transparent 60%)', pointerEvents:'none' }} />}
                    <div style={{ position:'relative', zIndex:1 }}>
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div style={{ width:42, height:42, borderRadius:10, background: isBest?'#fde8d8':'#f5e8ca', border:`1px solid ${isBest?'#fdba74':'#f0dfc0'}`, display:'flex', alignItems:'center', justifyContent:'center', color: isBest?'#e55803':'#6b5c45' }}>
                            <Plane size={18}/>
                          </div>
                          <div>
                            <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:2 }}>
                              <span style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:16, color:'#0e2125' }}>{alt.flightNumber}</span>
                              {isBest && <span style={{ padding:'2px 8px', borderRadius:99, background:'#e55803', color:'#fff6e0', fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>Best Match</span>}
                            </div>
                            <span style={{ fontSize:12, color:'#6b5c45' }}>{alt.airline}</span>
                          </div>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <p style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:20, color:'#0e2125' }}>₹{alt.price?.toLocaleString()}</p>
                          {overBudget && <p style={{ fontSize:10, fontWeight:700, color:'#f59e0b' }}>⚠ Over transport budget</p>}
                          {alt.score && !overBudget && <p style={{ fontSize:11, fontWeight:700, color:'#22c55e' }}>{Math.round(alt.score*100)}% Match</p>}
                        </div>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#6b5c45' }}>
                        <div>
                          <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', marginBottom:2 }}>Departure</p>
                          <p style={{ fontWeight:600, color:'#0e2125' }}>{fmtT(alt.departureTime)}</p>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', marginBottom:2 }}>Seats Left</p>
                          <p style={{ fontWeight:600, color: alt.seatsAvailable < 5 ? '#ef4444' : '#22c55e' }}>{alt.seatsAvailable}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── QR / Confirm card ── */}
      <AnimatePresence>
        {showQR && resolution && (
          <motion.div initial={{ opacity:0,y:30,scale:0.97 }} animate={{ opacity:1,y:0,scale:1 }} transition={{ type:'spring',damping:22 }}>
            {holdOn && holdLeft > 0 && (
              <div style={{ display:'flex', justifyContent:'center', marginBottom:-1 }}>
                <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'7px 20px', borderRadius:'10px 10px 0 0', background:'#fde8d8', border:'1px solid #fdba74', borderBottom:'none', fontSize:12, fontWeight:700, color:'#e55803' }}>
                  <Timer size={14} style={{ animation:'pulse 1s infinite' }}/> HELD FOR {fmtCd(holdLeft)}
                </div>
              </div>
            )}
            <div style={{ ...card, overflow:'hidden' }}>
              {/* Ticket header */}
              <div style={{ background:'#0e2125', padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ display:'flex', alignItems:'center', gap:8, fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15, color:'#fff6e0' }}>
                  <Plane size={16} style={{ color:'#e55803' }}/> OpenClaw Verified
                </span>
                <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'rgba(255,246,224,0.45)' }}>e-TICKET PENDING</span>
              </div>

              {/* Body */}
              <div style={{ display:'flex', flexWrap:'wrap', gap:24, padding:24, alignItems:'center', background:'#fffbf5' }}>
                <div style={{ position:'relative', flexShrink:0 }}>
                  <div style={{ width:160, height:160, background:'#fff', border:'1px solid #f0dfc0', borderRadius:12, padding:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {resolution.qrCodeData
                      ? <img src={resolution.qrCodeData} alt="QR" style={{ width:'100%', height:'100%', borderRadius:8 }}/>
                      : <span style={{ fontSize:11, fontWeight:700, color:'#6b5c45', textAlign:'center', animation:'pulse 1.5s infinite' }}>Encoding…</span>}
                  </div>
                </div>
                <div style={{ flex:1, minWidth:200 }}>
                  <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'#6b5c45', marginBottom:4 }}>New Itinerary</p>
                  <p style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:28, color:'#0e2125', lineHeight:1 }}>{resolution.selectedFlight?.flightNumber}</p>
                  <p style={{ fontSize:15, color:'#e55803', fontWeight:600, marginTop:4, marginBottom:16 }}>{resolution.selectedFlight?.airline}</p>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, padding:14, borderRadius:12, background:'#fff', border:'1px solid #f0dfc0' }}>
                    <div>
                      <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:'#6b5c45', marginBottom:3 }}>Departure</p>
                      <p style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:18, color:'#0e2125' }}>{fmtT(resolution.selectedFlight?.departureTime)}</p>
                    </div>
                    <div>
                      <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:'#6b5c45', marginBottom:3 }}>Arrival</p>
                      <p style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:18, color:'#0e2125' }}>{fmtT(resolution.selectedFlight?.arrivalTime)}</p>
                    </div>
                  </div>
                  {budget && (
                    <p style={{ fontSize:12, color:'#6b5c45', marginTop:10 }}>
                      💰 Price: ₹{resolution.selectedFlight?.price?.toLocaleString()}
                      {resolution.selectedFlight?.price > budget.breakdown?.transport
                        ? <span style={{ color:'#f59e0b', marginLeft:8 }}>⚠ Slightly over transport budget</span>
                        : <span style={{ color:'#22c55e', marginLeft:8 }}>✓ Within budget</span>}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              {confirmed ? (
                <div style={{ padding:'18px 24px', textAlign:'center', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:16, textTransform:'uppercase', letterSpacing:'0.06em', background: confirmed==='confirmed'?'#f0fdf4':'#fef2f2', color: confirmed==='confirmed'?'#15803d':'#dc2626', borderTop:'1px solid #f0dfc0' }}>
                  {confirmed==='confirmed'?'Authorization Verified ✓':'Transaction Voided'}
                </div>
              ) : (
                <div style={{ display:'flex', flexWrap:'wrap', gap:12, padding:20, borderTop:'1px solid #f0dfc0', background:'#fffbf5' }}>
                  <button className="btn btn-primary" style={{ flex:2, minWidth:180, height:52, fontSize:15, borderRadius:12 }} onClick={handleConfirm}>
                    Confirm & Pay ₹{resolution.selectedFlight?.price?.toLocaleString()}
                  </button>
                  <button className="btn btn-ghost" style={{ flex:1, minWidth:120, height:52, fontSize:15, borderRadius:12 }} onClick={() => { setConfirmed('cancelled'); setHoldOn(false); }}>
                    Release Booking
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
