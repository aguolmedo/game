// Performance sin cambio visual: geometria compartida, materiales por bucket
// de alpha (1/64) y update sin allocaciones. Tambien sombras con geometria
// cacheada por tamano.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Footprints } from '../src/footprints.js';
import { makeShadow } from '../src/sprite.js';

function fakeScene() {
  const children = new Set();
  return {
    children,
    add(mesh) { children.add(mesh); },
    remove(mesh) { children.delete(mesh); },
  };
}

const PLAYER = { x: 100, feet: 200, moving: false, moved: 0 };

test('50 huellas comparten una sola geometria', () => {
  const scene = fakeScene();
  const fp = new Footprints(scene, new THREE.Texture());
  for (let i = 0; i < 50; i++) fp.spawn(PLAYER);
  assert.equal(fp.items.length, 50);
  assert.equal(new Set(fp.items.map((i) => i.mesh.geometry)).size, 1);
  assert.equal(scene.children.size, 50);
});

test('alpha cuantizado a 1/64 y material compartido por bucket', () => {
  const scene = fakeScene();
  const texture = new THREE.Texture();
  const fp = new Footprints(scene, texture);
  fp.spawn(PLAYER);
  fp.spawn(PLAYER);

  // El spawn arranca en 0.7 -> bucket 45 (45/64 = 0.703125).
  assert.equal(fp.items[0].bucket, 45);
  assert.equal(fp.items[0].mesh.material.opacity, 45 / 64);

  fp.update(0.1, PLAYER, false); // life 6.9 -> clamp 0.85 -> bucket 54
  const mats = new Set(fp.items.map((i) => i.mesh.material));
  assert.equal(mats.size, 1);
  for (const item of fp.items) {
    const op = item.mesh.material.opacity;
    assert.equal(op * 64, Math.round(op * 64)); // multiplo exacto de 1/64
    assert.equal(op, 54 / 64);
    const mat = item.mesh.material;
    assert.equal(mat.map, texture);
    assert.equal(mat.transparent, true);
    assert.equal(mat.depthWrite, false);
    assert.equal(mat.side, THREE.DoubleSide);
  }
  assert.equal(fp.materialFor(54), fp.items[0].mesh.material);
});

test('update saca las muertas sin crear otro array', () => {
  const scene = fakeScene();
  const fp = new Footprints(scene, new THREE.Texture());
  fp.spawn(PLAYER);
  fp.spawn(PLAYER);
  const list = fp.items;

  fp.update(0.2, PLAYER, false); // 6.8 s de vida
  assert.equal(fp.items, list);
  assert.equal(fp.items.length, 2);

  fp.update(7, PLAYER, false); // se mueren las dos
  assert.equal(fp.items, list);
  assert.equal(fp.items.length, 0);
  assert.equal(scene.children.size, 0);
});

test('reset vacia el array y saca todo de la escena', () => {
  const scene = fakeScene();
  const fp = new Footprints(scene, new THREE.Texture());
  for (let i = 0; i < 10; i++) fp.spawn(PLAYER);
  const list = fp.items;
  fp.reset();
  assert.equal(fp.items, list);
  assert.equal(fp.items.length, 0);
  assert.equal(fp.acc, 0);
  assert.equal(scene.children.size, 0);
});

test('max recorta la huella mas vieja (70 por defecto)', () => {
  const scene = fakeScene();
  const fp = new Footprints(scene, new THREE.Texture());
  for (let i = 0; i < 75; i++) fp.spawn(PLAYER);
  assert.equal(fp.items.length, 70);
  assert.equal(scene.children.size, 70);
  assert.equal(new Set(fp.items.map((i) => i.mesh.geometry)).size, 1);
});

test('makeShadow reusa geometria por tamano y material por sombra', () => {
  const scene = fakeScene();
  const texture = new THREE.Texture();
  const a = makeShadow(scene, texture, 14, 5);
  const b = makeShadow(scene, texture, 14, 5);
  assert.equal(a.geometry, b.geometry);
  assert.notEqual(a.material, b.material); // cada llamador cambia su opacidad
  const c = makeShadow(scene, texture, 10, 4);
  assert.notEqual(c.geometry, a.geometry);
  assert.equal(c.material.map, texture);
  assert.equal(c.material.side, THREE.DoubleSide);
});
