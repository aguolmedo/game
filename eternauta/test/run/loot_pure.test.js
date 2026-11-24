// Lógica pura del botín de la salida (src/arena/lootRun.js).
import test from 'node:test';
import assert from 'node:assert/strict';

import { rngFromSeed } from '../../src/run/rng.js';
import {
  LOOT_KINDS, LOOT_ITEM, LOOT_NAME, emptyBag, addToBag, enemyDrop, spotLoot,
} from '../../src/run/loot.js';
import {
  PICKUP_RADIUS, MOCHILA_RADIUS,
  dropsFor, picksUp, resolvePickup, collectLoot, collectLootInto,
  mochilaSpot, hasMochila, recoverAtMochila, mochilaOnDeath,
  survivorGift, bagSummary,
} from '../../src/arena/lootRun.js';
import * as lootRun from '../../src/arena/lootRun.js';

// rng falso: devuelve los valores dados, en orden, y avisa si se agota.
function fakeRng(values) {
  let i = 0;
  const rng = () => {
    if (i >= values.length) throw new Error('rng agotado');
    return values[i++];
  };
  rng.calls = () => i;
  return rng;
}

test('constantes y re-export de LOOT_ITEM / LOOT_NAME', () => {
  assert.equal(PICKUP_RADIUS, 10);
  assert.equal(MOCHILA_RADIUS, 12);
  assert.equal(lootRun.LOOT_ITEM, LOOT_ITEM);
  assert.equal(lootRun.LOOT_NAME, LOOT_NAME);
});

test('picksUp: el borde del radio cuenta, un px más no', () => {
  assert.equal(picksUp({ x: 10, y: 0 }, { x: 0, feet: 0 }), true);
  assert.equal(picksUp({ x: 11, y: 0 }, { x: 0, feet: 0 }), false);
  assert.equal(picksUp({ x: 6, y: 8 }, { x: 0, feet: 0 }), true); // 6-8-10
  assert.equal(picksUp({ x: 7, y: 8 }, { x: 0, feet: 0 }), false);
  assert.equal(picksUp({ x: 0, y: 10 }, { x: 0, feet: 0 }), true);
  assert.equal(picksUp({ x: 0, y: 11 }, { x: 0, feet: 0 }), false);
  // radio a medida
  assert.equal(picksUp({ x: 15, y: 0 }, { x: 0, feet: 0 }, 20), true);
  assert.equal(picksUp({ x: 15, y: 0 }, { x: 0, feet: 0 }, 14), false);
  // datos raros
  assert.equal(picksUp(null, { x: 0, feet: 0 }), false);
  assert.equal(picksUp({ x: 0, y: 0 }, null), false);
});

test('picksUp usa feet y, si no hay, y', () => {
  assert.equal(picksUp({ x: 0, y: 30 }, { x: 0, feet: 30, y: 0 }), true);
  assert.equal(picksUp({ x: 0, y: 0 }, { x: 0, feet: 30, y: 0 }), false);
  assert.equal(picksUp({ x: 0, y: 9 }, { x: 0, y: 0 }), true);
});

test('dropsFor delega en enemyDrop con el mismo rng', () => {
  for (const type of ['cascarudo', 'veloz', 'acorazado', 'nada']) {
    assert.deepEqual(
      dropsFor(type, rngFromSeed(99)),
      enemyDrop(type, rngFromSeed(99)),
    );
  }
  assert.deepEqual(
    dropsFor('cascarudo', fakeRng([0, 0])),
    [{ kind: 'chatarra', n: 1 }, { kind: 'goma', n: 1 }],
  );
});

test('resolvePickup: nafta fija, loot al azar, el resto tal cual', () => {
  assert.deepEqual(resolvePickup({ kind: 'nafta', n: 9 }, fakeRng([])), { kind: 'nafta', n: 1 });
  assert.deepEqual(resolvePickup({ kind: 'chatarra', n: 3 }), { kind: 'chatarra', n: 3 });
  assert.deepEqual(resolvePickup({ kind: 'goma' }), { kind: 'goma', n: 1 });
  assert.deepEqual(resolvePickup({ kind: 'loot' }, fakeRng([0.1, 0.1])), { kind: 'chatarra', n: 1 });
  assert.deepEqual(resolvePickup({ kind: 'loot' }, fakeRng([0.9, 0.6])), { kind: 'nafta', n: 2 });
  assert.equal(resolvePickup(null), null);
  assert.equal(resolvePickup({}), null);
});

