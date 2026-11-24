import test from 'node:test';
import assert from 'node:assert/strict';

import {
  seedFor,
  PALOS,
  NUMEROS,
  handFromSeed,
  handText,
  envido,
  SEED_33,
} from '../src/run/seed.js';

test('seedFor es determinístico y devuelve un entero de 32 bits', () => {
  assert.equal(seedFor(0), seedFor(0));
  assert.equal(seedFor(1, 2), seedFor(1, 2));
  assert.equal(seedFor(0, 0), 1773302445);
  assert.equal(seedFor(1, 0), 1663353798);
  assert.equal(seedFor(1, 1), 1680131417);

  for (const seed of [seedFor(0), seedFor(1), seedFor(9, 4)]) {
    assert.equal(Number.isInteger(seed), true);
    assert.equal(seed > 0, true);
    assert.equal(seed <= 0xffffffff, true);
  }
});

test('seedFor cambia con el loop y con la sal', () => {
  assert.notEqual(seedFor(1), seedFor(2));
  assert.notEqual(seedFor(1), seedFor(1, 1));
  assert.notEqual(seedFor(3, 0), seedFor(0, 3));
  // valores raros no rompen
  assert.equal(seedFor('x', 'y'), seedFor(0, 0));
});

test('palos y números del truco', () => {
  assert.deepEqual(PALOS, ['espada', 'basto', 'oro', 'copa']);
  assert.deepEqual(NUMEROS, [1, 2, 3, 4, 5, 6, 7, 10, 11, 12]);
  assert.equal(PALOS.length * NUMEROS.length, 40);
});

test('handFromSeed da tres cartas válidas y distintas', () => {
  for (const seed of [1, 2, 3, SEED_33, 0xdeadbeef]) {
    const hand = handFromSeed(seed);
    assert.equal(hand.length, 3);
    const vistas = new Set();
    for (const card of hand) {
      assert.equal(PALOS.includes(card.palo), true);
      assert.equal(NUMEROS.includes(card.n), true);
      vistas.add(`${card.n}:${card.palo}`);
    }
    assert.equal(vistas.size, 3);
  }
});

test('handFromSeed es determinístico', () => {
  assert.deepEqual(handFromSeed(42), handFromSeed(42));
  assert.deepEqual(handFromSeed(SEED_33), [
    { n: 7, palo: 'oro' },
    { n: 12, palo: 'espada' },
    { n: 6, palo: 'oro' },
  ]);
  // semillas distintas, manos distintas (en general)
  assert.notDeepEqual(handFromSeed(1), handFromSeed(2));
});

test('handText arma el texto del cartel', () => {
  assert.equal(
    handText([
      { n: 7, palo: 'oro' },
      { n: 1, palo: 'espada' },
      { n: 4, palo: 'copa' },
    ]),
    '7 de oro · 1 de espada · 4 de copa',
  );
  assert.equal(handText([{ n: 1, palo: 'espada' }]), '1 de espada');
  assert.equal(handText([]), '');
  assert.equal(handText(null), '');
  assert.equal(handText(handFromSeed(SEED_33)), '7 de oro · 12 de espada · 6 de oro');
});

test('envido con dos del mismo palo: figuras valen 0', () => {
  assert.equal(
    envido([
      { n: 10, palo: 'oro' },
      { n: 7, palo: 'oro' },
      { n: 2, palo: 'espada' },
    ]),
    27,
  );
  assert.equal(
    envido([
      { n: 12, palo: 'copa' },
      { n: 11, palo: 'copa' },
      { n: 1, palo: 'basto' },
    ]),
    20,
  );
});

test('envido con tres del mismo palo elige el mejor par', () => {
  assert.equal(
    envido([
      { n: 1, palo: 'oro' },
      { n: 5, palo: 'oro' },
      { n: 7, palo: 'oro' },
    ]),
    32,
  );
  assert.equal(
    envido([
      { n: 3, palo: 'espada' },
      { n: 6, palo: 'espada' },
      { n: 12, palo: 'espada' },
    ]),
    29,
  );
});

test('envido sin pares toma la carta más alta que no sea figura', () => {
  assert.equal(
    envido([
      { n: 10, palo: 'espada' },
      { n: 11, palo: 'basto' },
      { n: 6, palo: 'oro' },
    ]),
    6,
  );
  assert.equal(
    envido([
      { n: 2, palo: 'espada' },
      { n: 7, palo: 'oro' },
      { n: 4, palo: 'copa' },
    ]),
    7,
  );
});

test('envido defensivo: todo figuras o mano vacía da 0', () => {
  assert.equal(
    envido([
      { n: 10, palo: 'espada' },
      { n: 11, palo: 'basto' },
      { n: 12, palo: 'oro' },
    ]),
    0,
  );
  assert.equal(envido([]), 0);
  assert.equal(envido(null), 0);
  assert.equal(envido(undefined), 0);
});

test('SEED_33 es la mano de 33 del cómic', () => {
  assert.equal(envido(handFromSeed(SEED_33)), 33);
});
