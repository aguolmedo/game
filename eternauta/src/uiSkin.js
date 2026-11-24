// UI dibujada a mano en canvas 1x: madera, papel y slots chicos (estilo Stardew).
import { drawText, measureText, wrapText } from './font.js';

export const OUT = '#1a1426';
export const INK = '#3a2418';
export const INK2 = '#6a4a30';
export const PAR = '#ecd6a4';
export const PAR2 = '#d4b47c';
export const WOOD0 = '#4a2a1a';
export const WOOD1 = '#7a4e2c';
export const WOOD2 = '#a06a3c';
export const AM2 = '#e8963a';
export const AM3 = '#ffcf6e';
export const GOOD = '#2f7a4a';
export const SNOW = '#bdeffa';
export const TEXT = '#fff0c0';
export const WHITE = '#ffffff';
export const WARN = '#ff9a8a';
export const SLOT_DARK = '#2a1a14';
export const SLOT_EDGE = '#8a5a2a';
export const PANEL_PAPER = '#f6f1e4';
export const CAPTION_PAPER = '#efe0a8';
export const DARK_INK = '#16131c';
export const SOFT_SHADOW = 'rgba(8, 8, 18, 0.42)';

export function panel(ctx, x, y, w, h, opts = {}) {
  const alpha = opts.alpha ?? 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  // sombra
  ctx.fillStyle = 'rgba(8, 8, 18, 0.45)';
  ctx.fillRect(x + 2, y + 2, w, h);
  // marco de madera
  ctx.fillStyle = WOOD0;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = WOOD1;
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = WOOD2;
  ctx.fillRect(x + 1, y + 1, w - 2, 1);
  ctx.fillRect(x + 1, y + 1, 1, h - 2);
  ctx.fillStyle = '#5c3820';
  ctx.fillRect(x + 1, y + h - 2, w - 2, 1);
  // papel
  const pad = 4;
  ctx.fillStyle = PAR;
  ctx.fillRect(x + pad, y + pad, w - pad * 2, h - pad * 2);
  ctx.fillStyle = PAR2;
  ctx.fillRect(x + pad, y + h - pad - 1, w - pad * 2, 1);
  // veta apenas marcada
  ctx.fillStyle = 'rgba(122, 78, 44, 0.10)';
  for (let j = y + pad + 9; j < y + h - pad - 2; j += 12) {
    ctx.fillRect(x + pad + 2, j, w - pad * 2 - 4, 1);
  }
  ctx.restore();
}

export function darkPanel(ctx, x, y, w, h, alpha = 0.82) {
  ctx.fillStyle = `rgba(12, 12, 24, ${alpha})`;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255, 207, 110, 0.45)';
  ctx.fillRect(x, y, w, 1);
  ctx.fillStyle = 'rgba(255, 207, 110, 0.18)';
  ctx.fillRect(x, y + h - 1, w, 1);
}

export function slot(ctx, x, y, size, selected, opts = {}) {
  const s = size;
  ctx.fillStyle = selected ? AM3 : OUT;
  ctx.fillRect(x, y, s, s);
  ctx.fillStyle = selected ? '#a86a28' : '#5a3a24';
  ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
  ctx.fillStyle = selected ? SLOT_EDGE : SLOT_DARK;
  ctx.fillRect(x + 2, y + 2, s - 4, s - 4);
  if (opts.bounce) {
    ctx.fillStyle = AM3;
    ctx.fillRect(x + 2, y + s - 2, s - 4, 1);
  }
}

export function tab(ctx, label, glyphs, x, y, w, active) {
  ctx.fillStyle = OUT;
  ctx.fillRect(x, y, w, 15);
  ctx.fillStyle = active ? '#b07a42' : WOOD1;
  ctx.fillRect(x + 1, y + 1, w - 2, 13);
  if (active) {
    ctx.fillStyle = AM3;
    ctx.fillRect(x + 1, y + 1, w - 2, 1);
    ctx.fillStyle = PAR;
    ctx.fillRect(x + 1, y + 13, w - 2, 1);
  }
  const color = active ? TEXT : '#e8c890';
  const tw = measureText(glyphs, label);
  drawText(ctx, glyphs, Math.round(x + (w - tw) / 2), y + 4, label, color, {
    shadow: active ? '#5a3420' : '#2e1a10',
  });
}

export function icon(ctx, assets, id, x, y, size = 16) {
  const raw = assets.itemsData.frames[id];
  if (!raw) return;
  const f = Array.isArray(raw)
    ? { x: raw[0], y: raw[1], w: raw[2], h: raw[3] } : raw;
  ctx.drawImage(assets.items.image, f.x, f.y, f.w, f.h, x, y, size, size);
}

export function itemAt(ctx, assets, frame, x, y, size = 16) {
  if (!frame) return;
  const f = Array.isArray(frame)
    ? { x: frame[0], y: frame[1], w: frame[2], h: frame[3] } : frame;
  ctx.drawImage(assets.items.image, f.x, f.y, f.w, f.h, x, y, size, size);
}

export function count(ctx, glyphs, n, x, y) {
  if (!n || n <= 1) return;
  drawText(ctx, glyphs, x, y, String(n), PAR, { outline: OUT });
}

export function namePlate(ctx, glyphs, name, cx, y, color = PAR) {
  const w = measureText(glyphs, name);
  const x = Math.round(cx - w / 2);
  ctx.fillStyle = OUT;
  ctx.fillRect(x - 4, y - 2, w + 8, 11);
  ctx.fillStyle = '#8a5a30';
  ctx.fillRect(x - 3, y - 1, w + 6, 9);
  ctx.fillStyle = '#b98448';
  ctx.fillRect(x - 3, y - 1, w + 6, 1);
  drawText(ctx, glyphs, x, y, name, color, { shadow: '#2e1a10' });
}

export function arrow(ctx, x, y, color = AM3) {
  ctx.fillStyle = color;
  const rows = [1, 3, 5, 7, 5, 3, 1];
  rows.forEach((w, j) => ctx.fillRect(x, y + j, w, 1));
}

export function dim(ctx, alpha = 0.55) {
  ctx.fillStyle = `rgba(8, 10, 20, ${alpha})`;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

export function wrapLines(glyphs, text, maxWidth, maxLines = 3) {
  return wrapText(glyphs, text, maxWidth, { spacing: 1, maxLines, truncate: true });
}
