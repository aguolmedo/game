// Dibujo 2D del disparo: luz del fogonazo y guía de tiro. Funciones sobre ShootingFx.
import { VIEW_W, VIEW_H } from '../sprite.js';
import { AIM_LENGTH, aimDotAlpha, aimDots, shotOrigin } from './projectiles.js';
import { LIFT } from './feedbackParticles.js';

const LIGHT_TIME = 0.13;

// Los colores de la guía de tiro se repiten cada frame (mismos alfas): se
// cachean para no parsear el hex ni armar el string de nuevo.
const rgbaCache = new Map();
function rgba(hex, alpha) {
  const key = `${hex}|${alpha}`;
  const hit = rgbaCache.get(key);
  if (hit) return hit;
  const s = hex.replace('#', '');
  const n = parseInt(s, 16);
  const out = `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  if (rgbaCache.size >= 512) rgbaCache.clear();
  rgbaCache.set(key, out);
  return out;
}

/** Fogonazo que ilumina alrededor en el apagón (canvas de luz). */
export function drawMuzzleLight(fx, ctx, cam) {
  if (fx.lightT <= 0 || !ctx) return;
  const k = Math.min(1, fx.lightT / LIGHT_TIME);
  const sx = Math.round(fx.lightPos.x - cam.x);
  const sy = Math.round(fx.lightPos.y - cam.y);
  const r = 26 + (1 - k) * 26;
  if (sx < -r || sy < -r || sx > VIEW_W + r || sy > VIEW_H + r) return;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  let g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
  g.addColorStop(0, `rgba(0, 0, 0, ${0.62 * k})`);
  g.addColorStop(0.5, `rgba(0, 0, 0, ${0.28 * k})`);
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 0.85);
  g.addColorStop(0, `rgba(255, 228, 150, ${0.46 * k})`);
  g.addColorStop(0.45, `rgba(255, 170, 70, ${0.2 * k})`);
  g.addColorStop(1, 'rgba(255, 160, 60, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(sx, sy, r * 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Guía de tiro punteada: punto cada 3 px, se apaga con la distancia. */
export function drawAimLine(fx, ctx, player, aim, cam, input) {
  if (!ctx || !player || !aim) return;
  const hold = fx.aimHeld(input);
  const origin = shotOrigin(player);
  // Arranca un poco adelante del traje y se dibuja a la altura del arma.
  const start = { x: origin.x + aim.x * 8, y: origin.y + aim.y * 6 - LIFT };
  const dots = aimDots(start, aim, { length: hold ? AIM_LENGTH + 18 : AIM_LENGTH });
  for (const dot of dots) {
    const sx = Math.round(dot.x - cam.x);
    const sy = Math.round(dot.y - cam.y);
    if (sx < 0 || sy < 0 || sx >= VIEW_W || sy >= VIEW_H) continue;
    const alpha = aimDotAlpha(dot.t, hold);
    ctx.fillStyle = rgba(dot.t < 0.45 ? '#fff4c0' : '#ecab4c', alpha);
    ctx.fillRect(sx, sy, 1, 1);
  }
}

