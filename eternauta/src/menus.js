// Menus: titulo, pausa (inventario/fabricar/opciones) y panel de cofres.
import { drawText, measureText } from './font.js';
import { canvasOverlay } from './sprite.js';
import {
  OUT, INK, INK2, PAR, PAR2, AM2, AM3, SEL, GOOD, BAD, SNOW, WOOD1,
  panel, darkPanel, slot, icon, count, namePlate, arrow, dim, wrapLines,
} from './uiSkin.js';
import { drawPrompt, drawGlyph, glyphSize, promptWidth } from './glyphs.js';
import { Cursor, MENU_TABS, nextTab, moveSlot } from './menu.js';
import { canCraft, craft } from './crafting.js';
import { RECIPES } from './recipes.js';
import { getItem } from './items.js';
import {
  woodSign, selectBar, snowflake, sparkle, introAlpha, easeOut,
  CREAM, CREAM2, ROW_H, ROW_Y, SIGN_H,
} from './titleUi.js';

const VIEW_W = 480;
const VIEW_H = 270;

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

  update(dt, input) {
    this.t += dt;
    this.intro += dt;
    if (this.view !== 'main') {
      if (input.aPressed || input.bPressed || input.startPressed) {
        this.view = 'main';
        this.intro = 0;
      }
      this.draw();
      return null;
    }
    this.cursor.update(dt, input.menuMove || input.move);
    if (input.aPressed || input.startPressed) {
      const index = this.cursor.index;
      if (index === 0) return 'play';
      if (index === 1) return 'arena';
      this.view = index === 2 ? 'controls' : 'credits';
      this.intro = 0;
    }
    this.draw();
    return null;
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
    this.options.forEach((label, i) => {
      const selected = i === this.cursor.index;
      const baseY = sign.y + ROW_Y + i * ROW_H;
      const bob = selected ? Math.round(Math.sin(this.t * 3.1) * 1.2) : 0;
      if (selected) selectBar(ctx, sign.x + 7, baseY - 1 + bob, sign.w - 14, ROW_H);
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
    ctx.fillRect(26, 200, VIEW_W - 52, 1);
    const title = 'CONTROLES';
    drawText(ctx, glyphs, Math.round((VIEW_W - measureText(glyphs, title, 2)) / 2), 26,
      title, CREAM, { scale: 2, shadow: '#5a2e14' });
    const rows = [
      ['a', 'Hablar, mirar, confirmar', 'key_e'],
      ['b', 'Volver, cerrar', 'key_esc'],
      ['x', 'Usar el objeto elegido', 'key_f'],
      ['y', 'Abrir la mochila', 'key_i'],
      ['lb', 'Slot anterior', 'key_q'],
      ['rb', 'Slot siguiente', 'key_r'],
      ['start', 'Menu / pausa', 'key_esc'],
      ['dpad', 'Mover con la cruceta', 'key_arrow'],
      ['stick', 'Mover con el stick', 'key_arrow'],
    ];
    rows.forEach(([pad, label, key], i) => {
      const y = 54 + i * 17;
      drawGlyph(ctx, this.assets, pad, 56, y + 2);
      drawText(ctx, glyphs, 86, y, label, CREAM, { shadow: '#4a2a18' });
      drawGlyph(ctx, this.assets, key, 330, y - 1);
      drawText(ctx, glyphs, 350, y, keyLabel(key), CREAM2, { shadow: '#4a2a18' });
    });
    drawText(ctx, glyphs, 46, 208,
      'Objetivo: juntar las partes del traje, fabricarlo y salir.', CREAM2,
      { shadow: '#4a2a18' });
    drawText(ctx, glyphs, 46, 220, 'La nevada mata al contacto con la piel.',
      CREAM2, { shadow: '#4a2a18' });
    const bw = promptWidth(this.assets, device, 'back', 'Volver');
    drawPrompt(ctx, this.assets, device, 'back', VIEW_W - bw - 30, 236, this.t,
      { label: 'Volver' });
  }

  drawCredits(ctx, glyphs, device) {
    const w = 300;
    const h = 162;
    const x = Math.round((VIEW_W - w) / 2);
    const y = 52;
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
    const label = 'Volver';
    const bw = promptWidth(this.assets, device, 'back', label);
    drawPrompt(ctx, this.assets, device, 'back', Math.round((VIEW_W - bw) / 2),
      y + h - 24, this.t, { label });
  }
}

function keyLabel(key) {
  return {
    key_e: 'E / Enter', key_esc: 'Esc', key_f: 'F', key_i: 'I / Tab',
    key_q: 'Q', key_r: 'R', key_arrow: 'WASD / flechas',
  }[key] || key;
}

// ------------------------------------------------------------- menu de pausa
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
    this.cursor.update(dt, input.menuMove || input.move);
    if (this.tab === 0) this.inventoryUpdate(input);
    else if (this.tab === 1) this.craftUpdate(input);
    else this.optionsUpdate(input);
    this.draw();
    return this.pending || null;
  }

  inventoryUpdate(input) {
    if (!input.aPressed) return;
    const bag = this.game.inventory[this.cursor.index];
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
    if (this.cursor.index !== hand) {
      const slots = this.game.inventory.slice();
      [slots[this.cursor.index], slots[hand]] = [slots[hand], slots[this.cursor.index]];
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
    const recipe = RECIPES[this.recipeIndex];
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
    this.pending = this.optionIndex === 0 ? 'close' : 'title';
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
      const x = 54 + i * 124;
      const w = 116;
      ctx.fillStyle = OUT;
      ctx.fillRect(x, 28, w, 17);
      ctx.fillStyle = active ? '#b07a42' : WOOD1;
      ctx.fillRect(x + 1, 29, w - 2, 15);
      if (active) {
        ctx.fillStyle = AM3;
        ctx.fillRect(x + 1, 29, w - 2, 1);
      }
      const color = active ? '#fff0c0' : '#e8c890';
      drawText(ctx, glyphs, Math.round(x + (w - measureText(glyphs, label)) / 2), 33,
        label, color, { shadow: active ? '#5a3420' : '#2e1a10' });
    });
    if (this.tab === 0) this.drawInventory(ctx, glyphs);
    else if (this.tab === 1) this.drawCrafting(ctx, glyphs);
    else this.drawOptions(ctx, glyphs);
    this.drawHints(ctx, device);
    this.ui.commit();
  }

  drawHints(ctx, device) {
    const actions = [
      { action: 'prev', label: 'Pestaña' },
      { action: 'interact', label: this.tab === 2 ? 'Elegir' : (this.tab === 1 ? 'Fabricar' : 'Elegir') },
      { action: 'back', label: 'Cerrar' },
    ];
    let total = 0;
    for (const a of actions) total += promptWidth(this.assets, device, a.action, a.label) + 9;
    total -= 9;
    const x = VIEW_W - total - 58;
    const y = VIEW_H - 30;
    darkPanel(ctx, x - 8, y - 4, total + 16, 16, 0.7);
    let cx = x;
    for (const a of actions) {
      const w = drawPrompt(ctx, this.assets, device, a.action, cx, y - 1, this.t,
        { label: a.label, bob: false });
      cx += w + 9;
    }
  }

  drawInventory(ctx, glyphs) {
    const size = 20;
    const gap = 3;
    const gridW = 6 * size + 5 * gap;
    const x0 = Math.round((VIEW_W - gridW) / 2);
    const y0 = 52;
    for (let i = 0; i < this.game.inventory.length; i++) {
      const col = i % 6;
      const row = Math.floor(i / 6);
      const selected = i === this.cursor.index;
      const bob = selected ? Math.round(Math.sin(this.t * 6)) : 0;
      const x = x0 + col * (size + gap);
      const y = y0 + row * (size + gap) + bob;
      slot(ctx, x, y, size, selected);
      const bag = this.game.inventory[i];
      if (bag) {
        icon(ctx, this.assets, bag.id, x + 2, y + 2, 16);
        count(ctx, glyphs, bag.count, x + 13, y + 12);
      }
    }
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
        ? (this.game.hasSuit ? 'A: sacarse el traje' : 'A: ponerse el traje')
        : 'A: llevar a la mano';
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
    RECIPES.forEach((recipe, i) => {
      const selected = i === this.recipeIndex;
      const y = 64 + i * 34;
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
    options.forEach((label, i) => {
      const selected = i === this.optionIndex;
      const y = 80 + i * 30;
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
    const items = this.container ? this.container.items : [];
    if (items.length) {
      const mv = input.menuMove || input.move;
      if (mv.x < -0.4 || mv.y < -0.4) {
        this.index = (this.index + items.length - 1) % items.length;
      } else if (mv.x > 0.4 || mv.y > 0.4) {
        this.index = (this.index + 1) % items.length;
      }
      this.index = Math.min(this.index, items.length - 1);
      if (input.aPressed) {
        const entry = items[this.index];
        const result = this.game.takeFromContainer(this.container, entry);
        if (!result) this.game.showToast('No hay lugar en la mochila.');
        if (this.container.items.length === 0) this.index = 0;
      }
    }
    this.draw();
    return null;
  }

  draw() {
    if (!this.ui.mesh.visible || !this.container) return;
    const { ctx } = this.ui;
    const glyphs = this.assets.font.glyphs;
    const device = this.game.input.device;
    this.ui.clear();
    dim(ctx, 0.5);
    const w = 300;
    const h = 132;
    const x = Math.round((VIEW_W - w) / 2);
    const y = Math.round((VIEW_H - h) / 2) - 10;
    panel(ctx, x, y, w, h);
    namePlate(ctx, glyphs, this.container.name, x + w / 2, y + 10);
    const items = this.container.items;
    const size = 20;
    const gap = 4;
    const total = Math.max(4, items.length) * (size + gap) - gap;
    const x0 = Math.round(x + (w - total) / 2);
    const sy = y + 34;
    for (let i = 0; i < Math.max(4, items.length); i++) {
      const selected = i === this.index && items.length > 0;
      const bob = selected ? Math.round(Math.sin(this.t * 6)) : 0;
      slot(ctx, x0 + i * (size + gap), sy + bob, size, selected);
      if (items[i]) {
        icon(ctx, this.assets, items[i].id || items[i], x0 + i * (size + gap) + 2, sy + 2 + bob);
        const n = items[i].n || 1;
        if (n > 1) count(ctx, glyphs, n, x0 + i * (size + gap) + 13, sy + 12 + bob);
      }
    }
    if (items.length) {
      const raw = items[this.index];
      const item = getItem(raw.id || raw);
      drawText(ctx, glyphs, x + 16, y + 70, item.name, SEL, { shadow: '#f8e8c0' });
      const lines = wrapLines(glyphs, item.description, w - 32, 2);
      lines.forEach((line, i) => {
        drawText(ctx, glyphs, x + 16, y + 82 + i * 10, line, INK, { shadow: '#f8e8c0' });
      });
      const hintW = promptWidth(this.assets, device, 'interact', 'Agarrar');
      drawPrompt(ctx, this.assets, device, 'interact', x + 16, y + h - 22, this.t,
        { label: 'Agarrar' });
      void hintW;
    } else {
      drawText(ctx, glyphs, x + 16, y + 70, 'No queda nada.', INK2, {});
    }
    const bw = promptWidth(this.assets, device, 'back', 'Cerrar');
    drawPrompt(ctx, this.assets, device, 'back', x + w - bw - 16, y + h - 22, this.t,
      { label: 'Cerrar' });
    this.ui.commit();
  }
}

export { moveSlot };
