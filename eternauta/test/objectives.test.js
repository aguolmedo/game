import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OBJECTIVES,
  AIRLOCK_STEPS,
  SUIT_NEEDS,
  airlockChecklist,
  airlockCount,
  canWearSuit,
  closedCount,
  countMaterials,
  currentObjective,
  equipChecklist,
  equipSuit,
  exitOutcome,
  exitWarningFlow,
  streetOutcome,
} from '../src/objectives.js';
import { createInventory, addItem } from '../src/inventory.js';

// Los 12 textos exactos del §6.2, en orden.
const TEXTS = [
  'Cebate un mate antes de seguir la partida.',
  'Volvé a la mesa.',
  'Mirá por la ventana.',
  'Bajá a ver a Elena y Martita.',
  '¡Cerrá la ventana de Martita!',
  'Revisá que toda la casa esté cerrada (0/4).',
  'Hablá con Elena en el living.',
  'Juntá los materiales del traje (0/6).',
  'Prepará la esclusa: nafta, extractor, traje (0/3).',
  'Equipate: el traje y el rifle.',
  'Salí por el garaje.',
  '¡Sobreviví!',
];

const FLAGS = { mate_tutorial: true, truco_jugado: true, apagon: true, vio_la_nevada: true };

function stocked() {
  let slots = createInventory(18);
  for (const need of SUIT_NEEDS) slots = addItem(slots, need.id, need.n).slots;
  return slots;
}

// 'ramirez' y 'attic' son pasos nuevos entre Elena y los materiales: no son
// textos del §6.2, así que el test canónico los ignora.
const EXTRA_IDS = ['craft', 'ramirez', 'attic'];

test('OBJECTIVES: los 12 textos del §6.2 en orden', () => {
  const canonical = OBJECTIVES
    .filter((o) => !EXTRA_IDS.includes(o.id))
    .map((o) => o.text);
  assert.deepEqual(canonical, TEXTS);
  for (const o of OBJECTIVES) assert.ok(!o.text.startsWith('Objetivo:'));
});

test('currentObjective: recorre toda la historia', () => {
  const base = { ...FLAGS };
  const steps = [
    [{ flags: {} }, 'mate'],
    [{ flags: { mate_tutorial: true } }, 'table'],
    [{ flags: { mate_tutorial: true, truco_jugado: true } }, 'window'],
    [{ flags: { mate_tutorial: true, truco_jugado: true, apagon: true } }, 'window'],
    [{ flags: { ...base } }, 'downstairs'],
    [{ flags: { ...base, martita_sprint: true } }, 'martita'],
    [{ flags: { ...base, martita_ventana: 'ok' } }, 'seal'],
    [{ flags: { ...base, martita_ventana: 'ok', casa_sellada: true } }, 'elena'],
    // Elena hablada → ventana del living; con la ventana vista → altillo.
    [{
      flags: { ...base, martita_ventana: 'ok', casa_sellada: true, elena_hablada: true },
    }, 'ramirez'],
    [{
      flags: {
        ...base, martita_ventana: 'ok', casa_sellada: true, elena_hablada: true,
        ramirez_muerto: true,
      },
    }, 'attic'],
    [{ flags: { ...base, martita_ventana: 'ok', casa_sellada: true, idea_traje: true } }, 'materials'],
    [{
      flags: { ...base, martita_ventana: 'ok', casa_sellada: true, idea_traje: true },
      inventory: stocked(),
    }, 'craft'],
    [{
      flags: {
        ...base, martita_ventana: 'ok', casa_sellada: true, idea_traje: true,
        traje_fabricado: true,
      },
    }, 'airlock'],
    [{
      flags: {
        ...base, martita_ventana: 'ok', casa_sellada: true, idea_traje: true,
        traje_fabricado: true, esclusa_lista: true,
      },
    }, 'equip'],
    [{
      flags: {
        ...base, martita_ventana: 'ok', casa_sellada: true, idea_traje: true,
        traje_fabricado: true, esclusa_lista: true, listo_para_salir: true,
      },
    }, 'exit'],
    [{
      flags: {
        ...base, martita_ventana: 'ok', casa_sellada: true, idea_traje: true,
        traje_fabricado: true, esclusa_lista: true, listo_para_salir: true, arena: true,
      },
    }, 'survive'],
  ];
  for (const [state, id] of steps) {
    const objective = currentObjective(state);
    assert.equal(objective.id, id, JSON.stringify(state));
    assert.equal(typeof objective.text, 'string');
    assert.ok(objective.text.length > 0);
  }
});

