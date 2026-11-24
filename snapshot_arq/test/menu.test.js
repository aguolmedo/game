import test from 'node:test';
import assert from 'node:assert/strict';
import {
  Cursor,
  MENU_TABS,
  createMenu,
  gridMove,
  moveIndex,
  moveMenu,
  moveSlot,
  nextTab,
} from '../src/menu.js';

test('moveIndex envuelve con wrap', () => {
  assert.equal(moveIndex(0, 3, -1), 2);
  assert.equal(moveIndex(2, 3, 1), 0);
  assert.equal(moveIndex(1, 3, 5), 0);
  assert.equal(moveIndex(1, 3, -5), 2);
});

test('moveIndex limita sin wrap', () => {
  assert.equal(moveIndex(0, 3, -1, false), 0);
  assert.equal(moveIndex(2, 3, 1, false), 2);
  assert.equal(moveIndex(0, 3, 99, false), 2);
  assert.equal(moveIndex(2, 3, -99, false), 0);
});

test('moveIndex con lista vacía devuelve 0', () => {
  assert.equal(moveIndex(5, 0, 1), 0);
  assert.equal(moveIndex(0, 0, -1, false), 0);
});

test('createMenu y moveMenu no mutan', () => {
  const ids = ['a', 'b', 'c'];
  const menu = createMenu(ids);

  assert.deepEqual(menu, { ids: ['a', 'b', 'c'], index: 0 });
  assert.notEqual(menu.ids, ids);

  const moved = moveMenu(menu, -1);
  assert.equal(moved.index, 2);
  assert.deepEqual(menu.ids, ['a', 'b', 'c']);
  assert.equal(menu.index, 0);
  assert.notEqual(moved.ids, menu.ids);
});

test('nextTab envuelve las pestañas', () => {
  assert.equal(MENU_TABS.length, 3);
  assert.equal(nextTab(0, -1), 2);
  assert.equal(nextTab(2, 1), 0);
  assert.equal(nextTab(1, 1), 2);
});

test('moveSlot envuelve la grilla de slots', () => {
  assert.equal(moveSlot(0, -1, 8), 7);
  assert.equal(moveSlot(7, 1, 8), 0);
  assert.equal(moveSlot(0, 1), 1);
  assert.equal(moveSlot(0, -1), 7);
});

test('gridMove respeta filas y columnas y limita los bordes', () => {
  assert.equal(gridMove(0, 0, 1, 4, 8), 4);
  assert.equal(gridMove(0, 0, -1, 4, 8), 0);
  assert.equal(gridMove(0, -1, 0, 4, 8), 0);
  assert.equal(gridMove(3, 1, 0, 4, 8), 3);
  assert.equal(gridMove(4, 0, 1, 4, 8), 4);
  assert.equal(gridMove(5, 1, 0, 4, 6), 5);
  assert.equal(gridMove(2, 0, 1, 4, 6), 5);
  assert.equal(gridMove(1, 1, 0, 1, 3), 1, 'una columna no se mueve en horizontal');
});

test('Cursor: primer movimiento inmediato y repetición con delay', () => {
  const cursor = new Cursor(4, { repeat: 0.2 });

  assert.deepEqual(cursor.update(0.016, { x: 0, y: 1 }), { index: 1, moved: true });

  // Todavía no pasó el delay: no repite.
  assert.deepEqual(cursor.update(0.1, { x: 0, y: 1 }), { index: 1, moved: false });
  // A los 0.2 s acumulados, repite.
  assert.deepEqual(cursor.update(0.1, { x: 0, y: 1 }), { index: 2, moved: true });
  // Otro delay completo.
  assert.deepEqual(cursor.update(0.2, { x: 0, y: 1 }), { index: 3, moved: true });
  // Borde inferior: no hay movimiento.
  assert.deepEqual(cursor.update(0.2, { x: 0, y: 1 }), { index: 3, moved: false });
});

test('Cursor: soltar la dirección resetea el delay', () => {
  const cursor = new Cursor(4, { repeat: 0.2 });

  cursor.update(0.016, { x: 0, y: 1 });
  cursor.update(0.1, { x: 0, y: 1 });

  assert.deepEqual(cursor.update(0.1, { x: 0, y: 0 }), { index: 1, moved: false });
  // Al volver a empujar, el primer paso es inmediato otra vez.
  assert.deepEqual(cursor.update(0.01, { x: 0, y: 1 }), { index: 2, moved: true });
});

test('Cursor: cambia de dirección y se mueve en grilla', () => {
  const cursor = new Cursor(6, { columns: 3, repeat: 0.2 });

  assert.deepEqual(cursor.update(0.016, { x: 1, y: 0 }), { index: 1, moved: true });
  assert.deepEqual(cursor.update(0.016, { x: 0, y: 1 }), { index: 4, moved: true });
  assert.deepEqual(cursor.update(0.016, { x: -1, y: 0 }), { index: 3, moved: true });
  assert.deepEqual(cursor.update(0.016, { x: 0, y: -1 }), { index: 0, moved: true });
});

test('Cursor: usa el eje dominante del stick e ignora la deadzone', () => {
  const cursor = new Cursor(6, { columns: 3 });

  assert.deepEqual(cursor.update(0.016, { x: 0.1, y: 0.1 }), { index: 0, moved: false });
  assert.deepEqual(cursor.update(0.016, { x: 0.9, y: 0.2 }), { index: 1, moved: true });
  assert.deepEqual(cursor.update(0.016, { x: 0.2, y: 0.9 }), { index: 4, moved: true });
});

test('Cursor: setLength ajusta el índice y reinicia el estado', () => {
  const cursor = new Cursor(5);

  cursor.update(0.016, { x: 0, y: 1 });
  cursor.update(0.3, { x: 0, y: 1 });
  assert.equal(cursor.index, 2);

  cursor.setLength(2);
  assert.equal(cursor.index, 1);

  cursor.setLength(0);
  assert.equal(cursor.index, 0);
  assert.deepEqual(cursor.update(0.016, { x: 0, y: 1 }), { index: 0, moved: false });
});
