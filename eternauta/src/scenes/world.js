import * as THREE from 'three';
import { WorldMap, cloneMap } from '../mapView.js';
import { Player } from '../player.js';
import { NPC } from '../npc.js';
import { Pickup } from '../pickup.js';
import { DialogBox, ChoiceBox } from '../dialog.js';
import { Hud, hotbarLayout, hudBlocksPoint } from '../hud.js';
import { ActionCursor } from '../cursor.js';
import { Snowfall } from '../snow.js';
import { Footprints } from '../footprints.js';
import { pickTarget, pickAt, actionBox, warpAt } from '../interaction.js';
import { talkEntry, WARNING } from '../dialogs.js';
import { addItem, removeItem, countItem } from '../inventory.js';
import { getItem } from '../items.js';
import { resolveAction } from '../actions.js';
import { PLAYER_SPEED } from '../movement.js';
import { VIEW_W, VIEW_H, depthFor, canvasOverlay } from '../sprite.js';
import { viewport, snapCamera, worldToView as toView } from '../viewport.js';
import { drawText, measureText } from '../font.js';
import { mousePoint, pointInRect, hitIndex } from '../uiHit.js';
import {
  SurfaceLayer, applyContainers, itemsForMap, NO_SPACE_MESSAGE,
} from '../surfaces.js';
import { INITIAL_ITEMS } from '../data/surfaces.js';
import { lookLine } from '../data/descriptions.js';
import { LightOverlay } from '../lighting.js';
import { buildApagon, APAGON_MAPS } from '../apagon.js';
import { ComicOverlay, CaptionBox, BalloonLine } from '../comic.js';
import {
  putYerba, cebar, sip, share, dump, mateItemId,
  startHeating, stopHeating, heat, pavaItemId, drawThermometer,
} from '../mate.js';

const NPC_NAMES = {
  favalli: 'Favalli', lucas: 'Lucas', polsky: 'Polsky',
  elena: 'Elena', martita: 'Martita',
};

/** Escena de mundo con mapa de tiles, NPCs, pickups e interaccion. */
export class WorldScene {
  constructor(game, rawMap, opts = {}) {
    this.game = game;
    // Rellena contenedores con los objetos iniciales del §6.3. Copiamos el
    // mapa para que cada escena tenga sus propios meshes (la calle se repite).
    this.mapData = applyContainers(cloneMap(rawMap), INITIAL_ITEMS);
    this.name = this.mapData.id;
    this.pausable = true;
    // Escenas de mundo: cámara ampliada (T2). Las pantallas fijas lo apagan.
    this.worldZoom = true;
    this.opts = opts;
    this.scene = new THREE.Scene();
    // Capa de UI fija en pantalla: se dibuja con uiCamera (no viaja con el mundo).
    this.uiScene = new THREE.Scene();
    this.world = new WorldMap(this.scene, game.assets, this.mapData);
    this.player = new Player(
      this.scene, game.assets,
      game.hasSuit ? (game.hasRifle ? 'juan_suit_rifle' : 'juan_suit') : 'juan',
    );
    this.npcs = this.mapData.npcs.map((def) => new NPC(this.scene, game.assets, def));
    this.pickups = [];
    this.dialog = new DialogBox(game.assets);
    this.choice = new ChoiceBox(game.assets);
    this.hud = new Hud(this.uiScene, game.assets, game);
    this.cursor = new ActionCursor(this.scene);
    this.snow = opts.snow
      ? new Snowfall(this.scene, game.assets.snowFlakes, { count: 120, front: 34 })
      : null;
    this.footprints = opts.footprints
      ? new Footprints(this.scene, game.assets.footprint)
      : null;

    // Objetos apoyados en muebles (§4).
    this.surface = new SurfaceLayer(
      this.scene, game.assets, this.mapData,
      itemsForMap(this.mapData.id, INITIAL_ITEMS, this.mapData),
    );

    // Luz (debajo del HUD) + historieta (arriba del HUD).
    this.light = new LightOverlay(game.assets, this.mapData);
    this.lightUi = null;
    this.ensureLightUi();
    this.comic = new ComicOverlay(game.assets);
    this.comicUi = canvasOverlay(VIEW_W, VIEW_H, 50);
    this.comicUi.mesh.visible = false;
    this.uiScene.add(this.comicUi.mesh);
    this.caption = new CaptionBox(game.assets);
    this.captionUi = canvasOverlay(VIEW_W, VIEW_H, 52);
    this.captionUi.mesh.visible = false;
    this.uiScene.add(this.captionUi.mesh);
    this.balloon = new BalloonLine(game.assets);
    this.extra = canvasOverlay(VIEW_W, VIEW_H, 31);
    this.uiScene.add(this.extra.mesh);
    // Chispas del apagón (llama de la vela, pucho de Lucas): van en la capa de
    // UI, debajo del HUD, así el post-proceso no las apaga.
    this.apagonFx = canvasOverlay(VIEW_W, VIEW_H, 29);
    this.apagonFx.mesh.visible = false;
    this.uiScene.add(this.apagonFx.mesh);
    this.timedBar = null;

    this.t = 0;
    this.cam = { x: 0, y: 0 };
    this.target = null;
    this.targetVia = null;
    this.hoverTarget = null;
    this.hoverNear = false;
    // Rects (vista 480x270) que dibujo el HUD en el ultimo cuadro: los usa la
    // oclusion real (hotbar y barra de pistas).
    this.hintRects = [];
    this.exitWarp = null;
    // Ultimo warp bloqueado avisado: una vez por aproximacion, sin spam.
    this.warpWarnId = null;
    // Ultimo "Acercate un poco." (cooldown de 1 s en runAction).
    this.nearWarnAt = null;
    this.silbatoAvisado = false;
    this.givePickups();
    this.applyStoryState();
  }

  givePickups() {
    for (const pickup of this.pickups) pickup.dispose(this.scene);
    this.pickups = this.mapData.pickups.map(
      (def) => new Pickup(this.scene, this.game.assets, def),
    );
  }

  reset() {
    this.clearHover();
    this.givePickups();
    this.dialog.hide();
    this.choice.hide();
    this.comic.close?.();
    this.caption.open = false;
    this.comicUi.mesh.visible = false;
    this.captionUi.mesh.visible = false;
    this.timedBar = null;
    this.surface.dispose();
    this.surface = new SurfaceLayer(
      this.scene, this.game.assets, this.mapData,
      itemsForMap(this.mapData.id, INITIAL_ITEMS, this.mapData),
    );
    this.player.setSuit(this.game.hasSuit);
    this.player.setRifle?.(this.game.hasSuit && this.game.hasRifle);
    this.player.place(this.mapData.spawn.x, this.mapData.spawn.y, this.mapData.spawn.dir);
    for (const npc of this.npcs) {
      npc.hidden = false;
      npc.mesh.visible = true;
      npc.shadow.visible = true;
      npc.markSeen();
      npc.hasNew = true;
      npc.resetPose();
    }
    this.footprints?.reset();
    this.applyStoryState();
  }

  enter(spawn) {
    this.clearHover();
    this.player.setSuit(this.game.hasSuit);
    this.player.setRifle?.(this.game.hasSuit && this.game.hasRifle);
    const point = spawn || this.mapData.spawn;
    this.player.place(point.x, point.y, point.dir || 'down');
    this.cam = this.world.cameraFor(this.player.x, this.player.feet);
    this.hud.show();
    this.dialog.hide();
    this.choice.hide();
    this.cursor.hide();
    this.comicUi.mesh.visible = false;
    this.captionUi.mesh.visible = false;
    this.lightUi.mesh.visible = true;
    this.extra.mesh.visible = true;
    this.snow?.scatter();
    this.footprints?.reset();
    this.t = 0;
    this.silbatoAvisado = false;
    this.warpWarnId = null;
    this.applyStoryState();
    this.game.emit('enterMap', { map: this.name, spawn: point });
  }

