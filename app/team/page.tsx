'use client';

import { useEffect, useRef, useState } from 'react';
import GlobalNav from '@/components/GlobalNav';

// ─── Team roster ──────────────────────────────────────────────────────────────

const TEAM = [
  { name: 'Jacob Towe',       titles: ['Chief Executive Officer', 'Founder'] },
  { name: 'Courtney Towe',    titles: ['Events Manager'] },
  { name: 'Heather O\'Donovan', titles: ['Chief Financial Officer'] },
  { name: 'Augustus Delgado', titles: ['Lead Technician', 'Shop Supervisor'] },
  { name: 'Tommy Freeman',    titles: ['Lead Technician'] },
  { name: 'Jace Roman',       titles: ['Lead Technician'] },
  { name: 'Ben Morris',       titles: ['Shop Manager', 'Assistant Technician'] },
  { name: 'Van Sistare',      titles: ['Shopkeeper', 'Assistant Technician'] },
  { name: 'Max Iturriaga',    titles: ['Assistant Technician'] },
  { name: 'Mia Goodwill',     titles: ['Management Assistant'] },
  { name: 'Abby Towe',        titles: ['Assistant Technician'] },
  { name: 'Eden Tal',         titles: ['Assistant Technician'] },
];

// ─── Drawing helpers (extracted from LightingRig) ────────────────────────────

function rRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
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

