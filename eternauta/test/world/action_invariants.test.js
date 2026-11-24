// R5/A5: invariantes del resolvedor sobre los mapas REALES, sin Three.js.
//
// Reglas que se verifican (una etiqueta no puede prometer algo que la
// ejecución no hace):
//   1. primary con objetivo nunca es null y siempre trae etiqueta.
//   2. un uso de estación (ITEM_USES con on.station) solo aparece si ESE
//      objetivo declara la estación (atrapa el bug del banco del altillo).
//   3. la estación de calor ocupada se saca con primary, tenga lo que tenga
//      en la mano.
//   4. item (Usar en mí) solo devuelve los SELF_USES; nunca actúa sobre el
//      objetivo y devuelve null si el ítem no tiene uso propio.
//   5. actionLabel() de la escena === resolveAction(..., 'primary').label.
// Y una ejecución por kind sobre un mundo falso.
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAction, resolveHands, stationOf } from '../../src/actions.js';
import { ITEM_USES } from '../../src/data/actions.js';
import { ITEMS, getItem, isGrabbable } from '../../src/items.js';
import { addItem, removeItem, createInventory } from '../../src/inventory.js';
import { itemsForMap } from '../../src/surfaces.js';
import { INITIAL_ITEMS } from '../../src/data/surfaces.js';
import { attic } from '../../src/maps/attic.js';
import { house } from '../../src/maps/house.js';
import { garage } from '../../src/maps/garage.js';
import { street } from '../../src/maps/street.js';
import { makeWorldScene } from '../helpers/world_scene.js';

const MAPS = [attic, house, garage, street];
const HELD = [...Object.keys(ITEMS), null];
const STATES = [null, 'workbench', 'stove'];

/** Candidatos como los arma el juego (mapView.addObject + SurfaceLayer). */
function candidatesOf(map) {
  const list = [];
  for (const obj of map.objects || []) {
    if ((obj.type || obj.interact) && !obj.container) {
      list.push({
        id: obj.id, kind: 'object', label: obj.name,
        type: obj.type, name: obj.name, talk: obj.talk,
        interact: obj.interact, ref: obj,
      });
    }
    if (obj.container) {
      list.push({
        id: obj.id, kind: 'container', priority: 1,
        label: obj.name,
        type: obj.type || 'container', name: obj.name, talk: obj.talk,
        container: obj.container, ref: obj,
      });
    }
  }
  for (const wi of itemsForMap(map.id, INITIAL_ITEMS, map)) {
    const item = getItem(wi.itemId);
    const grabbable = isGrabbable(wi.itemId);
    list.push({
      id: `surface_${wi.uid}`,
      uid: wi.uid,
      kind: 'surfaceItem',
      x: wi.x, y: wi.y, w: 12, h: 12,
      item, worldItem: wi, objectId: wi.objectId, slot: wi.slot, grabbable,
      label: `${grabbable ? 'Agarrar' : 'Mirar'} ${item.name}`,
    });
  }
  for (const npc of map.npcs || []) {
    list.push({
      id: npc.id, kind: 'npc', label: `Hablar con ${npc.name || npc.who || npc.id}`,
      type: 'person', name: npc.name || npc.who || npc.id,
      npc: { id: npc.id, who: npc.who, name: npc.name },
    });
  }
  for (const warp of map.warps || []) {
    list.push({
      id: `warp_${warp.id}`, kind: 'warp', warp,
      label: warp.label,
    });
  }
  return list;
}

/** ctx del resolvedor con un estado de juego dado. */
function ctxOf(map, pavaStation = null) {
  return {
    game: {
      flags: {},
      hasSuit: false,
      hasRifle: false,
      pavaStation,
      inventory: [],
      selectedSlot: 0,
    },
    objects: map.objects || [],
  };
}

function rowOf(id) {
  return ITEM_USES.find((row) => row.id === id);
}

test('invariante 1: primary con objetivo nunca es null y trae etiqueta', () => {
  for (const map of MAPS) {
    const ctx = ctxOf(map);
    for (const target of candidatesOf(map)) {
      for (const held of HELD) {
        const action = resolveAction(ctx, target, held, 'primary');
        const where = `${map.id}/${target.id} con ${held}`;
        assert.ok(action, `${where}: sin acción`);
        assert.equal(typeof action.label, 'string', `${where}: etiqueta no es string`);
        assert.ok(action.label.trim().length > 0, `${where}: etiqueta vacía`);
      }
    }
  }
});

