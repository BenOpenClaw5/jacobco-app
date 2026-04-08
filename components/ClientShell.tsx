'use client';

import { ReactNode, useEffect } from 'react';
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
        <ShellInner>{children}</ShellInner>
      </PaletteProvider>
    </ThemeProvider>
  );
}
