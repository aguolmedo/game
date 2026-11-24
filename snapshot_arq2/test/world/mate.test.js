import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createMate, putYerba, cebar, sip, share, dump, isLavado, mateItemId,
  createPava, startHeating, heat, coolPava, takePava, pavaItemId,
  tempZone, drawThermometer, HEAT_SECONDS, COOL_SECONDS, LAVADO_AT,
} from '../../src/mate.js';

function fakeCtx() {
  const ops = [];
  const push = (name) => (...args) => ops.push([name, ...args]);
  return {
    ops,
    canvas: { width: 480, height: 270 },
    fillStyle: '',
    fillRect(...args) { ops.push(['fillRect', this.fillStyle, ...args]); },
    save: push('save'),
    restore: push('restore'),
    beginPath: push('beginPath'),
  };
}

test('el mate arranca vacío y sigue la máquina de estados', () => {
  const mate = createMate();
  assert.equal(mate.state, 'vacio');
  assert.equal(mate.cebadas, 0);
  assert.equal(mateItemId(mate), 'mate_vacio');

  assert.equal(cebar(mate), false);          // sin yerba no se ceba
  assert.equal(putYerba(mate), true);
  assert.equal(mate.state, 'yerba');
  assert.equal(putYerba(mate), false);       // ya tiene yerba

  assert.equal(cebar(mate, { temp: 80 }), true);
  assert.equal(mate.state, 'cebado');
  assert.equal(mate.burnt, false);
  assert.equal(mateItemId(mate), 'mate_cebado');

  assert.equal(sip(mate), true);
  assert.equal(mate.state, 'yerba');
  assert.equal(mate.cebadas, 1);
});

test('convidar devuelve el mate y suma una cebada', () => {
  const mate = createMate();
  putYerba(mate);
  cebar(mate, { temp: 75 });
  const back = share(mate);
  assert.equal(back, mate);
  assert.equal(mate.state, 'yerba');
  assert.equal(mate.cebadas, 1);
});

test('a las 8 cebadas el mate queda lavado y se puede tirar', () => {
  const mate = createMate();
  for (let i = 0; i < LAVADO_AT; i++) {
    putYerba(mate);
    cebar(mate, { temp: 78 });
    sip(mate);
  }
  assert.equal(mate.cebadas, LAVADO_AT);
  assert.equal(mate.state, 'lavado');
  assert.equal(isLavado(mate), true);
  assert.equal(mateItemId(mate), 'mate_lavado');
  assert.equal(sip(mate), false);            // ya no está cebado

  assert.equal(dump(mate), true);
  assert.equal(mate.state, 'vacio');
  assert.equal(mate.cebadas, 0);
  assert.equal(dump(mate), false);
});

test('el agua hervida quema el mate y lo lava en dos cebadas', () => {
  const mate = createMate();
  putYerba(mate);
  cebar(mate, { temp: 100 });
  assert.equal(mate.burnt, true);
  // también se puede cebar con el item o con {hervida:true}
  assert.equal(createMate().state, 'vacio');
  const a = createMate(); putYerba(a); cebar(a, 'pava_hervida');
  assert.equal(a.burnt, true);
  const b = createMate(); putYerba(b); cebar(b, { hervida: true });
  assert.equal(b.burnt, true);
  const c = createMate(); putYerba(c); cebar(c, 'pava_caliente');
  assert.equal(c.burnt, false);
  sip(mate);
  assert.equal(mate.state, 'yerba');
  putYerba(mate);
  cebar(mate, { temp: 100 });
  sip(mate);
  assert.equal(mate.state, 'lavado');
  assert.equal(mate.cebadas, 2);
});

test('la pava calienta 0 a 100 en 9 s', () => {
  const pava = createPava();
  assert.deepEqual(pava, { temp: 0, heating: false, station: null });
  heat(pava, HEAT_SECONDS);                  // sin estar al fuego no pasa nada
  assert.equal(pava.temp, 0);

  startHeating(pava, 'calentador');
  assert.equal(pava.heating, true);
  assert.equal(pava.station, 'calentador');
  heat(pava, HEAT_SECONDS / 2);
  assert.equal(Math.round(pava.temp), 50);
  heat(pava, HEAT_SECONDS);
  assert.equal(pava.temp, 100);              // se corta en 100
});

test('zonas y umbrales de temperatura', () => {
  assert.equal(tempZone(0), 'fria');
  assert.equal(tempZone(69), 'fria');
  assert.equal(tempZone(70), 'ideal');
  assert.equal(tempZone(85), 'ideal');
  assert.equal(tempZone(86), 'caliente');
  assert.equal(tempZone(95), 'caliente');
  assert.equal(tempZone(96), 'hervida');
  assert.equal(pavaItemId(60), 'pava_fria');
  assert.equal(pavaItemId(80), 'pava_caliente');
  assert.equal(pavaItemId(90), 'pava_caliente');
  assert.equal(pavaItemId(99), 'pava_hervida');
});

test('agarrar la pava devuelve el item según la temperatura', () => {
  const pava = createPava();
  startHeating(pava, 'cocina');
  heat(pava, HEAT_SECONDS * 0.8);            // 80 grados: ideal
  const id = takePava(pava);
  assert.equal(id, 'pava_caliente');
  assert.equal(pava.heating, false);
  assert.equal(pava.station, null);
  assert.equal(pava.temp, 80);               // conserva el calor para enfriarse
});

test('la pava se enfría en 90 s y no se enfría al fuego', () => {
  const pava = createPava();
  pava.temp = 100;
  coolPava(pava, COOL_SECONDS / 2);
  assert.equal(pava.temp, 50);
  startHeating(pava, 'calentador');
  coolPava(pava, COOL_SECONDS);
  assert.equal(pava.temp, 50);
  pava.heating = false;
  coolPava(pava, COOL_SECONDS);
  assert.equal(pava.temp, 0);
});

test('el termómetro dibuja la barra y la zona verde', () => {
  const ctx = fakeCtx();
  drawThermometer(ctx, 10, 10, 80);
  assert.ok(ctx.ops.length > 0);
  const styles = ctx.ops.filter((op) => op[0] === 'fillRect').map((op) => op[1]);
  assert.ok(styles.includes('#2f7a4a'));   // columna verde en la zona ideal
  const hot = fakeCtx();
  drawThermometer(hot, 10, 10, 100);
  assert.ok(hot.ops.some((op) => op[1] === '#a83a34')); // hervida: roja
});
