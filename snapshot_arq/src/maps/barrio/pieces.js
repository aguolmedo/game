// Las cinco piezas del barrio del roguelike (20x20 baldosas = 320x320 px).
// Portadas de art/concept/manzanas.py: mismas posiciones y mismos objetos.
// Coordenadas locales a la pieza (0..320). `buildBarrio` las desplaza a la grilla.
import { pick } from '../grid.js';
import { placer } from '../place.js';
import { SIZE } from './sizes.js';
import { FULL } from '../solid.js';

export const PIECE_TILES = 20;
const MW = PIECE_TILES * 16;

// Piezas con salida de calzada al norte (columnas 9-11). La casa y la cortada
// son fondos cerrados: no encastran hacia arriba.
export const NORTH_EXIT = new Set(['esquina', 'plaza', 'vias']);

// Las piezas también usan `alignLeft` (ver src/maps/place.js).
const put = placer(SIZE);

// Huella sólida en px dentro del sprite (`solidPx`, ver src/maps/solid.js).
// `FULL` = todo el dibujo; `foot` = una franja concreta (troncos, postes).
const foot = (x, y, w, h) => ({ x, y, w, h });
function footBase(sprite, x, w, h = 16) {
  const [, H] = SIZE[sprite];
  return foot(x, H - h, w, h);
}
// Troncos medidos sobre el sprite (columnas opacas de las ultimas filas).
const TRUNK = {
  tree_a: foot(11, 32, 10, 16),
  tree_b: foot(7, 24, 9, 16),
  arbol_vereda: foot(5, 27, 13, 16),
};
// Postes: solo frena la base, no el cartel ni la luminaria que van en el aire.
const POST = {
  streetlight: foot(2, 40, 12, 8),
  // la farola tiene 2 filas transparentes al pie: el solido no las pisa.
  farola: foot(2, 46, 8, 8),
  cartel_esquina: foot(7, 24, 6, 16),
  cruz_san_andres: foot(9, 27, 5, 16),
  barrera_alta: foot(0, 31, 13, 10),
};
function trunkFoot(sprite) {
  if (TRUNK[sprite]) return TRUNK[sprite];
  // pino: el tronco; el frame tiene 2 filas transparentes abajo.
  if (/^pino/.test(sprite)) return foot(9, 54, 19, 8);
  return FULL;
}

