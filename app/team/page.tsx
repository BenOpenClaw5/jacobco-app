'use client';

import { useEffect, useRef, useState } from 'react';
import GlobalNav from '@/components/GlobalNav';

// ─── Team roster ──────────────────────────────────────────────────────────────

const TEAM = [
  { name: 'Jacob Towe',         titles: ['Chief Executive Officer', 'Founder'] },
  { name: 'Courtney Towe',      titles: ['Events Manager'] },
  { name: "Heather O'Donovan",  titles: ['Chief Financial Officer'] },
  { name: 'Augustus Delgado',   titles: ['Lead Technician', 'Shop Supervisor'] },
  { name: 'Tommy Freeman',      titles: ['Lead Technician'] },
  { name: 'Jace Roman',         titles: ['Lead Technician'] },
  { name: 'Ben Morris',         titles: ['Shop Manager', 'Assistant Technician'] },
  { name: 'Van Sistare',        titles: ['Shopkeeper', 'Assistant Technician'] },
  { name: 'Max Iturriaga',      titles: ['Assistant Technician'] },
  { name: 'Mia Goodwill',       titles: ['Management Assistant'] },
  { name: 'Abby Towe',          titles: ['Assistant Technician'] },
  { name: 'Eden Towe',          titles: ['Assistant Technician'] },
];

// ─── Canvas constants ─────────────────────────────────────────────────────────

const CW = 600;   // canvas coordinate width
const CH = 240;   // canvas coordinate height
const FX_X = 300; // vanishing point X (canvas coords)

// Beam — originates from a sharp vanishing point at top
const BEAM_START = 4;    // very close to top edge — the sharp point
const BEAM_END   = 190;  // terminates at name text center
const BEAM_LEN   = BEAM_END - BEAM_START;

// Breathe
const BREATHE_PERIOD = 4500;
const BREATHE_AMP    = 0.10;
const FADE_MS        = 500;

// ─── Sharp-point beam origin glow (replaces fixture) ─────────────────────────

function drawSourceGlow(ctx: CanvasRenderingContext2D, cx: number, intensity: number) {
  if (intensity < 0.005) return;
  // Tiny bright core at the vanishing point
  const coreGrad = ctx.createRadialGradient(cx, BEAM_START, 0, cx, BEAM_START, 4);
  coreGrad.addColorStop(0, `rgba(255,248,220,${0.9 * intensity})`);
  coreGrad.addColorStop(0.5, `rgba(255,220,140,${0.4 * intensity})`);
  coreGrad.addColorStop(1, 'rgba(255,200,100,0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(cx, BEAM_START, 4, 0, Math.PI * 2);
  ctx.fill();
}

// ─── Atmospheric beam + haze pool ─────────────────────────────────────────────

const BEAM_LAYERS = [
  { hwSrc:  2, hwTerm:  20, r: 255, g: 240, b: 180, peak: 0.45 },
  { hwSrc:  4, hwTerm:  40, r: 255, g: 220, b: 140, peak: 0.28 },
  { hwSrc:  7, hwTerm:  65, r: 255, g: 200, b: 100, peak: 0.18 },
  { hwSrc: 10, hwTerm:  95, r: 255, g: 180, b:  80, peak: 0.10 },
  { hwSrc: 15, hwTerm: 130, r: 255, g: 160, b:  60, peak: 0.06 },
  { hwSrc: 25, hwTerm: 170, r: 255, g: 140, b:  40, peak: 0.035 },
  { hwSrc:  0, hwTerm: 210, r: 255, g: 120, b:  30, peak: 0.015 },
];

const DUST_STREAKS = [
  { dx: -18, angleDeg:  1.5, opacity: 0.06, y1: 0.05, y2: 0.82 },
  { dx:  22, angleDeg: -1.0, opacity: 0.05, y1: 0.10, y2: 0.76 },
  { dx:  -5, angleDeg:  0.8, opacity: 0.04, y1: 0.18, y2: 0.90 },
  { dx:  35, angleDeg: -1.8, opacity: 0.07, y1: 0.07, y2: 0.68 },
];

function drawAtmosphericBeam(
  ctx: CanvasRenderingContext2D,
  cx: number,
  beamStart: number,
  beamEnd: number,
  beamLen: number,
  intensity: number,
) {
  if (intensity < 0.005 || beamLen <= 0) return;

  // 7-layer atmospheric beam
  for (const layer of BEAM_LAYERS) {
    const x1 = cx - layer.hwSrc;
    const x2 = cx + layer.hwSrc;
    const x3 = cx + layer.hwTerm;
    const x4 = cx - layer.hwTerm;

    ctx.beginPath();
    ctx.moveTo(x1, beamStart);
    ctx.lineTo(x2, beamStart);
    ctx.lineTo(x3, beamEnd);
    ctx.lineTo(x4, beamEnd);
    ctx.closePath();

    const a = layer.peak * intensity;
    const grad = ctx.createLinearGradient(cx, beamStart, cx, beamEnd);
    grad.addColorStop(0.00, `rgba(${layer.r},${layer.g},${layer.b},${a})`);
    grad.addColorStop(0.55, `rgba(${layer.r},${layer.g},${layer.b},${a * 0.35})`);
    grad.addColorStop(1.00, `rgba(${layer.r},${layer.g},${layer.b},0)`);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // Haze pool at terminus — elliptical warm glow where light "pools" on the name
  ctx.save();
  ctx.translate(cx, beamEnd);
  ctx.scale(1, 32 / 190);
  const poolGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 190);
  poolGrad.addColorStop(0.00, `rgba(255,205,100,${0.18 * intensity})`);
  poolGrad.addColorStop(0.45, `rgba(255,185,70,${0.09 * intensity})`);
  poolGrad.addColorStop(1.00, 'rgba(255,160,40,0)');
  ctx.fillStyle = poolGrad;
  ctx.beginPath();
  ctx.arc(0, 0, 190, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Dust streaks — thin particle lines inside the beam
  for (const s of DUST_STREAKS) {
    const angleRad = (s.angleDeg * Math.PI) / 180;
    const dy1 = beamLen * s.y1;
    const dy2 = beamLen * s.y2;
    const sx1 = cx + s.dx + Math.tan(angleRad) * dy1;
    const sy1 = beamStart + dy1;
    const sx2 = cx + s.dx + Math.tan(angleRad) * dy2;
    const sy2 = beamStart + dy2;

    ctx.save();
    ctx.globalAlpha = s.opacity * intensity;
    ctx.strokeStyle = 'rgba(255,240,180,1)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(sx1, sy1);
    ctx.lineTo(sx2, sy2);
    ctx.stroke();
    ctx.restore();
  }
}

// ─── Per-person canvas ────────────────────────────────────────────────────────

function TeamPinspotCanvas({ index, triggered }: { index: number; triggered: boolean }) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const rafRef       = useRef(0);
  const fadeStartRef = useRef(0);
  const startedRef   = useRef(false);

  useEffect(() => {
    if (!triggered || startedRef.current) return;
    startedRef.current = true;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    fadeStartRef.current = performance.now();

    function drawFrame(ts: number) {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, CW, CH);

      const fadeElapsed = ts - fadeStartRef.current;
      const fadeT = Math.min(1, fadeElapsed / FADE_MS);
      const fadeI = 1 - Math.pow(1 - fadeT, 2.2); // ease-out

      // During fade-in use JS breathe; after, we hand off to CSS animation
      const intensity = fadeI;

      drawAtmosphericBeam(ctx, FX_X, BEAM_START, BEAM_END, BEAM_LEN, intensity);
      drawSourceGlow(ctx, FX_X, intensity);

      if (fadeT >= 1) {
        // Fade-in complete. Draw the fully-lit static frame, then stop RAF.
        // CSS @keyframes team-breathe handles the ongoing subtle breathe,
        // so we never run more than ~2 RAF loops simultaneously on the page.
        const phaseMs = Math.round(((index * 0.85) / (2 * Math.PI)) * BREATHE_PERIOD) % BREATHE_PERIOD;
        canvas.style.animation = `team-breathe ${BREATHE_PERIOD}ms ease-in-out infinite`;
        canvas.style.animationDelay = `-${phaseMs}ms`;
        return; // Do NOT schedule next frame
      }

      rafRef.current = requestAnimationFrame(drawFrame);
    }

    rafRef.current = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [triggered, index]);

  return (
    <canvas
      ref={canvasRef}
      width={CW}
      height={CH}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: `${CH}px`,
        display: 'block',
        pointerEvents: 'none',
      }}
    />
  );
}

