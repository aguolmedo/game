import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SAVE_KEY,
  SAVE_VERSION,
  emptySave,
  loadSave,
  writeSave,
  clearSave,
  addBotin,
  storageOrNull,
} from '../src/run/save.js';

function memoryStorage() {
  const data = new Map();
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => { data.set(key, String(value)); },
    removeItem: (key) => { data.delete(key); },
  };
}

const brokenStorage = {
  getItem() { throw new Error('getItem roto'); },
  setItem() { throw new Error('setItem roto'); },
  removeItem() { throw new Error('removeItem roto'); },
};

test('SAVE_KEY sigue siendo la clave histórica y la versión del formato es 2', () => {
  assert.equal(SAVE_KEY, 'eternauta.save.v1');
  assert.equal(SAVE_VERSION, 1);
});

test('emptySave devuelve el objeto exacto y siempre uno nuevo', () => {
  const expected = {
    v: 1,
    trajeHecho: false,
    loop: 0,
    muertes: 0,
    botin: { chatarra: 0, goma: 0, nafta: 0, pieza: 0 },
    mejoras: { favalli: 0, elena: 0, lucas: 0, luz: 0 },
    mochila: null,
    best: { round: 0, points: 0 },
  };
  assert.deepEqual(emptySave(), expected);
  const a = emptySave();
  const b = emptySave();
  assert.notEqual(a, b);
  assert.notEqual(a.botin, b.botin);
  assert.notEqual(a.mejoras, b.mejoras);
  assert.notEqual(a.best, b.best);
  a.botin.chatarra = 99;
  assert.equal(b.botin.chatarra, 0);
});

test('loadSave sin nada guardado da un save vacío', () => {
  assert.deepEqual(loadSave(memoryStorage()), emptySave());
});

test('roundtrip writeSave/loadSave conserva todo', () => {
  const storage = memoryStorage();
  const save = emptySave();
  save.trajeHecho = true;
  save.loop = 4;
  save.muertes = 2;
  save.botin.chatarra = 7;
  save.botin.nafta = 3;
  save.mejoras.favalli = 2;
  save.mejoras.luz = 1;
  save.mochila = { loop: 3, contenido: { chatarra: 1, goma: 2, nafta: 0, pieza: 1 } };
  save.best = { round: 5, points: 1200 };

  assert.equal(writeSave(save, storage), true);
  assert.deepEqual(loadSave(storage), save);
});

test('loadSave con JSON roto, versión desconocida o basura devuelve vacío', () => {
  const storage = memoryStorage();
  storage.setItem(SAVE_KEY, '{esto no es json');
  assert.deepEqual(loadSave(storage), emptySave());

  storage.setItem(SAVE_KEY, JSON.stringify({ ...emptySave(), v: 3 }));
  assert.deepEqual(loadSave(storage), emptySave());

  storage.setItem(SAVE_KEY, JSON.stringify(['una', 'lista']));
  assert.deepEqual(loadSave(storage), emptySave());

  storage.setItem(SAVE_KEY, '42');
  assert.deepEqual(loadSave(storage), emptySave());
});

test('loadSave completa campos faltantes sin perder los que están', () => {
  const storage = memoryStorage();
  storage.setItem(SAVE_KEY, JSON.stringify({
    v: 1,
    botin: { chatarra: 9 },
    mejoras: { lucas: 3 },
    best: { round: 2 },
  }));
  const save = loadSave(storage);
  assert.equal(save.trajeHecho, false);
  assert.equal(save.loop, 0);
  assert.equal(save.botin.chatarra, 9);
  assert.equal(save.botin.goma, 0);
  assert.equal(save.mejoras.lucas, 3);
  assert.equal(save.mejoras.favalli, 0);
  assert.equal(save.best.round, 2);
  assert.equal(save.best.points, 0);
  assert.equal(save.mochila, null);
});

test('loadSave conserva la mochila tal cual', () => {
  const storage = memoryStorage();
  const mochila = { loop: 2, contenido: { chatarra: 3, goma: 0, nafta: 1, pieza: 0 } };
  storage.setItem(SAVE_KEY, JSON.stringify({ v: 1, mochila }));
  assert.deepEqual(loadSave(storage).mochila, mochila);
});

test('un storage que tira error no rompe nada', () => {
  assert.deepEqual(loadSave(brokenStorage), emptySave());
  assert.equal(writeSave(emptySave(), brokenStorage), false);
  assert.doesNotThrow(() => clearSave(brokenStorage));
});

