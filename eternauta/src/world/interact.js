import { talkEntry, WARNING } from '../dialogs.js';
import { addItem, removeItem, countItem } from '../inventory.js';
import { getItem } from '../items.js';
import { resolveAction, typeOf } from '../actions.js';
import { putYerba, cebar, sip, share, dump, mateItemId, startHeating, stopHeating, heat, pavaItemId } from '../mate.js';
import { NPC_NAMES } from './constants.js';
import { FLAG, closedFlag } from '../data/flags.js';

export function collect(scene, pickup) {
  pickup.takeNow = false;
  const result = addItem(scene.game.inventory, pickup.itemId, pickup.count);
  if (result.added <= 0) {
    scene.game.showToast('No hay lugar en la mochila.');
    return;
  }
  scene.game.inventory = result.slots;
  const item = getItem(pickup.itemId);
  const extra = result.added > 1 ? ` x${result.added}` : '';
  scene.game.showToast(`+${result.added} ${item.name}${extra}`, { group: 'pickup' });
  scene.game.onInventoryChanged();
}

export function openDialog(scene, entry, id = null) {
  if (!entry) return;
  scene.dialogId = id;
  scene.dialog.show(entry);
  scene.cursor.hide();
}

export function talkTo(scene, npc) {
  const entry = talkEntry(npc.id, scene.game);
  npc.lookAt(scene.player);
  const wrapped = entry || {
    speaker: NPC_NAMES[npc.who] || npc.who,
    portrait: npc.who,
    lines: ['No hay mucho para decir ahora.'],
  };
  wrapped.onClose = () => {
    npc.resetPose();
    npc.markSeen();
  };
  scene.openDialog(wrapped, npc.id);
  scene.game.emit('interact', { id: npc.id, kind: 'npc' });
}

/**
 * E/A: la acción principal del objetivo apuntado. Un objeto apuntado gana
 * sobre el warp que el jugador tiene bajo los pies; si no hay objeto (o el
 * objetivo es el propio warp), manda el warp de los pies.
 */
export function interact(scene, input = null) {
  const carry = scene.carryData();
  const target = scene.target;
  // Cargando un mueble Hacer apoya (salvo hablar con una persona).
  if (carry) {
    if (target && typeOf(target) === 'person') {
      scene.faceTarget(target);
      scene.runAction(
        resolveAction(scene.ctx(), target, scene.heldId()), target,
      );
      return;
    }
    scene.runHands(scene.handsActionFor(input).action, input);
    return;
  }
  const targetIsObject = Boolean(target && target.kind !== 'warp');
  if (scene.exitWarp && !targetIsObject) {
    scene.tryWarp(scene.exitWarp);
    return;
  }
  const action = target
    ? scene.actionFor(target)
    : resolveAction(scene.ctx(), null, scene.heldId());
  scene.runAction(action, target);
}

export function closeWindow(scene, obj) {
  const key = closedFlag(obj.id);
  if (scene.game.flags[key]) {
    scene.game.showToast('La ventana ya está cerrada.');
    return;
  }
  scene.game.flags[key] = true;
  // La nieve que había entrado (snow_drift) se va con la ventana cerrada.
  scene.applyStoryState();
  scene.game.showToast(obj.closeToast || 'Ventana cerrada.');
  scene.game.emit('interact', { id: obj.id, kind: 'windowClosed', obj });
}

export function takeSurfaceItem(scene, target) {
  const result = scene.surface.take(target, scene.game.inventory);
  if (result.count > 0) {
    scene.game.inventory = result.inventory;
    const item = getItem(result.itemId);
    const extra = result.count > 1 ? ` x${result.count}` : '';
    scene.game.showToast(`+${result.count} ${item.name}${extra}`, { group: 'pickup' });
    scene.game.onInventoryChanged();
    scene.game.emit('itemPicked', { id: result.itemId, count: result.count });
    return;
  }
  if (result.reason === 'decor') {
    scene.game.showToast(scene.surface.describe(result.itemId, scene.game.flags));
    scene.game.emit('interact', { id: target.id, kind: 'lookItem' });
    return;
  }
  if (result.reason === 'full') {
    scene.game.showToast('No hay lugar en la mochila.');
    return;
  }
  scene.game.showToast('No podés agarrar eso.');
}

