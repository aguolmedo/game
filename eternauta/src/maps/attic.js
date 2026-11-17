// Altillo de la casa de Juan Salvo: el "laboratorio" donde juegan al truco.
// Cuarto compacto (22x14 tiles = 352x224 px) que entra entero en la vista
// 480x270, como los interiores chicos: techo a dos aguas con vigas arriba,
// pared de ladrillo a la vista con zocalo, muebles contra la pared y la mesa
// de truco en el centro bajo la lampara.
import { makeGrid, fillRect, pick } from './grid.js';

export const COLS = 22;
export const ROWS = 14;

const BEAMS = new Set([5, 10, 16]);
const WALL_TOP = 1;      // cenefa
const FLOOR_TOP = 4;     // primera fila de piso
const LAST = ROWS - 1;   // fila negra de abajo

const floor = makeGrid(COLS, ROWS, (x, y) => {
  const side = x === 0 || x === COLS - 1;
  if (y === LAST) return 'black';
  if (side) return pick('roof', x, y, 3);
  if (y < WALL_TOP) return BEAMS.has(x) ? 'beam_0' : pick('roof', x, y, 3);
  if (y === WALL_TOP) return 'eave_0';
  if (y === 2) return `brick_${x % 2}`;
  if (y === 3) return `brickbase_${x % 2}`;
  if (x === 1) return 'woodshl_0';
  if (x === COLS - 2) return 'woodshr_0';
  if (y === FLOOR_TOP) return `woodsh_${x % 2}`;
  return pick('wood', x, y, 6);
});

// Alfombra estirable bajo la mesa de truco (5x4).
function rug(x0, y0, w, h) {
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const col = i === 0 ? 0 : i === w - 1 ? 2 : 1;
      const row = j === 0 ? 0 : j === h - 1 ? 2 : 1;
      floor[y0 + j][x0 + i] = `rg_${row * 3 + col}`;
    }
  }
}
rug(8, 6, 5, 4);

// Escalera que baja a la casa (2x2, abajo a la derecha): warp.
fillRect(floor, 18, 11, 2, 2, 'stair_0');
floor[11][19] = 'stair_1';
floor[12][18] = 'stair_2';
floor[12][19] = 'stair_3';

// Slots de superficie en px relativos a la caja del mueble (x*16, y*16), que
// es el origen que usa src/surfaces.js. Son puntos de apoyo (centro-abajo).
// Mesa de truco (48x32, tapa en y 8..19): fila de atras (botella, cenicero,
// anotador), naipes sobre el paño y adelante a la derecha el mate y el vaso.
// El centro de atras queda libre para la vela del apagon. Las cajas no se
// pisan entre si (salvo 1-2 px de los naipes sobre el anotador).
const TABLE_SLOTS = [
  { x: 4, y: 13 }, { x: 42, y: 8 }, { x: 14, y: 11 },
  { x: 12, y: 20 }, { x: 19, y: 20 }, { x: 26, y: 20 },
  { x: 37, y: 20 }, { x: 45, y: 20 },
];
const SHELF_SLOTS = [
  { x: 6, y: 11 }, { x: 18, y: 11 }, { x: 30, y: 11 },
  { x: 6, y: 23 }, { x: 18, y: 23 }, { x: 30, y: 23 },
];
const BENCH_SLOTS = [
  { x: 8, y: 10 }, { x: 20, y: 10 }, { x: 32, y: 10 },
  { x: 8, y: 20 }, { x: 20, y: 20 },
];