test('invariante 2: un uso de estación solo aparece en la estación que lo declara', () => {
  for (const map of MAPS) {
    for (const state of STATES) {
      const ctx = ctxOf(map, state);
      for (const target of candidatesOf(map)) {
        for (const held of HELD) {
          const action = resolveAction(ctx, target, held, 'primary');
          if (action.kind !== 'use') continue;
          const row = rowOf(action.id);
          if (!row?.on?.station) continue;
          const station = stationOf(target, map.objects);
          assert.ok(station, `${map.id}/${target.id} con ${held}: uso de estación sin estación`);
          assert.equal(station.station, row.on.station,
            `${map.id}/${target.id} con ${held}: estación equivocada`);
        }
      }
    }
  }
});

test('invariante 2b: en el banco del altillo, tijera y tela no son la estación', () => {
  const benchItems = candidatesOf(attic).filter(
    (c) => c.kind === 'surfaceItem' && c.objectId === 'workbench',
  );
  const calentador = benchItems.find((c) => c.worldItem.itemId === 'calentador');
  const tijera = benchItems.find((c) => c.worldItem.itemId === 'tijera');
  const tela = benchItems.find((c) => c.worldItem.itemId === 'tela');
  assert.ok(calentador && tijera && tela, 'faltan los objetos del banco');

  const ctx = ctxOf(attic, null);
  // La pava en la mano sobre el calentador: sí es la estación.
  const onHeater = resolveAction(ctx, calentador, 'pava_fria', 'primary');
  assert.equal(onHeater.kind, 'use');
  assert.equal(onHeater.id, 'heatPava');
  // Sobre la tijera o la tela: nunca "Poner la pava al fuego".
  for (const target of [tijera, tela]) {
    const action = resolveAction(ctx, target, 'pava_fria', 'primary');
    assert.notEqual(action.id, 'heatPava', `${target.label}: no es el fuego`);
    // La Acción nunca agarra: sobre una cosa (tijera o tela) siempre mira.
    assert.equal(action.kind, 'look', 'la Acción no agarra: eso es Manos');
    assert.ok(action.label.startsWith('Mirar '), action.label);
    // Manos sí agarra la tela (es material), no la tijera (decorativa).
    const aim = { target, tile: null, point: null, device: 'mouse' };
    const hands = resolveHands(ctx, aim, null, null);
    if (target.grabbable) {
      assert.equal(hands.kind, 'grab');
      assert.equal(hands.label, 'Agarrar Tela engomada');
    } else {
      assert.equal(hands, null, 'la tijera decorativa no se agarra');
    }
    assert.equal(stationOf(target, attic.objects), null);
  }
});

test('invariante 3: la pava de la estación de calor se agarra con Manos', () => {
  // Objetivos: el mueble de la estación (el banco, la cocina). Un objeto
  // apoyado tiene su propia acción ("Agarrar/Mirar X") antes de la regla de
  // la estación, en el orden fijo del resolvedor.
  const cases = [
    [attic, 'workbench'],
    [house, 'stove'],
  ];
  let seen = 0;
  for (const [map, stationId] of cases) {
    for (const target of candidatesOf(map)) {
      if (target.kind !== 'object') continue;
      const station = stationOf(target, map.objects);
      if (!station || station.station !== 'heat' || station.id !== stationId) continue;
      seen += 1;
      const ctx = ctxOf(map, stationId);
      for (const held of HELD) {
        // La Acción ya no saca la pava; Manos la agarra (con la mano vacía o
        // con lo que sea, igual que antes).
        const hands = resolveHands(
          ctx, { target, tile: null, point: null, device: 'mouse' }, held, null,
        );
        assert.equal(hands.kind, 'takePava', `${map.id}/${target.id} con ${held}: Manos no la agarra`);
        assert.equal(hands.label, 'Agarrar la pava');
        const primary = resolveAction(ctx, target, held, 'primary');
        assert.notEqual(primary.id, 'takePava', 'la Acción no saca la pava');
      }
    }
  }
  assert.ok(seen >= 2, 'se revisaron el banco y la cocina');
});

