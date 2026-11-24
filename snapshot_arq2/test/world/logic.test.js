import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEADZONE,
  combineMoves,
  dialogPages,
  exitOutcome,
  keysToMove,
  pickUpSuit,
  reachedStreetEnd,
  stickToMove,
  streetOutcome,
} from '../../src/logic.js';

const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

test('deadzone: el stick quieto o apenas movido no genera movimiento', () => {
  assert.deepEqual(stickToMove(0, 0), { x: 0, y: 0 });
  assert.deepEqual(stickToMove(0.1, 0.1), { x: 0, y: 0 });
  assert.deepEqual(stickToMove(DEADZONE, 0), { x: 0, y: 0 });
});

test('deadzone: pasado el umbral el eje se reescala', () => {
  const right = stickToMove(1, 0);
  assert.equal(right.x, 1);
  assert.equal(right.y, 0);

  const half = stickToMove(0.5, 0);
  assert.ok(near(half.x, (0.5 - DEADZONE) / (1 - DEADZONE)));
  assert.equal(half.y, 0);

  const up = stickToMove(0, -1);
  assert.ok(near(up.y, -1));
});

test('deadzone: la diagonal del stick se limita a magnitud 1', () => {
  const move = stickToMove(0.8, 0.8);
  assert.ok(near(Math.hypot(move.x, move.y), 1));
  assert.ok(near(move.x, Math.SQRT1_2));
  assert.ok(near(move.y, Math.SQRT1_2));
});

test('teclado: mapea flechas/WASD y normaliza la diagonal', () => {
  assert.deepEqual(keysToMove(new Set(['ArrowRight'])), { x: 1, y: 0 });
  assert.deepEqual(keysToMove(new Set(['KeyD'])), { x: 1, y: 0 });
  assert.deepEqual(keysToMove(new Set(['KeyW'])), { x: 0, y: -1 });
  assert.deepEqual(keysToMove(new Set()), { x: 0, y: 0 });

  const diag = keysToMove(new Set(['KeyW', 'KeyA']));
  assert.ok(near(diag.x, -Math.SQRT1_2));
  assert.ok(near(diag.y, -Math.SQRT1_2));

  assert.deepEqual(keysToMove(new Set(['ArrowLeft', 'ArrowRight'])), { x: 0, y: 0 });
});

test('combineMoves: stick + teclado nunca supera magnitud 1', () => {
  const move = combineMoves({ x: 1, y: 0 }, { x: 1, y: 0 });
  assert.ok(near(Math.hypot(move.x, move.y), 1));
  assert.ok(near(move.x, 1));
  assert.deepEqual(combineMoves({ x: 0, y: 0 }, { x: 0, y: 0 }), { x: 0, y: 0 });
});

test('transición: sin traje se muere, con traje se sale a la calle', () => {
  assert.equal(exitOutcome(false), 'death');
  assert.equal(exitOutcome(true), 'street');
});

test('transición: el final de la calle dispara el final de la demo', () => {
  assert.equal(reachedStreetEnd(100), false);
  assert.equal(reachedStreetEnd(293), false);
  assert.equal(reachedStreetEnd(294), true);
  assert.equal(reachedStreetEnd(300), true);
});

test('recorrido de la calle: sin traje muerte, con traje final', () => {
  assert.equal(streetOutcome(false, 0), 'death');
  assert.equal(streetOutcome(false, 300), 'death');
  assert.equal(streetOutcome(true, 100), 'street');
  assert.equal(streetOutcome(true, 293), 'street');
  assert.equal(streetOutcome(true, 294), 'end');
  assert.equal(streetOutcome(true, 300), 'end');
});

test('pickUpSuit devuelve un estado nuevo con el traje', () => {
  const before = { hasSuit: false, otro: 1 };
  const after = pickUpSuit(before);
  assert.equal(after.hasSuit, true);
  assert.equal(after.otro, 1);
  assert.equal(before.hasSuit, false);
});

test('dialogPages: páginas de hasta 3 líneas', () => {
  const pages = dialogPages(['a', 'b', 'c', 'd', 'e'], 3);
  assert.deepEqual(pages, [['a', 'b', 'c'], ['d', 'e']]);
  assert.deepEqual(dialogPages([], 3), [[]]);
});
