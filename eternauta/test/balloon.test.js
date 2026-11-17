import test from 'node:test';
import assert from 'node:assert/strict';
import { BalloonLine } from '../src/comic.js';

const ASSETS = { font: { glyphs: { ' ': ['######'] } } };

test('globo: el click lo cierra y no queda reaccionando', () => {
  const balloon = new BalloonLine(ASSETS);
  balloon.show('Mirá esa luz', { x: 40, y: 40 });
  // Los primeros 0.2 s no aceptan input (evita cerrarlo sin querer al abrirlo).
  assert.equal(balloon.update(0.1, { click: { x: 1, y: 1 } }), null);
  assert.equal(balloon.open, true);
  // El click que lo cierra devuelve 'closed': world.js corta el frame ahi.
  assert.equal(balloon.update(0.2, { click: { x: 1, y: 1 } }), 'closed');
  assert.equal(balloon.open, false);
  // Segundo click: el globo ya no consume nada.
  assert.equal(balloon.update(0.2, { click: { x: 1, y: 1 } }), null);
});

test('globo: A y B tambien lo cierran', () => {
  for (const input of [{ aPressed: true }, { bPressed: true }]) {
    const balloon = new BalloonLine(ASSETS);
    balloon.show('Hola', { x: 0, y: 0 });
    assert.equal(balloon.update(0.25, input), 'closed');
    assert.equal(balloon.open, false);
  }
});
