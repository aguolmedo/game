// Menus: titulo, pausa (inventario/fabricar/opciones) y panel de cofres.
import { drawText, measureText } from './font.js';
import { canvasOverlay } from './sprite.js';
import {
  OUT, INK, INK2, PAR, PAR2, AM2, AM3, SEL, GOOD, BAD, SNOW, WOOD1,
  panel, darkPanel, slot, icon, count, namePlate, arrow, dim, wrapLines,
} from './uiSkin.js';
import { drawPrompt, drawGlyph, glyphName, promptWidth } from './glyphs.js';
import { Cursor, MENU_TABS, nextTab, moveSlot } from './menu.js';
import { canCraft, craft } from './crafting.js';
import { RECIPES } from './recipes.js';
import { getItem } from './items.js';
import {
  woodSign, selectBar, snowflake, sparkle, introAlpha, easeOut,
  CREAM, CREAM2, ROW_H, ROW_Y, SIGN_H,
} from './titleUi.js';
import {
  pointInRect, hitIndex, rowRects, gridRects, mousePoint,
} from './uiHit.js';

const VIEW_W = 480;
const VIEW_H = 270;

// ------------------------------------------------- helpers de mouse y layout
const PROMPT_PAD_X = 4;
const PROMPT_PAD_Y = 5;

/** Punto del click en coords de vista (480x270), solo el frame del mousedown. */
function clickPoint(game, input) {
  if (!input || !input.click || !game || typeof game.screenToView !== 'function') return null;
  return game.screenToView(input.click.x, input.click.y);
}

/** Manito sobre algo clickeable, flecha si no (puntero fuera del canvas incluido). */
function setHand(game, on) {
  const cursor = game && game.mouseCursor;
  if (cursor && typeof cursor.setState === 'function') cursor.setState(on ? 'hand' : 'arrow');
}

/** Caja clickeable de un prompt dibujado en (x, y) con ancho `width`. */
export function promptBox(x, y, width) {
  return {
    x: Math.round(x) - PROMPT_PAD_X,
    y: Math.round(y) - PROMPT_PAD_Y,
    w: width + PROMPT_PAD_X * 2,
    h: 13 + PROMPT_PAD_Y * 2,
  };
}

/** Dibuja el prompt adentro de su caja, asi dibujo y click no se separan. */
function drawBoxedPrompt(ctx, assets, device, action, box, t, opts = {}) {
  return drawPrompt(ctx, assets, device, action, box.x + PROMPT_PAD_X,
    box.y + PROMPT_PAD_Y, t, opts);
}

/** Hit-test de slots con 1 px de tolerancia (el slot elegido rebota 1 px). */
function hitSlot(point, rects) {
  for (let i = 0; i < rects.length; i++) {
    if (pointInRect(point, rects[i], 1)) return i;
  }
  return -1;
}

function uiCanvas(scene, z) {
  const ui = canvasOverlay(VIEW_W, VIEW_H, z);
  ui.mesh.visible = false;
  scene.add(ui.mesh);
  return ui;
}

function place(ui, camX, camY) {
  ui.mesh.position.set(camX + VIEW_W / 2, camY + VIEW_H / 2, ui.mesh.position.z);
}

// ------------------------------------------------------------- menu del titulo
const SIGN_FALLBACK = { x: 160, y: 120, w: 160, h: SIGN_H };
const CREDITS = { w: 300, h: 162, y: 52 };

/** Filas de opciones dentro del cartel (una por cada opcion). */
export function titleOptionRects(sign, count) {
  return rowRects({
    x: sign.x + 7, y: sign.y + ROW_Y - 1, w: sign.w - 14, h: ROW_H, gap: 0, count,
  });
}

export class TitleMenu {
  constructor(scene, assets, game) {
    this.assets = assets;
    this.game = game;
    this.ui = uiCanvas(scene, 40);
    this.view = 'main';
    this.cursor = new Cursor(4);
    this.t = 0;
    this.intro = 0;
    this.options = ['Jugar', 'Minijuego', 'Controles', 'Creditos'];
  }

  setCamera(x, y) { place(this.ui, x, y); }
  show() { this.ui.mesh.visible = true; this.intro = 0; this.draw(); }
  hide() { this.ui.mesh.visible = false; }

  /** Caja del cartel: la manda el fondo exportado (title.json) si existe. */
  signBox() {
    const s = this.assets.titleData && this.assets.titleData.sign;
    return s ? { x: s.x, y: s.y, w: s.w, h: s.h } : SIGN_FALLBACK;
  }

