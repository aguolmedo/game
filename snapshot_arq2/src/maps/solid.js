// Sólidos "a partir del dibujo" (fix 1B, hallazgo C1 de analisis_roguelike.md):
// el rect que choca es el mismo que se pinta, con el offset del sprite incluido.
// Es OPT-IN: solo los objetos con `solidPx` usan esto (el barrio). El resto de
// los mapas sigue con su rect de baldosas, intacto para las pruebas de alcance.
//
// `solidPx` es la huella dentro del sprite, en px desde su esquina dibujada, o
// FULL (todo el rect opaco del dibujo). `flipX` espeja la huella (C8).

export const FULL = 'full';
export const TILE = 16;

/** Esquina superior izquierda del dibujo de un objeto (misma cuenta que
 * `WorldMap.layout`: centra el sprite en la baldosa de anclaje y suma offset). */
export function drawOrigin(obj, size) {
  const [w, h] = size;
  const [ox, oy] = obj.offset || [0, 0];
  const anchorX = (obj.x + obj.tw / 2) * TILE;
  const anchorY = (obj.y + obj.th) * TILE;
  const px = Math.round(anchorX + ox);
  const py = Math.round(anchorY - h / 2 + oy);
  return { x: Math.round(px - w / 2), y: Math.round(py - h / 2) };
}

/** Recorta una huella local al bbox opaco del sprite (no pisa transparente). */
function clipToTrim(local, trim) {
  if (!trim) return local;
  const x0 = Math.max(local.x, trim.x);
  const y0 = Math.max(local.y, trim.y);
  const x1 = Math.min(local.x + local.w, trim.x + trim.w);
  const y1 = Math.min(local.y + local.h, trim.y + trim.h);
  if (!(x1 > x0 && y1 > y0)) return local;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/**
 * Rect sólido en px del mapa, o null si el objeto no declara `solidPx`.
 * @param {object} obj objeto del mapa ({x,y,tw,th,offset,flipX,solidPx})
 * @param {[number,number]} size tamaño del frame [w,h]
 * @param {{x,y,w,h}|null} trim bbox opaco del sprite; si falta, se usa el frame
 */
export function solidRectFor(obj, size, trim = null) {
  if (!obj || !obj.solidPx) return null;
  const [w, h] = size;
  const org = drawOrigin(obj, size);
  const local = obj.solidPx === FULL
    ? (trim || { x: 0, y: 0, w, h })
    : clipToTrim(obj.solidPx, trim);
  if (!(local.w > 0 && local.h > 0)) return null;
  const lx = obj.flipX ? w - local.x - local.w : local.x;
  return { x: org.x + lx, y: org.y + local.y, w: local.w, h: local.h };
}

/**
 * Rects sólidos de los objetos visibles que usan `solidPx`.
 * @param {object} map mapa con `objects`
 * @param {(obj) => [number,number]} sizeOf tamaño del sprite de cada objeto
 * @param {(obj) => {x,y,w,h}|null} trimOf bbox opaco (opcional)
 */
export function solidRectsOf(map, sizeOf, trimOf = null) {
  const out = [];
  for (const obj of map.objects || []) {
    if (!obj.solid || obj.hidden || !obj.solidPx) continue;
    const rect = solidRectFor(obj, sizeOf(obj), trimOf ? trimOf(obj) : null);
    if (rect) out.push({ ...rect, id: obj.id, sprite: obj.sprite });
  }
  return out;
}
