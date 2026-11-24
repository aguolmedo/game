import { NPC } from '../npc.js';
import { hotbarLayout } from '../hud.js';
import { pickTarget, warpAt, playerInAccess, facesFootprint, actionInsideFoot } from '../interaction.js';
import { getItem } from '../items.js';
import { pointInRect, hitIndex } from '../geom.js';
import { SurfaceLayer } from '../surfaces.js';
import { adjacentToPlayer } from '../placement.js';
import { heat } from '../mate.js';
import { warpLabel } from './helpers.js';
import { PRIORITY } from './constants.js';
import { NPC_NAMES } from './constants.js';

export function candidates(scene) {
  // Los objetos apoyados ganan sobre el mueble que los sostiene: apuntar a
  // la mesa agarra el mate, no "mirar la mesa". Con un mate cebado en la
  // mano, primero los NPC (para convidar).
  const held = scene.game.inventory[scene.game.selectedSlot];
  const sharing = Boolean(held && held.id === 'mate_cebado');
  const installingExtractor = Boolean(held && held.id === 'secador');
  const fuellingGenerator = Boolean(held && held.id === 'nafta');
  const P = PRIORITY;
  const list = sharing ? [] : scene.surface.candidates.map((c) => ({
    ...c, priority: c.kind === 'floorItem' ? P.object : P.surface,
  }));
  if (sharing) {
    for (const npc of scene.npcs) {
      if (npc.hidden) continue;
      list.push({
        id: npc.id,
        kind: 'npc',
        priority: P.npc,
        x: npc.x,
        y: npc.feet + 26,
        w: 20,
        h: 52,
        label: `Convidar mate a ${NPC_NAMES[npc.who] || npc.who}`,
        type: 'person',
        name: npc.name || NPC_NAMES[npc.who] || npc.who,
        cursorBox: { x: npc.x - 8, y: npc.feet - 32, w: 16, h: 32 },
        npc,
      });
    }
  }
  for (const c of scene.world.candidates) {
    if (c.ref && c.ref.hidden) continue;
    // Un solo candidato por objeto: lo apoyado ya viene en la lista del
    // SurfaceLayer y gana por prioridad, sin duplicar el mueble.
    // Con la pava sobre el calentador, ese mueble gana a los objetos
    // apoyados: A saca la pava en vez de mirar la tijera del banco.
    const heat = c.kind === 'object' && c.id === scene.game.pavaStation;
    // Si traes el secador o la nafta, el extractor/electrógeno le ganan a la
    // puerta que tienen al lado: usar el ítem es la acción esperada.
    const stationUse = c.kind === 'object' && (
      (installingExtractor && c.ref && c.ref.station === 'extractor')
      || (fuellingGenerator && c.id === 'generator')
    );
    // La ventana de Martita, mientras corre el objetivo, le gana al NPC que
    // está al lado: cerrarla es lo urgente (con mouse igual se apunta bien).
    const windowGoal = c.kind === 'object' && c.id === 'window_martita'
      && scene.game.flags?.martita_sprint && !scene.game.flags?.closed_window_martita;
    const candle = c.kind === 'object' && c.ref?.id === 'candle';
    const priority = heat ? P.surface + 1
      : stationUse || windowGoal || candle ? P.surface
        : P.object;
    list.push({ ...c, priority });
  }
  for (const npc of scene.npcs) {
    if (npc.hidden || sharing) continue;
    list.push({
      id: npc.id,
      kind: 'npc',
      priority: P.npc,
      x: npc.x,
      y: npc.feet + 26,
      w: 20,
      h: 52,
      label: `Hablar con ${npc.name || NPC_NAMES[npc.who] || npc.who}`,
      type: 'person',
      name: npc.name || NPC_NAMES[npc.who] || npc.who,
      cursorBox: { x: npc.x - 8, y: npc.feet - 32, w: 16, h: 32 },
      npc,
    });
  }
  // Puertas, escaleras y salidas: hover/click como cualquier objeto. El
  // warp automatico al pisarlas sigue igual; esto agrega la caja y el click.
  for (const warp of scene.mapData.warps || []) {
    list.push({
      id: `warp_${warp.id || 'x'}`,
      kind: 'warp',
      priority: P.warp,
      x: warp.x + warp.w / 2,
      y: warp.y + warp.h,
      w: warp.w,
      h: warp.h,
      cursorBox: { x: warp.x, y: warp.y, w: warp.w, h: warp.h },
      label: scene.baseExitLabel(warp) || warpLabel(warp),
      warp,
    });
  }
  for (const pickup of scene.pickups) {
    if (pickup.taken) continue;
    const c = pickup.candidate;
    c.priority = P.object;
    c.type = 'thing';
    c.name = getItem(pickup.itemId).name;
    c.label = `Agarrar ${getItem(pickup.itemId).name}`;
    c.cursorBox = { x: pickup.x - 8, y: pickup.y - 20, w: 16, h: 20 };
    list.push(c);
  }
  return list;
}

