/**
 * MyItinerary — Full end-to-end travel timeline.
 * Shows: Home → Outbound Flight → Hotel Check-in → Day-by-day activities → Hotel Check-out → Return Flight → Home
 * Also includes booked flights/hotels from cart and an inline disruption simulator.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Plane, Building2, MapPin, Clock, Calendar,
  ChevronDown, AlertTriangle, Zap, Check,
  Utensils, Eye, ShoppingBag, Bus, Coffee, Briefcase,
  Sparkles, Shield, ArrowRight, ExternalLink, Plus,
  RotateCcw, RefreshCw, Wallet
} from 'lucide-react';
import { useStore } from '../stores/useStore';
import api from '../lib/api';

// Timeline node types
type NodeType = 'home' | 'flight' | 'hotel' | 'day' | 'activity' | 'disruption' | 'return';

interface TimelineNode {
  id: string;
  type: NodeType;
  title: string;
  subtitle?: string;
  time?: string;
  details?: any;
  children?: TimelineNode[];
  status?: 'upcoming' | 'active' | 'completed' | 'disrupted';
}

const EVENT_ICONS: Record<string, typeof Utensils> = {
  food: Utensils, sightseeing: Eye, activity: Sparkles,
  shopping: ShoppingBag, transport: Bus, break: Coffee, meeting: Briefcase,
};

const EVENT_COLORS: Record<string, string> = {
  food: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  sightseeing: 'text-blue-700 bg-blue-50 border-blue-200',
  activity: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  shopping: 'text-pink-700 bg-pink-50 border-pink-200',
  transport: 'text-cyan-700 bg-cyan-50 border-cyan-200',
  break: 'text-purple-700 bg-purple-50 border-purple-200',
  meeting: 'text-amber-700 bg-amber-50 border-amber-200',
};

const NODE_ICONS: Record<NodeType, typeof Home> = {
  home: Home, flight: Plane, hotel: Building2, day: Calendar,
  activity: MapPin, disruption: AlertTriangle, return: Home,
};

const NODE_THEME: Record<NodeType, { bg: string; border: string; icon: string; glow: string }> = {
  home:       { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', glow: 'shadow-sm' },
  flight:     { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-600', glow: 'shadow-sm' },
  hotel:      { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-600', glow: 'shadow-sm' },
  day:        { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-600', glow: 'shadow-sm' },
  activity:   { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-600', glow: 'shadow-sm' },
  disruption: { bg: 'bg-rose-50', border: 'border-rose-200', icon: 'text-rose-600', glow: 'shadow-sm' },
  return:     { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', glow: 'shadow-sm' },
};

// Animated step indicator for building UI
function StepItem({ step, index }: { step: { icon: string; label: string; detail: string }; index: number }) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setActive(true), index * 2500);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <motion.div
      initial={{ opacity: 0.3, x: -10 }}
      animate={active ? { opacity: 1, x: 0 } : { opacity: 0.3, x: -10 }}
      transition={{ duration: 0.5 }}
      style={{ display:'flex', alignItems:'center', gap:14, padding:'10px 14px', borderRadius:12, border:'1px solid', borderColor:active?'#f0dfc0':'transparent', background:active?'#fff':'transparent', transition:'all 0.3s' }}
    >
      <span className="text-xl w-8 text-center">{step.icon}</span>
      <div className="flex-1">
        <p style={{ fontSize:13, fontWeight:600, color:active?'#0e2125':'#b5a48a' }}>{step.label}</p>
        {active && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-slate-500 mt-0.5"
          >
            {step.detail}
          </motion.p>
        )}
      </div>
      {active && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          style={{ width:20, height:20, borderRadius:"50%", background:"#e55803", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}
        >
          <Check size={12} className="text-white" />
        </motion.div>
      )}
    </motion.div>
  );
}


// ── Budget helpers ──────────────────────────────────────────
const CURR_SYMS: Record<string,string> = { INR:'₹',USD:'$',EUR:'€',GBP:'£',SGD:'S$',JPY:'¥',AED:'د.إ',AUD:'A$' };
function getTripBudget(tid: string) { try { return JSON.parse(localStorage.getItem('rb-'+tid)||'null'); } catch { return null; } }

export default function MyItinerary() {
  const navigate = useNavigate();
  const { currentTrip, cart, triggerDisruption, buildItinerary, itineraryBuilding, addCustomEvent, regenerateDay, undoDay } = useStore();

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['day-0']));
  const [disrupting, setDisrupting] = useState(false);
  const [disruptionResult, setDisruptionResult] = useState<any>(null);
  const [disruptionStep, setDisruptionStep] = useState(-1);
  const [building, setBuilding] = useState(false);
  const [energyLevel, setEnergyLevel] = useState<'high' | 'medium' | 'low'>('medium');
  const hasBuiltRef = useRef(false);

  // Add Plan form state
  const [addingToDayId, setAddingToDayId] = useState<string | null>(null);
  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [newPlanTime, setNewPlanTime] = useState('14:00');
  const [newPlanDuration, setNewPlanDuration] = useState(60);
  const [newPlanType, setNewPlanType] = useState('activity');
  const [newPlanLocation, setNewPlanLocation] = useState('');
  const [regeneratingDayId, setRegeneratingDayId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentTrip) return;
    if (hasBuiltRef.current) return;
    if (currentTrip.itinerary && currentTrip.itinerary.length > 0) {
      hasBuiltRef.current = true;
      return;
    }
    // If the store is already building (from createTrip), just wait for it
    if (itineraryBuilding) return;
    if (building) return;

    hasBuiltRef.current = true;
    setBuilding(true);
    buildItinerary(currentTrip.id)
      .catch(console.error)
      .finally(() => setBuilding(false));
  }, [currentTrip?.id, currentTrip?.itinerary?.length, itineraryBuilding]);

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const buildTimeline = (): TimelineNode[] => {
    if (!currentTrip) return [];
    const nodes: TimelineNode[] = [];

    nodes.push({
      id: 'home-start', type: 'home', title: 'Depart from Home',
      subtitle: 'Start of your journey',
      time: new Date(currentTrip.startDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
      status: 'completed',
    });

    const outboundFlight = currentTrip.flights?.[0];
    const cartFlights = cart.filter(c => c.type === 'flight' && c.tripId === currentTrip.id);

    if (outboundFlight) {
      nodes.push({
        id: `flight-${outboundFlight.id}`, type: 'flight',
        title: `${outboundFlight.airline || 'Flight'} ${outboundFlight.flightNumber}`,
        subtitle: `${outboundFlight.origin || 'Home'} → ${outboundFlight.destination || currentTrip.destination}`,
        time: outboundFlight.departureTime ? new Date(outboundFlight.departureTime).toLocaleString() : undefined,
        details: outboundFlight,
        status: outboundFlight.status === 'cancelled' ? 'disrupted' : 'active',
      });
    } else if (cartFlights.length > 0) {
      cartFlights.forEach((cf, i) => {
        nodes.push({
          id: `cart-flight-${i}`, type: 'flight',
          title: cf.name, subtitle: cf.details, time: cf.details, details: cf, status: 'upcoming',
        });
      });
    }

    const hotel = currentTrip.hotels?.[0];
    const cartHotels = cart.filter(c => c.type === 'hotel' && c.tripId === currentTrip.id);

    if (hotel) {
      nodes.push({
        id: `hotel-${hotel.id}`, type: 'hotel',
        title: hotel.hotelName || 'Hotel Check-in',
        subtitle: `Check-in: ${new Date(hotel.checkIn).toLocaleDateString()}`,
        details: hotel, status: 'active',
      });
    } else if (cartHotels.length > 0) {
      cartHotels.forEach((ch, i) => {
        nodes.push({
          id: `cart-hotel-${i}`, type: 'hotel',
          title: ch.name, subtitle: ch.details, details: ch, status: 'upcoming',
        });
      });
    }

    const itinerary = currentTrip.itinerary || [];
    itinerary.forEach((day: any, dayIdx: number) => {
      const dayDate = day.date ? new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : `Day ${dayIdx + 1}`;
      const events = day.events || [];

      nodes.push({
        id: `day-${dayIdx}`, type: 'day',
        title: `Day ${dayIdx + 1} — ${dayDate}`,
        subtitle: `${events.length} activities planned`,
        details: { dayId: day.id },
        children: events.map((evt: any, evtIdx: number) => ({
          id: `day-${dayIdx}-evt-${evtIdx}`, type: 'activity',
          title: evt.title, subtitle: evt.location || evt.description,
          time: evt.time, details: { ...evt, userAdded: evt.userAdded }, status: 'upcoming',
        })),
        status: dayIdx === 0 ? 'active' : 'upcoming',
      });
    });

    nodes.push({
      id: 'disruption-shield', type: 'disruption', title: 'Disruption Shield',
      subtitle: 'Simulate a flight cancellation in real-time', status: 'upcoming',
    });

    nodes.push({
      id: 'home-return', type: 'return', title: `Return Home`,
      subtitle: `End of your journey from ${currentTrip.destination}`,
      time: new Date(currentTrip.endDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
      status: 'upcoming',
    });

    return nodes;
  };

  const timeline = buildTimeline();

  const handleSimulateDisruption = async () => {
    if (!currentTrip) return;
    const flight = currentTrip.flights?.[0] || cart.find(c => c.type === 'flight');
    if (!flight) return;

    setDisrupting(true);
    setDisruptionStep(0);
    setDisruptionResult(null);

    try {
      const flightIdToDisrupt = flight.id;
      const result = await triggerDisruption(currentTrip.id, flightIdToDisrupt, 'cancelled', false);
      for (let i = 0; i < 5; i++) {
        await new Promise(r => setTimeout(r, 400));
        setDisruptionStep(i + 1);
      }
      setDisruptionResult(result);
    } catch (e) {
      console.error(e);
    }
    setDisrupting(false);
  };

  if (!currentTrip) {
    return (
      <div className="flex flex-col items-center justify-center p-12 mt-20 max-w-lg mx-auto r-card rounded-3xl text-center">
        <Calendar size={64} style={{ color: '#b5a48a', marginBottom: 24 }} />
        <h2 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 28, color: '#0e2125', marginBottom: 12 }}>No Trip Selected</h2>
        <p style={{ color: '#6b5c45', marginBottom: 32, fontSize: 15, maxWidth: 360 }}>Go to the Dashboard and create or select a trip to see your full interactive itinerary here.</p>
        <button onClick={() => navigate('/dashboard')} className="btn btn-primary" style={{ padding: '14px 28px' }}>
          Go to Dashboard
        </button>
      </div>
    );
  }

  const tripBudget = currentTrip ? getTripBudget(currentTrip.id) : null;

  if (!tripBudget) {
    return (
      <div className="flex flex-col items-center justify-center p-12 mt-20 max-w-lg mx-auto r-card rounded-3xl text-center">
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#fde8d8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, boxShadow: '0 8px 24px rgba(229,88,3,0.15)' }}>
          <Wallet size={36} style={{ color: '#e55803' }} />
        </div>
        <h2 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 28, color: '#0e2125', marginBottom: 16 }}>Set Your Budget First</h2>
        <p style={{ color: '#6b5c45', marginBottom: 32, fontSize: 16, lineHeight: 1.5 }}>
          Before the AI can craft your perfect personalized itinerary for <strong>{currentTrip.destination}</strong>, we need to know your travel budget!
        </p>
        <button onClick={() => navigate('/dashboard')} className="btn btn-primary" style={{ padding: '14px 28px', gap: 10, fontSize: 16 }}>
          Set Budget on Dashboard <ArrowRight size={18} />
        </button>
      </div>
    );
  }

  if (building || itineraryBuilding) {
    const steps = [
      { icon: '🌍', label: 'Discovering places', detail: `Finding top attractions in ${currentTrip?.destination || 'your destination'}...` },
      { icon: '📅', label: 'Optimizing schedule', detail: 'Arranging activities for the best experience...' },
      { icon: '🚕', label: 'Adding travel segments', detail: 'Inserting transit between locations...' },
      { icon: '☕', label: 'Planning breaks', detail: 'Adding breathing room so you do not burn out...' },
      { icon: '✨', label: 'Finalizing itinerary', detail: 'Polishing your personalized travel plan...' },
    ];

    return (
      <div className="flex flex-col items-center justify-center p-8 mt-12 max-w-xl mx-auto text-center">
        {/* Pulsing destination globe */}
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-3xl shadow-lg shadow-blue-500/30 mb-8"
        >
          🗺️
        </motion.div>

        <h2 className="font-display font-bold text-2xl text-slate-900 mb-2">
          Crafting Your {currentTrip?.destination || ''} Adventure
        </h2>
        <p className="text-slate-500 mb-8 text-sm">
          AI is building a personalized itinerary just for you
        </p>

        {/* Animated progress bar */}
        <div className="w-full bg-slate-100 rounded-full h-2 mb-8 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 rounded-full"
            initial={{ width: '5%' }}
            animate={{ width: '90%' }}
            transition={{ duration: 15, ease: 'easeOut' }}
          />
        </div>

        {/* Step list */}
        <div className="w-full space-y-3 text-left">
          {steps.map((step, idx) => (
            <StepItem key={idx} step={step} index={idx} />
          ))}
        </div>

        <p className="text-xs text-slate-400 mt-8 italic">
          💡 Tip: You can adjust the energy level after the itinerary is built to make it busier or more relaxed.
        </p>
      </div>
    );
  }



  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 28px 80px', fontFamily: 'DM Sans, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 26, color: '#0e2125', marginBottom: 4 }}>My Itinerary</h1>
        <p style={{ color: '#6b5c45', fontSize: 14 }}>
          Master plan for <strong style={{ color: '#e55803' }}>{currentTrip.destination}</strong>
        </p>
        <div className="flex flex-wrap gap-3 mt-4">
          <span style={{ padding:"4px 12px", borderRadius:99, background:"#fff", border:"1px solid #f0dfc0", color:"#0e2125", fontSize:12, fontWeight:600 }}>
            {new Date(currentTrip.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(currentTrip.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <span style={{ padding:"4px 12px", borderRadius:99, background:"#dcfce7", border:"1px solid #86efac", color:"#15803d", fontSize:12, fontWeight:600 }}>
            {timeline.filter(n => n.type === 'day').length} days total
          </span>
          {cart.filter(c => c.tripId === currentTrip.id).length > 0 && (
            <span style={{ padding:"4px 12px", borderRadius:99, background:"#fef3c7", border:"1px solid #fcd34d", color:"#92400e", fontSize:12, fontWeight:600 }}>
              {cart.filter(c => c.tripId === currentTrip.id).length} bookings in cart
            </span>
          )}
          <button
            onClick={async () => {
              try {
                const response = await api.get(`/itinerary/${currentTrip.id}/export`, { responseType: 'blob' });
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `itinerary-${currentTrip.destination}.txt`);
                document.body.appendChild(link);
                link.click();
                link.remove();
              } catch (e) {
                console.error('Export failed', e);
              }
            }}
            className="btn btn-ghost btn-sm" style={{ borderRadius: 99, gap: 6 }}
          >
            <ExternalLink size={13} /> Export
          </button>
          <button
            onClick={() => {
              if (!currentTrip || building) return;
              hasBuiltRef.current = false;
              setBuilding(true);
              buildItinerary(currentTrip.id, [], [], energyLevel)
                .catch(console.error)
                .finally(() => setBuilding(false));
            }}
            disabled={building}
            className="btn btn-primary btn-sm" style={{ borderRadius: 99, gap: 6 }}
          >
            <Sparkles size={13} /> {building ? 'Rebuilding...' : 'Rebuild'}
          </button>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Energy:</span>
          {(['low', 'medium', 'high'] as const).map(level => (
            <button
              key={level}
              onClick={() => setEnergyLevel(level)}
              className='btn btn-sm' style={{ borderRadius: 99, padding: '5px 14px', minHeight: 30, fontSize: 12, background: energyLevel===level?'#e55803':'#f5e8ca', color: energyLevel===level?'#fff6e0':'#6b5c45', borderColor: energyLevel===level?'#e55803':'#f0dfc0' }}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Budget breakdown */}
      {tripBudget && (() => {
        const sym = CURR_SYMS[tripBudget.currency] || '';
        const cats = [
          { label:'Accommodation', amount:tripBudget.breakdown.accommodation, color:'#6366f1' },
          { label:'Food',          amount:tripBudget.breakdown.food,          color:'#22c55e' },
          { label:'Activities',    amount:tripBudget.breakdown.activities,    color:'#e55803' },
          { label:'Transport',     amount:tripBudget.breakdown.transport,     color:'#f59e0b' },
          { label:'Misc',          amount:tripBudget.breakdown.misc,          color:'#a855f7' },
        ];
        return (
          <div style={{ background:'#fff', border:'1px solid #f0dfc0', borderRadius:14, padding:'18px 20px', marginBottom:24, boxShadow:'0 2px 12px rgba(14,33,37,0.06)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:10 }}>
              <div>
                <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'#6b5c45' }}>Trip Budget</p>
                <p style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:22, color:'#0e2125' }}>
                  {sym}{tripBudget.total.toLocaleString()} <span style={{ fontSize:13, color:'#6b5c45', fontWeight:500 }}>{tripBudget.currency}</span>
                </p>
                {tripBudget.preferences && <p style={{ fontSize:12, color:'#6b5c45', marginTop:2 }}>🎯 {tripBudget.preferences}</p>}
              </div>
              <span style={{ padding:'4px 12px', borderRadius:99, background:'#fde8d8', border:'1px solid #fdba74', fontSize:11, fontWeight:700, color:'#e55803' }}>
                Budget-Locked Itinerary
              </span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8 }} className="grid grid-cols-2 sm:grid-cols-5">
              {cats.map(c => (
                <div key={c.label} style={{ borderRadius:10, padding:'10px 12px', background:'#fff6e0', border:'1px solid #f0dfc0' }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:c.color, marginBottom:6 }} />
                  <p style={{ fontSize:11, color:'#6b5c45', fontWeight:600 }}>{c.label}</p>
                  <p style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:13, color:'#0e2125' }}>{sym}{c.amount.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Timeline Container */}
      <div className="relative">
        {/* Glowy Vertical Line */}
        <div style={{ position:"absolute", left:27, top:24, bottom:24, width:3, borderRadius:99, background:"linear-gradient(to bottom, #fde8d8, #e55803, #f5e8ca)", opacity:0.4, filter:"blur(2px)" }}></div>
        <div style={{ position:"absolute", left:28, top:24, bottom:24, width:2, borderRadius:99, background:"linear-gradient(to bottom, #e55803, #f0dfc0)", opacity:0.5, zIndex:0 }}></div>

        <div className="space-y-6">
          {timeline.map((node, idx) => {
            const Icon = NODE_ICONS[node.type];
            const theme = NODE_THEME[node.type];
            const isExpanded = expandedNodes.has(node.id);
            const hasChildren = node.children && node.children.length > 0;
            const isDisruptionNode = node.type === 'disruption';

            return (
              <div key={node.id} style={{ position: 'relative', paddingLeft: 64 }}>
                {/* Node Dot */}
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: idx * 0.05 }}
                  className={`absolute left-[16px] top-5 w-7 h-7 rounded-full border-2 border-white flex items-center justify-center z-10 ${theme.bg} ${theme.border} ${theme.glow} backdrop-blur-md`}
                >
                  <Icon size={12} className={theme.icon} strokeWidth={3} />
                </motion.div>

                {/* Node Glass Card */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                  className={`r-card overflow-hidden transition-all relative z-10 group ${node.status === 'disrupted' ? 'border-rose-300 ring-1 ring-rose-200/50' : ''}`} style={{ borderRadius:14 }}
                >
                  {/* Card Header (Clickable if has children) */}
                  <div
                    onClick={() => (hasChildren || isDisruptionNode) && toggleNode(node.id)}
                    style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: (hasChildren || isDisruptionNode) ? 'pointer' : 'default' }}
                  >
                    <div className="flex-1 min-w-0" style={{ paddingRight: 16 }}>
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <span className="font-display font-bold text-lg text-slate-900 truncate">{node.title}</span>
                        {node.status === 'disrupted' && (
                          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                            Action Required
                          </span>
                        )}
                        {node.status === 'active' && (
                          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active Stage
                          </span>
                        )}
                      </div>
                      
                      {node.subtitle && (
                        <p className="text-sm font-medium text-slate-500 truncate mt-1">{node.subtitle}</p>
                      )}
                      
                      {node.time && (
                        <div className="flex items-center gap-1.5 mt-2 text-slate-500">
                          <Clock size={12} />
                          <span className="text-xs font-semibold">{node.time}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      {node.details?.bookingUrl && (
                        <a href={node.details.bookingUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                          className="btn btn-secondary btn-sm hidden sm:flex" style={{ gap:6 }}
                        >
                          <ExternalLink size={12} /> View Booking
                        </a>
                      )}
                      {/* Per-day Rebuild & Undo buttons */}
                      {node.type === 'day' && node.details?.dayId && (
                        <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                          <button
                            title="Rebuild this day"
                            disabled={regeneratingDayId === node.details.dayId}
                            onClick={async () => {
                              if (!currentTrip) return;
                              setRegeneratingDayId(node.details.dayId);
                              try {
                                await regenerateDay(currentTrip.id, node.details.dayId, energyLevel);
                              } catch {} finally {
                                setRegeneratingDayId(null);
                              }
                            }}
                            style={{ width:28, height:28, borderRadius:8, background:"#f5e8ca", border:"1px solid #f0dfc0", display:"flex", alignItems:"center", justifyContent:"center", color:"#6b5c45", cursor:"pointer", flexShrink:0 }}
                          >
                            <RefreshCw size={13} className={regeneratingDayId === node.details.dayId ? 'animate-spin' : ''} />
                          </button>
                          <button
                            title="Undo last change"
                            onClick={async () => {
                              await undoDay(node.details.dayId);
                            }}
                            style={{ width:28, height:28, borderRadius:8, background:"#f5e8ca", border:"1px solid #f0dfc0", display:"flex", alignItems:"center", justifyContent:"center", color:"#6b5c45", cursor:"pointer", flexShrink:0 }}
                          >
                            <RotateCcw size={13} />
                          </button>
                        </div>
                      )}
                      {(hasChildren || isDisruptionNode) && (
                        <div style={{ width:32, height:32, borderRadius:"50%", background:"#f5e8ca", border:"1px solid #f0dfc0", display:"flex", alignItems:"center", justifyContent:"center", color:"#6b5c45" }}>
                          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                            <ChevronDown size={18} />
                          </motion.div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded Activities Pipeline */}
                  <AnimatePresence>
                    {isExpanded && hasChildren && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="px-5 pb-5 pt-2 border-t border-slate-200 space-y-3 relative">
                          {/* Inner Timeline line */}
                          <div className="absolute left-[39px] top-6 bottom-6 w-px bg-slate-200 z-0"></div>
                          
                          {node.children!.map((child, _cIdx) => {
                            const evtType = child.details?.type || 'activity';
                            const EvtIcon = EVENT_ICONS[evtType] || MapPin;
                            const evtColorTheme = EVENT_COLORS[evtType] || 'text-slate-500 bg-slate-100 border-slate-200';
                            
                            // Check if this is a "free gap" / breathing room
                            const isGap = child.details?.isBreathingRoom;

                            return (
                              <div key={child.id} className={`relative z-10 flex gap-4 p-4 rounded-xl transition-colors ${child.details?.userAdded ? 'bg-slate-50 border border-slate-200 hover:bg-slate-100/50 shadow-sm overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-slate-800' : isGap ? 'bg-slate-50 border border-dashed border-slate-200' : 'bg-slate-50 border border-slate-100 hover:bg-white hover:border-slate-200 hover:shadow-sm'}`}>
                                <div className={`w-10 h-10 rounded-xl flex shrink-0 items-center justify-center border ${evtColorTheme} ${child.details?.userAdded ? 'ml-1' : ''}`}>
                                  <EvtIcon size={18} />
                                </div>
                                <div className="flex-1 min-w-0 py-0.5">
                                  <div className="flex items-start justify-between gap-4">
                                    <div>
                                      <h4 className="text-sm font-bold text-slate-900 flex items-center flex-wrap gap-2">
                                        {child.title}
                                        {child.details?.userAdded && (
                                          <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-slate-200 text-slate-700 border border-slate-300 shadow-sm">Your Plan</span>
                                        )}
                                      </h4>
                                      {child.subtitle && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{child.subtitle}</p>}
                                    </div>
                                    {child.time && (
                                      <span className="text-xs font-semibold text-slate-600 whitespace-nowrap bg-white shadow-sm px-2 py-1 rounded-md border border-slate-200">{child.time}</span>
                                    )}
                                  </div>
                                  
                                  {/* Cultural Nudge embedded here if exists */}
                                  {child.details?.culturalNudge && (
                                    <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex gap-2">
                                      <Sparkles size={14} className="text-amber-600 shrink-0 mt-0.5" />
                                      <span className="text-xs font-medium text-amber-800 leading-snug">{child.details.culturalNudge}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {/* Add Plan Button / Form */}
                          {node.details?.dayId && (
                            addingToDayId === node.details.dayId ? (
                              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                className="relative z-10 p-5 rounded-2xl bg-slate-50 border border-dashed border-slate-300 shadow-sm space-y-4"
                              >
                                <p className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                                  <Sparkles size={12} className="text-slate-400" />
                                  Add Your Plan
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                  <input value={newPlanTitle} onChange={e => setNewPlanTitle(e.target.value)} placeholder="What are you planning?" className="col-span-2 px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 shadow-sm placeholder:text-slate-400 outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-shadow" />
                                  <input type="time" value={newPlanTime} onChange={e => setNewPlanTime(e.target.value)} className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 shadow-sm outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-shadow" />
                                  <select value={newPlanDuration} onChange={e => setNewPlanDuration(Number(e.target.value))} className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 shadow-sm outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-shadow">
                                    <option value={30}>30 min</option>
                                    <option value={60}>1 hour</option>
                                    <option value={90}>1.5 hours</option>
                                    <option value={120}>2 hours</option>
                                    <option value={180}>3 hours</option>
                                  </select>
                                  <select value={newPlanType} onChange={e => setNewPlanType(e.target.value)} className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 shadow-sm outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-shadow">
                                    <option value="activity">Activity</option>
                                    <option value="food">Food / Dining</option>
                                    <option value="sightseeing">Sightseeing</option>
                                    <option value="shopping">Shopping</option>
                                    <option value="meeting">Meeting</option>
                                    <option value="transport">Transport</option>
                                  </select>
                                  <input value={newPlanLocation} onChange={e => setNewPlanLocation(e.target.value)} placeholder="Location (optional)" className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 shadow-sm placeholder:text-slate-400 outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-shadow" />
                                </div>
                                <div className="flex gap-2 pt-2">
                                  <button
                                    onClick={async () => {
                                      if (!newPlanTitle.trim()) return;
                                      await addCustomEvent(node.details.dayId, {
                                        time: newPlanTime,
                                        duration_minutes: newPlanDuration,
                                        type: newPlanType,
                                        title: newPlanTitle.trim(),
                                        description: `Custom plan added by you`,
                                        location: newPlanLocation || currentTrip?.destination || '',
                                        isGapSuggestion: false,
                                        isBreathingRoom: false,
                                      });
                                      setNewPlanTitle(''); setNewPlanLocation('');
                                      setAddingToDayId(null);
                                    }}
                                    className="flex-1 py-2.5 rounded-lg bg-slate-900 border border-slate-900 hover:bg-slate-800 text-white text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2"
                                  >
                                    <Plus size={16} /> Add to Itinerary
                                  </button>
                                  <button
                                    onClick={() => setAddingToDayId(null)}
                                    className="px-5 py-2.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 text-sm font-semibold shadow-sm transition-all"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </motion.div>
                            ) : (
                              <button
                                onClick={() => setAddingToDayId(node.details.dayId)}
                                className="btn btn-ghost" style={{ width:"100%", borderStyle:"dashed", borderRadius:12 }}
                              >
                                <Plus size={16} /> Add Your Plan
                              </button>
                            )
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Disruption Shield Action Panel */}
                  <AnimatePresence>
                    {isExpanded && isDisruptionNode && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="border-t border-rose-200 p-6 bg-gradient-to-b from-rose-50 to-white">
                          
                          {!disruptionResult ? (
                            <div className="text-center py-4">
                              <Shield size={36} className="text-rose-500 mx-auto mb-4" />
                              <h3 className="font-display font-medium text-rose-700 mb-6 text-sm">
                                AI monitors your trip 24/7. Want to see it in action?
                              </h3>
                              <button
                                disabled={disrupting || (!currentTrip?.flights?.[0] && !cart.find(c => c.type === 'flight'))}
                                onClick={handleSimulateDisruption}
                                className="px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold shadow-md shadow-rose-500/25 transition-all text-sm flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {disrupting ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><Zap size={16} /></motion.div> : <Zap size={16} />}
                                {disrupting ? 'Triggering Agents...' : 'Simulate Flight Cancellation'}
                              </button>
                              
                              {/* Loading Steps pipeline */}
                              {disrupting && (
                                <div className="mt-8 max-w-sm mx-auto space-y-3">
                                  {['Coordinator Intercepted', 'Search Agent Executing', 'Booking Agent Isolating', 'Clawbot Securing Payment', 'Finalizing Recovery'].map((label, i) => (
                                    <div key={i} className={`flex items-center gap-3 text-sm font-medium transition-opacity duration-300 ${i <= disruptionStep ? 'opacity-100' : 'opacity-30'}`}>
                                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${i < disruptionStep ? 'bg-emerald-50 border-emerald-500/50 text-emerald-600' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                                        {i < disruptionStep ? <Check size={10} strokeWidth={3} /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
                                      </div>
                                      <span className={i < disruptionStep ? 'text-emerald-700' : i === disruptionStep ? 'text-rose-600 animate-pulse' : 'text-slate-500'}>{label}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                              <div className="flex items-center gap-3 mb-6 bg-emerald-50 border border-emerald-200 p-4 rounded-xl shadow-sm">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                  <Check size={20} className="text-emerald-600" />
                                </div>
                                <div>
                                  <h4 className="font-bold text-emerald-700">Crisis Averted</h4>
                                  <p className="text-xs text-emerald-600">AI agents found and secured alternatives instantly.</p>
                                </div>
                              </div>
                              
                              <div className="space-y-3">
                                {disruptionResult.alternativeFlights?.slice(0, 2).map((f: any, i: number) => (
                                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                                    <div>
                                      <div className="flex items-center gap-2 mb-1">
                                        <Plane size={14} className="text-blue-500" />
                                        <span className="font-bold text-slate-900">{f.airline} {f.flightNumber}</span>
                                      </div>
                                      <p className="text-xs text-slate-500 font-medium">{f.departure} · {f.duration}</p>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end gap-4 min-w-[140px]">
                                      <span className="font-bold text-lg text-slate-900">₹{f.price?.toLocaleString()}</span>
                                      {f.bookingUrl && (
                                        <a href={f.bookingUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors">
                                          Book
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              
                              <div className="pt-4 text-center">
                                <button onClick={() => navigate('/disruption')} className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center gap-1.5 px-4 py-2 rounded-lg hover:bg-blue-50">
                                  View Pipeline Details <ArrowRight size={14} />
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
