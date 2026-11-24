// Dónde se puede dejar una cosa (y apoyar un mueble liviano). Lógica pura:
// sin Three.js ni DOM. Se apoya en la regla de alcance de src/reach.js.
//
// Piso (§5): casillero caminable, sin objeto con huella, sin warp, sin NPC ni
// Juan encima, sin otra cosa (salvo la misma apilable) y vecino del casillero
// de Juan (4 direcciones).
// Mueble (§6): como el piso para TODA su huella, sólido, y con el mueble
// puesto todos los interactivos y warps conservan un acceso alcanzable.
import {
  objectFootTiles, objectAccessTiles, playerFootTile, tileWalkable,
} from './reach.js';
import { getItem } from './items.js';
import { pointInRect } from './geom.js';

export const TILE = 16;
export const FLOOR_BASE_Y = 14;

const DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0]];
const keyOf = (tx, ty) => `${tx},${ty}`;

/** Posición de dibujo de una cosa tirada en el piso (base, centrada). */
export function floorPos(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + FLOOR_BASE_Y };
}

/** Cosa tirada en (tx,ty), o null. Acepta el modelo nuevo (`place`). */
export function floorItemAt(items, tx, ty, { ignoreUid = null } = {}) {
  for (const wi of items || []) {
    if (!wi || wi.uid === ignoreUid) continue;
    const place = wi.place;
    if (place?.kind === 'floor' && place.tx === tx && place.ty === ty) return wi;
  }
  return null;
}

/** Datos de superficie de un worldItem (modelo nuevo o viejo). */
export function surfacePlaceOf(wi) {
  if (!wi) return null;
  if (wi.place) return wi.place;
  if (wi.objectId && wi.slot != null) {
    return { kind: 'surface', objectId: wi.objectId, slot: wi.slot };
  }
  return null;
}

/** ¿Algún objeto del mapa tiene su huella en el casillero? */
export function objectFootAt(map, tx, ty, { ignoreId = null, includeHidden = false } = {}) {
  for (const obj of map?.objects || []) {
    if (!obj || obj.id === ignoreId) continue;
    if (obj.hidden && !includeHidden) continue;
    if (objectFootTiles(obj).some((t) => t.tx === tx && t.ty === ty)) return obj;
  }
  return null;
}

export function npcFootAt(npcs, tx, ty) {
  for (const npc of npcs || []) {
    if (!npc || npc.hidden) continue;
    const fx = Math.floor(npc.x / TILE);
    const fy = Math.floor((npc.feet - 1) / TILE);
    if (fx === tx && fy === ty) return npc;
  }
  return null;
}

export function warpAtTile(warps, tx, ty) {
  const cx = tx * TILE + TILE / 2;
  const cy = ty * TILE + TILE / 2;
  for (const w of warps || []) {
    if (!w) continue;
    if (pointInRect({ x: cx, y: cy }, w)) return w;
  }
  return null;
}

/** ¿El casillero toca (4 direcciones) el casillero de los pies de Juan? */
export function adjacentToPlayer(player, tx, ty) {
  if (!player) return true;
  const t = playerFootTile(player);
  return Math.abs(t.tx - tx) + Math.abs(t.ty - ty) === 1;
}

export function sameFloorTile(player, tx, ty) {
  if (!player) return false;
  const t = playerFootTile(player);
  return t.tx === tx && t.ty === ty;
}

/**
 * Chequeo de un casillero de piso para dejar/dejar apoyar algo.
 * Devuelve { ok, reason } con reason estable para tests.
 */
