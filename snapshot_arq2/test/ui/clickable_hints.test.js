import test from 'node:test';
import assert from 'node:assert/strict';
import { PauseMenu, ChestPanel, hintLayout } from '../../src/menus.js';
import { ChoiceBox } from '../../src/dialog.js';

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
  const menu = Object.create(PauseMenu.prototype);
  Object.assign(menu, { assets: ASSETS, game, tab: 0, cursor: { index: 3 }, pending: null });
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
  const menu = Object.create(PauseMenu.prototype);
  Object.assign(menu, { assets: ASSETS, game, tab: 0, cursor: { index: 0 }, pending: null });
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
  const panel = Object.create(ChestPanel.prototype);
  Object.assign(panel, {
    assets: ASSETS,
    game,
    index: 0,
    container: { name: 'Cajón', items: [{ id: 'tiras', n: 3 }] },
  });
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
