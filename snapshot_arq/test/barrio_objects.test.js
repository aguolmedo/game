// Sólidos del barrio pegados al dibujo (fix 1B: C1, C3, C4, C5, C6, C8, C10).
// Datos puros + los PNG de los atlases: no hay DOM ni Three.js de por medio.
//
// El contrato es el del análisis (docs/analisis_roguelike.md, sección 2):
// el rect que frena es el mismo que se ve, con el `offset` del sprite incluido,
// y con menos de 2 px de error. Los objetos de los mapas viejos (sin
// `solidPx`) siguen usando su rect de baldosas: el arreglo es opt-in.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { buildBarrio } from '../src/maps/barrio/index.js';
import { PIECES } from '../src/maps/barrio/pieces.js';
import { SIZE } from '../src/maps/barrio/sizes.js';
import {
  FULL, TILE, drawOrigin, solidRectFor, solidRectsOf,
} from '../src/maps/solid.js';
import { WorldMap } from '../src/mapView.js';

const SEEDS = [1, 3455, 8];
const MW = 320; // ancho de una pieza (20 baldosas)

// --- PNG de los atlases (mismo decodificador que test/chars_walk.test.js) ---

/** Decodifica un PNG RGBA 8 bits (el que escribe PIL). */
function decodePng(buf) {
  assert.equal(buf.toString('latin1', 1, 4), 'PNG', 'no es un PNG');
  let pos = 8;
  let w = 0; let h = 0; const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('latin1', pos + 4, pos + 8);
    const body = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') { w = body.readUInt32BE(0); h = body.readUInt32BE(4); } else if (type === 'IDAT') idat.push(body);
    pos += 12 + len;
  }
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
  return {
    w, h, alpha: (x, y) => out[(y * w + x) * bpp + 3],
  };
}

const ATLASES = ['objects', 'interior2', 'props', 'street2', 'houses', 'fx'];
const sheets = new Map();
function atlas(name) {
  if (!sheets.has(name)) {
    const url = (ext) => new URL(`../public/assets/${name}.${ext}`, import.meta.url);
    const frames = JSON.parse(fs.readFileSync(url('json'), 'utf8')).frames;
    sheets.set(name, { frames, img: decodePng(fs.readFileSync(url('png'))) });
  }
  return sheets.get(name);
}

/** [x,y,w,h] del frame en su atlas. */
function frameOf(sprite) {
  for (const name of ATLASES) {
    const f = atlas(name).frames[sprite];
    if (f) return Array.isArray(f) ? f : [f.x, f.y, f.w, f.h];
  }
  throw new Error(`falta el sprite ${sprite}`);
}

const trims = new Map();
/** BBox de los pixeles opacos del frame (lo mismo que opaqueRect de sprite.js). */
function trimOf(sprite) {
  if (trims.has(sprite)) return trims.get(sprite);
  const [fx, fy, fw, fh] = frameOf(sprite);
  const img = ATLASES.map(atlas).find((a) => a.frames[sprite]).img;
  let x0 = fw; let y0 = fh; let x1 = -1; let y1 = -1;
  for (let j = 0; j < fh; j += 1) {
    for (let i = 0; i < fw; i += 1) {
      if (img.alpha(fx + i, fy + j) <= 16) continue;
      if (i < x0) x0 = i;
      if (i > x1) x1 = i;
      if (j < y0) y0 = j;
      if (j > y1) y1 = j;
    }
  }
  const out = x1 >= x0 && y1 >= y0 ? { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 } : null;
  trims.set(sprite, out);
  return out;
}

/** Rect que dibuja mapView.layout para un objeto (sin el margen del cursor). */
function drawnRect(obj) {
  const size = SIZE[obj.sprite];
  const org = drawOrigin(obj, size);
  return {
    x: org.x, y: org.y, w: size[0], h: size[1],
  };
}

