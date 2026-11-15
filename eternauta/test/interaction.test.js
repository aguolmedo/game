import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTION_RADIUS,
  MAGNET_RADIUS,
  actionBox,
  actionTile,
  facingAway,
  inMagnetRange,
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
