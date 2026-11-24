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
export function setupLoot(state, view, svc) {
  svc.clearGroundLoot();
  // Las marcas apuntan al centro de la caja o del auto: se corre el botín
  // unos píxeles hasta el primer punto donde Juan puede pararse.
  view.lootPoints = (state.mapData.loot || []).map((spot) => {
    const point = svc.reachableGround(spot.x, spot.y);
    return { ...spot, x: point.x, y: point.y, markX: spot.x, markY: spot.y };
  });
  for (const spot of view.lootPoints) {
    const kind = spot.kind === 'nafta' ? 'nafta' : 'loot';
    svc.addGroundLoot(spot.x, spot.y, kind, 1, { mark: true });
  }
  // La mochila y el sobreviviente van en puntos de botín del piso (no sobre
  // los techos de los autos, donde están las marcas de nafta).
  const ground = view.lootPoints.filter((s) => s.kind === 'loot');
  const pool = ground.length ? ground : view.lootPoints;
  state.mochila = null;
  if (hasMochila(state.save)) {
    const spot = mochilaSpot(pool, state.rng);
    if (spot) state.mochila = { x: spot.x, y: spot.y, t: 0 };
  }
  state.survivor = null;
  if (state.eff.sobreviviente) {
    const spots = pool.filter((s) => s.cell !== 'casa'
      && (!state.mochila || s.x !== state.mochila.x || s.y !== state.mochila.y));
    if (spots.length) {
      const spot = spots[Math.floor(state.rng() * spots.length)];
      svc.addSurvivor(spot);
    }
  }
}

/** Punto libre más cercano a (x,y) para dejar un objeto en el piso. */
export function reachableGround(state, view, svc, x, y) {
  const offsets = [
    [0, 0], [0, 14], [0, -14], [16, 0], [-16, 0],
    [16, 14], [-16, 14], [0, 28], [0, -28], [28, 0], [-28, 0],
  ];
  for (const [dx, dy] of offsets) {
    const px = clamp(x + dx, state.arena.minX + 8, state.arena.maxX - 8);
    const py = clamp(y + dy, state.bounds.minFeet + 8, state.bounds.maxFeet - 2);
    const box = { x: px - 5, y: py - 6, w: 10, h: 6 };
    if (!view.world.isSolid(box)) return { x: px, y: py };
  }
  return { x, y };
}

/** Luz cálida del farol (mejora) siguiendo a Juan en el apagón. */
export function setupFarol(state, view, svc) {
  view.farolLight = null;
  if (!state.eff.farol) return;
  view.farolLight = svc.addMapLight({
    x: view.player.x,
    y: view.player.feet,
    radius: FAROL_RADIUS,
    color: '#ffcf6e',
    kind: 'candle',
    flicker: 0.03,
    state: 'on',
    onlyIn: 'apagon',
  });
}

export function itemMaterial(state, view, svc, name) {
  if (view.itemMats.has(name)) return view.itemMats.get(name);
  const frame = svc.assets.itemsData.frames[name];
  if (!frame) throw new Error(`Falta el item ${name} en items.json`);
  const texture = regionTexture(svc.assets.items, frame[0], frame[1], frame[2], frame[3]);
  const material = new THREE.MeshBasicMaterial({
    map: texture, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide,
  });
  view.itemMats.set(name, material);
  return material;
}

export function itemGeometry(state, view, svc, name) {
  if (view.itemGeos.has(name)) return view.itemGeos.get(name);
  const frame = svc.assets.itemsData.frames[name];
  const geometry = new THREE.PlaneGeometry(frame[2], frame[3]);
  view.itemGeos.set(name, geometry);
  return geometry;
}

export function itemSprite(state, view, svc, name) {
  return new THREE.Mesh(svc.itemGeometry(name), svc.itemMaterial(name));
}