  /** Rects clickeables de las opciones (las mismas que dibuja drawMain). */
  optionRects() {
    return titleOptionRects(this.signBox(), this.options.length);
  }

  /** Caja del prompt Volver de Controles/Creditos (dibujo y click juntos). */
  volverRect(device) {
    const width = promptWidth(this.assets, device, 'back', 'Volver');
    if (this.view === 'credits') {
      return promptBox(Math.round((VIEW_W - width) / 2), CREDITS.y + CREDITS.h - 24, width);
    }
    return promptBox(VIEW_W - width - 30, 236, width);
  }

  /** Accion de la opcion `index`: la comparten el pad y el click. */
  activate(index) {
    if (index === 0) return 'play';
    if (index === 1) return 'arena';
    this.view = index === 2 ? 'controls' : 'credits';
    this.intro = 0;
    return null;
  }

  update(dt, input) {
    this.t += dt;
    this.intro += dt;
    const point = mousePoint(this.game, input);
    const click = clickPoint(this.game, input);
    if (this.view !== 'main') {
      const rect = this.volverRect(input.device);
      const over = pointInRect(point, rect);
      const clicked = pointInRect(click, rect);
      setHand(this.game, over);
      if (input.aPressed || input.bPressed || input.startPressed || clicked) {
        this.view = 'main';
        this.intro = 0;
      }
      this.draw();
      return null;
    }
    const rects = this.optionRects();
    const hoverHit = point ? hitIndex(point, rects) : -1;
    if (hoverHit >= 0) this.cursor.index = hoverHit;
    // El click se ubica con las coordenadas del mousedown (screenToView), no
    // con el ultimo pointermove: un click rapido no depende de haber movido.
    const clickHit = click ? hitIndex(click, rects) : -1;
    setHand(this.game, hoverHit >= 0 || clickHit >= 0);
    let action = null;
    if (click) {
      if (clickHit >= 0) action = this.activate(clickHit);
    } else {
      // Con el mouse sobre el cartel, las teclas mantenidas no roban el hover.
      if (!point) this.cursor.update(dt, input.menuMove || input.move);
      if (input.aPressed || input.startPressed) action = this.activate(this.cursor.index);
    }
    this.draw();
    return action;
  }

  draw() {
    if (!this.ui.mesh.visible) return;
    const { ctx } = this.ui;
    const glyphs = this.assets.font.glyphs;
    const device = this.game.input.device;
    this.ui.clear();
    // fundido de entrada suave: alfa + 3 px de subida, en pasos enteros
    const alpha = easeOut(introAlpha(this.intro, 0.7));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(0, Math.round((1 - alpha) * 4));
    if (this.view === 'main') this.drawMain(ctx, glyphs, device);
    else if (this.view === 'controls') this.drawControls(ctx, glyphs, device);
    else this.drawCredits(ctx, glyphs, device);
    ctx.restore();
    this.ui.commit();
  }

  drawMain(ctx, glyphs, device) {
    // titulo grande en el cielo, subtitulo en ambar
    const title = 'EL ETERNAUTA';
    const tw = measureText(glyphs, title, 4);
    const tx = Math.round((VIEW_W - tw) / 2);
    drawText(ctx, glyphs, tx, 24, title, '#dff6fb',
      { scale: 4, shadow: '#1b2440', outline: '#2a4a66' });
    const sub = 'La nevada';
    const sw = measureText(glyphs, sub, 2);
    drawText(ctx, glyphs, Math.round((VIEW_W - sw) / 2), 66, sub, '#ecab4c',
      { scale: 2, shadow: '#3a2418', outline: OUT });
    // copos que titilan alrededor del titulo
    sparkle(ctx, tx - 13, 40, this.t, 0);
    sparkle(ctx, tx + tw + 10, 30, this.t, 1.7);
    sparkle(ctx, tx + tw - 34, 12, this.t, 3.1);
    sparkle(ctx, tx + 26, 15, this.t, 4.6);
    // cartel de madera chico con las cuatro opciones
    const sign = this.signBox();
    woodSign(ctx, sign.x, sign.y, sign.w, sign.h);
    const cx = Math.round(VIEW_W / 2);
    const rects = this.optionRects();
    this.options.forEach((label, i) => {
      const rect = rects[i];
      const selected = i === this.cursor.index;
      const baseY = rect.y + 1;
      const bob = selected ? Math.round(Math.sin(this.t * 3.1) * 1.2) : 0;
      if (selected) selectBar(ctx, rect.x, rect.y + bob, rect.w, ROW_H);
      const w = measureText(glyphs, label, 2);
      drawText(ctx, glyphs, Math.round(cx - w / 2), baseY + bob, label,
        selected ? CREAM : CREAM2, { scale: 2, shadow: selected ? '#5a2e14' : '#4a2a18' });
      if (selected) snowflake(ctx, Math.round(cx - w / 2) - 11, baseY + 3 + bob, 1);
    });
    const hint = promptWidth(this.assets, device, 'interact', 'Elegir');
    drawPrompt(ctx, this.assets, device, 'interact', Math.round((VIEW_W - hint) / 2),
      sign.y + sign.h + 6, this.t, { label: 'Elegir' });
    drawText(ctx, glyphs, 8, VIEW_H - 12, 'Oesterheld - Solano Lopez, 1957', '#cfe6f5',
      { outline: OUT, shadow: '#1b2440' });
  }

