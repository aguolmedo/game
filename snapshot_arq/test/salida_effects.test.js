// Efectos de mejoras, bengala y botella de nafta (src/arena/effectsRun.js).
import test from 'node:test';
import assert from 'node:assert/strict';

import { effects } from '../src/run/upgrades.js';
import {
  BENGALA_RADIUS, BENGALA_TIME, BENGALA_FACTOR,
  MOLOTOV_RADIUS, MOLOTOV_TIME, MOLOTOV_DPS, FAROL_RADIUS,
  runEffects, weaponOptions, integrityMax, enemyDistance,
  bengalaFactor, inFire, fireTicks, startBengala, startMolotov,
} from '../src/arena/effectsRun.js';

const near = (a, b) => Math.abs(a - b) < 1e-9;

test('constantes de la salida', () => {
  assert.equal(BENGALA_RADIUS, 64);
  assert.equal(BENGALA_TIME, 8);
  assert.equal(BENGALA_FACTOR, 0.5);
  assert.equal(MOLOTOV_RADIUS, 40);
  assert.equal(MOLOTOV_TIME, 5);
  assert.equal(MOLOTOV_DPS, 1);
  assert.equal(FAROL_RADIUS, 70);
});

test('runEffects es el alias de effects', () => {
  assert.deepEqual(runEffects({ mejoras: { favalli: 2, luz: 1 } }), effects({ mejoras: { favalli: 2, luz: 1 } }));
});

test('weaponOptions pasa las tres cosas del rifle', () => {
  const opts = weaponOptions(runEffects({ mejoras: { favalli: 3 } }));
  assert.equal(opts.fireRate, 0.45);
  assert.equal(opts.magSize, 8);
  assert.equal(opts.pierceDamage, 1);
  assert.deepEqual(Object.keys(opts).sort(), ['fireRate', 'magSize', 'pierceDamage']);

  const base = weaponOptions(effects({}));
  assert.equal(base.fireRate, 0.55);
  assert.equal(base.magSize, 5);
  assert.equal(base.pierceDamage, 0.5);
});

test('integrityMax con elena 1 da 4 y por defecto 3', () => {
  assert.equal(integrityMax(runEffects({ mejoras: { elena: 1 } })), 4);
  assert.equal(integrityMax(effects({})), 3);
  assert.equal(integrityMax(undefined), 3);
  assert.equal(integrityMax({}), 3);
  assert.equal(integrityMax({ integrityMax: 0 }), 1);
  assert.equal(integrityMax({ integrityMax: -2 }), 1);
});

test('enemyDistance mide al centro del bicho', () => {
  const enemy = { x: 10, y: 100, h: 20 }; // centro en (10, 90)
  assert.equal(enemyDistance(enemy, { x: 10, y: 90 }), 0);
  assert.equal(enemyDistance(enemy, { x: 13, y: 94 }), 5);
  assert.equal(enemyDistance(enemy, { x: 10, y: 100 }), 10);
});

test('bengalaFactor: 0,5 adentro del radio y 1 afuera o apagada', () => {
  const enemy = { x: 0, y: 0, h: 0 };
  assert.equal(bengalaFactor(enemy, { x: 63.9, y: 0, t: 1 }), 0.5);
  assert.equal(bengalaFactor(enemy, { x: 64, y: 0, t: 1 }), 1);
  assert.equal(bengalaFactor(enemy, { x: 0, y: 200, t: 1 }), 1);
  assert.equal(bengalaFactor(enemy, null), 1);
  assert.equal(bengalaFactor(enemy, { x: 0, y: 0, t: 0 }), 1);
  assert.equal(bengalaFactor(enemy, { x: 0, y: 0, t: -1 }), 1);
});

test('bengalaFactor toma el centro del bicho, no los pies', () => {
  const enemy = { x: 0, y: 100, h: 20 }; // centro y 90; pies y 100
  assert.equal(bengalaFactor(enemy, { x: 0, y: 30, t: 1 }), 0.5); // 60 al centro
  assert.equal(bengalaFactor(enemy, { x: 0, y: 20, t: 1 }), 1); // 70 al centro
});

