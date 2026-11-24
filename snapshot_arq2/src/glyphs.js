// Glifos de botones (pad) y teclas, con la etiqueta corta en la fuente chica.
import { drawText, measureText } from './font.js';
import { OUT, TEXT } from './uiSkin.js';

// Separacion horizontal entre el glifo y su etiqueta (el contorno de 1 px
// se come parte del hueco, por eso 5 y no 3).
export const GLYPH_GAP = 5;

export const ACTIONS = {
  // Dos verbos del mundo con mouse + teclado o joystick (DIRECCION.md,
  // "Controles e interacción"). Mirar no es un botón: es Hacer en lo que solo
  // se mira.
  interact: { pad: 'a', mouse: 'mouse', key: 'mouse', label: 'Hacer' },
  hands: { pad: 'x', mouse: 'mouse_r', key: 'mouse_r', label: 'Manos' },
  bag: { pad: 'y', mouse: 'key_i', key: 'key_i', label: 'Mochila' },
  back: { pad: 'b', mouse: 'key_esc', key: 'key_esc', label: 'Volver' },
  menu: { pad: 'start', mouse: 'key_esc', key: 'key_esc', label: 'Menú' },
  prev: { pad: 'lb', mouse: 'key_1', key: 'key_1', label: 'Anterior' },
  next: { pad: 'rb', mouse: 'key_1', key: 'key_1', label: 'Siguiente' },
  move: { pad: 'stick', mouse: 'key_arrow', key: 'key_arrow', label: 'Mover' },
  item: { pad: 'lb', mouse: 'key_1', key: 'key_1', label: 'Elegir ítem' },
};

export function glyphName(device, action) {
  const entry = ACTIONS[action];
  if (!entry) return null;
  // Con mouse manda su columna (click izq./der., Q, I, Esc). El teclado no
  // tiene glifo propio: acompaña al mouse.
  if (device === 'pad') return entry.pad;
  if (device === 'mouse') return entry.mouse || entry.key;
  return entry.key;
}

export function drawGlyph(ctx, assets, name, x, y) {
  const f = assets.buttonsData.frames[name];
  if (!f) return { w: 0, h: 0 };
  const [sx, sy, w, h] = f;
  ctx.drawImage(assets.buttons.image, sx, sy, w, h, Math.round(x), Math.round(y), w, h);
  return { w, h };
}

export function glyphSize(assets, name) {
  const f = assets.buttonsData.frames[name];
  return f ? { w: f[2], h: f[3] } : { w: 0, h: 0 };
}

/**
 * Dibuja "[glifo] Etiqueta" y devuelve el ancho usado.
 * `t` es el tiempo para el rebote de 1 px.
 */
export function drawPrompt(ctx, assets, device, action, x, y, t = 0, opts = {}) {
  const entry = ACTIONS[action];
  if (!entry) return 0;
  const name = glyphName(device, action);
  const size = glyphSize(assets, name);
  const label = opts.label || entry.label;
  const glyphs = assets.font.glyphs;
  const bob = opts.bob === false ? 0 : Math.round(Math.sin(t * 7));
  let cx = Math.round(x);
  if (opts.right) cx = Math.round(x - size.w - GLYPH_GAP - measureText(glyphs, label));
  drawGlyph(ctx, assets, name, cx, y + bob);
  drawText(ctx, glyphs, cx + size.w + GLYPH_GAP, y + Math.round((size.h - 7) / 2) + bob, label,
    opts.color || TEXT, { outline: opts.outline || OUT });
  return size.w + GLYPH_GAP + measureText(glyphs, label);
}

export function promptWidth(assets, device, action, label = null) {
  const entry = ACTIONS[action];
  if (!entry) return 0;
  const size = glyphSize(assets, glyphName(device, action));
  return size.w + GLYPH_GAP + measureText(assets.font.glyphs, label || entry.label);
}

/** Barra compacta abajo a la derecha: varios [glifo] etiqueta separados. */
/** Posiciones de una tablita de glifos (dibujo y click usan lo mismo). */
export function promptBarLayout(assets, device, items, right, y) {
  const list = (items || []).filter(Boolean).map((item) => ({
    ...item,
    width: promptWidth(assets, device, item.action, item.label),
  }));
  const top = Math.round(y);
  if (!list.length) return { x: Math.round(right), y: top, total: 0, items: [] };
  const content = list.reduce((sum, item) => sum + item.width, 0) + 10 * (list.length - 1);
  const total = content + 10;
  const x = Math.round(right) - total;
  let cx = x + 5;
  for (const item of list) {
    item.x = cx;
    item.y = top - 1;
    cx += item.width + 10;
  }
  return { x, y: top, total, items: list };
}

/** Tablita oscura con "[glifo] etiqueta", como el "Elegir" del titulo. */
export function drawPromptBar(ctx, assets, device, items, right, y, t = 0) {
  const layout = promptBarLayout(assets, device, items, right, y);
  if (!layout.items.length) return layout;
  const bx = layout.x;
  const by = layout.y - 3;
  const bw = layout.total;
  const bh = 15;
  ctx.fillStyle = 'rgba(20, 14, 24, 0.96)';
  for (let j = 0; j < bh; j++) {
    const dy = Math.min(j, bh - 1 - j);
    const inset = dy < 2 ? 2 - dy : 0;
    ctx.fillRect(bx + inset, by + j, bw - inset * 2, 1);
  }
  for (const item of layout.items) {
    drawPrompt(ctx, assets, device, item.action, item.x, item.y, t, {
      label: item.label, bob: false, color: '#fff8e2', outline: '#0a0810',
    });
  }
  return layout;
}
