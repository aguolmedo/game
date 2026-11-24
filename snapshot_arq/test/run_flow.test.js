// Flujo de la salida (Tanda 4): Minijuego aislado (M1), abandono (M5) y cola
// de cambios de escena (M6). Todo lógica pura de src/base.js.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  abandonResult,
  createSceneQueue,
  endRunComplains,
  endRunKind,
  endRunSave,
  runPersists,
  shouldComplain,
} from '../src/base.js';
import { emptySave } from '../src/run/save.js';

// ---------------------------------------------------------------- M1
test('M1: el Minijuego (sin run) nunca persiste; una salida real sí', () => {
  assert.equal(runPersists(null, false), false);
  assert.equal(runPersists(undefined, false), false);
  assert.equal(runPersists(null, true), false);
  assert.equal(runPersists({ loop: 2 }, true), false);
  assert.equal(runPersists({ loop: 2 }, false), true);
});

// ---------------------------------------------------------------- M5
test('M5: abandonar se modela como muerte sin queja', () => {
  const result = abandonResult({ bag: { chatarra: 2 }, round: 4, points: 300 });
  assert.deepEqual(result, { type: 'abandono', bag: { chatarra: 2 }, round: 4, points: 300 });
  assert.deepEqual(abandonResult(), { type: 'abandono', bag: null, round: 0, points: 0 });
  assert.equal(endRunKind(result), 'abandono');

  // Una muerte que toca queja (muertes múltiplo de 3): el abandono NO se queja.
  const save = emptySave();
  save.muertes = 2;
  const after = endRunSave(save, result);
  assert.equal(after.muertes, 3);
  assert.equal(shouldComplain(after), true);
  assert.equal(endRunComplains(result, after), false, 'abandono sin queja');
  assert.equal(endRunComplains({ type: 'murio' }, after), true, 'la muerte jugada sí');
});

test('M5: abandonar sin botín conserva la mochila anterior', () => {
  const save = emptySave();
  save.loop = 2;
  save.mochila = { loop: 1, contenido: { chatarra: 4, goma: 0, nafta: 0, pieza: 0 } };
  const out = endRunSave(save, abandonResult({ bag: {}, round: 2 }));
  assert.deepEqual(out.mochila, save.mochila);
  assert.equal(out.muertes, 1);
});

test('M5: los tipos de cierre quedan clasificados', () => {
  assert.equal(endRunKind({ type: 'volvio' }), 'volvio');
  assert.equal(endRunKind({ type: 'murio' }), 'murio');
  assert.equal(endRunKind({ type: 'abandono' }), 'abandono');
  assert.equal(endRunKind({ type: 'loQueSea' }), 'otro');
  assert.equal(endRunKind(null), 'otro');
  assert.equal(endRunComplains({ type: 'otro' }, { muertes: 3 }), false);
});

// ---------------------------------------------------------------- M6
test('M6: sin transición el pedido arranca y no deja nada encolado', () => {
  const queue = createSceneQueue();
  const start = queue.request('garage', { x: 1 }, false);
  assert.deepEqual(start, { name: 'garage', spawn: { x: 1 } });
  assert.equal(queue.pending, null);
});

test('M6: con transición en curso el pedido se encola en vez de perderse', () => {
  const queue = createSceneQueue();
  assert.equal(queue.request('death', null, true), null);
  assert.deepEqual(queue.pending, { name: 'death', spawn: null });
  assert.deepEqual(queue.take(), { name: 'death', spawn: null });
  assert.equal(queue.pending, null, 'take() limpia la ranura');
  assert.equal(queue.take(), null);
});

test('M6: gana el último pedido encolado', () => {
  const queue = createSceneQueue();
  queue.request('death', null, true);
  queue.request('title', { x: 4 }, true);
  assert.deepEqual(queue.take(), { name: 'title', spawn: { x: 4 } });
});

test('M6: un pedido nuevo sin transición descarta lo viejo encolado', () => {
  const queue = createSceneQueue();
  queue.request('title', null, true);
  const start = queue.request('garage', null, false);
  assert.deepEqual(start, { name: 'garage', spawn: null });
  assert.equal(queue.pending, null);
});

test('M6: clear() tira lo encolado (partida nueva)', () => {
  const queue = createSceneQueue();
  queue.request('death', null, true);
  queue.clear();
  assert.equal(queue.take(), null);
});
