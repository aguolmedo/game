import { playerFootTile } from '../reach.js';
import { depthFor } from '../sprite.js';
import { supportCheck } from '../placement.js';
import { anySprite } from '../mapView.js';
import { capName } from './helpers.js';

/** Nombre del mueble que Juan lleva en la cabeza, o null. */
export function carryName(scene) {
  const carry = scene.game.carry;
  return carry && carry.mapId === scene.name ? carry.object?.name || 'el mueble' : null;
}

/** Malla del mueble cargado sobre la cabeza de Juan (§7). */
export function updateCarryMesh(scene) {
  const carry = scene.game.carry;
  if (!carry || carry.mapId !== scene.name) {
    if (scene.carryMesh) {
      scene.scene.remove(scene.carryMesh);
      scene.carryMesh = null;
    }
    return;
  }
  if (!scene.carryMesh && carry.object) {
    try {
      scene.carryMesh = anySprite(scene.game.assets, carry.object.sprite);
      scene.carryMesh.material = scene.carryMesh.material.clone();
      scene.carryMesh.material.transparent = true;
      scene.scene.add(scene.carryMesh);
    } catch {
      scene.carryMesh = null;
    }
  }
  if (!scene.carryMesh) return;
  const h = scene.carryMesh.geometry.parameters.height;
  const bob = scene.player.moving ? (Math.floor(scene.t * 7) % 2) : 0;
  const base = Math.round(scene.player.feet - 26) + bob;
  scene.carryMesh.position.set(
    Math.round(scene.player.x),
    Math.round(base - h / 2),
    depthFor(scene.player.feet) + 0.001,
  );
}

/** Suelta el mueble cargado: malla, estado y caché. */
export function clearCarry(scene) {
  if (scene.carryMesh) {
    scene.scene.remove(scene.carryMesh);
    scene.carryMesh = null;
  }
  scene.game.carry = null;
  scene.invalidateReach();
}

/**
 * La historia saca a Juan del lugar (§7): apoya el mueble en el casillero
 * válido más cercano; si no hay ninguno, vuelve a su lugar original.
 */
export function autoPlaceCarry(scene) {
  const carry = scene.game.carry;
  if (!carry || carry.mapId !== scene.name || !carry.object) {
    scene.clearCarry();
    return false;
  }
  const obj = carry.object;
  const p = playerFootTile({ x: scene.player.x, feet: scene.player.feet });
  const tiles = [];
  for (let ty = 0; ty < scene.mapData.rows; ty++) {
    for (let tx = 0; tx < scene.mapData.cols; tx++) {
      tiles.push({ tx, ty, d: Math.abs(tx - p.tx) + Math.abs(ty - p.ty) });
    }
  }
  tiles.sort((a, b) => a.d - b.d);
  for (const tile of tiles) {
    const check = supportCheck({
      map: scene.mapData,
      objects: scene.mapData.objects,
      npcs: scene.mapData.npcs,
      warps: scene.mapData.warps,
      player: { x: scene.player.x, feet: scene.player.feet },
      items: scene.worldState.items,
      object: obj,
      tx: tile.tx,
      ty: tile.ty,
      requireAdjacent: false,
    });
    if (check.ok) {
      scene.placeCarryAt(obj, tile.tx, tile.ty, { moved: true });
      scene.game.showToast(`${capName(obj.name)} quedó apoyado.`);
      return true;
    }
  }
  // Sin lugar: vuelve a donde estaba.
  const home = scene.world.home.get(obj.id);
  obj.x = home ? home.x : obj.x;
  obj.y = home ? home.y : obj.y;
  obj.solid = home ? home.solid : obj.solid;
  delete scene.worldState.moved[obj.id];
  scene.world.hideObject(obj, false);
  scene.world.updateObject(obj);
  scene.world.rebuildSolids();
  scene.surface.sync();
  scene.clearCarry();
  scene.game.showToast(`${capName(obj.name)} volvió a su lugar.`);
  return false;
}

/** Levanta un mueble liviano: sale del mapa y va sobre la cabeza (§7). */
export function startCarry(scene, obj) {
  if (!obj || scene.game.carry) return false;
  const origin = { tx: obj.x, ty: obj.y };
  scene.world.hideObject(obj, true);
  scene.invalidateReach();
  scene.surface.sync();
  scene.game.carry = {
    mapId: scene.name, objectId: obj.id, object: obj, origin,
  };
  scene.game.showToast(`Levantaste ${obj.name || 'el mueble'}.`);
  return true;
}

/** Apoya el mueble cargado en (tx,ty) y lo persiste en `moved` (§7). */
export function placeCarryAt(scene, obj, tx, ty, { moved = true } = {}) {
  obj.x = tx;
  obj.y = ty;
  obj.hidden = false;
  obj.solid = true;
  if (obj.mesh) obj.mesh.visible = true;
  scene.world.updateObject(obj);
  scene.world.rebuildSolids();
  if (moved) {
    scene.worldState.moved[obj.id] = { tx, ty };
  }
  scene.surface.sync();
  scene.invalidateReach();
  scene.clearCarry();
  return true;
}

export function supportCarry(scene, tx, ty) {
  const carry = scene.game.carry;
  if (!carry || carry.mapId !== scene.name || !carry.object) return false;
  scene.placeCarryAt(carry.object, tx, ty);
  scene.game.showToast(`Apoyaste ${carry.object.name || 'el mueble'}.`);
  scene.game.emit('interact', {
    id: carry.object.id, kind: 'support', obj: carry.object,
  });
  return true;
}

export function carryData(scene) {
  const carry = scene.game.carry;
  return carry && carry.mapId === scene.name ? carry : null;
}
