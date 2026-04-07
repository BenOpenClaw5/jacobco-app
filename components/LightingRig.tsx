'use client';

import { useEffect, useRef } from 'react';

// ─── Fixture layout (4 total: 1 pinspot per top corner, 1 AX5 per bottom) ────
//  [0] TL pinspot · [1] TR pinspot · [2] BL AX5 · [3] BR AX5

interface Fixture {
  xPct: number;       // position X as fraction of canvas width
  yPct: number;       // position Y as fraction of canvas height
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
const DONE_MS        = INITIAL_DELAY + 700 + FADE_MS; // all fixtures fully on

// Post-ignition animation
const BREATHE_AMP    = 0.08;
const BREATHE_PERIOD = 4000; // ms
const DRIFT_AMP_X    = 0.015;
const DRIFT_AMP_Y    = 0.015;

// ─── Rounded rect helper ──────────────────────────────────────────────────────

function rRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  r: number,
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

// ─── Rotation angle so a fixture's local +Y axis aims at (centerX, centerY) ──
// With canvas clockwise rotation, local +Y in world space = (−sinθ, cosθ).
// We want (−sinθ, cosθ) ∝ (centerX − fx, centerY − fy), so:
//   θ = atan2(fx − centerX, centerY − fy)

function aimAngle(fx: number, fy: number, cx: number, cy: number): number {
  return Math.atan2(fx - cx, cy - fy);
}

// Lens world position for a fixture centered at (x, y) rotated by θ,
// where the lens is at local (0, lensOff):
//   worldX = x − sin(θ) * lensOff
//   worldY = y + cos(θ) * lensOff

function lensWorld(
  x: number, y: number,
  angle: number,
  lensOff: number,
): { lx: number; ly: number } {
  return {
    lx: x - Math.sin(angle) * lensOff,
    ly: y + Math.cos(angle) * lensOff,
  };
}

// ─── Pinspot illustration ─────────────────────────────────────────────────────
// Silver/aluminum theatrical pinspot: cubic base → skinny neck → round head.
// Drawn horizontal at origin — head (output/lens) at +X, base at −X.
// Caller rotates so +X aims toward canvas center.

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

  // Drop shadow on main body shapes
  ctx.shadowColor   = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur    = 6;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 2;

  // ── Part 1: Base (cubic rectangular box) ──
  const baseGrad = ctx.createLinearGradient(baseX, baseY, baseX, baseY + baseH);
  baseGrad.addColorStop(0.0, '#d8d8d8');
  baseGrad.addColorStop(0.3, '#b8b8b8');
  baseGrad.addColorStop(0.7, '#989898');
  baseGrad.addColorStop(1.0, '#787878');
  ctx.fillStyle = baseGrad;
  rRect(ctx, baseX, baseY, baseW, baseH, 2 * s);
  ctx.fill();

  // ── Part 2: Neck (skinny connector) ──
  const neckX = baseX + baseW;
  const neckY = -neckH / 2;
  const neckGrad = ctx.createLinearGradient(neckX, neckY, neckX, neckY + neckH);
  neckGrad.addColorStop(0.0, '#c8c8c8');
  neckGrad.addColorStop(0.5, '#a0a0a0');
  neckGrad.addColorStop(1.0, '#808080');
  ctx.fillStyle = neckGrad;
  rRect(ctx, neckX, neckY, neckW, neckH, s);
  ctx.fill();

  // ── Part 3: Head (round cylinder, silver/aluminum) ──
  const headCX = neckX + neckW + headR * 0.6;
  const headCY = 0;
  const headGrad = ctx.createRadialGradient(
    headCX - headR * 0.3, headCY - headR * 0.3, 0,
    headCX, headCY, headR,
  );
  headGrad.addColorStop(0.0, '#e0e0e0');
  headGrad.addColorStop(0.5, '#b0b0b0');
  headGrad.addColorStop(1.0, '#707070');
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(headCX, headCY, headR, 0, Math.PI * 2);
  ctx.fill();

  // Clear shadow before thin detail lines
  ctx.shadowColor   = 'transparent';
  ctx.shadowBlur    = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Base: top-edge specular highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 0.75;
  ctx.beginPath();
  ctx.moveTo(baseX + 2 * s, baseY + s);
  ctx.lineTo(baseX + baseW - 2 * s, baseY + s);
  ctx.stroke();

  // Base: subtle center panel seam
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(baseX + baseW * 0.5, baseY + 2 * s);
  ctx.lineTo(baseX + baseW * 0.5, baseY + baseH - 2 * s);
  ctx.stroke();

