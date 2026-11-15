// Objetivos de la historia: lógica pura, sin DOM ni Three.js (diseño §6.2).
// El texto no lleva el prefijo "Objetivo: ": lo pone el HUD.
import { STREET_END_X } from './logic.js';

// Los 12 textos exactos del §6.2, en orden, más "craft" (guion 2.5: al juntar
// los seis materiales el objetivo pasa a armar el traje en el garaje).
export const OBJECTIVES = [
  { id: 'mate', text: 'Cebate un mate antes de seguir la partida.' },
  { id: 'table', text: 'Volvé a la mesa.' },
  { id: 'window', text: 'Mirá por la ventana.' },
  { id: 'downstairs', text: 'Bajá a ver a Elena y Martita.' },
  { id: 'martita', text: '¡Cerrá la ventana de Martita!' },
  { id: 'seal', text: 'Revisá que toda la casa esté cerrada (0/4).' },
  { id: 'elena', text: 'Hablá con Elena en el living.' },
  { id: 'materials', text: 'Juntá los materiales del traje (0/6).' },
  { id: 'craft', text: 'Armá el traje en el banco del garaje.' },
  { id: 'airlock', text: 'Prepará la esclusa: nafta, extractor, traje (0/3).' },
  { id: 'equip', text: 'Equipate: el traje y el rifle.' },
  { id: 'exit', text: 'Salí por el garaje.' },
  { id: 'survive', text: '¡Sobreviví!' },
];

const INDEX = new Map(OBJECTIVES.map((o, i) => [o.id, i]));

// Materiales de la receta del traje (recipes.js): tiras pide 2.
export const SUIT_NEEDS = [
  { id: 'tela', n: 1 },
  { id: 'guantes', n: 1 },
  { id: 'botas', n: 1 },
  { id: 'tiras', n: 2 },
  { id: 'casco', n: 1 },
  { id: 'lata', n: 1 },
];

// Las cuatro aberturas de la casa (guion 2.2 / diseño §6.3).
export const CLOSED_KEYS = [
  'closed_window_martita', 'closed_window_living', 'closed_hall_door', 'closed_garage_door',
];

function amount(slots, id) {
  let total = 0;
  for (const slot of slots || []) if (slot && slot.id === id) total += slot.count;
  return total;
}

/** Tipos de material del traje que ya están completos (0..6). */
export function countMaterials(inventory) {
  let have = 0;
  for (const need of SUIT_NEEDS) {
    if (amount(inventory, need.id) >= need.n) have += 1;
  }
  return have;
}

/** Cuántas de las cuatro aberturas están cerradas (0..4). */
export function closedCount(flags = {}) {
  let n = 0;
  for (const key of CLOSED_KEYS) if (flags[key]) n += 1;
  return n;
}

/** Pasos de la esclusa listos: nafta, extractor y traje (0..3). */
export function airlockCount(flags = {}) {
  let n = 0;
  if (flags.electrogeno_on) n += 1;
  if (flags.extractor_ok) n += 1;
  if (flags.traje_fabricado) n += 1;
  return n;
}

function objective(id, extra = {}) {
  return { id, text: OBJECTIVES[INDEX.get(id)].text, index: INDEX.get(id), ...extra };
}

function withProgress(id, have, max) {
  const base = objective(id);
  return {
    ...base,
    text: base.text.replace(`(0/${max})`, `(${have}/${max})`),
    progress: { have, max },
  };
}

// Compatibilidad con el estado viejo de main.js ({partsComplete, crafted,
// hasSuit}) mientras el lead termina de integrar initStory().
const LEGACY = {
  parts: { id: 'parts', text: OBJECTIVES[INDEX.get('materials')].text, index: INDEX.get('materials') },
  craft: { id: 'craft', text: OBJECTIVES[INDEX.get('craft')].text, index: INDEX.get('craft') },
  wear: { id: 'wear', text: OBJECTIVES[INDEX.get('equip')].text, index: INDEX.get('equip') },
  exit: { id: 'exit', text: OBJECTIVES[INDEX.get('exit')].text, index: INDEX.get('exit') },
  street: { id: 'street', text: OBJECTIVES[INDEX.get('survive')].text, index: INDEX.get('survive') },
};

function legacyObjective(state) {
  if (state.map === 'street') return { ...LEGACY.street };
  if (state.hasSuit) return { ...LEGACY.exit };
  if (state.crafted) return { ...LEGACY.wear };
  if (state.partsComplete) return { ...LEGACY.craft };
  return { ...LEGACY.parts };
}

/**
 * Objetivo actual según el estado de la partida. Acepta el `game` directo
 * (flags, inventory, hasSuit, ...) o un state con esos mismos campos.
 */
export function currentObjective(state = {}) {
  if ('partsComplete' in state && !('flags' in state)) return legacyObjective(state);

  const flags = state.flags || {};
  const map = state.map ?? state.sceneName;
  const materials = state.crafted || flags.traje_fabricado
    ? SUIT_NEEDS.length
    : (state.inventory ? countMaterials(state.inventory) : (state.partsComplete ? SUIT_NEEDS.length : 0));

  if (!flags.mate_tutorial) return objective('mate');
  if (!flags.truco_jugado) return objective('table');
  if (!flags.apagon || !flags.vio_la_nevada) return objective('window');
  if (!flags.martita_ventana) {
    return flags.martita_sprint ? objective('martita') : objective('downstairs');
  }
  if (!flags.casa_sellada) {
    const closed = state.closedCount ?? closedCount(flags);
    return withProgress('seal', closed, CLOSED_KEYS.length);
  }
  if (!flags.idea_traje) return objective('elena');
  if (!flags.traje_fabricado) {
    return materials >= SUIT_NEEDS.length
      ? objective('craft')
      : withProgress('materials', materials, SUIT_NEEDS.length);
  }
  if (!flags.esclusa_lista) {
    const steps = state.airlockCount ?? airlockCount(flags);
    return withProgress('airlock', steps, 3);
  }
  if (!flags.listo_para_salir) return objective('equip');
  if (flags.arena || flags.afuera || map === 'arena') return objective('survive');
  return objective('exit');
}

// --------------------------------------------------------- helpers viejos del flujo

/** Devuelve un estado NUEVO con el traje puesto/sacado; equippedAt sube al ponérselo. */
export function equipSuit(state, on) {
  const equipped = Boolean(on);
  return {
    ...state,
    hasSuit: equipped,
    equippedAt: (state.equippedAt || 0) + (equipped ? 1 : 0),
  };
}

/** Sólo se puede vestir el traje si ya está fabricado. */
export function canWearSuit(state = {}) {
  return state.crafted === true;
}

/** Intención de salir: sin traje avisa; con traje se va derecho a la calle. */
export function exitOutcome(state = {}, wantsToExit = true) {
  if (!wantsToExit) return { action: 'cancel' };
  return state.hasSuit ? { action: 'street' } : { action: 'warn' };
}

/** Qué pasa en la calle: sin traje muerte, con traje final al llegar al final. */
export function streetOutcome(hasSuit, x, endX = STREET_END_X) {
  if (!hasSuit) return { action: 'death' };
  return x >= endX ? { action: 'end' } : { action: 'street' };
}

/** Respuesta al aviso de salir sin traje: sí = muerte, no = cancelar. */
export function exitWarningFlow(answer) {
  const yes = answer === true || ['si', 'sí'].includes(String(answer).trim().toLowerCase());
  return yes ? 'death' : 'cancel';
}
