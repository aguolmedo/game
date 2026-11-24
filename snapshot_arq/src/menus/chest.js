// Panel de cofre: casilleros, ficha del objeto y prompts de abajo.
import { drawText, measureText } from '../font.js';
import { promptBarLayout } from '../glyphs.js';
import { getItem } from '../items.js';
import {
  woodSign, amberFrame, CREAM, CREAM2, FACE_HI, NAIL, NAIL_HI, SH,
} from '../titleUi.js';
import { WOOD1, icon, count, dim, wrapLines } from '../uiSkin.js';
import { pointInRect, gridRects } from '../geom.js';
import { mousePoint } from '../uiHit.js';
import {
  VIEW_W, VIEW_H, clickPoint, setHand, promptBox, hitSlot, uiCanvas, place, centerText,
} from './shared.js';

// ------------------------------------------------------------- panel de cofre
// Mismo lenguaje que la mochila: cartel de madera, casilleros tallados, ficha
// del objeto y tablita de glifos. Sin papel rayado.
const CHEST_W = 360;
const CHEST_H = 156;
const CHEST_SLOT = 22;
const CHEST_GAP = 3;
const CHEST_PAD = 18;

/** Caja del panel de cofre (centrado y un poco arriba). */
export function chestBox() {
  return {
    x: Math.round((VIEW_W - CHEST_W) / 2),
    y: Math.round((VIEW_H - CHEST_H) / 2) - 10,
    w: CHEST_W,
    h: CHEST_H,
  };
}

/** Tablita del titulo, clavada arriba como la pestaña elegida de la mochila. */
export function chestTitleRect(assets, title) {
  const box = chestBox();
  const text = title || 'Cofre';
  const w = Math.max(112, measureText(assets.font.glyphs, text) + 30);
  return { x: Math.round(box.x + (box.w - w) / 2), y: box.y - 19, w, h: 25 };
}

/** Casilleros tallados de 22 px, alineados a la izquierda como el inventario. */
export function chestSlotRects(count) {
  const box = chestBox();
  const n = Math.max(4, count);
  return gridRects({
    x: box.x + CHEST_PAD, y: box.y + 20, w: CHEST_SLOT, h: CHEST_SLOT,
    gapX: CHEST_GAP, gapY: 0, columns: n, count: n,
  });
}

/** Glifos de abajo: Agarrar (si queda algo) y Cerrar. */
function chestHintItems(hasItems) {
  return [
    ...(hasItems ? [{ action: 'interact', label: 'Agarrar' }] : []),
    { action: 'back', label: 'Cerrar' },
  ];
}

/** Geometria de la tablita de glifos (dibujo y click usan lo mismo). */
function chestHintLayout(assets, device, hasItems = true) {
  const box = chestBox();
  const layout = promptBarLayout(
    assets, device, chestHintItems(hasItems), box.x + box.w - 16, box.y + box.h - 22,
  );
  for (const item of layout.items) item.rect = promptBox(item.x, item.y, item.width);
  return layout;
}

export class ChestPanel {
  constructor(scene, assets, game) {
    this.assets = assets;
    this.game = game;
    this.ui = uiCanvas(scene, 55);
    this.open = false;
    this.container = null;
    this.index = 0;
    this.t = 0;
  }

  get visible() { return this.open; }
  setCamera(x, y) { place(this.ui, x, y); }

  show(container) {
    this.container = container;
    this.index = 0;
    this.open = true;
    this.ui.mesh.visible = true;
    this.draw();
  }

  hide() {
    this.open = false;
    this.container = null;
    this.ui.mesh.visible = false;
  }

  /** 'close' o null */
  update(dt, input) {
    if (!this.open) return null;
    this.t += dt;
    if (input.bPressed || input.startPressed) {
      this.hide();
      return 'close';
    }
    // El click manda: si toco un control no corramos tambien el A del pad.
    const point = mousePoint(this.game, input);
    if (this.pointerUpdate(point, input)) {
      if (!this.open) return 'close';
      this.draw();
      return null;
    }
    const items = this.container ? this.container.items : [];
    if (!point && items.length) {
      const mv = input.menuMove || input.move || { x: 0, y: 0 };
      if (mv.x < -0.4 || mv.y < -0.4) {
        this.index = (this.index + items.length - 1) % items.length;
      } else if (mv.x > 0.4 || mv.y > 0.4) {
        this.index = (this.index + 1) % items.length;
      }
      this.index = Math.min(this.index, items.length - 1);
      if (input.aPressed) this.takeIndex(this.index);
    }
    this.draw();
    return null;
  }

