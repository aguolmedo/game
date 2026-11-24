import test from 'node:test';
import assert from 'node:assert/strict';
import { DialogBox, ChoiceBox } from '../../src/dialog.js';

// Fuente falsa: un glifo de 6 px y glifos de botones para medir prompts.
const BLANK = ['######'];
const ASSETS = {
  font: { glyphs: { ' ': BLANK } },
  buttonsData: { frames: { mouse: [0, 0, 11, 13], a: [0, 0, 11, 11], b: [0, 0, 11, 11] } },
};

const NONE = { aPressed: false, bPressed: false, startPressed: false };

test('DialogBox: box y Cerrar quedan dentro de la pantalla', () => {
  const box = new DialogBox(ASSETS);
  const rect = box.boxRect();
  assert.deepEqual(rect, { x: 8, y: 174, w: 464, h: 88 });
  const close = box.closeRect('mouse');
  assert.ok(close.x > rect.x && close.x + close.w <= rect.x + rect.w);
  assert.ok(close.y > rect.y && close.y <= rect.y + rect.h);
});

test('DialogBox: click completa el tipeo y despues cierra', () => {
  const box = new DialogBox(ASSETS);
  box.show({ lines: ['Hola Favalli.'] });
  const center = { x: 200, y: 210 };
  const input = { ...NONE, click: { x: 0, y: 0 } };
  assert.equal(box.update(0.016, input, 'mouse', center), null);
  assert.equal(box.typing, false, 'el click completo el texto');
  const result = box.update(0.016, input, 'mouse', center);
  assert.equal(result, 'closed');
  assert.equal(box.open, false);
});

test('DialogBox: click en Cerrar cierra y click afuera no avanza', () => {
  const box = new DialogBox(ASSETS);
  box.show({ lines: ['Uno.', 'Dos.'] });
  const outside = { x: 470, y: 20 };
  const input = { ...NONE, click: { x: 0, y: 0 } };
  assert.equal(box.update(0.016, input, 'mouse', outside), null);
  assert.equal(box.typing, true, 'el click afuera no completa el texto');
  const close = box.closeRect('mouse');
  const point = { x: close.x + 2, y: close.y + 2 };
  assert.equal(box.update(0.016, input, 'mouse', point), 'closed');
  assert.equal(box.open, false);
});

test('DialogBox: teclado sigue funcionando sin click', () => {
  const box = new DialogBox(ASSETS);
  box.show({ lines: ['Hola.'] });
  box.update(0.016, { ...NONE, aPressed: true }, 'keyboard', null);
  assert.equal(box.typing, false);
  assert.equal(box.update(0.016, { ...NONE, aPressed: true }, 'keyboard', null), 'closed');
});

test('ChoiceBox: hover mueve la seleccion y click elige la opcion', () => {
  const box = new ChoiceBox(ASSETS);
  let picked = null;
  box.show({ question: '¿Salir?', options: ['No', 'Si'], onPick: (v, i) => { picked = [v, i]; } });
  const rects = box.optionRects();
  assert.equal(rects.length, 2);
  box.update(0.016, { ...NONE }, 'mouse', { x: rects[1].x + 2, y: rects[1].y + 2 });
  assert.equal(box.index, 1, 'el hover movio la seleccion');
  const result = box.update(0.016, { ...NONE, click: { x: 0, y: 0 } }, 'mouse',
    { x: rects[0].x + 2, y: rects[0].y + 2 });
  assert.deepEqual(result, { index: 0, value: 'No' });
  assert.deepEqual(picked, ['No', 0]);
  assert.equal(box.open, false);
});

test('ChoiceBox: click en Volver cancela, click afuera no elige', () => {
  const box = new ChoiceBox(ASSETS);
  box.show({ question: '¿Salir?', options: ['No', 'Si'], onPick: () => { throw new Error('no'); } });
  const outside = { x: 5, y: 5 };
  assert.equal(box.update(0.016, { ...NONE, click: { x: 0, y: 0 } }, 'mouse', outside), null);
  assert.equal(box.open, true);
  const back = box.backRect('mouse');
  assert.equal(box.update(0.016, { ...NONE, click: { x: 0, y: 0 } }, 'mouse',
    { x: back.x + 2, y: back.y + 2 }), 'cancel');
  assert.equal(box.open, false);
});

