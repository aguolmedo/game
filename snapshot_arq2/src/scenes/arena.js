import * as THREE from 'three';
import { Player } from '../player.js';
import { Snowfall } from '../snow.js';
import { Footprints } from '../footprints.js';
import { canvasOverlay, VIEW_W, VIEW_H } from '../sprite.js';
import { loadSave } from '../run/save.js';
import { seedFor, handFromSeed, handText } from '../run/seed.js';
import { rngFromSeed } from '../run/rng.js';
import { emptyBag } from '../run/loot.js';
import { ShootingFx } from '../arena/feedback.js';
import { updateWeapon, reload } from '../arena/weapon.js';
import { runEffects } from '../arena/effectsRun.js';
import { createRunState, STATE_FIELDS } from '../arena/runState.js';
import { setMode, forceMode, isOverlay, phaseOf } from '../arena/runMode.js';

// La escena queda como FACHADA: cada módulo de src/arena/ exporta funciones
// que reciben la escena como primer argumento y acá se cuelgan del prototipo
// con el mismo nombre de método, así la API pública no cambia.
import * as inputScene from '../arena/inputScene.js';
import * as runSetup from '../arena/runSetup.js';
import * as worldScene from '../arena/worldScene.js';
import * as lootScene from '../arena/lootScene.js';
import * as consumablesScene from '../arena/consumablesScene.js';
import * as combatScene from '../arena/combatScene.js';
import * as wavesScene from '../arena/wavesScene.js';
import * as resultFlow from '../arena/resultFlow.js';
import * as enemyVisuals from '../arena/enemyVisuals.js';
import * as fxScene from '../arena/fxScene.js';
import * as hudArena from '../arena/hudArena.js';
import * as debugScene from '../arena/debugScene.js';

// forceMode espera algo con .state: crea el state si la escena todavía no lo tiene.
function stateHolder(scene) {
  stateOf(scene);
  return scene;
}

function stateOf(scene) {
  return scene.state || (scene.state = createRunState());
}

// Los materiales por frame comparten la textura del atlas: solo se libera el material.
function disposeCache(cache) {
  for (const item of cache.values()) item.dispose();
  cache.clear();
}

export { ARENA } from '../arena/config.js';

const MODULES = [
  inputScene, runSetup, worldScene, lootScene, consumablesScene, combatScene,
  wavesScene, resultFlow, enemyVisuals, fxScene, hudArena, debugScene,
];

