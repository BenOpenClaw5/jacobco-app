'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Calendar, Package, Search, Command } from 'lucide-react';
import GlobalNav from '@/components/GlobalNav';
import LightingRig from '@/components/LightingRig';
import { usePalette } from '@/lib/commandPaletteContext';

const TILES = [
  { href: '/events',    label: 'Events Board',  sub: 'Manage production stages',     icon: null,     delay: 0    },
  { href: '/calendar',  label: 'Calendar',       sub: 'View by date & shop',          icon: Calendar, delay: 0.06 },
  { href: '/inventory', label: 'Inventory',      sub: 'Orlando & Dallas case status', icon: Package,  delay: 0.12 },
  { href: '/lookup',    label: 'Case Lookup',    sub: 'Find any case instantly',      icon: Search,   delay: 0.18 },
];

// Last fixture fully on at: 350ms + 820ms + 200ms = 1370ms
// Text glow starts as lights settle
const GLOW_DELAY = 1.4;

export default function LandingPage() {
  const { openPalette } = usePalette();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Background dot grid + slow radial sweep
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

      ctx.fillStyle = 'rgba(255,255,255,0.022)';
      const spacing = 40;
      for (let x = 0; x < canvas.width; x += spacing) {
        for (let y = 0; y < canvas.height; y += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const cx = canvas.width  / 2 + Math.sin(t * 0.00028) * canvas.width  * 0.14;
      const cy = canvas.height / 2 + Math.cos(t * 0.00020) * canvas.height * 0.10;
      const r  = Math.max(canvas.width, canvas.height) * 0.6;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, 'rgba(60,110,150,0.055)');
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
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--landing-bg)', position: 'relative', overflow: 'hidden' }}>
      {/* Page-wide background canvas */}
      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
      />

      {/* Nav */}
      <div className="relative z-20">
        <GlobalNav />
      </div>

      {/* Hero — lighting rig lives here */}
      <main
        className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center"
        style={{ minHeight: '80vh', position: 'relative', overflow: 'hidden' }}
      >
        {/* 3D Lighting Rig — renders behind all text */}
        <LightingRig />

        {/* All text content sits above the rig at z-index: 10 */}
        <div className="relative flex flex-col items-center" style={{ zIndex: 10 }}>
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
            Jacob Co Creative
          </motion.div>

          {/* "Production" — kissed by warm light once rig fires */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: 1, y: 0,
              textShadow: [
                '0 0 0px rgba(255,210,120,0), 0 0 0px rgba(255,180,80,0)',
                '0 0 80px rgba(255,210,120,0.15), 0 0 160px rgba(255,180,80,0.08)',
              ],
            }}
            transition={{
              opacity:    { duration: 0.9, delay: 0.3,        ease: [0.16, 1, 0.3, 1] },
              y:          { duration: 0.9, delay: 0.3,        ease: [0.16, 1, 0.3, 1] },
              textShadow: { duration: 1.6, delay: GLOW_DELAY, ease: 'easeOut' },
            }}
            style={{ fontFamily: 'var(--font-josefin)', fontWeight: 100, letterSpacing: '0.08em', color: '#ffffff', lineHeight: 1.05, marginBottom: 0 }}
            className="text-6xl sm:text-7xl md:text-8xl lg:text-[100px]"
          >
            Production
          </motion.h1>

          {/* "Operations" — same glow, fractionally delayed */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: 1, y: 0,
              textShadow: [
                '0 0 0px rgba(255,210,120,0), 0 0 0px rgba(255,180,80,0)',
                '0 0 80px rgba(255,210,120,0.12), 0 0 160px rgba(255,180,80,0.06)',
              ],
            }}
            transition={{
              opacity:    { duration: 0.9, delay: 0.44,            ease: [0.16, 1, 0.3, 1] },
              y:          { duration: 0.9, delay: 0.44,            ease: [0.16, 1, 0.3, 1] },
              textShadow: { duration: 1.8, delay: GLOW_DELAY + 0.15, ease: 'easeOut' },
            }}
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
            Multi-location production management for Orlando &amp; Dallas
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

          {/* Stats — 2 only */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.2 }}
            className="flex items-center gap-10 sm:gap-14"
          >
            {/* Stat: 2 Shops */}
            <div className="text-center">
              <div style={{ fontSize: '26px', fontWeight: 100, color: '#ffffff', fontFamily: 'var(--font-josefin)', letterSpacing: '0.04em', lineHeight: 1 }}>
                2
              </div>
              <div style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', marginTop: '6px' }}>
                Shops
              </div>
            </div>

            <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />

            {/* Stat: ∞ Destinations — 29px so it visually matches "2" at weight 100 */}
            <div className="text-center">
              <div style={{ fontSize: '29px', fontWeight: 100, color: '#ffffff', fontFamily: 'var(--font-josefin)', letterSpacing: '0.04em', lineHeight: 1, fontVariantNumeric: 'normal' }}>
                ∞
              </div>
              <div style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', marginTop: '6px' }}>
                Destinations
              </div>
            </div>
          </motion.div>
        </div>
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
                  <div style={{ fontSize: '10px', fontWeight: 200, color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-urbanist)' }}>
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
