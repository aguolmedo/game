import test from 'node:test';
import assert from 'node:assert/strict';

import {
  LOOT_KINDS,
  LOOT_ITEM,
  LOOT_NAME,
  emptyBag,
  addToBag,
  bagCount,
  enemyDrop,
  spotLoot,
  dropMochila,
  pickMochilaSpot,
  recoverMochila,
} from '../../src/run/loot.js';
import { rngFromSeed } from '../../src/run/rng.js';

// rng falso: devuelve los valores dados, en orden, y cuenta las tiradas.
function fakeRng(values) {
  let i = 0;
  const rng = () => {
    if (i >= values.length) throw new Error('rng agotado');
    return values[i++];
  };
  rng.calls = () => i;
  return rng;
}

test('constantes de botín', () => {
  assert.deepEqual(LOOT_KINDS, ['chatarra', 'goma', 'nafta', 'pieza']);
  assert.equal(LOOT_ITEM.pieza, 'pieza_cascarudo');
  assert.equal(LOOT_NAME.pieza, 'pieza de cascarudo');
  assert.equal(LOOT_NAME.nafta, 'nafta');
  for (const kind of LOOT_KINDS) {
    assert.equal(typeof LOOT_ITEM[kind], 'string');
    assert.equal(typeof LOOT_NAME[kind], 'string');
  }
});

test('emptyBag devuelve una bolsa nueva cada vez', () => {
  const a = emptyBag();
  const b = emptyBag();
  assert.deepEqual(a, { chatarra: 0, goma: 0, nafta: 0, pieza: 0 });
  assert.notEqual(a, b);
  a.chatarra = 9;
  assert.equal(b.chatarra, 0);
});

test('addToBag suma sin mutar la bolsa original', () => {
  const bag = { chatarra: 2, goma: 0, nafta: 0, pieza: 0 };
  const next = addToBag(bag, 'chatarra', 3);
  assert.deepEqual(next, { chatarra: 5, goma: 0, nafta: 0, pieza: 0 });
  assert.deepEqual(bag, { chatarra: 2, goma: 0, nafta: 0, pieza: 0 });
  assert.notEqual(next, bag);
  assert.equal(addToBag(bag, 'goma').goma, 1); // n por defecto 1
  assert.equal(addToBag(null, 'pieza', 2).pieza, 2);
});

test('addToBag ignora tipos desconocidos y cantidades inválidas', () => {
  const bag = { chatarra: 1, goma: 2, nafta: 0, pieza: 0 };
  assert.deepEqual(addToBag(bag, 'uranio', 5), bag);
  assert.deepEqual(addToBag(bag, 'chatarra', -1), bag);
  assert.deepEqual(addToBag(bag, 'chatarra', Infinity), bag);
  assert.deepEqual(addToBag(bag, 'chatarra', NaN), bag);
  assert.deepEqual(bag, { chatarra: 1, goma: 2, nafta: 0, pieza: 0 });
});

test('bagCount suma solo las cuatro claves conocidas', () => {
  assert.equal(bagCount(null), 0);
  assert.equal(bagCount(undefined), 0);
  assert.equal(bagCount(emptyBag()), 0);
  assert.equal(bagCount({ chatarra: 2, goma: 3, nafta: 1, pieza: 4 }), 10);
  assert.equal(bagCount({ chatarra: 2, otro: 99 }), 2);
});

test('enemyDrop cascarudo: dos tiradas en orden fijo', () => {
  const both = fakeRng([0.29, 0.14]);
  assert.deepEqual(enemyDrop('cascarudo', both), [
    { kind: 'chatarra', n: 1 },
    { kind: 'goma', n: 1 },
  ]);
  assert.equal(both.calls(), 2);

  const none = fakeRng([0.3, 0.15]);
  assert.deepEqual(enemyDrop('cascarudo', none), []);
  assert.equal(none.calls(), 2); // consume las dos aunque no salga nada

  const onlyMetal = fakeRng([0.29, 0.15]);
  assert.deepEqual(enemyDrop('cascarudo', onlyMetal), [{ kind: 'chatarra', n: 1 }]);
});

test('enemyDrop veloz: una tirada', () => {
  const drop = fakeRng([0.24]);
  assert.deepEqual(enemyDrop('veloz', drop), [{ kind: 'goma', n: 1 }]);
  assert.equal(drop.calls(), 1);

  const none = fakeRng([0.25]);
  assert.deepEqual(enemyDrop('veloz', none), []);
  assert.equal(none.calls(), 1);
});

