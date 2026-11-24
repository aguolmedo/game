import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { attic } from '../../src/maps/attic.js';
import { house } from '../../src/maps/house.js';
import { garage } from '../../src/maps/garage.js';
import { street } from '../../src/maps/street.js';
import { INITIAL_ITEMS } from '../../src/data/surfaces.js';

// --- maps_contract.test.js
{
// Contrato mínimo de mapas que usan los demás sistemas (world.js, escenas).
// La validación completa del hito H2 vive en test/maps2.test.js.

const read = (name) => JSON.parse(
  fs.readFileSync(new URL(`../../public/assets/${name}`, import.meta.url), 'utf8'),
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
  assert.ok(Number.isFinite(street.spawn.x) && Number.isFinite(street.spawn.y),
    'la calle declara su spawn');
});
}

// --- maps_interiors.test.js
{
// Mapas del hito H2: altillo, planta baja, garaje y calle.
// Valida que solo usen assets existentes, que las coordenadas entren en el
// mapa, que los warps lleven a mapas/posiciones validas y que las superficies,
// luces y ventanas tengan la forma que esperan los demas sistemas.

const read = (name) => JSON.parse(
  fs.readFileSync(new URL(`../../public/assets/${name}`, import.meta.url), 'utf8'),
);
const tiles = read('tiles.json').frames;
const ATLASES = ['objects', 'interior2', 'props', 'street2', 'houses', 'fx'];
const sprites = new Set();
for (const atlas of ATLASES) {
  for (const name of Object.keys(read(`${atlas}.json`).frames)) sprites.add(name);
}

const maps = [attic, house, garage, street];
const byId = Object.fromEntries(maps.map((m) => [m.id, m]));

test('tamaños y grillas coherentes', () => {
  assert.deepEqual([attic.cols, attic.rows], [22, 14]);
  assert.deepEqual([house.cols, house.rows], [28, 16]);
  assert.deepEqual([garage.cols, garage.rows], [18, 11]);
  assert.deepEqual([street.cols, street.rows], [80, 20]);
  for (const map of maps) {
    assert.equal(map.floor.length, map.rows, `${map.id}: filas`);
    for (const row of map.floor) assert.equal(row.length, map.cols, `${map.id}: columnas`);
    assert.ok(map.objects.length > 0, `${map.id}: sin objetos`);
    assert.ok(Array.isArray(map.pickups), `${map.id}: pickups`);
    assert.ok(Array.isArray(map.warps), `${map.id}: warps`);
    assert.ok(Array.isArray(map.npcs), `${map.id}: npcs`);
  }
});

test('(a) todos los tiles del piso existen en tiles.json', () => {
  for (const map of maps) {
    for (const row of map.floor) {
      for (const name of row) assert.ok(tiles[name], `tile ${name} en ${map.id}`);
    }
  }
});

test('(b) todos los sprites de objetos existen en algún atlas', () => {
  for (const map of maps) {
    for (const obj of map.objects) {
      assert.ok(sprites.has(obj.sprite), `sprite ${obj.sprite} (${map.id}:${obj.id})`);
    }
  }
});

test('(c) objetos dentro de la grilla y con offset numérico', () => {
  for (const map of maps) {
    for (const obj of map.objects) {
      assert.ok(Number.isInteger(obj.x) && Number.isInteger(obj.y), `${map.id}:${obj.id} x/y`);
      assert.ok(obj.x >= 0 && obj.y >= 0, `${map.id}:${obj.id} negativo`);
      assert.ok(obj.x + obj.tw <= map.cols, `${map.id}:${obj.id} se sale en X`);
      assert.ok(obj.y + obj.th <= map.rows, `${map.id}:${obj.id} se sale en Y`);
      assert.ok(obj.tw > 0 && obj.th > 0, `${map.id}:${obj.id} tamaño`);
      for (const n of obj.offset || [0, 0]) assert.ok(Number.isFinite(n), `${map.id}:${obj.id} offset`);
    }
  }
});

test('(d) ids únicos por mapa', () => {
  for (const map of maps) {
    const ids = map.objects.map((o) => o.id);
    assert.equal(new Set(ids).size, ids.length, `${map.id}: ids repetidos`);
  }
});

test('(e) warps a mapas existentes y con spawn válido', () => {
  for (const map of maps) {
    for (const warp of map.warps) {
      assert.ok(byId[warp.to], `${map.id}: warp a ${warp.to}`);
      assert.ok(warp.w > 0 && warp.h > 0, `${map.id}:${warp.id} rect`);
      assert.ok(Number.isFinite(warp.spawn.x) && Number.isFinite(warp.spawn.y),
        `${map.id}:${warp.id} spawn`);
      const dest = byId[warp.to];
      assert.ok(warp.spawn.x >= 0 && warp.spawn.x <= dest.cols * 16, `${warp.to}: spawn X`);
      assert.ok(warp.spawn.y > 0 && warp.spawn.y <= dest.rows * 16, `${warp.to}: spawn Y`);
    }
  }
});

function walkable(map, x, feet) {
  const tx = Math.floor(x / 16);
  const ty = Math.floor((feet - 1) / 16);
  const name = map.floor[ty] && map.floor[ty][tx];
  if (!name) return false;
  if (map.solidTiles.some((p) => name === p || name.startsWith(p))) return false;
  for (const obj of map.objects) {
    if (!obj.solid) continue;
    const s = obj.solid === true ? { x: 0, y: 0, w: obj.tw, h: obj.th } : obj.solid;
    const bx = (obj.x + s.x) * 16;
    const by = (obj.y + s.y) * 16;
    if (x >= bx && x < bx + s.w * 16 && feet > by && feet <= by + s.h * 16 + 1) return false;
  }
  return true;
}

test('spawns y destinos de warps son caminables', () => {
  for (const map of maps) {
    assert.ok(walkable(map, map.spawn.x, map.spawn.y), `spawn sólido en ${map.id}`);
    for (const warp of map.warps) {
      const dest = byId[warp.to];
      assert.ok(walkable(dest, warp.spawn.x, warp.spawn.y), `destino sólido ${dest.id}`);
    }
  }
});

test('(f) lights, windows, surfaces y spawns bien tipados', () => {
  const KINDS = new Set(['electric', 'candle', 'oil', 'bulb', 'snow']);
  const STATES = new Set(['on', 'off']);
  const ONLY = new Set([null, 'electrica', 'apagon']);
  for (const map of maps) {
    assert.ok(Array.isArray(map.lights), `${map.id}: lights`);
    for (const light of map.lights) {
      assert.ok(Number.isFinite(light.x) && Number.isFinite(light.y), `${map.id}: luz x/y`);
      assert.ok(Number.isFinite(light.radius) && light.radius > 0, `${map.id}: luz radius`);
      assert.ok(KINDS.has(light.kind), `${map.id}: luz kind ${light.kind}`);
      assert.ok(STATES.has(light.state), `${map.id}: luz state ${light.state}`);
      assert.ok(ONLY.has(light.onlyIn), `${map.id}: luz onlyIn ${light.onlyIn}`);
    }
    assert.ok(Array.isArray(map.windows), `${map.id}: windows`);
    for (const win of map.windows) {
      assert.ok(typeof win.id === 'string', `${map.id}: ventana id`);
      assert.ok(Number.isFinite(win.x) && Number.isFinite(win.y), `${map.id}: ventana x/y`);
      assert.equal(typeof win.openable, 'boolean', `${map.id}: ventana openable`);
      assert.ok(win.view === null || win.view === 'attic' || win.view === 'living',
        `${map.id}: ventana view`);
    }
    assert.ok(Array.isArray(map.surfaces), `${map.id}: surfaces`);
    const objects = Object.fromEntries(map.objects.map((o) => [o.id, o]));
    for (const surface of map.surfaces) {
      const obj = objects[surface.id];
      assert.ok(obj, `${map.id}: superficie de objeto inexistente ${surface.id}`);
      assert.ok(obj.surface, `${map.id}: ${surface.id} no declara surface`);
      assert.deepEqual(surface.slots, obj.surface.slots, `${map.id}: ${surface.id} slots`);
    }
  }
  assert.ok(Number.isFinite(street.spawn.x) && Number.isFinite(street.spawn.y), 'street.spawn');
  assert.ok(street.bounds.maxX > street.bounds.minX, 'street.bounds');
});

test('(g) slots de superficie dentro de la caja del mueble', () => {
  for (const map of maps) {
    for (const obj of map.objects) {
      if (!obj.surface) continue;
      const { slots, maxItems } = obj.surface;
      assert.ok(Array.isArray(slots) && slots.length > 0, `${map.id}:${obj.id} slots`);
      assert.ok(Number.isFinite(maxItems) && maxItems <= slots.length,
        `${map.id}:${obj.id} maxItems`);
      for (const slot of slots) {
        assert.ok(Number.isFinite(slot.x) && Number.isFinite(slot.y), `${map.id}:${obj.id} slot`);
        assert.ok(slot.x >= 0 && slot.x <= obj.tw * 16, `${map.id}:${obj.id} slot X`);
        assert.ok(slot.y > 0 && slot.y <= obj.th * 16, `${map.id}:${obj.id} slot Y`);
      }
    }
  }
});

test('los objetos iniciales de §6.3 caben en las superficies de los mapas', () => {
  for (const map of maps) {
    const def = INITIAL_ITEMS[map.id];
    if (!def) continue;
    const objects = Object.fromEntries(map.objects.map((o) => [o.id, o]));
    for (const entry of def.items || []) {
      const obj = objects[entry.objectId];
      assert.ok(obj, `${map.id}: falta el objeto ${entry.objectId}`);
      assert.ok(obj.surface, `${map.id}:${entry.objectId} sin superficie`);
      assert.ok(entry.slot < obj.surface.slots.length,
        `${map.id}:${entry.objectId} slot ${entry.slot} fuera de rango`);
    }
    for (const [id, items] of Object.entries(def.containers || {})) {
      const obj = objects[id];
      assert.ok(obj, `${map.id}: falta el contenedor ${id}`);
      assert.ok(obj.container && Array.isArray(obj.container.items), `${map.id}:${id} container`);
      assert.ok(items.length <= obj.container.items.length, `${map.id}:${id} items`);
    }
  }
});

test('los ids canónicos de objetos existen en cada mapa', () => {
  const expected = {
    attic: ['table', 'shelf_left', 'workbench', 'crate', 'radio', 'window', 'chair_juan', 'lamp'],
    house: ['stairs_up', 'window_living', 'window_martita', 'hall_door', 'alacena',
      'kitchen_table', 'coat_stand', 'nightstand', 'wardrobe', 'stove', 'garage_door'],
    garage: ['garage_shelf', 'generator', 'bidon', 'bench_suit', 'extractor', 'bulb', 'garage_door'],
    street: ['ferreteria', 'caja_municiones', 'polsky_body', 'cartel',
      'farola_1', 'farola_2', 'farola_3', 'farola_4',
      'medano_1', 'medano_2', 'medano_3', 'medano_4', 'medano_5', 'medano_6'],
  };
  for (const [mapId, ids] of Object.entries(expected)) {
    const have = new Set(byId[mapId].objects.map((o) => o.id));
    for (const id of ids) assert.ok(have.has(id), `falta ${mapId}:${id}`);
  }
  assert.ok(house.windows.some((w) => w.id === 'window_martita' && w.openable));
  assert.ok(house.windows.some((w) => w.id === 'window_living' && w.view === 'living'));
  assert.ok(!house.warps.some((w) => w.to === 'street'), 'la puerta del hall no es warp');
  assert.ok(garage.warps.some((w) => w.to === 'street' && w.needsSuit && w.needsFlag));
});

test('el altillo y la calle no tienen pickups flotando', () => {
  assert.equal(attic.pickups.length, 0);
  assert.equal(street.pickups.length, 0);
  assert.equal(street.npcs.length, 0);
});
}
