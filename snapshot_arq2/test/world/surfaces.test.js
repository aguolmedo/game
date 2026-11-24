import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NO_SPACE_MESSAGE,
  SurfaceLayer,
  applyContainers,
  canPlace,
  containerItemsForMap,
  itemAt,
  itemsForMap,
  nextSlot,
  objectSize,
  placeItem,
  surfaceSlot,
  takeItem,
} from '../../src/surfaces.js';
import { createInventory, countItem } from '../../src/inventory.js';
import { lookLine } from '../../src/data/descriptions.js';
import { getItem } from '../../src/items.js';
import { getRecipe } from '../../src/recipes.js';

const table = {
  id: 'table',
  x: 2,
  y: 3,
  tw: 3,
  th: 2,
  surface: {
    slots: [{ x: 8, y: 24 }, { x: 24, y: 24 }, { x: 40, y: 24 }],
    maxItems: 3,
  },
};

const shelf = {
  id: 'shelf_left',
  x: 0,
  y: 1,
  tw: 2,
  th: 2,
  surface: { slots: [{ x: 10, y: 12 }], maxItems: 1 },
};

const crate = { id: 'crate', x: 1, y: 12, tw: 1, th: 1 };
const fixtureMap = { id: 'attic', objects: [table, shelf, crate] };

const DATA = {
  attic: {
    items: [
      { objectId: 'table', slot: 0, itemId: 'mate_vacio' },
      { objectId: 'table', slot: 1, itemId: 'naipes', sprite: 'naipe_oro' },
      { objectId: 'shelf_left', slot: 0, itemId: 'yerba' },
      { x: 96, y: 64, itemId: 'tela' },
    ],
    containers: { crate: [{ id: 'tiras', n: 3 }] },
  },
};

function fakeScene() {
  return {
    added: [],
    add(mesh) { this.added.push(mesh); },
    remove(mesh) {
      const i = this.added.indexOf(mesh);
      if (i >= 0) this.added.splice(i, 1);
    },
  };
}

test('surfaceSlot: px relativos a la esquina del objeto', () => {
  assert.deepEqual(surfaceSlot(table, 0), { x: 40, y: 72 });
  assert.deepEqual(surfaceSlot(table, 2), { x: 72, y: 72 });
  assert.equal(surfaceSlot(table, 8), null);
  assert.equal(surfaceSlot(crate, 0), null);
});

test('objectSize usa spriteSize/_w/_h o tw/th', () => {
  assert.deepEqual(objectSize(table), { w: 48, h: 32 });
  assert.deepEqual(objectSize({ ...table, spriteSize: { w: 56, h: 40 } }), { w: 56, h: 40 });
  assert.deepEqual(objectSize({ ...table, _w: 50, _h: 34 }), { w: 50, h: 34 });
});

test('nextSlot y canPlace respetan slots y maxItems', () => {
  let items = [];
  assert.equal(nextSlot(table, items), 0);
  assert.equal(canPlace(table, items, 0), true);

  items = placeItem(items, { itemId: 'mate_vacio', objectId: 'table', slot: 0, x: 40, y: 72 });
  assert.equal(nextSlot(table, items), 1);
  assert.equal(canPlace(table, items, 0), false, 'slot ocupado');
  assert.equal(canPlace(table, items, 1), true);

  items = placeItem(items, { itemId: 'vaso', objectId: 'table', slot: 1, x: 56, y: 72 });
  items = placeItem(items, { itemId: 'vaso', objectId: 'table', slot: 2, x: 72, y: 72 });
  assert.equal(nextSlot(table, items), -1);
  assert.equal(canPlace(table, items, 0), false);
  assert.equal(canPlace({ ...table, surface: { slots: table.surface.slots, maxItems: 1 } },
    items, 1), false, 'maxItems manda aunque queden slots');
});

