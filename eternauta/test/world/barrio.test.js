import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { layoutCells, buildBarrio, COLS, ROWS, CELL } from '../../src/maps/barrio/index.js';
import { PIECES, NORTH_EXIT } from '../../src/maps/barrio/pieces.js';
import { SIZE } from '../../src/maps/barrio/sizes.js';
import { solidRectFor, drawOrigin, FULL, TILE, solidRectsOf } from '../../src/maps/solid.js';
import { WorldMap } from '../../src/mapView.js';

// --- barrio_pieces.test.js
{
// El barrio del roguelike: piezas de 20x20, grilla de 4x2 y conectividad.
// Datos puros (sin DOM): buildBarrio(seed) arma el mapa como src/maps/street.js.

const read = (name) => JSON.parse(
  fs.readFileSync(new URL(`../../public/assets/${name}`, import.meta.url), 'utf8'),
).frames;
const tiles = read('tiles.json');
const ATLASES = ['objects', 'street2', 'houses', 'interior2'];
const sprites = new Set();
for (const atlas of ATLASES) {
  for (const name of Object.keys(read(`${atlas}.json`))) sprites.add(name);
}

const SEEDS = [1, 2, 3, 7, 42, 1234];
const NORTH_EXIT = new Set(['esquina', 'plaza', 'vias']);

test('layoutCells es determinística para la misma semilla', () => {
  for (const seed of SEEDS) {
    assert.deepEqual(layoutCells(seed), layoutCells(seed));
  }
  const a = JSON.stringify(layoutCells(1));
  const b = JSON.stringify(layoutCells(2));
  assert.notEqual(a, b, 'dos semillas distintas arman el mismo barrio');
});

test('siempre hay casa en (0,1) y las cuatro columnas de abajo están llenas', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const cells = layoutCells(seed);
    const casa = cells.filter((c) => c.type === 'casa');
    assert.equal(casa.length, 1, `semilla ${seed}: una sola casa`);
    assert.deepEqual([casa[0].col, casa[0].row], [0, 1], `semilla ${seed}: casa en (0,1)`);
    const bottom = cells.filter((c) => c.row === 1);
    assert.equal(bottom.length, 4, `semilla ${seed}: fila de abajo completa`);
    assert.deepEqual(bottom.map((c) => c.col).sort(), [0, 1, 2, 3]);
    const types = bottom.map((c) => c.type);
    // la casa no se repite y las otras tres son distintas entre si
    assert.equal(new Set(types).size, 4, `semilla ${seed}: tres piezas distintas`);
  }
});

test('las piezas de arriba abren al sur y van sobre una pieza con salida al norte', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const cells = layoutCells(seed);
    const top = cells.filter((c) => c.row === 0);
    assert.ok(top.length >= 1, `semilla ${seed}: al menos una pieza arriba`);
    for (const cell of top) {
      assert.equal(cell.openSouth, true, 'la pieza de arriba no abre al sur');
      assert.notEqual(cell.type, 'casa', 'no hay casa en la fila de arriba');
      const below = cells.find((c) => c.row === 1 && c.col === cell.col);
      assert.ok(below, 'hay pieza arriba sin pieza abajo');
      assert.ok(NORTH_EXIT.has(below.type), `arriba de ${below.type} (sin salida al norte)`);
    }
    const belowCells = cells.filter((c) => c.row === 1);
    for (const cell of belowCells) {
      const above = cells.find((c) => c.row === 0 && c.col === cell.col);
      if (above) assert.ok(NORTH_EXIT.has(cell.type), 'pieza sin salida al norte con vecina arriba');
    }
    for (const cell of cells) assert.equal(cell.openSouth, cell.row === 0);
  }
});

test('buildBarrio da un piso de 80x40 con baldosas existentes', () => {
  for (const seed of SEEDS) {
    const { map } = buildBarrio(seed);
    assert.equal(map.id, 'barrio');
    assert.deepEqual([map.cols, map.rows], [COLS, ROWS]);
    assert.equal(COLS, 80);
    assert.equal(ROWS, 40);
    assert.equal(map.floor.length, 40);
    for (const row of map.floor) assert.equal(row.length, 80);
    for (let y = 0; y < map.rows; y++) {
      for (let x = 0; x < map.cols; x++) {
        assert.ok(tiles[map.floor[y][x]], `baldosa desconocida ${map.floor[y][x]} en (${x},${y})`);
      }
    }
    for (const tile of map.solidTiles) {
      assert.ok(typeof tile === 'string' && tile.length > 0);
    }
  }
});

test('todos los sprites de los objetos existen en algún atlas', () => {
  for (const seed of SEEDS) {
    const { map } = buildBarrio(seed);
    assert.ok(map.objects.length > 100, 'faltan objetos');
    const ids = new Set();
    for (const obj of map.objects) {
      assert.ok(sprites.has(obj.sprite), `sprite ${obj.sprite} (${obj.id}) no existe`);
      assert.ok(Number.isInteger(obj.x) && Number.isInteger(obj.y), `${obj.id}: x/y`);
      assert.ok(obj.tw > 0 && obj.th > 0);
      assert.ok(!ids.has(obj.id), `id repetido ${obj.id}`);
      ids.add(obj.id);
    }
  }
});

test('hay al menos 2 spawns, 3 loot y un exitHome', () => {
  for (const seed of SEEDS) {
    const { map } = buildBarrio(seed);
    assert.ok(Object.keys(map.spawns).length >= 2, `semilla ${seed}: spawns`);
    assert.ok(map.loot.length >= 3, `semilla ${seed}: loot`);
    for (const l of map.loot) {
      assert.ok(l.kind === 'loot' || l.kind === 'nafta', `loot ${l.kind}`);
      assert.ok(Number.isFinite(l.x) && Number.isFinite(l.y));
      assert.ok(typeof l.cell === 'string');
    }
    assert.ok(map.exitHome, 'falta el porton de la casa');
    const { x, y, w, h } = map.exitHome;
    assert.ok(w > 0 && h > 0);
    assert.ok(x >= 0 && y >= 0 && x + w <= map.cols * 16 && y + h <= map.rows * 16);
    assert.ok(map.crate === null || (Number.isFinite(map.crate.x) && Number.isFinite(map.crate.y)));
  }
});

test('conectividad: desde el spawn se llega a la calzada de cada pieza', () => {
  const solid = (map, x, y) => {
    const name = map.floor[y] && map.floor[y][x];
    return !name || map.solidTiles.some((p) => name === p || name.startsWith(p));
  };
  for (const seed of [...SEEDS, 77, 123, 2024]) {
    const { cells, map } = buildBarrio(seed);
    const sx = Math.floor(map.spawn.x / 16);
    const sy = Math.floor((map.spawn.y - 1) / 16);
    assert.equal(solid(map, sx, sy), false, `semilla ${seed}: spawn solido`);
    const seen = new Set([`${sx},${sy}`]);
    const queue = [[sx, sy]];
    while (queue.length) {
      const [x, y] = queue.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        const key = `${nx},${ny}`;
        if (seen.has(key) || solid(map, nx, ny)) continue;
        seen.add(key);
        queue.push([nx, ny]);
      }
    }
    for (const cell of cells) {
      // centro de la calzada de la pieza (filas 15-17)
      const tx = cell.col * CELL + 10;
      const ty = cell.row * CELL + 16;
      assert.equal(solid(map, tx, ty), false, `semilla ${seed}: calzada solida en ${cell.type}`);
      assert.ok(seen.has(`${tx},${ty}`), `semilla ${seed}: no se llega a ${cell.type} (${cell.col},${cell.row})`);
    }
  }
});
}

