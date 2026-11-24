// Palotes de ronda para el HUD y la pantalla de resultado. Dibujo en canvas 1x
// con posiciones enteras (pixel art), igual que antes dentro de ArenaScene.
import { tallyText } from './waves.js';

/**
 * Medidas de un grupo de palotes para una altura dada.
 * `full` grupos de 5 (4 rayas + diagonal) y `rest` rayas sueltas.
 */
export function tallyLayout(n, height) {
  const marks = tallyText(n);
  const stroke = Math.max(1, Math.round(height / 12));
  const gap = stroke * 2 + Math.max(2, Math.round(height / 12));
  const groupGap = Math.round(gap * 0.7);
  const width = marks.full * (4 * gap + groupGap) + marks.rest * gap;
  return { marks, stroke, gap, groupGap, width };
}

/** Dibuja `n` palotes centrados en (cx, cy), con sombra de tinta. */
export function drawTally(ctx, n, cx, cy, height, color, ink) {
  const { marks, stroke, gap, groupGap } = tallyLayout(n, height);
  const top = Math.round(cy - height / 2);
  const bottom = top + height;
  const startX = Math.round(cx - tallyLayout(n, height).width / 2);
  const paint = (fill, dx, dy) => {
    ctx.fillStyle = fill;
    let x = startX;
    for (let g = 0; g < marks.full; g++) {
      for (let s = 0; s < 4; s++) {
        ctx.fillRect(x + s * gap + dx, top + dy, stroke, height);
      }
      for (let i = 0; i <= height; i++) {
        const px = x + Math.round((i / height) * (3 * gap));
        const py = bottom - i;
        ctx.fillRect(px + dx, py + dy, stroke + 1, 1);
      }
      x += 4 * gap + groupGap;
    }
    for (let r = 0; r < marks.rest; r++) {
      ctx.fillRect(x + dx, top + dy, stroke, height);
      x += gap;
    }
  };
  paint(ink, 1, 1);
  paint(color, 0, 0);
}
