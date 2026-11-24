import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { createEnemy, patchDrop } from '../src/arena/enemies.js';
import { pickType, spawnPoint, nextSpawnDelay } from '../src/arena/waves.js';
import { spreadAngle, createShot, ejectCasing } from '../src/arena/projectiles.js';
import { rumorFor, radioLine } from '../src/run/radio.js';
import { rngFromSeed } from '../src/run/rng.js';

const srcPath = (rel) => fileURLToPath(new URL(`../${rel}`, import.meta.url));

test('las funciones de lógica tiran si no reciben rng', () => {
  assert.throws(() => createEnemy('cascarudo', 0, 0), /createEnemy: falta rng/);
  assert.throws(() => patchDrop('cascarudo'), /patchDrop: falta rng/);
  assert.throws(() => pickType(1), /pickType: falta rng/);
  assert.throws(() => spawnPoint(), /spawnPoint: falta rng/);
  assert.throws(() => nextSpawnDelay(), /nextSpawnDelay: falta rng/);
  assert.throws(() => spreadAngle(true), /spreadAngle: falta rng/);
  assert.throws(() => createShot({ x: 0, y: 0 }, { x: 1, y: 0 }), /createShot: falta rng/);
  assert.throws(() => ejectCasing({ x: 0, y: 0 }, { x: 1, y: 0 }), /ejectCasing: falta rng/);
  assert.throws(() => rumorFor([]), /rumorFor: falta rng/);
  assert.throws(() => radioLine(0), /radioLine: falta rng/);
});

test('misma semilla: misma secuencia de pickType/spawnPoint/createEnemy', () => {
  const player = { x: 400, feet: 300 };
  const spawns = Array.from({ length: 12 }, (_, i) => ({
    x: 100 + i * 90,
    y: i % 2 ? 120 : 500,
  }));
  const sim = (seed) => {
    const rng = rngFromSeed(seed);
    const out = [];
    for (let i = 0; i < 20; i++) {
      const type = pickType(3, rng);
      const point = spawnPoint(rng, spawns, player) || { x: 0, y: 0 };
      const enemy = createEnemy(type, point.x, point.y, rng);
      out.push({
        type,
        x: point.x,
        y: point.y,
        animT: enemy.animT,
        seed: enemy.seed,
        delay: nextSpawnDelay(rng),
      });
    }
    return out;
  };
  assert.deepEqual(sim(1234), sim(1234));
  assert.notDeepEqual(sim(1234), sim(9999));
});

test('la lógica de juego no usa Math.random', () => {
  const files = [
    'src/arena/enemies.js',
    'src/arena/waves.js',
    'src/arena/projectiles.js',
    'src/arena/wavesScene.js',
    'src/arena/runSetup.js',
    'src/scenes/arena.js',
    'src/world/actions.js',
    ...fs.readdirSync(srcPath('src/run'))
      .filter((name) => name.endsWith('.js'))
      .map((name) => `src/run/${name}`),
  ];
  for (const file of files) {
    const source = fs.readFileSync(srcPath(file), 'utf8');
    assert.equal(
      /Math\.random/.test(source),
      false,
      `${file} usa Math.random (la lógica debe recibir un rng)`,
    );
  }
});
