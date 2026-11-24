import { WorldScene } from './world.js';
import { garage } from '../maps/garage.js';
import { canvasOverlay, VIEW_W, VIEW_H } from '../sprite.js';
import { woodSign, CREAM, SH } from '../titleUi.js';
import { drawText, measureText } from '../font.js';
import { viewport } from '../viewport.js';
import { FLAG } from '../data/flags.js';

// Cartelitos de madera de las estaciones, como la maqueta casa_garaje.png.
// Se dibujan en la capa de UI (arriba de la luz del apagón, como en la
// maqueta), anclados a la posición del mundo de cada NPC, y solo en la base.
export const BASE_LABELS = [
  { text: 'Favalli: el rifle', x: 56, y: 86 },
  { text: 'Elena: el traje', x: 184, y: 140 },
  { text: 'Lucas: la radio', x: 246, y: 58 },
  { text: 'Electrógeno: luz', x: 226, y: 128 },
];

// Rectángulos de los carteles en px de la vista (480x270), sin tocar three ni
// el DOM: los usa el dibujo y los tests de geometría. `measure` mide el texto
// en px de vista a escala 1; el ancla (label.x, label.y) es el centro de
// abajo del cartel.
export function baseLabelRects(labels, measure, cam = { x: 0, y: 0 }, zoom = 1) {
  return labels.map((label) => {
    const w = measure(label.text) + 12;
    const h = 15;
    return {
      x: (label.x - cam.x) * zoom - w / 2,
      y: (label.y - cam.y) * zoom - h,
      w,
      h,
    };
  });
}

export class GarageScene extends WorldScene {
  constructor(game) {
    super(game, garage, {});
    this.labelUi = canvasOverlay(VIEW_W, VIEW_H, 29);
    this.uiScene.add(this.labelUi.mesh);
    this.labels = BASE_LABELS;
    this.labelT = 0;
  }

  update(dt, input) {
    super.update(dt, input);
    this.drawBaseLabels(dt);
  }

  drawBaseLabels(dt) {
    if (!this.game.flags || !this.game.flags[FLAG.BASE]) {
      this.labelUi.mesh.visible = false;
      return;
    }
    this.labelT += dt || 0;
    this.labelUi.mesh.visible = true;
    const { ctx } = this.labelUi;
    const glyphs = this.game.assets.font.glyphs;
    this.labelUi.clear();
    const rects = baseLabelRects(
      this.labels, (text) => measureText(glyphs, text), this.cam, viewport.zoom,
    );
    this.labels.forEach((label, i) => {
      const rect = rects[i];
      const x = Math.round(rect.x);
      const y = Math.round(rect.y);
      if (x + rect.w < 0 || x > VIEW_W || y + rect.h < 0 || y > VIEW_H) return;
      woodSign(ctx, x, y, rect.w, rect.h, {
        seams: 0, nails: false, shadow: false, snow: false,
      });
      drawText(ctx, glyphs, x + 6, y + 5, label.text, CREAM, { shadow: SH });
    });
    this.labelUi.commit();
  }
}