function build(type, rows, opts = {}) {
  const openSouth = Boolean(opts.openSouth);
  // Vecinos: los pone `buildBarrio` según la grilla. Sin vecino, el lado se
  // cierra con algo legible (L2) en vez de dejar la calle contra la estática.
  // Por defecto una pieza suelta queda encerrada (la usan los tests y el
  // diagnóstico de piezas).
  const northOpen = Boolean(opts.northOpen);
  const eastOpen = Boolean(opts.eastOpen);
  const westOpen = Boolean(opts.westOpen);
  const northExit = NORTH_EXIT.has(type);
  const grid = rows.slice();
  if (openSouth) {
    for (const y of [18, 19]) grid[y] = `${grid[y].slice(0, 9)}rrr${grid[y].slice(12)}`;
  }
  const objects = [];
  const marks = [];
  let n = 0;

  const obj = (sprite, left, base, extra = {}) => {
    n += 1;
    objects.push(put(`${type}_${n}`, sprite, left, base, extra));
  };
  // Las calcomanias en el piso (papeles, vidrios) van planas, bajo los objetos.
  const flat = (sprite, left, base) => obj(sprite, left, base, { flat: true });
  const mark = (kind, x, y, extra = {}) => marks.push({
    kind, x: Math.round(x), y: Math.round(y), ...extra,
  });

  const house = (sprite, left, base) => obj(sprite, left, base, {
    solid: true, solidPx: FULL, emissive: 'snow',
  });
  const shop = (sprite, left, base) => obj(sprite, left, base, {
    solid: true, solidPx: FULL, emissive: 'snow',
  });
  const verja = (sprite, left, base, extra = {}) => obj(sprite, left, base, {
    solid: true, solidPx: FULL, alignLeft: true, ...extra,
  });
  const pino = (sprite, left, base) => obj(sprite, left, base, {
    solid: true, solidPx: trunkFoot(sprite), emissive: 'snow',
  });
  const arbol = (sprite, left, base) => obj(sprite, left, base, {
    solid: true, solidPx: trunkFoot(sprite), emissive: 'snow',
  });
  const poste = (sprite, left, base) => obj(sprite, left, base, {
    solid: true, solidPx: POST[sprite] || footBase(sprite, 2, 8, 8),
    glow: true, emissive: 'snow',
  });
  const medano = (left, base) => {
    // Los medanos son nieve pisable (y puntos de spawn): no frenan.
    obj('snow_mound', left, base, { emissive: 'snow' });
    mark('spawn', left + SIZE.snow_mound[0] / 2, base - 4);
  };
  const auto = (sprite, left, base) => {
    const [w, h] = SIZE[sprite];
    // Auto y vagon frenan todo el cuerpo (C4): son obstaculos, no decorado.
    obj(sprite, left, base, { solid: true, solidPx: FULL, emissive: 'snow' });
    // La nafta va al pie del auto, sobre la calzada: con el cuerpo entero
    // solido ya no se puede cobrar desde adentro del dibujo (C7).
    mark('nafta', left + w / 2, base + 6);
  };
  const papeles = (pts) => { for (const [x, y] of pts) flat('papel', x, y); };

  // Tramos de cerca/verja en fila, de x0 a x1, sin superponer y recortados al
  // borde de la pieza (C10). `gaps` son los huecos que se dejan abiertos (el
  // porton del fondo, la bocacalle). Si el tramo pedido deja un hueco de menos
  // de 32 px (no hay cerca tan corta) se usa otro que cierre justo o deje 32+.
  const NARROW = ['tapial48', 'fence', 'hedge'];
  const fenceLine = (x0, x1, pattern, base, gaps = [], extra = {}) => {
    const cuts = gaps.slice().sort((a, b) => a[0] - b[0]);
    let x = Math.max(0, x0);
    let i = 0;
    while (x < x1) {
      const inside = cuts.find(([a, b]) => x >= a && x < b);
      if (inside) { x = inside[1]; continue; }
      const next = cuts.find(([a]) => a > x);
      const end = next ? Math.min(next[0], x1) : x1;
      if (end - x < 32) break; // no hay cerca mas corta que 32: no se recoloca
      const wanted = pattern[i % pattern.length];
      const cand = [wanted, ...NARROW.filter((s) => s !== wanted)];
      const fits = cand.filter((s) => x + SIZE[s][0] <= end
        && (end - (x + SIZE[s][0]) === 0 || end - (x + SIZE[s][0]) >= 32));
      const sprite = fits[0] || cand.find((s) => x + SIZE[s][0] <= end);
      if (!sprite) break;
      verja(sprite, x, base, extra);
      x += SIZE[sprite][0];
      i += 1;
    }
  };

  // La vereda de enfrente: verjas y cercos cortados por el borde de abajo.
  // Con openSouth se abre el hueco de la calzada en x 144..192 (48 px).
  const southVerja = (x0, x1, seed = 0) => {
    const pattern = ['tapial80', 'hedge', 'fence', 'tapial48', 'hedge', 'fence'];
    const seq = seed % pattern.length ? pattern.slice(seed % pattern.length)
      .concat(pattern.slice(0, seed % pattern.length)) : pattern;
    // En la fila de abajo el borde sur es el del mapa: la verja se apoya en la
    // franja de estática (base 320) en vez de caer fuera (antes quedaba en 324).
    const base = openSouth ? MW + 4 : MW;
    const gaps = openSouth ? [[144, 192]] : [];
    fenceLine(x0, x1, seq, base, gaps, { south: true });
  };

  // Cierre de un lado sin vecino (L2): un muro de ladrillo que corre de norte a
  // sur tapa la calzada y la vereda contra el borde de la pieza. Dos tramos
  // cubren las filas 10-19 y se empalman con la medianera (filas 0-11): el
  // borde muerto queda amurallado de punta a punta.
  const sideWall = (left) => {
    for (const base of [240, 304]) obj('pared_ns_62', left, base, {
      solid: true, solidPx: FULL, emissive: 'snow',
    });
  };

  // Cierre del fondo del lote (L3): cerca de tapiales/varas en la fila 0. Si la
  // pieza tiene salida al norte, la calzada se tapa con un tapial a plomo.
  const northFence = () => {
    if (northOpen) return; // la cierra la verja sur del vecino de arriba
    // Con salida al norte, la avenida (cols 7-13) se tapa con dos tapiales: la
    // cerca no se dibuja debajo para no superponer tramos (L10).
    const gaps = northExit ? [[112, 208]] : [];
    fenceLine(0, MW, ['tapial80', 'hedge', 'fence', 'tapial48', 'hedge', 'fence'], 20, gaps);
    if (northExit) {
      for (const x of [112, 160]) obj('tapial48', x, 20, { solid: true, solidPx: FULL, alignLeft: true });
    }
  };

  // Medianeras (L3): el fondo de cada pieza queda encerrado de los costados.
  // Tres tramos cubren las filas 0-11 enteras (cada sprite son ~62 px de
  // lomo); con dos, la fila 0 del fondo se conectaba con la pieza vecina.
  const medianera = (left) => {
    for (const base of [80, 148, 176]) obj('pared_ns_62', left, base, {
      solid: true, solidPx: FULL, emissive: 'snow',
    });
  };

  const ctx = {
    type,
    openSouth,
    northOpen,
    obj, flat, mark, house, shop, verja, fenceLine, pino, arbol, poste, medano, auto,
    papeles, southVerja, sideWall, northFence, medianera,
    // Cierra la pieza: medianeras, fondos y los lados sin vecino. Va al final
    // para que las cercas queden encima del decorado de la misma base.
    enclose: () => {
      medianera(0);
      medianera(MW - SIZE.pared_ns_62[0]);
      northFence();
      if (!westOpen) sideWall(0);
      if (!eastOpen) sideWall(MW - SIZE.pared_ns_62[0]);
    },
    markExitHome: () => mark('exitHome', 66, 176, { w: 32, h: 20 }),
  };
  return { grid, objects, marks, ctx };
}

