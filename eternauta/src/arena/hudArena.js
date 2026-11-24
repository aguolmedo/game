// HUD de la arena: paneles, carteles, toasts, mira y pantallas de muerte y
// resultado. Todo se dibuja en el canvas de UI de 480x270.
// Funciones que reciben la escena.
import {
  drawText, drawCentered, measureText,
} from '../font.js';
import {
  OUT, INK2, PAR, AM3, SNOW, darkPanel,
  WHITE, WARN, SLOT_DARK, SLOT_EDGE,
} from '../uiSkin.js';
import { drawGlyph, glyphSize } from '../glyphs.js';
import { VIEW_W, VIEW_H, TRAJE_PANEL, EXTRA_PANEL, AMMO_PANEL, hintBarRect } from './hudLayout.js';
import { formatPoints } from './points.js';
import { reloadShells, AMMO_PACK, AMMO_PRICE } from './weapon.js';
import { tallyText } from './waves.js';
import { tallyLayout, drawTally } from './tally.js';
import { drawDeathPanel } from './deathPanel.js';
import { drawResultScreen } from './resultScreen.js';
import { exitPoint } from './exit.js';
import { LOOT_ITEM } from './lootRun.js';
import { ARENA } from './config.js';
import { clamp } from './util.js';
import { isOverlay } from './runMode.js';
import { FLAG } from '../data/flags.js';

const SHOP_TEXT = `${AMMO_PACK} balas — ${AMMO_PRICE} puntos`;
const SHOP_LABEL = `Comprar ${AMMO_PACK} balas — ${AMMO_PRICE} puntos`;
const MOCHILA_CYAN = '#8ff4ff';
const TALLY_INK = '#080810';
const AMBER_TRACK = 'rgba(255, 207, 110, 0.25)';
const OUT_HALF = 'rgba(26, 20, 38, 0.5)';
const OUT_MORE = 'rgba(26, 20, 38, 0.55)';
const PATCH_BG = '#8a4a2e';
const PATCH_LIGHT = '#c0703e';
const PATCH_SEAM = '#3a2030';
const PATCH_OFF = 'rgba(120, 100, 110, 0.35)';
const SHELL_DARK = '#3a2a18';
const SHELL_BRASS = '#c8a24a';
const SHELL_HI = '#f0d488';
const CROSS_SHADOW = 'rgba(10, 10, 20, 0.75)';
const BANNER_EDGE = '#d8c294';
const BANNER_PAPER = '#f2e6c4';
const BANNER_SHADE = '#c9ac7c';
const BANNER_TITLE = '#8a3a20';
const BANNER_INK = '#2a1a20';
const MOCHILA_GLOW = 'rgba(120, 240, 255, 0.38)';
const MOCHILA_GLOW_END = 'rgba(120, 240, 255, 0)';
const MOCHILA_SPARK_HI = '#d8fcff';
const MOCHILA_SPARK = '#7fe9ff';
const ARROW_SHADOW = 'rgba(10, 20, 30, 0.8)';
const FIRE_GLOW = 'rgba(255, 120, 40, 0.30)';
const FIRE_YELLOW = '#ffd76a';
const FIRE_ORANGE = '#ff8a3a';


export function toast(state, view, svc, text, life = 2.4) {
  view.toasts.push({ text, life });
  if (view.toasts.length > 3) view.toasts.shift();
}

export function updateToasts(state, view, svc, dt) {
  // Compacta en el lugar: sin arrays nuevos por cuadro.
  const list = view.toasts;
  let keep = 0;
  for (let i = 0; i < list.length; i++) {
    const toast = list[i];
    toast.life -= dt;
    if (toast.life > 0) list[keep++] = toast;
  }
  list.length = keep;
}

/** Pase de luz debajo del HUD; lo llama el render (applyCamera), no el update.
 *  Con la viñeta o el resultado tapando la escena se saltea: el canvas queda
 *  con el último mapa de luz y se ahorra el redibujado. */
export function lightPass(state, view, svc) {
  if (isOverlay(state.mode)) return;
  view.light.setMode(svc.game.flags[FLAG.APAGON] ? 'apagon' : 'electrica');
  view.light.setCamera(view.cam.x, view.cam.y);
  view.lightUi.mesh.position.set(view.cam.x + VIEW_W / 2, view.cam.y + VIEW_H / 2, 20);
  view.lightUi.clear();
  view.light.draw(view.lightUi.ctx, state.t, view.player);
  // La mochila de otra vez no toma la luz de la noche: se dibuja encima.
  svc.drawMochilaWorld(view.lightUi.ctx);
  view.lightUi.commit();
}