  drawControls(ctx, glyphs, device) {
    woodSign(ctx, 10, 10, VIEW_W - 20, VIEW_H - 20, { seams: false });
    ctx.fillStyle = 'rgba(74, 42, 26, 0.45)';
    ctx.fillRect(26, 44, VIEW_W - 52, 1);
    ctx.fillRect(26, 196, VIEW_W - 52, 1);
    const title = 'CONTROLES';
    drawText(ctx, glyphs, Math.round((VIEW_W - measureText(glyphs, title, 2)) / 2), 26,
      title, CREAM, { scale: 2, shadow: '#5a2e14' });
    CONTROLS_ROWS.forEach(([pad, label, action], i) => {
      const y = 51 + i * 14;
      drawGlyph(ctx, this.assets, pad, 56, y + 1);
      drawText(ctx, glyphs, 86, y, label, CREAM, { shadow: '#4a2a18' });
      drawGlyph(ctx, this.assets, glyphName('keyboard', action), 330, y - 1);
      drawText(ctx, glyphs, 350, y, keyLabel(action), CREAM2, { shadow: '#4a2a18' });
    });
    drawText(ctx, glyphs, 46, 202,
      'Objetivo: juntar las partes del traje, fabricarlo y salir.', CREAM2,
      { shadow: '#4a2a18' });
    drawText(ctx, glyphs, 46, 214, 'La nevada mata al contacto con la piel.',
      CREAM2, { shadow: '#4a2a18' });
    drawBoxedPrompt(ctx, this.assets, device, 'back', this.volverRect(device), this.t,
      { label: 'Volver' });
  }

  drawCredits(ctx, glyphs, device) {
    const { w, h, y } = CREDITS;
    const x = Math.round((VIEW_W - w) / 2);
    woodSign(ctx, x, y, w, h, { seams: false });
    ctx.fillStyle = 'rgba(74, 42, 26, 0.45)';
    ctx.fillRect(x + 18, 86, w - 36, 1);
    ctx.fillRect(x + 18, y + h - 30, w - 36, 1);
    const title = 'CREDITOS';
    drawText(ctx, glyphs, Math.round((VIEW_W - measureText(glyphs, title, 2)) / 2), 68,
      title, CREAM, { scale: 2, shadow: '#5a2e14' });
    const lines = [
      'EL ETERNAUTA (1957)',
      'H. G. Oesterheld',
      'F. Solano Lopez',
      '',
      'Demo fan, sin fines de lucro.',
      'Hecha con Three.js + Vite.',
    ];
    lines.forEach((line, i) => {
      const lw = measureText(glyphs, line);
      drawText(ctx, glyphs, Math.round((VIEW_W - lw) / 2), 96 + i * 13, line,
        CREAM2, { shadow: '#4a2a18' });
    });
    drawBoxedPrompt(ctx, this.assets, device, 'back', this.volverRect(device), this.t,
      { label: 'Volver' });
  }
}

/** Panel de controles: glifo del pad a la izquierda y atajo/click a la derecha. */
export const CONTROLS_ROWS = [
  ['a', 'Hablar, mirar, confirmar', 'interact'],
  ['b', 'Volver, cerrar', 'back'],
  ['x', 'Usar el objeto elegido', 'use'],
  ['y', 'Abrir la mochila', 'bag'],
  ['lb', 'Slot anterior', 'prev'],
  ['rb', 'Slot siguiente', 'next'],
  ['start', 'Menu / pausa', 'menu'],
  ['dpad', 'Mover con la cruceta', 'move'],
  ['stick', 'Mover con el stick', 'move'],
];

