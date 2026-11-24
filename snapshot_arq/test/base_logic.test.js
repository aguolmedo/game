// La casa/base entre salidas: título, cierre de salida, arranque y textos.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BASE_FLAGS,
  titleOptions,
  endRunSave,
  shouldComplain,
  startRunSave,
  bagSummary,
  baseObjective,
} from '../src/base.js';
import { emptySave } from '../src/run/save.js';
import { seedFor } from '../src/run/seed.js';

test('BASE_FLAGS: las claves exactas, sin base', () => {
  assert.deepEqual(Object.keys(BASE_FLAGS).sort(), [
    'afuera',
    'apagon',
    'casa_sellada',
    'dados',
    'electrogeno_on',
    'elena_hablada',
    'esclusa_lista',
    'extractor_ok',
    'idea_traje',
    'listo_para_salir',
    'martita_ventana',
    'mate_tutorial',
    'ramirez_muerto',
    'traje_fabricado',
    'truco_jugado',
    'vio_la_nevada',
  ]);
  for (const [key, value] of Object.entries(BASE_FLAGS)) {
    if (key === 'martita_ventana') assert.equal(value, 'ok');
    else assert.ok(value, `${key} tiene que ser truthy`);
  }
  assert.equal('base' in BASE_FLAGS, false);
});

test('titleOptions: con traje hecho ofrece Continuar, sin traje ofrece Jugar', () => {
  assert.deepEqual(titleOptions({ trajeHecho: true }), [
    'Continuar',
    'Partida nueva',
    'Minijuego',
    'Controles',
    'Creditos',
  ]);
  assert.deepEqual(titleOptions({ trajeHecho: false }), ['Jugar', 'Minijuego', 'Controles', 'Creditos']);
  assert.deepEqual(titleOptions({}), ['Jugar', 'Minijuego', 'Controles', 'Creditos']);
  assert.deepEqual(titleOptions(null), ['Jugar', 'Minijuego', 'Controles', 'Creditos']);
  assert.deepEqual(titleOptions(undefined), ['Jugar', 'Minijuego', 'Controles', 'Creditos']);
});

test('titleOptions: siempre devuelve un array nuevo', () => {
  const a = titleOptions(null);
  const b = titleOptions(null);
  assert.notEqual(a, b);
  a.push('x');
  assert.deepEqual(titleOptions(null), ['Jugar', 'Minijuego', 'Controles', 'Creditos']);

  const save = { trajeHecho: true };
  const c = titleOptions(save);
  const d = titleOptions(save);
  assert.notEqual(c, d);
});

test('endRunSave volvio: suma el botín y no muta el save original', () => {
  const save = emptySave();
  save.botin = { chatarra: 1, goma: 0, nafta: 2, pieza: 0 };
  const snapshot = JSON.parse(JSON.stringify(save));
  const out = endRunSave(save, { type: 'volvio', bag: { chatarra: 2, goma: 1, nafta: 0, pieza: 3 } });

  assert.notEqual(out, save);
  assert.deepEqual(out.botin, { chatarra: 3, goma: 1, nafta: 2, pieza: 3 });
  assert.deepEqual(save, snapshot, 'el save original queda igual');
  assert.equal(out.trajeHecho, false);
  assert.equal(out.loop, 0);
});

test('endRunSave volvio: best es el máximo entre el guardado y el resultado', () => {
  const save = emptySave();
  save.best = { round: 5, points: 900 };
  const out = endRunSave(save, { type: 'volvio', bag: {}, round: 7, points: 300 });
  assert.deepEqual(out.best, { round: 7, points: 900 });

  const out2 = endRunSave(save, { type: 'volvio', bag: {}, round: 2, points: 1200 });
  assert.deepEqual(out2.best, { round: 5, points: 1200 });
});

test('endRunSave volvio: other fields se conservan y el botín del original no se toca', () => {
  const save = { ...emptySave(), loop: 4, muertes: 2, nombre: 'juan', mejoras: { favalli: 2, elena: 0, lucas: 1, luz: 3 } };
  const out = endRunSave(save, { type: 'volvio', bag: { goma: 2 } });
  assert.equal(out.loop, 4);
  assert.equal(out.muertes, 2);
  assert.equal(out.nombre, 'juan');
  assert.deepEqual(out.mejoras, { favalli: 2, elena: 0, lucas: 1, luz: 3 });
  assert.deepEqual(save.botin, { chatarra: 0, goma: 0, nafta: 0, pieza: 0 });
});

