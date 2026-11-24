// La barra anuncia lo que va a hacer Manos (§8): Agarrar / Dejar / Levantar /
// Apoyar, sin "Usar en mí" y sin una Acción vacía.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorldScene } from '../helpers/world_scene.js';
import { attic } from '../../src/maps/attic.js';
import { house } from '../../src/maps/house.js';
import { garage } from '../../src/maps/garage.js';
import { createInventory } from '../../src/inventory.js';
import { getItem, isGrabbable } from '../../src/items.js';
import { itemsForMap } from '../../src/surfaces.js';
import { INITIAL_ITEMS } from '../../src/data/surfaces.js';

function invWith(...ids) {
  const inv = createInventory();
  ids.forEach((id, i) => { inv[i] = { id, count: 1 }; });
  return inv;
}

function objOf(map, id) {
  const obj = map.objects.find((o) => o.id === id);
  assert.ok(obj, `falta ${id}`);
  return obj;
}

function objCand(obj) {
  const w = (obj.tw || 1) * 16;
  const h = (obj.th || 1) * 16;
  return {
    id: obj.id, kind: obj.container ? 'container' : 'object',
    type: obj.type || 'decor', name: obj.name, ref: obj,
    cursorBox: { x: obj.x * 16, y: obj.y * 16, w, h },
  };
}

function floorCand(wi) {
  return {
    id: `floor_${wi.uid}`, kind: 'floorItem', type: 'thing',
    name: getItem(wi.itemId).name, item: getItem(wi.itemId), worldItem: wi,
    grabbable: isGrabbable(wi.itemId),
    cursorBox: { x: wi.x - 6, y: wi.y - 12, w: 12, h: 12 },
  };
}

function barScene({
  map, target = null, tile = null, point = null, device = 'mouse',
  held = null, carry = null, selfHover = false, pavaStation = null, items = [],
}) {
  const player = { x: 19 * 16 + 8, feet: 13 * 16 + 12, dir: 'up', sprite: { setDir() {} } };
  return makeWorldScene({
    name: map.id,
    mapData: map,
    worldState: { items, moved: {} },
    npcs: map.npcs || [],
    player,
    target,
    hoverTarget: null,
    hoverNear: false,
    selfHover,
    handsAim: { target, tile, point, device },
    handsAction: null,
    hintRects: [],
    cam: { x: 0, y: 0 },
    exitWarp: null,
    game: {
      flags: {}, inventory: invWith(...(held ? [held] : [])),
      selectedSlot: 0, pavaStation, hasSuit: false, hasRifle: false,
      input: { device },
      carry: carry ? { mapId: map.id, objectId: carry.id, object: carry } : null,
      showToast() {}, emit() {},
    },
    labelObstacles() { return []; },
    worldToView() { return { x: 100, y: 100 }; },
  });
}

function labels(world, device = 'mouse') {
  return world.hudParams({ device }).hintActions.map((h) => h.label);
}

test('barra: mouse sin objetivo y sin ítem no muestra Acción', () => {
  const world = barScene({ map: house });
  assert.deepEqual(labels(world), ['Mochila']);
});

test('barra: cosa agarrable en el piso = Acción Mirar + Manos Agarrar', () => {
  const wi = {
    uid: 'f1', itemId: 'mate_vacio', count: 1,
    place: { kind: 'floor', tx: 20, ty: 14 }, x: 328, y: 238,
  };
  const world = barScene({
    map: house, target: floorCand(wi), tile: { tx: 20, ty: 14 }, items: [wi],
  });
  assert.deepEqual(labels(world), ['Mirar Mate', 'Agarrar Mate', 'Mochila']);
});

test('barra: con mate en la mano y piso libre = Manos Dejar', () => {
  const world = barScene({
    map: house, held: 'mate_vacio', tile: { tx: 19, ty: 14 }, device: 'mouse',
  });
  assert.deepEqual(labels(world), ['Dejar Mate', 'Mochila']);
});

test('barra: con joystick sin objetivo, la Acción es el uso propio', () => {
  const world = barScene({
    map: house, held: 'mate_cebado', device: 'pad', tile: { tx: 20, ty: 13 },
  });
  const hints = world.hudParams({ device: 'pad' }).hintActions;
  assert.equal(hints[0].action, 'interact');
  assert.equal(hints[0].label, 'Tomar mate');
  assert.equal(hints.find((h) => h.action === 'self'), undefined);
});

test('barra: mesa con tela en la mano = Acción Mirar + Manos Dejar', () => {
  const table = objCand(objOf(house, 'kitchen_table'));
  const world = barScene({
    map: house, target: table, held: 'tela', device: 'mouse',
    tile: { tx: 22, ty: 13 },
  });
  assert.deepEqual(labels(world), ['Mirar la mesa', 'Dejar Tela engomada', 'Mochila']);
});

test('barra: llevando la silla = Manos Apoyar (la Acción hace lo mismo)', () => {
  const chair = objOf(house, 'kchair_l');
  const world = barScene({
    map: house, carry: chair, device: 'pad', tile: { tx: 20, ty: 13 },
  });
  const hints = world.hudParams({ device: 'pad' }).hintActions;
  assert.deepEqual(hints.map((h) => h.label), ['Apoyar la silla', 'Mochila']);
  assert.equal(hints[0].action, 'hands');
});

test('barra: sobre la pava en el fuego = Manos Agarrar la pava', () => {
  const stove = objCand(objOf(house, 'stove'));
  const world = barScene({
    map: house, target: stove, device: 'mouse', pavaStation: 'stove',
  });
  assert.deepEqual(labels(world), ['Mirar la cocina', 'Agarrar la pava', 'Mochila']);
});

test('barra: sobre un mueble liviano = Manos Levantar', () => {
  const crate = objCand(objOf(attic, 'crate'));
  const world = barScene({
    map: attic, target: crate, device: 'pad', items: itemsForMap('attic', INITIAL_ITEMS, attic),
  });
  const hints = world.hudParams({ device: 'pad' }).hintActions;
  assert.ok(hints.some((h) => h.action === 'hands' && h.label === 'Levantar el cajón de herramientas'));
});

test('barra: el cuadradito de Manos es leyenda, solo Mochila es clickeable', () => {
  const world = barScene({
    map: house, held: 'mate_vacio', tile: { tx: 19, ty: 14 }, device: 'mouse',
  });
  const hints = world.hudParams({ device: 'mouse' }).hintActions;
  for (const h of hints) {
    assert.equal(Boolean(h.static), h.action !== 'bag', h.action);
  }
});

test('revisión §11.4: con pad, apuntar a una cosa tiene prioridad sobre dejar', () => {
  const mate = {
    uid: 'm1', itemId: 'mate_vacio', count: 1,
    place: { kind: 'surface', objectId: 'table', slot: 6 }, x: 120, y: 130,
  };
  const cand = floorCand(mate);
  cand.kind = 'surfaceItem';
  const world = barScene({
    map: attic, target: cand, held: 'tela', device: 'pad',
    tile: { tx: 10, ty: 8 }, items: [mate],
  });
  const hints = world.hudParams({ device: 'pad' }).hintActions;
  assert.ok(hints.some((h) => h.action === 'hands' && h.label === 'Agarrar Mate'),
    'la barra anuncia Agarrar');
  assert.ok(!hints.some((h) => /^Dejar /.test(h.label)),
    'no anuncia Dejar sobre la cosa apuntada');
});
