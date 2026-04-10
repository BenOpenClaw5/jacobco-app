'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowRight, Calendar, Package, CreditCard, Clipboard, LayoutGrid, BookOpen, ExternalLink, Command } from 'lucide-react';
import GlobalNav from '@/components/GlobalNav';
import LightingRig from '@/components/LightingRig';
import { usePalette } from '@/lib/commandPaletteContext';

// Globe — SSR disabled (uses Three.js)
const GlobeSection = dynamic(() => import('@/components/GlobeSection'), { ssr: false, loading: () => (
  <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', animation: 'pulse-urgent 2s ease-in-out infinite' }} />
  </div>
) });

// ─── Feature Grid ─────────────────────────────────────────────────────────────

const FEATURES = [
  { href: '/events',    label: 'Events Board',  sub: 'Manage cases & track readiness', icon: LayoutGrid, external: false },
  { href: '/booking',   label: 'Booking',       sub: 'Build quotes & create events',   icon: BookOpen,   external: false },
  { href: '/inventory', label: 'Inventory',     sub: 'Track all cases across shops',   icon: Package,    external: false },
  { href: '/payroll',   label: 'Payroll',       sub: 'Submit hours & manage pay',      icon: CreditCard, external: false },
  { href: '/schedule',  label: 'Team Schedule', sub: 'See who\'s working when',        icon: Calendar,   external: false },
  { href: '/rundown',   label: 'The Rundown',   sub: 'Tasks, priorities & to-dos',     icon: Clipboard,  external: false },
];

// Company call countdown
function getCallCountdown(): { label: string; sublabel: string; isLive: boolean } {
  const now = new Date();
  const etNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = etNow.getDay();
  const hour = etNow.getHours();
  const min = etNow.getMinutes();

  if (day === 1 && hour === 11) {
    return { label: 'Call is Live', sublabel: 'Join now →', isLive: true };
  }

  const next = new Date(etNow);
  const daysUntilMonday = (1 - day + 7) % 7 || (hour >= 12 ? 7 : 0);
  next.setDate(next.getDate() + daysUntilMonday);
  next.setHours(11, 0, 0, 0);

  const diffMs = next.getTime() - etNow.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  const diffD = Math.floor(diffH / 24);
  const remH = diffH % 24;
  const diffM = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffD > 0) return { label: `${diffD} days ${remH} hours`, sublabel: 'until next call', isLive: false };
  if (diffH > 0) return { label: `${diffH} hours ${diffM} minutes`, sublabel: 'until next call', isLive: false };
  return { label: `${diffM} minutes`, sublabel: 'until next call', isLive: false };
}

function FeatureCard({ feature, index }: { feature: typeof FEATURES[0]; index: number }) {
  const Icon = feature.icon;

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1], delay: index * 0.06 }}
      whileHover={{ scale: 1.02 }}
      style={{
        border: '1px solid rgba(255,255,255,0.07)',
        padding: '18px 16px',
        background: 'rgba(255,255,255,0.02)',
        cursor: 'pointer',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        transition: 'border-color 200ms ease, background 200ms ease',
      }}
    >
      <Icon size={16} strokeWidth={1.5} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: '11px', fontWeight: 300, letterSpacing: '0.08em', color: '#ffffff', fontFamily: 'var(--font-josefin)', marginBottom: '4px' }}>
          {feature.label}
        </div>
        <div style={{ fontSize: '10px', fontWeight: 200, color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-urbanist)' }}>
          {feature.sub}
        </div>
      </div>
    </motion.div>
  );

  return <Link href={feature.href} style={{ display: 'block' }}>{content}</Link>;
}

// ─── Landing Page ─────────────────────────────────────────────────────────────

const GLOW_DELAY = 1.4;

