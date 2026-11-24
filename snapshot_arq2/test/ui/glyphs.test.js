import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTIONS, glyphName, promptWidth, GLYPH_GAP } from '../../src/glyphs.js';
import { measureText } from '../../src/font.js';

const ASSETS = {
  font: { glyphs: { ' ': ['######'] } },
  buttonsData: { frames: { mouse: [0, 0, 11, 13] } },
};

test('glyphName: joystick = A (Hacer), X (Manos), Y (Mochila)', () => {
  assert.equal(glyphName('pad', 'interact'), 'a');
  assert.equal(glyphName('pad', 'hands'), 'x');
  assert.equal(glyphName('pad', 'bag'), 'y');
  assert.equal(glyphName('pad', 'menu'), 'start');
  assert.equal(ACTIONS.use, undefined, 'Usar en mí se borró');
  assert.equal(ACTIONS.self, undefined);
  assert.equal(ACTIONS.look, undefined, 'Mirar se borró como botón');
});

test('glyphName: mouse + teclado usa click izq., click der., I y Esc', () => {
  assert.equal(glyphName('mouse', 'interact'), 'mouse');
  assert.equal(glyphName('mouse', 'hands'), 'mouse_r');
  assert.equal(glyphName('mouse', 'bag'), 'key_i');
  assert.equal(glyphName('mouse', 'back'), 'key_esc');
  assert.equal(glyphName('mouse', 'menu'), 'key_esc');
  assert.equal(glyphName('mouse', 'look'), null);
});

test('glyphName: no existe el dispositivo teclado; E/F/Q dejaron de ser verbos', () => {
  // Un valor viejo cae al glifo de teclado por compatibilidad del dibujo,
  // pero el juego ya no produce ese dispositivo.
  assert.equal(ACTIONS.interact.mouse, 'mouse');
  assert.notEqual(ACTIONS.interact.key, 'key_e');
  assert.equal(ACTIONS.interact.label, 'Hacer');
  assert.equal(glyphName('pad', 'nope'), null);
});

test('GLYPH_GAP: la etiqueta no queda pegada al glifo', () => {
  assert.equal(GLYPH_GAP, 5);
  assert.equal(
    promptWidth(ASSETS, 'mouse', 'interact', 'Hablar'),
    11 + GLYPH_GAP + measureText(ASSETS.font.glyphs, 'Hablar'),
  );
});

test('promptWidth: el hueco es mayor que el viejo 3 (separacion legible)', () => {
  const textW = measureText(ASSETS.font.glyphs, 'Hablar');
  const width = promptWidth(ASSETS, 'mouse', 'interact', 'Hablar');
  assert.ok(width > 11 + 3 + textW, `ancho ${width} deberia superar ${11 + 3 + textW}`);
});
