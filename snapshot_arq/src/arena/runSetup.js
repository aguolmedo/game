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

const ROUND_BANNER_FIRST = 3; // respiro antes de la ronda 1


/** Arma la salida desde game.run (o desde el save, si es el minijuego). */
export function setupRun(scene) {
  const run = scene.game.run;
  // M12: el save en memoria manda; el disco es sólo el respaldo.
  const save = run && run.save ? run.save : (scene.game.baseSave || loadSave());
  const loop = run && Number.isFinite(Number(run.loop))
    ? Number(run.loop) : (Number(save.loop) || 0) + 1;
  const seed = run && Number.isFinite(Number(run.seed))
    ? (Number(run.seed) >>> 0) : seedFor(Date.now() % 100000);
  scene.save = save;
  scene.best = scene.bestFromSave(save);
  scene.loop = Math.max(1, loop);
  scene.seed = seed;
  scene.eff = runEffects(save);
  scene.rng = rngFromSeed((seed ^ 0x9e3779b9) >>> 0);
  // Tiradas de las rondas: siempre un rng sembrado. En la salida manda run.seed;
  // en el Minijuego la semilla es explícita (seedFor(Date.now())) y queda
  // guardada en scene.roundSeed para poder reproducirla.
  scene.roundSeed = seed;
  scene.roundRng = rngFromSeed((seed ^ 0x5eed) >>> 0);
  // Dispersión de los disparos: flujo propio, así tirar más no corre las oleadas.
  scene.shotRng = rngFromSeed((seed ^ 0x5407) >>> 0);
  scene.hand = handText(handFromSeed(seed)).replace(/ · /g, ' / ');
  if (seed !== scene.seedBuilt || !scene.world) {
    scene.seedBuilt = seed;
    scene.rebuildWorld(seed);
  }
}

export function rebuildWorld(scene, seed) {
  const { cells, map } = buildBarrio(seed);
  // P2: la arena no mueve muebles, así que el mobiliario se puede batchear.
  map.batchStatic = true;
  scene.cells = cells;
  scene.buildWorld(map);
}

export function startPoint(scene) {
  const spawn = scene.mapData && scene.mapData.spawn;
  if (spawn && Number.isFinite(spawn.x) && Number.isFinite(spawn.y)) {
    return { x: spawn.x, y: spawn.y, dir: spawn.dir || 'down' };
  }
  return {
    x: Math.round((scene.arena.minX + scene.arena.maxX) / 2),
    y: 12 * 16 + 8,
    dir: 'down',
  };
}

export function resetRun(scene) {
  // Limpieza total: bichos vivos y cadáveres, balas, vainas, partículas,
  // nieve levantada, huellas y todo lo que dejó la salida anterior.
  purgeArena(scene);
  scene.clearGroundLoot();
  scene.clearConsumables();
  scene.clearSurvivor();
  scene.clearDynamicLights();
  scene.player.setFrozen(false);
  scene.player.setSuit(true);
  scene.player.setRifle(true);
  scene.player.mesh.visible = true;
  scene.player.shadow.visible = true;
  const start = scene.startPoint();
  scene.player.place(start.x, start.y, start.dir);

  scene.eff = runEffects(scene.save);
  scene.integrityMax = integrityMax(scene.eff);
  scene.weapon = createWeapon({
    infinite: ARENA.ammo === 'infinita',
    reserve: ARENA.ammo === 'infinita' ? 9999 : undefined,
    ...weaponOptions(scene.eff),
  });
  scene.points = createPoints();
  scene.round = 1;
  scene.cfg = roundConfig(1);
  scene.phase = 'banner';
  scene.bannerT = ROUND_BANNER_FIRST;
  scene.spawned = 0;
  scene.spawnTimer = 0;
  scene.integrity = scene.integrityMax;
  scene.firstBiteReady = Boolean(scene.eff.firstBiteFree);
  scene.strips = 0;
  scene.invuln = 0;
  scene.patchT = 0;
  scene.recoil = 0;
  scene.recoilX = 0;
  scene.recoilY = 0;
  scene.shake = 0;
  scene.dead = false;
  scene.deathT = 0;
  scene.vignetteOpen = false;
  scene.resultOpen = false;
  scene.resultSel = 0;
  scene.resultT = 0;
  scene.newBest = false;
  scene.nav = createResultNav();
  scene.menuSign = 0;
  scene.reloadHintAt = -9;
  scene.advanceBuffer = 0;
  scene.exitLock = false;
  scene.exitArmed = false;
  scene.toasts = [];
  scene.bag = emptyBag();
  scene.items = {
    bengalas: scene.eff.bengalas || 0,
    molotovs: scene.eff.molotovs || 0,
  };
  scene.bengala = null;
  scene.fires = [];
  scene.mochila = null;
  scene.survivor = null;
  // Estados de flanco: el botón que confirmó "Volver a la casa" no se
  // arrastra como disparo ni como movimiento del menú.
  scene.fireLock = true;
  scene.prevPad = [];
  scene.prevKeys = new Set();
  scene.controls = {
    fire: false, reload: false, patch: false, buy: false, advance: false,
    home: false, bengala: false, botella: false,
  };
  scene.cam = scene.world.cameraFor(scene.player.x, scene.player.feet - 18);
  scene.snow.setCamera(scene.cam.x, scene.cam.y);
  scene.setupLoot();
  scene.setupFarol();
}

export function enter(scene, spawn) {
  scene.game.mouseCursor?.setHidden?.(true); // en combate solo apunta la mira
  scene.game.hasSuit = true;
  scene.game.flags.apagon = true;
  scene.game.setLighting('apagon');
  scene.ui.mesh.visible = true;
  scene.snow.scatter();
  scene.footprints.reset();
  scene.setupRun();
  scene.world.setDark(true);
  scene.resetRun();
  if (spawn && Number.isFinite(spawn.x)) {
    scene.player.place(spawn.x, spawn.y ?? spawn.feet ?? scene.player.feet, spawn.dir || 'down');
    scene.cam = scene.world.cameraFor(scene.player.x, scene.player.feet - 18);
  }
  if (scene.eff.rumor) {
    const rumor = rumorFor(scene.cells, scene.rng);
    scene.toast(rumor.text, 4.5);
  }
}

export function reset(scene) {
  if (!scene.world) return;
  scene.world.setDark(Boolean(scene.game.flags && scene.game.flags.apagon));
  scene.resetRun();
  scene.snow.scatter();
  scene.footprints.reset();
}
