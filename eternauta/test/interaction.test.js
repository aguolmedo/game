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
} from '../src/interaction.js';

const player = { x: 40, feet: 100 };

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
  // feet=96 es el borde superior del tile 6; los pies están en el tile 5.
  assert.deepEqual(actionTile(40, 96, 'down'), { tx: 2, ty: 6, cx: 40, cy: 104 });
  assert.deepEqual(actionTile(40, 96, 'up'), { tx: 2, ty: 4, cx: 40, cy: 72 });
});

test('actionBox: rect de 16x16 del tile de enfrente', () => {
  assert.deepEqual(actionBox(player, 'right'), { x: 48, y: 96, w: 16, h: 16 });
  assert.deepEqual(actionBox(player, 'up'), { x: 32, y: 80, w: 16, h: 16 });
  assert.deepEqual(actionBox({ x: 8, feet: 8 }, 'left'), { x: -16, y: 0, w: 16, h: 16 });
});

test('pickTarget: prefiere el objeto de enfrente sobre uno igual de cerca atrás', () => {
  const front = { id: 'radio', kind: 'radio', x: 56, y: 104 };
  const back = { id: 'cama', kind: 'bed', x: 24, y: 104 };
  const res = pickTarget({ ...player, dir: 'right' }, [back, front], { dir: 'right' });
  assert.equal(res.target.id, 'radio');
  assert.equal(res.via, 'action');
});

test('pickTarget: elige el objeto de enfrente más cercano al centro del tile', () => {
  const edge = { id: 'edge', kind: 'box', x: 46, y: 104 }; // toca el tile, centro a 2px
  const center = { id: 'center', kind: 'box', x: 56, y: 104 }; // centro justo en el tile
  const res = pickTarget({ ...player, dir: 'right' }, [edge, center]);
  assert.equal(res.target.id, 'center');
  assert.equal(res.via, 'action');
});

test('pickTarget: fallback a un objeto adyacente dentro de 16px de los pies', () => {
  const side = { id: 'caja', kind: 'box', x: 24, y: 100 };
  const res = pickTarget({ ...player, dir: 'down' }, [side]);
  assert.equal(res.target.id, 'caja');
  assert.equal(res.via, 'adjacent');
  assert.equal(ACTION_RADIUS, 16);
});

test('pickTarget: empate estable por orden de entrada', () => {
  const a = { id: 'a', kind: 'box', x: 24, y: 100 };
  const b = { id: 'b', kind: 'box', x: 56, y: 100 };
  const res = pickTarget({ ...player, dir: 'down' }, [a, b]);
  assert.equal(res.target.id, 'a');
});

test('pickTarget: la prioridad gana aunque el otro sea de la pasada action', () => {
  // Garaje: parado frente al porton (x=136, feet=54, mirando arriba) la
  // puerta ocupa el tile de accion y el extractor solo queda adyacente. Con el
  // secador en la mano el extractor (priority 2) tiene que ganar igual.
  const puerta = {
    id: 'garage_door', kind: 'object', priority: 0,
    x: 136, y: 48, w: 48, h: 32, ref: { station: null },
  };
  const extractor = {
    id: 'extractor', kind: 'object', priority: 2, reach: 56,
    x: 136, y: 16, w: 16, h: 16, ref: { station: 'extractor' },
  };
  const player = { x: 136, feet: 54, dir: 'up' };
  const res = pickTarget(player, [puerta, extractor], { dir: 'up', reach: 22 });
  assert.equal(res.target.id, 'extractor');
  assert.equal(res.via, 'adjacent');

  // Sin prioridad (sin el secador en la mano) la pasada action sigue mandando.
  const plain = pickTarget(player, [puerta, { ...extractor, priority: 0 }], { dir: 'up', reach: 22 });
  assert.equal(plain.target.id, 'garage_door');
  assert.equal(plain.via, 'action');
});

test('pickTarget: a igual prioridad la pasada action le gana a solo-adyacente', () => {
  const action = { id: 'mesa', kind: 'object', x: 56, y: 104 };
  const adjacent = { id: 'caja', kind: 'object', x: 24, y: 100 };
  const res = pickTarget({ ...player, dir: 'right' }, [adjacent, action], { dir: 'right' });
  assert.equal(res.target.id, 'mesa');
  assert.equal(res.via, 'action');
});

test('pickTarget: el objeto apoyado (priority 2) le gana al mueble que lo sostiene', () => {
  // Mesa en el tile de accion y el mate apoyado dentro del alcance de los pies:
  // el objeto apoyado tiene que seguir ganando (comportamiento de la ronda 1).
  const mesa = { id: 'mesa', kind: 'object', x: 56, y: 104, w: 48, h: 32 };
  const mate = { id: 'mate', kind: 'surfaceItem', priority: 2, x: 40, y: 100, w: 10, h: 12 };
  const res = pickTarget({ ...player, dir: 'right' }, [mesa, mate], { dir: 'right' });
  assert.equal(res.target.id, 'mate');
  assert.equal(res.via, 'adjacent');
});

