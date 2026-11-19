// Superficies y objetos apoyados (§4): lógica pura + una capa de render.
//
// Un mueble declara en el mapa:
//   surface: { slots: [{x, y}, ...], maxItems }
// Las coordenadas de cada slot son px relativos a la esquina superior izquierda
// del sprite del mueble y marcan el punto de apoyo (centro-abajo) del objeto.
// Los worldItems son { uid, itemId, objectId, slot, x, y }.

import { addItem, removeItem } from './inventory.js';
import { getItem, isGrabbable } from './items.js';
import { lookLine } from './data/descriptions.js';
import { INITIAL_ITEMS } from './data/surfaces.js';
import { depthFor } from './sprite.js';
import { createItemVisual } from './worldItems.js';
import {
  floorPos, surfacePlaceOf, dropFloorItem,
} from './placement.js';
import { tileWalkable } from './reach.js';

export const TILE = 16;
export const SPARKLE_PERIOD = 1.5;
export const NO_SPACE_MESSAGE = 'No hay lugar.';

/**
 * Estado de cosas por partida (§3): game.world[mapId] = { items, moved }.
 * Se crea desde INITIAL_ITEMS la primera vez que se toca el mapa y se borra
 * entero en reset() (lo hace main.js con game.world = {}).
 */
export function ensureWorldState(game, mapId, mapData = null, initialItems = INITIAL_ITEMS) {
  if (!game.world) game.world = {};
  let state = game.world[mapId];
  if (!state) {
    state = { items: itemsForMap(mapId, initialItems, mapData), moved: {} };
    game.world[mapId] = state;
  }
  if (!Array.isArray(state.items)) state.items = [];
  if (!state.moved || typeof state.moved !== 'object') state.moved = {};
  return state;
}

/** Borra el estado de cosas de la partida (reset() de main.js). */
export function resetWorld(game) {
  game.world = {};
  game.carry = null;
  // Las líneas de mirar de la primera vez también son por partida.
  game.seenLook = {};
}

// ---------------------------------------------------------------- slots

/** Lista de slots declarados por un objeto (vacía si no tiene superficie). */
export function surfaceSlots(obj) {
  if (!obj || !obj.surface || !Array.isArray(obj.surface.slots)) return [];
  return obj.surface.slots;
}

/** Tamaño real del sprite declarado en el objeto, o tw/th * 16. */
export function objectSize(obj) {
  if (!obj) return { w: 0, h: 0 };
  const size = obj.spriteSize || obj._w || obj._h
    ? obj.spriteSize || obj
    : null;
  const w = Number.isFinite(size && size.w) ? size.w
    : Number.isFinite(size && size._w) ? size._w
      : (obj.tw || 0) * TILE;
  const h = Number.isFinite(size && size.h) ? size.h
    : Number.isFinite(size && size._h) ? size._h
      : (obj.th || 0) * TILE;
  return { w, h };
}

/** Origen en px del sprite del objeto (esquina superior izquierda). */
export function surfaceOrigin(obj) {
  return { x: (obj?.x || 0) * TILE, y: (obj?.y || 0) * TILE };
}

/**
 * Posición en px del mundo del slot `n` (o de un slot {x,y} suelto).
 * Devuelve null si el objeto no tiene ese slot.
 */
export function surfaceSlot(obj, n) {
  const slots = surfaceSlots(obj);
  const raw = typeof n === 'object' && n ? n : slots[n];
  if (!raw) return null;
  const origin = surfaceOrigin(obj);
  return { x: origin.x + (raw.x || 0), y: origin.y + (raw.y || 0) };
}

/** ¿Hay lugar en el slot (y no se pasó maxItems)? */
export function canPlace(obj, items, slot) {
  if (!obj || !obj.surface) return false;
  const slots = surfaceSlots(obj);
  if (slots.length === 0) return false;
  const index = slot == null ? nextSlot(obj, items) : slot;
  if (!Number.isInteger(index) || index < 0 || index >= slots.length) return false;
  const onObject = (items || []).filter((wi) => surfacePlaceOf(wi)?.objectId === obj.id);
  if (onObject.some((wi) => surfacePlaceOf(wi)?.slot === index)) return false;
  const max = Number.isFinite(obj.surface.maxItems)
    ? obj.surface.maxItems
    : slots.length;
  return onObject.length < max;
}