export function replaceItem(scene, fromId, toId, count = 1) {
  const removed = removeItem(scene.game.inventory, fromId, count);
  if (removed.removed <= 0) return false;
  scene.game.inventory = addItem(removed.slots, toId, removed.removed).slots;
  scene.game.onInventoryChanged();
  return true;
}

/** Poner la pava al fuego (`heatPava`). */
export function heatPava(scene, obj, itemId) {
  if (!obj) return false;
  if (itemId !== 'pava_fria' && itemId !== 'pava_caliente') return false;
  const removed = removeItem(scene.game.inventory, itemId, 1);
  if (removed.removed <= 0) return false;
  scene.game.inventory = removed.slots;
  scene.game.pava = startHeating(scene.game.pava, obj.id);
  scene.game.pava.temp = 0;
  scene.game.pavaStation = obj.id;
  scene.silbatoAvisado = false;
  scene.game.showToast('La pava en el fuego.');
  scene.game.onInventoryChanged();
  return true;
}

/** Instalar el secador de Elena en el extractor del garaje (`installExtractor`). */
export function installExtractor(scene, obj) {
  if (!obj) return false;
  scene.game.flags[FLAG.EXTRACTOR_OK] = true;
  scene.game.inventory = removeItem(scene.game.inventory, 'secador', 1).slots;
  scene.game.showToast('El secador quedó instalado en el extractor.');
  scene.game.emit('itemUsed', { id: 'secador', targetId: obj.id, action: 'use' });
  return true;
}

/** Cargar nafta en el electrógeno (`fuelGenerator`). */
export function fuelGenerator(scene, obj) {
  if (!obj) return false;
  if (scene.game.flags[FLAG.ELECTROGENO_ON]) {
    scene.game.showToast('Ya está en marcha.');
    return true;
  }
  const removed = removeItem(scene.game.inventory, 'nafta', 1);
  if (removed.removed <= 0) return false;
  scene.game.inventory = removed.slots;
  scene.game.flags[FLAG.ELECTROGENO_ON] = true;
  scene.setLightState('bulb', true);
  for (const light of scene.mapData.lights || []) {
    if (light.kind === 'bulb') light.state = 'on';
  }
  scene.applyModeVisuals();
  scene.game.showToast('El electrógeno arranca. La lamparita titila.');
  scene.game.emit('itemUsed', { id: 'nafta', targetId: obj.id, action: 'use' });
  return true;
}

/** Sellar la ventana con las tiras de goma (`sealWindow`). */
export function sealWindow(scene, obj) {
  if (!obj) return false;
  if (countItem(scene.game.inventory, 'tiras') <= 0) return false;
  scene.game.inventory = removeItem(scene.game.inventory, 'tiras', 1).slots;
  scene.closeWindow(obj);
  return true;
}

