// Glifos de botones (pad) y teclas, con la etiqueta corta en la fuente chica.
import { drawText, measureText } from './font.js';

// Separacion horizontal entre el glifo y su etiqueta (el contorno de 1 px
// se come parte del hueco, por eso 5 y no 3).
export const GLYPH_GAP = 5;

export const ACTIONS = {
  interact: { pad: 'a', key: 'mouse', label: 'Hablar' },
  use: { pad: 'x', key: 'key_f', label: 'Usar' },
  bag: { pad: 'y', key: 'key_i', label: 'Mochila' },
  // Mirar con mouse: no hay glifo de click derecho en el atlas (mouse_r), así
  // que usa el mismo glifo del mouse con la etiqueta larga "Click der. Mirar".
  look: { pad: 'a', key: 'mouse', label: 'Mirar' },
  back: { pad: 'b', key: 'mouse', label: 'Volver' },
  menu: { pad: 'start', key: 'key_esc', label: 'Menu' },
  prev: { pad: 'lb', key: 'key_q', label: 'Anterior' },
  next: { pad: 'rb', key: 'key_r', label: 'Siguiente' },
  move: { pad: 'stick', key: 'key_arrow', label: 'Mover' },
};

export function glyphName(device, action) {
  const entry = ACTIONS[action];
  if (!entry) return null;
  // Con mouse, los hints que se pueden clickear muestran el mouse.
  if (device === 'mouse'
    && (action === 'interact' || action === 'back' || action === 'use'
      || action === 'bag' || action === 'look')) {
    return 'mouse';
  }
  // El joystick muestra A/B; con teclado, interactuar y volver son click
  // (E y Esc siguen andando como atajos silenciosos).
  return device === 'pad' ? entry.pad : entry.key;
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
    opts.color || '#fff0c0', { outline: opts.outline || '#1a1426' });
  return size.w + GLYPH_GAP + measureText(glyphs, label);
}

export function promptWidth(assets, device, action, label = null) {
  const entry = ACTIONS[action];
  if (!entry) return 0;
  const size = glyphSize(assets, glyphName(device, action));
  return size.w + GLYPH_GAP + measureText(assets.font.glyphs, label || entry.label);
}

/** Barra compacta abajo a la derecha: varios [glifo] etiqueta separados. */
export function drawHintBar(ctx, assets, device, actions, x, y, t = 0) {
  const glyphs = assets.font.glyphs;
  const parts = actions.filter(Boolean);
  let total = 0;
  for (const a of parts) total += promptWidth(assets, device, a) + 10;
  total -= 10;
  const barW = total + 14;
  ctx.fillStyle = 'rgba(12, 12, 24, 0.72)';
  ctx.fillRect(x - barW + 7, y - 4, barW, 17);
  ctx.fillStyle = 'rgba(255, 207, 110, 0.35)';
  ctx.fillRect(x - barW + 7, y - 4, barW, 1);
  let cx = x - barW + 14;
  for (const a of parts) {
    const w = drawPrompt(ctx, assets, device, a, cx, y - 1, t, { bob: false });
    cx += w + 10;
  }
  void glyphs;
}