export function update(scene, dt, input) {
  scene.t += dt;
  scene.hud.update(dt);
  scene.surface.update(dt, scene.player);
  scene.snow?.update(dt);
  scene.updatePava(dt);
  scene.light.setMode(scene.game.lightingMode);
  scene.light.update(dt);
  scene.updateTimedBar(dt);

  if (scene.comic.open) {
    // Con un overlay abierto el cursor vuelve a la flecha (T11).
    scene.game.mouseCursor?.setState('arrow');
    scene.comic.update(dt, input);
    if (!scene.comic.open) scene.comicUi.mesh.visible = false;
    scene.drawHud(input, { prompt: null, showHotbar: false, hintActions: null });
    return;
  }
  if (scene.caption.open) {
    scene.game.mouseCursor?.setState('arrow');
    const result = scene.caption.update(dt, input);
    if (result === 'closed') {
      scene.captionUi.mesh.visible = false;
      scene.game.emit('captionEnd', {});
      if (scene.captionResolve) {
        const resolve = scene.captionResolve;
        scene.captionResolve = null;
        resolve();
      }
    }
    scene.drawHud(input, { prompt: null, showHotbar: false, hintActions: null });
    return;
  }
  if (scene.balloon.open) {
    // Un globo abierto consume el input del cuadro (como caption/dialogo):
    // el click que lo cierra no debe ejecutar ademas la interaccion del mundo.
    scene.balloon.update(dt, input);
    if (!scene.balloon.open) scene.balloonUi = null;
    scene.cursor.hide();
    scene.game.mouseCursor?.setState('arrow');
    scene.drawHud(input, { prompt: null, showHotbar: false, hintActions: null });
    return;
  }

  if (scene.dialog.open) {
    scene.cursor.hide();
    const point = scene.pointerView(input);
    const result = scene.dialog.update(dt, input, input.device, point);
    if (result === 'closed') {
      scene.game.emit('dialogEnd', { id: scene.dialogId || null });
      scene.dialogId = null;
    }
    if (scene.dialog.open && input.device === 'mouse' && point) {
      const over = pointInRect(point, scene.dialog.boxRect(), 2)
        || pointInRect(point, scene.dialog.closeRect(input.device), 3);
      scene.game.mouseCursor?.setState(over ? 'hand' : 'arrow');
    }
    scene.drawHud(input, { prompt: null, showHotbar: false, hintActions: null });
    return;
  }
  if (scene.choice.open) {
    scene.cursor.hide();
    const point = scene.pointerView(input);
    scene.choice.update(dt, input, input.device, point);
    if (scene.choice.open && input.device === 'mouse' && point) {
      const over = scene.choice.hitOption(point) >= 0
        || pointInRect(point, scene.choice.backRect(input.device), 3)
        || pointInRect(point, scene.choice.pickRect(input.device), 3);
      scene.game.mouseCursor?.setState(over ? 'hand' : 'arrow');
    }
    scene.drawHud(input, { prompt: null, showHotbar: false, hintActions: null });
    return;
  }

  scene.handleHotbar(input);

  // La línea de mirar de la primera vez de un paso se lee antes de cambiar
  // de ambiente (DIRECCION.md, "Tipos de objeto" regla 2).
  if (scene.updatePendingWarp(dt)) return;

  // Movimiento + camara suave (sin aceleracion rara: velocidad constante).
  // Cargando un mueble liviano, Juan camina al 80 % (§7).
  scene.player.speedScale = scene.carryData() ? 0.8 : 1;
  scene.player.update(dt, input.move, scene.world, scene.mapData.bounds);
  scene.updateCarryMesh();
  if (scene.footprints) scene.footprints.update(dt, scene.player, true);
  scene.followCamera(dt);
  scene.snow?.setCamera(scene.cam.x, scene.cam.y);
  scene.light.setCamera(scene.cam.x, scene.cam.y);

  for (const npc of scene.npcs) {
    if (npc.hidden) continue;
    const near = Math.hypot(npc.x - scene.player.x, npc.feet - scene.player.feet) < 56;
    npc.update(dt, scene.player, near);
  }

  for (const pickup of scene.pickups) {
    pickup.update(dt, scene.player);
    if (pickup.takeNow) scene.collect(pickup);
  }

  // Puertas / escaleras.
  scene.exitWarp = warpAt(scene.player.x, scene.player.feet, scene.mapData.warps);
  if (scene.pendingWarp) {
    // Esperando que se lea la línea de la primera vez: no se pisa el paso.
  } else if (scene.exitWarp) {
    if (scene.canWarp(scene.exitWarp)) {
      // Primera vez que se pisa el paso: la línea de mirar va antes de irse.
      const line = scene.firstWarpLine(scene.exitWarp);
      if (line) {
        scene.game.showToast(line);
        scene.pendingWarp = { warp: scene.exitWarp, t: 1.2 };
        return;
      }
      scene.warpNow(scene.exitWarp);
      return;
    }
    // Pisar un warp bloqueado avisa que falta (una vez por aproximacion).
    scene.warpBlockedFeedback(scene.exitWarp);
  } else {
    scene.warpWarnId = null;
  }

  // Apuntado por casilleros de acceso (teclado/joystick) o hover del mouse.
  const candidates = scene.candidates();
  const found = pickTarget(
    { x: scene.player.x, feet: scene.player.feet, dir: scene.player.dir },
    candidates,
    { dir: scene.player.dir, map: scene.mapData },
  );
  // Histéresis: si sigue en un acceso del objetivo actual no salta a uno
  // vecino, salvo que el nuevo quede justo de frente (tile de acción).
  let target = found.target;
  if (scene.target && target && scene.target.id !== target.id) {
    const current = candidates.find(
      (c) => c.id === scene.target.id && c.kind === scene.target.kind,
    );
    const player = { x: scene.player.x, feet: scene.player.feet, dir: scene.player.dir };
    if (current
      && playerInAccess(player, current, scene.mapData)
      && facesFootprint(player, current, scene.mapData, scene.player.dir)
      && !actionInsideFoot(player, target, scene.mapData, scene.player.dir)) {
      target = current;
    }
  }
  scene.target = target;
  scene.targetVia = target ? 'access' : null;
  scene.updateMouseTarget(input, candidates);

  scene.updateCursor(input);
  const hands = scene.handsActionFor(input);
  scene.handsAim = hands.aim;
  scene.handsAction = hands.action;
  scene.updateGhost(input, hands.aim, hands.action);

  // Barra de pistas del mouse (T7): leyenda fija; solo "Mochila" es clickeable.
  let hint = null;
  let clickPoint = null;
  if (input.device === 'mouse') {
    clickPoint = scene.pointerView(input);
    if (clickPoint) {
      const layout = scene.hud.hintLayout(
        input.device, scene.hudParams(input).hintActions || [],
      );
      hint = layout.boxes.find(
        (b) => !b.static && pointInRect(clickPoint, b.rect),
      ) || null;
      if (hint) scene.game.mouseCursor?.setState('hand');
    }
  }
  scene.hoverHint = hint ? hint.action : null;

  if (input.handsPressed) {
    // Manos: click derecho o X (agarra / deja / levanta / apoya).
    const blocked = input.device === 'mouse' && scene.pointerOverHud(input);
    if (blocked) {
      scene.drawHud(input, scene.hudParams(input));
      return;
    }
    if (!scene.handsAction && input.device === 'mouse'
      && (scene.heldId() || scene.carryData()) && scene.handsAim?.tile
      && !adjacentToPlayer(scene.player, scene.handsAim.tile.tx, scene.handsAim.tile.ty)) {
      scene.warnNear();
    } else {
      scene.runHands(scene.handsAction, input);
    }
    scene.drawHud(input, scene.hudParams(input));
    return;
  }
  if (input.yPressed) {
    scene.cursor.hide();
    scene.game.openMenu(0);
    return;
  }
  if (input.click && input.device === 'mouse') {
    // Hotbar: el click solo elige el slot (ya no usa el ítem).
    const hotbar = hotbarLayout();
    if (pointInRect(clickPoint, hotbar.panel)) {
      const slot = hitIndex(clickPoint, hotbar.slots);
      if (slot >= 0) scene.game.selectedSlot = slot;
      scene.drawHud(input, scene.hudParams(input));
      return;
    }
    if (hint && hint.action === 'bag') {
      scene.cursor.hide();
      scene.game.openMenu(0);
      return;
    }
    scene.handleMouseClick(input);
    scene.drawHud(input, scene.hudParams(input));
    return;
  }
  if (input.padAPressed) {
    scene.interact(input);
    scene.drawHud(input, scene.hudParams(input));
    return;
  }

  scene.drawHud(input, scene.hudParams(input));
}
