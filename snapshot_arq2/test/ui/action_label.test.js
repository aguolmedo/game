// T4: una sola etiqueta de acción. actionLabel nunca queda vacía y, con
// mouse, el objeto lejano muestra la MISMA etiqueta más tenue (sin "Acercate").
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorldScene, WorldScene } from '../helpers/world_scene.js';
import { attic } from '../../src/maps/attic.js';
import { house } from '../../src/maps/house.js';
import { garage } from '../../src/maps/garage.js';
import { street } from '../../src/maps/street.js';

const MAPS = [attic, house, garage, street];

function fakeGame(overrides = {}) {
  return {
    flags: {},
    hasSuit: false,
    inventory: [],
    selectedSlot: 0,
    pavaStation: null,
    ...overrides,
  };
}

function fakeWorld(overrides = {}) {
  return makeWorldScene({
    game: fakeGame(),
    cam: { x: 0, y: 0 },
    target: null,
    hoverTarget: null,
    hoverNear: false,
    exitWarp: null,

    ...overrides,
  });
}

/** Candidatos de cada mapa, con la misma forma que arma WorldScene. */
function candidatesOf(map) {
  const list = [];
  for (const obj of map.objects) {
    if ((obj.type || obj.interact) && !obj.container) {
      list.push({
        id: obj.id, kind: 'object', label: obj.name,
        type: obj.type, name: obj.name, talk: obj.talk,
        interact: obj.interact, ref: obj,
      });
    }
    if (obj.container) {
      list.push({
        id: obj.id, kind: 'container', label: obj.name,
        type: obj.type || 'container', name: obj.name, talk: obj.talk,
        container: obj.container, ref: obj,
      });
    }
  }
  for (const npc of map.npcs || []) {
    list.push({ id: npc.id, kind: 'npc', label: `Hablar con ${npc.name || npc.id}`,
      type: 'person', name: npc.name || npc.id, npc });
  }
  for (const warp of map.warps || []) {
    list.push({ id: `warp_${warp.id}`, kind: 'warp', label: warp.label, warp });
  }
  return list;
}

test('actionLabel: cada candidato de cada mapa devuelve un texto no vacío', () => {
  for (const map of MAPS) {
    const world = fakeWorld();
    for (const target of candidatesOf(map)) {
      const label = world.actionLabel(target);
      assert.equal(typeof label, 'string', `${map.id}/${target.id} sin etiqueta`);
      assert.ok(label.trim().length > 0, `${map.id}/${target.id} etiqueta vacía`);
    }
  }
});

test('actionLabel: sin caso específico arma "Verbo + nombre"', () => {
  const world = fakeWorld();
  assert.equal(world.actionLabel({ id: 'radio', kind: 'object', ref: {} }), 'Mirar radio');
  assert.equal(
    world.actionLabel({ id: 'x', kind: 'object', name: 'Mesa', ref: {} }),
    'Mirar Mesa',
  );
});

test('prompt con mouse: lejos mantiene la etiqueta y solo baja el color/alpha', () => {
  const target = {
    id: 'radio', kind: 'object', label: 'Prender la radio',
    cursorBox: { x: 10, y: 20, w: 32, h: 24 },
    interact: { kind: 'look', label: 'Prender la radio' },
    ref: { id: 'radio', interact: { kind: 'look', label: 'Prender la radio' } },
  };
  const world = fakeWorld({
    target,
    hoverTarget: target,
    hoverNear: false,
    useLabel: () => 'Usar',
    verbFor: () => 'Mirar',
  });
  const prompt = world.hudParams().prompt;
  assert.equal(prompt.label, world.actionLabel(target));
  assert.notEqual(prompt.label, 'Acercate');
  assert.equal(prompt.color, '#ffb07a');
  assert.equal(prompt.alpha, 0.75);

  // Cerca: mismo texto, color pleno.
  world.hoverNear = true;
  const near = world.hudParams().prompt;
  assert.equal(near.label, prompt.label);
  assert.equal(near.color, '#fff0c0');
  assert.equal(near.alpha, 1);
});
