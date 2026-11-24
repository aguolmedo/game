// La escena de la salida quedó partida en módulos de src/arena/ con una
// fachada: el prototipo conserva la API pública que usan main.js, los tests
// y tools/*.mjs. Este test cuida ese contrato, no el tamaño de los archivos.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ArenaScene, ARENA } from '../src/scenes/arena.js';

const API = [
  // ciclo de la salida
  'setupRun', 'rebuildWorld', 'buildWorld', 'resetRun', 'enter', 'reset',
  // mundo y luces
  'buildFlowFields', 'updateFlow', 'canSpawnAt', 'addMapLight', 'removeMapLight',
  // botín, mochila y consumibles
  'setupLoot', 'updateLoot', 'addGroundLoot', 'useBengala', 'useBotella',
  'updateConsumables', 'clearConsumables',
  // entrada y combate
  'readControls', 'readAim', 'faceAim', 'tryFire', 'damageEnemy', 'tryBuy',
  'goHome', 'updateEnemies', 'bitBy',
  // rondas y bichos
  'startRound', 'updateRound', 'pickSpawn', 'spawnEnemy', 'aliveCount',
  'makeEnemyVisual', 'updateEnemyVisual', 'removeEnemy',
  // muerte, resultado y HUD
  'die', 'updateVignette', 'openResult', 'updateResult', 'pickResult',
  'drawHud', 'drawBanner', 'drawResult', 'toast',
  // debug/QA y contrato de escena
  'state', 'debugSetRound', 'debugSpawn', 'debugGive', 'applyCamera',
];

test('ArenaScene conserva la API pública como métodos de la fachada', () => {
  for (const name of API) {
    assert.equal(typeof ArenaScene.prototype[name], 'function', `falta ${name}`);
  }
});

test('ArenaScene conserva los getters del contrato de escena y ARENA', () => {
  const arena = Object.create(ArenaScene.prototype);
  arena.resultOpen = true;
  arena.vignetteOpen = false;
  assert.equal(arena.blocksPause, true);
  assert.equal(arena.dialog.open, false);
  assert.equal(arena.choice.open, false);
  assert.ok(ARENA && typeof ARENA.ammo === 'string');
});

test('la fachada no depende de herencia: las funciones reciben la escena', async () => {
  const mod = await import('../src/arena/wavesScene.js');
  assert.equal(typeof mod.aliveCount, 'function');
  // Una escena mínima alcanza: la función lee el primer argumento.
  assert.equal(mod.aliveCount({ enemies: [{ dead: false }, { dead: true }] }), 1);
});
