// Cursor del tile de accion: corchetes que laten sobre el objeto apuntado.
import { canvasOverlay } from './sprite.js';

const SIZE = 112;

export class ActionCursor {
  constructor(scene) {
    this.ui = canvasOverlay(SIZE, SIZE, 0);
    this.ui.mesh.position.set(0, 0, 6);
    this.ui.mesh.visible = false;
    scene.add(this.ui.mesh);
    this.t = 0;
    this.box = null;
  }

  hide() {
    this.ui.mesh.visible = false;
  }

  showAt(box, t) {
    this.t = t;
    this.box = box;
    this.ui.mesh.visible = true;
    this.draw();
  }

  draw() {
    const { ctx } = this.ui;
    const b = this.box;
    if (!b) return;
    this.ui.clear();
    const pulse = 0.65 + 0.35 * (0.5 + 0.5 * Math.sin(this.t * 4));
    const color = `rgba(255, 224, 150, ${pulse.toFixed(2)})`;
    const dark = 'rgba(26, 20, 38, 0.85)';
    // El plano esta centrado en el objeto: dibujamos en coordenadas locales.
    const w = Math.max(10, Math.min(SIZE - 8, Math.round(b.w - 4)));
    const h = Math.max(10, Math.min(SIZE - 8, Math.round(b.h - 4)));
    const left = Math.round((SIZE - w) / 2);
    const top = Math.round((SIZE - h) / 2);
    const len = 5;
    // corchetes en las cuatro esquinas, con 1 px de sombra
    for (const [x, y, dx, dy] of [
      [left, top, 1, 0], [left, top, 0, 1],
      [left + w, top, -1, 0], [left + w, top, 0, 1],
      [left, top + h, 1, 0], [left, top + h, 0, -1],
      [left + w, top + h, -1, 0], [left + w, top + h, 0, -1],
    ]) {
      ctx.fillStyle = dark;
      const px = dx < 0 ? x - len + 1 : x;
      const py = dy < 0 ? y - len + 1 : y;
      ctx.fillRect(px, py, Math.abs(dx) ? len : 1, Math.abs(dy) ? len : 1);
      ctx.fillStyle = color;
      const qx = dx < 0 ? x - len + 1 : x;
      const qy = dy < 0 ? y - len + 1 : y;
      ctx.fillRect(qx, qy, Math.abs(dx) ? len - 1 : 1, Math.abs(dy) ? len - 1 : 1);
    }
    // marco tenue del tile/objeto seleccionado
    ctx.fillStyle = 'rgba(255, 224, 150, 0.30)';
    ctx.fillRect(left, top, w, 1);
    ctx.fillRect(left, top + h, w, 1);
    ctx.fillRect(left, top, 1, h);
    ctx.fillRect(left + w, top, 1, h);
    // puntito superior que marca el blanco
    ctx.fillStyle = color;
    ctx.fillRect(left + Math.round(w / 2), top - 4, 1, 2);
    this.ui.commit();
  }

  /** bbox en pixeles del mundo. */
  setPosition(x, y) {
    this.ui.mesh.position.set(Math.round(x), Math.round(y), 6);
  }
}
