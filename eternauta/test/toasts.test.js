// PI-5: toasts abajo a la izquierda, máximo 3, 2.5 s, y los pickups se agrupan.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pushToast, TOAST_LIFE, TOAST_MAX } from '../src/hud.js';

test('toast: vida 2.5 s y máximo 3 (el más viejo se va)', () => {
  const toasts = [];
  pushToast(toasts, 'uno');
  assert.equal(toasts[0].life, TOAST_LIFE);
  assert.equal(TOAST_LIFE, 2.5);
  pushToast(toasts, 'dos');
  pushToast(toasts, 'tres');
  pushToast(toasts, 'cuatro');
  assert.equal(toasts.length, TOAST_MAX);
  assert.deepEqual(toasts.map((t) => t.text), ['dos', 'tres', 'cuatro']);
});

test('toast: los pickups seguidos se agrupan en una línea', () => {
  const toasts = [];
  pushToast(toasts, '+1 Secador', { group: 'pickup' });
  pushToast(toasts, '+1 Lata', { group: 'pickup' });
  pushToast(toasts, '+1 Rifle', { group: 'pickup' });
  assert.equal(toasts.length, 1);
  assert.equal(toasts[0].text, '+1 Secador, +1 Lata, +1 Rifle');
});

test('toast: fuera de la ventana de 0.3 s no se agrupa', () => {
  const toasts = [];
  pushToast(toasts, '+1 Secador', { group: 'pickup' });
  toasts[0].life -= 0.5;   // ya consumió medio segundo
  pushToast(toasts, '+1 Lata', { group: 'pickup' });
  assert.equal(toasts.length, 2);
});

test('toast: distinto grupo no se mezcla', () => {
  const toasts = [];
  pushToast(toasts, '+1 Secador', { group: 'pickup' });
  pushToast(toasts, 'La pava hirvió.', { group: 'mate' });
  assert.equal(toasts.length, 2);
});

test('toast: si el texto agrupado pasa de 40 caracteres arranca uno nuevo', () => {
  const toasts = [];
  pushToast(toasts, '+1 Secador de Elena', { group: 'pickup' });
  pushToast(toasts, '+1 Lata de galletitas', { group: 'pickup' });
  assert.equal(toasts.length, 2, 'no se pasa del límite legible');
  assert.ok(toasts.every((t) => t.text.length <= 40));
});