test('CaptionBox, globo y comic tambien avanzan con click', async () => {
  const { CaptionBox, BalloonLine, ComicOverlay } = await import('../../src/comic.js');
  const caption = new CaptionBox(ASSETS);
  caption.show('La nieve brilla.');
  assert.equal(caption.update(0.1, {}), null);
  assert.equal(caption.update(0.2, { click: { x: 1, y: 1 } }), 'closed');
  assert.equal(caption.open, false);

  const balloon = new BalloonLine(ASSETS);
  balloon.show('Hola.', { x: 0, y: 0 });
  assert.equal(balloon.update(0.2, { click: { x: 1, y: 1 } }), 'closed');
  assert.equal(balloon.open, false);

  let done = 0;
  const comic = new ComicOverlay(ASSETS);
  comic.play({ panels: [{ type: 'color' }, { type: 'color' }], onDone: () => { done += 1; } });
  assert.equal(comic.update(0, { click: { x: 1, y: 1 } }), 'reveal');
  assert.equal(comic.update(0, { click: { x: 1, y: 1 } }), 'reveal');
  assert.equal(comic.update(0, { click: { x: 1, y: 1 } }), 'done');
  assert.equal(comic.open, false);
  assert.equal(done, 1);
});

test('spriteHeadFor: ids de diálogo apuntan a un bloque de chars2', async () => {
  const { spriteHeadFor } = await import('../../src/data/portraits.js');
  const blocks = JSON.parse((await import('node:fs')).readFileSync(
    new URL('../../public/assets/chars2.json', import.meta.url), 'utf8',
  )).blocks;
  const ids = ['juan', 'favalli', 'lucas', 'polsky', 'polsky_coat', 'elena', 'martita',
    'juan_suit', 'juan_rifle', 'juan_suit_rifle'];
  for (const id of ids) {
    const block = spriteHeadFor(id);
    assert.ok(block, `${id} tiene bloque`);
    assert.ok(blocks[block], `${id} -> ${block} existe en chars2`);
  }
  assert.equal(spriteHeadFor('juan_rifle'), 'juan_suit_rifle');
  assert.equal(spriteHeadFor('nadie'), null);
  assert.equal(spriteHeadFor(3), null);
});

test('drawPortrait: sin chars2 cae al atlas viejo y no rompe', () => {
  const atlas = { image: { id: 'portraits_dlg' } };
  const box = new DialogBox({
    ...ASSETS,
    snow: { image: {} },
    portraitsDlg: atlas,
    portraitsDlgData: { cell: { w: 64, h: 64 }, blocks: { lucas: { x: 128, y: 0 } } },
  });
  const calls = [];
  const ctx = {
    fillStyle: '', imageSmoothingEnabled: true,
    fillRect: (...a) => calls.push(['fillRect', ...a]),
    drawImage: (...a) => calls.push(['drawImage', ...a]),
  };
  box.drawPortrait(ctx, { portrait: 'lucas', lines: [] }, 10, 10);
  assert.ok(calls.some((c) => c[0] === 'fillRect'), 'dibujó el marco de siempre');
  const atlasDraw = calls.find((c) => c[0] === 'drawImage');
  assert.equal(atlasDraw[1], atlas.image, 'usó portraits_dlg');
  assert.deepEqual([atlasDraw[2], atlasDraw[3], atlasDraw[4], atlasDraw[5]], [128, 0, 64, 64]);
  assert.deepEqual([atlasDraw[6], atlasDraw[7], atlasDraw[8], atlasDraw[9]], [10, 10, 64, 64]);
});

test('drawPortrait: juan_suit en diálogo sigue en portraits_dlg aunque haya chars2', () => {
  const atlas = { image: { id: 'portraits_dlg' } };
  const box = new DialogBox({
    ...ASSETS,
    snow: { image: {} },
    chars2: { image: { id: 'chars2' } },
    chars2Data: { cell: { w: 16, h: 32 }, idle: [6, 7], blocks: { juan_suit: { x: 128, y: 0 } } },
    portraitsDlg: atlas,
    portraitsDlgData: { cell: { w: 64, h: 64 }, blocks: { juan_suit: { x: 0, y: 0 } } },
  });
  const calls = [];
  const ctx = {
    fillStyle: '', imageSmoothingEnabled: true,
    fillRect: () => {},
    drawImage: (...a) => calls.push(a),
  };
  box.drawPortrait(ctx, { portrait: 'juan_suit', portraitKind: 'dlg', lines: [] }, 10, 10);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], atlas.image, 'no recortó de chars2');
});
