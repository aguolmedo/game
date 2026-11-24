// Resolvedor único de acciones (DIRECCION.md, "Tipos de objeto"): lógica pura,
// sin Three.js ni DOM.
//
// Todo interactivo declara `type` (uno de los ocho de src/data/types.js) y
// `name` (con artículo: "el parlante", "la radio"; las personas, sin artículo).
// El tipo fija el verbo de Hacer; los aparatos lo fijan por estado.
// Orden: uso del ítem en la mano (ITEM_USES) -> verbo del tipo -> Mirar.
// WorldScene solo lee `.label` (prompt, barra, tests) y ejecuta `.kind`.

import { ITEM_USES, SELF_USES } from './data/actions.js';
import { closedFlag } from './data/flags.js';
import { TYPE_VERBS } from './data/types.js';
import { getItem, isGrabbable } from './items.js';
import { addItem } from './inventory.js';
import {
  canDropFloor, nearestFreeSlot, surfacePlaceOf, supportCheck, floorPos,
} from './placement.js';

/** Objeto del mapa detrás de un candidato. */
function refOf(target) {
  return (target && (target.ref || target)) || null;
}

/** Tipo del objetivo (los ítems apoyados/sueltos y las personas también). */
export function typeOf(target) {
  if (!target) return null;
  if (target.kind === 'npc') return 'person';
  if (target.kind === 'warp') return 'passage';
  if (target.kind === 'pickup' || target.kind === 'surfaceItem'
    || target.kind === 'floorItem') return 'thing';
  const obj = refOf(target);
  if (target.kind === 'container') return obj?.type || 'container';
  if (obj?.type) return obj.type;
  // Compatibilidad con objetos viejos sin `type` (tests y guardados): el
  // contenedor, la estación de calor y la ventana abrible se deducen.
  if (obj?.container) return 'container';
  if (obj?.station || obj?.window?.openable) return 'device';
  if (obj?.window?.view) return 'view';
  return 'decor';
}

/** Verbo base del tipo; para device, el verbo del estado. */
export function verbFor(type, state = null) {
  if (type === 'device') {
    if (state && typeof state === 'object' && state.verb) return state.verb;
    if (typeof state === 'string' && state) return state;
    return TYPE_VERBS.device;
  }
  return TYPE_VERBS[type] || null;
}

/**
 * Estado declarado de un aparato: { id, verb, action, ... }.
 * Los mapas lo declaran con `device: { state(game), action, states }`.
 */
export function stateOf(target, game = {}) {
  if (typeOf(target) !== 'device') return null;
  const obj = refOf(target);
  if (!obj) return null;
  const dev = obj.device || {};
  const flags = game.flags || {};
  if (!obj.device) {
    if (obj.station === 'heat') {
      // La pava se agarra con Manos, no con Hacer (§9).
      return game.pavaStation === obj.id
        ? { id: 'ocupada', verb: 'Mirar', action: 'look' }
        : { id: 'libre', verb: 'Mirar', action: 'look' };
    }
    if (obj.window?.openable) {
      const closed = Boolean(flags[closedFlag(obj.id)]);
      return closed
        ? { id: 'closed', verb: 'Abrir', action: 'window' }
        : { id: 'open', verb: 'Cerrar', action: 'window' };
    }
    return { id: 'normal', verb: 'Mirar', action: 'look' };
  }
  let id;
  if (typeof dev.state === 'function') id = dev.state(game);
  else if (dev.flag) id = flags[dev.flag] ? 'on' : 'off';
  else if (obj.window?.openable) id = flags[closedFlag(obj.id)] ? 'closed' : 'open';
  else if (obj.station === 'heat') id = game.pavaStation === obj.id ? 'ocupada' : 'libre';
  else id = dev.initial || 'normal';
  const raw = dev.states && dev.states[id];
  if (typeof raw === 'string') return { id, verb: raw, action: dev.action || 'look' };
  return { id, verb: TYPE_VERBS.device, action: dev.action || 'look', ...(raw || {}) };
}

/** Nombre visible del objetivo, con el artículo que declaró el mapa. */
export function nameOf(target) {
  if (!target) return '';
  const obj = refOf(target);
  const type = typeOf(target);
  if (type === 'person') {
    return target.npc?.name || target.name || obj?.name || target.id || '';
  }
  if (type === 'passage') {
    return target.warp?.label || target.label || obj?.name || 'Entrar';
  }
  if (type === 'thing') {
    if (target.item?.name) return target.item.name;
    if (target.worldItem?.itemId) return getItem(target.worldItem.itemId).name;
  }
  return obj?.name || target.name || obj?.container?.name || target.id || '';
}

