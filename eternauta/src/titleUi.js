// Cartel de madera, copo de nieve y fundido de la pantalla de titulo.
// Todo se dibuja en canvas 1x con posiciones enteras (pixel art).
// La madera que coincide con la paleta de uiSkin se toma de ahí; la del
// cartel (más clara) sigue en este archivo.
import { OUT, WOOD1, WOOD2 as WOOD_UI2, AM3 } from './uiSkin.js';

export { OUT, WOOD1, AM3 };

export const ICE = '#eefaff';
export const ICE2 = '#c8e2ee';
export const ICE3 = '#9fdcee';
export const CREAM = '#fff8e2';
export const CREAM2 = '#d9ad7c';

// Paleta del cartel (la misma que art/concept/menus_madera.py).
export const WOOD0 = '#5a3820';
export const WOOD2 = '#8a5a34';
export const WOOD3 = WOOD_UI2; // mismo tono que uiSkin.WOOD2
export const FACE_HI = '#9a663a';
export const SEAM = 'rgba(74, 42, 26, 0.55)';
export const SEAM_HI = 'rgba(214, 160, 102, 0.30)';
export const NAIL = '#2a2634';
export const NAIL_HI = '#8a94a8';
export const SH = '#3a1c0c';
export const FALTA = '#f09a7a';
export const OKC = '#b8d890';
export const CARVE = '#5e3a22';
export const CARVE_D = '#3e2416';

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

/** Ensancha el cartel (sin mover su centro) para que el texto mas ancho quede
 *  con `margin` px de aire a cada lado. Devuelve un cartel nuevo, no muta. */
export function fitSignWidth(sign, widest, margin = 12) {
  const w = Math.max(sign.w, widest + margin * 2);
  return { ...sign, w, x: Math.round(sign.x + sign.w / 2 - w / 2) };
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

/** Filas de juntas: numero = cada `seams` px; false/0 = sin juntas;
 *  sin definir = las juntas del cartel del titulo (no cambia su dibujo). */
function seamRows(y, h, seams) {
  if (seams === false || seams === 0) return [];
  if (typeof seams === 'number' && seams > 0) {
    const rows = [];
    for (let sy = y + 4 + seams; sy < y + h - 6; sy += seams) rows.push(sy);
    return rows;
  }
  if (Array.isArray(seams)) return seams;
  return [y + 10, y + 26, y + 42, y + 58, y + 75];
}

/** Tablon de madera con marco redondeado, vetas, clavos y copete de nieve. */
export function woodSign(ctx, x, y, w, h, opts = {}) {
  const nails = opts.nails !== false;
  const snow = opts.snow !== false;
  const shadow = opts.shadow !== false;
  const face = opts.face || WOOD2;
  const seamList = seamRows(y, h, opts.seams);
  const seamHi = typeof opts.seams === 'number' && opts.seams > 0;
  // sombra proyectada
  if (shadow) roundedRect(ctx, x + 2, y + 3, w, h, 3, 'rgba(8, 8, 18, 0.42)');
  // marco de tres tonos
  roundedRect(ctx, x, y, w, h, 3, OUT);
  roundedRect(ctx, x + 1, y + 1, w - 2, h - 2, 3, WOOD0);
  roundedRect(ctx, x + 2, y + 2, w - 4, h - 4, 2, WOOD1);
  roundedRect(ctx, x + 4, y + 4, w - 8, h - 8, 1, face);
  // labio de luz arriba-izquierda y sombra abajo-derecha
  ctx.fillStyle = WOOD3;
  ctx.fillRect(x + 5, y + 4, w - 10, 1);
  ctx.fillStyle = 'rgba(214, 160, 102, 0.35)';
  ctx.fillRect(x + 5, y + 5, w - 10, 1);
  // juntas de las tablas
  for (const sy of seamList) {
    if (sy > y + h - 6) continue;
    ctx.fillStyle = SEAM;
    ctx.fillRect(x + 6, sy, w - 12, 1);
    if (seamHi) {
      ctx.fillStyle = SEAM_HI;
      ctx.fillRect(x + 6, sy + 1, w - 12, 1);
    }
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
      ctx.fillStyle = NAIL;
      ctx.fillRect(nx, ny, 2, 2);
      ctx.fillStyle = NAIL_HI;
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

/** Hueco tallado en la madera: sombra arriba-izquierda, labio de luz abajo-derecha. */
export function carve(ctx, x, y, w, h, fill = CARVE) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = CARVE_D;
  ctx.fillRect(x, y, w, 1);
  ctx.fillRect(x, y, 1, h);
  ctx.fillStyle = 'rgba(30, 16, 10, 0.27)';
  ctx.fillRect(x + 1, y + 1, w - 1, 1);
  ctx.fillStyle = WOOD3;
  ctx.fillRect(x, y + h, w + 1, 1);
  ctx.fillRect(x + w, y, 1, h);
}

/** Marco ambar del casillero elegido, con las cuatro esquinas marcadas. */
export function amberFrame(ctx, x, y, w, h) {
  ctx.fillStyle = AM3;
  ctx.fillRect(x - 1, y - 1, w + 2, 1);
  ctx.fillRect(x - 1, y + h, w + 2, 1);
  ctx.fillRect(x - 1, y - 1, 1, h + 2);
  ctx.fillRect(x + w, y - 1, 1, h + 2);
  for (const [cx, cy] of [
    [x - 2, y - 2], [x + w + 1, y - 2], [x - 2, y + h + 1], [x + w + 1, y + h + 1],
  ]) ctx.fillRect(cx, cy, 1, 1);
}

/** Copito chico de la maqueta (cruz con diagonales de 2 px). */
export function flake(ctx, x, y, color = CREAM) {
  ctx.fillStyle = color;
  for (const [dx, dy] of [
    [0, 0], [-1, 0], [1, 0], [0, -1], [0, 1], [-2, -2], [2, -2], [-2, 2], [2, 2],
  ]) ctx.fillRect(x + dx, y + dy, 1, 1);
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

