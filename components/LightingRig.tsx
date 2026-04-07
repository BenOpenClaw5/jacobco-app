'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';

// ─── Fixture layout (4 total: 1 pinspot per top corner, 1 AX5 per bottom) ────
//  [0] TL pinspot · [1] TR pinspot · [2] BL AX5 · [3] BR AX5

interface Fixture {
  xPct: number;       // beam origin X as fraction of canvas width
  yPct: number;       // beam origin Y as fraction of canvas height
  type: 'pinspot' | 'ax5';
  breathePhase: number;
  driftPhase: number;
  driftPeriod: number;
  termYPct: number;   // beam terminates at this Y fraction
}

const FIXTURES: Fixture[] = [
  { xPct: 0.050, yPct: 0.10, type: 'pinspot', breathePhase: 0.0, driftPhase: 0.0,  driftPeriod: 9200,  termYPct: 0.62 },
  { xPct: 0.950, yPct: 0.10, type: 'pinspot', breathePhase: 0.8, driftPhase: 2.4,  driftPeriod: 8600,  termYPct: 0.62 },
  { xPct: 0.050, yPct: 0.84, type: 'ax5',     breathePhase: 1.9, driftPhase: 0.9,  driftPeriod: 9800,  termYPct: 0.38 },
  { xPct: 0.950, yPct: 0.84, type: 'ax5',     breathePhase: 2.6, driftPhase: 2.1,  driftPeriod: 10400, termYPct: 0.38 },
];

// All beams converge here (center of "Production Operations" text)
const TARGET = { xPct: 0.50, yPct: 0.44 };

// Ignition timing
const IGNITION_TIMES = [0, 200, 450, 700]; // ms after INITIAL_DELAY
const INITIAL_DELAY  = 350;   // ms before first light fires
const FADE_MS        = 200;   // fade-in duration per fixture
const DONE_MS        = INITIAL_DELAY + 700 + FADE_MS; // 1250ms — all fixtures fully on

// Post-ignition animation
const BREATHE_AMP    = 0.08;
const BREATHE_PERIOD = 4000; // ms
const DRIFT_AMP_X    = 0.015;
const DRIFT_AMP_Y    = 0.015;

// ─── Photo overlay config (one entry per fixture, same order as FIXTURES) ────
const FIXTURE_IMGS: {
  src: string;
  rotateDeg: number;
  top?: string; bottom?: string;
  left?: string; right?: string;
  sizePinspot: boolean; // true = pinspot sizing, false = AX5 sizing
}[] = [
  { src: '/pinspot-stand.webp', rotateDeg:  40, top: '2%',  left:  '1%', sizePinspot: true  },
  { src: '/pinspot-stand.webp', rotateDeg: -40, top: '2%',  right: '1%', sizePinspot: true  },
  { src: '/ax5-front.webp',     rotateDeg: -35, bottom: '6%', left:  '1%', sizePinspot: false },
  { src: '/ax5-front.webp',     rotateDeg:  35, bottom: '6%', right: '1%', sizePinspot: false },
];

// ─── Draw a single beam ───────────────────────────────────────────────────────

function drawBeam(
  ctx: CanvasRenderingContext2D,
  sx: number, sy: number,
  aimX: number, aimY: number,
  termYPct: number,
  cw: number, ch: number,
  intensity: number,
  isMobile: boolean,
) {
  if (intensity < 0.005) return;

  const adx = aimX - sx, ady = aimY - sy;
  const alen = Math.sqrt(adx * adx + ady * ady);
  const nx = adx / alen, ny = ady / alen;
  const px = -ny, py = nx;

  // Beam extends to termination Y along the beam direction
  const termY = termYPct * ch;
  let beamLen: number;
  if (Math.abs(ny) > 0.01) {
    beamLen = Math.max((termY - sy) / ny, alen * 0.8);
  } else {
    beamLen = alen * 1.3;
  }
  const ex = sx + nx * beamLen;
  const ey = sy + ny * beamLen;

  const mScale = isMobile ? 0.65 : 1.0;
  const base   = intensity * mScale;

  // Four layered cones — narrow core to wide outer haze
  const layers = [
    { degHalf: 8,  peak: 0.35 },
    { degHalf: 14, peak: 0.20 },
    { degHalf: 22, peak: 0.12 },
    { degHalf: 32, peak: 0.06 },
  ];

  for (const layer of layers) {
    const halfW = Math.tan(layer.degHalf * Math.PI / 180) * beamLen;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex + px * halfW, ey + py * halfW);
    ctx.lineTo(ex - px * halfW, ey - py * halfW);
    ctx.closePath();

    // Non-linear gradient: fast drop near source, slow atmospheric tail
    const grad = ctx.createLinearGradient(sx, sy, ex, ey);
    const a = layer.peak * base;
    grad.addColorStop(0.00, `rgba(255,240,190,${a * 0.75})`);
    grad.addColorStop(0.06, `rgba(255,210,120,${a * 1.00})`);
    grad.addColorStop(0.25, `rgba(255,205,110,${a * 0.75})`);
    grad.addColorStop(0.55, `rgba(220,175, 85,${a * 0.38})`);
    grad.addColorStop(0.82, `rgba(190,145, 65,${a * 0.12})`);
    grad.addColorStop(1.00, `rgba(160,120, 50,0)`);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // Dust streaks — thin lines inside beam simulating airborne particles
  const streakCount = isMobile ? 1 : 3;
  const coreHalfW = Math.tan(8 * Math.PI / 180) * beamLen;
  const streakAlphas  = [0.045, 0.028, 0.038];
  const streakOffsets = [-coreHalfW * 0.35, 0, coreHalfW * 0.40];

  for (let s = 0; s < streakCount; s++) {
    const off = streakOffsets[s];
    ctx.beginPath();
    ctx.moveTo(sx + nx * beamLen * (0.04 + s * 0.02) + px * off, sy + ny * beamLen * (0.04 + s * 0.02) + py * off);
    ctx.lineTo(sx + nx * beamLen * (0.88 - s * 0.06) + px * off, sy + ny * beamLen * (0.88 - s * 0.06) + py * off);
    ctx.strokeStyle = `rgba(255,225,155,${streakAlphas[s] * base})`;
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }
}

