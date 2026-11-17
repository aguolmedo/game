// T7: la barra de pistas con mouse es una leyenda fija. Sin hover-grace: el
// hover no cambia la barra y solo "Mochila" es clickeable.
import test from 'node:test';
import assert from 'node:assert/strict';
import { WorldScene } from '../src/scenes/world.js';

function fakeWorld(overrides = {}) {
  return Object.assign(Object.create(WorldScene.prototype), {
    hoverTarget: null,
    hoverNear: false,
    hintRects: [],
    target: null,
    exitWarp: null,
    cam: { x: 0, y: 0 },
    player: { x: 0, feet: 0, dir: 'down', sprite: { setDir() {} } },
    cursor: { hide() {} },
    dialog: { show() {}, hide() {} },
    game: {
      flags: {}, inventory: [], selectedSlot: 0, pavaStation: null,
      input: { device: 'mouse' },
      showToast() {}, emit() {},
    },
    ...overrides,
  });
}

const RADIO = {
  id: 'radio', kind: 'object', label: 'Prender la radio',
  interact: { kind: 'look', talk: 'radio', label: 'Mirar la radio' },
  ref: { id: 'radio', interact: { kind: 'look', talk: 'radio', label: 'Mirar la radio' } },
};

test('mouse: la barra de pistas es fija y no cambia al hacer hover', () => {
  const world = fakeWorld();
  const idle = world.hudParams({ device: 'mouse' }).hintActions;
  world.target = RADIO;
  world.hoverTarget = RADIO;
  world.hoverNear = true;
  const hovered = world.hudParams({ device: 'mouse' }).hintActions;
  assert.deepEqual(hovered, idle);
  assert.deepEqual(idle.map((h) => h.label), ['Usar', 'Click der. Mirar', 'Mochila']);
});

test('mouse: solo Mochila es clickeable (Usar y Mirar son leyenda)', () => {
  const world = fakeWorld();
  const hints = world.hudParams({ device: 'mouse' }).hintActions;
  assert.equal(hints[0].static, true);
  assert.equal(hints[1].static, true);
  assert.ok(!hints[2].static, 'Mochila responde al click');
});

test('teclado: la barra conserva el verbo del objetivo apuntado', () => {
  const world = fakeWorld({
    target: RADIO,
    game: {
      flags: {}, inventory: [], selectedSlot: 0, pavaStation: null,
      input: { device: 'keyboard' },
      showToast() {}, emit() {},
    },
  });
  const hints = world.hudParams({ device: 'keyboard' }).hintActions;
  assert.equal(hints[0].action, 'interact');
  // La barra muestra la etiqueta del resolvedor (el verbo del objeto).
  assert.equal(hints[0].label, 'Mirar la radio');
  assert.equal(hints[0].label, world.actionLabel(RADIO));
  assert.ok(!hints[0].static);
});

test('mundo: un click sobre un objeto no es robado por el warp que se pisa', () => {
  const world = fakeWorld({ hoverTarget: RADIO, hoverNear: true });
  world.exitWarp = { id: 'garage_door' };
  world.target = null;
  let warps = 0;
  world.tryWarp = () => { warps += 1; };
  // Click sobre un objeto: manda el objetivo clickeado.
  world.handleMouseClick();
  assert.equal(warps, 0);
  // Teclado/E sin objetivo: conserva la prioridad del warp que se pisa.
  world.hoverTarget = null;
  world.interact();
  assert.equal(warps, 1);
});
