// Pantalla de resultado de la arena: cartel de madera con nieve sobre dos
// postes, como en art/concept/menus_madera.py. Canvas 2D 1x de 480x270.
import { drawText, measureText } from '../font.js';
import { dim, OUT } from '../uiSkin.js';
import { drawPromptBar } from '../glyphs.js';
import {
  woodSign, selectBar, flake, carve, roundedRect, introAlpha, easeOut,
  CREAM, CREAM2, SH, AM3, WOOD0, WOOD1, WOOD3, ICE, ICE2,
} from '../titleUi.js';
import { RESULT_OPTIONS } from './results.js';
import { formatPoints } from './points.js';

const VIEW_W = 480;
const VIEW_H = 270;

// Cartel y postes (mismas medidas que la maqueta).
export const RESULT_BOARD = { x: 100, y: 30, w: 280, h: 176 };
const POST_X = [RESULT_BOARD.x + 34, RESULT_BOARD.x + RESULT_BOARD.w - 44];
const OPTION_Y = [RESULT_BOARD.y + 112, RESULT_BOARD.y + 136];

function optionLabel(option) {
  if (typeof option === 'string') return option;
  return (option && option.label) || '';
}

/** Rects clickeables de las dos opciones del resultado (mismas que dibuja draw). */
export function resultOptionRects() {
  return OPTION_Y.map((y) => ({
    x: RESULT_BOARD.x + 26,
    y: y - 5,
    w: RESULT_BOARD.w - 52,
    h: 23,
  }));
}

/** Texto centrado en `cx` con la sombra de la madera. */
function centerText(ctx, glyphs, text, cx, y, color, scale = 1) {
  const w = measureText(glyphs, text, scale);
  drawText(ctx, glyphs, Math.round(cx - w / 2), y, text, color, { scale, shadow: SH });
}

/** Puntos con separador de miles, como en la maqueta (1.250). */
function groupedPoints(n) {
  return formatPoints(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Dos postes de madera clavados en la nieve, de atras del cartel al borde. */
function drawPosts(ctx) {
  const top = RESULT_BOARD.y + 20;
  const h = VIEW_H - top;
  for (const px of POST_X) {
    ctx.fillStyle = OUT;
    ctx.fillRect(px, top, 10, h);
    ctx.fillStyle = WOOD1;
    ctx.fillRect(px + 1, top, 8, h);
    ctx.fillStyle = WOOD3;
    ctx.fillRect(px + 1, top, 2, h);
    ctx.fillStyle = WOOD0;
    ctx.fillRect(px + 7, top, 2, h);
    // montoncitos de nieve en la base
    roundedRect(ctx, px - 6, VIEW_H - 10, 22, 10, 4, ICE2);
    roundedRect(ctx, px - 4, VIEW_H - 12, 18, 6, 3, ICE);
  }
}

export function drawResultScreen(ctx, assets, view, t) {
  const glyphs = assets.font.glyphs;
  const v = view || {};
  const round = Math.max(0, Math.floor(Number(v.round) || 0));
  const kills = Math.max(0, Math.floor(Number(v.kills) || 0));
  const points = Math.max(0, Math.floor(Number(v.points) || 0));
  const best = v.best || { round: 0, points: 0 };
  const bestRound = Math.max(0, Math.floor(Number(best.round) || 0));
  const bestPoints = Math.max(0, Math.floor(Number(best.points) || 0));
  const newBest = !!v.newBest;
  const device = v.device === 'mouse' ? 'mouse' : (v.device === 'pad' ? 'pad' : 'keyboard');
  const fade = Number.isFinite(v.fade) ? v.fade : 1;
  const time = Number.isFinite(t) ? t : 0;
  const sel = Math.max(0, Math.min(RESULT_OPTIONS.length - 1,
    Math.floor(Number(v.sel) || 0)));

  const alpha = easeOut(introAlpha(fade, 0.45));
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(0, Math.round((1 - alpha) * 4));

  // Fondo: la arena se apaga detras del cartel.
  dim(ctx, 0.7);
  drawPosts(ctx);

  const { x: bx, y: by, w: bw, h: bh } = RESULT_BOARD;
  woodSign(ctx, bx, by, bw, bh, { seams: 0, snow: true });

  // Titulo y separador calido.
  centerText(ctx, glyphs, 'FIN DE LA SALIDA', VIEW_W / 2, by + 14, '#ffe8b0', 2);
  ctx.fillStyle = WOOD3;
  ctx.fillRect(bx + 40, by + 34, bw - 80, 1);
  ctx.fillStyle = 'rgba(42, 26, 20, 0.55)';
  ctx.fillRect(bx + 40, by + 35, bw - 80, 1);

  // Tres numeros tallados: Ronda, Bajas, Puntos.
  const cw = 74;
  const gap = 10;
  const cx0 = bx + Math.round((bw - (3 * cw + 2 * gap)) / 2);
  const stats = [
    ['Ronda', String(round)],
    ['Bajas', String(kills)],
    ['Puntos', groupedPoints(points)],
  ];
  stats.forEach(([label, value], i) => {
    const x = cx0 + i * (cw + gap);
    const y = by + 44;
    carve(ctx, x, y, cw, 38);
    centerText(ctx, glyphs, label, x + cw / 2, y + 5, CREAM2);
    centerText(ctx, glyphs, value, x + cw / 2, y + 18, CREAM, 2);
  });

  // Mejor marca (y copito de record).
  const bestText = `Mejor: Ronda ${bestRound} — ${groupedPoints(bestPoints)} pts`;
  const bestW = measureText(glyphs, bestText);
  const bestY = by + 92;
  if (newBest) {
    const badge = '¡Nueva marca!';
    const total = bestW + 14 + measureText(glyphs, badge);
    const sx = Math.round((VIEW_W - total) / 2);
    drawText(ctx, glyphs, sx, bestY, bestText, CREAM2, { shadow: SH });
    flake(ctx, sx + bestW + 6, bestY + 3, AM3);
    drawText(ctx, glyphs, sx + bestW + 14, bestY, badge, AM3, { shadow: SH });
  } else {
    drawText(ctx, glyphs, Math.round((VIEW_W - bestW) / 2), bestY, bestText, CREAM2,
      { shadow: SH });
  }

  // Opciones verticales, como el menu del titulo.
  const labels = RESULT_OPTIONS.map(optionLabel);
  labels.forEach((label, i) => {
    const selected = i === sel;
    const y = OPTION_Y[i];
    const bob = selected ? Math.round(Math.sin(time * 3.1) * 1.2) : 0;
    if (selected) selectBar(ctx, bx + 30, y - 4 + bob, bw - 60, 22);
    const left = Math.round((VIEW_W - measureText(glyphs, label, 2)) / 2);
    drawText(ctx, glyphs, left, y + bob, label,
      selected ? CREAM : CREAM2,
      { scale: 2, shadow: selected ? '#5a2e14' : '#4a2a18' });
    if (selected) flake(ctx, left - 10, y + 7 + bob, CREAM);
  });

  // Glifo de confirmacion debajo del cartel, entre los postes.
  drawPromptBar(ctx, assets, device, [{ action: 'interact', label: 'Elegir' }],
    VIEW_W / 2 + 30, by + bh + 14, time);

  ctx.restore();
}
