import test from 'node:test';
import assert from 'node:assert/strict';
import { MODES, TRANSITIONS, canTransition, setMode, phaseOf } from '../../src/arena/runMode.js';
import { createRunState, STATE_FIELDS } from '../../src/arena/runState.js';

test('toda transición de la tabla apunta a modos conocidos', () => {
  for (const [from, list] of Object.entries(TRANSITIONS)) {
    assert.ok(MODES.includes(from));
    for (const to of list) assert.ok(MODES.includes(to), `${from} -> ${to}`);
  }
  assert.deepEqual(Object.keys(TRANSITIONS).sort(), [...MODES].sort());
});

test('flujo normal: banner, active, dying, result, banner', () => {
  const scene = { state: createRunState() };
  for (const next of ['active', 'banner', 'active', 'dying', 'result', 'banner']) {
    setMode(scene, next);
    assert.equal(scene.state.mode, next);
  }
});

test('transiciones inválidas tiran error y no cambian el modo', () => {
  const scene = { state: createRunState() };
  assert.equal(canTransition('banner', 'result'), false);
  assert.throws(() => setMode(scene, 'result'), /inválida/);
  assert.equal(scene.state.mode, 'banner');
  setMode(scene, 'active');
  setMode(scene, 'dying');
  assert.throws(() => setMode(scene, 'dying') || setMode(scene, 'nada'), /desconocido/);
  setMode(scene, 'result');
  assert.throws(() => setMode(scene, 'dying'), /inválida/);
});

test('phaseOf conserva los nombres históricos', () => {
  assert.equal(phaseOf('banner'), 'banner');
  assert.equal(phaseOf('active'), 'active');
  assert.equal(phaseOf('dying'), 'dead');
  assert.equal(phaseOf('result'), 'dead');
});

test('runState no tiene objetos de Three y expone sus campos', () => {
  const state = createRunState();
  assert.equal(state.mode, 'banner');
  assert.ok(STATE_FIELDS.includes('round') && STATE_FIELDS.includes('enemies'));
  assert.ok(!STATE_FIELDS.includes('mode'));
});
