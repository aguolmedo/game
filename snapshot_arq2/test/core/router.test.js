import test from 'node:test';
import assert from 'node:assert/strict';
import { createRouter } from '../../src/core/router.js';
import { installOverlay, canSetOverlay } from '../../src/core/overlay.js';
import { ensureSceneContract } from '../../src/core/scene.js';

function fakeScene(log, name) {
  return ensureSceneContract({
    worldZoom: true,
    enter: (spawn) => log.push(`enter ${name} ${spawn ? spawn.x : '-'}`),
    leave: () => log.push(`leave ${name}`),
  });
}

function setup() {
  const log = [];
  const game = installOverlay({
    scene: null, sceneName: '', fade: 0, run: null, isolated: false, carry: null, endRun() {},
  });
  const scenes = { a: fakeScene(log, 'a'), b: fakeScene(log, 'b') };
  const router = createRouter({
    game, scenes, hidePanels: () => log.push('hide'),
    mouseCursor: { setState() {} }, setZoom: () => {},
  });
  return { log, game, router };
}

test('contrato: rellena no-ops sin pisar lo propio', () => {
  const s = ensureSceneContract({ update: () => 'mine' });
  assert.equal(s.update(), 'mine');
  for (const m of ['enter', 'leave', 'reset', 'dispose', 'freezePlayer', 'hideHud', 'showHud',
    'hideCursor', 'setLightState', 'applyStoryState', 'autoPlaceCarry']) {
    assert.equal(typeof s[m], 'function');
    s[m](true);
  }
  assert.equal(s.render, undefined);
});

test('contrato: freezePlayer y hideHud usan player/hud si existen', () => {
  const calls = [];
  const s = ensureSceneContract({
    player: { setFrozen: (v) => calls.push(`f${v}`) },
    hud: { hide: () => calls.push('h'), show: () => calls.push('s') },
  });
  s.freezePlayer(true);
  s.hideHud();
  s.showHud();
  assert.deepEqual(calls, ['ftrue', 'h', 's']);
});

test('overlay: validación de transiciones', () => {
  assert.equal(canSetOverlay(null, 'pause'), true);
  assert.equal(canSetOverlay('pause', 'chest'), false);
  assert.equal(canSetOverlay('pause', 'transition'), true);
  assert.equal(canSetOverlay('transition', 'equip'), false);
  assert.equal(canSetOverlay('equip', 'bogus'), false);
  assert.equal(canSetOverlay('chest', null), true);
});

test('overlay: getters derivados de compatibilidad', () => {
  const { game } = setup();
  assert.equal(game.chestOpen, false);
  game.setOverlay('chest');
  assert.equal(game.chestOpen, true);
  game.chestOpen = false;
  assert.equal(game.overlay, null);
  game.transition = { phase: 'out' };
  assert.equal(game.overlay, 'transition');
  assert.deepEqual(game.transition, { phase: 'out' });
  game.transition = null;
  assert.equal(game.overlay, null);
});

test('router: fundido sale, cambia a mitad y entra', () => {
  const { log, game, router } = setup();
  router.setScene('a');
  assert.equal(router.changeScene('b', { x: 7 }), true);
  assert.equal(game.overlay, 'transition');
  for (let i = 0; i < 18; i++) router.tickTransition(1 / 60);
  assert.equal(game.sceneName, 'b');
  assert.ok(log.indexOf('leave a') < log.indexOf('enter b 7'));
  for (let i = 0; i < 20; i++) router.tickTransition(1 / 60);
  assert.equal(game.overlay, null);
  assert.equal(game.fade, 0);
});

test('router: pedido en plena transición se encola y el último gana', () => {
  const { game, router } = setup();
  router.setScene('a');
  router.changeScene('b');
  assert.equal(router.changeScene('a'), false);
  assert.equal(router.pending.name, 'a');
  for (let i = 0; i < 40; i++) router.tickTransition(1 / 60);
  assert.equal(game.overlay, 'transition');
  assert.equal(game.transition.name, 'a');
});

test('router: escena desconocida lanza', () => {
  const { router } = setup();
  assert.throws(() => router.setScene('zzz'), /desconocida/);
});

test('flujo título -> prólogo -> altillo con fundidos encadenados', () => {
  const log = [];
  const game = installOverlay({ scene: null, sceneName: '', fade: 0, run: null, isolated: false, carry: null, endRun() {} });
  const scenes = { title: fakeScene(log, 'title'), prologue: fakeScene(log, 'prologue'), attic: fakeScene(log, 'attic') };
  const router = createRouter({ game, scenes, hidePanels() {}, mouseCursor: { setState() {} }, setZoom() {} });
  router.setScene('title');
  const run = () => { for (let i = 0; i < 45; i++) router.tickTransition(1 / 60); };
  game.changeScene = router.changeScene;
  router.changeScene('prologue');
  run();
  assert.equal(game.sceneName, 'prologue');
  assert.equal(game.overlay, null);
  router.changeScene('attic');
  run();
  assert.equal(game.sceneName, 'attic');
  assert.equal(game.overlay, null);
});

test('overlay: pausa, cofre y taller se abren y cierran, y no se pisan', () => {
  const game = installOverlay({});
  for (const name of ['pause', 'chest', 'taller']) {
    assert.equal(game.setOverlay(name), true);
    assert.equal(game.overlay, name);
    for (const other of ['pause', 'chest', 'taller']) assert.equal(game.setOverlay(other), false);
    assert.equal(game.clearOverlay('equip'), false);
    assert.equal(game.overlay, name);
    game.clearOverlay(name);
    assert.equal(game.overlay, null);
  }
  game.setOverlay('pause');
  assert.equal(game.setOverlay('transition', { phase: 'out' }), true);
  assert.equal(game.chestOpen, false);
});
