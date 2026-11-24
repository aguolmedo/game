// El taller de la casa: el cartel de madera con las cuatro estaciones de mejora
// (maqueta: art/concept/out/roguelike/casa_taller_favalli.png). UI de canvas 1x
// sobre la vista de 480x270, como los menus de src/menus.js.
//
// La lógica de qué se puede comprar vive en src/run/upgrades.js; acá solo se
// dibuja, se navega y se llama a buyUpgrade(). El modelo (`tallerModel`) es puro
// para poder probarlo sin DOM.
import { drawText, measureText, wrapText } from './font.js';
import { canvasOverlay } from './sprite.js';
import { GLYPH_GAP, drawGlyph, glyphSize } from './glyphs.js';
import {
  STATIONS, STATION_INFO, UPGRADES, upgradeState, canAfford, nextUpgrade, buyUpgrade,
} from './run/upgrades.js';
import { loadSave } from './run/save.js';
import { LOOT_ITEM, LOOT_NAME } from './run/loot.js';
import {
  woodSign, carve, selectBar,
  CREAM, CREAM2, AM3, FALTA, OKC, SH, FACE_HI, SEAM, WOOD1, WOOD2, CARVE, CARVE_D,
} from './titleUi.js';
import { pointInRect } from './geom.js';
import { OUT, TEXT } from './uiSkin.js';
import { mousePoint } from './uiHit.js';

export const VIEW_W = 480;
export const VIEW_H = 270;

// Medidas exactas de la maqueta (funcion `taller` de roguelike_casa.py).
export const TALLER_BOX = { x: 40, y: 44, w: 400, h: 176 };
export const TAB_W = 88;
export const TAB_GAP = 6;
export const TAB_X0 = TALLER_BOX.x + (TALLER_BOX.w - (4 * TAB_W + 3 * TAB_GAP)) / 2;
export const ROW_W = 168;
export const ROW_H = 26;
export const ROW_STEP = 30;
export const ROW_X = TALLER_BOX.x + 16;
export const ROW_Y0 = TALLER_BOX.y + 32;
export const FICHA = { x: TALLER_BOX.x + 200, y: TALLER_BOX.y + 18, w: 182 };
export const BUTTON = { x: FICHA.x + 43, y: TALLER_BOX.y + TALLER_BOX.h - 30, w: 96, h: 20 };
export const PROMPT_Y = TALLER_BOX.y + TALLER_BOX.h + 12;

// ------------------------------------------------------------ modelo puro
export function stationIndex(station) {
  const i = STATIONS.indexOf(station);
  return i < 0 ? 0 : i;
}

export function cycleStation(station, dir) {
  const i = stationIndex(station);
  return STATIONS[(i + dir + STATIONS.length) % STATIONS.length];
}

export function moveSel(sel, dy, count = 3) {
  const n = Math.max(0, Math.trunc(count));
  if (n === 0) return 0;
  const cur = Math.max(0, Math.min(n - 1, Number.isInteger(sel) ? sel : 0));
  return Math.max(0, Math.min(n - 1, cur + dy));
}

/** Nivel comprado (0..3), defensivo. */
function levelOf(save, station) {
  const n = save?.mejoras?.[station];
  return Number.isInteger(n) && n > 0 ? Math.min(n, 3) : 0;
}

/**
 * Todo lo que dibuja el taller para (save, estacion, fila elegida).
 * Puro: no toca el save ni el DOM.
 */
export function tallerModel(save, station, sel = 0) {
  const st = STATIONS.includes(station) ? station : 'favalli';
  const info = STATION_INFO[st];
  const list = UPGRADES[st];
  const level = levelOf(save, st);
  const index = Math.max(0, Math.min(list.length - 1, Number.isInteger(sel) ? sel : 0));
  const rows = list.map((up, i) => {
    const state = upgradeState(save, st, i);
    const cost = Object.entries(up.cost).map(([kind, need]) => {
      const have = Number(save?.botin?.[kind]) || 0;
      return {
        kind, need, have, ok: have >= need,
        item: LOOT_ITEM[kind] || kind, label: LOOT_NAME[kind] || kind,
      };
    });
    return {
      id: up.id, name: up.name, desc: up.desc, cost, state,
      index: i, selected: i === index,
    };
  });
  const selected = rows[index];
  const affordable = canAfford(save, list[index].cost);
  const canBuy = selected.state === 'disponible' && affordable;
  return {
    station: st,
    who: info.who,
    what: info.what,
    level,
    index,
    rows,
    selected,
    tabs: STATIONS.map((s) => ({
      station: s, who: STATION_INFO[s].who, what: STATION_INFO[s].what, active: s === st,
    })),
    canBuy,
    buttonLabel: canBuy ? 'Hacer' : 'Falta botín',
    next: nextUpgrade(save, st)?.id || null,
  };
}