test('pickTarget: sin candidatos o lejanos devuelve null', () => {
  assert.deepEqual(pickTarget(player, []), { target: null, via: null });
  const far = { id: 'lejos', kind: 'box', x: 300, y: 300 };
  assert.deepEqual(pickTarget({ ...player, dir: 'up' }, [far]), { target: null, via: null });
});

test('inMagnetRange: el borde de 16px entra, un poco más no', () => {
  assert.equal(MAGNET_RADIUS, 16);
  assert.equal(inMagnetRange(player, { x: 56, y: 100 }), true);
  assert.equal(inMagnetRange(player, { x: 40, y: 84 }), true);
  assert.equal(inMagnetRange(player, { x: 56.5, y: 100 }), false);
  assert.equal(inMagnetRange(player, { x: 40, y: 83.9 }), false);
});

test('pickAt: elige el objeto bajo el puntero y marca si llega', () => {
  const radio = { id: 'radio', kind: 'object', x: 56, y: 104, w: 16, h: 16 };
  const table = { id: 'mesa', kind: 'object', x: 40, y: 132, w: 48, h: 32 };
  const candidates = [radio, table];

  const near = pickAt({ ...player, dir: 'right' }, candidates, { x: 54, y: 98 });
  assert.equal(near.target.id, 'radio');
  assert.equal(near.near, true);

  const far = pickAt({ x: 300, feet: 300 }, candidates, { x: 54, y: 98 });
  assert.equal(far.target.id, 'radio');
  assert.equal(far.near, false);

  assert.equal(pickAt(player, candidates, { x: 0, y: 0 }).target, null);
});

test('pickAt: prioridad y caja chica ganan (objeto apoyado sobre el mueble)', () => {
  const furniture = {
    id: 'mesa', x: 40, y: 120, w: 48, h: 32,
    cursorBox: { x: 16, y: 88, w: 48, h: 32 },
  };
  const mate = {
    id: 'mate', x: 40, y: 112, w: 10, h: 12, priority: 2,
    cursorBox: { x: 35, y: 100, w: 10, h: 12 },
  };
  const res = pickAt({ x: 40, feet: 120 }, [furniture, mate], { x: 40, y: 105 });
  assert.equal(res.target.id, 'mate');
  assert.equal(res.near, true);
});

test('pickAt: respeta cursorBox aunque el ancla quede lejos', () => {
  const npc = {
    id: 'lucas', kind: 'npc', x: 200, y: 200, w: 20, h: 52,
    cursorBox: { x: 192, y: 168, w: 16, h: 32 },
  };
  const res = pickAt({ x: 400, feet: 400 }, [npc], { x: 196, y: 178 });
  assert.equal(res.target.id, 'lucas');
  assert.equal(res.near, false);
});

test('warpAt: devuelve el warp que contiene el punto de los pies', () => {
  const house = { x: 0, y: 0, w: 16, h: 16, to: 'altillo', spawn: { x: 8, y: 20, dir: 'up' } };
  const street = { x: 32, y: 0, w: 16, h: 16, to: 'calle' };
  const warps = [house, street];
  assert.equal(warpAt(8, 10, warps), house);
  assert.equal(warpAt(40, 5, warps), street);
  assert.equal(warpAt(8, 16, warps), null);
  assert.equal(warpAt(-2, 5, warps), null);
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

test('pickAt: objetos apoyados superpuestos desempatan por centro y orden de dibujo', () => {
  // Mate y vaso de la mesa del altillo: cajas de 10x12 que se pisan 6 px.
  const vaso = {
    id: 'vaso', kind: 'surfaceItem', priority: 2, front: 6,
    cursorBox: { x: 167, y: 105, w: 10, h: 12 },
  };
  const mate = {
    id: 'mate', kind: 'surfaceItem', priority: 2, front: 9,
    cursorBox: { x: 167, y: 111, w: 10, h: 12 },
  };
  const player = { x: 172, feet: 140, dir: 'up' };
  const candidates = [vaso, mate];

  // Centro del mate (y=117): su centro esta a 0 px, el del vaso a 6.
  const atMate = pickAt(player, candidates, { x: 172, y: 117 });
  assert.equal(atMate.target.id, 'mate');

  // Centro del vaso (y=111): gana el vaso.
  const atVaso = pickAt(player, candidates, { x: 172, y: 111 });
  assert.equal(atVaso.target.id, 'vaso');

  // La parte visible del vaso (arriba del mate) sigue siendo del vaso.
  const vasoVisible = pickAt(player, candidates, { x: 172, y: 106 });
  assert.equal(vasoVisible.target.id, 'vaso');
});

test('pickAt: misma caja y mismo centro, gana el que se dibuja mas al frente', () => {
  const back = { id: 'fondo', priority: 2, front: 1, cursorBox: { x: 10, y: 10, w: 12, h: 12 } };
  const front = { id: 'frente', priority: 2, front: 5, cursorBox: { x: 10, y: 10, w: 12, h: 12 } };
  const player = { x: 16, feet: 30, dir: 'up' };
  const res = pickAt(player, [back, front], { x: 16, y: 15 });
  assert.equal(res.target.id, 'frente');
  // El orden de entrada ya no decide el empate.
  const swapped = pickAt(player, [front, back], { x: 16, y: 15 });
  assert.equal(swapped.target.id, 'frente');
});
