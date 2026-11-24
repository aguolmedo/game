// Fabricación: usa los helpers puros del inventario.

import {
  STACK_MAX,
  addItem,
  emptySlots,
  hasItems,
  removeItem,
} from './inventory.js';

/**
 * Se puede fabricar si hay materiales y lugar para el resultado.
 * Regla simple: slot libre, o stack del resultado con espacio.
 */
export function canCraft(slots, recipe) {
  if (!recipe || !hasItems(slots, recipe.needs)) return false;
  if (emptySlots(slots) > 0) return true;
  return slots.some(
    (slot) => slot && slot.id === recipe.result && slot.count < STACK_MAX,
  );
}

/** Consume los materiales y agrega el resultado. Nunca muta la entrada. */
export function craft(slots, recipe) {
  if (!canCraft(slots, recipe)) {
    return { slots, crafted: false, result: null };
  }

  let next = slots;
  for (const need of recipe.needs) {
    next = removeItem(next, need.id, need.n).slots;
  }
  next = addItem(next, recipe.result, 1).slots;
  return { slots: next, crafted: true, result: recipe.result };
}
