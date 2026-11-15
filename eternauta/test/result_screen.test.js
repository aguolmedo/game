// Pantalla de resultado: no debe romper y tiene que dibujar bastante.
// Si el otro worker todavía no creó results.js, el test se saltea.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
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
    cascarudos: { image: {} },
    cascarudosData: { frames: { 'cascarudo:right:0': [0, 0, 20, 16] } },
    buttons: { image: {} },
    buttonsData: { frames: { a: [0, 0, 9, 9], key_space: [0, 0, 20, 9] } },
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
];

test('drawResultScreen dibuja sin romper', { skip: !hasResults && 'results.js todavía no existe' }, async () => {
  const { drawResultScreen } = await import('../src/arena/resultScreen.js');
  for (const { name, view } of views) {
    const { ctx, calls } = makeCtx();
    assert.doesNotThrow(() => drawResultScreen(ctx, makeAssets(), view, 1.234), name);
    assert.ok(calls.rects > 100, `${name}: dibujó ${calls.rects} rects`);
    assert.ok(calls.images >= 2, `${name}: dibujó ${calls.images} imágenes`);
    assert.ok(ctx.globalAlpha >= 0 && ctx.globalAlpha <= 1, `${name}: alfa válido`);
  }
});

test('tallyLayout reproduce las medidas de ArenaScene', async () => {
  const { tallyLayout } = await import('../src/arena/tally.js');
  assert.deepEqual(tallyLayout(5, 12), {
    marks: { full: 1, rest: 0 }, stroke: 1, gap: 4, groupGap: 3, width: 19,
  });
  assert.deepEqual(tallyLayout(7, 12), {
    marks: { full: 1, rest: 2 }, stroke: 1, gap: 4, groupGap: 3, width: 27,
  });
});
