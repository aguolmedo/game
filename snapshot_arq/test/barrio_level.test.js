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
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import {
  buildBarrio, layoutCells, COLS, ROWS, CELL,
} from '../src/maps/barrio/index.js';
import { PIECES, NORTH_EXIT } from '../src/maps/barrio/pieces.js';
import { SIZE } from '../src/maps/barrio/sizes.js';
import { solidRectFor, drawOrigin } from '../src/maps/solid.js';

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
    const url = (ext) => new URL(`../public/assets/${name}.${ext}`, import.meta.url);
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
