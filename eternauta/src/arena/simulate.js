// Simulación pura de combate (sin Three ni DOM): enemigos, balas, daño, mordidas.
// Opera sobre el state de la corrida (runState.js). La vista engancha sus
// efectos (sprites, partículas, toasts) con callbacks; nada de esto toca meshes.
import { addImpact, addKill } from './points.js';
import { fire } from './weapon.js';
import { shotOrigin, createShot, updateBullet } from './projectiles.js';
import {
  steer, hitEnemy, updateDeath, patchDrop, biteReach, BITE_COOLDOWN, CORPSE_TIME,
} from './enemies.js';
import { dropsFor } from './lootRun.js';
import { addToBag } from '../run/loot.js';
import { bengalaFactor } from './effectsRun.js';
import { roundStep } from './roundSim.js';
import { clamp } from './util.js';

const STRIPS_PER_PATCH = 1;

/** Dispara el arma y agrega la bala al state. Devuelve el resultado de weapon.fire. */
export function shootStep(state, player, aim, now) {
  const result = fire(state.weapon, now);
  if (result.blocked || result.reloading || result.needReload || !result.shots.length) {
    return { result, bullet: null };
  }
  const bullet = createShot(shotOrigin(player), aim, {
    shots: result.shots, moving: Boolean(player.moving), rng: state.shotRng,
  });
  state.bullets.push(bullet);
  return { result, bullet };
}

/** Daño de una bala: puntos, baja, tira de goma y botín. Devuelve lo que la vista debe mostrar. */
export function applyDamage(state, enemy, damage, opts = {}) {
  if (!enemy || enemy.dead) return { outcome: { dead: false, ignored: true }, patch: false, drops: [] };
  if (opts.impact !== false) addImpact(state.points);
  const outcome = hitEnemy(enemy, damage);
  let patch = false;
  let drops = [];
  if (outcome.dead) {
    addKill(state.points, enemy.type);
    if (patchDrop(enemy.type, state.rng)) {
      patch = true;
      state.strips += STRIPS_PER_PATCH;
      state.bag = addToBag(state.bag, 'goma', STRIPS_PER_PATCH);
    }
    drops = dropsFor(enemy.type, state.rng);
  }
  return { outcome, patch, drops };
}

/** Mordida: 'absorbed' (hombreras), 'bitten', 'dead' o 'ignored'. */
export function applyBite(state, enemy) {
  if (state.invuln > 0 || state.mode === 'dying') return 'ignored';
  if (state.firstBiteReady) {
    state.firstBiteReady = false;
    state.invuln = 0.6;
    return 'absorbed';
  }
  state.integrity = Math.max(0, state.integrity - enemy.damage);
  state.invuln = 1;
  return state.integrity <= 0 ? 'dead' : 'bitten';
}

/**
 * Avanza las balas del state. onEvent(event) recibe enemy/wall/out/expire;
 * afterBullet(bullet) deja a la vista sincronizar su sprite antes de compactar.
 */
export function stepBullets(bullets, dt, world, hooks = {}) {
  for (const bullet of bullets) {
    if (!bullet.alive) continue;
    const events = updateBullet(bullet, dt, world);
    if (hooks.onEvent) for (const event of events) hooks.onEvent(event);
    if (hooks.afterBullet) hooks.afterBullet(bullet);
  }
  for (let i = bullets.length - 1; i >= 0; i--) {
    if (!bullets[i].alive) bullets.splice(i, 1);
  }
}

/**
 * Avanza los bichos: persecución, mordidas y cadáveres.
 * ctx = { player:{x,feet}, arena, solids, flows, bengala, steerOut }.
 * hooks = { onBite(enemy) -> true para cortar, onRemove(enemy), afterEnemy(enemy) }.
 */
export function stepEnemies(state, ctx, dt, hooks = {}) {
  const { player, arena } = ctx;
  const enemies = state.enemies;
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    if (!enemy.dead) {
      const slow = bengalaFactor(enemy, ctx.bengala);
      const flow = ctx.flows ? ctx.flows[enemy.type] : null;
      steer(enemy, player, enemies, ctx.solids, dt * slow, flow, ctx.steerOut);
      enemy.x = clamp(enemy.x, arena.minX + 6, arena.maxX - 6);
      enemy.y = clamp(enemy.y, arena.minY + 6, arena.maxY - 2);
      enemy.feet = enemy.y;
      const dx = enemy.x - player.x;
      const dy = (enemy.y - enemy.h / 2) - (player.feet - 10);
      if (Math.hypot(dx, dy) <= biteReach(enemy) && enemy.biteCd <= 0) {
        enemy.biteCd = BITE_COOLDOWN;
        if (hooks.onBite && hooks.onBite(enemy)) break;
      }
    } else {
      updateDeath(enemy, dt);
      if (enemy.deathT >= CORPSE_TIME) {
        if (hooks.onRemove) hooks.onRemove(enemy);
        continue;
      }
    }
    if (hooks.afterEnemy) hooks.afterEnemy(enemy);
  }
}

/**
 * Un paso completo de simulación: disparo, balas, bichos y oleadas.
 * inputs = { fire, aim, now }; env = { player, world:{isSolid,isOut,solids,view},
 * ctx (para stepEnemies), round (para roundStep) }. Sin Three.
 */
export function simulateStep(state, inputs, dt, env) {
  state.invuln = Math.max(0, state.invuln - dt);
  if (inputs.fire) shootStep(state, env.player, inputs.aim, inputs.now);
  env.world.enemies = state.enemies;
  stepBullets(state.bullets, dt, env.world, {
    onEvent(event) {
      if (event.type === 'enemy') applyDamage(state, event.enemy, event.damage);
    },
  });
  stepEnemies(state, env.ctx, dt, {
    onBite(enemy) {
      if (applyBite(state, enemy) !== 'dead') return false;
      state.mode = 'dying';
      return true;
    },
    onRemove(enemy) {
      const i = state.enemies.indexOf(enemy);
      if (i >= 0) state.enemies.splice(i, 1);
    },
  });
  roundStep(state, dt, env.round);
}
