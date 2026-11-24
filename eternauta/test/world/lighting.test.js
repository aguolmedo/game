import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AMBIENT, lightsFor, lightOn, flickerAt, lightIntensity, sampleLight, LightOverlay,
  MAX_LIGHTS, prioritizeLights,
} from '../../src/lighting.js';

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
    translate() { ops.push('translate'); },
    scale() { ops.push('scale'); },
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

test('los gradientes radiales se cachean entre frames del mismo ctx', () => {
  const overlay = new LightOverlay({}, MAP);
  overlay.setCamera(0, 0);
  overlay.setMode('apagon');
  const ctx = fakeCtx();
  overlay.draw(ctx, 2.25);
  const first = ctx.ops.filter((op) => op === 'gradient').length;
  assert.ok(first > 0);
  // Los gradientes se dibujan centrados en (0,0) con translate.
  assert.ok(ctx.ops.includes('translate'));
  overlay.draw(ctx, 2.25);
  const second = ctx.ops.filter((op) => op === 'gradient').length - first;
  assert.equal(second, 0);
  // Un contexto distinto no reusa los gradientes del anterior.
  const other = fakeCtx();
  overlay.draw(other, 2.25);
  assert.ok(other.ops.filter((op) => op === 'gradient').length > 0);
});

test('prioritizeLights: conserva bengala y farol y descarta la nieve más lejana', () => {
  assert.equal(MAX_LIGHTS, 8);
  const origin = { x: 0, y: 0 };
  const snow = Array.from({ length: 8 }, (_, i) => ({
    x: 100 * (i + 1), y: 0, kind: 'snow', radius: 50,
  }));
  // Orden original: nieve intercalada con las dos luces que no son nieve.
  const lights = [
    snow[0], snow[1], { x: 10, y: 10, kind: 'ember' }, snow[2], snow[3],
    snow[4], snow[5], { x: 20, y: 20, kind: 'candle' }, snow[6], snow[7],
  ];
  const before = JSON.stringify(lights);

  const kept = prioritizeLights(lights, MAX_LIGHTS, origin);
  assert.equal(kept.length, 8);
  // Las dos no-nieve entran siempre.
  assert.ok(kept.includes(lights[2]));
  assert.ok(kept.includes(lights[7]));
  // Las dos de nieve más lejanas (800 y 700) quedan afuera.
  assert.ok(!kept.includes(snow[7]));
  assert.ok(!kept.includes(snow[6]));
  // Conserva el orden original.
  const expected = lights.filter((light) => !light || light !== snow[6] && light !== snow[7]);
  assert.deepEqual(kept, expected);
  // No muta la lista.
  assert.equal(JSON.stringify(lights), before);

  // Si entran todas, devuelve una copia.
  const few = lights.slice(0, 3);
  const copy = prioritizeLights(few, MAX_LIGHTS, null);
  assert.deepEqual(copy, few);
  assert.notEqual(copy, few);
  // Sin origin conserva las primeras luces de nieve.
  const onlySnow = prioritizeLights(snow, 3);
  assert.deepEqual(onlySnow, snow.slice(0, 3));
});

test('LightOverlay.lights prioriza la bengala sobre la nieve lejana y respeta el tope', () => {
  const lights = [];
  for (let i = 0; i < 8; i++) {
    lights.push({ x: 200 * (i + 1), y: 0, radius: 40, kind: 'snow' });
  }
  lights.push({ x: 300, y: 0, radius: 64, kind: 'ember', intensity: 1.35 });
  lights.push({ x: 1000, y: 0, radius: 60, kind: 'candle' });
  const overlay = new LightOverlay({}, { lights });
  overlay.setMode('apagon');
  const origin = { x: 300, y: 0 };

  const list = overlay.lights(0, origin);
  assert.ok(list.length <= MAX_LIGHTS);
  const kinds = list.map((entry) => entry.light.kind);
  assert.ok(kinds.includes('ember'));
  assert.ok(kinds.includes('candle'));
  // Con origin en el jugador, cerca de la bengala, las dos nieves más
  // lejanas quedan afuera del recorte.
  assert.equal(list.filter((entry) => entry.light.kind === 'snow').length, 6);
});