// --- barrio_level.test.js
{
// Diseño de nivel del barrio (fix 2, hallazgos L1-L11 de docs/analisis_roguelike.md).
// Corre sobre 200 semillas con el MISMO modelo de sólidos que el juego: los
// objetos con `solidPx` y el bbox opaco de los PNG (fix 1B), más la caja de
// pies de 10x6 y los límites del mapa.
//
// Lo que fija:
//  - L1/L5: fila de arriba llena en todas las columnas elegibles, tipos sin
//    repetición y distintos del de abajo.
//  - L2: toda salida sin vecino tiene un cierre legible y la estática no pisa
//    calzada ni vereda; las bocas no caen sobre estática.
//  - L3: los fondos de las piezas no se comunican de costado (medianeras).
//  - L4: la plaza da botín. L6: pasos de 48 px. L7: minFeet=32.
//  - L8: el fondo de la casa se abre por un portón de 3 baldosas.
//  - L9: los rieles terminan en un tope. L10: sin verjas superpuestas.
//  - L11: sin datos muertos.
//  - Conectividad con objetos: desde el spawn se llega a todo el botín, al
//    exitHome y a la calzada de cada pieza. Sin bolsones de más de 3 baldosas.

const TILE = 16;
const MW = 320;
const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);
const POCKET_MAX = 3; // recovecos de decorado; nunca bolsones grandes

// --- PNG de los atlases (mismo decodificador que test/barrio_objects.test.js) ---

function decodePng(buf) {
  assert.equal(buf.toString('latin1', 1, 4), 'PNG', 'no es un PNG');
  let pos = 8;
  let w = 0; let h = 0; const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('latin1', pos + 4, pos + 8);
    const body = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') { w = body.readUInt32BE(0); h = body.readUInt32BE(4); } else if (type === 'IDAT') idat.push(body);
    pos += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = 4;
  const stride = w * bpp;
  const out = Buffer.alloc(w * h * bpp);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = Buffer.alloc(stride);
    for (let i = 0; i < stride; i += 1) {
      const a = i >= bpp ? cur[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a); const pb = Math.abs(p - b); const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[i] = v & 255;
    }
    cur.copy(out, y * stride);
    prev = cur;
  }
  return { w, h, alpha: (x, y) => out[(y * w + x) * bpp + 3] };
}

const ATLASES = ['objects', 'interior2', 'props', 'street2', 'houses', 'fx'];
const sheets = new Map();
function atlas(name) {
  if (!sheets.has(name)) {
    const url = (ext) => new URL(`../../public/assets/${name}.${ext}`, import.meta.url);
    const frames = JSON.parse(fs.readFileSync(url('json'), 'utf8')).frames;
    sheets.set(name, { frames, img: decodePng(fs.readFileSync(url('png'))) });
  }
  return sheets.get(name);
}
function frameOf(sprite) {
  for (const name of ATLASES) {
    const f = atlas(name).frames[sprite];
    if (f) return Array.isArray(f) ? f : [f.x, f.y, f.w, f.h];
  }
  throw new Error(`falta el sprite ${sprite}`);
}
const trims = new Map();
function trimOf(sprite) {
  if (trims.has(sprite)) return trims.get(sprite);
  const [fx, fy, fw, fh] = frameOf(sprite);
  const img = ATLASES.map(atlas).find((a) => a.frames[sprite]).img;
  let x0 = fw; let y0 = fh; let x1 = -1; let y1 = -1;
  for (let j = 0; j < fh; j += 1) {
    for (let i = 0; i < fw; i += 1) {
      if (img.alpha(fx + i, fy + j) <= 16) continue;
      if (i < x0) x0 = i;
      if (i > x1) x1 = i;
      if (j < y0) y0 = j;
      if (j > y1) y1 = j;
    }
  }
  const out = x1 >= x0 && y1 >= y0 ? { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 } : null;
  trims.set(sprite, out);
  return out;
}

// --- Modelo de sólidos y de lo caminable ---

const STATIC = ['black', 'grass_', 'estatica_'];
const isStaticName = (n) => STATIC.some((p) => n === p || n.startsWith(p));
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** Cajas sólidas del mapa, con el rect dibujado (fix 1B). */
function solidBoxes(map) {
  const out = [];
  for (const obj of map.objects) {
    if (!obj.solid || obj.hidden) continue;
    const size = SIZE[obj.sprite];
    if (!size) continue;
    const rect = solidRectFor(obj, size, trimOf(obj.sprite));
    if (rect) out.push({ ...rect, id: obj.id, sprite: obj.sprite });
  }
  // La caja de municiones no es un objeto sólido del mapa: la arena le agrega
  // su único sólido de 16x16 desde la marca (fix 1A, C2).
  if (map.crate) {
    out.push({ x: map.crate.x - 8, y: map.crate.y - 8, w: 16, h: 16, id: 'caja_municiones', sprite: 'crate' });
  }
  return out;
}

/** Lo que frena una caja de pies (10x6) en px: objetos + piso estático. */
function solidAt(map, boxes, box) {
  for (const b of boxes) if (overlaps(box, b)) return true;
  const x0 = Math.floor(box.x / TILE);
  const x1 = Math.floor((box.x + box.w - 0.01) / TILE);
  const y0 = Math.floor(box.y / TILE);
  const y1 = Math.floor((box.y + box.h - 0.01) / TILE);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return true;
      if (isStaticName(map.floor[y][x])) return true;
    }
  }
  return false;
}

/** Nodo = pies del jugador en el centro de la baldosa (caja 10x6). */
function walkable(map, boxes, tx, ty) {
  const feet = ty * TILE + 12;
  if (feet - 6 < (map.bounds.minFeet ?? 0)) return false;
  return !solidAt(map, boxes, { x: tx * TILE + 3, y: feet - 6, w: 10, h: 6 });
}

/** BFS desde el spawn: { free, seen, comps, reach } sobre la grilla. */
function flood(map, boxes) {
  const free = Array.from({ length: ROWS }, () => new Uint8Array(COLS));
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    free[y][x] = walkable(map, boxes, x, y) ? 1 : 0;
  }
  const sx = Math.floor(map.spawn.x / TILE);
  const sy = Math.floor(map.spawn.y / TILE);
  const seen = Array.from({ length: ROWS }, () => new Uint8Array(COLS));
  const queue = [[sx, sy]];
  seen[sy][sx] = 1;
  let reach = 0;
  for (let head = 0; head < queue.length; head++) {
    const [x, y] = queue[head];
    reach += 1;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx; const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      if (seen[ny][nx] || !free[ny][nx]) continue;
      seen[ny][nx] = 1; queue.push([nx, ny]);
    }
  }
  // Componentes de lo caminable que quedaron fuera del alcance.
  const mark = Array.from({ length: ROWS }, () => new Uint8Array(COLS));
  const comps = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (!free[y][x] || seen[y][x] || mark[y][x]) continue;
    const stack = [[x, y]];
    mark[y][x] = 1;
    let n = 0; let minx = x; let miny = y;
    while (stack.length) {
      const [cx, cy] = stack.pop();
      n += 1; minx = Math.min(minx, cx); miny = Math.min(miny, cy);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx; const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || mark[ny][nx] || !free[ny][nx]) continue;
        mark[ny][nx] = 1; stack.push([nx, ny]);
      }
    }
    comps.push({ n, x: minx, y: miny });
  }
  return { free, seen, comps, reach };
}

/** ¿Hay una baldosa alcanzable donde el punto cae? (BFS por centros) */
function reachablePoint(seen, x, y) {
  const bx = Math.floor(x / TILE); const by = Math.floor(y / TILE);
  for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
    const tx = bx + ox; const ty = by + oy;
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS || !seen[ty][tx]) continue;
    if (Math.abs(tx * TILE + 8 - x) <= 8 && Math.abs(ty * TILE + 12 - y) <= 14) return true;
  }
  return false;
}

