// Salida por el portón de la casa (src/arena/exit.js).
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  EXIT_RADIUS, exitPoint, nearExit, homeResult, deathResult,
} from '../src/arena/exit.js';

const HOME = { x: 66, y: 496, w: 32, h: 20 }; // centro del borde de abajo: (82, 516)

test('EXIT_RADIUS y exitPoint', () => {
  assert.equal(EXIT_RADIUS, 26);
  assert.deepEqual(exitPoint(HOME), { x: 82, y: 516 });
  assert.deepEqual(exitPoint({ x: 0, y: 10, w: 10, h: 4 }), { x: 5, y: 14 });
});

test('nearExit: justo debajo del portón sí, lejos no', () => {
  assert.equal(nearExit(HOME, { x: 82, feet: 518 }), true); // 2 px
  assert.equal(nearExit(HOME, { x: 82, feet: 542 }), true); // 26 exactos
  assert.equal(nearExit(HOME, { x: 82, feet: 543 }), false); // 27
  assert.equal(nearExit(HOME, { x: 140, feet: 516 }), false);
  assert.equal(nearExit(HOME, { x: 82, feet: 516 }), true); // encima del vértice
});

test('nearExit acepta player.y si no hay feet y radio a medida', () => {
  assert.equal(nearExit(HOME, { x: 82, y: 518 }), true);
  assert.equal(nearExit(HOME, { x: 82, y: 518 }, 1), false); // 2 px > 1
  assert.equal(nearExit(HOME, { x: 82, y: 518 }, 2), true);
});

test('nearExit con datos nulos o raros da false', () => {
  assert.equal(nearExit(null, { x: 82, feet: 518 }), false);
  assert.equal(nearExit(HOME, null), false);
  assert.equal(nearExit(HOME, {}), false);
  assert.equal(nearExit(HOME, { x: 82, feet: NaN }), false);
});

test('homeResult y deathResult arman el payload exacto', () => {
  const bag = { chatarra: 3, goma: 1, nafta: 0, pieza: 2 };
  assert.deepEqual(homeResult({ bag, round: 4, points: 1200 }), {
    type: 'volvio', bag, round: 4, points: 1200,
  });
  assert.deepEqual(deathResult({ bag, round: 4, points: 1200 }), {
    type: 'murio', bag, round: 4, points: 1200,
  });
});
