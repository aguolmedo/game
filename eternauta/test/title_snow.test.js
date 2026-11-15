import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceFlake, layerSpecs } from '../src/titleSnow.js';

const flake = (extra = {}) => ({ x: 100, y: 100, speed: 10, sway: 0, phase: 0, ...extra });

test('advanceFlake baja en y y reengancha arriba', () => {
  const f = flake({ speed: 10 });
  advanceFlake(f, 0.5, 0, 0, 480, 270);
  assert.equal(f.y, 105);

  // por debajo de height+2 el copo reaparece arriba
  const top = flake({ y: 280 });
  advanceFlake(top, 0.1, 0, 0, 480, 270);
  assert.equal(top.y, -2);
});

test('advanceFlake envuelve en x por los dos lados con width+8', () => {
  const left = flake({ x: -5 });
  advanceFlake(left, 0, 0, 0, 480, 270);
  assert.equal(left.x, 483);

  const right = flake({ x: 485 });
  advanceFlake(right, 0, 0, 0, 480, 270);
  assert.equal(right.x, -3);
});

test('layerSpecs devuelve far/mid/near con velocidades crecientes', () => {
  const specs = layerSpecs();
  assert.equal(specs.length, 3);
  assert.deepEqual(specs.map((s) => s.name), ['far', 'mid', 'near']);
  assert.deepEqual(specs.map((s) => s.count), [40, 26, 14]);
  assert.ok(specs[0].speed < specs[1].speed);
  assert.ok(specs[1].speed < specs[2].speed);
  assert.deepEqual(specs.map((s) => s.speed), [8, 16, 26]);
});