/** Lo mismo que `Arena.reachableGround` (arena.js): corre el punto al primer
 * lugar libre. Devuelve null si no encontró ninguno. */
function reachableGround(map, boxes, x, y) {
  const offsets = [[0, 0], [0, 14], [0, -14], [16, 0], [-16, 0],
    [16, 14], [-16, 14], [0, 28], [0, -28], [28, 0], [-28, 0]];
  const b = map.bounds;
  for (const [dx, dy] of offsets) {
    const px = clamp(x + dx, b.minX + 8, b.maxX - 8);
    const py = clamp(y + dy, b.minFeet + 8, b.maxFeet - 2);
    if (!solidAt(map, boxes, { x: px - 5, y: py - 6, w: 10, h: 6 })) return { x: px, y: py };
  }
  return null;
}

/** Auditoría completa de una semilla. */
function audit(seed) {
  const { cells, map } = buildBarrio(seed);
  const boxes = solidBoxes(map);
  const { free, seen, comps, reach } = flood(map, boxes);
  const has = (col, row) => cells.some((c) => c.col === col && c.row === row);

  // L2: cierre de cada salida que no tiene vecino. El pasillo mide 48 px: el
  // cierre tiene que tapar al menos 40 de esos px dentro de los 24 px del borde.
  const closing = (side, cell) => {
    const x0 = cell.col * MW; const y0 = cell.row * MW;
    let band; let lo; let axis;
    if (side === 'o') { band = { x: x0, y: y0 + 240, w: 24, h: 48 }; lo = y0 + 240; axis = 'y'; }
    if (side === 'e') { band = { x: x0 + 296, y: y0 + 240, w: 24, h: 48 }; lo = y0 + 240; axis = 'y'; }
    if (side === 'n') { band = { x: x0 + 144, y: y0, w: 48, h: 24 }; lo = x0 + 144; axis = 'x'; }
    if (side === 's') { band = { x: x0 + 144, y: y0 + 296, w: 48, h: 24 }; lo = x0 + 144; axis = 'x'; }
    const hi = lo + 48;
    // Unión de los tramos tapados (dos tapiales contiguos cierran 96 px).
    const spans = [];
    for (const b of boxes) {
      if (!overlaps(b, band)) continue;
      const bl = Math.max(lo, axis === 'y' ? b.y : b.x);
      const bh = Math.min(hi, axis === 'y' ? b.y + b.h : b.x + b.w);
      if (bh > bl) spans.push([bl, bh]);
    }
    spans.sort((a, b) => a[0] - b[0]);
    let covered = 0; let end = -1e9;
    for (const [a, b] of spans) {
      if (b <= end) continue;
      covered += b - Math.max(a, end);
      end = b;
    }
    return covered;
  };
  const dead = [];
  for (const cell of cells) {
    const sides = [
      ['o', cell.col === 0 || !has(cell.col - 1, cell.row)],
      ['e', cell.col === 3 || !has(cell.col + 1, cell.row)],
    ];
    if (NORTH_EXIT.has(cell.type)) sides.push(['n', cell.row === 0 || !has(cell.col, cell.row - 1)]);
    if (cell.openSouth) sides.push(['s', cell.row === 1 || !has(cell.col, cell.row + 1)]);
    for (const [side, isDead] of sides) {
      if (!isDead) continue;
      dead.push({ cell, side, covered: closing(side, cell) });
    }
  }

  // L2: bocas (puntos de aparición de bichos) fuera de la estática y de los sólidos.
  const bocas = Object.entries(map.spawns).map(([name, p]) => {
    const tx = Math.floor(p.x / TILE); const ty = Math.floor(p.y / TILE);
    return {
      name,
      x: p.x,
      y: p.y,
      onStatic: Boolean(map.floor[ty] && isStaticName(map.floor[ty][tx])),
      inSolid: solidAt(map, boxes, { x: p.x - 5, y: p.y - 6, w: 10, h: 6 }),
      reachable: reachablePoint(seen, p.x, p.y),
    };
  });

  // L2b: en una pieza llena, la calzada y la vereda de la banda de paso nunca
  // son estática (la estática solo se come la nieve del borde).
  const roadStatic = [];
  for (const cell of cells) {
    for (let ty = cell.row * CELL + 13; ty <= cell.row * CELL + 18; ty++) {
      for (let tx = cell.col * CELL; tx < cell.col * CELL + CELL; tx++) {
        const name = map.floor[ty][tx];
        if (isStaticName(name)) roadStatic.push(`${tx},${ty} ${name}`);
      }
    }
  }

  // L2 + conectividad: el botín se corre como en la arena y tiene que quedar
  // sobre un punto libre y alcanzable.
  const loot = map.loot.map((spot) => {
    const point = reachableGround(map, boxes, spot.x, spot.y);
    return {
      ...spot,
      point,
      reachable: Boolean(point) && reachablePoint(seen, point.x, point.y),
    };
  });

  // exitHome: el punto de salida tiene que estar a tiro de una baldosa alcanzable.
  const exitPoint = {
    x: map.exitHome.x + map.exitHome.w / 2,
    y: map.exitHome.y + map.exitHome.h,
  };
  const exitReachable = reachablePoint(seen, exitPoint.x, exitPoint.y);

  // La caja de municiones (1A, C2) tiene que quedar a tiro de una baldosa.
  // `nearCrate` mide 30 px desde el centro del borde de abajo del sólido.
  const crate = map.crate ? {
    ...map.crate,
    reachable: (() => {
      const cx = map.crate.x; const cy = map.crate.y + 8;
      for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) {
        const tx = Math.floor(cx / TILE) + ox; const ty = Math.floor(cy / TILE) + oy;
        if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS || !seen[ty][tx]) continue;
        if (Math.hypot(tx * TILE + 8 - cx, ty * TILE + 12 - cy) < 30) return true;
      }
      return false;
    })(),
  } : null;

  // Calzada de cada pieza: alguna baldosa de calzada alcanzable.
  const roads = cells.map((cell) => {
    let ok = false;
    for (let ty = cell.row * CELL + 15; ty <= cell.row * CELL + 17 && !ok; ty++) {
      for (let tx = cell.col * CELL + 2; tx <= cell.col * CELL + 17; tx++) {
        if (seen[ty][tx] && String(map.floor[ty][tx]).startsWith('road')) { ok = true; break; }
      }
    }
    return { cell, ok };
  });

  // L3: los fondos (filas 0-11) no pasan de una pieza a la vecina.
  const pieceAt = (tx, ty) => `${Math.floor(tx / CELL)},${Math.floor(ty / CELL)}`;
  const leaks = [];
  for (let y = 0; y < ROWS; y++) {
    if (y % CELL > 11) continue; // solo la franja de fondos
    for (let x = 0; x < COLS - 1; x++) {
      if (!seen[y][x] || !seen[y][x + 1]) continue;
      if (pieceAt(x, y) !== pieceAt(x + 1, y)) leaks.push(`${x},${y}`);
    }
  }

  // L3/L8: el fondo de la casa es alcanzable (portón lateral).
  const casa = cells.find((c) => c.type === 'casa');
  let casaFondo = false;
  for (let ty = casa.row * CELL; ty < casa.row * CELL + 6 && !casaFondo; ty++) {
    for (let tx = casa.col * CELL + 2; tx < casa.col * CELL + 18; tx++) {
      if (seen[ty][tx]) { casaFondo = true; break; }
    }
  }

  return {
    seed,
    cells,
    map,
    boxes,
    free,
    seen,
    comps,
    reach,
    dead,
    bocas,
    roadStatic,
    loot,
    exitReachable,
    exitPoint,
    roads,
    crate,
    leaks,
    casaFondo,
  };
}

// --- Tests ---

