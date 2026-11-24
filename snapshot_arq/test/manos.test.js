// Manos: agarrar, dejar, levantar y apoyar (docs/diseno_manos.md §4-§7, §10).
import test from 'node:test';
import assert from 'node:assert/strict';
import { attic } from '../src/maps/attic.js';
import { house } from '../src/maps/house.js';
import { garage } from '../src/maps/garage.js';
import { street } from '../src/maps/street.js';
import { resolveHands } from '../src/actions.js';
import { addItem, createInventory } from '../src/inventory.js';
import { getItem, isGrabbable } from '../src/items.js';
import { itemsForMap, ensureWorldState, resetWorld, takeItem } from '../src/surfaces.js';
import { INITIAL_ITEMS } from '../src/data/surfaces.js';
import {
  canDropFloor, floorTileCheck, dropFloorItem, nearestFreeSlot,
  supportCheck, floorItemAt, adjacentToPlayer,
} from '../src/placement.js';

const MAPS = [attic, house, garage, street];

function invWith(...ids) {
  const inv = createInventory();
  ids.forEach((id, i) => { inv[i] = { id, count: 1 }; });
  return inv;
}

function ctxOf(map, { player = { x: 40, feet: 88 }, held = null, items = [] } = {}) {
  return {
    game: {
      flags: {}, inventory: invWith(...(held ? [held] : [])),
      selectedSlot: 0, pavaStation: null,
    },
    objects: map.objects,
    map,
    items,
    npcs: map.npcs || [],
    warps: map.warps || [],
    player,
  };
}

function objOf(map, id) {
  const obj = map.objects.find((o) => o.id === id);
  assert.ok(obj, `falta ${id} en ${map.id}`);
  return obj;
}

function objCand(obj, extra = {}) {
  return {
    id: obj.id, kind: obj.container ? 'container' : 'object',
    type: obj.type || 'decor', name: obj.name, ref: obj, ...extra,
  };
}

function floorCand(wi) {
  return {
    id: `floor_${wi.uid}`, kind: 'floorItem', type: 'thing',
    name: getItem(wi.itemId).name, item: getItem(wi.itemId), worldItem: wi,
    grabbable: isGrabbable(wi.itemId),
  };
}

// ------------------------------------------------------------------ §4

test('Manos 1: llevando un mueble, Apoyar si el lugar es válido', () => {
  const chair = objOf(house, 'kchair_l');
  const player = { x: 19 * 16 + 8, feet: 13 * 16 + 12 };
  const ctx = ctxOf(house, { player });
  const carry = { mapId: 'house', objectId: chair.id, object: chair };
  const aim = { target: null, tile: { tx: 20, ty: 13 }, point: null, device: 'pad' };
  const action = resolveHands(ctx, aim, null, carry);
  assert.equal(action.kind, 'support');
  assert.equal(action.label, 'Apoyar la silla');
  assert.equal(action.payload.tx, 20);
  assert.equal(action.payload.ty, 13);
});

test('Manos 1: llevando un mueble a un lugar inválido no hay acción', () => {
  const chair = objOf(house, 'kchair_l');
  const player = { x: 11 * 16 + 8, feet: 5 * 16 + 12 };
  const ctx = ctxOf(house, { player });
  const carry = { mapId: 'house', objectId: chair.id, object: chair };
  const aim = { target: null, tile: { tx: 12, ty: 5 }, point: null, device: 'pad' };
  assert.equal(resolveHands(ctx, aim, null, carry), null);
});

test('Manos 2: apuntando a una cosa agarrable, Agarrar', () => {
  const wi = {
    uid: 'f1', itemId: 'mate_vacio', count: 1,
    place: { kind: 'floor', tx: 3, ty: 5 }, x: 56, y: 94,
  };
  const ctx = ctxOf(house, { items: [wi] });
  const action = resolveHands(
    ctx, { target: floorCand(wi), tile: { tx: 3, ty: 5 }, point: null, device: 'mouse' }, null, null,
  );
  assert.equal(action.kind, 'grab');
  assert.equal(action.label, 'Agarrar Mate');
  assert.equal(action.blocked, null);
});

