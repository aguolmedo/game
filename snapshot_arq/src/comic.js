// Historieta (diseño §9): cartuchos amarillos, globos con cola y pantalla de viñetas.
// Todo se dibuja en el canvas 480x270. Sin dependencias nuevas.
import { drawText, measureText, wrapText } from './font.js';
import { portraitFor } from './data/portraits.js';
import { drawGlyph, glyphName } from './glyphs.js';
import { clamp } from './geom.js';

export const INK = '#16131c';
export const PAPER = '#f6f1e4';
export const CAPTION = '#efe0a8';
export const PANEL_DARK = '#2a2236';

const VIEW_W = 480;
const VIEW_H = 270;

let GLYPHS = null;

/** La fuente del juego se registra una vez (assets.font.glyphs). */
export function setComicGlyphs(glyphs) {
  if (glyphs) GLYPHS = glyphs;
}

function glyphsOf(assets) {
  if (!assets) return GLYPHS;
  const glyphs = assets.font?.glyphs || assets.glyphs || assets;
  setComicGlyphs(glyphs);
  return glyphs;
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, Math.floor(Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function box(ctx, x, y, w, h, fill, border, r = 0) {
  ctx.fillStyle = fill;
  if (r > 0) {
    roundRect(ctx, x, y, w, h, r);
    ctx.fill();
  } else {
    ctx.fillRect(x, y, w, h);
  }
  ctx.strokeStyle = border;
  ctx.lineWidth = 1;
  if (r > 0) {
    roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, r);
    ctx.stroke();
  } else {
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }
}

/** Cartucho de narración: caja amarilla arriba a la izquierda. */
export class CaptionBox {
  constructor(assets) {
    this.glyphs = glyphsOf(assets);
    this.open = false;
    this.text = '';
    this.lines = [];
    this.t = 0;
    this.x = 10;
    this.y = 8;
    this.width = 300;
  }

  show(text, opts = {}) {
    this.text = String(text || '').toUpperCase();
    this.width = opts.width ?? 300;
    this.x = opts.x ?? 10;
    this.y = opts.y ?? 8;
    this.lines = wrapText(this.glyphs, this.text, this.width - 10);
    this.open = true;
    this.t = 0;
  }

  get widthBox() {
    return Math.max(...this.lines.map((l) => measureText(this.glyphs, l)), 0) + 10;
  }

  get heightBox() {
    return this.lines.length * 9 + 7;
  }

  update(dt, input) {
    if (!this.open) return null;
    this.t += dt;
    if (this.t < 0.2) return null;
    if (input && (input.aPressed || input.bPressed || input.startPressed || input.click)) {
      this.open = false;
      return 'closed';
    }
    return null;
  }

  draw(ctx, device = 'mouse') {
    if (!this.open) return;
    const w = this.widthBox;
    const h = this.heightBox;
    ctx.fillStyle = 'rgba(8, 8, 18, 0.35)';
    ctx.fillRect(this.x + 2, this.y + 2, w, h);
    box(ctx, this.x, this.y, w, h, CAPTION, INK);
    this.lines.forEach((line, i) => {
      drawText(ctx, this.glyphs, this.x + 5, this.y + 4 + i * 9, line, INK);
    });
  }
}

/** Globo blanco con la cola apuntando a la cabeza del que habla (coords de mundo). */
export function drawBalloon(ctx, camX, camY, spec = {}) {
  const glyphs = glyphsOf(spec.glyphs || null);
  if (!glyphs) return null;
  const text = String(spec.text || '').toUpperCase();
  if (!text) return null;
  const maxW = spec.w ?? 120;
  const lines = wrapText(glyphs, text, maxW - 12);
  const bw = Math.max(...lines.map((l) => measureText(glyphs, l))) + 12;
  const bh = lines.length * 9 + 9;

  // La cabeza viene en px de mundo; el globo se dibuja en la vista UI.
  const zoom = spec.zoom || 1;
  const head = spec.head || null;
  const hx = head ? (head.x - camX) * zoom : VIEW_W / 2;
  const hy = head ? (head.y - camY) * zoom : 120;
  const x = Math.round(clamp(hx - bw / 2, 4, VIEW_W - bw - 4));
  const y = Math.round(clamp(hy - bh - 22, 4, VIEW_H - bh - 4));

  // cola: triángulo desde la base del globo hasta la cabeza
  const baseX = clamp(hx, x + 10, x + bw - 10);
  ctx.fillStyle = PAPER;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(baseX - 4, y + bh - 1);
  ctx.lineTo(baseX + 4, y + bh - 1);
  ctx.lineTo(hx, hy);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  box(ctx, x, y, bw, bh, PAPER, INK, 5);
  // tapar la juntura de la cola con el globo
  ctx.fillStyle = PAPER;
  ctx.fillRect(baseX - 3, y + bh - 2, 6, 2);

  lines.forEach((line, i) => {
    const tw = measureText(glyphs, line);
    drawText(ctx, glyphs, Math.round(x + (bw - tw) / 2), y + 5 + i * 9, line, INK);
  });
  return { x, y, w: bw, h: bh };
}

/** Línea corta en el mapa, sin retrato: globo que se cierra con (A). */
export class BalloonLine {
  constructor(assets) {
    this.glyphs = glyphsOf(assets);
    this.open = false;
    this.text = '';
    this.head = { x: 0, y: 0 };
    this.w = 120;
    this.t = 0;
  }

  show(text, head, opts = {}) {
    this.text = String(text || '');
    this.head = { x: head?.x ?? 0, y: head?.y ?? 0 };
    this.w = opts.w ?? 120;
    this.open = true;
    this.t = 0;
  }

  update(dt, input) {
    if (!this.open) return null;
    this.t += dt;
    if (this.t < 0.2) return null;
    if (input && (input.aPressed || input.bPressed || input.click)) {
      this.open = false;
      return 'closed';
    }
    return null;
  }

  draw(ctx, camX, camY, zoom = 1) {
    if (!this.open) return;
    drawBalloon(ctx, camX, camY, {
      text: this.text, head: this.head, w: this.w, glyphs: this.glyphs, zoom,
    });
  }
}

// ------------------------------------------------------------- viñetas

function drawPanelBalloon(ctx, glyphs, text, x, y, w, h) {
  const lines = wrapText(glyphs, String(text).toUpperCase(), w - 18);
  const bw = Math.max(...lines.map((l) => measureText(glyphs, l))) + 12;
  const bh = lines.length * 9 + 9;
  const bx = Math.round(x + (w - bw) / 2);
  const by = Math.round(y + 8);
  // cola corta hacia abajo
  const tailX = bx + Math.round(bw * 0.4);
  ctx.fillStyle = PAPER;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tailX - 4, by + bh - 1);
  ctx.lineTo(tailX + 4, by + bh - 1);
  ctx.lineTo(tailX - 5, by + bh + 9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  box(ctx, bx, by, bw, bh, PAPER, INK, 5);
  ctx.fillStyle = PAPER;
  ctx.fillRect(tailX - 3, by + bh - 2, 6, 2);
  lines.forEach((line, i) => {
    const tw = measureText(glyphs, line);
    drawText(ctx, glyphs, Math.round(bx + (bw - tw) / 2), by + 5 + i * 9, line, INK);
  });
}

function drawMapPlaceholder(ctx, x, y, w, h) {
  ctx.fillStyle = '#241c2e';
  ctx.fillRect(x, y, w, h);
  // vigas del techo
  ctx.fillStyle = '#3a2a24';
  ctx.fillRect(x, y + Math.round(h * 0.18), w, 2);
  ctx.fillRect(x, y + Math.round(h * 0.34), w, 1);
  // ventana con la nieve que brilla
  const wx = x + Math.round(w * 0.6);
  const wy = y + Math.round(h * 0.26);
  const ww = Math.round(w * 0.26);
  const wh = Math.round(h * 0.38);
  ctx.fillStyle = '#141a2e';
  ctx.fillRect(wx, wy, ww, wh);
  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(wx - 2, wy - 2, ww + 4, 2);
  ctx.fillRect(wx - 2, wy, 2, wh);
  ctx.fillRect(wx + ww, wy, 2, wh);
  ctx.fillRect(wx + Math.round(ww / 2), wy, 1, wh);
  ctx.fillRect(wx, wy + Math.round(wh / 2), ww, 1);
  ctx.fillStyle = '#bdeffa';
  for (let i = 0; i < 10; i++) {
    ctx.fillRect(wx + 2 + ((i * 11) % (ww - 4)), wy + 2 + ((i * 7) % (wh - 4)), 1, 1);
  }
  // mesa y silueta
  ctx.fillStyle = '#4a2a1a';
  ctx.fillRect(x + Math.round(w * 0.1), y + Math.round(h * 0.62), Math.round(w * 0.34), 3);
  ctx.fillStyle = '#1a1426';
  ctx.fillRect(x + Math.round(w * 0.22), y + Math.round(h * 0.42), 3, Math.round(h * 0.2));
  ctx.fillRect(x + Math.round(w * 0.2), y + Math.round(h * 0.36), 7, 6);
}

function drawPortraitCell(ctx, assets, id, x, y, w, h) {
  ctx.fillStyle = PANEL_DARK;
  ctx.fillRect(x, y, w, h);
  const data = assets?.portraitsPanelData;
  const image = assets?.portraitsPanel?.image;
  if (!data || !image) return;
  const name = portraitFor(id, 'panel');
  const block = name && data.blocks?.[name];
  if (!block) return;
  const cw = data.cell?.w || 32;
  const ch = data.cell?.h || 32;
  const s = Math.max(1, Math.min(3, Math.floor(Math.min(w / cw, h / ch))));
  const dw = cw * s;
  const dh = ch * s;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, block.x, block.y, cw, ch,
    Math.round(x + (w - dw) / 2), Math.round(y + (h - dh) / 2), dw, dh);
}