test('L1/L5: la fila de arriba llena todas las columnas elegibles, sin repetir', () => {
  for (const seed of SEEDS) {
    const cells = layoutCells(seed);
    const bottom = cells.filter((c) => c.row === 1);
    assert.equal(bottom.length, 4, `semilla ${seed}: fila de abajo`);
    assert.deepEqual(bottom.map((c) => c.col).sort(), [0, 1, 2, 3]);
    const casa = bottom.filter((c) => c.type === 'casa');
    assert.equal(casa.length, 1, `semilla ${seed}: una sola casa`);
    assert.deepEqual([casa[0].col, casa[0].row], [0, 1], `semilla ${seed}: casa en (0,1)`);
    // elegibles = columnas de abajo con salida al norte
    const eligible = bottom.filter((c) => NORTH_EXIT.has(c.type)).map((c) => c.col).sort();
    const top = cells.filter((c) => c.row === 0);
    assert.deepEqual(top.map((c) => c.col).sort(), eligible,
      `semilla ${seed}: no se llenaron todas las columnas elegibles`);
    // sin repetición entre las de arriba y distintas de la de abajo
    const types = top.map((c) => c.type);
    assert.equal(new Set(types).size, types.length, `semilla ${seed}: tipos repetidos arriba (${types})`);
    for (const cell of top) {
      const below = bottom.find((c) => c.col === cell.col);
      assert.notEqual(cell.type, below.type, `semilla ${seed}: ${cell.type} arriba de ${below.type}`);
      assert.equal(cell.openSouth, true);
      assert.notEqual(cell.type, 'casa');
    }
  }
});

test('L7: minFeet=32 y los bordes del mapa dejan entrar el sprite entero', () => {
  for (const seed of [1, 2, 3, 3455]) {
    const { map } = buildBarrio(seed);
    assert.equal(map.bounds.minFeet, 32, `semilla ${seed}: minFeet`);
    assert.ok(map.bounds.minX >= 8 && map.bounds.maxX <= COLS * TILE - 8);
    assert.ok(map.arena.minFeet >= 32);
  }
});

test('L2: en 200 semillas no hay salidas muertas sin cierre ni bocas sobre estática', () => {
  for (const seed of SEEDS) {
    const a = audit(seed);
    for (const d of a.dead) {
      assert.ok(d.covered >= 40,
        `semilla ${seed}: salida ${d.side} sin cierre en ${d.cell.type}@${d.cell.col},${d.cell.row}`
        + ` (tapa ${d.covered} de 48 px)`);
    }
    for (const b of a.bocas) {
      assert.equal(b.onStatic, false, `semilla ${seed}: boca ${b.name} sobre estática`);
      assert.equal(b.inSolid, false, `semilla ${seed}: boca ${b.name} dentro de un sólido (${b.x},${b.y})`);
    }
    assert.deepEqual(a.roadStatic, [],
      `semilla ${seed}: la estática entró en la calzada/vereda (${a.roadStatic.slice(0, 4)})`);
  }
});

test('conectividad CON objetos: spawn -> todo el botín, exitHome y la calzada de cada pieza', () => {
  for (const seed of SEEDS) {
    const a = audit(seed);
    assert.equal(a.free[Math.floor(a.map.spawn.y / TILE)][Math.floor(a.map.spawn.x / TILE)], 1,
      `semilla ${seed}: el spawn del jugador quedó en un sólido`);
    for (const l of a.loot) {
      assert.ok(l.point, `semilla ${seed}: el botín ${l.kind} de ${l.cell} quedó dentro de un sólido`);
      assert.ok(l.reachable,
        `semilla ${seed}: no se llega al botín ${l.kind} de ${l.cell} (${l.point.x},${l.point.y})`);
    }
    assert.ok(a.exitReachable, `semilla ${seed}: no se llega al exitHome (${a.exitPoint.x},${a.exitPoint.y})`);
    for (const r of a.roads) {
      assert.ok(r.ok, `semilla ${seed}: no se llega a la calzada de ${r.cell.type}@${r.cell.col},${r.cell.row}`);
    }
    // La esquina (y su caja) no está en todas las semillas: si está, se llega.
    assert.ok(!a.crate || a.crate.reachable, `semilla ${seed}: no se llega a la caja de municiones`);
  }
});

test('sin bolsones: ningún hueco inalcanzable de más de 3 baldosas en 200 semillas', () => {
  for (const seed of SEEDS) {
    const a = audit(seed);
    for (const c of a.comps) {
      assert.ok(c.n <= POCKET_MAX,
        `semilla ${seed}: bolsón inalcanzable de ${c.n} baldosas en (${c.x},${c.y})`);
    }
  }
});

test('L3: los fondos no se conectan de costado (medianeras) y la casa abre su fondo', () => {
  for (const seed of SEEDS) {
    const a = audit(seed);
    assert.deepEqual(a.leaks, [], `semilla ${seed}: el fondo pasa de una pieza a la vecina (${a.leaks.slice(0, 4)})`);
    assert.ok(a.casaFondo, `semilla ${seed}: el fondo de la casa quedó cerrado`);
  }
});

test('L4: la plaza da botín y todas las piezas respetan el mínimo de marcas', () => {
  for (const seed of SEEDS) {
    const { cells, map } = buildBarrio(seed);
    const plazaCells = cells.filter((c) => c.type === 'plaza');
    for (const cell of plazaCells) {
      const n = map.loot.filter((l) => l.cell === 'plaza' && l.x >= cell.col * MW
        && l.x < (cell.col + 1) * MW && l.y >= cell.row * MW && l.y < (cell.row + 1) * MW).length;
      assert.ok(n >= 1, `semilla ${seed}: la plaza de (${cell.col},${cell.row}) no da botín`);
    }
    assert.ok(map.loot.length >= 4, `semilla ${seed}: faltan marcas de botín`);
  }
});

/** Objetos de una pieza suelta con un vecino dado (para medir pasos). */
function pieceObjs(type, opts) {
  return PIECES[type]({ openSouth: false, ...opts }).objects.filter((o) => o.solid && SIZE[o.sprite])
    .map((o) => solidRectFor(o, SIZE[o.sprite], trimOf(o.sprite)))
    .filter(Boolean);
}

test('L6: el callejón de la cortada y el cruce de las vías tienen 48 px o más', () => {
  // Cortada: las dos paredes del callejón dejan 64 px y, contando el poste de
  // la farola, el cuello nunca baja de 48 px.
  const cor = PIECES.cortada({ openSouth: false, northOpen: false, eastOpen: false, westOpen: false });
  const corBoxes = cor.objects.filter((o) => o.solid && SIZE[o.sprite])
    .map((o) => ({ sprite: o.sprite, ...solidRectFor(o, SIZE[o.sprite], trimOf(o.sprite)) }))
    .filter((b) => b.w > 0);
  const poste = corBoxes.filter((b) => b.sprite === 'streetlight');
  const walls = corBoxes.filter((b) => b.sprite === 'pared_ns_62' && b.y > 110 && b.y < 160);
  const left = Math.max(...walls.filter((b) => b.x < 160).map((b) => b.x + b.w));
  const right = Math.min(...walls.filter((b) => b.x >= 160).map((b) => b.x));
  assert.ok(right - left >= 48, `callejón de la cortada: ${right - left} px`);
  for (const p of poste) {
    assert.ok(right - (p.x + p.w) >= 48, `el poste deja ${right - (p.x + p.w)} px de paso`);
  }
  // Vías: el hueco entre los alambrados en el paso a nivel.
  const viaObj = PIECES.vias({ openSouth: false, northOpen: false, eastOpen: false, westOpen: false });
  const alambrados = viaObj.objects.filter((o) => o.sprite === 'alambrado')
    .map((o) => solidRectFor(o, SIZE.alambrado, trimOf('alambrado'))).filter(Boolean);
  const l2 = Math.max(...alambrados.filter((b) => b.x < 160).map((b) => b.x + b.w));
  const r2 = Math.min(...alambrados.filter((b) => b.x >= 160).map((b) => b.x));
  assert.equal(l2, 144);
  assert.equal(r2, 192);
  assert.equal(r2 - l2, 48);
});

