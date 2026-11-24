// Genera src/maps/barrio/sizes.js a partir de los atlas de public/assets.
// Uso: node tools/gen_barrio_sizes.mjs
import fs from 'node:fs';

const ATLASES = ['objects', 'street2', 'houses', 'interior2'];
const inUrl = (name) => new URL(`../public/assets/${name}.json`, import.meta.url);
const OUT = new URL('../src/maps/barrio/sizes.js', import.meta.url);

const SIZE = {};
const ATLAS = {};

for (const atlas of ATLASES) {
  const { frames } = JSON.parse(fs.readFileSync(inUrl(atlas), 'utf8'));
  for (const [name, rect] of Object.entries(frames)) {
    if (name in SIZE) continue; // el primero en orden de ATLASES gana
    SIZE[name] = [rect[2], rect[3]];
    ATLAS[name] = atlas;
  }
}

const names = Object.keys(SIZE).sort();
const lines = [
  '// ARCHIVO GENERADO por tools/gen_barrio_sizes.mjs — no lo edites a mano.',
  'export const SIZE = {};',
  'export const ATLAS = {};',
  '',
  ...names.map((n) => `SIZE[${JSON.stringify(n)}] = [${SIZE[n][0]}, ${SIZE[n][1]}]; ATLAS[${JSON.stringify(n)}] = ${JSON.stringify(ATLAS[n])};`),
  '',
];

fs.mkdirSync(new URL('../src/maps/barrio/', import.meta.url), { recursive: true });
fs.writeFileSync(OUT, lines.join('\n'));

console.log(`sizes.js: ${names.length} sprites`);