  /** Sin hover de un mapa/estado anterior (cursor y hints vuelven a cero). */
  clearHover() {
    this.hoverTarget = null;
    this.hoverNear = false;
    this.hintRects = [];
  }

  get camX() { return this.cam.x; }
  get camY() { return this.cam.y; }

  /** Mundo -> vista UI (480x270). Los prompts y globos viven en la vista. */
  worldToView(x, y) {
    return toView(x, y, this.cam, viewport.zoom);
  }

  /** Caja del jugador en coordenadas de la vista (para esquivar la etiqueta). */
  playerViewBox() {
    if (!this.player) return null;
    const z = viewport.zoom;
    const p = this.worldToView(this.player.x - 6, this.player.feet - 30);
    return { x: p.x, y: p.y, w: 12 * z, h: 30 * z };
  }

  /** Canvas de luz del tamaño de la vista del mundo; se rehace si cambia. */
  ensureLightUi() {
    const w = Math.ceil(viewport.worldW);
    const h = Math.ceil(viewport.worldH);
    if (this.lightUi && this.lightUi.canvas.width === w
      && this.lightUi.canvas.height === h) return;
    if (this.lightUi) {
      this.scene.remove(this.lightUi.mesh);
      this.lightUi.mesh.geometry.dispose();
      this.lightUi.mesh.material.dispose();
      this.lightUi.texture.dispose();
    }
    this.lightUi = canvasOverlay(w, h, 20);
    this.scene.add(this.lightUi.mesh);
  }

  /** Config del pase de luz del apagón, o null si esta escena no lo usa. */
  apagonParams() {
    if (this.game.lightingMode !== 'apagon') return null;
    return buildApagon(this);
  }

  /** Llama y pucho: píxeles de mundo dibujados sobre la escena y bajo el HUD. */
  drawApagonFx() {
    const fx = this.apagonFx;
    if (!fx) return;
    const params = this.apagonParams();
    if (!params || !params.fx.length) {
      fx.clear();
      fx.commit();
      fx.mesh.visible = false;
      return;
    }
    fx.mesh.visible = true;
    fx.clear();
    const ctx = fx.ctx;
    const z = viewport.zoom || 1;
    const s = Math.max(1, Math.round(z));
    const px = (wx) => Math.round((wx - this.cam.x) * z);
    const py = (wy) => Math.round((wy - this.cam.y) * z);
    const dot = (wx, wy, col) => { ctx.fillStyle = col; ctx.fillRect(px(wx), py(wy), s, s); };
    const smokeStep = Math.floor(this.t * 6) % 3;
    const SMOKE = [[0, -3], [1, -5], [0, -7], [1, -9], [2, -11]];
    for (const it of params.fx) {
      if (it.type === 'flame') {
        dot(it.x, it.y, '#fff6c8');
        dot(it.x, it.y - 1, '#ffd678');
        dot(it.x, it.y - 2, '#ffaa46');
        dot(it.x + 1, it.y, '#ffdc8c');
        continue;
      }
      if (it.type === 'smoke') {
        ctx.globalAlpha = 0.42;
        SMOKE.forEach(([dx, dy], i) => {
          if ((i + smokeStep) % 3 === 0) return;
          dot(it.x + dx, it.y + dy, '#9a9aa4');
        });
        ctx.globalAlpha = 1;
        continue;
      }
      const k = it.k ?? 0;
      if (it.type === 'ember') {
        // cigarrillo: 2 px de papel desde la comisura, brasa en la punta
        dot(it.x, it.y, '#c4beb2');
        dot(it.x + 1, it.y, '#b0aaa0');
        if (k < 0.3) {
          dot(it.x + 2, it.y, '#b23a1e');
        } else {
          dot(it.x + 2, it.y, k > 0.8 ? '#ffd68c' : '#f07832');
          dot(it.x + 3, it.y, '#e25424');
          if (k > 0.8) dot(it.x + 2, it.y - 1, '#ff9646');
        }
        continue;
      }
      // cherry: la brasa del cenicero, sin papel
      if (k < 0.3) dot(it.x, it.y, '#b23a1e');
      else {
        dot(it.x, it.y, k > 0.8 ? '#ffd68c' : '#f07832');
        dot(it.x + 1, it.y, '#e25424');
        if (k > 0.8) dot(it.x, it.y - 1, '#ff9646');
      }
    }
    fx.commit();
  }

  applyCamera(camera) {
    camera.left = this.cam.x;
    camera.right = this.cam.x + viewport.worldW;
    camera.top = this.cam.y;
    camera.bottom = this.cam.y + viewport.worldH;
    camera.updateProjectionMatrix();
  }

  candidates() {
    // Los objetos apoyados ganan sobre el mueble que los sostiene: apuntar a
    // la mesa agarra el mate, no "mirar la mesa". Con un mate cebado en la
    // mano, primero los NPC (para convidar).
    const held = this.game.inventory[this.game.selectedSlot];
    const sharing = Boolean(held && held.id === 'mate_cebado');
    const installingExtractor = Boolean(held && held.id === 'secador');
    const fuellingGenerator = Boolean(held && held.id === 'nafta');
    const list = sharing ? [] : this.surface.candidates.slice();
    if (sharing) {
      for (const npc of this.npcs) {
        if (npc.hidden) continue;
        list.push({
          id: npc.id,
          kind: 'npc',
          priority: 1,
          x: npc.x,
          y: npc.feet + 26,
          w: 20,
          h: 52,
          label: `Convidar mate a ${NPC_NAMES[npc.who] || npc.who}`,
          cursorBox: { x: npc.x - 8, y: npc.feet - 32, w: 16, h: 32 },
          npc,
        });
      }
    }
    for (const c of this.world.candidates) {
      if (c.ref && c.ref.hidden) continue;
      // Mueble con algo agarrable encima: apuntarle agarra ese objeto.
      if (c.kind === 'object' && !sharing && c.id !== this.game.pavaStation && !(c.ref && c.ref.station)) {
        // Solo si es lo unico agarrable del mueble (estantes altos); en mesas
        // con varias cosas se apunta a cada objeto por separado.
        const grabs = this.surface.candidates.filter((s) => s.objectId === c.id && s.grabbable);
        if (grabs.length === 1) {
          list.push({ ...grabs[0], x: c.x, y: c.y, w: c.w, h: c.h, priority: 1 });
          continue;
        }
      }
      // Con la pava sobre el calentador, ese mueble gana a los objetos
      // apoyados: A saca la pava en vez de mirar la tijera del banco.
      const heat = c.kind === 'object' && c.id === this.game.pavaStation;
      // Si traes el secador o la nafta, el extractor/electrógeno le ganan a la
      // puerta que tienen al lado: usar el ítem es la acción esperada.
      const stationUse = c.kind === 'object' && (
        (installingExtractor && c.ref && c.ref.station === 'extractor')
        || (fuellingGenerator && c.id === 'generator')
      );
      // La ventana de Martita, mientras corre el objetivo, le gana al NPC que
      // está al lado: cerrarla es lo urgente (con mouse igual se apunta bien).
      const windowGoal = c.kind === 'object' && c.id === 'window_martita'
        && this.game.flags?.martita_sprint && !this.game.flags?.closed_window_martita;
      list.push(heat
        ? { ...c, priority: 3 }
        : stationUse || windowGoal ? { ...c, priority: 2 } : c);
    }
    for (const npc of this.npcs) {
      if (npc.hidden || sharing) continue;
      list.push({
        id: npc.id,
        kind: 'npc',
        priority: 1,
        x: npc.x,
        y: npc.feet + 26,
        w: 20,
        h: 52,
        label: `Hablar con ${NPC_NAMES[npc.who] || npc.who}`,
        cursorBox: { x: npc.x - 8, y: npc.feet - 32, w: 16, h: 32 },
        npc,
      });
    }
    // Puertas, escaleras y salidas: hover/click como cualquier objeto. El
    // warp automatico al pisarlas sigue igual; esto agrega la caja y el click.
    for (const warp of this.mapData.warps || []) {
      list.push({
        id: `warp_${warp.id || 'x'}`,
        kind: 'warp',
        priority: 0,
        x: warp.x + warp.w / 2,
        y: warp.y + warp.h,
        w: warp.w,
        h: warp.h,
        cursorBox: { x: warp.x, y: warp.y, w: warp.w, h: warp.h },
        label: warpLabel(warp),
        warp,
      });
    }
    for (const pickup of this.pickups) {
      if (pickup.taken) continue;
      const c = pickup.candidate;
      c.label = `Levantar ${getItem(pickup.itemId).name}`;
      c.cursorBox = { x: pickup.x - 8, y: pickup.y - 20, w: 16, h: 20 };
      list.push(c);
    }
    return list;
  }

