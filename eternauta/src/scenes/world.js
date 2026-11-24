import * as THREE from 'three';
import { WorldMap, cloneMap } from '../mapView.js';
import { Player } from '../player.js';
import { NPC } from '../npc.js';
import { DialogBox, ChoiceBox } from '../dialog.js';
import { Hud } from '../hud.js';
import { ActionCursor } from '../cursor.js';
import { Snowfall } from '../snow.js';
import { Footprints } from '../footprints.js';
import { VIEW_W, VIEW_H, canvasOverlay, depthFor } from '../sprite.js';
import { PLAYER_SPEED } from '../movement.js';
import { SurfaceLayer, applyContainers, ensureWorldState } from '../surfaces.js';
import { INITIAL_ITEMS } from '../data/surfaces.js';
import { LightOverlay } from '../lighting.js';
import { ComicOverlay, CaptionBox, BalloonLine } from '../comic.js';
import * as actions from '../world/actions.js';
import * as camera from '../world/camera.js';
import * as carry from '../world/carry.js';
import * as ghost from '../world/ghost.js';
import * as hud from '../world/hud.js';
import * as interact from '../world/interact.js';
import * as look from '../world/look.js';
import * as pointer from '../world/pointer.js';
import * as state from '../world/state.js';
import * as update from '../world/update.js';
import { PRIORITY, OWN_VERB_TYPES } from '../world/constants.js';
import { FLAG } from '../data/flags.js';

