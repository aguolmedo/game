// Garaje-esclusa de los Salvo, segun art/concept/garage.py: por aca sale Juan
// con el traje casero. 18x11 tiles = 288x176 px.
//
// Paredes de ladrillo al fondo y a los costados, piso de baldosas claras.
// Al fondo la puerta de dos hojas a la calle con el extractor arriba, los
// estantes, el electrogeno de Favalli con su bidon y la lamparita colgando;
// a la izquierda el banco donde se arma el traje y la puerta a la casa.
import { makeGrid } from './grid.js';
import { placer, slotPlacer } from './place.js';
import { depthFor } from '../sprite.js';

export const COLS = 18;
export const ROWS = 11;

// Tamaños de los sprites (frames de objects/interior2).
const SIZE = {
  garage_shelf: [48, 32], hose: [16, 16], double_door: [40, 38], extractor: [16, 20],
  crate: [16, 16], box: [16, 16], generator: [28, 24], bidon: [10, 13],
  bulb: [8, 22], bench_suit: [48, 32], stool: [12, 14], tire: [16, 16],
  broom_bucket: [16, 26], coat_stand: [16, 40], door: [16, 32], oil_lamp_lit: [10, 14],
  radio: [16, 16],
};

const put = placer(SIZE);

/** Slots en coords locales del sprite, pasados a coords de la caja del objeto. */
const slots = slotPlacer(SIZE);

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
// La puerta es un paso (`warp` door_home); el sprite queda de decorado.
objects.push(put('door_home', 'door', 80, 48, {}));

// Pared del fondo: estantes, manguera, la puerta a la calle con el extractor.
const shelfL = put('garage_shelf', 'garage_shelf', 16, 64, {
  solid: { x: 0, y: 1, w: 3, h: 1 },
});
shelfL.surface = slots('garage_shelf', shelfL, [[6, 10], [18, 10], [30, 10], [6, 22], [18, 22], [30, 22]], 6);
shelfL.type = 'surface';
shelfL.name = 'el estante';
shelfL.talk = 'shelf';
objects.push(shelfL);
objects.push(put('hose', 'hose', 66, 42, {}));
// La salida a la calle la maneja el warp `garage_door` (paso con traje).
objects.push(put('garage_door', 'double_door', 112, 51, {}));
objects.push(put('extractor', 'extractor', 124, 20, {
  station: 'extractor',
  // Cuelga de la pared: se alcanza desde el piso frente a la puerta (regla
  // única de casilleros de acceso, sin alcances por objeto).
  type: 'device', name: 'el extractor', talk: 'extractor',
  device: {
    state: (g) => (g.flags?.extractor_ok ? 'instalado' : 'libre'),
    states: {
      libre: { verb: 'Mirar', action: 'look' },
      instalado: { verb: 'Mirar', action: 'look' },
    },
  },
}));
const shelfR = put('garage_shelf_r', 'garage_shelf', 180, 64, {
  solid: { x: 0, y: 1, w: 3, h: 1 },
  type: 'decor', name: 'el estante', talk: 'shelf',
});
objects.push(shelfR);
objects.push(put('garage_crate', 'crate', 256, 64, { solid: true, movable: true, type: 'decor', name: 'el cajón', talk: 'crate' }));
objects.push(put('garage_box', 'box', 256, 82, { solid: false, movable: true, type: 'decor', name: 'la caja', talk: 'box' }));

// La radio de Lucas, sobre las cajas de la derecha (modo base). En la historia
// no tiene verbo propio: se mira. En la base, Lucas la hace sonar.
objects.push(put('base_radio', 'radio', 262, 80, {
  type: 'device', name: 'la radio', talk: 'radio', showIfFlag: 'base',
  device: {
    state: () => 'apagada',
    states: { apagada: { verb: 'Mirar', action: 'look' } },
  },
  baseAction: { kind: 'radio', label: 'Escuchar la radio' },
}));

