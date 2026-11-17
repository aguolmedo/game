import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTROLS_ROWS, TitleMenu, PauseMenu, ChestPanel,
  titleOptionRects, promptBox, hintLayout,
  pauseTabRects, pauseSlotRects, pauseRecipeRects, pauseOptionRects,
  chestSlotRects,
} from '../src/menus.js';
import { glyphName, promptWidth } from '../src/glyphs.js';
import { pointInRect, hitIndex } from '../src/uiHit.js';
import { ROW_H, ROW_Y } from '../src/titleUi.js';
import { RECIPES } from '../src/recipes.js';
import { MENU_TABS } from '../src/menu.js';

// Fuente falsa: un solo glifo de 6 px que sirve para medir.
const BLANK = ['######'];
const ASSETS = {
  font: { glyphs: { ' ': BLANK } },
  buttonsData: {
    frames: {
      mouse: [0, 0, 11, 13],
      lb: [0, 0, 15, 9],
      'key_esc': [0, 0, 17, 11],
    },
  },
};

test('titleOptionRects: cuatro filas dentro del cartel', () => {
  const sign = { x: 160, y: 118, w: 160, h: 84 };
  const rects = titleOptionRects(sign, 4);
  assert.equal(rects.length, 4);
  rects.forEach((rect, i) => {
    assert.equal(rect.x, sign.x + 7);
    assert.equal(rect.w, sign.w - 14);
    assert.equal(rect.h, ROW_H);
    assert.equal(rect.y, sign.y + ROW_Y - 1 + i * ROW_H);
  });
  // el centro de cada fila cae en su propio rect
  rects.forEach((rect, i) => {
    const center = { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
    assert.equal(hitIndex(center, rects), i);
  });
  // la ultima fila entra en el cartel
  const last = rects[3];
  assert.ok(last.y + last.h <= sign.y + sign.h);
});

test('titleOptionRects: respeta la cantidad de opciones', () => {
  assert.equal(titleOptionRects({ x: 0, y: 0, w: 40, h: 20 }, 2).length, 2);
  assert.deepEqual(titleOptionRects({ x: 0, y: 0, w: 40, h: 20 }, 0), []);
});

test('las clases exponen los helpers de layout', () => {
  for (const Class of [TitleMenu, PauseMenu, ChestPanel]) {
    assert.equal(typeof Class.prototype.update, 'function');
  }
  assert.equal(typeof TitleMenu.prototype.optionRects, 'function');
  assert.equal(typeof TitleMenu.prototype.volverRect, 'function');
  assert.equal(typeof PauseMenu.prototype.activateSlot, 'function');
  assert.equal(typeof PauseMenu.prototype.activateRecipe, 'function');
  assert.equal(typeof PauseMenu.prototype.activateOption, 'function');
  assert.equal(typeof ChestPanel.prototype.takeIndex, 'function');
  assert.equal(typeof ChestPanel.prototype.slotRects, 'function');
});

test('promptBox: caja con 4/5 px de aire alrededor del prompt', () => {
  const box = promptBox(100, 200, 37);
  assert.deepEqual(box, { x: 96, y: 195, w: 45, h: 23 });
  assert.deepEqual(promptBox(10.6, 20.2, 10), { x: 7, y: 15, w: 18, h: 23 });
});

test('pauseTabRects: tres pestañas alineadas arriba', () => {
  const rects = pauseTabRects();
  assert.equal(rects.length, MENU_TABS.length);
  assert.deepEqual(rects[0], { x: 54, y: 28, w: 116, h: 17 });
  assert.deepEqual(rects[1], { x: 178, y: 28, w: 116, h: 17 });
  assert.deepEqual(rects[2], { x: 302, y: 28, w: 116, h: 17 });
});

test('pauseSlotRects: grilla 6x3 de 20 px centrada', () => {
  const rects = pauseSlotRects(18);
  assert.equal(rects.length, 18);
  assert.deepEqual(rects[0], { x: 173, y: 52, w: 20, h: 20 });
  assert.equal(rects[5].x, 173 + 5 * 23);
  assert.equal(rects[6].y, 75);
  assert.equal(rects[17].x, 173 + 5 * 23);
  assert.equal(rects[17].y, 98);
});

test('pauseRecipeRects y pauseOptionRects: filas clickeables', () => {
  const recipes = pauseRecipeRects();
  assert.equal(recipes.length, RECIPES.length);
  assert.deepEqual(recipes[0], { x: 50, y: 59, w: 376, h: 32 });

  const options = pauseOptionRects();
  assert.deepEqual(options, [
    { x: 50, y: 75, w: 340, h: 28 },
    { x: 50, y: 105, w: 340, h: 28 },
  ]);
});

test('hintLayout: la caja Cerrar coincide con el prompt dibujado', () => {
  const actions = [
    { action: 'prev', label: 'Pestaña' },
    { action: 'interact', label: 'Fabricar' },
    { action: 'back', label: 'Cerrar' },
  ];
  const hints = hintLayout(ASSETS, 'mouse', actions);
  assert.equal(hints.items.length, 3);
  assert.equal(hints.y, 240);
  for (const item of hints.items) {
    assert.equal(item.rect.x, item.x - 4);
    assert.equal(item.rect.y, item.y - 5);
    assert.equal(item.rect.w, item.width + 8);
    assert.equal(item.rect.h, 23);
    assert.equal(item.width, promptWidth(ASSETS, 'mouse', item.action, item.label));
  }
  // sin superposiciones y todo dentro de la pantalla
  for (let i = 1; i < hints.items.length; i++) {
    assert.ok(hints.items[i].rect.x >= hints.items[i - 1].rect.x + hints.items[i - 1].rect.w);
  }
  const last = hints.items[2].rect;
  assert.ok(last.x + last.w < 480);
});

test('hintLayout: el ancho depende del glifo del dispositivo', () => {
  const actions = [
    { action: 'interact', label: 'Elegir' },
    { action: 'back', label: 'Cerrar' },
  ];
  const wide = {
    font: ASSETS.font,
    buttonsData: { frames: { a: [0, 0, 20, 11], b: [0, 0, 20, 11], mouse: [0, 0, 11, 13] } },
  };
  const mouse = hintLayout(wide, 'mouse', actions);
  const pad = hintLayout(wide, 'pad', actions);
  assert.equal(mouse.items.length, pad.items.length);
  assert.equal(pad.items[0].width, mouse.items[0].width + 9);
  assert.ok(pad.total > mouse.total);
  assert.ok(pointInRect({ x: pad.items[0].x, y: pad.items[0].y }, pad.items[0].rect));
});

test('chestSlotRects: minimo cuatro slots centrados en el panel', () => {
  const four = chestSlotRects(0);
  assert.equal(four.length, 4);
  assert.deepEqual(four[0], { x: 194, y: 93, w: 20, h: 20 });
  assert.equal(four[3].x, 194 + 3 * 24);

  const six = chestSlotRects(6);
  assert.equal(six.length, 6);
  assert.equal(six[0].x, 170);
  assert.equal(six[5].x, 170 + 5 * 24);
  // los slots no se salen del panel (x 90..390)
  for (const rect of six) {
    assert.ok(rect.x >= 90 && rect.x + rect.w <= 390);
  }
});

test('Controles: sin E, Click para interactuar y volver', () => {
  assert.equal(CONTROLS_ROWS.length, 9);
  assert.equal(CONTROLS_ROWS[0][2], 'interact');
  assert.equal(CONTROLS_ROWS[1][2], 'back');
  for (const [, , action] of CONTROLS_ROWS) {
    const glyph = glyphName('keyboard', action);
    assert.ok(glyph, `accion sin glifo: ${action}`);
    assert.notEqual(glyph, 'key_e');
  }
  assert.equal(glyphName('keyboard', CONTROLS_ROWS[0][2]), 'mouse');
  assert.equal(glyphName('keyboard', CONTROLS_ROWS[1][2]), 'mouse');
});
