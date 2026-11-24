// La caminata de chars2.png tiene que verse: los pies se mueven de verdad y la
// cabeza del traje solo se desplaza (nunca cambia de forma).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';

const file = (name) => new URL(`../../public/assets/${name}`, import.meta.url);
const data = JSON.parse(fs.readFileSync(file('chars2.json'), 'utf8'));

/** Decodifica un PNG RGBA 8 bits sin filtros raros (el que escribe PIL). */
function decodePng(buf) {
  assert.equal(buf.toString('latin1', 1, 4), 'PNG', 'no es un PNG');
  let pos = 8;
  let w = 0; let h = 0; let colorType = 0; let depth = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('latin1', pos + 4, pos + 8);
    const body = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      w = body.readUInt32BE(0); h = body.readUInt32BE(4);
      depth = body[8]; colorType = body[9];
      assert.equal(body[12], 0, 'PNG entrelazado');
    } else if (type === 'IDAT') idat.push(body);
    pos += 12 + len;
  }
  assert.equal(depth, 8, 'PNG de 8 bits');
  assert.equal(colorType, 6, 'PNG RGBA');
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = 4;
  const stride = w * bpp;
  const out = Buffer.alloc(w * h * bpp);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = Buffer.alloc(stride);
    for (let i = 0; i < stride; i += 1) {
      const a = i >= bpp ? cur[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a); const pb = Math.abs(p - b); const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[i] = v & 255;
    }
    cur.copy(out, y * stride);
    prev = cur;
  }
  return { w, h, px: (x, y) => out.subarray((y * w + x) * bpp, (y * w + x) * bpp + 4) };
}

const sheet = decodePng(fs.readFileSync(file('chars2.png')));
const block = (id) => data.blocks[id].x;
const dirRow = (dir) => data.dirs.indexOf(dir) * data.cell.h;
const cellXY = (id, dir, k) => [block(id) + k * data.cell.w, dirRow(dir)];
const same = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];

/** Pixeles distintos entre dos cuadros, opcionalmente en una franja de filas. */
function diff(id, dir, k0, k1, y0 = 0, y1 = 31) {
  const [ax, ay] = cellXY(id, dir, k0);
  const [bx, by] = cellXY(id, dir, k1);
  let n = 0;
  for (let y = y0; y <= y1; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      if (!same(sheet.px(ax + x, ay + y), sheet.px(bx + x, by + y))) n += 1;
    }
  }
  return n;
}

test('el atlas tiene el tamaño que dice el json', () => {
  assert.equal(sheet.w, Object.keys(data.blocks).length * data.cols * data.cell.w);
  assert.equal(sheet.h, data.dirs.length * data.cell.h);
});

test('de perfil los pies se mueven (no patina)', () => {
  for (const id of data.ids) {
    for (const dir of ['left', 'right']) {
      const feet = diff(id, dir, 0, 3, 22, 31);
      assert.ok(feet >= 10, `${id}/${dir}: el paso casi no cambia los pies (${feet} px)`);
    }
  }
});

test('de frente y de espalda los pies alternan', () => {
  for (const id of data.ids) {
    for (const dir of ['down', 'up']) {
      const feet = diff(id, dir, 0, 3, 22, 31);
      assert.ok(feet >= 6, `${id}/${dir}: los pies casi no alternan (${feet} px)`);
    }
  }
});

test('ningun cuadro de caminata repite al anterior', () => {
  for (const id of data.ids) {
    for (const dir of data.dirs) {
      for (let k = 0; k < 5; k += 1) {
        const d = diff(id, dir, k, k + 1);
        assert.ok(d >= 4, `${id}/${dir}: cuadro ${k} y ${k + 1} son casi iguales`);
      }
    }
  }
});

test('el traje: la cabeza solo se desplaza con el cabeceo', () => {
  const bob = [0, 1, 1, 0, 1, 1];                 // el mismo de walk.py / BOB
  for (const id of ['juan_suit', 'juan_suit_rifle']) {
    for (const dir of data.dirs) {
      for (const k of [1, 2, 4, 5]) {
        const [ax, ay] = cellXY(id, dir, 0);
        const [bx, by] = cellXY(id, dir, k);
        let bad = 0;
        for (let y = 2; y <= 13; y += 1) {
          for (let x = 0; x < 16; x += 1) {
            // el cuadro k es el 0 bajado bob[k] px
            const a = sheet.px(ax + x, ay + y - bob[k]);
            const b = sheet.px(bx + x, by + y);
            if (!same(a, b)) bad += 1;
          }
        }
        assert.ok(bad <= 2, `${id}/${dir}: la cabeza cambia de forma en el cuadro ${k} (${bad} px)`);
      }
    }
  }
});

test('el traje mira al frente: la visera esta a la altura de los ojos', () => {
  // La visera es la mancha oscura de la capucha (marco + vidrio). Se mide
  // lejos del borde de la capucha y del filtro de la boca.
  for (const k of [0, 6]) {
    const [bx, by] = cellXY('juan_suit', 'down', k);
    let top = 99; let bottom = -1; let left = 99; let right = -1; let n = 0;
    for (let y = 4; y <= 12; y += 1) {
      for (let x = 3; x <= 12; x += 1) {
        const c = sheet.px(bx + x, by + y);
        if (c[3] === 0 || c[0] + c[1] + c[2] >= 300) continue;
        n += 1;
        top = Math.min(top, y); bottom = Math.max(bottom, y);
        left = Math.min(left, x); right = Math.max(right, x);
      }
    }
    assert.ok(n >= 25, `no encontre la visera (${n} px oscuros)`);
    const cy = (top + bottom) / 2;
    assert.ok(cy >= 8.5 && cy <= 11, `la visera quedo alta o baja (centro y=${cy})`);
    assert.ok(right - left >= 8, 'la visera tiene que ser ancha (elipse horizontal)');
    assert.ok(bottom - top >= 4, 'la visera tiene que tener altura');
  }
});

test('el reposo del traje respira 1 px', () => {
  for (const id of ['juan_suit', 'juan_suit_rifle']) {
    for (const dir of data.dirs) {
      const [ax, ay] = cellXY(id, dir, 6);
      const [bx, by] = cellXY(id, dir, 7);
      let bad = 0;
      for (let y = 0; y <= 26; y += 1) {           // el cuadro 7 es el 6 un px abajo
        for (let x = 0; x < 16; x += 1) {
          if (!same(sheet.px(ax + x, ay + y), sheet.px(bx + x, by + y + 1))) bad += 1;
        }
      }
      assert.ok(bad <= 4, `${id}/${dir}: el reposo no es una respiracion de 1 px (${bad} px)`);
    }
  }
});
