import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// --- sheets.test.js
{
const ASSETS = [
  'title.png', 'tiles.png', 'tiles.json', 'objects.png', 'objects.json',
  'buttons.png', 'buttons.json', 'chars.png', 'chars.json',
  'portraits.png', 'portraits.json', 'items.png', 'items.json',
  'font.json', 'snow.png', 'shadow.png', 'footprint.png',
  'cursor.png', 'cursor.json', 'manifest.json',
];

const read = (name) => JSON.parse(
  fs.readFileSync(new URL(`../../public/assets/${name}`, import.meta.url), 'utf8'),
);

test('todos los assets que carga el juego existen', () => {
  for (const name of ASSETS) {
    const url = new URL(`../../public/assets/${name}`, import.meta.url);
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

test('cursor.json tiene las cuatro formas del puntero', () => {
  const cursor = read('cursor.json');
  assert.ok(cursor.w > 0 && cursor.h > 0);
  for (const name of ['arrow', 'hand', 'hand_press', 'hand_far']) {
    assert.ok(cursor.frames[name], `falta el frame ${name}`);
    assert.ok(cursor.hotspots[name], `falta el hotspot ${name}`);
  }
  const buttons = read('buttons.json');
  assert.ok(buttons.frames.mouse, 'falta el glifo mouse para los prompts');
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
    const buf = fs.readFileSync(new URL(`../../public/assets/${name}`, import.meta.url));
    assert.equal(buf.toString('ascii', 1, 4), 'PNG');
    return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
  };
  assert.deepEqual(size('title.png'), [512, 286]);   // fondo con bleed para el parallax
  // Las hojas de sprites se verifican contra su JSON: el ancho puede crecer
  // cuando se agrega un personaje o un retrato, lo que no puede pasar es que
  // un bloque quede afuera de la hoja.
  const chars = read('chars.json');
  const [charsW, charsH] = size('chars.png');
  for (const [name, block] of Object.entries(chars.blocks)) {
    assert.ok(block.x >= 0 && block.y >= 0
      && block.x + block.w <= charsW && block.y + block.h <= charsH,
      `${name} se sale de chars.png`);
  }
  const portraits = read('portraits.json');
  assert.deepEqual(size('portraits.png'),
    [portraits.order.length * portraits.cell.w, portraits.cell.h]);
  assert.ok(size('items.png')[0] <= 256);   // se reempaqueta al sumar íconos (frames por nombre)
  assert.deepEqual(size('shadow.png'), [16, 6]);
  assert.deepEqual(size('snow.png'), [3, 3]);
  assert.deepEqual(size('footprint.png'), [6, 3]);
  assert.ok(size('tiles.png')[0] <= 512 && size('tiles.png')[0] >= 256);   // se reempaqueta al sumar baldosas
  assert.ok(size('objects.png')[0] <= 500 && size('objects.png')[0] >= 256); // idem objetos
  assert.deepEqual(size('buttons.png'), [254, 64]);
});
}

// --- sheets_more.test.js
{
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

const file = (name) => new URL(`../../public/assets/${name}`, import.meta.url);
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
}
