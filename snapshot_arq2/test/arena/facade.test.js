// Contrato de ArenaScene hacia afuera: solo lo que usan main.js (contrato de
// escena), src/core (debugSnapshot) y tools/*.mjs (QA). Los módulos de
// src/arena/ son internos y se prueban por comportamiento en sus propios tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ArenaScene, makeArenaScene } from '../helpers/arena_scene.js';
import { ARENA } from '../../src/scenes/arena.js';

// Lo que llaman tools/*.mjs y src/core/debugApi.js sobre la escena.
const USED_BY_TOOLS = [
  'debugSnapshot', 'debugSetRound', 'tryFire', 'damageEnemy', 'spawnEnemy',
  'updateEnemyVisual', 'drawHud', 'die', 'openResult', 'pickResult', 'goHome',
  'bitBy', 'aliveCount', 'useBengala', 'useBotella', 'setupLoot', 'resetRun',
];

test('ArenaScene expone lo que usan las herramientas de QA y el debug', () => {
  for (const name of USED_BY_TOOLS) {
    assert.equal(typeof ArenaScene.prototype[name], 'function', `falta ${name}`);
  }
});

test('ArenaScene cumple el contrato de escena (blocksPause, dialog, choice) y ARENA', () => {
  const arena = makeArenaScene({ resultOpen: true, vignetteOpen: false });
  assert.equal(arena.blocksPause, true);
  assert.equal(arena.dialog.open, false);
  assert.equal(arena.choice.open, false);
  assert.ok(ARENA && typeof ARENA.ammo === 'string');
});

test('aliveCount lee solo la escena que recibe (sin herencia)', async () => {
  const mod = await import('../../src/arena/wavesScene.js');
  assert.equal(mod.aliveCount({ enemies: [{ dead: false }, { dead: true }] }), 1);
});