  // Base: dark rim stroke
  ctx.strokeStyle = 'rgba(80,80,80,0.6)';
  ctx.lineWidth = 0.75;
  rRect(ctx, baseX, baseY, baseW, baseH, 2 * s);
  ctx.stroke();

  // Neck: top specular line
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(neckX + s, neckY + s);
  ctx.lineTo(neckX + neckW - s, neckY + s);
  ctx.stroke();

  // Head: housing rim stroke
  ctx.strokeStyle = 'rgba(60,60,60,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(headCX, headCY, headR, 0, Math.PI * 2);
  ctx.stroke();

  // Head: specular arc (upper-left)
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(headCX, headCY, headR - 1.5 * s, Math.PI * 1.1, Math.PI * 1.7);
  ctx.stroke();

  // ── Flat face on the output end (+X side of head) ──
  const faceX = headCX + headR * 0.15;

  // Bezel ring (dark outer ring)
  ctx.fillStyle = '#555';
  ctx.beginPath();
  ctx.arc(faceX, headCY, headR * 0.72, 0, Math.PI * 2);
  ctx.fill();

  // Inner bezel
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.arc(faceX, headCY, headR * 0.58, 0, Math.PI * 2);
  ctx.fill();

  // Lens aperture — warm amber-white glow
  const lg = ctx.createRadialGradient(faceX, headCY, 0, faceX, headCY, headR * 0.48);
  lg.addColorStop(0.00, 'rgba(255,248,220,1.0)');
  lg.addColorStop(0.35, 'rgba(255,225,150,0.9)');
  lg.addColorStop(0.70, 'rgba(255,190,80,0.6)');
  lg.addColorStop(1.00, 'rgba(255,160,40,0)');
  ctx.fillStyle = lg;
  ctx.beginPath();
  ctx.arc(faceX, headCY, headR * 0.48, 0, Math.PI * 2);
  ctx.fill();

  // Lens center flare dot
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(faceX, headCY, headR * 0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ─── AX5 illustration ─────────────────────────────────────────────────────────
// Wide squat battery PAR — rectangular body, yoke arms, bezel ring, tri-LED.
// Local +Y = output direction (face/bezel end). Drawn at (x,y) rotated by angle.

function drawAX5(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  angle: number,
  s: number,
  intensity: number,
) {
  if (intensity < 0.005) return;

  const W       = 32 * s;
  const H       = 24 * s;
  const faceOff = H / 2 + 2 * s;

  ctx.save();
  ctx.globalAlpha = Math.min(1, intensity);
  ctx.translate(x, y);
  ctx.rotate(angle);

  // ── Base / foot (at local −Y, opposite the face) ──
  ctx.fillStyle = '#181818';
  rRect(ctx, -W / 2 - 2 * s, -H / 2 - 7 * s, W + 4 * s, 7 * s, 2 * s);
  ctx.fill();
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // ── Main body ──
  const bodyGrad = ctx.createLinearGradient(-W / 2, -H / 2, W / 2, H / 2);
  bodyGrad.addColorStop(0.00, '#1e1e1e');
  bodyGrad.addColorStop(0.50, '#141414');
  bodyGrad.addColorStop(1.00, '#0d0d0d');
  ctx.fillStyle = bodyGrad;
  rRect(ctx, -W / 2, -H / 2, W, H, 3 * s);
  ctx.fill();

  // Vertical ribs (heat fins on sides)
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 0.8;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * (W / 5), -H / 2 + 2 * s);
    ctx.lineTo(i * (W / 5),  H / 2 - 2 * s);
    ctx.stroke();
  }

  // Specular top edge highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-W / 2 + 3 * s, -H / 2 + s);
  ctx.lineTo( W / 2 - 3 * s, -H / 2 + s);
  ctx.stroke();

  // ── Yoke arms (thick side brackets for floor tilt) ──
  ctx.fillStyle = '#1a1a1a';
  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = 1;
  // Left arm
  rRect(ctx, -W / 2 - 11 * s, -H / 4, 11 * s, H / 2, 2 * s);
  ctx.fill(); ctx.stroke();
  // Right arm
  rRect(ctx, W / 2, -H / 4, 11 * s, H / 2, 2 * s);
  ctx.fill(); ctx.stroke();
  // Pivot pin circles on yoke
  ctx.fillStyle = '#252525';
  ctx.beginPath(); ctx.arc(-W / 2 - 5 * s, 0, 2.5 * s, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc( W / 2 + 5 * s, 0, 2.5 * s, 0, Math.PI * 2); ctx.fill();

  // ── Front face bezel ring ──
  ctx.strokeStyle = '#2e2e2e';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, faceOff, 14 * s, 0, Math.PI * 2);
  ctx.stroke();

