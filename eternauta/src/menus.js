// Menus: titulo, pausa (inventario/fabricar/opciones) y panel de cofres.
import { drawText, measureText } from './font.js';
import { canvasOverlay } from './sprite.js';
import {
  OUT, AM3, WOOD1,
  icon, count, dim, wrapLines,
} from './uiSkin.js';
import {
  drawPrompt, drawGlyph, glyphName, glyphSize, promptWidth, drawPromptBar, promptBarLayout,
} from './glyphs.js';
import { Cursor, MENU_TABS, nextTab, moveSlot } from './menu.js';
import { canCraft, craft } from './crafting.js';
import { RECIPES } from './recipes.js';
import { getItem } from './items.js';
import {
  woodSign, selectBar, snowflake, introAlpha, easeOut,
  carve, amberFrame, flake,
  CREAM, CREAM2, ROW_H, ROW_Y, SIGN_H, SH,
  FACE_HI, SEAM, SEAM_HI, NAIL, NAIL_HI, FALTA, OKC,
} from './titleUi.js';
import {
  pointInRect, hitIndex, rowRects, gridRects, mousePoint,
} from './uiHit.js';

const VIEW_W = 480;
const VIEW_H = 270;
// logo del titulo (art/concept/out/titulo3d_logo.png): tamano fijo, 1x
const LOGO_W = 276;
const LOGO_H = 63;
const LOGO_Y = 22;

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
    // logo 3D en el cielo (imagen 276x63 a escala 1, sin estirar)
    ctx.imageSmoothingEnabled = false;
    const logo = this.assets.titleLogo && this.assets.titleLogo.image;
    if (logo) ctx.drawImage(logo, Math.round((VIEW_W - LOGO_W) / 2), LOGO_Y, LOGO_W, LOGO_H);
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
    for (const [header, x] of CONTROLS_HEADERS) {
      drawText(ctx, glyphs, x, CTRL_HEADER_Y, header, CREAM2, { shadow: '#4a2a18' });
    }
    CONTROLS_ROWS.forEach((row, i) => {
      const y = CTRL_ROW_Y + i * CTRL_ROW_STEP;
      drawText(ctx, glyphs, CTRL_LABEL_X, y, row.label, CREAM, { shadow: '#4a2a18' });
      drawGlyphRun(ctx, this.assets, row.mouse, CTRL_MOUSE_X, y);
      drawText(ctx, glyphs, CTRL_MOUSE_LABEL_X, y, row.mouseLabel, CREAM2,
        { shadow: '#4a2a18' });
      drawGlyphRun(ctx, this.assets, row.pad, CTRL_PAD_X, y);
      drawText(ctx, glyphs, CTRL_PAD_LABEL_X, y, row.padLabel, CREAM2,
        { shadow: '#4a2a18' });
    });
    CONTROLS_NOTES.forEach((line, i) => {
      drawText(ctx, glyphs, 46, 202 + i * 12, line, CREAM2, { shadow: '#4a2a18' });
    });
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

// ------------------------------------------------------- tabla de Controles
// Dos columnas de dispositivo: mouse + teclado (complementarios) y joystick.
const CTRL_LABEL_X = 44;
const CTRL_MOUSE_X = 196;
const CTRL_MOUSE_LABEL_X = 214;
const CTRL_PAD_X = 330;
const CTRL_PAD_LABEL_X = 371;
const CTRL_HEADER_Y = 46;
const CTRL_ROW_Y = 58;
const CTRL_ROW_STEP = 19;

export const CONTROLS_HEADERS = [
  ['VERBO', CTRL_LABEL_X],
  ['MOUSE + TECLADO', CTRL_MOUSE_X],
  ['JOYSTICK', CTRL_PAD_X],
];

/** Pie del cartel de Controles (se dibuja línea por línea). */
export const CONTROLS_NOTES = [
  'Objetivo: juntar las partes del traje, fabricarlo y salir.',
  'La nevada mata al contacto con la piel.',
  'Click en la barra elige ítem. Click en Mochila la abre.',
];

/**
 * Una fila por verbo. `mouse`/`pad` son listas de glifos y la etiqueta corta
 * de cada columna. No hay modo "solo teclado": el teclado acompaña al mouse.
 */
export const CONTROLS_ROWS = [
  {
    action: 'interact', label: 'Hacer',
    mouse: ['mouse'], mouseLabel: 'Click izq.',
    pad: ['a'], padLabel: 'A',
  },
  {
    action: 'hands', label: 'Manos',
    mouse: ['mouse_r'], mouseLabel: 'Click der.',
    pad: ['x'], padLabel: 'X',
  },
  {
    action: 'move', label: 'Mover',
    mouse: ['key_arrow'], mouseLabel: 'WASD / flechas',
    pad: ['stick', 'dpad'], padLabel: 'Stick / cruceta',
  },
  {
    action: 'item', label: 'Elegir ítem',
    mouse: ['key_1'], mouseLabel: 'Rueda, 1 a 8',
    pad: ['lb', 'rb'], padLabel: 'LB / RB',
  },
  {
    action: 'bag', label: 'Mochila',
    mouse: ['key_i'], mouseLabel: 'I / Tab',
    pad: ['y'], padLabel: 'Y',
  },
  {
    action: 'menu', label: 'Menú',
    mouse: ['key_esc'], mouseLabel: 'Esc',
    pad: ['start'], padLabel: 'Start',
  },
];

/** Todos los textos fijos de la pantalla de Controles (test de fuente). */
export function controlsTexts() {
  return [
    'CONTROLES',
    ...CONTROLS_HEADERS.map(([header]) => header),
    ...CONTROLS_ROWS.flatMap((row) => [row.label, row.mouseLabel, row.padLabel]),
    ...CONTROLS_NOTES,
    'Volver',
  ];
}

/** Dibuja los glifos de una columna alineados con el texto de 7 px. */
function drawGlyphRun(ctx, assets, names, x, y) {
  let cx = x;
  for (const name of names || []) {
    const size = glyphSize(assets, name);
    drawGlyph(ctx, assets, name, cx, y + Math.round((7 - size.h) / 2));
    cx += size.w + 3;
  }
  return cx;
}

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

/** Texto centrado en `cx`, con la sombra de la madera. */
function centerText(ctx, glyphs, text, cx, y, color, scale = 1) {
  const w = measureText(glyphs, text, scale);
  drawText(ctx, glyphs, Math.round(cx - w / 2), y, text, color, { scale, shadow: SH });
}

/** Primera frase de la descripcion del resultado (la linea de la receta). */
function itemFlavor(recipe) {
  const text = getItem(recipe.result).description;
  const end = text.indexOf('. ');
  return end > 0 ? text.slice(0, end + 1) : text;
}

/** Lista de lo que falta (rojo suave) que sigue en la linea siguiente si no entra. */
function drawWrappedNames(ctx, glyphs, text, x, y, firstX, width) {
  const right = x + width;
  let cx = firstX;
  let cy = y;
  let line = '';
  for (const word of String(text).split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && cx + measureText(glyphs, next) > right) {
      drawText(ctx, glyphs, cx, cy, line, FALTA, { shadow: SH });
      line = '';
      cx = x;
      cy += 10;
    }
    line = line ? `${line} ${word}` : word;
  }
  if (line) drawText(ctx, glyphs, cx, cy, line, FALTA, { shadow: SH });
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

export { moveSlot };
