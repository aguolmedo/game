import test from 'node:test';
import assert from 'node:assert/strict';
import { Snowfall } from '../src/snow.js';

const TEX = {
  backOn: {}, backOff: {}, midOn: {}, midOff: {}, frontOn: {}, frontOff: {},
};
const scene = () => ({ add() {} });

test('Snowfall arma tres capas en z 6 / 6.5 / 8', () => {
  const s = new Snowfall(scene(), TEX, { count: 6, front: 2 });
  // count (6) + count/2 (3) + front (2) copos, dos meshes por copo
  assert.equal(s.flakes.length, 11);
  const zs = [...new Set(s.flakes.map((f) => f.on.position.z))].sort((a, b) => a - b);
  assert.deepEqual(zs, [6, 6.5, 8]);
});

test('update hace caer los copos y los reengancha arriba', () => {
  const s = new Snowfall(scene(), TEX, { count: 1, front: 0 });
  const f = s.flakes[0];
  f.x = 100;
  f.y = 100;
  s.update(0.5);
  assert.ok(f.y > 100);

  // por debajo de height+2 el copo reaparece arriba
  f.y = s.height + 3;
  s.update(0.001);
  assert.equal(f.y, -2);
});

test('los copos se dibujan en posiciones enteras y alternan on/off', () => {
  const s = new Snowfall(scene(), TEX, { count: 1, front: 0 });
  const f = s.flakes[0];
  f.x = 10.4;
  f.y = 20.6;
  s.draw();
  assert.equal(f.on.position.x, 10);
  assert.equal(f.on.position.y, 21);
  assert.equal(f.off.position.x, 10);
  assert.equal(f.off.position.y, 21);
  // fosforescencia: un mesh encendido y el otro apagado, nunca los dos
  assert.notEqual(f.on.visible, f.off.visible);
});
