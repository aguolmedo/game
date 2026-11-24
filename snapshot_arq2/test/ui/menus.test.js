import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTROLS_ROWS, CONTROLS_HEADERS, TitleMenu, PauseMenu, ChestPanel,
  titleOptionRects, promptBox, hintLayout,
  pauseTabRects, pauseSlotRects, pauseRecipeRects, pauseOptionRects,
  pauseCraftButtonRect, PAUSE_BOX, chestBox, chestSlotRects,
  chestTitleRect,
} from '../../src/menus.js';
import { glyphName, promptWidth } from '../../src/glyphs.js';
import { pointInRect, hitIndex } from '../../src/uiHit.js';
import { ROW_H, ROW_Y } from '../../src/titleUi.js';
import { RECIPES } from '../../src/recipes.js';
import { MENU_TABS } from '../../src/menu.js';

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

test('pauseTabRects: tres tablitas clavadas arriba del cartel', () => {
  const rects = pauseTabRects();
  assert.equal(rects.length, MENU_TABS.length);
  assert.deepEqual(rects[0], { x: 82, y: 24, w: 100, h: 22 });
  assert.deepEqual(rects[1], { x: 190, y: 24, w: 100, h: 22 });
  assert.deepEqual(rects[2], { x: 298, y: 24, w: 100, h: 22 });
  // la elegida crece 3 px hacia arriba y queda pegada al cartel
  assert.deepEqual(pauseTabRects(2)[2], { x: 298, y: 21, w: 100, h: 25 });
});

test('pauseSlotRects: grilla 6x3 de 22 px dentro del cartel', () => {
  const rects = pauseSlotRects(18);
  assert.equal(rects.length, 18);
  assert.deepEqual(rects[0], { x: 70, y: 60, w: 22, h: 22 });
  assert.equal(rects[5].x, 70 + 5 * 25);
  assert.equal(rects[6].y, 60 + 25);
  assert.equal(rects[17].x, 70 + 5 * 25);
  assert.equal(rects[17].y, 60 + 2 * 25);
});

test('pauseRecipeRects y pauseOptionRects: filas clickeables', () => {
  const recipes = pauseRecipeRects();
  assert.equal(recipes.length, RECIPES.length);
  assert.deepEqual(recipes[0], { x: 68, y: 60, w: 344, h: 30 });

  const options = pauseOptionRects();
  assert.deepEqual(options, [
    { x: 92, y: 66, w: 296, h: 23 },
    { x: 92, y: 92, w: 296, h: 23 },
  ]);
});

test('los rects nuevos caen dentro del cartel (y las pestañas lo tocan)', () => {
  const B = PAUSE_BOX;
  const inside = (r) => r.x >= B.x && r.x + r.w <= B.x + B.w
    && r.y >= B.y && r.y + r.h <= B.y + B.h;
  for (const r of pauseSlotRects(18)) assert.ok(inside(r), 'casillero fuera del cartel');
  for (const r of pauseRecipeRects()) assert.ok(inside(r), 'receta fuera del cartel');
  for (const r of pauseOptionRects()) assert.ok(inside(r), 'opcion fuera del cartel');
  assert.ok(inside(pauseCraftButtonRect()), 'boton fuera del cartel');
  for (const r of pauseTabRects(1)) {
    assert.ok(r.x >= B.x && r.x + r.w <= B.x + B.w, 'pestaña fuera a los costados');
    assert.ok(r.y < B.y && r.y + r.h > B.y, 'la pestaña no toca el cartel');
  }
});