test('contadores de materiales: tiras pide dos', () => {
  let slots = createInventory();
  slots = addItem(slots, 'tela', 1).slots;
  slots = addItem(slots, 'guantes', 1).slots;
  slots = addItem(slots, 'botas', 1).slots;
  slots = addItem(slots, 'tiras', 1).slots;
  assert.equal(countMaterials(slots), 3);
  slots = addItem(slots, 'tiras', 1).slots;
  assert.equal(countMaterials(slots), 4);
  assert.equal(countMaterials(stocked()), 6);

  const objective = currentObjective({
    flags: { mate_tutorial: true, truco_jugado: true, apagon: true, vio_la_nevada: true, martita_ventana: 'ok', casa_sellada: true, idea_traje: true },
    inventory: slots,
  });
  assert.equal(objective.id, 'materials');
  assert.equal(objective.text, 'Juntá los materiales del traje (4/6).');
  assert.deepEqual(objective.progress, { have: 4, max: 6 });
});

test('contador de la casa cerrada (0/4)', () => {
  assert.equal(closedCount({}), 0);
  assert.equal(closedCount({ closed_window_martita: true }), 1);
  assert.equal(closedCount({
    closed_window_martita: true, closed_window_living: true,
    closed_hall_door: true, closed_garage_door: true,
  }), 4);

  const flags = {
    mate_tutorial: true, truco_jugado: true, apagon: true, vio_la_nevada: true,
    martita_ventana: 'ok', closed_window_martita: true, closed_window_living: true,
  };
  const objective = currentObjective({ flags });
  assert.equal(objective.id, 'seal');
  assert.equal(objective.text, 'Revisá que toda la casa esté cerrada (2/4).');
  assert.deepEqual(objective.progress, { have: 2, max: 4 });
});

test('contador de la esclusa (0/3)', () => {
  assert.equal(airlockCount({}), 0);
  assert.equal(airlockCount({ electrogeno_on: true }), 1);
  assert.equal(airlockCount({ electrogeno_on: true, extractor_ok: true }), 2);
  assert.equal(airlockCount({
    electrogeno_on: true, extractor_ok: true, traje_fabricado: true,
  }), 3);

  const flags = {
    mate_tutorial: true, truco_jugado: true, apagon: true, vio_la_nevada: true,
    martita_ventana: 'ok', casa_sellada: true, idea_traje: true, traje_fabricado: true,
    electrogeno_on: true,
  };
  const objective = currentObjective({ flags });
  assert.equal(objective.id, 'airlock');
  assert.equal(objective.text, 'Prepará la esclusa: nafta, extractor, traje (2/3).');
});

test('AIRLOCK_STEPS + airlockChecklist: pasos, etiquetas y hechos', () => {
  assert.deepEqual(AIRLOCK_STEPS.map((s) => s.id), ['nafta', 'extractor', 'traje']);
  assert.deepEqual(AIRLOCK_STEPS.map((s) => s.label), ['Nafta', 'Extractor', 'Traje']);

  assert.deepEqual(airlockChecklist(), [
    { id: 'nafta', label: 'Nafta', done: false },
    { id: 'extractor', label: 'Extractor', done: false },
    { id: 'traje', label: 'Traje', done: false },
  ]);
  assert.deepEqual(airlockChecklist({ electrogeno_on: true, traje_fabricado: true }), [
    { id: 'nafta', label: 'Nafta', done: true },
    { id: 'extractor', label: 'Extractor', done: false },
    { id: 'traje', label: 'Traje', done: true },
  ]);
  assert.deepEqual(
    airlockChecklist({ electrogeno_on: true, extractor_ok: true, traje_fabricado: true })
      .map((row) => row.done),
    [true, true, true],
  );
});

test('equipChecklist: dados, traje puesto y rifle', () => {
  assert.deepEqual(equipChecklist(), [
    { id: 'dados', label: 'Dados', done: false },
    { id: 'traje_puesto', label: 'Traje puesto', done: false },
    { id: 'rifle', label: 'Rifle', done: false },
  ]);
  assert.deepEqual(equipChecklist({ flags: { dados: true }, hasSuit: true }), [
    { id: 'dados', label: 'Dados', done: true },
    { id: 'traje_puesto', label: 'Traje puesto', done: true },
    { id: 'rifle', label: 'Rifle', done: false },
  ]);
  assert.deepEqual(
    equipChecklist({ flags: { dados: true }, hasSuit: true, hasRifle: true })
      .map((row) => row.done),
    [true, true, true],
  );
});

