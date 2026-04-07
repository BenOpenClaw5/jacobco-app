'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface PaletteCtx {
  open: boolean;
  openPalette: (prefill?: PalettePrefill) => void;
  closePalette: () => void;
  prefill: PalettePrefill | null;
}

export interface PalettePrefill {
  commandId?: string;
  eventId?: string;
}

const Ctx = createContext<PaletteCtx>({
  open: false,
  openPalette: () => {},
  closePalette: () => {},
  prefill: null,
});

export function PaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<PalettePrefill | null>(null);

  const openPalette = useCallback((p?: PalettePrefill) => {
    setPrefill(p ?? null);
    setOpen(true);
  }, []);

  const closePalette = useCallback(() => {
    setOpen(false);
    setTimeout(() => setPrefill(null), 300);
  }, []);

  return (
    <Ctx.Provider value={{ open, openPalette, closePalette, prefill }}>
      {children}
    </Ctx.Provider>
  );
}

export const usePalette = () => useContext(Ctx);
