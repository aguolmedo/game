// Visuales de los bichos: mallas, sombras, cuadros de animación y limpieza.
// Funciones que reciben la escena.
import * as THREE from 'three';
import { regionTexture, depthFor, makeShadow } from '../sprite.js';
import { ENEMY_TYPES } from './enemies.js';
import { clearEnemyEntities } from './reset.js';


export function makeEnemyVisual(state, view, svc, enemy) {
  const key = `${enemy.type}:${enemy.dir}:0`;
  const mesh = new THREE.Mesh(svc.enemyGeometry(enemy.type), svc.enemyMaterial(key));
  mesh.position.z = depthFor(enemy.y);
  view.three.add(mesh);
  const shadow = makeShadow(view.three, svc.assets.shadow,
    Math.round(enemy.w * 0.7), 4);
  shadow.material.opacity = 0.55;
  return { mesh, shadow, key };
}

export function enemyGeometry(state, view, svc, type) {
  if (!view.frameGeos.has(type)) {
    const def = ENEMY_TYPES[type] || ENEMY_TYPES.cascarudo;
    view.frameGeos.set(type, new THREE.PlaneGeometry(def.w, def.h));
  }
  return view.frameGeos.get(type);
}

export function enemyMaterial(state, view, svc, frameName) {
  if (view.frameMats.has(frameName)) return view.frameMats.get(frameName);
  const frame = svc.assets.cascarudosData.frames[frameName];
  if (!frame) throw new Error(`Falta el cuadro ${frameName} en cascarudos.json`);
  const texture = regionTexture(svc.assets.cascarudos, frame[0], frame[1], frame[2], frame[3]);
  const material = new THREE.MeshBasicMaterial({
    map: texture, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide,
  });
  view.frameMats.set(frameName, material);
  return material;
}

export function enemyFrameKey(state, view, svc, enemy) {
  if (enemy.dead) {
    const step = Math.min(2, Math.floor(enemy.deathT / 0.08));
    return `${enemy.type}:death:${step}`;
  }
  if (enemy.hitT > 0) return `${enemy.type}:hit`;
  return `${enemy.type}:${enemy.dir}:${Math.floor(enemy.animT * 8) % 4}`;
}

export function updateEnemyVisual(state, view, svc, enemy) {
  const visual = enemy.vis;
  if (!visual) return;
  const key = svc.enemyFrameKey(enemy);
  if (key !== visual.key) {
    visual.mesh.material = svc.enemyMaterial(key);
    visual.key = key;
  }
  const x = Math.round(enemy.x);
  const feet = Math.round(enemy.y);
  visual.mesh.position.set(x, feet - enemy.h / 2, depthFor(feet));
  visual.shadow.position.set(x, feet - 1, depthFor(feet) - 0.001);
}

export function removeEnemy(state, view, svc, enemy) {
  if (enemy.vis) {
    view.three.remove(enemy.vis.mesh);
    if (enemy.vis.shadow) {
      view.three.remove(enemy.vis.shadow);
      // La geometría es compartida (sprite.makeShadow); el material es de
      // esta sombra y cambia su opacidad, así que se libera acá.
      enemy.vis.shadow.material?.dispose?.();
    }
    enemy.vis = null;
  }
  const index = state.enemies.indexOf(enemy);
  if (index >= 0) state.enemies.splice(index, 1);
}

export function clearEnemies(state, view, svc) {
  clearEnemyEntities(view.three, state.enemies);
}
