// Brief v4 (19/11): living rearmado, entrada del garaje despejada y escalera 32x64.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { house } from '../src/maps/house.js';
import { footBox, overlaps } from '../src/movement.js';

const read = (name) => JSON.parse(
  fs.readFileSync(new URL(`../public/assets/${name}`, import.meta.url), 'utf8'),
);
const obj = (id) => house.objects.find((o) => o.id === id);

/** Esquina inferior izquierda del sprite dibujado, como la calcula mapView. */
function spriteCorner(o, sheet = 'objects') {
  const [, , w, h] = read(`${sheet}.json`).frames[o.sprite];
  const [ox, oy] = o.offset || [0, 0];
  const left = Math.round((o.x + o.tw / 2) * 16 + ox - w / 2);
  const base = Math.round((o.y + o.th) * 16 + oy);
  return [left, base];
}

test('v4: sofá bajo la ventana, rueda y bidón al rincón de la entrada', () => {
  assert.deepEqual(spriteCorner(obj('sofa')), [88, 77]);
  assert.deepEqual(spriteCorner(obj('entry_tire'), 'objects'), [394, 142]);
  assert.deepEqual(spriteCorner(obj('bidon'), 'interior2'), [414, 141]);
  // Mismos comportamientos que antes, solo cambió el lugar.
  assert.deepEqual(obj('sofa').solid, { x: 0, y: 1, w: 3, h: 1 });
  assert.equal(obj('sofa').type, 'decor');
  assert.equal(obj('sofa').name, 'el sillón');
  assert.deepEqual(obj('entry_tire').solid, { x: 0, y: 0, w: 1, h: 1 });
  // Elena y la mesa ratona no se movieron.
  assert.deepEqual(house.npcs.find((n) => n.id === 'elena'),
    { id: 'elena', who: 'elena', type: 'person', name: 'Elena', x: 136, feet: 136, dir: 'down' });
  assert.deepEqual(spriteCorner(obj('living_table')), [104, 112]);
});

test('v4: stairs_attic mide 32x64 y llega al borde de arriba de la pared', () => {
  const [, , w, h] = read('objects.json').frames.stairs_attic;
  assert.deepEqual([w, h], [32, 64]);
  const stairs = obj('stairs_up');
  assert.deepEqual([stairs.y, stairs.th], [1, 4]);   // y 16..80: tope de la pared
  assert.equal(stairs.flat, true);
  assert.equal(stairs.solid, false);
  // El warp cubre la escalera entera (hover/click también arriba); su base no cambia.
  const warp = house.warps.find((x) => x.id === 'stairs_up');
  assert.deepEqual([warp.x, warp.y, warp.w, warp.h], [16, 16, 32, 64]);
  assert.equal(warp.y + warp.h, 80);
});

test('v4: los sólidos no tapan los vanos del hall ni el paso al garaje', () => {
  const solids = house.objects.filter((o) => o.solid).map((o) => {
    const s = o.solid === true ? { x: 0, y: 0, w: o.tw, h: o.th } : o.solid;
    return { id: o.id, x: (o.x + s.x) * 16, y: (o.y + s.y) * 16, w: s.w * 16, h: s.h * 16 };
  });
  // Vano living-hall (columna 12, filas 5-6) y hall-garaje (columna 18, filas 6-7).
  const doors = [
    { x: 12 * 16, y: 5 * 16, w: 16, h: 32 },
    { x: 18 * 16, y: 6 * 16, w: 16, h: 32 },
  ];
  for (const door of doors) {
    for (const s of solids) {
      assert.ok(!overlaps(door, s), `${s.id} tapa el vano en ${door.x / 16},${door.y / 16}`);
    }
  }
  // El jugador entra a la entrada del garaje y llega a la puerta (columna 22-24).
  const pass = { x: 22 * 16, y: 3 * 16, w: 32, h: 5 * 16 };
  for (const s of solids) {
    if (s.id === 'entry_tire') assert.ok(!overlaps(pass, s), 'la rueda tapa el paso');
  }
  // Un cuerpo parado frente a la rueda no queda encerrado: hay lugar alrededor.
  const near = footBox(404, 150);
  assert.ok(!solids.some((s) => overlaps(near, s)), 'sin lugar junto a la rueda');
});
