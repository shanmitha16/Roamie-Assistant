import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, X, Plane, Building2, ExternalLink, Trash2, CreditCard, Sparkles } from 'lucide-react';
import { useStore } from '../stores/useStore';
import type { CartItem } from '../stores/useStore';

export default function OpenClawCart() {
  const navigate = useNavigate();
  const { cart, removeFromCart, clearCart } = useStore();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false); };
    if (open) document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  const total = cart.reduce((s, it) => s + it.price, 0);
  const hotels  = cart.filter(c => c.type === 'hotel');
  const flights = cart.filter(c => c.type === 'flight');

  const book = (item: CartItem) => {
    if (item.bookingUrl) { window.open(item.bookingUrl, '_blank'); }
    else { navigate(`/payment/cart-${item.id}`, { state:{ cartItem:item, amount:item.price, flightNumber:item.type==='flight'?item.name:undefined, itemType:item.type } }); }
    setOpen(false);
  };

  return (
    <div style={{ position:'relative' }}>
      {/* Cart icon */}
      <motion.button whileHover={{ scale:1.08 }} whileTap={{ scale:0.92 }} onClick={() => setOpen(!open)}
        style={{ position:'relative', width:38, height:38, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', background: open?'#fde8d8':'transparent', border:'none', cursor:'pointer', transition:'background 0.15s' }}>
        <ShoppingCart size={20} style={{ color: open?'#e55803':'#6b5c45' }}/>
        {cart.length > 0 && (
          <motion.span initial={{ scale:0 }} animate={{ scale:1 }}
            style={{ position:'absolute', top:-4, right:-4, width:18, height:18, borderRadius:'50%', background:'#e55803', color:'#fff6e0', fontSize:9, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 8px rgba(229,88,3,0.4)' }}>
            {cart.length}
          </motion.span>
        )}
      </motion.button>

      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={() => setOpen(false)}
            style={{ position:'fixed', inset:0, background:'rgba(14,33,37,0.35)', backdropFilter:'blur(3px)', zIndex:40 }}/>
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {open && (
          <motion.div ref={panelRef} initial={{ x:'100%' }} animate={{ x:0 }} exit={{ x:'100%' }} transition={{ type:'spring', damping:26, stiffness:200 }}
            style={{ position:'fixed', top:0, right:0, bottom:0, width:'min(400px, 100vw)', background:'#fff', borderLeft:'1px solid #f0dfc0', boxShadow:'-8px 0 40px rgba(14,33,37,0.12)', zIndex:50, display:'flex', flexDirection:'column' }}>

            {/* Header */}
            <div style={{ padding:'18px 22px', borderBottom:'1px solid #f0dfc0', display:'flex', alignItems:'center', justifyContent:'space-between', background:'#fffbf5' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:34, height:34, borderRadius:9, background:'#fde8d8', color:'#e55803', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <ShoppingCart size={16}/>
                </div>
                <div>
                  <p style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15, color:'#0e2125' }}>OpenClaw Cart</p>
                  <p style={{ fontSize:11, color:'#6b5c45' }}>{cart.length} items secured</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} style={{ width:32, height:32, borderRadius:'50%', background:'#f5e8ca', color:'#6b5c45', display:'flex', alignItems:'center', justifyContent:'center', border:'none', cursor:'pointer' }}>
                <X size={16}/>
              </button>
            </div>

            {/* Body */}
            <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:20 }}>
              <div style={{ padding:'12px 14px', borderRadius:12, background:'#f5e8ca', border:'1px solid #f0dfc0', display:'flex', alignItems:'flex-start', gap:10 }}>
                <Sparkles size={14} style={{ color:'#e55803', flexShrink:0, marginTop:2 }}/>
                <p style={{ fontSize:13, color:'#0e2125', lineHeight:1.5 }}>
                  {cart.length===0
                    ? "Your cart is empty. Find flights and hotels on the dashboard."
                    : "I've secured these bookings. Confirm individually or book the full bundle below."}
                </p>
              </div>

              {cart.length > 0 && (
                <>
                  {hotels.length > 0 && (
                    <div>
                      <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#6b5c45', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
                        <Building2 size={12}/> Secured Hotels
                      </p>
                      {hotels.map(item => <CartCard key={item.id} item={item} onBook={book} onRemove={removeFromCart}/>)}
                    </div>
                  )}
                  {flights.length > 0 && (
                    <div>
                      <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#6b5c45', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
                        <Plane size={12}/> Secured Flights
                      </p>
                      {flights.map(item => <CartCard key={item.id} item={item} onBook={book} onRemove={removeFromCart}/>)}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {cart.length > 0 && (
              <div style={{ padding:'18px 20px', borderTop:'1px solid #f0dfc0', background:'#fffbf5', flexShrink:0 }}>
                <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:14 }}>
                  <div>
                    <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#6b5c45', marginBottom:2 }}>Total</p>
                    <p style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:28, color:'#0e2125' }}>₹{total.toLocaleString()}</p>
                  </div>
                  <button onClick={() => clearCart()} style={{ fontSize:12, fontWeight:600, color:'#ef4444', background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:8, padding:'6px 12px', cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                    <Trash2 size={12}/> Clear
                  </button>
                </div>
                <button className="btn btn-primary" style={{ width:'100%', height:50, fontSize:15, borderRadius:12, gap:8 }}
                  onClick={() => { navigate('/payment/cart-all', { state:{ cartItems:cart, amount:total, itemType:'bundle' } }); setOpen(false); }}>
                  <CreditCard size={17}/> Book Full Bundle
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CartCard({ item, onBook, onRemove }: { item:CartItem; onBook:(i:CartItem)=>void; onRemove:(id:string)=>void }) {
  const isHotel = item.type === 'hotel';
  return (
    <div style={{ background:'#fff', border:'1px solid #f0dfc0', borderRadius:12, padding:'14px 16px', marginBottom:8, position:'relative' }}>
      <div style={{ display:'flex', gap:12 }}>
        <div style={{ width:38, height:38, borderRadius:9, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background: isHotel?'#eff6ff':'#fde8d8', color: isHotel?'#1d4ed8':'#e55803', border:`1px solid ${isHotel?'#93c5fd':'#fdba74'}` }}>
          {isHotel ? <Building2 size={16}/> : <Plane size={16}/>}
        </div>
        <div style={{ flex:1, minWidth:0, paddingRight:24 }}>
          <p style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:13, color:'#0e2125', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</p>
          <p style={{ fontSize:11, color:'#6b5c45', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.details}</p>
          <p style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:16, color:'#0e2125', marginTop:4 }}>₹{item.price.toLocaleString()}</p>
        </div>
        <button onClick={e => { e.stopPropagation(); onRemove(item.id); }}
          style={{ position:'absolute', top:12, right:12, color:'#b5a48a', background:'none', border:'none', cursor:'pointer', padding:4 }}
          onMouseEnter={e=>(e.currentTarget.style.color='#ef4444')}
          onMouseLeave={e=>(e.currentTarget.style.color='#b5a48a')}>
          <Trash2 size={14}/>
        </button>
      </div>
      <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid #f5e8ca', display:'flex', justifyContent:'flex-end' }}>
        <button onClick={() => onBook(item)} className="btn btn-primary btn-sm" style={{ gap:6 }}>
          {item.bookingUrl ? <><ExternalLink size={12}/> Book External</> : <><CreditCard size={12}/> Quick Pay</>}
        </button>
      </div>
    </div>
  );
}
