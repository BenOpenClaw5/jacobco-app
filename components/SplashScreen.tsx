'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function SplashScreen() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem('splashShown')) {
      setVisible(true);
      sessionStorage.setItem('splashShown', '1');
      const t = setTimeout(() => setVisible(false), 1800);
      return () => clearTimeout(t);
    }
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: '#0a0a0a',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            pointerEvents: 'none',
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ textAlign: 'center' }}
          >
            <div style={{
              fontSize: '9px',
              letterSpacing: '0.45em',
              textTransform: 'uppercase',
              color: 'rgba(196,154,42,0.7)',
              fontFamily: 'var(--font-josefin)',
              fontWeight: 100,
              marginBottom: '10px',
            }}>
              Jacob Co
            </div>
            <div style={{
              fontSize: '0.85rem',
              letterSpacing: '0.3em',
              color: 'rgba(255,255,255,0.7)',
              fontWeight: 300,
              textTransform: 'uppercase',
              fontFamily: 'var(--font-josefin)',
            }}>
              Creative
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
