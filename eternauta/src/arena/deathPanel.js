// Viñeta de muerte: panel de historieta 1x dibujado sobre la arena.
// La ilustración viene de public/assets/death_panel.png (tools/art/death_panel.py);
// acá van el papel, el doble marco de tinta, el cartucho y los copos animados.
import { drawText, measureText } from '../font.js';
import { drawGlyph, glyphSize } from '../glyphs.js';
import { OUT, PAR, darkPanel, dim } from '../uiSkin.js';

export const PANEL = { x: 58, y: 49, w: 364, h: 172, border: 2 };
const PAPER = '#f6f1e4';
const PAPER2 = '#e4d9c0';
const CAPTION = '#efe0a8';
const INK = '#16131c';
const SNOW_HI = 'rgba(238, 250, 255, 0.92)';
const SNOW_GLOW = 'rgba(159, 220, 238, 0.22)';
export const WIPE_TIME = 0.4;
const CAPTION_TEXT = 'Así terminó mi primera salida…';

function framePx(ctx, x, y, w, h, thick, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, thick);
  ctx.fillRect(x, y + h - thick, w, thick);
  ctx.fillRect(x, y, thick, h);
  ctx.fillRect(x + w - thick, y, thick, h);
}

/** Copos que siguen cayendo dentro de la viñeta (datos del JSON). */
function drawFlakes(ctx, flakes, x, y, w, h, t) {
  if (!Array.isArray(flakes)) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  for (const flake of flakes) {
    const [fx, fy, speed, sway, phase, size] = flake;
    const py = (fy + t * speed) % h;
    const px = fx + Math.sin(t * sway + phase) * 3;
    const rx = Math.round(x + px);
    const ry = Math.round(y + py);
    ctx.fillStyle = SNOW_GLOW;
    ctx.fillRect(rx - 1, ry - 1, (size === 2 ? 4 : 3), (size === 2 ? 4 : 3));
    ctx.fillStyle = SNOW_HI;
    if (size === 2) ctx.fillRect(rx, ry, 2, 2);
    else ctx.fillRect(rx, ry, 1, 1);
  }
  // un par de copos grandes con cruz, como en el comic
  for (let i = 0; i < 3; i++) {
    const py = (18 + i * 47 + t * 14) % h;
    const px = 44 + i * 109 + Math.sin(t * 1.3 + i) * 4;
    const rx = Math.round(x + px);
    const ry = Math.round(y + py);
    ctx.fillStyle = 'rgba(238, 250, 255, 0.75)';
    ctx.fillRect(rx - 1, ry, 3, 1);
    ctx.fillRect(rx, ry - 1, 1, 3);
  }
  ctx.restore();
}

function drawCaption(ctx, glyphs, x, y) {
  const w = measureText(glyphs, CAPTION_TEXT) + 18;
  const h = 17;
  ctx.fillStyle = 'rgba(8, 8, 18, 0.42)';
  ctx.fillRect(x + 2, y + 2, w, h);
  ctx.fillStyle = CAPTION;
  ctx.fillRect(x, y, w, h);
  framePx(ctx, x, y, w, h, 1, INK);
  ctx.fillStyle = 'rgba(138, 106, 60, 0.35)';
  ctx.fillRect(x + 1, y + h - 2, w - 2, 1);
  drawText(ctx, glyphs, x + 8, y + 5, CAPTION_TEXT, INK);
}

/**
 * Dibuja la viñeta completa.
 * state = { t, device }: t = segundos desde la muerte (0.4 s de entintado).
 */
export function drawDeathPanel(ctx, assets, state) {
  const { t = 0, device = 'keyboard' } = state || {};
  const p = PANEL;
  dim(ctx, 0.64);

  const progress = Math.min(1, Math.max(0, t / WIPE_TIME));
  const wipe = Math.max(1, Math.ceil(p.w * progress));

  // sombra del panel sobre la calle
  ctx.fillStyle = 'rgba(8, 8, 18, 0.5)';
  ctx.fillRect(p.x + 3, p.y + 4, p.w, p.h);

  ctx.save();
  ctx.beginPath();
  ctx.rect(p.x, p.y, wipe, p.h);
  ctx.clip();

  // papel y doble marco de tinta
  ctx.fillStyle = PAPER;
  ctx.fillRect(p.x, p.y, p.w, p.h);
  framePx(ctx, p.x, p.y, p.w, p.h, 2, INK);
  ctx.fillStyle = PAPER;
  framePx(ctx, p.x + 2, p.y + 2, p.w - 4, p.h - 4, 1, PAPER);
  framePx(ctx, p.x + 3, p.y + 3, p.w - 6, p.h - 6, 1, INK);

  // ilustración centrada en el area interior
  const innerX = p.x + 5;
  const innerY = p.y + 5;
  const innerW = p.w - 10;
  const innerH = p.h - 10;
  const data = assets.deathPanelData || {};
  const size = Array.isArray(data.size) ? data.size : [innerW, innerH];
  const aw = Math.min(innerW, size[0]);
  const ah = Math.min(innerH, size[1]);
  const ax = innerX + Math.floor((innerW - aw) / 2);
  const ay = innerY + Math.floor((innerH - ah) / 2);
  const image = assets.deathPanel && assets.deathPanel.image;
  if (image) {
    ctx.drawImage(image, ax, ay, aw, ah);
    drawFlakes(ctx, data.flakes, ax, ay, aw, ah, t);
  } else {
    ctx.fillStyle = '#121630';
    ctx.fillRect(ax, ay, aw, ah);
  }

  drawCaption(ctx, assets.font.glyphs, ax + 6, ay + 6);
  ctx.restore();

  // filo de tinta del entintado (si todavía se está dibujando)
  if (progress < 1) {
    ctx.fillStyle = INK;
    ctx.fillRect(p.x + wipe - 2, p.y, 2, p.h);
    ctx.fillStyle = 'rgba(246, 241, 228, 0.5)';
    ctx.fillRect(p.x + wipe - 3, p.y + 2, 1, p.h - 4);
  }

  // aviso "(A) Continuar" / tecla según el último dispositivo
  const glyphs = assets.font.glyphs;
  const label = 'Continuar';
  const glyph = device === 'pad' ? 'a' : 'key_space';
  const g = glyphSize(assets, glyph);
  const w = g.w + 6 + measureText(glyphs, label);
  const x = Math.round((ctx.canvas.width - w) / 2);
  const y = p.y + p.h + 6;
  darkPanel(ctx, x - 6, y, w + 12, 15, 0.82);
  const drawn = drawGlyph(ctx, assets, glyph, x, y + 2);
  drawText(ctx, glyphs, x + 3 + drawn.w, y + 4, label, PAR, { outline: OUT });
}
