// Guardado persistente del roguelike (localStorage). Todo lo que toca el storage
// va en try/catch: puede no existir, estar lleno o tirar error.
//
// Sin migraciones: nadie juega todavía; un save de otra versión se descarta.
// El storage se resuelve recién adentro de un try (`storageOrNull`), así un
// navegador con el origen restringido no rompe el arranque.
//
// M12: `best` vive sólo en el save, que es la única fuente de verdad del récord.

export const SAVE_KEY = 'eternauta.save.v1'; // clave histórica: no se renombra
export const SAVE_VERSION = 1;

/** Las cuatro cosas que se juntan en la salida y se guardan en la casa. */
const BOTIN_KEYS = ['chatarra', 'goma', 'nafta', 'pieza'];

function isObj(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** localStorage dentro de try: si el getter tira (origen restringido), null. */
export function storageOrNull() {
  try {
    const store = globalThis.localStorage;
    return store && typeof store.getItem === 'function' ? store : null;
  } catch {
    return null;
  }
}

/** El storage explícito o, si no se pasó ninguno, el del navegador (o null). */
function resolveStorage(storage) {
  return storage === undefined ? storageOrNull() : (storage || null);
}

function readText(store, key) {
  try {
    return store ? store.getItem(key) : null;
  } catch {
    return null;
  }
}

function removeKey(store, key) {
  try {
    if (store) store.removeItem(key);
  } catch {
    // si no se puede borrar, no hay nada que hacer
  }
}

/** Un save vacío, siempre nuevo (sin referencias compartidas). */
export function emptySave() {
  return {
    v: SAVE_VERSION,
    trajeHecho: false,
    loop: 0,
    muertes: 0,
    botin: { chatarra: 0, goma: 0, nafta: 0, pieza: 0 },
    mejoras: { favalli: 0, elena: 0, lucas: 0, luz: 0 },
    mochila: null,
    best: { round: 0, points: 0 },
  };
}

/** Copia un save completando con emptySave() lo que falte (no muta el original). */
function copySave(save) {
  const base = emptySave();
  if (!isObj(save)) return base;
  return {
    ...base,
    ...save,
    v: SAVE_VERSION,
    botin: { ...base.botin, ...(isObj(save.botin) ? save.botin : {}) },
    mejoras: { ...base.mejoras, ...(isObj(save.mejoras) ? save.mejoras : {}) },
    mochila: isObj(save.mochila)
      ? { ...save.mochila, contenido: { ...save.mochila.contenido } }
      : (save.mochila ?? null),
    best: { ...base.best, ...(isObj(save.best) ? save.best : {}) },
  };
}

/**
 * Lee el save. Si no hay nada, está roto o es de otra versión, devuelve uno
 * vacío. Nunca tira.
 */
export function loadSave(storage = undefined) {
  const store = resolveStorage(storage);
  const text = readText(store, SAVE_KEY);
  if (!text) return emptySave();
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return emptySave();
  }
  if (!isObj(raw)) return emptySave();
  if (Number(raw.v) !== SAVE_VERSION) return emptySave();
  return copySave(raw);
}

/** Guarda el save. Devuelve true si pudo, false ante cualquier error. Nunca tira. */
export function writeSave(save, storage = undefined) {
  const store = resolveStorage(storage);
  if (!store) return false;
  try {
    store.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    return false;
  }
  return true;
}

/** Borra el save. Nunca tira. */
export function clearSave(storage = undefined) {
  const store = resolveStorage(storage);
  removeKey(store, SAVE_KEY);
}

/** Suma una bolsa (botín de la salida) al save y devuelve un save NUEVO. */
export function addBotin(save, bag) {
  const out = copySave(save);
  if (!isObj(bag)) return out;
  for (const key of BOTIN_KEYS) {
    const n = bag[key];
    if (typeof n === 'number' && Number.isFinite(n) && n > 0) {
      out.botin[key] = (out.botin[key] ?? 0) + n;
    }
  }
  return out;
}
