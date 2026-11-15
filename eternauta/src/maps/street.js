// Calle de Vicente Lopez bajo la nevada luminosa. 80x20 tiles = 1280x320 px.
// Composicion calcada de art/concept/street.py:
//   - la verja de los chalets de hastial arriba (houses.png) con sus tapiales,
//     portones, pinos y farolas de brazo curvo
//   - vereda, cordon, calzada y cordon de enfrente con montones de nieve
//   - el colectivo detenido, autos nevados, la esquina del choque a la derecha
//     (auto volcado + auto de trompa + cartel) y la ferreteria con su caja de
//     municiones; Polsky caido en la calle si la historia lo mata
import { makeGrid, pick } from './grid.js';

export const COLS = 80;
export const ROWS = 20;

const SIDEWALK_TOP = 12;   // primera fila de vereda
const CURB_TOP = 14;       // cordon
const ROAD_TOP = 15;       // calzada
const YARD_LINE = 192;     // base de tapiales, rejas y farolas

// ---------------------------------------------------------------- piso
const floor = makeGrid(COLS, ROWS, (x, y) => {
  if (y <= 10) return pick('snow', x, y, 6);
  if (y === 11) return 'grass_0';
  if (y === SIDEWALK_TOP || y === SIDEWALK_TOP + 1) return `sidewalk_${(x + y) % 2}`;
  if (y === CURB_TOP || y === ROWS - 2) return 'curb_0';
  if (y >= ROAD_TOP && y <= ROWS - 3) return pick('road', x, y, 2);
  return `sidewalk_${(x + y) % 2}`;
});

// ---------------------------------------------------------------- sprites
// Tamaños de los frames que usa la calle (objects / street2 / houses).
const SIZE = {
  salvo_7: [124, 132], californiano_11: [124, 132], salvo_31: [124, 132],
  californiano_23: [124, 132], shop_ferreteria: [80, 64], sign_ferreteria: [16, 16],
  tapial48: [48, 20], tapial80: [80, 20], gate: [32, 32], fence: [32, 16],
  hedge: [32, 16], mailbox: [8, 16], trash: [8, 16], crate: [16, 16],
  pino_0: [36, 64], pino_1: [36, 64], pino_2: [36, 64], pino_3: [36, 64],
  tree_b: [24, 40], bush30: [30, 16], farola: [24, 56], streetlight: [16, 48],
  cartel_esquina: [20, 40], polsky_caido: [28, 12], figure_snow: [24, 12],
  papel: [6, 4], fallen_0: [26, 12], fallen_1: [26, 12], fallen_2: [26, 12],
  snow_mound: [32, 16], colectivo_snow: [100, 52], sedan_teal_snow: [66, 42],
  sedan_bordo_snow: [66, 42], sedan_celeste_snow: [66, 42], sedan_crema_snow: [66, 42],
  auto_volcado: [66, 46], auto_parado: [56, 74],
};

// Ubica un sprite por su esquina inferior izquierda en px, como el concepto.
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

const objects = [];
const add = (obj) => { objects.push(obj); return obj; };

// ---------------------------------------------------------------- casas
// Base en la linea de vereda; los centros caen cada 272 px.
const HOUSES = [
  ['salvo_7', 82], ['californiano_11', 354], ['salvo_31', 626], ['californiano_23', 898],
];
for (const [sprite, left] of HOUSES) {
  add(put(`house_${sprite}`, sprite, left, 176, { solid: true, emissive: 'snow' }));
}

// Verja de cada jardin: tapial, porton al frente de la puerta, cerco y reja.
const BLOCKS = [0, 272, 544, 816];
const YARD = [
  ['tapial80', 0], ['tapial48', 80], ['gate', 128], ['fence', 160],
  ['tapial48', 192], ['fence', 240],
];
let fenceId = 0;
for (const block of BLOCKS) {
  for (const [sprite, dx] of YARD) {
    fenceId += 1;
    add(put(`verja_${fenceId}`, sprite, block + dx, YARD_LINE, { solid: true }));
  }
}

// Pinos y arboles en los jardines, detras de la verja.
// Un poco mas atras que la verja (base 180) para que el tapial los tape.
const PINES = [[200, 180, 'pino_0'], [470, 180, 'pino_1'], [742, 180, 'pino_2'],
  [1010, 180, 'pino_3'], [300, 180, 'tree_b']];