test('hintLayout: la caja Cerrar coincide con el prompt dibujado', () => {
  const actions = [
    { action: 'prev', label: 'Pestaña' },
    { action: 'interact', label: 'Fabricar' },
    { action: 'back', label: 'Cerrar' },
  ];
  const hints = hintLayout(ASSETS, 'mouse', actions);
  assert.equal(hints.items.length, 3);
  assert.equal(hints.y, 216);
  // la tablita termina justo en el borde derecho del cartel
  assert.equal(hints.x + hints.total, 428);
  for (const item of hints.items) {
    assert.equal(item.rect.x, item.x - 4);
    assert.equal(item.rect.y, item.y - 5);
    assert.equal(item.rect.w, item.width + 8);
    assert.equal(item.rect.h, 23);
    assert.equal(item.width, promptWidth(ASSETS, 'mouse', item.action, item.label));
  }
  // sin superposiciones y dentro de la pantalla
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

test('chestSlotRects: minimo cuatro casilleros de 22 px alineados a la izquierda', () => {
  const four = chestSlotRects(0);
  assert.equal(four.length, 4);
  assert.deepEqual(four[0], { x: 78, y: 67, w: 22, h: 22 });
  assert.equal(four[3].x, 78 + 3 * 25);

  const six = chestSlotRects(6);
  assert.equal(six.length, 6);
  assert.equal(six[0].x, 78);
  assert.equal(six[5].x, 78 + 5 * 25);
});

test('cofre: todos los rects de click caen dentro del cartel de madera', () => {
  const box = chestBox();
  const inside = (r) => r.x >= box.x && r.x + r.w <= box.x + box.w
    && r.y >= box.y && r.y + r.h <= box.y + box.h;
  for (const r of chestSlotRects(6)) assert.ok(inside(r), 'casillero fuera del cartel');
  // La tablita del titulo se apoya arriba y toca el cartel, como la pestaña.
  const title = chestTitleRect(ASSETS, 'Cajón de herramientas');
  assert.ok(title.x >= box.x && title.x + title.w <= box.x + box.w,
    'tablita fuera a los costados');
  assert.ok(title.y < box.y && title.y + title.h > box.y,
    'la tablita no toca el cartel');

  const panel = Object.create(ChestPanel.prototype);
  Object.assign(panel, { assets: ASSETS, container: { name: 'Cajón', items: [{ id: 'tiras', n: 3 }] } });
  for (const device of ['mouse', 'pad', 'keyboard']) {
    assert.ok(inside(panel.takeRect(device)), `Agarrar fuera (${device})`);
    assert.ok(inside(panel.closeRect(device)), `Cerrar fuera (${device})`);
  }
});

test('Controles: dos columnas (mouse + teclado / joystick) y seis verbos', () => {
  assert.equal(CONTROLS_ROWS.length, 6);
  assert.deepEqual(CONTROLS_ROWS.map((row) => row.action),
    ['interact', 'hands', 'move', 'item', 'bag', 'menu']);
  assert.deepEqual(CONTROLS_ROWS.map((row) => row.label),
    ['Hacer', 'Manos', 'Mover', 'Elegir ítem', 'Mochila', 'Menú']);
  for (const row of CONTROLS_ROWS) {
    assert.ok(Array.isArray(row.mouse) && row.mouse.length, `sin mouse: ${row.action}`);
    assert.ok(Array.isArray(row.pad) && row.pad.length, `sin mando: ${row.action}`);
    assert.ok(row.mouseLabel, `sin atajo de mouse: ${row.action}`);
    assert.ok(row.padLabel, `sin atajo de joystick: ${row.action}`);
  }
  // los glifos de cada fila son los de ACTIONS
  for (const row of CONTROLS_ROWS) {
    const mouse = glyphName('mouse', row.action);
    if (mouse) assert.ok(row.mouse.includes(mouse), `glifo de mouse distinto en ${row.action}`);
    const pad = glyphName('pad', row.action);
    if (pad) assert.ok(row.pad.includes(pad), `botón distinto en ${row.action}`);
  }
  // Dos botones: Hacer y Manos. Mirar y "Usar en mí" no son entradas.
  assert.equal(glyphName('mouse', 'interact'), 'mouse');
  assert.equal(glyphName('mouse', 'hands'), 'mouse_r');
  assert.equal(glyphName('pad', 'interact'), 'a');
  assert.equal(glyphName('pad', 'hands'), 'x');
  assert.equal(glyphName('mouse', 'look'), null);
  assert.equal(glyphName('pad', 'look'), null);
  assert.equal(CONTROLS_ROWS.find((r) => r.label === 'Mirar'), undefined);
  assert.equal(CONTROLS_ROWS.find((r) => r.label === 'Usar en mí'), undefined);
  assert.deepEqual(CONTROLS_HEADERS.map(([h]) => h),
    ['VERBO', 'MOUSE + TECLADO', 'JOYSTICK']);
});