/** Todos los objetos que puede tener el barrio (las 5 piezas, con y sin sur). */
const allObjs = () => Object.keys(PIECES).flatMap((type) => [false, true].flatMap(
  (openSouth) => PIECES[type]({ openSouth }).objects,
));
const solidObjs = () => allObjs().filter((o) => o.solid && SIZE[o.sprite]);
const solidOf = (obj) => solidRectFor(obj, SIZE[obj.sprite], trimOf(obj.sprite));

// Sprites que el análisis citó uno por uno (C1, C5, C6).
const ANALYSIS_SPRITES = [
  'salvo_7', 'chalet_b', 'chalet_c', 'chalet_d', 'shop_ferreteria', 'almacen_roto',
  'tree_a', 'tree_b', 'arbol_vereda', 'pino_0', 'pino_1', 'pino_2', 'pino_3',
  'crate', 'box', 'cajon_frutas', 'trash', 'mailbox', 'buzon_correo', 'bicicleta',
  'bush30', 'alambrado', 'fence', 'hedge', 'tapial48', 'tapial80', 'gate',
  'cartel_esquina', 'baranda', 'banco_plaza', 'busto', 'hamaca',
  'auto_parado', 'auto_volcado', 'vagon', 'sedan_teal_snow', 'sedan_crema_snow',
  'sedan_bordo_snow', 'barrera_alta', 'barrera_caida', 'cruz_san_andres',
  'garita', 'pared_eo_48', 'pared_ns_48', 'pared_ns_62', 'streetlight', 'farola',
];

test('C1: el sólido cae dentro del rect dibujado (el offset incluido)', () => {
  const objs = solidObjs();
  assert.ok(objs.length > 80, 'faltan objetos sólidos en las piezas');
  for (const obj of objs) {
    const rect = solidOf(obj);
    const draw = drawnRect(obj);
    assert.ok(rect, `${obj.sprite} (${obj.id}): sin rect sólido`);
    assert.ok(rect.w > 0 && rect.h > 0, `${obj.sprite}: sólido vacío`);
    assert.ok(rect.x >= draw.x && rect.y >= draw.y,
      `${obj.sprite}: el sólido se sale del dibujo (${rect.x},${rect.y} vs ${draw.x},${draw.y})`);
    assert.ok(rect.x + rect.w <= draw.x + draw.w && rect.y + rect.h <= draw.y + draw.h,
      `${obj.sprite}: el sólido se sale del dibujo por abajo/derecha`);
  }
});

test('el barrio entero: todo objeto sólido declara su huella (nada de rect de baldosas)', () => {
  for (const seed of SEEDS) {
    for (const obj of buildBarrio(seed).map.objects) {
      if (!obj.solid) continue;
      assert.ok(obj.solidPx, `semilla ${seed}: ${obj.sprite} (${obj.id}) quedó con el rect de baldosas`);
    }
  }
});

test('C1/C5: la huella completa es el dibujo opaco (0 px de error)', () => {
  const seen = new Set();
  const objs = solidObjs();
  for (const obj of objs) {
    if (obj.solidPx !== FULL) continue;
    seen.add(obj.sprite);
    const rect = solidOf(obj);
    const draw = drawnRect(obj);
    const trim = trimOf(obj.sprite);
    // El recorte opaco es el que usa el juego (layout().trim): las casas, los
    // autos y las verjas frenan exactamente lo que se ve, offset incluido.
    assert.ok(Math.abs(rect.x - (draw.x + trim.x)) <= 1, `${obj.sprite}: borde izquierdo`);
    assert.ok(Math.abs(rect.y - (draw.y + trim.y)) <= 1, `${obj.sprite}: borde de arriba`);
    assert.ok(Math.abs((rect.x + rect.w) - (draw.x + trim.x + trim.w)) <= 1,
      `${obj.sprite}: borde derecho`);
    assert.ok(Math.abs((rect.y + rect.h) - (draw.y + trim.y + trim.h)) <= 1,
      `${obj.sprite}: borde de abajo`);
  }
  // La lista de sprites que citó el análisis está toda cubierta (por la huella
  // completa o por la de tronco/poste).
  const all = new Set(objs.map((o) => o.sprite));
  for (const sprite of ANALYSIS_SPRITES) {
    assert.ok(all.has(sprite), `${sprite}: el análisis lo nombra y no está en las piezas`);
  }
  for (const sprite of ['salvo_7', 'chalet_c', 'shop_ferreteria', 'alambrado',
    'vagon', 'auto_parado', 'baranda', 'banco_plaza', 'busto', 'hamaca']) {
    assert.ok(seen.has(sprite), `${sprite}: no se probó la huella completa`);
  }
});