/** Primer slot libre del objeto, o -1. */
export function nextSlot(obj, items) {
  if (!obj || !obj.surface) return -1;
  const slots = surfaceSlots(obj);
  const onObject = (items || []).filter((wi) => surfacePlaceOf(wi)?.objectId === obj.id);
  const max = Number.isFinite(obj.surface.maxItems)
    ? obj.surface.maxItems
    : slots.length;
  if (onObject.length >= max) return -1;
  const used = new Set(onObject.map((wi) => surfacePlaceOf(wi)?.slot));
  for (let i = 0; i < slots.length; i++) {
    if (!used.has(i)) return i;
  }
  return -1;
}

/** ¿Qué worldItem hay en (objeto, slot)? */
export function itemAt(items, objId, slot) {
  return (items || []).find(
    (wi) => surfacePlaceOf(wi)?.objectId === objId
      && surfacePlaceOf(wi)?.slot === slot,
  ) || null;
}

function makeUid(items, objectId, slot) {
  const base = `${objectId || 'floor'}:${slot == null ? 'x' : slot}`;
  let n = 1;
  while ((items || []).some((wi) => wi && wi.uid === `${base}:${n}`)) n++;
  return `${base}:${n}`;
}

/**
 * Agrega un worldItem y devuelve un arreglo NUEVO. entrada:
 * { itemId, objectId, slot, x, y, object?, sprite?, uid?, count? }
 * Si no hay x/y pero sí `object`, resuelve la posición con surfaceSlot.
 */
export function placeItem(items, entry) {
  const next = (items || []).slice();
  if (!entry || !entry.itemId) return next;
  const place = entry.place || null;
  const objectId = place?.objectId ?? entry.objectId ?? entry.object?.id ?? null;
  const slot = place?.slot ?? entry.slot ?? null;

  let x = Number.isFinite(entry.x) ? entry.x : null;
  let y = Number.isFinite(entry.y) ? entry.y : null;
  if (place?.kind === 'floor') {
    const pos = floorPos(place.tx, place.ty);
    x = pos.x;
    y = pos.y;
  } else if ((x == null || y == null) && entry.object) {
    const pos = surfaceSlot(entry.object, slot);
    if (pos) {
      x = pos.x;
      y = pos.y;
    }
  }
  if (x == null || y == null) return next;

  const wi = {
    uid: entry.uid || makeUid(next, objectId, slot),
    itemId: entry.itemId,
    objectId,
    slot,
    place: place || { kind: 'surface', objectId, slot },
    x,
    y,
    count: Number.isFinite(entry.count) && entry.count > 0 ? entry.count : 1,
  };
  if (entry.sprite) wi.sprite = entry.sprite;
  next.push(wi);
  return next;
}

/** Saca un worldItem por uid. Devuelve { items, item } sin mutar la entrada. */
export function takeItem(items, uid) {
  const list = items || [];
  const index = list.findIndex((wi) => wi && (wi.uid === uid || wi.id === uid));
  if (index < 0) return { items: list.slice(), item: null };
  const next = list.slice();
  const [item] = next.splice(index, 1);
  return { items: next, item };
}

// ---------------------------------------------------------------- data por mapa

function mapDefinition(mapId, source) {
  const all = source || INITIAL_ITEMS;
  if (Array.isArray(all)) return { items: all, containers: {} };
  const def = all[mapId];
  if (!def) return { items: [], containers: {} };
  if (Array.isArray(def)) return { items: def, containers: {} };
  return {
    items: Array.isArray(def.items) ? def.items : [],
    containers: def.containers || {},
  };
}

function objectList(map) {
  if (!map) return [];
  if (Array.isArray(map)) return map;
  return Array.isArray(map.objects) ? map.objects : [];
}

