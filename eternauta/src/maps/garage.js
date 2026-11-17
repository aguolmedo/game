// Garaje-esclusa de los Salvo, segun art/concept/garage.py: por aca sale Juan
// con el traje casero. 18x11 tiles = 288x176 px.
//
// Paredes de ladrillo al fondo y a los costados, piso de baldosas claras.
// Al fondo la puerta de dos hojas a la calle con el extractor arriba, los
// estantes, el electrogeno de Favalli con su bidon y la lamparita colgando;
// a la izquierda el banco donde se arma el traje y la puerta a la casa.
import { makeGrid } from './grid.js';

export const COLS = 18;
export const ROWS = 11;

// Tamaños de los sprites (frames de objects/interior2).
const SIZE = {
  garage_shelf: [48, 32], hose: [16, 16], double_door: [40, 38], extractor: [16, 20],
  crate: [16, 16], box: [16, 16], generator: [28, 24], bidon: [10, 13],
  bulb: [8, 22], bench_suit: [48, 32], stool: [12, 14], tire: [16, 16],
  broom_bucket: [16, 26], coat_stand: [16, 40], door: [16, 32],
};

// Igual que en house.js: el sprite se ubica por su esquina inferior izquierda.
function put(id, sprite, left, base, extra = {}) {
  const [w, h] = SIZE[sprite];
  const tw = Math.max(1, Math.round(w / 16));
  const th = Math.max(1, Math.round(h / 16));
  const x = Math.round((left + w / 2) / 16 - tw / 2);
  const y = Math.round(base / 16) - th;
  const ox = Math.round(left + w / 2 - (x + tw / 2) * 16);
  const oy = Math.round(base - (y + th) * 16);
  return { id, sprite, x, y, tw, th, offset: [ox, oy], ...extra };
}

/** Slots en coords locales del sprite, pasados a coords de la caja del objeto. */
function slots(sprite, obj, local, maxItems) {
  const dy = obj.th * 16 - SIZE[sprite][1];
  return { slots: local.map(([x, y]) => ({ x, y: y + dy })), maxItems };
}

// ---------------------------------------------------------------- piso
const floor = makeGrid(COLS, ROWS, (x, y) => {
  if (x === 0 || x === COLS - 1 || y === 0 || y === ROWS - 1) return 'black';
  if (y === 1) return `brick_${x % 2}`;
  if (y === 2) return `brickbase_${x % 2}`;
  return `tile_${(x + y) % 2}`;
});
for (let y = 1; y < ROWS - 1; y++) {
  floor[y][0] = 'plank_0';
  floor[y][COLS - 1] = 'plank_1';
}

// ---------------------------------------------------------------- muebles
const objects = [];

// Puerta interior a la casa (en la pared del fondo, a la izquierda).
objects.push(put('door_home', 'door', 80, 48, {
  interact: { kind: 'look', talk: 'door_home', label: 'Volver a la casa' },
}));

// Pared del fondo: estantes, manguera, la puerta a la calle con el extractor.
const shelfL = put('garage_shelf', 'garage_shelf', 16, 64, {
  solid: { x: 0, y: 1, w: 3, h: 1 },
  interact: { kind: 'look', talk: 'shelf', label: 'Mirar el estante' },
});
shelfL.surface = slots('garage_shelf', shelfL, [[6, 10], [18, 10], [30, 10], [6, 22], [18, 22], [30, 22]], 6);
objects.push(shelfL);
objects.push(put('hose', 'hose', 66, 42, {}));
const outerDoor = put('garage_door', 'double_door', 112, 51, {});
outerDoor.interact = { kind: 'look', talk: 'garage_door', label: 'Salir a la calle' };
objects.push(outerDoor);
objects.push(put('extractor', 'extractor', 124, 20, {
  station: 'extractor',
  // Esta en lo alto de la pared: se usa desde el piso, frente a la puerta.
  reach: 56,
  interact: { kind: 'look', talk: 'extractor', label: 'Mirar el extractor' },
}));
const shelfR = put('garage_shelf_r', 'garage_shelf', 180, 64, {
  solid: { x: 0, y: 1, w: 3, h: 1 },
  interact: { kind: 'look', talk: 'shelf', label: 'Mirar el estante' },
});
objects.push(shelfR);
objects.push(put('garage_crate', 'crate', 256, 64, { solid: true }));
objects.push(put('garage_box', 'box', 256, 82, { solid: false }));

