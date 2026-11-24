import { makePauseMenu, makeChestPanel } from '../helpers/menu_panels.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorldScene } from '../helpers/world_scene.js';
import { PauseMenu, ChestPanel, hintLayout } from '../../src/menus.js';
import { ChoiceBox } from '../../src/dialog.js';

// --- hint_bar.test.js
{
// T7: la barra de pistas con mouse es una leyenda fija. Sin hover-grace: el
// hover no cambia la barra y solo "Mochila" es clickeable.

function fakeWorld(overrides = {}) {
  return makeWorldScene({
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
}

// --- clickable_hints.test.js
{
const BLANK = ['######'];
const ASSETS = {
  font: { glyphs: { ' ': BLANK } },
  buttonsData: {
    frames: {
      mouse: [0, 0, 11, 13], a: [0, 0, 11, 11], b: [0, 0, 11, 11],
      key_q: [0, 0, 9, 9], key_f: [0, 0, 9, 9], key_i: [0, 0, 9, 9],
      key_esc: [0, 0, 17, 11],
    },
  },
};
const MOUSE = { device: 'mouse', click: { x: 0, y: 0 } };
const NONE = {
  aPressed: false, bPressed: false, startPressed: false,
  menuMove: { x: 0, y: 0 }, device: 'mouse',
};

function fakeGame(point) {
  const states = [];
  return {
    states,
    mouseCursor: { setState: (s) => states.push(s) },
    screenToView: () => ({ ...point }),
    input: { device: 'mouse' },
    showToast: () => {},
    inventory: [],
  };
}

function center(rect) {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

test('pausa: click en el hint "Elegir" activa la seleccion actual', () => {
  const game = fakeGame({ x: 0, y: 0 });
  const menu = makePauseMenu({ assets: ASSETS, game, cursor: { index: 3 } });
  let activated = -1;
  menu.activateSlot = (i) => { activated = i; };
  menu.activateRecipe = () => {};
  menu.activateOption = () => {};
  const hints = hintLayout(ASSETS, 'mouse', menu.hintActions()).items;
  const item = hints.find((h) => h.action === 'interact');
  game.screenToView = () => center(item.rect);
  const consumed = menu.pointerUpdate(null, { ...NONE, click: MOUSE.click });
  assert.equal(consumed, true);
  assert.equal(activated, 3, 'Eligio el slot seleccionado, no un no-op');
  assert.deepEqual(game.states, ['hand']);
});

test('pausa: hint "Cerrar" cierra y "Pestaña" cambia de pestaña', () => {
  const game = fakeGame({ x: 0, y: 0 });
  const menu = makePauseMenu({ assets: ASSETS, game, cursor: { index: 0 } });
  const hints = hintLayout(ASSETS, 'mouse', menu.hintActions()).items;
  const back = hints.find((h) => h.action === 'back');
  game.screenToView = () => center(back.rect);
  assert.equal(menu.pointerUpdate(null, { ...NONE, click: MOUSE.click }), true);
  assert.equal(menu.pending, 'close');

  let tabArg = null;
  menu.pending = null;
  menu.setTab = (n) => { tabArg = n; };
  const prev = hints.find((h) => h.action === 'prev');
  game.screenToView = () => center(prev.rect);
  assert.equal(menu.pointerUpdate(null, { ...NONE, click: MOUSE.click }), true);
  assert.equal(tabArg, -1);
});

test('cofre: click en el hint "Agarrar" agarra el objeto seleccionado', () => {
  const game = fakeGame({ x: 0, y: 0 });
  const panel = makeChestPanel({ assets: ASSETS, game });
  let taken = -1;
  panel.takeIndex = (i) => { taken = i; };
  game.screenToView = () => center(panel.takeRect('mouse'));
  assert.equal(panel.pointerUpdate(null, { ...NONE, click: MOUSE.click }), true);
  assert.equal(taken, 0, 'el prompt no es decorativo');
  assert.deepEqual(game.states, ['hand']);
});

test('eleccion: click en el hint "Elegir" elige la opcion actual', () => {
  const box = new ChoiceBox(ASSETS);
  let picked = null;
  box.show({
    question: '¿Salir?', options: ['No', 'Si'], onPick: (v, i) => { picked = [v, i]; },
  });
  box.index = 1;
  const click = { ...NONE, click: MOUSE.click };
  // Click lejos del prompt y de las opciones: no-op.
  assert.equal(box.update(0.016, click, 'mouse', { x: 2, y: 2 }), null);
  assert.equal(box.open, true);
  const pick = box.pickRect('mouse');
  const result = box.update(0.016, click, 'mouse', center(pick));
  assert.deepEqual(result, { index: 1, value: 'Si' });
  assert.deepEqual(picked, ['Si', 1]);
  assert.equal(box.open, false);
});
}
