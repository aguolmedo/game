import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTIONS, glyphName, promptWidth, GLYPH_GAP } from '../src/glyphs.js';
import { measureText } from '../src/font.js';

const ASSETS = {
  font: { glyphs: { ' ': ['######'] } },
  buttonsData: { frames: { mouse: [0, 0, 11, 13] } },
};

test('glyphName: con joystick se ven A y B', () => {
  assert.equal(glyphName('pad', 'interact'), 'a');
  assert.equal(glyphName('pad', 'back'), 'b');
  assert.equal(glyphName('pad', 'use'), 'x');
  assert.equal(glyphName('pad', 'bag'), 'y');
});

test('glyphName: mouse y teclado muestran el mouse para interactuar/volver', () => {
  for (const device of ['mouse', 'keyboard']) {
    assert.equal(glyphName(device, 'interact'), 'mouse');
    assert.equal(glyphName(device, 'back'), 'mouse');
  }
});

test('glyphName: los demas atajos conservan su glifo de teclado', () => {
  assert.equal(glyphName('keyboard', 'use'), 'key_f');
  assert.equal(glyphName('keyboard', 'bag'), 'key_i');
  assert.equal(glyphName('mouse', 'use'), 'mouse');
  assert.equal(glyphName('mouse', 'bag'), 'mouse');
  assert.equal(glyphName('keyboard', 'menu'), 'key_esc');
  assert.equal(glyphName('pad', 'menu'), 'start');
});

test('glyphName: interact y back nunca devuelven el glifo E', () => {
  for (const device of ['pad', 'mouse', 'keyboard', undefined]) {
    assert.notEqual(glyphName(device, 'interact'), 'key_e');
    assert.notEqual(glyphName(device, 'back'), 'key_e');
  }
  assert.notEqual(ACTIONS.interact.key, 'key_e');
  assert.notEqual(ACTIONS.back.key, 'key_e');
});

test('glyphName: accion desconocida devuelve null', () => {
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
