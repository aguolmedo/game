// Efectos visuales cortos (fogonazos, chispas, salpicaduras).
// Funciones que reciben la escena.
import * as THREE from 'three';
import { regionTexture, depthFor } from '../sprite.js';
import { clearFxEntities } from './reset.js';


export function fxMaterial(scene, name) {
  if (scene.fxMats.has(name)) return scene.fxMats.get(name);
  const frame = scene.assets.fxData.frames[name];
  if (!frame) throw new Error(`Falta el efecto ${name} en fx.json`);
  const texture = regionTexture(scene.assets.fx, frame[0], frame[1], frame[2], frame[3]);
  const material = new THREE.MeshBasicMaterial({
    map: texture, transparent: true, alphaTest: 0.3, depthWrite: false,
    side: THREE.DoubleSide,
  });
  scene.fxMats.set(name, material);
  return material;
}

export function fxGeometry(scene, name) {
  if (scene.fxGeos.has(name)) return scene.fxGeos.get(name);
  const frame = scene.assets.fxData.frames[name];
  const geometry = new THREE.PlaneGeometry(frame[2], frame[3]);
  scene.fxGeos.set(name, geometry);
  return geometry;
}

export function spawnFx(scene, name, x, y, life = 0.12, frames = null) {
  const first = frames ? frames[0] : name;
  const mesh = new THREE.Mesh(scene.fxGeometry(first), scene.fxMaterial(first));
  mesh.position.set(Math.round(x), Math.round(y), depthFor(y) + 0.02);
  scene.scene.add(mesh);
  scene.fx.push({ mesh, key: first, frames, life, max: life, t: 0 });
}

export function updateFx(scene, dt) {
  for (let i = scene.fx.length - 1; i >= 0; i--) {
    const item = scene.fx[i];
    item.t += dt;
    item.life -= dt;
    if (item.frames) {
      const index = Math.min(item.frames.length - 1,
        Math.floor((item.t / Math.max(0.001, item.max)) * item.frames.length));
      const key = item.frames[index];
      if (key !== item.key) {
        item.key = key;
        item.mesh.material = scene.fxMaterial(key);
      }
    }
    if (item.life <= 0) {
      scene.scene.remove(item.mesh);
      scene.fx.splice(i, 1);
    }
  }
}

export function clearFx(scene) {
  clearFxEntities(scene.scene, scene.fx);
}
