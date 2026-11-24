// Performance del sistema de disparo: texturas/geometrías compartidas y
// objetos reutilizados por frame (sin allocaciones nuevas).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ShootingFx } from '../src/arena/feedback.js';
import { createShot } from '../src/arena/projectiles.js';

// Sin cargar texturas (no hay DOM en node): el atlas se arma a mano.
class HeadlessFx extends ShootingFx {
  load() {}
}

function makeFx() {
  const scene = {
    added: [],
    removed: [],
    add(mesh) { this.added.push(mesh); },
    remove(mesh) { this.removed.push(mesh); },
  };
  const fx = new HeadlessFx(scene, {});
  fx.tex = new THREE.Texture();
  fx.tex.image = { width: 64, height: 64 };
  fx.frames = {
    bullet: [0, 0, 4, 4],
    casing_0: [8, 0, 4, 4],
    casing_1: [8, 0, 4, 4],
    flash_0: [16, 0, 8, 8],
    flash_1: [24, 0, 12, 12],
  };
  return { fx, scene };
}

test('feedback: textura y geometría se comparten por frame', () => {
  const { fx, scene } = makeFx();
  const a = fx.spawnSprite('bullet', 1, 1);
  const b = fx.spawnSprite('bullet', 2, 2);

  assert.ok(a && b);
  assert.equal(a.material.map, b.material.map);
  assert.equal(a.mesh.geometry, b.mesh.geometry);
  assert.equal(fx.textures.size, 1);
  assert.equal(fx.geos.size, 1);
  assert.equal(scene.added.length, 2);

  let textureDisposed = 0;
  let geometryDisposed = 0;
  a.material.map.dispose = () => { textureDisposed += 1; };
  a.mesh.geometry.dispose = () => { geometryDisposed += 1; };

  fx.dropSprite(a);
  assert.equal(scene.removed.length, 1);
  assert.equal(textureDisposed, 0, 'la textura compartida no se dispone');
  assert.equal(geometryDisposed, 0, 'la geometría compartida no se dispone');

  // El otro sprite sigue usando la misma textura/geometría cacheada.
  const c = fx.spawnSprite('bullet', 3, 3);
  assert.equal(c.material.map, b.material.map);
  assert.equal(c.mesh.geometry, b.mesh.geometry);
});

test('feedback: cambiar de frame reusa la geometría sin disponerla', () => {
  const { fx } = makeFx();
  fx.spawnFlash({ x: 10, y: 10 });
  const flash = fx.flash;
  const sharedGeo = fx.geometry('flash_0');
  let disposed = 0;
  sharedGeo.dispose = () => { disposed += 1; };

  fx.updateFlash(0.05); // pasa a flash_1 (otro tamaño)
  assert.equal(flash.mesh.geometry, fx.geometry('flash_1'));
  assert.equal(disposed, 0);
  assert.equal(fx.geos.size, 2);
});

test('feedback: update reutiliza mundo y view buffer', () => {
  const { fx } = makeFx();
  const world = fx.world;
  const viewBuf = fx.viewBuf;

  fx.update(0.016, {
    enemies: [],
    solids: [{ x: 0, y: 0, w: 10, h: 10 }],
    view: { x: 5, y: 6 },
  });
  assert.equal(fx.world, world);
  assert.equal(fx.world.view, viewBuf);
  assert.deepEqual({ ...viewBuf }, { x: 5, y: 6, w: 480, h: 270 });
  assert.equal(world.isSolid(5, 5), true);
  assert.equal(world.isSolid(50, 50), false);
  assert.equal(world.isOut(5000, 5000), true);

  fx.update(0.016, {});
  assert.equal(fx.world, world);
  assert.equal(fx.world.view, null);
  assert.equal(world.isOut(0, 0), null);
});

test('feedback: balas muertas se compactan en el lugar y conservan orden', () => {
  const { fx } = makeFx();
  const dead = createShot({ x: 0, y: 0 }, { x: 1, y: 0 }, { rng: () => 0.5 });
  dead.alive = false;
  const alive = createShot({ x: 0, y: 0 }, { x: 1, y: 0 }, { rng: () => 0.5 });
  const dead2 = createShot({ x: 0, y: 0 }, { x: 1, y: 0 }, { rng: () => 0.5 });
  dead2.alive = false;
  fx.bullets.push(dead, alive, dead2);

  fx.update(0.016, {});
  assert.deepEqual(fx.bullets, [alive]);
  assert.equal(fx.liveTrail instanceof Set, true);
});

test('feedback: shakeOffset devuelve siempre el mismo objeto', () => {
  const { fx } = makeFx();
  fx.addShake(2, 0.1);
  const a = fx.shakeOffset(0.5);
  const b = fx.shakeOffset(0.6);
  assert.equal(a, b);
  assert.equal(a, fx.shake);

  fx.shakeT = 0;
  const c = fx.shakeOffset();
  assert.equal(c, a);
  assert.deepEqual({ ...c }, { x: 0, y: 0 });
});
