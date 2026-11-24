// Arma el barrio del roguelike a partir de una semilla: una grilla de 4x2 celdas
// de 20x20 baldosas (80x40 baldosas = 1280x640 px) con las cinco piezas.
// Es datos de mapa + una funcion pura: no toca escenas ni el DOM.
import { makeGrid } from '../grid.js';
import { rngFromSeed, pick, shuffled } from '../../run/rng.js';
import { PIECES, NORTH_EXIT, tileFor } from './pieces.js';

export const CELL = 20;                 // baldosas por lado de una pieza
export const COLS = 4 * CELL;           // 80
export const ROWS = 2 * CELL;           // 40
const CELL_PX = CELL * 16;              // 320

const TYPES = ['esquina', 'plaza', 'vias', 'cortada'];

/** Todas las listas de n elementos distintos de `list`. */
function permutations(list, n) {
  if (n === 0) return [[]];
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const rest = list.slice(0, i).concat(list.slice(i + 1));
    for (const tail of permutations(rest, n - 1)) out.push([list[i], ...tail]);
  }
  return out;
}

/** Celdas del barrio para una semilla: [{type, col, row, openSouth}]. */
export function layoutCells(seed) {
  const rng = rngFromSeed(seed);
  const cells = [{ type: 'casa', col: 0, row: 1, openSouth: false }];
  // fila de abajo: casa en la columna 0 y tres piezas distintas al azar
  const bottom = shuffled(rng, TYPES).slice(0, 3);
  bottom.forEach((type, i) => cells.push({
    type, col: i + 1, row: 1, openSouth: false,
  }));
  // fila de arriba: TODAS las columnas elegibles (la de abajo tiene salida al
  // norte). La variedad sale de los tipos, no de dejar huecos (L1).
  const cols = [];
  for (let col = 1; col < 4; col++) {
    if (NORTH_EXIT.has(bottom[col - 1])) cols.push(col);
  }
  // Tipos de arriba sin repeticion y distintos del de abajo mientras se pueda
  // (L5): se sortea entre las permutaciones que cumplen (siempre hay alguna).
  const fits = permutations(TYPES, cols.length)
    .filter((perm) => perm.every((type, i) => type !== bottom[cols[i] - 1]));
  const chosen = fits.length ? pick(rng, fits) : TYPES.slice(0, cols.length);
  cols.forEach((col, i) => cells.push({
    type: chosen[i], col, row: 0, openSouth: true,
  }));
  return cells;
}

