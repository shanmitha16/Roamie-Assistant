import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, Circle, AlertTriangle, Shield, FileText, Heart, DollarSign,
  Shirt, Plug, Package, ChevronDown, Search, Plus
} from 'lucide-react';
import { useStore } from '../stores/useStore';

const CAT_CFG: Record<string,{ Icon:any; color:string; bg:string }> = {
  clothing:   { Icon:Shirt,      color:'#3b82f6', bg:'#eff6ff' },
  toiletries: { Icon:Heart,      color:'#ec4899', bg:'#fdf2f8' },
  tech:       { Icon:Plug,       color:'#6366f1', bg:'#eef2ff' },
  documents:  { Icon:FileText,   color:'#f59e0b', bg:'#fffbeb' },
  misc:       { Icon:Package,    color:'#06b6d4', bg:'#ecfeff' },
  health:     { Icon:Heart,      color:'#22c55e', bg:'#f0fdf4' },
  money:      { Icon:DollarSign, color:'#f59e0b', bg:'#fffbeb' },
  safety:     { Icon:Shield,     color:'#ef4444', bg:'#fef2f2' },
};
const SEV_STYLE: Record<string,{ bg:string; border:string; color:string }> = {
  critical: { bg:'#fef2f2', border:'#fca5a5', color:'#dc2626' },
  warning:  { bg:'#fffbeb', border:'#fcd34d', color:'#d97706' },
  info:     { bg:'#eff6ff', border:'#93c5fd', color:'#1d4ed8' },
};

