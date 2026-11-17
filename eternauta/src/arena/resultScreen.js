// Pantalla de resultado de la arena: tablon de madera con la misma piel que el
// menu del titulo. Canvas 2D 1x de 480x270, todo en pixeles enteros.
import { drawText, drawCentered, measureText, textPoints } from '../font.js';
import { drawGlyph, glyphSize } from '../glyphs.js';
import { dim, darkPanel, OUT, PAR, AM3 } from '../uiSkin.js';
import {
  woodSign, selectBar, snowflake, introAlpha, easeOut,
  CREAM, CREAM2, ROW_H,
} from '../titleUi.js';
import { drawTally, tallyLayout } from './tally.js';
import { RESULT_OPTIONS } from './results.js';
import { formatPoints } from './points.js';

const VIEW_W = 480;

// Tablon: mismo marco/sombra que el cartel del titulo.
const BOARD = { x: 52, y: 28, w: 376, h: 202 };
const LABEL_X = 102;   // texto de las filas de datos
const ICON_X = 80;     // columna de iconos
const VALUE_X = 400;   // borde derecho de los valores

const STARS = [
  '...#...',
  '...#...',
  '#######',
  '.#####.',
  '..###..',
  '.#...#.',
  '#.....#',
];

function optionLabel(option) {
  if (typeof option === 'string') return option;
  return (option && option.label) || '';
}

/** Rects clickeables de las dos opciones del resultado (mismas que dibuja draw). */
export function resultOptionRects(assets) {
  const glyphs = assets.font.glyphs;
  const labels = RESULT_OPTIONS.map(optionLabel);
  const maxW = labels.reduce((m, label) => Math.max(m, measureText(glyphs, label, 2)), 0);
  const barW = Math.max(170, maxW + 36);
  const barX = Math.round((VIEW_W - barW) / 2);
  const optionY = [168, 188];
  return labels.map((_, i) => ({
    x: barX - 4, y: optionY[i] - 3, w: barW + 8, h: ROW_H + 6,
  }));
}

/** Casquillo/medalla de bronce de 9x9 con contorno oscuro y brillo calido. */
function drawCoin(ctx, x, y) {
  // contorno redondeado
  ctx.fillStyle = OUT;
  ctx.fillRect(x + 2, y, 5, 1);
  ctx.fillRect(x + 1, y + 1, 7, 1);
  ctx.fillRect(x, y + 2, 9, 5);
  ctx.fillRect(x + 1, y + 7, 7, 1);
  ctx.fillRect(x + 2, y + 8, 5, 1);
  // cuerpo de bronce
  ctx.fillStyle = '#c8a24a';
  ctx.fillRect(x + 2, y + 1, 5, 1);
  ctx.fillRect(x + 1, y + 2, 7, 5);
  ctx.fillRect(x + 2, y + 7, 5, 1);
  // base y sombra
  ctx.fillStyle = '#8a5a2a';
  ctx.fillRect(x + 7, y + 3, 1, 4);
  ctx.fillRect(x + 3, y + 6, 4, 1);
  ctx.fillRect(x + 4, y + 4, 1, 1);
  // brillo arriba-izquierda
  ctx.fillStyle = '#f0d488';
  ctx.fillRect(x + 2, y + 2, 2, 1);
  ctx.fillRect(x + 2, y + 3, 1, 1);
}

/** Estrella de 7x7: sombra oscura desplazada y relleno ambar. */
function drawStar(ctx, x, y) {
  for (let j = 0; j < STARS.length; j++) {
    for (let i = 0; i < STARS[j].length; i++) {
      if (STARS[j][i] !== '#') continue;
      ctx.fillStyle = OUT;
      ctx.fillRect(x + i + 1, y + j + 1, 1, 1);
    }
  }
  for (let j = 0; j < STARS.length; j++) {
    for (let i = 0; i < STARS[j].length; i++) {
      if (STARS[j][i] !== '#') continue;
      ctx.fillStyle = AM3;
      ctx.fillRect(x + i, y + j, 1, 1);
    }
  }
  ctx.fillStyle = '#ffe8b0';
  ctx.fillRect(x + 3, y + 3, 1, 1);
}

/** Texto inclinado: cada pixel se corre a la izquierda segun su altura. */
function drawItalic(ctx, glyphs, text, x, y, color) {
  const points = textPoints(glyphs, text, 1, 1);
  ctx.fillStyle = OUT;
  for (const [px, py] of points) {
    ctx.fillRect(x + px - Math.floor(py / 2) + 1, y + py + 1, 1, 1);
  }
  ctx.fillStyle = color;
  for (const [px, py] of points) {
    ctx.fillRect(x + px - Math.floor(py / 2), y + py, 1, 1);
  }
}

