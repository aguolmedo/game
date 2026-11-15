import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ASSETS = [
  'title.png', 'tiles.png', 'tiles.json', 'objects.png', 'objects.json',
  'buttons.png', 'buttons.json', 'chars.png', 'chars.json',
  'portraits.png', 'portraits.json', 'items.png', 'items.json',
  'font.json', 'snow.png', 'shadow.png', 'footprint.png', 'manifest.json',
];

const read = (name) => JSON.parse(
  fs.readFileSync(new URL(`../public/assets/${name}`, import.meta.url), 'utf8'),
);

test('todos los assets que carga el juego existen', () => {
  for (const name of ASSETS) {
    const url = new URL(`../public/assets/${name}`, import.meta.url);
    assert.ok(fs.existsSync(url), `falta public/assets/${name}`);
    assert.ok(fs.statSync(url).size > 0, `public/assets/${name} está vacío`);
  }
});

test('manifest.json lista todos los assets', () => {
  const manifest = read('manifest.json');
  assert.deepEqual([...manifest.assets].sort(), [...ASSETS].sort());
});

test('chars.json describe 4 direcciones x (4 pasos + 2 idle)', () => {
  const chars = read('chars.json');
  assert.deepEqual(chars.cell, { w: 16, h: 32 });
  assert.deepEqual(chars.walkFrames, [0, 1, 2, 3]);
  assert.deepEqual(chars.idleFrames, [4, 5]);
  assert.deepEqual(chars.dirs, ['down', 'up', 'left', 'right']);
  for (const name of ['juan', 'juan_suit', 'favalli', 'lucas', 'polsky']) {
    const block = chars.blocks[name];
    assert.ok(block, `falta el bloque ${name}`);
    assert.equal(block.w, 16 * chars.cols);
    assert.equal(block.h, 32 * chars.rows);
  }
});

test('items.json tiene un icono 16x16 para cada item del juego', () => {
  const items = read('items.json');
  assert.equal(items.cell.w, 16);
  for (const id of ['tela', 'guantes', 'botas', 'casco', 'tiras', 'oxigeno',
    'traje', 'rifle']) {
    assert.ok(items.frames[id], `falta el icono de ${id}`);
  }
});

test('tiles/objects/buttons declaran frames con cajas válidas', () => {
  const tiles = read('tiles.json');
  for (const [name, f] of Object.entries(tiles.frames)) {
    assert.equal(f[2], 16, `${name} no mide 16 de ancho`);
    assert.equal(f[3], 16, `${name} no mide 16 de alto`);
  }
  const objects = read('objects.json');
  for (const [name, f] of Object.entries(objects.frames)) {
    assert.ok(f[2] > 0 && f[3] > 0, `caja inválida en ${name}`);
  }
  const buttons = read('buttons.json');
  for (const size of ['a', 'b', 'x', 'y', 'lb', 'rb', 'start', 'dpad', 'stick',
    'a_l', 'b_l', 'x_l', 'y_l', 'key_e', 'key_f', 'key_i', 'key_esc']) {
    assert.ok(buttons.frames[size], `falta el glifo ${size}`);
  }
});

test('font.json cubre letras, acentos y signos del castellano', () => {
  const font = read('font.json');
  assert.ok(Object.keys(font.glyphs).length >= 85);
  for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ÁÉÍÓÚÑáéíóúñü¿¡«»—…') {
    assert.ok(font.glyphs[ch], `glifo faltante '${ch}'`);
  }
});

test('los PNG tienen las dimensiones esperadas (cabecera IHDR)', () => {
  const size = (name) => {
    const buf = fs.readFileSync(new URL(`../public/assets/${name}`, import.meta.url));
    assert.equal(buf.toString('ascii', 1, 4), 'PNG');
    return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
  };
  assert.deepEqual(size('title.png'), [512, 286]);   // fondo con bleed para el parallax
  assert.deepEqual(size('chars.png'), [672, 128]);
  assert.deepEqual(size('portraits.png'), [224, 32]);
  assert.equal(size('items.png')[0], 128);   // el alto crece al sumar iconos
  assert.deepEqual(size('shadow.png'), [16, 6]);
  assert.deepEqual(size('snow.png'), [3, 3]);
  assert.deepEqual(size('footprint.png'), [6, 3]);
  assert.equal(size('tiles.png')[0], 512);
  assert.equal(size('objects.png')[0], 512);
  assert.deepEqual(size('buttons.png'), [256, 68]);
});
