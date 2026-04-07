'use client';

import { useEffect, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type FixtureType = 'pinspot' | 'ax5';

interface Fixture {
  xPct: number;
  yPct: number;
  type: FixtureType;
  breathePhase: number;   // radians, offset for sine breathing
  driftPhase: number;     // radians, offset for aim drift
  driftPeriod: number;    // ms per drift cycle
  termYPct: number;       // beam terminus as fraction of canvas height
  perspectiveScale: number;
}

// ─── Fixture layout ───────────────────────────────────────────────────────────
//  [0] TL pinspot 1 · [1] TL pinspot 2
//  [2] TR pinspot 1 · [3] TR pinspot 2
//  [4] BL AX5       · [5] BR AX5

const FIXTURES: Fixture[] = [
  { xPct: 0.030, yPct: 0.06, type: 'pinspot', breathePhase: 0.0, driftPhase: 0.0,  driftPeriod: 9200,  termYPct: 0.60, perspectiveScale: 1.00 },
  { xPct: 0.072, yPct: 0.06, type: 'pinspot', breathePhase: 0.4, driftPhase: 1.2,  driftPeriod: 10800, termYPct: 0.60, perspectiveScale: 1.00 },
  { xPct: 0.928, yPct: 0.06, type: 'pinspot', breathePhase: 0.8, driftPhase: 2.4,  driftPeriod: 8600,  termYPct: 0.60, perspectiveScale: 1.00 },
  { xPct: 0.970, yPct: 0.06, type: 'pinspot', breathePhase: 1.3, driftPhase: 3.7,  driftPeriod: 11400, termYPct: 0.60, perspectiveScale: 1.00 },
  { xPct: 0.040, yPct: 0.90, type: 'ax5',     breathePhase: 1.9, driftPhase: 0.9,  driftPeriod: 9800,  termYPct: 0.40, perspectiveScale: 0.88 },
  { xPct: 0.960, yPct: 0.90, type: 'ax5',     breathePhase: 2.6, driftPhase: 2.1,  driftPeriod: 10400, termYPct: 0.40, perspectiveScale: 0.88 },
];

// All beams converge on this center point — where "Production Operations" text lives
const TARGET = { xPct: 0.50, yPct: 0.44 };

// Ignition — each fixture fires at this ms offset after initial delay
const IGNITION_TIMES = [0, 150, 280, 420, 600, 820]; // ms
const INITIAL_DELAY  = 350;  // ms before first light
const FADE_MS        = 200;  // ms to fade from 0 → 1 (ease-out, no flicker)
const BREATHE_AMP    = 0.08;
const BREATHE_PERIOD = 4000; // ms
const DRIFT_AMP_X    = 0.015;
const DRIFT_AMP_Y    = 0.015;
const DONE_MS        = INITIAL_DELAY + 820 + FADE_MS; // when last fixture is fully on

// ─── Helper: polyfilled roundRect ─────────────────────────────────────────────

function rRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    const rx = Math.min(r, w / 2), ry = Math.min(r, h / 2);
    ctx.moveTo(x + rx, y);
    ctx.lineTo(x + w - rx, y); ctx.quadraticCurveTo(x + w, y, x + w, y + ry);
    ctx.lineTo(x + w, y + h - ry); ctx.quadraticCurveTo(x + w, y + h, x + w - rx, y + h);
    ctx.lineTo(x + rx, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - ry);
    ctx.lineTo(x, y + ry); ctx.quadraticCurveTo(x, y, x + rx, y);
    ctx.closePath();
  }
}

// ─── Draw pinspot fixture body ────────────────────────────────────────────────