test('L9: los rieles de las vías terminan en un tope sólido de cada lado', () => {
  for (const opts of [{ northOpen: true, eastOpen: true, westOpen: true },
    { northOpen: false, eastOpen: false, westOpen: false }]) {
    const objs = PIECES.vias({ openSouth: false, ...opts }).objects;
    const boxes = objs.filter((o) => o.solid && SIZE[o.sprite])
      .map((o) => solidRectFor(o, SIZE[o.sprite], trimOf(o.sprite))).filter(Boolean);
    const railBand = { x: 0, y: 80, w: MW, h: 64 };
    const caps = boxes.filter((b) => b.x < 24 && b.y < railBand.y + railBand.h && b.y + b.h > railBand.y);
    const capsR = boxes.filter((b) => b.x + b.w > MW - 24 && b.y < railBand.y + railBand.h && b.y + b.h > railBand.y);
    assert.ok(caps.length && capsR.length, 'los rieles no tienen tope en las puntas');
  }
});

test('L10: sin verjas ni cercos superpuestos en la misma línea', () => {
  const FENCE = ['fence', 'hedge', 'tapial48', 'tapial80', 'gate', 'baranda'];
  for (const type of Object.keys(PIECES)) {
    for (const openSouth of [false, true]) {
      for (const opts of [{ northOpen: false, eastOpen: false, westOpen: false },
        { northOpen: true, eastOpen: true, westOpen: true }]) {
        const p = PIECES[type]({ openSouth, ...opts });
        const lines = new Map();
        for (const o of p.objects) {
          if (!FENCE.includes(o.sprite)) continue;
          const box = solidRectFor(o, SIZE[o.sprite], trimOf(o.sprite));
          if (!box) continue;
          const row = Math.round((box.y + box.h) / 8);
          if (!lines.has(row)) lines.set(row, []);
          for (const other of lines.get(row)) {
            const a = other.box; const b = box;
            const inter = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
            assert.ok(inter <= 2,
              `${type}: ${other.sprite} y ${o.sprite} se pisan ${inter} px en la misma línea`);
          }
          lines.get(row).push({ sprite: o.sprite, box });
        }
      }
    }
  }
});

test('L11: sin datos muertos (marcas entrada/endX)', () => {
  for (const seed of [1, 2, 3, 3455]) {
    const { map } = buildBarrio(seed);
    assert.equal(map.endX, undefined, 'endX quedó en el mapa y nadie lo usa');
  }
  for (const type of Object.keys(PIECES)) {
    const marks = PIECES[type]({ openSouth: true }).marks;
    assert.equal(marks.filter((m) => m.kind === 'entrada').length, 0,
      `${type}: sigue marcando "entrada" y nadie la consume`);
  }
});

test('la captura del barrio: la grilla del mapa tiene objetos dentro y el spawn es la casa', () => {
  const a = audit(3455);
  assert.ok(a.map.objects.length > 200, 'faltan objetos');
  assert.ok(a.reach / (a.reach + a.comps.reduce((n, c) => n + c.n, 0)) > 0.97,
    `caminable ${a.reach} de ${a.reach + a.comps.reduce((n, c) => n + c.n, 0)}`);
  const casa = a.cells.find((c) => c.type === 'casa');
  assert.ok(a.map.spawn.x > casa.col * MW && a.map.spawn.x < (casa.col + 1) * MW,
    'el jugador no arranca en la casa');
});
}

// --- barrio_solids.test.js
{
// Sólidos del barrio pegados al dibujo (fix 1B: C1, C3, C4, C5, C6, C8, C10).
// Datos puros + los PNG de los atlases: no hay DOM ni Three.js de por medio.
//
// El contrato es el del análisis (docs/analisis_roguelike.md, sección 2):
// el rect que frena es el mismo que se ve, con el `offset` del sprite incluido,
// y con menos de 2 px de error. Los objetos de los mapas viejos (sin
// `solidPx`) siguen usando su rect de baldosas: el arreglo es opt-in.

const SEEDS = [1, 3455, 8];
const MW = 320; // ancho de una pieza (20 baldosas)

// --- PNG de los atlases (mismo decodificador que test/chars_walk.test.js) ---

/** Decodifica un PNG RGBA 8 bits (el que escribe PIL). */
function decodePng(buf) {
  assert.equal(buf.toString('latin1', 1, 4), 'PNG', 'no es un PNG');
  let pos = 8;
  let w = 0; let h = 0; const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('latin1', pos + 4, pos + 8);
    const body = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') { w = body.readUInt32BE(0); h = body.readUInt32BE(4); } else if (type === 'IDAT') idat.push(body);
    pos += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = 4;
  const stride = w * bpp;
  const out = Buffer.alloc(w * h * bpp);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = Buffer.alloc(stride);
    for (let i = 0; i < stride; i += 1) {
      const a = i >= bpp ? cur[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a); const pb = Math.abs(p - b); const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[i] = v & 255;
    }
    cur.copy(out, y * stride);
    prev = cur;
  }
  return {
    w, h, alpha: (x, y) => out[(y * w + x) * bpp + 3],
  };
}

const ATLASES = ['objects', 'interior2', 'props', 'street2', 'houses', 'fx'];
const sheets = new Map();
function atlas(name) {
  if (!sheets.has(name)) {
    const url = (ext) => new URL(`../../public/assets/${name}.${ext}`, import.meta.url);
    const frames = JSON.parse(fs.readFileSync(url('json'), 'utf8')).frames;
    sheets.set(name, { frames, img: decodePng(fs.readFileSync(url('png'))) });
  }
  return sheets.get(name);
}

/** [x,y,w,h] del frame en su atlas. */
function frameOf(sprite) {
  for (const name of ATLASES) {
    const f = atlas(name).frames[sprite];
    if (f) return Array.isArray(f) ? f : [f.x, f.y, f.w, f.h];
  }
  throw new Error(`falta el sprite ${sprite}`);
}

const trims = new Map();
/** BBox de los pixeles opacos del frame (lo mismo que opaqueRect de sprite.js). */
function trimOf(sprite) {
  if (trims.has(sprite)) return trims.get(sprite);
  const [fx, fy, fw, fh] = frameOf(sprite);
  const img = ATLASES.map(atlas).find((a) => a.frames[sprite]).img;
  let x0 = fw; let y0 = fh; let x1 = -1; let y1 = -1;
  for (let j = 0; j < fh; j += 1) {
    for (let i = 0; i < fw; i += 1) {
      if (img.alpha(fx + i, fy + j) <= 16) continue;
      if (i < x0) x0 = i;
      if (i > x1) x1 = i;
      if (j < y0) y0 = j;
      if (j > y1) y1 = j;
    }
  }
  const out = x1 >= x0 && y1 >= y0 ? { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 } : null;
  trims.set(sprite, out);
  return out;
}

/** Rect que dibuja mapView.layout para un objeto (sin el margen del cursor). */
function drawnRect(obj) {
  const size = SIZE[obj.sprite];
  const org = drawOrigin(obj, size);
  return {
    x: org.x, y: org.y, w: size[0], h: size[1],
  };
}

/** Todos los objetos que puede tener el barrio (las 5 piezas, con y sin sur). */
const allObjs = () => Object.keys(PIECES).flatMap((type) => [false, true].flatMap(
  (openSouth) => PIECES[type]({ openSouth }).objects,
));
const solidObjs = () => allObjs().filter((o) => o.solid && SIZE[o.sprite]);
const solidOf = (obj) => solidRectFor(obj, SIZE[obj.sprite], trimOf(obj.sprite));

