// Caja de dialogo con texto a maquina, paginas y eleccion Si/No.
import { drawText, measureText } from './font.js';
import {
  INK, INK2, PAR, PAR2, OUT, AM3, panel, namePlate, wrapLines, dim,
} from './uiSkin.js';
import { drawPrompt, promptWidth } from './glyphs.js';
import { portraitFor, spriteHeadFor } from './data/portraits.js';
import { pointInRect } from './uiHit.js';

// El cuadro ocupa a lo sumo un tercio de la pantalla (270 / 3 = 90 px).
const BOX_W = 464;
const BOX_H = 88;
const PORTRAIT = 64;
const PORTRAIT_X = 10;
const PORTRAIT_Y = 10;
const TEXT_X = 84;
const TEXT_W = BOX_W - TEXT_X - 14;
const LINE_H = 11;
const CHOICE_W = 300;
const CHOICE_H = 92;

// Retrato recortado de chars2.png: 16 px de ancho x 21 de alto (cara + torso).
const SPRITE_W = 16;
const SPRITE_H = 21;
const SPRITE_BG = '#2a2236';
const PANEL = 32; // retrato cuadrado de las viñetas

// Estos ids siguen usando portraits_dlg (el traje se lee mejor ahí).
const SUIT_DLG = new Set(['juan_suit', 'juan_rifle', 'juan_suit_rifle']);

// Fila del frame "quieto mirando abajo" por bloque: primera fila opaca de la celda.
const headRowCache = new Map();

function spriteReady(assets) {
  return typeof document !== 'undefined'
    && typeof ImageData !== 'undefined'
    && Boolean(assets?.chars2?.image)
    && Boolean(assets?.chars2Data?.blocks);
}

/**
 * Primera fila opaca (0..h-1) del frame quieto-abajo, o null si no se puede
 * leer el canvas. Los aciertos se cachean por bloque.
 */
function firstOpaqueRow(assets, blockId) {
  if (headRowCache.has(blockId)) return headRowCache.get(blockId);
  const data = assets.chars2Data;
  const block = data.blocks[blockId];
  const w = data.cell?.w || SPRITE_W;
  const h = data.cell?.h || 32;
  const restCol = data.idle?.[0] ?? 6;
  let row;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const off = canvas.getContext('2d', { willReadFrequently: true });
    off.imageSmoothingEnabled = false;
    off.drawImage(assets.chars2.image, block.x + restCol * w, block.y, w, h, 0, 0, w, h);
    const pixels = off.getImageData(0, 0, w, h).data;
    let found = h;
    for (let y = 0; y < h && found === h; y++) {
      for (let x = 0; x < w; x++) {
        if (pixels[(y * w + x) * 4 + 3] > 0) { found = y; break; }
      }
    }
    row = found >= h ? 0 : found;
  } catch (err) {
    return null; // sin canvas/ImageData (o canvas sucio): cae al atlas viejo
  }
  headRowCache.set(blockId, row);
  return row;
}

/**
 * Recorte del frame quieto-abajo en chars2: { image, sx, sy, sw, sh } o null.
 * Arranca una fila arriba de la primera fila opaca y mide 21 px de alto.
 */
