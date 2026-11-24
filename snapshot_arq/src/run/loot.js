// Botín del roguelike y la mochila de otra vez. Todo puro: nunca muta lo que recibe.

export const LOOT_KINDS = ['chatarra', 'goma', 'nafta', 'pieza'];

// Nombres de sprite en el atlas de items.
export const LOOT_ITEM = {
  chatarra: 'chatarra',
  goma: 'goma',
  nafta: 'nafta',
  pieza: 'pieza_cascarudo',
};

export const LOOT_NAME = {
  chatarra: 'chatarra',
  goma: 'goma',
  nafta: 'nafta',
  pieza: 'pieza de cascarudo',
};

/** Bolsa vacía nueva. */
export function emptyBag() {
  return { chatarra: 0, goma: 0, nafta: 0, pieza: 0 };
}

// Copia solo las claves conocidas de una bolsa.
function knownBag(bag) {
  const out = emptyBag();
  for (const kind of LOOT_KINDS) {
    const n = Number(bag?.[kind]);
    if (Number.isFinite(n)) out[kind] = n;
  }
  return out;
}

/** Bolsa nueva con `n` del tipo `kind`. Ignora tipos desconocidos y cantidades raras. */
export function addToBag(bag, kind, n = 1) {
  const out = knownBag(bag);
  if (!LOOT_KINDS.includes(kind)) return out;
  if (!Number.isFinite(n) || n < 0) return out;
  out[kind] += n;
  return out;
}

/** Total de cosas en la bolsa. */
export function bagCount(bag) {
  let total = 0;
  for (const kind of LOOT_KINDS) {
    const n = Number(bag?.[kind]);
    if (Number.isFinite(n)) total += n;
  }
  return total;
}

/** Lo que suelta un enemigo. El orden de las tiradas importa (va fijo). */
export function enemyDrop(type, rng) {
  if (type === 'cascarudo') {
    const drops = [];
    if (rng() < 0.3) drops.push({ kind: 'chatarra', n: 1 });
    if (rng() < 0.15) drops.push({ kind: 'goma', n: 1 });
    return drops;
  }
  if (type === 'veloz') {
    return rng() < 0.25 ? [{ kind: 'goma', n: 1 }] : [];
  }
  if (type === 'acorazado') {
    const drops = [];
    if (rng() < 0.6) drops.push({ kind: 'pieza', n: 1 });
    if (rng() < 0.5) drops.push({ kind: 'chatarra', n: 1 });
    return drops;
  }
  return [];
}

/** Botín de un punto del mapa: los autos siempre dan nafta. */
export function spotLoot(spot, rng) {
  if (spot?.kind === 'nafta') return { kind: 'nafta', n: 1 };
  const r = rng();
  const kind = r < 0.5 ? 'chatarra' : r < 0.85 ? 'goma' : 'nafta';
  const n = rng() < 0.5 ? 1 : 2;
  return { kind, n };
}

/** Al morir: deja la bolsa como mochila y suma una muerte. Si la bolsa está vacía, no pisa la mochila anterior. */
export function dropMochila(save, bag, loop) {
  const prev = save ?? {};
  return {
    ...prev,
    mochila: bagCount(bag) > 0 ? { loop, contenido: knownBag(bag) } : prev.mochila ?? null,
    muertes: (prev.muertes ?? 0) + 1,
  };
}

/** Un punto de botín lejos de la casa, al azar, o null si no hay. */
export function pickMochilaSpot(lootSpots, rng, excludeCell = 'casa') {
  const list = Array.isArray(lootSpots) ? lootSpots : [];
  const valid = list.filter((spot) => spot?.cell !== excludeCell);
  if (valid.length === 0) return null;
  return valid[Math.floor(rng() * valid.length)];
}

/** Levantar la mochila: se suma a la bolsa y el save queda sin mochila. */
export function recoverMochila(save, bag) {
  let nextBag = knownBag(bag);
  const contenido = save?.mochila?.contenido;
  if (contenido) {
    for (const kind of LOOT_KINDS) {
      const n = Number(contenido[kind]);
      if (Number.isFinite(n) && n > 0) nextBag[kind] += n;
    }
  }
  return {
    save: { ...(save ?? {}), mochila: null },
    bag: nextBag,
  };
}