/** Objeto de prueba con un offset como el real (para probar un sprite suelto). */
function objWith(sprite, extra = {}) {
  const size = SIZE[sprite];
  return {
    id: `test_${sprite}`,
    sprite,
    x: 4,
    y: 4,
    tw: Math.max(1, Math.round(size[0] / 16)),
    th: Math.max(1, Math.round(size[1] / 16)),
    offset: [3, -5],
    ...extra,
  };
}

test('C5: troncos y postes frenan el tronco, no el aire de al lado', () => {
  const seen = new Set();
  for (const obj of solidObjs()) {
    if (obj.solidPx === FULL) continue;
    seen.add(obj.sprite);
    const local = obj.solidPx;
    const size = SIZE[obj.sprite];
    const [fx, fy] = frameOf(obj.sprite);
    const img = ATLASES.map(atlas).find((a) => a.frames[obj.sprite]).img;
    // Píxeles opacos dentro de las filas de la huella (el tronco/postal).
    let cols = [];
    let opacos = 0;
    let total = 0;
    for (let j = local.y; j < local.y + local.h; j += 1) {
      for (let i = 0; i < size[0]; i += 1) {
        const on = img.alpha(fx + i, fy + j) > 16;
        if (!on) continue;
        total += 1;
        if (i >= local.x && i < local.x + local.w) {
          opacos += 1;
          cols.push(i);
        }
      }
    }
    assert.ok(total > 0, `${obj.sprite}: la huella no toca ningún píxel del dibujo`);
    const c0 = Math.min(...cols);
    const c1 = Math.max(...cols);
    assert.ok(Math.abs(c0 - local.x) <= 1, `${obj.sprite}: el tronco arranca en ${c0}, el sólido en ${local.x}`);
    assert.ok(Math.abs(c1 - (local.x + local.w - 1)) <= 1,
      `${obj.sprite}: el tronco termina en ${c1}, el sólido en ${local.x + local.w - 1}`);
    assert.ok(opacos / total >= 0.9, `${obj.sprite}: el sólido deja ${total - opacos} px del tronco afuera`);
    // Y la huella apoya en el pie dibujado (menos de 2 px).
    const rect = solidOf(obj);
    const draw = drawnRect(obj);
    assert.ok(Math.abs((rect.y + rect.h) - (draw.y + draw.h)) <= 2,
      `${obj.sprite}: la huella no apoya en la base`);
  }
  for (const sprite of ['tree_a', 'tree_b', 'arbol_vereda', 'pino_0', 'pino_1',
    'pino_2', 'pino_3', 'cartel_esquina', 'cruz_san_andres', 'barrera_alta',
    'farola', 'streetlight']) {
    assert.ok(seen.has(sprite), `${sprite}: no se probó la huella de tronco/poste`);
  }
});