test('collectLoot junta lo pisado, deja el resto y no muta nada', () => {
  const items = [
    { x: 0, y: 0, kind: 'chatarra', n: 2 },
    { x: 100, y: 0, kind: 'goma' },
    { x: 5, y: 0, kind: 'pieza', n: 1 },
  ];
  const snapshot = JSON.parse(JSON.stringify(items));
  const bag = addToBag(emptyBag(), 'goma', 4);
  const bagBefore = { ...bag };

  const out = collectLoot(items, { x: 0, feet: 0 }, bag, fakeRng([]));

  assert.deepEqual(out.taken, [{ kind: 'chatarra', n: 2 }, { kind: 'pieza', n: 1 }]);
  assert.equal(out.takenItems.length, 2);
  assert.equal(out.takenItems[0], items[0]);
  assert.equal(out.takenItems[1], items[2]);
  assert.equal(out.left.length, 1);
  assert.equal(out.left[0], items[1]);
  assert.deepEqual(out.bag, { chatarra: 2, goma: 4, nafta: 0, pieza: 1 });
  assert.notEqual(out.bag, bag);
  // entradas intactas
  assert.deepEqual(items, snapshot);
  assert.deepEqual(bag, bagBefore);
});

test("collectLoot: 'loot' usa spotLoot con el rng en orden", () => {
  const seed = 4242;
  const expected = [];
  const expRng = rngFromSeed(seed);
  expected.push(spotLoot({ kind: 'loot' }, expRng));
  expected.push(spotLoot({ kind: 'loot' }, expRng));

  const out = collectLoot([
    { x: 0, y: 0, kind: 'loot' },
    { x: 3, y: 4, kind: 'loot' },
  ], { x: 0, feet: 0 }, emptyBag(), rngFromSeed(seed));

  assert.deepEqual(out.taken, expected);
  const want = expected.reduce((b, e) => addToBag(b, e.kind, e.n), emptyBag());
  assert.deepEqual(out.bag, want);
});

test('collectLoot no tira el rng por items que no se pisan', () => {
  const never = () => { throw new Error('no debería tirar'); };
  const out = collectLoot(
    [{ x: 50, y: 0, kind: 'loot' }],
    { x: 0, feet: 0 },
    emptyBag(),
    never,
  );
  assert.deepEqual(out.taken, []);
  assert.equal(out.left.length, 1);
  assert.deepEqual(out.bag, emptyBag());
});

test('collectLoot con lista vacía o rara', () => {
  const bag = addToBag(emptyBag(), 'nafta', 2);
  assert.deepEqual(collectLoot([], { x: 0, feet: 0 }, bag, fakeRng([])), {
    bag, taken: [], takenItems: [], left: [],
  });
  const out = collectLoot(null, { x: 0, feet: 0 }, bag, fakeRng([]));
  assert.deepEqual(out.taken, []);
  assert.equal(out.bag, bag);
});

test('collectLootInto reusa el objeto y los arrays entre cuadros', () => {
  const out = { bag: null, taken: [], takenItems: [], left: [] };
  const taken = out.taken;
  const items = [{ x: 0, y: 0, kind: 'goma' }];
  const first = collectLootInto(
    items, { x: 0, feet: 0 }, emptyBag(), fakeRng([]), PICKUP_RADIUS, out,
  );
  assert.equal(first, out, 'devuelve el mismo objeto');
  assert.equal(first.taken, taken, 'reusa el array de tomados');
  assert.equal(first.bag.goma, 1);
  assert.equal(first.taken.length, 1);

  // La arena mantiene un buffer aparte para `left` (nunca es `items`).
  const spare = [];
  out.left = spare;
  const items2 = [{ x: 50, y: 0, kind: 'goma' }];
  const second = collectLootInto(
    items2, { x: 0, feet: 0 }, first.bag, fakeRng([]), PICKUP_RADIUS, out,
  );
  assert.equal(second, out);
  assert.equal(second.taken.length, 0, 'se vació el array reusado');
  assert.equal(second.left, spare);
  assert.equal(second.left.length, 1);
  assert.equal(second.left[0], items2[0]);
});