/** "Verbo + nombre" generado, sin textos escritos a mano en los mapas. */
export function labelFor(type, name, state = null) {
  switch (type) {
    case 'passage': return name;
    case 'person': return `Hablar con ${name}`;
    case 'view': return `Asomarse a ${name}`;
    case 'seat': return 'Sentarse';
    case 'container': return `Abrir ${name}`;
    case 'thing': return `Agarrar ${name}`;
    case 'device': {
      const verb = verbFor(type, state);
      return state && state.name === false ? verb : `${verb} ${name}`;
    }
    default: return `${verbFor(type, state) || 'Mirar'} ${name}`;
  }
}

/**
 * Mueble que representa la estación de `target`, o null.
 * - Un objeto con `station` es la estación él mismo.
 * - Un objeto apoyado hereda la estación del mueble SOLO si el mueble declara
 *   `stationItem` y coincide con el ítem apoyado (en el banco, el calentador;
 *   la tijera o la tela no).
 */
export function stationOf(target, objects = []) {
  if (!target) return null;
  if (target.kind === 'object' || target.kind === 'container') {
    const ref = target.ref || target;
    return ref && ref.station ? ref : null;
  }
  if (target.kind === 'surfaceItem') {
    const obj = (objects || []).find((o) => o && o.id === target.objectId);
    if (!obj || !obj.station) return null;
    const itemId = target.item?.id || target.worldItem?.itemId;
    return obj.stationItem === itemId ? obj : null;
  }
  return null;
}

/** ¿El `item` de una fila de la tabla matchea el id en la mano? */
function matchesItem(matcher, heldId) {
  if (!heldId || !matcher) return false;
  if (matcher instanceof RegExp) return matcher.test(heldId);
  return matcher === heldId;
}

/** Etiqueta de una fila: string o función del estado (game, id). */
function labelOf(row, game, heldId) {
  return typeof row.label === 'function' ? row.label(game || {}, heldId) : row.label;
}

/**
 * ¿La fila `on` matchea el objetivo? Devuelve el objeto de referencia que la
 * fila nombra (el de su `on`), o null si no matchea.
 */
function matchOn(ctx, on, target) {
  if (!on || !target) return null;
  const game = ctx.game || {};
  const objects = ctx.objects || [];
  if (on.kind && target.kind !== on.kind) return null;
  const obj = target.ref || target;

  let station = null;
  if (on.station) {
    station = stationOf(target, objects);
    if (!station || station.station !== on.station) return null;
    if (on.free && game.pavaStation === station.id) return null;
  }
  if (on.objectId && obj.id !== on.objectId) return null;
  if (on.window === 'openable' && !obj.window?.openable) return null;
  if (on.open === true && game.flags?.[closedFlag(obj.id)]) return null;
  if (on.open === false && !game.flags?.[closedFlag(obj.id)]) return null;
  if (on.idMatch && !on.idMatch.test(target.id || '')) return null;
  if (on.kind === 'npc') return target.npc || target;
  return station || obj;
}

/** Fila de ITEM_USES que aplica a (item en mano, objetivo), o null. */
function matchItemUse(ctx, target, heldId) {
  const game = ctx.game || {};
  for (const row of ITEM_USES) {
    if (!matchesItem(row.item, heldId)) continue;
    const object = matchOn(ctx, row.on, target);
    if (!object) continue;
    return {
      kind: 'use',
      id: row.id,
      label: labelOf(row, game, heldId),
      needsNear: true,
      payload: { object, itemId: heldId },
    };
  }
  return null;
}

/** Uso del ítem en la mano sobre uno mismo (sin objetivo). */
function selfAction(ctx, heldId, { fallback = true } = {}) {
  const game = ctx.game || {};
  if (!heldId) return null;
  const row = SELF_USES.find((r) => matchesItem(r.item, heldId));
  if (row) {
    return {
      kind: 'self',
      id: row.id,
      label: labelOf(row, game, heldId),
      needsNear: false,
      payload: { itemId: heldId },
    };
  }
  if (!fallback) return null;
  return {
    kind: 'self',
    id: 'describe',
    label: 'Usar',
    needsNear: false,
    payload: { itemId: heldId },
  };
}