/** Icono de cascarudo 20x16 dibujado a 16x13. */
function drawBug(ctx, assets, x, y) {
  const raw = assets.cascarudosData.frames['cascarudo:right:0'];
  if (!raw) return;
  const f = Array.isArray(raw)
    ? { x: raw[0], y: raw[1], w: raw[2], h: raw[3] } : raw;
  ctx.drawImage(assets.cascarudos.image, f.x, f.y, f.w, f.h, x, y, 16, 13);
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
  woodSign(ctx, BOARD.x, BOARD.y, BOARD.w, BOARD.h, { seams: false });

  // Tablones y veta: el cartel del titulo es chico, este tablon es grande y
  // sin juntas la madera quedaria plana.
  const ix = BOARD.x + 5;
  const iw = BOARD.w - 10;
  ctx.fillStyle = 'rgba(42, 24, 14, 0.10)';
  ctx.fillRect(ix, BOARD.y + 6, iw, BOARD.h - 13);
  for (let y = BOARD.y + 18; y < BOARD.y + BOARD.h - 8; y += 22) {
    ctx.fillStyle = 'rgba(58, 32, 18, 0.32)';
    ctx.fillRect(ix, y, iw, 1);
    ctx.fillStyle = 'rgba(214, 160, 102, 0.10)';
    ctx.fillRect(ix, y + 1, iw, 1);
  }
  ctx.fillStyle = 'rgba(58, 32, 18, 0.22)';
  for (const [gx, gy, gh] of [
    [ix + 4, BOARD.y + 30, 10], [BOARD.x + BOARD.w - 9, BOARD.y + 70, 14],
    [ix + 3, BOARD.y + 122, 8], [BOARD.x + BOARD.w - 10, BOARD.y + 152, 10],
  ]) ctx.fillRect(gx, gy, 1, gh);

  // Titulo y separador calido.
  drawCentered(ctx, glyphs, 'FIN DE LA SALIDA', 38, '#ffe8b0',
    { scale: 2, shadow: '#3a1c0c' });
  ctx.fillStyle = '#a06a3c';
  ctx.fillRect(120, 58, 240, 1);
  ctx.fillStyle = 'rgba(42, 26, 20, 0.55)';
  ctx.fillRect(120, 59, 240, 1);

  // Fila 1: la ronda se cuenta en palotes, como en el HUD.
  drawText(ctx, glyphs, LABEL_X, 74, 'Ronda alcanzada', PAR, { shadow: '#3a1c0c' });
  const tally = tallyLayout(round, 14);
  drawTally(ctx, round, VALUE_X - Math.round(tally.width / 2), 80, 14, PAR, '#2a1a20');

  // Fila 2: bajas con icono de cascarudo.
  drawBug(ctx, assets, ICON_X, 91);
  drawText(ctx, glyphs, LABEL_X, 94, 'Bajas', PAR, { shadow: '#3a1c0c' });
  const killsText = String(kills);
  drawText(ctx, glyphs, VALUE_X - measureText(glyphs, killsText), 94, killsText, CREAM,
    { shadow: '#3a1c0c' });

  // Fila 3: puntos con casquillo de bronce.
  drawCoin(ctx, ICON_X + 4, 113);
  drawText(ctx, glyphs, LABEL_X, 114, 'Puntos', PAR, { shadow: '#3a1c0c' });
  const pointsText = formatPoints(points);
  drawText(ctx, glyphs, VALUE_X - measureText(glyphs, pointsText), 114, pointsText, CREAM,
    { shadow: '#3a1c0c' });

  // Mejor marca (y estrella de record con rebote).
  const bestText = `Mejor: Ronda ${bestRound} — ${formatPoints(bestPoints)} pts`;
  const bestW = measureText(glyphs, bestText);
  const bestY = 136;
  if (newBest) {
    const badgeText = '¡NUEVA MARCA!';
    const badgeW = 11 + measureText(glyphs, badgeText);
    const startX = Math.round((VIEW_W - (bestW + 14 + badgeW)) / 2);
    drawText(ctx, glyphs, startX, bestY, bestText, CREAM2, { shadow: '#3a1c0c' });
    const bob = Math.round(-Math.abs(Math.sin(time * 7)) * 2);
    const starX = startX + bestW + 14;
    drawStar(ctx, starX, bestY + bob);
    drawText(ctx, glyphs, starX + 11, bestY + bob, badgeText, AM3, { outline: OUT });
  } else {
    drawText(ctx, glyphs, Math.round((VIEW_W - bestW) / 2), bestY, bestText, CREAM2,
      { shadow: '#3a1c0c' });
  }

  // Cierre de serial, inclinado.
  const cont = 'Continuará…';
  const contW = measureText(glyphs, cont);
  drawItalic(ctx, glyphs, cont, Math.round((VIEW_W - contW) / 2) + 2, 150, CREAM2);

  // Opciones verticales, como el menu del titulo.
  const labels = RESULT_OPTIONS.map(optionLabel);
  const maxW = labels.reduce((m, label) => Math.max(m, measureText(glyphs, label, 2)), 0);
  const barW = Math.max(170, maxW + 36);
  const barX = Math.round((VIEW_W - barW) / 2);
  const optionY = [168, 188];
  labels.forEach((label, i) => {
    const selected = i === sel;
    const y = optionY[i] === undefined ? optionY[0] + i * 20 : optionY[i];
    const bob = selected ? Math.round(Math.sin(time * 3.1) * 1.2) : 0;
    if (selected) selectBar(ctx, barX, y - 1 + bob, barW, ROW_H);
    const left = Math.round((VIEW_W - measureText(glyphs, label, 2)) / 2);
    drawText(ctx, glyphs, left, y + bob, label,
      selected ? CREAM : CREAM2,
      { scale: 2, shadow: selected ? '#5a2e14' : '#4a2a18' });
    if (selected) snowflake(ctx, left - 11, y + 3 + bob, 1);
  });

  // Atajo de confirmacion debajo del tablon.
  const selectedLabel = labels[sel] || '';
  const hint = device === 'pad' ? 'a' : (device === 'mouse' ? 'mouse' : 'key_space');
  const size = glyphSize(assets, hint);
  const promptW = size.w + 4 + measureText(glyphs, selectedLabel);
  const px = Math.round((VIEW_W - promptW) / 2);
  darkPanel(ctx, px - 7, 232, promptW + 14, 15);
  drawGlyph(ctx, assets, hint, px, 236 + Math.round((7 - size.h) / 2));
  drawText(ctx, glyphs, px + size.w + 4, 236, selectedLabel, PAR, { outline: OUT });

  ctx.restore();
}
