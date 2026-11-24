// DIAGNÓSTICO: ¿los spawns de bichos quedan en la misma componente que el jugador
// para cada tamaño (cascarudo 20x16, veloz 14x12, acorazado 28x22)?
import { buildBarrio, COLS, ROWS } from '../../src/maps/barrio/index.js';
import { ENEMY_TYPES } from '../../src/arena/enemies.js';
const SOLID = ['black', 'grass_', 'estatica_'];
const sn = (n) => SOLID.some((p) => n === p || n.startsWith(p));
const OVER = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
for (let seed = 1; seed <= 20; seed++) {
  const { map } = buildBarrio(seed);
  const boxes = [];
  for (const o of map.objects) {
    if (!o.solid) continue;
    const s = o.solid === true ? { x: 0, y: 0, w: o.tw, h: o.th } : o.solid;
    boxes.push({ x: (o.x + s.x) * 16, y: (o.y + s.y) * 16, w: s.w * 16, h: s.h * 16 });
  }
  const isS = (b) => {
    for (const s of boxes) if (OVER(b, s)) return true;
    for (let y = Math.floor(b.y / 16); y <= Math.floor((b.y + b.h - 0.01) / 16); y++)
      for (let x = Math.floor(b.x / 16); x <= Math.floor((b.x + b.w - 0.01) / 16); x++) {
        if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return true;
        if (sn(map.floor[y][x])) return true;
      }
    return false;
  };
  const line = [];
  for (const type of ['cascarudo', 'veloz', 'acorazado']) {
    const def = ENEMY_TYPES[type];
    const w = def.w * 0.6; const h = def.h * 0.45;
    const free = new Uint8Array(COLS * ROWS);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      free[y * COLS + x] = isS({ x: x * 16 + 8 - w / 2, y: y * 16 + 14 - h, w, h }) ? 0 : 1;
    }
    // Componente del spawn del jugador.
    const px = Math.floor(map.spawn.x / 16); const py = Math.floor(map.spawn.y / 16);
    const idx = py * COLS + px;
    const seen = new Uint8Array(COLS * ROWS);
    const q = [idx]; seen[idx] = 1;
    const near = (tx, ty) => {
      // la baldosa libre más cercana en 2 baldosas
      for (let r = 0; r <= 2; r++) for (let oy = -r; oy <= r; oy++) for (let ox = -r; ox <= r; ox++) {
        if (Math.abs(ox) + Math.abs(oy) !== r) continue;
        const nx = tx + ox; const ny = ty + oy;
        if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
        if (!free[ny * COLS + nx]) continue;
        return { nx, ny };
      }
      return null;
    };
    const start = near(px, py) || { nx: px, ny: py };
    if (!free[start.ny * COLS + start.nx]) { line.push(`${type}: spawn jugador SOLIDO`); continue; }
    const q2 = [start.ny * COLS + start.nx]; seen[start.ny * COLS + start.nx] = 1;
    for (let head = 0; head < q2.length; head++) {
      const i = q2[head]; const x = i % COLS; const y = (i / COLS) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx; const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
        const ni = ny * COLS + nx;
        if (seen[ni] || !free[ni]) continue;
        seen[ni] = 1; q2.push(ni);
      }
    }
    let freeN = 0; let reachN = 0;
    for (let i = 0; i < free.length; i++) { if (free[i]) freeN++; if (seen[i]) reachN++; }
    let badSpawns = 0;
    for (const p of Object.values(map.spawns)) {
      const tx = Math.floor(p.x / 16); const ty = Math.floor(p.y / 16);
      const s = near(tx, ty);
      if (!s) continue;
      if (!seen[s.ny * COLS + s.nx]) badSpawns++;
    }
    line.push(`${type} free=${freeN} reach=${reachN} perdidas=${freeN - reachN} spawnsAislados=${badSpawns}`);
  }
  console.log(`seed ${String(seed).padStart(2)} | ${line.join(' | ')}`);
}
