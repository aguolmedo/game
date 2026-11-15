import * as THREE from 'three';
import { WorldMap, anySprite, cloneMap } from '../mapView.js';
import { Player } from '../player.js';
import { Snowfall } from '../snow.js';
import { Footprints } from '../footprints.js';
import {
  canvasOverlay, regionTexture, depthFor, makeShadow, VIEW_W, VIEW_H,
} from '../sprite.js';
import { drawText, drawCentered, measureText } from '../font.js';
import {
  OUT, INK2, PAR, AM3, SNOW, darkPanel,
} from '../uiSkin.js';
import { drawGlyph, glyphSize } from '../glyphs.js';
import { street } from '../maps/street.js';
import {
  roundConfig, pickType, spawnPoint, nextSpawnDelay, tallyText,
  MIN_SPAWN_DIST, ROUND_BREAK,
} from '../arena/waves.js';
import {
  createWeapon, fire, reload, updateWeapon, buyAmmo, ammoLabel,
  reloadShells,
} from '../arena/weapon.js';
import { shotOrigin } from '../arena/projectiles.js';
import { ShootingFx } from '../arena/feedback.js';
import {
  createPoints, addImpact, addKill, addRound, formatPoints,
} from '../arena/points.js';
import {
  ENEMY_TYPES, createEnemy, applyRound, steer, hitEnemy, updateDeath, patchDrop,
  biteReach, BITE_COOLDOWN, CORPSE_TIME,
} from '../arena/enemies.js';
import { LightOverlay } from '../lighting.js';
import { clearEnemyEntities, clearFxEntities, purgeArena } from '../arena/reset.js';
import { createResultNav, stepResultNav, resultAction, isNewBest } from '../arena/results.js';
import { tallyLayout, drawTally } from '../arena/tally.js';
import { drawDeathPanel } from '../arena/deathPanel.js';
import { drawResultScreen } from '../arena/resultScreen.js';

// 'compra' = caja de municiones; 'infinita' = para pruebas.
export const ARENA = { ammo: 'compra' };