  update(dt, input) {
    this.t += dt;
    this.hud.update(dt);
    this.surface.update(dt, this.player);
    this.snow?.update(dt);
    this.updatePava(dt);
    this.light.setMode(this.game.lightingMode);
    this.light.update(dt);
    this.updateTimedBar(dt);

    if (this.comic.open) {
      // Con un overlay abierto el cursor vuelve a la flecha (T11).
      this.game.mouseCursor?.setState('arrow');
      this.comic.update(dt, input);
      if (!this.comic.open) this.comicUi.mesh.visible = false;
      this.drawHud(input, { prompt: null, showHotbar: false, hintActions: null });
      return;
    }
    if (this.caption.open) {
      this.game.mouseCursor?.setState('arrow');
      const result = this.caption.update(dt, input);
      if (result === 'closed') {
        this.captionUi.mesh.visible = false;
        this.game.emit('captionEnd', {});
        if (this.captionResolve) {
          const resolve = this.captionResolve;
          this.captionResolve = null;
          resolve();
        }
      }
      this.drawHud(input, { prompt: null, showHotbar: false, hintActions: null });
      return;
    }
    if (this.balloon.open) {
      // Un globo abierto consume el input del cuadro (como caption/dialogo):
      // el click que lo cierra no debe ejecutar ademas la interaccion del mundo.
      this.balloon.update(dt, input);
      if (!this.balloon.open) this.balloonUi = null;
      this.cursor.hide();
      this.game.mouseCursor?.setState('arrow');
      this.drawHud(input, { prompt: null, showHotbar: false, hintActions: null });
      return;
    }

    if (this.dialog.open) {
      this.cursor.hide();
      const point = this.pointerView(input);
      const result = this.dialog.update(dt, input, input.device, point);
      if (result === 'closed') {
        this.game.emit('dialogEnd', { id: this.dialogId || null });
        this.dialogId = null;
      }
      if (this.dialog.open && input.device === 'mouse' && point) {
        const over = pointInRect(point, this.dialog.boxRect(), 2)
          || pointInRect(point, this.dialog.closeRect(input.device), 3);
        this.game.mouseCursor?.setState(over ? 'hand' : 'arrow');
      }
      this.drawHud(input, { prompt: null, showHotbar: false, hintActions: null });
      return;
    }
    if (this.choice.open) {
      this.cursor.hide();
      const point = this.pointerView(input);
      this.choice.update(dt, input, input.device, point);
      if (this.choice.open && input.device === 'mouse' && point) {
        const over = this.choice.hitOption(point) >= 0
          || pointInRect(point, this.choice.backRect(input.device), 3)
          || pointInRect(point, this.choice.pickRect(input.device), 3);
        this.game.mouseCursor?.setState(over ? 'hand' : 'arrow');
      }
      this.drawHud(input, { prompt: null, showHotbar: false, hintActions: null });
      return;
    }

    this.handleHotbar(input);

    // Movimiento + camara suave (sin aceleracion rara: velocidad constante).
    this.player.update(dt, input.move, this.world, this.mapData.bounds);
    if (this.footprints) this.footprints.update(dt, this.player, true);
    this.followCamera(dt);
    this.snow?.setCamera(this.cam.x, this.cam.y);
    this.light.setCamera(this.cam.x, this.cam.y);

    for (const npc of this.npcs) {
      if (npc.hidden) continue;
      const near = Math.hypot(npc.x - this.player.x, npc.feet - this.player.feet) < 56;
      npc.update(dt, this.player, near);
    }

    for (const pickup of this.pickups) {
      pickup.update(dt, this.player);
      if (pickup.takeNow) this.collect(pickup);
    }

    // Puertas / escaleras.
    this.exitWarp = warpAt(this.player.x, this.player.feet, this.mapData.warps);
    if (this.exitWarp) {
      if (this.canWarp(this.exitWarp)) {
        this.warpNow(this.exitWarp);
        return;
      }
      // Pisar un warp bloqueado avisa que falta (una vez por aproximacion).
      this.warpBlockedFeedback(this.exitWarp);
    } else {
      this.warpWarnId = null;
    }

    // Apuntado: tile de accion (teclado/joystick) o hover del mouse.
    const candidates = this.candidates();
    const found = pickTarget(
      { x: this.player.x, feet: this.player.feet, dir: this.player.dir },
      candidates,
      { dir: this.player.dir, reach: 22 },
    );
    this.target = found.target;
    this.targetVia = found.via;
    this.updateMouseTarget(input, candidates);

    this.updateCursor(input);

    // Barra de pistas del mouse (T7): leyenda fija; solo "Mochila" es clickeable.
    let hint = null;
    let clickPoint = null;
    if (input.device === 'mouse') {
      clickPoint = this.pointerView(input);
      if (clickPoint) {
        const layout = this.hud.hintLayout(
          input.device, this.hudParams(input).hintActions || [],
        );
        hint = layout.boxes.find(
          (b) => !b.static && pointInRect(clickPoint, b.rect),
        ) || null;
        if (hint) this.game.mouseCursor?.setState('hand');
      }
    }

    if (input.rightClick && input.device === 'mouse') {
      // Click derecho = Mirar (sin alcance: se puede mirar de lejos).
      this.handleRightClick();
      this.drawHud(input, this.hudParams(input));
      return;
    }
    if (input.yPressed) {
      this.cursor.hide();
      this.game.openMenu(0);
      return;
    }
    if (input.xPressed) {
      this.useSelected(input);
      this.drawHud(input, this.hudParams(input));
      return;
    }
    if (input.click && input.device === 'mouse') {
      // Hotbar: el click selecciona el slot y no pasa al mundo.
      const hotbar = hotbarLayout();
      if (pointInRect(clickPoint, hotbar.panel)) {
        const slot = hitIndex(clickPoint, hotbar.slots);
        if (slot >= 0 && slot === this.game.selectedSlot && this.game.inventory[slot]) {
          // Click en el item que ya tenes en la mano = usarlo (como la F).
          this.target = null;
          this.useSelected();
        } else if (slot >= 0) {
          this.game.selectedSlot = slot;
        }
        this.drawHud(input, this.hudParams(input));
        return;
      }
      if (hint && hint.action === 'bag') {
        this.cursor.hide();
        this.game.openMenu(0);
        return;
      }
      this.handleMouseClick();
      this.drawHud(input, this.hudParams(input));
      return;
    }
    if (input.aPressed) {
      this.interact(input);
      this.drawHud(input, this.hudParams(input));
      return;
    }

    this.drawHud(input, this.hudParams(input));
  }

