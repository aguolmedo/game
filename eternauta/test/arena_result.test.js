import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RESULT_OPTIONS, createResultNav, stepResultNav, resultAction, isNewBest, bestLine,
} from '../src/arena/results.js';

const IDLE = { x: 0, y: 0 };
const DOWN = { x: 0, y: 1 };
const UP = { x: 0, y: -1 };
const RIGHT = { x: 1, y: 0 };
const LEFT = { x: -1, y: 0 };

test('resultado: abre sin armar, con retry seleccionado', () => {
  const nav = createResultNav();
  assert.deepEqual(nav, { sel: 0, armed: false, axis: null });
  assert.equal(resultAction(nav.sel), 'retry');
});

test('resultado: dirección apretada al abrir no mueve hasta soltar', () => {
  let nav = createResultNav();
  for (let i = 0; i < 20; i++) {
    const next = stepResultNav(nav, DOWN);
    assert.equal(next.sel, 0);
    assert.equal(next.moved, false);
    assert.equal(next.armed, false);
    nav = next;
  }
  // Recién al pasar por neutro se arma...
  nav = stepResultNav(nav, IDLE);
  assert.equal(nav.armed, true);
  assert.equal(nav.axis, null);
  assert.equal(nav.sel, 0);
  // ...y el mismo down ahora sí es un flanco nuevo.
  nav = stepResultNav(nav, DOWN);
  assert.equal(nav.sel, 1);
  assert.equal(nav.moved, true);
  assert.equal(nav.axis, 'y1');
});

test('resultado: down/right avanza, up/left retrocede y da la vuelta', () => {
  let nav = createResultNav();
  nav = stepResultNav(nav, IDLE);
  nav = stepResultNav(nav, DOWN);
  assert.equal(nav.sel, 1);
  assert.equal(resultAction(nav.sel), 'title');
  nav = stepResultNav(nav, IDLE);
  nav = stepResultNav(nav, DOWN); // wrap 1 -> 0
  assert.equal(nav.sel, 0);
  assert.equal(nav.moved, true);
  nav = stepResultNav(nav, IDLE);
  nav = stepResultNav(nav, UP); // wrap 0 -> 1
  assert.equal(nav.sel, 1);
  assert.equal(nav.moved, true);

  // Horizontal: mismo comportamiento.
  let horizontal = stepResultNav(createResultNav(), IDLE);
  horizontal = stepResultNav(horizontal, RIGHT);
  assert.equal(horizontal.sel, 1);
  assert.equal(horizontal.axis, 'x1');
  horizontal = stepResultNav(horizontal, IDLE);
  horizontal = stepResultNav(horizontal, LEFT);
  assert.equal(horizontal.sel, 0);
  assert.equal(horizontal.axis, 'x-1');
});

test('resultado: una dirección sostenida no repite (sólo flancos)', () => {
  let nav = stepResultNav(createResultNav(), IDLE);
  nav = stepResultNav(nav, DOWN);
  assert.equal(nav.sel, 1);
  for (let i = 0; i < 60; i++) {
    const next = stepResultNav(nav, DOWN);
    assert.equal(next.moved, false);
    assert.equal(next.sel, 1);
    nav = next;
  }
  // Cambiar de eje también es un flanco nuevo.
  nav = stepResultNav(nav, RIGHT);
  assert.equal(nav.moved, true);
  assert.equal(nav.sel, 0);
  assert.equal(nav.axis, 'x1');
});

test('resultado: stepResultNav nunca muta la entrada', () => {
  const nav = createResultNav();
  const frozen = Object.freeze({ ...nav });
  const next = stepResultNav(frozen, DOWN);
  assert.notEqual(next, frozen);
  assert.deepEqual(frozen, { sel: 0, armed: false, axis: null });
  assert.equal(next.armed, false);
  const armed = Object.freeze({ sel: 0, armed: true, axis: null });
  const moved = stepResultNav(armed, DOWN);
  assert.deepEqual(armed, { sel: 0, armed: true, axis: null });
  assert.equal(moved.sel, 1);
  assert.equal(RESULT_OPTIONS.length, 2);
});

test('resultado: resultAction clampea y cae en retry', () => {
  assert.equal(resultAction(0), 'retry');
  assert.equal(resultAction(1), 'title');
  assert.equal(resultAction(-3), 'retry');
  assert.equal(resultAction(99), 'title');
  assert.equal(resultAction(undefined), 'retry');
  assert.equal(resultAction('1'), 'title');
});

test('resultado: isNewBest compara ronda y puntos, empate no es récord', () => {
  assert.equal(isNewBest({ round: 2, points: 100 }, { round: 3, points: 50 }), true);
  assert.equal(isNewBest({ round: 2, points: 100 }, { round: 2, points: 101 }), true);
  assert.equal(isNewBest({ round: 2, points: 100 }, { round: 2, points: 100 }), false);
  assert.equal(isNewBest({ round: 0, points: 0 }, { round: 0, points: 0 }), false);
  assert.equal(isNewBest({}, {}), false);
  assert.equal(isNewBest(null, null), false);
  assert.equal(isNewBest(undefined, { points: 10 }), true);
  assert.equal(isNewBest({ points: '5' }, { points: 5 }), false);
  assert.equal(isNewBest({ points: 5 }, { points: '6' }), true);
});

test('resultado: bestLine usa la ronda y el formateador de puntos', () => {
  assert.equal(bestLine({ round: 4, points: 1234 }), 'Ronda 4 — 1234 pts');
  assert.equal(bestLine({ round: 0, points: 0 }), 'Ronda 0 — 0 pts');
  assert.equal(bestLine({ round: -2, points: -9 }), 'Ronda 0 — 0 pts');
  assert.equal(bestLine({ round: 3.9, points: 12.7 }), 'Ronda 3 — 12 pts');
  assert.equal(bestLine({}), 'Ronda 0 — 0 pts');
});
