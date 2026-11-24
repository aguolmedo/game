// DIAGNÓSTICO (no toca el juego): auditoría de diseño del barrio por semilla.
// Uso: node tools/diag/barrio_level_audit.mjs [primera] [ultima]
import { buildBarrio, COLS, ROWS, CELL } from '../../src/maps/barrio/index.js';
import { SIZE } from '../../src/maps/barrio/sizes.js';
import { solidRectFor } from '../../src/maps/solid.js';

const SOLID = ['black', 'grass_', 'estatica_'];
const solidName = (n) => SOLID.some((p) => n === p || n.startsWith(p));
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function audit(seed) {
  const { cells, map } = buildBarrio(seed);
  const boxes = [];
  for (const o of map.objects) {
    if (!o.solid) continue;
    // Mismo rect que el juego (fix 1B): la huella del objeto con su offset.
    const size = SIZE[o.sprite];
    const rect = size ? solidRectFor(o, size) : null;
    if (rect) boxes.push(rect);
  }
  if (map.crate) boxes.push({ x: map.crate.x - 8, y: map.crate.y - 8, w: 16, h: 16 });
  const isSolidBox = (b) => {
    for (const s of boxes) if (overlaps(b, s)) return true;
    for (let y = Math.floor(b.y / 16); y <= Math.floor((b.y + b.h - 0.01) / 16); y++) {
      for (let x = Math.floor(b.x / 16); x <= Math.floor((b.x + b.w - 0.01) / 16); x++) {
        if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return true;
        if (solidName(map.floor[y][x])) return true;
      }
    }
    return false;
  };
  const free = Array.from({ length: ROWS }, () => new Uint8Array(COLS));
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    free[y][x] = isSolidBox({ x: x * 16 + 3, y: y * 16 + 6, w: 10, h: 6 }) ? 0 : 1;
  }
  const sx = Math.floor(map.spawn.x / 16); const sy = Math.floor(map.spawn.y / 16);
  const dist = Array.from({ length: ROWS }, () => new Int32Array(COLS).fill(-1));
  const q = [[sx, sy]]; dist[sy][sx] = 0;
  for (let head = 0; head < q.length; head++) {
    const [x, y] = q[head];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx; const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || !free[ny][nx] || dist[ny][nx] >= 0) continue;
      dist[ny][nx] = dist[y][x] + 1; q.push([nx, ny]);
    }
  }
  // Mismo reachableGround() que arena.js (~518) para los puntos de botín.
  const reachableGround = (x, y) => {
    const offsets = [[0, 0], [0, 14], [0, -14], [16, 0], [-16, 0], [16, 14], [-16, 14], [0, 28], [0, -28], [28, 0], [-28, 0]];
    for (const [dx, dy] of offsets) {
      const px = clamp(x + dx, map.arena.minX + 8, map.arena.maxX - 8);
      const py = clamp(y + dy, map.bounds.minFeet + 8, map.bounds.maxFeet - 2);
      if (!isSolidBox({ x: px - 5, y: py - 6, w: 10, h: 6 })) return { x: px, y: py };
    }
    return { x, y };
  };
  // El botín se levanta a <=10 px: basta una baldosa alcanzable al lado del
  // punto (el centro de la baldosa puede caer sobre el borde de un sólido).
  const reachablePoint = (x, y) => {
    const bx = Math.floor(x / 16); const by = Math.floor(y / 16);
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const tx = bx + ox; const ty = by + oy;
      if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS || dist[ty][tx] < 0) continue;
      if (Math.abs(tx * 16 + 8 - x) <= 8 && Math.abs(ty * 16 + 12 - y) <= 14) return true;
    }
    return false;
  };
  const loot = map.loot.map((l) => {
    const p = reachableGround(l.x, l.y);
    return { kind: l.kind, cell: l.cell, moved: p.x !== l.x || p.y !== l.y, x: p.x, y: p.y, reachable: reachablePoint(p.x, p.y) };
  });
  // Salidas al norte de piezas de la fila de abajo sin celda arriba.
  const has = (col, row) => cells.some((c) => c.col === col && c.row === row);
  const NORTH = new Set(['esquina', 'plaza', 'vias']);
  const deadNorth = [];
  for (const c of cells) {
    if (!NORTH.has(c.type) || (c.row === 0 ? false : has(c.col, c.row - 1))) continue;
    const y = c.row * 20; // fila 0 local de la pieza
    let staticN = 0; let walkN = 0;
    for (let x = c.col * 20; x < c.col * 20 + 20; x++) {
      if (solidName(map.floor[y][x])) staticN++; else walkN++;
    }
    deadNorth.push({ cell: `${c.type}@${c.col},${c.row}`, row0Static: staticN, row0Walkable: walkN });
  }
  // Bocas de calzada este/oeste que dan a una celda vacía: cuántas baldosas de
  // calzada del borde quedaron en estática (50% del borderRng).
  const mouths = [];
  for (const c of cells) {
    for (const [dx, name] of [[-1, 'oeste'], [1, 'este']]) {
      const nc = c.col + dx; const nr = c.row;
      if (nc >= 0 && nc < 4 && has(nc, nr)) continue;
      if (c.col === 0 && dx < 0) continue; // borde del mapa, no boca interna
      const bx = dx < 0 ? c.col * 20 : c.col * 20 + 19;
      let staticN = 0; let roadN = 0;
      for (let y = c.row * 20 + 15; y <= c.row * 20 + 17; y++) {
        const n = map.floor[y][bx];
        if (solidName(n)) staticN++; else if (n.startsWith('road')) roadN++;
      }
      if (staticN || roadN) mouths.push({ cell: `${c.type}@${c.col},${c.row}`, side: name, col: bx, roadTiles: roadN, staticTiles: staticN });
    }
  }
  const stacked = [];
  for (const c of cells) {
    if (c.row !== 0) continue;
    const below = cells.find((d) => d.col === c.col && d.row === 1 && d.type === c.type);
    if (below) stacked.push(`${c.type}@${c.col}`);
  }
  return {
    seed,
    cells: cells.map((c) => `${c.type}@${c.col},${c.row}${c.openSouth ? '+S' : ''}`),
    lootUnreachable: loot.filter((l) => !l.reachable),
    lootMoved: loot.filter((l) => l.moved).length,
    deadNorth,
    mouths,
    stacked,
  };
}
const from = Number(process.argv[2] || 1); const to = Number(process.argv[3] || 20);
const all = [];
for (let s = from; s <= to; s++) all.push(audit(s));
console.log(JSON.stringify(all, null, 2));
