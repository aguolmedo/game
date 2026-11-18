// Planta baja del chalet de los Salvo, calcada del plano de art/concept/house.py.
// 28x16 tiles = 448x256 px: entra entera en la vista 480x270.
//
//   arriba: LIVING (escalera, ventana, biblioteca, sofa, radio) | HALL (puerta
//           de calle sellada, perchero, reloj) | GARAJE-ENTRADA (porton al mapa
//           garaje)
//   abajo:  DORMITORIO | CUARTO DE MARTITA | COCINA (alacena, cocina a gas,
//           mesa con la lampara de aceite)
//
// Las paredes intermedias de las filas 9-10 se ven de frente, como en el mockup.
import { makeGrid, fillRect } from './grid.js';
import { depthFor } from '../sprite.js';

export const COLS = 28;
export const ROWS = 16;

// Tamaños de los sprites que usa este mapa (frames de objects/interior2).
const SIZE = {
  stairs_attic: [32, 48], window_back: [32, 16], back_wall: [16, 16],
  snow_drift: [27, 5], kid_drawing: [14, 12], kid_bed: [20, 30],
  sink: [32, 24], chair: [16, 24], chair_r: [16, 24], wedding_photo: [12, 11],
  broom_bucket: [16, 26], bidon: [10, 13],
  window_glow: [32, 32], shelf: [48, 29], sofa: [48, 24],
  radio_cabinet: [32, 24], living_table: [32, 24], kitchen_table: [48, 24], armchair: [16, 24],
  door_porthole: [20, 34], coat_stand: [16, 40], wall_clock: [12, 18],
  garage_door: [48, 34], garage_shelf: [48, 32], tire: [16, 16], cans: [8, 8],
  bucket: [8, 8], bed: [32, 34], nightstand: [16, 28], wardrobe: [32, 32],
  toy_horse: [16, 16], alacena: [48, 36],
  stove: [16, 24], oil_lamp_lit: [10, 14], jar: [8, 8],
};

// Ubica un sprite por su esquina inferior izquierda en px, como el concepto:
// el anclaje del juego es (centro X, base Y) y el offset corrige el resto.
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

/** Slots en coords locales del sprite (0,0 = esquina superior izquierda). */
function slots(sprite, obj, local, maxItems) {
  const dy = obj.th * 16 - SIZE[sprite][1];
  return {
    slots: local.map(([x, y]) => ({ x, y: y + dy })),
    maxItems,
  };
}

// ---------------------------------------------------------------- piso
const floor = makeGrid(COLS, ROWS, () => 'black');

function fill(x0, y0, x1, y1, fn) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) floor[y][x] = fn(x, y);
  }
}

fill(1, 1, 26, 1, (x) => `plaster_${x % 2}`);                 // pared del fondo
fill(1, 2, 26, 2, () => 'trim_0');                            // zocalo
fill(1, 3, 11, 8, (x, y) => `parquet_${(x * 7 + y) % 3}`);    // living
fill(13, 3, 17, 8, (x, y) => `parquet_${(x + y) % 3}`);       // hall
fill(19, 3, 26, 8, (x, y) => `tile_${(x * 3 + y) % 2}`);      // garaje: cemento
fill(1, 9, 26, 9, (x) => `plaster_${x % 2}`);                 // pared de frente
fill(1, 10, 26, 10, () => 'trim_0');
fill(1, 11, 8, 14, (x, y) => `parquet_${(x + y * 2) % 3}`);   // dormitorio
fill(10, 11, 15, 14, (x, y) => `wood_${(x + y) % 6}`);        // cuarto de Martita
fill(17, 11, 26, 14, (x, y) => ((x + y) % 2 ? 'tile_1' : 'tile_0')); // cocina

// Tabiques vistos desde arriba (columnas de tablon oscuro).
for (const x of [12, 18]) fill(x, 1, x, 8, (_, y) => `plank_${y % 3}`);
for (const x of [9, 16]) fill(x, 9, x, 14, (_, y) => `plank_${y % 3}`);

// Vanos: living-hall, hall-garaje y puertas de la pared del medio.
for (const [x, y] of [[12, 5], [12, 6], [18, 6], [18, 7]]) floor[y][x] = `parquet_${x % 3}`;
for (const x of [5, 14, 20]) {
  for (const y of [9, 10]) floor[y][x] = `parquet_${(x + y) % 3}`;
}

// Alfombra del living frente al sofa.
for (let j = 0; j < 3; j++) {
  for (let i = 0; i < 5; i++) {
    const col = i === 0 ? 0 : i === 4 ? 2 : 1;
    const row = j === 0 ? 0 : j === 2 ? 2 : 1;
    floor[5 + j][5 + i] = `rg_${row * 3 + col}`;
  }
}

// ---------------------------------------------------------------- muebles
const objects = [];