// Sprites que el análisis citó uno por uno (C1, C5, C6).
const ANALYSIS_SPRITES = [
  'salvo_7', 'chalet_b', 'chalet_c', 'chalet_d', 'shop_ferreteria', 'almacen_roto',
  'tree_a', 'tree_b', 'arbol_vereda', 'pino_0', 'pino_1', 'pino_2', 'pino_3',
  'crate', 'box', 'cajon_frutas', 'trash', 'mailbox', 'buzon_correo', 'bicicleta',
  'bush30', 'alambrado', 'fence', 'hedge', 'tapial48', 'tapial80', 'gate',
  'cartel_esquina', 'baranda', 'banco_plaza', 'busto', 'hamaca',
  'auto_parado', 'auto_volcado', 'vagon', 'sedan_teal_snow', 'sedan_crema_snow',
  'sedan_bordo_snow', 'barrera_alta', 'barrera_caida', 'cruz_san_andres',
  'garita', 'pared_eo_48', 'pared_ns_48', 'pared_ns_62', 'streetlight', 'farola',
];

test('C1: el sólido cae dentro del rect dibujado (el offset incluido)', () => {
  const objs = solidObjs();
  assert.ok(objs.length > 80, 'faltan objetos sólidos en las piezas');
  for (const obj of objs) {
    const rect = solidOf(obj);
    const draw = drawnRect(obj);
    assert.ok(rect, `${obj.sprite} (${obj.id}): sin rect sólido`);
    assert.ok(rect.w > 0 && rect.h > 0, `${obj.sprite}: sólido vacío`);
    assert.ok(rect.x >= draw.x && rect.y >= draw.y,
      `${obj.sprite}: el sólido se sale del dibujo (${rect.x},${rect.y} vs ${draw.x},${draw.y})`);
    assert.ok(rect.x + rect.w <= draw.x + draw.w && rect.y + rect.h <= draw.y + draw.h,
      `${obj.sprite}: el sólido se sale del dibujo por abajo/derecha`);
  }
});

test('el barrio entero: todo objeto sólido declara su huella (nada de rect de baldosas)', () => {
  for (const seed of SEEDS) {
    for (const obj of buildBarrio(seed).map.objects) {
      if (!obj.solid) continue;
      assert.ok(obj.solidPx, `semilla ${seed}: ${obj.sprite} (${obj.id}) quedó con el rect de baldosas`);
    }
  }
});

test('C1/C5: la huella completa es el dibujo opaco (0 px de error)', () => {
  const seen = new Set();
  const objs = solidObjs();
  for (const obj of objs) {
    if (obj.solidPx !== FULL) continue;
    seen.add(obj.sprite);
    const rect = solidOf(obj);
    const draw = drawnRect(obj);
    const trim = trimOf(obj.sprite);
    // El recorte opaco es el que usa el juego (layout().trim): las casas, los
    // autos y las verjas frenan exactamente lo que se ve, offset incluido.
    assert.ok(Math.abs(rect.x - (draw.x + trim.x)) <= 1, `${obj.sprite}: borde izquierdo`);
    assert.ok(Math.abs(rect.y - (draw.y + trim.y)) <= 1, `${obj.sprite}: borde de arriba`);
    assert.ok(Math.abs((rect.x + rect.w) - (draw.x + trim.x + trim.w)) <= 1,
      `${obj.sprite}: borde derecho`);
    assert.ok(Math.abs((rect.y + rect.h) - (draw.y + trim.y + trim.h)) <= 1,
      `${obj.sprite}: borde de abajo`);
  }
  // La lista de sprites que citó el análisis está toda cubierta (por la huella
  // completa o por la de tronco/poste).
  const all = new Set(objs.map((o) => o.sprite));
  for (const sprite of ANALYSIS_SPRITES) {
    assert.ok(all.has(sprite), `${sprite}: el análisis lo nombra y no está en las piezas`);
  }
  for (const sprite of ['salvo_7', 'chalet_c', 'shop_ferreteria', 'alambrado',
    'vagon', 'auto_parado', 'baranda', 'banco_plaza', 'busto', 'hamaca']) {
    assert.ok(seen.has(sprite), `${sprite}: no se probó la huella completa`);
  }
});

/** Objeto de prueba con un offset como el real (para probar un sprite suelto). */
function objWith(sprite, extra = {}) {
  const size = SIZE[sprite];
  return {
    id: `test_${sprite}`,
    sprite,
    x: 4,
    y: 4,
    tw: Math.max(1, Math.round(size[0] / 16)),
    th: Math.max(1, Math.round(size[1] / 16)),
    offset: [3, -5],
    ...extra,
  };
}

test('C5: troncos y postes frenan el tronco, no el aire de al lado', () => {
  const seen = new Set();
  for (const obj of solidObjs()) {
    if (obj.solidPx === FULL) continue;
    seen.add(obj.sprite);
    const local = obj.solidPx;
    const size = SIZE[obj.sprite];
    const [fx, fy] = frameOf(obj.sprite);
    const img = ATLASES.map(atlas).find((a) => a.frames[obj.sprite]).img;
    // Píxeles opacos dentro de las filas de la huella (el tronco/postal).
    let cols = [];
    let opacos = 0;
    let total = 0;
    for (let j = local.y; j < local.y + local.h; j += 1) {
      for (let i = 0; i < size[0]; i += 1) {
        const on = img.alpha(fx + i, fy + j) > 16;
        if (!on) continue;
        total += 1;
        if (i >= local.x && i < local.x + local.w) {
          opacos += 1;
          cols.push(i);
        }
      }
    }
    assert.ok(total > 0, `${obj.sprite}: la huella no toca ningún píxel del dibujo`);
    const c0 = Math.min(...cols);
    const c1 = Math.max(...cols);
    assert.ok(Math.abs(c0 - local.x) <= 1, `${obj.sprite}: el tronco arranca en ${c0}, el sólido en ${local.x}`);
    assert.ok(Math.abs(c1 - (local.x + local.w - 1)) <= 1,
      `${obj.sprite}: el tronco termina en ${c1}, el sólido en ${local.x + local.w - 1}`);
    assert.ok(opacos / total >= 0.9, `${obj.sprite}: el sólido deja ${total - opacos} px del tronco afuera`);
    // Y la huella apoya en el pie dibujado (menos de 2 px).
    const rect = solidOf(obj);
    const draw = drawnRect(obj);
    assert.ok(Math.abs((rect.y + rect.h) - (draw.y + draw.h)) <= 2,
      `${obj.sprite}: la huella no apoya en la base`);
  }
  for (const sprite of ['tree_a', 'tree_b', 'arbol_vereda', 'pino_0', 'pino_1',
    'pino_2', 'pino_3', 'cartel_esquina', 'cruz_san_andres', 'barrera_alta',
    'farola', 'streetlight']) {
    assert.ok(seen.has(sprite), `${sprite}: no se probó la huella de tronco/poste`);
  }
});

test('C1: el sólido usa la misma esquina que el dibujo (layout)', () => {
  // WorldMap.layout dibuja con mesh.position=(px,py) y un plano w x h centrado.
  const layout = WorldMap.prototype.layout;
  for (const [sprite, offset] of [['chalet_c', [7, -3]], ['tree_a', [-11, 4]],
    ['alambrado', [11, 2]], ['salvo_7', [-6, 0]]]) {
    const size = SIZE[sprite];
    const obj = objWith(sprite, { offset });
    obj.mesh = {
      geometry: { parameters: { width: size[0], height: size[1] } },
      userData: { frame: [0, 0, size[0], size[1]], sheet: { image: null } },
    };
    const box = layout.call({}, obj);
    const org = drawOrigin(obj, size);
    const meshLeft = Math.round(box.px - box.w / 2);
    const meshTop = Math.round(box.py - box.h / 2);
    assert.ok(Math.abs(org.x - meshLeft) <= 0, `${sprite}: el sólido no usa la x del mesh`);
    assert.ok(Math.abs(org.y - meshTop) <= 0, `${sprite}: el sólido no usa la y del mesh`);
  }
});

