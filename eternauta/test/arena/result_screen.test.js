// Pantalla de resultado: no debe romper y tiene que dibujar bastante.
// Si el otro worker todavía no creó results.js, el test se saltea.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const hasResults = existsSync(`${root}src/arena/results.js`);
const font = JSON.parse(readFileSync(`${root}public/assets/font.json`, 'utf8'));

function makeCtx() {
  const calls = { rects: 0, images: 0 };
  const ctx = {
    canvas: { width: 480, height: 270 },
    globalAlpha: 1,
    fillStyle: '#000',
    save() {},
    restore() {},
    translate() {},
    fillRect() { calls.rects += 1; },
    drawImage() { calls.images += 1; },
  };
  return { ctx, calls };
}

function makeAssets() {
  return {
    font,
    buttons: { image: {} },
    buttonsData: {
      frames: {
        a: [0, 0, 9, 9], b: [0, 0, 9, 9], mouse: [0, 0, 11, 13], mouse_r: [0, 0, 11, 13],
        key_e: [0, 0, 9, 9], key_q: [0, 0, 9, 9], key_f: [0, 0, 9, 9],
        key_i: [0, 0, 9, 9], key_esc: [0, 0, 17, 11], key_space: [0, 0, 20, 9],
      },
    },
  };
}

const views = [
  {
    name: 'normal',
    view: { round: 4, kills: 23, points: 1520, best: { round: 6, points: 2400 }, newBest: false, sel: 0, device: 'keyboard', fade: 1 },
  },
  {
    name: 'record con pad',
    view: { round: 9, kills: 57, points: 8120, best: { round: 9, points: 8000 }, newBest: true, sel: 1, device: 'pad', fade: 0.5 },
  },
  {
    name: 'recien abierta',
    view: { round: 1, kills: 0, points: 0, best: { round: 0, points: 0 }, newBest: false, sel: 0, device: 'keyboard', fade: 0 },
  },
  {
    name: 'mochila con chatarra y goma',
    view: {
      round: 3, kills: 11, points: 640, best: { round: 3, points: 640 }, newBest: false,
      sel: 0, device: 'keyboard', fade: 1,
      bag: { chatarra: 3, goma: 1, nafta: 0, pieza: 0 },
    },
  },
  {
    name: 'mochila con pieza',
    view: {
      round: 5, kills: 30, points: 2100, best: { round: 6, points: 2400 }, newBest: false,
      sel: 1, device: 'pad', fade: 1,
      bag: { chatarra: 0, goma: 2, nafta: 1, pieza: 1 },
    },
  },
];

test('drawResultScreen dibuja sin romper', { skip: !hasResults && 'results.js todavía no existe' }, async () => {
  const { drawResultScreen } = await import('../../src/arena/resultScreen.js');
  for (const { name, view } of views) {
    const { ctx, calls } = makeCtx();
    assert.doesNotThrow(() => drawResultScreen(ctx, makeAssets(), view, 1.234), name);
    assert.ok(calls.rects > 100, `${name}: dibujó ${calls.rects} rects`);
    assert.ok(calls.images >= 1, `${name}: dibujó ${calls.images} imágenes`);
    assert.ok(ctx.globalAlpha >= 0 && ctx.globalAlpha <= 1, `${name}: alfa válido`);
  }
});

test('tallyLayout reproduce las medidas de ArenaScene', async () => {
  const { tallyLayout } = await import('../../src/arena/tally.js');
  assert.deepEqual(tallyLayout(5, 12), {
    marks: { full: 1, rest: 0 }, stroke: 1, gap: 4, groupGap: 3, width: 19,
  });
  assert.deepEqual(tallyLayout(7, 12), {
    marks: { full: 1, rest: 2 }, stroke: 1, gap: 4, groupGap: 3, width: 27,
  });
});

test('resultOptionLabels: en el Minijuego la primera opción es "Otra vez"', async () => {
  const { resultOptionLabels } = await import('../../src/arena/resultScreen.js');
  assert.deepEqual(resultOptionLabels({}), ['Volver a la casa', 'Volver al título']);
  assert.deepEqual(resultOptionLabels({ retry: true }), ['Otra vez', 'Volver al título']);
  assert.deepEqual(resultOptionLabels(null), ['Volver a la casa', 'Volver al título']);
});

test('resultOptionRects: dos filas clickeables dentro del cartel', async () => {  const { resultOptionRects, RESULT_BOARD } = await import('../../src/arena/resultScreen.js');
  const rects = resultOptionRects(makeAssets());
  assert.equal(rects.length, 2);
  for (const rect of rects) {
    assert.ok(rect.w > 100 && rect.h >= 16);
    assert.ok(rect.x >= RESULT_BOARD.x && rect.x + rect.w <= RESULT_BOARD.x + RESULT_BOARD.w);
    assert.ok(rect.y >= RESULT_BOARD.y && rect.y + rect.h <= RESULT_BOARD.y + RESULT_BOARD.h);
  }
  assert.ok(rects[1].y > rects[0].y);
  // el cartel de la maqueta: 280x196 centrado en y=30
  assert.deepEqual(RESULT_BOARD, { x: 100, y: 30, w: 280, h: 196 });
});

test('resultOptionYs: con mochila deja aire bajo el resumen', async () => {
  const { resultOptionYs, RESULT_BOARD } = await import('../../src/arena/resultScreen.js');
  const bag = { chatarra: 3, goma: 1 };
  const ys = resultOptionYs({ bag });
  // Resumen en by+107, alto de texto ~7 px.
  const summaryBottom = RESULT_BOARD.y + 107 + 7;
  assert.ok((ys[0] - 4) - summaryBottom >= 6,
    `barra en ${ys[0] - 4}, resumen termina en ${summaryBottom}`);
  assert.ok(ys[1] > ys[0]);
});

test('resultOptionYs: sin bolsa no deja un hueco feo', async () => {
  const { resultOptionYs, resultOptionRects, RESULT_BOARD } = await import('../../src/arena/resultScreen.js');
  const emptyBags = [
    { chatarra: 0, goma: 0, nafta: 0, pieza: 0 },
    undefined,
  ];
  for (const bag of emptyBags) {
    const ys = resultOptionYs({ bag });
    // "Mejor: ..." termina en by+88+7.
    const bestBottom = RESULT_BOARD.y + 88 + 7;
    assert.ok((ys[0] - 4) - bestBottom <= 30);
    const rects = resultOptionRects({ bag });
    assert.equal(rects.length, 2);
    const bottomMargin = RESULT_BOARD.y + RESULT_BOARD.h - (rects[1].y + rects[1].h);
    assert.ok(bottomMargin <= 40, `margen inferior ${bottomMargin}`);
    for (const rect of rects) {
      assert.ok(rect.x >= RESULT_BOARD.x && rect.x + rect.w <= RESULT_BOARD.x + RESULT_BOARD.w);
      assert.ok(rect.y >= RESULT_BOARD.y && rect.y + rect.h <= RESULT_BOARD.y + RESULT_BOARD.h);
    }
  }
});
