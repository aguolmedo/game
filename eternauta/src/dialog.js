// Caja de dialogo con texto a maquina, paginas y eleccion Si/No.
import { drawText, measureText } from './font.js';
import {
  INK, INK2, PAR, PAR2, OUT, AM3, panel, namePlate, wrapLines, dim,
} from './uiSkin.js';
import { drawPrompt, promptWidth } from './glyphs.js';
import { portraitFor } from './data/portraits.js';

// El cuadro ocupa a lo sumo un tercio de la pantalla (270 / 3 = 90 px).
const BOX_W = 464;
const BOX_H = 88;
const PORTRAIT = 64;
const PORTRAIT_X = 10;
const PORTRAIT_Y = 10;
const TEXT_X = 84;
const TEXT_W = BOX_W - TEXT_X - 14;
const LINE_H = 11;

function paginate(lines, perPage = 3) {
  const pages = [];
  for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage));
  return pages.length ? pages : [[]];
}

export class DialogBox {
  constructor(assets) {
    this.assets = assets;
    this.open = false;
    this.entry = null;
    this.pages = [];
    this.page = 0;
    this.shown = 0;
    this.total = 0;
    this.t = 0;
  }

  show(entry) {
    this.entry = entry;
    const glyphs = this.assets.font.glyphs;
    const wrapped = [];
    for (const line of entry.lines || []) wrapped.push(...wrapLines(glyphs, line, TEXT_W, 8));
    this.pages = paginate(wrapped, 3);
    this.page = 0;
    this.open = true;
    this.t = 0;
    this.startPage();
  }

  startPage() {
    const lines = this.pages[this.page] || [];
    this.total = lines.join(' ').length;
    this.shown = 0;
  }

  get typing() {
    return this.shown < this.total;
  }

  /** input = estado de src/input.js. Devuelve 'closed' | 'page' | null. */
  update(dt, input, device = 'keyboard') {
    if (!this.open) return null;
    this.t += dt;
    const lines = this.pages[this.page] || [];
    this.total = lines.join(' ').length;
    if (input.bPressed || input.startPressed) {
      this.close();
      return 'closed';
    }
    if (this.typing) {
      this.shown = Math.min(this.total, this.shown + dt * 52);
      if (input.aPressed) this.shown = this.total;
      return null;
    }
    if (input.aPressed) {
      if (this.page + 1 < this.pages.length) {
        this.page += 1;
        this.startPage();
        return 'page';
      }
      this.close();
      return 'closed';
    }
    return null;
  }

  hide() {
    this.open = false;
    this.entry = null;
    this.pages = [];
    this.page = 0;
    this.shown = 0;
    this.total = 0;
  }

  close() {
    this.open = false;
    const entry = this.entry;
    this.entry = null;
    this.pages = [];
    if (entry && entry.onClose) entry.onClose();
  }

  drawPortrait(ctx, entry, px, py) {
    const kind = entry.portraitKind || 'dlg';
    let image = null;
    let sx = 0;
    let sy = 0;
    let sw = PORTRAIT;
    let sh = PORTRAIT;

    if (typeof entry.portrait === 'number') {
      // compatibilidad: atlas viejo portraits.png (32x32 por retrato)
      image = this.assets.portraits.image;
      sx = entry.portrait * 32;
      sw = 32;
      sh = 32;
    } else if (typeof entry.portrait === 'string') {
      const name = portraitFor(entry.portrait, kind);
      const data = this.assets.portraitsDlgData;
      const block = name && data?.blocks?.[name];
      if (block) {
        image = this.assets.portraitsDlg.image;
        sx = block.x;
        sy = block.y;
        sw = data.cell?.w || PORTRAIT;
        sh = data.cell?.h || PORTRAIT;
      }
    }

    if (image) {
      ctx.fillStyle = '#b98448';
      ctx.fillRect(px - 2, py - 2, PORTRAIT + 4, PORTRAIT + 4);
      ctx.fillStyle = '#2a2238';
      ctx.fillRect(px, py, PORTRAIT, PORTRAIT);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, sx, sy, sw, sh, px, py, PORTRAIT, PORTRAIT);
    } else {
      ctx.fillStyle = '#b98448';
      ctx.fillRect(px - 2, py - 2, PORTRAIT + 4, PORTRAIT + 4);
      ctx.fillStyle = '#2a2238';
      ctx.fillRect(px, py, PORTRAIT, PORTRAIT);
      ctx.drawImage(this.assets.snow.image, px + 23, py + 23, 18, 18);
    }
  }

  draw(ctx, viewW, viewH, device = 'keyboard') {
    if (!this.open) return;
    const glyphs = this.assets.font.glyphs;
    const x = Math.round((viewW - BOX_W) / 2);
    const y = viewH - BOX_H - 8;
    panel(ctx, x, y, BOX_W, BOX_H);

    // retrato 64x64
    const entry = this.entry || {};
    const px = x + PORTRAIT_X;
    const py = y + PORTRAIT_Y;
    this.drawPortrait(ctx, entry, px, py);

    // placa con el nombre
    if (entry.speaker) {
      namePlate(ctx, glyphs, entry.speaker, x + TEXT_X + Math.round(TEXT_W / 2), y + 7);
    }

    // texto a maquina
    const lines = this.pages[this.page] || [];
    let remaining = Math.floor(this.shown);
    lines.forEach((line, i) => {
      if (remaining <= 0) return;
      const text = line.slice(0, remaining);
      remaining -= line.length + 1;
      drawText(ctx, glyphs, x + TEXT_X, y + 20 + i * LINE_H, text, INK, { shadow: PAR2 });
    });

    // indicador de continuar: (A) Seguir / (B) Cerrar
    const hintY = y + BOX_H - 12;
    const backW = promptWidth(this.assets, device, 'back', 'Cerrar');
    drawPrompt(ctx, this.assets, device, 'back', x + BOX_W - 10 - backW, hintY, this.t,
      { label: 'Cerrar', color: PAR, outline: OUT });
    const nextW = promptWidth(this.assets, device, 'interact', this.typing ? 'Seguir' : 'Siguiente');
    drawPrompt(ctx, this.assets, device, 'interact',
      x + BOX_W - 22 - backW - nextW, hintY, this.t,
      { label: this.typing ? 'Seguir' : 'Siguiente', color: PAR, outline: OUT });

    // flechita animada de pagina
    if (!this.typing && this.page + 1 < this.pages.length) {
      ctx.fillStyle = AM3;
      const ax = x + BOX_W - 8;
      const ay = y + 8 + Math.round(Math.sin(this.t * 5) * 1);
      for (let k = 0; k < 3; k++) ctx.fillRect(ax - k, ay + k, 2 + k * 2, 1);
    }
    void INK2;
  }
}