export function drawHud(state, view, svc, input) {
  const { ctx } = view.ui;
  view.ui.mesh.visible = true;
  view.ui.clear();
  const device = input.device || 'keyboard';

  const mode = state.mode;
  if (!isOverlay(mode)) {
    svc.drawShopSign(ctx);
    svc.drawTop(ctx);
    svc.drawBag(ctx);
    svc.drawBottom(ctx);
    view.shooting.drawAimLine(ctx, view.player, state.aim, view.cam, input);
    svc.drawCrosshair(ctx);
    svc.drawHints(ctx, device);
    svc.drawPatchBar(ctx);
    svc.drawExitSign(ctx);
    svc.drawFires(ctx);
    svc.drawMochilaArrow(ctx);
    svc.drawToasts(ctx);
    if (mode === 'banner') svc.drawBanner(ctx);
    if (state.weapon.mag <= 0 && state.weapon.reserve <= 0
      && Math.floor(state.t * 2.5) % 2 === 0) {
      drawCentered(ctx, svc.assets.font.glyphs, '¡Sin balas!', 44, WARN,
        { outline: OUT, scale: 2 });
    }
  }
  if (mode === 'dying') svc.drawVignette(ctx, device);
  if (mode === 'result') svc.drawResult(ctx, device);
  view.ui.commit();
}

export function drawTop(state, view, svc, ctx) {
  const glyphs = svc.assets.font.glyphs;
  const tally = tallyText(state.round);
  const gap = 3;
  const tallyW = tally.full * (4 * gap + 3) + tally.rest * gap;
  const rw = Math.max(46, tallyW + 18);
  darkPanel(ctx, 6, 5, rw, 27, 0.7);
  drawText(ctx, glyphs, 10, 8, 'RONDA', AM3, { outline: OUT });
  drawTally(ctx, state.round, 6 + Math.round(rw / 2), 21, 10, PAR, TALLY_INK);

  const text = formatPoints(state.points.score);
  const tw = measureText(glyphs, text);
  const pw = Math.max(60, tw + 24);
  const px = VIEW_W - 6 - pw;
  darkPanel(ctx, px, 5, pw, 27, 0.7);
  drawText(ctx, glyphs, px + 6, 8, 'PUNTOS', AM3, { outline: OUT });
  drawText(ctx, glyphs, px + pw - 6 - tw, 15, text, PAR, { outline: OUT });
}

/** La bolsa de la salida: 4 íconos chicos con su número, bajo los puntos. */
export function drawBag(state, view, svc, ctx) {
  const glyphs = svc.assets.font.glyphs;
  const kinds = ['chatarra', 'goma', 'nafta', 'pieza'];
  const cell = 23;
  const pw = 10 + kinds.length * cell;
  const px = VIEW_W - 6 - pw;
  const py = 34;
  darkPanel(ctx, px, py, pw, 16, 0.7);
  kinds.forEach((kind, i) => {
    const x = px + 5 + i * cell;
    const frame = svc.assets.itemsData.frames[LOOT_ITEM[kind]];
    if (frame) {
      ctx.drawImage(svc.assets.items.image,
        frame[0], frame[1], frame[2], frame[3], x, py + 4, 8, 8);
    }
    const n = Number(state.bag[kind]) || 0;
    drawText(ctx, glyphs, x + 9, py + 5, String(n), n > 0 ? PAR : INK2,
      { outline: OUT });
  });
}

