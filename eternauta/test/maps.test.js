// Contrato mínimo de mapas que usan los demás sistemas (world.js, escenas).
// La validación completa del hito H2 vive en test/maps2.test.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { attic } from '../src/maps/attic.js';
import { house } from '../src/maps/house.js';
import { garage } from '../src/maps/garage.js';
import { street } from '../src/maps/street.js';

const read = (name) => JSON.parse(
  fs.readFileSync(new URL(`../public/assets/${name}`, import.meta.url), 'utf8'),
);
const maps = [attic, house, garage, street];
const byId = Object.fromEntries(maps.map((m) => [m.id, m]));

test('los mapas tienen tamaño coherente (interiores compactos, la calle scrollea)', () => {
  assert.ok(byId.street.cols * 16 > 480, 'la calle no scrollea en X');
  for (const map of maps) {
    assert.ok(map.cols >= 12 && map.rows >= 10, `${map.id} demasiado chico`);
    assert.equal(map.floor.length, map.rows);
    for (const row of map.floor) assert.equal(row.length, map.cols);
    assert.ok(map.spawn && Number.isFinite(map.spawn.x) && Number.isFinite(map.spawn.y));
    assert.ok(map.bounds, `${map.id} sin bounds`);
  }
});

test('todos los tiles del piso existen en tiles.json', () => {
  const tiles = read('tiles.json').frames;
  for (const map of maps) {
    for (const row of map.floor) {
      for (const name of row) {
        assert.ok(tiles[name], `tile desconocido ${name} en ${map.id}`);
      }
    }
  }
});

test('todos los sprites de objetos existen en algún atlas de mapa', () => {
  const sprites = new Set();
  for (const atlas of ['objects', 'interior2', 'props', 'street2', 'houses', 'fx']) {
    for (const name of Object.keys(read(`${atlas}.json`).frames)) sprites.add(name);
  }
  for (const map of maps) {
    for (const obj of map.objects) {
      assert.ok(sprites.has(obj.sprite), `objeto ${obj.sprite} (${map.id}) no existe`);
    }
  }
});

test('el spawn y los destinos de los warps son tiles caminables', () => {
  const solid = (map, x, y) => {
    const tx = Math.floor(x / 16);
    const ty = Math.floor((y - 1) / 16);
    const name = map.floor[ty] && map.floor[ty][tx];
    return !name || map.solidTiles.some((p) => name === p || name.startsWith(p));
  };
  for (const map of maps) {
    assert.equal(solid(map, map.spawn.x, map.spawn.y), false,
      `spawn solido en ${map.id}`);
    for (const warp of map.warps) {
      assert.ok(byId[warp.to], `warp a mapa desconocido ${warp.to}`);
      const dest = byId[warp.to];
      assert.equal(solid(dest, warp.spawn.x, warp.spawn.y), false,
        `destino solido ${warp.to} desde ${map.id}`);
    }
  }
});

test('la calle conserva endX y la escena del comic', () => {
  assert.ok(street.endX > 480);
  const ids = street.objects.map((o) => o.id);
  for (const id of ['ferreteria', 'caja_municiones', 'polsky_body', 'cartel', 'colectivo']) {
    assert.ok(ids.includes(id), `falta ${id} en la calle`);
  }
  assert.ok(street.spawns && street.arena, 'la calle declara spawns y arena');
});