export function useMate(scene, itemId, target) {
  if (itemId === 'mate_vacio') {
    if (countItem(scene.game.inventory, 'yerba') < 1) {
      scene.game.showToast('Necesitás yerba. Hay un paquete en el banco, al lado de la pava.');
      return;
    }
    scene.game.inventory = removeItem(scene.game.inventory, 'yerba', 1).slots;
    scene.game.inventory = removeItem(scene.game.inventory, 'mate_vacio', 1).slots;
    scene.game.inventory = addItem(scene.game.inventory, 'mate_yerba', 1).slots;
    putYerba(scene.game.mate);
    scene.game.showToast('Le pusiste yerba al mate.');
    scene.game.emit('itemUsed', { id: 'mate_vacio', targetId: 'yerba', action: 'use' });
    return;
  }
  if (itemId === 'mate_yerba') {
    const boiled = countItem(scene.game.inventory, 'pava_hervida') > 0;
    const warm = boiled || countItem(scene.game.inventory, 'pava_caliente') > 0;
    if (!warm) {
      scene.game.showToast('Calentá el agua primero (calentador o cocina).');
      return;
    }
    cebar(scene.game.mate, { hervida: boiled });
    scene.game.inventory = removeItem(scene.game.inventory, 'mate_yerba', 1).slots;
    scene.game.inventory = addItem(scene.game.inventory, 'mate_cebado', 1).slots;
    scene.game.showToast(boiled ? 'Cebaste con agua hervida…' : 'Bien cebado.');
    if (!boiled) scene.game.flags[FLAG.MATE_TUTORIAL] = true;
    scene.game.emit('itemUsed', { id: 'mate_yerba', targetId: 'pava', action: 'cebar' });
    return;
  }
  if (itemId === 'mate_cebado') {
    sip(scene.game.mate);
    const next = mateItemId(scene.game.mate);
    scene.game.inventory = removeItem(scene.game.inventory, 'mate_cebado', 1).slots;
    scene.game.inventory = addItem(scene.game.inventory, next, 1).slots;
    scene.game.mateCalma = 120;
    scene.game.flags[FLAG.MATE_TUTORIAL] = true;
    scene.game.showToast(next === 'mate_lavado'
      ? 'Está lavado. Tirá la yerba.'
      : 'Un mate en la panza. Calma.');
    scene.game.emit('itemUsed', { id: 'mate_cebado', targetId: null, action: 'sip' });
    return;
  }
  if (itemId === 'mate_lavado') {
    const id = target && (target.id || '');
    if (/bucket|pileta|sink|balde/i.test(id)) {
      scene.game.inventory = removeItem(scene.game.inventory, 'mate_lavado', 1).slots;
      scene.game.inventory = addItem(scene.game.inventory, 'mate_vacio', 1).slots;
      dump(scene.game.mate);
      scene.game.showToast('Tiraste la yerba. El mate quedó limpio.');
      scene.game.emit('itemUsed', { id: 'mate_lavado', targetId: id, action: 'dump' });
    } else {
      scene.game.showToast('Tirá la yerba en la pileta o en el balde.');
    }
    return;
  }
  if (itemId === 'yerba') {
    scene.game.showToast('Usá la yerba sobre el mate vacío.');
  }
}

export function usePava(scene, itemId) {
  if (itemId === 'pava_fria') {
    scene.game.showToast('Todavía está fría.');
  } else if (itemId === 'pava_caliente') {
    scene.game.showToast('Está en su punto. Usala sobre el mate con yerba.');
  } else {
    scene.game.showToast('Hirvió. Si cebás así, el mate sale quemado.');
  }
}

export function shareMate(scene, npc) {
  const burnt = scene.game.mate.burnt;
  share(scene.game.mate);
  const next = mateItemId(scene.game.mate);
  scene.game.inventory = removeItem(scene.game.inventory, 'mate_cebado', 1).slots;
  scene.game.inventory = addItem(scene.game.inventory, next, 1).slots;
  scene.game.mateShared[npc.id] = true;
  const lines = {
    favalli: burnt
      ? 'Lo quemaste, Juan. Ese mate está lavado de entrada.'
      : 'Está bien cebado. Se nota la mano.',
    lucas: 'Gracias. Uno amargo me acomoda el estómago.',
    polsky: 'Como los que tomaba en la estación, de muchacho.',
  };
  npc.lookAt(scene.player);
  scene.openDialog({
    speaker: NPC_NAMES[npc.who] || npc.who,
    portrait: npc.who,
    lines: [lines[npc.id] || 'Gracias, Juan.'],
    onClose: () => npc.resetPose(),
  }, npc.id);
  scene.game.emit('mateShared', { id: npc.id, all: ['favalli', 'lucas', 'polsky'].every((k) => scene.game.mateShared[k]) });
}

export function takePava(scene) {
  const id = pavaItemId(scene.game.pava.temp);
  scene.game.inventory = addItem(scene.game.inventory, id, 1).slots;
  scene.game.pavaCool = 90;
  scene.game.pava = { ...scene.game.pava, heating: false, station: null };
  scene.game.pavaStation = null;
  scene.silbatoAvisado = false;
  scene.game.onInventoryChanged();
  scene.game.showToast(id === 'pava_hervida' ? 'La pava hirvió.' : 'Agarraste la pava.');
  scene.game.emit('itemUsed', { id, targetId: 'pava', action: 'take' });
}

export function openWarning(scene) {
  scene.choice.show({
    question: WARNING.question,
    options: WARNING.options,
    onPick: (value) => {
      if (value === 'Sí') scene.game.changeScene('death');
    },
  });
}

/**
 * Cuenta regresiva del paso que espera a que se lea la línea de la primera
 * vez. Devuelve true el frame en que cambia de ambiente.
 */
