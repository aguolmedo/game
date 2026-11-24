// El barrio del roguelike: piezas de 20x20, grilla de 4x2 y conectividad.
// Datos puros (sin DOM): buildBarrio(seed) arma el mapa como src/maps/street.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  layoutCells, buildBarrio, COLS, ROWS, CELL,
} from '../src/maps/barrio/index.js';

const read = (name) => JSON.parse(
  fs.readFileSync(new URL(`../public/assets/${name}`, import.meta.url), 'utf8'),
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