function spriteCrop(assets, blockId) {
  if (!blockId || !spriteReady(assets)) return null;
  const image = assets.chars2.image;
  // imagen todavía sin decodificar: no hay nada que recortar
  if (!(image.width > 0) || !(image.height > 0)) return null;
  const data = assets.chars2Data;
  const block = data.blocks[blockId];
  if (!block) return null;
  const w = data.cell?.w || SPRITE_W;
  const h = data.cell?.h || 32;
  const restCol = data.idle?.[0] ?? 6;
  if (block.x + restCol * w + w > image.width) return null;
  const top = block.y;
  const bottom = block.y + h;
  const row = firstOpaqueRow(assets, blockId);
  if (row === null) return null;
  const cropH = Math.min(SPRITE_H, h);
  let sy = top + row - 1;
  if (sy > bottom - cropH) sy = bottom - cropH; // no pasarse del borde de la celda
  if (sy < top) sy = top;
  return { image, sx: block.x + restCol * w, sy, sw: w, sh: cropH };
}

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

  /** Rect del panel (480x270). Coincide con draw(). */
  boxRect() {
    return { x: Math.round((480 - BOX_W) / 2), y: 270 - BOX_H - 8, w: BOX_W, h: BOX_H };
  }

  /** Rect del prompt 'Cerrar' abajo a la derecha. */
  closeRect(device = 'mouse') {
    const backW = promptWidth(this.assets, device, 'back', 'Cerrar');
    const box = this.boxRect();
    return { x: box.x + BOX_W - 10 - backW, y: box.y + BOX_H - 12, w: backW, h: 13 };
  }

  nextPage() {
    if (this.page + 1 < this.pages.length) {
      this.page += 1;
      this.startPage();
      return 'page';
    }
    this.close();
    return 'closed';
  }

  /** input = estado de src/input.js. Devuelve 'closed' | 'page' | null. */
  update(dt, input, device = 'mouse', viewPoint = null) {
    if (!this.open) return null;
    this.t += dt;
    const lines = this.pages[this.page] || [];
    this.total = lines.join(' ').length;
    if (input.bPressed || input.startPressed) {
      this.close();
      return 'closed';
    }
    // Click: primero el prompt de cerrar, despues el panel.
    if (input.click && viewPoint) {
      if (pointInRect(viewPoint, this.closeRect(device), 3)) {
        this.close();
        return 'closed';
      }
      if (pointInRect(viewPoint, this.boxRect(), 2)) {
        if (this.typing) {
          this.shown = this.total;
          return null;
        }
        return this.nextPage();
      }
      return null; // click afuera: no avanza
    }
    if (this.typing) {
      this.shown = Math.min(this.total, this.shown + dt * 52);
      if (input.aPressed) this.shown = this.total;
      return null;
    }
    if (input.aPressed) return this.nextPage();
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
    // El traje (y sus variantes) se sigue viendo en portraits_dlg.
    const keepAtlas = kind === 'dlg' && SUIT_DLG.has(entry.portrait);
    if (!keepAtlas) {
      const crop = spriteCrop(this.assets, spriteHeadFor(entry.portrait));
      if (crop) {
        if (kind === 'panel') this.drawSpritePanel(ctx, crop, px, py);
        else this.drawSpriteDialog(ctx, crop, px, py);
        return;
      }
    }
    this.drawAtlasPortrait(ctx, entry, px, py, kind);
  }

  /** Retrato del cuadro de diálogo: recorte 16x21 de chars2 escalado x3. */
  drawSpriteDialog(ctx, crop, px, py) {
    ctx.fillStyle = SPRITE_BG;
    ctx.fillRect(px, py, PORTRAIT, PORTRAIT);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(crop.image, crop.sx, crop.sy, crop.sw, crop.sh,
      px + 8, py + 1, crop.sw * 3, crop.sh * 3);
  }

  /** Retrato de viñeta: recorte 1x, centrado y abajo en un cuadrado de 32. */
  drawSpritePanel(ctx, crop, px, py) {
    const dx = px + Math.round((PANEL - crop.sw) / 2);
    const dy = py + PANEL - crop.sh;
    ctx.fillStyle = SPRITE_BG;
    ctx.fillRect(px, py, PANEL, PANEL);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(crop.image, crop.sx, crop.sy, crop.sw, crop.sh,
      dx, dy, crop.sw, crop.sh);
  }

  /** Camino viejo: atlas portraits_dlg / portraits (también el fallback). */
  drawAtlasPortrait(ctx, entry, px, py, kind) {
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

  draw(ctx, viewW, viewH, device = 'mouse') {
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

  /** Origen del panel (480x270). Coincide con draw(). */
  panelRect() {
    const x = Math.round((480 - CHOICE_W) / 2);
    const y = Math.round((270 - CHOICE_H) / 2) - 16;
    return { x, y, w: CHOICE_W, h: CHOICE_H };
  }

  /** Rects de las opciones, en el mismo orden que draw(). */
  optionRects() {
    const glyphs = this.assets.font.glyphs;
    const { x, y, w } = this.panelRect();
    let total = 0;
    for (const o of this.options) total += measureText(glyphs, o) + 34;
    let ox = Math.round(x + (w - total + 20) / 2);
    const rects = [];
    for (const label of this.options) {
      const tw = measureText(glyphs, label);
      rects.push({ x: ox - 8, y: y + 54, w: tw + 16, h: 15 });
      ox += tw + 34;
    }
    return rects;
  }

  /** Indice de la opcion bajo el punto (con unos px de tolerancia), o -1. */
  hitOption(point) {
    const rects = this.optionRects();
    for (let i = 0; i < rects.length; i++) {
      if (pointInRect(point, rects[i], 3)) return i;
    }
    return -1;
  }

  /** Rect del prompt 'Volver' abajo a la derecha. */
  backRect(device = 'mouse') {
    const { x, y, w, h } = this.panelRect();
    const backW = promptWidth(this.assets, device, 'back', 'Volver');
    return { x: x + w - backW - 18, y: y + h - 24, w: backW, h: 13 };
  }

  /** Rect del prompt 'Elegir' abajo a la izquierda: elige la opcion actual. */
  pickRect(device = 'mouse') {
    const { x, y, w, h } = this.panelRect();
    const pickW = promptWidth(this.assets, device, 'interact', 'Elegir');
    return { x: x + 14, y: y + h - 29, w: pickW + 8, h: 23 };
  }

  pick(index) {
    const value = this.options[index];
    const onPick = this.onPick;
    this.hide();
    if (onPick) onPick(value, index);
    return { index, value };
  }

  /** Devuelve {index, value} al elegir, 'cancel' con B, o null. */
  update(dt, input, device = 'mouse', viewPoint = null) {
    if (!this.open) return null;
    this.t += dt;
    if (input.bPressed || input.startPressed) {
      this.hide();
      return 'cancel';
    }
    // Mouse: hover mueve la seleccion; el click elige, vuelve o no hace nada.
    if (viewPoint && input.click) {
      if (pointInRect(viewPoint, this.backRect(device), 3)) {
        this.hide();
        return 'cancel';
      }
      // El prompt 'Elegir' no es decorativo: elige la opcion seleccionada.
      if (pointInRect(viewPoint, this.pickRect(device), 3)) {
        return this.pick(this.index);
      }
      const hit = this.hitOption(viewPoint);
      if (hit >= 0) return this.pick(hit);
      return null; // click afuera: no-op (consume el click)
    }
    if (viewPoint) {
      const hover = this.hitOption(viewPoint);
      if (hover >= 0) this.index = hover;
    }
    const mv = input.menuMove || input.move || { x: 0, y: 0 };
    if (mv.x < -0.4 || mv.y < -0.4) {
      this.index = (this.index + this.options.length - 1) % this.options.length;
    } else if (mv.x > 0.4 || mv.y > 0.4) {
      this.index = (this.index + 1) % this.options.length;
    }
    if (input.aPressed) return this.pick(this.index);
    return null;
  }

  draw(ctx, viewW, viewH, device = 'mouse') {
    if (!this.open) return;
    const glyphs = this.assets.font.glyphs;
    dim(ctx, 0.45);
    const { w, h } = this.panelRect();
    const x = Math.round((viewW - CHOICE_W) / 2);
    const y = Math.round((viewH - CHOICE_H) / 2) - 16;
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