test('C1: el sólido usa la misma esquina que el dibujo (layout)', () => {
  // WorldMap.layout dibuja con mesh.position=(px,py) y un plano w x h centrado.
  const layout = WorldMap.prototype.layout;
  for (const [sprite, offset] of [['chalet_c', [7, -3]], ['tree_a', [-11, 4]],
    ['alambrado', [11, 2]], ['salvo_7', [-6, 0]]]) {
    const size = SIZE[sprite];
    const obj = objWith(sprite, { offset });
    obj.mesh = {
      geometry: { parameters: { width: size[0], height: size[1] } },
      userData: { frame: [0, 0, size[0], size[1]], sheet: { image: null } },
    };
    const box = layout.call({}, obj);
    const org = drawOrigin(obj, size);
    const meshLeft = Math.round(box.px - box.w / 2);
    const meshTop = Math.round(box.py - box.h / 2);
    assert.ok(Math.abs(org.x - meshLeft) <= 0, `${sprite}: el sólido no usa la x del mesh`);
    assert.ok(Math.abs(org.y - meshTop) <= 0, `${sprite}: el sólido no usa la y del mesh`);
  }
});

test('el arreglo es opt-in: sin solidPx sigue el rect de baldosas de siempre', () => {
  const size = SIZE.chalet_c;
  const mesh = {
    geometry: { parameters: { width: size[0], height: size[1] } },
    userData: { frame: [0, 0, size[0], size[1]], sheet: { image: null } },
  };
  const legacy = {
    id: 'viejo', sprite: 'chalet_c', x: 4, y: 6, tw: 4, th: 4, offset: [9, -9], solid: true, mesh,
  };
  const barrioObj = {
    id: 'nuevo', sprite: 'chalet_c', x: 4, y: 6, tw: 4, th: 4, offset: [9, -9], solid: true, solidPx: FULL, mesh,
  };
  const world = {
    map: { objects: [legacy, barrioObj] },
    solids: [],
    layout: WorldMap.prototype.layout,
  };
  WorldMap.prototype.rebuildSolids.call(world);
  const old = world.solids.find((s) => s.id === 'viejo');
  const neo = world.solids.find((s) => s.id === 'nuevo');
  assert.deepEqual(
    { x: old.x, y: old.y, w: old.w, h: old.h },
    { x: 4 * TILE, y: 6 * TILE, w: 4 * TILE, h: 4 * TILE },
    'un objeto sin solidPx tiene que conservar su rect de baldosas',
  );
  const org = drawOrigin(barrioObj, size);
  assert.deepEqual(
    { x: neo.x, y: neo.y, w: neo.w, h: neo.h },
    { x: org.x, y: org.y, w: size[0], h: size[1] },
    'con solidPx el sólido sale del dibujo',
  );
});

test('C8: flipX espeja el sólido como espeja el dibujo', () => {
  const size = [32, 40];
  const obj = {
    x: 0, y: 0, tw: 2, th: 3, offset: [0, 0], solidPx: { x: 3, y: 20, w: 6, h: 12 },
  };
  const a = solidRectFor(obj, size);
  const b = solidRectFor({ ...obj, flipX: true }, size);
  assert.equal(a.y, b.y, 'flipX no mueve la huella en vertical');
  assert.equal(a.w, b.w);
  assert.equal(b.x, a.x + (size[0] - 2 * obj.solidPx.x - obj.solidPx.w), 'la huella no está espejada');
  // Las dos cruces de San Andrés del paso a nivel: la espejada frena del otro lado.
  const cross = PIECES.vias({}).objects.filter((o) => o.sprite === 'cruz_san_andres');
  const straight = cross.find((o) => !o.flipX);
  const flipped = cross.find((o) => o.flipX);
  assert.ok(straight && flipped, 'faltan las dos cruces del paso a nivel');
  const rs = solidOf(straight);
  const rf = solidOf(flipped);
  assert.equal(rs.w, rf.w);
  const w = SIZE.cruz_san_andres[0];
  const relS = rs.x - drawOrigin(straight, SIZE.cruz_san_andres).x;
  const relF = rf.x - drawOrigin(flipped, SIZE.cruz_san_andres).x;
  assert.equal(relF, w - relS - rs.w, 'la cruz espejada no espeja su poste');
});

