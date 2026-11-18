// Cartel de madera, copo de nieve y fundido de la pantalla de titulo.
// Todo se dibuja en canvas 1x con posiciones enteras (pixel art).
import { OUT } from './uiSkin.js';

export const ICE = '#eefaff';
export const ICE2 = '#c8e2ee';
export const ICE3 = '#9fdcee';
export const CREAM = '#fff8e2';
export const CREAM2 = '#d9ad7c';

export const ROW_H = 16;          // separacion entre opciones
export const ROW_Y = 12;          // primera opcion dentro del cartel
export const SIGN_H = ROW_Y + 4 * ROW_H + 8;   // alto del cartel para 4 filas

/** Rectangulo con esquinas redondeadas relleno por filas (r = pixeles). */
export function roundedRect(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color;
  for (let j = 0; j < h; j++) {
    const dy = Math.min(j, h - 1 - j);
    const inset = dy < r ? r - dy : 0;
    ctx.fillRect(x + inset, y + j, w - inset * 2, 1);
  }
}

/** Fundido de entrada suave: 0 -> 1 en `dur` segundos. */
export function introAlpha(t, dur = 0.8) {
  if (dur <= 0) return 1;
  return Math.min(1, Math.max(0, t / dur));
}

/** Ease-out cubico para el fundido (valor 0..1). */
export function easeOut(t) {
  const k = Math.min(1, Math.max(0, t));
  return 1 - (1 - k) * (1 - k) * (1 - k);
}

/** Nieve acumulada sobre el borde de arriba del cartel. */
function snowCap(ctx, x, y, w) {
  const start = x + 5;
  const end = x + w - 5;
  for (let i = 0; i < end - start; i++) {
    const px = start + i;
    const bump = (i * 7 + 3) % 11 === 0 ? 1 : 0;
    const dip = (i * 5 + 1) % 17 === 0 ? 1 : 0;
    ctx.fillStyle = ICE;
    ctx.fillRect(px, y - 3 - bump + dip, 1, 3 + bump - dip);
    if (bump) ctx.fillRect(px, y - 4, 1, 1);
    if (dip) ctx.fillRect(px, y - 2, 1, 1);
    ctx.fillStyle = ICE2;
    ctx.fillRect(px, y, 1, 1);
  }
  // gotas colgando
  for (const i of [9, 37, 71, 103]) {
    if (i > end - start - 2) continue;
    ctx.fillStyle = ICE2;
    ctx.fillRect(start + i, y, 1, 2);
    ctx.fillStyle = ICE3;
    ctx.fillRect(start + i + 1, y, 1, 1);
  }
  // sombra fria debajo de la nieve
  ctx.fillStyle = 'rgba(26, 20, 38, 0.30)';
  ctx.fillRect(start + 1, y + 1, end - start - 2, 1);
}

/** Tablon de madera con marco redondeado, vetas, clavos y copete de nieve. */
export function woodSign(ctx, x, y, w, h, opts = {}) {
  const nails = opts.nails !== false;
  const snow = opts.snow !== false;
  // sombra proyectada
  roundedRect(ctx, x + 2, y + 3, w, h, 3, 'rgba(8, 8, 18, 0.42)');
  // marco de tres tonos
  roundedRect(ctx, x, y, w, h, 3, OUT);
  roundedRect(ctx, x + 1, y + 1, w - 2, h - 2, 3, '#5a3820');
  roundedRect(ctx, x + 2, y + 2, w - 4, h - 4, 2, '#7a4e2c');
  roundedRect(ctx, x + 4, y + 4, w - 8, h - 8, 1, '#8a5a34');
  // labio de luz arriba-izquierda y sombra abajo-derecha
  ctx.fillStyle = '#a06a3c';
  ctx.fillRect(x + 5, y + 4, w - 10, 1);
  ctx.fillStyle = 'rgba(214, 160, 102, 0.35)';
  ctx.fillRect(x + 5, y + 5, w - 10, 1);
  // vetas y juntas de las tablas (entre las filas de opciones)
  const seams = opts.seams === false ? [] : [y + 10, y + 26, y + 42, y + 58, y + 75];
  for (const sy of seams) {
    if (sy > y + h - 6) continue;
    ctx.fillStyle = 'rgba(74, 42, 26, 0.55)';
    ctx.fillRect(x + 6, sy, w - 12, 1);
  }
  // vetas cortas en el margen, sin tapar el texto
  ctx.fillStyle = 'rgba(74, 42, 26, 0.45)';
  ctx.fillRect(x + 6, y + 31, 1, 6);
  ctx.fillRect(x + 7, y + 34, 1, 3);
  ctx.fillRect(x + w - 7, y + 47, 1, 7);
  ctx.fillRect(x + w - 8, y + 50, 1, 3);
  // clavos en las cuatro esquinas del marco
  if (nails) {
    for (const [nx, ny] of [
      [x + 6, y + 6], [x + w - 7, y + 6], [x + 6, y + h - 7], [x + w - 7, y + h - 7],
    ]) {
      ctx.fillStyle = '#2a2634';
      ctx.fillRect(nx, ny, 2, 2);
      ctx.fillStyle = '#8a94a8';
      ctx.fillRect(nx, ny, 1, 1);
    }
  }
  if (snow) snowCap(ctx, x, y, w);
}

/** Barra calida de la opcion elegida (redondeada y con brillo arriba). */
export function selectBar(ctx, x, y, w, h) {
  roundedRect(ctx, x, y, w, h, 2, 'rgba(255, 207, 110, 0.28)');
  ctx.fillStyle = 'rgba(255, 224, 150, 0.55)';
  ctx.fillRect(x + 2, y, w - 4, 1);
  ctx.fillStyle = 'rgba(122, 60, 24, 0.30)';
  ctx.fillRect(x + 2, y + h - 1, w - 4, 1);
}

const FLAKE = [
  '...#...',
  '.#.#.#.',
  '...#...',
  '#######',
  '...#...',
  '.#.#.#.',
  '...#...',
];

/** Copo de 7x7 en hielo, con una sombra minima para separarlo de la madera. */
export function snowflake(ctx, x, y, bright = 1) {
  for (let j = 0; j < FLAKE.length; j++) {
    for (let i = 0; i < FLAKE[j].length; i++) {
      if (FLAKE[j][i] !== '#') continue;
      ctx.fillStyle = 'rgba(26, 20, 38, 0.45)';
      ctx.fillRect(x + i + 1, y + j + 1, 1, 1);
      ctx.fillStyle = (i + j) % 2 ? ICE2 : ICE;
      ctx.fillRect(x + i, y + j, 1, 1);
    }
  }
  const cx = x + 3;
  const cy = y + 3;
  ctx.fillStyle = bright > 0.6 ? '#ffffff' : ICE3;
  ctx.fillRect(cx, cy, 1, 1);
}

