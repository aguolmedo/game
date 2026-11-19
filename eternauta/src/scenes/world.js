import * as THREE from 'three';
import { WorldMap, cloneMap } from '../mapView.js';
import { Player } from '../player.js';
import { NPC } from '../npc.js';
import { Pickup } from '../pickup.js';
import { DialogBox, ChoiceBox } from '../dialog.js';
import {
  Hud, hotbarLayout, hudBlocksPoint, placeGhostLabel,
} from '../hud.js';
import { ActionCursor } from '../cursor.js';
import { Snowfall } from '../snow.js';
import { Footprints } from '../footprints.js';
import {
  pickTarget, pickAt, warpAt, playerInAccess, facesFootprint, actionInsideFoot,
  actionTile,
} from '../interaction.js';
import { talkEntry, WARNING } from '../dialogs.js';
import { TALK } from '../data/script.js';
import { addItem, removeItem, countItem } from '../inventory.js';
import { getItem } from '../items.js';
import { resolveAction, resolveHands, typeOf } from '../actions.js';
import { PLAYER_SPEED } from '../movement.js';
import { playerFootTile, bumpMapVersion } from '../reach.js';
import {
  VIEW_W, VIEW_H, depthFor, canvasOverlay, iconSprite,
} from '../sprite.js';
import { viewport, snapCamera, worldToView as toView } from '../viewport.js';
import { drawText, measureText } from '../font.js';
import { mousePoint, pointInRect, hitIndex } from '../uiHit.js';
import {
  SurfaceLayer, applyContainers, itemsForMap, ensureWorldState, NO_SPACE_MESSAGE,
} from '../surfaces.js';
import { INITIAL_ITEMS } from '../data/surfaces.js';
import {
  canDropFloor, supportCheck, floorPos, surfacePlaceOf, adjacentToPlayer,
} from '../placement.js';
import { anySprite } from '../mapView.js';
import { getItem as getItemById } from '../items.js';
import { lookLine } from '../data/descriptions.js';
import { LightOverlay } from '../lighting.js';
import { darkPanel } from '../uiSkin.js';
import { buildApagon, APAGON_MAPS } from '../apagon.js';
import { ComicOverlay, CaptionBox, BalloonLine } from '../comic.js';
import {
  putYerba, cebar, sip, share, dump, mateItemId,
  startHeating, stopHeating, heat, pavaItemId, drawThermometer,
} from '../mate.js';

// Prioridad única de superpuestos: apoyado > NPC > mueble > warp.
export const PRIORITY = { warp: 0, object: 1, npc: 2, surface: 3 };

// Tipos con verbo propio: en estos, la línea de mirar se dice la primera vez
// que se usan (DIRECCION.md, "Tipos de objeto" regla 2). Las personas no:
// Hablar ya las cubre. Decorado, cosa, superficie y mueble liviano tampoco:
// su Hacer ya es Mirar.
export const OWN_VERB_TYPES = new Set([
  'container', 'device', 'passage', 'view', 'seat',
]);

// La silueta de Manos (§8) se dibuja encima del piso y de los muebles y del
// overlay de luz (z=20), pero debajo de las etiquetas (capa extra z=31 y HUD).
const GHOST_Z = 21;
// Inválida: silueta plana al 45 % teñida #f09a7a (mezcla 55 % con el fondo).
const INVALID_GHOST_COLOR = 0xf09a7a;

/**
 * Máscara blanca de un frame del atlas: mismos píxeles opacos que el sprite,
 * todo lo demás transparente. Sirve para teñir la silueta de un color plano
 * (multiplicar el color del sprite por un tinte casi no se nota en el piso).
 */
