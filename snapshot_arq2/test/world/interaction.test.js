import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTION_RADIUS,
  MAGNET_RADIUS,
  actionBox,
  actionTile,
  facingAway,
  inMagnetRange,
  pickAt,
  pickTarget,
  tileOf,
  warpAt,
  warpSpawn,
} from '../../src/interaction.js';
import { house } from '../../src/maps/house.js';
import { garage } from '../../src/maps/garage.js';
import {
  objectAccessTiles, objectFootTiles, playerInAccess, tileWalkable,
} from '../../src/reach.js';

const player = { x: 40, feet: 100 };

/** Mapa de prueba: piso liso y `wall` como tile sólido. */
function flatMap(objects = [], floorRows = {}) {
  const cols = 20;
  const rows = 20;
  const floor = Array.from({ length: rows }, () => Array(cols).fill('floor'));
  for (const [y, name] of Object.entries(floorRows)) {
    for (let x = 0; x < cols; x++) floor[Number(y)][x] = name;
  }
  return {
    id: 'test', cols, rows, floor, solidTiles: ['wall'], objects,
    bounds: { minX: 0, maxX: cols * 16, minFeet: 0, maxFeet: rows * 16 },
  };
}

/** Jugador parado en el centro de un casillero. */
function standing(tx, ty, dir = 'up') {
  return { x: tx * 16 + 8, feet: ty * 16 + 12, dir };
}

/** Candidato con la misma forma que arma mapView.addObject(). */
function objectCandidate(obj, priority = 1) {
  const w = (obj.tw || 1) * 16;
  const h = (obj.th || 1) * 16;
  return {
    id: obj.id,
    kind: obj.container ? 'container' : 'object',
    priority,
    x: (obj.x + (obj.tw || 1) / 2) * 16,
    y: (obj.y + (obj.th || 1)) * 16,
    w,
    h,
    cursorBox: { x: obj.x * 16, y: obj.y * 16, w, h },
    ref: obj,
  };
}

test('tileOf: redondea hacia abajo a coordenadas de tile', () => {
  assert.deepEqual(tileOf(0, 0), { tx: 0, ty: 0 });
  assert.deepEqual(tileOf(15, 15), { tx: 0, ty: 0 });
  assert.deepEqual(tileOf(16, 31), { tx: 1, ty: 1 });
  assert.deepEqual(tileOf(40, 100, 8), { tx: 5, ty: 12 });
});

test('actionTile: el tile de enfrente para las 4 direcciones', () => {
  assert.deepEqual(actionTile(player.x, player.feet, 'right'), { tx: 3, ty: 6, cx: 56, cy: 104 });
  assert.deepEqual(actionTile(player.x, player.feet, 'left'), { tx: 1, ty: 6, cx: 24, cy: 104 });
  assert.deepEqual(actionTile(player.x, player.feet, 'down'), { tx: 2, ty: 7, cx: 40, cy: 120 });
  assert.deepEqual(actionTile(player.x, player.feet, 'up'), { tx: 2, ty: 5, cx: 40, cy: 88 });
});

test('actionTile: parado justo en el borde de un tile usa el de los pies', () => {
  assert.deepEqual(actionTile(40, 96, 'down'), { tx: 2, ty: 6, cx: 40, cy: 104 });
  assert.deepEqual(actionTile(40, 96, 'up'), { tx: 2, ty: 4, cx: 40, cy: 72 });
});

test('actionBox: rect de 16x16 del tile de enfrente', () => {
  assert.deepEqual(actionBox(player, 'right'), { x: 48, y: 96, w: 16, h: 16 });
  assert.deepEqual(actionBox(player, 'up'), { x: 32, y: 80, w: 16, h: 16 });
  assert.deepEqual(actionBox({ x: 8, feet: 8 }, 'left'), { x: -16, y: 0, w: 16, h: 16 });
});

// ------------------------------------------------- regla única: accesos
test('reach: la huella de un mueble sale de su solid y los accesos son los 4 vecinos', () => {
  const table = { id: 'mesa', x: 8, y: 7, tw: 2, th: 2, solid: { x: 0, y: 1, w: 2, h: 1 } };
  const map = flatMap([table]);
  assert.deepEqual(objectFootTiles(table), [{ tx: 8, ty: 8 }, { tx: 9, ty: 8 }]);
  const access = objectAccessTiles(table, map);
  for (const key of ['8,7', '9,7', '8,9', '9,9', '7,8', '10,8']) {
    assert.ok(access.has(key), `falta el acceso ${key}`);
  }
});

