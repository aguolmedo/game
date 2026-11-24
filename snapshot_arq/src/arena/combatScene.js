// Combate de la salida: disparo, daño, parche del traje, compra de balas y
// mordidas de los cascarudos. Funciones que reciben la escena.
import { addImpact, addKill } from './points.js';
import { fire, buyAmmo, AMMO_PACK, AMMO_PRICE } from './weapon.js';
import { shotOrigin } from './projectiles.js';
import {
  ENEMY_TYPES, steer, hitEnemy, updateDeath, patchDrop,
  biteReach, BITE_COOLDOWN, CORPSE_TIME,
} from './enemies.js';
import { dropsFor } from './lootRun.js';
import { addToBag } from '../run/loot.js';
import { nearExit, homeResult } from './exit.js';
import { bengalaFactor } from './effectsRun.js';
import { ARENA } from './config.js';
import { clamp } from './util.js';

const STRIPS_PER_PATCH = 1;
const PATCH_INTEGRITY = 1; // integridad que repone ponerse un parche
const PATCH_STRIP_COST = 1; // tira de goma que gasta


export function tryFire(scene) {
  const result = fire(scene.weapon, scene.t);
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
    rng: scene.shotRng,
  });
  scene.recoil = 0.07;
  scene.recoilX = -scene.aim.x;
  scene.recoilY = -scene.aim.y;
}

/** Daño de una bala (lo llama ShootingFx al chocar). */
export function damageEnemy(scene, enemy, damage, opts = {}) {
  if (!enemy || enemy.dead) return { dead: false, ignored: true };
  if (opts.impact !== false) addImpact(scene.points);
  const outcome = hitEnemy(enemy, damage);
  if (outcome.dead) scene.rewardKill(enemy);
  return outcome;
}

/** Baja confirmada: puntos, tira de goma y el botín que cae al piso. */
export function rewardKill(scene, enemy) {
  addKill(scene.points, enemy.type);
  if (patchDrop(enemy.type, scene.rng)) {
    scene.strips += STRIPS_PER_PATCH;
    scene.bag = addToBag(scene.bag, 'goma', STRIPS_PER_PATCH);
    scene.toast(`+${STRIPS_PER_PATCH} tira de goma`);
  }
  const drops = dropsFor(enemy.type, scene.rng);
  for (const drop of drops) {
    scene.addGroundLoot(enemy.x, enemy.y - 2, drop.kind, drop.n, { quiet: true });
  }
  if (drops.length) {
    scene.spawnFx('sparkle', enemy.x, enemy.y - 6, 0.4, ['sparkle_0', 'sparkle_1']);
  }
}

export function tryPatch(scene) {
  if (scene.patchT > 0) return;
  if (scene.integrity >= scene.integrityMax) { scene.toast('El traje está entero.'); return; }
  if (scene.strips <= 0) { scene.toast('No hay tiras de goma.'); return; }
  scene.patchT = scene.eff.patchTime;
  scene.player.setFrozen(true);
  scene.toast('Parchando el traje…');
}

export function cancelPatch(scene) {
  if (scene.patchT <= 0) return;
  scene.patchT = 0;
  scene.player.setFrozen(false);
  scene.toast('¡Se cortó el parche!');
}

export function updatePatch(scene, dt) {
  if (scene.patchT <= 0) return;
  scene.patchT -= dt;
  if (scene.patchT > 0) return;
  scene.patchT = 0;
  scene.integrity = Math.min(scene.integrityMax, scene.integrity + PATCH_INTEGRITY);
  scene.strips = Math.max(0, scene.strips - PATCH_STRIP_COST);
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
  const result = buyAmmo(scene.weapon, scene.points.score);
  if (result.ok) {
    scene.points.score = result.points;
    scene.toast(`+${AMMO_PACK} balas`);
  } else {
    scene.toast(`Faltan puntos: son ${AMMO_PRICE} (tenés ${scene.points.score}).`);
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
    bag: scene.bag,
    round: scene.round,
    points: scene.points.score,
  });
  if (typeof scene.game.endRun === 'function') scene.game.endRun(result);
  else scene.game.changeScene('title');
}

export function updateEnemies(scene, dt) {
  scene.updateFlow(dt);
  const player = scene.playerPoint;
  player.x = scene.player.x;
  player.feet = scene.player.feet;
  for (let i = scene.enemies.length - 1; i >= 0; i--) {
    const enemy = scene.enemies[i];
    if (!enemy.dead) {
      // La bengala frena a los que están dentro de su luz.
      const slow = bengalaFactor(enemy, scene.bengala);
      const flow = scene.flows ? scene.flows[enemy.type] : null;
      steer(enemy, player, scene.enemies, scene.solidBoxes, dt * slow, flow, scene.steerOut);
      enemy.x = clamp(enemy.x, scene.arena.minX + 6, scene.arena.maxX - 6);
      enemy.y = clamp(enemy.y, scene.arena.minY + 6, scene.arena.maxY - 2);
      enemy.feet = enemy.y;
      const dx = enemy.x - scene.player.x;
      const dy = (enemy.y - enemy.h / 2) - (scene.player.feet - 10);
      if (Math.hypot(dx, dy) <= biteReach(enemy) && enemy.biteCd <= 0) {
        enemy.biteCd = BITE_COOLDOWN;
        scene.bitBy(enemy);
        if (scene.vignetteOpen) break;
      }
    } else {
      updateDeath(enemy, dt);
      if (enemy.deathT >= CORPSE_TIME) {
        scene.removeEnemy(enemy);
        continue;
      }
    }
    scene.updateEnemyVisual(enemy);
  }
}

export function bitBy(scene, enemy) {
  if (scene.invuln > 0 || scene.vignetteOpen) return;
  if (scene.firstBiteReady) {
    // Hombreras de élitro: la primera mordida de la ronda no rompe nada.
    scene.firstBiteReady = false;
    scene.invuln = 0.6;
    scene.shake = 0.08;
    scene.spawnFx('sparkle', scene.player.x, scene.player.feet - 10, 0.3, ['sparkle_0', 'sparkle_1']);
    scene.toast('Las hombreras aguantaron');
    return;
  }
  scene.integrity = Math.max(0, scene.integrity - enemy.damage);
  scene.invuln = 1;
  scene.shake = 0.18;
  scene.cancelPatch();
  if (ENEMY_TYPES[enemy.type] && ENEMY_TYPES[enemy.type].push) scene.pushPlayer(enemy);
  scene.spawnFx('salpicadura', scene.player.x, scene.player.feet - 10, 0.3);
  if (scene.integrity <= 0) scene.die();
  else scene.toast(`¡Mordida! Integridad ${scene.integrity}/${scene.integrityMax}`);
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
