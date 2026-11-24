// Menú de resultado de la arena (muerte / fin de run). Lógica pura: sin DOM
// ni three. La escena sólo lee el estado y dibuja.
import { formatPoints } from './points.js';

export const RESULT_OPTIONS = [
  { id: 'home', label: 'Volver a la casa' },
  { id: 'title', label: 'Volver al título' },
];

export function createResultNav() {
  return { sel: 0, armed: false, axis: null };
}

/**
 * Avanza la navegación un cuadro. `move` = { x, y } en -1..1 (flechas o
 * stick/dpad). Devuelve SIEMPRE un objeto nuevo: nunca muta `nav`.
 * `armed` evita que una dirección ya apretada al abrir mueva la selección:
 * hay que soltar a neutro una vez.
 */
export function stepResultNav(nav, move) {
  const x = Number(move && move.x) || 0;
  const y = Number(move && move.y) || 0;
  const ax = Math.abs(x);
  const ay = Math.abs(y);

  // Neutro: se arma para el próximo flanco.
  if (Math.max(ax, ay) <= 0.5) {
    return { sel: nav.sel, armed: true, axis: null, moved: false };
  }
  // Todavía no se soltó desde que se abrió la pantalla: se ignora.
  if (!nav.armed) {
    return { sel: nav.sel, armed: false, axis: null, moved: false };
  }

  let key;
  let delta;
  if (ay >= ax) {
    key = y > 0 ? 'y1' : 'y-1';
    delta = y > 0 ? 1 : -1;
  } else {
    key = x > 0 ? 'x1' : 'x-1';
    delta = x > 0 ? 1 : -1;
  }

  // Misma dirección sostenida: sólo cuenta el flanco.
  if (nav.axis === key) {
    return { sel: nav.sel, armed: true, axis: nav.axis, moved: false };
  }

  const count = RESULT_OPTIONS.length;
  const sel = ((nav.sel + delta) % count + count) % count;
  return { sel, armed: true, axis: key, moved: true };
}

/** Índice -> id de opción ('home' | 'title'). Fuera de rango: 'home'. */
export function resultAction(sel) {
  const raw = Math.floor(Number(sel) || 0);
  const i = Math.min(RESULT_OPTIONS.length - 1, Math.max(0, raw));
  return RESULT_OPTIONS[i].id;
}

const num = (v) => Number(v) || 0;

/** ¿La run supera el récord? Empate (o 0 contra 0) NO es récord. */
export function isNewBest(best, run) {
  const b = best || {};
  const r = run || {};
  return num(r.round) > num(b.round) || num(r.points) > num(b.points);
}

/** Línea de récord para la pantalla de resultado. */
export function bestLine(best) {
  const b = best || {};
  const round = Math.max(0, Math.floor(Number(b.round) || 0));
  return `Ronda ${round} — ${formatPoints(b.points)} pts`;
}
