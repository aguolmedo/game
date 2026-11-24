// El HUD de la arena no se pisa: paneles arriba, controles en su franja.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VIEW_W, VIEW_H, hudRects, hintBarRect, overlaps,
} from '../src/arena/hudLayout.js';

const TOTALS = [394, 260];

function insideView(rect) {
  return rect.x >= 0 && rect.y >= 0
    && rect.x + rect.w <= VIEW_W && rect.y + rect.h <= VIEW_H;
}

for (const total of TOTALS) {
  test(`hudRects(${total}): todo dentro de la pantalla y sin superposiciones`, () => {
    const rects = hudRects(total);
    assert.equal(rects.length, 4);
    for (const rect of rects) assert.ok(insideView(rect), JSON.stringify(rect));
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        assert.equal(overlaps(rects[i], rects[j]), false,
          `rects ${i} y ${j} se pisan: ${JSON.stringify(rects[i])} / ${JSON.stringify(rects[j])}`);
      }
    }
  });

  test(`hudRects(${total}): los controles quedan debajo de los paneles`, () => {
    const hints = hintBarRect(total);
    for (const panel of hudRects(total).slice(0, 2)) {
      assert.ok(hints.y >= panel.y + panel.h,
        `controles (${hints.y}) deben quedar bajo el panel (${panel.y + panel.h})`);
    }
  });

  test(`hudRects(${total}, {extra:false}): 3 rects sin superposición`, () => {
    const rects = hudRects(total, { extra: false });
    assert.equal(rects.length, 3);
    for (const rect of rects) assert.ok(insideView(rect));
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        assert.equal(overlaps(rects[i], rects[j]), false);
      }
    }
  });
}