export default function PackingChecklist() {
  const { t } = useTranslation();
  const { currentTrip, fetchChecklist } = useStore();
  const [packingList, setPackingList] = useState<any[]>([]);
  const [docChecklist, setDocChecklist] = useState<any[]>([]);
  const [lawNudges, setLawNudges] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<'packing'|'docs'|'laws'>('packing');
  const [search, setSearch] = useState('');
  const [customItem, setCustomItem] = useState('');
  const [customCat, setCustomCat] = useState('misc');

  useEffect(() => { if (currentTrip) load(); }, [currentTrip]);

  const load = async () => {
    if (!currentTrip) return;
    setLoading(true);
    try {
      const d = await fetchChecklist(currentTrip.id);
      setPackingList(d.packingList || []);
      setDocChecklist(d.docChecklist || []);
      setLawNudges(d.lawNudges || []);
      setExpanded(new Set((d.packingList||[]).map((p:any)=>p.category)));
    } catch {}
    setLoading(false);
  };

  const toggle = (k: string) => {
    const n = new Set(checked);
    n.has(k) ? n.delete(k) : n.add(k);
    setChecked(n);
  };
  const toggleCat = (c: string) => {
    const n = new Set(expanded);
    n.has(c) ? n.delete(c) : n.add(c);
    setExpanded(n);
  };

  const allItems = packingList.flatMap(g => (g.items||[]).map((it:any)=>({...it,cat:g.category})));
  const totalItems = allItems.length;
  const packedItems = allItems.filter(it => checked.has(`${it.cat}-${it.name}`)).length;
  const pct = totalItems > 0 ? Math.round((packedItems/totalItems)*100) : 0;

  const filtered = packingList.map(g => ({
    ...g,
    items: (g.items||[]).filter((it:any) => !search || it.name?.toLowerCase().includes(search.toLowerCase())),
  })).filter(g => !search || g.items.length > 0);

  const card: React.CSSProperties = { background:'#fff', border:'1px solid #f0dfc0', borderRadius:14, boxShadow:'0 2px 12px rgba(14,33,37,0.06)' };
  const TABS: { key:'packing'|'docs'|'laws'; label:string }[] = [
    { key:'packing', label:'Packing List' },
    { key:'docs',    label:'Documents' },
    { key:'laws',    label:'Laws & Nudges' },
  ];

  return (
    <div style={{ maxWidth:820, margin:'0 auto', padding:'28px 28px 80px', fontFamily:'DM Sans,sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:26, color:'#0e2125', marginBottom:4 }}>Packing Checklist</h1>
        <p style={{ fontSize:13, color:'#6b5c45' }}>
          {currentTrip ? <><strong style={{ color:'#e55803' }}>{currentTrip.destination}</strong> · {new Date(currentTrip.startDate).toLocaleDateString()}</> : 'Select a trip to load checklist'}
        </p>
      </div>

      {/* Progress bar */}
      {tab === 'packing' && totalItems > 0 && (
        <div style={{ ...card, padding:'16px 20px', marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <span style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, color:'#0e2125' }}>Overall Progress</span>
            <span style={{ fontSize:13, fontWeight:600, color:'#e55803' }}>{packedItems}/{totalItems} packed</span>
          </div>
          <div className="progress-track" style={{ height:10 }}>
            <motion.div className="progress-fill" style={{ height:10, width:`${pct}%` }}
              initial={{ width:0 }} animate={{ width:`${pct}%` }} transition={{ duration:0.8 }} />
          </div>
          <p style={{ fontSize:12, color:'#6b5c45', marginTop:6 }}>{pct}% complete</p>
        </div>
      )}

      {/* Tab switcher */}
      <div style={{ display:'flex', borderBottom:'2px solid #f0dfc0', marginBottom:20, gap:0 }}>
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ padding:'10px 20px', fontSize:14, fontWeight:600, cursor:'pointer', background:'none', border:'none',
              color: tab===key ? '#e55803' : '#6b5c45',
              borderBottom: tab===key ? '2px solid #e55803' : '2px solid transparent',
              marginBottom:-2, transition:'all 0.15s' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      {tab === 'packing' && (
        <div style={{ position:'relative', marginBottom:20 }}>
          <Search size={15} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#6b5c45', pointerEvents:'none' }} />
          <input className="r-input" style={{ paddingLeft:42, background:'#f5e8ca' }}
            placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      )}

      {loading && (
        <div style={{ textAlign:'center', padding:'48px 0', color:'#6b5c45', fontSize:14 }}>
          <motion.div animate={{ rotate:360 }} transition={{ repeat:Infinity,duration:1,ease:'linear' }} style={{ display:'inline-block', marginBottom:10 }}>
            <Package size={24} style={{ color:'#e55803' }} />
          </motion.div>
          <p>Loading checklist…</p>
        </div>
      )}

      {/* ── Packing tab ── */}
      {tab === 'packing' && !loading && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {filtered.map(group => {
            const cfg = CAT_CFG[group.category] || { Icon:Package, color:'#6b5c45', bg:'#f5e8ca' };
            const isOpen = expanded.has(group.category);
            const groupItems: any[] = group.items || [];
            const groupPacked = groupItems.filter(it => checked.has(`${group.category}-${it.name}`)).length;
            return (
              <div key={group.category} style={{ ...card, overflow:'hidden' }}>
                <button onClick={() => toggleCat(group.category)}
                  style={{ width:'100%', padding:'14px 18px', display:'flex', alignItems:'center', gap:12, cursor:'pointer', background:'none', border:'none', textAlign:'left' }}>
                  <div style={{ width:34, height:34, borderRadius:9, background:cfg.bg, color:cfg.color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <cfg.Icon size={16} />
                  </div>
                  <span style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, color:'#0e2125', flex:1, textTransform:'capitalize' }}>{group.category}</span>
                  <span style={{ fontSize:12, color:'#6b5c45', fontWeight:600 }}>{groupPacked}/{groupItems.length}</span>
                  <motion.div animate={{ rotate: isOpen?180:0 }} style={{ color:'#6b5c45' }}>
                    <ChevronDown size={16}/>
                  </motion.div>
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div initial={{ height:0,opacity:0 }} animate={{ height:'auto',opacity:1 }} exit={{ height:0,opacity:0 }} style={{ overflow:'hidden' }}>
                      <div style={{ padding:'0 18px 14px', borderTop:'1px solid #f5e8ca' }}>
                        {groupItems.map((item: any) => {
                          const key = `${group.category}-${item.name}`;
                          const isDone = checked.has(key);
                          return (
                            <div key={key} onClick={() => toggle(key)}
                              style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', cursor:'pointer', borderBottom:'1px solid #fafaf8', transition:'background 0.1s' }}>
                              {isDone
                                ? <CheckCircle2 size={18} style={{ color:'#e55803', flexShrink:0 }}/>
                                : <Circle size={18} style={{ color:'#d1c4b0', flexShrink:0 }}/>}
                              <span style={{ fontSize:13, color: isDone?'#b5a48a':'#0e2125', textDecoration: isDone?'line-through':'none', fontWeight: isDone?400:500, transition:'all 0.15s' }}>
                                {item.name}
                              </span>
                              {item.essential && !isDone && (
                                <span style={{ marginLeft:'auto', padding:'1px 8px', borderRadius:99, background:'#fde8d8', color:'#e55803', fontSize:10, fontWeight:700, flexShrink:0 }}>Essential</span>
                              )}
                            </div>
                          );
                        })}
                        {/* Custom add */}
                        <div style={{ display:'flex', gap:8, marginTop:10 }}>
                          <input className="r-input" style={{ flex:1, minHeight:36, padding:'7px 12px', fontSize:13 }}
                            placeholder={`Add to ${group.category}…`} value={customCat===group.category?customItem:''} 
                            onChange={e => { setCustomItem(e.target.value); setCustomCat(group.category); }} />
                          <button className="btn btn-ghost btn-sm"
                            onClick={() => {
                              if (!customItem.trim()) return;
                              setPackingList(prev => prev.map(g => g.category===group.category
                                ? { ...g, items:[...(g.items||[]), { name:customItem.trim() }] }
                                : g));
                              setCustomItem(''); setCustomCat('misc');
                            }}>
                            <Plus size={14}/>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
          {filtered.length === 0 && !loading && (
            <div style={{ textAlign:'center', padding:'40px 0', border:'2px dashed #f0dfc0', borderRadius:14, color:'#6b5c45', fontSize:14 }}>
              {search ? 'No items match your search.' : 'No packing list yet. Select a trip to generate one.'}
            </div>
          )}
        </div>
      )}

      {/* ── Docs tab ── */}
      {tab === 'docs' && !loading && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {docChecklist.map((doc: any, i: number) => {
            const sev = SEV_STYLE[doc.severity] || SEV_STYLE.info;
            return (
              <motion.div key={i} initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} transition={{ delay:i*0.04 }}
                style={{ ...card, padding:18, borderColor:sev.border, background:sev.bg }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8, flexWrap:'wrap', gap:8 }}>
                  <span style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, color:'#0e2125' }}>{doc.document || doc.name}</span>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {doc.severity && (
                      <span style={{ padding:'3px 10px', borderRadius:99, fontSize:10, fontWeight:700, textTransform:'uppercase', background:sev.bg, color:sev.color, border:`1px solid ${sev.border}` }}>
                        {doc.severity}
                      </span>
                    )}
                    {doc.status && (
                      <span style={{ padding:'3px 10px', borderRadius:99, fontSize:10, fontWeight:700, background:'#f5e8ca', color:'#6b5c45' }}>
                        {doc.status}
                      </span>
                    )}
                  </div>
                </div>
                {doc.description && <p style={{ fontSize:13, color:'#6b5c45', lineHeight:1.5 }}>{doc.description}</p>}
              </motion.div>
            );
          })}
          {docChecklist.length === 0 && (
            <div style={{ textAlign:'center', padding:'40px 0', border:'2px dashed #f0dfc0', borderRadius:14, color:'#6b5c45', fontSize:14 }}>
              No document requirements loaded yet.
            </div>
          )}
        </div>
      )}

      {/* ── Laws tab ── */}
      {tab === 'laws' && !loading && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {lawNudges.map((law: any, i: number) => (
            <motion.div key={i} initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} transition={{ delay:i*0.04 }}
              style={{ ...card, padding:18 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                {law.flag && <span style={{ fontSize:20 }}>{law.flag}</span>}
                <p style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, color:'#0e2125' }}>{law.rule || law.title}</p>
              </div>
              {law.description && <p style={{ fontSize:13, color:'#6b5c45', lineHeight:1.5 }}>{law.description}</p>}
            </motion.div>
          ))}
          {lawNudges.length === 0 && (
            <div style={{ textAlign:'center', padding:'40px 0', border:'2px dashed #f0dfc0', borderRadius:14, color:'#6b5c45', fontSize:14 }}>
              No laws or nudges available for this destination.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
