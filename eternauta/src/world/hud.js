import { hotbarLayout, placeGhostLabel } from '../hud.js';
import { resolveAction, resolveHands, typeOf } from '../actions.js';
import { VIEW_W, VIEW_H } from '../sprite.js';
import { viewport } from '../viewport.js';
import { drawText, measureText } from '../font.js';
import { OUT, TEXT, darkPanel } from '../uiSkin.js';
import { FALTA } from '../titleUi.js';
import { APAGON_MAPS } from '../apagon.js';
import { drawThermometer } from '../mate.js';
import { isGrabbable, boxOf, boxOfWarp } from './helpers.js';
import { FLAG } from '../data/flags.js';

export function updateCursor(scene, input) {
  // Con mouse el cuadrado ya lo maneja updateMouseTarget.
  if (input.device === 'mouse') return;
  // Sin objetivo no hay cuadradito: nunca sobre piso o pared vacíos.
  if (!scene.target) {
    scene.cursor.fadeOut(scene.t);
    return;
  }
  const box = scene.target.cursorBox || boxOf(scene.target);
  const primary = scene.actionFor(scene.target);
  const own = Boolean(primary && primary.kind !== 'look') || isGrabbable(scene.target);
  scene.cursor.showAt(box, scene.t, {
    mode: own ? 'near' : 'faint',
    grab: isGrabbable(scene.target),
    id: scene.target.id,
  });
  scene.cursor.setPosition(box.x + box.w / 2, box.y + box.h / 2);
}

/**
 * Única fuente de la etiqueta de acción (prompt con mouse, barra y click).
 * Sale del mismo resolvedor que ejecuta la acción, así no pueden divergir.
 */
export function actionLabel(scene, target) {
  return scene.actionFor(target)?.label ?? null;
}

/**
 * Obstáculos que la etiqueta flotante no puede tapar (B1): Juan, el cursor
 * (con mouse), la hotbar y la barra de pistas.
 */
export function labelObstacles(scene, input = null) {
  const obstacles = [];
  const player = scene.playerViewBox();
  if (player) obstacles.push(player);
  const device = input?.device || scene.game.input?.device || 'mouse';
  if (device === 'mouse') {
    const point = scene.pointerView(input);
    if (point) obstacles.push({ x: point.x - 2, y: point.y - 2, w: 14, h: 16 });
  }
  obstacles.push(hotbarLayout().panel);
  for (const rect of scene.hintRects || []) obstacles.push(rect);
  return obstacles;
}

export function hudParams(scene, input = null) {
  const device = input?.device || scene.game.input?.device || 'mouse';
  const target = scene.target;
  const held = scene.heldId();
  const obstacles = scene.labelObstacles(input);
  const carry = typeof scene.carryData === 'function' ? scene.carryData() : null;
  const self = resolveAction(scene.ctx(), null, held);
  let primary = null;
  // El puntero sobre Juan manda: Hacer es el uso propio (§2, §11.5).
  if (scene.selfHover) primary = self;
  else if (target) primary = scene.actionFor(target);
  else if (device !== 'mouse') primary = self;

  // Manos (§4): misma decisión que ejecuta el click derecho / RT.
  let aim = scene.handsAim;
  if (!aim && typeof scene.aimFor === 'function') aim = scene.aimFor(input);
  if (!aim) {
    aim = { target, tile: null, point: null, device };
  }
  const hands = scene.handsAction
    || resolveHands(scene.ctx(), aim, held, carry);
  if (carry) {
    primary = target && typeOf(target) === 'person'
      ? resolveAction(scene.ctx(), target, held)
      : hands;
  }

  let prompt = null;
  const warp = scene.exitWarp
    || (target && target.kind === 'warp' ? target.warp : null);
  // Si el puntero/objetivo es un objeto (p. ej. el extractor), su prompt
  // manda sobre el "Salir sin traje" del warp bloqueado bajo los pies.
  const overObject = Boolean(target && target.kind !== 'warp');
  const warpBlocked = !overObject && warp && !carry
    && ((warp.needsSuit && !scene.game.hasSuit)
      || (warp.needsFlag && !scene.game.flags[warp.needsFlag]));
  if (scene.selfHover && primary) {
    // Puntero sobre Juan: el aviso va sobre su cabeza (§2).
    const pbox = scene.playerViewBox();
    if (pbox) {
      const p = scene.worldToView(scene.player.x, scene.player.feet - 30);
      prompt = {
        action: 'interact',
        anchor: 'above',
        label: primary.label,
        color: TEXT,
        alpha: 1,
        x: p.x,
        y: p.y,
        frameH: pbox.h,
        frameW: pbox.w,
        obstacles,
      };
    }
  } else if (warpBlocked) {
    const b = boxOfWarp(warp);
    const needSuit = warp.needsSuit && !scene.game.hasSuit;
    const far = Boolean(scene.hoverTarget && !scene.hoverNear);
    const p = scene.worldToView(b.x + b.w / 2, b.y);
    prompt = {
      action: 'interact',
      anchor: 'above',
      label: needSuit ? 'Salir sin traje' : scene.exitBlocker(),
      x: p.x, y: p.y,
      frameH: b.h * viewport.zoom,
      frameW: b.w * viewport.zoom,
      side: warp.labelSide || null,
      obstacles,
      color: far ? '#ffb07a' : '#ff9a8a',
      alpha: far ? 0.75 : 1,
    };
  } else if (target && !carry) {
    const far = Boolean(scene.hoverTarget && !scene.hoverNear);
    const b = target.cursorBox || boxOf(target);
    // Etiqueta centrada arriba del marco del objeto, en coordenadas de vista.
    const p = scene.worldToView(b.x + b.w / 2, b.y);
    prompt = {
      action: 'interact',
      anchor: 'above',
      label: primary?.label || null,
      color: far ? '#ffb07a' : TEXT,
      alpha: far ? 0.75 : 1,
      x: p.x,
      y: p.y,
      frameH: b.h * viewport.zoom,
      frameW: b.w * viewport.zoom,
      side: target.warp?.labelSide || null,
      obstacles,
    };
  }

  // Barra: Hacer (si hay algo que hacer), Manos (si resolveHands devuelve
  // algo) y Mochila siempre. Nunca una entrada Mirar aparte: cuando Hacer
  // mira, el texto ya dice "Mirar <objeto>".
  const hints = [];
  const primaryLabel = primary?.label || null;
  const handsLabel = hands?.label || null;
  if (primaryLabel && handsLabel && primaryLabel === handsLabel) {
    hints.push({ action: 'hands', label: handsLabel, static: true });
  } else {
    if (primaryLabel) {
      hints.push({ action: 'interact', label: primaryLabel, static: true });
    }
    if (handsLabel) {
      hints.push({ action: 'hands', label: handsLabel, static: true });
    }
  }
  hints.push({ action: 'bag', label: 'Mochila' });
  return { prompt, hintActions: hints, showHotbar: true };
}

