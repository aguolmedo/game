// Modo único de la salida: reemplaza las banderas phase/vignetteOpen/resultOpen.
//   banner -> cartel de ronda (sin bichos nuevos)
//   active -> combate
//   dying  -> viñeta de muerte (antes: phase 'dead' + vignetteOpen)
//   result -> pantalla de resultado
export const MODES = ['banner', 'active', 'dying', 'result'];

// Transiciones permitidas. Reiniciar la corrida (resetRun) y debugSetRound
// pueden venir de cualquier modo; por eso banner/active se alcanzan desde todos.
export const TRANSITIONS = {
  banner: ['active', 'dying'],
  active: ['banner', 'dying'],
  dying: ['result', 'banner', 'active'],
  result: ['banner', 'active'],
};

export function canTransition(from, to) {
  if (from === to) return true;
  return Boolean(TRANSITIONS[from] && TRANSITIONS[from].includes(to));
}

/** Cambia el modo validando la tabla. Una transición inválida es un error. */
export function setMode(holder, next) {
  const state = holder.state;
  if (!MODES.includes(next)) throw new Error(`modo desconocido: ${next}`);
  if (!canTransition(state.mode, next)) {
    throw new Error(`transición de modo inválida: ${state.mode} -> ${next}`);
  }
  state.mode = next;
}

/** Fuerza el modo sin validar: solo para los setters de compatibilidad (tools/tests). */
export function forceMode(holder, next) {
  holder.state.mode = next;
}

export const isOverlay = (mode) => mode === 'dying' || mode === 'result';

// Nombre histórico de la bandera phase.
export function phaseOf(mode) {
  return isOverlay(mode) ? 'dead' : mode;
}