test('enemyDrop acorazado: pieza y chatarra con tiradas independientes', () => {
  const both = fakeRng([0.59, 0.49]);
  assert.deepEqual(enemyDrop('acorazado', both), [
    { kind: 'pieza', n: 1 },
    { kind: 'chatarra', n: 1 },
  ]);
  assert.equal(both.calls(), 2);

  const none = fakeRng([0.6, 0.5]);
  assert.deepEqual(enemyDrop('acorazado', none), []);
  assert.equal(none.calls(), 2);
});

test('enemyDrop de un tipo desconocido no consume rng', () => {
  const rng = fakeRng([]);
  assert.deepEqual(enemyDrop('fantasma', rng), []);
  assert.deepEqual(enemyDrop(undefined, rng), []);
  assert.equal(rng.calls(), 0);
});

test('enemyDrop es determinístico con rngFromSeed', () => {
  assert.deepEqual(enemyDrop('cascarudo', rngFromSeed(7)), [
    { kind: 'chatarra', n: 1 },
    { kind: 'goma', n: 1 },
  ]);
  assert.deepEqual(enemyDrop('cascarudo', rngFromSeed(2)), []);
  assert.deepEqual(enemyDrop('veloz', rngFromSeed(7)), [{ kind: 'goma', n: 1 }]);
  assert.deepEqual(enemyDrop('veloz', rngFromSeed(1)), []);
  assert.deepEqual(enemyDrop('acorazado', rngFromSeed(6)), [
    { kind: 'pieza', n: 1 },
    { kind: 'chatarra', n: 1 },
  ]);
  assert.deepEqual(enemyDrop('acorazado', rngFromSeed(5)), []);
  assert.deepEqual(enemyDrop('acorazado', rngFromSeed(8)), [{ kind: 'pieza', n: 1 }]);
  // misma semilla, mismo resultado
  assert.deepEqual(
    enemyDrop('cascarudo', rngFromSeed(7)),
    enemyDrop('cascarudo', rngFromSeed(7)),
  );
});

test('spotLoot de un auto da nafta sin consumir rng', () => {
  const rng = fakeRng([]);
  assert.deepEqual(spotLoot({ kind: 'nafta' }, rng), { kind: 'nafta', n: 1 });
  assert.equal(rng.calls(), 0);
});

test('spotLoot elige tipo y cantidad con dos tiradas', () => {
  assert.deepEqual(spotLoot({ kind: 'x' }, fakeRng([0.49, 0.49])), { kind: 'chatarra', n: 1 });
  assert.deepEqual(spotLoot({ kind: 'x' }, fakeRng([0.49, 0.5])), { kind: 'chatarra', n: 2 });
  assert.deepEqual(spotLoot({ kind: 'x' }, fakeRng([0.5, 0.49])), { kind: 'goma', n: 1 });
  assert.deepEqual(spotLoot({ kind: 'x' }, fakeRng([0.84, 0.5])), { kind: 'goma', n: 2 });
  assert.deepEqual(spotLoot({ kind: 'x' }, fakeRng([0.85, 0.49])), { kind: 'nafta', n: 1 });
  assert.deepEqual(spotLoot({ kind: 'x' }, fakeRng([0.99, 0.5])), { kind: 'nafta', n: 2 });
  // un spot sin kind también tira
  assert.deepEqual(spotLoot(null, fakeRng([0.1, 0.1])), { kind: 'chatarra', n: 1 });
});

test('spotLoot es determinístico con rngFromSeed', () => {
  assert.deepEqual(spotLoot({ kind: 'x' }, rngFromSeed(4)), { kind: 'nafta', n: 1 });
  assert.deepEqual(spotLoot({ kind: 'x' }, rngFromSeed(5)), { kind: 'goma', n: 2 });
  assert.deepEqual(spotLoot({ kind: 'x' }, rngFromSeed(7)), { kind: 'chatarra', n: 1 });
  assert.deepEqual(spotLoot({ kind: 'x' }, rngFromSeed(8)), { kind: 'chatarra', n: 2 });
  assert.deepEqual(spotLoot({ kind: 'x' }, rngFromSeed(30)), { kind: 'nafta', n: 2 });
});

test('dropMochila guarda la bolsa llena y suma una muerte', () => {
  const save = { loop: 2, muertes: 1, mochila: null, botin: { chatarra: 9 } };
  const bag = { chatarra: 2, goma: 1, nafta: 0, pieza: 3 };
  const next = dropMochila(save, bag, 3);
  assert.deepEqual(next.mochila, {
    loop: 3,
    contenido: { chatarra: 2, goma: 1, nafta: 0, pieza: 3 },
  });
  assert.equal(next.muertes, 2);
  assert.equal(next.botin, save.botin);
  // nadie se mutó
  assert.deepEqual(save, { loop: 2, muertes: 1, mochila: null, botin: { chatarra: 9 } });
  assert.deepEqual(bag, { chatarra: 2, goma: 1, nafta: 0, pieza: 3 });
  // el contenido es una copia
  next.mochila.contenido.chatarra = 99;
  assert.equal(bag.chatarra, 2);
});

