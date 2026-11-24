// Diálogos de (A): sólo eligen la entrada de src/data/script.js según las
// banderas. Todos los textos viven en ese archivo.
import { TALK, NEUTRAL } from './data/script.js';

/**
 * Diálogo de un personaje/objeto. `game` trae flags, inventario y traje.
 * Nunca devuelve null para un id conocido: los objetos interactuables siempre
 * tienen una línea.
 */
export function talkEntry(id, game = {}) {
  if (!id) return null;
  const pick = TALK[id];
  if (pick) return pick(game || {});
  return { speaker: 'Juan', portrait: 'juan', lines: [NEUTRAL] };
}

/** Aviso de salida sin traje (choice). */
export const WARNING = {
  question: 'Sin el traje, la nevada te mata. ¿Salir igual?',
  options: ['No', 'Sí'],
};
