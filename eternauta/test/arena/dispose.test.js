import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeArenaScene } from '../helpers/arena_scene.js';
import { createRunState } from '../../src/arena/runState.js';

function overlay() {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial());
  return { mesh };
}

test('dispose libera cachés y overlays sin tirar, y es idempotente', () => {
  const arena = makeArenaScene();
  arena.state = createRunState();
  arena.scene = new THREE.Scene();
  arena.uiScene = new THREE.Scene();
  arena.ui = overlay();
  arena.lightUi = overlay();
  arena.controls = { fire: true };
  arena.mouse = { down: true };
  arena.prevKeys = new Set(['a']);
  arena.prevPad = [1];
  arena.toasts = [{}];
  arena.world = null;
  let freed = 0;
  const geo = new THREE.PlaneGeometry(1, 1);
  geo.addEventListener('dispose', () => { freed += 1; });
  arena.frameGeos = new Map([['a', geo]]);
  arena.fxGeos = new Map();
  arena.itemGeos = new Map();
  arena.frameMats = new Map([['a', new THREE.MeshBasicMaterial()]]);
  arena.fxMats = new Map();
  arena.itemMats = new Map();
  arena.shooting = { reset() {}, geos: new Map(), dispose() {} };
  arena.dispose();
  arena.dispose();
  assert.equal(freed, 1);
  assert.equal(arena.frameGeos.size, 0);
  assert.equal(arena.controls.fire, false);
  assert.equal(arena.ui.mesh.visible, false);
});