function drawPinspot(ctx: CanvasRenderingContext2D, sx: number, sy: number, angle: number, intensity: number, scale: number) {
  if (intensity < 0.005) return;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  const bw = 13, bh = 20;

  // Body
  const bodyGrad = ctx.createLinearGradient(-bw / 2, -bh / 2, bw / 2, bh / 2);
  bodyGrad.addColorStop(0,    '#3c3c3c');
  bodyGrad.addColorStop(0.35, '#272727');
  bodyGrad.addColorStop(1,    '#1c1c1c');
  ctx.beginPath(); rRect(ctx, -bw / 2, -bh / 2, bw, bh, 3);
  ctx.fillStyle = bodyGrad; ctx.fill();

  // Body edge
  ctx.strokeStyle = 'rgba(75,75,75,0.55)'; ctx.lineWidth = 0.7;
  ctx.beginPath(); rRect(ctx, -bw / 2, -bh / 2, bw, bh, 3); ctx.stroke();

  // Specular highlight on top edge
  ctx.strokeStyle = 'rgba(255,255,255,0.13)'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-bw / 2 + 3, -bh / 2 + 2.5);
  ctx.lineTo(bw / 2 - 3,  -bh / 2 + 2.5);
  ctx.stroke();

  // Yoke arms — two thin brackets from body sides up to mount bar
  ctx.strokeStyle = '#2e2e2e'; ctx.lineWidth = 2.8;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-bw / 2 + 1, -2); ctx.lineTo(-bw / 2 - 5, -bh / 2 - 11); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bw / 2 - 1,  -2); ctx.lineTo(bw / 2 + 5,  -bh / 2 - 11); ctx.stroke();
  // Crossbar
  ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(-bw / 2 - 5, -bh / 2 - 11); ctx.lineTo(bw / 2 + 5, -bh / 2 - 11); ctx.stroke();

  // Lens — at the front (bottom) of body
  const lensY = bh / 2 - 1;
  const lensR = 7;
  const li = Math.min(1, intensity);
  const lensGrad = ctx.createRadialGradient(0, lensY, 0, 0, lensY, lensR);
  lensGrad.addColorStop(0.00, `rgba(255,250,225,${0.97 * li})`);
  lensGrad.addColorStop(0.30, `rgba(255,228,150,${0.85 * li})`);
  lensGrad.addColorStop(0.72, `rgba(80,55,18,0.70)`);
  lensGrad.addColorStop(1.00, 'rgba(14,11,7,0.95)');
  ctx.fillStyle = lensGrad;
  ctx.beginPath(); ctx.arc(0, lensY, lensR, 0, Math.PI * 2); ctx.fill();

  // Lens ring
  ctx.strokeStyle = '#545454'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, lensY, lensR, 0, Math.PI * 2); ctx.stroke();

  // Inner lens detail ring
  ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.arc(0, lensY, lensR * 0.52, 0, Math.PI * 2); ctx.stroke();

  ctx.restore();
}

// ─── Draw AX5 fixture body ────────────────────────────────────────────────────

