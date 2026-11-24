// DIAGNÓSTICO (no toca el juego): auditoría de sólidos y conectividad del barrio.
// Uso: node tools/diag/barrio_audit.mjs [semilla] [--json]
// Imprime: sólidos por sprite vs rect dibujado, BFS con la caja del jugador,
// spawns/loot/exithome bloqueados, y anchos del pasaje de la cortada.
import { buildBarrio, COLS, ROWS, CELL } from '../../src/maps/barrio/index.js';
import { PIECES } from '../../src/maps/barrio/pieces.js';
import { SIZE } from '../../src/maps/barrio/sizes.js';
import { solidRectFor } from '../../src/maps/solid.js';

const SEED = Number(process.argv[2] || 3455);
const SOLID = ['black', 'grass_', 'estatica_'];
const solidName = (n) => SOLID.some((p) => n === p || n.startsWith(p));
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const area = (r) => Math.max(0, r.w) * Math.max(0, r.h);
const intersect = (a, b) => {
  const x0 = Math.max(a.x, b.x); const y0 = Math.max(a.y, b.y);
  const x1 = Math.min(a.x + a.w, b.x + b.w); const y1 = Math.min(a.y + a.h, b.y + b.h);
  return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
};

/** Rect que dibuja mapView.layout() para un objeto (sin trim del sprite). */
function drawnRect(o) {
  const [w, h] = SIZE[o.sprite] || [o.tw * 16, o.th * 16];
  const anchorX = (o.x + o.tw / 2) * 16;
  const anchorY = (o.y + o.th) * 16;
  const [ox, oy] = o.offset || [0, 0];
  const px = Math.round(anchorX + ox);
  const py = Math.round(anchorY - h / 2 + oy);
  return { x: Math.round(px - w / 2), y: Math.round(py - h / 2), w, h };
}
function solidRect(o) {
  // Misma cuenta que WorldMap.rebuildSolids: `solidPx` = rect dibujado (1B).
  if (o.solidPx) return solidRectFor(o, SIZE[o.sprite]);
  const s = o.solid === true ? { x: 0, y: 0, w: o.tw, h: o.th } : o.solid;
  return { x: (o.x + s.x) * 16, y: (o.y + s.y) * 16, w: s.w * 16, h: s.h * 16 };
}

const { cells, map } = buildBarrio(SEED);
const boxes = [];
for (const o of map.objects) {
  if (!o.solid || o.hidden) continue;
  boxes.push({ ...solidRect(o), id: o.id, sprite: o.sprite });
}
const isSolidBox = (box) => {
  for (const b of boxes) if (overlaps(box, b)) return true;
  const x0 = Math.floor(box.x / 16); const x1 = Math.floor((box.x + box.w - 0.01) / 16);
  const y0 = Math.floor(box.y / 16); const y1 = Math.floor((box.y + box.h - 0.01) / 16);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (x < 0 || y < 0 || x >= map.cols || y >= map.rows) return true;
    if (solidName(map.floor[y][x])) return true;
  }
  return false;
};
// Nodo de la grilla = pies del jugador en (x*16+8, y*16+12), caja 10x6.
const free = Array.from({ length: ROWS }, () => new Uint8Array(COLS));
for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
  free[y][x] = isSolidBox({ x: x * 16 + 3, y: y * 16 + 6, w: 10, h: 6 }) ? 0 : 1;
}
const sx = Math.floor(map.spawn.x / 16); const sy = Math.floor(map.spawn.y / 16);
const dist = Array.from({ length: ROWS }, () => new Int32Array(COLS).fill(-1));
const q = [[sx, sy]]; dist[sy][sx] = 0;
let head = 0;
while (head < q.length) {
  const [x, y] = q[head++];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx; const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || !free[ny][nx] || dist[ny][nx] >= 0) continue;
    dist[ny][nx] = dist[y][x] + 1; q.push([nx, ny]);
  }
}
let freeCount = 0; let reach = 0;
for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
  if (free[y][x]) freeCount++;
  if (dist[y][x] >= 0) reach++;
}
// Puntos: ¿el tile que los contiene es libre/alcanzable? ¿Hay algún nodo alcanzable en 2 baldosas?
function pointInfo(x, y) {
  const tx = Math.floor(x / 16); const ty = Math.floor(y / 16);
  let best = -1; let bestD = 999;
  for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) {
    const nx = tx + ox; const ny = ty + oy;
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
    if (dist[ny][nx] >= 0) {
      const d = Math.abs(ox) + Math.abs(oy);
      if (d < bestD) { bestD = d; best = { x: nx, y: ny }; }
    }
  }
  return {
    tile: [tx, ty],
    onFree: tx >= 0 && ty >= 0 && tx < COLS && ty < ROWS ? Boolean(free[ty][tx]) : false,
    inRoom: Boolean(free[ty]?.[tx]) || null,
    reachable: tx >= 0 && ty >= 0 && tx < COLS && ty < ROWS ? dist[ty][tx] >= 0 : false,
    nearestReachable: best, nearestSteps: best ? bestD : null,
  };
}
const problems = [];
for (const [name, p] of Object.entries(map.spawns)) {
  const i = pointInfo(p.x, p.y);
  const bad = !i.onFree || !i.reachable;
  if (bad) problems.push({ kind: 'spawn', name, x: p.x, y: p.y, ...i });
}
for (const l of map.loot) {
  const i = pointInfo(l.x, l.y);
  if (!i.onFree || !i.reachable) problems.push({ kind: 'loot', cell: l.cell, x: l.x, y: l.y, ...i });
}
if (map.crate) problems.push({ kind: 'crate', x: map.crate.x, y: map.crate.y, ...pointInfo(map.crate.x, map.crate.y) });
const eh = map.exitHome;
problems.push({ kind: 'exitHome', x: eh.x + eh.w / 2, y: eh.y + eh.h, ...pointInfo(eh.x + eh.w / 2, eh.y + eh.h) });
problems.push({ kind: 'playerSpawn', x: map.spawn.x, y: map.spawn.y, ...pointInfo(map.spawn.x, map.spawn.y) });