export function drawBottom(state, view, svc, ctx) {
  const glyphs = svc.assets.font.glyphs;
  // Integridad y tiras de goma.
  const tp = TRAJE_PANEL;
  darkPanel(ctx, tp.x, tp.y, tp.w, tp.h, 0.7);
  drawText(ctx, glyphs, tp.x + 4, tp.y + 3, 'TRAJE', AM3, { outline: OUT });
  for (let i = 0; i < state.integrityMax; i++) {
    svc.drawPatchIcon(ctx, tp.x + 4 + i * 12, tp.y + 13, i < state.integrity);
  }
  drawText(ctx, glyphs, tp.x + 54, tp.y + 3, 'TIRAS', AM3, { outline: OUT });
  drawText(ctx, glyphs, tp.x + 58, tp.y + 14, `x${state.strips}`, state.strips > 0 ? PAR : INK2,
    { outline: OUT });
  svc.drawConsumables(ctx);

  // Munición: 5 casquillos + reserva.
  const ap = AMMO_PANEL;
  darkPanel(ctx, ap.x, ap.y, ap.w, ap.h, 0.7);
  drawText(ctx, glyphs, ap.x + 5, ap.y + 3, 'MUNICIÓN', AM3, { outline: OUT });
  const loaded = state.weapon.mag + (state.weapon.reloading
    ? reloadShells(state.weapon, state.t) : 0);
  for (let i = 0; i < state.weapon.magSize; i++) {
    svc.drawShell(ctx, ap.x + 6 + i * 7, ap.y + 14, i < loaded);
  }
  const reserve = state.weapon.infinite ? 'INF' : String(state.weapon.reserve);
  const rw = measureText(glyphs, reserve);
  drawText(ctx, glyphs, ap.x + ap.w - 6 - rw, ap.y + 14, reserve, PAR, { outline: OUT });
  if (state.weapon.reloading) {
    const progress = Math.round((loaded / state.weapon.magSize) * 16);
    ctx.fillStyle = AMBER_TRACK;
    ctx.fillRect(ap.x + 4, ap.y + 26, 16, 1);
    ctx.fillStyle = AM3;
    ctx.fillRect(ap.x + 4, ap.y + 26, progress, 1);
  }
}

/** Bengala y botella con su contador, al lado del panel del traje. */
export function drawConsumables(state, view, svc, ctx) {
  if ((state.eff.bengalas || 0) <= 0 && (state.eff.molotovs || 0) <= 0) return;
  const glyphs = svc.assets.font.glyphs;
  const x = EXTRA_PANEL.x;
  const y = EXTRA_PANEL.y;
  darkPanel(ctx, x, y, EXTRA_PANEL.w, EXTRA_PANEL.h, 0.7);
  drawText(ctx, glyphs, x + 4, y + 3, 'EXTRA', AM3, { outline: OUT });
  const entries = [];
  if ((state.eff.bengalas || 0) > 0) entries.push(['mejora_bengala', state.items.bengalas]);
  if ((state.eff.molotovs || 0) > 0) entries.push(['mejora_molotov', state.items.molotovs]);
  entries.forEach(([name, count], i) => {
    const ex = x + 5 + i * 34;
    const frame = svc.assets.itemsData.frames[name];
    if (frame) {
      ctx.drawImage(svc.assets.items.image,
        frame[0], frame[1], frame[2], frame[3], ex, y + 13, 10, 10);
    }
    drawText(ctx, glyphs, ex + 12, y + 15, `x${count}`, count > 0 ? PAR : INK2,
      { outline: OUT });
  });
}

export function drawPatchIcon(state, view, svc, ctx, x, y, on) {
  ctx.fillStyle = on ? SLOT_DARK : OUT_HALF;
  ctx.fillRect(x, y, 9, 9);
  if (on) {
    ctx.fillStyle = PATCH_BG;
    ctx.fillRect(x + 1, y + 1, 7, 7);
    ctx.fillStyle = PATCH_LIGHT;
    ctx.fillRect(x + 1, y + 1, 7, 2);
    ctx.fillStyle = PATCH_SEAM;
    ctx.fillRect(x + 3, y + 3, 3, 1);
    ctx.fillRect(x + 3, y + 5, 3, 1);
  } else {
    ctx.fillStyle = PATCH_OFF;
    ctx.fillRect(x + 1, y + 1, 7, 7);
  }
}

export function drawShell(state, view, svc, ctx, x, y, filled) {
  ctx.fillStyle = filled ? SHELL_DARK : OUT_MORE;
  ctx.fillRect(x, y, 4, 10);
  if (filled) {
    ctx.fillStyle = SHELL_BRASS;
    ctx.fillRect(x + 1, y + 1, 2, 7);
    ctx.fillStyle = SHELL_HI;
    ctx.fillRect(x + 1, y + 1, 1, 2);
    ctx.fillStyle = SLOT_EDGE;
    ctx.fillRect(x + 1, y + 8, 2, 1);
  }
}

