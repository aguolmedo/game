// HUD: objetivo, prompts, hotbar, toasts y fundidos. Todo en un canvas 480x270.
import { drawText, measureText } from './font.js';
import { canvasOverlay } from './sprite.js';
import {
  OUT, INK, PAR, PAR2, AM3, AM2, GOOD, SNOW, darkPanel, icon, count, slot,
} from './uiSkin.js';
import { drawPrompt, drawGlyph, glyphSize, promptWidth } from './glyphs.js';
import { pointInRect } from './uiHit.js';

export const VIEW_W = 480;
export const VIEW_H = 270;

// Toasts (T8): máximo 2, arriba-centro, 2 s. Los pickups se agrupan.
export const TOAST_LIFE = 2.0;
export const TOAST_MAX = 2;
const TOAST_GROUP_WINDOW = 0.3;   // vida consumida para seguir agrupando
const TOAST_MAX_CHARS = 40;

/** Agrega un toast a la lista (agrupando si corresponde) y devuelve el último. */
export function pushToast(toasts, text, { group = null, life = TOAST_LIFE } = {}) {
  const last = toasts[toasts.length - 1];
  if (last && group && last.group === group
    && TOAST_LIFE - last.life <= TOAST_GROUP_WINDOW) {
    const merged = `${last.text}, ${text}`;
    if (merged.length <= TOAST_MAX_CHARS) {
      last.text = merged;
      last.life = life;
      return last;
    }
  }
  const toast = { text, group, life };
  toasts.push(toast);
  while (toasts.length > TOAST_MAX) toasts.shift();
  return toast;
}

const HOTBAR_SIZE = 20;
const HOTBAR_GAP = 2;
const HOTBAR_N = 8;

/** Rect del panel de la hotbar y de cada slot (dibujo y click comparten). */
export function hotbarLayout() {
  const total = HOTBAR_N * HOTBAR_SIZE + (HOTBAR_N - 1) * HOTBAR_GAP;
  const x0 = Math.round((VIEW_W - total) / 2);
  const y = VIEW_H - HOTBAR_SIZE - 6;
  const slots = [];
  for (let i = 0; i < HOTBAR_N; i++) {
    slots.push({ x: x0 + i * (HOTBAR_SIZE + HOTBAR_GAP), y, w: HOTBAR_SIZE, h: HOTBAR_SIZE });
  }
  return {
    x0, y, size: HOTBAR_SIZE, total, slots,
    panel: { x: x0 - 5, y: y - 3, w: total + 10, h: HOTBAR_SIZE + 6 },
  };
}

const PROMPT_H = 15;
const PROMPT_MIN_Y = 18;   // debajo del panel de objetivo