// Alineación sólido vs dibujo (el contrato del fix 1B: error < 2 px).
const mism = new Map();
const edgeErr = (d, s) => Math.max(
  Math.abs(s.x - d.x), Math.abs(s.y - d.y),
  Math.abs((s.x + s.w) - (d.x + d.w)), Math.abs((s.y + s.h) - (d.y + d.h)),
);
const alignErr = (o, d, s) => {
  const inter = intersect(d, s);
  const cover = area(s) ? area(inter) / area(s) : 0; // cuánto del sólido cae sobre el dibujo
  const fuera = cover < 0.999;
  // Huellas pegadas al piso (troncos, postes): importa que apoyen en el pie.
  // El ancho/centro se verifica por sprite en test/barrio_objects.test.js
  // (los postes no estan centrados en su frame).
  const err = o.solidPx === 'full'
    ? edgeErr(d, s)
    : Math.abs((s.y + s.h) - (d.y + d.h));
  return { cover, fuera, err };
};
for (const o of map.objects) {
  if (!o.solid) continue;
  const d = drawnRect(o); const s = solidRect(o);
  const a = alignErr(o, d, s);
  // 2 px de tolerancia: algunos frames (pino, farola) tienen filas transparentes
  // al pie y la huella apoya en el pixel visible.
  if (!a.fuera && a.err <= 2) continue;
  const flags = [];
  if (a.fuera) flags.push('solido-fuera-del-dibujo');
  if (a.err > 2) flags.push('desalineado');
  const key = `${o.sprite}|${flags.join(',')}`;
  if (!mism.has(key)) mism.set(key, []);
  mism.get(key).push({
    id: o.id, d, s, cover: +a.cover.toFixed(2), err: +a.err.toFixed(1),
    footprint: o.solidPx === 'full' ? 'full' : 'base', ox: o.offset?.[0], oy: o.offset?.[1],
  });
}

// Anchos libres del pasaje de la cortada: escaneo por filas y columnas.
function pieceMap(type) {
  const p = PIECES[type]({ openSouth: false });
  const blocked = Array.from({ length: CELL }, () => new Uint8Array(CELL));
  for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) blocked[y][x] = solidName(nameFor(p.grid[y][x], type));
  for (const o of p.objects) {
    if (!o.solid) continue;
    const s = solidRect(o);
    for (let y = Math.floor(s.y / 16); y < Math.ceil((s.y + s.h) / 16); y++) {
      for (let x = Math.floor(s.x / 16); x < Math.ceil((s.x + s.w) / 16); x++) {
        if (y >= 0 && y < CELL && x >= 0 && x < CELL) blocked[y][x] = 1;
      }
    }
  }
  return { p, blocked };
}
function nameFor(letter) {
  if (letter === 'g') return 'grass_0';
  if (letter === 'S') return 'snow_0';
  return 'walk';
}
const cor = pieceMap('cortada');
const corridas = [];
for (let y = 0; y < CELL; y++) {
  let run = 0;
  for (let x = 0; x < CELL; x++) {
    if (!cor.blocked[y][x]) run++; else { if (run >= 1) corridas.push({ y, x0: x - run, x1: x - 1, w: run }); run = 0; }
  }
  if (run) corridas.push({ y, x0: CELL - run, x1: CELL - 1, w: run });
}
const angostas = corridas.filter((r) => r.w <= 3);

const report = {
  seed: SEED,
  cells: cells.map((c) => `${c.type}@${c.col},${c.row}${c.openSouth ? '+S' : ''}`),
  objects: map.objects.length,
  objectSolids: boxes.length,
  freeTiles: freeCount,
  reachableTiles: reach,
  reachPct: +(100 * reach / freeCount).toFixed(1),
  problems,
  mismatches: [...mism.entries()].map(([key, list]) => ({
    key, n: list.length,
    examples: list.slice(0, 3).map((e) => ({
      id: e.id,
      solid: `${e.s.x},${e.s.y} ${e.s.w}x${e.s.h}`,
      drawn: `${e.d.x},${e.d.y} ${e.d.w}x${e.d.h}`,
      cover: e.cover, coverDraw: e.coverDraw, tw: e.tw, th: e.th, offset: [e.ox, e.oy],
    })),
  })),
  cortadaRowsLeq3: angostas.length,
  cortadaWidths: [...new Set(angostas.map((r) => r.w))].sort((a, b) => a - b),
};
console.log(JSON.stringify(report, null, 2));