const KEY_LABELS = {
  interact: 'Click', back: 'Click', use: 'F', bag: 'I / Tab',
  prev: 'Q', next: 'R', menu: 'Esc', move: 'WASD / flechas',
};

function keyLabel(action) {
  return KEY_LABELS[action] || '';
}

// ------------------------------------------------------------- menu de pausa
const TAB_X0 = 54;
const TAB_STEP = 124;
const TAB_Y = 28;
const TAB_W = 116;
const TAB_H = 17;
const SLOT_SIZE = 20;
const SLOT_GAP = 3;
const SLOT_COLS = 6;
const SLOT_Y = 52;

/** Pestañas (Inventario / Fabricar / Opciones). */
export function pauseTabRects() {
  return MENU_TABS.map((_, i) => ({
    x: TAB_X0 + i * TAB_STEP, y: TAB_Y, w: TAB_W, h: TAB_H,
  }));
}

/** Slots de la mochila en grilla de 6 columnas. */
export function pauseSlotRects(count) {
  const gridW = SLOT_COLS * SLOT_SIZE + (SLOT_COLS - 1) * SLOT_GAP;
  const x0 = Math.round((VIEW_W - gridW) / 2);
  return gridRects({
    x: x0, y: SLOT_Y, w: SLOT_SIZE, h: SLOT_SIZE,
    gapX: SLOT_GAP, gapY: SLOT_GAP, columns: SLOT_COLS, count,
  });
}

/** Filas de recetas (una por RECIPES). */
export function pauseRecipeRects() {
  return rowRects({ x: 50, y: 59, w: 376, h: 32, gap: 2, count: RECIPES.length });
}

/** Filas de opciones (Reanudar / Volver al titulo). */
export function pauseOptionRects() {
  return rowRects({ x: 50, y: 75, w: 340, h: 28, gap: 2, count: 2 });
}