test('Manos 2: mochila llena, aviso y la cosa queda', () => {
  const wi = {
    uid: 'f1', itemId: 'mate_vacio', count: 1,
    place: { kind: 'floor', tx: 3, ty: 5 }, x: 56, y: 94,
  };
  const ctx = ctxOf(house, { items: [wi] });
  ctx.game.inventory = Array.from({ length: 18 }, () => ({ id: 'rifle', count: 9 }));
  const action = resolveHands(
    ctx, { target: floorCand(wi), tile: { tx: 3, ty: 5 }, point: null, device: 'mouse' }, null, null,
  );
  assert.equal(action.kind, 'grab');
  assert.equal(action.blocked, 'full');
});

test('Manos 2b: la pava sobre el fuego se agarra con Manos', () => {
  const stove = objOf(house, 'stove');
  const ctx = ctxOf(house);
  ctx.game.pavaStation = 'stove';
  const action = resolveHands(
    ctx, { target: objCand(stove), tile: null, point: null, device: 'mouse' }, null, null,
  );
  assert.equal(action.kind, 'takePava');
  assert.equal(action.label, 'Agarrar la pava');
});

test('Manos 3: mueble liviano sin nada encima, Levantar', () => {
  const chair = objOf(house, 'kchair_l');
  const ctx = ctxOf(house);
  const action = resolveHands(
    ctx, { target: objCand(chair), tile: null, point: null, device: 'mouse' }, null, null,
  );
  assert.equal(action.kind, 'lift');
  assert.equal(action.label, 'Levantar la silla');
});

test('Manos 3: no se levantan las sillas del truco, ni el bidón del garaje', () => {
  for (const [map, id] of [
    [attic, 'chair_fav'], [attic, 'chair_juan'], [garage, 'bidon'],
  ]) {
    const obj = objOf(map, id);
    const ctx = ctxOf(map);
    const action = resolveHands(
      ctx, { target: objCand(obj), tile: null, point: null, device: 'mouse' }, null, null,
    );
    assert.equal(action, null, `${map.id}/${id} no es liviano`);
  }
});

test('Manos 3: no se levanta un mueble con cosas encima', () => {
  const table = objOf(attic, 'table');
  const ctx = ctxOf(attic, { items: itemsForMap('attic', INITIAL_ITEMS, attic) });
  const action = resolveHands(
    ctx, { target: objCand(table), tile: null, point: null, device: 'mouse' }, null, null,
  );
  assert.equal(action, null, 'la mesa tiene cosas y no es liviana igual');
  // Prueba directa de la regla con un mueble liviano "con algo encima".
  const box = objOf(attic, 'box');
  const onTop = [{
    uid: 'x', itemId: 'tela', count: 1,
    place: { kind: 'surface', objectId: 'box', slot: 0 }, x: 0, y: 0,
  }];
  assert.equal(resolveHands(
    ctxOf(attic, { items: onTop }),
    { target: objCand(box), tile: null, point: null, device: 'mouse' }, null, null,
  ), null);
});

test('Manos 4: ítem en la mano + piso válido, Dejar', () => {
  const player = { x: 19 * 16 + 8, feet: 13 * 16 + 12 };
  const ctx = ctxOf(house, { player, held: 'mate_vacio' });
  const action = resolveHands(
    ctx, { target: null, tile: { tx: 19, ty: 14 }, point: null, device: 'mouse' },
    'mate_vacio', null,
  );
  assert.equal(action.kind, 'drop');
  assert.equal(action.label, 'Dejar Mate');
  assert.equal(action.payload.tx, 19);
  assert.equal(action.payload.ty, 14);
});