export function updatePendingWarp(scene, dt) {
  if (!scene.pendingWarp) return false;
  scene.pendingWarp.t -= dt;
  if (scene.pendingWarp.t > 0) return false;
  const warp = scene.pendingWarp.warp;
  scene.pendingWarp = null;
  scene.warpNow(warp);
  return true;
}

/** Warp con las mismas reglas al pisarlo o al clickearlo. */
export function tryWarp(scene, warp) {
  if (!warp) return;
  // Ya se está leyendo la línea de la primera vez de este paso.
  if (scene.pendingWarp) return;
  if (scene.game.carry) {
    scene.game.showToast(`Primero apoyá ${scene.carryName()}.`);
    return;
  }
  if (warp.needsSuit && !scene.game.hasSuit) {
    scene.openWarning();
    return;
  }
  if (warp.needsFlag && !scene.game.flags[warp.needsFlag]) {
    scene.game.showToast(scene.exitBlocker());
    return;
  }
  // Primera vez: la línea de mirar del paso, antes de cambiar de ambiente.
  const line = scene.firstWarpLine(warp);
  if (line) {
    scene.game.showToast(line);
    scene.pendingWarp = { warp, t: 1.2 };
    return;
  }
  scene.warpNow(warp);
}

export function warpNow(scene, warp) {
  if (!warp) return;
  // El portón de la base no cambia de escena: arranca una salida (loop).
  if (scene.inBase && warp.baseExit) {
    scene.pendingWarp = null;
    if (scene.game.startRun) scene.game.startRun();
    return;
  }
  if (!scene.canWarp(warp)) return;
  scene.pendingWarp = null;
  scene.game.changeScene(warp.to, warp.spawn);
}

export function updatePava(scene, dt) {
  const game = scene.game;
  if (game.pava && game.pava.heating) {
    const before = game.pava.temp;
    heat(game.pava, dt);
    if (before < 95 && game.pava.temp >= 95 && !scene.silbatoAvisado) {
      scene.silbatoAvisado = true;
      scene.game.showToast('¡Silba la pava!');
      scene.game.emit('pavaBoiled', {});
    }
    if (game.pava.temp >= 100) stopHeating(game.pava);
  } else if (game.pava && game.pava.temp > 0 && game.pavaCool > 0) {
    game.pavaCool = Math.max(0, game.pavaCool - dt);
    if (game.pavaCool === 0) {
      game.pava.temp = 0;
      if (countItem(game.inventory, 'pava_caliente') > 0) {
        const out = removeItem(game.inventory, 'pava_caliente', 1);
        game.inventory = addItem(out.slots, 'pava_fria', 1).slots;
      }
    }
  }
}

export function updateTimedBar(scene, dt) {
  if (!scene.timedBar) return;
  scene.timedBar.left -= dt;
  scene.game.emit('timer', { id: scene.timedBar.id, left: scene.timedBar.left });
  if (scene.timedBar.left <= 0) {
    const bar = scene.timedBar;
    scene.timedBar = null;
    scene.game.emit('timerEnd', { id: bar.id });
  }
}

export function startTimedBar(scene, id, seconds, label) {
  scene.timedBar = { id, left: seconds, total: seconds, label };
}

export function playComic(scene, spec) {
  // La historia abre una viñeta: si Juan lleva un mueble, lo apoya solo (§7).
  if (scene.game.carry) scene.autoPlaceCarry();
  return new Promise((resolve) => {
    const onDone = spec.onDone;
    scene.comic.play({
      ...spec,
      onDone: () => {
        if (onDone) onDone();
        resolve();
      },
    });
    scene.comicUi.mesh.visible = true;
  });
}

export function playCaption(scene, text, opts = {}) {
  return new Promise((resolve) => {
    scene.caption.show(text, opts);
    scene.captionUi.mesh.visible = true;
    scene.caption.onClose = () => resolve();
    scene.captionResolve = resolve;
  });
}

/** Línea corta en globo de historieta sobre la cabeza de un personaje. */
export function sayBalloon(scene, entry) {
  const target = entry.npc || scene.npcs.find((n) => n.id === entry.id);
  const head = target
    ? { x: target.x, y: target.feet - 34 }
    : { x: scene.player.x, y: scene.player.feet - 34 };
  scene.balloon.show(entry.text, head, { w: entry.w });
}
