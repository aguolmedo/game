import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MIN_SPAWN_DIST, roundConfig, pickType, spawnPoint, nextSpawnDelay,
  romanTally, tallyText, TALLY_OVERLINE, waveSequence,
} from '../src/arena/waves.js';

test('roundConfig: fórmula de cantidad, vivos, vida y velocidad', () => {
  assert.equal(roundConfig(1).total, 10); // 6 + 4 + 0
  assert.equal(roundConfig(2).total, 15); // 6 + 8 + 1
  assert.equal(roundConfig(3).total, 21); // 6 + 12 + 3
  assert.equal(roundConfig(5).total, 34); // 6 + 20 + 8
  assert.equal(roundConfig(10).total, 79); // 6 + 40 + 33

  assert.equal(roundConfig(1).maxAlive, 10);
  assert.equal(roundConfig(2).maxAlive, 12);
  assert.equal(roundConfig(16).maxAlive, 40);
  assert.equal(roundConfig(40).maxAlive, 40);

  assert.ok(Math.abs(roundConfig(1).hpMul - 1) < 1e-9);
  assert.ok(Math.abs(roundConfig(3).hpMul - 1.36) < 1e-9);
  assert.ok(Math.abs(roundConfig(3).speedMul - 1.1) < 1e-9);
  assert.equal(roundConfig(15).speedMul, 1.7);
  assert.equal(roundConfig(40).speedMul, 1.7);
});

test('pickType: mezcla por ronda', () => {
  const rng = (value) => () => value;
  assert.equal(pickType(1, rng(0)), 'cascarudo');
  assert.equal(pickType(2, rng(0.99)), 'cascarudo');
  assert.equal(pickType(3, rng(0.1)), 'veloz');
  assert.equal(pickType(3, rng(0.3)), 'cascarudo');
  assert.equal(pickType(4, rng(0.2)), 'veloz');
  assert.equal(pickType(5, rng(0.05)), 'acorazado');
  assert.equal(pickType(5, rng(0.15)), 'veloz');
  assert.equal(pickType(5, rng(0.5)), 'cascarudo');
  assert.equal(pickType(20, rng(0.29)), 'acorazado');
  assert.equal(pickType(20, rng(0.31)), 'veloz');
});

test('spawnPoint: nunca cerca del jugador', () => {
  const player = { x: 0, feet: 0 };
  const spawns = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 200, y: 0 }];
  const picked = spawnPoint(() => 0, spawns, player);
  assert.equal(picked.x, 100);
  assert.ok(Math.hypot(picked.x - player.x, picked.y - player.feet) >= MIN_SPAWN_DIST);

  const allNear = [{ x: 0, y: 0 }, { x: 50, y: 0 }];
  assert.equal(spawnPoint(() => 0, allNear, player), null);
  assert.equal(spawnPoint(() => 0, [], player), null);
});

test('spawnPoint: acepta arrays y mide hasta los pies', () => {
  const spawns = [[10, 10], [300, 120]];
  const picked = spawnPoint(() => 0.99, spawns, { x: 0, feet: 0 });
  assert.deepEqual(picked, { x: 300, y: 120 });
});

test('nextSpawnDelay: entre 0.6 y 1.2 segundos', () => {
  assert.equal(nextSpawnDelay(() => 0), 0.6);
  assert.ok(Math.abs(nextSpawnDelay(() => 0.5) - 0.9) < 1e-9);
  assert.ok(nextSpawnDelay(() => 0.999) < 1.2);
  assert.ok(nextSpawnDelay(() => 0.999) > 1.19);
});

test('waveSequence: la misma semilla da la misma secuencia de apariciones', () => {
  const player = { x: 400, y: 300 };
  const spawns = Array.from({ length: 12 }, (_, i) => ({
    x: 800 + i * 40,
    y: i % 2 ? 120 : 480,
  }));
  const opts = { round: 5, spawns, player, count: 20 };
  const a = waveSequence(3455, opts);
  const b = waveSequence(3455, opts);
  assert.equal(a.length, 20);
  assert.deepEqual(a, b);
  assert.notDeepEqual(waveSequence(3456, opts), a);

  for (const entry of a) {
    assert.ok(['cascarudo', 'veloz', 'acorazado'].includes(entry.type), entry.type);
    assert.equal(typeof entry.x, 'number');
    assert.equal(typeof entry.y, 'number');
    assert.ok(entry.delay >= 0.6 && entry.delay <= 1.2, `demora ${entry.delay}`);
  }
});

test('palotes: texto y datos para el HUD', () => {
  assert.equal(romanTally(0), '');
  assert.equal(romanTally(1), 'I');
  assert.equal(romanTally(4), 'IIII');
  assert.equal(romanTally(5), `IIII${TALLY_OVERLINE}`);
  assert.equal(romanTally(6), `IIII${TALLY_OVERLINE}I`);
  assert.equal(romanTally(12), `IIII${TALLY_OVERLINE}IIII${TALLY_OVERLINE}II`);
  assert.deepEqual(tallyText(4), { full: 0, rest: 4 });
  assert.deepEqual(tallyText(5), { full: 1, rest: 0 });
  assert.deepEqual(tallyText(12), { full: 2, rest: 2 });
  assert.deepEqual(tallyText(0), { full: 0, rest: 0 });
});
