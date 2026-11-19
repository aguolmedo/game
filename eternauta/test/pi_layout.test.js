// PI-6: invariantes del plano v3 de la planta baja y del objetivo de Martita.
import test from 'node:test';
import assert from 'node:assert/strict';
import { house } from '../src/maps/house.js';
import { LOOK_LINES } from '../src/data/descriptions.js';
import { TALK } from '../src/data/script.js';

const obj = (id) => house.objects.find((o) => o.id === id);

test('PI-6: la ventana de Martita vive en el muro del fondo y es el objetivo', () => {
  const win = obj('window_martita');
  assert.ok(win, 'falta window_martita');
  assert.equal(win.sprite, 'window_back');
  assert.deepEqual([win.x, win.y], [12, 15]);
  assert.equal(win.window.openable, true);
  assert.equal(win.type, 'device');
  assert.equal(win.name, 'la ventana');
  assert.equal(typeof win.device.state, 'function');
  const entry = house.windows.find((w) => w.id === 'window_martita');
  assert.deepEqual(entry, { id: 'window_martita', x: 208, y: 248, view: null, openable: true });
  const drift = obj('snow_drift');
  assert.equal(drift.hideIfFlag, 'closed_window_martita');
  assert.equal(house.camBottomPad, 17);
});

test('PI-6: muebles nuevos en su lugar y los viejos ya no están', () => {
  assert.equal(obj('crib'), undefined);
  assert.equal(obj('martita_crate'), undefined);
  assert.equal(obj('stairs_up').sprite, 'stairs_attic');
  assert.equal(obj('kid_bed').sprite, 'kid_bed');
  assert.equal(obj('kid_drawing').sprite, 'kid_drawing');
  assert.equal(obj('sink').sprite, 'sink');
  assert.equal(obj('wedding_photo').sprite, 'wedding_photo');
  assert.equal(obj('kchair_l').sprite, 'chair');
  assert.equal(obj('kchair_r').sprite, 'chair_r');
  // alacena corrida a la derecha de la puerta de la cocina
  assert.ok(obj('alacena').x * 16 >= 336, 'la alacena tapa la puerta');
  // 26 tiles de pared del fondo (x 16..432)
  const wall = house.objects.filter((o) => o.sprite === 'back_wall');
  assert.equal(wall.length, 26);
  assert.equal(new Set(house.objects.map((o) => o.id)).size, house.objects.length);
});

test('PI-6: los objetos nuevos tienen texto de Mirar', () => {
  for (const key of ['kid_drawing', 'wedding_photo', 'sink', 'stairs_up']) {
    assert.ok(LOOK_LINES[key], `falta LOOK_LINES.${key}`);
  }
  for (const key of ['kid_drawing', 'wedding_photo', 'sink']) {
    assert.equal(typeof TALK[key], 'function', `falta TALK.${key}`);
  }
  assert.equal(house.warps.find((w) => w.id === 'stairs_up').look,
    'La escalera rebatible que sube al altillo.');
});
