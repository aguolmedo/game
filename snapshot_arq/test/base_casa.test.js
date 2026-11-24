import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { garage } from '../src/maps/garage.js';
import { botinPlate, BOTIN_PLATE, VIEW_W } from '../src/hud.js';
import { BASE_LABELS, baseLabelRects } from '../src/scenes/garage.js';
import { measureText } from '../src/font.js';
import { LOOT_KINDS } from '../src/run/loot.js';

const font = JSON.parse(
  fs.readFileSync(new URL('../public/assets/font.json', import.meta.url), 'utf8'),
);
const measure = (text) => measureText(font.glyphs, text);
const CAM = { x: 0, y: 0 };

test('el garaje de la base tiene las tres estaciones y la radio', () => {
  const npcs = garage.npcs;
  assert.equal(npcs.length, 3);
  const byId = Object.fromEntries(npcs.map((n) => [n.id, n]));
  assert.equal(byId.favalli.baseAction.station, 'favalli');
  assert.equal(byId.elena.baseAction.station, 'elena');
  assert.equal(byId.lucas.baseAction.station, 'lucas');
  for (const npc of npcs) {
    assert.equal(npc.showIfFlag, 'base');
    assert.equal(npc.baseAction.label, 'Mejoras');
  }
  const radio = garage.objects.find((o) => o.id === 'base_radio');
  assert.ok(radio, 'falta la radio sobre las cajas');
  assert.equal(radio.sprite, 'radio');
  assert.equal(radio.baseAction.kind, 'radio');
  assert.equal(radio.baseAction.label, 'Escuchar la radio');
  assert.equal(radio.showIfFlag, 'base');
  const gen = garage.objects.find((o) => o.id === 'generator');
  assert.equal(gen.baseAction.station, 'luz');
});

test('el portón del garaje es la salida del loop', () => {
  const warp = garage.warps.find((w) => w.id === 'garage_door');
  assert.equal(warp.baseExit, true);
  assert.equal(warp.needsSuit, true);
  assert.equal(warp.needsFlag, 'listo_para_salir');
});

test('los cartelitos de la base son cuatro y entran en el mapa', () => {
  assert.equal(BASE_LABELS.length, 4);
  const texts = BASE_LABELS.map((l) => l.text);
  assert.deepEqual(texts, [
    'Favalli: el rifle', 'Elena: el traje', 'Lucas: la radio', 'Electrógeno: luz',
  ]);
  for (const label of BASE_LABELS) {
    assert.ok(label.x > 0 && label.x < garage.cols * 16, `x fuera: ${label.x}`);
    assert.ok(label.y > 0 && label.y < garage.rows * 16, `y fuera: ${label.y}`);
  }
});

test('la plaquita de botín muestra los cuatro tipos y sus cantidades', () => {
  const plate = botinPlate({ chatarra: 5, goma: 1, nafta: 0, pieza: 2 });
  assert.ok(plate);
  assert.equal(plate.items.length, 4);
  assert.deepEqual(plate.items.map((i) => i.kind), LOOT_KINDS);
  assert.deepEqual(plate.items.map((i) => i.n), [5, 1, 0, 2]);
  assert.deepEqual(plate.items.map((i) => i.item),
    ['chatarra', 'goma', 'nafta', 'pieza_cascarudo']);
  assert.equal(plate.x, VIEW_W - 6 - BOTIN_PLATE.w);
  assert.ok(plate.x > 0 && plate.x + plate.w <= VIEW_W);
  assert.ok(plate.x > 200, 'la plaquita va arriba a la derecha');
  for (const item of plate.items) {
    assert.ok(item.x >= plate.x && item.x + 12 <= plate.x + plate.w);
  }
  // Sin botin (modo historia) no hay plaquita.
  assert.equal(botinPlate(null), null);
  assert.equal(botinPlate(undefined), null);
});