// ------------------------------------------------------------ geometria
export function tallerTabRects() {
  return STATIONS.map((station, i) => ({
    x: TAB_X0 + i * (TAB_W + TAB_GAP), y: TALLER_BOX.y - 21, w: TAB_W, h: 27, station,
  }));
}

export function tallerRowRects(count = 3) {
  const n = Math.max(0, Math.trunc(count));
  const rects = [];
  for (let i = 0; i < n; i++) {
    rects.push({ x: ROW_X, y: ROW_Y0 + i * ROW_STEP, w: ROW_W, h: ROW_H });
  }
  return rects;
}

export function tallerButtonRect() {
  return { ...BUTTON };
}

/** Prompts de abajo segun el dispositivo (Q/LB Estacion, Hacer, Esc/B Cerrar). */
export function tallerPrompts(device) {
  if (device === 'pad') {
    return [
      { glyph: 'lb', label: 'Estación' },
      { glyph: 'a', label: 'Hacer' },
      { glyph: 'b', label: 'Cerrar' },
    ];
  }
  return [
    { glyph: 'key_q', label: 'Estación' },
    { glyph: 'mouse', label: 'Hacer' },
    { glyph: 'key_esc', label: 'Cerrar' },
  ];
}

function promptItemWidth(assets, glyph, label) {
  return glyphSize(assets, glyph).w + GLYPH_GAP + measureText(assets.font.glyphs, label);
}

export function tallerPromptLayout(assets, device, right = TALLER_BOX.x + TALLER_BOX.w,
  y = PROMPT_Y) {
  const items = tallerPrompts(device).map((item) => ({
    ...item, width: promptItemWidth(assets, item.glyph, item.label),
  }));
  const content = items.reduce((sum, item) => sum + item.width, 0) + 10 * (items.length - 1);
  const total = content + 10;
  let cx = Math.round(right) - total + 5;
  for (const item of items) {
    item.x = cx;
    item.y = y;
    cx += item.width + 10;
  }
  return { x: Math.round(right) - total, y, total, items };
}

// ------------------------------------------------------------ dibujo
function drawHead(ctx, assets, station, x, y) {
  if (station === 'luz') {
    const raw = assets.itemsData?.frames?.mejora_bengala;
    if (!raw) return;
    const f = Array.isArray(raw) ? { x: raw[0], y: raw[1], w: raw[2], h: raw[3] } : raw;
    ctx.drawImage(assets.items.image, f.x, f.y, f.w, f.h, x, y, 16, 16);
    return;
  }
  const who = station;
  const block = assets.chars2Data?.blocks?.[who];
  if (!block) return;
  // Frame quieto (6), mirando abajo (fila 0): solo la cabeza 16x16.
  ctx.drawImage(assets.chars2.image, block.x + 6 * 16, 0, 16, 16, x, y, 16, 16);
}

function drawItemIcon(ctx, assets, id, x, y, size = 16, alpha = 1) {
  const raw = assets.itemsData?.frames?.[id];
  if (!raw) return;
  const f = Array.isArray(raw) ? { x: raw[0], y: raw[1], w: raw[2], h: raw[3] } : raw;
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = alpha;
  ctx.drawImage(assets.items.image, f.x, f.y, f.w, f.h, x, y, size, size);
  ctx.globalAlpha = prev;
}

/** Tilde verde de la mejora hecha (mismo pixel-art que la maqueta). */
function drawCheck(ctx, x, y) {
  for (const [dx, dy] of [[0, 2], [1, 3], [2, 4], [3, 3], [4, 2], [5, 1], [6, 0]]) {
    ctx.fillStyle = OKC;
    ctx.fillRect(x + dx, y + dy, 1, 2);
  }
}

