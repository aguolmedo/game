// Helpers puros de hit-testing para la UI (sin DOM ni Three.js).
// Los menus dibujan en 480x270 y convierten el puntero con game.screenToView.

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

/** Puntero en coordenadas 480x270, solo si el mouse es el dispositivo actual. */
export function mousePoint(game, input) {
  if (!input || input.device !== 'mouse' || !input.pointer) return null;
  if (!game || typeof game.screenToView !== 'function') return null;
  return game.screenToView(input.pointer.x, input.pointer.y);
}
