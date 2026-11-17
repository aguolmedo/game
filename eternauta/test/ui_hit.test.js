import test from 'node:test';
import assert from 'node:assert/strict';
import {
  pointInRect, hitIndex, hoverIndex, rowRects, gridRects,
} from '../src/uiHit.js';

test('pointInRect: dentro, afuera y bordes medio abiertos', () => {
  const rect = { x: 10, y: 20, w: 30, h: 10 };
  assert.equal(pointInRect({ x: 10, y: 20 }, rect), true);
  assert.equal(pointInRect({ x: 39.9, y: 29.9 }, rect), true);
  assert.equal(pointInRect({ x: 40, y: 25 }, rect), false);
  assert.equal(pointInRect({ x: 25, y: 30 }, rect), false);
  assert.equal(pointInRect({ x: 9, y: 25 }, rect), false);
  assert.equal(pointInRect(null, rect), false);
  assert.equal(pointInRect({ x: 12, y: 22 }, null), false);
});

test('pointInRect: el padding agranda la zona clickeable', () => {
  const rect = { x: 10, y: 20, w: 10, h: 10 };
  assert.equal(pointInRect({ x: 7, y: 25 }, rect), false);
  assert.equal(pointInRect({ x: 7, y: 25 }, rect, 3), true);
  assert.equal(pointInRect({ x: 22.9, y: 25 }, rect, 3), true);
  assert.equal(pointInRect({ x: 23, y: 25 }, rect, 3), false);
});

test('hitIndex: primer rect que contiene el punto y -1 si no hay', () => {
  const rects = [
    { x: 0, y: 0, w: 10, h: 10 },
    { x: 10, y: 0, w: 10, h: 10 },
  ];
  assert.equal(hitIndex({ x: 5, y: 5 }, rects), 0);
  assert.equal(hitIndex({ x: 15, y: 5 }, rects), 1);
  assert.equal(hitIndex({ x: 25, y: 5 }, rects), -1);
  assert.equal(hitIndex({ x: 5, y: 5 }, null), -1);
});

test('hoverIndex: conserva la seleccion si el puntero no toca nada', () => {
  const rects = [
    { x: 0, y: 0, w: 10, h: 10 },
    { x: 10, y: 0, w: 10, h: 10 },
  ];
  assert.equal(hoverIndex({ x: 15, y: 5 }, rects, 0), 1);
  assert.equal(hoverIndex({ x: 99, y: 99 }, rects, 0), 0);
  assert.equal(hoverIndex(null, rects, 1), 1);
});

test('rowRects: filas apiladas con separacion', () => {
  const rects = rowRects({ x: 4, y: 8, w: 100, h: 12, gap: 3, count: 3 });
  assert.deepEqual(rects, [
    { x: 4, y: 8, w: 100, h: 12 },
    { x: 4, y: 23, w: 100, h: 12 },
    { x: 4, y: 38, w: 100, h: 12 },
  ]);
  assert.deepEqual(rowRects({ count: -2 }), []);
});

test('gridRects: grilla de inventario (6 columnas) con gaps', () => {
  const rects = gridRects({
    x: 100, y: 50, w: 20, h: 20, gapX: 3, gapY: 3, columns: 6, count: 8,
  });
  assert.equal(rects.length, 8);
  assert.deepEqual(rects[0], { x: 100, y: 50, w: 20, h: 20 });
  assert.deepEqual(rects[5], { x: 100 + 5 * 23, y: 50, w: 20, h: 20 });
  assert.deepEqual(rects[6], { x: 100, y: 73, w: 20, h: 20 });
  assert.deepEqual(rects[7], { x: 123, y: 73, w: 20, h: 20 });
  assert.deepEqual(gridRects({ columns: 0, count: 2 })[1], { x: 0, y: 0, w: 0, h: 0 });
});

test('mousePoint: solo con mouse y puntero; usa screenToView del juego', async () => {
  const { mousePoint } = await import('../src/uiHit.js');
  const game = {
    screenToView: (x, y) => ({ x: x - 10, y: y - 20 }),
  };
  assert.deepEqual(mousePoint(game, { device: 'mouse', pointer: { x: 30, y: 40 } }),
    { x: 20, y: 20 });
  assert.equal(mousePoint(game, { device: 'keyboard', pointer: { x: 30, y: 40 } }), null);
  assert.equal(mousePoint(game, { device: 'mouse' }), null);
  assert.equal(mousePoint(null, { device: 'mouse', pointer: { x: 1, y: 2 } }), null);
});
