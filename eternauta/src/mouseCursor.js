// Cursor de mouse pixel-art (flecha / manito / apretado / lejos).
// Es un div con la hoja cursor.png; escala con el juego y se oculta fuera del
// canvas. El cursor nativo se apaga solo cuando la hoja cargo bien.
import { VIEW_W } from './sprite.js';

const FRAMES = {
  arrow: 'arrow',
  hand: 'hand',
  press: 'hand_press',
  far: 'hand_far',
};

export class MouseCursor {
  constructor(assets, canvas) {
    this.canvas = canvas;
    this.data = assets.cursorData;
    this.src = assets.cursor && assets.cursor.image && assets.cursor.image.src;
    this.state = 'arrow';
    this.pending = 'arrow';
    this.lockUntil = 0;
    this.visible = false;
    this.scale = 1;
    this.el = document.createElement('div');
    this.el.className = 'pixel-cursor';
    document.body.appendChild(this.el);

    if (!this.src || !this.data || !this.data.frames) return;
    this.el.style.backgroundImage = `url("${this.src}")`;
    this.el.style.backgroundRepeat = 'no-repeat';
    canvas.classList.add('cursor-hidden');
    this.ready = true;
    this.apply('arrow');

    window.addEventListener('pointermove', (e) => this.move(e.clientX, e.clientY), { passive: true });
    window.addEventListener('mousedown', () => this.press());
    window.addEventListener('blur', () => this.hide());
    window.addEventListener('mouseout', (e) => { if (!e.relatedTarget) this.hide(); });
  }

  setState(state) {
    this.pending = FRAMES[state] ? state : 'arrow';
    if (!this.ready || performance.now() < this.lockUntil) return;
    this.apply(this.pending);
  }

  press() {
    if (!this.ready || !this.visible) return;
    this.apply('press');
    this.lockUntil = performance.now() + 100;
    setTimeout(() => {
      if (!this.ready) return;
      this.apply(this.pending);
    }, 100);
  }

  apply(state) {
    this.state = state;
    const frame = this.data.frames[FRAMES[state]] || this.data.frames.arrow;
    const hot = (this.data.hotspots && this.data.hotspots[FRAMES[state]]) || [0, 0];
    if (!frame) return;
    this.frame = frame;
    this.hot = hot;
    this.layout();
  }

  layout() {
    const f = this.frame;
    if (!f) return;
    const s = this.scale;
    this.el.style.width = `${f[2] * s}px`;
    this.el.style.height = `${f[3] * s}px`;
    this.el.style.backgroundSize = `${this.data.w * s}px ${this.data.h * s}px`;
    this.el.style.backgroundPosition = `${-f[0] * s}px ${-f[1] * s}px`;
  }

  move(clientX, clientY) {
    if (!this.ready) return;
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height
      || clientX < rect.left || clientX >= rect.right
      || clientY < rect.top || clientY >= rect.bottom) {
      this.hide();
      return;
    }
    const scale = Math.max(1, Math.round(rect.width / VIEW_W));
    this.scale = scale;
    const hotX = (this.hot ? this.hot[0] : 0) * scale;
    const hotY = (this.hot ? this.hot[1] : 0) * scale;
    const left = rect.left + Math.round((clientX - rect.left - hotX) / scale) * scale;
    const top = rect.top + Math.round((clientY - rect.top - hotY) / scale) * scale;
    this.el.style.transform = `translate(${left}px, ${top}px)`;
    this.el.style.display = 'block';
    this.visible = true;
    this.layout();
  }

  hide() {
    this.visible = false;
    this.el.style.display = 'none';
  }
}