// ---------------------------------------------------------------- 1. La casa de Juan
function casa(opts = {}) {
  const p = build('casa', [
    'SSSSSSSSSSSSSSSSSSSS',
    'SSSSSSSSSSSSSSSSSSSS',
    'SSSSSSSSSSSSSSSSSSSS',
    'SSSSSSSSSSSSSSSSSSSS',
    'SSSSSSSSSSSSSSSSSSSS',
    'SSSSSSSSSSSSSSSSSSSS',
    'SSSSSSSSSSSSSSSSSSSS',
    'SSSSSSSSSSSSSSSSSSSS',
    'SSSSSSSSSSSSSSSSSSSS',
    'SSSSSSSSSSSSSSSSSSSS',
    'SSSSSSSSSSSSSSSSSSSS',
    // fila 11: pasto solido con el porton lateral de 3 baldosas (cols 9-11)
    'gggggggggSSSgggggggg',
    'vvvvvvvvvvvvvvvvvvvv',
    'vvvvvvvvvvvvvvvvvvvv',
    'vvvvvvvvvvvvvvvvvvvv',
    'rrrrrrrrrrrrrrrrrrrr',
    'rrrrrrrrrrrrrrrrrrrr',
    'rrrrrrrrrrrrrrrrrrrr',
    'vvvvvvvvvvvvvvvvvvvv',
    'SSSSSSSSSSSSSSSSSSSS',
  ], opts);
  const {
    house, obj, fenceLine, pino, arbol, poste, medano, auto, papeles, southVerja,
  } = p.ctx;
  // el chalet de los Salvo y su vecino, con sus verjas
  house('salvo_7', 20, 176);
  house('chalet_c', 214, 168);
  // el pino se corre al este del porton: el paso del fondo queda de 3 baldosas
  pino('pino_0', 196, 180);
  pino('pino_2', 290, 178);
  arbol('tree_b', 188, 170);
  // verja del frente con el porton lateral abierto en 144..192 (cols 9-11),
  // alineado con el pasillo entre las dos casas (L8).
  fenceLine(0, MW, ['tapial80', 'gate', 'tapial48', 'fence', 'tapial48',
    'gate', 'tapial48'], 192, [[144, 192]]);
  obj('mailbox', 56, 200, { solid: true, solidPx: FULL });
  obj('bush30', 110, 190, { solid: true, solidPx: FULL, emissive: 'snow' });
  // la farola se corre al oeste del portón lateral (L8): el paso queda libre
  poste('farola', 112, 222);
  // la calzada: el auto tapado de nieve y Polsky (si la historia lo mato)
  auto('sedan_teal_snow', 214, 282);
  obj('polsky_caido', 120, 262, { showIfFlag: 'polsky_muerto' });
  medano(20, 268);
  medano(168, 254);
  papeles([[96, 226], [180, 250], [40, 300]]);
  southVerja(0, MW, 0);
  for (const x of [30, 262]) arbol('arbol_vereda', x, 236);
  p.ctx.markExitHome();
  p.ctx.enclose();
  return { type: p.type, grid: p.grid, objects: p.objects, marks: p.marks };
}