test('invariante 4: sin objetivo, la Acción es el uso propio (o null)', () => {
  const SELF = new Set([
    'mate_cebado', 'traje', 'rifle', 'mate_vacio', 'mate_yerba',
    'mate_lavado', 'pava_fria', 'pava_caliente', 'pava_hervida', 'yerba',
  ]);
  for (const held of HELD) {
    const action = resolveAction(ctxOf(attic), null, held, 'primary');
    if (!SELF.has(held)) {
      assert.equal(action, null, `item ${held}: no debería tener uso propio`);
      continue;
    }
    assert.ok(action, `item ${held}: sin uso propio`);
    assert.equal(action.kind, 'self');
    assert.ok(typeof action.label === 'string' && action.label.length > 0);
  }
  assert.equal(resolveAction(ctxOf(attic), null, null, 'primary'), null);
  // Con objetivo, la Acción es el verbo del tipo o el uso sobre el objetivo,
  // nunca el uso propio.
  const stove = candidatesOf(house).find((c) => c.id === 'stove');
  const onStove = resolveAction(ctxOf(house), stove, 'mate_cebado', 'primary');
  assert.notEqual(onStove.kind, 'self');
  assert.equal(resolveAction(ctxOf(attic), null, 'balas', 'primary'), null);
  assert.equal(resolveAction(ctxOf(attic), null, 'mate_cebado', 'primary').id, 'mateSelf');
});

/** Fake mínimo de la escena: alcanza para actionLabel/useLabel. */
function fakeLabelScene(map, pavaStation, held) {
  const world = makeWorldScene();
  world.game = {
    flags: {}, hasSuit: false, hasRifle: false, pavaStation,
    inventory: held ? [{ id: held, count: 1 }] : [], selectedSlot: 0,
  };
  world.mapData = { id: map.id, objects: map.objects };
  return world;
}

test('invariante 5: la etiqueta de la escena es la del resolvedor', () => {
  for (const map of MAPS) {
    for (const state of STATES) {
      for (const held of [null, 'pava_fria', 'secador', 'tela', 'mate_cebado']) {
        for (const target of candidatesOf(map)) {
          const world = fakeLabelScene(map, state, held);
          const action = resolveAction(world.ctx(), target, held, 'primary');
          assert.equal(world.actionLabel(target), action.label,
            `${map.id}/${target.id} con ${held}: etiqueta distinta`);
        }
        const world = fakeLabelScene(map, state, held);
        const use = resolveAction(world.ctx(), null, held, 'primary');
        assert.equal(world.useLabel(), (use && use.label) || 'Usar');
      }
    }
  }
});

// ------------------------------------------------------------ ejecución

function fakeSurface() {
  return {
    take(candidate, inventory) {
      const wi = candidate.worldItem || {};
      const result = addItem(inventory, wi.itemId, wi.count || 1);
      if (result.added <= 0) {
        return { inventory, itemId: wi.itemId, count: 0, reason: 'full' };
      }
      return { inventory: result.slots, itemId: wi.itemId, count: result.added };
    },
    dropSelected(inventory, selectedSlot, objectId) {
      const entry = inventory[selectedSlot];
      if (!entry) return null;
      const removed = removeItem(inventory, entry.id, 1);
      if (removed.removed <= 0) return null;
      return { inventory: removed.slots, placed: { itemId: entry.id, objectId } };
    },
    describe: () => 'texto de mirar',
  };
}

/** Inventario real de 18 slots con (a lo sumo) el ítem en la mano. */
function withHeld(held) {
  const slots = createInventory();
  if (held) slots[0] = { id: held, count: 1 };
  return slots;
}