test('placeItem/takeItem: ida y vuelta pura', () => {
  const original = [];
  const placed = placeItem(original, {
    itemId: 'tela', objectId: 'table', slot: 0, object: table,
  });
  assert.equal(original.length, 0, 'no muta la entrada');
  assert.equal(placed.length, 1);
  assert.deepEqual({ x: placed[0].x, y: placed[0].y }, { x: 40, y: 72 });
  assert.ok(placed[0].uid);

  assert.equal(itemAt(placed, 'table', 0).itemId, 'tela');
  assert.equal(itemAt(placed, 'table', 1), null);

  const taken = takeItem(placed, placed[0].uid);
  assert.equal(taken.item.itemId, 'tela');
  assert.equal(taken.items.length, 0);
  assert.equal(placed.length, 1, 'tampoco muta al sacar');
  assert.equal(takeItem(placed, 'nope').item, null);
});

test('itemsForMap resuelve x/y con los objetos del mapa', () => {
  const items = itemsForMap('attic', DATA, fixtureMap);
  assert.equal(items.length, 4);
  assert.deepEqual({ x: items[0].x, y: items[0].y, slot: items[0].slot },
    { x: 40, y: 72, slot: 0 });
  assert.equal(items[1].sprite, 'naipe_oro');
  assert.deepEqual({ x: items[2].x, y: items[2].y }, { x: 10, y: 28 });
  assert.deepEqual({ x: items[3].x, y: items[3].y }, { x: 96, y: 64 });
  assert.equal(new Set(items.map((w) => w.uid)).size, items.length);

  assert.deepEqual(itemsForMap('garage', DATA, fixtureMap), []);
  assert.equal(itemsForMap('attic', DATA.attic.items, fixtureMap).length, 4);
});

test('contenedores: data propia y sin pisar los del mapa', () => {
  assert.deepEqual(containerItemsForMap('attic', DATA), { crate: [{ id: 'tiras', n: 3 }] });
  const withEmpty = {
    id: 'attic',
    objects: [{ ...crate, container: { name: 'Cajón', items: [] } }],
  };
  const filled = applyContainers(withEmpty, DATA);
  assert.deepEqual(filled.objects[0].container.items, [{ id: 'tiras', n: 3 }]);
  assert.equal(withEmpty.objects[0].container.items.length, 0, 'no muta');

  const withOwn = {
    id: 'attic',
    objects: [{ ...crate, container: { name: 'Cajón', items: [{ id: 'pinza', n: 1 }] } }],
  };
  const kept = applyContainers(withOwn, DATA);
  assert.deepEqual(kept.objects[0].container.items, [{ id: 'pinza', n: 1 }]);
});

test('SurfaceLayer expone la API esperada y no rompe sin assets', () => {
  const scene = fakeScene();
  const items = itemsForMap('attic', DATA, fixtureMap);
  const layer = new SurfaceLayer(scene, {}, fixtureMap, items);
  assert.ok(Array.isArray(layer.candidates));
  assert.equal(layer.candidates.length, 4);
  assert.equal(layer.candidates[0].kind, 'surfaceItem');
  assert.equal(layer.candidates[0].label, 'Agarrar Mate');
  assert.equal(layer.candidates[1].label, 'Mirar Naipes');
  for (const fn of ['update', 'take', 'dropSelected', 'describe', 'sync', 'dispose']) {
    assert.equal(typeof layer[fn], 'function', `falta ${fn}`);
  }
  layer.update(0.016, {});
  layer.sync();
  layer.dispose();
  assert.equal(layer.candidates.length, 0);
  assert.equal(scene.added.length, 0, 'dispose limpia todo');
});