/** Layout de la barra de prompts de abajo (dibujo y click usan lo mismo). */
export function hintLayout(assets, device, actions) {
  const items = actions.map((a) => ({
    ...a, width: promptWidth(assets, device, a.action, a.label),
  }));
  let total = 0;
  for (const item of items) total += item.width + 9;
  total -= 9;
  const x = VIEW_W - total - 58;
  const y = VIEW_H - 30;
  let cx = x;
  for (const item of items) {
    item.x = cx;
    item.y = y - 1;
    item.rect = promptBox(cx, y - 1, item.width);
    cx += item.width + 9;
  }
  return { x, y, total, items };
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
    const tab = hitIndex(point, pauseTabRects());
    if (tab >= 0) return { kind: 'tab', index: tab };
    if (this.tab === 0) {
      const slot = hitSlot(point, pauseSlotRects(this.game.inventory.length));
      if (slot >= 0) return { kind: 'slot', index: slot };
    } else if (this.tab === 1) {
      const recipe = hitSlot(point, pauseRecipeRects());
      if (recipe >= 0) return { kind: 'recipe', index: recipe };
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
    panel(ctx, 44, 20, 392, 226);
    MENU_TABS.forEach((tabDef, i) => {
      const label = tabDef.label;
      const active = i === this.tab;
      const x = TAB_X0 + i * TAB_STEP;
      const w = TAB_W;
      ctx.fillStyle = OUT;
      ctx.fillRect(x, TAB_Y, w, TAB_H);
      ctx.fillStyle = active ? '#b07a42' : WOOD1;
      ctx.fillRect(x + 1, TAB_Y + 1, w - 2, TAB_H - 2);
      if (active) {
        ctx.fillStyle = AM3;
        ctx.fillRect(x + 1, TAB_Y + 1, w - 2, 1);
      }
      const color = active ? '#fff0c0' : '#e8c890';
      drawText(ctx, glyphs, Math.round(x + (w - measureText(glyphs, label)) / 2), TAB_Y + 5,
        label, color, { shadow: active ? '#5a3420' : '#2e1a10' });
    });
    if (this.tab === 0) this.drawInventory(ctx, glyphs);
    else if (this.tab === 1) this.drawCrafting(ctx, glyphs);
    else this.drawOptions(ctx, glyphs);
    this.drawHints(ctx, device);
    this.ui.commit();
  }

  drawHints(ctx, device) {
    const hints = hintLayout(this.assets, device, this.hintActions());
    darkPanel(ctx, hints.x - 8, hints.y - 4, hints.total + 16, 16, 0.7);
    for (const item of hints.items) {
      drawPrompt(ctx, this.assets, device, item.action, item.x, item.y, this.t,
        { label: item.label, bob: false });
    }
  }

  drawInventory(ctx, glyphs) {
    const rects = pauseSlotRects(this.game.inventory.length);
    rects.forEach((rect, i) => {
      const selected = i === this.cursor.index;
      const bob = selected ? Math.round(Math.sin(this.t * 6)) : 0;
      const x = rect.x;
      const y = rect.y + bob;
      slot(ctx, x, y, rect.w, selected);
      const bag = this.game.inventory[i];
      if (bag) {
        icon(ctx, this.assets, bag.id, x + 2, y + 2, 16);
        count(ctx, glyphs, bag.count, x + 13, y + 12);
      }
    });
    const bag = this.game.inventory[this.cursor.index];
    const detailY = 128;
    if (bag) {
      const item = getItem(bag.id);
      drawText(ctx, glyphs, 62, detailY, item.name, SEL, { shadow: '#f8e8c0' });
      const lines = wrapLines(glyphs, item.description, 340, 2);
      lines.forEach((line, i) => {
        drawText(ctx, glyphs, 62, detailY + 12 + i * 10, line, INK, { shadow: '#f8e8c0' });
      });
      const action = bag.id === 'traje'
        ? (this.game.hasSuit ? 'Sacarse el traje' : 'Ponerse el traje')
        : 'Llevar a la mano';
      drawText(ctx, glyphs, 62, detailY + 40, action, INK2, { shadow: '#f8e8c0' });
    } else {
      drawText(ctx, glyphs, 62, detailY, 'La mochila está vacía.', INK2, {});
    }
    const pieces = this.game.missingParts ? this.game.missingParts() : [];
    if (this.game.crafted) {
      drawText(ctx, glyphs, 62, 206, 'Traje fabricado.', GOOD, { shadow: '#f8e8c0' });
    } else if (pieces.length) {
      const names = pieces.map((id) => getItem(id).name);
      const lines = wrapLines(glyphs, `Falta: ${names.join(', ')}`, 356, 3);
      lines.forEach((line, i) => {
        drawText(ctx, glyphs, 62, 198 + i * 10, line, BAD, { shadow: '#f8e8c0' });
      });
    } else {
      drawText(ctx, glyphs, 62, 206, 'Materiales del traje completos.', GOOD,
        { shadow: '#f8e8c0' });
    }
  }

  drawCrafting(ctx, glyphs) {
    const rects = pauseRecipeRects();
    RECIPES.forEach((recipe, i) => {
      const selected = i === this.recipeIndex;
      const y = rects[i].y + 5;
      const bob = selected ? Math.round(Math.sin(this.t * 6)) : 0;
      if (selected) {
        ctx.fillStyle = 'rgba(232, 150, 58, 0.25)';
        ctx.fillRect(58, y - 4 + bob, 364, 30);
        arrow(ctx, 46, y + 6 + bob, AM3);
      }
      slot(ctx, 64, y + bob, 20, selected);
      icon(ctx, this.assets, recipe.result, 66, y + 2 + bob);
      drawText(ctx, glyphs, 92, y + 2 + bob, recipe.name, selected ? SEL : INK,
        { shadow: '#f8e8c0' });
      drawText(ctx, glyphs, 92, y + 13 + bob, recipe.description.slice(0, 52), INK2, {});
      const ok = canCraft(this.game.inventory, recipe);
      const status = this.game.crafted ? 'Fabricado' : (ok ? 'Listo' : 'Faltan');
      drawText(ctx, glyphs, 364, y + 2, status, this.game.crafted || ok ? GOOD : BAD, {});
    });
    const recipe = RECIPES[this.recipeIndex];
    if (!recipe) return;
    const needsY = 146;
    drawText(ctx, glyphs, 62, needsY - 12, 'Materiales:', INK, { shadow: '#f8e8c0' });
    recipe.needs.forEach((need, i) => {
      const have = this.game.inventory.reduce(
        (sum, s) => sum + (s && s.id === need.id ? s.count : 0), 0,
      );
      const ok = have >= need.n;
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 66 + col * 180;
      const y = needsY + row * 12;
      icon(ctx, this.assets, need.id, x, y - 2, 12);
      drawText(ctx, glyphs, x + 16, y, `${getItem(need.id).name} ${have}/${need.n}`,
        ok ? GOOD : BAD, { shadow: '#f8e8c0' });
    });
  }

  drawOptions(ctx, glyphs) {
    const options = ['Reanudar', 'Volver al titulo'];
    const rects = pauseOptionRects();
    options.forEach((label, i) => {
      const selected = i === this.optionIndex;
      const y = rects[i].y + 5;
      if (selected) {
        arrow(ctx, 62, y + 6, AM3);
        ctx.fillStyle = 'rgba(232, 150, 58, 0.22)';
        ctx.fillRect(74, y - 4, 300, 22);
      }
      drawText(ctx, glyphs, 82, y, label, selected ? SEL : INK,
        { scale: 2, shadow: selected ? '#e8c890' : '#f8e8c0' });
    });
    drawText(ctx, glyphs, 62, 160, 'Volver al titulo pierde la partida.', INK2,
      { shadow: '#f8e8c0' });
    drawText(ctx, glyphs, 62, 180, 'Objetivo actual:', INK2, { shadow: '#f8e8c0' });
    const objective = this.game.objective ? this.game.objective() : null;
    if (objective) drawText(ctx, glyphs, 62, 192, objective.text, INK, { shadow: '#f8e8c0' });
  }
}

