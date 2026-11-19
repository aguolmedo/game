// Tipos de objeto (DIRECCION.md, "Tipos de objeto"): ocho tipos, textos
// generados, Mirar unificado, barra sin repetidos y Mochila clickeable.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { attic } from '../src/maps/attic.js';
import { house } from '../src/maps/house.js';
import { garage } from '../src/maps/garage.js';
import { street } from '../src/maps/street.js';
import { isValidType, OBJECT_TYPES } from '../src/data/types.js';
import {
  resolveAction, resolveHands, typeOf, nameOf, verbFor,
} from '../src/actions.js';
import { glyphName } from '../src/glyphs.js';
import { WorldScene } from '../src/scenes/world.js';
import { itemsForMap } from '../src/surfaces.js';
import { INITIAL_ITEMS } from '../src/data/surfaces.js';
import { getItem, isGrabbable } from '../src/items.js';

const MAPS = [attic, house, garage, street];
const HELD = [null, 'tela', 'pava_fria', 'mate_cebado', 'secador', 'nafta',
  'mate_lavado', 'tiras', 'rifle', 'balas'];

/** Candidato de un objeto del mapa, con la forma que arma mapView. */
function objectCandidate(obj) {
  const w = (obj.tw || 1) * 16;
  const h = (obj.th || 1) * 16;
  const container = Boolean(obj.container);
  return {
    id: obj.id,
    kind: container ? 'container' : 'object',
    type: obj.type || (container ? 'container' : 'decor'),
    name: obj.name,
    talk: obj.talk,
    priority: container ? 1 : 2,
    x: (obj.x + (obj.tw || 1) / 2) * 16,
    y: (obj.y + (obj.th || 1)) * 16,
    w,
    h,
    cursorBox: { x: obj.x * 16, y: obj.y * 16, w, h },
    ref: obj,
    container: obj.container,
  };
}

function surfaceCandidates(map) {
  return itemsForMap(map.id, INITIAL_ITEMS, map).map((wi) => {
    const item = getItem(wi.itemId);
    return {
      id: `surface_${wi.uid}`,
      kind: 'surfaceItem',
      type: 'thing',
      name: item.name,
      x: wi.x, y: wi.y, w: 12, h: 12,
      cursorBox: { x: wi.x - 6, y: wi.y - 12, w: 12, h: 12 },
      item, worldItem: wi, objectId: wi.objectId, slot: wi.slot,
      grabbable: isGrabbable(wi.itemId),
    };
  });
}

function npcCandidates(map) {
  return (map.npcs || []).map((npc) => ({
    id: npc.id,
    kind: 'npc',
    type: 'person',
    name: npc.name || npc.id,
    x: npc.x, y: npc.feet + 26, w: 20, h: 52,
    cursorBox: { x: npc.x - 8, y: npc.feet - 32, w: 16, h: 32 },
    npc,
  }));
}

function warpCandidates(map) {
  return (map.warps || []).map((warp) => ({
    id: `warp_${warp.id}`,
    kind: 'warp',
    type: 'passage',
    name: warp.label,
    x: warp.x + warp.w / 2, y: warp.y + warp.h, w: warp.w, h: warp.h,
    cursorBox: { x: warp.x, y: warp.y, w: warp.w, h: warp.h },
    warp,
  }));
}

function candidatesOf(map) {
  return [
    ...map.objects.filter((o) => o.type || o.container).map(objectCandidate),
    ...surfaceCandidates(map),
    ...npcCandidates(map),
    ...warpCandidates(map),
  ];
}

function ctxOf(map, { flags = {}, pavaStation = null, held = null } = {}) {
  return {
    game: {
      flags,
      hasSuit: false,
      hasRifle: false,
      pavaStation,
      inventory: held ? [{ id: held, count: 1 }] : [],
      selectedSlot: 0,
    },
    objects: map.objects || [],
  };
}

function pick(map, id) {
  const c = candidatesOf(map).find((x) => x.id === id);
  assert.ok(c, `falta el candidato ${id}`);
  return c;
}

/** Escena mínima para leer la barra real (hudParams). */
function fakeBarScene(map, target, ctx) {
  return Object.assign(Object.create(WorldScene.prototype), {
    target,
    hoverTarget: null,
    hoverNear: true,
    hintRects: [],
    exitWarp: null,
    cam: { x: 0, y: 0 },
    player: { x: 0, feet: 0, dir: 'down', sprite: { setDir() {} } },
    mapData: map,
    game: { ...ctx.game, input: { device: 'keyboard' } },
    labelObstacles() { return []; },
    worldToView() { return { x: 0, y: 0 }; },
    useLabel() { return 'Usar'; },
    verbFor() { return 'Mirar'; },
  });
}

function barOf(map, target, ctx = ctxOf(map)) {
  const world = fakeBarScene(map, target, ctx);
  return world.hudParams({ device: 'keyboard' }).hintActions;
}

