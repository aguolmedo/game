import { getItem } from '../items.js';
import { resolveAction, resolveHands } from '../actions.js';
import { loadSave } from '../run/save.js';
import { radioLine } from '../run/radio.js';
import { rngFromSeed } from '../run/rng.js';
import { seedFor } from '../run/seed.js';
import { NO_SPACE_MESSAGE } from '../surfaces.js';
import { boxOf } from './helpers.js';
import { closedFlag } from '../data/flags.js';

/** Contexto del resolvedor (ver src/actions.js): sin `scene` adentro. */
export function ctx(scene) {
  return {
    game: scene.game,
    objects: scene.mapData?.objects || [],
    map: scene.mapData,
    items: scene.worldState?.items || [],
    npcs: scene.npcs || [],
    warps: scene.mapData?.warps || [],
    player: scene.player,
    checkSupport: (args) => scene.checkSupportCached(args),
  };
}

/** Id del ítem en la mano, o null. */
export function heldId(scene) {
  const slot = scene.game?.inventory?.[scene.game.selectedSlot];
  return slot?.id || null;
}

/**
 * Ejecuta la acción que devolvió resolveAction(). Único lugar del mundo
 * donde se decide "qué pasa": los efectos de abajo conservan su lógica.
 */
export function runAction(scene, action, target) {
  if (!action) return;
  // Fuera de alcance: Juan mira el objeto y avisa (como mucho una vez por
  // segundo, para no repetir el toast).
  if (action.needsNear && scene.hoverTarget && !scene.hoverNear) {
    if (target) scene.faceTarget(target);
    const now = scene.t || 0;
    if (scene.nearWarnAt == null || now - scene.nearWarnAt >= 1) {
      scene.nearWarnAt = now;
      scene.game.showToast('Acercate un poco.');
    }
    return;
  }
  // Primera vez que se usa un objeto con verbo propio: antes del resultado,
  // Juan dice su línea de mirar. Si el uso abre un diálogo propio de la
  // historia, ese manda y la línea solo queda marcada como dicha.
  const first = scene.firstUseLine(target, action);
  if (first && action.kind !== 'talk' && action.kind !== 'base') {
    scene.game.showToast(first.text);
  }

  const obj = action.payload?.object;
  switch (action.kind) {
    case 'base':
      scene.runBaseAction(action, target);
      break;
    case 'warp':
      scene.tryWarp(action.payload?.warp || (target && target.warp));
      break;
    case 'talk':
      if (action.payload?.npc) scene.talkTo(target.npc);
      else scene.lookTarget(target, { emit: true });
      break;
    case 'open':
      if (target.container) {
        scene.game.openChest(target.container);
        scene.cursor.hide();
        scene.game.emit('interact', { id: target.id, kind: 'container' });
      } else {
        scene.runAction({ ...action, kind: 'ammo' }, target);
      }
      break;
    case 'ammo':
      scene.game.showToast('Las balas se compran en la arena.');
      scene.game.emit('interact', { id: target.id, kind: 'ammo', obj });
      break;
    case 'view':
      scene.game.emit('interact', { id: target.id, kind: 'window', obj });
      scene.game.openView(obj.window.view, scene.name, null, () => {
        scene.game.changeScene(scene.name, null);
        scene.game.emit('viewEnd', { id: target.id });
      });
      break;
    case 'window':
      scene.setWindow(obj, action.payload?.to);
      break;
    case 'closeWindow':
      scene.game.emit('interact', { id: obj.id, kind: 'window', obj });
      scene.closeWindow(obj);
      break;
    case 'toggle':
      scene.toggleDevice(obj, action.payload?.device);
      break;
    case 'takePava':
      scene.takePava();
      break;
    case 'use':
      scene.runItemUse(action, target);
      break;
    case 'self':
      scene.runSelfUse(action);
      break;
    case 'look':
      // Hacer = Mirar para decorados y aparatos sin verbo propio. Es el
      // mismo camino que Q/B/click derecho: diálogo propio o línea corta.
      scene.lookTarget(target, { emit: true });
      break;
    case 'none':
      if (action.label) scene.game.showToast(action.label);
      break;
    default:
      break;
  }
}

/** Efecto de un uso del ítem en la mano sobre el objetivo. */
export function runItemUse(scene, action, target) {
  const obj = action.payload?.object || (target && (target.ref || target));
  const itemId = action.payload?.itemId || scene.heldId();
  switch (action.id) {
    case 'heatPava': scene.heatPava(obj, itemId); break;
    case 'installExtractor': scene.installExtractor(obj); break;
    case 'fuelGenerator': scene.fuelGenerator(obj); break;
    case 'sealWindow': scene.sealWindow(obj); break;
    case 'shareMate': scene.shareMate(target.npc); break;
    case 'dumpMate': scene.useMate('mate_lavado', target); break;
    default: break;
  }
}

