import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INVENTORY_SLOTS,
  STACK_MAX,
  addItem,
  addMany,
  countItem,
  createInventory,
  emptySlots,
  hasItems,
  isFull,
  removeItem,
  slotsUsed,
} from '../src/inventory.js';

test('createInventory crea los slots vacíos pedidos', () => {
  const slots = createInventory();
  assert.equal(slots.length, INVENTORY_SLOTS);
  assert.deepEqual(slots, new Array(INVENTORY_SLOTS).fill(null));
  assert.equal(createInventory(3).length, 3);
});

test('addItem apila hasta STACK_MAX y sigue en slots libres', () => {
  const base = createInventory();
  const result = addItem(base, 'lona', STACK_MAX + 3);

  assert.equal(result.added, STACK_MAX + 3);
  assert.deepEqual(result.slots[0], { id: 'lona', count: STACK_MAX });
  assert.deepEqual(result.slots[1], { id: 'lona', count: 3 });
  assert.deepEqual(base[0], null, 'no muta la entrada');
});

test('addItem completa stacks existentes antes de usar slots vacíos', () => {
  const slots = [{ id: 'lona', count: 7 }, null];
  const result = addItem(slots, 'lona', 5);

  assert.equal(result.added, 5);
  assert.deepEqual(result.slots[0], { id: 'lona', count: STACK_MAX });
  assert.deepEqual(result.slots[1], { id: 'lona', count: 3 });
  assert.deepEqual(slots[0], { id: 'lona', count: 7 }, 'no muta la entrada');
});

test('addItem con inventario lleno devuelve cuánto no entró', () => {
  const full = createInventory(2).map(() => ({ id: 'lona', count: STACK_MAX }));
  const result = addItem(full, 'lona', 4);

  assert.equal(result.added, 0);
  assert.equal(slotsUsed(result.slots), 2);
  assert.equal(countItem(result.slots, 'lona'), STACK_MAX * 2);
});

test('addItem deja lo que no entra cuando el stack tiene poco lugar', () => {
  const slots = [{ id: 'pila', count: 8 }];
  const result = addItem(slots, 'pila', 3);

  assert.equal(result.added, 1);
  assert.deepEqual(result.slots[0], { id: 'pila', count: STACK_MAX });
});

test('removeItem saca parcial y vacía los stacks que quedan en cero', () => {
  const slots = [
    { id: 'lona', count: 2 },
    null,
    { id: 'lona', count: 4 },
  ];
  const partial = removeItem(slots, 'lona', 3);

  assert.equal(partial.removed, 3);
  assert.equal(countItem(partial.slots, 'lona'), 3);
  assert.deepEqual(partial.slots[2], { id: 'lona', count: 1 });
  assert.equal(countItem(slots, 'lona'), 6, 'no muta la entrada');

  const all = removeItem(slots, 'lona', 99);
  assert.equal(all.removed, 6);
  assert.equal(countItem(all.slots, 'lona'), 0);
  assert.deepEqual(all.slots, [null, null, null]);
});

test('removeItem de algo que no hay devuelve cero', () => {
  const slots = [{ id: 'lona', count: 2 }];
  const result = removeItem(slots, 'casco', 1);

  assert.equal(result.removed, 0);
  assert.deepEqual(result.slots, slots);
});

test('countItem suma todos los stacks', () => {
  const slots = [
    { id: 'lona', count: 2 },
    { id: 'cinta', count: 9 },
    { id: 'lona', count: 1 },
    null,
  ];

  assert.equal(countItem(slots, 'lona'), 3);
  assert.equal(countItem(slots, 'cinta'), 9);
  assert.equal(countItem(slots, 'casco'), 0);
});

test('hasItems exige todas las cantidades pedidas', () => {
  const slots = [
    { id: 'lona', count: 2 },
    { id: 'cinta', count: 9 },
    { id: 'lona', count: 1 },
  ];

  assert.equal(hasItems(slots, [{ id: 'lona', n: 3 }]), true);
  assert.equal(hasItems(slots, [{ id: 'lona', n: 4 }]), false);
  assert.equal(hasItems(slots, [{ id: 'cinta', n: 2 }, { id: 'lona', n: 3 }]), true);
  assert.equal(hasItems(slots, [{ id: 'cinta', n: 2 }, { id: 'lona', n: 1 }]), true);
  assert.equal(hasItems(slots, [{ id: 'pila', n: 1 }]), false);
  assert.equal(hasItems(slots, []), true);
});

test('hasItems no cuenta dos veces el mismo ítem repetido en needs', () => {
  const slots = [{ id: 'lona', count: 3 }];
  assert.equal(hasItems(slots, [{ id: 'lona', n: 2 }, { id: 'lona', n: 2 }]), false);
  assert.equal(hasItems(slots, [{ id: 'lona', n: 2 }, { id: 'lona', n: 1 }]), true);
});

test('slotsUsed, emptySlots e isFull', () => {
  const slots = createInventory(3);
  assert.equal(slotsUsed(slots), 0);
  assert.equal(emptySlots(slots), 3);
  assert.equal(isFull(slots), false);

  slots[0] = { id: 'lona', count: 1 };
  assert.equal(slotsUsed(slots), 1);
  assert.equal(emptySlots(slots), 2);

  const full = createInventory(2).map(() => ({ id: 'x', count: 1 }));
  assert.equal(isFull(full), true);
  assert.equal(slotsUsed(full), 2);
  assert.equal(emptySlots(full), 0);
});

test('addMany aplica los pares en orden y suma lo agregado', () => {
  const slots = createInventory(2);
  const result = addMany(slots, [
    { id: 'lona', n: 4 },
    { id: 'cinta', n: 12 },
    { id: 'pila', n: 1 },
  ]);

  // lona ocupa el slot 0; cinta llena el slot 1 (9) y pierde 3; pila no entra.
  assert.equal(result.added, 13);
  assert.deepEqual(result.slots[0], { id: 'lona', count: 4 });
  assert.deepEqual(result.slots[1], { id: 'cinta', count: STACK_MAX });
  assert.deepEqual(slots, [null, null], 'no muta la entrada');
});

test('addMany con lista vacía devuelve una copia', () => {
  const slots = createInventory(2);
  const result = addMany(slots, []);
  assert.deepEqual(result.slots, slots);
  assert.notEqual(result.slots, slots);
  assert.equal(result.added, 0);
});