  /** Hover y click del mouse. Devuelve true si el click lo consumio el panel. */
  pointerUpdate(point, input) {
    if (!input || input.device !== 'mouse') {
      setHand(this.game, false);
      return false;
    }
    const click = clickPoint(this.game, input);
    const at = click || point;
    if (!at) {
      setHand(this.game, false);
      return false;
    }
    const items = this.container ? this.container.items : [];
    const hoverHit = point ? hitSlot(point, this.slotRects()) : -1;
    const hit = hitSlot(at, this.slotRects());
    const overItem = hit >= 0 && hit < items.length;
    const overClose = pointInRect(at, this.closeRect(input.device));
    const overTake = items.length > 0 && pointInRect(at, this.takeRect(input.device));
    setHand(this.game, (hoverHit >= 0 && hoverHit < items.length)
      || overItem || overClose || overTake);
    if (click) {
      if (overItem) {
        this.index = hit;
        this.takeIndex(hit);
        return true;
      }
      if (overTake) {
        this.takeIndex(this.index);
        return true;
      }
      if (overClose) {
        this.hide();
        return true;
      }
      return false;
    }
    if (hoverHit >= 0 && hoverHit < items.length) this.index = hoverHit;
    return false;
  }

  /** Rects de los slots dibujados (minimo 4). */
  slotRects() {
    return chestSlotRects(this.container ? this.container.items.length : 0);
  }

  /** Caja clickeable de un glifo de la tablita de abajo. */
  hintRect(device, action) {
    const hasItems = Boolean(this.container && this.container.items.length);
    const layout = chestHintLayout(this.assets, device, hasItems);
    const item = layout.items.find((entry) => entry.action === action);
    return item ? item.rect : null;
  }

  /** Caja del prompt Cerrar. */
  closeRect(device) {
    return this.hintRect(device, 'back');
  }

  /** Caja del prompt Agarrar (el del objeto seleccionado). */
  takeRect(device) {
    return this.hintRect(device, 'interact');
  }

  /** Agarrar el item del slot `index` (A o click). */
  takeIndex(index) {
    if (!this.container) return;
    const entry = this.container.items[index];
    if (!entry) return;
    const result = this.game.takeFromContainer(this.container, entry);
    if (!result) this.game.showToast('No hay lugar en la mochila.');
    const left = this.container.items.length;
    this.index = left === 0 ? 0 : Math.min(this.index, left - 1);
  }

  /** Tablita del titulo pegada al borde superior del cartel. */
  drawTitleTab(ctx, glyphs, tab, title) {
    const box = chestBox();
    woodSign(ctx, tab.x, tab.y, tab.w, tab.h, {
      seams: 0, nails: false, snow: false, shadow: false, face: FACE_HI,
    });
    // Se funde con el cartel, como la pestaña elegida de la mochila.
    ctx.fillStyle = FACE_HI;
    ctx.fillRect(tab.x + 4, box.y + 2, tab.w - 8, 4);
    ctx.fillStyle = WOOD1;
    ctx.fillRect(tab.x + 1, box.y + 2, 3, 3);
    ctx.fillRect(tab.x + tab.w - 4, box.y + 2, 3, 3);
    centerText(ctx, glyphs, title, tab.x + tab.w / 2, box.y - 12, CREAM);
    for (const nx of [tab.x + 6, tab.x + tab.w - 8]) {
      ctx.fillStyle = NAIL;
      ctx.fillRect(nx, box.y - 13, 2, 2);
      ctx.fillStyle = NAIL_HI;
      ctx.fillRect(nx, box.y - 13, 1, 1);
    }
  }

  draw() {
    if (!this.ui.mesh.visible || !this.container) return;
    const { ctx } = this.ui;
    const glyphs = this.assets.font.glyphs;
    const device = this.game.input.device;
    this.ui.clear();
    dim(ctx, 0.5);
    const box = chestBox();
    const { x, y, w, h } = box;
    const items = this.container.items;

    woodSign(ctx, x, y, w, h, { seams: 18, snow: false });
    this.drawTitleTab(ctx, glyphs, chestTitleRect(this.assets, this.container.name),
      this.container.name);

    this.slotRects().forEach((rect, i) => {
      carve(ctx, rect.x, rect.y, rect.w, rect.h);
      const entry = items[i];
      if (entry) {
        icon(ctx, this.assets, entry.id || entry, rect.x + 3, rect.y + 3, 16);
        count(ctx, glyphs, entry.n || 1, rect.x + 12, rect.y + 13);
      }
    });
    const selected = this.slotRects()[this.index];
    if (selected && items.length) amberFrame(ctx, selected.x, selected.y, selected.w, selected.h);

    // Ficha del objeto elegido, como la del inventario adaptada al ancho.
    const fx = x + 128;
    const fy = y + 20;
    carve(ctx, fx, fy, 38, 38);
    if (items.length) {
      const raw = items[this.index];
      const item = getItem(raw.id || raw);
      icon(ctx, this.assets, raw.id || raw, fx + 3, fy + 3, 32);
      drawText(ctx, glyphs, fx + 46, fy + 4, item.name, CREAM, { shadow: SH });
      const lines = wrapLines(glyphs, item.description, w - CHEST_PAD * 2, 3);
      lines.forEach((line, i) => {
        drawText(ctx, glyphs, x + CHEST_PAD, fy + 48 + i * 11, line, CREAM2,
          { shadow: SH });
      });
    } else {
      drawText(ctx, glyphs, x + CHEST_PAD, fy + 48, 'No queda nada.', CREAM2,
        { shadow: SH });
    }

    drawPromptBar(ctx, this.assets, device, chestHintItems(items.length > 0),
      x + w - 16, y + h - 22, this.t);
    this.ui.commit();
  }
}
