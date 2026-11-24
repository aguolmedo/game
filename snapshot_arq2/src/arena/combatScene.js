// Combate de la salida: disparo, daño, parche del traje, compra de balas y
// mordidas de los cascarudos. Funciones que reciben la escena.
import { fire, buyAmmo, AMMO_PACK, AMMO_PRICE } from './weapon.js';
import { shotOrigin } from './projectiles.js';
import { ENEMY_TYPES } from './enemies.js';
import { applyDamage, applyBite, stepEnemies } from './simulate.js';
import { nearExit, homeResult } from './exit.js';
import { ARENA } from './config.js';
import { clamp } from './util.js';

const STRIPS_PER_PATCH = 1;
const PATCH_INTEGRITY = 1; // integridad que repone ponerse un parche
const PATCH_STRIP_COST = 1; // tira de goma que gasta


export function tryFire(scene) {
  const result = fire(scene.state.weapon, scene.t);
  if (result.blocked || result.reloading) return;
  if (result.needReload) {
    // Chasquido en seco: se ve que no salió nada.
    scene.shooting.dryFire(shotOrigin(scene.player), scene.aim);
    if (scene.t - scene.reloadHintAt > 1.4) {
      scene.toast('Cargador vacío: (R) recargar');
      scene.reloadHintAt = scene.t;
    }
    return;
  }
  if (!result.shots.length) return;

  // Bala visible: viaja, atraviesa un bicho y se frena en la pared.
  scene.shooting.fire(shotOrigin(scene.player), scene.aim, {
    shots: result.shots,
    moving: scene.player.moving,
    player: scene.player,
    emergency: Boolean(result.emergency),
    isSolid: (box) => scene.world.isSolid(box),
    rng: scene.state.shotRng,
  });
  scene.recoil = 0.07;
  scene.recoilX = -scene.aim.x;
  scene.recoilY = -scene.aim.y;
}

/** Daño de una bala (lo llama ShootingFx al chocar). */
export function damageEnemy(scene, enemy, damage, opts = {}) {
  if (!enemy || enemy.dead) return { dead: false, ignored: true };
  const { outcome, patch, drops } = applyDamage(scene.state, enemy, damage, opts);
  if (outcome.dead) showKillReward(scene, enemy, patch, drops);
  return outcome;
}

/** Lo que se ve de una baja: aviso de la goma y el botín que cae al piso. */
function showKillReward(scene, enemy, patch, drops) {
  if (patch) scene.toast(`+${STRIPS_PER_PATCH} tira de goma`);
  for (const drop of drops) {
    scene.addGroundLoot(enemy.x, enemy.y - 2, drop.kind, drop.n, { quiet: true });
  }
  if (drops.length) {
    scene.spawnFx('sparkle', enemy.x, enemy.y - 6, 0.4, ['sparkle_0', 'sparkle_1']);
  }
}

export function tryPatch(scene) {
  if (scene.state.patchT > 0) return;
  if (scene.state.integrity >= scene.state.integrityMax) { scene.toast('El traje está entero.'); return; }
  if (scene.state.strips <= 0) { scene.toast('No hay tiras de goma.'); return; }
  scene.state.patchT = scene.state.eff.patchTime;
  scene.player.setFrozen(true);
  scene.toast('Parchando el traje…');
}

export function cancelPatch(scene) {
  if (scene.state.patchT <= 0) return;
  scene.state.patchT = 0;
  scene.player.setFrozen(false);
  scene.toast('¡Se cortó el parche!');
}

export function updatePatch(scene, dt) {
  if (scene.state.patchT <= 0) return;
  scene.state.patchT -= dt;
  if (scene.state.patchT > 0) return;
  scene.state.patchT = 0;
  scene.state.integrity = Math.min(scene.state.integrityMax, scene.state.integrity + PATCH_INTEGRITY);
  scene.state.strips = Math.max(0, scene.state.strips - PATCH_STRIP_COST);
  scene.player.setFrozen(false);
  scene.spawnFx('sparkle', scene.player.x, scene.player.feet - 16, 0.5, ['sparkle_0', 'sparkle_1']);
  scene.toast(`Parche puesto (+${PATCH_INTEGRITY} integridad)`);
}

