// Resolvedor único de acciones (R1/R3): lógica pura, sin Three.js ni DOM.
//
// Todo lo que el juego promete con una etiqueta y hace con un click/E/F sale
// de acá. WorldScene solo lee `.label` (prompt, leyenda, tests) y ejecuta
// `.kind` en runAction(). Ver docs/brief_acciones.md.

import { ITEM_USES, SELF_USES } from './data/actions.js';
import { getItem } from './items.js';

/**
 * Mueble que representa la estación de `target`, o null (R3).
 * - Un objeto con `station` es la estación él mismo (tenga o no `stationItem`).
 * - Un objeto apoyado hereda la estación del mueble SOLO si el mueble declara
 *   `stationItem` y coincide con el ítem apoyado (en el banco, el calentador;
 *   la tijera o la tela no).
 */
export function stationOf(target, objects = []) {
  if (!target) return null;
  if (target.kind === 'object') {
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

/** Verbo de la acción propia del objetivo (labels de teclado/pad). */
export function verbFor(target) {
  if (!target) return null;
  if (target.kind === 'npc') return 'Hablar';
  if (target.kind === 'container') return 'Abrir';
  if (target.kind === 'pickup') return 'Levantar';
  if (target.kind === 'warp') return target.label || 'Entrar';
  if (target.kind === 'object' && target.interact?.kind === 'exit') return 'Salir';
  return 'Mirar';
}

/** "Verbo + nombre" para lo que no trae etiqueta propia. */
function fallbackLabel(target) {
  const verb = verbFor(target);
  const name = target.name || target.label || target.id || '';
  if (!name) return verb || null;
  if (!verb || name.startsWith(`${verb} `)) return name;
  return `${verb} ${name}`;
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
  if (on.open === true && game.flags?.[`closed_${obj.id}`]) return null;
  if (on.open === false && !game.flags?.[`closed_${obj.id}`]) return null;
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
  if (!heldId) {
    return fallback
      ? { kind: 'none', id: 'noItem', label: 'No tenés nada en la mano.', needsNear: false, payload: {} }
      : null;
  }
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

/** Acción propia del objetivo (orden fijo, igual que interact() de hoy). */
function targetAction(ctx, target, heldId) {
  const game = ctx.game || {};
  const objects = ctx.objects || [];
  const base = { needsNear: true };

  if (target.kind === 'warp') {
    return {
      ...base, kind: 'warp', id: 'warp', label: target.label || 'Entrar',
      payload: { warp: target.warp, via: 'primary' },
    };
  }
  if (target.kind === 'npc') {
    return {
      ...base, kind: 'talk', id: 'talk', label: fallbackLabel(target) || 'Hablar',
      payload: { npc: target.npc },
    };
  }
  if (target.kind === 'container') {
    const name = target.container?.name || target.id || '';
    return {
      ...base, kind: 'open', id: 'open',
      label: target.label || `Abrir ${String(name).toLowerCase()}`,
      payload: { container: target.container },
    };
  }
  if (target.kind === 'pickup') {
    return { ...base, kind: 'take', id: 'take', label: target.label || 'Levantar', payload: {} };
  }
  if (target.kind === 'surfaceItem') {
    return { ...base, kind: 'take', id: 'take', label: target.label || 'Agarrar', payload: {} };
  }

  const obj = target.ref || target;
  const id = target.id || obj.id;

  if (id === 'caja_municiones' || target.interact?.kind === 'ammo') {
    return {
      ...base, kind: 'ammo', id: 'ammo',
      label: target.interact?.label || 'Caja de municiones',
      payload: { object: obj },
    };
  }
  if (obj.window && obj.window.view) {
    return {
      ...base, kind: 'view', id: 'view', label: 'Mirar por la ventana',
      payload: { object: obj },
    };
  }
  if (obj.window && obj.window.openable) {
    if (game.flags?.[`closed_${obj.id}`]) {
      return {
        ...base, kind: 'look', id: 'look', label: 'Mirar la ventana',
        payload: { object: obj, via: 'primary' },
      };
    }
    return {
      ...base, kind: 'closeWindow', id: 'closeWindow', label: 'Cerrar la ventana',
      payload: { object: obj },
    };
  }
  const station = stationOf(target, objects);
  if (station && station.station === 'heat' && game.pavaStation === station.id) {
    return {
      ...base, kind: 'takePava', id: 'takePava', label: 'Sacar la pava',
      payload: { object: station },
    };
  }
  if (obj.surface && heldId) {
    return {
      ...base, kind: 'drop', id: 'drop', label: `Dejar ${getItem(heldId).name}`,
      payload: { object: obj },
    };
  }
  return {
    ...base, kind: 'look', id: 'look',
    label: target.interact?.label || fallbackLabel(target),
    payload: { object: obj, via: 'primary' },
  };
}

/**
 * Resuelve la acción para (objetivo, ítem en la mano, modo).
 *
 *   ctx    = { game, objects } (lo que necesite el resolvedor, sin `this`)
 *   target = candidato hovereado/apuntado o null
 *   heldId = id del ítem seleccionado o null
 *   mode   = 'primary' (click izq / E / A) | 'item' (F / X / click en el item)
 *            | 'look' (click der)
 *
 * Devuelve { kind, id, label, needsNear, payload } o null. Etiqueta y
 * ejecución no pueden divergir porque las dos salen de acá.
 */
export function resolveAction(ctx, target, heldId, mode) {
  const game = (ctx && ctx.game) || {};
  const inHand = heldId || null;

  if (mode === 'look') {
    if (!target) return null;
    return {
      kind: 'look', id: 'look', label: 'Mirar', needsNear: false,
      payload: { via: 'look' },
    };
  }

  if (mode === 'item') {
    if (target) {
      const use = matchItemUse(ctx, target, inHand);
      if (use) return use;
      // Estación de calor ocupada: con la pava o el mate en la mano, primero
      // hay que sacar la pava (T10).
      const station = stationOf(target, ctx.objects || []);
      if (station && station.station === 'heat' && game.pavaStation === station.id
        && /^(mate_|pava_)/.test(inHand || '')) {
        return {
          kind: 'none', id: 'pavaOccupied', label: 'Primero sacá la pava.',
          needsNear: true, payload: {},
        };
      }
    }
    return selfAction(ctx, inHand);
  }

  // mode === 'primary'
  if (!target) return selfAction(ctx, inHand, { fallback: false });
  const use = matchItemUse(ctx, target, inHand);
  if (use) return use;
  return targetAction(ctx, target, inHand);
}