for (const [left, base, sprite] of PINES) {
  add(put(`pino_${left}`, sprite, left, base, {
    solid: { x: 0.4, y: 3, w: 0.6, h: 1 }, emissive: 'snow',
  }));
}
add(put('buzon', 'mailbox', 150, 200, {}));
add(put('arbusto_jardin', 'bush30', 262, 190, { emissive: 'snow' }));

// ---------------------------------------------------------------- farolas
const FAROLAS = [240, 512, 784, 1056];
FAROLAS.forEach((left, i) => {
  add(put(`farola_${i + 1}`, 'farola', left, 222, {
    glow: true, solid: { x: 0.4, y: 3, w: 0.6, h: 1 }, emissive: 'snow',
  }));
});

// ---------------------------------------------------------------- ferreteria
add(put('ferreteria', 'shop_ferreteria', 1096, 176, {
  solid: true,
  interact: { kind: 'look', talk: 'ferreteria', label: 'Mirar la ferretería' },
}));
add(put('cartel_ferreteria', 'sign_ferreteria', 1100, 168, {}));
add(put('caja_municiones', 'crate', 1136, 194, {
  interact: { kind: 'ammo', talk: 'ferreteria', label: 'Caja de municiones' },
}));

// ---------------------------------------------------------------- calzada
add(put('colectivo', 'colectivo_snow', 24, 284, {
  solid: { x: 0.3, y: 2, w: 5.4, h: 1 }, emissive: 'snow',
  interact: { kind: 'look', talk: 'bus', label: 'Mirar el colectivo' },
}));
add(put('auto_1', 'sedan_teal_snow', 300, 278, {
  solid: { x: 0.3, y: 2, w: 3.4, h: 1 }, emissive: 'snow',
  interact: { kind: 'look', talk: 'car', label: 'Mirar el auto' },
}));
add(put('auto_2', 'sedan_bordo_snow', 520, 284, {
  solid: { x: 0.3, y: 2, w: 3.4, h: 1 }, emissive: 'snow',
}));
add(put('auto_3', 'sedan_celeste_snow', 740, 276, {
  solid: { x: 0.3, y: 2, w: 3.4, h: 1 }, emissive: 'snow',
}));
add(put('auto_4', 'sedan_crema_snow', 900, 286, {
  solid: { x: 0.3, y: 2, w: 3.4, h: 1 }, emissive: 'snow',
}));

// La esquina del choque, a la derecha: el auto volcado y el de trompa.
add(put('auto_volcado', 'auto_volcado', 1128, 280, {
  solid: { x: 0.4, y: 2, w: 3.2, h: 1 }, emissive: 'snow',
}));
add(put('auto_parado', 'auto_parado', 1196, 288, {
  solid: { x: 0.4, y: 3, w: 2.5, h: 1 },
  interact: { kind: 'look', talk: 'car', label: 'Mirar el auto' },
}));
add(put('cartel', 'cartel_esquina', 1230, 224, {
  solid: { x: 0, y: 1, w: 1, h: 1 },
}));

// ---------------------------------------------------------------- nieve y cuerpos
// Medanos: tambien son los spawns de la arena (§11).
const MOUNDS = [
  ['medano_1', 192, 268], ['medano_2', 416, 248], ['medano_3', 608, 282],
  ['medano_4', 800, 262], ['medano_5', 992, 248], ['medano_6', 1168, 272],
];
for (const [id, left, base] of MOUNDS) {
  add(put(id, 'snow_mound', left, base, { emissive: 'snow' }));
}

// Polsky boca abajo en la nieve: solo aparece si la historia lo mata.
add(put('polsky_body', 'polsky_caido', 170, 270, {
  showIfFlag: 'polsky_muerto',
  interact: { kind: 'look', talk: 'polsky_body', label: 'Mirar en la nieve' },
}));
add(put('figura_nieve', 'figure_snow', 380, 254, {}));
add(put('caido_1', 'fallen_1', 560, 266, {}));
add(put('caido_2', 'fallen_2', 1050, 268, {}));
add(put('caido_3', 'fallen_0', 660, 272, {}));
const PAPERS = [[300, 252], [520, 224], [680, 268], [1080, 240], [1140, 260]];
PAPERS.forEach(([left, base], i) => add(put(`papel_${i + 1}`, 'papel', left, base, {})));