  // Bezel inner fill
  ctx.fillStyle = '#0c0c0c';
  ctx.beginPath();
  ctx.arc(0, faceOff, 12.5 * s, 0, Math.PI * 2);
  ctx.fill();

  // ── Three LED lenses — triangle arrangement (KEY feature) ──
  const leds = [
    { lx: 0,         ly: faceOff - 4.5 * s }, // top center
    { lx: -4.5 * s,  ly: faceOff + 3.5 * s }, // bottom left
    { lx:  4.5 * s,  ly: faceOff + 3.5 * s }, // bottom right
  ];

  for (const led of leds) {
    // Housing ring
    ctx.strokeStyle = '#363636';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(led.lx, led.ly, 4 * s, 0, Math.PI * 2);
    ctx.stroke();

    // LED glow
    const lg = ctx.createRadialGradient(led.lx, led.ly, 0, led.lx, led.ly, 3.5 * s);
    lg.addColorStop(0.00, 'rgba(255,240,170,0.95)');
    lg.addColorStop(0.45, 'rgba(255,205,100,0.55)');
    lg.addColorStop(1.00, 'rgba(255,160,55,0)');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.arc(led.lx, led.ly, 3.5 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

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
      const scale    = isMobile ? 0.65 : 1.0;

      const centerX = TARGET.xPct * cw;
      const centerY = TARGET.yPct * ch;

      ctx.clearRect(0, 0, cw, ch);

      // ── First pass: compute per-fixture state ──────────────────────────────
      const intensities: number[]                   = [];
      const lensPos: { lx: number; ly: number }[]   = [];
      const aimPoints: { ax: number; ay: number }[] = [];
      const angles: number[]                        = [];

      for (let i = 0; i < FIXTURES.length; i++) {
        const fx = FIXTURES[i];
        const fxX = fx.xPct * cw;
        const fxY = fx.yPct * ch;

        // Intensity
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

        // Rotation angle and lens world position — differ per fixture type
        let angle: number;
        if (fx.type === 'pinspot') {
          // Drawn horizontal: head at +X, so rotate so +X aims at center
          angle = Math.atan2(centerY - fxY, centerX - fxX);
          // Lens face is at local X = headCX + headR*0.15
          const tL = 42 * scale, bW = 14 * scale, nW = 10 * scale, hR = 8 * scale;
          const hCX = -tL / 2 + bW + nW + hR * 0.6;
          const lensLocalX = hCX + hR * 0.15;
          lensPos.push({
            lx: fxX + Math.cos(angle) * lensLocalX,
            ly: fxY + Math.sin(angle) * lensLocalX,
          });
        } else {
          // AX5 drawn vertical: face at +Y, so rotate so +Y aims at center
          angle = aimAngle(fxX, fxY, centerX, centerY);
          const ax5H = 24 * scale;
          lensPos.push(lensWorld(fxX, fxY, angle, ax5H / 2 + 2 * scale));
        }
        angles.push(angle);

        // Drifting aim point (post-ignition wander)
        const driftX = Math.sin((elapsed / fx.driftPeriod) * 2 * Math.PI + fx.driftPhase) * DRIFT_AMP_X * cw;
        const driftY = Math.cos((elapsed / (fx.driftPeriod * 0.73)) * 2 * Math.PI + fx.driftPhase * 1.3) * DRIFT_AMP_Y * ch;
        aimPoints.push({ ax: centerX + driftX, ay: centerY + driftY });
      }

      // ── Draw beams (behind fixtures) ───────────────────────────────────────
      let totalIntensity = 0;
      for (let i = 0; i < FIXTURES.length; i++) {
        totalIntensity += intensities[i];
        const { lx, ly } = lensPos[i];
        const { ax, ay } = aimPoints[i];
        drawBeam(ctx, lx, ly, ax, ay, FIXTURES[i].termYPct, cw, ch, intensities[i], isMobile);
      }

      // ── Draw fixtures on top (lens glow covers beam origin) ───────────────
      for (let i = 0; i < FIXTURES.length; i++) {
        const fx  = FIXTURES[i];
        const fxX = fx.xPct * cw;
        const fxY = fx.yPct * ch;
        if (fx.type === 'pinspot') {
          drawPinspot(ctx, fxX, fxY, angles[i], scale, intensities[i]);
        } else {
          drawAX5(ctx, fxX, fxY, angles[i], scale, intensities[i]);
        }
      }

      // ── Center convergence glow ────────────────────────────────────────────
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
