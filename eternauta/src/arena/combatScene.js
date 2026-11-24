// Combate de la salida: disparo, daño, parche del traje, compra de balas y
// mordidas de los cascarudos. Funciones que reciben la escena.
import { isOverlay } from './runMode.js';
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


export function tryFire(state, view, svc) {
  const result = fire(state.weapon, state.t);
  if (result.blocked || result.reloading) return;
  if (result.needReload) {
    // Chasquido en seco: se ve que no salió nada.
    view.shooting.dryFire(shotOrigin(view.player), state.aim);
    if (state.t - state.reloadHintAt > 1.4) {
      svc.toast('Cargador vacío: (R) recargar');
      state.reloadHintAt = state.t;
    }
    return;
  }
  if (!result.shots.length) return;

  // Bala visible: viaja, atraviesa un bicho y se frena en la pared.
  view.shooting.fire(shotOrigin(view.player), state.aim, {
    shots: result.shots,
    moving: view.player.moving,
    player: view.player,
    emergency: Boolean(result.emergency),
    isSolid: (box) => view.world.isSolid(box),
    rng: state.shotRng,
  });
  state.recoil = 0.07;
  state.recoilX = -state.aim.x;
  state.recoilY = -state.aim.y;
}

/** Daño de una bala (lo llama ShootingFx al chocar). */
export function damageEnemy(state, view, svc, enemy, damage, opts = {}) {
  if (!enemy || enemy.dead) return { dead: false, ignored: true };
  const { outcome, patch, drops } = applyDamage(state, enemy, damage, opts);
  if (outcome.dead) showKillReward(state, view, svc, enemy, patch, drops);
  return outcome;
}

/** Lo que se ve de una baja: aviso de la goma y el botín que cae al piso. */
function showKillReward(state, view, svc, enemy, patch, drops) {
  if (patch) svc.toast(`+${STRIPS_PER_PATCH} tira de goma`);
  for (const drop of drops) {
    svc.addGroundLoot(enemy.x, enemy.y - 2, drop.kind, drop.n, { quiet: true });
  }
  if (drops.length) {
    svc.spawnFx('sparkle', enemy.x, enemy.y - 6, 0.4, ['sparkle_0', 'sparkle_1']);
  }
}

export function tryPatch(state, view, svc) {
  if (state.patchT > 0) return;
  if (state.integrity >= state.integrityMax) { svc.toast('El traje está entero.'); return; }
  if (state.strips <= 0) { svc.toast('No hay tiras de goma.'); return; }
  state.patchT = state.eff.patchTime;
  view.player.setFrozen(true);
  svc.toast('Parchando el traje…');
}

export function cancelPatch(state, view, svc) {
  if (state.patchT <= 0) return;
  state.patchT = 0;
  view.player.setFrozen(false);
  svc.toast('¡Se cortó el parche!');
}

export function updatePatch(state, view, svc, dt) {
  if (state.patchT <= 0) return;
  state.patchT -= dt;
  if (state.patchT > 0) return;
  state.patchT = 0;
  state.integrity = Math.min(state.integrityMax, state.integrity + PATCH_INTEGRITY);
  state.strips = Math.max(0, state.strips - PATCH_STRIP_COST);
  view.player.setFrozen(false);
  svc.spawnFx('sparkle', view.player.x, view.player.feet - 16, 0.5, ['sparkle_0', 'sparkle_1']);
  svc.toast(`Parche puesto (+${PATCH_INTEGRITY} integridad)`);
}

export function nearCrate(state, view, svc) {
  if (!state.crate) return false;
  const cx = state.crate.x + state.crate.w / 2;
  const cy = state.crate.y + state.crate.h;
  return Math.hypot(view.player.x - cx, view.player.feet - cy) < 30;
}

export function tryBuy(state, view, svc) {
  if (!svc.nearCrate()) return;
  if (ARENA.ammo === 'infinita') { svc.toast('Munición infinita.'); return; }
  const result = buyAmmo(state.weapon, state.points.score);
  if (result.ok) {
    state.points.score = result.points;
    svc.toast(`+${AMMO_PACK} balas`);
  } else {
    svc.toast(`Faltan puntos: son ${AMMO_PRICE} (tenés ${state.points.score}).`);
  }
}

export function nearHome(state, view, svc) {
  return nearExit(state.exitHome, { x: view.player.x, feet: view.player.feet });
}

export function goHome(state, view, svc) {
  if (state.exitLock || isOverlay(state.mode)) return;
  state.exitLock = true;
  view.player.setFrozen(true);
  const result = homeResult({
    bag: state.bag,
    round: state.round,
    points: state.points.score,
  });
  if (typeof svc.game.endRun === 'function') svc.game.endRun(result);
  else svc.game.changeScene('title');
}

export function updateEnemies(state, view, svc, dt) {
  svc.updateFlow(dt);
  const player = view.playerPoint;
  player.x = view.player.x;
  player.feet = view.player.feet;
  stepEnemies(state, {
    player,
    arena: state.arena,
    solids: state.solidBoxes,
    flows: state.flows,
    bengala: state.bengala,
    steerOut: view.steerOut,
  }, dt, {
    onBite(enemy) {
      svc.bitBy(enemy);
      return state.mode === 'dying';
    },
    onRemove: (enemy) => svc.removeEnemy(enemy),
    afterEnemy: (enemy) => svc.updateEnemyVisual(enemy),
  });
}

export function bitBy(state, view, svc, enemy) {
  const kind = applyBite(state, enemy);
  if (kind === 'ignored') return;
  if (kind === 'absorbed') {
    // Hombreras de élitro: la primera mordida de la ronda no rompe nada.
    state.shake = 0.08;
    svc.spawnFx('sparkle', view.player.x, view.player.feet - 10, 0.3, ['sparkle_0', 'sparkle_1']);
    svc.toast('Las hombreras aguantaron');
    return;
  }
  state.shake = 0.18;
  svc.cancelPatch();
  if (ENEMY_TYPES[enemy.type] && ENEMY_TYPES[enemy.type].push) svc.pushPlayer(enemy);
  svc.spawnFx('salpicadura', view.player.x, view.player.feet - 10, 0.3);
  if (kind === 'dead') svc.die();
  else svc.toast(`¡Mordida! Integridad ${state.integrity}/${state.integrityMax}`);
}

/** El acorazado empuja a Juan unos píxeles lejos. */
export function pushPlayer(state, view, svc, enemy) {
  const dx = view.player.x - enemy.x;
  const dy = view.player.feet - enemy.y;
  const mag = Math.hypot(dx, dy) || 1;
  const nx = clamp(view.player.x + (dx / mag) * 6, state.bounds.minX, state.bounds.maxX);
  const nfeet = clamp(view.player.feet + (dy / mag) * 6,
    state.bounds.minFeet, state.bounds.maxFeet);
  const box = { x: nx - 5, y: nfeet - 6, w: 10, h: 6 };
  if (!view.world.isSolid(box)) view.player.place(nx, nfeet, view.player.dir);
}
