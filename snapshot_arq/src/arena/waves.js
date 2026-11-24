// Rondas de cascarudos (§11.4). Lógica pura: sin DOM ni three.
// Coordenadas en píxeles, Y hacia abajo (igual que el resto del juego).
import { rngFromSeed } from '../run/rng.js';

export const TILE = 16;
export const MIN_SPAWN_DIST = 6 * TILE; // 96 px: nunca aparecen encima del jugador
export const ROUND_BREAK = 8; // segundos entre rondas

const TYPES = ['cascarudo', 'veloz', 'acorazado'];

/** Configuración derivada de la ronda r (r >= 1). */
export function roundConfig(r) {
  const round = Math.max(1, Math.floor(Number(r) || 1));
  return {
    round,
    total: 6 + 4 * round + Math.floor((round * round) / 3),
    maxAlive: Math.min(8 + 2 * round, 40),
    hpMul: 1 + 0.18 * (round - 1),
    speedMul: Math.min(1.7, 1 + 0.05 * (round - 1)),
    // Mezcla: desde 3 hay 25% veloces; desde 5, +10% acorazados
    // (+2% por ronda extra, tope 30%).
    fastPct: round >= 3 ? 0.25 : 0,
    armoredPct: round >= 5 ? Math.min(0.30, 0.10 + 0.02 * (round - 5)) : 0,
  };
}

/** Tipo de bicho que aparece en la ronda. rng() devuelve [0,1). */
export function pickType(r, rng) {
  if (typeof rng !== 'function') throw new Error('pickType: falta rng');
  const cfg = roundConfig(r);
  const roll = Number(rng()) || 0;
  if (cfg.armoredPct > 0 && roll < cfg.armoredPct) return 'acorazado';
  if (cfg.fastPct > 0 && roll < cfg.armoredPct + cfg.fastPct) return 'veloz';
  return 'cascarudo';
}

function pointOf(spawn) {
  if (!spawn) return null;
  if (Array.isArray(spawn)) return { x: spawn[0], y: spawn[1] };
  if (Number.isFinite(spawn.x) && Number.isFinite(spawn.y)) {
    return { x: spawn.x, y: spawn.y };
  }
  return null;
}

function distTo(player, point) {
  if (!player) return Infinity;
  return Math.hypot(point.x - player.x, point.y - (player.feet ?? player.y));
}

/**
 * Elige un punto de aparición lejos del jugador.
 * `spawns` es una lista de {x,y} (o [x,y]) en píxeles.
 * Devuelve null si no hay ninguno a `minDist` o más: la escena decide
 * un borde alternativo. Nunca devuelve un punto cerca del jugador.
 */
export function spawnPoint(rng, spawns = [], player = null, minDist = MIN_SPAWN_DIST) {
  if (typeof rng !== 'function') throw new Error('spawnPoint: falta rng');
  const points = spawns.map(pointOf).filter(Boolean);
  const far = points.filter((p) => distTo(player, p) >= minDist);
  if (!far.length) return null;
  const index = Math.min(far.length - 1, Math.floor((Number(rng()) || 0) * far.length));
  return { ...far[index] };
}

/** Pausa entre apariciones: 0.6 a 1.2 segundos. */
export function nextSpawnDelay(rng) {
  if (typeof rng !== 'function') throw new Error('nextSpawnDelay: falta rng');
  return 0.6 + (Number(rng()) || 0) * 0.6;
}

/**
 * Secuencia completa de apariciones para una semilla: misma semilla, misma
 * salida. Cada aparición gasta una tirada de posición, una de tipo y una de
 * demora, en ese orden (igual que updateRound en la arena).
 */
export function waveSequence(seed, { round = 1, spawns = [], player = null, count = 20 } = {}) {
  const rng = rngFromSeed(((Number(seed) >>> 0) ^ 0x5eed) >>> 0);
  const out = [];
  for (let i = 0; i < count; i++) {
    const p = spawnPoint(rng, spawns, player) || { x: 0, y: 0 };
    out.push({ type: pickType(round, rng), x: p.x, y: p.y, delay: nextSpawnDelay(rng) });
  }
  return out;
}

// Palotes de tinta: cada grupo son 4 rayas verticales y una diagonal encima.
export const TALLY_OVERLINE = '̸';

/**
 * Representación de texto de los palotes. n=5 -> "IIII" con overline,
 * n=6 -> "IIII̸I". Para dibujar en el HUD usá tallyText().
 */
export function romanTally(n) {
  const count = Math.max(0, Math.floor(Number(n) || 0));
  const groups = Math.floor(count / 5);
  const rest = count % 5;
  return ('IIII' + TALLY_OVERLINE).repeat(groups) + 'I'.repeat(rest);
}

/**
 * Datos para dibujar palotes: {full, rest}.
 * `full` = grupos completos de 5 (4 rayas + diagonal), `rest` = rayas sueltas.
 */
export function tallyText(n) {
  const count = Math.max(0, Math.floor(Number(n) || 0));
  return { full: Math.floor(count / 5), rest: count % 5 };
}

export { TYPES };