// ---------------------------------------------------------------- 2. La esquina del choque
function esquina(opts = {}) {
  const p = build('esquina', [
    'SSSSSSSvvrrrvvSSSSSS',
    'SSSSSSSvvrrrvvSSSSSS',
    'SSSSSSSvvrrrvvSSSSSS',
    'SSSSSSSvvrrrvvSSSSSS',
    'SSSSSSSvvrrrvvSSSSSS',
    'SSSSSSSvvrrrvvSSSSSS',
    'SSSSSSSvvrrrvvSSSSSS',
    'SSSSSSSvvrrrvvSSSSSS',
    'SSSSSSSvvrrrvvSSSSSS',
    'SSSSSSSvvrrrvvSSSSSS',
    'SSSSSSSvvrrrvvSSSSSS',
    'vvvvvvvvvrrrvvgggggg',
    'vvvvvvvvvrrrvvvvvvvv',
    'vvvvvvvvvrrrvvvvvvvv',
    'vvvvvvvvvrrrvvvvvvvv',
    'rrrrrrrrrrrrrrrrrrrr',
    'rrrrrrrrrrrrrrrrrrrr',
    'rrrrrrrrrrrrrrrrrrrr',
    'vvvvvvvvvvvvvvvvvvvv',
    'SSSSSSSSSSSSSSSSSSSS',
  ], opts);
  const {
    house, shop, obj, fenceLine, pino, arbol, poste, medano, auto, papeles, southVerja,
  } = p.ctx;
  // la ferreteria en la ochava, del lado izquierdo de la bocacalle
  pino('pino_3', -6, 150);
  shop('shop_ferreteria', 26, 184);
  obj('crate', 4, 196, { solid: true, solidPx: FULL });
  obj('box', 6, 184, { solid: true, solidPx: FULL });
  obj('bicicleta', 74, 204, { solid: true, solidPx: FULL });
  obj('fallen_1', 46, 210); // decorado: se puede pisar
  // la caja de municiones: el solido lo pone la arena desde la marca (C2),
  // asi no hay dos cajas de 16x16 desfasadas.
  obj('crate', 104, 200, { type: 'container', name: 'la caja de municiones' });
  p.ctx.mark('loot', 112, 192);
  p.ctx.mark('crate', 112, 192);
  obj('buzon_correo', 116, 232, { solid: true, solidPx: FULL });
  for (const [x, b] of [[106, 70], [106, 150], [206, 40]]) arbol('arbol_vereda', x, b);
  // del otro lado de la bocacalle, un chalet con su cerco
  house('chalet_b', 232, 168);
  arbol('tree_a', 214, 150);
  // el cerco del chalet, solo del lado este: la vereda de la ferreteria queda
  // abierta como en el concepto (la bocacalle sube por el medio).
  fenceLine(0, MW, ['hedge', 'gate', 'fence', 'tapial48'], 192, [[0, 224]]);
  // la bocacalle que sube: nieve acumulada y un auto abandonado
  medano(150, 70);
  obj('snow_drift', 156, 30); // decorado
  papeles([[152, 120], [170, 160], [60, 230]]);
  // el choque en la esquina: volcado en el cruce y el de trompa contra la farola
  poste('farola', 222, 214);
  obj('cartel_esquina', 212, 214, { solid: true, solidPx: POST.cartel_esquina });
  auto('auto_parado', 236, 292);
  auto('auto_volcado', 122, 284);
  obj('figure_snow', 70, 258); // bulto de nieve: decorado
  medano(12, 300);
  southVerja(0, MW, 2);
  p.ctx.enclose();
  return { type: p.type, grid: p.grid, objects: p.objects, marks: p.marks };
}