// Re-export: API pública de siempre.
export { PRIORITY, OWN_VERB_TYPES };

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

    // Cosas de la partida (§3): game.world[mapId] = { items, moved }.
    this.worldState = ensureWorldState(game, this.name, this.mapData);
    // Objetos apoyados en muebles y cosas tiradas en el piso.
    this.surface = new SurfaceLayer(
      this.scene, game.assets, this.mapData,
      this.worldState.items, this.worldState,
    );
    this.applyWorldState();

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

    // Manos (§4, §8): puntería, silueta, cuadradito de destino y aviso.
    this.handsAim = null;
    this.handsAction = null;
    this.selfHover = false;
    this.ghost = null;
    this.ghostTex = null;
    this.ghostMask = null;
    this.ghostName = null;
    this.ghostInfo = null;
    this.handsFeedback = null;
    this.ghostCursor = new ActionCursor(this.scene);
    this.ghostCursor.hide();
    this.carryMesh = null;
    this.carryBase = 0;
    this.supportCache = new Map();
    this.supportCacheKey = null;

    this.t = 0;
    this.cam = { x: 0, y: 0 };
    this.target = null;
    this.targetVia = null;
    this.hoverTarget = null;
    this.hoverNear = false;
    // Rects (vista 480x270) que dibujo el HUD en el ultimo cuadro: los usa la
    // oclusion real (hotbar y barra de pistas).
    this.hintRects = [];
    // Entrada de la barra bajo el mouse (hoy solo "Mochila"): se resalta.
    this.hoverHint = null;
    this.exitWarp = null;
    // Ultimo warp bloqueado avisado: una vez por aproximacion, sin spam.
    this.warpWarnId = null;
    // Ultimo "Acercate un poco." (cooldown de 1 s en runAction).
    this.nearWarnAt = null;
    this.silbatoAvisado = false;
    this.givePickups();
    this.applyStoryState();
  }

  givePickups() { return state.givePickups(this); }

  applyWorldState() { return state.applyWorldState(this); }

  invalidateReach() { return state.invalidateReach(this); }

  checkSupportCached(args) { return state.checkSupportCached(this, args); }

  carryName() { return carry.carryName(this); }

  updateCarryMesh() { return carry.updateCarryMesh(this); }

  clearCarry() { return carry.clearCarry(this); }

  autoPlaceCarry() { return carry.autoPlaceCarry(this); }

  startCarry(obj) { return carry.startCarry(this, obj); }

  placeCarryAt(...args) { return carry.placeCarryAt(this, ...args); }

  supportCarry(tx, ty) { return carry.supportCarry(this, tx, ty); }

  reset() {
    this.clearHover();
    this.clearCarry();
    this.clearGhost();
    this.givePickups();
    this.dialog.hide();
    this.choice.hide();
    this.comic.close?.();
    this.caption.open = false;
    this.comicUi.mesh.visible = false;
    this.captionUi.mesh.visible = false;
    this.timedBar = null;
    this.world.resetPositions();
    this.worldState = ensureWorldState(this.game, this.name, this.mapData);
    this.surface.dispose();
    this.surface = new SurfaceLayer(
      this.scene, this.game.assets, this.mapData,
      this.worldState.items, this.worldState,
    );
    this.applyWorldState();
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
    this.applyWorldState();
    this.updateCarryMesh();
    this.t = 0;
    this.silbatoAvisado = false;
    this.warpWarnId = null;
    this.applyStoryState();
    this.game.emit('enterMap', { map: this.name, spawn: point });
  }

  clearHover() { return pointer.clearHover(this); }

  get camX() { return this.cam.x; }
  get camY() { return this.cam.y; }

  worldToView(x, y) { return camera.worldToView(this, x, y); }

  playerViewBox() { return camera.playerViewBox(this); }

  ensureLightUi() { return camera.ensureLightUi(this); }

  apagonParams() { return camera.apagonParams(this); }

  drawApagonFx() { return camera.drawApagonFx(this); }

  applyCamera(cam) { return camera.applyCamera(this, cam); }

  candidates() { return update.candidates(this); }

  update(dt, input) { return update.update(this, dt, input); }

  applyStoryState() { return state.applyStoryState(this); }

  applyModeVisuals() { return state.applyModeVisuals(this); }

  setLightState(id, on) { return state.setLightState(this, id, on); }

  canWarp(warp) { return actions.canWarp(this, warp); }

  /** ¿La casa está en modo base (después de Continuar)? */
  get inBase() { return Boolean(this.game.flags && this.game.flags[FLAG.BASE]); }

  baseExitLabel(warp) { return actions.baseExitLabel(this, warp); }

  baseActionFor(target) { return actions.baseActionFor(this, target); }

  actionFor(target) { return actions.actionFor(this, target); }

  runBaseAction(action, target) { return actions.runBaseAction(this, action, target); }

  warpBlockedFeedback(warp) { return actions.warpBlockedFeedback(this, warp); }

  updatePava(dt) { return interact.updatePava(this, dt); }

  updateTimedBar(dt) { return interact.updateTimedBar(this, dt); }

  startTimedBar(id, seconds, label) { return interact.startTimedBar(this, id, seconds, label); }

  playComic(spec) { return interact.playComic(this, spec); }

  playCaption(...args) { return interact.playCaption(this, ...args); }

  sayBalloon(entry) { return interact.sayBalloon(this, entry); }

  followCamera(dt) { return camera.followCamera(this, dt); }

  handleHotbar(input) { return pointer.handleHotbar(this, input); }

  pointerOverHud(input) { return pointer.pointerOverHud(this, input); }

  warnNear() { return camera.warnNear(this); }

  pointerWorld(input) { return pointer.pointerWorld(this, input); }

  playerWorldBox() { return pointer.playerWorldBox(this); }

  carryData() { return carry.carryData(this); }

  aimFor(input) { return pointer.aimFor(this, input); }

  handsActionFor(input) { return pointer.handsActionFor(this, input); }

  // ------------------------------------------------------------- siluetas (§8)

  ghostSpriteFor(name, itemId) { return ghost.ghostSpriteFor(this, name, itemId); }

  setGhost(name, x, base, valid) { return ghost.setGhost(this, name, x, base, valid); }

  showGhostCursor(box) { return ghost.showGhostCursor(this, box); }

  clearGhost() { return ghost.clearGhost(this); }

  updateGhost(input, aim, action) { return ghost.updateGhost(this, input, aim, action); }

  showFurnitureGhost(obj, tx, ty, valid) { return ghost.showFurnitureGhost(this, obj, tx, ty, valid); }

  pointerView(input) { return pointer.pointerView(this, input); }

  updateMouseTarget(input, candidates) { return pointer.updateMouseTarget(this, input, candidates); }

  setHover(target, near) { return pointer.setHover(this, target, near); }

  handleLook(target = this.target) { return look.handleLook(this, target); }

  lookTarget(...args) { return look.lookTarget(this, ...args); }

  lookAt(target) { return look.lookAt(this, target); }

  // ------------------------------------- línea de mirar de la primera vez
  // Un objeto con verbo propio (ropero, radio, escalera, portón) conserva su
  // línea de mirar: Juan la dice la primera vez que lo usa y no la repite
  // (DIRECCION.md, "Tipos de objeto" regla 2). Se guarda por partida en
  // `game.seenLook` y la borra `reset()` (main.js).

  lookTextFor(target) { return look.lookTextFor(this, target); }

  firstLookKey(target) { return look.firstLookKey(this, target); }

  firstUseLine(target, action) { return look.firstUseLine(this, target, action); }

  firstWarpLine(warp) { return look.firstWarpLine(this, warp); }

  // ------------------------------------------------------------- acciones

  ctx() { return actions.ctx(this); }

  heldId() { return actions.heldId(this); }

  runAction(action, target) { return actions.runAction(this, action, target); }

  runItemUse(action, target) { return actions.runItemUse(this, action, target); }

  runSelfUse(action) { return actions.runSelfUse(this, action); }

  handleMouseClick(input = null) { return pointer.handleMouseClick(this, input); }

  runHands(action, input = null) { return actions.runHands(this, action, input); }

  dropHeld(payload) { return actions.dropHeld(this, payload); }

  lookObject(target) { return look.lookObject(this, target); }

  toggleDevice(obj, dev) { return actions.toggleDevice(this, obj, dev); }

  setWindow(obj, to) { return actions.setWindow(this, obj, to); }

  faceTarget(target) { return actions.faceTarget(this, target); }

  updateCursor(input) { return hud.updateCursor(this, input); }

  actionLabel(target) { return hud.actionLabel(this, target); }

  labelObstacles(input = null) { return hud.labelObstacles(this, input); }

  hudParams(input = null) { return hud.hudParams(this, input); }

  exitBlocker() { return hud.exitBlocker(this); }

  useLabel() { return hud.useLabel(this); }

  drawHud(input, params) { return hud.drawHud(this, input, params); }

  drawHandsFeedback(ctx) { return hud.drawHandsFeedback(this, ctx); }

  drawTimedBar(ctx) { return hud.drawTimedBar(this, ctx); }

  collect(pickup) { return interact.collect(this, pickup); }

  openDialog(entry, id = null) { return interact.openDialog(this, entry, id); }

  talkTo(npc) { return interact.talkTo(this, npc); }

  interact(input = null) { return interact.interact(this, input); }

  closeWindow(obj) { return interact.closeWindow(this, obj); }

  takeSurfaceItem(target) { return interact.takeSurfaceItem(this, target); }

  replaceItem(fromId, toId, count = 1) { return interact.replaceItem(this, fromId, toId, count); }

  heatPava(obj, itemId) { return interact.heatPava(this, obj, itemId); }

  installExtractor(obj) { return interact.installExtractor(this, obj); }

  fuelGenerator(obj) { return interact.fuelGenerator(this, obj); }

  sealWindow(obj) { return interact.sealWindow(this, obj); }

  useMate(itemId, target) { return interact.useMate(this, itemId, target); }

  usePava(itemId) { return interact.usePava(this, itemId); }

  shareMate(npc) { return interact.shareMate(this, npc); }

  takePava() { return interact.takePava(this); }

  openWarning() { return interact.openWarning(this); }

  updatePendingWarp(dt) { return interact.updatePendingWarp(this, dt); }

  tryWarp(warp) { return interact.tryWarp(this, warp); }

  warpNow(warp) { return interact.warpNow(this, warp); }

  /** Para el menú de pausa: pausa solo si no hay dialogo/eleccion. */
  get blocksPause() {
    return this.dialog.open || this.choice.open;
  }
}

export { depthFor, PLAYER_SPEED };
