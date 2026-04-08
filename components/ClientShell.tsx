'use client';

import { ReactNode, useEffect, useState } from 'react';
import { PaletteProvider, usePalette } from '@/lib/commandPaletteContext';
import { ThemeProvider } from '@/lib/themeContext';
import CommandPalette from './CommandPalette';

function ErrorOverlay() {
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      setErrors(prev => [...prev, `ERROR: ${e.message}\nat ${e.filename}:${e.lineno}\n${e.error?.stack ?? ''}`]);
    };
    const onUnhandled = (e: PromiseRejectionEvent) => {
      setErrors(prev => [...prev, `UNHANDLED REJECTION: ${String(e.reason)}`]);
    };
    // Intercept ALL clicks in capture phase — catches any anchor navigation
    const onCapture = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      const link = el.closest('a');
      if (link) {
        const msg = `LINK TAPPED\nhref: ${link.href}\ntext: ${link.textContent?.trim().slice(0, 40)}\ncurrent: ${location.pathname}`;
        setErrors(prev => [...prev, msg]);
        // Do NOT preventDefault — still allow navigation so user can test
      }
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandled);
    document.addEventListener('click', onCapture, true);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandled);
      document.removeEventListener('click', onCapture, true);
    };
  }, []);

  if (errors.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: '#1a0000', border: '2px solid #ff4444', padding: '12px',
      fontSize: '11px', fontFamily: 'monospace', color: '#ff8888',
      maxHeight: '60vh', overflowY: 'auto',
    }}>
      <div style={{ color: '#ff4444', fontWeight: 'bold', marginBottom: '8px' }}>
        DEBUG — {errors.length} error(s) — tap to dismiss
      </div>
      {errors.map((e, i) => (
        <div key={i} style={{ marginBottom: '8px', borderTop: '1px solid #440000', paddingTop: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {e}
        </div>
      ))}
      <button
        type="button"
        onClick={() => setErrors([])}
        style={{ marginTop: '8px', padding: '4px 12px', background: '#440000', border: '1px solid #ff4444', color: '#ff8888', fontSize: '11px' }}
      >
        Clear
      </button>
    </div>
  );
}

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

function ShellInner({ children }: { children: ReactNode }) {
  const { open, closePalette, prefill } = usePalette();
  return (
    <>
      <KeyboardHandler />
      {children}
      <CommandPalette open={open} onClose={closePalette} prefill={prefill} />
    </>
  );
}

export default function ClientShell({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <PaletteProvider>
        <ErrorOverlay />
        <ShellInner>{children}</ShellInner>
      </PaletteProvider>
    </ThemeProvider>
  );
}