/** Escena de la salida del roguelike: el barrio por semilla y rondas de cascarudos. */
export class ArenaScene {
  constructor(game) {
    this.game = game;
    this.assets = game.assets;
    this.name = 'arena';
    // Estado de la corrida sin Three (ver arena/runState.js).
    this.state = createRunState();
    this.pausable = true;
    // La salida necesita ver el campo para disparar: zoom 1 (T2).
    this.worldZoom = false;
    this.scene = new THREE.Scene();
    // Capa de UI fija en pantalla: se dibuja con uiCamera (no viaja con el mundo).
    this.uiScene = new THREE.Scene();

    this.player = new Player(this.scene, this.assets, 'juan_suit_rifle');
    this.snow = new Snowfall(this.scene, this.assets.snowFlakes, { count: 120, front: 34 });
    this.footprints = new Footprints(this.scene, this.assets.footprint);
    this.ui = canvasOverlay(VIEW_W, VIEW_H, 30);
    this.ui.mesh.visible = false;
    this.uiScene.add(this.ui.mesh);

    // La noche del apagón: un velo y los charcos de luz de la nieve.
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
    this.itemMats = new Map();
    this.itemGeos = new Map();
    this.prevPad = [];
    this.prevKeys = new Set();
    this.controls = {
      fire: false, reload: false, patch: false, buy: false, advance: false,
      home: false, bengala: false, botella: false,
    };
    this.mouse = { x: 0, y: 0, active: false, down: false };
    this.aim = { x: 0, y: 1 };
    this.shooting = new ShootingFx(this.scene, this.assets);
    this.state.bullets = this.shooting.bullets; // mismo array: la vista dibuja lo que simula el state
    // Buffers reutilizados cada cuadro (sin asignaciones en el loop).
    this.nextKeys = new Set();
    this.nextPad = [];
    this.aimBuf = { x: 0, y: 1 };
    this.fireArgs = { mouseDown: false, click: false, keyboardFire: false, nearCrate: false };
    this.consArgs = {
      slot: -1, lb: false, rb: false, bengalas: 0, molotovs: 0, keyR: false, padX: false,
    };
    this.consOut = { bengala: false, botella: false, reload: false };
    this.steerOut = { x: 0, y: 0, dir: 'down' };
    this.playerPoint = { x: 0, feet: 0 };
    this.lootOut = { bag: null, taken: [], takenItems: [], left: [] };

    // Estado que arma buildWorld() a partir del mapa.
    this.world = null;
    this.mapData = null;
    this.cells = [];
    this.seedBuilt = null;
    this.arena = { minX: 0, maxX: 1280, minY: 0, maxY: 640 };
    this.bounds = { minX: 0, maxX: 1280, minFeet: 0, maxFeet: 638 };
    this.spawns = [];
    this.crate = null;
    this.solidBoxes = [];
    // Flow field por tamaño de bicho: máscara base y máscara ancha (acorazado).
    this.flows = null;
    this.flowMasks = null;
    this.flowTile = { x: -1, y: -1 };
    this.flowT = 0;
    this.snowLights = [];
    this.dynamicLights = [];
    this.exitHome = null;
    this.light = null;

    // Estado de la salida (botín, mochila, consumibles, sobreviviente).
    this.bag = emptyBag();
    this.groundLoot = [];
    this.mochila = null;
    this.survivor = null;
    this.bengala = null;
    this.fires = [];
    this.items = { bengalas: 0, molotovs: 0 };
    this.farolLight = null;

    // Save y mejoras: en el minijuego solitario se lee el guardado y se arma
    // una semilla nueva; el flujo real (worker E) pasa game.run.
    this.save = loadSave();
    this.best = this.bestFromSave(this.save); // M12: un solo récord, en el save
    this.eff = runEffects(this.save);
    this.loop = Math.max(1, (Number(this.save.loop) || 0) + 1);
    this.seed = seedFor(0);
    this.rng = rngFromSeed((this.seed ^ 0x9e3779b9) >>> 0);
    // Tiradas de las rondas: rng sembrado explícito. Al entrar, setupRun lo
    // vuelve a armar con la semilla de la salida (o seedFor(Date.now()) en el
    // Minijuego); la semilla queda en roundSeed para poder reproducirla.
    this.roundSeed = seedFor(Date.now() % 100000);
    this.roundRng = rngFromSeed((this.roundSeed ^ 0x5eed) >>> 0);
    this.shotRng = rngFromSeed((this.roundSeed ^ 0x5407) >>> 0);
    this.hand = handText(handFromSeed(this.seed)).replace(/ · /g, ' / ');

    // La escena hace de "hud" para game.showToast y para el menú de pausa.
    this.hud = {
      show: () => { this.ui.mesh.visible = true; },
      hide: () => { this.ui.mesh.visible = false; },
      update: () => {},
      toast: (text, opts) => this.toast(text, opts && opts.life),
    };

    this.bindMouse();

    // Mundo de arranque: permite resetear la escena aunque todavía no se haya
    // entrado (game.newGame resetea todas las escenas).
    this.seedBuilt = this.seed;
    this.rebuildWorld(this.seed);
    this.resetRun();
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

    if (this.mode === 'result') {
      this.updateResult(input, step);
      this.snow.update(step);
      this.snow.setCamera(this.cam.x, this.cam.y);
      this.drawHud(input);
      return;
    }
    if (this.mode === 'dying') {
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
      onHit: (enemy, damage) => this.damageEnemy(enemy, damage),
    });
    // Un bajón congela todo 30 ms: se siente el impacto.
    const wdt = this.shooting.hitStop > 0 ? 0 : step;

