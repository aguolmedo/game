import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ASSETS = [
  'chars2.png', 'chars2.json',
  'portraits_dlg.png', 'portraits_dlg.json',
  'portraits_panel.png', 'portraits_panel.json',
  'houses.png', 'houses.json',
  'street2.png', 'street2.json',
  'interior2.png', 'interior2.json',
  'props.png', 'props.json',
  'cascarudos.png', 'cascarudos.json',
  'fx.png', 'fx.json',
  'views/attic_pan.png', 'views/attic_pan_dark.png', 'views/living.png',
];

const IDS = ['juan', 'juan_suit', 'juan_suit_rifle', 'favalli', 'lucas',
  'polsky', 'elena', 'martita', 'polsky_coat'];

const file = (name) => new URL(`../public/assets/${name}`, import.meta.url);
const read = (name) => JSON.parse(fs.readFileSync(file(name), 'utf8'));

function pngSize(name) {
  const b = fs.readFileSync(file(name));
  assert.equal(b.toString('latin1', 1, 4), 'PNG', `${name} no es un PNG`);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

test('assets nuevos: existen y no están vacíos', () => {
  for (const name of ASSETS) {
    assert.ok(fs.existsSync(file(name)), `falta public/assets/${name}`);
    assert.ok(fs.statSync(file(name)).size > 0, `public/assets/${name} está vacío`);
  }
});

test('chars2.json: celdas 16x32, 6+2 cuadros y bloques dentro de la hoja', () => {
  const data = read('chars2.json');
  // Contrato del motor: la grilla de personajes es 16x32 y 4 direcciones.
  assert.deepEqual(data.cell, { w: 16, h: 32 });
  assert.deepEqual(data.dirs, ['down', 'up', 'left', 'right']);
  // Cada fila de dirección tiene que alcanzar para caminata + quieto.
  assert.ok(Number.isInteger(data.cols) && data.cols > 0, 'cols');
  assert.equal(data.cols, data.walk.length + data.idle.length, 'cols = walk + idle');
  assert.equal(data.rows, data.dirs.length, 'rows = una por direccion');
  assert.deepEqual(data.walk, [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(data.idle, [6, 7]);
  assert.equal(data.times.length, data.walk.length, 'un tiempo por cuadro de caminata');
  for (const t of data.times) assert.ok(Number.isFinite(t) && t > 0, 'tiempo positivo');
  // El reparto está: todos los ids del juego tienen bloque.
  assert.deepEqual(data.ids, IDS);
  assert.equal(Object.keys(data.blocks).length, data.ids.length);
  const png = pngSize('chars2.png');
  const stride = data.cols * data.cell.w;
  assert.equal(png.h, data.dirs.length * data.cell.h, 'alto = una fila por direccion');
  assert.equal(png.w % data.cell.w, 0, 'la hoja se corta en celdas enteras');
  const blocks = Object.values(data.blocks);
  const xs = blocks.map((b) => b.x);
  assert.equal(new Set(xs).size, xs.length, 'dos bloques en la misma x');
  for (const [id, b] of Object.entries(data.blocks)) {
    assert.equal(b.y, 0, `${id} no arranca en la primera fila`);
    assert.equal(b.x % stride, 0, `${id} no cae en un bloque entero`);
    assert.ok(b.x >= 0 && b.x + stride <= png.w, `${id} se sale de la hoja`);
  }
  assert.ok(png.w >= Math.max(...xs) + stride, 'la hoja no contiene al ultimo bloque');
});

test('los JSON de frames tienen cajas válidas dentro de su atlas', () => {
  for (const [png, js] of [['houses.png', 'houses.json'],
    ['street2.png', 'street2.json'], ['interior2.png', 'interior2.json'],
    ['props.png', 'props.json'], ['cascarudos.png', 'cascarudos.json'],
    ['fx.png', 'fx.json']]) {
    const frames = read(js).frames;
    assert.ok(frames && Object.keys(frames).length > 0, `${js} sin frames`);
    const { w, h } = pngSize(png);
    for (const [name, box] of Object.entries(frames)) {
      assert.equal(box.length, 4, `${js}:${name} no es [x,y,w,h]`);
      const [x, y, fw, fh] = box;
      assert.ok(fw > 0 && fh > 0, `${js}:${name} con tamaño inválido`);
      assert.ok(x >= 0 && y >= 0 && x + fw <= w && y + fh <= h,
        `${js}:${name} se sale del atlas`);
    }
  }
});

test('props incluye los objetos del truco, la cocina y el laboratorio', () => {
  const frames = read('props.json').frames;
  for (const id of ['naipe_espada', 'naipe_oro', 'naipe_basto', 'naipe_basto_back',
    'anotador', 'sifon', 'vaso', 'botella', 'cenicero', 'mate', 'lata_roja',
    'lata_verde', 'frasco', 'frasco_marron', 'pan', 'pava', 'lampara_aceite',
    'lista', 'valvula', 'destornillador', 'pinza', 'tela', 'rollo',
    'dressed_truco', 'dressed_kitchen']) {
    assert.ok(frames[id], `falta props.${id}`);
  }
});

test('cascarudos: 3 tipos x 4 direcciones x 4 cuadros + golpe + muerte', () => {
  const frames = read('cascarudos.json').frames;
  for (const kind of ['cascarudo', 'veloz', 'acorazado']) {
    for (const dir of ['down', 'up', 'left', 'right']) {
      for (let k = 0; k < 4; k += 1) {
        assert.ok(frames[`${kind}:${dir}:${k}`], `falta ${kind}:${dir}:${k}`);
      }
    }
    assert.ok(frames[`${kind}:hit`], `falta ${kind}:hit`);
    for (let k = 0; k < 3; k += 1) {
      assert.ok(frames[`${kind}:death:${k}`], `falta ${kind}:death:${k}`);
    }
  }
});

test('retratos de diálogo y de panel tienen sus bloques', () => {
  const dlg = read('portraits_dlg.json');
  assert.deepEqual(dlg.cell, { w: 64, h: 64 });
  for (const id of ['juan', 'juan_suit', 'juan_rifle', 'favalli', 'lucas',
    'polsky', 'elena', 'martita']) {
    assert.ok(dlg.blocks[id], `falta el retrato ${id}`);
  }
  const panel = read('portraits_panel.json');
  assert.deepEqual(panel.cell, { w: 32, h: 32 });
  for (const id of ['juan', 'juan_suit', 'favalli', 'lucas', 'polsky',
    'elena', 'martita']) {
    assert.ok(panel.blocks[id], `falta el retrato de panel ${id}`);
  }
  const { w, h } = pngSize('portraits_dlg.png');
  for (const [id, b] of Object.entries(dlg.blocks)) {
    assert.ok(b.x >= 0 && b.y >= 0 && b.x + 64 <= w && b.y + 64 <= h,
      `${id} se sale del atlas de retratos`);
  }
});

test('vistas: panorama del altillo, versión apagón y living', () => {
  assert.deepEqual(pngSize('views/attic_pan.png'), { w: 960, h: 300 });
  assert.deepEqual(pngSize('views/attic_pan_dark.png'), { w: 960, h: 300 });
  const living = pngSize('views/living.png');
  assert.equal(living.w, 480);
  assert.equal(living.h, 270);
});
