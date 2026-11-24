import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const asset = (name) => new URL(`../public/assets/${name}`, import.meta.url);
const readJson = (name) => JSON.parse(fs.readFileSync(asset(name), 'utf8'));

test('la viñeta de muerte existe y coincide con su JSON', () => {
  const png = asset('death_panel.png');
  assert.ok(fs.existsSync(png), 'falta public/assets/death_panel.png');
  const buf = fs.readFileSync(png);
  assert.ok(buf.length > 100, 'death_panel.png está vacío');
  assert.equal(buf.toString('ascii', 1, 4), 'PNG');
  // IHDR: ancho y alto big-endian a partir del byte 16. El tamaño manda el
  // JSON que lee el código; el PNG tiene que coincidir con él.
  assert.deepEqual([buf.readUInt32BE(16), buf.readUInt32BE(20)],
    readJson('death_panel.json').size);
});

test('death_panel.json describe el tamaño y los copos animados', () => {
  const data = readJson('death_panel.json');
  assert.deepEqual(data.size, [350, 160]);
  assert.equal(data.image, 'death_panel.png');
  assert.ok(Array.isArray(data.flakes) && data.flakes.length >= 40);
  for (const flake of data.flakes) {
    assert.equal(flake.length, 6, 'copo con 6 campos');
    for (const n of flake) assert.ok(Number.isFinite(n), 'copo numérico');
  }
});