export function drawCrosshair(state, view, svc, ctx) {
  // Con mouse la mira sigue al puntero; con joystick/teclado, 24 px al frente.
  const input = svc.game.input;
  const p = input && input.device === 'mouse' && input.pointer
    ? svc.game.screenToView(input.pointer.x, input.pointer.y) : null;
  const cx = p ? Math.round(p.x) : Math.round(view.player.x - view.cam.x + state.aim.x * 24);
  const cy = p ? Math.round(p.y)
    : Math.round(view.player.feet - 10 - view.cam.y + state.aim.y * 24);
  ctx.fillStyle = CROSS_SHADOW;
  ctx.fillRect(cx - 3, cy, 7, 1);
  ctx.fillRect(cx, cy - 3, 1, 7);
  ctx.fillStyle = SNOW;
  ctx.fillRect(cx - 2, cy, 5, 1);
  ctx.fillRect(cx, cy - 2, 1, 5);
  ctx.fillStyle = WHITE;
  ctx.fillRect(cx, cy, 1, 1);
}

export function drawHints(state, view, svc, ctx, device) {
  const pad = device === 'pad';
  const mouse = device === 'mouse';
  const items = [
    [mouse ? 'mouse' : (pad ? 'rt' : 'key_space'), 'Disparar'],
    [pad ? 'x' : 'key_r', 'Recargar'],
    [pad ? 'y' : 'key_i', 'Parche'],
  ];
  if (state.items.bengalas > 0) items.push([pad ? 'lb' : 'key_1', 'Bengala']);
  if (state.items.molotovs > 0) items.push([pad ? 'rb' : 'key_2', 'Botella']);
  if (svc.nearCrate() && ARENA.ammo !== 'infinita') {
    items.push([pad ? 'a' : 'mouse', 'Comprar']);
  }
  const widths = items.map(([glyph, label]) => (
    glyphSize(svc.assets, glyph).w + 3 + measureText(svc.assets.font.glyphs, label)
  ));
  const total = widths.reduce((a, b) => a + b, 0) + (items.length - 1) * 8;
  const rect = hintBarRect(total);
  let x = rect.x + 6;
  const y = rect.y + 3;
  darkPanel(ctx, rect.x, rect.y, rect.w, rect.h, 0.62);
  items.forEach(([glyph, label], i) => {
    const size = drawGlyph(ctx, svc.assets, glyph, x, y);
    drawText(ctx, svc.assets.font.glyphs, x + size.w + 3, y + 2, label, PAR,
      { outline: OUT });
    x += widths[i] + 8;
  });
}

export function drawPatchBar(state, view, svc, ctx) {
  if (state.patchT <= 0) return;
  const x = Math.round(view.player.x - view.cam.x);
  const y = Math.round(view.player.feet - 36 - view.cam.y);
  const total = Math.max(0.001, state.eff.patchTime || 1.5);
  const progress = 1 - state.patchT / total;
  darkPanel(ctx, x - 14, y, 28, 5, 0.8);
  ctx.fillStyle = AM3;
  ctx.fillRect(x - 13, y + 1, Math.round(26 * progress), 3);
}

export function drawToasts(state, view, svc, ctx) {
  const glyphs = svc.assets.font.glyphs;
  view.toasts.forEach((toast, i) => {
    const alpha = Math.min(1, toast.life / 0.5);
    const w = measureText(glyphs, toast.text) + 16;
    const x = Math.round((VIEW_W - w) / 2);
    const y = 26 + i * 14;
    ctx.globalAlpha = Math.max(0.15, alpha);
    darkPanel(ctx, x, y, w, 13, 0.85);
    drawText(ctx, glyphs, x + 8, y + 3, toast.text, PAR, { outline: OUT });
    ctx.globalAlpha = 1;
  });
}