test('pickTarget: alcanza con estar en un acceso y mirar la huella', () => {
  const radio = { id: 'radio', x: 8, y: 7, tw: 1, th: 1, interact: {} };
  const map = flatMap([radio]);
  const cand = objectCandidate(radio);
  const inFront = standing(8, 8, 'up');
  assert.equal(pickTarget(inFront, [cand], { dir: 'up', map }).target.id, 'radio');
  // De costado también, si lo mira: acceso izquierdo mirando a la derecha.
  assert.equal(pickTarget(standing(7, 7, 'right'), [cand], { dir: 'right', map }).target.id, 'radio');
  // Mirando para otro lado no hay objetivo (la E nunca elige la espalda).
  assert.equal(pickTarget(inFront, [cand], { dir: 'down', map }).target, null);
  // Un casillero más lejos ya no es acceso.
  assert.equal(pickTarget(standing(8, 10, 'up'), [cand], { dir: 'up', map }).target, null);
});

test('pickTarget: devuelve null sin candidatos', () => {
  assert.deepEqual(pickTarget(player, [], { map: flatMap() }), { target: null, via: null });
});

test('pickTarget: la prioridad manda (apoyado > NPC > mueble > warp)', () => {
  const support = { id: 'mesa', x: 8, y: 7, tw: 2, th: 1, solid: true };
  const map = flatMap([support]);
  const table = objectCandidate(support, 1);
  const mate = {
    id: 'surface_mate', kind: 'surfaceItem', priority: 3, objectId: 'mesa',
    x: 136, y: 120, w: 10, h: 12,
    cursorBox: { x: 131, y: 108, w: 10, h: 12 },
  };
  const npc = {
    id: 'lucas', kind: 'npc', priority: 2, x: 136, y: 152, w: 20, h: 52,
    npc: { x: 136, feet: 126 },
    cursorBox: { x: 128, y: 94, w: 16, h: 32 },
  };
  const playerIn = standing(8, 8, 'up');
  assert.equal(pickTarget(playerIn, [table, mate], { dir: 'up', map }).target.id, 'surface_mate');
  assert.equal(pickTarget(playerIn, [table, npc], { dir: 'up', map }).target.id, 'lucas');

  const warp = {
    id: 'warp_x', kind: 'warp', priority: 0, x: 136, y: 120, w: 16, h: 16,
    warp: { x: 128, y: 112, w: 16, h: 16 },
  };
  assert.equal(pickTarget(playerIn, [warp, table], { dir: 'up', map }).target.id, 'mesa');
});

test('pickTarget: a igual prioridad gana la caja más chica', () => {
  const big = { id: 'grande', kind: 'object', priority: 1, x: 136, y: 120, w: 32, h: 32 };
  const small = { id: 'chico', kind: 'object', priority: 1, x: 136, y: 120, w: 16, h: 16 };
  const map = flatMap([], {});
  big.foot = [{ tx: 8, ty: 7 }];
  small.foot = [{ tx: 8, ty: 7 }];
  const res = pickTarget(standing(8, 8, 'up'), [big, small], { dir: 'up', map });
  assert.equal(res.target.id, 'chico');
});

test('accesos: un objeto de pared se alcanza desde el piso del otro lado', () => {
  // Fila 1 = pared. El objeto cuelga ahí; el piso empieza en la fila 3.
  const clock = { id: 'reloj', x: 8, y: 1, tw: 1, th: 1, interact: {} };
  const map = flatMap([clock], { 0: 'wall', 1: 'wall', 2: 'wall' });
  const cand = objectCandidate(clock);
  assert.equal(tileWalkable(map, 8, 3), true);
  assert.equal(pickTarget(standing(8, 3, 'up'), [cand], { dir: 'up', map }).target.id, 'reloj');
  // No se puede desde el otro lado de la pared (fila 0 es sólida).
  assert.equal(pickTarget(standing(8, 3, 'down'), [cand], { dir: 'down', map }).target, null);
});

