import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Receipt, Utensils, Car, Building2, Ticket, Tag, Download, Sparkles, Plus, CreditCard, TrendingUp, AlertTriangle } from 'lucide-react';
import { useStore } from '../stores/useStore';

const CURRENCY_SYMBOLS: Record<string,string> = {
  INR:'₹', USD:'$', EUR:'€', GBP:'£', SGD:'S$', JPY:'¥', AED:'د.إ', AUD:'A$', CAD:'C$', CHF:'Fr'
};
const CAT: Record<string,{ bg:string; border:string; color:string; Icon:any }> = {
  food:          { bg:'#f0fdf4', border:'#86efac', color:'#15803d', Icon:Utensils },
  transport:     { bg:'#faf5ff', border:'#d8b4fe', color:'#7e22ce', Icon:Car },
  accommodation: { bg:'#eff6ff', border:'#93c5fd', color:'#1d4ed8', Icon:Building2 },
  activity:      { bg:'#fde8d8', border:'#fdba74', color:'#c44a00', Icon:Ticket },
  shopping:      { bg:'#fdf2f8', border:'#f9a8d4', color:'#9d174d', Icon:Tag },
  other:         { bg:'#fffbeb', border:'#fcd34d', color:'#92400e', Icon:Receipt },
};
const DONUT = ['#22c55e','#a855f7','#3b82f6','#e55803','#f472b6','#f59e0b','#22d3ee'];

function getBudget(tid: string) {
  try { return JSON.parse(localStorage.getItem(`rb-${tid}`) || 'null'); } catch { return null; }
}

