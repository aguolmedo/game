// Semilla de la noche y mano de truco española (40 cartas).

import { rngFromSeed, shuffled } from './rng.js';

/** Hash FNV-1a de "loop:salt" → entero de 32 bits sin signo. Misma entrada, misma semilla. */
export function seedFor(loop, salt = 0) {
  const text = `${Number(loop) || 0}:${Number(salt) || 0}`;
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const PALOS = ['espada', 'basto', 'oro', 'copa'];
export const NUMEROS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

/** Valores del envido: las figuras (10, 11, 12) valen 0. */
function cardValue(n) {
  const v = Number(n);
  return v >= 1 && v <= 7 ? v : 0;
}

/** Tres cartas distintas del mazo español, determinísticas para la misma semilla. */
export function handFromSeed(seed) {
  const deck = [];
  for (const palo of PALOS) {
    for (const n of NUMEROS) deck.push({ n, palo });
  }
  return shuffled(rngFromSeed(seed), deck).slice(0, 3);
}

/** '7 de oro · 1 de espada · 4 de copa' */
export function handText(hand) {
  const cards = Array.isArray(hand) ? hand : [];
  return cards.map((c) => `${c.n} de ${c.palo}`).join(' · ');
}

/** Envido: mejor par del mismo palo (20 + suma) o la carta más alta que no sea figura. */
export function envido(hand) {
  if (!Array.isArray(hand) || hand.length === 0) return 0;
  const cards = hand.filter((c) => c && PALOS.includes(c.palo));

  let bestPair = -1;
  for (let i = 0; i < cards.length; i += 1) {
    for (let j = i + 1; j < cards.length; j += 1) {
      if (cards[i].palo !== cards[j].palo) continue;
      const value = 20 + cardValue(cards[i].n) + cardValue(cards[j].n);
      if (value > bestPair) bestPair = value;
    }
  }
  if (bestPair >= 0) return bestPair;

  let best = 0;
  for (const c of cards) best = Math.max(best, cardValue(c.n));
  return best;
}

// La mano del cómic: 33 de envido (Juan es mano). Semilla fija, buscada con un loop aparte.
export const SEED_33 = 57;