/** Hacer: verbo del tipo (con ítem en mano, el uso ya se probó antes). */
function targetAction(ctx, target, heldId) {
  const game = ctx.game || {};
  const type = typeOf(target);
  const obj = refOf(target);
  const base = { needsNear: true };
  const label = (state = null) => labelFor(type, nameOf(target), state);

  if (type === 'passage') {
    return {
      ...base, kind: 'warp', id: 'warp', label: label(),
      payload: { warp: target.warp, via: 'primary' },
    };
  }

  if (type === 'person') {
    return {
      ...base, kind: 'talk', id: 'talk', label: label(),
      payload: { npc: target.npc },
    };
  }

  if (type === 'thing') {
    // Agarrar es Manos: Hacer siempre mira la cosa. Mirar no pide alcance.
    return {
      ...base, kind: 'look', id: 'look', needsNear: false,
      label: `Mirar ${nameOf(target)}`,
      payload: { object: target, via: 'primary' },
    };
  }

  if (type === 'container') {
    if (target.container || obj?.container) {
      return {
        ...base, kind: 'open', id: 'open', label: label(),
        payload: { container: target.container || obj.container, object: obj },
      };
    }
    return {
      ...base, kind: 'ammo', id: 'ammo', label: label(),
      payload: { object: obj },
    };
  }

  if (type === 'view') {
    return {
      ...base, kind: 'view', id: 'view', label: label(),
      payload: { object: obj },
    };
  }

  if (type === 'seat') {
    return {
      ...base, kind: 'talk', id: 'sit', label: label(),
      payload: { object: obj, seat: true },
    };
  }

  if (type === 'device') {
    const state = stateOf(target, game);
    const action = state?.action || 'look';
    if (action === 'toggle') {
      return {
        ...base, kind: 'toggle', id: 'toggle', label: label(state),
        payload: { object: obj, device: obj?.device || {}, state },
      };
    }
    if (action === 'window') {
      // `to` es el estado DESTINO: abierta -> cerrar, cerrada -> abrir.
      const closed = state?.id === 'closed' || state?.id === 'cerrada';
      return {
        ...base, kind: 'window', id: 'window', label: label(state),
        payload: { object: obj, to: closed ? 'open' : 'closed' },
      };
    }
    if (action === 'takePava') {
      return { ...base, kind: 'takePava', id: 'takePava', label: label(state), payload: { object: obj } };
    }
    if (action === 'view') {
      return { ...base, kind: 'view', id: 'view', label: label(state), payload: { object: obj } };
    }
    // Hacer nunca deja cosas: eso es Manos (resolveHands). Mirar no pide
    // alcance: un aparato se mira de lejos.
    return {
      ...base, kind: 'look', id: 'look', needsNear: false,
      label: label(state),
      payload: { object: obj, via: 'primary' },
    };
  }

  if (type === 'surface') {
    // Hacer nunca deja cosas: eso es Manos (resolveHands).
    return {
      ...base, kind: 'look', id: 'look', needsNear: false,
      label: label(),
      payload: { object: obj, via: 'primary' },
    };
  }

  // Decorado (y cualquier tipo sin acción propia): Hacer = Mirar. Mirar es lo
  // único que no pide alcance: un cuadro se mira de lejos.
  return {
    ...base, kind: 'look', id: 'look', needsNear: false,
    label: label(),
    payload: { object: obj, via: 'primary' },
  };
}

/**
 * Resuelve la acción para (objetivo, ítem en la mano).
 *
 *   ctx    = { game, objects } (lo que necesite el resolvedor, sin `this`)
 *   target = candidato hovereado/apuntado o null
 *   heldId = id del ítem seleccionado o null
 *
 * No hay modo de entrada: Hacer (click izq. / A) es la única acción del
 * mundo. Mirar dejó de ser un modo (DIRECCION.md, "Controles e interacción"):
 * en los tipos sin verbo propio, Hacer es Mirar.
 *
 * Devuelve { kind, id, label, needsNear, payload } o null. Etiqueta y
 * ejecución no pueden divergir porque las dos salen de acá.
 */
export function resolveAction(ctx, target, heldId) {
  const inHand = heldId || null;

  // Sin objetivo (o sobre Juan) = uso propio del ítem en la mano; sin uso
  // propio no hay entrada en la barra.
  if (!target) return selfAction(ctx, inHand, { fallback: false });
  const use = matchItemUse(ctx, target, inHand);
  if (use) return use;
  return targetAction(ctx, target, inHand);
}


// --------------------------------------------------------------------- Manos
// Manos agarra, deja, levanta y apoya. Es una función pura: la escena le pasa
// el estado del mundo (mapa, cosas, NPCs, warps, Juan) y recibe la acción o
// null. Orden de decisión: DIRECCION.md -> "Manos" y docs/diseno_manos.md §4.

/** Id del ítem que representa un candidato "cosa". */
function thingItemId(target) {
  return target?.item?.id || target?.worldItem?.itemId || target?.itemId || null;
}

/** Cosas apoyadas sobre un mueble (para no levantarlo con algo encima). */
function itemsOnObject(ctx, objectId) {
  return (ctx.items || []).filter(
    (wi) => wi && surfacePlaceOf(wi)?.objectId === objectId,
  );
}

