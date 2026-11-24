import test from 'node:test';
import assert from 'node:assert/strict';
import { STEP, MAX_STEPS, stepAccumulator, createInputGate, quietInput } from '../../src/core/loop.js';

const press = (extra = {}) => ({
  aPressed: false, startPressed: false, slotPressed: -1, wheel: 0, click: null,
  rightClick: null, move: { x: 0, y: 0 }, ...extra,
});

test('60 fps da un paso por frame', () => {
  let acc = 0;
  let total = 0;
  for (let i = 0; i < 60; i++) {
    const r = stepAccumulator(acc, 1 / 60);
    acc = r.acc;
    total += r.steps;
  }
  assert.equal(total, 60);
});

test('30 fps da dos pasos por frame y 144 fps conserva el tiempo', () => {
  assert.equal(stepAccumulator(0, 1 / 30).steps, 2);
  let acc = 0;
  let total = 0;
  for (let i = 0; i < 144; i++) {
    const r = stepAccumulator(acc, 1 / 144);
    acc = r.acc;
    total += r.steps;
  }
  assert.ok(Math.abs(total - 60) <= 1);
});

test('tope de pasos: un frame enorme no genera espiral', () => {
  const r = stepAccumulator(0, 5);
  assert.equal(r.steps, MAX_STEPS);
  assert.ok(r.acc < STEP);
  assert.equal(stepAccumulator(r.acc, 0).steps, 0);
});

test('dt negativo o 0 no da pasos', () => {
  assert.equal(stepAccumulator(0, -1).steps, 0);
});

test('el flanco lo ve solo el primer paso', () => {
  const gate = createInputGate();
  const out = gate.take(press({ aPressed: true, slotPressed: 3, wheel: 1 }), 3);
  assert.equal(out.length, 3);
  assert.equal(out[0].aPressed, true);
  assert.equal(out[0].slotPressed, 3);
  assert.equal(out[1].aPressed, false);
  assert.equal(out[2].slotPressed, -1);
  assert.equal(out[2].wheel, 0);
});

test('con cero pasos el flanco no se pierde ni se duplica', () => {
  const gate = createInputGate();
  assert.deepEqual(gate.take(press({ startPressed: true }), 0), []);
  const out = gate.take(press({ wheel: 1 }), 2);
  assert.equal(out[0].startPressed, true);
  assert.equal(out[1].startPressed, false);
  const next = gate.take(press(), 1);
  assert.equal(next[0].startPressed, false);
});

test('los flancos acumulados suman rueda y conservan click', () => {
  const gate = createInputGate();
  gate.take(press({ wheel: 1, click: { x: 1, y: 2 } }), 0);
  const [s] = gate.take(press({ wheel: 2 }), 1);
  assert.equal(s.wheel, 3);
  assert.deepEqual(s.click, { x: 1, y: 2 });
});

test('quietInput no toca lo sostenido', () => {
  const q = quietInput(press({ move: { x: 1, y: 0 }, aPressed: true }));
  assert.equal(q.move.x, 1);
  assert.equal(q.aPressed, false);
});