// ---------------------------------------------------------------- 3. La plaza
const PLAZA_SEGS = [
  [20, 14, 160, 118], [300, 14, 160, 118],
  [20, 206, 160, 118], [300, 206, 160, 118],
];

function nearSeg(px, py, [x0, y0, x1, y1], half) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / len));
  const qx = x0 + t * dx;
  const qy = y0 + t * dy;
  return Math.hypot(px - qx, py - qy) <= half;
}

// Los caminos de nieve pisada del concepto: rotonda, avenida norte-sur y diagonales.
export function inPlazaPath(tx, ty) {
  const px = tx * 16 + 8;
  const py = ty * 16 + 8;
  if (Math.hypot(px - 160, py - 118) <= 38) return true;
  if (Math.abs(px - 160) <= 24 && py >= 0 && py <= 212) return true; // 48 px, como el paso
  return PLAZA_SEGS.some((seg) => nearSeg(px, py, seg, 9));
}

function plaza(opts = {}) {
  const p = build('plaza', [
    'SSSSSSSSSSSSSSSSSSSS',
    'SSSSSSSSSSSSSSSSSSSS',
    'SSSSSSSSSSSSSSSSSSSS',
    'SSSSSSSSSSSSSSSSSSSS',
    'SSSSSSSSSSSSSSSSSSSS',
    'SSSSSSSSSSSSSSSSSSSS',
    'SSSSSSSSSSSSSSSSSSSS',
    'SSSSSSSSSSSSSSSSSSSS',
    'SSSSSSSSSSSSSSSSSSSS',
    'SSSSSSSSSSSSSSSSSSSS',
    'SSSSSSSSSSSSSSSSSSSS',
    'SSSSSSSSSSSSSSSSSSSS',
    'SSSSSSSSSSSSSSSSSSSS',
    'vvvvvvvvvvvvvvvvvvvv',
    'vvvvvvvvvvvvvvvvvvvv',
    'rrrrrrrrrrrrrrrrrrrr',
    'rrrrrrrrrrrrrrrrrrrr',
    'rrrrrrrrrrrrrrrrrrrr',
    'vvvvvvvvvvvvvvvvvvvv',
    'SSSSSSSSSSSSSSSSSSSS',
  ], opts);
  const {
    obj, pino, arbol, poste, medano, auto, papeles, southVerja,
  } = p.ctx;
  // baranda baja alrededor, con la entrada en el medio
  for (let x = 0; x < MW; x += 32) {
    if (x >= 128 && x < 192) continue;
    // el ultimo tramo se recorta al borde de la pieza (no invade la vecina).
    const left = Math.min(x, MW - SIZE.baranda[0]);
    obj('baranda', left, 210, { solid: true, solidPx: FULL, alignLeft: true });
  }
  // el busto en el centro de la rotonda, bancos en los caminos
  obj('busto', 151, 130, { solid: true, solidPx: FULL });
  for (const [x, y] of [[96, 92], [194, 92], [96, 168], [194, 168]]) {
    obj('banco_plaza', x, y, { solid: true, solidPx: FULL });
  }
  obj('hamaca', 248, 64, { solid: true, solidPx: FULL });
  // arboles grandes: pinos y los pelados de invierno
  for (const [sprite, x, b] of [['pino_0', 10, 70], ['pino_2', 270, 118],
    ['pino_1', 40, 190], ['pino_3', 262, 196]]) pino(sprite, x, b);
  for (const [x, b] of [[100, 40], [206, 46], [24, 130]]) arbol('tree_b', x, b);
  arbol('tree_a', 228, 172);
  poste('streetlight', 128, 72);
  poste('streetlight', 180, 162);
  // medianos: la plaza es abierta, salen de todos lados
  medano(60, 54);
  medano(226, 150);
  medano(130, 196);
  obj('fallen_2', 170, 60);
  papeles([[110, 150], [220, 90], [60, 230], [250, 236]]);
  auto('sedan_bordo_snow', 30, 284);
  // L4: la plaza premia explorarla. Botin junto al busto y a la hamaca.
  p.ctx.mark('loot', 136, 142);
  p.ctx.mark('loot', 236, 88);
  southVerja(0, MW, 4);
  p.ctx.enclose();
  return { type: p.type, grid: p.grid, objects: p.objects, marks: p.marks };
}