test('mochilaSpot excluye la casa y devuelve null sin spots', () => {
  const spots = [
    { cell: 'casa', x: 1 },
    { cell: 'calle', x: 2 },
    { cell: 'calle', x: 3 },
  ];
  assert.equal(mochilaSpot(spots, fakeRng([0])).x, 2);
  assert.equal(mochilaSpot(spots, fakeRng([0.999])).x, 3);
  for (let seed = 0; seed < 40; seed++) {
    assert.notEqual(mochilaSpot(spots, rngFromSeed(seed)).cell, 'casa');
  }
  assert.equal(mochilaSpot([], fakeRng([0])), null);
  assert.equal(mochilaSpot([{ cell: 'casa' }], fakeRng([0])), null);
  assert.equal(mochilaSpot(null, fakeRng([0])), null);
});

test('hasMochila mira el contenido', () => {
  assert.equal(hasMochila(undefined), false);
  assert.equal(hasMochila({}), false);
  assert.equal(hasMochila({ mochila: null }), false);
  assert.equal(hasMochila({ mochila: { contenido: { chatarra: 1 } } }), true);
});

test('recoverAtMochila suma el contenido y deja mochila null', () => {
  const save = { muertes: 2, mochila: { loop: 1, contenido: { chatarra: 2, goma: 1 } } };
  const bag = addToBag(emptyBag(), 'chatarra', 1);
  const out = recoverAtMochila(save, bag);

  assert.equal(out.save.mochila, null);
  assert.equal(out.save.muertes, 2);
  assert.deepEqual(out.bag, { chatarra: 3, goma: 1, nafta: 0, pieza: 0 });
  // el save original no se toca
  assert.deepEqual(save.mochila, { loop: 1, contenido: { chatarra: 2, goma: 1 } });
  assert.equal(bag.chatarra, 1);

  const sin = recoverAtMochila({}, { goma: 2 });
  assert.equal(sin.save.mochila, null);
  assert.deepEqual(sin.bag, { chatarra: 0, goma: 2, nafta: 0, pieza: 0 });
});

test('mochilaOnDeath guarda {loop,contenido} y reemplaza la vieja', () => {
  const old = { loop: 0, muertes: 1, mochila: { loop: 1, contenido: { chatarra: 5 } } };
  const bag = addToBag(emptyBag(), 'nafta', 1);
  const next = mochilaOnDeath(old, bag, 2);

  assert.deepEqual(next.mochila, { loop: 2, contenido: { chatarra: 0, goma: 0, nafta: 1, pieza: 0 } });
  assert.equal(next.muertes, 2);
  assert.equal(next.loop, 0);
  // no muta el save viejo
  assert.deepEqual(old.mochila, { loop: 1, contenido: { chatarra: 5 } });
  assert.equal(old.muertes, 1);
});

test('mochilaOnDeath con bolsa vacía conserva la mochila anterior', () => {
  const old = { loop: 0, muertes: 1, mochila: { loop: 1, contenido: { chatarra: 5 } } };
  const keep = mochilaOnDeath(old, emptyBag(), 3);
  assert.deepEqual(keep.mochila, old.mochila);
  assert.equal(keep.muertes, 2);
});

test('survivorGift da +2 de un tipo válido', () => {
  for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
    const gift = survivorGift(fakeRng([r]));
    assert.ok(LOOT_KINDS.includes(gift.kind), `${gift.kind} no es un tipo de botín`);
    assert.equal(gift.n, 2);
  }
  assert.deepEqual(survivorGift(fakeRng([0])), { kind: 'chatarra', n: 2 });
  assert.deepEqual(survivorGift(fakeRng([0.99])), { kind: 'pieza', n: 2 });
});

test('bagSummary arma el texto en orden y omite ceros', () => {
  const bag = addToBag(addToBag(emptyBag(), 'goma', 1), 'chatarra', 3);
  assert.equal(bagSummary(bag), '3 chatarra, 1 goma');
  assert.equal(bagSummary({ goma: 1, chatarra: 3, nafta: 0, pieza: 0 }), '3 chatarra, 1 goma');
  assert.equal(bagSummary({ chatarra: 0, goma: 2 }), '2 goma');
  assert.equal(bagSummary({ pieza: 1 }), '1 pieza de cascarudo');
  assert.equal(bagSummary({ nafta: 1 }), '1 nafta');
  assert.equal(bagSummary(emptyBag()), '');
  assert.equal(bagSummary(undefined), '');
});