const objects = [
  // ---- techo: aviones de modelismo colgados de las vigas
  { id: 'plane1', sprite: 'model_plane', x: 3, y: 0, tw: 1, th: 2, solid: false, offset: [6, 0] },
  { id: 'plane2', sprite: 'model_plane', x: 14, y: 0, tw: 1, th: 2, solid: false, offset: [2, -4] },

  // ---- pared del fondo
  { id: 'shelf_left', sprite: 'shelf', x: 2, y: 2, tw: 3, th: 2, solid: false, offset: [0, -2],
    surface: { slots: SHELF_SLOTS, maxItems: 6 },
    interact: { kind: 'look', talk: 'shelf', label: 'Mirar el estante' } },
  { id: 'window', sprite: 'window_glow', x: 6, y: 2, tw: 2, th: 2, solid: false, offset: [0, -4],
    window: { view: 'attic', openable: false },
    interact: { kind: 'look', talk: 'window', label: 'Mirar por la ventana' } },
  { id: 'shelf_right', sprite: 'shelf', x: 13, y: 2, tw: 3, th: 2, solid: false, offset: [0, -2],
    surface: { slots: SHELF_SLOTS, maxItems: 6 },
    interact: { kind: 'look', talk: 'shelf', label: 'Mirar el estante' } },

  // ---- contra la pared
  { id: 'radio', sprite: 'radio_cabinet', x: 2, y: 4, tw: 2, th: 1, solid: true,
    interact: { kind: 'look', talk: 'radio', label: 'Prender la radio' } },
  { id: 'speaker', sprite: 'speaker', x: 4, y: 4, tw: 1, th: 1, solid: true,
    interact: { kind: 'look', talk: 'speaker', label: 'Mirar el parlante' } },
  { id: 'jar_wall', sprite: 'jar', x: 6, y: 4, tw: 1, th: 1, solid: false, offset: [0, -2] },
  { id: 'tool_table', sprite: 'tool_table', x: 15, y: 4, tw: 3, th: 2, solid: true,
    interact: { kind: 'look', talk: 'worktable', label: 'Mirar la mesa de trabajo' } },
  { id: 'air_tank', sprite: 'air_tank', x: 18, y: 4, tw: 1, th: 1, solid: true,
    interact: { kind: 'look', talk: 'worktable', label: 'Mirar el cilindro' } },
  { id: 'coat_stand', sprite: 'coat_stand', x: 19, y: 4, tw: 1, th: 1, solid: true,
    interact: { kind: 'look', talk: 'coat', label: 'Mirar el perchero' } },

  // ---- la partida de truco: lampara, mesa, sillas
  { id: 'lamp', sprite: 'hanging_lamp', x: 10, y: 4, tw: 1, th: 1, solid: false, glow: true, offset: [0, -6] },
  { id: 'chair_fav', sprite: 'chair', x: 9, y: 5, tw: 1, th: 1, solid: false },
  { id: 'chair_pol', sprite: 'chair', x: 10, y: 5, tw: 1, th: 1, solid: false },
  { id: 'chair_luc', sprite: 'chair', x: 11, y: 5, tw: 1, th: 1, solid: false },
  { id: 'table', sprite: 'table_truco', x: 9, y: 6, tw: 3, th: 2, solid: { x: 0, y: 1, w: 3, h: 1 },
    surface: { slots: TABLE_SLOTS, maxItems: 8 },
    interact: { kind: 'look', talk: 'table', label: 'Mirar la mesa' } },
  { id: 'chair_juan', sprite: 'chair_front', x: 10, y: 8, tw: 1, th: 1, solid: false,
    interact: { kind: 'look', talk: 'chair', label: 'Sentarse' } },
  // Favalli la prende sobre la mesa cuando se corta la luz (historia §8).
  { id: 'candle', sprite: 'oil_lamp_lit', x: 10, y: 7, tw: 1, th: 1, solid: false,
    offset: [2, -20], hitFromSprite: true, priority: 2, glow: true, showIfFlag: 'apagon',
    interact: { kind: 'look', talk: 'candle', label: 'Mirar la vela' } },
  { id: 'cup1', sprite: 'cup', x: 12, y: 8, tw: 1, th: 1, solid: false, offset: [2, -2] },

  // ---- rincon izquierdo: los violines y el sillon
  { id: 'violin_bench', sprite: 'violin_bench', x: 2, y: 7, tw: 2, th: 1, solid: true,
    interact: { kind: 'look', talk: 'violin', label: 'Mirar los violines' } },
  { id: 'violin1', sprite: 'violin', x: 2, y: 7, tw: 2, th: 1, solid: false, offset: [0, -12] },
  { id: 'armchair', sprite: 'armchair', x: 2, y: 10, tw: 1, th: 1, solid: true },
  { id: 'book2', sprite: 'book', x: 3, y: 10, tw: 1, th: 1, solid: false, offset: [0, -2] },
  { id: 'crate', sprite: 'crate', x: 1, y: 12, tw: 1, th: 1, solid: true,
    container: { name: 'Cajón de herramientas', items: [{ id: 'tiras', n: 3 }] } },
  { id: 'suitcase', sprite: 'suitcase', x: 2, y: 12, tw: 1, th: 1, solid: true },
  { id: 'box', sprite: 'box', x: 5, y: 12, tw: 1, th: 1, solid: true,
    container: { name: 'Caja de cartón', items: [] } },

  // ---- rincon derecho: el banco del laboratorio
  { id: 'workbench', sprite: 'workbench', x: 15, y: 8, tw: 3, th: 2, solid: true,
    surface: { slots: BENCH_SLOTS, maxItems: 5 },
    // De lo apoyado, solo el calentador representa la estación (R3): la
    // tijera o la tela no son "el fuego".
    station: 'heat',
    stationItem: 'calentador',
    interact: { kind: 'look', talk: 'workbench', label: 'Mirar el banco' } },
  { id: 'tools1', sprite: 'tools', x: 16, y: 8, tw: 1, th: 1, solid: false, offset: [0, -14] },
  { id: 'rag1', sprite: 'rag', x: 14, y: 10, tw: 1, th: 1, solid: false, offset: [4, -2] },
  { id: 'crate_stairs', sprite: 'crate', x: 20, y: 9, tw: 1, th: 1, solid: true },
  { id: 'box_stairs', sprite: 'box', x: 20, y: 10, tw: 1, th: 1, solid: true },
  { id: 'bottle2', sprite: 'bottle', x: 13, y: 12, tw: 1, th: 1, solid: false, offset: [2, -2] },
];

