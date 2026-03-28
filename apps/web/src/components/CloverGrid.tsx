import React from 'react';
import { motion } from 'framer-motion';

const CloverGrid: React.FC = () => {
  const images = [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80', // Beach
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80', // Pyramids
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80', // Mountains
    'https://images.unsplash.com/photo-1449034446853-66c86144b0ad?auto=format&fit=crop&w=400&q=80', // SF Bridge
  ];

  return (
    <div style={{ position: 'relative', width: '450px', height: '450px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Clover Shape Masking Container */}
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, delay: 1 }}
        style={{
          width: '100%',
          height: '100%',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: '1fr 1fr',
          gap: '10px',
          padding: '10px',
          filter: 'drop-shadow(0 20px 50px rgba(0,0,0,0.1))'
        }}
      >
        {images.map((src, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.05, zIndex: 10 }}
            style={{
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              borderRadius: i === 0 ? '100px 100px 0 100px' : 
                          i === 1 ? '100px 100px 100px 0' :
                          i === 2 ? '100px 0 100px 100px' : 
                                   '0 100px 100px 100px',
              border: '4px solid white'
            }}
          >
            <img src={src} alt="Travel" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </motion.div>
        ))}
      </motion.div>

      {/* Floating accent icons */}
      <motion.div
        animate={{ y: [0, -15, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', top: '-20px', right: '-20px', background: 'white', padding: '10px', borderRadius: '50%', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}
      >
        🌴
      </motion.div>
      <motion.div
        animate={{ y: [0, 15, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        style={{ position: 'absolute', bottom: '20px', left: '-30px', background: 'white', padding: '10px', borderRadius: '50%', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}
      >
        📸
      </motion.div>
    </div>
  );
};

export default CloverGrid;