// ---------------------------------------------------------------- 4. Las vias
function vias(opts = {}) {
  const p = build('vias', [
    'SSSSSSSvvrrrvvSSSSSS',
    'SSSSSSSvvrrrvvSSSSSS',
    'SSSSSSSvvrrrvvSSSSSS',
    'SSSSSSSvvrrrvvSSSSSS',
    'SSSSSSSvvrrrvvSSSSSS',
    'tttttttttttttttttttt',
    'tttttttttttttttttttt',
    'tttttttttttttttttttt',
    'tttttttttttttttttttt',
    'SSSSSSSvvrrrvvSSSSSS',
    'SSSSSSSvvrrrvvSSSSSS',
    'gggggggvvrrrvvgggggg',
    'vvvvvvvvvrrrvvvvvvvv',
    'vvvvvvvvvrrrvvvvvvvv',
    'vvvvvvvvvrrrvvvvvvvv',
    'rrrrrrrrrrrrrrrrrrrr',
    'rrrrrrrrrrrrrrrrrrrr',
    'rrrrrrrrrrrrrrrrrrrr',
    'vvvvvvvvvvvvvvvvvvvv',
    'SSSSSSSSSSSSSSSSSSSS',
  ], opts);
  const {
    house, obj, fenceLine, pino, arbol, medano, papeles, southVerja,
  } = p.ctx;
  // Alambrado a los dos lados de las vias, abierto en el paso a nivel: el
  // hueco queda exacto en 144..192 (48 px), igual que el tablon de cols 9-11.
  const ALAMBRADO_ROWS = [80, 152];
  const alambrado = (x, extra = {}) => {
    for (const base of ALAMBRADO_ROWS) {
      obj('alambrado', x, base, {
        solid: true, solidPx: FULL, alignLeft: true, ...extra,
      });
    }
  };
  // El alambrado mide 33 px pero el dibujo se repite cada 32: los tramos se
  // apoyan 1 px. 144 no es multiplo de 32, asi que el ultimo tramo va en 111
  // (111+33 = 144, el borde del paso) y espejado para que sus postes caigan en
  // 125 y 141 y no encima de los del tramo anterior (97 y 113): sin "verja
  // doble" visible (C10) y con el hueco del paso a nivel en 48 px (C3).
  for (const x of [0, 32, 64, 96]) alambrado(x);
  alambrado(111, { flipX: true });                    // 111..144
  for (const x of [192, 224, 256, 287]) alambrado(x); // 192..320
  // el vagon detenido tapa media via: hay que rodearlo
  obj('vagon', 18, 124, { solid: true, solidPx: FULL });
  obj('barrera_caida', 196, 84, { solid: true, solidPx: FULL });
  obj('barrera_alta', 120, 160, { solid: true, solidPx: POST.barrera_alta });
  obj('cruz_san_andres', 120, 80, { solid: true, solidPx: POST.cruz_san_andres });
  obj('cruz_san_andres', 196, 156, {
    flipX: true, solid: true, solidPx: POST.cruz_san_andres,
  });
  obj('garita', 238, 78, { solid: true, solidPx: FULL });
  // abajo, las casas de la cuadra con su verja; arriba, fondos de terrenos
  house('chalet_c', 24, 186);
  house('chalet_d', 226, 186);
  // la verja del frente se corta en el borde (nunca invade la pieza vecina) y
  // deja libre la avenida de cols 7-13.
  fenceLine(0, MW, ['tapial80', 'gate', 'tapial48', 'fence', 'hedge'], 192, [[112, 208]]);
  for (const [sprite, x, b] of [['pino_1', 40, 70], ['pino_3', 250, 66]]) pino(sprite, x, b);
  arbol('tree_b', 210, 40);
  obj('hedge', 0, 70, { solid: true, solidPx: FULL });
  obj('hedge', 288, 70, { solid: true, solidPx: FULL }); // 288+32 = 320: cierra en el borde
  // L9: los rieles no mueren contra el lote: la nieve los tapa en las puntas
  // (las medianeras de `enclose` los cortan contra la pared).
  obj('snow_mound', 16, 144, { emissive: 'snow' });
  obj('snow_mound', 272, 144, { emissive: 'snow' });
  medano(80, 40);
  medano(150, 300);
  papeles([[160, 40], [230, 230], [60, 240]]);
  obj('fallen_0', 252, 110); // decorado: se puede pisar
  // botín en la franja norte, sobre el balasto y lejos del techo del chalet
  p.ctx.mark('loot', 270, 92);
  southVerja(0, MW, 1);
  p.ctx.enclose();
  return { type: p.type, grid: p.grid, objects: p.objects, marks: p.marks };
}