function silhouetteTexture(map) {
  const img = map.image;
  const w = Math.max(1, Math.round(map.repeat.x * img.width));
  const h = Math.max(1, Math.round(map.repeat.y * img.height));
  const sx = Math.round(map.offset.x * img.width);
  const sy = Math.round(map.offset.y * img.height);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, sx, sy, w, h, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < data.data.length; i += 4) {
    data.data[i + 3] = data.data[i + 3] >= 128 ? 255 : 0;
    data.data[i] = 255;
    data.data[i + 1] = 255;
    data.data[i + 2] = 255;
  }
  ctx.putImageData(data, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

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

  givePickups() {
    for (const pickup of this.pickups) pickup.dispose(this.scene);
    this.pickups = this.mapData.pickups.map(
      (def) => new Pickup(this.scene, this.game.assets, def),
    );
  }

  /** Aplica a la escena los muebles movidos que persisten entre mapas (§3). */
  applyWorldState() {
    const moved = this.worldState?.moved || {};
    for (const [id, pos] of Object.entries(moved)) {
      const obj = this.mapData.objects.find((o) => o.id === id);
      if (!obj || !Number.isInteger(pos?.tx) || !Number.isInteger(pos?.ty)) continue;
      obj.x = pos.tx;
      obj.y = pos.ty;
      obj.hidden = false;
      if (obj.mesh) obj.mesh.visible = true;
      obj.solid = true;
      this.world.updateObject(obj);
    }
    this.world.rebuildSolids();
    this.invalidateReach();
    this.surface.sync();
  }

  invalidateReach() {
    this.supportCache?.clear();
    this.supportCacheKey = null;
  }

  /** SupportCheck con caché por mueble + casillero + casillero de Juan (§6). */
  checkSupportCached(args) {
    const p = playerFootTile({ x: this.player.x, feet: this.player.feet });
    const key = `${args.object?.id}:${args.tx},${args.ty}:${p.tx},${p.ty}`;
    if (this.supportCache?.has(key)) return this.supportCache.get(key);
    const result = supportCheck(args);
    if (this.supportCache) this.supportCache.set(key, result);
    return result;
  }

  /** Nombre del mueble que Juan lleva en la cabeza, o null. */
  carryName() {
    const carry = this.game.carry;
    return carry && carry.mapId === this.name ? carry.object?.name || 'el mueble' : null;
  }

  /** Malla del mueble cargado sobre la cabeza de Juan (§7). */
  updateCarryMesh() {
    const carry = this.game.carry;
    if (!carry || carry.mapId !== this.name) {
      if (this.carryMesh) {
        this.scene.remove(this.carryMesh);
        this.carryMesh = null;
      }
      return;
    }
    if (!this.carryMesh && carry.object) {
      try {
        this.carryMesh = anySprite(this.game.assets, carry.object.sprite);
        this.carryMesh.material = this.carryMesh.material.clone();
        this.carryMesh.material.transparent = true;
        this.scene.add(this.carryMesh);
      } catch {
        this.carryMesh = null;
      }
    }
    if (!this.carryMesh) return;
    const h = this.carryMesh.geometry.parameters.height;
    const bob = this.player.moving ? (Math.floor(this.t * 7) % 2) : 0;
    const base = Math.round(this.player.feet - 26) + bob;
    this.carryMesh.position.set(
      Math.round(this.player.x),
      Math.round(base - h / 2),
      depthFor(this.player.feet) + 0.001,
    );
  }

  /** Suelta el mueble cargado: malla, estado y caché. */
  clearCarry() {
    if (this.carryMesh) {
      this.scene.remove(this.carryMesh);
      this.carryMesh = null;
    }
    this.game.carry = null;
    this.invalidateReach();
  }

  /**
   * La historia saca a Juan del lugar (§7): apoya el mueble en el casillero
   * válido más cercano; si no hay ninguno, vuelve a su lugar original.
   */
  autoPlaceCarry() {
    const carry = this.game.carry;
    if (!carry || carry.mapId !== this.name || !carry.object) {
      this.clearCarry();
      return false;
    }
    const obj = carry.object;
    const p = playerFootTile({ x: this.player.x, feet: this.player.feet });
    const tiles = [];
    for (let ty = 0; ty < this.mapData.rows; ty++) {
      for (let tx = 0; tx < this.mapData.cols; tx++) {
        tiles.push({ tx, ty, d: Math.abs(tx - p.tx) + Math.abs(ty - p.ty) });
      }
    }
    tiles.sort((a, b) => a.d - b.d);
    for (const tile of tiles) {
      const check = supportCheck({
        map: this.mapData,
        objects: this.mapData.objects,
        npcs: this.mapData.npcs,
        warps: this.mapData.warps,
        player: { x: this.player.x, feet: this.player.feet },
        items: this.worldState.items,
        object: obj,
        tx: tile.tx,
        ty: tile.ty,
        requireAdjacent: false,
      });
      if (check.ok) {
        this.placeCarryAt(obj, tile.tx, tile.ty, { moved: true });
        this.game.showToast(`${capName(obj.name)} quedó apoyado.`);
        return true;
      }
    }
    // Sin lugar: vuelve a donde estaba.
    const home = this.world.home.get(obj.id);
    obj.x = home ? home.x : obj.x;
    obj.y = home ? home.y : obj.y;
    obj.solid = home ? home.solid : obj.solid;
    delete this.worldState.moved[obj.id];
    this.world.hideObject(obj, false);
    this.world.updateObject(obj);
    this.world.rebuildSolids();
    this.surface.sync();
    this.clearCarry();
    this.game.showToast(`${capName(obj.name)} volvió a su lugar.`);
    return false;
  }

  /** Levanta un mueble liviano: sale del mapa y va sobre la cabeza (§7). */
  startCarry(obj) {
    if (!obj || this.game.carry) return false;
    const origin = { tx: obj.x, ty: obj.y };
    this.world.hideObject(obj, true);
    this.invalidateReach();
    this.surface.sync();
    this.game.carry = {
      mapId: this.name, objectId: obj.id, object: obj, origin,
    };
    this.game.showToast(`Levantaste ${obj.name || 'el mueble'}.`);
    return true;
  }

  /** Apoya el mueble cargado en (tx,ty) y lo persiste en `moved` (§7). */
  placeCarryAt(obj, tx, ty, { moved = true } = {}) {
    obj.x = tx;
    obj.y = ty;
    obj.hidden = false;
    obj.solid = true;
    if (obj.mesh) obj.mesh.visible = true;
    this.world.updateObject(obj);
    this.world.rebuildSolids();
    if (moved) {
      this.worldState.moved[obj.id] = { tx, ty };
    }
    this.surface.sync();
    this.invalidateReach();
    this.clearCarry();
    return true;
  }

  supportCarry(tx, ty) {
    const carry = this.game.carry;
    if (!carry || carry.mapId !== this.name || !carry.object) return false;
    this.placeCarryAt(carry.object, tx, ty);
    this.game.showToast(`Apoyaste ${carry.object.name || 'el mueble'}.`);
    this.game.emit('interact', {
      id: carry.object.id, kind: 'support', obj: carry.object,
    });
    return true;
  }

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
    const P = PRIORITY;
    const list = sharing ? [] : this.surface.candidates.map((c) => ({
      ...c, priority: c.kind === 'floorItem' ? P.object : P.surface,
    }));
    if (sharing) {
      for (const npc of this.npcs) {
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
    for (const c of this.world.candidates) {
      if (c.ref && c.ref.hidden) continue;
      // Un solo candidato por objeto: lo apoyado ya viene en la lista del
      // SurfaceLayer y gana por prioridad, sin duplicar el mueble.
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
      const candle = c.kind === 'object' && c.ref?.id === 'candle';
      const priority = heat ? P.surface + 1
        : stationUse || windowGoal || candle ? P.surface
          : P.object;
      list.push({ ...c, priority });
    }
    for (const npc of this.npcs) {
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
    for (const warp of this.mapData.warps || []) {
      list.push({
        id: `warp_${warp.id || 'x'}`,
        kind: 'warp',
        priority: P.warp,
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
      c.priority = P.object;
      c.type = 'thing';
      c.name = getItem(pickup.itemId).name;
      c.label = `Agarrar ${getItem(pickup.itemId).name}`;
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

    // La línea de mirar de la primera vez de un paso se lee antes de cambiar
    // de ambiente (DIRECCION.md, "Tipos de objeto" regla 2).
    if (this.updatePendingWarp(dt)) return;

    // Movimiento + camara suave (sin aceleracion rara: velocidad constante).
    // Cargando un mueble liviano, Juan camina al 80 % (§7).
    this.player.speedScale = this.carryData() ? 0.8 : 1;
    this.player.update(dt, input.move, this.world, this.mapData.bounds);
    this.updateCarryMesh();
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
    if (this.pendingWarp) {
      // Esperando que se lea la línea de la primera vez: no se pisa el paso.
    } else if (this.exitWarp) {
      if (this.canWarp(this.exitWarp)) {
        // Primera vez que se pisa el paso: la línea de mirar va antes de irse.
        const line = this.firstWarpLine(this.exitWarp);
        if (line) {
          this.game.showToast(line);
          this.pendingWarp = { warp: this.exitWarp, t: 1.2 };
          return;
        }
        this.warpNow(this.exitWarp);
        return;
      }
      // Pisar un warp bloqueado avisa que falta (una vez por aproximacion).
      this.warpBlockedFeedback(this.exitWarp);
    } else {
      this.warpWarnId = null;
    }

    // Apuntado por casilleros de acceso (teclado/joystick) o hover del mouse.
    const candidates = this.candidates();
    const found = pickTarget(
      { x: this.player.x, feet: this.player.feet, dir: this.player.dir },
      candidates,
      { dir: this.player.dir, map: this.mapData },
    );
    // Histéresis: si sigue en un acceso del objetivo actual no salta a uno
    // vecino, salvo que el nuevo quede justo de frente (tile de acción).
    let target = found.target;
    if (this.target && target && this.target.id !== target.id) {
      const current = candidates.find(
        (c) => c.id === this.target.id && c.kind === this.target.kind,
      );
      const player = { x: this.player.x, feet: this.player.feet, dir: this.player.dir };
      if (current
        && playerInAccess(player, current, this.mapData)
        && facesFootprint(player, current, this.mapData, this.player.dir)
        && !actionInsideFoot(player, target, this.mapData, this.player.dir)) {
        target = current;
      }
    }
    this.target = target;
    this.targetVia = target ? 'access' : null;
    this.updateMouseTarget(input, candidates);

    this.updateCursor(input);
    const hands = this.handsActionFor(input);
    this.handsAim = hands.aim;
    this.handsAction = hands.action;
    this.updateGhost(input, hands.aim, hands.action);

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
    this.hoverHint = hint ? hint.action : null;

    if (input.handsPressed) {
      // Manos: click derecho o X (agarra / deja / levanta / apoya).
      const blocked = input.device === 'mouse' && this.pointerOverHud(input);
      if (blocked) {
        this.drawHud(input, this.hudParams(input));
        return;
      }
      if (!this.handsAction && input.device === 'mouse'
        && (this.heldId() || this.carryData()) && this.handsAim?.tile
        && !adjacentToPlayer(this.player, this.handsAim.tile.tx, this.handsAim.tile.ty)) {
        this.warnNear();
      } else {
        this.runHands(this.handsAction, input);
      }
      this.drawHud(input, this.hudParams(input));
      return;
    }
    if (input.yPressed) {
      this.cursor.hide();
      this.game.openMenu(0);
      return;
    }
    if (input.click && input.device === 'mouse') {
      // Hotbar: el click solo elige el slot (ya no usa el ítem).
      const hotbar = hotbarLayout();
      if (pointInRect(clickPoint, hotbar.panel)) {
        const slot = hitIndex(clickPoint, hotbar.slots);
        if (slot >= 0) this.game.selectedSlot = slot;
        this.drawHud(input, this.hudParams(input));
        return;
      }
      if (hint && hint.action === 'bag') {
        this.cursor.hide();
        this.game.openMenu(0);
        return;
      }
      this.handleMouseClick(input);
      this.drawHud(input, this.hudParams(input));
      return;
    }
    if (input.padAPressed) {
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
    bumpMapVersion(this.mapData);
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
    this.invalidateReach();
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
    // No se cambia de mapa cargando un mueble liviano (§7).
    if (this.game.carry) return false;
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
    if (this.game.carry) {
      this.game.showToast(`Primero apoyá ${this.carryName()}.`);
      return true;
    }
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
    // La historia abre una viñeta: si Juan lleva un mueble, lo apoya solo (§7).
    if (this.game.carry) this.autoPlaceCarry();
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

  /** ¿El puntero (mouse) está sobre la hotbar o la barra de pistas? */
  pointerOverHud(input) {
    const client = input?.click || input?.rightClick || input?.pointer;
    if (!client) return false;
    const view = this.pointerView(input);
    if (!view) return true;
    if (pointInRect(view, hotbarLayout().panel)) return true;
    return hudBlocksPoint(view, this.hintRects);
  }

  warnNear() {
    const now = this.t || 0;
    if (this.nearWarnAt == null || now - this.nearWarnAt >= 1) {
      this.nearWarnAt = now;
      this.game.showToast('Acercate un poco.');
    }
  }

  /** Puntero en píxeles del mundo (cámara + zoom), solo con mouse. */
  pointerWorld(input) {
    const client = input && (input.click || input.pointer);
    if (!client) return null;
    return this.game.screenToWorld(client.x, client.y);
  }

  /** Caja del sprite de Juan en píxeles del mundo (§2: click sobre Juan). */
  playerWorldBox() {
    if (!this.player) return null;
    return {
      x: Math.round(this.player.x) - 8,
      y: Math.round(this.player.feet) - 32,
      w: 16,
      h: 32,
    };
  }

  carryData() {
    const carry = this.game.carry;
    return carry && carry.mapId === this.name ? carry : null;
  }

  /** Qué se apunta con Manos: el objeto bajo el puntero o el tile de adelante. */
  aimFor(input) {
    const device = input?.device || 'mouse';
    const target = device === 'mouse' ? this.hoverTarget : this.target;
    let tile = null;
    let point = null;
    if (device === 'mouse') {
      const p = this.pointerWorld(input);
      if (p) {
        tile = { tx: Math.floor(p.x / 16), ty: Math.floor(p.y / 16) };
        point = p;
      }
    } else {
      const a = actionTile(this.player.x, this.player.feet, this.player.dir);
      tile = { tx: a.tx, ty: a.ty };
      point = { x: a.cx, y: a.cy };
    }
    return { target, tile, point, device, near: target ? this.hoverNear : true };
  }

  handsActionFor(input) {
    const aim = this.aimFor(input);
    const action = resolveHands(
      this.ctx(), aim, this.heldId(), this.carryData(),
    );
    return { aim, action };
  }

  // ------------------------------------------------------------- siluetas (§8)

  ghostSpriteFor(name, itemId) {
    try {
      return anySprite(this.game.assets, name);
    } catch {
      const data = this.game.assets.itemsData;
      const sheet = this.game.assets.items;
      const raw = data?.frames?.[itemId] || data?.frames?.[name];
      if (!raw || !sheet) return null;
      const box = Array.isArray(raw)
        ? { x: raw[0], y: raw[1], w: raw[2], h: raw[3] } : raw;
      return iconSprite(sheet, box, box.w, box.h);
    }
  }

  setGhost(name, x, base, valid) {
    if (!name) {
      this.clearGhost();
      return null;
    }
    if (!this.ghost || this.ghostName !== name) {
      if (this.ghost) this.scene.remove(this.ghost);
      if (this.ghostMask) this.ghostMask.dispose();
      this.ghost = this.ghostSpriteFor(name);
      this.ghostName = name;
      if (!this.ghost) return null;
      this.ghostTex = this.ghost.material.map;
      this.ghostMask = silhouetteTexture(this.ghostTex);
      this.ghost.material = this.ghost.material.clone();
      this.ghost.material.transparent = true;
      this.ghost.material.depthWrite = false;
      this.ghost.material.depthTest = false;
      // ¡Clave! El alphaTest del atlas (0.5) descartaba la silueta inválida,
      // que va al 45 %: nunca se veía. La máscara ya tiene alfa duro.
      this.ghost.material.alphaTest = 0;
      this.ghost.renderOrder = 4;
      this.scene.add(this.ghost);
    }
    const w = this.ghost.geometry.parameters.width;
    const h = this.ghost.geometry.parameters.height;
    this.ghost.position.set(Math.round(x), Math.round(base - h / 2), GHOST_Z);
    this.ghost.material.opacity = valid ? 0.55 : 0.45;
    this.ghost.material.map = valid ? this.ghostTex : this.ghostMask;
    this.ghost.material.color.setHex(valid ? 0xffffff : INVALID_GHOST_COLOR);
    this.ghost.visible = true;
    this.ghostInfo = {
      x, base, w, h, valid, name,
      box: { x: x - w / 2, y: base - h, w, h },
    };
    return this.ghost;
  }

  showGhostCursor(box) {
    this.ghostCursor.showAt(box, this.t, { mode: 'near', grab: false, id: 'ghost' });
    this.ghostCursor.setPosition(box.x + box.w / 2, box.y + box.h / 2);
  }

  clearGhost() {
    if (this.ghost) {
      this.scene.remove(this.ghost);
      this.ghost = null;
    }
    if (this.ghostMask) this.ghostMask.dispose();
    this.ghostMask = null;
    this.ghostTex = null;
    this.ghostName = null;
    this.ghostInfo = null;
    this.handsFeedback = null;
    this.ghostCursor?.hide();
  }

  /** Silueta + cuadradito del lugar apuntado (o el aviso rojo si no entra). */
  updateGhost(input, aim, action) {
    const device = aim?.device || 'mouse';
    this.handsFeedback = null;
    if (!aim || !aim.tile) {
      this.clearGhost();
      return;
    }
    if (device === 'mouse') {
      const view = this.pointerView(input);
      if (view && hudBlocksPoint(view, this.hintRects)) {
        this.clearGhost();
        return;
      }
    }
    if (!this.carryData() && this.selfHover) {
      // Sobre Juan manda el uso propio: no es un lugar de dejar (§2).
      this.clearGhost();
      return;
    }
    const carry = this.carryData();
    if (carry && carry.object) {
      const obj = carry.object;
      const check = this.checkSupportCached({
        map: this.mapData,
        objects: this.mapData.objects,
        npcs: this.mapData.npcs,
        warps: this.mapData.warps,
        player: { x: this.player.x, feet: this.player.feet },
        items: this.worldState.items,
        object: obj,
        tx: aim.tile.tx,
        ty: aim.tile.ty,
      });
      if (check.ok) {
        this.showFurnitureGhost(obj, aim.tile.tx, aim.tile.ty, true);
        return;
      }
      if (device === 'mouse' && adjacentToPlayer(this.player, aim.tile.tx, aim.tile.ty)) {
        this.showFurnitureGhost(obj, aim.tile.tx, aim.tile.ty, false);
        this.handsFeedback = {
          text: check.reason === 'taparia' ? 'Taparía el paso.' : 'No entra ahí.',
          box: this.ghostInfo?.box || null,
          x: aim.tile.tx * 16 + 8,
          y: aim.tile.ty * 16,
        };
        return;
      }
      this.clearGhost();
      return;
    }

    const held = this.heldId();
    if (!held) {
      this.clearGhost();
      return;
    }
    if (action && action.kind === 'drop') {
      const pos = action.payload.pos;
      const name = getItemById(held).worldSprite;
      this.setGhost(name, pos.x, pos.y, true);
      const box = action.payload.tx != null
        ? {
          x: action.payload.tx * 16,
          y: action.payload.ty * 16,
          w: 16,
          h: 16,
        }
        : { x: pos.x - 6, y: pos.y - 12, w: 12, h: 12 };
      this.showGhostCursor(box);
      return;
    }
    // Con mouse, apuntar a un lugar inválido muestra la silueta rojiza.
    const surfaceTarget = aim.target && aim.target.surface;
    const blockedTarget = aim.target && !aim.target.surface
      && action && action.kind !== 'drop';
    const reachable = aim.target
      ? this.hoverNear
      : adjacentToPlayer(this.player, aim.tile.tx, aim.tile.ty);
    if (device === 'mouse' && !blockedTarget && reachable) {
      const pos = surfaceTarget ? aim.point : floorPos(aim.tile.tx, aim.tile.ty);
      const name = getItemById(held).worldSprite;
      this.setGhost(name, pos.x, pos.y, false);
      this.ghostCursor.hide();
      this.handsFeedback = {
        text: 'No entra ahí.',
        box: this.ghostInfo?.box || null,
        x: pos.x,
        y: surfaceTarget ? pos.y - 12 : aim.tile.ty * 16,
      };
      return;
    }
    this.clearGhost();
  }

  showFurnitureGhost(obj, tx, ty, valid) {
    const tw = Math.max(1, obj.tw || 1);
    const th = Math.max(1, obj.th || 1);
    const [ox, oy] = obj.offset || [0, 0];
    const x = (tx + tw / 2) * 16 + ox;
    const base = (ty + th) * 16 + oy;
    this.setGhost(obj.sprite, x, base, valid);
    if (valid) {
      this.showGhostCursor({ x: tx * 16, y: ty * 16, w: tw * 16, h: th * 16 });
    } else {
      this.ghostCursor.hide();
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
    this.selfHover = false;
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
          candidates, point, { dir: this.player.dir, map: this.mapData },
        );
        const self = resolveAction(this.ctx(), null, this.heldId());
        const pbox = this.playerWorldBox();
        const overPlayer = Boolean(self && pbox
          && point.x >= pbox.x && point.x < pbox.x + pbox.w
          && point.y >= pbox.y && point.y < pbox.y + pbox.h);
        // Cargando un mueble no hay uso propio: primero se apoya (§4, §7).
        this.selfHover = overPlayer && !this.carryData();
        if (hit.target) {
          this.setHover(hit.target, hit.near);
          state = hit.near ? 'hand' : 'far';
        } else if (overPlayer) {
          // Puntero sobre Juan con un ítem con uso propio: cuadradito y
          // barra [click] Tomar mate (§2).
          this.hoverNear = true;
          this.cursor.showAt(pbox, this.t, {
            mode: 'near', grab: false, id: 'player',
          });
          this.cursor.setPosition(pbox.x + pbox.w / 2, pbox.y + pbox.h / 2);
          state = 'hand';
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
    // El cuadradito anticipa: dorado si hay acción propia, tenue si solo se
    // mira (decorado), y ámbar fijo de lejos.
    const primary = resolveAction(this.ctx(), target, this.heldId());
    const own = Boolean(primary && primary.kind !== 'look') || isGrabbable(target);
    this.cursor.showAt(box, this.t, {
      mode: near ? (own ? 'near' : 'faint') : 'far',
      grab: isGrabbable(target),
      id: target.id,
    });
    this.cursor.setPosition(box.x + box.w / 2, box.y + box.h / 2);
  }

  /** Mirar un objetivo puntual (Hacer en lo que solo se mira). No pide alcance. */
  handleLook(target = this.target) {
    if (!target) return;
    this.faceTarget(target);
    this.lookTarget(target, { emit: true });
  }

  /**
   * Mirar unificado (DIRECCION.md): diálogo propio (`talk`) si existe, si no
   * la línea corta. Hacer en un decorado llama acá.
   */
  lookTarget(target, { emit = true } = {}) {
    if (!target) return;
    if (target.kind === 'surfaceItem' || target.kind === 'floorItem') {
      const itemId = target.itemId || target.item?.id || target.worldItem?.itemId;
      this.game.showToast(this.surface.describe(itemId, this.game.flags));
      if (emit) this.game.emit('interact', { id: target.id, kind: 'lookItem' });
      return;
    }
    if (target.kind === 'pickup') {
      const item = getItem(target.itemId || target.item?.id);
      this.game.showToast(`${item.name}: ${item.description}`);
      return;
    }
    if (target.kind === 'npc') {
      if (typeof this.talkTo === 'function') this.talkTo(target.npc);
      return;
    }
    if (target.kind === 'warp') {
      const warp = target.warp || {};
      this.game.showToast(warp.look || warpLabel(warp));
      return;
    }
    const obj = target.ref || target;
    if (obj?.window) this.game.emit('interact', { id: target.id, kind: 'window', obj });
    const entry = talkEntry(obj?.talk || obj?.interact?.talk, this.game);
    if (entry && typeof this.openDialog === 'function') this.openDialog(entry, target.id);
    else this.lookAt(target);
    if (emit) this.game.emit('interact', { id: target.id, kind: 'object', obj });
  }

  /** Texto de "mirar" del objetivo (fallback corto, sin diálogo propio). */
  lookAt(target) {
    if (!target) return;
    if (target.kind === 'surfaceItem' || target.kind === 'floorItem') {
      const itemId = target.itemId || target.item?.id || target.worldItem?.itemId;
      this.game.showToast(this.surface.describe(itemId, this.game.flags));
      return;
    }
    if (target.kind === 'object' || target.kind === 'container') {
      const obj = target.ref || target;
      const line = lookLine(target.id, this.game.flags)
        || lookLine(obj.id, this.game.flags)
        || lookLine(obj.talk, this.game.flags)
        || lookLine(obj.interact?.talk, this.game.flags)
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

  // ------------------------------------- línea de mirar de la primera vez
  // Un objeto con verbo propio (ropero, radio, escalera, portón) conserva su
  // línea de mirar: Juan la dice la primera vez que lo usa y no la repite
  // (DIRECCION.md, "Tipos de objeto" regla 2). Se guarda por partida en
  // `game.seenLook` y la borra `reset()` (main.js).

  /** Texto de mirar de un objetivo, sin abrir nada. */
  lookTextFor(target) {
    if (!target) return null;
    const obj = target.ref || target;
    if (target.kind === 'warp') {
      const warp = target.warp || {};
      const line = lookLine(warp.id, this.game.flags)
        || lookLine(warp.talk, this.game.flags)
        || warp.look;
      if (line) return line;
      // Sin texto propio: la primera línea de su entrada de mirar del guion
      // (la escalera que baja del altillo se llama `stairs`).
      const talkId = warp.talk || warp.id;
      const entry = talkId && TALK[talkId] ? talkEntry(talkId, this.game) : null;
      return entry?.lines?.[0] || null;
    }
    const line = lookLine(obj?.id, this.game.flags)
      || lookLine(obj?.talk, this.game.flags)
      || lookLine(obj?.interact?.talk, this.game.flags)
      || lookLine(target.id, this.game.flags)
      || obj?.description;
    if (line) return line;
    // Sin línea corta: la primera línea de su diálogo propio.
    if (obj?.talk && TALK[obj.talk]) {
      return talkEntry(obj.talk, this.game)?.lines?.[0] || null;
    }
    return null;
  }

  /** Id estable del objetivo para recordar la línea dicha. */
  firstLookKey(target) {
    if (!target) return null;
    if (target.kind === 'warp') return target.warp?.id || target.id || null;
    const obj = target.ref || target;
    return obj?.id || target.id || null;
  }

  /**
   * Marca y devuelve la línea de mirar de la primera vez, o null si ya se
   * dijo / el objetivo no tiene verbo propio / la acción ya es Mirar.
   */
  firstUseLine(target, action) {
    if (!target || !action) return null;
    if (action.kind === 'look' || action.kind === 'warp') return null;
    if (!OWN_VERB_TYPES.has(typeOf(target))) return null;
    const key = this.firstLookKey(target);
    if (!key) return null;
    if (!this.game.seenLook) this.game.seenLook = {};
    if (this.game.seenLook[key]) return null;
    const text = this.lookTextFor(target);
    if (!text) return null;
    this.game.seenLook[key] = true;
    return { key, text };
  }

  /** Igual que firstUseLine, para un paso (la línea va antes de irse). */
  firstWarpLine(warp) {
    if (!warp) return null;
    if (!this.game.seenLook) this.game.seenLook = {};
    const key = warp.id || null;
    if (!key || this.game.seenLook[key]) return null;
    const text = this.lookTextFor({ kind: 'warp', warp });
    if (!text) return null;
    this.game.seenLook[key] = true;
    return text;
  }

  // ------------------------------------------------------------- acciones

  /** Contexto del resolvedor (ver src/actions.js): sin `this` adentro. */
  ctx() {
    return {
      game: this.game,
      objects: this.mapData?.objects || [],
      map: this.mapData,
      items: this.worldState?.items || [],
      npcs: this.npcs || [],
      warps: this.mapData?.warps || [],
      player: this.player,
      checkSupport: (args) => this.checkSupportCached(args),
    };
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
    // Primera vez que se usa un objeto con verbo propio: antes del resultado,
    // Juan dice su línea de mirar. Si el uso abre un diálogo propio de la
    // historia, ese manda y la línea solo queda marcada como dicha.
    const first = this.firstUseLine(target, action);
    if (first && action.kind !== 'talk') this.game.showToast(first.text);

    const obj = action.payload?.object;
    switch (action.kind) {
      case 'warp':
        this.tryWarp(action.payload?.warp || (target && target.warp));
        break;
      case 'talk':
        if (action.payload?.npc) this.talkTo(target.npc);
        else this.lookTarget(target, { emit: true });
        break;
      case 'open':
        if (target.container) {
          this.game.openChest(target.container);
          this.cursor.hide();
          this.game.emit('interact', { id: target.id, kind: 'container' });
        } else {
          this.runAction({ ...action, kind: 'ammo' }, target);
        }
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
      case 'window':
        this.setWindow(obj, action.payload?.to);
        break;
      case 'closeWindow':
        this.game.emit('interact', { id: obj.id, kind: 'window', obj });
        this.closeWindow(obj);
        break;
      case 'toggle':
        this.toggleDevice(obj, action.payload?.device);
        break;
      case 'takePava':
        this.takePava();
        break;
      case 'use':
        this.runItemUse(action, target);
        break;
      case 'self':
        this.runSelfUse(action);
        break;
      case 'look':
        // Hacer = Mirar para decorados y aparatos sin verbo propio. Es el
        // mismo camino que Q/B/click derecho: diálogo propio o línea corta.
        this.lookTarget(target, { emit: true });
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

  /**
   * Click izquierdo = Hacer. Sobre Juan (o sin objetivo con joystick) es el
   * uso propio del ítem; con mouse, el click en piso vacío no hace nada (§11.5).
   */
  handleMouseClick(input = null) {
    // Cargando un mueble Hacer apoya (salvo hablar con una persona).
    if (this.carryData()) {
      const carried = this.hoverTarget;
      if (carried && typeOf(carried) === 'person') {
        this.faceTarget(carried);
        this.runAction(
          resolveAction(this.ctx(), carried, this.heldId()), carried,
        );
        return;
      }
      this.runHands(this.handsAction, input);
      return;
    }
    if (this.selfHover) {
      const self = resolveAction(this.ctx(), null, this.heldId());
      this.runAction(self, null);
      return;
    }
    const target = this.hoverTarget;
    if (!target) return;
    this.faceTarget(target);
    this.runAction(resolveAction(this.ctx(), target, this.heldId()), target);
  }

  /** Manos: agarra, deja, levanta o apoya según resolveHands (§4). */
  runHands(action, input = null) {
    if (!action) return;
    if (action.needsNear && this.hoverTarget && !this.hoverNear) {
      this.faceTarget(this.hoverTarget);
      this.warnNear();
      return;
    }
    if (action.blocked === 'full') {
      this.game.showToast('La mochila está llena.');
      return;
    }
    switch (action.kind) {
      case 'grab': {
        const target = action.payload?.target;
        if (!target) break;
        if (target.kind === 'pickup') target.pickup.take();
        else this.takeSurfaceItem(target);
        break;
      }
      case 'takePava':
        this.takePava();
        break;
      case 'lift':
        this.startCarry(action.payload?.object);
        break;
      case 'drop':
        this.dropHeld(action.payload);
        break;
      case 'support':
        this.supportCarry(action.payload.tx, action.payload.ty);
        break;
      default:
        break;
    }
    this.invalidateReach();
    this.clearGhost();
    void input;
  }

  /** Deja el ítem elegido en el piso o en un mueble (§5). */
  dropHeld(payload) {
    if (!payload) return;
    const slot = this.game.selectedSlot;
    if (payload.object) {
      const result = this.surface.dropSelected(
        this.game.inventory, slot, payload.object.id, payload.slot,
      );
      if (!result) {
        this.game.showToast(NO_SPACE_MESSAGE);
        return;
      }
      this.game.inventory = result.inventory;
      this.game.showToast(`Dejaste ${getItem(result.placed.itemId).name}.`);
      this.game.emit('itemUsed', {
        id: result.placed.itemId, targetId: payload.object.id, action: 'drop',
      });
      return;
    }
    const item = this.game.inventory[slot];
    const itemName = item ? getItem(item.id).name : 'la cosa';
    const result = this.surface.dropOnFloor(
      this.game.inventory, slot, payload.tx, payload.ty,
    );
    if (!result) {
      this.game.showToast(NO_SPACE_MESSAGE);
      return;
    }
    this.game.inventory = result.inventory;
    this.game.showToast(`Dejaste ${itemName}.`);
    this.game.emit('itemUsed', {
      id: result.placed.itemId, targetId: null, action: 'drop',
    });
  }

  /** Alias histórico de lookTarget (click/E sobre un objeto). */
  lookObject(target) {
    this.lookTarget(target, { emit: true });
  }

  /** Aparato con estado: prender/apagar (radio, vela). */
  toggleDevice(obj, dev) {
    if (!obj || !dev?.toggle) return;
    const flags = this.game.flags || (this.game.flags = {});
    flags[dev.toggle] = !flags[dev.toggle];
    this.applyStoryState();
    const stateId = typeof dev.state === 'function' ? dev.state(this.game) : 'on';
    const on = stateId !== 'off' && stateId !== 'apagada' && stateId !== 'closed';
    if (dev.light) this.setLightState(dev.light, on);
    const msg = dev.messages && dev.messages[stateId];
    if (msg) this.game.showToast(msg);
    this.game.emit('interact', { id: obj.id, kind: 'device', obj, state: stateId });
  }

  /** Ventana abrible: abrir/cerrar según el estado que eligió el resolvedor. */
  setWindow(obj, to) {
    if (!obj) return;
    const flags = this.game.flags || (this.game.flags = {});
    const closing = to === 'closed' || to === 'cerrada';
    if (closing) {
      this.game.emit('interact', { id: obj.id, kind: 'window', obj });
      this.closeWindow(obj);
      return;
    }
    delete flags[`closed_${obj.id}`];
    this.applyStoryState();
    this.game.showToast(obj.openToast || 'Ventana abierta.');
    this.game.emit('interact', { id: obj.id, kind: 'windowOpened', obj });
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
    // Sin objetivo no hay cuadradito: nunca sobre piso o pared vacíos.
    if (!this.target) {
      this.cursor.fadeOut(this.t);
      return;
    }
    const box = this.target.cursorBox || boxOf(this.target);
    const primary = resolveAction(this.ctx(), this.target, this.heldId());
    const own = Boolean(primary && primary.kind !== 'look') || isGrabbable(this.target);
    this.cursor.showAt(box, this.t, {
      mode: own ? 'near' : 'faint',
      grab: isGrabbable(this.target),
      id: this.target.id,
    });
    this.cursor.setPosition(box.x + box.w / 2, box.y + box.h / 2);
  }

  /**
   * Única fuente de la etiqueta de acción (prompt con mouse, barra y click).
   * Sale del mismo resolvedor que ejecuta la acción, así no pueden divergir.
   */
  actionLabel(target) {
    return resolveAction(this.ctx(), target, this.heldId())?.label ?? null;
  }

  /**
   * Obstáculos que la etiqueta flotante no puede tapar (B1): Juan, el cursor
   * (con mouse), la hotbar y la barra de pistas.
   */
  labelObstacles(input = null) {
    const obstacles = [];
    const player = this.playerViewBox();
    if (player) obstacles.push(player);
    const device = input?.device || this.game.input?.device || 'mouse';
    if (device === 'mouse') {
      const point = this.pointerView(input);
      if (point) obstacles.push({ x: point.x - 2, y: point.y - 2, w: 14, h: 16 });
    }
    obstacles.push(hotbarLayout().panel);
    for (const rect of this.hintRects || []) obstacles.push(rect);
    return obstacles;
  }

  hudParams(input = null) {
    const device = input?.device || this.game.input?.device || 'mouse';
    const target = this.target;
    const held = this.heldId();
    const obstacles = this.labelObstacles(input);
    const carry = typeof this.carryData === 'function' ? this.carryData() : null;
    const self = resolveAction(this.ctx(), null, held);
    let primary = null;
    // El puntero sobre Juan manda: Hacer es el uso propio (§2, §11.5).
    if (this.selfHover) primary = self;
    else if (target) primary = resolveAction(this.ctx(), target, held);
    else if (device !== 'mouse') primary = self;

    // Manos (§4): misma decisión que ejecuta el click derecho / RT.
    let aim = this.handsAim;
    if (!aim && typeof this.aimFor === 'function') aim = this.aimFor(input);
    if (!aim) {
      aim = { target, tile: null, point: null, device };
    }
    const hands = this.handsAction
      || resolveHands(this.ctx(), aim, held, carry);
    if (carry) {
      primary = target && typeOf(target) === 'person'
        ? resolveAction(this.ctx(), target, held)
        : hands;
    }

    let prompt = null;
    const warp = this.exitWarp
      || (target && target.kind === 'warp' ? target.warp : null);
    // Si el puntero/objetivo es un objeto (p. ej. el extractor), su prompt
    // manda sobre el "Salir sin traje" del warp bloqueado bajo los pies.
    const overObject = Boolean(target && target.kind !== 'warp');
    const warpBlocked = !overObject && warp && !carry
      && ((warp.needsSuit && !this.game.hasSuit)
        || (warp.needsFlag && !this.game.flags[warp.needsFlag]));
    if (this.selfHover && primary) {
      // Puntero sobre Juan: el aviso va sobre su cabeza (§2).
      const pbox = this.playerViewBox();
      if (pbox) {
        const p = this.worldToView(this.player.x, this.player.feet - 30);
        prompt = {
          action: 'interact',
          anchor: 'above',
          label: primary.label,
          color: '#fff0c0',
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
      const needSuit = warp.needsSuit && !this.game.hasSuit;
      const far = Boolean(this.hoverTarget && !this.hoverNear);
      const p = this.worldToView(b.x + b.w / 2, b.y);
      prompt = {
        action: 'interact',
        anchor: 'above',
        label: needSuit ? 'Salir sin traje' : this.exitBlocker(),
        x: p.x, y: p.y,
        frameH: b.h * viewport.zoom,
        frameW: b.w * viewport.zoom,
        side: warp.labelSide || null,
        obstacles,
        color: far ? '#ffb07a' : '#ff9a8a',
        alpha: far ? 0.75 : 1,
      };
    } else if (target && !carry) {
      const far = Boolean(this.hoverTarget && !this.hoverNear);
      const b = target.cursorBox || boxOf(target);
      // Etiqueta centrada arriba del marco del objeto, en coordenadas de vista.
      const p = this.worldToView(b.x + b.w / 2, b.y);
      prompt = {
        action: 'interact',
        anchor: 'above',
        label: primary?.label || null,
        color: far ? '#ffb07a' : '#fff0c0',
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

  /** Etiqueta del uso propio del ítem en la mano (helper interno). */
  useLabel() {
    const held = this.heldId();
    if (!held) return 'Usar';
    return resolveAction(this.ctx(), null, held)?.label || 'Usar';
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
      hoverHint: this.hoverHint,
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
      // La etiqueta va en tablita oscura ARRIBA del termómetro: antes flotaba
      // sin fondo encima de la pava de la cocina y la tapaba.
      const glyphs = this.game.assets.font.glyphs;
      const label = 'pava';
      const lw = measureText(glyphs, label) + 12;
      const lx = Math.max(4, Math.min(VIEW_W - lw - 4,
        Math.round(VIEW_W - 21 - lw / 2)));
      const ly = 70;
      darkPanel(ex, lx, ly, lw, 15, 0.78);
      drawText(ex, glyphs, lx + 6, ly + 4, label, '#fff0c0', { outline: '#1a1426' });
    }
    this.drawTimedBar(ex);
    this.drawHandsFeedback(ex);
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

  /**
   * Aviso rojo de Manos con mouse (§8): "No entra ahí." / "Taparía el paso."
   * Va en la capa extra, arriba del HUD, junto al lugar apuntado.
   */
  drawHandsFeedback(ctx) {
    const fb = this.handsFeedback;
    if (!fb || !fb.text) return;
    const glyphs = this.game.assets.font.glyphs;
    const z = viewport.zoom;
    // Caja de la silueta en la vista (arriba de ella va la etiqueta).
    const boxWorld = fb.box || { x: fb.x - 8, y: fb.y - 16, w: 16, h: 16 };
    const topLeft = this.worldToView(boxWorld.x, boxWorld.y);
    const box = {
      x: topLeft.x, y: topLeft.y, w: boxWorld.w * z, h: boxWorld.h * z,
    };
    // La caja de Juan es obstáculo: la etiqueta se corre para no taparlo.
    const pb = this.playerWorldBox();
    let playerBox = null;
    if (pb) {
      const p = this.worldToView(pb.x, pb.y);
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
    drawText(ctx, glyphs, x + 6, y + 4, fb.text, '#f09a7a', { outline: '#1a1426' });
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
  interact(input = null) {
    const carry = this.carryData();
    const target = this.target;
    // Cargando un mueble Hacer apoya (salvo hablar con una persona).
    if (carry) {
      if (target && typeOf(target) === 'person') {
        this.faceTarget(target);
        this.runAction(
          resolveAction(this.ctx(), target, this.heldId()), target,
        );
        return;
      }
      this.runHands(this.handsActionFor(input).action, input);
      return;
    }
    const targetIsObject = Boolean(target && target.kind !== 'warp');
    if (this.exitWarp && !targetIsObject) {
      this.tryWarp(this.exitWarp);
      return;
    }
    const action = target
      ? resolveAction(this.ctx(), target, this.heldId())
      : resolveAction(this.ctx(), null, this.heldId());
    this.runAction(action, target);
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
    this.game.showToast(obj.closeToast || 'Ventana cerrada.');
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

  replaceItem(fromId, toId, count = 1) {
    const removed = removeItem(this.game.inventory, fromId, count);
    if (removed.removed <= 0) return false;
    this.game.inventory = addItem(removed.slots, toId, removed.removed).slots;
    this.game.onInventoryChanged();
    return true;
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

  /**
   * Cuenta regresiva del paso que espera a que se lea la línea de la primera
   * vez. Devuelve true el frame en que cambia de ambiente.
   */
  updatePendingWarp(dt) {
    if (!this.pendingWarp) return false;
    this.pendingWarp.t -= dt;
    if (this.pendingWarp.t > 0) return false;
    const warp = this.pendingWarp.warp;
    this.pendingWarp = null;
    this.warpNow(warp);
    return true;
  }

  /** Warp con las mismas reglas al pisarlo o al clickearlo. */
  tryWarp(warp) {
    if (!warp) return;
    // Ya se está leyendo la línea de la primera vez de este paso.
    if (this.pendingWarp) return;
    if (this.game.carry) {
      this.game.showToast(`Primero apoyá ${this.carryName()}.`);
      return;
    }
    if (warp.needsSuit && !this.game.hasSuit) {
      this.openWarning();
      return;
    }
    if (warp.needsFlag && !this.game.flags[warp.needsFlag]) {
      this.game.showToast(this.exitBlocker());
      return;
    }
    // Primera vez: la línea de mirar del paso, antes de cambiar de ambiente.
    const line = this.firstWarpLine(warp);
    if (line) {
      this.game.showToast(line);
      this.pendingWarp = { warp, t: 1.2 };
      return;
    }
    this.warpNow(warp);
  }

  warpNow(warp) {
    if (!this.canWarp(warp)) return;
    this.pendingWarp = null;
    this.game.changeScene(warp.to, warp.spawn);
  }

  /** Para el menú de pausa: pausa solo si no hay dialogo/eleccion. */
  get blocksPause() {
    return this.dialog.open || this.choice.open;
  }
}

/** "el balde" -> "El balde" (para avisos que empiezan por el nombre). */
function capName(name) {
  const text = name || 'El mueble';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Cosas agarrables (type thing): muestran el destello del cursor. */
function isGrabbable(target) {
  if (!target) return false;
  if (typeOf(target) !== 'thing') return false;
  return target.kind === 'pickup' || target.grabbable !== false;
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
