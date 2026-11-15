import test from 'node:test';
import assert from 'node:assert/strict';
import { canCraft, craft } from '../src/crafting.js';
import {
  STACK_MAX,
  addItem,
  countItem,
  createInventory,
  isFull,
} from '../src/inventory.js';
import { getRecipe } from '../src/recipes.js';

const FAKE = {
  id: 'fake', name: 'Fake', result: 'linterna',
  needs: [{ id: 'pila', n: 1 }, { id: 'bombita', n: 1 }],
};

/** Inventario con los materiales exactos de la receta y algunos slots libres. */
function withNeeds(recipe, extra = 2) {
  const slots = createInventory(recipe.needs.length + extra);
  recipe.needs.forEach((need, i) => {
    slots[i] = { id: need.id, count: need.n };
  });
  return slots;
}

test('canCraft y craft del traje: consume materiales y agrega el resultado', () => {
  const recipe = getRecipe('traje');
  const slots = withNeeds(recipe);

  assert.equal(canCraft(slots, recipe), true);
  const result = craft(slots, recipe);

  assert.equal(result.crafted, true);
  assert.equal(result.result, 'traje');
  assert.equal(countItem(result.slots, 'traje'), 1);
  for (const need of recipe.needs) {
    assert.equal(countItem(result.slots, need.id), 0, `consume ${need.id}`);
  }
  assert.equal(canCraft(slots, recipe), true, 'la entrada queda intacta');
  assert.equal(countItem(slots, 'traje'), 0);
});

test('craft de la linterna respeta las cantidades', () => {
  const recipe = FAKE;
  const slots = createInventory(4);
  slots[0] = { id: 'pila', count: 2 };
  slots[1] = { id: 'bombita', count: 2 };

  const result = craft(slots, recipe);
  assert.equal(result.crafted, true);
  assert.equal(countItem(result.slots, 'linterna'), 1);
  assert.equal(countItem(result.slots, 'pila'), 1);
  assert.equal(countItem(result.slots, 'bombita'), 1);
});

test('canCraft falla si falta un material', () => {
  const recipe = getRecipe('traje');
  const slots = withNeeds(recipe).map((slot) =>
    slot && slot.id === 'casco' ? null : slot,
  );

  assert.equal(canCraft(slots, recipe), false);
  const result = craft(slots, recipe);
  assert.equal(result.crafted, false);
  assert.equal(result.result, null);
  assert.deepEqual(result.slots, slots);
});

test('canCraft falla con pocas unidades de un material', () => {
  const recipe = getRecipe('traje');
  const slots = withNeeds(recipe);
  const big = recipe.needs.find((need) => need.n > 1);
  const index = recipe.needs.indexOf(big);
  slots[index] = { id: big.id, count: big.n - 1 };

  assert.equal(canCraft(slots, recipe), false);
  assert.equal(craft(slots, recipe).crafted, false);
});

test('canCraft falla con inventario lleno y sin stack del resultado', () => {
  const recipe = FAKE;
  const slots = createInventory(18).map(() => ({ id: 'lona', count: 2 }));
  slots[0] = { id: 'pila', count: 2 };
  slots[1] = { id: 'bombita', count: 2 };

  assert.equal(isFull(slots), true);
  assert.equal(canCraft(slots, recipe), false);
  assert.equal(craft(slots, recipe).crafted, false);
});

test('canCraft falla con inventario lleno y stack del resultado completo', () => {
  const recipe = FAKE;
  const slots = createInventory(18).map(() => ({ id: 'lona', count: 2 }));
  slots[0] = { id: 'pila', count: 2 };
  slots[1] = { id: 'bombita', count: 2 };
  slots[2] = { id: 'linterna', count: STACK_MAX };

  assert.equal(isFull(slots), true);
  assert.equal(canCraft(slots, recipe), false);
});

test('canCraft permite fabricar si el resultado apila con lugar', () => {
  const recipe = FAKE;
  const slots = createInventory(18).map(() => ({ id: 'lona', count: 2 }));
  slots[0] = { id: 'pila', count: 2 };
  slots[1] = { id: 'bombita', count: 2 };
  slots[2] = { id: 'linterna', count: 8 };

  assert.equal(isFull(slots), true);
  assert.equal(canCraft(slots, recipe), true);

  const result = craft(slots, recipe);
  assert.equal(result.crafted, true);
  assert.equal(countItem(result.slots, 'linterna'), 9);
  assert.equal(countItem(result.slots, 'pila'), 1);
  assert.equal(countItem(result.slots, 'bombita'), 1);
  assert.equal(isFull(result.slots), true);
});

test('craft no muta la entrada', () => {
  const recipe = getRecipe('traje');
  const slots = withNeeds(recipe);
  const before = slots.map((slot) => (slot ? { ...slot } : null));

  const result = craft(slots, recipe);
  assert.notEqual(result.slots, slots);
  assert.deepEqual(slots, before);
});

test('recipe desconocida o nula no se puede fabricar', () => {
  const slots = createInventory(4);
  assert.equal(canCraft(slots, null), false);
  assert.equal(canCraft(slots, getRecipe('nada')), false);
  assert.equal(craft(slots, null).crafted, false);
});

test('agregar materiales con varios stacks no rompe la fabricación', () => {
  const recipe = FAKE;
  let slots = createInventory(3);
  slots = addItem(slots, 'pila', 2).slots; // dos pilas en un intento
  slots = addItem(slots, 'bombita', 1).slots;

  assert.equal(countItem(slots, 'pila'), 2);
  assert.equal(canCraft(slots, recipe), true);
  assert.equal(craft(slots, recipe).crafted, true);
});
