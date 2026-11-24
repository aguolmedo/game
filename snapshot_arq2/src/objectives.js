// Objetivos de la historia: lógica pura, sin DOM ni Three.js (diseño §6.2).
// El texto no lleva el prefijo "Objetivo: ": lo pone el HUD.
import { STREET_END_X } from './logic.js';
import { FLAG } from './data/flags.js';

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
  { id: 'ramirez', text: 'Mirá la ventana del living.' },
  { id: 'attic', text: 'Subí al altillo: Favalli tiene un plan.' },
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
  FLAG.CLOSED_WINDOW_MARTITA, FLAG.CLOSED_WINDOW_LIVING,
  FLAG.CLOSED_HALL_DOOR, FLAG.CLOSED_GARAGE_DOOR,
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
  if (flags[FLAG.ELECTROGENO_ON]) n += 1;
  if (flags[FLAG.EXTRACTOR_OK]) n += 1;
  if (flags[FLAG.TRAJE_FABRICADO]) n += 1;
  return n;
}

// Checklist de la esclusa: los mismos tres pasos del contador, con etiqueta.
export const AIRLOCK_STEPS = [
  { id: 'nafta', label: 'Nafta', flag: FLAG.ELECTROGENO_ON },
  { id: 'extractor', label: 'Extractor', flag: FLAG.EXTRACTOR_OK },
  { id: 'traje', label: 'Traje', flag: FLAG.TRAJE_FABRICADO },
];

/** Estado de los tres pasos de la esclusa (nafta, extractor, traje). */
export function airlockChecklist(flags = {}) {
  return AIRLOCK_STEPS.map((step) => ({
    id: step.id,
    label: step.label,
    done: Boolean(flags[step.flag]),
  }));
}

/** Qué le falta ponerse a Juan para salir: dados, traje y rifle. */
export function equipChecklist(state = {}) {
  return [
    { id: 'dados', label: 'Dados', done: Boolean(state.flags?.[FLAG.DADOS]) },
    { id: 'traje_puesto', label: 'Traje puesto', done: Boolean(state.hasSuit) },
    { id: 'rifle', label: 'Rifle', done: Boolean(state.hasRifle) },
  ];
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
  const materials = state.crafted || flags[FLAG.TRAJE_FABRICADO]
    ? SUIT_NEEDS.length
    : (state.inventory ? countMaterials(state.inventory) : (state.partsComplete ? SUIT_NEEDS.length : 0));

  if (!flags[FLAG.MATE_TUTORIAL]) return objective('mate');
  if (!flags[FLAG.TRUCO_JUGADO]) return objective('table');
  if (!flags[FLAG.APAGON] || !flags[FLAG.VIO_LA_NEVADA]) return objective('window');
  if (!flags[FLAG.MARTITA_VENTANA]) {
    return flags[FLAG.MARTITA_SPRINT] ? objective('martita') : objective('downstairs');
  }
  if (!flags[FLAG.CASA_SELLADA]) {
    const closed = state.closedCount ?? closedCount(flags);
    return withProgress('seal', closed, CLOSED_KEYS.length);
  }
  if (!flags[FLAG.IDEA_TRAJE]) {
    if (flags[FLAG.RAMIREZ_MUERTO]) return objective('attic');
    if (!flags[FLAG.ELENA_HABLADA]) return objective('elena');
    return objective('ramirez');
  }
  if (!flags[FLAG.TRAJE_FABRICADO]) {
    return materials >= SUIT_NEEDS.length
      ? objective('craft')
      : withProgress('materials', materials, SUIT_NEEDS.length);
  }
  if (!flags[FLAG.ESCLUSA_LISTA]) {
    const steps = state.airlockCount ?? airlockCount(flags);
    return {
      ...withProgress('airlock', steps, 3),
      checklist: airlockChecklist(flags),
    };
  }
  if (!flags[FLAG.LISTO_PARA_SALIR]) {
    return { ...objective('equip'), checklist: equipChecklist(state) };
  }
  if (flags[FLAG.ARENA] || flags[FLAG.AFUERA] || map === 'arena') return objective('survive');
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
