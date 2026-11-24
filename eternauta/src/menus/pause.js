// Panel de pausa: mochila, fabricar y opciones (una pestaña cada uno).
import { drawText, measureText, wrapText } from '../font.js';
import { drawPromptBar, promptBarLayout } from '../glyphs.js';
import { Cursor, MENU_TABS, nextTab } from '../menu.js';
import { canCraft, craft } from '../crafting.js';
import { RECIPES } from '../recipes.js';
import { getItem } from '../items.js';
import {
  woodSign, selectBar, carve, amberFrame, flake,
  CREAM, CREAM2, FACE_HI, SEAM, SEAM_HI, NAIL, NAIL_HI, FALTA, OKC, SH,
} from '../titleUi.js';
import { AM3, WOOD1, icon, count, dim, wrapLines } from '../uiSkin.js';
import { pointInRect, hitIndex, rowRects, gridRects } from '../geom.js';
import { mousePoint } from '../uiHit.js';
import {
  VIEW_W, clickPoint, setHand, promptBox, hitSlot, uiCanvas, place, centerText,
} from './shared.js';

// ------------------------------------------------------------- menu de pausa
// Medidas de art/concept/menus_madera.py (mochila).
export const PAUSE_BOX = { x: 52, y: 40, w: 376, h: 164 };
const BX = PAUSE_BOX.x;
const BY = PAUSE_BOX.y;
const BW = PAUSE_BOX.w;
const BH = PAUSE_BOX.h;

const TAB_W = 100;
const TAB_GAP = 8;
const TAB_H = 22;
const TAB_H_ACTIVE = 25;
const TAB_X0 = BX + Math.round((BW - (3 * TAB_W + 2 * TAB_GAP)) / 2);
const TAB_Y = BY - 16;
const TAB_STEP = TAB_W + TAB_GAP;

const SLOT_SIZE = 22;
const SLOT_GAP = 3;
const SLOT_COLS = 6;
const SLOT_X = BX + 18;
const SLOT_Y = BY + 20;

const HINT_Y = BY + BH + 12;
const HINT_RIGHT = BX + BW;
const SUIT_IDS = new Set((RECIPES[0]?.needs || []).map((need) => need.id));

/** Pestañas (Inventario / Fabricar / Opciones). La elegida es 3 px mas alta. */
export function pauseTabRects(active = -1) {
  return MENU_TABS.map((_, i) => ({
    x: TAB_X0 + i * TAB_STEP,
    y: i === active ? TAB_Y - 3 : TAB_Y,
    w: TAB_W,
    h: i === active ? TAB_H_ACTIVE : TAB_H,
  }));
}

/** Slots de la mochila en grilla de 6 columnas de 22 px. */
export function pauseSlotRects(count) {
  return gridRects({
    x: SLOT_X, y: SLOT_Y, w: SLOT_SIZE, h: SLOT_SIZE,
    gapX: SLOT_GAP, gapY: SLOT_GAP, columns: SLOT_COLS, count,
  });
}

/** Fila tallada de la receta (una por RECIPES). */
export function pauseRecipeRects() {
  return rowRects({ x: BX + 16, y: BY + 20, w: BW - 32, h: 30, gap: 2, count: RECIPES.length });
}

/** Filas de opciones (Reanudar / Volver al titulo), con la barra calida. */
export function pauseOptionRects() {
  return rowRects({ x: BX + 40, y: BY + 30 - 4, w: BW - 80, h: 23, gap: 3, count: 2 });
}

/** Tablita del boton Fabricar (96x20, centrada abajo). */
export function pauseCraftButtonRect() {
  return { x: BX + Math.round((BW - 96) / 2), y: BY + BH - 30, w: 96, h: 20 };
}

/** Layout de la barra de prompts de abajo (dibujo y click usan lo mismo). */
export function hintLayout(assets, device, actions) {
  const layout = promptBarLayout(assets, device, actions, HINT_RIGHT, HINT_Y);
  for (const item of layout.items) item.rect = promptBox(item.x, item.y, item.width);
  return layout;
}

/** Primera frase de la descripcion del resultado (la linea de la receta). */
function itemFlavor(recipe) {
  const text = getItem(recipe.result).description;
  const end = text.indexOf('. ');
  return end > 0 ? text.slice(0, end + 1) : text;
}

