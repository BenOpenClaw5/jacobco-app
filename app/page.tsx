'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Calendar, Package, Search, Command } from 'lucide-react';
import Logo from '@/components/Logo';
import { usePalette } from '@/lib/commandPaletteContext';

const TILES = [
  { href: '/events',    label: 'Events Board',    sub: 'Manage production stages',       icon: null,     delay: 0    },
  { href: '/calendar',  label: 'Calendar',         sub: 'View by date & shop',            icon: Calendar, delay: 0.06 },
  { href: '/inventory', label: 'Inventory',        sub: 'Orlando & Dallas case status',   icon: Package,  delay: 0.12 },
  { href: '/lookup',    label: 'Case Lookup',      sub: 'Find any case instantly',        icon: Search,   delay: 0.18 },
];

function useCountUp(target: number, duration = 1800) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start: number;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.round(p * target));
      if (p < 1) requestAnimationFrame(step);
    };
    const id = setTimeout(() => requestAnimationFrame(step), 600);
    return () => clearTimeout(id);
  }, [target, duration]);
  return val;
}

function StatNumber({ n, suffix = '' }: { n: number; suffix?: string }) {
  const v = useCountUp(n);
  return <span>{v}{suffix}</span>;
}

export default function LandingPage() {
  const { openPalette } = usePalette();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Subtle animated grid / scan-line
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf: number;
    let t = 0;

    function resize() {
      canvas!.width  = window.innerWidth;
      canvas!.height = window.innerHeight;
    }

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Subtle dot grid
      ctx.fillStyle = 'rgba(255,255,255,0.025)';
      const spacing = 40;
      for (let x = 0; x < canvas.width; x += spacing) {
        for (let y = 0; y < canvas.height; y += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Slow moving radial gradient highlight
      const cx = canvas.width / 2 + Math.sin(t * 0.0003) * canvas.width * 0.15;
      const cy = canvas.height / 2 + Math.cos(t * 0.0002) * canvas.height * 0.1;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(canvas.width, canvas.height) * 0.6);
      grad.addColorStop(0, 'rgba(70,120,160,0.06)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      t++;
      raf = requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#070c0e', position: 'relative', overflow: 'hidden' }}>
      {/* Animated canvas background */}
      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
      />

      {/* Nav */}
      <header
        className="relative z-20 flex items-center justify-between px-6 py-5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        <Logo size="sm" asLink={false} />
        <div className="flex items-center gap-3">
          <button
            onClick={() => openPalette()}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 transition-opacity hover:opacity-60"
            style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-josefin)', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase' }}
          >
            <Command size={10} strokeWidth={1.5} />
            <span>⌘K</span>
          </button>
          <Link
            href="/events"
            className="flex items-center gap-2 px-4 py-2 text-[10px] tracking-[0.25em] uppercase font-light transition-opacity hover:opacity-70"
            style={{ border: '1px solid rgba(255,255,255,0.35)', color: '#ffffff', fontFamily: 'var(--font-josefin)' }}
          >
            Open Board
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center" style={{ minHeight: '80vh' }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          style={{ marginBottom: '20px' }}
        >
          <div style={{ width: '1px', height: '60px', background: 'rgba(255,255,255,0.08)', margin: '0 auto' }} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          style={{ fontSize: '9px', letterSpacing: '0.55em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', marginBottom: '28px' }}
        >
          Jacob Co · Event Lighting
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{ fontFamily: 'var(--font-josefin)', fontWeight: 100, letterSpacing: '0.08em', color: '#ffffff', lineHeight: 1.05, marginBottom: '0' }}
          className="text-6xl sm:text-7xl md:text-8xl lg:text-[100px]"
        >
          Production
        </motion.h1>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.44, ease: [0.16, 1, 0.3, 1] }}
          style={{ fontFamily: 'var(--font-josefin)', fontWeight: 100, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', lineHeight: 1.05, marginBottom: '36px' }}
          className="text-6xl sm:text-7xl md:text-8xl lg:text-[100px]"
        >
          Operations
        </motion.h1>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          style={{ width: '60px', height: '1px', background: 'rgba(255,255,255,0.15)', margin: '0 auto 28px' }}
        />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          style={{ fontSize: '13px', fontWeight: 200, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-urbanist)', letterSpacing: '0.04em', maxWidth: '340px', lineHeight: 1.7, marginBottom: '48px' }}
        >
          Multi-location event lighting management for Orlando &amp; Dallas
        </motion.p>

        {/* Primary CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.05 }}
          className="flex flex-col sm:flex-row items-center gap-3 mb-20"
        >
          <Link
            href="/events"
            className="flex items-center gap-2.5 px-8 py-3.5 text-[10px] tracking-[0.3em] uppercase font-light transition-opacity hover:opacity-70"
            style={{ border: '1px solid rgba(255,255,255,0.5)', color: '#ffffff', fontFamily: 'var(--font-josefin)' }}
          >
            Open Board
            <ArrowRight size={11} strokeWidth={1.5} />
          </Link>
          <button
            onClick={() => openPalette()}
            className="flex items-center gap-2 px-6 py-3.5 text-[10px] tracking-[0.25em] uppercase font-light transition-opacity hover:opacity-60"
            style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-josefin)' }}
          >
            <Command size={11} strokeWidth={1.5} />
            Command
          </button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.2 }}
          className="flex items-center gap-8 sm:gap-12"
        >
          {[
            { n: 2,  label: 'Shops',   suffix: '' },
            { n: 62, label: 'Cases',   suffix: '' },
            { n: 12, label: 'Commands', suffix: '' },
          ].map(({ n, label, suffix }) => (
            <div key={label} className="text-center">
              <div
                style={{ fontSize: '26px', fontWeight: 100, color: '#ffffff', fontFamily: 'var(--font-josefin)', letterSpacing: '0.04em', lineHeight: 1 }}
              >
                <StatNumber n={n} suffix={suffix} />
              </div>
              <div
                style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', marginTop: '6px' }}
              >
                {label}
              </div>
            </div>
          ))}
        </motion.div>
      </main>

      {/* Quick access tiles */}
      <section className="relative z-10 px-6 pb-16 max-w-3xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 1.4 }}
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '40px', marginBottom: '32px' }}
        >
          <div style={{ fontSize: '9px', letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.15)', fontFamily: 'var(--font-josefin)', marginBottom: '20px' }}>
            Quick Access
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {TILES.map(tile => (
              <motion.div
                key={tile.href}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 1.4 + tile.delay }}
              >
                <Link
                  href={tile.href}
                  className="block group"
                  style={{
                    border: '1px solid rgba(255,255,255,0.07)',
                    padding: '18px 16px',
                    background: 'rgba(255,255,255,0.02)',
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                >
                  <div
                    style={{ fontSize: '11px', fontWeight: 300, letterSpacing: '0.08em', color: '#ffffff', fontFamily: 'var(--font-josefin)', marginBottom: '4px' }}
                    className="group-hover:text-white transition-colors"
                  >
                    {tile.label}
                  </div>
                  <div
                    style={{ fontSize: '10px', fontWeight: 200, color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-urbanist)' }}
                  >
                    {tile.sub}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Footer links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 1.7 }}
          className="flex items-center gap-6"
        >
          <Link href="/incidents" style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.15)', fontFamily: 'var(--font-josefin)' }} className="hover:opacity-60 transition-opacity">
            Incident Reports
          </Link>
          <Link href="/payroll" style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.15)', fontFamily: 'var(--font-josefin)' }} className="hover:opacity-60 transition-opacity">
            Payroll
          </Link>
          <Link href="/admin/payroll" style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.1)', fontFamily: 'var(--font-josefin)' }} className="hover:opacity-60 transition-opacity">
            Admin
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