export function floorTileCheck({
  map, npcs = [], warps = [], player = null, items = [],
  tx, ty, itemId = null, ignoreUid = null, requireAdjacent = true,
}) {
  if (!map) return { ok: false, reason: 'mapa' };
  if (tx < 0 || ty < 0 || tx >= (map.cols || 0) || ty >= (map.rows || 0)) {
    return { ok: false, reason: 'fuera' };
  }
  if (!tileWalkable(map, tx, ty)) return { ok: false, reason: 'solido' };
  if (objectFootAt(map, tx, ty)) return { ok: false, reason: 'objeto' };
  if (npcFootAt(npcs, tx, ty)) return { ok: false, reason: 'npc' };
  if (warpAtTile(warps, tx, ty)) return { ok: false, reason: 'warp' };
  if (sameFloorTile(player, tx, ty)) return { ok: false, reason: 'juan' };
  const thing = floorItemAt(items, tx, ty, { ignoreUid });
  if (thing) {
    const stackable = itemId && thing.itemId === itemId && Boolean(getItem(itemId).stack);
    if (!stackable) return { ok: false, reason: 'cosa' };
  }
  if (requireAdjacent && !adjacentToPlayer(player, tx, ty)) {
    return { ok: false, reason: 'lejos' };
  }
  return { ok: true, reason: null };
}

/** ¿Se puede dejar `itemId` en el piso apuntado? */
export function canDropFloor(opts) {
  return floorTileCheck(opts).ok;
}

/**
 * Agrega una cosa al piso (o suma count si ya hay una igual apilable).
 * Devuelve un arreglo NUEVO de worldItems.
 */
export function dropFloorItem(items, itemId, count, tx, ty) {
  const list = items || [];
  const existing = floorItemAt(list, tx, ty);
  if (existing && getItem(itemId).stack) {
    return list.map((wi) => (
      wi.uid === existing.uid ? { ...wi, count: (wi.count || 1) + count } : wi
    ));
  }
  const pos = floorPos(tx, ty);
  let n = 1;
  let uid = `floor:${tx},${ty}:${n}`;
  while (list.some((wi) => wi.uid === uid)) {
    n += 1;
    uid = `floor:${tx},${ty}:${n}`;
  }
  return [...list, {
    uid,
    itemId,
    count,
    objectId: null,
    slot: null,
    place: { kind: 'floor', tx, ty },
    x: pos.x,
    y: pos.y,
  }];
}

/** Slot libre de una superficie más cercano a un punto (o a Juan). */
export function nearestFreeSlot(obj, items, near = null) {
  if (!obj || !obj.surface || !Array.isArray(obj.surface.slots)) return null;
  const onObject = (items || []).filter(
    (wi) => surfacePlaceOf(wi)?.objectId === obj.id,
  );
  const max = Number.isFinite(obj.surface.maxItems)
    ? obj.surface.maxItems : obj.surface.slots.length;
  if (onObject.length >= max) return null;
  const used = new Set(onObject.map((wi) => surfacePlaceOf(wi).slot));
  const origin = { x: (obj.x || 0) * TILE, y: (obj.y || 0) * TILE };
  const center = near || {
    x: origin.x + ((obj.tw || 1) * TILE) / 2,
    y: origin.y + ((obj.th || 1) * TILE) / 2,
  };
  let best = null;
  obj.surface.slots.forEach((slot, index) => {
    if (used.has(index)) return;
    const pos = { x: origin.x + (slot.x || 0), y: origin.y + (slot.y || 0) };
    const d = Math.hypot(pos.x - center.x, pos.y - center.y);
    if (!best || d < best.d) best = { slot: index, pos, d };
  });
  return best ? { slot: best.slot, pos: best.pos } : null;
}

/** BFS de casilleros caminables desde los pies de Juan. */
export function reachableTiles(map, player) {
  const start = playerFootTile(player);
  const seen = new Set();
  if (!tileWalkable(map, start.tx, start.ty)) return seen;
  seen.add(keyOf(start.tx, start.ty));
  const queue = [start];
  while (queue.length) {
    const t = queue.pop();
    for (const [dx, dy] of DIRS) {
      const nx = t.tx + dx;
      const ny = t.ty + dy;
      const key = keyOf(nx, ny);
      if (seen.has(key) || !tileWalkable(map, nx, ny)) continue;
      seen.add(key);
      queue.push({ tx: nx, ty: ny });
    }
  }
  return seen;
}