// ------------------------------------------------------------- panel de cofre
const CHEST_W = 300;
const CHEST_H = 132;

/** Caja del panel de cofre (centrado y un poco arriba). */
function chestBox() {
  return {
    x: Math.round((VIEW_W - CHEST_W) / 2),
    y: Math.round((VIEW_H - CHEST_H) / 2) - 10,
    w: CHEST_W,
    h: CHEST_H,
  };
}

/** Slots del cofre: minimo 4, en fila. */
export function chestSlotRects(count) {
  const box = chestBox();
  const n = Math.max(4, count);
  const size = 20;
  const gap = 4;
  const total = n * (size + gap) - gap;
  const x0 = Math.round(box.x + (box.w - total) / 2);
  return gridRects({
    x: x0, y: box.y + 34, w: size, h: size, gapX: gap, gapY: 0, columns: n, count: n,
  });
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

  /** Caja del prompt Cerrar. */
  closeRect(device) {
    const box = chestBox();
    const width = promptWidth(this.assets, device, 'back', 'Cerrar');
    return promptBox(box.x + box.w - width - 16, box.y + box.h - 22, width);
  }

  /** Caja del prompt Agarrar (el del objeto seleccionado). */
  takeRect(device) {
    const box = chestBox();
    const width = promptWidth(this.assets, device, 'interact', 'Agarrar');
    return promptBox(box.x + 16, box.y + box.h - 22, width);
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

  draw() {
    if (!this.ui.mesh.visible || !this.container) return;
    const { ctx } = this.ui;
    const glyphs = this.assets.font.glyphs;
    const device = this.game.input.device;
    this.ui.clear();
    dim(ctx, 0.5);
    const box = chestBox();
    const { x, y, w, h } = box;
    panel(ctx, x, y, w, h);
    namePlate(ctx, glyphs, this.container.name, x + w / 2, y + 10);
    const items = this.container.items;
    this.slotRects().forEach((rect, i) => {
      const selected = i === this.index && items.length > 0;
      const bob = selected ? Math.round(Math.sin(this.t * 6)) : 0;
      slot(ctx, rect.x, rect.y + bob, rect.w, selected);
      if (items[i]) {
        icon(ctx, this.assets, items[i].id || items[i], rect.x + 2, rect.y + 2 + bob);
        const n = items[i].n || 1;
        if (n > 1) count(ctx, glyphs, n, rect.x + 13, rect.y + 12 + bob);
      }
    });
    if (items.length) {
      const raw = items[this.index];
      const item = getItem(raw.id || raw);
      drawText(ctx, glyphs, x + 16, y + 70, item.name, SEL, { shadow: '#f8e8c0' });
      const lines = wrapLines(glyphs, item.description, w - 32, 2);
      lines.forEach((line, i) => {
        drawText(ctx, glyphs, x + 16, y + 82 + i * 10, line, INK, { shadow: '#f8e8c0' });
      });
      drawBoxedPrompt(ctx, this.assets, device, 'interact', this.takeRect(device), this.t,
        { label: 'Agarrar' });
    } else {
      drawText(ctx, glyphs, x + 16, y + 70, 'No queda nada.', INK2, {});
    }
    drawBoxedPrompt(ctx, this.assets, device, 'back', this.closeRect(device), this.t,
      { label: 'Cerrar' });
    this.ui.commit();
  }
}

export { moveSlot };