/** Candadito tallado de la mejora bloqueada. */
function drawLock(ctx, x, y) {
  ctx.fillStyle = CARVE_D;
  ctx.fillRect(x, y + 3, 6, 5);
  ctx.fillRect(x + 1, y, 4, 3);
  ctx.fillStyle = CARVE;
  ctx.fillRect(x + 2, y + 1, 2, 2);
}

/** Barra de prompts oscura, abajo a la derecha del cartel. */
function drawPrompts(ctx, assets, device, t) {
  const glyphs = assets.font.glyphs;
  const layout = tallerPromptLayout(assets, device);
  ctx.fillStyle = 'rgba(12, 12, 24, 0.78)';
  ctx.fillRect(layout.x, layout.y - 4, layout.total, 17);
  ctx.fillStyle = 'rgba(255, 207, 110, 0.35)';
  ctx.fillRect(layout.x, layout.y - 4, layout.total, 1);
  for (const item of layout.items) {
    const size = glyphSize(assets, item.glyph);
    drawGlyph(ctx, assets, item.glyph, item.x, item.y - 1);
    drawText(ctx, glyphs, item.x + size.w + GLYPH_GAP,
      item.y + Math.round((size.h - 7) / 2), item.label, TEXT, { outline: OUT });
  }
  void t;
}

function drawTab(ctx, assets, model, tab, active) {
  const rect = tallerTabRects().find((r) => r.station === tab.station);
  const glyphs = assets.font.glyphs;
  if (active) {
    woodSign(ctx, rect.x, TALLER_BOX.y - 21, TAB_W, 27, {
      seams: 0, nails: false, shadow: false, snow: false, face: FACE_HI,
    });
    ctx.fillStyle = FACE_HI;
    ctx.fillRect(rect.x + 4, TALLER_BOX.y + 2, TAB_W - 8, 4);
  } else {
    woodSign(ctx, rect.x, TALLER_BOX.y - 18, TAB_W, 24, {
      seams: 0, nails: false, snow: false,
    });
  }
  const hy = TALLER_BOX.y - (active ? 19 : 16);
  drawHead(ctx, assets, tab.station, rect.x + 6, hy + 1);
  const color = active ? CREAM : CREAM2;
  drawText(ctx, glyphs, rect.x + 26, hy + 6, tab.who, color, { shadow: SH });
  void model;
}

// ------------------------------------------------------------ el panel
export class TallerPanel {
  constructor(scene, assets, game) {
    this.assets = assets;
    this.game = game;
    this.ui = canvasOverlay(VIEW_W, VIEW_H, 56);
    this.ui.mesh.visible = false;
    scene.add(this.ui.mesh);
    this.open = false;
    this.station = 'favalli';
    this.sel = 0;
    this.save = null;
    this.t = 0;
    this.moveCooldown = 0;
    this.qHeld = false;
  }

  get visible() { return this.open; }

  show(station = 'favalli') {
    // El save en memoria manda: si el storage falló, el taller no se vacía (M3).
    this.save = this.game.baseSave || loadSave();
    this.station = STATIONS.includes(station) ? station : 'favalli';
    this.sel = Math.max(0, Math.min(2, levelOf(this.save, this.station)));
    this.open = true;
    this.ui.mesh.visible = true;
    this.moveCooldown = 0;
    this.t = 0;
    this.draw();
  }

  hide() {
    this.open = false;
    this.ui.mesh.visible = false;
  }

  model() {
    return tallerModel(this.save, this.station, this.sel);
  }

