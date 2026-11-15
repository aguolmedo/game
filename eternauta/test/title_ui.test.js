import test from 'node:test';
import assert from 'node:assert/strict';
import {
  introAlpha, easeOut, roundedRect, snowflake, ROW_H, ROW_Y, SIGN_H,
} from '../src/titleUi.js';

function fakeCtx() {
  return {
    fillStyle: '',
    calls: [],
    fillRect(x, y, w, h) { this.calls.push([x, y, w, h]); },
  };
}

test('introAlpha sube de 0 a 1 y queda acotado', () => {
  assert.equal(introAlpha(-2), 0);
  assert.equal(introAlpha(0), 0);
  assert.equal(introAlpha(0.35, 0.7), 0.5);
  assert.equal(introAlpha(0.7, 0.7), 1);
  assert.equal(introAlpha(9, 0.7), 1);
  assert.equal(introAlpha(1, 0), 1);
});

test('easeOut arranca en 0, termina en 1 y acelera al principio', () => {
  assert.equal(easeOut(0), 0);
  assert.equal(easeOut(1), 1);
  assert.equal(easeOut(0.5), 0.875);
  assert.equal(easeOut(-1), 0);
  assert.equal(easeOut(2), 1);
  assert.ok(easeOut(0.3) > 0.3);
});

test('el cartel entra justo con cuatro filas de opciones', () => {
  assert.equal(SIGN_H, ROW_Y + 4 * ROW_H + 8);
  const lastRowBottom = ROW_Y + 3 * ROW_H + 14;
  assert.ok(lastRowBottom <= SIGN_H - 8);
});

test('roundedRect dibuja una fila por pixel y recorta las esquinas', () => {
  const ctx = fakeCtx();
  roundedRect(ctx, 10, 20, 40, 10, 3, '#fff');
  assert.equal(ctx.calls.length, 10);
  assert.deepEqual(ctx.calls[0], [13, 20, 34, 1]);
  assert.deepEqual(ctx.calls[1], [12, 21, 36, 1]);
  assert.deepEqual(ctx.calls[3], [10, 23, 40, 1]);
  for (const [, , w] of ctx.calls) assert.ok(w <= 40 && w > 0);
});

test('snowflake no sale de su caja de 7x7', () => {
  const ctx = fakeCtx();
  snowflake(ctx, 100, 50, 1);
  assert.ok(ctx.calls.length > 20);
  for (const [x, y, w, h] of ctx.calls) {
    assert.ok(x >= 100 && x + w <= 108, `x fuera: ${x}`);
    assert.ok(y >= 50 && y + h <= 58, `y fuera: ${y}`);
  }
});