/**
 * Resuelve los objetos iniciales de un mapa a worldItems con x/y en px.
 * `map` puede ser el mapa entero, su lista de objects, o null si cada entrada
 * ya trae x/y (o un `object` inline).
 */
export function itemsForMap(mapId, initialItems = INITIAL_ITEMS, map = null) {
  const def = mapDefinition(mapId, initialItems);
  const objects = objectList(map);
  const byId = new Map(objects.filter(Boolean).map((obj) => [obj.id, obj]));
  const out = [];

  def.items.forEach((entry, i) => {
    if (!entry || !entry.itemId) return;
    const object = entry.object || byId.get(entry.objectId) || null;
    const objectId = entry.objectId ?? (object && object.id) ?? null;
    const slot = entry.slot == null ? null : entry.slot;

    const place = entry.place
      || (Number.isInteger(entry.tx) && Number.isInteger(entry.ty)
        ? { kind: 'floor', tx: entry.tx, ty: entry.ty }
        : { kind: 'surface', objectId, slot });
    let x = Number.isFinite(entry.x) ? entry.x : null;
    let y = Number.isFinite(entry.y) ? entry.y : null;
    if (place.kind === 'floor') {
      const pos = floorPos(place.tx, place.ty);
      x = pos.x;
      y = pos.y;
    } else if ((x == null || y == null) && object && slot != null) {
      const pos = surfaceSlot(object, slot);
      if (pos) {
        x = pos.x;
        y = pos.y;
      }
    }
    if (x == null || y == null) return;

    const wi = {
      uid: entry.uid || `${mapId}:${objectId || `piso_${place.tx}_${place.ty}`}:${slot ?? 'x'}:${i}`,
      itemId: entry.itemId,
      objectId,
      slot,
      place,
      x,
      y,
      count: entry.count || 1,
    };
    if (entry.sprite) wi.sprite = entry.sprite;
    out.push(wi);
  });
  return out;
}

/** Items de contenedor declarados para un mapa: { objId: [{id, n}] }. */
export function containerItemsForMap(mapId, initialItems = INITIAL_ITEMS) {
  return mapDefinition(mapId, initialItems).containers;
}

/**
 * Devuelve una copia del mapa con los contenedores de la data rellenados,
 * sólo donde el mapa no trae items propios. No muta la entrada.
 */
export function applyContainers(map, initialItems = INITIAL_ITEMS, mapId = null) {
  if (!map || !Array.isArray(map.objects)) return map;
  const id = mapId || map.id;
  const data = containerItemsForMap(id, initialItems);
  if (Object.keys(data).length === 0) return map;

  const objects = map.objects.map((obj) => {
    const items = data[obj.id];
    if (!items) return obj;
    const current = obj.container && Array.isArray(obj.container.items)
      ? obj.container.items
      : [];
    if (current.length > 0) return obj;
    return {
      ...obj,
      container: {
        ...(obj.container || {}),
        name: obj.container?.name || obj.id,
        items: items.map((it) => ({ ...it })),
      },
    };
  });
  return { ...map, objects };
}

// ---------------------------------------------------------------- capa de render

/**
 * SurfaceLayer: dibuja y hace interactuables los objetos apoyados.
 * API para world.js:
 *   .candidates  [{id, kind:'surfaceItem', x, y, w, h, label, item, slot, objectId}]
 *   .update(dt, player)
 *   .take(candidate, inventory) -> { inventory, itemId, count }
 *   .dropSelected(inventory, selectedSlot, objectId, surfaceSlot)
 *   .describe(itemId, flags) -> string
 *   .sync(); .dispose()
 */
export class SurfaceLayer {
  constructor(scene, assets, map, worldItems = [], store = null) {
    this.scene = scene;
    this.assets = assets;
    this.map = map;
    // Estado persistente por partida ({ items, moved }), ver §3.
    this.store = store;
    this.objectById = new Map(
      objectList(map).filter(Boolean).map((obj) => [obj.id, obj]),
    );
    this.items = (worldItems || []).map((wi) => ({ ...wi }));
    this.candidates = [];
    this.visuals = [];
    this.time = 0;
    this.sync();
  }