/** Pantalla de viñetas: papel, paneles con calles y cartuchos/globos. */
export class ComicOverlay {
  constructor(assets) {
    this.assets = assets;
    this.glyphs = glyphsOf(assets);
    this.open = false;
    this.cells = [];
    this.layout = '3+3';
    this.revealed = 0;
    this.timer = 0;
    this.t = 0;
    this.onDone = null;
  }

  /**
   * spec = { layout:'3+3'|'2+2', panels:[{type, text, portrait, snapshot, color}], onDone }
   */
  play(spec = {}) {
    this.cells = spec.panels || spec.cells || [];
    this.layout = spec.layout || '3+3';
    this.onDone = spec.onDone || null;
    this.revealed = 0;
    this.timer = 0;
    this.t = 0;
    this.open = true;
  }

  get done() {
    return this.revealed >= this.cells.length;
  }

  /** Devuelve 'reveal' | 'done' | null. */
  update(dt, input) {
    if (!this.open) return null;
    this.t += dt;
    this.timer += dt;
    while (this.revealed < this.cells.length && this.timer >= 0.25) {
      this.timer -= 0.25;
      this.revealed += 1;
    }
    if (input && (input.aPressed || input.startPressed || input.click)) {
      if (this.revealed < this.cells.length) {
        this.revealed += 1;
        this.timer = 0;
        return 'reveal';
      }
      this.close();
      return 'done';
    }
    return null;
  }

