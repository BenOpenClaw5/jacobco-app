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
  { name: 'Eden Tal',           titles: ['Assistant Technician'] },
];

// ─── Canvas constants ─────────────────────────────────────────────────────────

const CW = 600;   // canvas coordinate width
const CH = 240;   // canvas coordinate height
const FX_X = 300; // fixture center X (canvas coords)
const FX_Y = 52;  // fixture center Y (canvas coords)

// Fixture geometry (local coords, drawn horizontal, rotated π/2 to point down)
const BASE_W  = 22;  // local X extent
const BASE_H  = 28;  // local Y extent (= on-screen width after rotation)
const NECK_W  = 18;
const NECK_H  = 10;
const HEAD_R  = 16;
const TOTAL_LEN = BASE_W + NECK_W + HEAD_R * 2.5; // 22+18+40 = 80

// Lens position in local coords → LENS_Y on screen
const _baseX  = -TOTAL_LEN / 2; // -40
const _neckX  = _baseX + BASE_W; // -18
const _headCX = _neckX + NECK_W + HEAD_R * 0.6; // -18+18+9.6 = 9.6
const _faceX  = _headCX + HEAD_R * 0.15; // 9.6+2.4 = 12
const LENS_Y  = FX_Y + _faceX; // 52 + 12 = 64

// Beam
const BEAM_START = LENS_Y;
const BEAM_END   = 190;  // terminates at name text center
const BEAM_LEN   = BEAM_END - BEAM_START; // 126

// Breathe
const BREATHE_PERIOD = 4500;
const BREATHE_AMP    = 0.10;
const FADE_MS        = 500;

// ─── Rounded rect helper ──────────────────────────────────────────────────────

function rRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const cr = Math.min(Math.abs(r), Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + cr, y);
  ctx.lineTo(x + w - cr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + cr);
  ctx.lineTo(x + w, y + h - cr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - cr, y + h);
  ctx.lineTo(x + cr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - cr);
  ctx.lineTo(x, y + cr);
  ctx.quadraticCurveTo(x, y, x + cr, y);
  ctx.closePath();
}

// ─── Pinspot fixture ──────────────────────────────────────────────────────────

function drawPinspot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  intensity: number,
) {
  if (intensity < 0.005) return;

  ctx.save();
  ctx.globalAlpha = Math.min(1, intensity);
  ctx.translate(x, y);
  ctx.rotate(angle);

  const baseX = -TOTAL_LEN / 2; // -40
  const baseY = -BASE_H / 2;    // -14

  // Drop shadow
  ctx.shadowColor   = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur    = 8;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 2;

  // Base
  const baseGrad = ctx.createLinearGradient(baseX, baseY, baseX, baseY + BASE_H);
  baseGrad.addColorStop(0.0, '#d8d8d8');
  baseGrad.addColorStop(0.3, '#b8b8b8');
  baseGrad.addColorStop(0.7, '#989898');
  baseGrad.addColorStop(1.0, '#787878');
  ctx.fillStyle = baseGrad;
  rRect(ctx, baseX, baseY, BASE_W, BASE_H, 3);
  ctx.fill();

  // Neck
  const neckX = baseX + BASE_W; // -18
  const neckY = -NECK_H / 2;   // -5
  const neckGrad = ctx.createLinearGradient(neckX, neckY, neckX, neckY + NECK_H);
  neckGrad.addColorStop(0.0, '#c8c8c8');
  neckGrad.addColorStop(0.5, '#a0a0a0');
  neckGrad.addColorStop(1.0, '#808080');
  ctx.fillStyle = neckGrad;
  rRect(ctx, neckX, neckY, NECK_W, NECK_H, 2);
  ctx.fill();

  // Head
  const headCX = neckX + NECK_W + HEAD_R * 0.6; // 9.6
  const headGrad = ctx.createRadialGradient(
    headCX - HEAD_R * 0.3, -HEAD_R * 0.3, 0,
    headCX, 0, HEAD_R,
  );
  headGrad.addColorStop(0.0, '#e0e0e0');
  headGrad.addColorStop(0.5, '#b0b0b0');
  headGrad.addColorStop(1.0, '#606060');
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(headCX, 0, HEAD_R, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

  // Base specular
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 0.75;
  ctx.beginPath(); ctx.moveTo(baseX + 3, baseY + 2); ctx.lineTo(baseX + BASE_W - 3, baseY + 2); ctx.stroke();

  // Head rim
  ctx.strokeStyle = 'rgba(50,50,50,0.5)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(headCX, 0, HEAD_R, 0, Math.PI * 2); ctx.stroke();

  // Head specular arc
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(headCX, 0, HEAD_R - 2, Math.PI * 1.1, Math.PI * 1.7); ctx.stroke();

  // Lens face outer ring
  const faceX = headCX + HEAD_R * 0.15; // 12
  ctx.fillStyle = '#444';
  ctx.beginPath(); ctx.arc(faceX, 0, HEAD_R * 0.75, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#282828';
  ctx.beginPath(); ctx.arc(faceX, 0, HEAD_R * 0.60, 0, Math.PI * 2); ctx.fill();

  // Lens aperture glow
  const LENS_R = 10;
  const lensGrad = ctx.createRadialGradient(faceX, 0, 0, faceX, 0, LENS_R);
  lensGrad.addColorStop(0.00, 'rgba(255,252,230,1.0)');
  lensGrad.addColorStop(0.25, 'rgba(255,235,160,0.95)');
  lensGrad.addColorStop(0.60, 'rgba(255,200,90,0.7)');
  lensGrad.addColorStop(1.00, 'rgba(255,170,50,0)');
  ctx.fillStyle = lensGrad;
  ctx.beginPath(); ctx.arc(faceX, 0, LENS_R, 0, Math.PI * 2); ctx.fill();

  // Outer lens halo (pulses with breathe via globalAlpha)
  const haloGrad = ctx.createRadialGradient(faceX, 0, LENS_R, faceX, 0, HEAD_R * 1.6);
  haloGrad.addColorStop(0.0, `rgba(255,210,100,${0.35 * intensity})`);
  haloGrad.addColorStop(1.0, 'rgba(255,190,60,0)');
  ctx.globalAlpha = 1; // halo drawn at full alpha, uses intensity directly
  ctx.fillStyle = haloGrad;
  ctx.beginPath(); ctx.arc(faceX, 0, HEAD_R * 1.6, 0, Math.PI * 2); ctx.fill();

  // Lens hot-spot
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath(); ctx.arc(faceX - 1, -1, HEAD_R * 0.12, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
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
      drawPinspot(ctx, FX_X, FX_Y, Math.PI / 2, intensity);

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
