// Rondas y aparición de bichos: configuración, spawns validados y conteo.
// Funciones que reciben la escena.
import {
  roundConfig, pickType, nextSpawnDelay, MIN_SPAWN_DIST, ROUND_BREAK,
} from './waves.js';
import { addRound, ROUND_FACTOR } from './points.js';
import { createEnemy, applyRound } from './enemies.js';

const MAX_SPAWN_DIST = 380;


export function startRound(scene, round) {
  scene.round = round;
  scene.cfg = roundConfig(round);
  scene.phase = 'active';
  scene.bannerT = 0;
  scene.spawned = 0;
  scene.spawnTimer = 0.4;
  scene.firstBiteReady = Boolean(scene.eff.firstBiteFree);
}

export function completeRound(scene) {
  addRound(scene.points, scene.round);
  scene.toast(`Ronda ${scene.round} — +${ROUND_FACTOR * scene.round} puntos`);
  scene.round += 1;
  scene.cfg = roundConfig(scene.round);
  scene.phase = 'banner';
  scene.bannerT = ROUND_BREAK;
  scene.spawned = 0;
  scene.spawnTimer = 0;
}

export function updateRound(scene, dt) {
  if (scene.phase === 'banner') {
    scene.bannerT -= dt;
    if (scene.bannerT <= 0) scene.startRound(scene.round);
    return;
  }
  if (scene.phase !== 'active') return;
  const alive = scene.aliveCount();
  if (scene.spawned < scene.cfg.total && alive < scene.cfg.maxAlive) {
    scene.spawnTimer -= dt;
    if (scene.spawnTimer <= 0) {
      // Primero el tipo: el punto se valida con la caja y la máscara de ese
      // tamaño. Si no hay punto válido, no aparece nada este tick.
      const type = pickType(scene.round, scene.roundRng);
      const point = scene.pickSpawn(type, scene.roundRng);
      if (point) scene.spawnEnemy(type, point.x, point.y);
      scene.spawnTimer = nextSpawnDelay(scene.roundRng);
    }
  }
  if (scene.spawned >= scene.cfg.total && alive === 0) scene.completeRound();
}

/** Punto de aparición válido para ese tipo, o null (no spawnear). */
export function pickSpawn(scene, type = 'cascarudo', rng = scene.roundRng) {
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
  const enemy = createEnemy(type, x, y, scene.roundRng);
  applyRound(enemy, scene.cfg.hpMul, scene.cfg.speedMul);
  scene.enemies.push(enemy);
  enemy.vis = scene.makeEnemyVisual(enemy);
  scene.spawned += 1;
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
  scene.round = Math.max(1, Math.floor(Number(round) || 1));
  scene.cfg = roundConfig(scene.round);
  scene.phase = 'active';
  scene.bannerT = 0;
  scene.spawned = 0;
  scene.spawnTimer = 0;
  scene.dead = false;
  scene.vignetteOpen = false;
  scene.resultOpen = false;
  scene.integrity = scene.integrityMax;
  scene.firstBiteReady = Boolean(scene.eff.firstBiteFree);
  scene.invuln = 0;
  scene.patchT = 0;
  scene.player.setFrozen(false);
  const count = Math.min(scene.cfg.maxAlive, 6);
  for (let i = 0; i < count; i++) {
    const type = i === 0 && scene.cfg.armoredPct > 0
      ? 'acorazado' : pickType(scene.round, scene.roundRng);
    const point = scene.pickSpawn(type);
    if (point) scene.spawnEnemy(type, point.x, point.y);
  }
  scene.spawnTimer = 0.7;
}

export function debugSpawn(scene, type = 'cascarudo') {
  const point = scene.pickSpawn(type);
  const enemy = point ? scene.spawnEnemy(type, point.x, point.y) : null;
  return enemy ? enemy.type : null;
}
