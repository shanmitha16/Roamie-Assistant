import { useState, useEffect } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Plane, LayoutDashboard, AlertTriangle, Receipt, Package, Menu, X, Map } from 'lucide-react';
import { useStore } from './stores/useStore';
import Dashboard from './pages/Dashboard';
import Disruption from './pages/Disruption';
import Expenses from './pages/Expenses';
import PackingChecklist from './pages/PackingChecklist';
import VoiceTranslateWidget from './components/VoiceTranslateWidget';
import OpenClawCart from './components/OpenClawCart';
import MyItinerary from './pages/MyItinerary';

const LANGUAGES = [
  { code: 'en', flag: '🇬🇧' }, { code: 'hi', flag: '🇮🇳' },
  { code: 'es', flag: '🇪🇸' }, { code: 'fr', flag: '🇫🇷' },
  { code: 'ja', flag: '🇯🇵' },
];

const NAV = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/my-itinerary', icon: Map, label: 'My Itinerary' },
  { path: '/disruption', icon: AlertTriangle, label: 'Disruption' },
  { path: '/expenses', icon: Receipt, label: 'Expenses' },
  { path: '/checklist', icon: Package, label: 'Packing List' },
];

export default function App() {
  const { t, i18n } = useTranslation();
  const { user, fetchMe } = useStore();
  const [ready, setReady] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => { fetchMe().finally(() => setReady(true)); }, [fetchMe]);

  if (!ready) return (
    <div style={{ minHeight: '100vh', background: '#fff6e0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
          style={{ display: 'inline-block', marginBottom: 12 }}>
          <Plane size={30} style={{ color: '#e55803' }} />
        </motion.div>
        <p style={{ fontFamily: 'DM Sans, sans-serif', color: '#6b5c45', fontSize: 14 }}>Preparing your journey…</p>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#fff6e0', overflow: 'hidden' }}>

      {/* Mobile backdrop */}
      <AnimatePresence>
        {mobileNav && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setMobileNav(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(14,33,37,0.55)', backdropFilter: 'blur(4px)', zIndex: 40 }}
            className="lg-hidden" />
        )}
      </AnimatePresence>

      {/* ── Sidebar ───────────────────────────────────────────── */}
      <aside style={{
        width: 240, background: '#0e2125', display: 'flex', flexDirection: 'column',
        paddingTop: 24, paddingBottom: 20, position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 50,
        transition: 'transform 0.28s ease',
      }}
        className={`app-sidebar ${mobileNav ? 'mobile-open' : ''}`}
      >
        {/* Logo */}
        <div style={{ padding: '0 20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <img src="/roamie-logo.png" alt="Roamie"
            style={{ width: 168, height: 'auto', objectFit: 'contain' }} />
          <button className="lg-hidden" onClick={() => setMobileNav(false)}
            style={{ color: 'rgba(255,246,224,0.45)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV.map(item => {
            const Icon = item.icon;
            return (
              <NavLink key={item.path} to={item.path} onClick={() => setMobileNav(false)}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                <Icon size={17} strokeWidth={2} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Language switcher */}
        <div style={{ padding: '16px 12px 0', borderTop: '1px solid rgba(255,246,224,0.09)' }}>
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', background: 'rgba(255,246,224,0.05)', borderRadius: 12, padding: 6 }}>
            {LANGUAGES.map(l => (
              <button key={l.code} onClick={() => { i18n.changeLanguage(l.code); localStorage.setItem('roamie-lang', l.code); }}
                style={{
                  width: 34, height: 34, borderRadius: 8, fontSize: 16,
                  background: i18n.language === l.code ? '#e55803' : 'transparent',
                  transform: i18n.language === l.code ? 'scale(1.1)' : 'scale(1)',
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                {l.flag}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, maxHeight: '100vh', transition: 'margin-left 0.28s ease' }}
        className="app-main">

        {/* Header */}
        <header style={{
          height: 64, flexShrink: 0, background: '#ffffff', borderBottom: '1px solid #f0dfc0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', position: 'sticky', top: 0, zIndex: 30,
        }}>
          <button className="lg-hidden" onClick={() => setMobileNav(true)}
            style={{ padding: 8, borderRadius: 8, color: '#6b5c45' }}>
            <Menu size={22} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: 'auto' }}>
            <OpenClawCart />
            <div style={{ width: 1, height: 24, background: '#f0dfc0' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px 6px 6px', borderRadius: 99, cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#fde8d8')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e55803', color: '#fff6e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13 }}>
                {user?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 500, color: '#0e2125' }}
                className="hidden sm:block">{user?.name}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', background: '#fff6e0' }}>
          <AnimatePresence mode="wait">
            <Routes>
              {[
                { path: '/dashboard', El: Dashboard },
                { path: '/my-itinerary', El: MyItinerary },
                { path: '/disruption', El: Disruption },
                { path: '/expenses', El: Expenses },
                { path: '/checklist', El: PackingChecklist },
              ].map(({ path, El }) => (
                <Route key={path} path={path} element={
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                    <El />
                  </motion.div>
                } />
              ))}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AnimatePresence>
        </main>

        <VoiceTranslateWidget />
      </div>
    </div>
  );
}
