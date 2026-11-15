// Lógica pura del juego: no toca DOM ni Three.js (se testea con node:test).

export const DEADZONE = 0.25;
export const STREET_END_X = 294;

const UP = ['ArrowUp', 'KeyW'];
const DOWN = ['ArrowDown', 'KeyS'];
const LEFT = ['ArrowLeft', 'KeyA'];
const RIGHT = ['ArrowRight', 'KeyD'];

function pressed(keys, codes) {
  for (const code of codes) if (keys.has(code)) return true;
  return false;
}

/** Stick analógico -> vector de movimiento, con deadzone radial y magnitud <= 1. */
export function stickToMove(x = 0, y = 0, deadzone = DEADZONE) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return { x: 0, y: 0 };
  const mag = Math.hypot(x, y);
  if (mag <= deadzone || mag === 0) return { x: 0, y: 0 };
  const scaled = Math.min(1, (mag - deadzone) / (1 - deadzone));
  const k = scaled / mag;
  return { x: x * k, y: y * k };
}

/** Teclado -> vector de movimiento normalizado (diagonal incluida). */
export function keysToMove(keys) {
  const x = (pressed(keys, RIGHT) ? 1 : 0) - (pressed(keys, LEFT) ? 1 : 0);
  const y = (pressed(keys, DOWN) ? 1 : 0) - (pressed(keys, UP) ? 1 : 0);
  const mag = Math.hypot(x, y);
  if (mag === 0) return { x: 0, y: 0 };
  return { x: x / mag, y: y / mag };
}

/** Suma varios vectores de input y limita la magnitud a 1. */
export function combineMoves(...moves) {
  let x = 0;
  let y = 0;
  for (const m of moves) {
    if (!m) continue;
    x += m.x || 0;
    y += m.y || 0;
  }
  const mag = Math.hypot(x, y);
  if (mag > 1) {
    x /= mag;
    y /= mag;
  }
  if (mag === 0) return { x: 0, y: 0 };
  return { x, y };
}

/** Al salir del altillo: con traje se va a la calle, sin traje hay muerte. */
export function exitOutcome(hasSuit) {
  return hasSuit ? 'street' : 'death';
}

/** Llegó al final de la calle. */
export function reachedStreetEnd(x, endX = STREET_END_X) {
  return x >= endX;
}

/** Resultado de estar en la calle: sin traje muerte, con traje final al llegar. */
export function streetOutcome(hasSuit, x, endX = STREET_END_X) {
  if (!hasSuit) return 'death';
  return reachedStreetEnd(x, endX) ? 'end' : 'street';
}

/** Interacción con el traje: devuelve un estado nuevo (sin mutar el anterior). */
export function pickUpSuit(state) {
  return { ...state, hasSuit: true };
}

/** Parte las líneas de un diálogo en páginas de N líneas. */
export function dialogPages(lines, perPage = 3) {
  const pages = [];
  for (let i = 0; i < lines.length; i += perPage) {
    pages.push(lines.slice(i, i + perPage));
  }
  return pages.length ? pages : [[]];
}
