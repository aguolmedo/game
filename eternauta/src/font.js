// Dibuja la fuente pixel 5x7 exportada desde bocetos/eternauta/scripts/lib.py.
//
// Rendimiento: el HUD hace decenas de drawText por frame (~5900 fillRect). Acá
// se cachean (1) la lista de puntos por texto y (2) un canvas offscreen con el
// texto ya rasterizado, que se pega con un solo ctx.drawImage. En Node (tests
// con ctx falsos, sin DOM) todo cae al camino viejo de fillRect.

const POINT_CACHE_MAX = 400;
const BITMAP_CACHE_MAX = 400;

function glyph(glyphs, ch) {
  return glyphs[ch] || glyphs[' '];
}

export function measureText(glyphs, text, scale = 1, spacing = 1) {
  let width = 0;
  for (const ch of text) {
    const g = glyph(glyphs, ch);
    width += (g[0].length + spacing) * scale;
  }
  return Math.max(0, width - spacing * scale);
}

// Un Map por juego de glifos: el mismo texto con otra fuente da otros puntos.
const pointCaches = new WeakMap();

function pointCacheFor(glyphs) {
  let cache = pointCaches.get(glyphs);
  if (!cache) {
    cache = new Map();
    pointCaches.set(glyphs, cache);
  }
  return cache;
}

function buildTextPoints(glyphs, text, scale, spacing) {
  const points = [];
  let x = 0;
  for (const ch of text) {
    const g = glyph(glyphs, ch);
    for (let j = 0; j < g.length; j++) {
      for (let i = 0; i < g[j].length; i++) {
        if (g[j][i] !== '#') continue;
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            points.push([x + i * scale + sx, j * scale + sy]);
          }
        }
      }
    }
    x += (g[0].length + spacing) * scale;
  }
  return points;
}

export function textPoints(glyphs, text, scale = 1, spacing = 1) {
  const cache = pointCacheFor(glyphs);
  const key = `${text}\u0001${scale}\u0001${spacing}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const points = buildTextPoints(glyphs, text, scale, spacing);
  if (cache.size >= POINT_CACHE_MAX) cache.clear();
  cache.set(key, points);
  return points;
}

// --- Rasterizado de puntos (mismo orden que siempre: outline, sombra, relleno) ---

// Máscara binaria reutilizable del bbox del texto con 1 px de padding.
let mask = new Uint8Array(0);

function drawPoints(ctx, points, ox, oy, color, outline, shadow) {
  if (outline) {
    let maxX = -1;
    let maxY = -1;
    for (const p of points) {
      if (p[0] > maxX) maxX = p[0];
      if (p[1] > maxY) maxY = p[1];
    }
    const mw = maxX + 3;   // -1..maxX+1
    const mh = maxY + 3;   // -1..maxY+1
    const len = mw * mh;
    // Se limpia entera: los vecinos del borde del bbox pueden leer celdas de
    // padding fuera de `len` cuando la máscara quedó grande de un texto previo.
    if (mask.length < len) mask = new Uint8Array(len);
    else mask.fill(0);
    for (const p of points) mask[(p[1] + 1) * mw + (p[0] + 1)] = 1;

    ctx.fillStyle = outline;
    for (let py = -1; py <= maxY + 1; py++) {
      for (let px = -1; px <= maxX + 1; px++) {
        const i = (py + 1) * mw + (px + 1);
        if (mask[i]) continue;
        // Sólo el borde de 1 px: algún vecino (8 direcciones) es glifo.
        if (mask[i - mw - 1] || mask[i - mw] || mask[i - mw + 1]
          || mask[i - 1] || mask[i + 1]
          || mask[i + mw - 1] || mask[i + mw] || mask[i + mw + 1]) {
          ctx.fillRect(ox + px, oy + py, 1, 1);
        }
      }
    }
  }
  if (shadow) {
    ctx.fillStyle = shadow;
    for (const p of points) ctx.fillRect(ox + p[0] + 1, oy + p[1] + 1, 1, 1);
  }
  ctx.fillStyle = color;
  for (const p of points) ctx.fillRect(ox + p[0], oy + p[1], 1, 1);
}

// --- Cache de canvas offscreen por (glyphs, texto, color, opts) ---

const bitmapCaches = new WeakMap();
let canvasOk = false;

function hasCanvas() {
  if (canvasOk) return true;
  if (typeof document === 'undefined') return false;
  try {
    const probe = document.createElement('canvas');
    probe.width = 1;
    probe.height = 1;
    canvasOk = Boolean(probe.getContext && probe.getContext('2d'));
  } catch {
    canvasOk = false;
  }
  return canvasOk;
}

function getBitmap(glyphs, text, color, scale, spacing, outline, shadow) {
  let cache = bitmapCaches.get(glyphs);
  if (!cache) {
    cache = new Map();
    bitmapCaches.set(glyphs, cache);
  }
  const key = `${text}\u0001${scale}\u0001${spacing}\u0001${color}`
    + `\u0001${outline || ''}\u0001${shadow || ''}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const points = textPoints(glyphs, text, scale, spacing);
  let maxY = -1;
  for (const p of points) if (p[1] > maxY) maxY = p[1];
  const w = measureText(glyphs, text, scale, spacing) + 2;
  const h = maxY + 1 + 2;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext('2d');
  if (!c) return null;
  c.imageSmoothingEnabled = false;
  drawPoints(c, points, 1, 1, color, outline, shadow);

  const entry = { canvas, w, h };
  if (cache.size >= BITMAP_CACHE_MAX) cache.clear();
  cache.set(key, entry);
  return entry;
}