// Pinspot drawn horizontal, head at +X. angle=π/2 makes head point DOWN.
function drawPinspot(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  angle: number,
  s: number,
  intensity: number,
) {
  if (intensity < 0.005) return;

  const totalLen = 42 * s;
  const baseW    = 14 * s;
  const baseH    = 11 * s;
  const neckW    = 10 * s;
  const neckH    =  4 * s;
  const headR    =  8 * s;

  ctx.save();
  ctx.globalAlpha = Math.min(1, intensity);
  ctx.translate(x, y);
  ctx.rotate(angle);

  const baseX = -totalLen / 2;
  const baseY = -baseH / 2;

  ctx.shadowColor   = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur    = 6;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 2;

  // Base
  const baseGrad = ctx.createLinearGradient(baseX, baseY, baseX, baseY + baseH);
  baseGrad.addColorStop(0.0, '#d8d8d8');
  baseGrad.addColorStop(0.3, '#b8b8b8');
  baseGrad.addColorStop(0.7, '#989898');
  baseGrad.addColorStop(1.0, '#787878');
  ctx.fillStyle = baseGrad;
  rRect(ctx, baseX, baseY, baseW, baseH, 2 * s);
  ctx.fill();

  // Neck
  const neckX = baseX + baseW;
  const neckY = -neckH / 2;
  const neckGrad = ctx.createLinearGradient(neckX, neckY, neckX, neckY + neckH);
  neckGrad.addColorStop(0.0, '#c8c8c8');
  neckGrad.addColorStop(0.5, '#a0a0a0');
  neckGrad.addColorStop(1.0, '#808080');
  ctx.fillStyle = neckGrad;
  rRect(ctx, neckX, neckY, neckW, neckH, s);
  ctx.fill();

  // Head
  const headCX = neckX + neckW + headR * 0.6;
  const headGrad = ctx.createRadialGradient(
    headCX - headR * 0.3, -headR * 0.3, 0,
    headCX, 0, headR,
  );
  headGrad.addColorStop(0.0, '#e0e0e0');
  headGrad.addColorStop(0.5, '#b0b0b0');
  headGrad.addColorStop(1.0, '#707070');
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(headCX, 0, headR, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

  // Base specular
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 0.75;
  ctx.beginPath(); ctx.moveTo(baseX + 2 * s, baseY + s); ctx.lineTo(baseX + baseW - 2 * s, baseY + s); ctx.stroke();

  // Head rim
  ctx.strokeStyle = 'rgba(60,60,60,0.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(headCX, 0, headR, 0, Math.PI * 2); ctx.stroke();

  // Head specular
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(headCX, 0, headR - 1.5 * s, Math.PI * 1.1, Math.PI * 1.7); ctx.stroke();

  // Face / lens
  const faceX = headCX + headR * 0.15;
  ctx.fillStyle = '#555';
  ctx.beginPath(); ctx.arc(faceX, 0, headR * 0.72, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#333';
  ctx.beginPath(); ctx.arc(faceX, 0, headR * 0.58, 0, Math.PI * 2); ctx.fill();

  const lg = ctx.createRadialGradient(faceX, 0, 0, faceX, 0, headR * 0.48);
  lg.addColorStop(0.00, 'rgba(255,248,220,1.0)');
  lg.addColorStop(0.35, 'rgba(255,225,150,0.9)');
  lg.addColorStop(0.70, 'rgba(255,190,80,0.6)');
  lg.addColorStop(1.00, 'rgba(255,160,40,0)');
  ctx.fillStyle = lg;
  ctx.beginPath(); ctx.arc(faceX, 0, headR * 0.48, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath(); ctx.arc(faceX, 0, headR * 0.12, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

// Downward beam from lens (used in team page — pinspot aimed down)
function drawTeamBeam(
  ctx: CanvasRenderingContext2D,
  lx: number, ly: number,
  ch: number,
  intensity: number,
) {
  if (intensity < 0.005) return;
  const beamLen = ch - ly;
  if (beamLen <= 0) return;

  const layers = [
    { degHalf: 7,  peak: 0.22 },
    { degHalf: 15, peak: 0.10 },
    { degHalf: 26, peak: 0.04 },
  ];

  for (const layer of layers) {
    const hw = Math.tan(layer.degHalf * Math.PI / 180) * beamLen;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(lx + hw, ly + beamLen);
    ctx.lineTo(lx - hw, ly + beamLen);
    ctx.closePath();
    const grad = ctx.createLinearGradient(lx, ly, lx, ly + beamLen);
    const a = layer.peak * intensity;
    grad.addColorStop(0.00, `rgba(255,240,190,${a * 0.65})`);
    grad.addColorStop(0.08, `rgba(255,215,120,${a * 1.00})`);
    grad.addColorStop(0.35, `rgba(255,200,100,${a * 0.55})`);
    grad.addColorStop(0.70, `rgba(220,175, 80,${a * 0.15})`);
    grad.addColorStop(1.00, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fill();
  }
}

// ─── Per-person canvas component ──────────────────────────────────────────────

const CANVAS_W = 300;
const CANVAS_H = 95;
const FX_X     = 150; // center of canvas
const FX_Y     = 38;  // fixture center y
const SCALE    = 0.82;
const BREATHE_PERIOD = 4000;
const BREATHE_AMP    = 0.08;
const FADE_MS        = 320;

// Precompute lens Y (head is at +X local, rotated π/2 → head at +Y world)
// lensLocalX = headCX + headR*0.15
// with scale: headCX = -(42s/2) + 14s + 10s + 8s*0.6 = -21s + 14s + 10s + 4.8s = 7.8s
// lensLocalX = 7.8s + 8s*0.15 = 7.8s + 1.2s = 9s
// world: lensX = FX_X + cos(π/2)*(9s) = FX_X + 0 = FX_X
//         lensY = FX_Y + sin(π/2)*(9s) = FX_Y + 9s
const LENS_Y = FX_Y + 9 * SCALE;

function TeamPinspotCanvas({ index }: { index: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const fadeStartRef = useRef(0);
  const startedRef   = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const angle = Math.PI / 2; // aimed straight down

    function drawFrame(ts: number) {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      const fadeElapsed = ts - fadeStartRef.current;
      const fadeT = Math.min(1, fadeElapsed / FADE_MS);
      const fadeI = 1 - Math.pow(1 - fadeT, 2); // ease-out

      const breathe = 1 + Math.sin((ts / BREATHE_PERIOD) * 2 * Math.PI + index * 0.7) * BREATHE_AMP;
      const intensity = fadeI * breathe;

      // Draw beam first (behind fixture)
      drawTeamBeam(ctx, FX_X, LENS_Y, CANVAS_H, intensity);
      // Draw pinspot on top
      drawPinspot(ctx, FX_X, FX_Y, angle, SCALE, intensity);

      rafRef.current = requestAnimationFrame(drawFrame);
    }

    // Intersection Observer — start animation when section enters viewport
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !startedRef.current) {
          startedRef.current = true;
          fadeStartRef.current = performance.now();
          rafRef.current = requestAnimationFrame(drawFrame);
        }
      }
    }, { threshold: 0.25 });

    observer.observe(canvas);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, [index]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{ width: '100%', height: `${CANVAS_H}px`, display: 'block', pointerEvents: 'none' }}
    />
  );
}

// ─── Per-person section ───────────────────────────────────────────────────────

function TeamMember({
  name, titles, index,
}: { name: string; titles: string[]; index: number }) {
  const sectionRef  = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.2 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={sectionRef}
      style={{
        padding: '64px 0 60px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        textAlign: 'center',
      }}
    >
      {/* Canvas: pinspot + beam */}
      <div style={{ position: 'relative', marginBottom: '0' }}>
        <TeamPinspotCanvas index={index} />
        {/* Ambient glow that bleeds onto the name below */}
        <div
          className="breathe-glow"
          style={{
            position: 'absolute',
            bottom: '-18px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '160px',
            height: '50px',
            background: 'radial-gradient(ellipse at 50% 30%, rgba(255,210,120,0.13) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Name + titles */}
      <div
        style={{
          transform: visible ? 'translateY(0)' : 'translateY(14px)',
          opacity: visible ? 1 : 0,
          transition: 'transform 420ms cubic-bezier(0.16,1,0.3,1) 150ms, opacity 420ms ease 150ms',
        }}
      >
        <h2
          style={{
            fontSize: 'clamp(22px, 4vw, 30px)',
            fontWeight: 300,
            letterSpacing: '0.06em',
            color: '#ffffff',
            fontFamily: 'var(--font-josefin)',
            marginBottom: '10px',
            lineHeight: 1.2,
          }}
        >
          {name}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          {titles.map((title, ti) => (
            <span
              key={ti}
              style={{
                fontSize: '11px',
                fontWeight: 300,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.35)',
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
    <div style={{ background: '#070c0e', minHeight: '100vh' }}>
      {/* Subtle grain overlay */}
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
              color: 'rgba(255,255,255,0.2)',
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
              color: '#ffffff',
              fontFamily: 'var(--font-josefin)',
              lineHeight: 1.1,
            }}
          >
            The Team
          </h1>
        </div>

        {/* Team members */}
        <div
          style={{
            maxWidth: '580px',
            margin: '0 auto',
            padding: '0 24px',
          }}
        >
          {TEAM.map((member, i) => (
            <TeamMember
              key={member.name}
              name={member.name}
              titles={member.titles}
              index={i}
            />
          ))}
        </div>

        {/* Footer space */}
        <div style={{ height: '80px' }} />
      </div>
    </div>
  );
}