export function nearCrate(scene) {
  if (!scene.crate) return false;
  const cx = scene.crate.x + scene.crate.w / 2;
  const cy = scene.crate.y + scene.crate.h;
  return Math.hypot(scene.player.x - cx, scene.player.feet - cy) < 30;
}

export function tryBuy(scene) {
  if (!scene.nearCrate()) return;
  if (ARENA.ammo === 'infinita') { scene.toast('Munición infinita.'); return; }
  const result = buyAmmo(scene.state.weapon, scene.state.points.score);
  if (result.ok) {
    scene.state.points.score = result.points;
    scene.toast(`+${AMMO_PACK} balas`);
  } else {
    scene.toast(`Faltan puntos: son ${AMMO_PRICE} (tenés ${scene.state.points.score}).`);
  }
}

export function nearHome(scene) {
  return nearExit(scene.exitHome, { x: scene.player.x, feet: scene.player.feet });
}

export function goHome(scene) {
  if (scene.exitLock || scene.dead) return;
  scene.exitLock = true;
  scene.player.setFrozen(true);
  const result = homeResult({
    bag: scene.state.bag,
    round: scene.state.round,
    points: scene.state.points.score,
  });
  if (typeof scene.game.endRun === 'function') scene.game.endRun(result);
  else scene.game.changeScene('title');
}

export function updateEnemies(scene, dt) {
  scene.updateFlow(dt);
  const player = scene.playerPoint;
  player.x = scene.player.x;
  player.feet = scene.player.feet;
  stepEnemies(scene.state, {
    player,
    arena: scene.arena,
    solids: scene.solidBoxes,
    flows: scene.flows,
    bengala: scene.bengala,
    steerOut: scene.steerOut,
  }, dt, {
    onBite(enemy) {
      scene.bitBy(enemy);
      return scene.state.mode === 'dying';
    },
    onRemove: (enemy) => scene.removeEnemy(enemy),
    afterEnemy: (enemy) => scene.updateEnemyVisual(enemy),
  });
}

export function bitBy(scene, enemy) {
  const kind = applyBite(scene.state, enemy);
  if (kind === 'ignored') return;
  if (kind === 'absorbed') {
    // Hombreras de élitro: la primera mordida de la ronda no rompe nada.
    scene.shake = 0.08;
    scene.spawnFx('sparkle', scene.player.x, scene.player.feet - 10, 0.3, ['sparkle_0', 'sparkle_1']);
    scene.toast('Las hombreras aguantaron');
    return;
  }
  scene.shake = 0.18;
  scene.cancelPatch();
  if (ENEMY_TYPES[enemy.type] && ENEMY_TYPES[enemy.type].push) scene.pushPlayer(enemy);
  scene.spawnFx('salpicadura', scene.player.x, scene.player.feet - 10, 0.3);
  if (kind === 'dead') scene.die();
  else scene.toast(`¡Mordida! Integridad ${scene.state.integrity}/${scene.state.integrityMax}`);
}

/** El acorazado empuja a Juan unos píxeles lejos. */
export function pushPlayer(scene, enemy) {
  const dx = scene.player.x - enemy.x;
  const dy = scene.player.feet - enemy.y;
  const mag = Math.hypot(dx, dy) || 1;
  const nx = clamp(scene.player.x + (dx / mag) * 6, scene.bounds.minX, scene.bounds.maxX);
  const nfeet = clamp(scene.player.feet + (dy / mag) * 6,
    scene.bounds.minFeet, scene.bounds.maxFeet);
  const box = { x: nx - 5, y: nfeet - 6, w: 10, h: 6 };
  if (!scene.world.isSolid(box)) scene.player.place(nx, nfeet, scene.player.dir);
}