function drawAX5(ctx: CanvasRenderingContext2D, sx: number, sy: number, angle: number, intensity: number, scale: number) {
  if (intensity < 0.005) return;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  const bw = 22, bh = 28;

  // Body
  const bodyGrad = ctx.createLinearGradient(-bw / 2, -bh / 2, bw / 2, bh / 2);
  bodyGrad.addColorStop(0,    '#404040');
  bodyGrad.addColorStop(0.28, '#2c2c2c');
  bodyGrad.addColorStop(1,    '#1f1f1f');
  ctx.beginPath(); rRect(ctx, -bw / 2, -bh / 2, bw, bh, 4);
  ctx.fillStyle = bodyGrad; ctx.fill();

  ctx.strokeStyle = 'rgba(65,65,65,0.50)'; ctx.lineWidth = 0.9;
  ctx.beginPath(); rRect(ctx, -bw / 2, -bh / 2, bw, bh, 4); ctx.stroke();

  // Specular
  ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-bw / 2 + 4, -bh / 2 + 2.5);
  ctx.lineTo(bw / 2 - 4,  -bh / 2 + 2.5);
  ctx.stroke();

  // Thicker yoke arms
  ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-bw / 2 + 2, -3); ctx.lineTo(-bw / 2 - 7, -bh / 2 - 13); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bw / 2 - 2,  -3); ctx.lineTo(bw / 2 + 7,  -bh / 2 - 13); ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-bw / 2 - 7, -bh / 2 - 13); ctx.lineTo(bw / 2 + 7, -bh / 2 - 13); ctx.stroke();

  // Front bezel outer ring
  const bezelY = bh / 2 - 2;
  ctx.strokeStyle = '#3e3e3e'; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.arc(0, bezelY, 18, 0, Math.PI * 2); ctx.stroke();

  // Inner bezel ring
  ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.arc(0, bezelY, 14, 0, Math.PI * 2); ctx.stroke();

  // Three LED lenses in triangle formation
  const li = Math.min(1, intensity);
  const lensPositions = [
    { x: 0,  y: bezelY - 7 },
    { x: -7, y: bezelY + 4.5 },
    { x:  7, y: bezelY + 4.5 },
  ];

  for (const lp of lensPositions) {
    const lg = ctx.createRadialGradient(lp.x, lp.y, 0, lp.x, lp.y, 5.5);
    lg.addColorStop(0.00, `rgba(255,250,220,${0.97 * li})`);
    lg.addColorStop(0.30, `rgba(255,222,135,${0.82 * li})`);
    lg.addColorStop(0.75, `rgba(85,58,18,0.68)`);
    lg.addColorStop(1.00, 'rgba(14,11,7,0.95)');
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.arc(lp.x, lp.y, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#505050'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(lp.x, lp.y, 5.5, 0, Math.PI * 2); ctx.stroke();
  }

  ctx.restore();
}

// ─── Draw a single beam ───────────────────────────────────────────────────────

function drawBeam(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  aimX: number,
  aimY: number,
  termYPct: number,
  cw: number,
  ch: number,
  intensity: number,
  isMobile: boolean,
) {
  if (intensity < 0.005) return;

  // Direction from source to aim
  const adx = aimX - sx, ady = aimY - sy;
  const alen = Math.sqrt(adx * adx + ady * ady);
  const nx = adx / alen, ny = ady / alen;
  const px = -ny, py = nx; // perpendicular

  // Find terminus: extend along beam direction to termination Y
  const termY = termYPct * ch;
  let beamLen: number;
  if (Math.abs(ny) > 0.01) {
    const t = (termY - sy) / ny;
    beamLen = Math.max(t, alen * 0.8); // at least 80% of source→aim distance
  } else {
    beamLen = alen * 1.3;
  }
  const ex = sx + nx * beamLen;
  const ey = sy + ny * beamLen;

  const mScale = isMobile ? 0.65 : 1.0;
  const base   = intensity * mScale;

  // Four beam layers — inner to outer
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

    // Non-linear gradient: quick drop near source, slow tail
    const grad = ctx.createLinearGradient(sx, sy, ex, ey);
    const a = layer.peak * base;
    grad.addColorStop(0.00, `rgba(255,240,190,${a * 0.75})`); // source — bright but not peak
    grad.addColorStop(0.06, `rgba(255,210,120,${a * 1.00})`); // quick ramp to peak
    grad.addColorStop(0.25, `rgba(255,205,110,${a * 0.75})`); // gentle mid
    grad.addColorStop(0.55, `rgba(220,175, 85,${a * 0.38})`); // slow decay
    grad.addColorStop(0.82, `rgba(190,145, 65,${a * 0.12})`); // near terminus
    grad.addColorStop(1.00, `rgba(160,120, 50,0)`);            // transparent terminus
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // Dust streaks — thin lines slightly offset from beam axis
  const streakCount = isMobile ? 1 : 3;
  const coreHalfW = Math.tan(8 * Math.PI / 180) * beamLen;
  const streakAlphas = [0.045, 0.028, 0.038];
  const streakPerpOffsets = [-coreHalfW * 0.35, 0, coreHalfW * 0.40];

  for (let s = 0; s < streakCount; s++) {
    const off = streakPerpOffsets[s];
    const startFrac = 0.04 + s * 0.02;
    const endFrac   = 0.88 - s * 0.06;
    ctx.beginPath();
    ctx.moveTo(sx + nx * beamLen * startFrac + px * off, sy + ny * beamLen * startFrac + py * off);
    ctx.lineTo(sx + nx * beamLen * endFrac   + px * off, sy + ny * beamLen * endFrac   + py * off);
    ctx.strokeStyle = `rgba(255,225,155,${streakAlphas[s] * base})`;
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }
}

