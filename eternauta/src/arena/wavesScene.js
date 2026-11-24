// Rondas y aparición de bichos: configuración, spawns validados y conteo.
// Funciones que reciben la escena.
import {
  roundConfig, pickType, nextSpawnDelay, MIN_SPAWN_DIST, ROUND_BREAK,
} from './waves.js';
import { addRound, ROUND_FACTOR } from './points.js';
import { roundStep } from './roundSim.js';
import { createEnemy, applyRound } from './enemies.js';

const MAX_SPAWN_DIST = 380;


export function startRound(state, view, svc, round) {
  state.round = round;
  state.cfg = roundConfig(round);
  svc.setMode('active');
  state.bannerT = 0;
  state.spawned = 0;
  state.spawnTimer = 0.4;
  state.firstBiteReady = Boolean(state.eff.firstBiteFree);
}

export function completeRound(state, view, svc) {
  addRound(state.points, state.round);
  svc.toast(`Ronda ${state.round} — +${ROUND_FACTOR * state.round} puntos`);
  state.round += 1;
  state.cfg = roundConfig(state.round);
  svc.setMode('banner');
  state.bannerT = ROUND_BREAK;
  state.spawned = 0;
  state.spawnTimer = 0;
}

export function updateRound(state, view, svc, dt) {
  roundStep(state, dt, {
    alive: () => svc.aliveCount(),
    trySpawn(type) {
      // El punto se valida con la caja y la máscara de ese tamaño. Si no hay
      // punto válido, no aparece nada este tick.
      const point = svc.pickSpawn(type, state.roundRng);
      if (point) svc.spawnEnemy(type, point.x, point.y);
    },
    startRound: (round) => svc.startRound(round),
    completeRound: () => svc.completeRound(),
  });
}

/** Punto de aparición válido para ese tipo, o null (no spawnear). */
export function pickSpawn(state, view, svc, type = 'cascarudo', rng = state.roundRng) {
  const px = view.player.x;
  const py = view.player.feet;
  const near = [];
  const far = [];
  for (const point of state.spawns) {
    if (!svc.canSpawnAt(type, point.x, point.y)) continue;
    const d = Math.hypot(point.x - px, point.y - py);
    if (d < MIN_SPAWN_DIST) continue;
    (d <= MAX_SPAWN_DIST ? near : far).push(point);
  }
  // Preferir cerca, pero si el jugador quedó lejos de todas las bocas (p. ej.
  // arranca en el borde del barrio) vale cualquier boca validada: si no, la
  // ronda se queda sin bichos para siempre.
  const pool = near.length ? near : far;
  if (!pool.length) return null;
  const i = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
  return { ...pool[i] };
}

export function spawnEnemy(state, view, svc, type, x, y) {
  // La caja real del bicho y su alcanzabilidad mandan: nada de fallbacks
  // que lo dejen dentro de un sólido (A4).
  if (!svc.canSpawnAt(type, x, y)) return null;
  const enemy = createEnemy(type, x, y, state.roundRng);
  applyRound(enemy, state.cfg.hpMul, state.cfg.speedMul);
  state.enemies.push(enemy);
  enemy.vis = svc.makeEnemyVisual(enemy);
  state.spawned += 1;
  svc.spawnFx('salpicadura', x, y - 4, 0.3);
  return enemy;
}

export function aliveCount(state, view, svc) {
  let count = 0;
  for (const enemy of state.enemies) if (!enemy.dead) count += 1;
  return count;
}

export function debugSetRound(state, view, svc, round) {
  svc.clearEnemies();
  state.round = Math.max(1, Math.floor(Number(round) || 1));
  state.cfg = roundConfig(state.round);
  svc.setMode('active');
  state.bannerT = 0;
  state.spawned = 0;
  state.spawnTimer = 0;
  state.integrity = state.integrityMax;
  state.firstBiteReady = Boolean(state.eff.firstBiteFree);
  state.invuln = 0;
  state.patchT = 0;
  view.player.setFrozen(false);
  const count = Math.min(state.cfg.maxAlive, 6);
  for (let i = 0; i < count; i++) {
    const type = i === 0 && state.cfg.armoredPct > 0
      ? 'acorazado' : pickType(state.round, state.roundRng);
    const point = svc.pickSpawn(type);
    if (point) svc.spawnEnemy(type, point.x, point.y);
  }
  state.spawnTimer = 0.7;
}

export function debugSpawn(state, view, svc, type = 'cascarudo') {
  const point = svc.pickSpawn(type);
  const enemy = point ? svc.spawnEnemy(type, point.x, point.y) : null;
  return enemy ? enemy.type : null;
}