/** Barrio completo: { cells, map } con el mismo formato que src/maps/street.js. */
export function buildBarrio(seed) {
  const cells = layoutCells(seed);
  const filled = new Set(cells.map((c) => `${c.col},${c.row}`));
  const has = (col, row) => filled.has(`${col},${row}`);

  const floor = makeGrid(COLS, ROWS, (x, y) => `estatica_${(x * 7 + y * 3) % 4}`);
  const objects = [];
  const perCell = [];

  for (const cell of cells) {
    // Vecinos: cada lado sin pieza se cierra con algo legible (L2/L3).
    const piece = PIECES[cell.type]({
      openSouth: cell.openSouth,
      northOpen: has(cell.col, cell.row - 1),
      eastOpen: has(cell.col + 1, cell.row),
      westOpen: has(cell.col - 1, cell.row),
    });
    const ox = cell.col * CELL;
    const oy = cell.row * CELL;
    for (let y = 0; y < CELL; y++) {
      for (let x = 0; x < CELL; x++) {
        const gx = ox + x;
        const gy = oy + y;
        floor[gy][gx] = tileFor(cell.type, x, y, piece.grid[y][x], gx, gy);
      }
    }
    let n = 0;
    for (const obj of piece.objects) {
      n += 1;
      const shifted = {
        ...obj,
        id: `c${cell.col}r${cell.row}_${n}`,
        x: obj.x + ox,
        y: obj.y + oy,
      };
      // Un objeto que queda entero fuera del mapa no se dibuja ni frena (antes
      // la verja sur de la fila de abajo caia en y=40 y no se veia nunca).
      if (shifted.x + shifted.tw <= 0 || shifted.y + shifted.th <= 0
        || shifted.x >= COLS || shifted.y >= ROWS) continue;
      objects.push(shifted);
    }
    const marks = piece.marks.map((m) => ({
      ...m,
      x: m.x + ox * 16,
      y: m.y + oy * 16,
      cell: cell.type,
    }));
    perCell.push({ cell, marks });
  }

  // El borde del loop: contra una celda vacia o el borde del mapa, la mitad de
  // las baldosas de nieve se deshacen en estatica (nunca entre dos piezas).
  // La estatica NO pisa calzada ni vereda (L2b): la boca de la calle tiene que
  // leerse como calle hasta el cierre, no como un damero.
  const borderRng = rngFromSeed((Number(seed) >>> 0) ^ 0x9e3779b9);
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const cell of cells) {
    for (let y = 0; y < CELL; y++) {
      for (let x = 0; x < CELL; x++) {
        const gx = cell.col * CELL + x;
        const gy = cell.row * CELL + y;
        let border = false;
        for (const [dx, dy] of DIRS) {
          const nx = gx + dx;
          const ny = gy + dy;
          if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS
            || !has(Math.floor(nx / CELL), Math.floor(ny / CELL))) {
            border = true;
            break;
          }
        }
        if (!border || borderRng() >= 0.5) continue;
        const name = floor[gy][gx];
        if (name === 'snow' || name.startsWith('snow_')) {
          floor[gy][gx] = `estatica_${(gx * 7 + gy * 3) % 4}`;
        }
      }
    }
  }

  const marks = perCell.flatMap((p) => p.marks);
  const spawns = {};
  let medanos = 0;
  for (const m of marks) {
    if (m.kind !== 'spawn') continue;
    medanos += 1;
    spawns[`m${medanos}`] = { x: m.x, y: m.y };
  }
  // Bocas de calzada que dan a una celda vacia o al borde del mapa. Las este/
  // oeste van 2 baldosas adentro y sobre la vereda de enfrente (fila 18): en la
  // calzada caian dentro del auto estacionado de la esquina. La norte va 2
  // baldosas adentro de la avenida. No hay boca sur: las piezas que abren al
  // sur estan siempre en la fila de arriba, con pieza abajo (L11).
  const INSIDE = 2 * 16;
  let bocas = 0;
  for (const { cell } of perCell) {
    const {
      col, row, type,
    } = cell;
    const X = col * CELL_PX;
    const Y = row * CELL_PX;
    const west = col === 0 || !has(col - 1, row);
    const east = col === 3 || !has(col + 1, row);
    const north = NORTH_EXIT.has(type) && (row === 0 || !has(col, row - 1));
    if (west) spawns[`boca_${++bocas}`] = { x: X + 8 + INSIDE, y: Y + 18 * 16 + 12 };
    if (east) spawns[`boca_${++bocas}`] = { x: X + CELL_PX - 8 - INSIDE, y: Y + 18 * 16 + 12 };
    if (north) spawns[`boca_${++bocas}`] = { x: X + 168, y: Y + 8 + INSIDE };
  }

  const loot = marks
    .filter((m) => m.kind === 'loot' || m.kind === 'nafta')
    .map((m) => ({ x: m.x, y: m.y, kind: m.kind, cell: m.cell }));
  const crateMark = marks.find((m) => m.kind === 'crate');
  const exitMark = marks.find((m) => m.kind === 'exitHome');
  const exitHome = exitMark
    ? { x: exitMark.x, y: exitMark.y, w: exitMark.w || 32, h: exitMark.h || 20 }
    : null;

  const bounds = {
    // 12 px de margen: el sprite de Juan (16 px) entra entero en el mapa.
    minX: 12, maxX: COLS * 16 - 12, minY: 0, maxY: ROWS * 16,
    // mismo contrato que street.js: el jugador se mueve por x/feet.
    // minFeet 32: con los pies mas arriba, el sprite se dibuja desde feet-32 y
    // el borde norte se lo comia (L7).
    minFeet: 32, maxFeet: ROWS * 16 - 2,
  };
  const map = {
    id: 'barrio',
    name: 'Barrio',
    cols: COLS,
    rows: ROWS,
    floor,
    solidTiles: ['black', 'grass_', 'estatica_'],
    spawn: { x: exitHome.x + exitHome.w / 2, y: exitHome.y + exitHome.h + 4, dir: 'right' },
    bounds,
    objects,
    surfaces: [],
    lights: [],
    windows: [],
    npcs: [],
    pickups: [],
    warps: [],
    emissive: 'snow',
    emissiveTiles: ['snow_', 'sidewalk_', 'curb_', 'road_', 'path_'],
    arena: { ...bounds },
    spawns,
    loot,
    crate: crateMark ? { x: crateMark.x, y: crateMark.y } : null,
    exitHome,
    cells,
  };
  return { cells, map };
}

export default buildBarrio;
