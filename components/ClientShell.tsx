'use client';

import { ReactNode, useEffect, useState } from 'react';
import { PaletteProvider, usePalette } from '@/lib/commandPaletteContext';
import { ThemeProvider } from '@/lib/themeContext';
import CommandPalette from './CommandPalette';

function KeyboardHandler() {
  const { openPalette } = usePalette();
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openPalette();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [openPalette]);
  return null;
}

function SplashScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 400);
    const t2 = setTimeout(() => setPhase('out'), 1600);
    const t3 = setTimeout(() => onDone(), 2100);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#070c0e',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: phase === 'out' ? 0 : 1,
        transition: phase === 'in' ? 'opacity 0.4s ease' : phase === 'out' ? 'opacity 0.5s ease' : 'none',
        pointerEvents: phase === 'out' ? 'none' : 'all',
      }}
    >
      {/* Ambient glow */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at 50% 50%, rgba(196,154,42,0.06) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      {/* Logo mark */}
      <div
        style={{
          opacity: phase === 'in' ? 0 : 1,
          transform: phase === 'in' ? 'translateY(8px)' : 'translateY(0)',
          transition: 'opacity 0.5s ease 0.15s, transform 0.5s ease 0.15s',
          textAlign: 'center',
        }}
      >
        <div style={{
          fontSize: '10px',
          letterSpacing: '0.55em',
          textTransform: 'uppercase',
          color: 'rgba(196,154,42,0.8)',
          fontFamily: 'var(--font-josefin)',
          fontWeight: 100,
          marginBottom: '10px',
        }}>
          Jacob Co
        </div>
        <div style={{
          fontSize: '28px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#ffffff',
          fontFamily: 'var(--font-josefin)',
          fontWeight: 100,
        }}>
          Creative
        </div>
        <div style={{
          marginTop: '24px',
          width: '32px',
          height: '1px',
          background: 'rgba(196,154,42,0.4)',
          margin: '24px auto 0',
        }} />
        <div style={{
          marginTop: '12px',
          fontSize: '8px',
          letterSpacing: '0.4em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.2)',
          fontFamily: 'var(--font-josefin)',
          fontWeight: 100,
        }}>
          Production Operations
        </div>
      </div>
    </div>
  );
}

function ShellInner({ children }: { children: ReactNode }) {
  const { open, closePalette, prefill } = usePalette();
  const [splashDone, setSplashDone] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Only show splash once per session
    const seen = sessionStorage.getItem('jcc-splash');
    if (seen) { setShowSplash(false); setSplashDone(true); }
    else sessionStorage.setItem('jcc-splash', '1');
  }, []);

  return (
    <>
      <KeyboardHandler />
      {showSplash && !splashDone && (
        <SplashScreen onDone={() => { setSplashDone(true); }} />
      )}
      <div style={{ opacity: splashDone || !showSplash ? 1 : 0, transition: 'opacity 0.4s ease' }}>
        {children}
      </div>
      <CommandPalette open={open} onClose={closePalette} prefill={prefill} />
    </>
  );
}

export default function ClientShell({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <PaletteProvider>
        <ShellInner>{children}</ShellInner>
      </PaletteProvider>
    </ThemeProvider>
  );
}
