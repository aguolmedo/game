// Botín del piso, mochila de otra vez y sobreviviente: sprites, recogida y
// regalo. Funciones que reciben la escena.
import * as THREE from 'three';
import { regionTexture, depthFor, charSprite, makeShadow } from '../sprite.js';
import { addToBag } from '../run/loot.js';
import { FAROL_RADIUS } from './effectsRun.js';
import {
  PICKUP_RADIUS, MOCHILA_RADIUS, picksUp, collectLootInto, mochilaSpot,
  hasMochila, recoverAtMochila, survivorGift, LOOT_ITEM, LOOT_NAME,
} from './lootRun.js';
import { clamp } from './util.js';


/** Botín del piso, la mochila de otra vez y el sobreviviente de Lucas. */
export function setupLoot(scene) {
  scene.clearGroundLoot();
  // Las marcas apuntan al centro de la caja o del auto: se corre el botín
  // unos píxeles hasta el primer punto donde Juan puede pararse.
  scene.lootPoints = (scene.mapData.loot || []).map((spot) => {
    const point = scene.reachableGround(spot.x, spot.y);
    return { ...spot, x: point.x, y: point.y, markX: spot.x, markY: spot.y };
  });
  for (const spot of scene.lootPoints) {
    const kind = spot.kind === 'nafta' ? 'nafta' : 'loot';
    scene.addGroundLoot(spot.x, spot.y, kind, 1, { mark: true });
  }
  // La mochila y el sobreviviente van en puntos de botín del piso (no sobre
  // los techos de los autos, donde están las marcas de nafta).
  const ground = scene.lootPoints.filter((s) => s.kind === 'loot');
  const pool = ground.length ? ground : scene.lootPoints;
  scene.mochila = null;
  if (hasMochila(scene.save)) {
    const spot = mochilaSpot(pool, scene.state.rng);
    if (spot) scene.mochila = { x: spot.x, y: spot.y, t: 0 };
  }
  scene.survivor = null;
  if (scene.state.eff.sobreviviente) {
    const spots = pool.filter((s) => s.cell !== 'casa'
      && (!scene.mochila || s.x !== scene.mochila.x || s.y !== scene.mochila.y));
    if (spots.length) {
      const spot = spots[Math.floor(scene.rng() * spots.length)];
      scene.addSurvivor(spot);
    }
  }
}

/** Punto libre más cercano a (x,y) para dejar un objeto en el piso. */
export function reachableGround(scene, x, y) {
  const offsets = [
    [0, 0], [0, 14], [0, -14], [16, 0], [-16, 0],
    [16, 14], [-16, 14], [0, 28], [0, -28], [28, 0], [-28, 0],
  ];
  for (const [dx, dy] of offsets) {
    const px = clamp(x + dx, scene.arena.minX + 8, scene.arena.maxX - 8);
    const py = clamp(y + dy, scene.bounds.minFeet + 8, scene.bounds.maxFeet - 2);
    const box = { x: px - 5, y: py - 6, w: 10, h: 6 };
    if (!scene.world.isSolid(box)) return { x: px, y: py };
  }
  return { x, y };
}

/** Luz cálida del farol (mejora) siguiendo a Juan en el apagón. */
export function setupFarol(scene) {
  scene.farolLight = null;
  if (!scene.state.eff.farol) return;
  scene.farolLight = scene.addMapLight({
    x: scene.player.x,
    y: scene.player.feet,
    radius: FAROL_RADIUS,
    color: '#ffcf6e',
    kind: 'candle',
    flicker: 0.03,
    state: 'on',
    onlyIn: 'apagon',
  });
}

export function itemMaterial(scene, name) {
  if (scene.itemMats.has(name)) return scene.itemMats.get(name);
  const frame = scene.assets.itemsData.frames[name];
  if (!frame) throw new Error(`Falta el item ${name} en items.json`);
  const texture = regionTexture(scene.assets.items, frame[0], frame[1], frame[2], frame[3]);
  const material = new THREE.MeshBasicMaterial({
    map: texture, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide,
  });
  scene.itemMats.set(name, material);
  return material;
}

export function itemGeometry(scene, name) {
  if (scene.itemGeos.has(name)) return scene.itemGeos.get(name);
  const frame = scene.assets.itemsData.frames[name];
  const geometry = new THREE.PlaneGeometry(frame[2], frame[3]);
  scene.itemGeos.set(name, geometry);
  return geometry;
}