export function drawText(ctx, glyphs, x, y, text, color, opts = {}) {
  const { scale = 1, spacing = 1, shadow = null, outline = null } = opts;
  // drawImage a escala 1:1 sólo es idéntico píxel a píxel con destino entero.
  if (Number.isInteger(x) && Number.isInteger(y)
    && typeof ctx.drawImage === 'function' && hasCanvas()) {
    const bmp = getBitmap(glyphs, text, color, scale, spacing, outline, shadow);
    if (bmp) {
      ctx.drawImage(bmp.canvas, x - 1, y - 1);
      return;
    }
  }
  const points = textPoints(glyphs, text, scale, spacing);
  drawPoints(ctx, points, x, y, color, outline, shadow);
}

export function drawCentered(ctx, glyphs, text, y, color, opts = {}) {
  const scale = opts.scale || 1;
  const spacing = opts.spacing || 1;
  const x = Math.round((ctx.canvas.width - measureText(glyphs, text, scale, spacing)) / 2);
  drawText(ctx, glyphs, x, y, text, color, opts);
}

/**
 * Corta un texto en líneas que entren en maxWidth (por palabras).
 *
 * Opciones (todas con el comportamiento histórico por defecto):
 *  - `scale` / `spacing`: los de measureText. El wrap mide con spacing 0 si no
 *    se dice nada (el avance de los glifos), que es lo que evita cortes de más.
 *  - `maxLines`: tope de líneas (Infinity por defecto).
 *  - `truncate`: al llegar a maxLines descarta el resto. Si es false, el resto
 *    va en la última línea (lo usa el taller para su descripción de 2 líneas).
 *  - `firstWidth`: ancho distinto para la primera línea (prompts corridos).
 */
export function wrapText(glyphs, text, maxWidth, options = {}) {
  const opts = typeof options === 'number' ? { scale: options } : options;
  const scale = opts.scale ?? 1;
  const spacing = opts.spacing ?? 0;
  const maxLines = opts.maxLines ?? Infinity;
  const truncate = Boolean(opts.truncate);
  const firstWidth = opts.firstWidth ?? maxWidth;
  const breakLimit = truncate ? Infinity : Math.max(0, maxLines - 1);
  const words = String(text).split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    const limit = lines.length === 0 ? firstWidth : maxWidth;
    if (line && measureText(glyphs, next, scale, spacing) > limit
      && lines.length < breakLimit) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
    if (truncate && lines.length >= maxLines) { line = ''; break; }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length) return truncate ? lines : lines.slice(0, maxLines);
  return Number.isFinite(maxLines) ? [] : [''];
}