/** Cartel de la primera ronda: el loop, la mano de la noche y la frecuencia. */
export function drawBanner(state, view, svc, ctx) {
  const glyphs = svc.assets.font.glyphs;
  const tally = tallyLayout(state.round, 42);
  const loopLine = state.round === 1 ? `Loop ${state.loop}` : '';
  const hand = state.round === 1 ? (state.hand || '') : '';
  const freq = state.eff.frecuencia && state.cfg && state.cfg.armoredPct > 0
    ? '…siete… cuatro… cuatro… uno…' : '';
  const handW = hand ? measureText(glyphs, hand) : 0;
  const freqW = freq ? measureText(glyphs, freq) : 0;
  const bw = Math.max(160, Math.min(460, Math.max(tally.width + 76, handW + 40, freqW + 40)));
  const bx = Math.round((VIEW_W - bw) / 2);
  const by = 52;
  let y = by + 76;
  if (loopLine) y += 9;
  if (hand) y += 9;
  if (freq) y += 9;
  const bh = Math.max(94, (y - by) + 16);
  // Cartucho de papel con los palotes en tinta, como en el cómic.
  ctx.fillStyle = OUT;
  ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
  ctx.fillStyle = BANNER_EDGE;
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = BANNER_PAPER;
  ctx.fillRect(bx + 2, by + 2, bw - 4, bh - 4);
  ctx.fillStyle = BANNER_SHADE;
  ctx.fillRect(bx + 2, by + bh - 4, bw - 4, 2);
  drawCentered(ctx, glyphs, 'RONDA', by + 10, BANNER_TITLE);
  drawTally(ctx, state.round, VIEW_W / 2, by + 52, 42, BANNER_INK, BANNER_SHADE);
  y = by + 76;
  if (loopLine) {
    drawCentered(ctx, glyphs, loopLine, y, BANNER_TITLE);
    y += 9;
  }
  if (hand) {
    drawCentered(ctx, glyphs, hand, y, BANNER_INK);
    y += 9;
  }
  if (freq) {
    drawCentered(ctx, glyphs, freq, y, INK2);
    y += 9;
  }
  drawCentered(ctx, glyphs, 'Preparate', by + bh - 13, INK2);
}

export function drawShopSign(state, view, svc, ctx) {
  if (!state.crate) return;
  const glyphs = svc.assets.font.glyphs;
  const sx = Math.round(state.crate.x + state.crate.w / 2 - view.cam.x);
  const sy = Math.round(state.crate.y - view.cam.y);
  if (sx < -80 || sx > VIEW_W + 80 || sy < -30 || sy > VIEW_H + 30) return;
  const w = measureText(glyphs, SHOP_TEXT) + 10;
  const x = Math.round(sx - w / 2);
  darkPanel(ctx, x, sy - 16, w, 14, 0.8);
  drawText(ctx, glyphs, x + 5, sy - 13, SHOP_TEXT, AM3, { outline: OUT });

  if (svc.nearCrate() && ARENA.ammo !== 'infinita') {
    const label = SHOP_LABEL;
    const lw = measureText(glyphs, label) + 20;
    const lx = clamp(Math.round(sx - lw / 2), 4, VIEW_W - lw - 4);
    darkPanel(ctx, lx, sy - 36, lw, 16, 0.84);
    const glyph = svc.game.input.device === 'pad' ? 'a' : 'mouse';
    const size = drawGlyph(ctx, svc.assets, glyph, lx + 5, sy - 32);
    drawText(ctx, glyphs, lx + 8 + size.w, sy - 32, label, PAR, { outline: OUT });
  }
}

/** Prompt del portón: volver a casa con el botín (E / A / click). */
export function drawExitSign(state, view, svc, ctx) {
  if (!state.exitHome) return;
  const p = exitPoint(state.exitHome);
  const sx = Math.round(p.x - view.cam.x);
  const sy = Math.round(p.y - view.cam.y);
  if (sx < -90 || sx > VIEW_W + 90 || sy < -50 || sy > VIEW_H + 40) return;
  const glyphs = svc.assets.font.glyphs;
  if (!svc.nearHome()) {
    const label = 'Casa';
    const w = measureText(glyphs, label) + 8;
    const x = Math.round(sx - w / 2);
    darkPanel(ctx, x, sy - 42, w, 12, 0.5);
    drawText(ctx, glyphs, x + 4, sy - 40, label, INK2, { outline: OUT });
    return;
  }
  const label = 'Volver a casa con el botín';
  const w = measureText(glyphs, label) + 22;
  if (state.mode === 'banner' || !state.exitArmed) return; // el cartel de la ronda manda
  const x = clamp(Math.round(sx - w / 2), 4, VIEW_W - w - 4);
  const y = Math.max(6, sy - 56);
  darkPanel(ctx, x, y, w, 16, 0.86);
  const device = svc.game.input.device;
  const glyph = device === 'pad' ? 'a' : (device === 'mouse' ? 'mouse' : 'key_e');
  const size = drawGlyph(ctx, svc.assets, glyph, x + 5, y + 3);
  drawText(ctx, glyphs, x + 8 + size.w, y + 4, label, PAR, { outline: OUT });
}