test('dropMochila con bolsa vacía conserva la mochila anterior', () => {
  const vieja = { loop: 1, contenido: { chatarra: 4, goma: 0, nafta: 0, pieza: 0 } };
  const save = { muertes: 0, mochila: vieja };
  const next = dropMochila(save, emptyBag(), 5);
  assert.equal(next.mochila, vieja);
  assert.equal(next.muertes, 1);
  assert.equal(save.muertes, 0);
});

test('dropMochila desde cero no rompe', () => {
  const next = dropMochila({}, emptyBag(), 0);
  assert.equal(next.mochila, null);
  assert.equal(next.muertes, 1);
  const conBolsa = dropMochila({}, { chatarra: 1 }, 0);
  assert.deepEqual(conBolsa.mochila.contenido, { chatarra: 1, goma: 0, nafta: 0, pieza: 0 });
});

test('pickMochilaSpot excluye la casa y es determinístico', () => {
  const spots = [
    { x: 1, y: 1, cell: 'casa' },
    { x: 2, y: 2, cell: 'esquina' },
    { x: 3, y: 3, cell: 'plaza' },
  ];
  const copia = JSON.stringify(spots);
  const uno = pickMochilaSpot(spots, rngFromSeed(1));
  const dos = pickMochilaSpot(spots, rngFromSeed(1));
  assert.deepEqual(uno, dos);
  assert.notEqual(uno.cell, 'casa');
  assert.deepEqual(pickMochilaSpot(spots, rngFromSeed(1)), { x: 3, y: 3, cell: 'plaza' });
  assert.deepEqual(pickMochilaSpot(spots, rngFromSeed(2)), { x: 3, y: 3, cell: 'plaza' });
  assert.equal(JSON.stringify(spots), copia); // la lista no se toca
});

test('pickMochilaSpot con excludeCell propio', () => {
  const spots = [
    { x: 1, y: 1, cell: 'casa' },
    { x: 2, y: 2, cell: 'esquina' },
  ];
  const spot = pickMochilaSpot(spots, rngFromSeed(3), 'esquina');
  assert.equal(spot.cell, 'casa');
});

test('pickMochilaSpot devuelve null si no queda ningún spot válido', () => {
  assert.equal(pickMochilaSpot([], rngFromSeed(1)), null);
  assert.equal(pickMochilaSpot(null, rngFromSeed(1)), null);
  assert.equal(pickMochilaSpot([{ x: 1, y: 1, cell: 'casa' }], rngFromSeed(1)), null);
  assert.equal(
    pickMochilaSpot([{ x: 1, y: 1, cell: 'casa' }, { x: 2, y: 2, cell: 'casa' }], rngFromSeed(1)),
    null,
  );
});

test('recoverMochila suma el contenido y limpia la mochila', () => {
  const save = {
    loop: 4,
    muertes: 2,
    mochila: { loop: 2, contenido: { chatarra: 2, goma: 1, nafta: 0, pieza: 1 } },
  };
  const bag = { chatarra: 1, goma: 0, nafta: 3, pieza: 0 };
  const out = recoverMochila(save, bag);
  assert.equal(out.save.mochila, null);
  assert.equal(out.save.muertes, 2);
  assert.equal(out.save.loop, 4);
  assert.deepEqual(out.bag, { chatarra: 3, goma: 1, nafta: 3, pieza: 1 });
  // inmutables
  assert.equal(save.mochila.loop, 2);
  assert.deepEqual(bag, { chatarra: 1, goma: 0, nafta: 3, pieza: 0 });
  assert.notEqual(out.bag, bag);
});

test('recoverMochila sin mochila deja la bolsa igual', () => {
  const bag = { chatarra: 1, goma: 2, nafta: 0, pieza: 0 };
  const out = recoverMochila({ muertes: 0, mochila: null }, bag);
  assert.equal(out.save.mochila, null);
  assert.deepEqual(out.bag, bag);
  assert.notEqual(out.bag, bag);
  const sinNada = recoverMochila(null, null);
  assert.equal(sinNada.save.mochila, null);
  assert.deepEqual(sinNada.bag, emptyBag());
});