  /** Mouse: hover en filas y pestañas, click en pestañas, filas y boton. */
  pointerUpdate(input, point) {
    const click = input.click && typeof this.game.screenToView === 'function'
      ? this.game.screenToView(input.click.x, input.click.y)
      : null;
    const rows = tallerRowRects();
    const tabs = tallerTabRects();
    const button = tallerButtonRect();
    const hoverRow = point ? rows.findIndex((r) => pointInRect(point, r)) : -1;
    if (hoverRow >= 0) this.sel = hoverRow;
    const overTab = point ? tabs.findIndex((r) => pointInRect(point, r)) : -1;
    const overButton = point ? pointInRect(point, button) : false;
    if (this.game.mouseCursor) {
      const hand = overTab >= 0 || hoverRow >= 0 || overButton;
      this.game.mouseCursor.setState(hand ? 'hand' : 'arrow');
    }
    if (!click) return false;
    const clickTab = tabs.findIndex((r) => pointInRect(click, r));
    if (clickTab >= 0) {
      this.setStation(tabs[clickTab].station);
      return true;
    }
    const clickRow = rows.findIndex((r) => pointInRect(click, r));
    if (clickRow >= 0) {
      this.sel = clickRow;
      return true;
    }
    if (pointInRect(click, button)) {
      this.buy();
      return true;
    }
    return false;
  }

  setStation(station) {
    this.station = STATIONS.includes(station) ? station : this.station;
    this.save = this.game.baseSave || loadSave();
    this.sel = Math.max(0, Math.min(2, levelOf(this.save, this.station)));
  }

  /** Compra la mejora elegida si es la disponible y alcanza el botin. */
  buy() {
    const row = this.model().selected;
    // Solo se compra la siguiente: una fila hecha o bloqueada no hace nada.
    if (row.state !== 'disponible') {
      this.game.showToast(row.state === 'hecho' ? 'Ya está.' : 'Primero la anterior.');
      return false;
    }
    const save = this.game.baseSave || loadSave();
    const upgrade = nextUpgrade(save, this.station);
    const result = buyUpgrade(save, this.station);
    if (!result.ok) {
      this.game.showToast(result.reason === 'falta' ? 'Falta botín.' : 'No hay más mejoras.');
      this.save = save;
      return false;
    }
    // game.persist deja el save en memoria y avisa si el storage falla (M3).
    if (typeof this.game.persist === 'function') this.game.persist(result.save);
    this.game.baseSave = result.save;
    this.game.baseBotin = { ...result.save.botin };
    this.save = result.save;
    this.sel = Math.max(0, Math.min(2, levelOf(result.save, this.station)));
    this.game.showToast(`¡Listo! ${upgrade.name}.`);
    this.game.emit?.('upgrade', { station: this.station, id: upgrade.id });
    return true;
  }

  /** 'close' cuando se cierra, o null. */
  update(dt, input) {
    if (!this.open) return null;
    this.t += dt;
    this.moveCooldown = Math.max(0, this.moveCooldown - dt);
    if (input.bPressed || input.startPressed) {
      this.hide();
      return 'close';
    }

    const point = mousePoint(this.game, input);
    if (input.device === 'mouse' && this.pointerUpdate(input, point)) {
      this.draw();
      return null;
    }

    // Q (o LB/RB) cambia de estación; flechas arriba/abajo, de fila.
    const keys = this.game.input?.keys;
    const q = Boolean(keys && typeof keys.has === 'function' && keys.has('KeyQ'));
    if (q && !this.qHeld) this.setStation(cycleStation(this.station, 1));
    this.qHeld = q;
    if (input.nextHotbar) this.setStation(cycleStation(this.station, 1));
    if (input.prevHotbar) this.setStation(cycleStation(this.station, -1));

    const mv = input.menuMove || input.move || { x: 0, y: 0 };
    if (this.moveCooldown === 0) {
      if (mv.x > 0.5) {
        this.setStation(cycleStation(this.station, 1));
        this.moveCooldown = 0.18;
      } else if (mv.x < -0.5) {
        this.setStation(cycleStation(this.station, -1));
        this.moveCooldown = 0.18;
      } else if (mv.y < -0.5) {
        this.sel = moveSel(this.sel, -1);
        this.moveCooldown = 0.18;
      } else if (mv.y > 0.5) {
        this.sel = moveSel(this.sel, 1);
        this.moveCooldown = 0.18;
      }
    }
    if (input.aPressed || input.padAPressed) this.buy();
    this.draw();
    return null;
  }