/** Texto corto de lo que falta para poder abrir el porton del garaje. */
export function exitBlocker(scene) {
  const f = scene.game.flags || {};
  if (!f[FLAG.ELECTROGENO_ON]) return 'Falta cargar nafta.';
  if (!f[FLAG.EXTRACTOR_OK]) return 'Falta instalar el extractor.';
  if (!f[FLAG.TRAJE_FABRICADO]) return 'Falta fabricar el traje.';
  if (!f[FLAG.ESCLUSA_LISTA]) return 'Falta preparar la esclusa.';
  if (!f[FLAG.DADOS]) return 'Faltan los dados: andá al living.';
  if (!scene.game.hasSuit) return 'Ponete el traje.';
  if (!scene.game.hasRifle) return 'Equipá el rifle.';
  return 'Todavía no está todo listo.';
}

/** Etiqueta del uso propio del ítem en la mano (helper interno). */
export function useLabel(scene) {
  const held = scene.heldId();
  if (!held) return 'Usar';
  return resolveAction(scene.ctx(), null, held)?.label || 'Usar';
}

export function drawHud(scene, input, params) {
  // Con el cofre abierto el HUD de mundo queda oculto de verdad: el
  // drawHud del mismo click volvia a mostrarlo detras del panel.
  if (scene.game && (scene.game.chestOpen || scene.game.tallerOpen)) return;
  const objective = scene.game.objective();

  // Pase de luz: debajo del HUD, para que la interfaz nunca se oscurezca.
  // En el apagón de altillo/casa/calle la luz va por post-proceso (main.js):
  // acá no se dibuja ningún velo para no oscurecer dos veces.
  const post = scene.game.lightingMode === 'apagon' && APAGON_MAPS.has(scene.name);
  scene.ensureLightUi();
  scene.lightUi.mesh.visible = !post;
  if (!post) {
    scene.light.setMode(scene.game.lightingMode);
    scene.light.setCamera(scene.cam.x, scene.cam.y);
    const lw = scene.lightUi.canvas.width;
    const lh = scene.lightUi.canvas.height;
    scene.lightUi.mesh.position.set(scene.cam.x + lw / 2, scene.cam.y + lh / 2, 20);
    scene.lightUi.clear();
    scene.light.draw(scene.lightUi.ctx, scene.t, { ...scene.player, mateCalma: scene.game.mateCalma > 0 });
    scene.lightUi.commit();
  }
  scene.drawApagonFx();

  scene.hud.draw({
    device: input.device,
    objective,
    hasSuit: scene.game.hasSuit,
    botin: scene.inBase ? (scene.game.baseBotin || null) : null,
    prompt: params.prompt ?? null,
    showHotbar: params.showHotbar !== false,
    hintActions: params.hintActions ?? null,
    hoverHint: scene.hoverHint,
    hidden: scene.comic.open,
  });
  // Rects reales del HUD para la oclusion del hover/click del proximo cuadro.
  if (params.showHotbar !== false && params.hintActions && params.hintActions.length) {
    const layout = scene.hud.hintLayout(input.device, params.hintActions);
    scene.hintRects = layout.boxes.map((b) => b.rect);
  } else {
    scene.hintRects = [];
  }

  // Capa extra: termómetro de la pava, barra de tiempo y globos.
  scene.extra.clear();
  const ex = scene.extra.ctx;
  if (scene.game.pava && scene.game.pava.heating) {
    drawThermometer(ex, VIEW_W - 24, 92, scene.game.pava.temp);
    // La etiqueta va en tablita oscura ARRIBA del termómetro: antes flotaba
    // sin fondo encima de la pava de la cocina y la tapaba.
    const glyphs = scene.game.assets.font.glyphs;
    const label = 'pava';
    const lw = measureText(glyphs, label) + 12;
    const lx = Math.max(4, Math.min(VIEW_W - lw - 4,
      Math.round(VIEW_W - 21 - lw / 2)));
    const ly = 70;
    darkPanel(ex, lx, ly, lw, 15, 0.78);
    drawText(ex, glyphs, lx + 6, ly + 4, label, TEXT, { outline: OUT });
  }
  scene.drawTimedBar(ex);
  scene.drawHandsFeedback(ex);
  if (scene.balloon.open) scene.balloon.draw(ex, scene.cam.x, scene.cam.y, viewport.zoom);
  scene.extra.commit();

  if (scene.comic.open) {
    scene.comicUi.clear();
    scene.comic.draw(scene.comicUi.ctx, input.device);
    scene.comicUi.commit();
  }
  if (scene.caption.open) {
    scene.captionUi.clear();
    scene.caption.draw(scene.captionUi.ctx);
    scene.captionUi.commit();
  }
  if (scene.dialog.open) {
    scene.dialog.draw(scene.hud.ui.ctx, VIEW_W, VIEW_H, input.device);
    scene.hud.ui.commit();
  }
  if (scene.choice.open) {
    scene.choice.draw(scene.hud.ui.ctx, VIEW_W, VIEW_H, input.device);
    scene.hud.ui.commit();
  }
}

