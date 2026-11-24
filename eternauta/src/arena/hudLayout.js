// Geometría del HUD de la arena (puro: sin three ni DOM).
// Los tres paneles viven arriba de la franja de controles, que va sola abajo.

export const VIEW_W = 480;
export const VIEW_H = 270;
export const HUD_PANEL_Y = VIEW_H - 50; // 220
export const TRAJE_PANEL = { x: 6, y: HUD_PANEL_Y, w: 100, h: 28 };
export const EXTRA_PANEL = { x: 110, y: HUD_PANEL_Y, w: 76, h: 28 };
export const AMMO_PANEL = { x: VIEW_W - 6 - 96, y: HUD_PANEL_Y, w: 96, h: 28 };

export function hintBarRect(total) {
  const w = total + 12;
  return { x: Math.round((VIEW_W - total) / 2) - 6, y: VIEW_H - 16, w, h: 13 };
}

export function hudRects(total, opts = {}) {
  const list = [TRAJE_PANEL, AMMO_PANEL, hintBarRect(total)];
  if (opts.extra !== false) list.push(EXTRA_PANEL);
  return list;
}

export { overlaps } from '../geom.js';