test('dropSelected saca del inventario y apoya en el primer slot libre', () => {
  const scene = fakeScene();
  const layer = new SurfaceLayer(scene, {}, fixtureMap, []);
  let inventory = createInventory(4);
  inventory[0] = { id: 'tela', count: 1 };

  const first = layer.dropSelected(inventory, 0, 'table');
  assert.ok(first);
  assert.equal(first.placed.itemId, 'tela');
  assert.equal(first.placed.slot, 0);
  assert.equal(countItem(first.inventory, 'tela'), 0);
  assert.equal(layer.items.length, 1);

  inventory = first.inventory;
  inventory[1] = { id: 'botas', count: 1 };
  assert.equal(layer.dropSelected(inventory, 1, 'table', 0), null, 'slot ocupado');

  const full = { ...table, surface: { slots: table.surface.slots, maxItems: 1 } };
  const oneSlotMap = { id: 'attic', objects: [full] };
  const one = new SurfaceLayer(fakeScene(), {}, oneSlotMap, []);
  const inv = createInventory(2);
  inv[0] = { id: 'tela', count: 1 };
  assert.ok(one.dropSelected(inv, 0, 'table'));
  inv[1] = { id: 'botas', count: 1 };
  assert.equal(one.dropSelected(inv, 1, 'table'), null, 'maxItems lleno');
  assert.equal(NO_SPACE_MESSAGE, 'No hay lugar.');
  assert.equal(one.dropSelected(inv, 1, 'crate'), null, 'sin superficie');
});

test('take: agarra del mundo al inventario y respeta decorativos/lleno', () => {
  const scene = fakeScene();
  const items = itemsForMap('attic', DATA, fixtureMap);
  const layer = new SurfaceLayer(scene, {}, fixtureMap, items);

  const mate = layer.candidates.find((c) => c.worldItem.itemId === 'mate_vacio');
  const inventory = createInventory(2);
  const got = layer.take(mate, inventory);
  assert.equal(got.count, 1);
  assert.equal(got.itemId, 'mate_vacio');
  assert.equal(countItem(got.inventory, 'mate_vacio'), 1);
  assert.equal(layer.items.length, items.length - 1);

  const naipe = layer.candidates.find((c) => c.worldItem.itemId === 'naipes');
  const decor = layer.take(naipe, got.inventory);
  assert.equal(decor.count, 0);
  assert.equal(decor.reason, 'decor');
  assert.equal(countItem(decor.inventory, 'naipes'), 0);

  const full = [{ id: 'x', count: 9 }];
  const tela = layer.candidates.find((c) => c.worldItem.itemId === 'tela');
  const noRoom = layer.take(tela, full);
  assert.equal(noRoom.count, 0);
  assert.equal(noRoom.reason, 'full');
  assert.ok(layer.items.some((w) => w.itemId === 'tela'), 'si no entra, queda');
});

test('describe y lookLine: descripciones y cambios del apagón', () => {
  const layer = new SurfaceLayer(fakeScene(), {}, fixtureMap, []);
  assert.match(layer.describe('anotador'), /14 a 11/);
  assert.match(layer.describe('cenicero'), /Nunca para/);
  assert.match(lookLine('radio'), /Suena/);
  assert.equal(lookLine('radio', { apagon: true }), 'Muda.');
  assert.equal(lookLine('reloj', { apagon: true }), 'Las once y diez. Se paró.');
  assert.match(lookLine('reloj', { apagon: false }), /once y diez/);
  assert.equal(lookLine('objeto_raro'), null);
});

test('items del §5: campos completos y receta nueva del traje', () => {
  const required = [
    'mate_vacio', 'mate_yerba', 'mate_cebado', 'mate_lavado', 'yerba',
    'pava_fria', 'pava_caliente', 'pava_hervida', 'tela', 'guantes', 'botas',
    'tiras', 'casco', 'lata', 'traje', 'secador', 'nafta', 'rifle', 'balas',
    'naipes', 'anotador', 'sifon', 'vino', 'vaso', 'cenicero', 'latas',
    'frascos', 'pan', 'libros', 'tijera', 'calentador', 'vela',
  ];
  for (const id of required) {
    const item = getItem(id);
    assert.equal(item.id, id);
    assert.ok(item.name.length > 0, `${id} sin nombre`);
    assert.ok(item.description.length > 0, `${id} sin descripción`);
    assert.ok(item.kind, `${id} sin kind`);
    assert.ok(item.worldSprite, `${id} sin worldSprite`);
  }
  const recipe = getRecipe('traje');
  assert.equal(recipe.result, 'traje');
  const needs = Object.fromEntries(recipe.needs.map((n) => [n.id, n.n]));
  assert.deepEqual(needs, {
    tela: 1, guantes: 1, botas: 1, tiras: 2, casco: 1, lata: 1,
  });
});
