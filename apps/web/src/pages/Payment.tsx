import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Check, ShieldCheck, ArrowLeft, Plane, Building2, ShoppingCart, QrCode, Lock, Zap } from 'lucide-react';
import { useStore } from '../stores/useStore';

export default function Payment() {
  const { token } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { confirmDisruption, removeFromCart, clearCart } = useStore();

  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  // Support multiple payment sources
  const cartItem = location.state?.cartItem;
  const cartItems = location.state?.cartItems;
  const itemType = location.state?.itemType || 'flight';
  const amount = location.state?.amount || 15400;
  const flightNumber = location.state?.flightNumber || 'FL-NEW';

  const isCartPayment = !!cartItem || !!cartItems;
  const isBundlePayment = !!cartItems && cartItems.length > 0;

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setProcessing(true);

    try {
      // Simulate network wait for payment gateway
      await new Promise(r => setTimeout(r, 2000));

      if (isCartPayment) {
        // For cart items â€” remove from cart after successful payment
        if (isBundlePayment) {
          clearCart();
        } else if (cartItem) {
          removeFromCart(cartItem.id);
        }
      } else {
        // Original disruption confirm flow
        await confirmDisruption(token!);
      }

      setSuccess(true);

      // Auto redirect to dashboard after success
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);

    } catch (err) {
      console.error(err);
      setProcessing(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.1)_0%,transparent_50%)] pointer-events-none" />
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center z-10">
          <motion.div
            initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', damping: 15 }}
            className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-500 to-emerald-400 mx-auto flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.4)] mb-8"
          >
            <Check size={48} className="text-white" strokeWidth={3} />
          </motion.div>

          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
            <h1 className="font-display font-bold text-4xl text-white mb-3">Payment Secured</h1>
            <p className="text-[#22c55e]/80 font-medium text-lg mb-8">
              {isCartPayment ? 'Your OpenClaw payload is confirmed.' : 'Flight rebooking is confirmed.'}
            </p>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0e2125] border border-[#f0dfc0] text-[#6b5c45]/70 text-sm font-bold shadow-inner">
              <Zap size={14} className="text-[#e55803] animate-pulse" /> Routing to Dashboard...
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] flex relative">
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#e55803]/5 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2" />

      {/* Left: Form */}
      <div className="flex-1 flex flex-col p-8 lg:px-20 lg:py-12 z-10 overflow-y-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[#6b5c45]/70 hover:text-white transition-colors w-fit mb-12 group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold text-sm tracking-wide">Back to Checkout</span>
        </button>

        <div className="max-w-lg w-full mx-auto lg:mx-0">
          <h1 className="font-display font-extrabold text-4xl text-white mb-2">Secure Checkout</h1>
          <p className="text-[#6b5c45]/70 font-medium mb-12">
            {isCartPayment
              ? isBundlePayment
                ? `Securing ${cartItems.length} items via OpenClaw.`
                : `Securing ${cartItem?.name || 'item'} via OpenClaw.`
              : `Confirming flight ${flightNumber}.`
            }
          </p>

          <form onSubmit={handlePayment} className="space-y-8">

            {/* Express Pay */}
            <div className="grid grid-cols-2 gap-4">
              <button type="button" className="h-12 rounded-xl flex items-center justify-center gap-2 bg-slate-800 text-white font-bold border border-[#f0dfc0] hover:bg-slate-700 transition-colors shadow-sm relative overflow-hidden group">
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <svg viewBox="0 0 384 512" width="16" height="16" fill="currentColor"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.3 48.6-.9 87.2-86.8 100.8-112.5-39.7-18.7-59.5-51.5-59.9-98.1zM196.4 69.4c14.2-18.8 24.3-43 21.6-69.4-21.8 1.1-47.7 14.8-63.1 33.3-13.6 15.6-25 39.6-21.7 64.9 24.2 1.9 48.2-11.4 63.2-28.8z" /></svg>
                Pay
              </button>
              <button type="button" className="h-12 rounded-xl flex items-center justify-center gap-2 bg-slate-800 text-white font-bold border border-[#f0dfc0] hover:bg-slate-700 transition-colors shadow-sm relative overflow-hidden group">
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <svg viewBox="0 0 488 512" width="16" height="16" fill="currentColor"><path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" /></svg>
                Pay
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-xs font-bold uppercase tracking-widest text-[#6b5c45]">Or Pay With Card</span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>

            {/* Card Form */}
            <div className="space-y-4 relative">
              <div className="absolute -inset-4 bg-slate-800/20 rounded-3xl -z-10 blur-xl pointer-events-none" />

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-[#6b5c45] mb-2 block">Card Details</label>
                <div className="bg-[#0e2125] border border-[#f0dfc0] rounded-2xl overflow-hidden focus-within:border-[#e55803]/50 focus-within:ring-1 focus-within:ring-[#e55803]/50 transition-all shadow-inner">
                  <div className="flex items-center px-4 border-b border-slate-800">
                    <CreditCard size={18} className="text-[#6b5c45]" />
                    <input type="text" placeholder="Card Number" required className="w-full h-14 bg-transparent border-none outline-none text-white px-3 font-mono placeholder:text-[#6b5c45] tracking-wider" />
                  </div>
                  <div className="flex">
                    <input type="text" placeholder="MM / YY" required className="w-1/2 h-14 bg-transparent border-r border-slate-800 outline-none text-white px-4 font-mono placeholder:text-[#6b5c45]" />
                    <input type="text" placeholder="CVC" required className="w-1/2 h-14 bg-transparent outline-none text-white px-4 font-mono placeholder:text-[#6b5c45]" />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-[#6b5c45] mb-2 block">Name on Card</label>
                <input type="text" placeholder="Full Name" required className="w-full h-14 bg-[#0e2125] border border-[#f0dfc0] rounded-xl outline-none text-white px-4 placeholder:text-[#6b5c45] focus:border-[#e55803]/50 focus:ring-1 focus:ring-[#e55803]/50 transition-all font-medium" />
              </div>
            </div>

            {/* Security Notice */}
            <div className="flex items-start gap-3 bg-[#22c55e]/5 border border-[#22c55e]/20 p-4 rounded-xl">
              <ShieldCheck size={20} className="text-[#22c55e] shrink-0 mt-0.5" />
              <p className="text-sm text-[#6b5c45]/70 font-medium leading-relaxed">
                <strong className="text-[#22c55e]">Bank-level Encryption.</strong> Your data is secured with AES-256 bit SSL encryption. OpenClaw does not store your direct card credentials.
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              disabled={processing}
              type="submit"
              className="w-full h-14 rounded-2xl font-bold text-[#0e2125] bg-[#e55803] hover:bg-[#c44a00] transition-colors shadow-[0_0_20px_rgba(229,88,3,0.2)] disabled:opacity-50 flex items-center justify-center gap-2 relative overflow-hidden"
            >
              <AnimatePresence mode="wait">
                {processing ? (
                  <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    Authenticating...
                  </motion.div>
                ) : (
                  <motion.span key="pay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                    <Lock size={18} /> Pay â‚¹{amount.toLocaleString()}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

          </form>
        </div>
      </div>

      {/* Right: Summary Panel */}
      <div className="hidden lg:flex w-[480px] bg-[#0e2125] border-l border-slate-800 flex-col relative z-20">
        <div className="p-10 flex-1 overflow-y-auto">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-[#f0dfc0] shadow-inner">
              <ShoppingCart size={18} className="text-[#e55803]" />
            </div>
            <h3 className="font-display font-bold text-xl text-white">Order Summary</h3>
          </div>

          <div className="space-y-4 mb-10">
            {isBundlePayment ? (
              cartItems.map((item: any) => (
                <div key={item.id} className="group glass-panel border border-slate-800 rounded-2xl p-4 flex gap-4 transition-colors hover:border-[#f0dfc0]">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${item.type === 'hotel' ? 'bg-[#e55803]/10 border-[#e55803]/20 text-[#e55803]' : 'bg-[#e55803]/10 border-[#e55803]/20 text-[#e55803]'}`}>
                    {item.type === 'hotel' ? <Building2 size={20} /> : <Plane size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-slate-200 truncate">{item.name}</p>
                    <p className="text-xs text-[#6b5c45]/70 font-medium truncate mt-1">{item.details}</p>
                    <p className="font-display font-bold text-white text-lg mt-2">â‚¹{item.price?.toLocaleString()}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="glass-panel border border-slate-800 rounded-2xl p-5 flex gap-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${cartItem?.type === 'hotel' ? 'bg-[#e55803]/10 border-[#e55803]/20 text-[#e55803]' : 'bg-[#e55803]/10 border-[#e55803]/20 text-[#e55803]'}`}>
                  {cartItem?.type === 'hotel' ? <Building2 size={24} /> : <Plane size={24} />}
                </div>
                <div>
                  <p className="font-display font-bold text-slate-200 text-lg">{isCartPayment ? cartItem?.name : 'Emergency Rebook'}</p>
                  <p className="text-sm text-[#6b5c45]/70 font-medium mt-1">{isCartPayment ? cartItem?.details : flightNumber}</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-800/50 border border-[#f0dfc0]/50 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[#6b5c45]/70 font-medium text-sm">Subtotal</span>
              <span className="text-slate-200 font-bold">â‚¹{amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pb-6 border-b border-[#f0dfc0]/50 mb-6">
              <span className="text-[#6b5c45]/70 font-medium text-sm flex items-center gap-1.5"><GlobeIcon size={14} /> Node Processing</span>
              <span className="text-[#22c55e] font-bold text-sm">Included</span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-white font-bold text-lg">Total Payload</span>
              <span className="font-display font-extrabold text-[#e55803] text-4xl leading-none">â‚¹{amount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Floating QR UI Element */}
        <div className="border-t border-slate-800 p-10 flex items-center gap-6 bg-[#0e2125]/50 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(245,158,11,0.05)_0%,transparent_100%)] pointer-events-none" />
          <div className="relative">
            <div className="absolute -inset-2 bg-[#e55803]/20 rounded-xl blur-md pointer-events-none" />
            <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center shadow-lg relative z-10">
              <QrCode size={40} className="text-[#0e2125]" />
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-[#6b5c45] uppercase tracking-widest mb-1">OpenClaw Network</p>
            <p className="text-sm font-medium text-slate-300">Routing transaction via decentralized ADK infrastructure.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function GlobeIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /><path d="M2 12h20" />
    </svg>
  );
}
