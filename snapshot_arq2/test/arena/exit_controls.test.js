import test from 'node:test';
import assert from 'node:assert/strict';
import { consumableAction, firePressed } from '../../src/arena/controls.js';

test('consumibles: sin stock no dispara nada', () => {
  const none = consumableAction();
  assert.deepEqual(none, { bengala: false, botella: false, reload: false });
  // Teclas/botones apretados pero sin stock en la mochila.
  assert.deepEqual(consumableAction({ slot: 0, bengalas: 0 }), {
    bengala: false, botella: false, reload: false,
  });
  assert.deepEqual(consumableAction({ rb: true, molotovs: 0 }), {
    bengala: false, botella: false, reload: false,
  });
});

test('consumibles: tecla 1 y LB tiran bengala', () => {
  assert.equal(consumableAction({ slot: 0, bengalas: 2 }).bengala, true);
  assert.equal(consumableAction({ lb: true, bengalas: 1 }).bengala, true);
  assert.equal(consumableAction({ slot: 0, bengalas: 2 }).botella, false);
});

test('consumibles: tecla 2 y RB tiran botella', () => {
  assert.equal(consumableAction({ slot: 1, molotovs: 1 }).botella, true);
  assert.equal(consumableAction({ rb: true, molotovs: 3 }).botella, true);
  assert.equal(consumableAction({ slot: 1, molotovs: 1 }).bengala, false);
});

test('consumibles: RB ya no recarga', () => {
  assert.equal(consumableAction({ rb: true, molotovs: 1 }).reload, false);
  assert.equal(consumableAction({ rb: true, molotovs: 0 }).reload, false);
  assert.equal(consumableAction({ lb: true, bengalas: 1 }).reload, false);
});

test('consumibles: R y X recargan', () => {
  assert.equal(consumableAction({ keyR: true }).reload, true);
  assert.equal(consumableAction({ padX: true }).reload, true);
});

test('consumibles: slot -1 (ninguno) no dispara', () => {
  const idle = consumableAction({ slot: -1, bengalas: 5, molotovs: 5 });
  assert.deepEqual(idle, { bengala: false, botella: false, reload: false });
});

test('firePressed sigue igual', () => {
  assert.equal(firePressed(), false);
  assert.equal(firePressed({ keyboardFire: true }), true);
  assert.equal(firePressed({ click: true, nearCrate: true }), false);
});
