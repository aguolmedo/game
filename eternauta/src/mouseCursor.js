// Cursor de mouse pixel-art: el guante blanco del pack descargado
// (art/cursores/src_pointer.png) en beige. Un click hunde la mano entera.
// Es un cursor de HARDWARE (CSS `cursor: url(...)`): lo dibuja el sistema, sin
// el cuadro o dos de demora (el "latigo") de un div movido por JavaScript.
// Cada cuadro de cursor.png se reescala a la escala entera del canvas y se
// convierte en PNG; se regenera solo cuando cambia esa escala.
import { VIEW_W } from './sprite.js';

// Los cuadros miden 32x32 y se dibujan a la mitad: 1 px del cursor = medio px
// del juego (ocupa lo mismo en pantalla que un cursor de 16 px).
export const CURSOR_SCALE = 0.5;

// Los navegadores ignoran cursores de mas de 128 px (Chrome) por lado.
const MAX_CURSOR_PX = 128;

const FRAMES = {
  arrow: 'hand',
  hand: 'hand',
  tap: 'hand_tap',         // click: la mano se hunde
  far: 'hand_far',         // en gris (lejos)
  press: 'hand_press',     // click, en gris
};

// Click: la mano queda hundida mientras el boton esta apretado, con un minimo
// para que se vea aunque el click sea muy corto.
export const MIN_PRESS_MS = 120;
const PRESSED = { arrow: 'tap', hand: 'tap', tap: 'tap', far: 'press', press: 'press' };

export class MouseCursor {
  constructor(assets, canvas) {
    this.canvas = canvas;
    this.data = assets.cursorData;
    this.img = assets.cursor && assets.cursor.image;
    this.state = 'arrow';
    this.pending = 'arrow';
    this.down = false;
    this.downAt = 0;
    this.releaseTimer = 0;
    this.visible = false;
    this.scale = 0;
    this.cache = new Map();   // `${frame}@${px}` -> valor CSS de cursor
    this.css = null;
    this.dpr = 0;
    this.hidden = false;      // combate: sin guante, la mira es la referencia

    if (!this.img || !this.data || !this.data.frames) return;
    this.ready = true;
    this.updateScale();

    window.addEventListener('resize', () => this.updateScale());
    canvas.addEventListener('pointerenter', () => { this.visible = true; });
    canvas.addEventListener('pointerleave', () => { this.visible = false; });
    canvas.addEventListener('pointermove', () => { this.visible = true; }, { passive: true });
    window.addEventListener('mousedown', () => this.press());
    window.addEventListener('mouseup', () => this.release());
    window.addEventListener('blur', () => { this.visible = false; this.release(true); });
  }

  setState(state) {
    this.pending = FRAMES[state] ? state : 'arrow';
    if (!this.ready) return;
    this.apply(this.down ? PRESSED[this.pending] : this.pending);
  }

  press() {
    if (!this.ready || !this.visible) return;
    clearTimeout(this.releaseTimer);
    this.down = true;
    this.downAt = performance.now();
    this.apply(PRESSED[this.pending]);
  }

  release(now = false) {
    if (!this.down) return;
    const left = now ? 0 : MIN_PRESS_MS - (performance.now() - this.downAt);
    const up = () => {
      this.down = false;
      if (this.ready) this.apply(this.pending);
    };
    clearTimeout(this.releaseTimer);
    if (left > 0) this.releaseTimer = setTimeout(up, left);
    else up();
  }

  /** Escala entera del canvas (px de pantalla por px del juego). */
  updateScale() {
    const rect = this.canvas.getBoundingClientRect();
    const scale = rect.width ? Math.max(1, Math.round(rect.width / VIEW_W)) : 1;
    const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
    if (scale === this.scale && dpr === this.dpr) return;
    this.scale = scale;
    this.dpr = dpr;
    // Genera ya todos los cuadros: el primer click no espera a armar el PNG.
    for (const name of new Set(Object.values(FRAMES))) this.cursorCss(name);
    this.apply(this.state);
  }

  apply(state) {
    this.state = state;
    const css = this.cursorCss(FRAMES[state]) || this.cursorCss('hand');
    const changed = Boolean(css) && css !== this.css;
    this.css = css || this.css;
    // Oculto (minijuego de combate): nada de guante, ni siquiera al clickear.
    if (this.hidden) {
      this.canvas.style.cursor = 'none';
      return;
    }
    if (!changed) return;
    // Primero el PNG a 1x (lo entiende cualquier navegador); despues, si hay
    // HiDPI, image-set: si el navegador no lo acepta, la asignacion se ignora.
    this.canvas.style.cursor = css.plain;
    if (css.hidpi) this.canvas.style.cursor = css.hidpi;
  }

  /** Oculta el cursor (combate) o vuelve a mostrar el guante guardado. */
  setHidden(on) {
    this.hidden = Boolean(on);
    if (this.hidden) {
      this.canvas.style.cursor = 'none';
      return;
    }
    if (!this.css) {
      if (this.ready) this.apply(this.state);
      return;
    }
    this.canvas.style.cursor = this.css.plain;
    if (this.css.hidpi) this.canvas.style.cursor = this.css.hidpi;
  }

  /** {plain, hidpi}: valores CSS de cursor para un cuadro a la escala actual. */
  cursorCss(name) {
    const frame = this.data.frames[name];
    if (!frame) return null;
    const dpr = this.dpr || 1;
    // px de pantalla (CSS) por px del cuadro; sin pasar el limite del navegador
    let s = this.scale * CURSOR_SCALE;
    s = Math.min(s, MAX_CURSOR_PX / Math.max(frame[2], frame[3]));
    const key = `${name}@${s}@${dpr}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const [fx, fy, fw, fh] = frame;
    const w = Math.max(1, Math.round(fw * s));
    const h = Math.max(1, Math.round(fh * s));
    const png = (k) => {
      const c = document.createElement('canvas');
      c.width = w * k;
      c.height = h * k;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.img, fx, fy, fw, fh, 0, 0, c.width, c.height);
      return c.toDataURL('image/png');
    };

    const hot = (this.data.hotspots && this.data.hotspots[name]) || [0, 0];
    const hx = Math.min(w - 1, Math.round(hot[0] * s));
    const hy = Math.min(h - 1, Math.round(hot[1] * s));
    const css = {
      plain: `url("${png(1)}") ${hx} ${hy}, auto`,
      // En pantallas HiDPI evita que el sistema estire el PNG y quede borroso.
      hidpi: dpr > 1 ? `image-set(url("${png(dpr)}") ${dpr}x) ${hx} ${hy}, auto` : '',
    };
    this.cache.set(key, css);
    return css;
  }

  hide() {
    this.visible = false;
  }
}