export function itemSprite(scene, name) {
  return new THREE.Mesh(scene.itemGeometry(name), scene.itemMaterial(name));
}

export function addGroundLoot(scene, x, y, kind, n = 1, opts = {}) {
  const sprite = LOOT_ITEM[kind] || 'chatarra';
  const mesh = scene.itemSprite(sprite);
  mesh.position.set(Math.round(x), Math.round(y) - 8, depthFor(y) + 0.01);
  scene.scene.add(mesh);
  const item = { x, y, kind, n, mesh, t: 0, mark: Boolean(opts.mark) };
  scene.state.groundLoot.push(item);
  if (!opts.quiet) {
    scene.spawnFx('sparkle', x, y - 8, 0.35, ['sparkle_0', 'sparkle_1']);
  }
  return item;
}

export function removeGroundLoot(scene, item) {
  if (!item) return;
  if (item.mesh) {
    scene.scene.remove(item.mesh);
    item.mesh = null;
  }
}

export function clearGroundLoot(scene) {
  for (const item of scene.state.groundLoot) scene.removeGroundLoot(item);
  scene.state.groundLoot = [];
}

export function addSurvivor(scene, spot) {
  const sprite = charSprite(scene.assets.chars2, scene.assets.chars2Data, 'polsky_coat');
  sprite.setDir('down');
  sprite.mesh.material.color.setHex(0x9aa3b0); // desaturado: es un vecino, no un héroe
  sprite.mesh.position.set(Math.round(spot.x), Math.round(spot.y) - 16, depthFor(spot.y));
  const shadow = makeShadow(scene.scene, scene.assets.shadow, 12, 4);
  shadow.material.opacity = 0.5;
  shadow.position.set(Math.round(spot.x), Math.round(spot.y) - 1, depthFor(spot.y) - 0.001);
  scene.scene.add(sprite.mesh);
  scene.scene.add(shadow);
  scene.survivor = { x: spot.x, y: spot.y, mesh: sprite.mesh, shadow, done: false };
}

export function clearSurvivor(scene) {
  if (!scene.survivor) return;
  if (scene.survivor.mesh) scene.scene.remove(scene.survivor.mesh);
  if (scene.survivor.shadow) scene.scene.remove(scene.survivor.shadow);
  scene.survivor = null;
}

export function updateLoot(scene, dt) {
  const player = scene.playerPoint;
  player.x = scene.player.x;
  player.feet = scene.player.feet;
  for (const item of scene.state.groundLoot) {
    item.t += dt;
    if (item.mark && item.t > 1.4) {
      item.t = 0;
      scene.spawnFx('sparkle', item.x, item.y - 8, 0.3, ['sparkle_0', 'sparkle_1']);
    }
  }
  // Versión sin asignaciones: escribe en lootOut y deja el array sobrante
  // para el cuadro siguiente (nunca es el mismo que groundLoot).
  const got = collectLootInto(
    scene.state.groundLoot, player, scene.state.bag, scene.state.rng, PICKUP_RADIUS, scene.lootOut,
  );
  if (got.taken.length) {
    scene.state.bag = got.bag;
    for (const item of got.takenItems) scene.removeGroundLoot(item);
    const spare = scene.state.groundLoot;
    scene.state.groundLoot = got.left;
    scene.lootOut.left = spare;
    for (const drop of got.taken) {
      scene.toast(`+${drop.n} ${LOOT_NAME[drop.kind] || drop.kind}`);
    }
  }

  if (scene.mochila) {
    scene.mochila.t += dt;
    if (picksUp(scene.mochila, player, MOCHILA_RADIUS)) {
      const rec = recoverAtMochila(scene.save, scene.state.bag);
      scene.save = rec.save;
      scene.state.bag = rec.bag;
      scene.mochila = null;
      scene.toast('Esto es mío... de otra vez.', 3.2);
      scene.spawnFx('sparkle', player.x, player.feet - 10, 0.5, ['sparkle_0', 'sparkle_1']);
    }
  }

  if (scene.survivor && !scene.survivor.done && picksUp(scene.survivor, player, 16)) {
    scene.survivor.done = true;
    const gift = survivorGift(scene.state.rng);
    scene.state.bag = addToBag(scene.state.bag, gift.kind, gift.n);
    scene.toast('¡Gracias! Tomá, es lo que tengo.', 3.2);
    scene.toast(`+${gift.n} ${LOOT_NAME[gift.kind] || gift.kind}`, 2);
  }
}
