// HUD: objetivo, prompts, hotbar, toasts y fundidos. Todo en un canvas 480x270.
import { drawText, measureText } from './font.js';
import { canvasOverlay } from './sprite.js';
import {
  OUT, INK, PAR, PAR2, AM3, AM2, GOOD, SNOW, darkPanel, icon, count, slot,
} from './uiSkin.js';
import { drawPrompt, drawGlyph, glyphSize, promptWidth } from './glyphs.js';

export const VIEW_W = 480;
export const VIEW_H = 270;

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

  toast(text, t = 0) {
    this.toasts.push({ text, life: 2.6, t });
    if (this.toasts.length > 3) this.toasts.shift();
  }

  setCamera(camX, camY) {
    this.ui.mesh.position.set(camX + VIEW_W / 2, camY + VIEW_H / 2, 30);
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
      // iconito del traje puesto
      if (hasSuit) {
        darkPanel(ctx, 6, 23, 22, 22, 0.68);
        icon(ctx, this.assets, 'traje', 8, 25, 18);
        drawText(ctx, glyphs, 25, 32, 'traje', PAR2, { outline: OUT });
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
    const { action, label, x, y, color = '#fff0c0', left = false } = prompt;
    const w = promptWidth(this.assets, device, action, label) + 12;
    let bx = Math.round(left ? x : x - w / 2);
    let by = Math.round(left ? y : y - 22);
    bx = Math.max(4, Math.min(VIEW_W - w - 4, bx));
    if (by < 4) by = Math.round(y + 14);
    if (by > VIEW_H - 72) by = VIEW_H - 72;
    darkPanel(ctx, bx, by, w, 15, 0.78);
    drawPrompt(ctx, this.assets, device, action, bx + 6, by + 3, this.t, { label, color });
    void glyphs;
  }

  drawHotbar(ctx, device) {
    const glyphs = this.assets.font.glyphs;
    const size = 20;
    const gap = 2;
    const n = 8;
    const total = n * size + (n - 1) * gap;
    const x0 = Math.round((VIEW_W - total) / 2);
    const y = VIEW_H - size - 6;
    darkPanel(ctx, x0 - 5, y - 3, total + 10, size + 6, 0.62);
    for (let i = 0; i < n; i++) {
      const x = x0 + i * (size + gap);
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

  drawHints(ctx, device, actions) {
    const pairs = [];
    for (const action of actions) {
      if (!action) continue;
      pairs.push(action);
    }
    if (!pairs.length) return;
    let total = 0;
    for (const a of pairs) total += promptWidth(this.assets, device, a.action, a.label) + 9;
    total -= 9;
    const x = VIEW_W - total - 10;
    const y = VIEW_H - 46;
    darkPanel(ctx, x - 7, y - 4, total + 14, 16, 0.66);
    let cx = x;
    for (const a of pairs) {
      const w = drawPrompt(ctx, this.assets, device, a.action, cx, y - 1, this.t,
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
      const y = VIEW_H - 66 - i * 18;
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