/** Mapa de trabajo con el mueble llevado afuera y el nuevo puesto adentro. */
function mapWithFurniture(map, object, tx, ty, { removeId = null } = {}) {
  const objects = [];
  for (const obj of map.objects || []) {
    if (!obj) continue;
    if (obj.hidden || obj.id === removeId) continue;
    objects.push(obj);
  }
  objects.push({ ...object, x: tx, y: ty, hidden: false, solid: true });
  return { ...map, objects };
}

function npcAccessTiles(npc, map) {
  const tx = Math.floor(npc.x / TILE);
  const ty = Math.floor((npc.feet - 1) / TILE);
  const out = [];
  for (const [dx, dy] of DIRS) {
    if (tileWalkable(map, tx + dx, ty + dy)) out.push(keyOf(tx + dx, ty + dy));
  }
  return out;
}

function warpReachable(warp, map, reachable) {
  const x0 = Math.floor(warp.x / TILE);
  const x1 = Math.floor((warp.x + warp.w - 1) / TILE);
  const y0 = Math.floor(warp.y / TILE);
  const y1 = Math.floor((warp.y + warp.h - 1) / TILE);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (reachable.has(keyOf(x, y))) return true;
    }
  }
  return false;
}

/**
 * ¿Todos los interactivos y warps conservan un acceso alcanzable con el
 * mueble apoyado en (tx,ty)? (§6)
 */
export function keepsMapReachable({ map, npcs = [], warps = [], player, object, tx, ty }) {
  const temp = mapWithFurniture(map, object, tx, ty, { removeId: object.id });
  const reachable = reachableTiles(temp, player);
  if (!reachable.size) return false;

  for (const obj of temp.objects) {
    if (!obj || obj.hidden) continue;
    if (!(obj.type || obj.interact || obj.container)) continue;
    const access = objectAccessTiles(obj, temp);
    if (![...access].some((k) => reachable.has(k))) return false;
  }
  for (const npc of npcs) {
    if (!npc || npc.hidden) continue;
    const access = npcAccessTiles(npc, temp);
    if (!access.some((k) => reachable.has(k))) return false;
  }
  for (const warp of warps) {
    if (!warp) continue;
    if (!warpReachable(warp, temp, reachable)) return false;
  }
  return true;
}

/**
 * Chequeo completo de apoyar un mueble liviano en (tx,ty).
 * Devuelve { ok, reason } ('taparia' si corta un acceso).
 */
export function supportCheck({
  map, objects = [], npcs = [], warps = [], player, items = [], object, tx, ty,
  requireAdjacent = true,
}) {
  if (!object) return { ok: false, reason: 'objeto' };
  if (requireAdjacent && !adjacentToPlayer(player, tx, ty)) {
    return { ok: false, reason: 'lejos' };
  }
  const tw = Math.max(1, object.tw || 1);
  const th = Math.max(1, object.th || 1);
  const p = playerFootTile(player);
  for (let y = ty; y < ty + th; y++) {
    for (let x = tx; x < tx + tw; x++) {
      if (x < 0 || y < 0 || x >= (map.cols || 0) || y >= (map.rows || 0)) {
        return { ok: false, reason: 'fuera' };
      }
      if (p.tx === x && p.ty === y) return { ok: false, reason: 'juan' };
      if (objectFootAt(map, x, y, { ignoreId: object.id })) {
        return { ok: false, reason: 'objeto' };
      }
      if (npcFootAt(npcs, x, y)) return { ok: false, reason: 'npc' };
      if (warpAtTile(warps, x, y)) return { ok: false, reason: 'warp' };
      if (floorItemAt(items, x, y)) return { ok: false, reason: 'cosa' };
      // El piso del mueble: no alcanza con que el tile base sea caminable,
      // todos sus casilleros tienen que serlo (no pared).
      if (!tileWalkable(map, x, y, { ignoreId: object.id })) {
        return { ok: false, reason: 'solido' };
      }
    }
  }
  if (!keepsMapReachable({
    map, npcs, warps, player, object, tx, ty,
  })) {
    return { ok: false, reason: 'taparia' };
  }
  return { ok: true, reason: null };
}

/** Casilleros de la huella de un mueble apoyado en (tx,ty). */