// Solapamiento estricto en x e y (px de vista): cualquier intersección real
// positiva cuenta. El juego usa zoom 1,5 (960x540) y 2 (ventanas grandes);
// a zoom 1 la vista es tan chica que los carteles de UI no entran sin pisarse.
const ZOOMS = [2, 1.5];

function overlap(a, b) {
  return {
    x: Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x),
    y: Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y),
  };
}

function overlaps(a, b) {
  const o = overlap(a, b);
  return o.x > 0 && o.y > 0;
}

function npcViewBox(npc, zoom = 1.5, cam = CAM) {
  return {
    x: (npc.x - 8 - cam.x) * zoom,
    y: (npc.feet - 32 - cam.y) * zoom,
    w: 16 * zoom,
    h: 32 * zoom,
  };
}

test('cada cartel quedó debajo (o al costado) de su estación', () => {
  const at = Object.fromEntries(BASE_LABELS.map((l) => [l.text, l]));
  assert.deepEqual(
    { x: at['Favalli: el rifle'].x, y: at['Favalli: el rifle'].y },
    { x: 56, y: 86 },
  );
  assert.deepEqual(
    { x: at['Elena: el traje'].x, y: at['Elena: el traje'].y },
    { x: 184, y: 140 },
  );
  assert.deepEqual(
    { x: at['Lucas: la radio'].x, y: at['Lucas: la radio'].y },
    { x: 246, y: 58 },
  );
  assert.deepEqual(
    { x: at['Electrógeno: luz'].x, y: at['Electrógeno: luz'].y },
    { x: 226, y: 128 },
  );
});

test('baseLabelRects: ancho del texto, alto fijo y cámara/zoom en px de vista', () => {
  const rects = baseLabelRects(BASE_LABELS, measure, CAM, 1.5);
  assert.equal(rects.length, BASE_LABELS.length);
  for (let i = 0; i < rects.length; i++) {
    const label = BASE_LABELS[i];
    assert.equal(rects[i].w, measure(label.text) + 12);
    assert.equal(rects[i].h, 15);
    assert.equal(rects[i].x, label.x * 1.5 - rects[i].w / 2);
    assert.equal(rects[i].y, label.y * 1.5 - 15);
  }
  const moved = baseLabelRects(BASE_LABELS, measure, { x: 10, y: 20 }, 2);
  assert.equal(moved[0].x, (56 - 10) * 2 - moved[0].w / 2);
  assert.equal(moved[0].y, (86 - 20) * 2 - 15);
});

test('los carteles no se pisan entre sí, con zoom 2 y 1.5', () => {
  for (const zoom of ZOOMS) {
    const rects = baseLabelRects(BASE_LABELS, measure, CAM, zoom);
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        assert.ok(
          !overlaps(rects[i], rects[j]),
          `se pisan "${BASE_LABELS[i].text}" y "${BASE_LABELS[j].text}" a zoom ${zoom}`,
        );
      }
    }
  }
});

test('ningún cartel tapa la caja de un NPC de la base', () => {
  for (const zoom of ZOOMS) {
    const rects = baseLabelRects(BASE_LABELS, measure, CAM, zoom);
    for (const npc of garage.npcs) {
      const box = npcViewBox(npc, zoom);
      for (let i = 0; i < rects.length; i++) {
        assert.ok(
          !overlaps(rects[i], box),
          `"${BASE_LABELS[i].text}" tapa la caja de ${npc.id} a zoom ${zoom}`,
        );
      }
    }
  }
  // El caso puntual: el cartel de Elena ya no le tapa la cabeza a Juan cuando
  // se para en su estación.
  const elena = garage.npcs.find((n) => n.id === 'elena');
  const elenaLabel = BASE_LABELS.findIndex((l) => l.text === 'Elena: el traje');
  for (const zoom of ZOOMS) {
    const rects = baseLabelRects(BASE_LABELS, measure, CAM, zoom);
    assert.ok(!overlaps(rects[elenaLabel], npcViewBox(elena, zoom)));
  }
});
