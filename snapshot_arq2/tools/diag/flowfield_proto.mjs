// DIAGNÓSTICO / PROTOTIPO (no toca el juego): mide un flow field BFS sobre la
// grilla real del barrio y calcula el camino que hoy no encuentra el steering.
// Uso: node tools/diag/flowfield_proto.mjs [semilla]
import { buildBarrio, COLS, ROWS } from '../../src/maps/barrio/index.js';
import { ENEMY_TYPES } from '../../src/arena/enemies.js';

const SEED = Number(process.argv[2] || 3455);
const SOLID = ['black', 'grass_', 'estatica_'];
const solidName = (n) => SOLID.some((p) => n === p || n.startsWith(p));
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

const { map } = buildBarrio(SEED);
const boxes = [];
for (const o of map.objects) {
  if (!o.solid) continue;
  const s = o.solid === true ? { x: 0, y: 0, w: o.tw, h: o.th } : o.solid;
  boxes.push({ x: (o.x + s.x) * 16, y: (o.y + s.y) * 16, w: s.w * 16, h: s.h * 16 });
}
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

/** Máscara caminable para un bicho: su caja de choque centrada en el nodo. */
function maskFor(type) {
  const def = ENEMY_TYPES[type];
  const w = def.w * 0.6; const h = def.h * 0.45;
  const free = new Uint8Array(COLS * ROWS);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const cx = x * 16 + 8; const feet = y * 16 + 14;
    free[y * COLS + x] = isSolidBox({ x: cx - w / 2, y: feet - h, w, h }) ? 0 : 1;
  }
  return free;
}

const NEI = [[1, 0], [-1, 0], [0, 1], [0, -1]];
function buildFlow(free, tx, ty) {
  const dist = new Uint16Array(COLS * ROWS).fill(0xffff);
  const dir = new Uint8Array(COLS * ROWS).fill(255);
  if (!free[ty * COLS + tx]) return { dist, dir, touched: 0 };
  const q = new Int32Array(COLS * ROWS);
  let head = 0; let tail = 0;
  dist[ty * COLS + tx] = 0; q[tail++] = ty * COLS + tx;
  const DIRS = { 0: 3, 1: 1, 2: 0, 3: 2 }; // desde la vecina, volver al nodo padre
  while (head < tail) {
    const i = q[head++]; const x = i % COLS; const y = (i / COLS) | 0;
    for (let k = 0; k < 4; k++) {
      const nx = x + NEI[k][0]; const ny = y + NEI[k][1];
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      const ni = ny * COLS + nx;
      if (!free[ni] || dist[ni] !== 0xffff) continue;
      dist[ni] = dist[i] + 1; dir[ni] = DIRS[k]; q[tail++] = ni;
    }
  }
  return { dist, dir, touched: tail };
}

const all = {};
for (const type of ['cascarudo', 'veloz', 'acorazado']) {
  const free = maskFor(type);
  let freeN = 0; for (let i = 0; i < free.length; i++) freeN += free[i];
  all[type] = { freeTiles: freeN };
  // Costo de un BFS: 1000 campos completos.
  const px = Math.floor(330 / 16); const py = Math.floor(480 / 16);
  const t0 = performance.now();
  let touched = 0;
  for (let i = 0; i < 1000; i++) touched = buildFlow(free, px, py).touched;
  const ms = performance.now() - t0;
  all[type].bfsTouched = touched;
  all[type].bfsMs = +(ms / 1000).toFixed(4);
  all[type].bfsPerSecondAt4Hz = +(all[type].bfsMs * 4).toFixed(4); // ms por segundo si se recalcula 4 veces por segundo
}
// Camino del cascarudo desde (300,480) hasta el jugador (450,480) en la grilla.
{
  const free = maskFor('cascarudo');
  const nearestFree = (tx, ty) => {
    let best = null; let bestD = Infinity;
    for (let y = Math.max(0, ty - 6); y <= Math.min(ROWS - 1, ty + 6); y++) {
      for (let x = Math.max(0, tx - 6); x <= Math.min(COLS - 1, tx + 6); x++) {
        if (!free[y * COLS + x]) continue;
        const d = Math.abs(x - tx) + Math.abs(y - ty);
        if (d < bestD) { bestD = d; best = [x, y]; }
      }
    }
    return best;
  };
  const goal = nearestFree(Math.floor(450 / 16), Math.floor(480 / 16));
  const startTile = nearestFree(Math.floor(300 / 16), Math.floor(480 / 16));
  const flow = buildFlow(free, goal[0], goal[1]);
  let x = startTile[0]; let y = startTile[1];
  const start = [x, y]; const path = [[x, y]];
  for (let n = 0; n < 200; n++) {
    const i = y * COLS + x;
    if (flow.dist[i] === 0) break;
    const d = flow.dir[i];
    if (d === 255) break;
    if (d === 0) y -= 1; else if (d === 1) x += 1; else if (d === 2) y += 1; else x -= 1;
    path.push([x, y]);
  }
  all.flowPath = {
    start, goal, end: [x, y], reachedGoal: x === goal[0] && y === goal[1], steps: path.length - 1,
    worldDistancePx: (path.length - 1) * 16,
    secondsAtCascarudoSpeed: +((path.length - 1) * 16 / 34).toFixed(1),
    sample: path.filter((_, i) => i % 5 === 0 || i === path.length - 1),
  };
}
// Anchos libres de la cortada (solidos de la pieza local) para el acorazado.
console.log(JSON.stringify(all, null, 2));
