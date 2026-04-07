'use client';

import { useEffect, useRef } from 'react';

// ─── Fixture definitions ───────────────────────────────────────────────────
interface FixtureDef {
  xPct: number;       // 0–1 fraction of canvas width
  yPct: number;       // 0–1 fraction of canvas height
  r: number; g: number; b: number;
  spreadDeg: number;  // half-angle of beam cone
  breathePhase: number; // phase offset for sine breathing (radians)
}

// Fire order: TL1, TR1, TL2, TR2, BL-AX5, BR-AX5
const FIXTURES: FixtureDef[] = [
  // Pinspots — top left (index 0, 1)
  { xPct: 0.08, yPct: 0.04, r: 255, g: 240, b: 200, spreadDeg: 14, breathePhase: 0.00 },
  { xPct: 0.18, yPct: 0.03, r: 255, g: 238, b: 195, spreadDeg: 14, breathePhase: 0.85 },
  // Pinspots — top right (index 2, 3)
  { xPct: 0.82, yPct: 0.03, r: 255, g: 238, b: 195, spreadDeg: 14, breathePhase: 1.70 },
  { xPct: 0.92, yPct: 0.04, r: 255, g: 240, b: 200, spreadDeg: 14, breathePhase: 2.55 },
  // AX5s — bottom (index 4, 5)
  { xPct: 0.12, yPct: 0.93, r: 220, g: 235, b: 255, spreadDeg: 20, breathePhase: 3.40 },
  { xPct: 0.88, yPct: 0.93, r: 220, g: 235, b: 255, spreadDeg: 20, breathePhase: 4.25 },
];

// All beams converge here — center of "Production Operations" text
const TARGET = { xPct: 0.50, yPct: 0.44 };

const FIRE_ORDER      = [0, 2, 1, 3, 4, 5]; // TL1, TR1, TL2, TR2, BL, BR
const STAGGER_MS      = 175;
const INITIAL_DELAY   = 450; // ms before first light fires
const FLICKER_MS      = 170;
const BREATHE_AMP     = 0.08;
const BREATHE_PERIOD  = 4200; // ms per sine cycle

// ─── Cone layer definitions ───────────────────────────────────────────────
const CONE_LAYERS = [
  { spread: 1.00, srcA: 0.030, dstA: 0.000 }, // outer haze
  { spread: 0.58, srcA: 0.065, dstA: 0.000 }, // mid haze
  { spread: 0.28, srcA: 0.110, dstA: 0.005 }, // inner
  { spread: 0.09, srcA: 0.190, dstA: 0.015 }, // core beam
];

