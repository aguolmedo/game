// Reglas de la planta baja (house): integridad del mapa y que los muebles no
// tapen pasos. No fija posiciones en píxeles: eso lo decide el diseño y cambia.
import test from 'node:test';
import assert from 'node:assert/strict';
import { house } from '../../src/maps/house.js';
import { LOOK_LINES } from '../../src/data/descriptions.js';
import { TALK } from '../../src/data/script.js';
import { footBox, overlaps } from '../../src/movement.js';

const obj = (id) => house.objects.find((o) => o.id === id);

function solidRects() {
  return house.objects.filter((o) => o.solid).map((o) => {
    const s = o.solid === true ? { x: 0, y: 0, w: o.tw, h: o.th } : o.solid;
    return { id: o.id, x: (o.x + s.x) * 16, y: (o.y + s.y) * 16, w: s.w * 16, h: s.h * 16 };
  });
}

test('casa: ids únicos de objetos', () => {
  assert.equal(new Set(house.objects.map((o) => o.id)).size, house.objects.length);
});

test('casa: la ventana de Martita es un dispositivo abrible registrado como ventana', () => {
  const win = obj('window_martita');
  assert.ok(win, 'falta window_martita');
  assert.equal(win.type, 'device');
  assert.equal(win.window.openable, true);
  assert.equal(typeof win.device.state, 'function');
  assert.ok(house.windows.some((w) => w.id === 'window_martita' && w.openable));
  assert.equal(obj('snow_drift').hideIfFlag, 'closed_window_martita');
});

test('casa: los objetos con texto de Mirar/Hablar lo tienen definido', () => {
  for (const key of ['kid_drawing', 'wedding_photo', 'sink', 'stairs_up']) {
    assert.ok(LOOK_LINES[key], `falta LOOK_LINES.${key}`);
  }
  for (const key of ['kid_drawing', 'wedding_photo', 'sink']) {
    assert.equal(typeof TALK[key], 'function', `falta TALK.${key}`);
  }
  assert.ok(house.warps.find((w) => w.id === 'stairs_up').look);
});

test('casa: la escalera al altillo es un warp que cubre su objeto (clickeable entero)', () => {
  const stairs = obj('stairs_up');
  const warp = house.warps.find((w) => w.id === 'stairs_up');
  assert.equal(stairs.solid, false);
  assert.ok(warp.x <= stairs.x * 16 && warp.x + warp.w >= (stairs.x + stairs.tw) * 16);
  assert.ok(warp.y <= stairs.y * 16 && warp.y + warp.h >= (stairs.y + stairs.th) * 16);
});

test('casa: los sólidos no tapan los vanos del hall ni el paso a la entrada del garaje', () => {
  const solids = solidRects();
  const doors = [
    { x: 12 * 16, y: 5 * 16, w: 16, h: 32 },   // living-hall
    { x: 18 * 16, y: 6 * 16, w: 16, h: 32 },   // hall-garaje
    { x: 22 * 16, y: 3 * 16, w: 32, h: 5 * 16 }, // acceso a la puerta del garaje
  ];
  for (const door of doors) {
    for (const s of solids) {
      assert.ok(!overlaps(door, s), `${s.id} tapa el paso en ${door.x / 16},${door.y / 16}`);
    }
  }
});

test('casa: queda lugar para pararse junto a la rueda de la entrada', () => {
  const tire = obj('entry_tire');
  const near = footBox(tire.x * 16 + 20, (tire.y + tire.th) * 16 + 10);
  assert.ok(!solidRects().some((s) => overlaps(near, s)), 'sin lugar junto a la rueda');
});