/** Lista de lo que falta (rojo suave) que sigue en la linea siguiente si no entra. */
function drawWrappedNames(ctx, glyphs, text, x, y, firstX, width) {
  const lines = wrapText(glyphs, text, width, {
    spacing: 1, firstWidth: width - (firstX - x),
  });
  lines.forEach((line, i) => {
    if (line) drawText(ctx, glyphs, i === 0 ? firstX : x, y + i * 10, line, FALTA, { shadow: SH });
  });
}

export class PauseMenu {
  constructor(scene, assets, game) {
    this.assets = assets;
    this.game = game;
    this.ui = uiCanvas(scene, 50);
    this.open = false;
    this.tab = game.lastTab || 0;
    this.cursor = new Cursor(18, { columns: 6 });
    this.recipeIndex = 0;
    this.optionIndex = 0;
    this.t = 0;
    this.syncCursor();
  }

  get visible() { return this.open; }
  setCamera(x, y) { place(this.ui, x, y); }

  show() {
    this.open = true;
    this.ui.mesh.visible = true;
    this.syncCursor();
    this.draw();
  }

  hide() {
    this.open = false;
    this.ui.mesh.visible = false;
    this.game.lastTab = this.tab;
  }

  syncCursor() {
    if (this.tab === 0) {
      this.cursor.columns = 6;
      this.cursor.setLength(this.game.inventory.length);
      this.cursor.index = Math.min(this.cursor.index, this.game.inventory.length - 1);
    } else if (this.tab === 1) {
      this.cursor.columns = 1;
      this.cursor.setLength(RECIPES.length);
      this.cursor.index = this.recipeIndex;
    } else {
      this.cursor.columns = 1;
      this.cursor.setLength(2);
      this.cursor.index = this.optionIndex;
    }
  }

  setTab(next) {
    this.tab = nextTab(this.tab, next);
    this.syncCursor();
  }

  /** 'close' | 'title' | null */
  update(dt, input) {
    if (!this.open) return null;
    this.t += dt;
    if (input.startPressed || input.bPressed) return 'close';
    if (input.prevHotbar) this.setTab(-1);
    if (input.nextHotbar) this.setTab(1);
    this.pending = null;
    // El click manda: si toco un control no corramos tambien el A del pad.
    const point = mousePoint(this.game, input);
    const consumed = this.pointerUpdate(point, input);
    if (!consumed && !point) {
      this.cursor.update(dt, input.menuMove || input.move);
      if (this.tab === 0) this.inventoryUpdate(input);
      else if (this.tab === 1) this.craftUpdate(input);
      else this.optionsUpdate(input);
    }
    this.draw();
    return this.pending || null;
  }

