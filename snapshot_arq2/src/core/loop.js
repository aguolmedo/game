/** Paso fijo de la lógica: 1/60 s, hasta 5 pasos por frame (anti espiral). */
export const STEP = 1 / 60;
export const MAX_STEPS = 5;
const MAX_FRAME = 0.25;

/**
 * Acumulador puro. acc = resto anterior, frameDt = segundos del frame.
 * Devuelve { acc, steps }; si se pasa del tope descarta el atraso.
 */
export function stepAccumulator(acc, frameDt, step = STEP, maxSteps = MAX_STEPS) {
  let total = acc + Math.min(MAX_FRAME, Math.max(0, frameDt));
  let steps = 0;
  while (total >= step - 1e-9 && steps < maxSteps) {
    total -= step;
    steps += 1;
  }
  if (steps === maxSteps && total >= step) total = 0;
  return { acc: Math.max(0, total), steps };
}

const EDGE_FLAGS = ['handsPressed', 'prevHotbar', 'nextHotbar', 'padAPressed',
  'aPressed', 'bPressed', 'yPressed', 'startPressed'];

/** Copia del input sin eventos de un solo frame (para los sub-pasos 2..n). */
export function quietInput(state) {
  const quiet = { ...state, slotPressed: -1, wheel: 0, click: null, rightClick: null };
  for (const key of EDGE_FLAGS) quiet[key] = false;
  return quiet;
}

/**
 * Reparte el input de un poll() por frame entre los pasos fijos: los eventos
 * de flanco los ve solo el primer paso, y si un frame no corre pasos se
 * guardan para el próximo (ni se pierden ni se duplican).
 */
export function createInputGate() {
  let pending = null;
  const merge = (state) => {
    if (!pending) { pending = { ...state }; return; }
    const prev = pending;
    pending = { ...state };
    for (const key of EDGE_FLAGS) pending[key] = prev[key] || state[key];
    pending.slotPressed = state.slotPressed >= 0 ? state.slotPressed : prev.slotPressed;
    pending.wheel = prev.wheel + state.wheel;
    pending.click = state.click || prev.click;
    pending.rightClick = state.rightClick || prev.rightClick;
  };
  return {
    /** Entrega el poll del frame y devuelve un input por paso. */
    take(state, steps) {
      merge(state);
      if (steps <= 0) return [];
      const out = [pending];
      for (let i = 1; i < steps; i++) out.push(quietInput(pending));
      pending = null;
      return out;
    },
  };
}
