import { hotbarLayout, hudBlocksPoint } from '../hud.js';
import { pickAt, actionTile } from '../interaction.js';
import { resolveAction, resolveHands, typeOf } from '../actions.js';
import { pointInRect } from '../geom.js';
import { mousePoint } from '../uiHit.js';
import { isGrabbable, boxOf } from './helpers.js';

/** Puntero en píxeles del mundo (cámara + zoom), solo con mouse. */
export function pointerWorld(scene, input) {
  const client = input && (input.click || input.pointer);
  if (!client) return null;
  return scene.game.screenToWorld(client.x, client.y);
}

/** Caja del sprite de Juan en píxeles del mundo (§2: click sobre Juan). */
export function playerWorldBox(scene) {
  if (!scene.player) return null;
  return {
    x: Math.round(scene.player.x) - 8,
    y: Math.round(scene.player.feet) - 32,
    w: 16,
    h: 32,
  };
}

/** Qué se apunta con Manos: el objeto bajo el puntero o el tile de adelante. */
export function aimFor(scene, input) {
  const device = input?.device || 'mouse';
  const target = device === 'mouse' ? scene.hoverTarget : scene.target;
  let tile = null;
  let point = null;
  if (device === 'mouse') {
    const p = scene.pointerWorld(input);
    if (p) {
      tile = { tx: Math.floor(p.x / 16), ty: Math.floor(p.y / 16) };
      point = p;
    }
  } else {
    const a = actionTile(scene.player.x, scene.player.feet, scene.player.dir);
    tile = { tx: a.tx, ty: a.ty };
    point = { x: a.cx, y: a.cy };
  }
  return { target, tile, point, device, near: target ? scene.hoverNear : true };
}

export function handsActionFor(scene, input) {
  const aim = scene.aimFor(input);
  const action = resolveHands(
    scene.ctx(), aim, scene.heldId(), scene.carryData(),
  );
  return { aim, action };
}

/** Puntero en coordenadas de la vista (480x270), solo con mouse. */
export function pointerView(scene, input) {
  if (input && input.click) {
    return scene.game.screenToView(input.click.x, input.click.y);
  }
  return mousePoint(scene.game, input);
}

/**
 * Hover del mouse: elige el objeto bajo el puntero, cambia el cursor y
 * muestra el cuadrado de preseleccion (dorado cerca, ambar lejos).
 * El unico recorte son los rects REALES del HUD (hotbar y barra de pistas),
 * no una franja fija: el mundo pegado al borde inferior se puede clickear.
 */
export function updateMouseTarget(scene, input, candidates) {
  scene.hoverTarget = null;
  scene.hoverNear = false;
  scene.selfHover = false;
  let state = 'arrow';
  if (input.device === 'mouse') {
    // Con el mouse manda el puntero, no la direccion de la mirada.
    scene.target = null;
    scene.targetVia = null;
    const client = input.click || input.pointer;
    const point = client
      ? scene.game.screenToWorld(client.x, client.y)
      : null;
    const view = scene.pointerView(input);
    if (point && !hudBlocksPoint(view, scene.hintRects)) {
      const hit = pickAt(
        { x: scene.player.x, feet: scene.player.feet, dir: scene.player.dir },
        candidates, point, { dir: scene.player.dir, map: scene.mapData },
      );
      const self = resolveAction(scene.ctx(), null, scene.heldId());
      const pbox = scene.playerWorldBox();
      const overPlayer = Boolean(self && pbox && pointInRect(point, pbox));
      // Cargando un mueble no hay uso propio: primero se apoya (§4, §7).
      scene.selfHover = overPlayer && !scene.carryData();
      if (hit.target) {
        scene.setHover(hit.target, hit.near);
        state = hit.near ? 'hand' : 'far';
      } else if (overPlayer) {
        // Puntero sobre Juan con un ítem con uso propio: cuadradito y
        // barra [click] Tomar mate (§2).
        scene.hoverNear = true;
        scene.cursor.showAt(pbox, scene.t, {
          mode: 'near', grab: false, id: 'player',
        });
        scene.cursor.setPosition(pbox.x + pbox.w / 2, pbox.y + pbox.h / 2);
        state = 'hand';
      } else {
        scene.cursor.hide();
      }
    } else {
      scene.cursor.hide();
    }
  }
  scene.game.mouseCursor?.setState(state);
}

/** Aplica el objetivo hovereado al cursor y al tile de accion. */
export function setHover(scene, target, near) {
  scene.hoverTarget = target;
  scene.hoverNear = near;
  scene.target = target;
  scene.targetVia = 'mouse';
  const box = target.cursorBox || boxOf(target);
  // El cuadradito anticipa: dorado si hay acción propia, tenue si solo se
  // mira (decorado), y ámbar fijo de lejos.
  const primary = scene.actionFor(target);
  const own = Boolean(primary && primary.kind !== 'look') || isGrabbable(target);
  scene.cursor.showAt(box, scene.t, {
    mode: near ? (own ? 'near' : 'faint') : 'far',
    grab: isGrabbable(target),
    id: target.id,
  });
  scene.cursor.setPosition(box.x + box.w / 2, box.y + box.h / 2);
}

/** Sin hover de un mapa/estado anterior (cursor y hints vuelven a cero). */
export function clearHover(scene) {
  scene.hoverTarget = null;
  scene.hoverNear = false;
  scene.hintRects = [];
}

/**
 * Click izquierdo = Hacer. Sobre Juan (o sin objetivo con joystick) es el
 * uso propio del ítem; con mouse, el click en piso vacío no hace nada (§11.5).
 */
export function handleMouseClick(scene, input = null) {
  // Cargando un mueble Hacer apoya (salvo hablar con una persona).
  if (scene.carryData()) {
    const carried = scene.hoverTarget;
    if (carried && typeOf(carried) === 'person') {
      scene.faceTarget(carried);
      scene.runAction(
        resolveAction(scene.ctx(), carried, scene.heldId()), carried,
      );
      return;
    }
    scene.runHands(scene.handsAction, input);
    return;
  }
  if (scene.selfHover) {
    const self = resolveAction(scene.ctx(), null, scene.heldId());
    scene.runAction(self, null);
    return;
  }
  const target = scene.hoverTarget;
  if (!target) return;
  scene.faceTarget(target);
  scene.runAction(scene.actionFor(target), target);
}

export function handleHotbar(scene, input) {
  const game = scene.game;
  if (input.prevHotbar) game.selectedSlot = (game.selectedSlot + 7) % 8;
  if (input.nextHotbar) game.selectedSlot = (game.selectedSlot + 1) % 8;
  if (input.slotPressed >= 0) game.selectedSlot = input.slotPressed;
  if (input.wheel) {
    game.selectedSlot = (game.selectedSlot + (input.wheel > 0 ? 1 : 7)) % 8;
  }
}

/** ¿El puntero (mouse) está sobre la hotbar o la barra de pistas? */
export function pointerOverHud(scene, input) {
  const client = input?.click || input?.rightClick || input?.pointer;
  if (!client) return false;
  const view = scene.pointerView(input);
  if (!view) return true;
  if (pointInRect(view, hotbarLayout().panel)) return true;
  return hudBlocksPoint(view, scene.hintRects);
}