test('C3: el paso a nivel mide 48 px y el tablón queda alineado', () => {
  const objs = PIECES.vias({ openSouth: false }).objects;
  const fence = objs.filter((o) => o.sprite === 'alambrado')
    .map((o) => solidOf(o))
    .sort((a, b) => a.x - b.x);
  assert.ok(fence.length >= 8, 'faltan tramos de alambrado');
  const left = fence.filter((r) => r.x < 160);
  const right = fence.filter((r) => r.x >= 160);
  const gap0 = Math.max(...left.map((r) => r.x + r.w));
  const gap1 = Math.min(...right.map((r) => r.x));
  assert.equal(gap0, 144, `el alambrado de la izquierda termina en ${gap0}, no en 144`);
  assert.equal(gap1, 192, `el alambrado de la derecha arranca en ${gap1}, no en 192`);
  assert.equal(gap1 - gap0, 48, 'el paso a nivel tiene que medir 48 px');
  // Ningún sólido de las filas del alambrado invade el hueco (la verja del sur
  // también cruza el hueco en x, pero va 200 px más abajo: no cuenta).
  const fenceTop = Math.min(...fence.map((r) => r.y));
  const fenceBottom = Math.max(...fence.map((r) => r.y + r.h));
  for (const obj of objs) {
    if (!obj.solid) continue;
    const r = solidOf(obj);
    if (r.y + r.h <= fenceTop || r.y >= fenceBottom) continue;
    assert.ok(r.x + r.w <= gap0 || r.x >= gap1,
      `${obj.sprite} tapa el paso a nivel (${r.x}..${r.x + r.w})`);
  }
  // El tablón del piso cae justo en el hueco: las dos filas de las vías.
  const { map, cells } = buildBarrio(3455);
  const vias = cells.find((c) => c.type === 'vias');
  assert.ok(vias, 'la semilla 3455 no tiene pieza de vías');
  const X = vias.col * 20;
  const Y = vias.row * 20;
  for (const ty of [Y + 5, Y + 7]) {
    const cols = [];
    for (let tx = X; tx < X + 20; tx += 1) {
      if (map.floor[ty][tx] === 'via_tablon_0') cols.push((tx - X) * 16);
    }
    assert.equal(Math.min(...cols), gap0, 'el tablón no arranca donde arranca el hueco');
    assert.equal(Math.max(...cols) + 16, gap1, 'el tablón no termina donde termina el hueco');
  }
});

test('C10: las verjas no quedan dobles ni se salen de la pieza', () => {
  const FENCE = ['alambrado', 'fence', 'hedge', 'tapial48', 'tapial80', 'gate'];
  for (const type of Object.keys(PIECES)) {
    for (const openSouth of [false, true]) {
      const objs = PIECES[type]({ openSouth }).objects;
      const rects = objs.filter((o) => FENCE.includes(o.sprite))
        .map((o) => ({ o, r: solidOf(o) }));
      // Nada se sale de la pieza en horizontal.
      for (const { o, r } of rects) {
        assert.ok(r.x >= -1 && r.x + r.w <= MW + 1,
          `${type}: ${o.sprite} se sale de la pieza (${r.x}..${r.x + r.w})`);
      }
      // La verja del sur: sin superponerse y sin huecos (salvo el paso).
      const south = rects.filter(({ o }) => o.south).map(({ r }) => r)
        .sort((a, b) => a.x - b.x);
      let end = 0;
      for (const r of south) {
        const hole = r.x - end;
        const crossing = hole > 1 && hole === 48 && end === 144;
        assert.ok(hole <= 1 || crossing,
          `${type}${openSouth ? ' (abre al sur)' : ''}: hueco de ${hole} px en la verja del sur en x=${end}`);
        assert.ok(r.x === end || hole > 0, `${type}: la verja del sur se recoloca en x=${r.x}`);
        end = Math.max(end, r.x + r.w);
      }
      assert.equal(end, MW, `${type}: la verja del sur termina en ${end}, no en ${MW}`);
      // Los dos alambrados de las vías cierran justo en el borde del paso.
      const alambrado = rects.filter(({ o }) => o.sprite === 'alambrado').map(({ r }) => r);
      if (alambrado.length) {
        const left = alambrado.filter((r) => r.x < 160);
        const right = alambrado.filter((r) => r.x >= 160);
        assert.equal(Math.max(...left.map((r) => r.x + r.w)), 144, `${type}: alambrado izquierdo`);
        assert.equal(Math.min(...right.map((r) => r.x)), 192, `${type}: alambrado derecho`);
      }
    }
  }
});

