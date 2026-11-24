// PI-1: ciclo del pucho de Lucas y respiración de la brasa del cenicero.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emberK, breathK, PUCHO, CANDLE_COL, EMBER_COL, BULB_COL, APAGON_MAPS, buildApagon,
} from '../src/apagon.js';

test('apagón: el pucho de Lucas arranca dormido, se aviva y vuelve a 0', () => {
  assert.equal(emberK(0), 0);
  const total = PUCHO.reduce((sum, [, ms]) => sum + ms, 0) / 1000;
  const peak = PUCHO.findIndex(([k]) => k === 1);
  let start = 0;
  for (let i = 0; i < peak; i++) start += PUCHO[i][1];
  const k = emberK((start + 10) / 1000);
  assert.equal(k, 1);
  // Es periódico: el mismo instante del ciclo siguiente da lo mismo.
  assert.equal(emberK((start + 10) / 1000 + total), 1);
  assert.deepEqual(APAGON_MAPS.has('attic'), true);
  assert.equal(APAGON_MAPS.has('garage'), true);
});

test('apagón: la brasa del cenicero respira entre 0 y 1 cada 2 s', () => {
  const values = [];
  for (let i = 0; i <= 200; i++) values.push(breathK(i * 0.01));
  assert.ok(Math.min(...values) < 0.01);
  assert.ok(Math.max(...values) > 0.99);
  assert.ok(Math.abs(breathK(0) - breathK(2)) < 1e-9);
  assert.deepEqual(CANDLE_COL, [1.25, 1.06, 0.80]);
  assert.deepEqual(EMBER_COL, [1.22, 0.80, 0.58]);
});

// Objetos falsos con la forma que usa bounds(): sprite centrado en (x, y).
function fakeObj(id, x, y, w, h) {
  return { id, mesh: { position: { x, y }, geometry: { parameters: { width: w, height: h } } } };
}

function garageScene(flags = {}) {
  return {
    name: 'garage',
    t: 0,
    cam: { x: 0, y: 0 },
    game: { flags },
    mapData: {
      objects: [
        fakeObj('oil_lamp_bench', 24, 98, 10, 14),
        fakeObj('bulb', 150, 69, 8, 22),
        fakeObj('garage_door', 132, 51, 40, 38),
        fakeObj('extractor', 132, 20, 16, 20),
      ],
    },
  };
}

test('apagón: el garaje usa el pase y la lámpara del banco es la única luz', () => {
  const params = buildApagon(garageScene());
  assert.ok(params);
  // Vela sobre el banco del traje: sola, cálida y con llama.
  assert.equal(params.lights.length, 1);
  const lamp = params.lights[0];
  assert.equal(lamp.x, 24);
  assert.equal(lamp.y, 98 - 7 + 5);
  assert.deepEqual(lamp.col, CANDLE_COL);
  assert.ok(lamp.r >= 47 && lamp.r <= 53);
  assert.deepEqual(params.fx.find((f) => f.type === 'flame'), { type: 'flame', x: 24, y: 96 });
  // Puerta a la calle: rendija central + haz frío desde el umbral.
  assert.deepEqual(params.glass[0], { x0: 131, y0: 38, x1: 133, y1: 70 });
  assert.deepEqual(params.beams[0], { x0: 126, x1: 138, ytop: 70, L: 30 });
  // Extractor: el rect interior del sprite brilla cian.
  assert.deepEqual(params.glass[1], { x0: 127, y0: 13, x1: 137, y1: 27 });
  // En el garaje la nieve no brilla como en la calle.
  assert.equal(params.snowGlows, false);
  assert.equal(params.street, false);
});

test('apagón: la lamparita del garaje prende recién con el electrógeno', () => {
  const params = buildApagon(garageScene({ electrogeno_on: true }));
  assert.equal(params.lights.length, 2);
  const bulb = params.lights[1];
  assert.equal(bulb.x, 150);
  assert.equal(bulb.y, 76);                     // centro del vidrio de la lamparita
  assert.deepEqual(bulb.col, BULB_COL);         // [1.18, 1.10, 0.86]
  // Titila: el radio se mueve entre -2 y +3 px alrededor de 70.
  const radios = [];
  for (let i = 0; i < 10; i++) {
    radios.push(buildApagon({ ...garageScene({ electrogeno_on: true }), t: i * 0.15 }).lights[1].r);
  }
  assert.ok(Math.min(...radios) >= 68 && Math.max(...radios) <= 73);
  assert.ok(new Set(radios).size > 1);
});