test('Manos 5: sin nada que hacer, null (la barra no muestra Manos)', () => {
  const ctx = ctxOf(house, { player: { x: 2 * 16 + 8, feet: 5 * 16 + 12 } });
  assert.equal(resolveHands(
    ctx, { target: null, tile: { tx: 2, ty: 4 }, point: null, device: 'pad' }, null, null,
  ), null);
});

// ------------------------------------------------------------------ §5

test('piso: caminable, sin objeto/NPC/Juan/warp y vecino de Juan', () => {
  const player = { x: 2 * 16 + 8, feet: 5 * 16 + 12 };
  const base = { map: house, npcs: house.npcs, warps: house.warps, player, items: [] };
  assert.equal(canDropFloor({ ...base, tx: 3, ty: 5 }), true);
  // Juan encima.
  assert.equal(floorTileCheck({ ...base, tx: 2, ty: 5 }).reason, 'juan');
  // no vecino.
  assert.equal(floorTileCheck({ ...base, tx: 5, ty: 5 }).reason, 'lejos');
  // pared.
  assert.equal(floorTileCheck({ ...base, tx: 1, ty: 1 }).reason, 'solido');
  // NPC (Elena en 8,8).
  assert.equal(floorTileCheck({ ...base, tx: 8, ty: 8 }).reason, 'npc');
  // objeto sin sólido: la silla de la cocina ocupa (20,12)-(20,13).
  assert.equal(floorTileCheck({
    ...base, player: { x: 19 * 16 + 8, feet: 13 * 16 + 12 },
    tx: 20, ty: 13,
  }).reason, 'objeto');
  // warp (el portón del garaje).
  const warp = house.warps.find((w) => w.id === 'garage_door');
  const wx = Math.floor(warp.x / 16);
  const wy = Math.floor(warp.y / 16);
  assert.equal(floorTileCheck({
    ...base, player: { x: (wx - 1) * 16 + 8, feet: wy * 16 + 12 }, tx: wx, ty: wy,
  }).reason, 'warp');
});

test('piso: apilar la misma cosa apilable, no mezclar distintas', () => {
  const wi = {
    uid: 't1', itemId: 'tiras', count: 1,
    place: { kind: 'floor', tx: 3, ty: 5 }, x: 56, y: 94,
  };
  const player = { x: 2 * 16 + 8, feet: 5 * 16 + 12 };
  const base = {
    map: house, npcs: house.npcs, warps: house.warps, player, items: [wi],
  };
  assert.equal(canDropFloor({ ...base, tx: 3, ty: 5, itemId: 'tiras' }), true);
  assert.equal(canDropFloor({ ...base, tx: 3, ty: 5, itemId: 'mate_vacio' }), false);
  assert.equal(floorTileCheck({ ...base, tx: 3, ty: 5 }).reason, 'cosa');
  const twice = dropFloorItem(dropFloorItem([], 'tiras', 1, 3, 5), 'tiras', 1, 3, 5);
  assert.equal(twice.length, 1);
  assert.equal(twice[0].count, 2);
  const other = dropFloorItem([], 'mate_vacio', 1, 3, 5);
  assert.equal(floorItemAt(other, 3, 5).itemId, 'mate_vacio');
});

test('piso: no se deja donde no se alcanza (solo vecinos de Juan)', () => {
  const player = { x: 2 * 16 + 8, feet: 5 * 16 + 12 };
  for (const [tx, ty, ok] of [[3, 5, true], [1, 5, true], [2, 4, true], [2, 6, true], [3, 6, false]]) {
    assert.equal(adjacentToPlayer(player, tx, ty), ok, `${tx},${ty}`);
  }
});

// ------------------------------------------------------------------ §6

