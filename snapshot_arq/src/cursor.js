// Cursor del tile de accion: corchetes que laten sobre el objeto apuntado.
import { canvasOverlay } from './sprite.js';

const SIZE = 112;

// Cursor lejos: ámbar fijo y bien visible, distinto del dorado que late cerca.
export const FAR_RGB = '255, 190, 120';
export const FAR_ALPHA = 0.75;
export const FAR_FRAME_ALPHA = 0.18;

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
    this.id = null;
    this.animFrom = null;
    this.animStart = 0;
    this.appearAt = null;
    this.fadeAt = null;
    this.alpha = 1;
    this.drawn = null;
  }

  hide() {
    this.ui.mesh.visible = false;
    this.animFrom = null;
    this.appearAt = null;
    this.fadeAt = null;
  }

  /**
   * opts.mode: 'near' (dorado, por defecto) | 'far' (ambar, mas tenue).
   * opts.grab: agrega un brillo sutil en la esquina superior derecha.
   * opts.id: cambia de objetivo -> los corchetes se deslizan (~80 ms); al
   * aparecer hacen un pop de 3 px hacia adentro (~100 ms).
   */
  showAt(box, t, opts = {}) {
    const wasVisible = this.ui.mesh.visible;
    if (!wasVisible || (opts.id && this.id && opts.id !== this.id)) {
      this.animFrom = this.box || box;
      this.animStart = t;
    }
    if (!wasVisible) this.appearAt = t;
    this.fadeAt = null;
    this.alpha = 1;
    this.t = t;
    this.box = box;
    this.id = opts.id || null;
    this.mode = opts.mode === 'far' ? 'far' : opts.mode === 'faint' ? 'faint' : 'near';
    this.grab = Boolean(opts.grab);
    this.ui.mesh.visible = true;
    this.draw();
  }

  /** Al desaparecer se apaga en ~120 ms, sin saltar. */
  fadeOut(t) {
    if (!this.ui.mesh.visible) return;
    this.t = t;
    if (this.fadeAt == null) this.fadeAt = t;
    const k = (t - this.fadeAt) / 0.12;
    if (k >= 1) {
      this.hide();
      return;
    }
    this.alpha = Math.max(0, 1 - k);
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
    const faint = this.mode === 'faint';
    // Deslizamiento entre objetivos: interpola la caja en ~80 ms.
    const slide = this.animFrom
      ? Math.min(1, Math.max(0, (this.t - this.animStart) / 0.08))
      : 1;
    const from = this.animFrom || b;
    const box = {
      x: from.x + (b.x - from.x) * slide,
      y: from.y + (b.y - from.y) * slide,
      w: from.w + (b.w - from.w) * slide,
      h: from.h + (b.h - from.h) * slide,
    };
    if (slide >= 1) this.animFrom = null;
    // Pop al aparecer: arranca 3 px mas grande y se mete en ~100 ms.
    const popK = this.appearAt == null
      ? 1
      : Math.min(1, Math.max(0, (this.t - this.appearAt) / 0.1));
    const pop = Math.round(3 * (1 - popK));
    ctx.globalAlpha = this.alpha;
    const floor = 0.65;
    const amp = 0.35;
    // Lejos: ámbar fijo (sin latido) y bien legible. Faint: dorado tenue y
    // quieto (decorado que solo se mira). Cerca con acción: dorado que late.
    const pulse = far ? FAR_ALPHA : faint ? 0.6
      : floor + amp * (0.5 + 0.5 * Math.sin(this.t * 4));
    const rgb = far ? FAR_RGB : '255, 224, 150';
    const color = `rgba(${rgb}, ${pulse.toFixed(2)})`;
    const frameAlpha = far ? FAR_FRAME_ALPHA : faint ? 0.16 : 0.30;
    const dark = 'rgba(26, 20, 38, 0.85)';
    // El plano esta centrado en el objeto: dibujamos en coordenadas locales.
    const w = Math.max(10, Math.min(SIZE - 8, Math.round(box.w + pop * 2)));
    const h = Math.max(10, Math.min(SIZE - 8, Math.round(box.h + pop * 2)));
    this.drawn = { x: box.x + box.w / 2, y: box.y + box.h / 2 };
    this.ui.mesh.position.set(Math.round(this.drawn.x), Math.round(this.drawn.y), 6);
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
    ctx.globalAlpha = 1;
    this.ui.commit();
  }

  /** bbox en pixeles del mundo (la posicion final; el dibujo interpola). */
  setPosition(x, y) {
    if (!this.drawn) this.ui.mesh.position.set(Math.round(x), Math.round(y), 6);
  }
}