/** Efecto de un uso del ítem en la mano sobre uno mismo. */
export function runSelfUse(scene, action) {
  const itemId = action.payload?.itemId || scene.heldId();
  switch (action.id) {
    case 'equipSuit':
      scene.game.requestEquip();
      break;
    case 'toggleRifle':
      scene.game.hasRifle = !scene.game.hasRifle;
      scene.player.setRifle(scene.game.hasSuit && scene.game.hasRifle);
      scene.game.showToast(scene.game.hasRifle ? 'Rifle listo.' : 'Guardaste el rifle.');
      break;
    case 'mateSelf':
      scene.useMate(itemId);
      break;
    case 'pavaSelf':
      scene.usePava(itemId);
      break;
    case 'yerbaSelf':
      scene.useMate('yerba');
      break;
    case 'describe': {
      const item = getItem(itemId);
      scene.game.showToast(`${item.name}: ${item.description}`);
      break;
    }
    default: break;
  }
}

/** Manos: agarra, deja, levanta o apoya según resolveHands (§4). */
export function runHands(scene, action, input = null) {
  if (!action) return;
  if (action.needsNear && scene.hoverTarget && !scene.hoverNear) {
    scene.faceTarget(scene.hoverTarget);
    scene.warnNear();
    return;
  }
  if (action.blocked === 'full') {
    scene.game.showToast('La mochila está llena.');
    return;
  }
  switch (action.kind) {
    case 'grab': {
      const target = action.payload?.target;
      if (!target) break;
      if (target.kind === 'pickup') target.pickup.take();
      else scene.takeSurfaceItem(target);
      break;
    }
    case 'takePava':
      scene.takePava();
      break;
    case 'lift':
      scene.startCarry(action.payload?.object);
      break;
    case 'drop':
      scene.dropHeld(action.payload);
      break;
    case 'support':
      scene.supportCarry(action.payload.tx, action.payload.ty);
      break;
    default:
      break;
  }
  scene.invalidateReach();
  scene.clearGhost();
  void input;
}

/** Deja el ítem elegido en el piso o en un mueble (§5). */
export function dropHeld(scene, payload) {
  if (!payload) return;
  const slot = scene.game.selectedSlot;
  if (payload.object) {
    const result = scene.surface.dropSelected(
      scene.game.inventory, slot, payload.object.id, payload.slot,
    );
    if (!result) {
      scene.game.showToast(NO_SPACE_MESSAGE);
      return;
    }
    scene.game.inventory = result.inventory;
    scene.game.showToast(`Dejaste ${getItem(result.placed.itemId).name}.`);
    scene.game.emit('itemUsed', {
      id: result.placed.itemId, targetId: payload.object.id, action: 'drop',
    });
    return;
  }
  const item = scene.game.inventory[slot];
  const itemName = item ? getItem(item.id).name : 'la cosa';
  const result = scene.surface.dropOnFloor(
    scene.game.inventory, slot, payload.tx, payload.ty,
  );
  if (!result) {
    scene.game.showToast(NO_SPACE_MESSAGE);
    return;
  }
  scene.game.inventory = result.inventory;
  scene.game.showToast(`Dejaste ${itemName}.`);
  scene.game.emit('itemUsed', {
    id: result.placed.itemId, targetId: null, action: 'drop',
  });
}

/** Aparato con estado: prender/apagar (radio, vela). */
export function toggleDevice(scene, obj, dev) {
  if (!obj || !dev?.toggle) return;
  const flags = scene.game.flags || (scene.game.flags = {});
  flags[dev.toggle] = !flags[dev.toggle];
  scene.applyStoryState();
  const stateId = typeof dev.state === 'function' ? dev.state(scene.game) : 'on';
  const on = stateId !== 'off' && stateId !== 'apagada' && stateId !== 'closed';
  if (dev.light) scene.setLightState(dev.light, on);
  const msg = dev.messages && dev.messages[stateId];
  if (msg) scene.game.showToast(msg);
  scene.game.emit('interact', { id: obj.id, kind: 'device', obj, state: stateId });
}

/** Ventana abrible: abrir/cerrar según el estado que eligió el resolvedor. */
export function setWindow(scene, obj, to) {
  if (!obj) return;
  const flags = scene.game.flags || (scene.game.flags = {});
  const closing = to === 'closed' || to === 'cerrada';
  if (closing) {
    scene.game.emit('interact', { id: obj.id, kind: 'window', obj });
    scene.closeWindow(obj);
    return;
  }
  delete flags[closedFlag(obj.id)];
  scene.applyStoryState();
  scene.game.showToast(obj.openToast || 'Ventana abierta.');
  scene.game.emit('interact', { id: obj.id, kind: 'windowOpened', obj });
}

