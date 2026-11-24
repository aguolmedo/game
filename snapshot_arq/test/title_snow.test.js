import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Snowfall } from '../src/snow.js';

const TEX = {
  backOn: { name: 'backOn' }, backOff: { name: 'backOff' },
  midOn: { name: 'midOn' }, midOff: { name: 'midOff' },
  frontOn: { name: 'frontOn' }, frontOff: { name: 'frontOff' },
};
const scene = () => ({ add() {} });
const meshesOf = (s) => s.layers.flatMap((l) => [l.onMesh, l.offMesh]);
const drawnTotal = (s) => meshesOf(s).reduce((n, m) => n + m.count, 0);

/** Posicion x/y/z que draw() escribio para la instancia `i` de un mesh. */
function instanceAt(mesh, i) {
  const m = new THREE.Matrix4();
  mesh.getMatrixAt(i, m);
  const p = new THREE.Vector3().setFromMatrixPosition(m);
  return { x: p.x, y: p.y, z: p.z };
}

test('Snowfall arma tres capas en z 6 / 6.5 / 8 con InstancedMesh', () => {
  const s = new Snowfall(scene(), TEX, { count: 6, front: 2 });
  // count (6) + count/2 (3) + front (2) copos
  assert.equal(s.flakes.length, 11);
  assert.equal(s.group.children.length, 6); // dos InstancedMesh por capa
  for (const child of s.group.children) assert.ok(child.isInstancedMesh);

  const zs = [...new Set(s.flakes.map((f) => f.layer.z))].sort((a, b) => a - b);
  assert.deepEqual(zs, [6, 6.5, 8]);
  assert.deepEqual(s.layers.map((l) => l.onMesh.position.z), [6, 6.5, 8]);
  assert.deepEqual(s.layers.map((l) => l.offMesh.position.z), [6, 6.5, 8]);

  // capacidades: 6 / 3 / 2 instancias por InstancedMesh
  assert.deepEqual(s.layers.map((l) => l.onMesh.instanceMatrix.count), [6, 3, 2]);
  assert.deepEqual(s.layers.map((l) => l.offMesh.instanceMatrix.count), [6, 3, 2]);
  // cada copo tiene los campos que leen los tests y el diagnostico
  for (const f of s.flakes) {
    for (const k of ['x', 'y', 'speed', 'sway', 'phase', 'ph', 'blink']) {
      assert.equal(typeof f[k], 'number', `falta ${k}`);
    }
  }
});

test('materiales y geometrias compartidas con las mismas flags de siempre', () => {
  const s = new Snowfall(scene(), TEX, { count: 2, front: 1 });
  const mats = new Set(meshesOf(s).map((m) => m.material));
  assert.equal(mats.size, 6);
  for (const m of meshesOf(s)) {
    assert.equal(m.material.transparent, true);
    assert.equal(m.material.alphaTest, 0.01);
    assert.equal(m.material.depthWrite, false);
    assert.equal(m.material.side, THREE.DoubleSide);
    assert.equal(m.material.opacity, 1);
    // se deja el default de three (doble pasada para transparente DoubleSide)
    assert.notEqual(m.material.forceSinglePass, true);
    assert.equal(m.frustumCulled, false);
    assert.equal(m.instanceMatrix.usage, THREE.DynamicDrawUsage);
  }
  const sizes = s.layers.map((l) => [l.onMesh.geometry.parameters.width, l.offMesh.geometry.parameters.width]);
  assert.deepEqual(sizes, [[1, 1], [7, 3], [12, 6]]);
  // mismo mapa de textura por material
  assert.deepEqual(
    meshesOf(s).map((m) => m.material.map.name),
    ['backOn', 'backOff', 'midOn', 'midOff', 'frontOn', 'frontOff'],
  );
});

test('update hace caer los copos y los reengancha arriba', () => {
  const s = new Snowfall(scene(), TEX, { count: 1, front: 0 });
  const f = s.flakes[0];
  f.x = 100;
  f.y = 100;
  s.update(0.5);
  assert.ok(f.y > 100);

  // por debajo de height+2 el copo reaparece arriba
  f.y = s.height + 3;
  s.update(0.001);
  assert.equal(f.y, -2);
});

test('update respeta el wrap lateral por los dos lados', () => {
  const s = new Snowfall(scene(), TEX, { count: 1, front: 0 });
  const f = s.flakes[0];
  f.y = 50;
  f.x = -10; // sale por la izquierda
  s.update(0.001);
  assert.equal(f.x, s.width + 3);

  f.x = s.width + 10; // sale por la derecha
  s.update(0.001);
  assert.equal(f.x, -3);
});

test('draw escribe posiciones enteras y cada copo usa una sola textura', () => {
  const s = new Snowfall(scene(), TEX, { count: 1, front: 0 });
  const f = s.flakes[0];
  f.x = 10.4;
  f.y = 20.6;
  s.draw();

  // el copo cae en exactamente uno de los dos meshes de su capa
  const layer = f.layer;
  assert.equal(layer.onCount + layer.offCount, 1);
  const mesh = f.glowOn ? layer.onMesh : layer.offMesh;
  const other = f.glowOn ? layer.offMesh : layer.onMesh;
  assert.equal(mesh.count, 1);
  assert.equal(other.count, 0);
  assert.equal(mesh.visible, true);
  assert.equal(other.visible, false); // count 0 no se dibuja
  const p = instanceAt(mesh, 0);
  assert.equal(p.x, 10);
  assert.equal(p.y, 21);
  assert.equal(p.z, 0); // la z de la capa esta en el mesh

  // la suma de count de los 6 InstancedMesh es la cantidad de copos
  assert.equal(drawnTotal(s), s.flakes.length);
});

test('draw reparte cada copo en un solo mesh (todas las capas)', () => {
  const s = new Snowfall(scene(), TEX, { count: 24, front: 6 });
  for (const t of [0.01, 0.37, 1.9]) {
    s.time = t;
    s.draw();
    assert.equal(drawnTotal(s), s.flakes.length);
    let on = 0;
    for (const layer of s.layers) {
      const mine = s.flakes.filter((f) => f.layer === layer);
      const lit = mine.filter((f) => f.glowOn).length;
      assert.equal(layer.onCount, lit);
      assert.equal(layer.offCount, mine.length - lit);
      assert.equal(layer.onMesh.count, lit);
      assert.equal(layer.offMesh.count, mine.length - lit);
      assert.equal(layer.onMesh.visible, lit > 0);
      assert.equal(layer.offMesh.visible, mine.length - lit > 0);
      on += lit;
      // fosforescencia: dentro de la capa hay copos de los dos tipos
      if (mine.length > 8) assert.ok(lit > 0 && lit < mine.length);
    }
    assert.ok(on > 0 && on < s.flakes.length);
  }
});

test('setCamera redondea la posicion del grupo', () => {
  const s = new Snowfall(scene(), TEX, { count: 1, front: 0 });
  s.setCamera(12.6, -3.4);
  assert.equal(s.group.position.x, 13);
  assert.equal(s.group.position.y, -3);
});
