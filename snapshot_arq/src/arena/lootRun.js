// Lógica pura del botín de la salida: qué suelta cada bicho, qué levanta Juan
// al pisar un punto del piso y la mochila de otra vez. Sin three ni DOM.

import { enemyDrop, spotLoot, pickMochilaSpot, recoverMochila, dropMochila,
  addToBag, emptyBag, LOOT_KINDS, LOOT_ITEM, LOOT_NAME } from '../run/loot.js';

export const PICKUP_RADIUS = 10;
export const MOCHILA_RADIUS = 12;

/** Botín que suelta un enemigo al morir: delega en enemyDrop. */
export function dropsFor(type, rng) { return enemyDrop(type, rng); }

/** ¿El jugador (x, feet) está encima del botín? Usá player.feet ?? player.y. */
export function picksUp(loot, player, radius = PICKUP_RADIUS) {
  if (!loot || !player) return false;
  const px = Number(player.x);
  const py = Number(player.feet ?? player.y);
  const lx = Number(loot.x);
  const ly = Number(loot.y);
  if (![px, py, lx, ly].every(Number.isFinite)) return false;
  const dx = lx - px;
  const dy = ly - py;
  const r = Number(radius);
  if (!Number.isFinite(r) || r < 0) return false;
  return dx * dx + dy * dy <= r * r;
}

/**
 * Resuelve qué da un punto del piso:
 *  - kind 'loot' o 'nafta' (marcas del mapa) -> spotLoot({kind}, rng)
 *  - cualquier otro kind (chatarra/goma/pieza) -> { kind, n: item.n ?? 1 }
 */
export function resolvePickup(item, rng) {
  if (!item || !item.kind) return null;
  if (item.kind === 'loot' || item.kind === 'nafta') return spotLoot({ kind: item.kind }, rng);
  return { kind: item.kind, n: item.n ?? 1 };
}

/**
 * Recoge de una lista de items {x,y,kind,n?} los que el jugador pisa.
 * Nunca muta los items ni la bolsa. Devuelve:
 *   { bag, taken: [{kind,n}], takenItems: [item...], left: [item...] }
 * Versión con `out` reutilizable para el loop de la arena: escribe en ese
 * objeto sin crear arrays nuevos. `out.left` NO puede ser el mismo array que
 * `items` (se vacía antes de recorrer); la arena le da un buffer aparte.
 */
export function collectLootInto(items, player, bag, rng, radius = PICKUP_RADIUS, out = null) {
  const res = out || { bag: null, taken: [], takenItems: [], left: [] };
  const list = Array.isArray(items) ? items : [];
  let nextBag = bag ?? emptyBag();
  const taken = res.taken;
  const takenItems = res.takenItems;
  const left = res.left;
  taken.length = 0;
  takenItems.length = 0;
  left.length = 0;

  for (const item of list) {
    if (!item || !picksUp(item, player, radius)) {
      left.push(item);
      continue;
    }
    const resolved = resolvePickup(item, rng);
    if (!resolved) {
      left.push(item);
      continue;
    }
    nextBag = addToBag(nextBag, resolved.kind, resolved.n);
    taken.push(resolved);
    takenItems.push(item);
  }
  res.bag = nextBag;
  return res;
}

/** collectLoot: igual que collectLootInto pero siempre con arrays nuevos. */
export function collectLoot(items, player, bag, rng, radius = PICKUP_RADIUS) {
  return collectLootInto(items, player, bag, rng, radius);
}

/** Mochila de otra vez: aparece en un punto loot que no sea la casa. */
export function mochilaSpot(lootSpots, rng, excludeCell = 'casa') {
  return pickMochilaSpot(lootSpots, rng, excludeCell); // spot | null
}

/** ¿El save tiene mochila tirada? */
export function hasMochila(save) { return Boolean(save?.mochila?.contenido); }

/** Al tocarla: { save (mochila:null), bag (sumada) } */
export function recoverAtMochila(save, bag) { return recoverMochila(save, bag); }

/** Al morir: save NUEVO con la mochila de esta salida (reemplaza la anterior). */
export function mochilaOnDeath(save, bag, loop) { return dropMochila(save, bag, loop); }

/** Regalo del sobreviviente: +2 de un tipo al azar de LOOT_KINDS -> {kind,n:2} */
export function survivorGift(rng) {
  const r = typeof rng === 'function' ? Number(rng()) : 0;
  const i = Number.isFinite(r)
    ? Math.min(LOOT_KINDS.length - 1, Math.max(0, Math.floor(r * LOOT_KINDS.length)))
    : 0;
  return { kind: LOOT_KINDS[i], n: 2 };
}

/**
 * Texto de la bolsa para el cartel: '3 chatarra, 1 goma' (omite ceros, orden
 * LOOT_KINDS, usa LOOT_NAME). Bolsa vacía -> ''.
 */
export function bagSummary(bag) {
  const parts = [];
  for (const kind of LOOT_KINDS) {
    const n = Number(bag?.[kind]);
    if (Number.isFinite(n) && n > 0) parts.push(`${n} ${LOOT_NAME[kind] ?? kind}`);
  }
  return parts.join(', ');
}

export { LOOT_ITEM, LOOT_NAME };
