import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Plane, Globe, Briefcase, Palmtree, UtensilsCrossed, Armchair, ArrowRight, User, Mail, Lock } from 'lucide-react';
import { useStore } from '../stores/useStore';

const LANGUAGES = [
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'hi', flag: '🇮🇳', label: 'हिन्दी' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'ja', flag: '🇯🇵', label: '日本語' },
];

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const { i18n } = useTranslation();
  const { login, register, error, setError } = useStore();
  const [step, setStep] = useState<'auth' | 'prefs'>('auth');
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('demo@roamie.app');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('');
  const [lang, setLang] = useState('en');
  const [purpose, setPurpose] = useState<'leisure' | 'business'>('leisure');
  const [dietaryPref, setDietaryPref] = useState('');
  const [seatPref, setSeatPref] = useState('window');
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    setLoading(true); setError(null);
    try {
      if (isLogin) { await login(email, password); onComplete(); }
      else { setStep('prefs'); }
    } catch {} finally { setLoading(false); }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      await register({ email, password, name, preferredLang: lang, tripPurpose: purpose, dietaryPref: dietaryPref || undefined, seatPreference: seatPref });
      i18n.changeLanguage(lang);
      localStorage.setItem('roamie-lang', lang);
      onComplete();
    } catch {} finally { setLoading(false); }
  };

  const containerAnim = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } }, exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } } };
  const itemAnim = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as any } } };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden" style={{ background: 'var(--color-bg-cream)' }}>
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[120px] pointer-events-none" style={{ background: 'rgba(91,95,236,0.08)' }} />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[100px] pointer-events-none" style={{ background: 'rgba(245,158,11,0.06)' }} />

      <div className="w-full max-w-md relative z-10">
        {/* Logo Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-brand-purple-light)', color: 'var(--color-brand-purple)' }}>
              <Plane size={24} strokeWidth={2} />
            </div>
            <span className="font-display font-extrabold text-4xl tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Roamie</span>
          </div>
          <p className="font-medium" style={{ color: 'var(--color-text-muted)' }}>The intelligent operating system for modern travel.</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {step === 'auth' ? (
            <motion.div key="auth" variants={containerAnim} initial="hidden" animate="show" exit="exit"
              className="p-8 rounded-3xl shadow-elevated relative overflow-hidden"
              style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r" style={{ backgroundImage: 'linear-gradient(to right, var(--color-brand-purple), var(--color-brand-amber))' }} />

              <motion.h2 variants={itemAnim} className="font-display font-bold text-2xl mb-8 text-center">
                {isLogin ? 'Welcome Back' : 'Create an Account'}
              </motion.h2>

              {error && (
                <motion.div variants={itemAnim} className="mb-6 p-4 rounded-xl text-sm font-medium flex items-center gap-2"
                  style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: 'var(--color-danger)' }}>
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--color-danger)' }} /> {error}
                </motion.div>
              )}

              <motion.div variants={itemAnim} className="space-y-4">
                <AnimatePresence>
                  {!isLogin && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="relative group">
                      <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--color-text-muted)' }} />
                      <input value={name} onChange={e => setName(e.target.value)} placeholder="Full Name"
                        className="w-full h-14 pl-12 pr-4 rounded-xl outline-none transition-all text-sm"
                        style={{ background: 'var(--color-bg-cream)', border: '1px solid var(--color-border)' }} />
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="relative group">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                  <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email Address"
                    className="w-full h-14 pl-12 pr-4 rounded-xl outline-none transition-all text-sm"
                    style={{ background: 'var(--color-bg-cream)', border: '1px solid var(--color-border)' }} />
                </div>
                <div className="relative group">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password"
                    className="w-full h-14 pl-12 pr-4 rounded-xl outline-none transition-all text-sm"
                    style={{ background: 'var(--color-bg-cream)', border: '1px solid var(--color-border)' }} />
                </div>
              </motion.div>

              <motion.button variants={itemAnim} onClick={handleAuth} disabled={loading || !email || !password}
                className="w-full h-14 mt-8 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'var(--color-brand-purple)' }}>
                {loading ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> : isLogin ? 'Sign In to Dashboard' : 'Continue to Preferences'}
                {!loading && !isLogin && <ArrowRight size={18} />}
              </motion.button>

              <motion.div variants={itemAnim} className="mt-8 text-center p-3 rounded-lg" style={{ background: 'var(--color-bg-cream)' }}>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                  <button onClick={() => { setIsLogin(!isLogin); setError(null); }} className="font-bold hover:underline ml-1" style={{ color: 'var(--color-brand-purple)' }}>
                    {isLogin ? 'Create one' : 'Sign in'}
                  </button>
                </p>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div key="prefs" variants={containerAnim} initial="hidden" animate="show" exit="exit"
              className="p-8 rounded-3xl shadow-elevated relative overflow-hidden"
              style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
              <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(to right, var(--color-success), var(--color-brand-purple))' }} />

              <motion.div variants={itemAnim} className="mb-8">
                <h2 className="font-display font-bold text-2xl mb-2">Configure Profile</h2>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Help the AI agents tailor your travel experience.</p>
              </motion.div>

              {/* Language */}
              <motion.div variants={itemAnim} className="mb-6">
                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>
                  <Globe size={14} /> Interface Language
                </label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map(l => (
                    <button key={l.code} onClick={() => setLang(l.code)}
                      className="px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
                      style={{
                        background: lang === l.code ? 'var(--color-brand-purple-light)' : 'var(--color-bg-cream)',
                        color: lang === l.code ? 'var(--color-brand-purple)' : 'var(--color-text-secondary)',
                        border: `1px solid ${lang === l.code ? 'var(--color-brand-purple)' : 'var(--color-border)'}`,
                      }}>
                      {l.flag} {l.label}
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Purpose */}
              <motion.div variants={itemAnim} className="mb-6">
                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>
                  Trip Purpose Focus
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'business' as const, icon: Briefcase, label: 'Business' },
                    { key: 'leisure' as const, icon: Palmtree, label: 'Leisure' },
                  ].map(opt => {
                    const sel = purpose === opt.key;
                    return (
                      <button key={opt.key} onClick={() => setPurpose(opt.key)}
                        className="flex flex-col items-center gap-3 p-4 rounded-2xl transition-all"
                        style={{
                          background: sel ? 'var(--color-brand-purple-light)' : 'var(--color-bg-cream)',
                          color: sel ? 'var(--color-brand-purple)' : 'var(--color-text-secondary)',
                          border: `1px solid ${sel ? 'var(--color-brand-purple)' : 'var(--color-border)'}`,
                        }}>
                        <opt.icon size={24} />
                        <span className="font-bold text-sm tracking-wide uppercase">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>

              <motion.div variants={itemAnim} className="grid grid-cols-2 gap-4 mb-8">
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>
                    <UtensilsCrossed size={14} /> Dietary
                  </label>
                  <select value={dietaryPref} onChange={e => setDietaryPref(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl outline-none transition-all cursor-pointer text-sm"
                    style={{ background: 'var(--color-bg-cream)', border: '1px solid var(--color-border)' }}>
                    <option value="">No Restrictions</option>
                    <option value="vegetarian">Vegetarian</option>
                    <option value="vegan">Vegan</option>
                    <option value="halal">Halal</option>
                    <option value="kosher">Kosher</option>
                    <option value="gluten-free">Gluten-Free</option>
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>
                    <Armchair size={14} /> Seat Req.
                  </label>
                  <select value={seatPref} onChange={e => setSeatPref(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl outline-none transition-all cursor-pointer text-sm"
                    style={{ background: 'var(--color-bg-cream)', border: '1px solid var(--color-border)' }}>
                    <option value="window">Window</option>
                    <option value="aisle">Aisle</option>
                    <option value="middle">Middle</option>
                  </select>
                </div>
              </motion.div>

              <motion.button variants={itemAnim} onClick={handleComplete} disabled={loading}
                className="w-full h-14 rounded-xl font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ background: 'var(--color-brand-purple)' }}>
                {loading ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> : 'Launch Dashboard'}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
