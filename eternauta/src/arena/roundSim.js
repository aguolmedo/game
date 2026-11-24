// Paso puro de las oleadas: solo lee/escribe el state de la corrida (sin Three).
// `env` pone lo que depende del mundo: alive(), trySpawn(type) -> bool,
// startRound(), completeRound().
import { pickType, nextSpawnDelay } from './waves.js';

export function roundStep(state, dt, env) {
  if (state.mode === 'banner') {
    state.bannerT -= dt;
    if (state.bannerT <= 0) env.startRound(state.round);
    return;
  }
  if (state.mode !== 'active') return;
  const alive = env.alive();
  if (state.spawned < state.cfg.total && alive < state.cfg.maxAlive) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      env.trySpawn(pickType(state.round, state.roundRng));
      state.spawnTimer = nextSpawnDelay(state.roundRng);
    }
  }
  if (state.spawned >= state.cfg.total && alive === 0) env.completeRound();
}