  /** Estados del mundo que dependen de banderas (§3, §6.3). */
  applyStoryState() {
    const flags = this.game.flags || {};
    for (const obj of this.mapData.objects) {
      let hidden = false;
      if (obj.showIfFlag) hidden = !flags[obj.showIfFlag];
      if (obj.hideIfFlag) hidden = hidden || Boolean(flags[obj.hideIfFlag]);
      if (obj.showWhenClosed) hidden = Boolean(flags[`closed_${obj.id}`]);
      obj.hidden = hidden;
      if (obj.mesh) obj.mesh.visible = !hidden;
    }
    const polskyLeft = Boolean(flags.polskyLeft || flags.polsky_muerto);
    for (const npc of this.npcs) {
      npc.hidden = (this.name === 'attic' && npc.id === 'polsky' && polskyLeft)
        || Boolean(flags[`npc_gone_${npc.id}`]);
      npc.mesh.visible = !npc.hidden;
      npc.shadow.visible = !npc.hidden;
      if (npc.hidden) npc.bubble.mesh.visible = false;
    }
    this.applyModeVisuals();
    // faroles y ventanas electricas apagadas en el apagon
    for (const light of this.mapData.lights || []) {
      if (light.kind === 'electric' && flags.apagon) light.state = 'off';
      else if (light.kind === 'electric' && light.onlyIn === 'electrica' && !flags.apagon) {
        light.state = 'on';
      }
    }
    this.surface.sync();
  }

  applyModeVisuals() {
    const flags = this.game.flags || {};
    this.world.setDark(Boolean(flags.apagon));
  }

  setLightState(id, on) {
    const light = (this.mapData.lights || []).find((l) => l.id === id);
    if (light) light.state = on ? 'on' : 'off';
    if (id === 'bulb') {
      const obj = this.mapData.objects.find((o) => o.id === 'bulb');
      if (obj && obj.mesh) obj.mesh.visible = Boolean(on);
    }
  }

  canWarp(warp) {
    if (!warp) return false;
    if (warp.needsSuit && !this.game.hasSuit) return false;
    if (warp.needsFlag && !this.game.flags[warp.needsFlag]) return false;
    return true;
  }

  /**
   * Aviso al pisar un warp bloqueado (sin spam): una vez por aproximacion.
   * Al salir del rect se limpia y volver a pisarlo vuelve a avisar.
   */
  warpBlockedFeedback(warp) {
    if (!warp || this.canWarp(warp)) {
      this.warpWarnId = null;
      return false;
    }
    const id = warp.id || 'warp';
    if (this.warpWarnId === id) return false;
    this.warpWarnId = id;
    this.game.showToast(this.exitBlocker());
    return true;
  }