test('tipos: todos los interactivos de los cuatro mapas tienen type válido y name', () => {
  for (const map of MAPS) {
    for (const obj of map.objects || []) {
      if (!obj.type && !obj.container) continue;
      assert.ok(isValidType(obj.type), `${map.id}/${obj.id}: type "${obj.type}" inválido`);
      assert.ok(OBJECT_TYPES.includes(obj.type), `${map.id}/${obj.id}: type fuera de la tabla`);
      assert.equal(typeof obj.name, 'string', `${map.id}/${obj.id}: falta name`);
      assert.ok(obj.name.trim().length > 0, `${map.id}/${obj.id}: name vacío`);
    }
    for (const npc of map.npcs || []) {
      assert.equal(npc.type, 'person', `${map.id}/${npc.id}: falta type person`);
      assert.equal(typeOf(npcCandidates(map).find((c) => c.id === npc.id)), 'person');
      assert.ok(npc.name && npc.name.trim(), `${map.id}/${npc.id}: falta name`);
    }
    for (const warp of map.warps || []) {
      assert.equal(warp.type, 'passage', `${map.id}/${warp.id}: falta type passage`);
      assert.ok(warp.name && warp.name.trim(), `${map.id}/${warp.id}: falta name`);
      const cand = warpCandidates(map).find((c) => c.warp === warp);
      assert.equal(typeOf(cand), 'passage', `${map.id}/${warp.id}: no es paso`);
      assert.ok(nameOf(cand).trim().length > 0, `${map.id}/${warp.id}: sin texto`);
    }
  }
});

test('tipos: verbFor fija el verbo base y el estado de los aparatos', () => {
  assert.equal(verbFor('decor'), 'Mirar');
  assert.equal(verbFor('thing'), 'Agarrar');
  assert.equal(verbFor('surface'), 'Mirar');
  assert.equal(verbFor('container'), 'Abrir');
  assert.equal(verbFor('person'), 'Hablar');
  assert.equal(verbFor('view'), 'Asomarse');
  assert.equal(verbFor('seat'), 'Sentarse');
  assert.equal(verbFor('device', { verb: 'Prender' }), 'Prender');
});

test('barra: ningún objeto repite texto y nunca hay una entrada Mirar aparte', () => {
  for (const map of MAPS) {
    for (const target of candidatesOf(map)) {
      for (const held of HELD) {
        const ctx = ctxOf(map, { held });
        const primary = resolveAction(ctx, target, held);
        const hints = barOf(map, target, ctx);
        const labels = hints.map((h) => h.label);
        assert.equal(new Set(labels).size, labels.length,
          `${map.id}/${target.id} con ${held}: barra repetida ${labels.join(' · ')}`);
        assert.equal(hints.find((h) => h.action === 'look'), undefined,
          `${map.id}/${target.id} con ${held}: Mirar como entrada aparte`);
        // Cuando Hacer mira, el texto de Hacer ya lo dice.
        assert.equal(primary.label.startsWith('Mirar'), primary.kind === 'look',
          `${map.id}/${target.id} con ${held}: "${primary.label}" (${primary.kind})`);
      }
    }
  }
});

test('caso: parlante = [E] Mirar el parlante y sin entrada Mirar aparte', () => {
  const speaker = pick(attic, 'speaker');
  const action = resolveAction(ctxOf(attic), speaker, null);
  assert.equal(action.kind, 'look');
  assert.equal(action.label, 'Mirar el parlante');
  assert.deepEqual(barOf(attic, speaker).map((h) => h.label),
    ['Mirar el parlante', 'Mochila']);
});

test('caso: radio = Prender/Apagar la radio, sin entrada Mirar', () => {
  const radio = pick(attic, 'radio');
  const off = resolveAction(ctxOf(attic), radio, null);
  assert.equal(off.label, 'Prender la radio');
  assert.equal(off.kind, 'toggle');
  const on = resolveAction(ctxOf(attic, { flags: { radio_on: true } }), radio, null);
  assert.equal(on.label, 'Apagar la radio');
  assert.equal(on.kind, 'toggle');
  const hints = barOf(attic, radio).map((h) => h.label);
  assert.deepEqual(hints, ['Prender la radio', 'Mochila']);
});

test('caso: ventana del living = Asomarse a la ventana, sin entrada Mirar', () => {
  const win = pick(house, 'window_living');
  const action = resolveAction(ctxOf(house), win, null);
  assert.equal(action.kind, 'view');
  assert.equal(action.label, 'Asomarse a la ventana');
  assert.deepEqual(barOf(house, win).map((h) => h.label),
    ['Asomarse a la ventana', 'Mochila']);
});

test('caso: ventana abrible = Cerrar/Abrir según el estado', () => {
  const win = pick(house, 'window_martita');
  const open = resolveAction(ctxOf(house), win, null);
  assert.equal(open.label, 'Cerrar la ventana');
  assert.equal(open.payload.to, 'closed');
  const closed = resolveAction(ctxOf(house, { flags: { closed_window_martita: true } }),
    win, null);
  assert.equal(closed.label, 'Abrir la ventana');
  assert.equal(closed.payload.to, 'open');

  const door = pick(house, 'garage_door');
  assert.equal(resolveAction(ctxOf(house), door, null).label,
    'Cerrar la puerta del garaje');
});