test('endRunSave murio: deja mochila con loop, suma una muerte y actualiza best', () => {
  const save = emptySave();
  save.loop = 3;
  save.muertes = 1;
  save.best = { round: 4, points: 100 };
  const snapshot = JSON.parse(JSON.stringify(save));
  const out = endRunSave(save, { type: 'murio', bag: { chatarra: 2, pieza: 1 }, round: 9, points: 50 });

  assert.notEqual(out, save);
  assert.deepEqual(out.mochila, { loop: 3, contenido: { chatarra: 2, goma: 0, nafta: 0, pieza: 1 } });
  assert.equal(out.muertes, 2);
  assert.deepEqual(out.best, { round: 9, points: 100 });
  assert.deepEqual(save, snapshot, 'el save original queda igual');
});

test('endRunSave murio con bolsa vacía: conserva la mochila anterior', () => {
  const save = emptySave();
  save.loop = 2;
  save.mochila = { loop: 1, contenido: { chatarra: 5, goma: 0, nafta: 0, pieza: 0 } };
  const out = endRunSave(save, { type: 'murio', bag: {} });
  assert.deepEqual(out.mochila, { loop: 1, contenido: { chatarra: 5, goma: 0, nafta: 0, pieza: 0 } });
  assert.equal(out.muertes, 1);
});

test('endRunSave tipo desconocido: devuelve copia igual y solo toca best', () => {
  const save = { ...emptySave(), loop: 6, muertes: 2 };
  save.best = { round: 3, points: 40 };
  const snapshot = JSON.parse(JSON.stringify(save));
  const out = endRunSave(save, { type: 'otro', bag: { chatarra: 9 }, round: 1, points: 0 });

  assert.notEqual(out, save);
  assert.deepEqual(out.botin, save.botin, 'no suma botín si no volvió');
  assert.equal(out.muertes, 2);
  assert.deepEqual(out.best, { round: 3, points: 40 });
  assert.deepEqual(save, snapshot);
});

test('endRunSave abandono: cuenta como muerte y deja la mochila (M5)', () => {
  const save = emptySave();
  save.loop = 3;
  save.muertes = 1;
  save.best = { round: 4, points: 100 };
  const snapshot = JSON.parse(JSON.stringify(save));
  const out = endRunSave(save, { type: 'abandono', bag: { chatarra: 2, pieza: 1 }, round: 6, points: 300 });

  assert.notEqual(out, save);
  assert.deepEqual(out.mochila, { loop: 3, contenido: { chatarra: 2, goma: 0, nafta: 0, pieza: 1 } });
  assert.equal(out.muertes, 2);
  assert.deepEqual(out.best, { round: 6, points: 300 });
  assert.deepEqual(save, snapshot, 'el save original queda igual');
});

test('endRunSave: ignora round y points inválidos', () => {
  const save = emptySave();
  save.best = { round: 8, points: 500 };
  const out = endRunSave(save, { type: 'volvio', bag: {}, round: NaN, points: -70 });
  assert.deepEqual(out.best, { round: 8, points: 500 });

  const out2 = endRunSave(save, { type: 'volvio', bag: {}, round: Infinity, points: '300' });
  assert.deepEqual(out2.best, { round: 8, points: 500 });

  const out3 = endRunSave(save, { type: 'volvio', bag: {}, round: undefined, points: null });
  assert.deepEqual(out3.best, { round: 8, points: 500 });
});

test('endRunSave: sin result, sin best previo y sin save no explota', () => {
  const out = endRunSave(emptySave());
  assert.deepEqual(out.best, { round: 0, points: 0 });
  assert.notEqual(out, undefined);

  const noBest = { loop: 1 };
  const out2 = endRunSave(noBest, { type: 'volvio', bag: { goma: 1 }, round: 2, points: 10 });
  assert.deepEqual(out2.best, { round: 2, points: 10 });
  assert.deepEqual(noBest, { loop: 1 });

  assert.doesNotThrow(() => endRunSave(null, { type: 'volvio', bag: {} }));
  assert.doesNotThrow(() => endRunSave(undefined, null));
});