// El electrogeno de Favalli con su bidon; la lamparita colgando del cable.
const gen = put('generator', 'generator', 208, 112, {
  solid: { x: 0, y: 1, w: 2, h: 1 },
  interact: { kind: 'use', talk: 'generator', label: 'Usar el electrógeno' },
});
objects.push(gen);
const can = put('bidon', 'bidon', 256, 112, {
  solid: true,
  interact: { kind: 'look', talk: 'bidon', label: 'Mirar el bidón' },
});
can.surface = slots('bidon', can, [[5, 4]], 1);
objects.push(can);
objects.push(put('bulb', 'bulb', 146, 80, { glow: true }));

// El banco del traje, el banquito y las cajas.
const bench = put('bench_suit', 'bench_suit', 16, 128, {
  solid: { x: 0, y: 1, w: 3, h: 1 },
  station: 'craft',
  interact: { kind: 'look', talk: 'bench_suit', label: 'Mirar el banco' },
});
bench.surface = slots('bench_suit', bench, [[8, 12], [20, 12], [32, 12]], 3);
objects.push(bench);
objects.push(put('stool', 'stool', 68, 144, {}));
objects.push(put('garage_cardboard', 'box', 16, 160, { solid: true }));
objects.push(put('garage_box2', 'box', 34, 160, { solid: true, offset: [2, 0] }));

// El neumatico, el balde con la escoba y las manchas de aceite.
objects.push(put('tire', 'tire', 176, 160, { solid: true }));
objects.push(put('broom', 'broom_bucket', 240, 160, { solid: { x: 0, y: 1, w: 1, h: 1 } }));
// El traje colgado de un clavo, junto a la puerta (decorativo hasta fabricarlo).
objects.push(put('suit_hanging', 'coat_stand', 156, 106, { offset: [-4, -6] }));

export const garage = {
  id: 'garage',
  name: 'Garaje',
  cols: COLS,
  rows: ROWS,
  floor,
  solidTiles: ['black', 'brick_', 'brickbase_', 'plank_'],
  spawn: { x: 5 * 16 + 8, y: 4 * 16 + 8, dir: 'down' },
  bounds: { minX: 16 + 4, maxX: (COLS - 1) * 16 - 6, minFeet: 3 * 16 + 6, maxFeet: 10 * 16 - 3 },
  objects,
  surfaces: objects.filter((o) => o.surface).map((o) => ({
    id: o.id, sprite: o.sprite, slots: o.surface.slots, maxItems: o.surface.maxItems,
  })),
  lights: [
    // la unica luz electrica de la casa: prende con el electrogeno
    { x: 150, y: 76, radius: 110, color: '#ffe9b8', kind: 'bulb',
      flicker: 0.25, state: 'off', onlyIn: null },
    // la rendija de la puerta: la nieve de afuera brilla
    { x: 136, y: 52, radius: 44, color: '#96e1f0', kind: 'snow',
      flicker: 0.04, state: 'on', onlyIn: null },
  ],
  windows: [],
  npcs: [],
  pickups: [],
  warps: [
    // puerta interior: vuelve a la casa, al lado del porton del garaje
    { id: 'door_home', x: 5 * 16, y: 3 * 16, w: 16, h: 16, to: 'house', label: 'Entrar',
      spawn: { x: 23 * 16 + 8, y: 4 * 16 + 8, dir: 'down' } },
    // la puerta de dos hojas: recien se puede cruzar con el traje y todo listo
    { id: 'garage_door', x: 7 * 16, y: 3 * 16, w: 48, h: 16, to: 'street', label: 'Salir',
      needsSuit: true, needsFlag: 'listo_para_salir',
      spawn: { x: 4 * 16 + 8, y: 12 * 16 + 8, dir: 'down' } },
  ],
};

export default garage;