test('accesos: un mueble bajo no tapa, uno alto sí', () => {
  const make = (low) => {
    const shelf = { id: 'estante', x: 8, y: 1, tw: 1, th: 1, interact: {} };
    const table = {
      id: 'mesa', x: 8, y: 2, tw: 1, th: 1, solid: true, ...(low ? { low: true } : {}),
    };
    return flatMap([shelf, table], { 0: 'wall', 1: 'wall' });
  };
  const shelf = { id: 'estante', x: 8, y: 1, tw: 1, th: 1, interact: {} };
  const lowMap = make(true);
  assert.ok(objectAccessTiles(shelf, lowMap).has('8,3'), 'el mueble bajo deja pasar');
  const highMap = make(false);
  assert.equal(objectAccessTiles(shelf, highMap).size, 0, 'el mueble alto tapa');
});

// ------------------------------------------------------------- hover mouse
test('pickAt: elige el objeto bajo el puntero y marca si llega', () => {
  const radio = { id: 'radio', x: 8, y: 7, tw: 1, th: 1 };
  const map = flatMap([radio]);
  const cand = objectCandidate(radio);
  const point = { x: 135, y: 116 };
  const near = pickAt(standing(8, 8, 'up'), [cand], point, { map });
  assert.equal(near.target.id, 'radio');
  assert.equal(near.near, true);
  const far = pickAt(standing(2, 2, 'up'), [cand], point, { map });
  assert.equal(far.target.id, 'radio');
  assert.equal(far.near, false);
  assert.equal(pickAt(standing(8, 8, 'up'), [cand], { x: 0, y: 0 }, { map }).target, null);
});

test('pickAt: prioridad y caja chica ganan (objeto apoyado sobre el mueble)', () => {
  const furniture = {
    id: 'mesa', priority: 1, x: 40, y: 120, w: 48, h: 32,
    cursorBox: { x: 16, y: 88, w: 48, h: 32 },
  };
  const mate = {
    id: 'mate', priority: 3, x: 40, y: 112, w: 10, h: 12,
    cursorBox: { x: 35, y: 100, w: 10, h: 12 },
  };
  const map = flatMap();
  const res = pickAt(standing(2, 7, 'up'), [furniture, mate], { x: 40, y: 105 }, { map });
  assert.equal(res.target.id, 'mate');
});

test('pickAt: respeta cursorBox aunque el ancla quede lejos', () => {
  const npc = {
    id: 'lucas', kind: 'npc', x: 200, y: 200, w: 20, h: 52,
    cursorBox: { x: 192, y: 168, w: 16, h: 32 },
  };
  const res = pickAt(standing(2, 2), [npc], { x: 196, y: 178 }, { map: flatMap() });
  assert.equal(res.target.id, 'lucas');
  assert.equal(res.near, false);
});

test('pickAt: objetos apoyados superpuestos desempatan por centro y orden de dibujo', () => {
  const vaso = {
    id: 'vaso', kind: 'surfaceItem', priority: 3, front: 6,
    cursorBox: { x: 167, y: 105, w: 10, h: 12 },
  };
  const mate = {
    id: 'mate', kind: 'surfaceItem', priority: 3, front: 9,
    cursorBox: { x: 167, y: 111, w: 10, h: 12 },
  };
  const map = flatMap();
  const p = { x: 172, feet: 140, dir: 'up' };
  assert.equal(pickAt(p, [vaso, mate], { x: 172, y: 117 }, { map }).target.id, 'mate');
  assert.equal(pickAt(p, [vaso, mate], { x: 172, y: 111 }, { map }).target.id, 'vaso');
  assert.equal(pickAt(p, [vaso, mate], { x: 172, y: 106 }, { map }).target.id, 'vaso');
});

test('pickAt: misma caja y mismo centro, gana el que se dibuja mas al frente', () => {
  const back = { id: 'fondo', priority: 3, front: 1, cursorBox: { x: 10, y: 10, w: 12, h: 12 } };
  const front = { id: 'frente', priority: 3, front: 5, cursorBox: { x: 10, y: 10, w: 12, h: 12 } };
  const map = flatMap();
  const p = { x: 16, feet: 30, dir: 'up' };
  assert.equal(pickAt(p, [back, front], { x: 16, y: 15 }, { map }).target.id, 'frente');
  assert.equal(pickAt(p, [front, back], { x: 16, y: 15 }, { map }).target.id, 'frente');
});