test('currentObjective: checklist en esclusa y equipado', () => {
  const airlock = currentObjective({
    flags: {
      mate_tutorial: true, truco_jugado: true, apagon: true, vio_la_nevada: true,
      martita_ventana: 'ok', casa_sellada: true, idea_traje: true, traje_fabricado: true,
      electrogeno_on: true,
    },
  });
  assert.equal(airlock.id, 'airlock');
  assert.deepEqual(airlock.checklist.map((row) => [row.label, row.done]), [
    ['Nafta', true], ['Extractor', false], ['Traje', true],
  ]);

  const equip = currentObjective({
    flags: {
      mate_tutorial: true, truco_jugado: true, apagon: true, vio_la_nevada: true,
      martita_ventana: 'ok', casa_sellada: true, idea_traje: true, traje_fabricado: true,
      esclusa_lista: true, dados: true,
    },
    hasSuit: true,
    hasRifle: false,
  });
  assert.equal(equip.id, 'equip');
  assert.equal(equip.text, 'Equipate: el traje y el rifle.');
  assert.deepEqual(equip.checklist.map((row) => [row.label, row.done]), [
    ['Dados', true], ['Traje puesto', true], ['Rifle', false],
  ]);
});

test('currentObjective acepta el game directo (sceneName, flags, inventario)', () => {
  const game = {
    sceneName: 'house',
    flags: { mate_tutorial: true, truco_jugado: true, apagon: true, vio_la_nevada: true },
    inventory: createInventory(),
    hasSuit: false,
    hasRifle: false,
    crafted: false,
  };
  assert.equal(currentObjective(game).id, 'downstairs');
});

test('compatibilidad con el estado viejo de main.js', () => {
  const base = { map: 'attic', partsComplete: false, crafted: false, hasSuit: false };
  assert.equal(currentObjective(base).id, 'parts');
  assert.equal(currentObjective({ ...base, partsComplete: true }).id, 'craft');
  assert.equal(currentObjective({ ...base, crafted: true }).id, 'wear');
  assert.equal(currentObjective({ ...base, crafted: true, hasSuit: true }).id, 'exit');
  assert.equal(currentObjective({ ...base, map: 'street', hasSuit: true }).id, 'street');
});

test('equipSuit: prender y apagar sin mutar, equippedAt sube al ponérselo', () => {
  const base = { crafted: true, equippedAt: 2 };
  const on = equipSuit(base, true);
  assert.notEqual(on, base);
  assert.equal(on.hasSuit, true);
  assert.equal(on.equippedAt, 3);
  assert.deepEqual(base, { crafted: true, equippedAt: 2 });

  const off = equipSuit(on, false);
  assert.notEqual(off, on);
  assert.equal(off.hasSuit, false);
  assert.equal(off.equippedAt, 3);
  assert.equal(on.hasSuit, true);
  assert.equal(equipSuit({}, true).equippedAt, 1);
  assert.equal(equipSuit({}, false).equippedAt, 0);
});

test('canWearSuit: sólo con el traje fabricado', () => {
  assert.equal(canWearSuit({ crafted: true }), true);
  assert.equal(canWearSuit({ crafted: false }), false);
  assert.equal(canWearSuit({}), false);
  assert.equal(canWearSuit({ crafted: 'si' }), false);
});

test('exitOutcome: sin traje avisa, con traje sale a la calle', () => {
  assert.deepEqual(exitOutcome({ hasSuit: false }), { action: 'warn' });
  assert.deepEqual(exitOutcome({}), { action: 'warn' });
  assert.deepEqual(exitOutcome({ hasSuit: true }), { action: 'street' });
  assert.deepEqual(exitOutcome({ hasSuit: false }, false), { action: 'cancel' });
});

test('streetOutcome: muerte sin traje, calle y final con traje', () => {
  assert.deepEqual(streetOutcome(false, 100, 294), { action: 'death' });
  assert.deepEqual(streetOutcome(false, 999, 294), { action: 'death' });
  assert.deepEqual(streetOutcome(true, 100, 294), { action: 'street' });
  assert.deepEqual(streetOutcome(true, 294, 294), { action: 'end' });
  assert.deepEqual(streetOutcome(true, 300, 294), { action: 'end' });
});

test('exitWarningFlow: sí mata, no cancela', () => {
  assert.equal(exitWarningFlow(true), 'death');
  assert.equal(exitWarningFlow('si'), 'death');
  assert.equal(exitWarningFlow('SI'), 'death');
  assert.equal(exitWarningFlow(false), 'cancel');
  assert.equal(exitWarningFlow('no'), 'cancel');
});