test('mueble: apoyo válido y "Taparía el paso." en el vano', () => {
  const chair = objOf(house, 'kchair_l');
  const ok = supportCheck({
    map: house, npcs: house.npcs, warps: house.warps, items: [],
    player: { x: 19 * 16 + 8, feet: 13 * 16 + 12 },
    object: chair, tx: 20, ty: 13,
  });
  assert.equal(ok.ok, true);

  // El vano living-hall (columna 12, filas 5 y 6): la silla 1x2 lo tapa.
  const door = supportCheck({
    map: house, npcs: house.npcs, warps: house.warps, items: [],
    player: { x: 11 * 16 + 8, feet: 5 * 16 + 12 },
    object: chair, tx: 12, ty: 5,
  });
  assert.equal(door.ok, false);
  assert.equal(door.reason, 'taparia');
});

test('mueble: no se apoya sobre otra cosa, un warp ni lejos de Juan', () => {
  const chair = objOf(house, 'kchair_l');
  const base = {
    map: house, npcs: house.npcs, warps: house.warps, items: [],
    player: { x: 19 * 16 + 8, feet: 13 * 16 + 12 }, object: chair,
  };
  // Sobre la mesa de la cocina (sólida).
  assert.equal(supportCheck({ ...base, tx: 21, ty: 13 }).ok, false);
  // Sobre el warp del portón.
  const warp = house.warps.find((w) => w.id === 'garage_door');
  const wx = Math.floor(warp.x / 16);
  const wy = Math.floor(warp.y / 16);
  assert.equal(supportCheck({
    ...base,
    player: { x: (wx - 1) * 16 + 8, feet: wy * 16 + 12 },
    tx: wx, ty: wy,
  }).ok, false);
  // Lejos de Juan.
  assert.equal(supportCheck({ ...base, tx: 18, ty: 1 }).reason, 'lejos');
});

// ------------------------------------------------------------------ §3 / §10

test('estado por partida: se crea una vez, persiste y reset lo borra', () => {
  const game = { world: {} };
  const st = ensureWorldState(game, 'house', house);
  assert.ok(st.items.length > 0, 'se llenó desde INITIAL_ITEMS');
  st.items = dropFloorItem(st.items, 'mate_vacio', 1, 19, 14);
  // Ir al garaje y volver: el mismo estado sigue ahí.
  ensureWorldState(game, 'garage', garage);
  const back = ensureWorldState(game, 'house', house);
  assert.ok(floorItemAt(back.items, 19, 14), 'la cosa sigue en la casa');
  assert.equal(back.items, st.items, 'no se recrea al volver');
  resetWorld(game);
  const fresh = ensureWorldState(game, 'house', house);
  assert.equal(floorItemAt(fresh.items, 19, 14), null, 'reset borra las cosas');
});

test('muebles movidos persisten en game.world[mapId].moved', () => {
  const game = { world: {} };
  const st = ensureWorldState(game, 'house', house);
  st.moved.kchair_l = { tx: 20, ty: 13 };
  assert.deepEqual(ensureWorldState(game, 'house', house).moved.kchair_l, { tx: 20, ty: 13 });
});

test('agarrar del piso: el worldItem sale y entra a la mochila', () => {
  const items = dropFloorItem([], 'mate_vacio', 1, 19, 14);
  const wi = floorItemAt(items, 19, 14);
  const result = addItem(createInventory(), wi.itemId, wi.count);
  assert.equal(result.added, 1);
  const after = takeItem(items, wi.uid);
  assert.equal(after.items.length, 0);
  assert.equal(after.item.uid, wi.uid);
  assert.equal(result.slots.filter(Boolean)[0].id, 'mate_vacio');
});

