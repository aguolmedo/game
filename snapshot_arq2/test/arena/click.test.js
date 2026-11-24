import test from 'node:test';
import assert from 'node:assert/strict';
import { makeArenaScene } from '../helpers/arena_scene.js';
import { resultOptionRects } from '../../src/arena/resultScreen.js';
import { createResultNav } from '../../src/arena/results.js';

const BLANK = ['######'];
const ASSETS = {
  font: { glyphs: { ' ': BLANK, a: BLANK } },
  buttonsData: { frames: { mouse: [0, 0, 11, 13] } },
};

function makeArena() {
  const calls = { restart: 0, scene: [] };
  const cursorStates = [];
  const arena = makeArenaScene();
  Object.assign(arena, {
    assets: ASSETS,
    resultT: 1,
    resultOpen: true,
    resultSel: 0,
    nav: createResultNav(),
    controls: { confirm: false },
    game: {
      screenToView: (x, y) => ({ x, y }),
      mouseCursor: { setState: (s) => cursorStates.push(s) },
      changeScene: (name) => calls.scene.push(name),
    },
  });
  arena.restart = () => { calls.restart += 1; arena.resultOpen = false; };
  return { arena, calls, cursorStates };
}

function clickInput(point) {
  return {
    device: 'mouse',
    pointer: point,
    click: point,
    menuMove: { x: 0, y: 0 },
    bPressed: false,
    startPressed: false,
  };
}

test('resultado de arena: click en zona vacia no reinicia ni vuelve al titulo', () => {
  const { arena, calls } = makeArena();
  arena.updateResult(clickInput({ x: 8, y: 8 }), 0.016);
  assert.equal(calls.restart, 0);
  assert.deepEqual(calls.scene, []);
  assert.equal(arena.resultOpen, true, 'sigue en el resultado');
});

test('resultado de arena: click en "Otra vez" reinicia al instante', () => {
  const { arena, calls } = makeArena();
  const retry = resultOptionRects(ASSETS)[0];
  // Click en el primer cuadro visible: no se pierde.
  arena.resultT = 0;
  arena.updateResult(clickInput({ x: retry.x + retry.w / 2, y: retry.y + retry.h / 2 }), 0.016);
  assert.equal(calls.restart, 1);
  assert.deepEqual(calls.scene, []);
});

test('resultado de arena: click en "Volver al titulo" va al titulo', () => {
  const { arena, calls } = makeArena();
  const title = resultOptionRects(ASSETS)[1];
  arena.updateResult(clickInput({ x: title.x + title.w / 2, y: title.y + title.h / 2 }), 0.016);
  assert.equal(calls.restart, 0);
  assert.deepEqual(calls.scene, ['title']);
});

test('resultado de arena: A/Enter sigue confirmando (con el gate de entrada)', () => {
  const { arena, calls } = makeArena();
  arena.resultT = 0.1;
  arena.controls.confirm = true;
  arena.updateResult(clickInput(null), 0.016);
  assert.equal(calls.restart, 0, 'no se dispara durante el fundido');
  arena.resultT = 0.3;
  arena.updateResult(clickInput(null), 0.016);
  assert.equal(calls.restart, 1);
});

test('viñeta de arena: un click temprano queda en buffer y no se pierde', () => {
  const arena = makeArenaScene();
  Object.assign(arena, {
    deathT: 0, advanceBuffer: 0, controls: { advance: false },
    updateFx: () => {},
  });
  let opened = 0;
  arena.openResult = () => { opened += 1; };
  // Click a los 0.42 s: la viñeta todavia se esta entintando.
  arena.deathT = 0.40;
  arena.controls.advance = true;
  arena.updateVignette({}, 0.02);
  assert.equal(opened, 0);
  assert.ok(arena.advanceBuffer > 0);
  // Se suelta el boton; el click guardado abre el resultado al llegar a 0.45.
  arena.controls.advance = false;
  arena.updateVignette({}, 0.02);
  assert.equal(opened, 0);
  arena.updateVignette({}, 0.03);
  assert.equal(opened, 1);
  assert.equal(arena.advanceBuffer, 0);
});

test('viñeta de arena: sin buffer, A/click abre recien despues de 0.45', () => {
  const arena = makeArenaScene();
  Object.assign(arena, {
    deathT: 0, advanceBuffer: 0, controls: { advance: false },
    updateFx: () => {},
  });
  let opened = 0;
  arena.openResult = () => { opened += 1; };
  arena.deathT = 0.44;
  arena.updateVignette({}, 0.02);
  assert.equal(opened, 0);
  arena.deathT = 0.46;
  arena.controls.advance = true;
  arena.updateVignette({}, 0.02);
  assert.equal(opened, 1);
});

test('resultado de arena: hover pone manito en opciones y flecha afuera', () => {
  const { arena, cursorStates } = makeArena();
  const title = resultOptionRects(ASSETS)[1];
  arena.updateResult(clickInput(null), 0.016); // sin click, puntero afuera
  assert.equal(cursorStates.at(-1), 'arrow');
  const input = clickInput(null);
  input.pointer = { x: title.x + title.w / 2, y: title.y + title.h / 2 };
  arena.updateResult(input, 0.016);
  assert.equal(cursorStates.at(-1), 'hand');
  assert.equal(arena.resultSel, 1);
});
