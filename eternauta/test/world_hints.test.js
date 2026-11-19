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
    // Los clicks de este test solo verifican qué acción se elige.
    runAction() {},
    game: {
      flags: {}, inventory: [], selectedSlot: 0, pavaStation: null,
      input: { device: 'mouse' },
      showToast() {}, emit() {},
    },
    ...overrides,
  });
}

const RADIO = {
  id: 'radio', kind: 'object', type: 'device', name: 'la radio', talk: 'radio',
  ref: {
    id: 'radio', type: 'device', name: 'la radio', talk: 'radio',
    device: {
      toggle: 'radio_on', action: 'toggle',
      state: (g) => (g.flags?.radio_on ? 'on' : 'off'),
      states: { off: { verb: 'Prender' }, on: { verb: 'Apagar' } },
    },
  },
};

test('mouse: sin objetivo no hay Acción; sobre un objeto, sí', () => {
  const world = fakeWorld();
  const idle = world.hudParams({ device: 'mouse' }).hintActions;
  // Sin objetivo y sin uso propio no hay Acción (§2): solo Mochila.
  assert.deepEqual(idle.map((h) => h.label), ['Mochila']);
  assert.deepEqual(idle.map((h) => h.action), ['bag']);

  world.target = RADIO;
  world.hoverTarget = RADIO;
  world.hoverNear = true;
  const hovered = world.hudParams({ device: 'mouse' }).hintActions;
  // Hacer (con el texto real) y Mochila: no hay entrada Mirar aparte.
  assert.deepEqual(hovered.map((h) => h.action), ['interact', 'bag']);
  assert.equal(hovered[0].label, 'Prender la radio', 'usa el texto real de la acción');
});

test('mouse sobre Juan: la Acción es el uso propio; todo leyenda salvo Mochila', () => {
  const inv = Array.from({ length: 18 }, () => null);
  inv[0] = { id: 'mate_cebado', count: 1 };
  const world = fakeWorld({
    selfHover: true,
    game: {
      flags: {}, inventory: inv, selectedSlot: 0,
      pavaStation: null, input: { device: 'mouse' }, showToast() {}, emit() {},
    },
  });
  const hints = world.hudParams({ device: 'mouse' }).hintActions;
  const action = hints.find((h) => h.action === 'interact');
  assert.ok(action, 'con mate cebado y el puntero sobre Juan aparece la Acción');
  assert.equal(action.label, 'Tomar mate');
  assert.equal(action.static, true);
  const bag = hints.find((h) => h.action === 'bag');
  assert.ok(!bag.static, 'Mochila responde al click');
  assert.equal(hints.find((h) => h.action === 'self'), undefined,
    'ya no existe la entrada "Usar en mí"');
});

test('mouse: la barra conserva el verbo real del objetivo apuntado', () => {
  const world = fakeWorld({
    target: RADIO,
    game: {
      flags: {}, inventory: [], selectedSlot: 0, pavaStation: null,
      input: { device: 'mouse' },
      showToast() {}, emit() {},
    },
  });
  const hints = world.hudParams({ device: 'mouse' }).hintActions;
  assert.deepEqual(hints.map((h) => h.action), ['interact', 'bag']);
  // La barra muestra la etiqueta del resolvedor (el verbo del objeto).
  assert.equal(hints[0].label, 'Prender la radio');
  assert.equal(hints[0].label, world.actionLabel(RADIO));
  assert.equal(hints[hints.length - 1].action, 'bag');
  assert.equal(hints[0].static, true, 'Hacer es leyenda, no clickeable');
  assert.equal(hints.find((h) => h.action === 'look'), undefined,
    'nunca una entrada Mirar aparte');
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
