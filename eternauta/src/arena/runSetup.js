// Ciclo de vida de una salida: armar la partida desde game.run/save, el
// mundo por semilla, entrar, resetear y limpiar. Funciones que reciben la escena.
import { buildBarrio } from '../maps/barrio/index.js';
import { loadSave } from '../run/save.js';
import { seedFor, handFromSeed, handText } from '../run/seed.js';
import { rngFromSeed } from '../run/rng.js';
import { rumorFor } from '../run/radio.js';
import { emptyBag } from '../run/loot.js';
import { roundConfig } from './waves.js';
import { createWeapon } from './weapon.js';
import { createPoints } from './points.js';
import { purgeArena } from './reset.js';
import { createResultNav } from './results.js';
import { runEffects, weaponOptions, integrityMax } from './effectsRun.js';
import { ARENA } from './config.js';
import { FLAG } from '../data/flags.js';

const ROUND_BANNER_FIRST = 3; // respiro antes de la ronda 1


/** Arma la salida desde game.run (o desde el save, si es el minijuego). */
export function setupRun(state, view, svc) {
  const run = svc.game.run;
  // M12: el save en memoria manda; el disco es sólo el respaldo.
  const save = run && run.save ? run.save : (svc.game.baseSave || loadSave());
  const loop = run && Number.isFinite(Number(run.loop))
    ? Number(run.loop) : (Number(save.loop) || 0) + 1;
  const seed = run && Number.isFinite(Number(run.seed))
    ? (Number(run.seed) >>> 0) : seedFor(Date.now() % 100000);
  state.save = save;
  state.best = svc.bestFromSave(save);
  state.loop = Math.max(1, loop);
  state.seed = seed;
  state.eff = runEffects(save);
  state.rng = rngFromSeed((seed ^ 0x9e3779b9) >>> 0);
  // Tiradas de las rondas: siempre un rng sembrado. En la salida manda run.seed;
  // en el Minijuego la semilla es explícita (seedFor(Date.now())) y queda
  // guardada en state.roundSeed para poder reproducirla.
  state.roundSeed = seed;
  state.roundRng = rngFromSeed((seed ^ 0x5eed) >>> 0);
  // Dispersión de los disparos: flujo propio, así tirar más no corre las oleadas.
  state.shotRng = rngFromSeed((seed ^ 0x5407) >>> 0);
  state.hand = handText(handFromSeed(seed)).replace(/ · /g, ' / ');
  if (seed !== state.seedBuilt || !view.world) {
    state.seedBuilt = seed;
    svc.rebuildWorld(seed);
  }
}

export function rebuildWorld(state, view, svc, seed) {
  const { cells, map } = buildBarrio(seed);
  // P2: la arena no mueve muebles, así que el mobiliario se puede batchear.
  map.batchStatic = true;
  state.cells = cells;
  svc.buildWorld(map);
}

export function startPoint(state, view, svc) {
  const spawn = state.mapData && state.mapData.spawn;
  if (spawn && Number.isFinite(spawn.x) && Number.isFinite(spawn.y)) {
    return { x: spawn.x, y: spawn.y, dir: spawn.dir || 'down' };
  }
  return {
    x: Math.round((state.arena.minX + state.arena.maxX) / 2),
    y: 12 * 16 + 8,
    dir: 'down',
  };
}

export function resetRun(state, view, svc) {
  // Limpieza total: bichos vivos y cadáveres, balas, vainas, partículas,
  // nieve levantada, huellas y todo lo que dejó la salida anterior.
  purgeArena({
    scene: view.three, enemies: state.enemies, fx: view.fx,
    shooting: view.shooting, footprints: view.footprints, snow: view.snow,
  });
  svc.clearGroundLoot();
  svc.clearConsumables();
  svc.clearSurvivor();
  svc.clearDynamicLights();
  view.player.setFrozen(false);
  view.player.setSuit(true);
  view.player.setRifle(true);
  view.player.mesh.visible = true;
  view.player.shadow.visible = true;
  const start = svc.startPoint();
  view.player.place(start.x, start.y, start.dir);

  state.eff = runEffects(state.save);
  state.integrityMax = integrityMax(state.eff);
  state.weapon = createWeapon({
    infinite: ARENA.ammo === 'infinita',
    reserve: ARENA.ammo === 'infinita' ? 9999 : undefined,
    ...weaponOptions(state.eff),
  });
  state.points = createPoints();
  state.round = 1;
  state.cfg = roundConfig(1);
  svc.setMode('banner');
  state.bannerT = ROUND_BANNER_FIRST;
  state.spawned = 0;
  state.spawnTimer = 0;
  state.integrity = state.integrityMax;
  state.firstBiteReady = Boolean(state.eff.firstBiteFree);
  state.strips = 0;
  state.invuln = 0;
  state.patchT = 0;
  state.recoil = 0;
  state.recoilX = 0;
  state.recoilY = 0;
  state.shake = 0;
  state.deathT = 0;
  state.resultSel = 0;
  state.resultT = 0;
  state.newBest = false;
  state.nav = createResultNav();
  view.menuSign = 0;
  state.reloadHintAt = -9;
  state.advanceBuffer = 0;
  state.exitLock = false;
  state.exitArmed = false;
  view.toasts = [];
  state.bag = emptyBag();
  state.items = {
    bengalas: state.eff.bengalas || 0,
    molotovs: state.eff.molotovs || 0,
  };
  state.bengala = null;
  state.fires = [];
  state.mochila = null;
  state.survivor = null;
  // Estados de flanco: el botón que confirmó "Volver a la casa" no se
  // arrastra como disparo ni como movimiento del menú.
  state.fireLock = true;
  view.prevPad = [];
  view.prevKeys = new Set();
  view.controls = {
    fire: false, reload: false, patch: false, buy: false, advance: false,
    home: false, bengala: false, botella: false,
  };
  view.cam = view.world.cameraFor(view.player.x, view.player.feet - 18);
  view.snow.setCamera(view.cam.x, view.cam.y);
  svc.setupLoot();
  svc.setupFarol();
}

export function enter(state, view, svc, spawn) {
  svc.game.mouseCursor?.setHidden?.(true); // en combate solo apunta la mira
  svc.game.hasSuit = true;
  svc.game.flags[FLAG.APAGON] = true;
  svc.game.setLighting('apagon');
  view.ui.mesh.visible = true;
  view.snow.scatter();
  view.footprints.reset();
  svc.setupRun();
  view.world.setDark(true);
  svc.resetRun();
  if (spawn && Number.isFinite(spawn.x)) {
    view.player.place(spawn.x, spawn.y ?? spawn.feet ?? view.player.feet, spawn.dir || 'down');
    view.cam = view.world.cameraFor(view.player.x, view.player.feet - 18);
  }
  if (state.eff.rumor) {
    const rumor = rumorFor(state.cells, state.rng);
    svc.toast(rumor.text, 4.5);
  }
}

export function reset(state, view, svc) {
  if (!view.world) return;
  view.world.setDark(Boolean(svc.game.flags && svc.game.flags[FLAG.APAGON]));
  svc.resetRun();
  view.snow.scatter();
  view.footprints.reset();
}
