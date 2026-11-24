// Efectos visuales cortos (fogonazos, chispas, salpicaduras).
// Funciones que reciben la escena.
import * as THREE from 'three';
import { regionTexture, depthFor } from '../sprite.js';
import { clearFxEntities } from './reset.js';


export function fxMaterial(state, view, svc, name) {
  if (view.fxMats.has(name)) return view.fxMats.get(name);
  const frame = svc.assets.fxData.frames[name];
  if (!frame) throw new Error(`Falta el efecto ${name} en fx.json`);
  const texture = regionTexture(svc.assets.fx, frame[0], frame[1], frame[2], frame[3]);
  const material = new THREE.MeshBasicMaterial({
    map: texture, transparent: true, alphaTest: 0.3, depthWrite: false,
    side: THREE.DoubleSide,
  });
  view.fxMats.set(name, material);
  return material;
}

export function fxGeometry(state, view, svc, name) {
  if (view.fxGeos.has(name)) return view.fxGeos.get(name);
  const frame = svc.assets.fxData.frames[name];
  const geometry = new THREE.PlaneGeometry(frame[2], frame[3]);
  view.fxGeos.set(name, geometry);
  return geometry;
}

export function spawnFx(state, view, svc, name, x, y, life = 0.12, frames = null) {
  const first = frames ? frames[0] : name;
  const mesh = new THREE.Mesh(svc.fxGeometry(first), svc.fxMaterial(first));
  mesh.position.set(Math.round(x), Math.round(y), depthFor(y) + 0.02);
  view.three.add(mesh);
  view.fx.push({ mesh, key: first, frames, life, max: life, t: 0 });
}

export function updateFx(state, view, svc, dt) {
  for (let i = view.fx.length - 1; i >= 0; i--) {
    const item = view.fx[i];
    item.t += dt;
    item.life -= dt;
    if (item.frames) {
      const index = Math.min(item.frames.length - 1,
        Math.floor((item.t / Math.max(0.001, item.max)) * item.frames.length));
      const key = item.frames[index];
      if (key !== item.key) {
        item.key = key;
        item.mesh.material = svc.fxMaterial(key);
      }
    }
    if (item.life <= 0) {
      view.three.remove(item.mesh);
      view.fx.splice(i, 1);
    }
  }
}

export function clearFx(state, view, svc) {
  clearFxEntities(view.three, view.fx);
}
