// Helpers compartidos por las pantallas de menú (título, pausa y cofre).
import { drawText, measureText } from '../font.js';
import { canvasOverlay } from '../sprite.js';
import { drawPrompt } from '../glyphs.js';
import { pointInRect } from '../geom.js';
import { SH } from '../titleUi.js';

export const VIEW_W = 480;
export const VIEW_H = 270;

// ------------------------------------------------- helpers de mouse y layout
const PROMPT_PAD_X = 4;
const PROMPT_PAD_Y = 5;

/** Punto del click en coords de vista (480x270), solo el frame del mousedown. */
export function clickPoint(game, input) {
  if (!input || !input.click || !game || typeof game.screenToView !== 'function') return null;
  return game.screenToView(input.click.x, input.click.y);
}

/** Manito sobre algo clickeable, flecha si no (puntero fuera del canvas incluido). */
export function setHand(game, on) {
  const cursor = game && game.mouseCursor;
  if (cursor && typeof cursor.setState === 'function') cursor.setState(on ? 'hand' : 'arrow');
}

/** Caja clickeable de un prompt dibujado en (x, y) con ancho `width`. */
export function promptBox(x, y, width) {
  return {
    x: Math.round(x) - PROMPT_PAD_X,
    y: Math.round(y) - PROMPT_PAD_Y,
    w: width + PROMPT_PAD_X * 2,
    h: 13 + PROMPT_PAD_Y * 2,
  };
}

/** Dibuja el prompt adentro de su caja, asi dibujo y click no se separan. */
export function drawBoxedPrompt(ctx, assets, device, action, box, t, opts = {}) {
  return drawPrompt(ctx, assets, device, action, box.x + PROMPT_PAD_X,
    box.y + PROMPT_PAD_Y, t, opts);
}

/** Hit-test de slots con 1 px de tolerancia (el slot elegido rebota 1 px). */
export function hitSlot(point, rects) {
  for (let i = 0; i < rects.length; i++) {
    if (pointInRect(point, rects[i], 1)) return i;
  }
  return -1;
}

export function uiCanvas(scene, z) {
  const ui = canvasOverlay(VIEW_W, VIEW_H, z);
  ui.mesh.visible = false;
  scene.add(ui.mesh);
  return ui;
}

export function place(ui, camX, camY) {
  ui.mesh.position.set(camX + VIEW_W / 2, camY + VIEW_H / 2, ui.mesh.position.z);
}

/** Texto centrado en `cx`, con la sombra de la madera. */
export function centerText(ctx, glyphs, text, cx, y, color, scale = 1) {
  const w = measureText(glyphs, text, scale);
  drawText(ctx, glyphs, Math.round(cx - w / 2), y, text, color, { scale, shadow: SH });
}