test('caso: caja de municiones = Abrir la caja de municiones', () => {
  const box = pick(street, 'caja_municiones');
  const action = resolveAction(ctxOf(street), box, null);
  assert.equal(action.kind, 'ammo');
  assert.equal(action.label, 'Abrir la caja de municiones');
});

test('caso: pava en la cocina = Manos Agarrar / Acción Poner al fuego', () => {
  const stove = pick(house, 'stove');
  const ctx = ctxOf(house, { pavaStation: 'stove' });
  // La Acción ya no saca la pava: Manos la agarra (§9).
  const taken = resolveHands(
    ctx, { target: stove, tile: null, point: null, device: 'mouse' }, null, null,
  );
  assert.equal(taken.kind, 'takePava');
  assert.equal(taken.label, 'Agarrar la pava');
  const primary = resolveAction(ctx, stove, null);
  assert.equal(primary.kind, 'look');
  assert.equal(primary.label, 'Mirar la cocina');
  const put = resolveAction(ctxOf(house, { held: 'pava_fria' }), stove, 'pava_fria');
  assert.equal(put.kind, 'use');
  assert.equal(put.id, 'heatPava');
  assert.equal(put.label, 'Poner la pava al fuego');
});

test('caso: Favalli con mate cebado = Convidar mate', () => {
  const favalli = pick(attic, 'favalli');
  const action = resolveAction(ctxOf(attic, { held: 'mate_cebado' }), favalli, 'mate_cebado');
  assert.equal(action.kind, 'use');
  assert.equal(action.id, 'shareMate');
  assert.equal(action.label, 'Convidar mate');
  assert.equal(resolveAction(ctxOf(attic), favalli, null).label, 'Hablar con Favalli');
});

test('caso: mesa con un ítem en la mano = la Acción mira y Manos deja', () => {
  const table = pick(attic, 'table');
  const ctx = ctxOf(attic, { held: 'tela' });
  const primary = resolveAction(ctx, table, 'tela');
  assert.equal(primary.kind, 'look', 'la Acción nunca deja');
  assert.equal(primary.label, 'Mirar la mesa');
  const hands = resolveHands(
    ctx, { target: table, tile: null, point: null, device: 'mouse' }, 'tela', null,
  );
  assert.equal(hands.kind, 'drop');
  assert.equal(hands.label, 'Dejar Tela engomada');
  assert.deepEqual(barOf(attic, table, ctx).map((h) => h.label),
    ['Mirar la mesa', 'Dejar Tela engomada', 'Mochila']);
});

test('mochila: glifo key_i con mouse y teclado, y con pad; entrada clickeable', () => {
  assert.equal(glyphName('mouse', 'bag'), 'key_i');
  assert.equal(glyphName('mouse', 'bag'), 'key_i');
  assert.equal(glyphName('pad', 'bag'), 'y');
  const hints = barOf(attic, pick(attic, 'speaker'));
  const bag = hints.find((h) => h.action === 'bag');
  assert.ok(bag, 'falta Mochila en la barra');
  assert.ok(!bag.static, 'Mochila tiene que ser clickeable');
  assert.ok(hints.filter((h) => h.action !== 'bag').every((h) => h.static !== false),
    'solo Mochila es clickeable');
});

test('cuadradito: dorado si hay acción propia, tenue en el decorado', () => {
  const seen = [];
  const world = Object.assign(Object.create(WorldScene.prototype), {
    t: 0,
    game: { flags: {}, inventory: [], selectedSlot: 0, pavaStation: null },
    mapData: attic,
    player: { x: 0, feet: 0, dir: 'down' },
    cursor: {
      showAt(box, t, opts) { seen.push(opts.mode); },
      setPosition() {},
    },
  });
  world.setHover(pick(attic, 'speaker'), true);
  world.setHover(pick(attic, 'radio'), true);
  world.setHover(pick(attic, 'table'), true);
  assert.deepEqual(seen, ['faint', 'near', 'faint']);
});

test('textos generados: todos los caracteres existen en la fuente', () => {
  const font = JSON.parse(fs.readFileSync(
    new URL('../public/assets/font.json', import.meta.url), 'utf8'));
  const glyphs = font.glyphs;
  const missing = [];
  for (const map of MAPS) {
    for (const target of candidatesOf(map)) {
      for (const held of HELD) {
        const action = resolveAction(ctxOf(map, { held }), target, held);
        if (!action || typeof action.label !== 'string') continue;
        for (const ch of action.label) {
          if (!glyphs[ch]) missing.push(`"${ch}" en "${action.label}"`);
        }
      }
    }
  }
  assert.deepEqual([...new Set(missing)], []);
});
