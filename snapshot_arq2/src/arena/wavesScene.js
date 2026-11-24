// Rondas y aparición de bichos: configuración, spawns validados y conteo.
// Funciones que reciben la escena.
import {
  roundConfig, pickType, nextSpawnDelay, MIN_SPAWN_DIST, ROUND_BREAK,
} from './waves.js';
import { addRound, ROUND_FACTOR } from './points.js';
import { roundStep } from './roundSim.js';
import { createEnemy, applyRound } from './enemies.js';

const MAX_SPAWN_DIST = 380;


export function startRound(scene, round) {
  scene.state.round = round;
  scene.state.cfg = roundConfig(round);
  scene.setMode('active');
  scene.state.bannerT = 0;
  scene.state.spawned = 0;
  scene.state.spawnTimer = 0.4;
  scene.state.firstBiteReady = Boolean(scene.state.eff.firstBiteFree);
}

export function completeRound(scene) {
  addRound(scene.state.points, scene.state.round);
  scene.toast(`Ronda ${scene.state.round} — +${ROUND_FACTOR * scene.state.round} puntos`);
  scene.state.round += 1;
  scene.state.cfg = roundConfig(scene.state.round);
  scene.setMode('banner');
  scene.state.bannerT = ROUND_BREAK;
  scene.state.spawned = 0;
  scene.state.spawnTimer = 0;
}

export function updateRound(scene, dt) {
  roundStep(scene.state, dt, {
    alive: () => scene.aliveCount(),
    trySpawn(type) {
      // El punto se valida con la caja y la máscara de ese tamaño. Si no hay
      // punto válido, no aparece nada este tick.
      const point = scene.pickSpawn(type, scene.state.roundRng);
      if (point) scene.spawnEnemy(type, point.x, point.y);
    },
    startRound: (round) => scene.startRound(round),
    completeRound: () => scene.completeRound(),
  });
}

/** Punto de aparición válido para ese tipo, o null (no spawnear). */
export function pickSpawn(scene, type = 'cascarudo', rng = scene.state.roundRng) {
  const px = scene.player.x;
  const py = scene.player.feet;
  const near = [];
  const far = [];
  for (const point of scene.spawns) {
    if (!scene.canSpawnAt(type, point.x, point.y)) continue;
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

export function spawnEnemy(scene, type, x, y) {
  // La caja real del bicho y su alcanzabilidad mandan: nada de fallbacks
  // que lo dejen dentro de un sólido (A4).
  if (!scene.canSpawnAt(type, x, y)) return null;
  const enemy = createEnemy(type, x, y, scene.state.roundRng);
  applyRound(enemy, scene.state.cfg.hpMul, scene.state.cfg.speedMul);
  scene.state.enemies.push(enemy);
  enemy.vis = scene.makeEnemyVisual(enemy);
  scene.state.spawned += 1;
  scene.spawnFx('salpicadura', x, y - 4, 0.3);
  return enemy;
}

export function aliveCount(scene) {
  let count = 0;
  for (const enemy of scene.enemies) if (!enemy.dead) count += 1;
  return count;
}

export function debugSetRound(scene, round) {
  scene.clearEnemies();
  scene.state.round = Math.max(1, Math.floor(Number(round) || 1));
  scene.state.cfg = roundConfig(scene.state.round);
  scene.setMode('active');
  scene.state.bannerT = 0;
  scene.state.spawned = 0;
  scene.state.spawnTimer = 0;
  scene.state.integrity = scene.state.integrityMax;
  scene.state.firstBiteReady = Boolean(scene.state.eff.firstBiteFree);
  scene.state.invuln = 0;
  scene.state.patchT = 0;
  scene.player.setFrozen(false);
  const count = Math.min(scene.state.cfg.maxAlive, 6);
  for (let i = 0; i < count; i++) {
    const type = i === 0 && scene.state.cfg.armoredPct > 0
      ? 'acorazado' : pickType(scene.state.round, scene.state.roundRng);
    const point = scene.pickSpawn(type);
    if (point) scene.spawnEnemy(type, point.x, point.y);
  }
  scene.state.spawnTimer = 0.7;
}

export function debugSpawn(scene, type = 'cascarudo') {
  const point = scene.pickSpawn(type);
  const enemy = point ? scene.spawnEnemy(type, point.x, point.y) : null;
  return enemy ? enemy.type : null;
}