/** Mochila de otra vez: sprite animado + puntitos cian, fuera del velo. */
export function drawMochilaWorld(state, view, svc, ctx) {
  const m = state.mochila;
  if (!m) return;
  const sx = Math.round(m.x - view.cam.x);
  const sy = Math.round(m.y - view.cam.y);
  if (sx < -40 || sy < -40 || sx > VIEW_W + 40 || sy > VIEW_H + 40) return;
  const name = `mochila_nieve_${Math.floor(m.t / 0.15) % 3}`;
  const frame = svc.assets.objectsData.frames[name];
  if (!frame) return;
  const glow = ctx.createRadialGradient(sx, sy - 6, 0, sx, sy - 6, 24);
  glow.addColorStop(0, MOCHILA_GLOW);
  glow.addColorStop(1, MOCHILA_GLOW_END);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sx, sy - 6, 24, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 6; i++) {
    const a = state.t * 1.6 + i * 1.1;
    const px = Math.round(sx + Math.cos(a) * (11 + (i % 3) * 2));
    const py = Math.round(sy - 8 + Math.sin(a * 1.2) * 7);
    ctx.fillStyle = i % 2 ? MOCHILA_SPARK_HI : MOCHILA_SPARK;
    ctx.fillRect(px, py, 2, 2);
  }
  ctx.drawImage(svc.assets.objects.image,
    frame[0], frame[1], frame[2], frame[3],
    sx - Math.round(frame[2] / 2), sy - frame[3], frame[2], frame[3]);
}

/** Flechita cian en el borde de la vista cuando la mochila queda fuera. */
export function drawMochilaArrow(state, view, svc, ctx) {
  const m = state.mochila;
  if (!m) return;
  const wx = m.x - view.cam.x;
  const wy = m.y - 8 - view.cam.y;
  const margin = 12;
  if (wx >= margin && wx <= VIEW_W - margin && wy >= margin && wy <= VIEW_H - margin) return;
  const cx = clamp(wx, margin, VIEW_W - margin);
  const cy = clamp(wy, 56, VIEW_H - 42);
  const ang = Math.atan2(wy - VIEW_H / 2, wx - VIEW_W / 2);
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));
  ctx.rotate(ang);
  ctx.fillStyle = ARROW_SHADOW;
  ctx.fillRect(3, -4, 8, 8);
  ctx.fillStyle = MOCHILA_CYAN;
  ctx.fillRect(3, -2, 7, 4);
  ctx.fillRect(-2, -1, 6, 2);
  ctx.fillStyle = WHITE;
  ctx.fillRect(7, -1, 2, 2);
  ctx.restore();
}

/** El fuego de la botella: partículas naranjas y amarillas de 2 px. */
export function drawFires(state, view, svc, ctx) {
  for (const fire of state.fires) {
    const sx = Math.round(fire.x - view.cam.x);
    const sy = Math.round(fire.y - view.cam.y);
    if (sx < -50 || sy < -50 || sx > VIEW_W + 50 || sy > VIEW_H + 50) continue;
    ctx.fillStyle = FIRE_GLOW;
    ctx.fillRect(sx - 3, sy - 1, 6, 2);
    for (let i = 0; i < 8; i++) {
      const a = state.t * 7 + i * 0.85 + (fire.seed || 0) * 6;
      const r = 4 + (i % 3) * 5;
      const px = Math.round(sx + Math.cos(a) * r);
      const py = Math.round(sy - 4 + Math.sin(a * 1.3) * 4 - (i % 2) * 3);
      ctx.fillStyle = i % 2 ? FIRE_YELLOW : FIRE_ORANGE;
      const size = i % 2 ? 2 : 1;
      ctx.fillRect(px, py, size, size);
    }
  }
}

export function drawVignette(state, view, svc, ctx, device) {
  drawDeathPanel(ctx, svc.assets, { t: state.deathT, device });
}

export function drawResult(state, view, svc, ctx, device) {
  drawResultScreen(ctx, svc.assets, {
    round: state.round,
    kills: state.points.kills,
    points: state.points.score,
    best: state.best,
    newBest: state.newBest,
    sel: state.nav ? state.nav.sel : state.resultSel,
    device,
    fade: state.resultT,
    bag: state.bag,
    // Minijuego (sin salida real): la opción reinicia, no vuelve a la casa.
    retry: !svc.game.run || Boolean(svc.game.isolated),
  }, state.resultT);
}