    const move = this.patchT > 0 ? { x: 0, y: 0 } : input.move;
    this.player.update(wdt, move, this.world, this.bounds);
    if (!this.nearHome()) this.exitArmed = true;
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
    if (this.controls.bengala) this.useBengala();
    if (this.controls.botella) this.useBotella();
    if (this.controls.home) this.goHome();
    if (this.patchT <= 0 && this.controls.fire) this.tryFire();
    this.updateEnemies(wdt);
    this.updateLoot(wdt);
    this.updateConsumables(wdt);
    this.updateFx(wdt);
    this.updatePatch(wdt);
    this.updateRound(wdt);
    if (this.farolLight) {
      this.farolLight.x = this.player.x;
      this.farolLight.y = this.player.feet;
    }
    this.followCamera(step);
    this.snow.setCamera(this.cam.x, this.cam.y);
    this.drawHud(input);
  }

  // ------------------------------------------------------- ciclo de vida

  /** La escena deja de ser la activa: suelta entradas y oculta la UI, sin destruir nada. */
  leave() {
    this.controls = { ...this.controls, fire: false, reload: false, patch: false, buy: false,
      advance: false, home: false, bengala: false, botella: false };
    this.mouse.down = false;
    this.prevKeys.clear();
    this.prevPad.length = 0;
    this.toasts.length = 0;
    this.ui.mesh.visible = false;
  }

  /** Libera geometrías, materiales y canvas. Después de esto la escena no se usa más. */
  dispose() {
    this.leave();
    this.disposeWorld();
    this.shooting.dispose();
    if (this.enemies) this.enemies.length = 0;
    for (const cache of [this.frameMats, this.fxMats, this.itemMats]) disposeCache(cache);
    for (const cache of [this.frameGeos, this.fxGeos, this.itemGeos]) disposeCache(cache);
    for (const overlay of [this.ui, this.lightUi]) {
      this.scene.remove(overlay.mesh);
      this.uiScene.remove(overlay.mesh);
      overlay.mesh.geometry.dispose();
      if (overlay.mesh.material.map) overlay.mesh.material.map.dispose();
      overlay.mesh.material.dispose();
    }
  }

  // -------------------------------------------------------------- cámara

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
    this.lightPass();
    const kick = this.shooting.shakeOffset(this.t);
    const sx = (this.shake > 0 ? Math.round(Math.sin(this.t * 120)) : 0) + kick.x;
    const sy = (this.shake > 0 ? Math.round(Math.cos(this.t * 97)) : 0) + kick.y;
    camera.left = this.cam.x + sx;
    camera.right = this.cam.x + VIEW_W + sx;
    camera.top = this.cam.y + sy;
    camera.bottom = this.cam.y + VIEW_H + sy;
    camera.updateProjectionMatrix();
  }

  // -------------------------------------------------------------- pausa

  // Modo único (ver arena/runMode.js). Los accesores viejos quedan derivados.
  get mode() { return stateOf(this).mode; }
  setMode(next) { setMode(this, next); }
  get phase() { return phaseOf(this.mode); }
  set phase(v) { forceMode(stateHolder(this), v === 'dead' ? 'dying' : v); }
  get vignetteOpen() { return this.mode === 'dying'; }
  set vignetteOpen(v) { this.forceFlag('dying', v); }
  get resultOpen() { return this.mode === 'result'; }
  set resultOpen(v) { this.forceFlag('result', v); }
  get dead() { return isOverlay(this.mode); }
  set dead(v) { if (v && !this.dead) forceMode(stateHolder(this), 'dying'); else if (!v && this.dead) forceMode(stateHolder(this), 'active'); }
  get blocksPause() { return isOverlay(this.mode); }
  // Compatibilidad: tools/tests asignan las banderas viejas.
  forceFlag(mode, on) {
    if (on) forceMode(stateHolder(this), mode);
    else if (this.mode === mode) forceMode(stateHolder(this), 'active');
  }
  get dialog() { return { open: false }; }
  get choice() { return { open: false }; }
}

// Cuelga cada función de módulo como método de la escena. Las funciones usan
// el primer argumento (la escena), no `this` ni herencia.
for (const mod of MODULES) {
  for (const [name, fn] of Object.entries(mod)) {
    if (typeof fn !== 'function') continue;
    ArenaScene.prototype[name] = function facade(...args) {
      return fn(this, ...args);
    };
  }
}

// Campos de la corrida: viven en scene.state; la escena los expone como accesores.
for (const field of STATE_FIELDS) {
  Object.defineProperty(ArenaScene.prototype, field, {
    get() { return stateOf(this)[field]; },
    set(value) { stateOf(this)[field] = value; },
    configurable: true,
  });
}