export default function LandingPage() {
  const { openPalette } = usePalette();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [callInfo, setCallInfo] = useState<ReturnType<typeof getCallCountdown> | null>(null);

  useEffect(() => {
    setCallInfo(getCallCountdown());
    const interval = setInterval(() => setCallInfo(getCallCountdown()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Background dot grid + slow radial sweep (always dark on landing hero)
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
      {/* Page-wide background canvas (hero only — dark always) */}
      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
      />

      {/* Nav */}
      <div className="relative z-20">
        <GlobalNav />
      </div>

      {/* Hero */}
      <main
        className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center"
        style={{ minHeight: '82vh', position: 'relative', overflow: 'hidden' }}
      >
        <LightingRig />

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

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, textShadow: ['0 0 0px rgba(255,210,120,0)', '0 0 80px rgba(255,210,120,0.15), 0 0 160px rgba(255,180,80,0.08)'] }}
            transition={{
              opacity:    { duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] },
              y:          { duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] },
              textShadow: { duration: 1.6, delay: GLOW_DELAY, ease: 'easeOut' },
            }}
            style={{ fontFamily: 'var(--font-josefin)', fontWeight: 100, letterSpacing: '0.08em', color: '#ffffff', lineHeight: 1.05, marginBottom: 0 }}
            className="text-6xl sm:text-7xl md:text-8xl lg:text-[100px]"
          >
            Production
          </motion.h1>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, textShadow: ['0 0 0px rgba(255,210,120,0)', '0 0 80px rgba(255,210,120,0.12), 0 0 160px rgba(255,180,80,0.06)'] }}
            transition={{
              opacity:    { duration: 0.9, delay: 0.44, ease: [0.16, 1, 0.3, 1] },
              y:          { duration: 0.9, delay: 0.44, ease: [0.16, 1, 0.3, 1] },
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
            className="flex items-center gap-10 sm:gap-14"
          >
            <div className="text-center">
              <div style={{ fontSize: '26px', fontWeight: 100, color: '#ffffff', fontFamily: 'var(--font-josefin)', letterSpacing: '0.04em', lineHeight: 1 }}>
                2
              </div>
              <div style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', marginTop: '6px' }}>
                Shops
              </div>
            </div>

            <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />

            <div className="text-center">
              <div style={{ fontSize: '26px', fontWeight: 100, color: '#ffffff', fontFamily: 'var(--font-josefin)', letterSpacing: '0.04em', lineHeight: 1 }}>
                ∞
              </div>
              <div style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', marginTop: '6px' }}>
                Destinations
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Feature Grid */}
      <section className="relative z-10 px-6 py-16" style={{ background: 'var(--landing-bg)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-3xl mx-auto">
          <div style={{ fontSize: '9px', letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.15)', fontFamily: 'var(--font-josefin)', marginBottom: '20px' }}>
            Quick Access
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {FEATURES.map((feature, i) => (
              <FeatureCard key={feature.href} feature={feature} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Company Call & Receipts */}
      {callInfo && (
        <section className="relative z-10 px-6 py-10" style={{ background: 'var(--landing-bg)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
          <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <a
              href="https://meet.google.com/fsx-tfnp-hpb"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-5 py-3 transition-opacity hover:opacity-70"
              style={{ border: callInfo.isLive ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(255,255,255,0.1)', background: callInfo.isLive ? 'rgba(34,197,94,0.06)' : 'transparent' }}
            >
              {callInfo.isLive && (
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgb(34,197,94)', flexShrink: 0, animation: 'pulse-urgent 1.5s ease-in-out infinite' }} />
              )}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 300, color: callInfo.isLive ? 'rgb(34,197,94)' : '#ffffff', fontFamily: 'var(--font-josefin)', letterSpacing: '0.06em' }}>
                  {callInfo.isLive ? 'Call is Live' : 'Company Call'}
                </div>
                <div style={{ fontSize: '10px', fontWeight: 200, color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-urbanist)' }}>
                  {callInfo.isLive ? 'Click to join now' : `${callInfo.label} ${callInfo.sublabel}`}
                </div>
              </div>
              <ExternalLink size={11} style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
            </a>

            <a
              href="https://drive.google.com/drive/folders/1ooh_YVwvUjxSjVZ77V7v8Z20Ca600y6X"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-5 py-3 transition-opacity hover:opacity-70"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div>
                <div style={{ fontSize: '11px', fontWeight: 300, color: '#ffffff', fontFamily: 'var(--font-josefin)', letterSpacing: '0.06em' }}>
                  Receipts
                </div>
                <div style={{ fontSize: '10px', fontWeight: 200, color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-urbanist)' }}>
                  Company expense drive
                </div>
              </div>
              <ExternalLink size={11} style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
            </a>
          </div>
          </motion.div>
        </section>
      )}

      {/* Globe Section */}
      <section className="relative z-10" style={{ background: '#000008', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
        >
          <div className="text-center pt-14 pb-6 px-6">
            <h2 style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 100, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#ffffff', fontFamily: 'var(--font-josefin)', marginBottom: '8px' }}>
              Our Events
            </h2>
            <p style={{ fontSize: '11px', fontWeight: 200, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-urbanist)', letterSpacing: '0.06em' }}>
              Every place we&apos;ve brought the light
            </p>
          </div>
          <GlobeSection />
        </motion.div>
      </section>

      {/* Footer */}
      <section className="relative z-10 px-6 py-10" style={{ background: 'var(--landing-bg)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="max-w-3xl mx-auto flex items-center gap-6">
          <Link href="/incidents" style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.15)', fontFamily: 'var(--font-josefin)' }} className="hover:opacity-60 transition-opacity">
            Incident Reports
          </Link>
          <Link href="/payroll" style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.15)', fontFamily: 'var(--font-josefin)' }} className="hover:opacity-60 transition-opacity">
            Payroll
          </Link>
          <Link href="/admin/payroll" style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.1)', fontFamily: 'var(--font-josefin)' }} className="hover:opacity-60 transition-opacity">
            Admin
          </Link>
        </div>
      </section>
    </div>
  );
}