  /** Hover y click del mouse. Devuelve true si el click lo consumio el menu. */
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
    const hover = point ? this.hitTarget(point) : null;
    const hoverHint = point ? this.hintAt(point, input.device) : null;
    const target = this.hitTarget(at);
    const clickedHint = click ? this.hintAt(click, input.device) : null;
    const overClose = pointInRect(at, this.closeRect(input.device));
    const hand = Boolean(hover || hoverHint || target || clickedHint || overClose);
    let consumed = false;
    if (click) {
      if (clickedHint) {
        this.activateHint(clickedHint);
        consumed = true;
      } else if (target) {
        this.activateTarget(target);
        consumed = true;
      } else if (overClose) {
        this.pending = 'close';
        consumed = true;
      }
    } else if (hover) {
      this.hoverTarget(hover);
    }
    setHand(this.game, hand);
    return consumed;
  }

  /** Item de la barra de pistas bajo el punto (misma geometria que drawHints). */
  hintAt(point, device) {
    if (!point) return null;
    const hints = hintLayout(this.assets, device, this.hintActions());
    return hints.items.find((item) => pointInRect(point, item.rect)) || null;
  }

  /** Click sobre un hint: ejecuta la accion de la seleccion actual, no "nada". */
  activateHint(item) {
    if (!item) return false;
    if (item.action === 'back') {
      this.pending = 'close';
      return true;
    }
    if (item.action === 'prev') {
      this.setTab(-1);
      return true;
    }
    if (item.action === 'interact') {
      if (this.tab === 0) this.activateSlot(this.cursor.index);
      else if (this.tab === 1) this.activateRecipe(this.cursor.index);
      else this.activateOption(this.cursor.index);
      return true;
    }
    return false;
  }

  /** Control bajo el puntero: pestaña, slot, receta u opcion. */
  hitTarget(point) {
    const tab = hitIndex(point, pauseTabRects(this.tab));
    if (tab >= 0) return { kind: 'tab', index: tab };
    if (this.tab === 0) {
      const slot = hitSlot(point, pauseSlotRects(this.game.inventory.length));
      if (slot >= 0) return { kind: 'slot', index: slot };
    } else if (this.tab === 1) {
      const recipe = hitSlot(point, pauseRecipeRects());
      if (recipe >= 0) return { kind: 'recipe', index: recipe };
      if (pointInRect(point, pauseCraftButtonRect())) {
        return { kind: 'recipe', index: this.recipeIndex };
      }
    } else {
      const option = hitSlot(point, pauseOptionRects());
      if (option >= 0) return { kind: 'option', index: option };
    }
    return null;
  }

  /** Hover: mueve la seleccion visible (las pestañas no cambian solas). */
  hoverTarget(target) {
    if (target.kind === 'slot') {
      this.cursor.index = target.index;
    } else if (target.kind === 'recipe') {
      this.cursor.index = target.index;
      this.recipeIndex = target.index;
    } else if (target.kind === 'option') {
      this.cursor.index = target.index;
      this.optionIndex = target.index;
    }
  }

  /** Click: la misma accion que el boton A, sin tocar las reglas del juego. */
  activateTarget(target) {
    if (target.kind === 'tab') {
      this.tab = target.index;
      this.syncCursor();
    } else if (target.kind === 'slot') {
      this.cursor.index = target.index;
      this.syncCursor();
      this.activateSlot(target.index);
    } else if (target.kind === 'recipe') {
      this.cursor.index = target.index;
      this.recipeIndex = target.index;
      this.activateRecipe(target.index);
    } else if (target.kind === 'option') {
      this.cursor.index = target.index;
      this.optionIndex = target.index;
      this.activateOption(target.index);
    }
  }

  /** Caja del prompt Cerrar de la barra de abajo. */
  closeRect(device) {
    const hints = hintLayout(this.assets, device, this.hintActions());
    const back = hints.items.find((item) => item.action === 'back');
    return back ? back.rect : null;
  }

  hintActions() {
    return [
      { action: 'prev', label: 'Pestaña' },
      { action: 'interact', label: this.tab === 1 ? 'Fabricar' : 'Elegir' },
      { action: 'back', label: 'Cerrar' },
    ];
  }

  inventoryUpdate(input) {
    if (!input.aPressed) return;
    this.activateSlot(this.cursor.index);
  }

  /** Elegir un slot de la mochila (A o click). */
  activateSlot(index) {
    const bag = this.game.inventory[index];
    if (!bag) return;
    const item = getItem(bag.id);
    if (bag.id === 'traje') {
      this.game.requestEquip();
      return;
    }
    // Llevar a la mano: la hotbar tiene 8 slots, pero la mochila 18. Sin esto
    // los objetos que caen despues del slot 8 (la nafta del garaje) no se
    // podian usar nunca.
    const hand = this.game.selectedSlot;
    if (index !== hand) {
      const slots = this.game.inventory.slice();
      [slots[index], slots[hand]] = [slots[hand], slots[index]];
      this.game.inventory = slots;
      this.game.showToast(`${item.name}: a la mano.`);
      this.syncCursor();
    } else {
      this.game.showToast(`${item.name}: ${item.description}`);
    }
  }

  craftUpdate(input) {
    this.recipeIndex = this.cursor.index;
    if (!input.aPressed) return;
    this.activateRecipe(this.recipeIndex);
  }

  /** Fabricar una receta (A o click). */
  activateRecipe(index) {
    const recipe = RECIPES[index];
    if (!recipe) return;
    if (this.game.sceneName !== 'garage') {
      this.game.showToast('Mejor en el banco del garaje.');
      return;
    }
    if (!canCraft(this.game.inventory, recipe)) {
      this.game.showToast('Faltan materiales.');
      return;
    }
    const result = craft(this.game.inventory, recipe);
    this.game.inventory = result.slots;
    this.game.crafted = true;
    this.game.showToast(`Fabricaste: ${getItem(result.result).name}`);
    this.game.emit?.('itemCrafted', { id: result.result });
    this.syncCursor();
  }

  optionsUpdate(input) {
    this.optionIndex = this.cursor.index;
    if (!input.aPressed) return;
    this.activateOption(this.optionIndex);
  }

  /** Reanudar (0) o volver al titulo (1). */
  activateOption(index) {
    this.pending = index === 0 ? 'close' : 'title';
  }

  draw() {
    if (!this.ui.mesh.visible) return;
    const { ctx } = this.ui;
    const glyphs = this.assets.font.glyphs;
    const device = this.game.input.device;
    this.ui.clear();
    dim(ctx, 0.58);
    // Pestañas de atrás primero; la elegida se pega arriba del cartel.
    this.drawBackTabs(ctx, glyphs);
    woodSign(ctx, BX, BY, BW, BH, { seams: 20, snow: false });
    this.drawActiveTab(ctx, glyphs);
    if (this.tab === 0) this.drawInventory(ctx, glyphs);
    else if (this.tab === 1) this.drawCrafting(ctx, glyphs);
    else this.drawOptions(ctx, glyphs);
    this.drawHints(ctx, device);
    this.ui.commit();
  }

  /** Tablitas de las pestañas que no estan elegidas. */
  drawBackTabs(ctx, glyphs) {
    const rects = pauseTabRects(this.tab);
    MENU_TABS.forEach((tabDef, i) => {
      if (i === this.tab) return;
      const r = rects[i];
      woodSign(ctx, r.x, r.y, r.w, r.h, { seams: 0, nails: false, snow: false });
      centerText(ctx, glyphs, tabDef.label, r.x + r.w / 2, r.y + 6, CREAM2);
    });
  }

  /** La pestaña elegida: mas clara, clavada y fundida con el cartel. */
  drawActiveTab(ctx, glyphs) {
    const r = pauseTabRects(this.tab)[this.tab];
    if (!r) return;
    woodSign(ctx, r.x, r.y, r.w, r.h, {
      seams: 0, nails: false, snow: false, shadow: false, face: FACE_HI,
    });
    // La tablita se apoya sobre el borde del cartel: sin costura a la vista.
    ctx.fillStyle = FACE_HI;
    ctx.fillRect(r.x + 4, BY + 2, r.w - 8, 4);
    ctx.fillStyle = WOOD1;
    ctx.fillRect(r.x + 1, BY + 2, 3, 3);
    ctx.fillRect(r.x + r.w - 4, BY + 2, 3, 3);
    centerText(ctx, glyphs, MENU_TABS[this.tab].label, r.x + r.w / 2, BY - 12, CREAM);
    for (const nx of [r.x + 6, r.x + r.w - 8]) {
      ctx.fillStyle = NAIL;
      ctx.fillRect(nx, BY - 13, 2, 2);
      ctx.fillStyle = NAIL_HI;
      ctx.fillRect(nx, BY - 13, 1, 1);
    }
  }

  drawHints(ctx, device) {
    drawPromptBar(ctx, this.assets, device, this.hintActions(), HINT_RIGHT, HINT_Y, this.t);
  }

  drawInventory(ctx, glyphs) {
    const rects = pauseSlotRects(this.game.inventory.length);
    rects.forEach((rect, i) => {
      carve(ctx, rect.x, rect.y, rect.w, rect.h);
      const bag = this.game.inventory[i];
      if (bag) {
        icon(ctx, this.assets, bag.id, rect.x + 3, rect.y + 3, 16);
        count(ctx, glyphs, bag.count, rect.x + 12, rect.y + 13);
      }
    });
    const selected = rects[this.cursor.index];
    if (selected) amberFrame(ctx, selected.x, selected.y, selected.w, selected.h);

    // Ficha del objeto elegido, tallada a la derecha de la grilla.
    const fx = SLOT_X + SLOT_COLS * (SLOT_SIZE + SLOT_GAP) + 10;
    const fy = SLOT_Y;
    const fw = BX + BW - 18 - fx;
    carve(ctx, fx, fy, 38, 38);
    const bag = this.game.inventory[this.cursor.index];
    if (bag) {
      const item = getItem(bag.id);
      icon(ctx, this.assets, bag.id, fx + 3, fy + 3, 32);
      drawText(ctx, glyphs, fx + 46, fy + 4, item.name, CREAM, { shadow: SH });
      if (SUIT_IDS.has(bag.id)) {
        drawText(ctx, glyphs, fx + 46, fy + 16, 'Para el traje', AM3, { shadow: SH });
      }
      const lines = wrapLines(glyphs, item.description, fw, 3);
      lines.forEach((line, i) => {
        drawText(ctx, glyphs, fx, fy + 48 + i * 11, line, CREAM2, { shadow: SH });
      });
    } else {
      drawText(ctx, glyphs, fx + 46, fy + 4, 'La mochila está vacía.', CREAM2,
        { shadow: SH });
    }

    // Junta y materiales que faltan, quemados en la madera (solo si faltan).
    const pieces = this.game.missingParts ? this.game.missingParts() : [];
    if (!pieces.length) return;
    const ly = BY + BH - 36;
    ctx.fillStyle = SEAM;
    ctx.fillRect(BX + 16, ly, BW - 32, 1);
    ctx.fillStyle = SEAM_HI;
    ctx.fillRect(BX + 16, ly + 1, BW - 32, 1);
    const prefix = 'Para el traje faltan: ';
    drawText(ctx, glyphs, BX + 18, ly + 9, prefix, CREAM2, { shadow: SH });
    drawWrappedNames(ctx, glyphs, pieces.map((id) => getItem(id).name).join(', '),
      BX + 18, ly + 9, BX + 18 + measureText(glyphs, prefix), BW - 36);
  }

  drawCrafting(ctx, glyphs) {
    const rects = pauseRecipeRects();
    RECIPES.forEach((recipe, i) => {
      const rect = rects[i];
      if (!rect) return;
      carve(ctx, rect.x, rect.y, rect.w, rect.h);
      if (i === this.recipeIndex) {
        selectBar(ctx, rect.x + 2, rect.y + 2, rect.w - 3, rect.h - 3);
      }
      icon(ctx, this.assets, recipe.result, rect.x + 7, rect.y + 7);
      drawText(ctx, glyphs, rect.x + 30, rect.y + 6, recipe.name, CREAM, { shadow: SH });
      drawText(ctx, glyphs, rect.x + 30, rect.y + 17, itemFlavor(recipe), CREAM2,
        { shadow: SH });
    });

    const recipe = RECIPES[this.recipeIndex] || RECIPES[0];
    if (!recipe) return;
    const rx = BX + 16;
    const ry = BY + 20;
    drawText(ctx, glyphs, rx + 2, ry + 38, 'Materiales', CREAM2, { shadow: SH });
    recipe.needs.forEach((need, i) => {
      const have = this.game.inventory.reduce(
        (sum, s) => sum + (s && s.id === need.id ? s.count : 0), 0,
      );
      const ok = have >= need.n;
      const x = rx + 2 + (i % 2) * 176;
      const y = ry + 50 + Math.floor(i / 2) * 21;
      carve(ctx, x, y, 18, 18);
      icon(ctx, this.assets, need.id, x + 1, y + 1, 16);
      drawText(ctx, glyphs, x + 24, y + 6, getItem(need.id).name,
        ok ? CREAM : CREAM2, { shadow: SH });
      const text = `${have}/${need.n}`;
      drawText(ctx, glyphs, x + 160 - measureText(glyphs, text), y + 6, text,
        ok ? OKC : FALTA, { shadow: SH });
    });

    // Boton Fabricar: apagado mientras falte algo.
    const ready = canCraft(this.game.inventory, recipe);
    const box = pauseCraftButtonRect();
    woodSign(ctx, box.x, box.y, box.w, box.h, {
      seams: 0, nails: false, snow: false, face: ready ? FACE_HI : WOOD1,
    });
    centerText(ctx, glyphs, 'Fabricar', box.x + box.w / 2, box.y + 7,
      ready ? CREAM : CREAM2);
  }

  drawOptions(ctx, glyphs) {
    const options = ['Reanudar', 'Volver al título'];
    const rects = pauseOptionRects();
    options.forEach((label, i) => {
      const rect = rects[i];
      const selected = i === this.optionIndex;
      if (selected) selectBar(ctx, rect.x, rect.y, rect.w, rect.h);
      const w = measureText(glyphs, label, 2);
      const left = Math.round(rect.x + rect.w / 2 - w / 2);
      drawText(ctx, glyphs, left, rect.y + 4, label,
        selected ? CREAM : CREAM2,
        { scale: 2, shadow: selected ? '#5a2e14' : '#4a2a18' });
      if (selected) flake(ctx, left - 10, rect.y + 11, CREAM);
    });
    centerText(ctx, glyphs, 'Volver al título pierde la partida.', VIEW_W / 2,
      BY + 80, FALTA);

    // Objetivo actual en una plaquita tallada.
    const py = BY + BH - 50;
    carve(ctx, BX + 40, py, BW - 80, 34);
    centerText(ctx, glyphs, 'Objetivo actual', VIEW_W / 2, py + 7, CREAM2);
    const objective = this.game.objective ? this.game.objective() : null;
    if (objective) centerText(ctx, glyphs, objective.text, VIEW_W / 2, py + 20, CREAM);
  }
}