export const attic = {
  id: 'attic',
  name: 'Altillo',
  cols: COLS,
  rows: ROWS,
  floor,
  solidTiles: ['roof_', 'beam_', 'eave_', 'brick', 'black'],
  spawn: { x: 10 * 16 + 8, y: 10 * 16 + 4, dir: 'up' },
  bounds: { minX: 16 + 4, maxX: (COLS - 1) * 16 - 4, minFeet: FLOOR_TOP * 16 + 6, maxFeet: LAST * 16 - 3 },
  objects,
  // Superficies del mapa (misma data que cada objeto; ver §4).
  surfaces: objects.filter((o) => o.surface).map((o) => ({
    id: o.id, sprite: o.sprite, slots: o.surface.slots, maxItems: o.surface.maxItems,
  })),
  // Luces: la lampara colgante electrica (se apaga con el corte) y la vela que
  // Favalli prende sobre la mesa cuando la historia la enciende.
  lights: [
    { x: 10 * 16 + 8, y: 4 * 16 + 2, radius: 95, color: '#ffcf6e', kind: 'electric',
      flicker: 0.05, state: 'on', onlyIn: 'electrica' },
    { x: 11 * 16, y: 7 * 16 + 4, radius: 46, color: '#ffd08a', kind: 'candle',
      flicker: 0.35, state: 'off', onlyIn: null },
  ],
  windows: [
    { id: 'window', x: 7 * 16, y: 4 * 16, view: 'attic', openable: false },
  ],
  npcs: [
    { id: 'favalli', who: 'favalli', x: 9 * 16 + 8, feet: 6 * 16 + 2, dir: 'down', pose: 'idle' },
    { id: 'polsky', who: 'polsky', x: 10 * 16 + 8, feet: 6 * 16 + 2, dir: 'down', pose: 'idle' },
    { id: 'lucas', who: 'lucas', x: 11 * 16 + 8, feet: 6 * 16 + 2, dir: 'down', pose: 'idle' },
  ],
  // Nada tirado en el piso: los objetos del traje viven en las superficies.
  pickups: [],
  warps: [
    { id: 'stairs', x: 18 * 16, y: 11 * 16, w: 32, h: 32, to: 'house', label: 'Bajar',
      spawn: { x: 2 * 16 + 8, y: 5 * 16 + 8, dir: 'down' } },
  ],
};

export default attic;
