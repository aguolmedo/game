// Render chiquito de un objeto apoyado en un mueble: sprite + sombra de 1 px
// + brillito de agarrable. Vive separado de surfaces.js para que la lógica
// pura (slots, place/take) se pueda testear sin tocar Three.js.
import * as THREE from 'three';
import { anySprite } from './mapView.js';
import { iconSprite } from './sprite.js';

function frameBox(frame) {
  if (!frame) return null;
  return Array.isArray(frame)
    ? { x: frame[0], y: frame[1], w: frame[2], h: frame[3] }
    : frame;
}

/** Fallback: icono 16x16 de items.png cuando el frame no vive en un atlas de mapa. */
function itemsIcon(assets, name) {
  const data = assets && assets.itemsData;
  const sheet = assets && assets.items;
  const frame = data && data.frames && data.frames[name];
  const box = frameBox(frame);
  if (!box || !sheet) return null;
  return iconSprite(sheet, box, box.w, box.h);
}

function sparkle(assets, name) {
  try {
    return anySprite(assets, name);
  } catch {
    return null;
  }
}

function makeShadow(scene, x, y, z, w) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(Math.max(2, w - 2), 1),
    new THREE.MeshBasicMaterial({
      color: 0x14101e,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  mesh.position.set(Math.round(x), y - 0.5, z - 0.0005);
  scene.add(mesh);
  return mesh;
}

/**
 * Crea el visual de un worldItem. Devuelve { mesh, shadow, sparkles, w, h,
 * phase, dispose() }; todo se agrega a la escena acá.
 */
export function createItemVisual(opts) {
  const { scene, assets, item, itemId, sprite, x, y, z, grabbable } = opts;
  const name = sprite || (item && item.worldSprite) || itemId;

  let mesh = null;
  try {
    mesh = anySprite(assets, name);
  } catch {
    mesh = itemsIcon(assets, itemId) || itemsIcon(assets, name);
  }

  let w = 8;
  let h = 8;
  if (mesh) {
    w = mesh.geometry.parameters.width;
    h = mesh.geometry.parameters.height;
    mesh.position.set(Math.round(x), Math.round(y - h / 2), z);
    scene.add(mesh);
  }

  const shadow = makeShadow(scene, x, y, z, w);

  const sparkles = [];
  if (grabbable) {
    for (const sparkName of ['sparkle_0', 'sparkle_1']) {
      const fx = sparkle(assets, sparkName);
      if (!fx) continue;
      fx.position.set(Math.round(x + w / 2 - 2), Math.round(y - h + 1), z + 0.003);
      fx.visible = false;
      scene.add(fx);
      sparkles.push(fx);
    }
  }

  return {
    mesh,
    shadow,
    sparkles,
    w,
    h,
    phase: Math.random() * 1.5,
    dispose() {
      if (mesh) scene.remove(mesh);
      scene.remove(shadow);
      for (const fx of sparkles) scene.remove(fx);
    },
  };
}
