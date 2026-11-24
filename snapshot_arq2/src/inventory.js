// Inventario por slots: funciones puras, devuelven siempre arreglos nuevos.

export const STACK_MAX = 9;
export const INVENTORY_SLOTS = 18;

function sizeOf(size) {
  const n = Math.floor(Number(size));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function amountOf(n) {
  const amount = Math.floor(Number(n));
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function cloneSlots(slots) {
  return slots.map((slot) => (slot ? { id: slot.id, count: slot.count } : null));
}

/** Inventario vacío de `size` slots (null = vacío). */
export function createInventory(size = INVENTORY_SLOTS) {
  return new Array(sizeOf(size)).fill(null);
}

/** Agrega `n` de un ítem: primero completa stacks, después usa slots libres. */
export function addItem(slots, id, n = 1) {
  const amount = amountOf(n);
  const next = cloneSlots(slots);
  if (!id || amount === 0) return { slots: next, added: 0 };

  let left = amount;
  for (let i = 0; i < next.length && left > 0; i++) {
    const slot = next[i];
    if (!slot || slot.id !== id || slot.count >= STACK_MAX) continue;
    const take = Math.min(STACK_MAX - slot.count, left);
    slot.count += take;
    left -= take;
  }
  for (let i = 0; i < next.length && left > 0; i++) {
    if (next[i] !== null) continue;
    const take = Math.min(STACK_MAX, left);
    next[i] = { id, count: take };
    left -= take;
  }
  return { slots: next, added: amount - left };
}

/** Saca hasta `n` de un ítem, empezando por los últimos slots. */
export function removeItem(slots, id, n = 1) {
  const amount = amountOf(n);
  const next = cloneSlots(slots);
  if (!id || amount === 0) return { slots: next, removed: 0 };

  let left = amount;
  for (let i = next.length - 1; i >= 0 && left > 0; i--) {
    const slot = next[i];
    if (!slot || slot.id !== id) continue;
    const take = Math.min(slot.count, left);
    slot.count -= take;
    left -= take;
    if (slot.count <= 0) next[i] = null;
  }
  return { slots: next, removed: amount - left };
}

/** Cuántas unidades de un ítem hay en total. */
export function countItem(slots, id) {
  let total = 0;
  for (const slot of slots) {
    if (slot && slot.id === id) total += slot.count;
  }
  return total;
}

/** ¿Hay todo lo pedido? needs = [{id, n}]. */
export function hasItems(slots, needs) {
  const required = new Map();
  for (const need of needs || []) {
    const n = amountOf(need.n);
    required.set(need.id, (required.get(need.id) || 0) + n);
  }
  for (const [id, n] of required) {
    if (countItem(slots, id) < n) return false;
  }
  return true;
}

/** Cantidad de slots ocupados. */
export function slotsUsed(slots) {
  let used = 0;
  for (const slot of slots) if (slot) used++;
  return used;
}

/** Slots libres. */
export function emptySlots(slots) {
  return slots.length - slotsUsed(slots);
}

/** Sin slots libres no entra nada más. */
export function isFull(slots) {
  return emptySlots(slots) === 0;
}

/** Agrega varios pares [{id, n}] en orden y suma todo lo que entró. */
export function addMany(slots, pairs) {
  let next = cloneSlots(slots);
  let added = 0;
  for (const pair of pairs || []) {
    const result = addItem(next, pair.id, pair.n ?? 1);
    next = result.slots;
    added += result.added;
  }
  return { slots: next, added };
}
