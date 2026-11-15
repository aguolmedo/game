import * as THREE from 'three';
import { WorldMap, cloneMap } from '../mapView.js';
import { Player } from '../player.js';
import { NPC } from '../npc.js';
import { Pickup } from '../pickup.js';
import { DialogBox, ChoiceBox } from '../dialog.js';
import { Hud } from '../hud.js';
import { ActionCursor } from '../cursor.js';
import { Snowfall } from '../snow.js';
import { Footprints } from '../footprints.js';
import { pickTarget, actionBox, warpAt } from '../interaction.js';
import { talkEntry, WARNING } from '../dialogs.js';
import { addItem, removeItem, countItem } from '../inventory.js';
import { getItem } from '../items.js';
import { PLAYER_SPEED } from '../movement.js';
import { VIEW_W, VIEW_H, depthFor, canvasOverlay } from '../sprite.js';
import { drawText, measureText } from '../font.js';
import {
  SurfaceLayer, applyContainers, itemsForMap, NO_SPACE_MESSAGE,
} from '../surfaces.js';
import { INITIAL_ITEMS } from '../data/surfaces.js';
import { lookLine } from '../data/descriptions.js';
import { LightOverlay } from '../lighting.js';
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
    this.opts = opts;
    this.scene = new THREE.Scene();
    this.world = new WorldMap(this.scene, game.assets, this.mapData);
    this.player = new Player(
      this.scene, game.assets,
      game.hasSuit ? (game.hasRifle ? 'juan_suit_rifle' : 'juan_suit') : 'juan',
    );
    this.npcs = this.mapData.npcs.map((def) => new NPC(this.scene, game.assets, def));
    this.pickups = [];
    this.dialog = new DialogBox(game.assets);
    this.choice = new ChoiceBox(game.assets);
    this.hud = new Hud(this.scene, game.assets, game);
    this.cursor = new ActionCursor(this.scene);
    this.snow = opts.snow
      ? new Snowfall(this.scene, game.assets.snow, { count: 120, front: 34 })
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
    this.lightUi = canvasOverlay(VIEW_W, VIEW_H, 20);
    this.scene.add(this.lightUi.mesh);
    this.comic = new ComicOverlay(game.assets);
    this.comicUi = canvasOverlay(VIEW_W, VIEW_H, 50);
    this.comicUi.mesh.visible = false;
    this.scene.add(this.comicUi.mesh);
    this.caption = new CaptionBox(game.assets);
    this.captionUi = canvasOverlay(VIEW_W, VIEW_H, 52);
    this.captionUi.mesh.visible = false;
    this.scene.add(this.captionUi.mesh);
    this.balloon = new BalloonLine(game.assets);
    this.extra = canvasOverlay(VIEW_W, VIEW_H, 31);
    this.scene.add(this.extra.mesh);
    this.timedBar = null;

    this.t = 0;
    this.cam = { x: 0, y: 0 };
    this.target = null;
    this.targetVia = null;
    this.exitWarp = null;
    this.hintVerb = 'Mirar';
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
    this.player.setSuit(this.game.hasSuit);
    this.player.setRifle?.(this.game.hasSuit && this.game.hasRifle);
    const point = spawn || this.mapData.spawn;
    this.player.place(point.x, point.y, point.dir || 'down');
    this.cam = this.world.cameraFor(this.player.x, this.player.feet);
    this.hud.show();
    this.hud.setCamera(this.cam.x, this.cam.y);
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
    this.applyStoryState();
    this.game.emit('enterMap', { map: this.name, spawn: point });
  }

  get camX() { return this.cam.x; }
  get camY() { return this.cam.y; }

  applyCamera(camera) {
    camera.left = this.cam.x;
    camera.right = this.cam.x + VIEW_W;
    camera.top = this.cam.y;
    camera.bottom = this.cam.y + VIEW_H;
    camera.updateProjectionMatrix();
  }

  candidates() {
    // Los objetos apoyados ganan sobre el mueble que los sostiene: apuntar a
    // la mesa agarra el mate, no "mirar la mesa". Con un mate cebado en la
    // mano, primero los NPC (para convidar).
    const held = this.game.inventory[this.game.selectedSlot];
    const sharing = Boolean(held && held.id === 'mate_cebado');
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
      list.push(heat ? { ...c, priority: 3 } : c);
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
      this.comic.update(dt, input);
      if (!this.comic.open) this.comicUi.mesh.visible = false;
      this.drawHud(input, { prompt: null, showHotbar: false, hintActions: null });
      return;
    }
    if (this.caption.open) {
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
      this.balloon.update(dt, input);
      if (!this.balloon.open) this.balloonUi = null;
    }

    if (this.dialog.open) {
      const result = this.dialog.update(dt, input, input.device);
      if (result === 'closed') {
        this.game.emit('dialogEnd', { id: this.dialogId || null });
        this.dialogId = null;
      }
      this.drawHud(input, { prompt: null, showHotbar: false, hintActions: null });
      return;
    }
    if (this.choice.open) {
      this.choice.update(dt, input);
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
    if (this.exitWarp && this.canWarp(this.exitWarp)) {
      this.warpNow(this.exitWarp);
      return;
    }

    // Apuntado al tile de accion.
    const found = pickTarget(
      { x: this.player.x, feet: this.player.feet, dir: this.player.dir },
      this.candidates(),
      { dir: this.player.dir, reach: 22 },
    );
    this.target = found.target;
    this.targetVia = found.via;
    this.hintVerb = this.verbFor(this.target);

    this.updateCursor(input);

    if (input.yPressed) {
      this.game.openMenu(0);
      return;
    }
    if (input.xPressed) {
      this.useSelected(input);
      this.drawHud(input, this.hudParams());
      return;
    }
    if (input.aPressed) {
      this.interact(input);
      this.drawHud(input, this.hudParams());
      return;
    }

    this.drawHud(input, this.hudParams());
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
    this.cam.x = Math.round(this.cam.x);
    this.cam.y = Math.round(this.cam.y);
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

  verbFor(target) {
    if (!target) return null;
    if (target.kind === 'npc') return 'Hablar';
    if (target.kind === 'container') return 'Abrir';
    if (target.kind === 'pickup') return 'Levantar';
    if (target.kind === 'object' && target.interact.kind === 'exit') return 'Salir';
    return 'Mirar';
  }

  updateCursor() {
    const box = this.target
      ? (this.target.cursorBox || boxOf(this.target))
      : actionBox(this.player, this.player.dir);
    this.cursor.showAt(box, this.t);
    this.cursor.setPosition(box.x + box.w / 2, box.y + box.h / 2);
  }

  actionLabel(target) {
    if (!target) return null;
    const slot = this.game.inventory[this.game.selectedSlot];
    const selectedName = slot ? getItem(slot.id).name : '';
    if (target.kind === 'npc' && slot && slot.id === 'mate_cebado') return 'Convidar mate';
    if (target.kind === 'surfaceItem') return target.label;
    if (target.kind === 'object') {
      const obj = target.ref || {};
      if (obj.station === 'heat' && this.game.pavaStation === obj.id) return 'Sacar la pava';
      if (obj.station === 'extractor' && slot && slot.id === 'secador') return 'Instalar el secador';
      if (obj.id === 'generator' && slot && slot.id === 'nafta') return 'Cargar nafta';
      if (obj.surface && slot) return `Dejar ${selectedName}`;
      if (obj.window && obj.window.view) return 'Mirar por la ventana';
      if (obj.window && obj.window.openable) {
        return this.game.flags[`closed_${obj.id}`] ? 'Mirar la ventana' : 'Cerrar la ventana';
      }
      if (obj.interact && obj.interact.label) return obj.interact.label;
    }
    return target.label || null;
  }

  hudParams() {
    const target = this.target;
    let prompt = null;
    const warpBlocked = this.exitWarp
      && ((this.exitWarp.needsSuit && !this.game.hasSuit)
        || (this.exitWarp.needsFlag && !this.game.flags[this.exitWarp.needsFlag]));
    if (warpBlocked) {
      const b = boxOfWarp(this.exitWarp);
      const needSuit = this.exitWarp.needsSuit && !this.game.hasSuit;
      prompt = {
        action: 'interact',
        label: needSuit ? 'Salir sin traje' : 'Todavía no',
        x: b.x + b.w / 2 - this.cam.x, y: b.y - this.cam.y, color: '#ff9a8a',
      };
    } else if (target) {
      const b = target.cursorBox || boxOf(target);
      prompt = {
        action: 'interact',
        label: this.actionLabel(target),
        color: '#fff0c0',
        left: true,
        x: b.x + b.w + 6 - this.cam.x,
        y: b.y + Math.round(b.h / 2) - 7 - this.cam.y,
      };
    }
    const hints = [];
    if (target) hints.push({ action: 'interact', label: this.verbFor(target) });
    hints.push({ action: 'use', label: this.useLabel() });
    hints.push({ action: 'bag', label: 'Mochila' });
    return { prompt, hintActions: hints, showHotbar: true };
  }

  useLabel() {
    const slot = this.game.inventory[this.game.selectedSlot];
    if (!slot) return 'Usar';
    if (slot.id === 'traje') return this.game.hasSuit ? 'Sacar traje' : 'Poner traje';
    if (slot.id === 'rifle') return this.game.hasRifle ? 'Guardar rifle' : 'Equipar rifle';
    if (slot.id.startsWith('mate_')) return 'Usar mate';
    if (slot.id === 'yerba') return 'Agregar yerba';
    if (slot.id.startsWith('pava_')) return 'Cebar';
    return 'Usar';
  }

  drawHud(input, params) {
    const objective = this.game.objective();
    this.hud.setCamera(this.cam.x, this.cam.y);

    // Pase de luz: debajo del HUD, para que la interfaz nunca se oscurezca.
    this.light.setMode(this.game.lightingMode);
    this.light.setCamera(this.cam.x, this.cam.y);
    this.lightUi.mesh.position.set(this.cam.x + VIEW_W / 2, this.cam.y + VIEW_H / 2, 20);
    this.lightUi.clear();
    this.light.draw(this.lightUi.ctx, this.t, { ...this.player, mateCalma: this.game.mateCalma > 0 });
    this.lightUi.commit();

    this.hud.draw({
      device: input.device,
      objective,
      hasSuit: this.game.hasSuit,
      prompt: params.prompt ?? null,
      showHotbar: params.showHotbar !== false,
      hintActions: params.hintActions ?? null,
      hidden: this.comic.open,
    });

    // Capa extra: termómetro de la pava, barra de tiempo y globos.
    this.extra.mesh.position.set(this.cam.x + VIEW_W / 2, this.cam.y + VIEW_H / 2, 31);
    this.extra.clear();
    const ex = this.extra.ctx;
    if (this.game.pava && this.game.pava.heating) {
      drawThermometer(ex, VIEW_W - 24, 92, this.game.pava.temp);
      drawText(ex, this.game.assets.font.glyphs, VIEW_W - 52, 126, 'pava', '#fff0c0',
        { outline: '#1a1426' });
    }
    this.drawTimedBar(ex);
    if (this.balloon.open) this.balloon.draw(ex, this.cam.x, this.cam.y);
    this.extra.commit();

    if (this.comic.open) {
      this.comicUi.mesh.position.set(this.cam.x + VIEW_W / 2, this.cam.y + VIEW_H / 2, 50);
      this.comicUi.clear();
      this.comic.draw(this.comicUi.ctx);
      this.comicUi.commit();
    }
    if (this.caption.open) {
      this.captionUi.mesh.position.set(this.cam.x + VIEW_W / 2, this.cam.y + VIEW_H / 2, 52);
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
    this.game.showToast(`+${result.added} ${item.name}${extra}`);
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

  interact() {
    if (this.exitWarp) {
      const warp = this.exitWarp;
      if (warp.needsSuit && !this.game.hasSuit) {
        this.openWarning();
        return;
      }
      if (warp.needsFlag && !this.game.flags[warp.needsFlag]) {
        this.game.showToast('Todavía no está todo listo.');
        return;
      }
      this.warpNow(warp);
      return;
    }
    if (!this.target) return;
    const target = this.target;
    if (target.kind === 'npc') {
      this.talkTo(target.npc);
      return;
    }
    if (target.kind === 'container') {
      this.game.openChest(target.container);
      this.cursor.hide();
      this.game.emit('interact', { id: target.id, kind: 'container' });
      return;
    }
    if (target.kind === 'pickup') {
      target.pickup.take();
      return;
    }
    if (target.kind === 'surfaceItem') {
      this.takeSurfaceItem(target);
      return;
    }
    if (target.kind === 'object') {
      const obj = target.ref || target;
      const id = target.id;
      if (id === 'caja_municiones' || target.interact?.kind === 'ammo') {
        this.game.showToast('Las balas se compran en la arena.');
        this.game.emit('interact', { id, kind: 'ammo', obj });
        return;
      }
      if (obj.window) {
        this.game.emit('interact', { id, kind: 'window', obj });
        if (obj.window.view) {
          this.game.openView(obj.window.view, this.name, null, () => {
            this.game.changeScene(this.name, null);
            this.game.emit('viewEnd', { id });
          });
          return;
        }
        if (obj.window.openable) {
          this.closeWindow(obj);
          return;
        }
      }
      if (obj.station === 'heat' && this.game.pavaStation === obj.id) {
        this.takePava();
        return;
      }
      const slot = this.game.inventory[this.game.selectedSlot];
      if (obj.surface && slot) {
        this.dropSelectedOn(obj);
        this.game.emit('interact', { id, kind: 'surface', obj });
        return;
      }
      const entry = talkEntry(obj.interact?.talk, this.game);
      if (entry) {
        this.openDialog(entry, id);
      } else {
        const line = lookLine(id, this.game.flags)
          || obj.description
          || 'No hay nada que ver acá.';
        this.game.showToast(line);
      }
      this.game.emit('interact', { id, kind: 'object', obj });
    }
  }

  closeWindow(obj) {
    const key = `closed_${obj.id}`;
    if (this.game.flags[key]) {
      this.game.showToast('La ventana ya está cerrada.');
      return;
    }
    this.game.flags[key] = true;
    this.game.showToast('Ventana cerrada.');
    this.game.emit('interact', { id: obj.id, kind: 'windowClosed', obj });
  }

  takeSurfaceItem(target) {
    const result = this.surface.take(target, this.game.inventory);
    if (result.count > 0) {
      this.game.inventory = result.inventory;
      const item = getItem(result.itemId);
      const extra = result.count > 1 ? ` x${result.count}` : '';
      this.game.showToast(`+${result.count} ${item.name}${extra}`);
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

  useSelected() {
    const slot = this.game.inventory[this.game.selectedSlot];
    if (!slot) {
      this.game.showToast('No tenés nada en la mano.');
      return;
    }
    if (slot.id === 'traje') {
      this.game.requestEquip();
      return;
    }
    if (slot.id === 'rifle') {
      this.game.hasRifle = !this.game.hasRifle;
      this.player.setRifle(this.game.hasSuit && this.game.hasRifle);
      this.game.showToast(this.game.hasRifle ? 'Rifle listo.' : 'Guardaste el rifle.');
      return;
    }
    const target = this.target;
    if (target && target.kind === 'npc' && slot.id === 'mate_cebado') {
      this.shareMate(target.npc);
      return;
    }
    if (target && target.kind === 'surfaceItem') {
      const station = this.mapData.objects.find((o) => o.id === target.objectId);
      if (station && this.useOnObject(slot.id, station)) return;
    }
    if (target && target.kind === 'object') {
      const obj = target.ref || target;
      if (this.useOnObject(slot.id, obj)) return;
    }
    if (slot.id.startsWith('mate_')) {
      this.useMate(slot.id, target && (target.ref || target));
      return;
    }
    if (slot.id.startsWith('pava_')) {
      this.usePava(slot.id);
      return;
    }
    const item = getItem(slot.id);
    this.game.showToast(`${item.name}: ${item.description}`);
  }

  useOnObject(itemId, obj) {
    if (!obj) return false;
    if (obj.station === 'heat') {
      if (this.game.pavaStation === obj.id) {
        this.takePava();
        return true;
      }
      if (itemId === 'pava_fria' || itemId === 'pava_caliente') {
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
    }
    if (obj.station === 'extractor' && itemId === 'secador') {
      this.game.flags.extractor_ok = true;
      this.game.inventory = removeItem(this.game.inventory, 'secador', 1).slots;
      this.game.showToast('El secador quedó instalado en el extractor.');
      this.game.emit('itemUsed', { id: 'secador', targetId: obj.id, action: 'use' });
      return true;
    }
    if (obj.id === 'generator' && itemId === 'nafta') {
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
    if (obj.window && obj.window.openable && itemId === 'tiras') {
      if (countItem(this.game.inventory, 'tiras') > 0) {
        this.game.inventory = removeItem(this.game.inventory, 'tiras', 1).slots;
        this.closeWindow(obj);
        return true;
      }
    }
    return false;
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

  warpNow(warp) {
    if (!this.canWarp(warp)) return;
    this.game.changeScene(warp.to, warp.spawn);
  }

  /** Para el menú de pausa: pausa solo si no hay dialogo/eleccion. */
  get blocksPause() {
    return this.dialog.open || this.choice.open;
  }
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

export { depthFor, PLAYER_SPEED };
