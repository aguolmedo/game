import test from 'node:test';
import assert from 'node:assert/strict';
import { createRunState } from '../../src/arena/runState.js';
import { setMode } from '../../src/arena/runMode.js';
import { roundStep } from '../../src/arena/roundSim.js';
import { roundConfig } from '../../src/arena/waves.js';
import { rngFromSeed } from '../../src/run/rng.js';

function simulate(seed, steps) {
  const state = createRunState({ roundRng: rngFromSeed(seed), cfg: roundConfig(1), bannerT: 1 });
  const scene = { state };
  const spawnedTypes = [];
  const alive = [];
  const env = {
    alive: () => alive.length,
    trySpawn(type) { alive.push(type); spawnedTypes.push(type); state.spawned += 1; },
    startRound() {
      setMode(scene, 'active');
      state.bannerT = 0; state.spawned = 0; state.spawnTimer = 0.4;
    },
    completeRound() {
      state.round += 1; state.cfg = roundConfig(state.round);
      setMode(scene, 'banner'); state.bannerT = 8; state.spawned = 0;
    },
  };
  for (let i = 0; i < steps; i++) {
    roundStep(state, 1 / 60, env);
    if (i % 20 === 0) alive.shift(); // "mata" un bicho cada tanto
  }
  const { roundRng, ...rest } = state;
  return JSON.stringify({ rest, spawnedTypes });
}

test('600 pasos con la misma semilla dan el mismo state final', () => {
  const a = simulate(1234, 600);
  const b = simulate(1234, 600);
  assert.equal(a, b);
  assert.ok(JSON.parse(a).spawnedTypes.length > 0, 'hubo apariciones');
});

test('otra semilla puede dar otra secuencia (el test no es trivial)', () => {
  assert.notEqual(simulate(1, 1200), simulate(999, 1200));
});

import { simulateStep } from '../../src/arena/simulate.js';
import { createWeapon } from '../../src/arena/weapon.js';
import { createPoints } from '../../src/arena/points.js';
import { createEnemy } from '../../src/arena/enemies.js';

function simulateCombat(seed, steps) {
  const rng = rngFromSeed(seed);
  const state = createRunState({
    mode: 'active',
    cfg: { total: 6, maxAlive: 3, hpMul: 1, speedMul: 1 },
    weapon: createWeapon({ infinite: true, reserve: 9999 }),
    points: createPoints(),
    integrity: 3, integrityMax: 3,
    roundRng: rngFromSeed(seed ^ 0x5eed),
    shotRng: rngFromSeed(seed ^ 0x5407),
    rng: rngFromSeed(seed ^ 0x77),
  });
  const player = { x: 200, feet: 200, moving: true };
  const env = {
    player,
    world: { isSolid: () => false, isOut: () => false, solids: [] },
    ctx: {
      player, arena: { minX: 0, maxX: 400, minY: 0, maxY: 400 }, solids: [],
      flows: null, bengala: null, steerOut: { x: 0, y: 0, dir: 'down' },
    },
    round: {
      alive: () => state.enemies.filter((e) => !e.dead).length,
      trySpawn(type) {
        state.enemies.push(createEnemy(type, 40 + rng() * 320, 40 + rng() * 320, state.roundRng));
        state.spawned += 1;
      },
      startRound() { state.mode = 'active'; },
      completeRound() { state.mode = 'banner'; state.bannerT = 99; },
    },
  };
  for (let i = 0; i < steps; i++) {
    const ang = i * 0.05;
    const inputs = { fire: i % 8 === 0, aim: { x: Math.cos(ang), y: Math.sin(ang) }, now: i / 60 };
    simulateStep(state, inputs, 1 / 60, env);
  }
  const { roundRng, shotRng, rng: r, ...rest } = state;
  return JSON.stringify(rest);
}

test('combate: 600 pasos con disparos (shotRng) y mordidas son deterministas', () => {
  const a = simulateCombat(42, 600);
  const b = simulateCombat(42, 600);
  assert.equal(a, b);
  const state = JSON.parse(a);
  assert.ok(state.points.score > 0 || state.integrity < 3, 'hubo combate');
});
