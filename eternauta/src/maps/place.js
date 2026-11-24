// Colocación de sprites sobre la grilla de 16 px, compartida por los mapas
// escritos a mano (calle, casa, garaje, barrio). El sprite se ubica por su
// esquina inferior izquierda en píxeles, como los generadores de art/concept;
// la escena lo ancla por (centro X, base Y) y `offset` corrige el resto.

const tiles = (px) => Math.max(1, Math.round(px / 16));

/** Devuelve { id, sprite, x, y, tw, th, offset } para el objeto de un mapa. */
export function place(SIZE, id, sprite, left, base, extra = {}) {
  const size = SIZE[sprite];
  if (!size) throw new Error(`sprite sin tamaño: ${sprite}`);
  const [w, h] = size;
  const tw = tiles(w);
  const th = tiles(h);
  const x = Math.round((left + w / 2) / 16 - tw / 2);
  const y = Math.round(base / 16) - th;
  let ox = Math.round(left + w / 2 - (x + tw / 2) * 16);
  const oy = Math.round(base - (y + th) * 16);
  // `alignLeft` clava el borde izquierdo dibujado en `left` (los sprites de
  // ancho impar, como el alambrado de 33, quedaban 1 px corridos).
  const { alignLeft, ...rest } = extra;
  if (alignLeft) {
    for (let i = 0; i < 2; i++) {
      const px = Math.round((x + tw / 2) * 16 + ox);
      const dx = left - Math.round(px - w / 2);
      if (!dx) break;
      ox += dx;
    }
  }
  return { id, sprite, x, y, tw, th, offset: [ox, oy], ...rest };
}

/** Slots en coords locales del sprite, pasados a coords de la caja del objeto. */
export function slotPlacer(SIZE) {
  return (sprite, obj, local, maxItems) => {
    const dy = obj.th * 16 - SIZE[sprite][1];
    return { slots: local.map(([x, y]) => ({ x, y: y + dy })), maxItems };
  };
}

/** put(id, sprite, left, base, extra) cerrado sobre la tabla SIZE de un mapa. */
export function placer(SIZE) {
  return (id, sprite, left, base, extra = {}) => place(SIZE, id, sprite, left, base, extra);
}