// ---- living
// Decorativa: el click/hover lo maneja el warp `stairs_up`, que ocupa el
// mismo rect. Si el objeto tambien fuera interactuable robaba el click y
// mostraba un texto de bajada estando en la planta baja.
objects.push(put('stairs_up', 'stairs_attic', 16, 80, {
  flat: true, solid: false,
}));
objects.push(put('window_living', 'window_glow', 96, 48, {
  window: { view: 'living', openable: false },
  interact: { kind: 'look', talk: 'window', label: 'Mirar la calle' },
}));
objects.push(put('bookshelf', 'shelf', 144, 48, { offset: [0, -2], solid: false,
  interact: { kind: 'look', talk: 'shelf', label: 'Mirar la biblioteca' } }));
objects.push(put('sofa', 'sofa', 100, 142, { solid: { x: 0, y: 1, w: 3, h: 1 },
  interact: { kind: 'look', talk: 'sofa', label: 'Mirar el living' } }));
const radio = put('radio_cabinet', 'radio_cabinet', 32, 104, {
  solid: { x: 0, y: 1, w: 2, h: 1 },
  interact: { kind: 'look', talk: 'radio', label: 'Prender la radio' },
});
objects.push(radio);
// Lámpara de aceite sobre el mueble de la radio: solo se ve en el apagón.
objects.push(put('oil_lamp_lit', 'oil_lamp_lit', 43, 84, {
  showIfFlag: 'apagon', glow: true, z: depthFor(96) + 0.02,
}));
const tableLiving = put('living_table', 'living_table', 104, 112, {
  solid: { x: 0, y: 1, w: 2, h: 1 },
  surface: null,
  interact: { kind: 'look', talk: 'living_table', label: 'Mirar la mesa' },
});
tableLiving.surface = { slots: slots('living_table', tableLiving, [[8, 12], [16, 13], [24, 12]], 3).slots, maxItems: 3 };
objects.push(tableLiving);
const armL = put('armchair_l', 'armchair', 160, 96, { solid: { x: 0, y: 1, w: 1, h: 1 } });
objects.push(armL);
objects.push(put('armchair_r', 'armchair', 66, 112, { solid: { x: 0, y: 1, w: 1, h: 1 } }));

// ---- hall
objects.push(put('hall_door', 'door_porthole', 230, 49, {
  interact: { kind: 'look', talk: 'hall_door', label: 'Mirar la puerta' },
}));
const coat = put('coat_stand', 'coat_stand', 208, 64, {
  solid: { x: 0, y: 2, w: 1, h: 1 },
  interact: { kind: 'look', talk: 'coat', label: 'Mirar el perchero' },
});
coat.surface = slots('coat_stand', coat, [[6, 38]], 1);
objects.push(coat);
objects.push(put('wall_clock', 'wall_clock', 262, 24, {
  offset: [4, -8],
  interact: { kind: 'look', talk: 'wall_clock', label: 'Mirar el reloj' },
}));

// ---- garaje-entrada
objects.push(put('garage_door', 'garage_door', 352, 49, {
  interact: { kind: 'look', talk: 'garage_door', label: 'Ir al garaje' },
}));
objects.push(put('entry_shelf', 'garage_shelf', 304, 64, {
  solid: { x: 0, y: 1, w: 3, h: 1 },
  interact: { kind: 'look', talk: 'shelf', label: 'Mirar el estante' },
}));
objects.push(put('entry_tire', 'tire', 306, 128, { solid: { x: 0, y: 0, w: 1, h: 1 } }));
objects.push(put('entry_cans', 'cans', 340, 128, {}));
objects.push(put('entry_bucket', 'bucket', 420, 96, {}));
objects.push(put('broom_bucket', 'broom_bucket', 410, 112, {}));
objects.push(put('bidon', 'bidon', 308, 112, {}));

// ---- dormitorio
objects.push(put('bed', 'bed', 20, 208, { solid: { x: 0, y: 1, w: 2, h: 1 } }));
const night = put('nightstand', 'nightstand', 54, 192, {
  solid: { x: 0, y: 1, w: 1, h: 1 },
  interact: { kind: 'look', talk: 'nightstand', label: 'Mirar la mesa de luz' },
});
night.surface = slots('nightstand', night, [[8, 18]], 1);
objects.push(night);
objects.push(put('wardrobe', 'wardrobe', 104, 192, {
  solid: { x: 0, y: 1, w: 2, h: 1 },
  container: { name: 'Ropero', items: [{ id: 'rifle', n: 1 }, { id: 'balas', n: 30 }] },
}));
objects.push(put('wedding_photo', 'wedding_photo', 30, 162, {
  interact: { kind: 'look', talk: 'wedding_photo', label: 'Mirar la foto' },
}));

// ---- cuarto de Martita
objects.push(put('kid_bed', 'kid_bed', 164, 214, { solid: { x: 0, y: 1, w: 1, h: 1 } }));
objects.push(put('toy_horse', 'toy_horse', 212, 224, {
  interact: { kind: 'look', talk: 'toy_horse', label: 'Mirar el caballito' },
}));
objects.push(put('kid_drawing', 'kid_drawing', 200, 164, {
  interact: { kind: 'look', talk: 'kid_drawing', label: 'Mirar el dibujo' },
}));
// La ventana va sobre el muro del fondo (fila 15): z un pelo mas alto que los
// tiles del muro para que no pelee por el mismo plano.
objects.push(put('window_martita', 'window_back', 192, 256, {
  z: depthFor(256) + 0.01,
  window: { view: null, openable: true },
  interact: { kind: 'look', talk: 'window', label: 'Cerrar la ventana' },
}));
objects.push(put('snow_drift', 'snow_drift', 194, 240, {
  hideIfFlag: 'closed_window_martita',
}));

