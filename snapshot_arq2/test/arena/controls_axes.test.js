import test from 'node:test';
import assert from 'node:assert/strict';
import { firePressed } from '../../src/arena/controls.js';

test('arena: un click cerca de la caja compra y no dispara', () => {
  assert.equal(firePressed({ mouseDown: true, click: true, nearCrate: true }), false);
  // Sostenido cerca de la caja tampoco dispara (el click ya compro).
  assert.equal(firePressed({ mouseDown: true, nearCrate: true }), false);
  // El teclado/pad siguen disparando aunque este cerca.
  assert.equal(firePressed({ keyboardFire: true, nearCrate: true }), true);
});

test('arena: lejos de la caja el click dispara', () => {
  assert.equal(firePressed({ click: true }), true);
  assert.equal(firePressed({ mouseDown: true }), true);
  assert.equal(firePressed({ click: true, mouseDown: true, nearCrate: false }), true);
});

test('arena: sin input no dispara', () => {
  assert.equal(firePressed(), false);
  assert.equal(firePressed({ nearCrate: true }), false);
});