test('un storage inexistente (undefined) tampoco rompe', () => {
  assert.deepEqual(loadSave(undefined), emptySave());
  assert.equal(writeSave(emptySave(), undefined), false);
  assert.doesNotThrow(() => clearSave(undefined));
});

test('clearSave borra la clave', () => {
  const storage = memoryStorage();
  writeSave(emptySave(), storage);
  assert.notEqual(storage.getItem(SAVE_KEY), null);
  clearSave(storage);
  assert.equal(storage.getItem(SAVE_KEY), null);
});

test('addBotin suma solo las claves conocidas y válidas', () => {
  const save = emptySave();
  save.botin.chatarra = 2;
  const out = addBotin(save, {
    chatarra: 3,
    goma: 2,
    nafta: 0,
    pieza: 1,
    perejil: 50,
    gomaNegativa: -4,
  });
  assert.equal(out.botin.chatarra, 5);
  assert.equal(out.botin.goma, 2);
  assert.equal(out.botin.nafta, 0);
  assert.equal(out.botin.pieza, 1);
  assert.equal(out.botin.perejil, undefined);
  assert.equal(out.botin.gomaNegativa, undefined);
});

test('addBotin ignora NaN, Infinity, undefined y negativos', () => {
  const save = emptySave();
  const out = addBotin(save, {
    chatarra: NaN,
    goma: Infinity,
    nafta: -3,
    pieza: undefined,
  });
  assert.deepEqual(out.botin, emptySave().botin);
});

test('addBotin no muta el save ni la bolsa', () => {
  const save = emptySave();
  save.botin.chatarra = 4;
  const bag = { chatarra: 2, goma: 1 };
  const saveBefore = JSON.parse(JSON.stringify(save));
  const bagBefore = JSON.parse(JSON.stringify(bag));
  const out = addBotin(save, bag);
  assert.deepEqual(save, saveBefore);
  assert.deepEqual(bag, bagBefore);
  assert.notEqual(out, save);
  assert.notEqual(out.botin, save.botin);
});

test('addBotin con bolsa vacía o nula devuelve una copia sin cambios', () => {
  const save = emptySave();
  save.botin.chatarra = 4;
  for (const bag of [null, undefined, {}]) {
    const out = addBotin(save, bag);
    assert.deepEqual(out, save);
    assert.notEqual(out, save);
    assert.notEqual(out.botin, save.botin);
  }
});

// ------------------------------------------------- récord unificado (M12)
test('M12: writeSave sólo escribe la clave del save y el récord viaja adentro', () => {
  const storage = memoryStorage();
  const save = emptySave();
  save.best = { round: 2, points: 100 };
  writeSave(save, storage);
  assert.equal(storage.data.size, 1);
  assert.deepEqual(JSON.parse(storage.getItem(SAVE_KEY)).best, { round: 2, points: 100 });
});

test('M12: una clave vieja eternauta.arena.best ya no se lee ni se escribe', () => {
  const storage = memoryStorage();
  const legacy = JSON.stringify({ round: 9, points: 1500 });
  storage.setItem('eternauta.arena.best', legacy);
  assert.deepEqual(loadSave(storage).best, { round: 0, points: 0 });

  writeSave(emptySave(), storage);
  assert.equal(storage.getItem('eternauta.arena.best'), legacy);
  assert.deepEqual(loadSave(storage).best, { round: 0, points: 0 });
});

test('clearSave borra el save completo, récord incluido', () => {
  const storage = memoryStorage();
  const save = emptySave();
  save.best = { round: 4, points: 40 };
  writeSave(save, storage);
  clearSave(storage);
  assert.equal(storage.getItem(SAVE_KEY), null);
  assert.deepEqual(loadSave(storage).best, { round: 0, points: 0 });
});

// ------------------------------------------------- storage inaccesible (M4)
test('un localStorage con getter que tira no rompe nada (se resuelve dentro del try)', () => {
  const desc = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() { throw new Error('origen restringido'); },
  });
  try {
    assert.equal(storageOrNull(), null);
    assert.deepEqual(loadSave(), emptySave());
    assert.equal(writeSave(emptySave()), false);
    assert.doesNotThrow(() => clearSave());
  } finally {
    if (desc) Object.defineProperty(globalThis, 'localStorage', desc);
    else delete globalThis.localStorage;
  }
});