test('el arreglo es opt-in: sin solidPx sigue el rect de baldosas de siempre', () => {
  const size = SIZE.chalet_c;
  const mesh = {
    geometry: { parameters: { width: size[0], height: size[1] } },
    userData: { frame: [0, 0, size[0], size[1]], sheet: { image: null } },
  };
  const legacy = {
    id: 'viejo', sprite: 'chalet_c', x: 4, y: 6, tw: 4, th: 4, offset: [9, -9], solid: true, mesh,
  };
  const barrioObj = {
    id: 'nuevo', sprite: 'chalet_c', x: 4, y: 6, tw: 4, th: 4, offset: [9, -9], solid: true, solidPx: FULL, mesh,
  };
  const world = {
    map: { objects: [legacy, barrioObj] },
    solids: [],
    layout: WorldMap.prototype.layout,
  };
  WorldMap.prototype.rebuildSolids.call(world);
  const old = world.solids.find((s) => s.id === 'viejo');
  const neo = world.solids.find((s) => s.id === 'nuevo');
  assert.deepEqual(
    { x: old.x, y: old.y, w: old.w, h: old.h },
    { x: 4 * TILE, y: 6 * TILE, w: 4 * TILE, h: 4 * TILE },
    'un objeto sin solidPx tiene que conservar su rect de baldosas',
  );
  const org = drawOrigin(barrioObj, size);
  assert.deepEqual(
    { x: neo.x, y: neo.y, w: neo.w, h: neo.h },
    { x: org.x, y: org.y, w: size[0], h: size[1] },
    'con solidPx el sólido sale del dibujo',
  );
});

test('C8: flipX espeja el sólido como espeja el dibujo', () => {
  const size = [32, 40];
  const obj = {
    x: 0, y: 0, tw: 2, th: 3, offset: [0, 0], solidPx: { x: 3, y: 20, w: 6, h: 12 },
  };
  const a = solidRectFor(obj, size);
  const b = solidRectFor({ ...obj, flipX: true }, size);
  assert.equal(a.y, b.y, 'flipX no mueve la huella en vertical');
  assert.equal(a.w, b.w);
  assert.equal(b.x, a.x + (size[0] - 2 * obj.solidPx.x - obj.solidPx.w), 'la huella no está espejada');
  // Las dos cruces de San Andrés del paso a nivel: la espejada frena del otro lado.
  const cross = PIECES.vias({}).objects.filter((o) => o.sprite === 'cruz_san_andres');
  const straight = cross.find((o) => !o.flipX);
  const flipped = cross.find((o) => o.flipX);
  assert.ok(straight && flipped, 'faltan las dos cruces del paso a nivel');
  const rs = solidOf(straight);
  const rf = solidOf(flipped);
  assert.equal(rs.w, rf.w);
  const w = SIZE.cruz_san_andres[0];
  const relS = rs.x - drawOrigin(straight, SIZE.cruz_san_andres).x;
  const relF = rf.x - drawOrigin(flipped, SIZE.cruz_san_andres).x;
  assert.equal(relF, w - relS - rs.w, 'la cruz espejada no espeja su poste');
});

test('C3: el paso a nivel mide 48 px y el tablón queda alineado', () => {
  const objs = PIECES.vias({ openSouth: false }).objects;
  const fence = objs.filter((o) => o.sprite === 'alambrado')
    .map((o) => solidOf(o))
    .sort((a, b) => a.x - b.x);
  assert.ok(fence.length >= 8, 'faltan tramos de alambrado');
  const left = fence.filter((r) => r.x < 160);
  const right = fence.filter((r) => r.x >= 160);
  const gap0 = Math.max(...left.map((r) => r.x + r.w));
  const gap1 = Math.min(...right.map((r) => r.x));
  assert.equal(gap0, 144, `el alambrado de la izquierda termina en ${gap0}, no en 144`);
  assert.equal(gap1, 192, `el alambrado de la derecha arranca en ${gap1}, no en 192`);
  assert.equal(gap1 - gap0, 48, 'el paso a nivel tiene que medir 48 px');
  // Ningún sólido de las filas del alambrado invade el hueco (la verja del sur
  // también cruza el hueco en x, pero va 200 px más abajo: no cuenta).
  const fenceTop = Math.min(...fence.map((r) => r.y));
  const fenceBottom = Math.max(...fence.map((r) => r.y + r.h));
  for (const obj of objs) {
    if (!obj.solid) continue;
    const r = solidOf(obj);
    if (r.y + r.h <= fenceTop || r.y >= fenceBottom) continue;
    assert.ok(r.x + r.w <= gap0 || r.x >= gap1,
      `${obj.sprite} tapa el paso a nivel (${r.x}..${r.x + r.w})`);
  }
  // El tablón del piso cae justo en el hueco: las dos filas de las vías.
  const { map, cells } = buildBarrio(3455);
  const vias = cells.find((c) => c.type === 'vias');
  assert.ok(vias, 'la semilla 3455 no tiene pieza de vías');
  const X = vias.col * 20;
  const Y = vias.row * 20;
  for (const ty of [Y + 5, Y + 7]) {
    const cols = [];
    for (let tx = X; tx < X + 20; tx += 1) {
      if (map.floor[ty][tx] === 'via_tablon_0') cols.push((tx - X) * 16);
    }
    assert.equal(Math.min(...cols), gap0, 'el tablón no arranca donde arranca el hueco');
    assert.equal(Math.max(...cols) + 16, gap1, 'el tablón no termina donde termina el hueco');
  }
});

test('C10: las verjas no quedan dobles ni se salen de la pieza', () => {
  const FENCE = ['alambrado', 'fence', 'hedge', 'tapial48', 'tapial80', 'gate'];
  for (const type of Object.keys(PIECES)) {
    for (const openSouth of [false, true]) {
      const objs = PIECES[type]({ openSouth }).objects;
      const rects = objs.filter((o) => FENCE.includes(o.sprite))
        .map((o) => ({ o, r: solidOf(o) }));
      // Nada se sale de la pieza en horizontal.
      for (const { o, r } of rects) {
        assert.ok(r.x >= -1 && r.x + r.w <= MW + 1,
          `${type}: ${o.sprite} se sale de la pieza (${r.x}..${r.x + r.w})`);
      }
      // La verja del sur: sin superponerse y sin huecos (salvo el paso).
      const south = rects.filter(({ o }) => o.south).map(({ r }) => r)
        .sort((a, b) => a.x - b.x);
      let end = 0;
      for (const r of south) {
        const hole = r.x - end;
        const crossing = hole > 1 && hole === 48 && end === 144;
        assert.ok(hole <= 1 || crossing,
          `${type}${openSouth ? ' (abre al sur)' : ''}: hueco de ${hole} px en la verja del sur en x=${end}`);
        assert.ok(r.x === end || hole > 0, `${type}: la verja del sur se recoloca en x=${r.x}`);
        end = Math.max(end, r.x + r.w);
      }
      assert.equal(end, MW, `${type}: la verja del sur termina en ${end}, no en ${MW}`);
      // Los dos alambrados de las vías cierran justo en el borde del paso.
      const alambrado = rects.filter(({ o }) => o.sprite === 'alambrado').map(({ r }) => r);
      if (alambrado.length) {
        const left = alambrado.filter((r) => r.x < 160);
        const right = alambrado.filter((r) => r.x >= 160);
        assert.equal(Math.max(...left.map((r) => r.x + r.w)), 144, `${type}: alambrado izquierdo`);
        assert.equal(Math.min(...right.map((r) => r.x)), 192, `${type}: alambrado derecho`);
      }
    }
  }
});

