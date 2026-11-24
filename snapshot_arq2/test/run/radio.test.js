import test from 'node:test';
import assert from 'node:assert/strict';
import { RUMORES, GAGS_RADIO, rumorFor, radioLine } from '../../src/run/radio.js';
import { rngFromSeed, pick } from '../../src/run/rng.js';

const byId = (id) => RUMORES.find((r) => r.id === id);
const cellsOf = (...types) => types.map((type) => ({ type }));
const BARRIO = cellsOf('casa', 'esquina', 'plaza', 'vias', 'cortada');

test('RUMORES: hay al menos 8, con ids únicos y texto', () => {
  assert.ok(RUMORES.length >= 8);
  const ids = RUMORES.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const rumor of RUMORES) {
    assert.equal(typeof rumor.id, 'string');
    assert.ok(rumor.id.length > 0);
    assert.equal(typeof rumor.text, 'string');
    assert.ok(rumor.text.trim().length > 0);
    assert.equal(typeof rumor.check, 'function');
  }
});

test('RUMORES: con el barrio vacío todos son falsos', () => {
  for (const rumor of RUMORES) {
    assert.equal(rumor.check([]), false, rumor.id);
    assert.equal(rumor.check(undefined), false, rumor.id);
  }
});

test('RUMORES: esquina deja ciertos los de la ochava y la ferretería', () => {
  const cells = cellsOf('esquina');
  assert.equal(byId('ferreteria').check(cells), true);
  assert.equal(byId('choque').check(cells), true);
  assert.equal(byId('colectivo').check(cells), true);
  assert.equal(byId('vias').check(cells), false);
  assert.equal(byId('plaza').check(cells), false);
  assert.equal(byId('almacen').check(cells), false);
});

test('RUMORES: plaza deja ciertos los rumores de la plaza', () => {
  const cells = cellsOf('plaza');
  assert.equal(byId('plaza').check(cells), true);
  assert.equal(byId('nieve_plaza').check(cells), true);
  assert.equal(byId('ferreteria').check(cells), false);
  assert.equal(byId('tren_once').check(cells), false);
});

test('RUMORES: vías deja ciertos los rumores del tren', () => {
  const cells = cellsOf('vias');
  assert.equal(byId('vias').check(cells), true);
  assert.equal(byId('tren_once').check(cells), true);
  assert.equal(byId('garita').check(cells), true);
  assert.equal(byId('plaza').check(cells), false);
  assert.equal(byId('callejon').check(cells), false);
});

test('RUMORES: cortada deja ciertos los rumores del pasaje', () => {
  const cells = cellsOf('cortada');
  assert.equal(byId('almacen').check(cells), true);
  assert.equal(byId('callejon').check(cells), true);
  assert.equal(byId('ferreteria').check(cells), false);
  assert.equal(byId('vias').check(cells), false);
});

test('RUMORES: barrio completo deja ciertos los del barrio y falsos los de siempre', () => {
  const ciertos = RUMORES.filter((r) => r.check(BARRIO)).map((r) => r.id);
  assert.deepEqual(ciertos.sort(), [
    'almacen', 'callejon', 'choque', 'colectivo', 'ferreteria', 'garita',
    'nieve_plaza', 'plaza', 'tren_once', 'vias',
  ]);
  assert.equal(byId('tranquilo').check(BARRIO), false);
  assert.equal(byId('ramirez').check(BARRIO), false);
});

test('GAGS_RADIO: niveles 0..3 con al menos 3 líneas cada uno', () => {
  for (const level of [0, 1, 2, 3]) {
    const lines = GAGS_RADIO[level];
    assert.ok(Array.isArray(lines), `nivel ${level}`);
    assert.ok(lines.length >= 3, `nivel ${level} tiene ${lines.length}`);
    for (const line of lines) {
      assert.equal(typeof line, 'string');
      assert.ok(line.trim().length > 0);
    }
  }
});

test('GAGS_RADIO: el nivel 3 tiene la voz de los números', () => {
  const all = GAGS_RADIO[3].join(' ');
  assert.ok(all.includes('siete'));
  assert.ok(all.includes('cuatro'));
});

test('GAGS_RADIO: la voz de los números no aparece en 0, 1 ni 2', () => {
  for (const level of [0, 1, 2]) {
    const all = GAGS_RADIO[level].join(' ').toLowerCase();
    assert.equal(all.includes('siete'), false, `nivel ${level}`);
    assert.equal(all.includes('cuatro'), false, `nivel ${level}`);
  }
});

test('GAGS_RADIO: están el otro loop, el gol y el tango', () => {
  const all = [0, 1, 2, 3].map((l) => GAGS_RADIO[l].join(' ')).join(' ');
  assert.ok(all.includes('CQ, CQ'));
  assert.ok(all.includes('¡Gol!'));
  assert.ok(all.toLowerCase().includes('tango'));
});

test('ningún texto habla del tutorial, del programa ni del programador', () => {
  const textos = [
    ...RUMORES.map((r) => r.text),
    ...[0, 1, 2, 3].flatMap((l) => GAGS_RADIO[l]),
  ];
  for (const texto of textos) {
    const low = texto.toLowerCase();
    assert.equal(low.includes('tutorial'), false, texto);
    assert.equal(low.includes('programa'), false, texto);
    assert.equal(low.includes('programador'), false, texto);
  }
});

test('rumorFor devuelve el texto del rumor elegido y si es cierto', () => {
  const cells = cellsOf('esquina');
  for (let seed = 1; seed <= 40; seed += 1) {
    const res = rumorFor(cells, rngFromSeed(seed));
    assert.equal(typeof res.text, 'string');
    assert.equal(typeof res.cierto, 'boolean');
    const rumor = RUMORES.find((r) => r.text === res.text);
    assert.ok(rumor, res.text);
    assert.equal(res.cierto, rumor.check(cells));
  }
});

test('rumorFor es determinístico con la misma semilla', () => {
  const cells = BARRIO;
  const a = rumorFor(cells, rngFromSeed(1234));
  const b = rumorFor(cells, rngFromSeed(1234));
  assert.deepEqual(a, b);
});

test('rumorFor elige lo mismo que pick(rng, RUMORES)', () => {
  const rng = rngFromSeed(99);
  const esperado = pick(rngFromSeed(99), RUMORES);
  const res = rumorFor(cellsOf('plaza'), rng);
  assert.equal(res.text, esperado.text);
});

test('rumorFor aguanta cells undefined', () => {
  const res = rumorFor(undefined, rngFromSeed(5));
  assert.equal(typeof res.text, 'string');
  assert.equal(typeof res.cierto, 'boolean');
});

test('radioLine es determinístico con la misma semilla', () => {
  for (const level of [0, 1, 2, 3]) {
    const a = radioLine(level, rngFromSeed(77));
    const b = radioLine(level, rngFromSeed(77));
    assert.equal(a, b);
    assert.ok(GAGS_RADIO[level].includes(a));
  }
});

test('radioLine no tira con niveles fuera de rango', () => {
  const bajo = radioLine(-5, rngFromSeed(3));
  const alto = radioLine(99, rngFromSeed(3));
  assert.ok(GAGS_RADIO[0].includes(bajo));
  assert.ok(GAGS_RADIO[3].includes(alto));
  assert.ok(GAGS_RADIO[0].includes(radioLine(NaN, rngFromSeed(1))));
  assert.ok(GAGS_RADIO[0].includes(radioLine(undefined, rngFromSeed(1))));
});
