// Flujo de juego con logica pura: materiales -> traje -> poner/sacar -> salida.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createInventory, addItem, countItem } from '../src/inventory.js';
import { canCraft, craft } from '../src/crafting.js';
import { RECIPES } from '../src/recipes.js';
import {
  currentObjective, equipSuit, exitOutcome, exitWarningFlow, streetOutcome,
} from '../src/objectives.js';

const SUIT = RECIPES[0];

function stocked() {
  let slots = createInventory(18);
  for (const need of SUIT.needs) slots = addItem(slots, need.id, need.n).slots;
  return slots;
}

test('la receta del traje usa los materiales del comic', () => {
  const ids = SUIT.needs.map((n) => n.id).sort();
  assert.deepEqual(ids, ['botas', 'casco', 'guantes', 'lata', 'tela', 'tiras']);
  assert.ok(SUIT.needs.every((n) => n.n >= 1));
});

test('fabricar el traje consume los materiales y lo deja en la mochila', () => {
  const slots = stocked();
  assert.equal(canCraft(slots, SUIT), true);
  const result = craft(slots, SUIT);
  assert.equal(result.crafted, true);
  assert.equal(countItem(result.slots, 'traje'), 1);
  for (const need of SUIT.needs) assert.equal(countItem(result.slots, need.id), 0);
});

test('progresion de objetivos: piezas, fabricar, poner, salir, calle', () => {
  const base = { map: 'attic', partsComplete: false, crafted: false, hasSuit: false };
  assert.equal(currentObjective(base).id, 'parts');
  assert.equal(currentObjective({ ...base, partsComplete: true }).id, 'craft');
  assert.equal(currentObjective({ ...base, partsComplete: true, crafted: true }).id, 'wear');
  assert.equal(currentObjective({ ...base, crafted: true, hasSuit: true }).id, 'exit');
  assert.equal(currentObjective({ ...base, map: 'street', hasSuit: true }).id, 'street');
});

test('ponerse y sacarse el traje no muta el estado', () => {
  const state = { crafted: true, hasSuit: false };
  const worn = equipSuit(state, true);
  assert.equal(worn.hasSuit, true);
  assert.equal(state.hasSuit, false, 'el estado original queda intacto');
  const bare = equipSuit(worn, false);
  assert.equal(bare.hasSuit, false);
  assert.equal(worn.hasSuit, true);
  assert.equal(bare.equippedAt, worn.equippedAt, 'sacarlo no suma puestas');
});

test('salir con traje va a la calle; sin traje pide aviso', () => {
  assert.deepEqual(exitOutcome({ hasSuit: true }), { action: 'street' });
  assert.deepEqual(exitOutcome({ hasSuit: false }), { action: 'warn' });
});

test('aviso de salida: No cancela, Si mata', () => {
  assert.equal(exitWarningFlow(false), 'cancel');
  assert.equal(exitWarningFlow('No'), 'cancel');
  assert.equal(exitWarningFlow(true), 'death');
  assert.equal(exitWarningFlow('Sí'), 'death');
  assert.equal(exitWarningFlow('si'), 'death');
});

test('la calle sin traje mata y con traje termina al llegar', () => {
  assert.equal(streetOutcome(false, 10).action, 'death');
  assert.equal(streetOutcome(true, 10).action, 'street');
  assert.equal(streetOutcome(true, 1216, 1216).action, 'end');
});