test('C6: lo que se ve frenando frena, y el decorado sigue pisable', () => {
  const solids = new Set();
  const pasable = new Set();
  for (const type of Object.keys(PIECES)) {
    for (const openSouth of [false, true]) {
      for (const obj of PIECES[type]({ openSouth }).objects) {
        if (!SIZE[obj.sprite]) continue;
        (obj.solid ? solids : pasable).add(obj.sprite);
      }
    }
  }
  for (const sprite of ['box', 'mailbox', 'bicicleta', 'bush30', 'crate',
    'cajon_frutas', 'trash', 'buzon_correo']) {
    assert.ok(solids.has(sprite), `${sprite}: se atraviesa y no debería`);
  }
  for (const sprite of ['snow_mound', 'fallen_0', 'fallen_1', 'fallen_2',
    'figure_snow', 'bottle', 'papel', 'vidrios', 'snow_drift']) {
    assert.ok(pasable.has(sprite), `${sprite}: es decorado y no debería frenar`);
    assert.ok(!solids.has(sprite), `${sprite}: quedó sólido`);
  }
});

test('C4: autos y vagón frenan el cuerpo entero (decisión, no fila base)', () => {
  const CARS = ['auto_parado', 'auto_volcado', 'vagon', 'sedan_teal_snow',
    'sedan_crema_snow', 'sedan_bordo_snow'];
  const seen = new Set();
  for (const obj of solidObjs()) {
    if (!CARS.includes(obj.sprite)) continue;
    seen.add(obj.sprite);
    assert.equal(obj.solidPx, FULL, `${obj.sprite}: tiene que frenar el cuerpo entero`);
    const r = solidOf(obj);
    const draw = drawnRect(obj);
    assert.ok(r.h >= draw.h * 0.8, `${obj.sprite}: el sólido es solo la fila base (${r.h}/${draw.h})`);
  }
  for (const sprite of CARS) assert.ok(seen.has(sprite), `${sprite}: no se probó`);
});

test('solidRectsOf devuelve la misma huella que rebuildSolids', () => {
  const all = new Set();
  for (const seed of SEEDS) for (const o of buildBarrio(seed).map.objects) all.add(o);
  const objs = [...all].filter((o) => o.solid && SIZE[o.sprite]);
  const map = { objects: objs };
  const rects = solidRectsOf(map, (o) => SIZE[o.sprite], (o) => trimOf(o.sprite));
  assert.equal(rects.length, objs.length);
  for (let i = 0; i < objs.length; i += 1) {
    const want = solidOf(objs[i]);
    assert.deepEqual(
      { x: rects[i].x, y: rects[i].y, w: rects[i].w, h: rects[i].h },
      { x: want.x, y: want.y, w: want.w, h: want.h },
      `${objs[i].sprite}: huella distinta`,
    );
  }
});

test('C3/C9: con la caja de pies y los objetos se cruza el paso y se llega a la calzada', () => {
  const solidTiles = new Set(['black', 'grass_', 'estatica_']);
  const tileNameSolid = (name) => [...solidTiles].some((p) => name === p || name.startsWith(p));
  const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  for (const seed of SEEDS) {
    const { map, cells } = buildBarrio(seed);
    const boxes = map.objects.filter((o) => o.solid && SIZE[o.sprite])
      .map((o) => solidRectFor(o, SIZE[o.sprite], trimOf(o.sprite)));
    // La caja de los pies del jugador (src/movement.js: 10x6 al pie).
    const feetFree = (px, py) => {
      const box = {
        x: px - 5, y: py - 6, w: 10, h: 6,
      };
      for (const b of boxes) if (hit(box, b)) return false;
      const x0 = Math.floor(box.x / TILE); const x1 = Math.floor((box.x + box.w - 0.01) / TILE);
      const y0 = Math.floor(box.y / TILE); const y1 = Math.floor((box.y + box.h - 0.01) / TILE);
      for (let y = y0; y <= y1; y += 1) {
        for (let x = x0; x <= x1; x += 1) {
          const name = map.floor[y] && map.floor[y][x];
          if (!name || tileNameSolid(name)) return false;
        }
      }
      return true;
    };
    const free = Array.from({ length: map.rows }, () => new Uint8Array(map.cols));
    for (let y = 0; y < map.rows; y += 1) {
      for (let x = 0; x < map.cols; x += 1) {
        free[y][x] = feetFree(x * 16 + 8, y * 16 + 12) ? 1 : 0;
      }
    }
    const seen = Array.from({ length: map.rows }, () => new Uint8Array(map.cols));
    const sx = Math.floor(map.spawn.x / 16);
    const sy = Math.floor(map.spawn.y / 16);
    assert.equal(free[sy][sx], 1, `semilla ${seed}: el spawn cae en un sólido`);
    const q = [[sx, sy]];
    seen[sy][sx] = 1;
    while (q.length) {
      const [x, y] = q.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx; const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= map.cols || ny >= map.rows) continue;
        if (seen[ny][nx] || !free[ny][nx]) continue;
        seen[ny][nx] = 1;
        q.push([nx, ny]);
      }
    }
    const tx = (px) => Math.floor(px / TILE);
    const ty = (py) => Math.floor(py / TILE);
    const reachable = (px, py) => Boolean(seen[ty(py)] && seen[ty(py)][tx(px)]);
    // Nodos alcanzables en un radio de 2 baldosas (lo que hace reachableGround).
    const near = (px, py, r = 2) => {
      for (let dy = -r; dy <= r; dy += 1) {
        for (let dx = -r; dx <= r; dx += 1) {
          const nx = tx(px) + dx; const ny = ty(py) + dy;
          if (seen[ny] && seen[ny][nx]) return true;
        }
      }
      return false;
    };
    const exit = map.exitHome;
    assert.ok(reachable(exit.x + exit.w / 2, exit.y + exit.h), `semilla ${seed}: no se llega al portón`);
    if (map.crate) assert.ok(reachable(map.crate.x, map.crate.y), `semilla ${seed}: no se llega a la caja`);
    for (const [name, p] of Object.entries(map.spawns)) {
      assert.ok(near(p.x, p.y), `semilla ${seed}: la boca ${name} quedó encerrada`);
    }
    for (const l of map.loot) assert.ok(near(l.x, l.y), `semilla ${seed}: el botín (${l.cell}) quedó encerrado`);
    // La calzada de cada pieza: al menos una baldosa alcanzable en la banda.
    for (const cell of cells) {
      const X = cell.col * 20; const Y = cell.row * 20;
      let ok = false;
      for (let y = Y + 15; y <= Y + 17 && !ok; y += 1) {
        for (let x = X + 3; x <= X + 17 && !ok; x += 1) ok = Boolean(seen[y][x]);
      }
      assert.ok(ok, `semilla ${seed}: no se llega a la calzada de ${cell.type} (${cell.col},${cell.row})`);
    }
    // El cruce de las vías: el hueco de 48 px se camina de lado a lado.
    const vias = cells.find((c) => c.type === 'vias');
    if (vias) {
      const X = vias.col * 20 * 16; const Y = vias.row * 20 * 16;
      let crossing = 0;
      for (let x = 144; x < 192; x += 16) {
        for (let y = 72; y < 192; y += 16) crossing += reachable(X + x + 8, Y + y + 8) ? 1 : 0;
      }
      assert.ok(crossing >= 6, `semilla ${seed}: el paso a nivel no se camina (${crossing} baldosas)`);
    }
  }
});
}