test('inFire mira el radio de 40 al centro', () => {
  const enemy = { x: 0, y: 0, h: 0 };
  assert.equal(inFire(enemy, { x: 40, y: 0, t: 1 }), true);
  assert.equal(inFire(enemy, { x: 40.1, y: 0, t: 1 }), false);
  assert.equal(inFire(enemy, { x: 0, y: 100, t: 1 }), false);
  assert.equal(inFire(enemy, null), false);
  // centro en y 90: 131 - 90 = 41 afuera (con los pies serían 31)
  assert.equal(inFire({ x: 0, y: 100, h: 20 }, { x: 0, y: 131, t: 1 }), false);
  assert.equal(inFire({ x: 0, y: 100, h: 20 }, { x: 0, y: 130, t: 1 }), true);
});

test('fireTicks acumula y deja el resto en acc sin mutar fire', () => {
  const fire = { x: 0, y: 0, t: 5, acc: 0.5 };
  const r = fireTicks(fire, 0.6);
  assert.equal(r.ticks, 1);
  assert.ok(near(r.acc, 0.1), `acc ${r.acc}`);
  assert.equal(fire.acc, 0.5);

  assert.deepEqual(fireTicks({ acc: 0 }, 2.7), { acc: 0.7, ticks: 2 });
  assert.deepEqual(fireTicks({ acc: 0.9 }, 0.2), { acc: 0.1, ticks: 1 });
  assert.deepEqual(fireTicks({ acc: 0.5 }, 0), { acc: 0.5, ticks: 0 });
  assert.deepEqual(fireTicks({ acc: 0.5 }, -3), { acc: 0.5, ticks: 0 });
  assert.deepEqual(fireTicks({ acc: 0.5 }, NaN), { acc: 0.5, ticks: 0 });
  assert.deepEqual(fireTicks(undefined, 0.6), { acc: 0.6, ticks: 0 });
});

test('fireTicks tiene un tope razonable de ticks', () => {
  const capped = fireTicks({ acc: 0.5 }, 1000);
  assert.ok(capped.ticks <= 10, `ticks ${capped.ticks}`);
  assert.ok(capped.acc >= 0 && capped.acc < 1);
});

test('startBengala cae a los pies del jugador', () => {
  assert.deepEqual(startBengala({ x: 5, feet: 9 }), { x: 5, y: 9, t: BENGALA_TIME });
  assert.deepEqual(startBengala({ x: 5, y: 9 }), { x: 5, y: 9, t: 8 });
});

test('startMolotov vuela 48 px hacia donde apunta', () => {
  const wide = { minX: 0, maxX: 1000, minFeet: 0, maxFeet: 1000 };
  const right = startMolotov({ x: 100, feet: 100 }, { x: 300, y: 100 }, wide);
  assert.equal(right.x, 148);
  assert.equal(right.y, 100);
  assert.equal(right.t, MOLOTOV_TIME);
  assert.equal(right.acc, 0);

  const up = startMolotov({ x: 100, feet: 100 }, { x: 100, y: 0 }, wide);
  assert.equal(up.x, 100);
  assert.equal(up.y, 52);

  const diag = startMolotov({ x: 0, feet: 0 }, { x: 100, y: 100 }, wide);
  assert.ok(near(Math.hypot(diag.x, diag.y), 48));
});

test('startMolotov se recorta dentro de bounds', () => {
  const tight = { minX: 0, maxX: 120, minFeet: 0, maxFeet: 1000 };
  const der = startMolotov({ x: 100, feet: 100 }, { x: 900, y: 100 }, tight);
  assert.ok(der.x <= tight.maxX && der.x >= tight.minX);
  assert.equal(der.x, tight.maxX - 20); // queda el radio adentro

  const izq = startMolotov({ x: 5, feet: 100 }, { x: -900, y: 100 }, tight);
  assert.equal(izq.x, tight.minX + 20);

  const sinBounds = startMolotov({ x: 100, feet: 100 }, { x: 200, y: 100 }, null);
  assert.equal(sinBounds.x, 148);

  // bounds más angostos que el radio: al medio, nunca afuera
  const chico = { minX: 0, maxX: 10, minFeet: 0, maxFeet: 10 };
  const medio = startMolotov({ x: 100, feet: 100 }, { x: 900, y: 900 }, chico);
  assert.equal(medio.x, 5);
  assert.equal(medio.y, 5);
});
