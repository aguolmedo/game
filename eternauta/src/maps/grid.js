// Helpers chicos para armar mapas de tiles sin repetir bucles.

export const TILE = 16;

/** Grilla de `rows` filas x `cols` columnas llenada por fn(x, y). */
export function makeGrid(cols, rows, fn) {
  const grid = [];
  for (let y = 0; y < rows; y++) {
    const row = [];
    for (let x = 0; x < cols; x++) row.push(fn(x, y));
    grid.push(row);
  }
  return grid;
}

export function fillRect(grid, x, y, w, h, tile) {
  for (let j = y; j < y + h; j++) {
    for (let i = x; i < x + w; i++) {
      if (grid[j] && grid[j][i] !== undefined) grid[j][i] = tile;
    }
  }
}

/** Variación determinística y estable (repite con un patrón legible). */
export function variant(x, y, n) {
  return (x * 7 + y * 13 + (x * y) % 5) % n;
}

export function pick(prefix, x, y, n = 3) {
  return `${prefix}_${variant(x, y, n)}`;
}

/** Convierte coordenadas de tile a píxeles (esquina superior izquierda). */