  close() {
    if (!this.open) return;
    this.open = false;
    const cb = this.onDone;
    this.onDone = null;
    if (cb) cb();
  }

  draw(ctx, device = 'mouse') {
    if (!this.open) return;
    const cols = this.layout.startsWith('3') ? 3 : 2;
    const n = Math.max(1, this.cells.length);
    const rows = Math.min(3, Math.ceil(n / cols));
    const marginX = 12;
    const marginY = 10;
    const gutter = 6;

    // papel y borde de tinta doble
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = INK;
    ctx.fillRect(2, 2, VIEW_W - 4, VIEW_H - 4);
    ctx.fillStyle = PAPER;
    ctx.fillRect(5, 5, VIEW_W - 10, VIEW_H - 10);
    ctx.fillStyle = INK;
    ctx.fillRect(8, 8, VIEW_W - 16, 1);
    ctx.fillRect(8, VIEW_H - 9, VIEW_W - 16, 1);
    ctx.fillRect(8, 8, 1, VIEW_H - 16);
    ctx.fillRect(VIEW_W - 9, 8, 1, VIEW_H - 16);

    const areaW = VIEW_W - marginX * 2;
    const areaH = VIEW_H - marginY * 2;
    const pw = Math.floor((areaW - gutter * (cols - 1)) / cols);
    const ph = Math.floor((areaH - gutter * (rows - 1)) / rows);

    for (let i = 0; i < this.revealed && i < n; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = marginX + col * (pw + gutter);
      const y = marginY + row * (ph + gutter);
      this.drawCell(ctx, this.cells[i] || {}, x, y, pw, ph);
    }

    // indicador: el glifo del boton (A con joystick, mouse con mouse/teclado)
    if (this.done) {
      const name = glyphName(device, 'interact') || 'a';
      const frame = this.assets.buttonsData?.frames?.[name];
      const fw = frame ? frame[2] : 10;
      const fh = frame ? frame[3] : 9;
      const bx = VIEW_W - fw - 6;
      const by = VIEW_H - fh - 5;
      ctx.fillStyle = CAPTION;
      ctx.fillRect(bx - 2, by - 2, fw + 4, fh + 4);
      ctx.fillStyle = INK;
      ctx.fillRect(bx - 2, by - 2, fw + 4, 1);
      ctx.fillRect(bx - 2, by - 2, 1, fh + 4);
      drawGlyph(ctx, this.assets, name, bx, by);
    }
  }

