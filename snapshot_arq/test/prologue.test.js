import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DialogBox } from '../src/dialog.js';
import { objectHeadFor } from '../src/data/portraits.js';
import {
  GAG, QUEJAS, RESPUESTAS, LLEGADA_TIMES, BLINK_TIME, CUT_TIME,
  prologueTimeline, prologueDialog, createPrologueState, stepPrologue, prologueStep,
} from '../src/scenes/prologue.js';

const file = (name) => new URL(`../public/assets/${name}`, import.meta.url);
const read = (name) => JSON.parse(fs.readFileSync(file(name), 'utf8'));

function pngSize(name) {
  const b = fs.readFileSync(file(name));
  assert.equal(b.toString('latin1', 1, 4), 'PNG', `${name} no es un PNG`);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

test('prólogo intro: orden de fases y tiempos de la llegada', () => {
  const timeline = prologueTimeline('intro');
  // La llegada va primero, después el corte, el cuarto y el diálogo.
  const order = [...new Set(timeline.map((s) => s.phase))];
  assert.deepEqual(order, ['arrival', 'blink', 'cut', 'room', 'dialog']);
  const arrivals = timeline.filter((s) => s.phase === 'arrival');
  assert.equal(arrivals.length, 7);
  assert.deepEqual(arrivals.map((s) => s.frame), [0, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual(arrivals.map((s) => s.dur), LLEGADA_TIMES);
  assert.equal(timeline.filter((s) => s.phase === 'blink').length, 6);
  for (const blink of timeline.filter((s) => s.phase === 'blink')) {
    assert.equal(blink.dur, BLINK_TIME);
  }
  assert.equal(timeline.find((s) => s.phase === 'cut').dur, CUT_TIME);
  assert.deepEqual(timeline.filter((s) => s.phase === 'room').map((s) => s.room),
    ['vacio', 'llegada', 'gag']);
  assert.equal(timeline.at(-1).phase, 'dialog');
});

test('prólogo: el reloj avanza de la llegada al corte y al cuarto', () => {
  const state = createPrologueState('intro');
  assert.equal(prologueStep(state).phase, 'arrival');
  assert.equal(prologueStep(state).frame, 0);
  stepPrologue(state, LLEGADA_TIMES[0]);
  assert.equal(prologueStep(state).phase, 'blink');
  stepPrologue(state, BLINK_TIME);
  assert.equal(prologueStep(state).phase, 'arrival');
  assert.equal(prologueStep(state).frame, 1);
  // Saltando el resto de la llegada se llega al corte.
  const rest = LLEGADA_TIMES.slice(1).reduce((a, b) => a + b, 0) + BLINK_TIME * 5;
  stepPrologue(state, rest);
  assert.equal(prologueStep(state).phase, 'cut');
  stepPrologue(state, CUT_TIME);
  assert.equal(prologueStep(state).phase, 'room');
  assert.equal(prologueStep(state).room, 'vacio');
  stepPrologue(state, 1.6);
  assert.equal(prologueStep(state).room, 'llegada');
  stepPrologue(state, 1.2);
  assert.equal(prologueStep(state).room, 'gag');
  stepPrologue(state, 0.4);
  assert.equal(prologueStep(state).phase, 'dialog');
});

test('prólogo: saltear va directo al final del modo', () => {
  const intro = createPrologueState('intro');
  stepPrologue(intro, 0, { skip: true });
  assert.equal(intro.done, true);
  assert.equal(intro.skipped, true);
  assert.equal(prologueStep(intro), null);
  assert.equal(intro.step, prologueTimeline('intro').length);

  const queja = createPrologueState('queja');
  stepPrologue(queja, 0.1);
  stepPrologue(queja, 0.1, { skip: true });
  assert.equal(queja.done, true);
  assert.equal(prologueStep(queja), null);
});

test('modo queja: directo al cuarto del gag con 2 entradas', () => {
  const timeline = prologueTimeline('queja');
  assert.equal(timeline[0].phase, 'room');
  assert.equal(timeline[0].room, 'gag');
  assert.equal(timeline.at(-1).phase, 'dialog');
  const entries = prologueDialog('queja', () => 0);
  assert.equal(entries.length, 2);
  assert.deepEqual(entries.map((e) => e.speaker), ['El Eternauta', 'Programador']);
  assert.deepEqual(entries[0].lines, [QUEJAS[0]]);
  assert.deepEqual(entries[1].lines, [RESPUESTAS[0]]);
});

test('los textos del gag son exactamente los del guion', () => {
  assert.deepEqual(GAG.map((e) => e.speaker), [
    'El Eternauta', 'Programador', 'El Eternauta', 'Programador', 'El Eternauta',
  ]);
  assert.deepEqual(GAG.map((e) => e.lines), [
    ['Llevo no sé cuántas veces la misma noche. Salgo a la calle, me matan los bichos y vuelvo al truco. Siempre el truco.'],
    ['Ah, sí... es que el juego todavía no tiene final.'],
    ['¿El qué?'],
    ['Te estoy programando. Esto es un roguelike.'],
    ['...¿Un qué?'],
  ]);
  assert.deepEqual(prologueDialog('intro').length, 5);
  // El modo intro no comparte las listas (cada escena puede tocar su copia).
  assert.notEqual(prologueDialog('intro')[0].lines, GAG[0].lines);
});

test('hay al menos 6 quejas y respuestas cortas, todas con texto', () => {
  assert.ok(QUEJAS.length >= 6);
  assert.ok(RESPUESTAS.length >= 1);
  for (const text of [...QUEJAS, ...RESPUESTAS]) {
    assert.equal(typeof text, 'string');
    assert.ok(text.length > 0);
  }
});

test('los retratos del viejo y el programador salen de objects.png', () => {
  const objects = read('objects.json');
  assert.equal(objectHeadFor('eternauta_viejo'), 'eternauta_viejo_abajo');
  assert.equal(objectHeadFor('programador'), 'programador_abajo');
  assert.equal(objectHeadFor('juan'), null);
  for (const frame of ['eternauta_viejo_abajo', 'programador_abajo']) {
    assert.ok(objects.frames[frame], `falta ${frame} en objects.json`);
    assert.deepEqual(objects.frames[frame].slice(2), [16, 32]);
  }

  const calls = [];
  const ctx = {
    fillStyle: '', imageSmoothingEnabled: true,
    fillRect: (...a) => calls.push(['fillRect', ...a]),
    drawImage: (...a) => calls.push(['drawImage', ...a]),
  };
  const box = new DialogBox({
    font: { glyphs: { ' ': ['######'] } },
    objects: { image: { width: 499, height: 285 } },
    objectsData: { frames: { programador_abajo: [248, 190, 16, 32] } },
  });
  box.drawPortrait(ctx, { portrait: 'programador', lines: [] }, 10, 10);
  assert.ok(calls.some((c) => c[0] === 'fillRect'), 'fondo oscuro del retrato');
  const draw = calls.find((c) => c[0] === 'drawImage');
  assert.ok(draw, 'dibujó la cabeza de objects');
  // recorte: cabeza = filas 0..15 del frame; destino: el cuadro de 64x64.
  assert.deepEqual(draw.slice(2), [248, 190, 16, 16, 10, 10, 64, 64]);
});

test('las imágenes del roguelike existen con su tamaño', () => {
  for (let i = 1; i <= 7; i++) {
    const name = `roguelike/llegada_${i}.png`;
    assert.ok(fs.existsSync(file(name)), `falta ${name}`);
    assert.deepEqual(pngSize(name), [64, 128]);
  }
  for (const name of ['roguelike/cuarto_vacio.png', 'roguelike/cuarto_llegada.png',
    'roguelike/cuarto_gag.png']) {
    assert.ok(fs.existsSync(file(name)), `falta ${name}`);
    assert.deepEqual(pngSize(name), [320, 180]);
  }
});
