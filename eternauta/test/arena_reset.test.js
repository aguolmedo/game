import test from 'node:test';
import assert from 'node:assert/strict';
import { purgeArena, clearEnemyEntities, clearFxEntities } from '../src/arena/reset.js';
import { resetShootingFx } from '../src/arena/feedback.js';

function fakeScene() {
  return {
    removed: [],
    remove(x) { this.removed.push(x); },
  };
}

function makeEnemy(name) {
  return { name, vis: { mesh: { id: `${name}.mesh` }, shadow: { id: `${name}.shadow` } } };
}

test('reset: purgeArena limpia enemigos, fx y sistemas', () => {
  const calls = { shooting: 0, footprints: 0, snow: 0 };
  const alive1 = makeEnemy('alive1');
  const dead2 = makeEnemy('dead2');
  const alive3 = makeEnemy('alive3');
  const enemies = [alive1, dead2, alive3];
  const fxItems = [{ mesh: { id: 'fx1' } }, { mesh: { id: 'fx2' } }, { mesh: { id: 'fx3' } }];
  const fx = [...fxItems];
  const arena = {
    scene: fakeScene(),
    enemies,
    fx,
    shooting: { reset() { calls.shooting += 1; } },
    footprints: { reset() { calls.footprints += 1; } },
    snow: { scatter() { calls.snow += 1; } },
  };

  const result = purgeArena(arena);

  assert.equal(enemies.length, 0);
  assert.equal(fx.length, 0);
  assert.deepEqual(result, { enemies: 3, fx: 3 });

  // 6 mallas de enemigo (mesh + shadow) + 3 mallas de fx.
  assert.equal(arena.scene.removed.length, 9);
  for (const e of [alive1, dead2, alive3]) {
    assert.equal(e.vis, null);
  }
  const removedIds = arena.scene.removed.map((m) => m.id);
  assert.deepEqual(removedIds.sort(), [
    'alive1.mesh', 'alive1.shadow', 'alive3.mesh', 'alive3.shadow',
    'dead2.mesh', 'dead2.shadow', 'fx1', 'fx2', 'fx3',
  ]);
  assert.deepEqual(calls, { shooting: 1, footprints: 1, snow: 1 });
});

test('reset: purgeArena tolera enemigos sin vis y sin sistemas', () => {
  const scene = fakeScene();
  const lonely = { vis: null };
  const arena = { scene, enemies: [lonely, {}], fx: [] };
  const result = purgeArena(arena);
  assert.deepEqual(result, { enemies: 0, fx: 0 });
  assert.equal(arena.enemies.length, 0);
  assert.equal(scene.removed.length, 0);
});

test('reset: clearEnemyEntities saca mesh y shadow y vacía la lista', () => {
  const scene = fakeScene();
  const list = [{ vis: null }, makeEnemy('a')];
  const removed = clearEnemyEntities(scene, list);
  assert.equal(removed, 1);
  assert.equal(list.length, 0);
  assert.deepEqual(scene.removed.map((m) => m.id), ['a.mesh', 'a.shadow']);
});

test('reset: clearFxEntities ignora items sin mesh', () => {
  const scene = fakeScene();
  const list = [{ mesh: { id: 'x' } }, {}, null, { mesh: { id: 'y' } }];
  const removed = clearFxEntities(scene, list);
  assert.equal(removed, 2);
  assert.equal(list.length, 0);
  assert.deepEqual(scene.removed.map((m) => m.id), ['x', 'y']);
});

test('reset: resetShootingFx vacía y devuelve todo a cero', () => {
  const flash = {};
  const click = {};
  const bolt = {};
  const fx = {
    bullets: [{ sprite: 1 }, { sprite: 2 }],
    casings: [{ sprite: 3 }],
    particles: [{ sprite: 4 }],
    slides: [{}],
    flash,
    click,
    bolt,
    trailDots: [1],
    shakeT: 1,
    shakeAmp: 2,
    hitStop: 3,
    lightT: 4,
    dropped: [],
    dropBullet(b) { this.dropped.push(b); },
    dropSprite(s) { this.dropped.push(s); },
  };

  resetShootingFx(fx);

  assert.deepEqual(fx.bullets, []);
  assert.deepEqual(fx.casings, []);
  assert.deepEqual(fx.particles, []);
  assert.deepEqual(fx.slides, []);
  assert.deepEqual(fx.trailDots, []);
  assert.equal(fx.flash, null);
  assert.equal(fx.click, null);
  assert.equal(fx.bolt, null);
  assert.equal(fx.shakeT, 0);
  assert.equal(fx.shakeAmp, 0);
  assert.equal(fx.hitStop, 0);
  assert.equal(fx.lightT, 0);
  // 2 balas por dropBullet + 5 sprites (vaina, partícula, flash, click, bolt).
  assert.deepEqual(fx.dropped, [{ sprite: 1 }, { sprite: 2 }, 3, { sprite: 4 }, flash, click, bolt]);
});