export function faceTarget(scene, target) {
  const b = target.cursorBox || boxOf(target);
  const dx = b.x + b.w / 2 - scene.player.x;
  const dy = b.y + b.h / 2 - scene.player.feet;
  const dir = Math.abs(dx) > Math.abs(dy)
    ? (dx < 0 ? 'left' : 'right')
    : (dy < 0 ? 'up' : 'down');
  scene.player.dir = dir;
  scene.player.sprite.setDir(dir);
}

/**
 * Acción propia de la base (Mejoras, escuchar la radio) o null. Va delante
 * de resolveAction para que el prompt y la ejecución digan lo mismo.
 */
export function baseActionFor(scene, target) {
  if (!scene.inBase || !target) return null;
  const obj = target.ref || target;
  let act = target.baseAction || obj?.baseAction;
  if (!act && target.kind === 'npc') {
    const def = (scene.mapData.npcs || []).find((d) => d.id === target.id);
    act = def?.baseAction;
  }
  if (!act || !act.kind) return null;
  return {
    kind: 'base',
    id: act.kind,
    label: act.label || 'Hacer',
    payload: { ...act, obj, npc: target.npc || null },
    needsNear: false,
  };
}

/** resolveAction con las acciones de la base adelante. */
export function actionFor(scene, target) {
  return scene.baseActionFor(target) || resolveAction(scene.ctx(), target, scene.heldId());
}

/** Ejecuta una acción de la base: abrir el taller o escuchar la radio. */
export function runBaseAction(scene, action, target) {
  const p = action.payload || {};
  if (p.kind === 'taller') {
    if (target && target.npc) target.npc.lookAt(scene.player);
    if (scene.game.openTaller) scene.game.openTaller(p.station || 'favalli');
    scene.game.emit?.('interact', {
      id: (target && target.id) || 'taller', kind: 'taller', station: p.station,
    });
    return;
  }
  if (p.kind === 'radio') {
    const lucas = scene.npcs.find((n) => n.id === 'lucas');
    if (lucas) lucas.lookAt(scene.player);
    const save = scene.game.baseSave || loadSave();
    // La radio de la casa-base es lógica (elige el texto): rng sembrado con el
    // loop del save, así la misma noche agarra siempre la misma línea.
    const loop = Number(save && save.loop) || 0;
    const line = radioLine(
      save && save.mejoras ? save.mejoras.lucas : 0,
      rngFromSeed(seedFor(loop, 1)),
    );
    scene.openDialog({
      speaker: 'Lucas',
      portrait: 'lucas',
      lines: [line],
      onClose: () => { if (lucas) lucas.resetPose(); },
    }, 'radio');
    scene.game.emit?.('interact', { id: (target && target.id) || 'radio', kind: 'radio' });
    return;
  }
  if (scene.game.showToast) scene.game.showToast(p.label || 'Todavía no.');
}

export function canWarp(scene, warp) {
  if (!warp) return false;
  // No se cambia de mapa cargando un mueble liviano (§7).
  if (scene.game.carry) return false;
  // En la base solo se sale por el portón (y eso arranca un loop).
  if (scene.inBase) return Boolean(warp.baseExit);
  if (warp.needsSuit && !scene.game.hasSuit) return false;
  if (warp.needsFlag && !scene.game.flags[warp.needsFlag]) return false;
  return true;
}

/** Etiqueta del portón en la base: "Salir (loop N)". */
export function baseExitLabel(scene, warp) {
  if (!scene.inBase || !warp || !warp.baseExit) return null;
  const loop = Number(scene.game.baseSave && scene.game.baseSave.loop) || 0;
  return `Salir (loop ${loop + 1})`;
}

/**
 * Aviso al pisar un warp bloqueado (sin spam): una vez por aproximacion.
 * Al salir del rect se limpia y volver a pisarlo vuelve a avisar.
 */
export function warpBlockedFeedback(scene, warp) {
  if (!warp || scene.canWarp(warp)) {
    scene.warpWarnId = null;
    return false;
  }
  const id = warp.id || 'warp';
  if (scene.warpWarnId === id) return false;
  scene.warpWarnId = id;
  if (scene.inBase && !warp.baseExit) {
    scene.game.showToast('Desde la base se sale por el portón.');
    return true;
  }
  if (scene.game.carry) {
    scene.game.showToast(`Primero apoyá ${scene.carryName()}.`);
    return true;
  }
  scene.game.showToast(scene.exitBlocker());
  return true;
}