export default function Expenses() {
  const { t } = useTranslation();
  const { currentTrip, scanExpense, fetchExpenses } = useStore();
  const [receiptText, setReceiptText] = useState('');
  const [scanning, setScanning] = useState(false);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [byCategory, setByCategory] = useState<Record<string,number>>({});
  const [total, setTotal] = useState(0);
  const [lastResult, setLastResult] = useState<any>(null);
  const [manualDesc, setManualDesc] = useState('');
  const [manualAmt, setManualAmt] = useState('');
  const [manualCur, setManualCur] = useState('INR');
  const [manualCat, setManualCat] = useState('other');

  const budget = currentTrip ? getBudget(currentTrip.id) : null;
  const bTotal: number = budget?.total ?? 0;
  const bSym: string = budget ? (CURRENCY_SYMBOLS[budget.currency] ?? '') : '';
  const bCur: string = budget?.currency ?? '';
  const usedPct = bTotal > 0 ? Math.min(100, (total / bTotal) * 100) : 0;
  const remaining = Math.max(0, bTotal - total);
  const pctColor = usedPct > 90 ? '#ef4444' : usedPct > 70 ? '#f59e0b' : '#22c55e';
  const pctBadgeBg = usedPct > 90 ? '#fee2e2' : usedPct > 70 ? '#fef3c7' : '#dcfce7';

  useEffect(() => { load(); }, [currentTrip]);

  const load = async () => {
    try {
      const d = await fetchExpenses(currentTrip?.id);
      setExpenses(d.expenses || []);
      setByCategory(d.byCategory || {});
      setTotal(d.total || 0);
    } catch {}
  };

  const scan = async () => {
    if (!receiptText.trim()) return;
    setScanning(true);
    try {
      const d = await scanExpense(receiptText, currentTrip?.id);
      setLastResult(d.extracted); setReceiptText(''); await load();
    } catch {}
    setScanning(false);
  };

  const csv = () => {
    const h = 'Date,Category,Description,Amount,Currency\n';
    const r = expenses.map(e => `${new Date(e.date).toLocaleDateString()},${e.category},${e.description},${e.amount},${e.currency}`).join('\n');
    const b = new Blob([h+r], { type:'text/csv' });
    const u = URL.createObjectURL(b);
    const a = document.createElement('a'); a.href=u; a.download=`expenses-${currentTrip?.destination||'trip'}.csv`; a.click(); URL.revokeObjectURL(u);
  };

  const cats = Object.entries(byCategory);
  const segs: any[] = []; let cum = 0;
  cats.forEach(([,amt],i) => {
    const pct = total > 0 ? (amt as number)/total : 0, ang = pct*360;
    segs.push({ color:DONUT[i%DONUT.length], start:cum, end:cum+ang }); cum+=ang;
  });
  const p2c = (cx:number,cy:number,r:number,a:number)=>{ const rad=(a-90)*Math.PI/180; return { x:cx+r*Math.cos(rad), y:cy+r*Math.sin(rad) }; };
  const arc = (cx:number,cy:number,r:number,s:number,e:number)=>{ const A=p2c(cx,cy,r,e),B=p2c(cx,cy,r,s); return `M ${A.x} ${A.y} A ${r} ${r} 0 ${e-s>180?1:0} 0 ${B.x} ${B.y}`; };

  const IS = { background:'#fff', border:'1.5px solid #f0dfc0', borderRadius:10, padding:'10px 14px', fontFamily:'DM Sans,sans-serif', fontSize:14, color:'#0e2125', outline:'none', minHeight:44, width:'100%' } as const;

  return (
    <div style={{ maxWidth:1100, margin:'0 auto', padding:'28px 28px 80px' }}>

      {/* Header */}
      <div style={{ display:'flex', flexWrap:'wrap', alignItems:'flex-end', justifyContent:'space-between', gap:12, marginBottom:24 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:26, color:'#0e2125', display:'flex', alignItems:'center', gap:10 }}>
            <CreditCard size={24} style={{ color:'#e55803' }} /> Expenses
          </h1>
          <p style={{ color:'#6b5c45', marginTop:4, fontSize:13 }}>Track every cent of your trip spend.</p>
        </div>
        {expenses.length > 0 && (
          <button className="btn btn-ghost" onClick={csv} style={{ gap:8 }}>
            <Download size={15} /> Export CSV
          </button>
        )}
      </div>

      {/* Budget usage bar */}
      {bTotal > 0 && (
        <motion.div initial={{ opacity:0,y:-8 }} animate={{ opacity:1,y:0 }}
          className="r-card" style={{ padding:'18px 20px', marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10, marginBottom:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <TrendingUp size={16} style={{ color:'#e55803' }} />
              <span style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, color:'#0e2125' }}>Budget Tracker</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
              <span style={{ fontSize:13, color:'#6b5c45' }}>
                Spent <strong style={{ color:pctColor, fontFamily:'Syne,sans-serif' }}>{bSym}{total.toLocaleString()}</strong> of {bSym}{bTotal.toLocaleString()} {bCur}
              </span>
              <span style={{ padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:700, background:pctBadgeBg, color:pctColor }}>
                {usedPct.toFixed(1)}% used
              </span>
              {usedPct > 90 && (
                <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, fontWeight:700, color:'#dc2626' }}>
                  <AlertTriangle size={12} /> Over budget warning
                </span>
              )}
            </div>
          </div>
          <div className="progress-track" style={{ height:10, marginBottom:8 }}>
            <motion.div className="progress-fill" style={{ height:10, width:`${usedPct}%`, background:pctColor }} initial={{ width:0 }} animate={{ width:`${usedPct}%` }} transition={{ duration:0.8 }} />
          </div>
          <p style={{ fontSize:12, color:'#6b5c45' }}>
            Remaining: <strong style={{ color:'#0e2125' }}>{bSym}{remaining.toLocaleString()} {bCur}</strong>
            {budget?.preferences && <span> · 🎯 {budget.preferences}</span>}
          </p>
        </motion.div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:24, alignItems:'start' }}
        className="grid lg:grid-cols-[1fr_360px]">

        {/* Left */}
        <div style={{ display:'flex', flexDirection:'column', gap:18 }}>

          {/* AI Scanner */}
          <div className="r-card" style={{ padding:20 }}>
            <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'#e55803', display:'flex', alignItems:'center', gap:6, marginBottom:14 }}>
              <Sparkles size={12} /> AI Receipt Scanner
            </p>
            <textarea value={receiptText} onChange={e=>setReceiptText(e.target.value)}
              placeholder="Paste receipt text here and let AI extract the details…" rows={4}
              style={{ ...IS, resize:'none', fontFamily:'monospace', fontSize:13, height:'auto', marginBottom:12 }} />
            <button className="btn btn-primary" style={{ width:'100%' }} onClick={scan} disabled={scanning||!receiptText.trim()}>
              {scanning
                ? <><motion.span animate={{ rotate:360 }} transition={{ repeat:Infinity,duration:1,ease:'linear' }}><Sparkles size={15}/></motion.span> Analysing…</>
                : <><Sparkles size={15}/> Scan with AI ✦</>}
            </button>
          </div>

          {/* Manual Add */}
          <div className="r-card" style={{ padding:20 }}>
            <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'#6b5c45', display:'flex', alignItems:'center', gap:6, marginBottom:14 }}>
              <CreditCard size={13} /> Quick Add
            </p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:14 }}>
              {Object.entries(CAT).map(([cat,s]) => (
                <button key={cat} onClick={()=>setManualCat(cat)}
                  style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, fontSize:13, fontWeight:600, textTransform:'capitalize', cursor:'pointer', transition:'all 0.15s', minHeight:36, border:`1.5px solid ${manualCat===cat ? s.border : '#f0dfc0'}`, background:manualCat===cat ? s.bg : '#f5e8ca', color:manualCat===cat ? s.color : '#6b5c45' }}>
                  <s.Icon size={13} /> {cat}
                </button>
              ))}
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginBottom:12 }}>
              <input value={manualDesc} onChange={e=>setManualDesc(e.target.value)} placeholder="What did you buy?" style={{ ...IS, flex:'2 1 160px' }} />
              <input value={manualAmt} onChange={e=>setManualAmt(e.target.value)} placeholder="0.00" type="number" style={{ ...IS, flex:'1 1 90px' }} />
              <select value={manualCur} onChange={e=>setManualCur(e.target.value)} style={{ ...IS, flex:'0 0 100px', cursor:'pointer' }}>
                {Object.entries(CURRENCY_SYMBOLS).map(([c,s])=><option key={c} value={c}>{s} {c}</option>)}
              </select>
            </div>
            <button className="btn btn-secondary" style={{ width:'100%' }}
              disabled={!manualDesc.trim()||!manualAmt}
              onClick={async () => {
                if (!manualDesc.trim()||!manualAmt) return;
                try {
                  const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';
                  const res = await fetch(`${apiUrl}/api/expense/scan`, {
                    method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('roamie-token')||'demo-token'}` },
                    body:JSON.stringify({ receiptText:`${manualDesc} - ${manualCur} ${manualAmt} - ${manualCat}`, tripId:currentTrip?.id }),
                  });
                  if (res.ok) { setManualDesc(''); setManualAmt(''); await load(); }
                } catch {}
              }}>
              <Plus size={15} /> Add Entry
            </button>
          </div>

          {/* Last scan */}
          <AnimatePresence>
            {lastResult && (
              <motion.div initial={{ opacity:0,y:-8 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }}
                style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:14, padding:16, position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, background:'#22c55e', borderRadius:'2px 0 0 2px' }} />
                <p style={{ fontSize:11, fontWeight:700, color:'#15803d', display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
                  (<Sparkles size={12} />) Extracted Successfully
                </p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, paddingLeft:8 }}>
                  <div>
                    <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#6b5c45' }}>Amount</span>
                    <p style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:22, color:'#0e2125' }}>{lastResult.currency} {lastResult.amount}</p>
                  </div>
                  <div>
                    <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#6b5c45' }}>Category</span>
                    <p style={{ fontSize:16, fontWeight:600, color:'#15803d', textTransform:'capitalize' }}>{lastResult.category}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Ledger */}
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <h3 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:17, color:'#0e2125' }}>Ledger</h3>
              <span style={{ padding:'3px 12px', borderRadius:99, fontSize:11, fontWeight:700, background:'#fde8d8', color:'#e55803' }}>{expenses.length} records</span>
            </div>
            {expenses.map((exp,i) => {
              const s = CAT[exp.category] || CAT.other;
              return (
                <motion.div key={exp.id} initial={{ opacity:0,x:-8 }} animate={{ opacity:1,x:0 }} transition={{ delay:i*0.04 }}
                  style={{ display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:12, padding:14, borderRadius:12, marginBottom:8, background:i%2===0?'#fff':'#fffbf5', border:'1px solid #f0dfc0', transition:'border-left-width 0.1s' }}
                  onMouseEnter={e=>(e.currentTarget.style.borderLeft='3px solid #e55803')}
                  onMouseLeave={e=>(e.currentTarget.style.borderLeft='1px solid #f0dfc0')}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:40, height:40, borderRadius:10, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:s.bg, border:`1px solid ${s.border}`, color:s.color }}>
                      <s.Icon size={17} />
                    </div>
                    <div>
                      <p style={{ fontWeight:600, color:'#0e2125', fontSize:14 }}>{exp.description}</p>
                      <p style={{ fontSize:11, color:'#6b5c45', marginTop:2 }}>{new Date(exp.date).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</p>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:12, paddingLeft:12, borderLeft:'1px solid #f0dfc0' }}>
                    <span style={{ padding:'3px 8px', borderRadius:6, fontSize:11, fontWeight:700, textTransform:'uppercase', background:s.bg, color:s.color }}>{exp.category}</span>
                    <p style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:15, color:'#0e2125', whiteSpace:'nowrap' }}>
                      {exp.currency} {Number(exp.amount).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
                    </p>
                  </div>
                </motion.div>
              );
            })}
            {expenses.length === 0 && (
              <div style={{ textAlign:'center', padding:'48px 0', border:'2px dashed #f0dfc0', borderRadius:16, color:'#6b5c45', fontSize:14 }}>
                No expenses yet. Scan a receipt or add one manually.
              </div>
            )}
          </div>
        </div>

        {/* Right */}
        <div style={{ display:'flex', flexDirection:'column', gap:18 }}>

          {/* Total */}
          <div className="r-card" style={{ padding:24, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, right:0, width:120, height:120, background:'#fde8d8', borderRadius:'50%', filter:'blur(40px)', opacity:0.5, transform:'translate(30%,-30%)', pointerEvents:'none' }} />
            <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'#6b5c45', marginBottom:6 }}>
              Total Spent {bCur ? `(${bCur})` : ''}
            </p>
            <p style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:34, color:'#0e2125', lineHeight:1.1 }}>
              <span style={{ color:'#e55803' }}>{bSym||expenses[0]?.currency||''}</span>
              {total.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
            </p>
            {bTotal > 0 && (
              <p style={{ fontSize:12, color:'#6b5c45', marginTop:6 }}>
                {usedPct.toFixed(1)}% of {bSym}{bTotal.toLocaleString()} budget
              </p>
            )}
            <div style={{ height:1, background:'#f0dfc0', margin:'14px 0' }} />
            <p style={{ fontSize:13, color:'#6b5c45' }}>{expenses.length} transactions · {cats.length} categories</p>
            {bTotal > 0 && (
              <div style={{ marginTop:12, padding:'10px 14px', borderRadius:10, background:pctBadgeBg }}>
                <p style={{ fontSize:12, fontWeight:600, color:pctColor }}>
                  Remaining: {bSym}{remaining.toLocaleString()} {bCur}
                </p>
              </div>
            )}
          </div>

          {/* Donut chart */}
          {cats.length > 0 && (
            <div className="r-card" style={{ padding:22 }}>
              <h3 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15, color:'#0e2125', marginBottom:20 }}>Spending by Category</h3>
              <div style={{ display:'flex', justifyContent:'center', marginBottom:24 }}>
                <div style={{ position:'relative', width:190, height:190 }}>
                  <svg width="190" height="190" viewBox="0 0 200 200" style={{ transform:'rotate(-90deg)' }}>
                    <circle cx="100" cy="100" r="74" fill="none" stroke="#f5e8ca" strokeWidth="22" />
                    {segs.map((sg,i) => (
                      <path key={i} d={arc(100,100,74,sg.start,sg.end-1)} stroke={sg.color} strokeWidth="22" fill="none" strokeLinecap="round" style={{ transition:'all 0.5s' }} />
                    ))}
                  </svg>
                  <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
                    <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#6b5c45' }}>Total</span>
                    <span style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:20, color:'#0e2125' }}>{total.toFixed(0)}</span>
                  </div>
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {cats.map(([cat,amt],i) => (
                  <div key={cat} style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:10, height:10, borderRadius:3, background:DONUT[i%DONUT.length], flexShrink:0 }} />
                      <span style={{ fontSize:13, color:'#0e2125', fontWeight:500, textTransform:'capitalize' }}>{cat}</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <span style={{ fontSize:11, color:'#6b5c45' }}>{((amt as number/total)*100).toFixed(0)}%</span>
                      <span style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:13, color:'#0e2125', minWidth:60, textAlign:'right' }}>
                        {(amt as number).toLocaleString(undefined,{maximumFractionDigits:0})}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
