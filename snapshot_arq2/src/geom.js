// Geometría pura de rectángulos y puntos (sin DOM ni Three.js).
// Las coordenadas pueden ser de pantalla (480x270) o del mundo; acá no importa.

/** Punto dentro de un rect {x, y, w, h} (borde derecho/abajo exclusivo). */
export function pointInRect(point, rect, pad = 0) {
  if (!point || !rect) return false;
  const x = Number(point.x);
  const y = Number(point.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  const p = Number.isFinite(pad) ? pad : 0;
  return x >= rect.x - p && x < rect.x + rect.w + p
    && y >= rect.y - p && y < rect.y + rect.h + p;
}

/** Indice del primer rect que contiene al punto, o -1. */
export function hitIndex(point, rects) {
  if (!Array.isArray(rects)) return -1;
  for (let i = 0; i < rects.length; i++) {
    if (pointInRect(point, rects[i])) return i;
  }
  return -1;
}

/** Hover: si el puntero no cae en ningun rect, conserva la seleccion actual. */
export function hoverIndex(point, rects, current = 0) {
  const hit = hitIndex(point, rects);
  return hit >= 0 ? hit : current;
}

/** Filas apiladas: cantidad de rects de w x h separados por `gap`. */
export function rowRects({ x = 0, y = 0, w = 0, h = 0, gap = 0, count = 0 } = {}) {
  const rects = [];
  const n = Math.max(0, Math.trunc(count));
  for (let i = 0; i < n; i++) {
    rects.push({ x, y: y + i * (h + gap), w, h });
  }
  return rects;
}

/** Grilla de slots: columnas fijas, separacion horizontal/vertical. */
export function gridRects({
  x = 0, y = 0, w = 0, h = 0, gapX = 0, gapY = 0, columns = 1, count = 0,
} = {}) {
  const rects = [];
  const n = Math.max(0, Math.trunc(count));
  const cols = Math.max(1, Math.trunc(columns));
  for (let i = 0; i < n; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    rects.push({ x: x + col * (w + gapX), y: y + row * (h + gapY), w, h });
  }
  return rects;
}

/** AABB estricto: dos cajas que sólo se tocan en el borde NO se pisan. */
export function overlaps(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** Clamp numerico simple (min/max finitos). */
export function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}