  updatePava(dt) {
    const game = this.game;
    if (game.pava && game.pava.heating) {
      const before = game.pava.temp;
      heat(game.pava, dt);
      if (before < 95 && game.pava.temp >= 95 && !this.silbatoAvisado) {
        this.silbatoAvisado = true;
        this.game.showToast('¡Silba la pava!');
        this.game.emit('pavaBoiled', {});
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

  updateTimedBar(dt) {
    if (!this.timedBar) return;
    this.timedBar.left -= dt;
    this.game.emit('timer', { id: this.timedBar.id, left: this.timedBar.left });
    if (this.timedBar.left <= 0) {
      const bar = this.timedBar;
      this.timedBar = null;
      this.game.emit('timerEnd', { id: bar.id });
    }
  }

  startTimedBar(id, seconds, label) {
    this.timedBar = { id, left: seconds, total: seconds, label };
  }

  playComic(spec) {
    return new Promise((resolve) => {
      const onDone = spec.onDone;
      this.comic.play({
        ...spec,
        onDone: () => {
          if (onDone) onDone();
          resolve();
        },
      });
      this.comicUi.mesh.visible = true;
    });
  }

  playCaption(text, opts = {}) {
    return new Promise((resolve) => {
      this.caption.show(text, opts);
      this.captionUi.mesh.visible = true;
      this.caption.onClose = () => resolve();
      this.captionResolve = resolve;
    });
  }

  /** Línea corta en globo de historieta sobre la cabeza de un personaje. */
  sayBalloon(entry) {
    const target = entry.npc || this.npcs.find((n) => n.id === entry.id);
    const head = target
      ? { x: target.x, y: target.feet - 34 }
      : { x: this.player.x, y: this.player.feet - 34 };
    this.balloon.show(entry.text, head, { w: entry.w });
  }

  followCamera(dt) {
    const want = this.world.cameraFor(this.player.x, this.player.feet - 18);
    const k = Math.min(1, dt * 9);
    this.cam.x += (want.x - this.cam.x) * k;
    this.cam.y += (want.y - this.cam.y) * k;
    if (Math.abs(want.x - this.cam.x) < 0.3) this.cam.x = want.x;
    if (Math.abs(want.y - this.cam.y) < 0.3) this.cam.y = want.y;
    // Pixel-perfect: la cámara se redondea a 1/worldPx (no a px entero).
    this.cam.x = snapCamera(this.cam.x);
    this.cam.y = snapCamera(this.cam.y);
  }

  handleHotbar(input) {
    const game = this.game;
    if (input.prevHotbar) game.selectedSlot = (game.selectedSlot + 7) % 8;
    if (input.nextHotbar) game.selectedSlot = (game.selectedSlot + 1) % 8;
    if (input.slotPressed >= 0) game.selectedSlot = input.slotPressed;
    if (input.wheel) {
      game.selectedSlot = (game.selectedSlot + (input.wheel > 0 ? 1 : 7)) % 8;
    }
  }

  /** Puntero en coordenadas de la vista (480x270), solo con mouse. */
  pointerView(input) {
    if (input && input.click) {
      return this.game.screenToView(input.click.x, input.click.y);
    }
    return mousePoint(this.game, input);
  }

  /**
   * Hover del mouse: elige el objeto bajo el puntero, cambia el cursor y
   * muestra el cuadrado de preseleccion (dorado cerca, ambar lejos).
   * El unico recorte son los rects REALES del HUD (hotbar y barra de pistas),
   * no una franja fija: el mundo pegado al borde inferior se puede clickear.
   */
  updateMouseTarget(input, candidates) {
    this.hoverTarget = null;
    this.hoverNear = false;
    let state = 'arrow';
    if (input.device === 'mouse') {
      // Con el mouse manda el puntero, no la direccion de la mirada.
      this.target = null;
      this.targetVia = null;
      const client = input.click || input.pointer;
      const point = client
        ? this.game.screenToWorld(client.x, client.y)
        : null;
      const view = this.pointerView(input);
      if (point && !hudBlocksPoint(view, this.hintRects)) {
        const hit = pickAt(
          { x: this.player.x, feet: this.player.feet, dir: this.player.dir },
          candidates, point, { dir: this.player.dir, reach: 28 },
        );
        if (hit.target) {
          this.setHover(hit.target, hit.near);
          state = hit.near ? 'hand' : 'far';
        } else {
          this.cursor.hide();
        }
      } else {
        this.cursor.hide();
      }
    }
    this.game.mouseCursor?.setState(state);
  }

  /** Aplica el objetivo hovereado al cursor y al tile de accion. */
  setHover(target, near) {
    this.hoverTarget = target;
    this.hoverNear = near;
    this.target = target;
    this.targetVia = 'mouse';
    const box = target.cursorBox || boxOf(target);
    this.cursor.showAt(box, this.t, {
      mode: near ? 'near' : 'far',
      grab: isGrabbable(target),
    });
    this.cursor.setPosition(box.x + box.w / 2, box.y + box.h / 2);
  }

  /** Click derecho sobre el objeto hovereado: lo mira, sin requisito de alcance. */
  handleRightClick() {
    const target = this.hoverTarget;
    if (!target) return;
    this.faceTarget(target);
    this.runAction(
      resolveAction(this.ctx(), target, this.heldId(), 'look'), target,
    );
  }

  /** Texto de "mirar" del objetivo (el mismo que la interacción look). */
  lookAt(target) {
    if (!target) return;
    if (target.kind === 'surfaceItem') {
      this.game.showToast(this.surface.describe(target.itemId, this.game.flags));
      return;
    }
    if (target.kind === 'object') {
      const obj = target.ref || target;
      const line = lookLine(target.id, this.game.flags)
        || lookLine(obj.id, this.game.flags)
        || obj.description
        || 'No hay nada que ver acá.';
      this.game.showToast(line);
      return;
    }
    if (target.kind === 'warp' && target.warp && target.warp.look) {
      this.game.showToast(target.warp.look);
      return;
    }
    if (target.label) this.game.showToast(target.label);
  }

  // ------------------------------------------------------------- acciones

  /** Contexto del resolvedor (ver src/actions.js): sin `this` adentro. */
  ctx() {
    return { game: this.game, objects: this.mapData?.objects || [] };
  }

  /** Id del ítem en la mano, o null. */
  heldId() {
    const slot = this.game?.inventory?.[this.game.selectedSlot];
    return slot?.id || null;
  }

  /**
   * Ejecuta la acción que devolvió resolveAction(). Único lugar del mundo
   * donde se decide "qué pasa": los efectos de abajo conservan su lógica.
   */
  runAction(action, target) {
    if (!action) return;
    // Fuera de alcance: Juan mira el objeto y avisa (como mucho una vez por
    // segundo, para no repetir el toast).
    if (action.needsNear && this.hoverTarget && !this.hoverNear) {
      if (target) this.faceTarget(target);
      const now = this.t || 0;
      if (this.nearWarnAt == null || now - this.nearWarnAt >= 1) {
        this.nearWarnAt = now;
        this.game.showToast('Acercate un poco.');
      }
      return;
    }
    const obj = action.payload?.object;
    switch (action.kind) {
      case 'warp':
        this.tryWarp(action.payload?.warp || (target && target.warp));
        break;
      case 'talk':
        this.talkTo(target.npc);
        break;
      case 'open':
        this.game.openChest(target.container);
        this.cursor.hide();
        this.game.emit('interact', { id: target.id, kind: 'container' });
        break;
      case 'take':
        if (target.kind === 'pickup') target.pickup.take();
        else if (target.kind === 'surfaceItem') this.takeSurfaceItem(target);
        break;
      case 'ammo':
        this.game.showToast('Las balas se compran en la arena.');
        this.game.emit('interact', { id: target.id, kind: 'ammo', obj });
        break;
      case 'view':
        this.game.emit('interact', { id: target.id, kind: 'window', obj });
        this.game.openView(obj.window.view, this.name, null, () => {
          this.game.changeScene(this.name, null);
          this.game.emit('viewEnd', { id: target.id });
        });
        break;
      case 'closeWindow':
        this.game.emit('interact', { id: obj.id, kind: 'window', obj });
        this.closeWindow(obj);
        break;
      case 'takePava':
        this.takePava();
        break;
      case 'drop':
        this.dropSelectedOn(obj);
        this.game.emit('interact', { id: target.id, kind: 'surface', obj });
        break;
      case 'use':
        this.runItemUse(action, target);
        break;
      case 'self':
        this.runSelfUse(action);
        break;
      case 'look':
        // Click derecho: solo describe. Click/E: como interact() de siempre
        // (diálogo propio del objeto si lo tiene, si no la línea de "mirar").
        if (action.payload?.via === 'look') this.lookAt(target);
        else this.lookObject(target);
        break;
      case 'none':
        if (action.label) this.game.showToast(action.label);
        break;
      default:
        break;
    }
  }

  /** Efecto de un uso del ítem en la mano sobre el objetivo. */
  runItemUse(action, target) {
    const obj = action.payload?.object || (target && (target.ref || target));
    const itemId = action.payload?.itemId || this.heldId();
    switch (action.id) {
      case 'heatPava': this.heatPava(obj, itemId); break;
      case 'installExtractor': this.installExtractor(obj); break;
      case 'fuelGenerator': this.fuelGenerator(obj); break;
      case 'sealWindow': this.sealWindow(obj); break;
      case 'shareMate': this.shareMate(target.npc); break;
      case 'dumpMate': this.useMate('mate_lavado', target); break;
      default: break;
    }
  }

  /** Efecto de un uso del ítem en la mano sobre uno mismo. */
  runSelfUse(action) {
    const itemId = action.payload?.itemId || this.heldId();
    switch (action.id) {
      case 'equipSuit':
        this.game.requestEquip();
        break;
      case 'toggleRifle':
        this.game.hasRifle = !this.game.hasRifle;
        this.player.setRifle(this.game.hasSuit && this.game.hasRifle);
        this.game.showToast(this.game.hasRifle ? 'Rifle listo.' : 'Guardaste el rifle.');
        break;
      case 'mateSelf':
        this.useMate(itemId);
        break;
      case 'pavaSelf':
        this.usePava(itemId);
        break;
      case 'yerbaSelf':
        this.useMate('yerba');
        break;
      case 'describe': {
        const item = getItem(itemId);
        this.game.showToast(`${item.name}: ${item.description}`);
        break;
      }
      default: break;
    }
  }

  /** Click izquierdo = acción principal, igual que E/A (sin warp bajo los pies). */
  handleMouseClick() {
    const target = this.hoverTarget;
    if (target) this.faceTarget(target);
    this.runAction(resolveAction(this.ctx(), target, this.heldId(), 'primary'), target);
  }

  /**
   * "Mirar" del click/E sobre un objeto: su diálogo propio si tiene uno (como
   * hacía interact()) y, si no, la línea de siempre.
   */
  lookObject(target) {
    if (!target) return;
    if (target.kind !== 'object') {
      this.lookAt(target);
      return;
    }
    const obj = target.ref || target;
    if (obj.window) this.game.emit('interact', { id: target.id, kind: 'window', obj });
    const entry = talkEntry(obj.interact?.talk, this.game);
    if (entry) this.openDialog(entry, target.id);
    else this.lookAt(target);
    this.game.emit('interact', { id: target.id, kind: 'object', obj });
  }

  faceTarget(target) {
    const b = target.cursorBox || boxOf(target);
    const dx = b.x + b.w / 2 - this.player.x;
    const dy = b.y + b.h / 2 - this.player.feet;
    const dir = Math.abs(dx) > Math.abs(dy)
      ? (dx < 0 ? 'left' : 'right')
      : (dy < 0 ? 'up' : 'down');
    this.player.dir = dir;
    this.player.sprite.setDir(dir);
  }

  updateCursor(input) {
    // Con mouse el cuadrado ya lo maneja updateMouseTarget.
    if (input.device === 'mouse') return;
    const box = this.target
      ? (this.target.cursorBox || boxOf(this.target))
      : actionBox(this.player, this.player.dir);
    this.cursor.showAt(box, this.t);
    this.cursor.setPosition(box.x + box.w / 2, box.y + box.h / 2);
  }

  /**
   * Única fuente de la etiqueta de acción (prompt con mouse, barra y click).
   * Sale del mismo resolvedor que ejecuta la acción, así no pueden divergir.
   */
  actionLabel(target) {
    return resolveAction(this.ctx(), target, this.heldId(), 'primary')?.label ?? null;
  }

  /**
   * Obstáculos que la etiqueta flotante no puede tapar (B1): Juan, el cursor
   * (con mouse), la hotbar y la barra de pistas.
   */
  labelObstacles(input = null) {
    const obstacles = [];
    const player = this.playerViewBox();
    if (player) obstacles.push(player);
    const device = input?.device || this.game.input?.device || 'keyboard';
    if (device === 'mouse') {
      const point = this.pointerView(input);
      if (point) obstacles.push({ x: point.x - 2, y: point.y - 2, w: 14, h: 16 });
    }
    obstacles.push(hotbarLayout().panel);
    for (const rect of this.hintRects || []) obstacles.push(rect);
    return obstacles;
  }

  hudParams(input = null) {
    const target = this.target;
    const device = input?.device || this.game.input?.device || 'keyboard';
    const obstacles = this.labelObstacles(input);
    let prompt = null;
    const warp = this.exitWarp
      || (target && target.kind === 'warp' ? target.warp : null);
    // Si el puntero/objetivo es un objeto (p. ej. el extractor), su prompt
    // manda sobre el "Salir sin traje" del warp bloqueado bajo los pies.
    const overObject = Boolean(target && target.kind !== 'warp');
    const warpBlocked = !overObject && warp
      && ((warp.needsSuit && !this.game.hasSuit)
        || (warp.needsFlag && !this.game.flags[warp.needsFlag]));
    if (warpBlocked) {
      const b = boxOfWarp(warp);
      const needSuit = warp.needsSuit && !this.game.hasSuit;
      const far = Boolean(this.hoverTarget && !this.hoverNear);
      const p = this.worldToView(b.x + b.w / 2, b.y);
      prompt = {
        action: 'interact',
        anchor: 'above',
        label: needSuit ? 'Salir sin traje' : this.exitBlocker(),
        x: p.x, y: p.y,
        frameH: b.h * viewport.zoom,
        obstacles,
        color: far ? '#ffb07a' : '#ff9a8a',
        alpha: far ? 0.75 : 1,
      };
    } else if (target) {
      const far = Boolean(this.hoverTarget && !this.hoverNear);
      const b = target.cursorBox || boxOf(target);
      // Etiqueta centrada arriba del marco del objeto, en coordenadas de vista.
      const p = this.worldToView(b.x + b.w / 2, b.y);
      prompt = {
        action: 'interact',
        anchor: 'above',
        label: this.actionLabel(target),
        color: far ? '#ffb07a' : '#fff0c0',
        alpha: far ? 0.75 : 1,
        x: p.x,
        y: p.y,
        frameH: b.h * viewport.zoom,
        obstacles,
      };
    }
    const hints = [];
    if (device === 'mouse') {
      // Leyenda fija (T7): no cambia con el hover. Solo "Mochila" se clickea.
      hints.push({ action: 'interact', label: this.useLabel(), static: true });
      hints.push({ action: 'look', label: 'Mirar', static: true });
      hints.push({ action: 'bag', label: 'Mochila' });
    } else {
      if (target) hints.push({ action: 'interact', label: this.actionLabel(target) });
      hints.push({ action: 'use', label: this.useLabel() });
      hints.push({ action: 'bag', label: 'Mochila' });
    }
    return { prompt, hintActions: hints, showHotbar: true };
  }

  /** Texto corto de lo que falta para poder abrir el porton del garaje. */
  exitBlocker() {
    const f = this.game.flags || {};
    if (!f.electrogeno_on) return 'Falta cargar nafta.';
    if (!f.extractor_ok) return 'Falta instalar el extractor.';
    if (!f.traje_fabricado) return 'Falta fabricar el traje.';
    if (!f.esclusa_lista) return 'Falta preparar la esclusa.';
    if (!f.dados) return 'Faltan los dados: andá al living.';
    if (!this.game.hasSuit) return 'Ponete el traje.';
    if (!this.game.hasRifle) return 'Equipá el rifle.';
    return 'Todavía no está todo listo.';
  }

  /** Etiqueta del ítem en la mano (leyenda del mouse y barra de teclado). */
  useLabel() {
    const held = this.heldId();
    if (!held) return 'Usar';
    return resolveAction(this.ctx(), null, held, 'item')?.label || 'Usar';
  }

  drawHud(input, params) {
    // Con el cofre abierto el HUD de mundo queda oculto de verdad: el
    // drawHud del mismo click volvia a mostrarlo detras del panel.
    if (this.game && this.game.chestOpen) return;
    const objective = this.game.objective();

    // Pase de luz: debajo del HUD, para que la interfaz nunca se oscurezca.
    // En el apagón de altillo/casa/calle la luz va por post-proceso (main.js):
    // acá no se dibuja ningún velo para no oscurecer dos veces.
    const post = this.game.lightingMode === 'apagon' && APAGON_MAPS.has(this.name);
    this.ensureLightUi();
    this.lightUi.mesh.visible = !post;
    if (!post) {
      this.light.setMode(this.game.lightingMode);
      this.light.setCamera(this.cam.x, this.cam.y);
      const lw = this.lightUi.canvas.width;
      const lh = this.lightUi.canvas.height;
      this.lightUi.mesh.position.set(this.cam.x + lw / 2, this.cam.y + lh / 2, 20);
      this.lightUi.clear();
      this.light.draw(this.lightUi.ctx, this.t, { ...this.player, mateCalma: this.game.mateCalma > 0 });
      this.lightUi.commit();
    }
    this.drawApagonFx();

    this.hud.draw({
      device: input.device,
      objective,
      hasSuit: this.game.hasSuit,
      prompt: params.prompt ?? null,
      showHotbar: params.showHotbar !== false,
      hintActions: params.hintActions ?? null,
      hidden: this.comic.open,
    });
    // Rects reales del HUD para la oclusion del hover/click del proximo cuadro.
    if (params.showHotbar !== false && params.hintActions && params.hintActions.length) {
      const layout = this.hud.hintLayout(input.device, params.hintActions);
      this.hintRects = layout.boxes.map((b) => b.rect);
    } else {
      this.hintRects = [];
    }

    // Capa extra: termómetro de la pava, barra de tiempo y globos.
    this.extra.clear();
    const ex = this.extra.ctx;
    if (this.game.pava && this.game.pava.heating) {
      drawThermometer(ex, VIEW_W - 24, 92, this.game.pava.temp);
      drawText(ex, this.game.assets.font.glyphs, VIEW_W - 52, 126, 'pava', '#fff0c0',
        { outline: '#1a1426' });
    }
    this.drawTimedBar(ex);
    if (this.balloon.open) this.balloon.draw(ex, this.cam.x, this.cam.y, viewport.zoom);
    this.extra.commit();

    if (this.comic.open) {
      this.comicUi.clear();
      this.comic.draw(this.comicUi.ctx, input.device);
      this.comicUi.commit();
    }
    if (this.caption.open) {
      this.captionUi.clear();
      this.caption.draw(this.captionUi.ctx);
      this.captionUi.commit();
    }
    if (this.dialog.open) {
      this.dialog.draw(this.hud.ui.ctx, VIEW_W, VIEW_H, input.device);
      this.hud.ui.commit();
    }
    if (this.choice.open) {
      this.choice.draw(this.hud.ui.ctx, VIEW_W, VIEW_H, input.device);
      this.hud.ui.commit();
    }
  }

  drawTimedBar(ctx) {
    if (!this.timedBar) return;
    const bar = this.timedBar;
    const w = 168;
    const x = Math.round((VIEW_W - w) / 2);
    const y = 30;
    ctx.fillStyle = 'rgba(10, 10, 20, 0.82)';
    ctx.fillRect(x - 3, y - 3, w + 6, 17);
    ctx.fillStyle = '#1a1426';
    ctx.fillRect(x, y, w, 10);
    const left = Math.max(0, bar.left / bar.total);
    ctx.fillStyle = left > 0.35 ? '#e8963a' : '#c04038';
    ctx.fillRect(x + 1, y + 1, Math.round((w - 2) * left), 8);
    ctx.fillStyle = '#ffcf6e';
    ctx.fillRect(x, y, w, 1);
    const font = this.game.assets.font.glyphs;
    const label = bar.label || '¡Apurate!';
    const tw = measureText(font, label);
    drawText(ctx, font, Math.round((VIEW_W - tw) / 2), y + 14, label, '#fff0c0',
      { outline: '#1a1426' });
  }

  collect(pickup) {
    pickup.takeNow = false;
    const result = addItem(this.game.inventory, pickup.itemId, pickup.count);
    if (result.added <= 0) {
      this.game.showToast('No hay lugar en la mochila.');
      return;
    }
    this.game.inventory = result.slots;
    const item = getItem(pickup.itemId);
    const extra = result.added > 1 ? ` x${result.added}` : '';
    this.game.showToast(`+${result.added} ${item.name}${extra}`, { group: 'pickup' });
    this.game.onInventoryChanged();
  }

  openDialog(entry, id = null) {
    if (!entry) return;
    this.dialogId = id;
    this.dialog.show(entry);
    this.cursor.hide();
  }

  talkTo(npc) {
    const entry = talkEntry(npc.id, this.game);
    npc.lookAt(this.player);
    const wrapped = entry || {
      speaker: NPC_NAMES[npc.who] || npc.who,
      portrait: npc.who,
      lines: ['No hay mucho para decir ahora.'],
    };
    wrapped.onClose = () => {
      npc.resetPose();
      npc.markSeen();
    };
    this.openDialog(wrapped, npc.id);
    this.game.emit('interact', { id: npc.id, kind: 'npc' });
  }

  /**
   * E/A: la acción principal del objetivo apuntado. Un objeto apuntado gana
   * sobre el warp que el jugador tiene bajo los pies; si no hay objeto (o el
   * objetivo es el propio warp), manda el warp de los pies.
   */
  interact() {
    const target = this.target;
    const targetIsObject = Boolean(target && target.kind !== 'warp');
    if (this.exitWarp && !targetIsObject) {
      this.tryWarp(this.exitWarp);
      return;
    }
    this.runAction(resolveAction(this.ctx(), target, this.heldId(), 'primary'), target);
  }

  closeWindow(obj) {
    const key = `closed_${obj.id}`;
    if (this.game.flags[key]) {
      this.game.showToast('La ventana ya está cerrada.');
      return;
    }
    this.game.flags[key] = true;
    // La nieve que había entrado (snow_drift) se va con la ventana cerrada.
    this.applyStoryState();
    this.game.showToast('Ventana cerrada.');
    this.game.emit('interact', { id: obj.id, kind: 'windowClosed', obj });
  }

  takeSurfaceItem(target) {
    const result = this.surface.take(target, this.game.inventory);
    if (result.count > 0) {
      this.game.inventory = result.inventory;
      const item = getItem(result.itemId);
      const extra = result.count > 1 ? ` x${result.count}` : '';
      this.game.showToast(`+${result.count} ${item.name}${extra}`, { group: 'pickup' });
      this.game.onInventoryChanged();
      this.game.emit('itemPicked', { id: result.itemId, count: result.count });
      return;
    }
    if (result.reason === 'decor') {
      this.game.showToast(this.surface.describe(result.itemId, this.game.flags));
      this.game.emit('interact', { id: target.id, kind: 'lookItem' });
      return;
    }
    if (result.reason === 'full') {
      this.game.showToast('No hay lugar en la mochila.');
      return;
    }
    this.game.showToast('No podés agarrar eso.');
  }

  dropSelectedOn(obj) {
    const result = this.surface.dropSelected(
      this.game.inventory, this.game.selectedSlot, obj.id,
    );
    if (!result) {
      this.game.showToast(NO_SPACE_MESSAGE);
      return;
    }
    this.game.inventory = result.inventory;
    this.game.showToast(`Dejaste ${getItem(result.placed.itemId).name}.`);
    this.game.emit('itemUsed', {
      id: result.placed.itemId, targetId: obj.id, action: 'drop',
    });
  }

  replaceItem(fromId, toId, count = 1) {
    const removed = removeItem(this.game.inventory, fromId, count);
    if (removed.removed <= 0) return false;
    this.game.inventory = addItem(removed.slots, toId, removed.removed).slots;
    this.game.onInventoryChanged();
    return true;
  }

  /**
   * F / X y el click sobre el ítem elegido: uso del ítem en la mano, sobre el
   * objetivo apuntado o sobre uno mismo.
   */
  useSelected() {
    const target = this.target;
    this.runAction(resolveAction(this.ctx(), target, this.heldId(), 'item'), target);
  }

  /** Poner la pava al fuego (`heatPava`). */
  heatPava(obj, itemId) {
    if (!obj) return false;
    if (itemId !== 'pava_fria' && itemId !== 'pava_caliente') return false;
    const removed = removeItem(this.game.inventory, itemId, 1);
    if (removed.removed <= 0) return false;
    this.game.inventory = removed.slots;
    this.game.pava = startHeating(this.game.pava, obj.id);
    this.game.pava.temp = 0;
    this.game.pavaStation = obj.id;
    this.silbatoAvisado = false;
    this.game.showToast('La pava en el fuego.');
    this.game.onInventoryChanged();
    return true;
  }

  /** Instalar el secador de Elena en el extractor del garaje (`installExtractor`). */
  installExtractor(obj) {
    if (!obj) return false;
    this.game.flags.extractor_ok = true;
    this.game.inventory = removeItem(this.game.inventory, 'secador', 1).slots;
    this.game.showToast('El secador quedó instalado en el extractor.');
    this.game.emit('itemUsed', { id: 'secador', targetId: obj.id, action: 'use' });
    return true;
  }

  /** Cargar nafta en el electrógeno (`fuelGenerator`). */
  fuelGenerator(obj) {
    if (!obj) return false;
    if (this.game.flags.electrogeno_on) {
      this.game.showToast('Ya está en marcha.');
      return true;
    }
    const removed = removeItem(this.game.inventory, 'nafta', 1);
    if (removed.removed <= 0) return false;
    this.game.inventory = removed.slots;
    this.game.flags.electrogeno_on = true;
    this.setLightState('bulb', true);
    for (const light of this.mapData.lights || []) {
      if (light.kind === 'bulb') light.state = 'on';
    }
    this.applyModeVisuals();
    this.game.showToast('El electrógeno arranca. La lamparita titila.');
    this.game.emit('itemUsed', { id: 'nafta', targetId: obj.id, action: 'use' });
    return true;
  }

  /** Sellar la ventana con las tiras de goma (`sealWindow`). */
  sealWindow(obj) {
    if (!obj) return false;
    if (countItem(this.game.inventory, 'tiras') <= 0) return false;
    this.game.inventory = removeItem(this.game.inventory, 'tiras', 1).slots;
    this.closeWindow(obj);
    return true;
  }

  useMate(itemId, target) {
    if (itemId === 'mate_vacio') {
      if (countItem(this.game.inventory, 'yerba') < 1) {
        this.game.showToast('Necesitás yerba. Hay un paquete en el banco, al lado de la pava.');
        return;
      }
      this.game.inventory = removeItem(this.game.inventory, 'yerba', 1).slots;
      this.game.inventory = removeItem(this.game.inventory, 'mate_vacio', 1).slots;
      this.game.inventory = addItem(this.game.inventory, 'mate_yerba', 1).slots;
      putYerba(this.game.mate);
      this.game.showToast('Le pusiste yerba al mate.');
      this.game.emit('itemUsed', { id: 'mate_vacio', targetId: 'yerba', action: 'use' });
      return;
    }
    if (itemId === 'mate_yerba') {
      const boiled = countItem(this.game.inventory, 'pava_hervida') > 0;
      const warm = boiled || countItem(this.game.inventory, 'pava_caliente') > 0;
      if (!warm) {
        this.game.showToast('Calentá el agua primero (calentador o cocina).');
        return;
      }
      cebar(this.game.mate, { hervida: boiled });
      this.game.inventory = removeItem(this.game.inventory, 'mate_yerba', 1).slots;
      this.game.inventory = addItem(this.game.inventory, 'mate_cebado', 1).slots;
      this.game.showToast(boiled ? 'Cebaste con agua hervida…' : 'Bien cebado.');
      if (!boiled) this.game.flags.mate_tutorial = true;
      this.game.emit('itemUsed', { id: 'mate_yerba', targetId: 'pava', action: 'cebar' });
      return;
    }
    if (itemId === 'mate_cebado') {
      sip(this.game.mate);
      const next = mateItemId(this.game.mate);
      this.game.inventory = removeItem(this.game.inventory, 'mate_cebado', 1).slots;
      this.game.inventory = addItem(this.game.inventory, next, 1).slots;
      this.game.mateCalma = 120;
      this.game.flags.mate_tutorial = true;
      this.game.showToast(next === 'mate_lavado'
        ? 'Está lavado. Tirá la yerba.'
        : 'Un mate en la panza. Calma.');
      this.game.emit('itemUsed', { id: 'mate_cebado', targetId: null, action: 'sip' });
      return;
    }
    if (itemId === 'mate_lavado') {
      const id = target && (target.id || '');
      if (/bucket|pileta|sink|balde/i.test(id)) {
        this.game.inventory = removeItem(this.game.inventory, 'mate_lavado', 1).slots;
        this.game.inventory = addItem(this.game.inventory, 'mate_vacio', 1).slots;
        dump(this.game.mate);
        this.game.showToast('Tiraste la yerba. El mate quedó limpio.');
        this.game.emit('itemUsed', { id: 'mate_lavado', targetId: id, action: 'dump' });
      } else {
        this.game.showToast('Tirá la yerba en la pileta o en el balde.');
      }
      return;
    }
    if (itemId === 'yerba') {
      this.game.showToast('Usá la yerba sobre el mate vacío.');
    }
  }

  usePava(itemId) {
    if (itemId === 'pava_fria') {
      this.game.showToast('Todavía está fría.');
    } else if (itemId === 'pava_caliente') {
      this.game.showToast('Está en su punto. Usala sobre el mate con yerba.');
    } else {
      this.game.showToast('Hirvió. Si cebás así, el mate sale quemado.');
    }
  }

  shareMate(npc) {
    const burnt = this.game.mate.burnt;
    share(this.game.mate);
    const next = mateItemId(this.game.mate);
    this.game.inventory = removeItem(this.game.inventory, 'mate_cebado', 1).slots;
    this.game.inventory = addItem(this.game.inventory, next, 1).slots;
    this.game.mateShared[npc.id] = true;
    const lines = {
      favalli: burnt
        ? 'Lo quemaste, Juan. Ese mate está lavado de entrada.'
        : 'Está bien cebado. Se nota la mano.',
      lucas: 'Gracias. Uno amargo me acomoda el estómago.',
      polsky: 'Como los que tomaba en la estación, de muchacho.',
    };
    npc.lookAt(this.player);
    this.openDialog({
      speaker: NPC_NAMES[npc.who] || npc.who,
      portrait: npc.who,
      lines: [lines[npc.id] || 'Gracias, Juan.'],
      onClose: () => npc.resetPose(),
    }, npc.id);
    this.game.emit('mateShared', { id: npc.id, all: ['favalli', 'lucas', 'polsky'].every((k) => this.game.mateShared[k]) });
  }

  takePava() {
    const id = pavaItemId(this.game.pava.temp);
    this.game.inventory = addItem(this.game.inventory, id, 1).slots;
    this.game.pavaCool = 90;
    this.game.pava = { ...this.game.pava, heating: false, station: null };
    this.game.pavaStation = null;
    this.silbatoAvisado = false;
    this.game.onInventoryChanged();
    this.game.showToast(id === 'pava_hervida' ? 'La pava hirvió.' : 'Agarraste la pava.');
    this.game.emit('itemUsed', { id, targetId: 'pava', action: 'take' });
  }

  openWarning() {
    this.choice.show({
      question: WARNING.question,
      options: WARNING.options,
      onPick: (value) => {
        if (value === 'Sí') this.game.changeScene('death');
      },
    });
  }

  /** Warp con las mismas reglas al pisarlo o al clickearlo. */
  tryWarp(warp) {
    if (!warp) return;
    if (warp.needsSuit && !this.game.hasSuit) {
      this.openWarning();
      return;
    }
    if (warp.needsFlag && !this.game.flags[warp.needsFlag]) {
      this.game.showToast(this.exitBlocker());
      return;
    }
    this.warpNow(warp);
  }

  warpNow(warp) {
    if (!this.canWarp(warp)) return;
    this.game.changeScene(warp.to, warp.spawn);
  }

  /** Para el menú de pausa: pausa solo si no hay dialogo/eleccion. */
  get blocksPause() {
    return this.dialog.open || this.choice.open;
  }
}

/** Objetos que se pueden levantar: muestran el destello del cursor. */
function isGrabbable(target) {
  if (!target) return false;
  return target.kind === 'surfaceItem' || target.kind === 'pickup';
}

function boxOf(target) {
  if (target.w && target.h) {
    return { x: target.x - target.w / 2, y: target.y - target.h, w: target.w, h: target.h };
  }
  return { x: target.x - 8, y: target.y - 16, w: 16, h: 16 };
}

function boxOfWarp(warp) {
  return { x: warp.x, y: warp.y, w: warp.w, h: warp.h };
}

/** Etiqueta del warp: la del mapa o una por destino. */
function warpLabel(warp) {
  if (warp && warp.label) return warp.label;
  const to = warp && warp.to;
  const id = (warp && warp.id) || '';
  if (to === 'street') return 'Salir';
  if (to === 'attic' || /stairs_up|escalera_sube/i.test(id)) return 'Subir';
  if (/stairs|escalera/i.test(id)) return 'Bajar';
  return 'Entrar';
}

export { depthFor, PLAYER_SPEED };
