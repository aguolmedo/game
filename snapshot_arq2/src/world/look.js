import { talkEntry } from '../dialogs.js';
import { TALK } from '../data/script.js';
import { getItem } from '../items.js';
import { typeOf } from '../actions.js';
import { lookLine } from '../data/descriptions.js';
import { warpLabel } from './helpers.js';
import { OWN_VERB_TYPES } from './constants.js';

/** Mirar un objetivo puntual (Hacer en lo que solo se mira). No pide alcance. */
export function handleLook(scene, target = scene.target) {
  if (!target) return;
  scene.faceTarget(target);
  scene.lookTarget(target, { emit: true });
}

/**
 * Mirar unificado (DIRECCION.md): diálogo propio (`talk`) si existe, si no
 * la línea corta. Hacer en un decorado llama acá.
 */
export function lookTarget(scene, target, { emit = true } = {}) {
  if (!target) return;
  if (target.kind === 'surfaceItem' || target.kind === 'floorItem') {
    const itemId = target.itemId || target.item?.id || target.worldItem?.itemId;
    scene.game.showToast(scene.surface.describe(itemId, scene.game.flags));
    if (emit) scene.game.emit('interact', { id: target.id, kind: 'lookItem' });
    return;
  }
  if (target.kind === 'pickup') {
    const item = getItem(target.itemId || target.item?.id);
    scene.game.showToast(`${item.name}: ${item.description}`);
    return;
  }
  if (target.kind === 'npc') {
    if (typeof scene.talkTo === 'function') scene.talkTo(target.npc);
    return;
  }
  if (target.kind === 'warp') {
    const warp = target.warp || {};
    scene.game.showToast(warp.look || warpLabel(warp));
    return;
  }
  const obj = target.ref || target;
  if (obj?.window) scene.game.emit('interact', { id: target.id, kind: 'window', obj });
  const entry = talkEntry(obj?.talk || obj?.interact?.talk, scene.game);
  if (entry && typeof scene.openDialog === 'function') scene.openDialog(entry, target.id);
  else scene.lookAt(target);
  if (emit) scene.game.emit('interact', { id: target.id, kind: 'object', obj });
}

/** Texto de "mirar" del objetivo (fallback corto, sin diálogo propio). */
export function lookAt(scene, target) {
  if (!target) return;
  if (target.kind === 'surfaceItem' || target.kind === 'floorItem') {
    const itemId = target.itemId || target.item?.id || target.worldItem?.itemId;
    scene.game.showToast(scene.surface.describe(itemId, scene.game.flags));
    return;
  }
  if (target.kind === 'object' || target.kind === 'container') {
    const obj = target.ref || target;
    const line = lookLine(target.id, scene.game.flags)
      || lookLine(obj.id, scene.game.flags)
      || lookLine(obj.talk, scene.game.flags)
      || lookLine(obj.interact?.talk, scene.game.flags)
      || obj.description
      || 'No hay nada que ver acá.';
    scene.game.showToast(line);
    return;
  }
  if (target.kind === 'warp' && target.warp && target.warp.look) {
    scene.game.showToast(target.warp.look);
    return;
  }
  if (target.label) scene.game.showToast(target.label);
}

/** Texto de mirar de un objetivo, sin abrir nada. */
export function lookTextFor(scene, target) {
  if (!target) return null;
  const obj = target.ref || target;
  if (target.kind === 'warp') {
    const warp = target.warp || {};
    const line = lookLine(warp.id, scene.game.flags)
      || lookLine(warp.talk, scene.game.flags)
      || warp.look;
    if (line) return line;
    // Sin texto propio: la primera línea de su entrada de mirar del guion
    // (la escalera que baja del altillo se llama `stairs`).
    const talkId = warp.talk || warp.id;
    const entry = talkId && TALK[talkId] ? talkEntry(talkId, scene.game) : null;
    return entry?.lines?.[0] || null;
  }
  const line = lookLine(obj?.id, scene.game.flags)
    || lookLine(obj?.talk, scene.game.flags)
    || lookLine(obj?.interact?.talk, scene.game.flags)
    || lookLine(target.id, scene.game.flags)
    || obj?.description;
  if (line) return line;
  // Sin línea corta: la primera línea de su diálogo propio.
  if (obj?.talk && TALK[obj.talk]) {
    return talkEntry(obj.talk, scene.game)?.lines?.[0] || null;
  }
  return null;
}

/** Id estable del objetivo para recordar la línea dicha. */
export function firstLookKey(scene, target) {
  if (!target) return null;
  if (target.kind === 'warp') return target.warp?.id || target.id || null;
  const obj = target.ref || target;
  return obj?.id || target.id || null;
}

/**
 * Marca y devuelve la línea de mirar de la primera vez, o null si ya se
 * dijo / el objetivo no tiene verbo propio / la acción ya es Mirar.
 */
export function firstUseLine(scene, target, action) {
  if (!target || !action) return null;
  if (action.kind === 'look' || action.kind === 'warp') return null;
  if (!OWN_VERB_TYPES.has(typeOf(target))) return null;
  const key = scene.firstLookKey(target);
  if (!key) return null;
  if (!scene.game.seenLook) scene.game.seenLook = {};
  if (scene.game.seenLook[key]) return null;
  const text = scene.lookTextFor(target);
  if (!text) return null;
  scene.game.seenLook[key] = true;
  return { key, text };
}

/** Igual que firstUseLine, para un paso (la línea va antes de irse). */
export function firstWarpLine(scene, warp) {
  if (!warp) return null;
  if (!scene.game.seenLook) scene.game.seenLook = {};
  const key = warp.id || null;
  if (!key || scene.game.seenLook[key]) return null;
  const text = scene.lookTextFor({ kind: 'warp', warp });
  if (!text) return null;
  scene.game.seenLook[key] = true;
  return text;
}

/** Alias histórico de lookTarget (click/E sobre un objeto). */
export function lookObject(scene, target) {
  scene.lookTarget(target, { emit: true });
}