test('C6: lo que se ve frenando frena, y el decorado sigue pisable', () => {
  const solids = new Set();
  const pasable = new Set();
  for (const type of Object.keys(PIECES)) {
    for (const openSouth of [false, true]) {
      for (const obj of PIECES[type]({ openSouth }).objects) {
        if (!SIZE[obj.sprite]) continue;
        (obj.solid ? solids : pasable).add(obj.sprite);
      }
    }
  }
  for (const sprite of ['box', 'mailbox', 'bicicleta', 'bush30', 'crate',
    'cajon_frutas', 'trash', 'buzon_correo']) {
    assert.ok(solids.has(sprite), `${sprite}: se atraviesa y no debería`);
  }
  for (const sprite of ['snow_mound', 'fallen_0', 'fallen_1', 'fallen_2',
    'figure_snow', 'bottle', 'papel', 'vidrios', 'snow_drift']) {
    assert.ok(pasable.has(sprite), `${sprite}: es decorado y no debería frenar`);
    assert.ok(!solids.has(sprite), `${sprite}: quedó sólido`);
  }
});

test('C4: autos y vagón frenan el cuerpo entero (decisión, no fila base)', () => {
  const CARS = ['auto_parado', 'auto_volcado', 'vagon', 'sedan_teal_snow',
    'sedan_crema_snow', 'sedan_bordo_snow'];
  const seen = new Set();
  for (const obj of solidObjs()) {
    if (!CARS.includes(obj.sprite)) continue;
    seen.add(obj.sprite);
    assert.equal(obj.solidPx, FULL, `${obj.sprite}: tiene que frenar el cuerpo entero`);
    const r = solidOf(obj);
    const draw = drawnRect(obj);
    assert.ok(r.h >= draw.h * 0.8, `${obj.sprite}: el sólido es solo la fila base (${r.h}/${draw.h})`);
  }
  for (const sprite of CARS) assert.ok(seen.has(sprite), `${sprite}: no se probó`);
});

test('solidRectsOf devuelve la misma huella que rebuildSolids', () => {
  const all = new Set();
  for (const seed of SEEDS) for (const o of buildBarrio(seed).map.objects) all.add(o);
  const objs = [...all].filter((o) => o.solid && SIZE[o.sprite]);
  const map = { objects: objs };
  const rects = solidRectsOf(map, (o) => SIZE[o.sprite], (o) => trimOf(o.sprite));
  assert.equal(rects.length, objs.length);
  for (let i = 0; i < objs.length; i += 1) {
    const want = solidOf(objs[i]);
    assert.deepEqual(
      { x: rects[i].x, y: rects[i].y, w: rects[i].w, h: rects[i].h },
      { x: want.x, y: want.y, w: want.w, h: want.h },
      `${objs[i].sprite}: huella distinta`,
    );
  }
});