function fakeScene(map, { held = null, pavaStation = null, mate = null, flags = {} } = {}) {
  const events = [];
  const toasts = [];
  const world = makeWorldScene();
  Object.assign(world, {
    name: map.id,
    mapData: { id: map.id, objects: map.objects, lights: map.lights || [] },
    t: 0,
    silbatoAvisado: false,
    nearWarnAt: null,
    target: null,
    hoverTarget: null,
    hoverNear: false,
    surface: fakeSurface(),
    cursor: { hide() {} },
    player: { x: 0, feet: 0, dir: 'down', sprite: { setDir() {} }, setRifle() {} },
  });
  world.game = {
    events,
    toasts,
    flags: { ...flags },
    hasSuit: false,
    hasRifle: false,
    pavaStation,
    pava: { temp: 0, heating: false, station: null },
    mate: mate || { state: 'vacio', cebadas: 0, burnt: false },
    mateShared: {},
    mateCalma: 0,
    inventory: withHeld(held),
    selectedSlot: 0,
    showToast: (text) => toasts.push(text),
    emit: (type, data) => events.push({ type, data }),
    onInventoryChanged() {},
    requestEquip() {},
  };
  return world;
}

function pick(map, predicate) {
  return candidatesOf(map).find(predicate);
}

function run(world, target, held, mode = 'primary') {
  const action = resolveAction(world.ctx(), target, held, mode);
  world.runAction(action, target);
  return action;
}

/** Ejecuta una acción de Manos (sin mouse): agarra o deja. */
function runHands(world, target, held, carry = null) {
  const aim = { target, tile: null, point: null, device: 'mouse' };
  const action = resolveHands(world.ctx(), aim, held, carry);
  world.runHands(action, { device: 'mouse' });
  return action;
}

test('ejecución Manos: el objeto apoyado pasa al inventario', () => {
  const target = pick(attic, (c) => c.kind === 'surfaceItem' && c.worldItem.itemId === 'tela');
  const world = fakeScene(attic);
  const action = runHands(world, target, null);
  assert.equal(action.kind, 'grab');
  assert.deepEqual(world.game.inventory.filter(Boolean).map((s) => s.id), ['tela']);
  assert.ok(world.game.events.some((e) => e.type === 'itemPicked' && e.data.id === 'tela'));
});

test('ejecución Manos: el ítem de la mano queda en el mueble', () => {
  const target = pick(attic, (c) => c.kind === 'object' && c.id === 'workbench');
  const world = fakeScene(attic, { held: 'tela' });
  const action = runHands(world, target, 'tela');
  assert.equal(action.kind, 'drop');
  assert.equal(action.label, 'Dejar Tela engomada');
  assert.equal(world.game.inventory.filter(Boolean).length, 0);
  assert.ok(world.game.events.some(
    (e) => e.type === 'itemUsed' && e.data.action === 'drop' && e.data.id === 'tela',
  ));
});

test('ejecución use heatPava: la pava queda al fuego en el banco', () => {
  const target = pick(attic, (c) => c.kind === 'surfaceItem' && c.worldItem.itemId === 'calentador');
  const world = fakeScene(attic, { held: 'pava_fria' });
  const action = run(world, target, 'pava_fria', 'primary');
  assert.equal(action.kind, 'use');
  assert.equal(action.id, 'heatPava');
  assert.equal(world.game.pavaStation, 'workbench');
  assert.equal(world.game.pava.heating, true);
  assert.equal(world.game.inventory.filter(Boolean).length, 0, 'la pava salió de la mano');
});

test('ejecución use installExtractor: queda instalado el secador', () => {
  const target = pick(garage, (c) => c.kind === 'object' && c.id === 'extractor');
  const world = fakeScene(garage, { held: 'secador' });
  const action = run(world, target, 'secador', 'primary');
  assert.equal(action.kind, 'use');
  assert.equal(action.id, 'installExtractor');
  assert.equal(world.game.flags.extractor_ok, true);
  assert.equal(world.game.inventory.filter(Boolean).length, 0);
});

test('ejecución self mateSelf: tomar mate emite itemUsed sip', () => {
  const world = fakeScene(attic, {
    held: 'mate_cebado',
    mate: { state: 'cebado', cebadas: 0, burnt: false },
  });
  const action = run(world, null, 'mate_cebado', 'primary');
  assert.equal(action.kind, 'self');
  assert.equal(action.id, 'mateSelf');
  assert.equal(action.label, 'Tomar mate');
  const sip = world.game.events.find((e) => e.type === 'itemUsed' && e.data.action === 'sip');
  assert.ok(sip, 'falta el itemUsed de sorber');
  assert.equal(world.game.inventory.filter(Boolean)[0].id, 'mate_yerba');
});
