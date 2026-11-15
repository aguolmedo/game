import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AMBIENT, lightsFor, lightOn, flickerAt, lightIntensity, sampleLight, LightOverlay,
} from '../src/lighting.js';

const MAP = {
  lights: [
    { x: 100, y: 100, radius: 60, color: '#ffcf6e', kind: 'electric', state: 'on' },
    { x: 200, y: 100, radius: 40, color: '#ffb040', kind: 'candle', flicker: 0.6 },
    { x: 300, y: 100, radius: 30, color: '#ffb040', kind: 'oil', onlyIn: 'apagon' },
    { x: 400, y: 100, radius: 30, color: '#ffcf6e', kind: 'bulb', state: 'off' },
    { x: 500, y: 100, radius: 80, color: '#96e1f0', kind: 'snow' },
  ],
};

test('el ambiente tiene los dos modos del diseño', () => {
  assert.equal(AMBIENT.electrica.color, '#2a1c18');
  assert.equal(AMBIENT.electrica.alpha, 0.10);
  assert.equal(AMBIENT.apagon.color, '#0e1228');
  assert.equal(AMBIENT.apagon.alpha, 0.62);
  assert.equal(AMBIENT.apagon.tint, '#96e1f0');
});

test('lightsFor filtra por estado y por modo', () => {
  const day = lightsFor(MAP, 'electrica');
  assert.deepEqual(day.map((l) => l.kind), ['electric', 'candle', 'snow']);
  const night = lightsFor(MAP, 'apagon');
  assert.deepEqual(night.map((l) => l.kind), ['candle', 'oil', 'snow']);
  // la luz eléctrica se apaga en el apagón
  assert.equal(lightOn(MAP.lights[0], 'apagon'), false);
  assert.equal(lightOn(MAP.lights[3], 'apagon'), false);
  assert.equal(lightOn(MAP.lights[2], 'electrica'), false);
  // mapa sin luces
  assert.deepEqual(lightsFor({}, 'apagon'), []);
});

test('sampleLight suma los charcos y satura en 1', () => {
  const inCenter = sampleLight(100, 100, MAP.lights);
  assert.equal(Math.round(inCenter * 100) / 100, 1);
  assert.equal(sampleLight(0, 0, MAP.lights), 0);
  const edge = sampleLight(160, 100, MAP.lights); // borde del radio 60
  assert.equal(edge, 0);
  const two = sampleLight(150, 100, [
    { x: 100, y: 100, radius: 100 },
    { x: 200, y: 100, radius: 100 },
  ]);
  assert.equal(two, 0.5); // 0.25 + 0.25
  const stacked = sampleLight(100, 100, [
    { x: 100, y: 100, radius: 100 },
    { x: 100, y: 100, radius: 100 },
    { x: 100, y: 100, radius: 100 },
  ]);
  assert.equal(stacked, 1); // satura
});

test('el parpadeo es determinístico y queda en rango', () => {
  const candle = MAP.lights[1];
  assert.equal(flickerAt(candle, 3.2), flickerAt(candle, 3.2));
  assert.notEqual(flickerAt(candle, 3.2), flickerAt(candle, 7.9));
  for (let t = 0; t < 20; t += 0.37) {
    const f = flickerAt(candle, t);
    assert.ok(f >= 0.6 && f <= 1.1, `fuera de rango en t=${t}: ${f}`);
  }
  // sin flicker no parpadea
  assert.equal(flickerAt({ flicker: 0 }, 5), 1);
  assert.equal(flickerAt({}, 5), 1);
  assert.equal(lightIntensity({ intensity: 0.5, flicker: 0 }, 5), 0.5);
});

function fakeCtx() {
  const ops = [];
  return {
    ops,
    canvas: { width: 480, height: 270 },
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillStyle: '',
    save() { ops.push('save'); },
    restore() { ops.push('restore'); },
    fillRect() { ops.push(`rect:${this.globalCompositeOperation}`); },
    beginPath() { ops.push('beginPath'); },
    arc() { ops.push('arc'); },
    fill() { ops.push(`fill:${this.globalCompositeOperation}`); },
    createRadialGradient() {
      ops.push('gradient');
      return { addColorStop() {} };
    },
  };
}

test('LightOverlay oscurece y abre charcos cálidos en el apagón', () => {
  const overlay = new LightOverlay({}, MAP);
  overlay.setCamera(0, 0);
  overlay.setMode('apagon');
  overlay.update(0.5);
  const ctx = fakeCtx();
  overlay.draw(ctx, 1.5);
  assert.equal(ctx.ops[0], 'save');
  assert.equal(ctx.ops[ctx.ops.length - 1], 'restore');
  assert.ok(ctx.ops.includes('gradient'));
  assert.ok(ctx.ops.includes('fill:destination-out'));
  assert.ok(ctx.ops.includes('fill:lighter'));
  // en apagón solo quedan las luces cálidas y la nieve
  assert.equal(overlay.lights(0).length, 3);

  overlay.setMode('electrica');
  assert.equal(overlay.lights(0).length, 3);
  const day = fakeCtx();
  overlay.draw(day, 0);
  assert.ok(!day.ops.includes('fill:destination-out'));
  overlay.setMode('cualquiera');
  assert.equal(overlay.mode, 'electrica');
});
