import test from 'node:test';
import assert from 'node:assert/strict';
import { hotbarLayout, hudBlocksPoint } from '../src/hud.js';

// Barra de pistas realista: abajo a la derecha, como la dibuja Hud.hintLayout.
const HINTS = [
  { x: 300, y: 219, w: 80, h: 17 },
  { x: 382, y: 219, w: 88, h: 17 },
];

test('hotbarLayout: 8 slots de 20 px y panel que los contiene', () => {
  const layout = hotbarLayout();
  assert.equal(layout.slots.length, 8);
  assert.equal(layout.slots[0].w, 20);
  assert.equal(layout.slots[1].x - layout.slots[0].x, 22);
  const panel = layout.panel;
  for (const slot of layout.slots) {
    assert.ok(slot.x >= panel.x && slot.x + slot.w <= panel.x + panel.w);
    assert.ok(slot.y >= panel.y && slot.y + slot.h <= panel.y + panel.h);
  }
  // El panel queda pegado al borde inferior de la vista (PI-5).
  assert.equal(panel.y + panel.h, 270);
});

test('hudBlocksPoint: la hotbar tapa el mundo', () => {
  const slot = hotbarLayout().slots[3];
  assert.equal(hudBlocksPoint({ x: slot.x + 2, y: slot.y + 5 }, HINTS), true);
});

test('hudBlocksPoint: los hints tapan, el resto del fondo no', () => {
  assert.equal(hudBlocksPoint({ x: 310, y: 225 }, HINTS), true);
  assert.equal(hudBlocksPoint({ x: 470, y: 100 }, HINTS), false);
});

test('hudBlocksPoint: el centro del cajon del altillo ya no queda bloqueado', () => {
  // El altillo se dibuja con camara (-64, -23): el cajon queda en view y=223.
  // Con el corte viejo (vy < 218) era inclickeable salvo una franja de 2 px.
  const crateCenter = { x: 88, y: 223 };
  assert.equal(hudBlocksPoint(crateCenter, HINTS), false);
  assert.equal(hudBlocksPoint(crateCenter, []), false);
});

test('hudBlocksPoint: sin punto no bloquea', () => {
  assert.equal(hudBlocksPoint(null, HINTS), false);
});
