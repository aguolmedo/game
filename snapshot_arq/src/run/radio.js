// La radio de Lucas: rumores de la noche (pistas que a veces son ciertas) y los gags
// que agarra entre la estática. La noche la define el barrio: las mismas celdas, los
// mismos rumores ciertos.

import { pick } from './rng.js';

/** ¿Hay una celda de este tipo en el barrio de esta noche? */
function hasCell(cells, type) {
  if (!Array.isArray(cells)) return false;
  return cells.some((cell) => cell && cell.type === type);
}

/**
 * Rumores que suelta la radio. `check(cells)` dice si el rumor es cierto para esa noche.
 * cells: lista tipo [{ type: 'casa' | 'esquina' | 'plaza' | 'vias' | 'cortada' }].
 */
export const RUMORES = [
  {
    id: 'ferreteria',
    text: 'Dicen que en la ferretería quedaron balas.',
    check: (cells) => hasCell(cells, 'esquina'),
  },
  {
    id: 'vias',
    text: 'Por las vías no pasa nadie hace horas.',
    check: (cells) => hasCell(cells, 'vias'),
  },
  {
    id: 'plaza',
    text: 'En la plaza se juntan los bichos.',
    check: (cells) => hasCell(cells, 'plaza'),
  },
  {
    id: 'almacen',
    text: 'Al fondo del pasaje hay un almacén que nadie saqueó.',
    check: (cells) => hasCell(cells, 'cortada'),
  },
  {
    id: 'tranquilo',
    text: 'Esta noche está tranquilo el barrio.',
    check: () => false,
  },
  {
    id: 'ramirez',
    text: 'Alguien vio luz en lo de Ramírez.',
    check: () => false,
  },
  {
    id: 'callejon',
    text: 'Se escuchan pasos en el callejón.',
    check: (cells) => hasCell(cells, 'cortada'),
  },
  {
    id: 'choque',
    text: 'En la cuadra del choque hay un auto dado vuelta.',
    check: (cells) => hasCell(cells, 'esquina'),
  },
  {
    id: 'nieve_plaza',
    text: 'La nieve brilla raro en la plaza.',
    check: (cells) => hasCell(cells, 'plaza'),
  },
  {
    id: 'tren_once',
    text: 'El tren de las once ya no va a pasar.',
    check: (cells) => hasCell(cells, 'vias'),
  },
  {
    id: 'garita',
    text: 'La garita del paso a nivel quedó abierta.',
    check: (cells) => hasCell(cells, 'vias'),
  },
  {
    id: 'colectivo',
    text: 'Hay un colectivo cruzado en la ochava.',
    check: (cells) => hasCell(cells, 'esquina'),
  },
];

// Los gags del partido y del tango se repiten en todos los niveles: la radio agarra
// siempre lo mismo y siempre se corta en el mismo lugar.
const GOL =
  '…la pelota al medio, entra el nueve, ¡Gol! …y siguen festejando en la cancha, como si no nevara.';
const TANGO =
  '…un tango, siempre el mismo tango, y la estática se lo come justo en el estribillo.';
const OTRO_LOOP = 'CQ, CQ, acá desde Vicente López… ¿Juan? ¿Sos vos?';
const NUMEROS = '…siete… cuatro… cuatro… uno… —¿quién cuenta? —…siete…';

/**
 * Lo que agarra la radio según el nivel de Lucas (0..3). Cuanto más destrabada,
 * más frecuencias: primero la estática, después el partido y el tango, después
 * los otros loops, y al final la voz que cuenta números.
 */
export const GAGS_RADIO = {
  0: [
    '…ssshhh… nada, puro ruido blanco. La nieve debe estar comiéndose la antena.',
    TANGO,
    GOL,
    '…psss… una radio de colectivo, un pasacalle, el himno. Todo mezclado con la nieve.',
  ],
  1: [
    OTRO_LOOP,
    '…dicen que en la ferretería quedaron balas. Dicen. Vaya uno a saber.',
    TANGO,
    GOL,
    '…ssshhh… nada, puro ruido blanco. La nieve debe estar comiéndose la antena.',
  ],
  2: [
    OTRO_LOOP,
    '…una voz de mujer que repite un número de teléfono que ya no existe.',
    '…una sirena lejos, de esas que antes eran de bomberos.',
    GOL,
    TANGO,
    '…psss… y del otro lado alguien respira despacio, como si durmiera.',
  ],
  3: [
    NUMEROS,
    OTRO_LOOP,
    GOL,
    TANGO,
    '…una voz de mujer que repite un número de teléfono que ya no existe.',
    '…dicen que en la ferretería quedaron balas. Dicen. Vaya uno a saber.',
  ],
};

/** Deja el nivel de Lucas dentro de 0..3. */
function clampLevel(level) {
  const n = Math.trunc(Number(level));
  if (!Number.isFinite(n) || n < 0) return 0;
  if (n > 3) return 3;
  return n;
}

/** Elige un rumor al azar y dice si es cierto para el barrio de esa noche. */
export function rumorFor(cells, rng) {
  if (typeof rng !== 'function') throw new Error('rumorFor: falta rng');
  const list = Array.isArray(cells) ? cells : [];
  const rumor = pick(rng, RUMORES);
  const cierto = typeof rumor.check === 'function' ? rumor.check(list) : false;
  return { text: rumor.text, cierto };
}

/** Una línea de radio para el nivel de Lucas (0..3). */
export function radioLine(level, rng) {
  if (typeof rng !== 'function') throw new Error('radioLine: falta rng');
  const lines = GAGS_RADIO[clampLevel(level)];
  return pick(rng, lines);
}
