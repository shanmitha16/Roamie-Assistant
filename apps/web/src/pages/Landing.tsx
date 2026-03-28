import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plane, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TravelIcon from '../components/TravelIcon';
import CloverGrid from '../components/CloverGrid';

const BRAND_ORANGE = '#EF5C00'; 
const WARM_CREAM = '#FAF3E0';  

const Landing: React.FC = () => {
  const [phase, setPhase] = useState<'initial' | 'moving' | 'collided' | 'merged'>('initial');
  const navigate = useNavigate();

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('moving'), 800),
      setTimeout(() => setPhase('collided'), 2200),
      setTimeout(() => setPhase('merged'), 2800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: WARM_CREAM,
      fontFamily: '"Poppins", sans-serif',
      overflow: 'hidden',
      color: '#000000',
      position: 'relative'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Righteous&family=Poppins:wght@400;700;800;900&display=swap');
        
        .roamie-heading {
          font-family: 'Righteous', sans-serif;
          letter-spacing: -0.05em;
        }
        .tagline-text {
          font-family: 'Poppins', sans-serif;
          font-weight: 800;
        }
      `}</style>
      
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5 }}>
        <motion.div
          style={{ position: 'absolute', width: '80px', height: '80px', color: BRAND_ORANGE, top: '40%', left: '50%' }}
          animate={{
            x: [-900, -300, 300, -300, 900],
            y: [100, -250, 150, -350, 100],
            rotate: [15, -45, 60, -30, 15],
            scale: [0.6, 1.4, 0.7, 1.8, 0.6],
            opacity: [0, 1, 1, 1, 0]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        >
          <Plane size={52} fill="currentColor" strokeWidth={1} />
        </motion.div>
      </div>

      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4vw',
        padding: '0 5%',
        position: 'relative',
        zIndex: 10
      }}>
        
        <div style={{ flex: 1.4, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ position: 'relative', height: 'auto', display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <AnimatePresence mode="wait">
              {phase !== 'merged' ? (
                <motion.div 
                  key="split"
                  style={{ display: 'flex', alignItems: 'center', gap: phase === 'collided' ? '0' : '5rem' }}
                >
                  <motion.h1
                    initial={{ x: -1400, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 70 }}
                    className="roamie-heading"
                    style={{ fontSize: 'min(11vw, 10rem)', fontWeight: 900, color: BRAND_ORANGE, margin: 0 }}
                  >
                    roam
                  </motion.h1>
                  <motion.h1
                    initial={{ x: 1400, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 70 }}
                    className="roamie-heading"
                    style={{ fontSize: 'min(11vw, 10rem)', fontWeight: 900, color: BRAND_ORANGE, margin: 0 }}
                  >
                    homie
                  </motion.h1>

                  {phase === 'collided' && (
                    <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: [1, 6], opacity: [1, 0] }}
                        transition={{ duration: 0.5 }}
                        style={{ width: 80, height: 80, background: BRAND_ORANGE, borderRadius: '50%', filter: 'blur(20px)' }}
                      />
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="merged"
                  initial={{ scale: 0.8, opacity: 0, y: 30 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 100 }}
                  style={{ display: 'flex', alignItems: 'flex-end', whiteSpace: 'nowrap' }}
                >
                  <h1 className="roamie-heading" style={{ 
                    fontSize: 'min(15vw, 13rem)', 
                    fontWeight: 900, 
                    color: BRAND_ORANGE, 
                    margin: 0, 
                    display: 'flex', 
                    alignItems: 'baseline',
                    lineHeight: 1
                  }}>
                    roam
                    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                      <motion.div
                        initial={{ y: -60, opacity: 0, scale: 0.4 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3, type: 'spring' }}
                        style={{ position: 'absolute', top: 'max(-5.5vw, -60px)' }}
                      >
                        {/* Perfect size + 0.5mm adjustment */}
                        <TravelIcon size={110} />
                      </motion.div>
                      <span>ı</span>
                    </span>
                    e
                  </h1>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={phase === 'merged' ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.5 }}
            className="tagline-text"
            style={{ 
              fontSize: 'min(4.3vw, 3.6rem)', 
              color: '#000000', 
              margin: '0',
              textAlign: 'left',
              lineHeight: 1.1
            }}
          >
            Because planning shouldn't be the hardest part.
          </motion.h2>

          <motion.button
            initial={{ scale: 0.9, opacity: 0 }}
            animate={phase === 'merged' ? { scale: 1, opacity: 1 } : {}}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/dashboard')}
            style={{
              marginTop: '4rem',
              width: 'fit-content',
              backgroundColor: BRAND_ORANGE,
              color: WARM_CREAM,
              padding: '1.2rem 2.8rem',
              borderRadius: '20px',
              fontSize: '1.4rem',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              boxShadow: '0 15px 35px rgba(239, 92, 0, 0.25)'
            }}
          >
            Start Exploring <ArrowRight size={26} />
          </motion.button>
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <CloverGrid />
        </div>

      </div>

      <div style={{ position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)', opacity: 0.3, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.2em' }}>
        SCROLL TO DISCOVER
      </div>
    </div>
  );
};

export default Landing;
