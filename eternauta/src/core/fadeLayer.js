import { canvasOverlay } from '../sprite.js';
import { drawText, measureText } from '../font.js';
import { AM3, OUT } from '../uiSkin.js';

/**
 * Capa de fundido/apagón/traje en pantalla. Solo toca la textura cuando hay
 * algo que dibujar (una subida 480x270 por frame no es gratis).
 */
export function createFadeLayer(menuScene, game, assets, W, H) {
  const ui = canvasOverlay(W, H, 90);
  menuScene.add(ui.mesh);
  let drawn = false;

  function drawEquip(ctx) {
    const glyphs = assets.font.glyphs;
    const f = assets.itemsData.frames.traje;
    const box = Array.isArray(f) ? { x: f[0], y: f[1], w: f[2], h: f[3] } : f;
    if (box) {
      ctx.drawImage(assets.items.image, box.x, box.y, box.w, box.h, W / 2 - 16, H / 2 - 30, 32, 32);
    }
    const label = game.equipAnim.on ? 'Poniéndose el traje' : 'Sacándose el traje';
    const tw = measureText(glyphs, label);
    drawText(ctx, glyphs, Math.round((W - tw) / 2), H / 2 + 10, label, AM3, { outline: OUT });
  }

  function draw() {
    ui.clear();
    const ctx = ui.ctx;
    if (game.fade > 0) {
      ctx.fillStyle = `rgba(4, 4, 10, ${Math.min(1, game.fade)})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (game.blackoutT >= 0) {
      const t = game.blackoutT;
      const flash = (t >= 0.28 && t < 0.44) || (t >= 0.58 && t < 0.74);
      ctx.fillStyle = `rgba(2, 3, 8, ${flash ? 0.82 : 0.18})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (game.equipAnim) drawEquip(ctx);
    ui.commit();
  }

  return {
    update() {
      const needs = game.fade > 0 || game.blackoutT >= 0 || Boolean(game.equipAnim);
      if (needs) {
        draw();
        drawn = true;
      } else if (drawn) {
        // Se borra una sola vez para que no quede pegado el último contenido.
        ui.clear();
        ui.commit();
        drawn = false;
      }
    },
  };
}