export function addGroundLoot(state, view, svc, x, y, kind, n = 1, opts = {}) {
  const sprite = LOOT_ITEM[kind] || 'chatarra';
  const mesh = svc.itemSprite(sprite);
  mesh.position.set(Math.round(x), Math.round(y) - 8, depthFor(y) + 0.01);
  view.three.add(mesh);
  const item = { x, y, kind, n, mesh, t: 0, mark: Boolean(opts.mark) };
  state.groundLoot.push(item);
  if (!opts.quiet) {
    svc.spawnFx('sparkle', x, y - 8, 0.35, ['sparkle_0', 'sparkle_1']);
  }
  return item;
}

export function removeGroundLoot(state, view, svc, item) {
  if (!item) return;
  if (item.mesh) {
    view.three.remove(item.mesh);
    item.mesh = null;
  }
}

export function clearGroundLoot(state, view, svc) {
  for (const item of state.groundLoot) svc.removeGroundLoot(item);
  state.groundLoot = [];
}

export function addSurvivor(state, view, svc, spot) {
  const sprite = charSprite(svc.assets.chars2, svc.assets.chars2Data, 'polsky_coat');
  sprite.setDir('down');
  sprite.mesh.material.color.setHex(0x9aa3b0); // desaturado: es un vecino, no un héroe
  sprite.mesh.position.set(Math.round(spot.x), Math.round(spot.y) - 16, depthFor(spot.y));
  const shadow = makeShadow(view.three, svc.assets.shadow, 12, 4);
  shadow.material.opacity = 0.5;
  shadow.position.set(Math.round(spot.x), Math.round(spot.y) - 1, depthFor(spot.y) - 0.001);
  view.three.add(sprite.mesh);
  view.three.add(shadow);
  state.survivor = { x: spot.x, y: spot.y, mesh: sprite.mesh, shadow, done: false };
}

export function clearSurvivor(state, view, svc) {
  if (!state.survivor) return;
  if (state.survivor.mesh) view.three.remove(state.survivor.mesh);
  if (state.survivor.shadow) view.three.remove(state.survivor.shadow);
  state.survivor = null;
}

export function updateLoot(state, view, svc, dt) {
  const player = view.playerPoint;
  player.x = view.player.x;
  player.feet = view.player.feet;
  for (const item of state.groundLoot) {
    item.t += dt;
    if (item.mark && item.t > 1.4) {
      item.t = 0;
      svc.spawnFx('sparkle', item.x, item.y - 8, 0.3, ['sparkle_0', 'sparkle_1']);
    }
  }
  // Versión sin asignaciones: escribe en lootOut y deja el array sobrante
  // para el cuadro siguiente (nunca es el mismo que groundLoot).
  const got = collectLootInto(
    state.groundLoot, player, state.bag, state.rng, PICKUP_RADIUS, view.lootOut,
  );
  if (got.taken.length) {
    state.bag = got.bag;
    for (const item of got.takenItems) svc.removeGroundLoot(item);
    const spare = state.groundLoot;
    state.groundLoot = got.left;
    view.lootOut.left = spare;
    for (const drop of got.taken) {
      svc.toast(`+${drop.n} ${LOOT_NAME[drop.kind] || drop.kind}`);
    }
  }

  if (state.mochila) {
    state.mochila.t += dt;
    if (picksUp(state.mochila, player, MOCHILA_RADIUS)) {
      const rec = recoverAtMochila(state.save, state.bag);
      state.save = rec.save;
      state.bag = rec.bag;
      state.mochila = null;
      svc.toast('Esto es mío... de otra vez.', 3.2);
      svc.spawnFx('sparkle', player.x, player.feet - 10, 0.5, ['sparkle_0', 'sparkle_1']);
    }
  }

  if (state.survivor && !state.survivor.done && picksUp(state.survivor, player, 16)) {
    state.survivor.done = true;
    const gift = survivorGift(state.rng);
    state.bag = addToBag(state.bag, gift.kind, gift.n);
    svc.toast('¡Gracias! Tomá, es lo que tengo.', 3.2);
    svc.toast(`+${gift.n} ${LOOT_NAME[gift.kind] || gift.kind}`, 2);
  }
}