function overlaps(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/**
 * Rect de la etiqueta flotante (R4/B1). `x` es el centro del marco del objeto
 * e `y` su tope, en coordenadas de la vista; `frameH` es el alto del marco
 * también en vista. Prueba candidatos en orden fijo y devuelve el primero que
 * entra en pantalla y no pisa ningún obstáculo (jugador, cursor, HUD):
 *
 *   1. arriba centrado            2. arriba corrido a la derecha del obstáculo
 *   3. arriba corrido a la izquierda   4. arriba del obstáculo
 *   5. abajo del marco (solo si ninguno de arriba entra)
 *   6. si nada sirve: el 1 clampeado a la pantalla
 */
export function placeLabel({
  x, y, w, h = PROMPT_H, frameH = 16, obstacles = [],
  viewW = VIEW_W, viewH = VIEW_H, minY = PROMPT_MIN_Y,
}) {
  const list = (obstacles || []).filter(Boolean);
  const clampX = (bx) => Math.max(4, Math.min(viewW - w - 4, Math.round(bx)));
  const box = (bx, by) => ({ x: bx, y: by, w, h });
  const fits = (c) => c.x >= 4 && c.x + c.w <= viewW - 4
    && c.y >= minY && c.y + c.h <= viewH - 72
    && !list.some((ob) => overlaps(c, ob));

  const cx = clampX(x - w / 2);
  const above = Math.round(y - 3 - h);
  const centered = box(cx, above);
  const candidates = [centered];
  // Arriba corrida: solo tiene sentido respecto del obstáculo que pisa.
  const hit = list.find((ob) => overlaps(centered, ob));
  if (hit) {
    candidates.push(box(clampX(hit.x + hit.w + 2), above));
    candidates.push(box(clampX(hit.x - w - 2), above));
    candidates.push(box(cx, Math.round(hit.y - 3 - h)));
  }
  // Abajo del marco: el único caso "abajo", y solo si arriba no entra.
  candidates.push(box(cx, Math.round(y + frameH + 3)));

  for (const candidate of candidates) {
    if (fits(candidate)) return candidate;
  }
  // Nada entra: la de arriba, clampeada a la pantalla.
  return box(cx, Math.max(minY, Math.min(viewH - 72, above)));
}

/**
 * API vieja de la etiqueta: igual que placeLabel con UN obstáculo (`avoid`,
 * la caja del jugador).
 */
export function promptRect(opts = {}) {
  const { avoid = null, obstacles = [], ...rest } = opts;
  return placeLabel({ ...rest, obstacles: avoid ? [avoid, ...obstacles] : obstacles });
}

/** ¿El punto (vista 480x270) cae sobre el HUD que tapa el mundo? */
export function hudBlocksPoint(point, hintRects = []) {
  if (!point) return false;
  if (pointInRect(point, hotbarLayout().panel)) return true;
  return (hintRects || []).some((rect) => pointInRect(point, rect));
}

export class Hud {
  constructor(scene, assets, game) {
    this.assets = assets;
    this.game = game;
    this.ui = canvasOverlay(VIEW_W, VIEW_H, 0);
    this.ui.mesh.position.set(VIEW_W / 2, VIEW_H / 2, 30);
    this.ui.mesh.visible = false;
    scene.add(this.ui.mesh);
    this.t = 0;
    this.toasts = [];
    this.fade = 0;
  }

  show() { this.ui.mesh.visible = true; }
  hide() { this.ui.mesh.visible = false; }

  toast(text, opts = {}) {
    return pushToast(this.toasts, text, opts);
  }

  update(dt) {
    this.t += dt;
    for (const toast of this.toasts) toast.life -= dt;
    this.toasts = this.toasts.filter((toast) => toast.life > 0);
  }

  draw({
    device = 'keyboard', objective = null, prompt = null, showHotbar = true,
    hasSuit = false, fade = 0, hintActions = null, hidden = false,
  }) {
    const { ctx } = this.ui;
    const glyphs = this.assets.font.glyphs;
    this.ui.clear();
    this.ui.mesh.visible = true;

    if (!hidden) {
      let bottom = 20;   // y donde termina el panel de arriba (objetivo o checklist)
      // objetivo arriba a la izquierda
      if (objective) {
        const text = `Objetivo: ${objective.text}`;
        const w = measureText(glyphs, text) + 20;
        darkPanel(ctx, 6, 5, w, 15, 0.68);
        ctx.fillStyle = AM3;
        ctx.fillRect(11, 10, 4, 4);
        ctx.fillStyle = '#a86a28';
        ctx.fillRect(12, 11, 2, 2);
        drawText(ctx, glyphs, 19, 9, text, '#fff0c0', { outline: OUT });
      }
      // checklist chica del objetivo (esclusa / equipado): sin íconos de check,
      // la fuente no los tiene, así que va "(x)"/"( )".
      if (objective?.checklist?.length) {
        const rows = objective.checklist;
        const texts = rows.map((row) => `${row.done ? '(x) ' : '( ) '}${row.label}`);
        const w = Math.max(...texts.map((t) => measureText(glyphs, t))) + 14;
        const h = rows.length * 9 + 6;
        const y = 22;
        darkPanel(ctx, 6, y, w, h, 0.68);
        rows.forEach((row, i) => {
          drawText(ctx, glyphs, 11, y + 5 + i * 9, texts[i],
            row.done ? '#8fd6a0' : '#d4b47c', { outline: OUT });
        });
        bottom = y + h;
      }
      // iconito del traje puesto, debajo de todo lo anterior
      if (hasSuit) {
        const y = bottom + 3;
        darkPanel(ctx, 6, y, 22, 22, 0.68);
        icon(ctx, this.assets, 'traje', 8, y + 2, 18);
        drawText(ctx, glyphs, 25, y + 9, 'traje', PAR2, { outline: OUT });
      }

      // prompt flotante junto al tile de accion
      if (prompt) {
        this.drawPrompt(ctx, device, prompt);
      }

      // hotbar
      if (showHotbar) this.drawHotbar(ctx, device);

      // barra de pistas abajo a la derecha
      if (hintActions && hintActions.length) {
        this.drawHints(ctx, device, hintActions);
      }

      // toasts
      this.drawToasts(ctx);
    }

    if (fade > 0) {
      ctx.fillStyle = `rgba(6, 6, 14, ${Math.min(1, fade)})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    this.ui.commit();
  }

  drawPrompt(ctx, device, prompt) {
    const glyphs = this.assets.font.glyphs;
    const {
      action, label, x, y, color = '#fff0c0', left = false, alpha = 1,
      anchor = null,
    } = prompt;
    const w = promptWidth(this.assets, device, action, label) + 12;
    let bx;
    let by;
    if (anchor === 'above') {
      const rect = placeLabel({
        x,
        y,
        w,
        h: PROMPT_H,
        frameH: prompt.frameH,
        obstacles: prompt.obstacles || (prompt.avoid ? [prompt.avoid] : []),
      });
      bx = rect.x;
      by = rect.y;
    } else {
      bx = Math.round(left ? x : x - w / 2);
      by = Math.round(left ? y : y - 22);
      bx = Math.max(4, Math.min(VIEW_W - w - 4, bx));
      if (by < 4) by = Math.round(y + 14);
      if (by > VIEW_H - 72) by = VIEW_H - 72;
    }
    // Lejos: misma etiqueta, más tenue (T4).
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    darkPanel(ctx, bx, by, w, 15, 0.78);
    drawPrompt(ctx, this.assets, device, action, bx + 6, by + 3, this.t, { label, color });
    ctx.globalAlpha = 1;
    void glyphs;
  }

  drawHotbar(ctx, device) {
    const glyphs = this.assets.font.glyphs;
    const layout = hotbarLayout();
    const { x0, y, size, total } = layout;
    darkPanel(ctx, layout.panel.x, layout.panel.y, layout.panel.w, layout.panel.h, 0.62);
    for (let i = 0; i < layout.slots.length; i++) {
      const x = layout.slots[i].x;
      const selected = i === this.game.selectedSlot;
      slot(ctx, x, y, size, selected, { bounce: selected });
      const bag = this.game.inventory[i];
      if (bag) {
        icon(ctx, this.assets, bag.id, x + 2, y + 2, 16);
        count(ctx, glyphs, bag.count, x + 13, y + 12);
      }
      if (selected) {
        ctx.fillStyle = AM3;
        ctx.fillRect(x, y - 2, size, 1);
      }
    }
    // (LB) (RB) en los extremos cuando hay joystick
    if (device === 'pad') {
      const prev = glyphSize(this.assets, 'lb');
      const next = glyphSize(this.assets, 'rb');
      drawGlyph(ctx, this.assets, 'lb', x0 - prev.w - 9, y + 7);
      drawGlyph(ctx, this.assets, 'rb', x0 + total + 9, y + 7);
    }
  }

  /** Coordenadas de la barra de pistas: dibujo y click comparten esto. */
  hintLayout(device, actions) {
    const pairs = (actions || []).filter(Boolean);
    if (!pairs.length) return { x: 0, y: 0, total: 0, boxes: [] };
    let total = 0;
    for (const a of pairs) total += promptWidth(this.assets, device, a.action, a.label) + 9;
    total -= 9;
    const x = VIEW_W - total - 10;
    const y = VIEW_H - 46;
    const boxes = [];
    let cx = x;
    for (const a of pairs) {
      const w = promptWidth(this.assets, device, a.action, a.label);
      boxes.push({
        action: a.action,
        label: a.label,
        static: Boolean(a.static),
        rect: { x: cx - 4, y: y - 5, w: w + 8, h: 17 },
      });
      cx += w + 9;
    }
    return { x, y, total, boxes };
  }

  drawHints(ctx, device, actions) {
    const layout = this.hintLayout(device, actions);
    if (!layout.boxes.length) return;
    darkPanel(ctx, layout.x - 7, layout.y - 4, layout.total + 14, 16, 0.66);
    let cx = layout.x;
    for (const a of (actions || [])) {
      if (!a) continue;
      const w = drawPrompt(ctx, this.assets, device, a.action, cx, layout.y - 1, this.t,
        { label: a.label, bob: false });
      cx += w + 9;
    }
    void INK;
  }

  drawToasts(ctx) {
    const glyphs = this.assets.font.glyphs;
    this.toasts.forEach((toast, i) => {
      const alpha = Math.min(1, toast.life / 0.5);
      const w = measureText(glyphs, toast.text) + 18;
      const x = Math.round((VIEW_W - w) / 2);
      // Arriba-centro, debajo del objetivo (T8).
      const y = 22 + i * 16;
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      darkPanel(ctx, x, y, w, 14, 0.85);
      ctx.fillStyle = AM2;
      ctx.fillRect(x, y + 13, w, 1);
      drawText(ctx, glyphs, x + 9, y + 4, toast.text, PAR, { outline: OUT });
      ctx.globalAlpha = 1;
    });
    void SNOW;
    void GOOD;
    void PAR2;
  }
}