  draw() {
    if (!this.ui.mesh.visible || !this.open) return;
    const { ctx } = this.ui;
    const glyphs = this.assets.font.glyphs;
    const device = this.game.input.device;
    const model = this.model();
    this.ui.clear();
    ctx.fillStyle = 'rgba(8, 10, 20, 0.55)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // Pestañas de atrás, el cartel, y la elegida por encima (como la maqueta).
    for (const tab of model.tabs) if (!tab.active) drawTab(ctx, this.assets, model, tab, false);
    const { x, y, w, h } = TALLER_BOX;
    woodSign(ctx, x, y, w, h, { seams: 20, snow: false });
    for (const tab of model.tabs) if (tab.active) drawTab(ctx, this.assets, model, tab, true);

    // Izquierda: el camino de tres mejoras.
    drawText(ctx, glyphs, ROW_X, y + 18, model.what, CREAM2, { shadow: SH });
    tallerRowRects(model.rows.length).forEach((rect, i) => {
      const row = model.rows[i];
      carve(ctx, rect.x, rect.y, rect.w, rect.h);
      if (row.selected) selectBar(ctx, rect.x + 2, rect.y + 2, rect.w - 3, rect.h - 3);
      const dim = row.state === 'bloqueado' ? 0.35 : 1;
      drawItemIcon(ctx, this.assets, `mejora_${row.id}`, rect.x + 5, rect.y + 5, 16, dim);
      drawText(ctx, glyphs, rect.x + 26, rect.y + 9, row.name,
        dim < 1 ? CREAM2 : CREAM, { shadow: SH });
      if (row.state === 'hecho') drawCheck(ctx, rect.x + 154, rect.y + 11);
      else if (row.state === 'bloqueado') drawLock(ctx, rect.x + 155, rect.y + 9);
    });

    // Derecha: la ficha de la elegida.
    const fx = FICHA.x;
    const fy = FICHA.y;
    const fw = FICHA.w;
    const sel = model.selected;
    carve(ctx, fx, fy, 38, 38);
    drawItemIcon(ctx, this.assets, `mejora_${sel.id}`, fx + 3, fy + 3, 32);
    drawText(ctx, glyphs, fx + 46, fy + 6, sel.name, CREAM, { shadow: SH });
    drawText(ctx, glyphs, fx + 46, fy + 18, `${model.who}, ${model.what.toLowerCase()}`,
      AM3, { shadow: SH });
    const descLines = wrapText(glyphs, sel.desc || '', fw, { spacing: 1, maxLines: 2 });
    descLines.forEach((line, i) => {
      drawText(ctx, glyphs, fx, fy + 48 + i * 11, line, CREAM2, { shadow: SH });
    });

    const cy = fy + 78;
    ctx.fillStyle = SEAM;
    ctx.fillRect(fx, cy, fw, 1);
    drawText(ctx, glyphs, fx, cy + 6, 'Con lo que trajiste de afuera', CREAM2, { shadow: SH });
    sel.cost.forEach((entry, j) => {
      const cx = fx + j * 100;
      carve(ctx, cx, cy + 18, 18, 18);
      drawItemIcon(ctx, this.assets, entry.item, cx + 1, cy + 19, 16);
      drawText(ctx, glyphs, cx + 24, cy + 24, `${entry.have}/${entry.need}`,
        entry.ok ? OKC : FALTA, { shadow: SH });
    });

    // Boton Hacer / Falta botin.
    woodSign(ctx, BUTTON.x, BUTTON.y, BUTTON.w, BUTTON.h, {
      seams: 0, nails: false, snow: false, shadow: false, face: model.canBuy ? WOOD2 : WOOD1,
    });
    const label = model.buttonLabel;
    drawText(ctx, glyphs, Math.round(BUTTON.x + (BUTTON.w - measureText(glyphs, label)) / 2),
      BUTTON.y + 7, label, model.canBuy ? CREAM : CREAM2, { shadow: SH });

    drawPrompts(ctx, this.assets, device, this.t);
    this.ui.commit();
  }

  state() {
    if (!this.open) return { open: false };
    const model = this.model();
    return {
      open: true,
      station: this.station,
      sel: this.sel,
      who: model.who,
      canBuy: model.canBuy,
      rows: model.rows.map((r) => ({ id: r.id, state: r.state })),
    };
  }
}


export default TallerPanel;