// ─── Per-person section ───────────────────────────────────────────────────────

function TeamMember({ name, titles, index }: { name: string; titles: string[]; index: number }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          setTriggered(true);
        }
      },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const nameGlow = visible
    ? '0 0 40px rgba(255,200,100,0.35), 0 0 80px rgba(255,170,60,0.20), 0 0 120px rgba(255,140,40,0.10)'
    : 'none';

  return (
    <div
      ref={sectionRef}
      className="min-h-[280px] sm:min-h-[320px]"
      style={{
        position: 'relative',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        textAlign: 'center',
        paddingBottom: '64px',
        overflow: 'hidden',
      }}
    >
      {/* Atmospheric canvas — absolute, covers the full section top */}
      <TeamPinspotCanvas index={index} triggered={triggered} />

      {/* Name + titles — sit on top of the canvas in the warm light pool */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          paddingTop: '152px',
          transform: visible ? 'translateY(0)' : 'translateY(16px)',
          opacity: visible ? 1 : 0,
          transition: 'transform 500ms cubic-bezier(0.16,1,0.3,1) 200ms, opacity 500ms ease 200ms',
        }}
      >
        <h2
          style={{
            fontSize: 'clamp(22px, 4vw, 30px)',
            fontWeight: 300,
            letterSpacing: '0.06em',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-josefin)',
            marginBottom: '12px',
            lineHeight: 1.2,
            textShadow: nameGlow,
            transition: 'text-shadow 800ms ease 300ms',
          }}
        >
          {name}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
          {titles.map((title, ti) => (
            <span
              key={ti}
              style={{
                fontSize: '11px',
                fontWeight: 300,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-josefin)',
              }}
            >
              {title}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeamPage() {
  return (
    <div style={{ background: 'var(--team-bg)', minHeight: '100vh' }}>
      {/* Grain overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '256px 256px',
          pointerEvents: 'none',
          zIndex: 0,
          opacity: 0.6,
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <GlobalNav />

        {/* Page header */}
        <div
          style={{
            textAlign: 'center',
            paddingTop: '72px',
            paddingBottom: '16px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <div
            style={{
              fontSize: '9px',
              letterSpacing: '0.4em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-josefin)',
              marginBottom: '14px',
            }}
          >
            Jacob Co Creative
          </div>
          <h1
            style={{
              fontSize: 'clamp(32px, 6vw, 52px)',
              fontWeight: 100,
              letterSpacing: '0.12em',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-josefin)',
              lineHeight: 1.1,
            }}
          >
            The Team
          </h1>
        </div>

        {/* Team list */}
        <div style={{ maxWidth: '580px', margin: '0 auto', padding: '0 24px' }}>
          {TEAM.map((member, i) => (
            <TeamMember
              key={member.name}
              name={member.name}
              titles={member.titles}
              index={i}
            />
          ))}
        </div>

        <div style={{ height: '80px' }} />
      </div>
    </div>
  );
}
