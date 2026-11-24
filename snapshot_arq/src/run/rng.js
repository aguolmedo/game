// Generador pseudoaleatorio con semilla (mulberry32). Lo comparten el barrio (las manzanas del loop),
// el botín y la mano de truco: la misma semilla arma la misma noche.

/** Devuelve una función () => número en [0, 1) determinística para `seed` (entero). */
export function rngFromSeed(seed) {
  let a = (Number(seed) >>> 0) || 0x9e3779b9;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Entero en [min, max] con el rng dado. */

/** Elige un elemento de la lista con el rng dado. */
export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

/** Mezcla una copia de la lista (Fisher-Yates) con el rng dado. */
export function shuffled(rng, list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
