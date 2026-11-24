// La casa/base entre salidas: opciones de título, cierre de una salida y
// arranque de la siguiente. Todo puro: nunca toca DOM, ni Three.js, ni muta.

import { addBotin } from './run/save.js';
import { dropMochila, bagCount, LOOT_NAME } from './run/loot.js';
import { seedFor } from './run/seed.js';

/** Flags de historia que ya quedaron puestos al volver a la base (sin `base`: lo pone el llamador). */
export const BASE_FLAGS = {
  mate_tutorial: true,
  truco_jugado: true,
  apagon: true,
  vio_la_nevada: true,
  casa_sellada: true,
  idea_traje: true,
  elena_hablada: true,
  ramirez_muerto: true,
  electrogeno_on: true,
  extractor_ok: true,
  traje_fabricado: true,
  esclusa_lista: true,
  dados: true,
  listo_para_salir: true,
  martita_ventana: 'ok',
  afuera: true,
};

/** Opciones del título: con traje hecho aparece "Continuar" y "Partida nueva". */
export function titleOptions(save) {
  if (save && save.trajeHecho) {
    return ['Continuar', 'Partida nueva', 'Minijuego', 'Controles', 'Creditos'];
  }
  return ['Jugar', 'Minijuego', 'Controles', 'Creditos'];
}

// Un número válido para el récord: finito y no negativo. Todo lo demás vale 0.
function safeNum(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}

// Copia del save con best/mochila propios, para no devolver referencias compartidas.
function copyForEnd(save) {
  const prev = save && typeof save === 'object' ? save : {};
  return {
    ...prev,
    best: { ...(prev.best ?? {}) },
    mochila: prev.mochila ? { ...prev.mochila } : (prev.mochila ?? null),
  };
}

/**
 * Cómo cierra una salida (M5): 'volvio' | 'murio' | 'abandono' | 'otro'.
 * Abandonar la salida desde la pausa o el resultado cuenta como muerte: deja la
 * mochila en la nieve y suma una muerte, pero no dispara la queja de la base.
 */
export function endRunKind(result) {
  const type = result && typeof result === 'object' ? result.type : null;
  if (type === 'volvio') return 'volvio';
  if (type === 'murio') return 'murio';
  if (type === 'abandono') return 'abandono';
  return 'otro';
}

/** Solo la muerte jugada se queja cada tres: el abandono es una muerte sin queja. */
export function endRunComplains(result, save) {
  return endRunKind(result) === 'murio' && shouldComplain(save);
}

/** Resultado de abandonar desde la pausa: muerte sin queja (M5). */
export function abandonResult({ bag = null, round = 0, points = 0 } = {}) {
  return { type: 'abandono', bag, round, points };
}

/** Una salida real trae game.run. El Minijuego corre aislado y no persiste (M1). */
export function runPersists(run, isolated) {
  return Boolean(run) && !isolated;
}

/**
 * Cola de una sola ranura para los cambios de escena (M6). Un pedido que llega
 * con una transición (o el traje) en curso no se descarta: el último queda
 * encolado y se arranca cuando la escena queda quieta.
 */
export function createSceneQueue() {
  let pending = null;
  return {
    /** La transición a arrancar, o null si el pedido quedó encolado. */
    request(name, spawn, busy) {
      const next = { name, spawn: spawn ?? null };
      if (busy) {
        pending = next;
        return null;
      }
      pending = null;
      return next;
    },
    /** Lo encolado (y lo limpia), o null. */
    take() {
      const out = pending;
      pending = null;
      return out;
    },
    clear() {
      pending = null;
    },
    get pending() {
      return pending;
    },
  };
}

/** Cierra una salida ('volvio' | 'murio' | 'abandono' | otra cosa) y devuelve un save NUEVO. */
export function endRunSave(save, result = {}) {
  const r = result && typeof result === 'object' ? result : {};
  const kind = endRunKind(r);
  let base;
  if (kind === 'volvio') base = addBotin(save, r.bag);
  else if (kind === 'murio' || kind === 'abandono') base = dropMochila(save, r.bag, save && save.loop);
  else base = copyForEnd(save);

  const out = copyForEnd(base);
  const prevBest = out.best;
  out.best = {
    ...prevBest,
    round: Math.max(safeNum(prevBest.round), safeNum(r.round)),
    points: Math.max(safeNum(prevBest.points), safeNum(r.points)),
  };
  if (r.recovered === true && r.type === 'volvio') out.mochila = null;
  return out;
}

/** El tipo de la base se queja cada tres muertes. */
export function shouldComplain(save) {
  return Boolean(save && save.muertes > 0 && save.muertes % 3 === 0);
}

/** Arranca la salida: sube el loop y arma la semilla de la noche. run.save es el save nuevo. */
export function startRunSave(save) {
  const prev = save && typeof save === 'object' ? save : {};
  const loop = (safeNum(prev.loop) || 0) + 1;
  const saveNuevo = { ...prev, loop };
  const run = { loop, seed: seedFor(loop), save: saveNuevo };
  return { save: saveNuevo, run };
}

/** 'Volviste con: 3 chatarra, 1 goma' (solo lo que hay, en orden fijo). */
export function bagSummary(bag) {
  if (!(bagCount(bag) > 0)) return 'Volviste con las manos vacías.';
  const parts = [];
  for (const kind of ['chatarra', 'goma', 'nafta', 'pieza']) {
    const n = Number(bag?.[kind]);
    if (Number.isFinite(n) && n > 0) parts.push(`${n} ${LOOT_NAME[kind]}`);
  }
  return `Volviste con: ${parts.join(', ')}`;
}

/** Objetivo de la base: si quedó una mochila en la calle, primero ir a buscarla. */
export function baseObjective(save) {
  if (save && save.mochila) {
    return { id: 'base_mochila', text: 'Volvé a salir. La mochila de otra vez quedó en la calle.' };
  }
  return { id: 'base', text: 'Mejorá lo que puedas y volvé a salir.' };
}