// ---------------------------------------------------------------- 5. La cortada
function cortada(opts = {}) {
  const p = build('cortada', [
    'SSSSSSSSSSSSSSSSSSSS',
    'SSSSSSSSSSSSSSSSSSSS',
    'SSSSSSSSSSSSSSSSSSSS',
    'SSSSSSSSSSSSSSSSSSSS',
    'SSSSSSSSSSSSSSSSSSSS',
    'SSSSSbbbbbbbbbbSSSSS',
    'SSSSSbbbbbbbbbbSSSSS',
    'SSSSSbbbbbbbbbbSSSSS',
    'SSSSSSSSbbbbSSSSSSSS',
    'SSSSSSSSbbbbSSSSSSSS',
    'SSSSSSSSbbbbSSSSSSSS',
    'ggggggggbbbbgggggggg',
    'vvvvvvvvbbbbvvvvvvvv',
    'vvvvvvvvvvvvvvvvvvvv',
    'vvvvvvvvvvvvvvvvvvvv',
    'rrrrrrrrrrrrrrrrrrrr',
    'rrrrrrrrrrrrrrrrrrrr',
    'rrrrrrrrrrrrrrrrrrrr',
    'vvvvvvvvvvvvvvvvvvvv',
    'SSSSSSSSSSSSSSSSSSSS',
  ], opts);
  const {
    house, shop, obj, flat, fenceLine, pino, arbol, poste, medano, auto, papeles,
    southVerja,
  } = p.ctx;
  // el almacen al fondo del pasaje, con la vidriera rota
  arbol('tree_b', 64, 70);
  pino('pino_1', 236, 80);
  shop('almacen_roto', 120, 84);
  flat('vidrios', 140, 86);
  obj('fallen_2', 172, 98); // el cliente caido en la puerta: decorado
  obj('bottle', 112, 98); // decorado
  // el cajon se corre al fondo del lote: el paso oculto entre el patio y la
  // franja de arriba queda libre (L3).
  obj('cajon_frutas', 56, 76, { solid: true, solidPx: FULL });
  // los cajones del lado este van al fondo del lote: el paso alrededor del
  // almacen queda libre y el fondo no se convierte en un bolson (L3).
  obj('cajon_frutas', 252, 100, { solid: true, solidPx: FULL });
  obj('crate', 272, 90, { solid: true, solidPx: FULL });
  obj('trash', 292, 100, { solid: true, solidPx: FULL });
  p.ctx.mark('loot', 160, 104);
  p.ctx.mark('loot', 104, 92);
  // paredes de ladrillo: el patio del fondo y el pasaje angosto. Las dos del
  // callejon se corren 4 px para afuera: el paso queda en 4 baldosas (64 px)
  // y el acorazado no se traba en la boca (L6).
  obj('pared_eo_48', 80, 130, { solid: true, solidPx: FULL });
  obj('pared_eo_48', 192, 130, { solid: true, solidPx: FULL });
  obj('pared_ns_48', 236, 128, { solid: true, solidPx: FULL });
  obj('pared_ns_62', 118, 198, { solid: true, solidPx: FULL });
  obj('pared_ns_62', 190, 198, { solid: true, solidPx: FULL });
  // tapiales que cierran los recovecos entre las casas y el callejon: si no,
  // quedaban dos bolsones de 3 baldosas inalcanzables a los costados.
  for (const x of [80, 192]) {
    for (const base of [156, 176]) obj('tapial48', x, base, { solid: true, solidPx: FULL });
  }
  // una farola sola en el pasaje y el rastro de alguien que entro
  poste('streetlight', 126, 164);
  papeles([[150, 112], [172, 150]]);
  medano(168, 140);
  // a los costados, casas con sus verjas
  house('chalet_d', 8, 176);
  house('chalet_c', 232, 168);
  // la verja del frente deja libre la boca del callejon en cols 8-11.
  fenceLine(0, MW, ['tapial80', 'tapial48', 'gate', 'tapial48'], 192, [[128, 192]]);
  obj('cartel_esquina', 110, 214, { solid: true, solidPx: POST.cartel_esquina });
  for (const x of [40, 262]) arbol('arbol_vereda', x, 236);
  auto('sedan_crema_snow', 40, 282);
  medano(250, 270);
  southVerja(0, MW, 3);
  p.ctx.enclose();
  return { type: p.type, grid: p.grid, objects: p.objects, marks: p.marks };
}

export const PIECES = {
  casa, esquina, plaza, vias, cortada,
};

// Baldosa del piso para una letra de la grilla del concepto.
// gx,gy son globales (solo para variar la nieve y el balasto entre piezas).
export function tileFor(type, tx, ty, letter, gx, gy) {
  if (letter === 'S') {
    if (type === 'plaza' && inPlazaPath(tx, ty)) return pick('nieve_pisada', gx, gy, 2);
    return pick('snow', gx, gy, 6);
  }
  if (letter === 'g') return 'grass_0';
  if (letter === 'v') {
    // cordon en la fila 14 (frente a la calzada) y en la 18 (vereda de enfrente)
    if (ty === 14 || ty === 18) return 'curb_0';
    return `sidewalk_${(tx + ty) % 2}`;
  }
  if (letter === 'r') return pick('road', gx, gy, 2);
  if (letter === 'b') return (tx + ty) % 2 ? 'tile_0' : 'tile_1';
  if (letter === 't') {
    if (ty === 5 || ty === 7) return tx >= 9 && tx <= 11 ? 'via_tablon_0' : 'via_0';
    return pick('balasto', gx, gy, 3);
  }
  return pick('snow', gx, gy, 6);
}

export { put };