  _position(wi) {
    const place = surfacePlaceOf(wi);
    if (place?.kind === 'floor') return floorPos(place.tx, place.ty);
    const obj = place && this.objectById.get(place.objectId);
    if (obj && place.slot != null) {
      const pos = surfaceSlot(obj, place.slot);
      if (pos) return pos;
    }
    if (Number.isFinite(wi?.x) && Number.isFinite(wi?.y)) {
      return { x: wi.x, y: wi.y };
    }
    return null;
  }

  _depth(wi) {
    const place = surfacePlaceOf(wi);
    if (place?.kind === 'floor') return depthFor(wi?.y || 0) + 0.01;
    const obj = place && this.objectById.get(place.objectId);
    const feet = obj ? (obj.y + obj.th) * TILE : (wi?.y || 0) + 8;
    const slotOffset = Number.isFinite(place?.slot) ? place.slot * 0.0005 : 0;
    return depthFor(feet) + 0.01 + slotOffset;
  }

  _persist() {
    if (this.store) this.store.items = this.items;
  }

  _worldItemOf(candidate) {
    if (!candidate) return null;
    if (typeof candidate === 'string') {
      return this.items.find((wi) => wi.uid === candidate) || null;
    }
    const uid = candidate.uid ?? candidate.worldItem?.uid;
    const found = this.items.find((wi) => wi.uid === uid);
    if (found) return found;
    return candidate.worldItem || null;
  }