test('dejar en un mueble: el slot libre más cercano al puntero o a Juan', () => {
  const table = objOf(garage, 'garage_shelf');
  const items = itemsForMap('garage', INITIAL_ITEMS, garage);
  const nearLeft = nearestFreeSlot(table, items, { x: table.x * 16, y: table.y * 16 + 20 });
  const nearRight = nearestFreeSlot(table, items, {
    x: (table.x + table.tw) * 16, y: table.y * 16 + 20,
  });
  assert.ok(nearLeft && nearRight);
  assert.notEqual(nearLeft.slot, nearRight.slot, 'apunta a slots distintos');
  // Nunca elige un slot ocupado.
  const used = new Set(items
    .filter((wi) => wi.place?.objectId === table.id)
    .map((wi) => wi.place.slot));
  assert.ok(!used.has(nearLeft.slot));
  assert.ok(!used.has(nearRight.slot));
  // Mesa llena: null.
  const full = [];
  for (let i = 0; i < table.surface.slots.length; i++) {
    full.push({
      uid: `s${i}`, itemId: 'naipes', count: 1,
      place: { kind: 'surface', objectId: table.id, slot: i }, x: 0, y: 0,
    });
  }
  assert.equal(nearestFreeSlot(table, full), null);
});

test('lista cerrada de muebles livianos (§7)', () => {
  const expected = {
    attic: ['crate', 'box', 'suitcase', 'crate_stairs', 'box_stairs'],
    house: ['kchair_l', 'kchair_r', 'entry_tire', 'entry_bucket',
      'kitchen_bucket', 'bidon', 'toy_horse'],
    garage: ['stool', 'garage_crate', 'garage_box', 'garage_box2',
      'garage_cardboard', 'tire'],
    street: [],
  };
  for (const [mapId, ids] of Object.entries(expected)) {
    const map = MAPS.find((m) => m.id === mapId);
    const movables = map.objects.filter((o) => o.movable).map((o) => o.id).sort();
    assert.deepEqual(movables, [...ids].sort(), mapId);
    for (const id of ids) {
      const obj = map.objects.find((o) => o.id === id);
      assert.ok(obj.name && obj.name.trim(), `${mapId}/${id}: falta name`);
    }
  }
});

// ------------------------------------------- revisión §3: caché y NPC oculto
test('la caché de alcance se invalida al mover/ocultar un mueble', async () => {
  const { tileWalkable, bumpMapVersion } = await import('../src/reach.js');
  const copy = {
    ...attic,
    objects: attic.objects.map((o) => ({ ...o })),
    __reachVersion: 0,
  };
  const crate = copy.objects.find((o) => o.id === 'crate_stairs');
  assert.equal(tileWalkable(copy, crate.x, crate.y), false, 'el cajón bloquea');
  crate.hidden = true;
  bumpMapVersion(copy);
  assert.equal(tileWalkable(copy, crate.x, crate.y), true,
    'oculto (cargado) el casillero vuelve a ser caminable');
});

test('un NPC oculto por la historia no bloquea el piso', () => {
  const map = {
    ...house,
    objects: house.objects.map((o) => ({ ...o })),
    npcs: house.npcs.map((n) => ({ ...n })),
    __reachVersion: 0,
  };
  const elena = map.npcs.find((n) => n.id === 'elena');
  const tx = Math.floor(elena.x / 16);
  const ty = Math.floor((elena.feet - 1) / 16);
  const player = { x: (tx - 1) * 16 + 8, feet: ty * 16 + 12 };
  const base = { map, npcs: map.npcs, warps: map.warps, player, items: [], tx, ty };
  assert.equal(floorTileCheck(base).reason, 'npc');
  elena.hidden = true;
  assert.equal(canDropFloor(base), true);
});

test('revisión §11.1: parado encima de una cosa del piso también se agarra', async () => {
  const { pickTarget } = await import('../src/interaction.js');
  const cand = {
    id: 'floor_x', kind: 'floorItem', type: 'thing', name: 'Mate',
    foot: [{ tx: 5, ty: 5 }],
    access: new Set(['5,5', '5,6', '4,5']),
    cursorBox: { x: 72, y: 78, w: 12, h: 12 },
  };
  const player = { x: 5 * 16 + 8, feet: 5 * 16 + 12, dir: 'down' };
  const hit = pickTarget(player, [cand], { dir: 'down', map: null });
  assert.equal(hit.target?.id, 'floor_x');
});