test('endRunSave: recovered true en volvio limpia la mochila', () => {
  const save = emptySave();
  save.mochila = { loop: 1, contenido: { chatarra: 2, goma: 0, nafta: 0, pieza: 0 } };
  const out = endRunSave(save, { type: 'volvio', recovered: true, bag: {} });
  assert.equal(out.mochila, null);
  assert.ok(save.mochila, 'el original conserva su mochila');

  // recovered fuera de volvio no la toca
  const save2 = emptySave();
  save2.mochila = { loop: 1, contenido: { chatarra: 2, goma: 0, nafta: 0, pieza: 0 } };
  const out2 = endRunSave(save2, { type: 'murio', recovered: true, bag: {} });
  assert.ok(out2.mochila);
});

test('shouldComplain: cada tres muertes', () => {
  assert.equal(shouldComplain({ muertes: 0 }), false);
  assert.equal(shouldComplain({ muertes: 1 }), false);
  assert.equal(shouldComplain({ muertes: 3 }), true);
  assert.equal(shouldComplain({ muertes: 6 }), true);
  assert.equal(shouldComplain({ muertes: 4 }), false);
  assert.equal(shouldComplain(null), false);
  assert.equal(shouldComplain(undefined), false);
  assert.equal(shouldComplain({}), false);
  assert.equal(typeof shouldComplain({ muertes: 3 }), 'boolean');
});

test('startRunSave: sube el loop, arma la semilla y run.save es el save devuelto', () => {
  const save = { ...emptySave(), loop: 2, trajeHecho: true };
  const snapshot = JSON.parse(JSON.stringify(save));
  const { save: next, run } = startRunSave(save);

  assert.notEqual(next, save);
  assert.equal(next.loop, 3);
  assert.equal(next.trajeHecho, true);
  assert.equal(run.loop, 3);
  assert.equal(run.seed, seedFor(3));
  assert.equal(run.save, next);
  assert.deepEqual(save, snapshot, 'no muta el save original');

  // sin loop o con loop inválido arranca en 1
  assert.equal(startRunSave(emptySave()).save.loop, 1);
  assert.equal(startRunSave({ loop: -5 }).save.loop, 1);
  assert.equal(startRunSave({ loop: 'x' }).save.loop, 1);
  assert.equal(startRunSave(null).save.loop, 1);
});

test('startRunSave: dos loops seguidos dan semillas distintas', () => {
  const first = startRunSave(emptySave());
  const second = startRunSave(first.save);
  assert.equal(second.save.loop, 2);
  assert.notEqual(first.run.seed, second.run.seed);
});

test('bagSummary: vacía', () => {
  assert.equal(bagSummary({ chatarra: 0, goma: 0, nafta: 0, pieza: 0 }), 'Volviste con las manos vacías.');
  assert.equal(bagSummary(null), 'Volviste con las manos vacías.');
  assert.equal(bagSummary(undefined), 'Volviste con las manos vacías.');
  assert.equal(bagSummary({}), 'Volviste con las manos vacías.');
});

test('bagSummary: varios items en orden fijo y con nombre lindo para la pieza', () => {
  assert.equal(bagSummary({ chatarra: 3, goma: 1 }), 'Volviste con: 3 chatarra, 1 goma');
  assert.equal(
    bagSummary({ pieza: 2, nafta: 1, goma: 0, chatarra: 3 }),
    'Volviste con: 3 chatarra, 1 nafta, 2 pieza de cascarudo',
  );
  assert.equal(bagSummary({ pieza: 1 }), 'Volviste con: 1 pieza de cascarudo');
});

test('baseObjective: con mochila manda a buscarla, sin mochila pide mejorar', () => {
  assert.deepEqual(baseObjective({ mochila: { loop: 1, contenido: { chatarra: 1 } } }), {
    id: 'base_mochila',
    text: 'Volvé a salir. La mochila de otra vez quedó en la calle.',
  });
  assert.deepEqual(baseObjective({ mochila: null }), {
    id: 'base',
    text: 'Mejorá lo que puedas y volvé a salir.',
  });
  assert.deepEqual(baseObjective(null), {
    id: 'base',
    text: 'Mejorá lo que puedas y volvé a salir.',
  });
});
