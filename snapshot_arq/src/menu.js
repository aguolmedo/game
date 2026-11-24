// Navegación pura de menús y grillas (sin DOM ni Three.js).

export const MENU_TABS = [
  { id: 'inventario', label: 'Inventario' },
  { id: 'fabricar', label: 'Fabricar' },
  { id: 'opciones', label: 'Opciones' },
];

const DEADZONE = 0.25;

function intOf(value) {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) ? n : 0;
}

/** Mueve un índice: envuelve o limita según `wrap`. */
export function moveIndex(index, length, delta, wrap = true) {
  const size = Math.max(0, intOf(length));
  if (size === 0) return 0;
  const start = Math.min(size - 1, Math.max(0, intOf(index)));
  const step = intOf(delta);
  if (wrap) return (((start + step) % size) + size) % size;
  return Math.min(size - 1, Math.max(0, start + step));
}

/** Menú simple con una lista de ids y el índice actual. */
export function createMenu(ids, index = 0) {
  const list = Array.isArray(ids) ? ids.slice() : [];
  return { ids: list, index: moveIndex(index, list.length, 0, false) };
}

/** Devuelve un menú nuevo con el índice movido. */
export function moveMenu(menu, delta, wrap = true) {
  const ids = menu.ids.slice();
  return { ids, index: moveIndex(menu.index, ids.length, delta, wrap) };
}

/** Cambia de pestaña con wrap. */
export function nextTab(tabIndex, delta) {
  return moveIndex(tabIndex, MENU_TABS.length, delta, true);
}

/** Mueve el cursor de slots con wrap. */
export function moveSlot(current, delta, count = 8) {
  return moveIndex(current, count, delta, true);
}

/** Mueve dentro de una grilla de `columns` columnas, limitando en los bordes. */
export function gridMove(index, dx, dy, columns, length) {
  const cols = Math.max(1, intOf(columns));
  const size = Math.max(0, intOf(length));
  if (size === 0) return 0;

  const start = Math.min(size - 1, Math.max(0, intOf(index)));
  const rows = Math.ceil(size / cols);
  const col = start % cols;
  const row = Math.floor(start / cols);
  const nextCol = Math.min(cols - 1, Math.max(0, col + intOf(dx)));
  const nextRow = Math.min(rows - 1, Math.max(0, row + intOf(dy)));
  return Math.min(size - 1, nextRow * cols + nextCol);
}

/** Dirección dominante del stick; null si está dentro de la deadzone. */
function directionOf(move) {
  const x = Number(move && move.x) || 0;
  const y = Number(move && move.y) || 0;
  if (Math.hypot(x, y) < DEADZONE) return null;
  if (Math.abs(x) >= Math.abs(y)) {
    return { key: `x${Math.sign(x)}`, dx: Math.sign(x), dy: 0 };
  }
  return { key: `y${Math.sign(y)}`, dx: 0, dy: Math.sign(y) };
}

/**
 * Cursor de menú/grilla con repetición: el primer movimiento es inmediato
 * y después se repite cada `repeat` segundos mientras la dirección se mantiene.
 */
export class Cursor {
  constructor(length, { columns = 1, repeat = 0.22 } = {}) {
    this.columns = Math.max(1, intOf(columns));
    this.repeat = Math.max(0, Number(repeat) || 0);
    this.length = 0;
    this.index = 0;
    this.timer = 0;
    this.dir = null;
    this.setLength(length);
  }

  setLength(n) {
    this.length = Math.max(0, intOf(n));
    this.index = this.length ? Math.min(this.index, this.length - 1) : 0;
    this.timer = 0;
    this.dir = null;
  }

  step(dx, dy) {
    return gridMove(this.index, dx, dy, this.columns, this.length);
  }

  update(dt, move) {
    const dir = directionOf(move);
    if (!dir) {
      this.dir = null;
      this.timer = 0;
      return { index: this.index, moved: false };
    }

    let moved = false;
    let next = this.index;

    if (this.dir !== dir.key) {
      // Dirección nueva: un paso inmediato y arranca el temporizador.
      this.dir = dir.key;
      next = this.step(dir.dx, dir.dy);
      moved = next !== this.index;
      this.index = next;
      this.timer = this.repeat;
      return { index: this.index, moved };
    }

    this.timer -= Math.max(0, Number(dt) || 0);
    while (this.timer <= 0) {
      next = this.step(dir.dx, dir.dy);
      if (next === this.index) {
        // Borde: no girar en falso, esperar a que cambie la dirección.
        this.timer = this.repeat || Infinity;
        break;
      }
      this.index = next;
      moved = true;
      this.timer += this.repeat;
      if (this.repeat <= 0) break;
    }
    return { index: this.index, moved };
  }
}