export class ChoiceBox {
  constructor(assets) {
    this.assets = assets;
    this.open = false;
    this.question = '';
    this.options = [];
    this.index = 0;
    this.onPick = null;
    this.t = 0;
  }

  show({ question, options, onPick }) {
    this.open = true;
    this.question = question;
    this.options = options || ['No', 'Si'];
    this.index = 0;
    this.onPick = onPick || null;
    this.t = 0;
  }

  hide() {
    this.open = false;
    this.onPick = null;
  }

  /** Devuelve {index, value} al elegir, 'cancel' con B, o null. */
  update(dt, input) {
    if (!this.open) return null;
    this.t += dt;
    if (input.bPressed || input.startPressed) {
      this.hide();
      return 'cancel';
    }
    const mv = input.menuMove || input.move;
    if (mv.x < -0.4 || mv.y < -0.4) {
      this.index = (this.index + this.options.length - 1) % this.options.length;
    } else if (mv.x > 0.4 || mv.y > 0.4) {
      this.index = (this.index + 1) % this.options.length;
    }
    if (input.aPressed) {
      const value = this.options[this.index];
      const onPick = this.onPick;
      this.hide();
      if (onPick) onPick(value, this.index);
      return { index: this.index, value };
    }
    return null;
  }

  draw(ctx, viewW, viewH, device = 'keyboard') {
    if (!this.open) return;
    const glyphs = this.assets.font.glyphs;
    dim(ctx, 0.45);
    const w = 300;
    const h = 92;
    const x = Math.round((viewW - w) / 2);
    const y = Math.round((viewH - h) / 2) - 16;
    panel(ctx, x, y, w, h);
    const lines = wrapLines(glyphs, this.question, w - 36, 2);
    lines.forEach((line, i) => {
      const tw = measureText(glyphs, line);
      drawText(ctx, glyphs, Math.round(x + (w - tw) / 2), y + 14 + i * 11, line, INK,
        { shadow: PAR2 });
    });
    let total = 0;
    for (const o of this.options) total += measureText(glyphs, o) + 34;
    let ox = Math.round(x + (w - total + 20) / 2);
    this.options.forEach((label, i) => {
      const selected = i === this.index;
      const tw = measureText(glyphs, label);
      if (selected) {
        ctx.fillStyle = 'rgba(232, 150, 58, 0.30)';
        ctx.fillRect(ox - 8, y + 54, tw + 16, 15);
        ctx.fillStyle = AM3;
        const bobX = Math.round(Math.sin(this.t * 6));
        for (let k = 0; k < 3; k++) ctx.fillRect(ox - 7 + bobX - k, y + 59 + k, 2 + k, 1);
      }
      drawText(ctx, glyphs, ox, y + 58, label, selected ? '#7a2e18' : INK2,
        { shadow: selected ? '#ffd890' : PAR2 });
      ox += tw + 34;
    });
    drawPrompt(ctx, this.assets, device, 'interact', x + 18, y + h - 24, this.t,
      { label: 'Elegir', color: PAR, outline: OUT });
    const backW = promptWidth(this.assets, device, 'back', 'Volver');
    drawPrompt(ctx, this.assets, device, 'back', x + w - backW - 18, y + h - 24, this.t,
      { label: 'Volver', color: PAR, outline: OUT });
  }
}