// ─── Draw a single fixture's beam ────────────────────────────────────────
function drawCone(
  ctx: CanvasRenderingContext2D,
  fx: FixtureDef,
  intensity: number,
  w: number,
  h: number,
  isMobile: boolean,
) {
  if (intensity < 0.002) return;

  const sx = fx.xPct * w;
  const sy = fx.yPct * h;
  const tx = TARGET.xPct * w;
  const ty = TARGET.yPct * h;

  const dx = tx - sx;
  const dy = ty - sy;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = dx / len;
  const ny = dy / len;
  // Perpendicular
  const px = -ny;
  const py =  nx;

  const halfW  = Math.tan((fx.spreadDeg * Math.PI) / 180) * len;
  const ext    = 0.14;
  const ex     = tx + nx * len * ext;
  const ey     = ty + ny * len * ext;
  const eHW    = halfW * (1 + ext);

  const mScale = isMobile ? 0.70 : 1.0;
  const base   = intensity * mScale;

  for (const layer of CONE_LAYERS) {
    const lw = eHW * layer.spread;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex + px * lw, ey + py * lw);
    ctx.lineTo(ex - px * lw, ey - py * lw);
    ctx.closePath();

    const grad = ctx.createLinearGradient(sx, sy, ex, ey);
    grad.addColorStop(0.00, `rgba(${fx.r},${fx.g},${fx.b},${layer.srcA * base * 2.8})`);
    grad.addColorStop(0.30, `rgba(${fx.r},${fx.g},${fx.b},${layer.srcA * base * 1.2})`);
    grad.addColorStop(1.00, `rgba(${fx.r},${fx.g},${fx.b},${layer.dstA * base})`);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // Fixture head — warm point glow
  const gR = Math.max(w, h) * 0.022;
  const gl  = ctx.createRadialGradient(sx, sy, 0, sx, sy, gR);
  gl.addColorStop(0.0, `rgba(${fx.r},${fx.g},${fx.b},${0.85 * base})`);
  gl.addColorStop(0.4, `rgba(${fx.r},${fx.g},${fx.b},${0.18 * base})`);
  gl.addColorStop(1.0, `rgba(${fx.r},${fx.g},${fx.b},0)`);
  ctx.fillStyle = gl;
  ctx.beginPath();
  ctx.arc(sx, sy, gR, 0, Math.PI * 2);
  ctx.fill();

  // Dark metallic housing dot
  ctx.fillStyle = 'rgba(18,28,36,0.92)';
  ctx.beginPath();
  ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

// ─── Text convergence glow ────────────────────────────────────────────────
function drawTextGlow(
  ctx: CanvasRenderingContext2D,
  totalIntensity: number,
  w: number,
  h: number,
  isMobile: boolean,
) {
  const tx   = TARGET.xPct * w;
  const ty   = TARGET.yPct * h;
  const r    = w * (isMobile ? 0.44 : 0.36);
  const a    = (totalIntensity / FIXTURES.length) * (isMobile ? 0.65 : 1.0);

  const grad = ctx.createRadialGradient(tx, ty, 0, tx, ty, r);
  grad.addColorStop(0.00, `rgba(255,215,140,${0.075 * a})`);
  grad.addColorStop(0.35, `rgba(255,200,100,${0.038 * a})`);
  grad.addColorStop(0.70, `rgba(240,180, 80,${0.012 * a})`);
  grad.addColorStop(1.00, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

// ─── Flicker ignition for one fixture ────────────────────────────────────
function igniteFixture(
  intensities: React.MutableRefObject<number[]>,
  idx: number,
  onDone: () => void,
) {
  const start = performance.now();
  function step(now: number) {
    const t = Math.min((now - start) / FLICKER_MS, 1);
    // Overshoot → settle: 0 → 1.2 → 0.85 → 1.0
    let v: number;
    if      (t < 0.35) v = (t / 0.35) * 1.20;
    else if (t < 0.65) v = 1.20 - ((t - 0.35) / 0.30) * 0.35;
    else               v = 0.85 + ((t - 0.65) / 0.35) * 0.15;
    intensities.current[idx] = v;
    if (t < 1) requestAnimationFrame(step);
    else { intensities.current[idx] = 1.0; onDone(); }
  }
  requestAnimationFrame(step);
}

// ─── Component ────────────────────────────────────────────────────────────
export default function LightingRig() {
  const canvasRef       = useRef<HTMLCanvasElement>(null);
  const intensities     = useRef<number[]>([0, 0, 0, 0, 0, 0]);
  const rafRef          = useRef<number>(0);
  const ignitionDone    = useRef(false);
  const ignitionTs      = useRef(0);
  const timers          = useRef<ReturnType<typeof setTimeout>[]>([]);
  const lastFrameTs     = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function resize() {
      if (!canvas) return;
      canvas.width  = canvas.offsetWidth  || window.innerWidth;
      canvas.height = canvas.offsetHeight || window.innerHeight * 0.8;
    }

    function draw(ts: number) {
      // 60 fps cap
      if (ts - lastFrameTs.current < 14) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      lastFrameTs.current = ts;

      if (!canvas || !ctx) return;
      const cw = canvas.width;
      const ch = canvas.height;
      const isMobile = cw < 640;

      ctx.clearRect(0, 0, cw, ch);

      let totalIntensity = 0;
      for (let i = 0; i < FIXTURES.length; i++) {
        let v = intensities.current[i];
        if (ignitionDone.current && v > 0.01) {
          const elapsed = ts - ignitionTs.current;
          v = Math.max(0, v + Math.sin(
            (elapsed / BREATHE_PERIOD) * 2 * Math.PI + FIXTURES[i].breathePhase
          ) * BREATHE_AMP);
        }
        totalIntensity += v;
        drawCone(ctx, FIXTURES[i], v, cw, ch, isMobile);
      }

      drawTextGlow(ctx, totalIntensity, cw, ch, isMobile);

      rafRef.current = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize);
    rafRef.current = requestAnimationFrame(draw);

    // ── Ignition sequence ──
    let doneCount = 0;
    FIRE_ORDER.forEach((fixtureIdx, order) => {
      const t = setTimeout(() => {
        igniteFixture(intensities, fixtureIdx, () => {
          doneCount++;
          if (doneCount === FIXTURES.length) {
            ignitionDone.current = true;
            ignitionTs.current   = performance.now();
          }
        });
      }, INITIAL_DELAY + order * STAGGER_MS);
      timers.current.push(t);
    });

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      timers.current.forEach(clearTimeout);
    };
  }, []);

  return (
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
  );
}
