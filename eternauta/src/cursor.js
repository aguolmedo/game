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
    this.mode = 'near';
    this.grab = false;
  }

  hide() {
    this.ui.mesh.visible = false;
  }

  /**
   * opts.mode: 'near' (dorado, por defecto) | 'far' (ambar, mas tenue).
   * opts.grab: agrega un brillo sutil en la esquina superior derecha.
   */
  showAt(box, t, opts = {}) {
    this.t = t;
    this.box = box;
    this.mode = opts.mode === 'far' ? 'far' : 'near';
    this.grab = Boolean(opts.grab);
    this.ui.mesh.visible = true;
    this.draw();
  }

  isVisible() {
    return this.ui.mesh.visible;
  }

  draw() {
    const { ctx } = this.ui;
    const b = this.box;
    if (!b) return;
    this.ui.clear();
    const far = this.mode === 'far';
    const floor = far ? 0.42 : 0.65;
    const amp = far ? 0.26 : 0.35;
    const pulse = floor + amp * (0.5 + 0.5 * Math.sin(this.t * 4));
    const rgb = far ? '255, 190, 120' : '255, 224, 150';
    const color = `rgba(${rgb}, ${pulse.toFixed(2)})`;
    const frameAlpha = far ? 0.18 : 0.30;
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
    ctx.fillStyle = `rgba(${rgb}, ${frameAlpha.toFixed(2)})`;
    ctx.fillRect(left, top, w, 1);
    ctx.fillRect(left, top + h, w, 1);
    ctx.fillRect(left, top, 1, h);
    ctx.fillRect(left + w, top, 1, h);
    // puntito superior que marca el blanco
    ctx.fillStyle = color;
    ctx.fillRect(left + Math.round(w / 2), top - 4, 1, 2);
    // destello tenue de "agarrable" junto a la esquina superior derecha
    if (this.grab) {
      const a = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(this.t * 7));
      ctx.fillStyle = `rgba(255, 245, 210, ${a.toFixed(2)})`;
      const gx = left + w - 3;
      const gy = top + 3;
      ctx.fillRect(gx, gy, 1, 1);
      ctx.fillRect(gx - 1, gy + 1, 1, 1);
      ctx.fillRect(gx + 1, gy - 1, 1, 1);
    }
    this.ui.commit();
  }

  /** bbox en pixeles del mundo. */
  setPosition(x, y) {
    this.ui.mesh.position.set(Math.round(x), Math.round(y), 6);
  }
}
