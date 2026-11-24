import test from 'node:test';
import assert from 'node:assert/strict';
import {
  introAlpha, easeOut, roundedRect, snowflake, fitSignWidth, ROW_H, ROW_Y, SIGN_H,
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

test('fitSignWidth ensancha el cartel centrado para el texto mas ancho', () => {
  const sign = { x: 160, y: 118, w: 160, h: 84 };
  const wide = fitSignWidth(sign, 150);
  assert.ok(wide.w >= 174, `ancho chico: ${wide.w}`);
  assert.ok(Math.abs(wide.x + wide.w / 2 - 240) <= 0.5, `descentrado: ${wide.x}`);
  assert.ok((wide.w - 150) / 2 >= 12, `margen chico: ${(wide.w - 150) / 2}`);
  assert.equal(wide.y, 118);
  assert.equal(wide.h, 84);
});

test('fitSignWidth no toca el cartel si el texto ya entra', () => {
  const sign = { x: 160, y: 118, w: 160, h: 84 };
  const narrow = fitSignWidth(sign, 100);
  assert.equal(narrow.w, 160);
  assert.equal(narrow.x, 160);
  // no muta el original
  fitSignWidth(sign, 400);
  assert.deepEqual(sign, { x: 160, y: 118, w: 160, h: 84 });
});