  drawCell(ctx, cell, x, y, w, h) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    const type = cell.type || 'color';
    if (type === 'portrait') {
      drawPortraitCell(ctx, this.assets, cell.portrait || cell.id || 'juan', x, y, w, h);
    } else if (type === 'map' && cell.snapshot && cell.snapshot.width) {
      const snap = cell.snapshot;
      const k = Math.max(w / snap.width, h / snap.height);
      const cw = w / k;
      const ch = h / k;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(snap, (snap.width - cw) / 2, (snap.height - ch) / 2, cw, ch, x, y, w, h);
    } else if (type === 'map') {
      drawMapPlaceholder(ctx, x, y, w, h);
    } else if (type === 'caption') {
      ctx.fillStyle = CAPTION;
      ctx.fillRect(x, y, w, h);
      this.drawPanelCaption(ctx, cell.text, x, y, w, h);
    } else {
      ctx.fillStyle = cell.color || PANEL_DARK;
      ctx.fillRect(x, y, w, h);
    }

    if ((type === 'portrait' || type === 'map' || type === 'color') && cell.caption) {
      this.drawPanelCaption(ctx, cell.caption, x, y, w, h, true);
    }
    if ((type === 'portrait' || type === 'map' || type === 'color') && cell.balloon) {
      drawPanelBalloon(ctx, this.glyphs, cell.balloon, x, y, w, h);
    }
    if (type !== 'caption' && cell.text && !cell.caption && !cell.balloon) {
      this.drawPanelCaption(ctx, cell.text, x, y, w, h, true);
    }

    ctx.restore();
    // borde de tinta doble del panel (sin tapar la viñeta)
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 4.5, y + 4.5, w - 9, h - 9);
  }

  drawPanelCaption(ctx, text, x, y, w, h, bottom = false) {
    if (!text) return;
    const lines = wrapText(this.glyphs, String(text).toUpperCase(), w - 20);
    const ch = lines.length * 9 + 7;
    const cy = bottom ? Math.round(y + h - ch - 6) : Math.round(y + (h - ch) / 2);
    const cx = x + 6;
    const cw = w - 12;
    box(ctx, cx, cy, cw, ch, CAPTION, INK);
    lines.forEach((line, i) => {
      drawText(ctx, this.glyphs, cx + 5, cy + 4 + i * 9, line, INK);
    });
  }
}