// El electrogeno de Favalli con su bidon; la lamparita colgando del cable.
const gen = put('generator', 'generator', 208, 112, {
  solid: { x: 0, y: 1, w: 2, h: 1 },
  type: 'device', name: 'el electrógeno', talk: 'generator',
  baseAction: { kind: 'taller', station: 'luz', label: 'Mejoras' },
  device: {
    state: (g) => (g.flags?.electrogeno_on ? 'encendido' : 'seco'),
    states: {
      seco: { verb: 'Mirar', action: 'look' },
      encendido: { verb: 'Mirar', action: 'look' },
    },
  },
});
objects.push(gen);
const can = put('bidon', 'bidon', 256, 112, {
  solid: true,
  type: 'surface', name: 'el bidón', talk: 'bidon',
});
can.surface = slots('bidon', can, [[5, 4]], 1);
objects.push(can);
objects.push(put('bulb', 'bulb', 146, 80, { glow: true }));

// El banco del traje, el banquito y las cajas.
const bench = put('bench_suit', 'bench_suit', 16, 128, {
  solid: { x: 0, y: 1, w: 3, h: 1 }, low: true,
  station: 'craft',
  type: 'surface', name: 'el banco', talk: 'bench_suit',
});
bench.surface = slots('bench_suit', bench, [[8, 12], [20, 12], [32, 12]], 3);
objects.push(bench);
// La lámpara de aceite sobre la tabla del banco, a la izquierda: en el apagón
// es la única luz cálida hasta que arranca el electrógeno. Sin `glow`: el piso
// de baldosas claras ya recibe el charco cuantizado del pase de luz.
objects.push(put('oil_lamp_bench', 'oil_lamp_lit', 19, 105, {
  showIfFlag: 'apagon', z: depthFor(128) + 0.02,
}));
objects.push(put('stool', 'stool', 68, 144, { low: true, movable: true, type: 'decor', name: 'el banquito' }));
objects.push(put('garage_cardboard', 'box', 16, 160, { solid: true, movable: true, type: 'decor', name: 'la caja', talk: 'box' }));
objects.push(put('garage_box2', 'box', 34, 160, { solid: true, offset: [2, 0], movable: true, type: 'decor', name: 'la caja', talk: 'box' }));

// El neumatico, el balde con la escoba y las manchas de aceite.
objects.push(put('tire', 'tire', 176, 160, { solid: true, movable: true, type: 'decor', name: 'la rueda' }));
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
  // Las estaciones de la base: solo aparecen con `flags.base` (Continuar).
  npcs: [
    {
      id: 'favalli', who: 'favalli', type: 'person', name: 'Favalli',
      x: 56, feet: 120, dir: 'down', showIfFlag: 'base',
      baseAction: { kind: 'taller', station: 'favalli', label: 'Mejoras' },
    },
    {
      id: 'elena', who: 'elena', type: 'person', name: 'Elena',
      x: 184, feet: 120, dir: 'down', showIfFlag: 'base',
      baseAction: { kind: 'taller', station: 'elena', label: 'Mejoras' },
    },
    {
      id: 'lucas', who: 'lucas', type: 'person', name: 'Lucas',
      x: 246, feet: 104, dir: 'right', showIfFlag: 'base',
      baseAction: { kind: 'taller', station: 'lucas', label: 'Mejoras' },
    },
  ],
  pickups: [],
  warps: [
    // puerta interior: vuelve a la casa, al lado del porton del garaje
    { id: 'door_home', type: 'passage', name: 'la puerta de la casa', x: 5 * 16, y: 3 * 16, w: 16, h: 16, to: 'house', label: 'Volver a la casa',
      look: 'La puerta que da a la casa.',
      spawn: { x: 23 * 16 + 8, y: 4 * 16 + 8, dir: 'down' } },
    // la puerta de dos hojas: recien se puede cruzar con el traje y todo listo
    { id: 'garage_door', type: 'passage', name: 'el portón de la calle', x: 7 * 16, y: 3 * 16, w: 48, h: 16, to: 'street', label: 'Salir a la calle',
      look: 'El portón del garaje. Es la única salida posible.',
      needsSuit: true, needsFlag: 'listo_para_salir', baseExit: true,
      spawn: { x: 4 * 16 + 8, y: 12 * 16 + 8, dir: 'down' } },
  ],
};

export default garage;