// ---- cocina
objects.push(put('alacena', 'alacena', 342, 192, {
  solid: { x: 0, y: 1, w: 3, h: 1 },
  container: { name: 'Alacena', items: [{ id: 'guantes', n: 1 }] },
}));
objects.push(put('sink', 'sink', 274, 192, {
  solid: { x: 0, y: 1, w: 2, h: 1 },
  interact: { kind: 'look', talk: 'sink', label: 'Mirar la pileta' },
}));
// Sillas a los costados de la mesa (la puerta de la cocina queda libre).
objects.push(put('kchair_l', 'chair', 320, 224, {}));
objects.push(put('kchair_r', 'chair_r', 384, 224, {}));
const stove = put('stove', 'stove', 404, 192, {
  solid: { x: 0, y: 1, w: 1, h: 1 },
  station: 'heat',
  interact: { kind: 'look', talk: 'stove', label: 'Mirar la cocina' },
});
stove.surface = slots('stove', stove, [[8, 12]], 1);
objects.push(stove);
const ktable = put('kitchen_table', 'kitchen_table', 336, 224, {
  solid: { x: 0, y: 1, w: 3, h: 1 },
  interact: { kind: 'look', talk: 'kitchen_table', label: 'Mirar la mesa' },
});
// Tapa en y 3..14: fila de atras (frascos, latas, lista) y adelante (lata, pan,
// un lugar libre para dejar cosas). Atras a la izquierda va la lampara.
ktable.surface = slots('kitchen_table', ktable, [[20, 8], [31, 8], [41, 9], [12, 15], [25, 15], [38, 15]], 6);
objects.push(ktable);
// La lampara va sobre la mesa, atras a la izquierda: mismo anclaje que ella
// (fila 13) para que se dibuje encima. Latas y frascos son surface items.
objects.push({ id: 'oil_lamp', sprite: 'oil_lamp_lit', x: 21, y: 13, tw: 1, th: 1,
  solid: false, offset: [0, -16], glow: true });
objects.push(put('kitchen_bucket', 'bucket', 420, 240, {}));

// ---- muro del fondo (fila 15): 26 tiles de pared, fuera de los limites.
for (let i = 0; i < 26; i++) {
  objects.push(put(`back_wall_${i + 1}`, 'back_wall', 16 + 16 * i, 256, {}));
}

export const house = {
  id: 'house',
  name: 'Casa',
  cols: COLS,
  rows: ROWS,
  floor,
  solidTiles: ['black', 'plaster_', 'trim_', 'plank_'],
  spawn: { x: 2 * 16 + 8, y: 5 * 16 + 8, dir: 'down' },
  bounds: { minX: 16 + 4, maxX: (COLS - 1) * 16 - 4, minFeet: 3 * 16 + 6, maxFeet: 15 * 16 - 3 },
  // Deja ver un poco del muro del fondo al caminar por la fila de abajo.
  camBottomPad: 17,
  objects,
  surfaces: objects.filter((o) => o.surface).map((o) => ({
    id: o.id, sprite: o.sprite, slots: o.surface.slots, maxItems: o.surface.maxItems,
  })),
  lights: [
    // lampara de aceite de la cocina (anda sin electricidad)
    { x: 351, y: 204, radius: 62, color: '#ffbe62', kind: 'oil',
      flicker: 0.14, state: 'on', onlyIn: null },
    // velador del dormitorio (se apaga con el corte)
    { x: 62, y: 171, radius: 40, color: '#ffd08a', kind: 'candle',
      flicker: 0.2, state: 'on', onlyIn: 'electrica' },
    // luz del living
    { x: 112, y: 64, radius: 72, color: '#ffcf6e', kind: 'electric',
      flicker: 0.04, state: 'on', onlyIn: 'electrica' },
  ],
  windows: [
    { id: 'window_living', x: 112, y: 48, view: 'living', openable: false },
    { id: 'window_martita', x: 208, y: 248, view: null, openable: true },
  ],
  npcs: [
    { id: 'elena', who: 'elena', x: 8 * 16 + 8, feet: 8 * 16 + 8, dir: 'down' },
    { id: 'martita', who: 'martita', x: 12 * 16 + 8, feet: 13 * 16 + 8, dir: 'down' },
  ],
  pickups: [],
  warps: [
    { id: 'stairs_up', x: 1 * 16, y: 3 * 16, w: 32, h: 32, to: 'attic', label: 'Subir',
      look: 'La escalera rebatible que sube al altillo.',
      spawn: { x: 17 * 16 + 8, y: 12 * 16 + 8, dir: 'right' } },
    { id: 'garage_door', x: 22 * 16, y: 3 * 16, w: 48, h: 16, to: 'garage', label: 'Entrar',
      spawn: { x: 5 * 16 + 8, y: 4 * 16 + 8, dir: 'down' } },
  ],
};

export default house;