// ---------------------------------------------------------------- vereda de enfrente
// Al fondo del mapa: tapiales, pinos y arbustos, cortados por el borde.
const SOUTH = [
  ['tapial80', 0], ['tapial48', 80], ['fence', 128], ['hedge', 160],
  ['tapial48', 192], ['fence', 240],
];
let southId = 0;
for (const block of [0, 272, 544, 816, 1088]) {
  for (const [sprite, dx] of SOUTH) {
    if (block + dx + (sprite === 'tapial80' ? 80 : 48) > COLS * 16) break;
    southId += 1;
    add(put(`verja_sur_${southId}`, sprite, block + dx, 320, { solid: true }));
  }
}
const SOUTH_PINES = [[100, 318], [400, 318], [700, 318], [1000, 318]];
SOUTH_PINES.forEach(([left, base], i) => {
  add(put(`pino_sur_${i + 1}`, ['pino_0', 'pino_1', 'pino_2', 'pino_3'][i],
    left, base, { emissive: 'snow', solid: { x: 0.4, y: 3, w: 0.6, h: 1 } }));
});
const BUSHES = [60, 340, 640, 900, 1240];
BUSHES.forEach((left, i) => add(put(`arbusto_sur_${i + 1}`, 'bush30', left, 318, { emissive: 'snow' })));
add(put('tacho_sur', 'trash', 1180, 310, {}));
add(put('farol_sur', 'streetlight', 1250, 310, {
  glow: true, solid: { x: 0.4, y: 2, w: 0.6, h: 1 }, emissive: 'snow',
}));

// ---------------------------------------------------------------- mapa
export const street = {
  id: 'street',
  name: 'Calle',
  cols: COLS,
  rows: ROWS,
  floor,
  solidTiles: ['black', 'grass_'],
  spawn: { x: 4 * 16 + 8, y: 12 * 16 + 8, dir: 'right' },
  bounds: {
    minX: 10, maxX: (COLS - 1) * 16 - 6,
    minFeet: SIDEWALK_TOP * 16 + 8, maxFeet: 19 * 16 - 2,
  },
  objects,
  surfaces: [],
  // En el apagon la nieve es emisiva (§8); las farolas y las ventanas de las
  // casas se apagan con el corte.
  emissive: 'snow',
  emissiveTiles: ['snow_', 'sidewalk_', 'curb_', 'road_', 'path_'],
  lights: [
    ...FAROLAS.map((left, i) => ({
      x: left + 19, y: 178, radius: 120, color: '#ffcf6e', kind: 'electric',
      flicker: 0.05, state: 'on', onlyIn: 'electrica', id: `farola_${i + 1}`,
    })),
    ...[144, 416, 688, 960].flatMap((center, i) => ([
      { x: center - 46, y: 152, radius: 38, color: '#ffd890', kind: 'electric',
        flicker: 0.03, state: 'on', onlyIn: 'electrica', id: `ventana_${i + 1}a` },
      { x: center + 42, y: 152, radius: 34, color: '#ffd890', kind: 'electric',
        flicker: 0.03, state: 'on', onlyIn: 'electrica', id: `ventana_${i + 1}b` },
    ])),
  ],
  windows: [],
  // Zona jugable de la arena (minijuego §11): vereda + calzada.
  arena: { minX: 8 * 16, maxX: 72 * 16, minY: 7 * 16, maxY: 18 * 16 },
  // Spawns de cascarudos: los seis medanos y los bordes del mapa.
  spawns: {
    medano_1: { x: 208, y: 268 }, medano_2: { x: 432, y: 248 },
    medano_3: { x: 624, y: 282 }, medano_4: { x: 816, y: 262 },
    medano_5: { x: 1008, y: 248 }, medano_6: { x: 1184, y: 272 },
    left: { x: 8 * 16, y: 266 }, right: { x: 72 * 16, y: 266 },
    bottom: { x: 40 * 16, y: 18 * 16 },
  },
  // Se conserva por compatibilidad con StreetScene; la calle ya no termina.
  endX: COLS * 16,
  npcs: [],
  pickups: [],
  warps: [],
};

export default street;