/** ¿La mochila puede recibir `count` de `itemId`? */
function roomFor(ctx, itemId, count = 1) {
  const inv = ctx.game?.inventory;
  if (!Array.isArray(inv)) return true;
  return addItem(inv, itemId, count).added > 0;
}

/**
 * resolveHands(ctx, aim, heldId, carry)
 *
 *   ctx   = { game, objects, map, items, npcs, warps, player }
 *   aim   = { target, tile:{tx,ty}, point:{x,y}, device:'mouse'|'pad' }
 *   carry = { objectId, object } | null   (mueble liviano en la cabeza)
 *
 * Devuelve { kind, id, label, payload, needsNear } o null.
 * kinds: grab | lift | drop | support | takePava
 */
export function resolveHands(ctx, aim = {}, heldId = null, carry = null) {
  const game = ctx.game || {};
  const target = aim.target || null;
  const obj = refOf(target);

  // 1. Llevando un mueble: solo Apoyar (Hacer hace lo mismo).
  if (carry && carry.object) {
    const carried = carry.object;
    const tx = aim.tile?.tx;
    const ty = aim.tile?.ty;
    if (Number.isInteger(tx) && Number.isInteger(ty)) {
      const check = supportCheck({
        map: ctx.map,
        objects: ctx.objects || [],
        npcs: ctx.npcs || [],
        warps: ctx.warps || [],
        player: ctx.player,
        items: ctx.items || [],
        object: carried,
        tx,
        ty,
      });
      if (check.ok) {
        return {
          kind: 'support',
          id: 'support',
          label: `Apoyar ${carried.name || 'el mueble'}`,
          needsNear: false,
          payload: { object: carried, tx, ty },
        };
      }
    }
    return null;
  }

  // 2. Apuntando a una cosa agarrable: Agarrar.
  if (target) {
    const itemId = thingItemId(target);
    const grabbable = Boolean(itemId) && target.grabbable !== false
      && isGrabbable(itemId);
    if (grabbable) {
      const count = target.worldItem?.count || target.count || 1;
      const item = getItem(itemId);
      const full = !roomFor(ctx, itemId, count);
      return {
        kind: 'grab',
        id: 'grab',
        label: `Agarrar ${item.name}`,
        needsNear: true,
        blocked: full ? 'full' : null,
        payload: {
          target, itemId, count, from: target.kind,
        },
      };
    }
  }

  // 2b. La pava sobre el fuego es una cosa que se agarra con Manos.
  if (obj && obj.station === 'heat' && game.pavaStation === obj.id) {
    const full = !roomFor(ctx, 'pava_caliente', 1);
    return {
      kind: 'takePava',
      id: 'takePava',
      label: 'Agarrar la pava',
      needsNear: true,
      blocked: full ? 'full' : null,
      payload: { object: obj },
    };
  }

  // 3. Mueble liviano sin nada encima: Levantar.
  if (obj && obj.movable && itemsOnObject(ctx, obj.id).length === 0) {
    return {
      kind: 'lift',
      id: 'lift',
      label: `Levantar ${obj.name || 'el mueble'}`,
      needsNear: true,
      payload: { object: obj },
    };
  }

  // 4. Ítem en la mano + lugar apuntado válido: Dejar.
  if (heldId) {
    const name = getItem(heldId).name;
    const surfaceObj = obj && obj.surface ? obj : null;
    if (surfaceObj && aim.near === false) return null;
    if (surfaceObj) {
      const near = aim.device === 'mouse' && aim.point
        ? aim.point
        : playerCenter(ctx.player);
      const free = nearestFreeSlot(surfaceObj, ctx.items || [], near);
      if (free) {
        return {
          kind: 'drop',
          id: 'drop',
          label: `Dejar ${name}`,
          needsNear: true,
          payload: {
            object: surfaceObj, itemId: heldId, slot: free.slot, pos: free.pos,
          },
        };
      }
      return null;
    }
    const tile = aim.tile;
    if (tile && Number.isInteger(tile.tx) && Number.isInteger(tile.ty)) {
      const ok = canDropFloor({
        map: ctx.map,
        npcs: ctx.npcs || [],
        warps: ctx.warps || [],
        player: ctx.player,
        items: ctx.items || [],
        tx: tile.tx,
        ty: tile.ty,
        itemId: heldId,
      });
      if (ok) {
        return {
          kind: 'drop',
          id: 'drop',
          label: `Dejar ${name}`,
          needsNear: true,
          payload: {
            itemId: heldId, tx: tile.tx, ty: tile.ty,
            pos: floorPos(tile.tx, tile.ty),
          },
        };
      }
    }
  }

  // 5. Nada.
  return null;
}

function playerCenter(player) {
  if (!player) return null;
  return { x: player.x, y: player.feet - 8 };
}