/**
 * Aviso rojo de Manos con mouse (§8): "No entra ahí." / "Taparía el paso."
 * Va en la capa extra, arriba del HUD, junto al lugar apuntado.
 */
export function drawHandsFeedback(scene, ctx) {
  const fb = scene.handsFeedback;
  if (!fb || !fb.text) return;
  const glyphs = scene.game.assets.font.glyphs;
  const z = viewport.zoom;
  // Caja de la silueta en la vista (arriba de ella va la etiqueta).
  const boxWorld = fb.box || { x: fb.x - 8, y: fb.y - 16, w: 16, h: 16 };
  const topLeft = scene.worldToView(boxWorld.x, boxWorld.y);
  const box = {
    x: topLeft.x, y: topLeft.y, w: boxWorld.w * z, h: boxWorld.h * z,
  };
  // La caja de Juan es obstáculo: la etiqueta se corre para no taparlo.
  const pb = scene.playerWorldBox();
  let playerBox = null;
  if (pb) {
    const p = scene.worldToView(pb.x, pb.y);
    playerBox = { x: p.x, y: p.y, w: pb.w * z, h: pb.h * z };
  }
  const w = measureText(glyphs, fb.text) + 12;
  const rect = placeGhostLabel({ box, playerBox, w });
  const x = rect.x;
  const y = rect.y;
  ctx.fillStyle = 'rgba(20, 14, 24, 0.86)';
  ctx.fillRect(x, y, w, 15);
  ctx.fillStyle = 'rgba(240, 154, 122, 0.55)';
  ctx.fillRect(x, y, w, 1);
  drawText(ctx, glyphs, x + 6, y + 4, fb.text, FALTA, { outline: OUT });
}

export function drawTimedBar(scene, ctx) {
  if (!scene.timedBar) return;
  const bar = scene.timedBar;
  const w = 168;
  const x = Math.round((VIEW_W - w) / 2);
  const y = 30;
  ctx.fillStyle = 'rgba(10, 10, 20, 0.82)';
  ctx.fillRect(x - 3, y - 3, w + 6, 17);
  ctx.fillStyle = OUT;
  ctx.fillRect(x, y, w, 10);
  const left = Math.max(0, bar.left / bar.total);
  ctx.fillStyle = left > 0.35 ? '#e8963a' : '#c04038';
  ctx.fillRect(x + 1, y + 1, Math.round((w - 2) * left), 8);
  ctx.fillStyle = '#ffcf6e';
  ctx.fillRect(x, y, w, 1);
  const font = scene.game.assets.font.glyphs;
  const label = bar.label || '¡Apurate!';
  const tw = measureText(font, label);
  drawText(ctx, font, Math.round((VIEW_W - tw) / 2), y + 14, label, TEXT,
    { outline: OUT });
}