// ------------------------------------------ living real de la casa (bug #4)
function livingCandidates() {
  const ids = ['sofa', 'living_table', 'window_living', 'bookshelf'];
  const list = ids.map((id) => objectCandidate(house.objects.find((o) => o.id === id)));
  // Un libro apoyado en la mesa ratona (surfaceItem): prioridad máxima.
  list.push({
    id: 'surface_libro', kind: 'surfaceItem', priority: 3, objectId: 'living_table',
    x: 120, y: 100, w: 10, h: 12,
    cursorBox: { x: 115, y: 88, w: 10, h: 12 },
  });
  return list;
}

test('living: frente al sofá mirando arriba nunca elige la mesa de atrás', () => {
  const cands = livingCandidates();
  for (const [x, feet] of [[104, 86], [108, 90], [112, 96]]) {
    const res = pickTarget({ x, feet, dir: 'up' }, cands, { dir: 'up', map: house });
    assert.ok(res.target, `sin objetivo en (${x}, ${feet})`);
    assert.ok(['sofa', 'window_living'].includes(res.target.id),
      `eligió ${res.target.id} en (${x}, ${feet})`);
    assert.notEqual(res.target.kind, 'surfaceItem');
  }
});

test('living: mirando la mesa ratona desde su acceso sí agarra lo apoyado', () => {
  const cands = livingCandidates();
  const res = pickTarget(standing(7, 7, 'up'), cands, { dir: 'up', map: house });
  assert.equal(res.target.id, 'surface_libro');
  // Parado en el acceso de la mesa mirando abajo la mesa queda a la espalda.
  const back = pickTarget(standing(7, 5, 'up'), cands, { dir: 'up', map: house });
  assert.ok(back.target && back.target.kind !== 'surfaceItem', 'no agarra lo que está atrás');
});

test('garage: el extractor se alcanza desde el piso frente al portón', () => {
  const extractor = garage.objects.find((o) => o.id === 'extractor');
  assert.ok(extractor, 'falta el extractor');
  assert.equal(extractor.reach, undefined, 'ya no hay alcances por objeto');
  const cand = objectCandidate(extractor);
  const p = standing(8, 3, 'up');
  assert.ok(playerInAccess(p, cand, garage), 'el piso frente al portón es acceso');
  assert.equal(pickTarget(p, [cand], { dir: 'up', map: garage }).target.id, 'extractor');
  const hit = pickAt(p, [cand], { x: 136, y: 10 }, { map: garage });
  assert.equal(hit.target.id, 'extractor');
  assert.equal(hit.near, true);
});

test('inMagnetRange: el borde de 16px entra, un poco más no', () => {
  assert.equal(MAGNET_RADIUS, 16);
  assert.equal(inMagnetRange(player, { x: 56, y: 100 }), true);
  assert.equal(inMagnetRange(player, { x: 40, y: 84 }), true);
  assert.equal(inMagnetRange(player, { x: 56.5, y: 100 }), false);
  assert.equal(inMagnetRange(player, { x: 40, y: 83.9 }), false);
  assert.equal(ACTION_RADIUS, 16);
});

test('warpAt: devuelve el warp que contiene el punto de los pies', () => {
  const houseWarp = { x: 0, y: 0, w: 16, h: 16, to: 'altillo', spawn: { x: 8, y: 20, dir: 'up' } };
  const street = { x: 32, y: 0, w: 16, h: 16, to: 'calle' };
  assert.equal(warpAt(8, 10, [houseWarp, street]), houseWarp);
  assert.equal(warpAt(40, 5, [houseWarp, street]), street);
  assert.equal(warpAt(8, 16, [houseWarp, street]), null);
  assert.equal(warpAt(-2, 5, [houseWarp, street]), null);
  assert.equal(warpAt(8, 10, null), null);
});

test('warpSpawn: usa el spawn (copia) o cae al origen del warp', () => {
  const warp = { x: 32, y: 48, w: 16, h: 16, spawn: { x: 8, y: 20, dir: 'up' } };
  assert.deepEqual(warpSpawn(warp), { x: 8, y: 20, dir: 'up' });
  assert.deepEqual(warpSpawn({ x: 32, y: 48 }), { x: 32, y: 48, dir: 'down' });
  assert.deepEqual(warp, { x: 32, y: 48, w: 16, h: 16, spawn: { x: 8, y: 20, dir: 'up' } });
});

test('facingAway: mira al lado opuesto de la puerta', () => {
  assert.equal(facingAway('down'), 'up');
  assert.equal(facingAway('up'), 'down');
  assert.equal(facingAway('left'), 'right');
  assert.equal(facingAway('right'), 'left');
  assert.equal(facingAway('sideways'), 'down');
});