const SHOP_TEXT = '30 balas — 250 puntos';
const SHOP_LABEL = 'Comprar 30 balas — 250 puntos';
const ROUND_BANNER_FIRST = 3; // respiro antes de la ronda 1
const BEST_KEY = 'eternauta.arena.best';
const DIR = {
  down: { x: 0, y: 1 },
  up: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function dirFromVector(dx, dy, last = 'down') {
  if (Math.abs(dx) <= 0.01 && Math.abs(dy) <= 0.01) return last;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

function normalize(x, y) {
  const mag = Math.hypot(x, y);
  if (mag < 1e-6) return null;
  return { x: x / mag, y: y / mag };
}

/** Puntos de aparición de respaldo si H2 todavía no exportó street.spawns. */
function fallbackSpawns(map) {
  const road = 12 * 16 + 8;
  const sidewalk = 8 * 16 + 8;
  const far = (map.cols - 3) * 16;
  return [
    { x: 2 * 16, y: sidewalk },
    { x: far, y: sidewalk },
    { x: 14 * 16, y: sidewalk },
    { x: 28 * 16, y: road },
    { x: 46 * 16, y: road },
    { x: 60 * 16, y: sidewalk },
    { x: 38 * 16, y: road },
    { x: 70 * 16, y: road },
  ];
}

/** Escena del minijuego: calles de Vicente López, rondas de cascarudos. */
export class ArenaScene {
  constructor(game) {
    this.game = game;
    this.assets = game.assets;
    this.name = 'arena';
    this.pausable = true;
    this.scene = new THREE.Scene();

    // La calle se comparte con calle/muerte/final: cada escena necesita sus
    // propios objetos para poder apagar sus luces sin tocar las demas.
    this.mapData = cloneMap(street);
    this.world = new WorldMap(this.scene, this.assets, this.mapData);
    this.player = new Player(this.scene, this.assets, 'juan_suit_rifle');
    this.snow = new Snowfall(this.scene, this.assets.snow, { count: 120, front: 34 });
    this.footprints = new Footprints(this.scene, this.assets.footprint);
    this.ui = canvasOverlay(VIEW_W, VIEW_H, 30);
    this.ui.mesh.visible = false;
    this.scene.add(this.ui.mesh);

    // La arena es la calle después del apagón: solo la nieve brilla (§8).
    if (!this.mapData.lights.some((l) => l.kind === 'snow')) {
      this.mapData.lights.push(
        { x: 240, y: 250, radius: 420, color: '#96e1f0', kind: 'snow',
          flicker: 0.02, state: 'on', onlyIn: 'apagon' },
        { x: 760, y: 250, radius: 420, color: '#96e1f0', kind: 'snow',
          flicker: 0.02, state: 'on', onlyIn: 'apagon' },
        { x: 1180, y: 250, radius: 380, color: '#96e1f0', kind: 'snow',
          flicker: 0.02, state: 'on', onlyIn: 'apagon' },
      );
    }
    this.light = new LightOverlay(this.assets, this.mapData);
    this.lightUi = canvasOverlay(VIEW_W, VIEW_H, 20);
    this.scene.add(this.lightUi.mesh);

    this.t = 0;
    this.cam = { x: 0, y: 0 };
    this.enemies = [];
    this.fx = [];
    this.toasts = [];
    this.frameMats = new Map();
    this.frameGeos = new Map();
    this.fxMats = new Map();
    this.fxGeos = new Map();
    this.prevPad = [];
    this.controls = { fire: false, reload: false, patch: false, buy: false, advance: false };
    this.mouse = { x: 0, y: 0, active: false, down: false };
    this.aim = { x: 0, y: 1 };
    this.best = this.loadBest();
    this.shooting = new ShootingFx(this.scene, this.assets);

    const arena = street.arena || {};
    const bounds = street.bounds || {};
    this.arena = {
      minX: arena.minX ?? 16,
      maxX: arena.maxX ?? (street.cols * 16 - 16),
      minY: arena.minY ?? 7 * 16,
      maxY: arena.maxY ?? (street.rows * 16 - 2),
    };
    this.bounds = {
      minX: this.arena.minX ?? bounds.minX,
      maxX: this.arena.maxX ?? bounds.maxX,
      minFeet: Math.max(bounds.minFeet ?? -Infinity, arena.minY ?? -Infinity),
      maxFeet: Math.min(bounds.maxFeet ?? Infinity, arena.maxY ?? Infinity),
    };
    this.spawns = this.readSpawns();
    this.crate = this.findCrate();
    this.addCrateVisual();
    this.solidBoxes = this.buildSolids();

    // La escena hace de "hud" para game.showToast y para el menú de pausa.
    this.hud = {
      show: () => { this.ui.mesh.visible = true; },
      hide: () => { this.ui.mesh.visible = false; },
      update: () => {},
      toast: (text) => this.toast(text),
    };

    this.bindMouse();
    this.resetRun();
  }

  // ---------------------------------------------------------------- setup

  /** H2 puede exportar spawns como lista o como mapa con nombre. */
  readSpawns() {
    const raw = street.spawns;
    let list = null;
    if (Array.isArray(raw)) list = raw;
    else if (raw && typeof raw === 'object') list = Object.values(raw);
    if (!list || !list.length) list = fallbackSpawns(street);
    return list.map((s) => (
      Array.isArray(s) ? { x: s[0], y: s[1] } : { x: s.x, y: s.y }
    ));
  }

  findCrate() {
    const obj = (this.mapData.objects || []).find((o) => o.id === 'caja_municiones');
    if (obj) {
      const w = (obj.tw || 1) * 16;
      const h = (obj.th || 1) * 16;
      const [ox, oy] = obj.offset || [0, 0];
      const anchorX = (obj.x + obj.tw / 2) * 16 + ox;
      const anchorY = (obj.y + obj.th) * 16 + oy;
      return { x: anchorX - w / 2, y: anchorY - h, w, h, fromMap: true };
    }
    return { x: 68 * 16, y: 8 * 16, w: 16, h: 16, fromMap: false };
  }

  addCrateVisual() {
    // La caja siempre frena a los cascarudos, aunque el mapa no la marque sólida.
    this.world.solids.push({ ...this.crate, id: 'caja_municiones' });
    if (this.crate.fromMap) return;
    const crate = anySprite(this.assets, 'crate');
    crate.position.set(
      Math.round(this.crate.x + this.crate.w / 2),
      Math.round(this.crate.y + this.crate.h / 2),
      depthFor(this.crate.y + this.crate.h),
    );
    this.scene.add(crate);
  }

  buildSolids() {
    const list = this.world.solids.map((s) => ({ x: s.x, y: s.y, w: s.w, h: s.h }));
    const map = this.world.map;
    for (let y = 0; y < map.rows; y++) {
      for (let x = 0; x < map.cols; x++) {
        if (!this.world.solidTile(x, y)) continue;
        list.push({ x: x * 16, y: y * 16, w: 16, h: 16 });
      }
    }
    return list;
  }

  bindMouse() {
    if (typeof window === 'undefined') return;
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.active = true;
    });
    window.addEventListener('mousedown', (e) => {
      if ((e.button ?? 0) === 0) this.mouse.down = true;
    });
    window.addEventListener('mouseup', () => { this.mouse.down = false; });
  }

  startPoint() {
    const arena = street.arena || {};
    if (Number.isFinite(arena.spawnX) && Number.isFinite(arena.spawnY)) {
      return { x: arena.spawnX, y: arena.spawnY };
    }
    return {
      x: Math.round((this.arena.minX + this.arena.maxX) / 2),
      y: 12 * 16 + 8,
    };
  }

  resetRun() {
    // Limpieza total: bichos vivos y cadáveres, balas, vainas, partículas,
    // nieve levantada y huellas. Nada de la run anterior queda en escena.
    purgeArena(this);
    this.player.setFrozen(false);
    this.player.setSuit(true);
    this.player.setRifle(true);
    this.player.mesh.visible = true;
    this.player.shadow.visible = true;
    const start = this.startPoint();
    this.player.place(start.x, start.y, 'down');

    this.weapon = createWeapon({
      infinite: ARENA.ammo === 'infinita',
      reserve: ARENA.ammo === 'infinita' ? 9999 : undefined,
    });
    this.points = createPoints();
    this.round = 1;
    this.cfg = roundConfig(1);
    this.phase = 'banner';
    this.bannerT = ROUND_BANNER_FIRST;
    this.spawned = 0;
    this.spawnTimer = 0;
    this.integrity = 3;
    this.strips = 0;
    this.invuln = 0;
    this.patchT = 0;
    this.recoil = 0;
    this.recoilX = 0;
    this.recoilY = 0;
    this.shake = 0;
    this.dead = false;
    this.deathT = 0;
    this.vignetteOpen = false;
    this.resultOpen = false;
    this.resultSel = 0;
    this.resultT = 0;
    this.newBest = false;
    this.nav = createResultNav();
    this.menuSign = 0;
    this.reloadHintAt = -9;
    this.toasts = [];
    // Estados de flanco: el botón que confirmó "Otra vez" no se arrastra
    // como disparo ni como movimiento del menú.
    this.fireLock = true;
    this.prevPad = [];
    this.controls = {
      fire: false, reload: false, patch: false, buy: false, advance: false,
    };
    this.cam = this.world.cameraFor(this.player.x, this.player.feet - 18);
    this.snow.setCamera(this.cam.x, this.cam.y);
  }

  enter(spawn) {
    this.game.hasSuit = true;
    this.game.flags.apagon = true;
    this.game.setLighting('apagon');
    this.light.setMode('apagon');
    this.world.setDark(true);
    this.ui.mesh.visible = true;
    this.snow.scatter();
    this.footprints.reset();
    this.resetRun();
    if (spawn && Number.isFinite(spawn.x)) {
      this.player.place(spawn.x, spawn.y ?? spawn.feet ?? this.player.feet, spawn.dir || 'down');
      this.cam = this.world.cameraFor(this.player.x, this.player.feet - 18);
    }
  }

  reset() {
    this.world.setDark(Boolean(this.game.flags && this.game.flags.apagon));
    this.resetRun();
    this.snow.scatter();
    this.footprints.reset();
  }

  // -------------------------------------------------------------- input

  readControls(input) {
    const source = this.game.input;
    const keys = (source && source.keys) || new Set();
    const pad = source && source.findPad ? source.findPad() : null;
    const btn = (i) => Boolean(pad && pad.buttons && pad.buttons[i] && pad.buttons[i].pressed);
    const padTap = (i) => btn(i) && !this.prevPad[i];
    const padX = btn(2);
    const padY = btn(3);
    let fire = this.mouse.down || keys.has('Space') || keys.has('KeyJ') || btn(7)
      || Boolean(input.click)
      // Toque corto de Space/Enter/J (el teclado pierde la tecla entre frames).
      || (Boolean(input.aPressed) && input.device === 'keyboard' && !this.nearCrate());
    if (this.fireLock) {
      // Tras reiniciar, esperar a que se suelten los botones de disparo.
      if (fire) fire = false;
      else this.fireLock = false;
    }
    this.controls = {
      fire,
      // R / RB o el botón X del joystick.
      reload: Boolean(input.nextHotbar) || padTap(2),
      // Y / I / Tab (pad) o F (teclado).
      patch: Boolean(input.yPressed) || (Boolean(input.xPressed) && !padX && !padY),
      // A del joystick o E del teclado (Space/Enter están reservados al disparo).
      buy: Boolean(input.aPressed) && !keys.has('Space') && !keys.has('Enter'),
      advance: Boolean(input.aPressed),
    };
    const nextPad = [];
    for (let i = 0; i < 16; i++) nextPad[i] = btn(i);
    this.prevPad = nextPad;
  }

  readAim() {
    const pad = this.game.input && this.game.input.findPad
      ? this.game.input.findPad() : null;
    if (pad && pad.axes) {
      const ax = pad.axes[2] || 0;
      const ay = pad.axes[3] || 0;
      if (Math.hypot(ax, ay) > 0.3) {
        const aim = normalize(ax, ay);
        if (aim) return aim;
      }
    }
    if (this.mouse.active) {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const wx = this.cam.x + ((this.mouse.x - rect.left) / rect.width) * VIEW_W;
          const wy = this.cam.y + ((this.mouse.y - rect.top) / rect.height) * VIEW_H;
          // Se apunta desde el plano del piso (el mismo del tiro).
          const aim = normalize(wx - this.player.x, wy - (this.player.feet - 4));
          if (aim) return aim;
        }
      }
    }
    return DIR[this.player.dir] || DIR.down;
  }

  // -------------------------------------------------------------- update

  update(dt, input) {
    const step = Math.min(0.1, Math.max(0, dt));
    this.t += step;
    this.light.update(step);
    this.shake = Math.max(0, this.shake - step);
    this.updateToasts(step);
    this.readControls(input);
    this.aim = this.readAim();

    if (this.resultOpen) {
      this.updateResult(input, step);
      this.snow.update(step);
      this.snow.setCamera(this.cam.x, this.cam.y);
      this.drawHud(input);
      return;
    }
    if (this.vignetteOpen) {
      this.updateVignette(input, step);
      this.snow.update(step);
      this.snow.setCamera(this.cam.x, this.cam.y);
      this.drawHud(input);
      return;
    }

    if (!this.game.hasSuit) this.game.hasSuit = true;

    this.shooting.update(step, {
      enemies: this.enemies,
      solids: this.solidBoxes,
      view: this.cam,
      player: this.player,
      aim: this.aim,
      weapon: this.weapon,
      input,
      now: this.t,
      onHit: (enemy, damage, bullet) => this.damageEnemy(enemy, damage, bullet),
    });
    // Un bajón congela todo 30 ms: se siente el impacto.
    const wdt = this.shooting.hitStop > 0 ? 0 : step;

    const move = this.patchT > 0 ? { x: 0, y: 0 } : input.move;
    this.player.update(wdt, move, this.world, this.bounds);
    if (this.patchT <= 0 && !this.player.moving) this.faceAim();
    if (this.recoil > 0) {
      this.recoil = Math.max(0, this.recoil - step);
      this.player.mesh.position.x += Math.round(this.recoilX);
      this.player.mesh.position.y += Math.round(this.recoilY);
    }
    this.invuln = Math.max(0, this.invuln - step);
    this.player.mesh.visible = this.invuln > 0
      ? Math.floor(this.t * 10) % 3 !== 0 : true;

    this.snow.update(wdt);
    this.footprints.update(wdt, this.player, true);

    if (updateWeapon(this.weapon, step, this.t).reloaded) this.toast('Rifle recargado');
    if (this.controls.reload) {
      const result = reload(this.weapon, this.t);
      if (!result.ok && result.reason === 'reserve') this.toast('No quedan balas en la reserva.');
      else if (!result.ok && result.reason === 'full') this.toast('El cargador está lleno.');
    }
    if (this.controls.patch) this.tryPatch();
    if (this.controls.buy) this.tryBuy();
    if (this.patchT <= 0 && this.controls.fire) this.tryFire();
    this.updateEnemies(wdt);
    this.updateFx(wdt);
    this.updatePatch(wdt);
    this.updateRound(wdt);
    this.followCamera(step);
    this.snow.setCamera(this.cam.x, this.cam.y);
    this.drawHud(input);
  }

  faceAim() {
    const dir = dirFromVector(this.aim.x, this.aim.y, this.player.dir);
    if (dir === this.player.dir) return;
    this.player.dir = dir;
    this.player.sprite.setDir(dir);
    this.player.draw();
  }

  tryFire() {
    const result = fire(this.weapon, this.t);
    if (result.blocked || result.reloading) return;
    if (result.needReload) {
      // Chasquido en seco: se ve que no salió nada.
      this.shooting.dryFire(shotOrigin(this.player), this.aim);
      if (this.t - this.reloadHintAt > 1.4) {
        this.toast('Cargador vacío: (R) recargar');
        this.reloadHintAt = this.t;
      }
      return;
    }
    if (!result.shots.length) return;

    // Bala visible: viaja, atraviesa un bicho y se frena en la pared.
    this.shooting.fire(shotOrigin(this.player), this.aim, {
      shots: result.shots,
      moving: this.player.moving,
      player: this.player,
      emergency: Boolean(result.emergency),
      isSolid: (box) => this.world.isSolid(box),
    });
    this.recoil = 0.07;
    this.recoilX = -this.aim.x;
    this.recoilY = -this.aim.y;
  }

  /** Daño de una bala (lo llama ShootingFx al chocar). */
  damageEnemy(enemy, damage, bullet) {
    addImpact(this.points);
    const outcome = hitEnemy(enemy, damage);
    if (outcome.dead) {
      addKill(this.points, enemy.type);
      if (patchDrop(enemy.type, Math.random)) {
        this.strips += 1;
        this.toast('+1 tira de goma');
      }
    }
    void bullet;
    return outcome;
  }

  tryPatch() {
    if (this.patchT > 0) return;
    if (this.integrity >= 3) { this.toast('El traje está entero.'); return; }
    if (this.strips <= 0) { this.toast('No hay tiras de goma.'); return; }
    this.patchT = 1.5;
    this.player.setFrozen(true);
    this.toast('Parchando el traje…');
  }

  cancelPatch() {
    if (this.patchT <= 0) return;
    this.patchT = 0;
    this.player.setFrozen(false);
    this.toast('¡Se cortó el parche!');
  }

  updatePatch(dt) {
    if (this.patchT <= 0) return;
    this.patchT -= dt;
    if (this.patchT > 0) return;
    this.patchT = 0;
    this.integrity = Math.min(3, this.integrity + 1);
    this.strips = Math.max(0, this.strips - 1);
    this.player.setFrozen(false);
    this.spawnFx('sparkle', this.player.x, this.player.feet - 16, 0.5, ['sparkle_0', 'sparkle_1']);
    this.toast('Parche puesto (+1 integridad)');
  }

  nearCrate() {
    const cx = this.crate.x + this.crate.w / 2;
    const cy = this.crate.y + this.crate.h;
    return Math.hypot(this.player.x - cx, this.player.feet - cy) < 30;
  }

  tryBuy() {
    if (!this.nearCrate()) return;
    if (ARENA.ammo === 'infinita') { this.toast('Munición infinita.'); return; }
    const result = buyAmmo(this.weapon, this.points.score);
    if (result.ok) {
      this.points.score = result.points;
      this.toast('+30 balas');
    } else {
      this.toast(`Faltan puntos: son 250 (tenés ${this.points.score}).`);
    }
  }

  updateEnemies(dt) {
    const player = { x: this.player.x, feet: this.player.feet };
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (!enemy.dead) {
        steer(enemy, player, this.enemies, this.solidBoxes, dt);
        enemy.x = clamp(enemy.x, this.arena.minX + 6, this.arena.maxX - 6);
        enemy.y = clamp(enemy.y, this.arena.minY + 6, this.arena.maxY - 2);
        enemy.feet = enemy.y;
        const dx = enemy.x - this.player.x;
        const dy = (enemy.y - enemy.h / 2) - (this.player.feet - 10);
        if (Math.hypot(dx, dy) <= biteReach(enemy) && enemy.biteCd <= 0) {
          enemy.biteCd = BITE_COOLDOWN;
          this.bitBy(enemy);
          if (this.vignetteOpen) break;
        }
      } else {
        updateDeath(enemy, dt);
        if (enemy.deathT >= CORPSE_TIME) {
          this.removeEnemy(enemy);
          continue;
        }
      }
      this.updateEnemyVisual(enemy);
    }
  }

  bitBy(enemy) {
    if (this.invuln > 0 || this.vignetteOpen) return;
    this.integrity = Math.max(0, this.integrity - enemy.damage);
    this.invuln = 1;
    this.shake = 0.18;
    this.cancelPatch();
    if (ENEMY_TYPES[enemy.type] && ENEMY_TYPES[enemy.type].push) this.pushPlayer(enemy);
    this.spawnFx('salpicadura', this.player.x, this.player.feet - 10, 0.3);
    if (this.integrity <= 0) this.die();
    else this.toast(`¡Mordida! Integridad ${this.integrity}/3`);
  }

  /** El acorazado empuja a Juan unos píxeles lejos. */
  pushPlayer(enemy) {
    const dx = this.player.x - enemy.x;
    const dy = this.player.feet - enemy.y;
    const mag = Math.hypot(dx, dy) || 1;
    const nx = clamp(this.player.x + (dx / mag) * 6, this.bounds.minX, this.bounds.maxX);
    const nfeet = clamp(this.player.feet + (dy / mag) * 6,
      this.bounds.minFeet, this.bounds.maxFeet);
    const box = { x: nx - 5, y: nfeet - 6, w: 10, h: 6 };
    if (!this.world.isSolid(box)) this.player.place(nx, nfeet, this.player.dir);
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    this.integrity = 0;
    this.phase = 'dead';
    this.vignetteOpen = true;
    this.deathT = 0;
    this.patchT = 0;
    this.player.setFrozen(true);
    this.player.mesh.visible = false;
    this.player.shadow.visible = false;
    this.shake = 0.25;
    this.newBest = isNewBest(this.best, { round: this.round, points: this.points.score });
    this.saveBest();
  }

  updateVignette(input, dt) {
    this.deathT += dt;
    this.updateFx(dt);
    // La viñeta se entinta en 0.4 s; recién ahí acepta "Continuar".
    if (this.deathT > 0.45 && this.controls.advance) this.openResult();
  }

  openResult() {
    this.vignetteOpen = false;
    this.resultOpen = true;
    this.resultT = 0;
    this.resultSel = 0;
    this.nav = createResultNav();
  }

  updateResult(input, dt) {
    this.resultT += dt;
    // stepResultNav exige un flanco y haber soltado la dirección al abrir:
    // el stick no elige por su cuenta ni la selección se dispara sola.
    this.nav = stepResultNav(this.nav, input.menuMove || { x: 0, y: 0 });
    this.resultSel = this.nav.sel;
    if (this.resultT < 0.22) return;
    if (this.controls.advance) {
      if (resultAction(this.nav.sel) === 'retry') this.restart();
      else this.game.changeScene('title');
      return;
    }
    if (input.bPressed || input.startPressed) this.game.changeScene('title');
  }

  restart() {
    this.resultOpen = false;
    this.vignetteOpen = false;
    this.dead = false;
    this.resetRun();
    this.ui.mesh.visible = true;
  }

  // -------------------------------------------------------------- rondas

  startRound(round) {
    this.round = round;
    this.cfg = roundConfig(round);
    this.phase = 'active';
    this.bannerT = 0;
    this.spawned = 0;
    this.spawnTimer = 0.4;
  }

  completeRound() {
    addRound(this.points, this.round);
    this.toast(`Ronda ${this.round} — +${100 * this.round} puntos`);
    this.round += 1;
    this.cfg = roundConfig(this.round);
    this.phase = 'banner';
    this.bannerT = ROUND_BREAK;
    this.spawned = 0;
    this.spawnTimer = 0;
  }

  updateRound(dt) {
    if (this.phase === 'banner') {
      this.bannerT -= dt;
      if (this.bannerT <= 0) this.startRound(this.round);
      return;
    }
    if (this.phase !== 'active') return;
    const alive = this.aliveCount();
    if (this.spawned < this.cfg.total && alive < this.cfg.maxAlive) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        const point = this.pickSpawn();
        const type = pickType(this.round, Math.random);
        this.spawnEnemy(type, point.x, point.y);
        this.spawnTimer = nextSpawnDelay(Math.random);
      }
    }
    if (this.spawned >= this.cfg.total && alive === 0) this.completeRound();
  }

  pickSpawn() {
    const px = this.player.x;
    const py = this.player.feet;
    const near = [];
    for (const point of this.spawns) {
      const d = Math.hypot(point.x - px, point.y - py);
      if (d < MIN_SPAWN_DIST || d > 380) continue;
      const box = { x: point.x - 4, y: point.y - 6, w: 8, h: 6 };
      if (this.world.isSolid(box)) continue;
      near.push(point);
    }
    if (near.length) return { ...near[Math.floor(Math.random() * near.length)] };

    const picked = spawnPoint(Math.random, this.spawns, { x: px, feet: py });
    if (picked && !this.world.isSolid({ x: picked.x - 4, y: picked.y - 6, w: 8, h: 6 })) {
      return picked;
    }
    const side = px < (this.arena.minX + this.arena.maxX) / 2 ? 1 : -1;
    return {
      x: clamp(px + side * 160, this.arena.minX + 12, this.arena.maxX - 12),
      y: clamp(12 * 16 + 8, this.arena.minY + 8, this.arena.maxY - 4),
    };
  }

  spawnEnemy(type, x, y) {
    const enemy = createEnemy(type, x, y, Math.random);
    applyRound(enemy, this.cfg.hpMul, this.cfg.speedMul);
    this.enemies.push(enemy);
    enemy.vis = this.makeEnemyVisual(enemy);
    this.spawned += 1;
    this.spawnFx('salpicadura', x, y - 4, 0.3);
    return enemy;
  }

  aliveCount() {
    let count = 0;
    for (const enemy of this.enemies) if (!enemy.dead) count += 1;
    return count;
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

  applyCamera(camera) {
    const kick = this.shooting.shakeOffset(this.t);
    const sx = (this.shake > 0 ? Math.round(Math.sin(this.t * 120)) : 0) + kick.x;
    const sy = (this.shake > 0 ? Math.round(Math.cos(this.t * 97)) : 0) + kick.y;
    camera.left = this.cam.x + sx;
    camera.right = this.cam.x + VIEW_W + sx;
    camera.top = this.cam.y + sy;
    camera.bottom = this.cam.y + VIEW_H + sy;
    camera.updateProjectionMatrix();
  }

  // -------------------------------------------------------------- enemigos

  makeEnemyVisual(enemy) {
    const key = `${enemy.type}:${enemy.dir}:0`;
    const mesh = new THREE.Mesh(this.enemyGeometry(enemy.type), this.enemyMaterial(key));
    mesh.position.z = depthFor(enemy.y);
    this.scene.add(mesh);
    const shadow = makeShadow(this.scene, this.assets.shadow,
      Math.round(enemy.w * 0.7), 4);
    shadow.material.opacity = 0.55;
    return { mesh, shadow, key };
  }

  enemyGeometry(type) {
    if (!this.frameGeos.has(type)) {
      const def = ENEMY_TYPES[type] || ENEMY_TYPES.cascarudo;
      this.frameGeos.set(type, new THREE.PlaneGeometry(def.w, def.h));
    }
    return this.frameGeos.get(type);
  }

  enemyMaterial(frameName) {
    if (this.frameMats.has(frameName)) return this.frameMats.get(frameName);
    const frame = this.assets.cascarudosData.frames[frameName];
    if (!frame) throw new Error(`Falta el cuadro ${frameName} en cascarudos.json`);
    const texture = regionTexture(this.assets.cascarudos, frame[0], frame[1], frame[2], frame[3]);
    const material = new THREE.MeshBasicMaterial({
      map: texture, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide,
    });
    this.frameMats.set(frameName, material);
    return material;
  }

  enemyFrameKey(enemy) {
    if (enemy.dead) {
      const step = Math.min(2, Math.floor(enemy.deathT / 0.08));
      return `${enemy.type}:death:${step}`;
    }
    if (enemy.hitT > 0) return `${enemy.type}:hit`;
    return `${enemy.type}:${enemy.dir}:${Math.floor(enemy.animT * 8) % 4}`;
  }

  updateEnemyVisual(enemy) {
    const visual = enemy.vis;
    if (!visual) return;
    const key = this.enemyFrameKey(enemy);
    if (key !== visual.key) {
      visual.mesh.material = this.enemyMaterial(key);
      visual.key = key;
    }
    const x = Math.round(enemy.x);
    const feet = Math.round(enemy.y);
    visual.mesh.position.set(x, feet - enemy.h / 2, depthFor(feet));
    visual.shadow.position.set(x, feet - 1, depthFor(feet) - 0.001);
  }

  removeEnemy(enemy) {
    if (enemy.vis) {
      this.scene.remove(enemy.vis.mesh);
      this.scene.remove(enemy.vis.shadow);
      enemy.vis = null;
    }
    const index = this.enemies.indexOf(enemy);
    if (index >= 0) this.enemies.splice(index, 1);
  }

  clearEnemies() {
    clearEnemyEntities(this.scene, this.enemies);
  }

  // -------------------------------------------------------------- fx

  fxMaterial(name) {
    if (this.fxMats.has(name)) return this.fxMats.get(name);
    const frame = this.assets.fxData.frames[name];
    if (!frame) throw new Error(`Falta el efecto ${name} en fx.json`);
    const texture = regionTexture(this.assets.fx, frame[0], frame[1], frame[2], frame[3]);
    const material = new THREE.MeshBasicMaterial({
      map: texture, transparent: true, alphaTest: 0.3, depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.fxMats.set(name, material);
    return material;
  }

  fxGeometry(name) {
    if (this.fxGeos.has(name)) return this.fxGeos.get(name);
    const frame = this.assets.fxData.frames[name];
    const geometry = new THREE.PlaneGeometry(frame[2], frame[3]);
    this.fxGeos.set(name, geometry);
    return geometry;
  }

  spawnFx(name, x, y, life = 0.12, frames = null) {
    const first = frames ? frames[0] : name;
    const mesh = new THREE.Mesh(this.fxGeometry(first), this.fxMaterial(first));
    mesh.position.set(Math.round(x), Math.round(y), depthFor(y) + 0.02);
    this.scene.add(mesh);
    this.fx.push({ mesh, key: first, frames, life, max: life, t: 0 });
  }

  updateFx(dt) {
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const item = this.fx[i];
      item.t += dt;
      item.life -= dt;
      if (item.frames) {
        const index = Math.min(item.frames.length - 1,
          Math.floor((item.t / Math.max(0.001, item.max)) * item.frames.length));
        const key = item.frames[index];
        if (key !== item.key) {
          item.key = key;
          item.mesh.material = this.fxMaterial(key);
        }
      }
      if (item.life <= 0) {
        this.scene.remove(item.mesh);
        this.fx.splice(i, 1);
      }
    }
  }

  clearFx() {
    clearFxEntities(this.scene, this.fx);
  }

  // -------------------------------------------------------------- UI

  toast(text) {
    this.toasts.push({ text, life: 2.4 });
    if (this.toasts.length > 3) this.toasts.shift();
  }

  updateToasts(dt) {
    for (const toast of this.toasts) toast.life -= dt;
    this.toasts = this.toasts.filter((toast) => toast.life > 0);
  }

  drawHud(input) {
    // Pase de luz debajo del HUD.
    this.light.setMode(this.game.flags.apagon ? 'apagon' : 'electrica');
    this.light.setCamera(this.cam.x, this.cam.y);
    this.lightUi.mesh.position.set(this.cam.x + VIEW_W / 2, this.cam.y + VIEW_H / 2, 20);
    this.lightUi.clear();
    this.light.draw(this.lightUi.ctx, this.t, this.player);
    this.shooting.drawMuzzleLight(this.lightUi.ctx, this.cam);
    this.lightUi.commit();

    const { ctx } = this.ui;
    this.ui.mesh.visible = true;
    this.ui.mesh.position.set(this.cam.x + VIEW_W / 2, this.cam.y + VIEW_H / 2, 30);
    this.ui.clear();
    const device = input.device || 'keyboard';

    if (!this.resultOpen && !this.vignetteOpen) {
      this.drawShopSign(ctx);
      this.drawTop(ctx);
      this.drawBottom(ctx);
      this.shooting.drawAimLine(ctx, this.player, this.aim, this.cam, input);
      this.drawCrosshair(ctx);
      this.drawHints(ctx, device);
      this.drawPatchBar(ctx);
      this.drawToasts(ctx);
      if (this.phase === 'banner') this.drawBanner(ctx);
      if (this.weapon.mag <= 0 && this.weapon.reserve <= 0
        && Math.floor(this.t * 2.5) % 2 === 0) {
        drawCentered(ctx, this.assets.font.glyphs, '¡Sin balas!', 44, '#ff9a8a',
          { outline: OUT, scale: 2 });
      }
    }
    if (this.vignetteOpen) this.drawVignette(ctx, device);
    if (this.resultOpen) this.drawResult(ctx, device);
    this.ui.commit();
  }

  drawTop(ctx) {
    const glyphs = this.assets.font.glyphs;
    const tally = tallyText(this.round);
    const gap = 3;
    const tallyW = tally.full * (4 * gap + 3) + tally.rest * gap;
    const rw = Math.max(46, tallyW + 18);
    darkPanel(ctx, 6, 5, rw, 27, 0.7);
    drawText(ctx, glyphs, 10, 8, 'RONDA', AM3, { outline: OUT });
    drawTally(ctx, this.round, 6 + Math.round(rw / 2), 21, 10, PAR, '#080810');

    const text = formatPoints(this.points.score);
    const tw = measureText(glyphs, text);
    const pw = Math.max(60, tw + 24);
    const px = VIEW_W - 6 - pw;
    darkPanel(ctx, px, 5, pw, 27, 0.7);
    drawText(ctx, glyphs, px + 6, 8, 'PUNTOS', AM3, { outline: OUT });
    drawText(ctx, glyphs, px + pw - 6 - tw, 15, text, PAR, { outline: OUT });
  }

  drawBottom(ctx) {
    const glyphs = this.assets.font.glyphs;
    // Integridad y tiras de goma.
    darkPanel(ctx, 6, VIEW_H - 34, 92, 28, 0.7);
    drawText(ctx, glyphs, 10, VIEW_H - 31, 'TRAJE', AM3, { outline: OUT });
    for (let i = 0; i < 3; i++) this.drawPatchIcon(ctx, 10 + i * 12, VIEW_H - 21, i < this.integrity);
    drawText(ctx, glyphs, 52, VIEW_H - 31, 'TIRAS', AM3, { outline: OUT });
    drawText(ctx, glyphs, 56, VIEW_H - 20, `x${this.strips}`, this.strips > 0 ? PAR : INK2,
      { outline: OUT });

    // Munición: 5 casquillos + reserva.
    const pw = 96;
    const px = VIEW_W - 6 - pw;
    darkPanel(ctx, px, VIEW_H - 34, pw, 28, 0.7);
    drawText(ctx, glyphs, px + 5, VIEW_H - 31, 'MUNICIÓN', AM3, { outline: OUT });
    const loaded = this.weapon.mag + (this.weapon.reloading
      ? reloadShells(this.weapon, this.t) : 0);
    for (let i = 0; i < this.weapon.magSize; i++) {
      this.drawShell(ctx, px + 6 + i * 7, VIEW_H - 20, i < loaded);
    }
    const reserve = this.weapon.infinite ? 'INF' : String(this.weapon.reserve);
    const rw = measureText(glyphs, reserve);
    drawText(ctx, glyphs, px + pw - 6 - rw, VIEW_H - 20, reserve, PAR, { outline: OUT });
    if (this.weapon.reloading) {
      const progress = Math.round((loaded / this.weapon.magSize) * 16);
      ctx.fillStyle = 'rgba(255, 207, 110, 0.25)';
      ctx.fillRect(px + 4, VIEW_H - 8, 16, 1);
      ctx.fillStyle = AM3;
      ctx.fillRect(px + 4, VIEW_H - 8, progress, 1);
    }
  }

  drawPatchIcon(ctx, x, y, on) {
    ctx.fillStyle = on ? '#2a1a14' : 'rgba(26, 20, 38, 0.5)';
    ctx.fillRect(x, y, 9, 9);
    if (on) {
      ctx.fillStyle = '#8a4a2e';
      ctx.fillRect(x + 1, y + 1, 7, 7);
      ctx.fillStyle = '#c0703e';
      ctx.fillRect(x + 1, y + 1, 7, 2);
      ctx.fillStyle = '#3a2030';
      ctx.fillRect(x + 3, y + 3, 3, 1);
      ctx.fillRect(x + 3, y + 5, 3, 1);
    } else {
      ctx.fillStyle = 'rgba(120, 100, 110, 0.35)';
      ctx.fillRect(x + 1, y + 1, 7, 7);
    }
  }

  drawShell(ctx, x, y, filled) {
    ctx.fillStyle = filled ? '#3a2a18' : 'rgba(26, 20, 38, 0.55)';
    ctx.fillRect(x, y, 4, 10);
    if (filled) {
      ctx.fillStyle = '#c8a24a';
      ctx.fillRect(x + 1, y + 1, 2, 7);
      ctx.fillStyle = '#f0d488';
      ctx.fillRect(x + 1, y + 1, 1, 2);
      ctx.fillStyle = '#8a5a2a';
      ctx.fillRect(x + 1, y + 8, 2, 1);
    }
  }

  drawCrosshair(ctx) {
    const cx = Math.round(this.player.x - this.cam.x + this.aim.x * 24);
    const cy = Math.round(this.player.feet - 10 - this.cam.y + this.aim.y * 24);
    ctx.fillStyle = 'rgba(10, 10, 20, 0.75)';
    ctx.fillRect(cx - 3, cy, 7, 1);
    ctx.fillRect(cx, cy - 3, 1, 7);
    ctx.fillStyle = SNOW;
    ctx.fillRect(cx - 2, cy, 5, 1);
    ctx.fillRect(cx, cy - 2, 1, 5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx, cy, 1, 1);
  }

  drawHints(ctx, device) {
    const pad = device === 'pad';
    const items = [
      [pad ? 'rt' : 'key_space', 'Disparar'],
      [pad ? 'x' : 'key_r', 'Recargar'],
      [pad ? 'y' : 'key_f', 'Parche'],
    ];
    if (this.nearCrate() && ARENA.ammo !== 'infinita') {
      items.push([pad ? 'a' : 'key_e', 'Comprar']);
    }
    const widths = items.map(([glyph, label]) => (
      glyphSize(this.assets, glyph).w + 3 + measureText(this.assets.font.glyphs, label)
    ));
    const total = widths.reduce((a, b) => a + b, 0) + (items.length - 1) * 8;
    let x = Math.round((VIEW_W - total) / 2);
    const y = VIEW_H - 13;
    darkPanel(ctx, x - 6, y - 3, total + 12, 13, 0.62);
    items.forEach(([glyph, label], i) => {
      const size = drawGlyph(ctx, this.assets, glyph, x, y);
      drawText(ctx, this.assets.font.glyphs, x + size.w + 3, y + 2, label, PAR,
        { outline: OUT });
      x += widths[i] + 8;
    });
  }

  drawPatchBar(ctx) {
    if (this.patchT <= 0) return;
    const x = Math.round(this.player.x - this.cam.x);
    const y = Math.round(this.player.feet - 36 - this.cam.y);
    const progress = 1 - this.patchT / 1.5;
    darkPanel(ctx, x - 14, y, 28, 5, 0.8);
    ctx.fillStyle = AM3;
    ctx.fillRect(x - 13, y + 1, Math.round(26 * progress), 3);
  }

  drawToasts(ctx) {
    const glyphs = this.assets.font.glyphs;
    this.toasts.forEach((toast, i) => {
      const alpha = Math.min(1, toast.life / 0.5);
      const w = measureText(glyphs, toast.text) + 16;
      const x = Math.round((VIEW_W - w) / 2);
      const y = 26 + i * 14;
      ctx.globalAlpha = Math.max(0.15, alpha);
      darkPanel(ctx, x, y, w, 13, 0.85);
      drawText(ctx, glyphs, x + 8, y + 3, toast.text, PAR, { outline: OUT });
      ctx.globalAlpha = 1;
    });
  }

  drawBanner(ctx) {
    const glyphs = this.assets.font.glyphs;
    const tally = tallyLayout(this.round, 42);
    const bw = Math.max(160, Math.min(420, tally.width + 76));
    const bh = 94;
    const bx = Math.round((VIEW_W - bw) / 2);
    const by = 58;
    // Cartucho de papel con los palotes en tinta, como en el cómic.
    ctx.fillStyle = OUT;
    ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
    ctx.fillStyle = '#d8c294';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = '#f2e6c4';
    ctx.fillRect(bx + 2, by + 2, bw - 4, bh - 4);
    ctx.fillStyle = '#c9ac7c';
    ctx.fillRect(bx + 2, by + bh - 4, bw - 4, 2);
    drawCentered(ctx, glyphs, 'RONDA', by + 10, '#8a3a20');
    drawTally(ctx, this.round, VIEW_W / 2, by + 52, 42, '#2a1a20', '#c9ac7c');
    drawCentered(ctx, glyphs, 'Preparate', by + bh - 13, '#6a4a30');
  }

  drawShopSign(ctx) {
    const glyphs = this.assets.font.glyphs;
    const sx = Math.round(this.crate.x + this.crate.w / 2 - this.cam.x);
    const sy = Math.round(this.crate.y - this.cam.y);
    if (sx < -80 || sx > VIEW_W + 80 || sy < -30 || sy > VIEW_H + 30) return;
    const w = measureText(glyphs, SHOP_TEXT) + 10;
    const x = Math.round(sx - w / 2);
    darkPanel(ctx, x, sy - 16, w, 14, 0.8);
    drawText(ctx, glyphs, x + 5, sy - 13, SHOP_TEXT, AM3, { outline: OUT });

    if (this.nearCrate() && ARENA.ammo !== 'infinita') {
      const label = SHOP_LABEL;
      const lw = measureText(glyphs, label) + 20;
      const lx = clamp(Math.round(sx - lw / 2), 4, VIEW_W - lw - 4);
      darkPanel(ctx, lx, sy - 36, lw, 16, 0.84);
      const glyph = this.game.input.device === 'pad' ? 'a' : 'key_e';
      const size = drawGlyph(ctx, this.assets, glyph, lx + 5, sy - 32);
      drawText(ctx, glyphs, lx + 8 + size.w, sy - 32, label, PAR, { outline: OUT });
    }
  }

  drawVignette(ctx, device) {
    drawDeathPanel(ctx, this.assets, { t: this.deathT, device });
  }

  drawResult(ctx, device) {
    drawResultScreen(ctx, this.assets, {
      round: this.round,
      kills: this.points.kills,
      points: this.points.score,
      best: this.best,
      newBest: this.newBest,
      sel: this.nav ? this.nav.sel : this.resultSel,
      device,
      fade: this.resultT,
    }, this.resultT);
  }

  // -------------------------------------------------------------- best

  loadBest() {
    try {
      const raw = window.localStorage.getItem(BEST_KEY);
      if (!raw) return { round: 0, points: 0 };
      const parsed = JSON.parse(raw);
      return {
        round: Math.max(0, Math.floor(Number(parsed.round) || 0)),
        points: Math.max(0, Math.floor(Number(parsed.points) || 0)),
      };
    } catch {
      return { round: 0, points: 0 };
    }
  }

  saveBest() {
    try {
      const next = {
        round: Math.max(this.best.round, this.round),
        points: Math.max(this.best.points, this.points.score),
      };
      window.localStorage.setItem(BEST_KEY, JSON.stringify(next));
      this.best = next;
    } catch {
      // sin localStorage: la partida sigue igual
    }
  }

  // -------------------------------------------------------------- debug/QA

  state() {
    const alive = this.aliveCount();
    return {
      round: this.round,
      kills: this.points.kills,
      points: this.points.score,
      integrity: this.integrity,
      strips: this.strips,
      ammo: {
        mag: this.weapon.mag,
        reserve: this.weapon.reserve,
        label: ammoLabel(this.weapon),
      },
      alive,
      enemies: alive,
      enemyCount: this.enemies.length,
      corpses: this.enemies.filter((e) => e.dead).length,
      fx: this.fx.length,
      footprints: this.footprints.items.length,
      shots: this.shooting.count(),
      phase: this.phase,
      dead: this.dead,
      resultOpen: this.resultOpen,
      vignetteOpen: this.vignetteOpen,
      resultSel: this.nav ? this.nav.sel : this.resultSel,
      newBest: this.newBest,
      fireLock: Boolean(this.fireLock),
    };
  }

  debugSetRound(round) {
    this.clearEnemies();
    this.round = Math.max(1, Math.floor(Number(round) || 1));
    this.cfg = roundConfig(this.round);
    this.phase = 'active';
    this.bannerT = 0;
    this.spawned = 0;
    this.spawnTimer = 0;
    this.dead = false;
    this.vignetteOpen = false;
    this.resultOpen = false;
    this.integrity = 3;
    this.invuln = 0;
    this.patchT = 0;
    this.player.setFrozen(false);
    const count = Math.min(this.cfg.maxAlive, 6);
    for (let i = 0; i < count; i++) {
      const point = this.pickSpawn();
      const type = i === 0 && this.cfg.armoredPct > 0
        ? 'acorazado' : pickType(this.round, Math.random);
      this.spawnEnemy(type, point.x, point.y);
    }
    this.spawnTimer = 0.7;
  }

  debugSpawn(type = 'cascarudo') {
    const point = this.pickSpawn();
    const enemy = this.spawnEnemy(type, point.x, point.y);
    return enemy.type;
  }

  debugAddPoints(amount) {
    this.points.score += Math.max(0, Math.floor(Number(amount) || 0));
    return this.points.score;
  }

  get blocksPause() { return this.resultOpen || this.vignetteOpen; }
  get dialog() { return { open: false }; }
  get choice() { return { open: false }; }
}