test('C3/C9: con la caja de pies y los objetos se cruza el paso y se llega a la calzada', () => {
  const solidTiles = new Set(['black', 'grass_', 'estatica_']);
  const tileNameSolid = (name) => [...solidTiles].some((p) => name === p || name.startsWith(p));
  const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  for (const seed of SEEDS) {
    const { map, cells } = buildBarrio(seed);
    const boxes = map.objects.filter((o) => o.solid && SIZE[o.sprite])
      .map((o) => solidRectFor(o, SIZE[o.sprite], trimOf(o.sprite)));
    // La caja de los pies del jugador (src/movement.js: 10x6 al pie).
    const feetFree = (px, py) => {
      const box = {
        x: px - 5, y: py - 6, w: 10, h: 6,
      };
      for (const b of boxes) if (hit(box, b)) return false;
      const x0 = Math.floor(box.x / TILE); const x1 = Math.floor((box.x + box.w - 0.01) / TILE);
      const y0 = Math.floor(box.y / TILE); const y1 = Math.floor((box.y + box.h - 0.01) / TILE);
      for (let y = y0; y <= y1; y += 1) {
        for (let x = x0; x <= x1; x += 1) {
          const name = map.floor[y] && map.floor[y][x];
          if (!name || tileNameSolid(name)) return false;
        }
      }
      return true;
    };
    const free = Array.from({ length: map.rows }, () => new Uint8Array(map.cols));
    for (let y = 0; y < map.rows; y += 1) {
      for (let x = 0; x < map.cols; x += 1) {
        free[y][x] = feetFree(x * 16 + 8, y * 16 + 12) ? 1 : 0;
      }
    }
    const seen = Array.from({ length: map.rows }, () => new Uint8Array(map.cols));
    const sx = Math.floor(map.spawn.x / 16);
    const sy = Math.floor(map.spawn.y / 16);
    assert.equal(free[sy][sx], 1, `semilla ${seed}: el spawn cae en un sólido`);
    const q = [[sx, sy]];
    seen[sy][sx] = 1;
    while (q.length) {
      const [x, y] = q.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx; const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= map.cols || ny >= map.rows) continue;
        if (seen[ny][nx] || !free[ny][nx]) continue;
        seen[ny][nx] = 1;
        q.push([nx, ny]);
      }
    }
    const tx = (px) => Math.floor(px / TILE);
    const ty = (py) => Math.floor(py / TILE);
    const reachable = (px, py) => Boolean(seen[ty(py)] && seen[ty(py)][tx(px)]);
    // Nodos alcanzables en un radio de 2 baldosas (lo que hace reachableGround).
    const near = (px, py, r = 2) => {
      for (let dy = -r; dy <= r; dy += 1) {
        for (let dx = -r; dx <= r; dx += 1) {
          const nx = tx(px) + dx; const ny = ty(py) + dy;
          if (seen[ny] && seen[ny][nx]) return true;
        }
      }
      return false;
    };
    const exit = map.exitHome;
    assert.ok(reachable(exit.x + exit.w / 2, exit.y + exit.h), `semilla ${seed}: no se llega al portón`);
    if (map.crate) assert.ok(reachable(map.crate.x, map.crate.y), `semilla ${seed}: no se llega a la caja`);
    for (const [name, p] of Object.entries(map.spawns)) {
      assert.ok(near(p.x, p.y), `semilla ${seed}: la boca ${name} quedó encerrada`);
    }
    for (const l of map.loot) assert.ok(near(l.x, l.y), `semilla ${seed}: el botín (${l.cell}) quedó encerrado`);
    // La calzada de cada pieza: al menos una baldosa alcanzable en la banda.
    for (const cell of cells) {
      const X = cell.col * 20; const Y = cell.row * 20;
      let ok = false;
      for (let y = Y + 15; y <= Y + 17 && !ok; y += 1) {
        for (let x = X + 3; x <= X + 17 && !ok; x += 1) ok = Boolean(seen[y][x]);
      }
      assert.ok(ok, `semilla ${seed}: no se llega a la calzada de ${cell.type} (${cell.col},${cell.row})`);
    }
    // El cruce de las vías: el hueco de 48 px se camina de lado a lado.
    const vias = cells.find((c) => c.type === 'vias');
    if (vias) {
      const X = vias.col * 20 * 16; const Y = vias.row * 20 * 16;
      let crossing = 0;
      for (let x = 144; x < 192; x += 16) {
        for (let y = 72; y < 192; y += 16) crossing += reachable(X + x + 8, Y + y + 8) ? 1 : 0;
      }
      assert.ok(crossing >= 6, `semilla ${seed}: el paso a nivel no se camina (${crossing} baldosas)`);
    }
  }
});