// ─── Center convergence glow (elliptical, very subtle) ────────────────────────

function drawCenterGlow(ctx: CanvasRenderingContext2D, cw: number, ch: number, avgIntensity: number, isMobile: boolean) {
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
  const rafRef       = useRef<number>(0);
  const startTsRef   = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const timers       = useRef<ReturnType<typeof setTimeout>[]>([]);

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

      // Start timestamp on first frame
      if (startTsRef.current === 0) startTsRef.current = ts;
      const elapsed = ts - startTsRef.current;
      const allDone = elapsed > DONE_MS;

      const cw = canvas.width;
      const ch = canvas.height;
      const isMobile = cw < 768;

      ctx.clearRect(0, 0, cw, ch);

      // Draw beams first (behind fixtures), then fixtures on top
      let totalIntensity = 0;
      const intensities: number[] = [];

      for (let i = 0; i < FIXTURES.length; i++) {
        const fx = FIXTURES[i];

        // ── Intensity ──
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
        intensities.push(intensity);
        totalIntensity += intensity;

        // ── Aim drift ──
        const driftX = Math.sin((elapsed / fx.driftPeriod) * 2 * Math.PI + fx.driftPhase) * DRIFT_AMP_X * cw;
        const driftY = Math.cos((elapsed / (fx.driftPeriod * 0.73)) * 2 * Math.PI + fx.driftPhase * 1.3) * DRIFT_AMP_Y * ch;
        const aimX = TARGET.xPct * cw + driftX;
        const aimY = TARGET.yPct * ch + driftY;

        const sx = fx.xPct * cw;
        const sy = fx.yPct * ch;

        // ── Draw beam ──
        drawBeam(ctx, sx, sy, aimX, aimY, fx.termYPct, cw, ch, intensity, isMobile);
      }

      // Center glow behind fixtures
      drawCenterGlow(ctx, cw, ch, totalIntensity / FIXTURES.length, isMobile);

      // Draw fixture bodies on top of beams
      for (let i = 0; i < FIXTURES.length; i++) {
        const fx = FIXTURES[i];
        const sx = fx.xPct * cw;
        const sy = fx.yPct * ch;
        const intensity = intensities[i];

        const driftX = Math.sin((elapsed / fx.driftPeriod) * 2 * Math.PI + fx.driftPhase) * DRIFT_AMP_X * cw;
        const driftY = Math.cos((elapsed / (fx.driftPeriod * 0.73)) * 2 * Math.PI + fx.driftPhase * 1.3) * DRIFT_AMP_Y * ch;
        const aimX = TARGET.xPct * cw + driftX;
        const aimY = TARGET.yPct * ch + driftY;

        // Angle: rotate body so its lens faces the aim point
        // Local +Y = forward (lens direction), so rotate by atan2(dy,dx) - π/2
        const angle = Math.atan2(aimY - sy, aimX - sx) - Math.PI / 2;

        if (fx.type === 'pinspot') {
          drawPinspot(ctx, sx, sy, angle, intensity, fx.perspectiveScale);
        } else {
          drawAX5(ctx, sx, sy, angle, intensity, fx.perspectiveScale);
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize);
    rafRef.current = requestAnimationFrame(draw);

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
