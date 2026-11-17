// T6: click derecho = Mirar. No exige alcance, no mueve al jugador y sobre
// nada no hace nada.
import test from 'node:test';
import assert from 'node:assert/strict';
import { WorldScene } from '../src/scenes/world.js';

function fakeWorld(target, overrides = {}) {
  const toasts = [];
  const dirs = [];
  return Object.assign(Object.create(WorldScene.prototype), {
    hoverTarget: target,
    hoverNear: false,
    player: {
      x: 0, feet: 0, dir: 'down',
      sprite: { setDir: (d) => dirs.push(d) },
    },
    toasts,
    dirs,
    game: {
      flags: {},
      inventory: [],
      selectedSlot: 0,
      showToast: (text) => toasts.push(text),
      emit() {},
    },
    surface: { describe: () => 'Un cenicero con ceniza.' },
    ...overrides,
  });
}

test('click derecho sobre un objeto lejano: mira y avisa qué es', () => {
  const target = {
    id: 'radio', kind: 'object',
    cursorBox: { x: 100, y: 0, w: 32, h: 24 },
    interact: { kind: 'look', talk: 'radio', label: 'Prender la radio' },
    ref: { id: 'radio', interact: { kind: 'look', talk: 'radio', label: 'Prender la radio' } },
  };
  const world = fakeWorld(target);
  world.handleRightClick();
  assert.equal(world.toasts.length, 1, 'muestra el texto de mirar');
  assert.ok(world.toasts[0].trim().length > 0);
  assert.equal(world.dirs.length, 1, 'Juan mira hacia el objeto');
});

test('click derecho sobre nada: no-op', () => {
  const world = fakeWorld(null);
  world.handleRightClick();
  assert.equal(world.toasts.length, 0);
  assert.equal(world.dirs.length, 0);
});