// ─── Center convergence glow (elliptical, very subtle) ────────────────────────

function drawCenterGlow(
  ctx: CanvasRenderingContext2D,
  cw: number, ch: number,
  avgIntensity: number,
  isMobile: boolean,
) {
  const cx = TARGET.xPct * cw;
  const cy = TARGET.yPct * ch;
  const rx = cw * 0.40;
  const ry = ch * 0.25;
  const a  = avgIntensity * (isMobile ? 0.65 : 1.0);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, ry / rx);
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  grad.addColorStop(0.00, `rgba(255,228,160,${0.12 * a})`);
  grad.addColorStop(0.28, `rgba(255,210,120,${0.060 * a})`);
  grad.addColorStop(0.60, `rgba(220,170, 80,${0.020 * a})`);
  grad.addColorStop(1.00, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LightingRig() {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  // One ref per fixture wrapper div — opacity driven directly from RAF loop
  const wrapperRefs  = useRef<(HTMLDivElement | null)[]>([null, null, null, null]);
  const rafRef       = useRef<number>(0);
  const startTsRef   = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function resize() {
      if (!canvas) return;
      canvas.width  = canvas.offsetWidth  || window.innerWidth;
      canvas.height = canvas.offsetHeight || Math.round(window.innerHeight * 0.8);
    }

    function draw(ts: number) {
      // 60fps cap
      if (ts - lastFrameRef.current < 14) { rafRef.current = requestAnimationFrame(draw); return; }
      lastFrameRef.current = ts;
      if (!canvas || !ctx) return;

      if (startTsRef.current === 0) startTsRef.current = ts;
      const elapsed  = ts - startTsRef.current;
      const allDone  = elapsed > DONE_MS;
      const cw = canvas.width;
      const ch = canvas.height;
      const isMobile = cw < 768;

      ctx.clearRect(0, 0, cw, ch);

      let totalIntensity = 0;

      for (let i = 0; i < FIXTURES.length; i++) {
        const fx = FIXTURES[i];

        // ── Compute intensity ──
        const fixtureStart = INITIAL_DELAY + IGNITION_TIMES[i];
        let raw: number;
        if (elapsed < fixtureStart) {
          raw = 0;
        } else {
          const t = Math.min((elapsed - fixtureStart) / FADE_MS, 1);
          raw = 1 - Math.pow(1 - t, 2); // ease-out
        }

        let intensity = raw;
        if (allDone && raw >= 1) {
          const breathe = Math.sin((elapsed / BREATHE_PERIOD) * 2 * Math.PI + fx.breathePhase) * BREATHE_AMP;
          intensity = Math.max(0, 1 + breathe);
        }
        totalIntensity += intensity;

        // ── Drive photo overlay opacity — same timing as beam ──
        const wrapper = wrapperRefs.current[i];
        if (wrapper) wrapper.style.opacity = String(Math.min(1, intensity));

        // ── Compute drifting aim point ──
        const driftX = Math.sin((elapsed / fx.driftPeriod) * 2 * Math.PI + fx.driftPhase) * DRIFT_AMP_X * cw;
        const driftY = Math.cos((elapsed / (fx.driftPeriod * 0.73)) * 2 * Math.PI + fx.driftPhase * 1.3) * DRIFT_AMP_Y * ch;
        const aimX = TARGET.xPct * cw + driftX;
        const aimY = TARGET.yPct * ch + driftY;

        // ── Draw beam ──
        drawBeam(ctx, fx.xPct * cw, fx.yPct * ch, aimX, aimY, fx.termYPct, cw, ch, intensity, isMobile);
      }

      drawCenterGlow(ctx, cw, ch, totalIntensity / FIXTURES.length, isMobile);

      rafRef.current = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize);
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <>
      {/* Beam canvas — z-index 0, fills hero section */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          pointerEvents: 'none',
          display: 'block',
        }}
      />

      {/* Real fixture photos — z-index 5, opacity driven by RAF loop */}
      {FIXTURE_IMGS.map((cfg, i) => (
        <div
          key={i}
          ref={(el) => { wrapperRefs.current[i] = el; }}
          style={{
            position: 'absolute',
            top:    cfg.top,
            bottom: cfg.bottom,
            left:   cfg.left,
            right:  cfg.right,
            zIndex: 5,
            opacity: 0, // start invisible; RAF loop drives this
            transform: `rotate(${cfg.rotateDeg}deg)`,
            mixBlendMode: 'screen' as React.CSSProperties['mixBlendMode'],
            filter: 'brightness(0.9) contrast(1.15)',
            // Responsive width: pinspot smaller, AX5 slightly larger
            width: cfg.sizePinspot ? 'clamp(48px, 6vw, 78px)' : 'clamp(56px, 7vw, 88px)',
            pointerEvents: 'none',
            transformOrigin: 'center center',
          }}
        >
          <Image
            src={cfg.src}
            alt=""
            width={cfg.sizePinspot ? 78 : 88}
            height={cfg.sizePinspot ? 120 : 100}
            style={{ width: '100%', height: 'auto', display: 'block' }}
            priority
            unoptimized={false}
          />
        </div>
      ))}
    </>
  );
}