  /** Rehace sprites y candidatos desde this.items. */
  sync() {
    for (const visual of this.visuals) visual.dispose();
    this.visuals = [];
    this.candidates = [];

    for (const wi of this.items) {
      if (!wi) continue;
      const pos = this._position(wi);
      if (!pos) continue;
      const item = getItem(wi.itemId);
      const grabbable = isGrabbable(wi.itemId);
      const visual = createItemVisual({
        scene: this.scene,
        assets: this.assets,
        item,
        itemId: wi.itemId,
        sprite: wi.sprite,
        x: pos.x,
        y: pos.y,
        z: this._depth(wi),
        grabbable,
      });
      this.visuals.push(visual);

      const w = Math.max(10, visual.w);
      const h = Math.max(12, visual.h);
      const place = surfacePlaceOf(wi);
      const floor = place?.kind === 'floor';
      const cand = {
        id: `${floor ? 'floor' : 'surface'}_${wi.uid}`,
        uid: wi.uid,
        kind: floor ? 'floorItem' : 'surfaceItem',
        priority: floor ? 1 : 2,
        x: pos.x,
        y: pos.y,
        w,
        h,
        cursorBox: { x: pos.x - w / 2, y: pos.y - h, w, h },
        label: `${grabbable ? 'Agarrar' : 'Mirar'} ${item.name}`,
        type: 'thing',
        name: item.name,
        item,
        worldItem: wi,
        slot: place?.slot ?? null,
        // Orden de dibujo: desempata objetos apoyados superpuestos.
        front: Number.isFinite(place?.slot) ? place.slot : 0,
        objectId: place?.objectId ?? null,
        grabbable,
      };
      if (floor) {
        // Una cosa en el piso no es sólida: se camina por encima y se agarra
        // desde su propio casillero o desde cualquier vecino caminable (§3).
        const { tx, ty } = place;
        cand.foot = [{ tx, ty }];
        const access = new Set([`${tx},${ty}`]);
        for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          if (tileWalkable(this.map, tx + dx, ty + dy)) access.add(`${tx + dx},${ty + dy}`);
        }
        cand.access = access;
        cand.floorPlace = place;
      }
      this.candidates.push(cand);
    }
    return this.candidates;
  }

  /** Brillo de 2 cuadros cada 1.5 s en los agarrables. */
  update(dt/*, player */) {
    this.time += dt;
    for (const visual of this.visuals) {
      if (!visual.sparkles || visual.sparkles.length === 0) continue;
      const phase = (this.time + visual.phase) % SPARKLE_PERIOD;
      const on = phase < 0.5;
      visual.sparkles[0].visible = on && phase < 0.25;
      if (visual.sparkles[1]) {
        visual.sparkles[1].visible = on && phase >= 0.25;
      }
    }
  }

  /**
   * Agarra un objeto de una superficie. Si el inventario está lleno no lo
   * saca del mundo. Devuelve { inventory, itemId, count, reason? }.
   */
  take(candidate, inventory) {
    const wi = this._worldItemOf(candidate);
    if (!wi) return { inventory, itemId: null, count: 0, reason: 'missing' };
    const item = getItem(wi.itemId);
    if (!isGrabbable(wi.itemId)) {
      return { inventory, itemId: wi.itemId, count: 0, reason: 'decor' };
    }

    const count = wi.count || 1;
    const result = addItem(inventory, wi.itemId, count);
    if (result.added <= 0) {
      return { inventory, itemId: wi.itemId, count: 0, reason: 'full' };
    }

    const left = count - result.added;
    if (left > 0) {
      this.items = this.items.map((w) => (
        w.uid === wi.uid ? { ...w, count: left } : w
      ));
    } else {
      this.items = takeItem(this.items, wi.uid).items;
    }
    this.sync();
    this._persist();
    return { inventory: result.slots, itemId: wi.itemId, count: result.added, item };
  }

  /**
   * Deja el objeto seleccionado en la barra sobre una superficie.
   * Devuelve { inventory, placed:{itemId, slot, objectId} } o null si no hay
   * lugar / el target no tiene superficie. El lead muestra NO_SPACE_MESSAGE.
   */
  dropSelected(inventory, selectedSlot, objectId, surfaceSlotIndex) {
    const entry = typeof selectedSlot === 'number'
      ? inventory[selectedSlot]
      : selectedSlot;
    if (!entry || !entry.id) return null;

    const obj = this.objectById.get(objectId);
    if (!obj || !obj.surface) return null;

    const slot = Number.isInteger(surfaceSlotIndex)
      ? surfaceSlotIndex
      : nextSlot(obj, this.items);
    if (!canPlace(obj, this.items, slot)) return null;

    const pos = surfaceSlot(obj, slot);
    if (!pos) return null;

    const removed = removeItem(inventory, entry.id, 1);
    if (removed.removed <= 0) return null;

    const item = getItem(entry.id);
    this.items = placeItem(this.items, {
      itemId: entry.id,
      objectId,
      slot,
      place: { kind: 'surface', objectId, slot },
      x: pos.x,
      y: pos.y,
      object: obj,
      sprite: item.worldSprite,
    });
    this.sync();
    this._persist();
    return {
      inventory: removed.slots,
      placed: { itemId: entry.id, slot, objectId },
    };
  }

  /**
   * Deja el ítem elegido en el piso (§5). Si es apilable y ya hay uno igual
   * en ese casillero, suma `count`. Devuelve { inventory, placed } o null.
   */
  dropOnFloor(inventory, selectedSlot, tx, ty) {
    const entry = typeof selectedSlot === 'number'
      ? inventory[selectedSlot]
      : selectedSlot;
    if (!entry || !entry.id) return null;
    const item = getItem(entry.id);
    const removed = removeItem(inventory, entry.id, 1);
    if (removed.removed <= 0) return null;
    this.items = dropFloorItem(this.items, entry.id, 1, tx, ty).map((wi) => (
      wi.itemId === entry.id && wi.place?.kind === 'floor'
        && wi.place.tx === tx && wi.place.ty === ty
        ? { ...wi, sprite: wi.sprite || item.worldSprite } : wi
    ));
    this.sync();
    this._persist();
    return { inventory: removed.slots, placed: { itemId: entry.id, tx, ty } };
  }

  /** Texto de "Mirar": descripción del item o línea propia del decorativo. */
  describe(itemId, flags = {}) {
    const item = getItem(itemId);
    if (item.kind === 'decor') {
      return lookLine(itemId, flags) || item.description;
    }
    return item.description;
  }

  dispose() {
    for (const visual of this.visuals) visual.dispose();
    this.visuals = [];
    this.candidates = [];
  }
}
