import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FOOT_H,
  FOOT_W,
  PLAYER_SPEED,
  directionFromMove,
  footBox,
  normalizeMove,
  overlaps,
  resolveMove,
  walkFrame,
} from '../../src/movement.js';

const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

test('normalizeMove: la diagonal se normaliza a magnitud 1', () => {
  const move = normalizeMove({ x: 1, y: 1 });
  assert.ok(near(move.x, Math.SQRT1_2));
  assert.ok(near(move.y, Math.SQRT1_2));
  assert.ok(near(Math.hypot(move.x, move.y), 1));

  const long = normalizeMove({ x: 3, y: 4 });
  assert.ok(near(long.x, 0.6));
  assert.ok(near(long.y, 0.8));
});

test('normalizeMove: quieto y valores inválidos no rompen nada', () => {
  assert.deepEqual(normalizeMove({ x: 0, y: 0 }), { x: 0, y: 0 });
  assert.deepEqual(normalizeMove(null), { x: 0, y: 0 });
  assert.deepEqual(normalizeMove({ x: Number.NaN, y: Number.NaN }), { x: 0, y: 0 });
  const half = normalizeMove({ x: 0.5, y: 0 });
  assert.ok(half.x <= 1 && half.x >= 0);
});

test('directionFromMove: la diagonal usa el eje horizontal', () => {
  assert.equal(directionFromMove({ x: 1, y: 1 }), 'right');
  assert.equal(directionFromMove({ x: -0.7, y: 0.7 }), 'left');
  assert.equal(directionFromMove({ x: 0, y: -1 }), 'up');
  assert.equal(directionFromMove({ x: 0, y: 0.4 }), 'down');
});

test('directionFromMove: sin movimiento conserva el último facing', () => {
  assert.equal(directionFromMove({ x: 0, y: 0 }, 'left'), 'left');
  assert.equal(directionFromMove({ x: Number.NaN, y: 0 }, 'up'), 'up');
  assert.equal(directionFromMove({ x: 0.01, y: 0 }, 'right'), 'right');
});

test('footBox: la caja queda anclada a los pies', () => {
  assert.deepEqual(footBox(20, 100), { x: 20 - FOOT_W / 2, y: 100 - FOOT_H, w: FOOT_W, h: FOOT_H });
  const box = footBox(20, 100);
  assert.equal(box.y + box.h, 100);
  assert.equal(box.x + box.w / 2, 20);
});

test('overlaps: tocar el borde no cuenta como choque', () => {
  const a = { x: 0, y: 0, w: 10, h: 10 };
  assert.equal(overlaps(a, { x: 10, y: 0, w: 10, h: 10 }), false);
  assert.equal(overlaps(a, { x: 10, y: 10, w: 10, h: 10 }), false);
  assert.equal(overlaps(a, { x: 9.5, y: 0, w: 10, h: 10 }), true);
  assert.equal(overlaps(a, a), true);
});

test('resolveMove: la diagonal recorre la misma distancia por segundo', () => {
  const res = resolveMove({ x: 0, feet: 0 }, { x: 1, y: 1 }, 1, PLAYER_SPEED);
  assert.ok(near(Math.hypot(res.movedX, res.movedY), PLAYER_SPEED));
  assert.ok(near(res.movedX, PLAYER_SPEED * Math.SQRT1_2));
  assert.equal(res.blockedX, false);
  assert.equal(res.blockedY, false);
});

test('resolveMove: desliza por una pared vertical empujando en diagonal', () => {
  // Pared con borde izquierdo en x=50.
  const isSolid = (box) => box.x + box.w > 50;
  const res = resolveMove({ x: 40, feet: 100 }, { x: 1, y: 1 }, 1, 16, null, isSolid);

  assert.equal(res.blockedX, true);
  assert.equal(res.blockedY, false);
  assert.equal(res.x, 40); // X bloqueado: se revierte
  assert.ok(near(res.movedY, 16 * Math.SQRT1_2));
  assert.ok(near(res.feet, 100 + 16 * Math.SQRT1_2));
});

test('resolveMove: desliza por el borde de un mueble horizontal', () => {
  // Mesa que bloquea el paso hacia abajo a partir de y=80.
  const isSolid = (box) => box.x < 60 && box.y + box.h > 80;
  const res = resolveMove({ x: 20, feet: 76 }, { x: 1, y: 1 }, 1, 16, null, isSolid);

  assert.equal(res.blockedX, false);
  assert.equal(res.blockedY, true);
  assert.ok(near(res.movedX, 16 * Math.SQRT1_2));
  assert.equal(res.feet, 76);
});

test('resolveMove: los bounds recortan la posición', () => {
  const bounds = { minX: 0, maxX: 50, minFeet: 0, maxFeet: 100 };
  const res = resolveMove({ x: 48, feet: 98 }, { x: 1, y: 1 }, 1, 16, bounds);
  assert.equal(res.x, 50);
  assert.equal(res.feet, 100);
  assert.ok(near(res.movedX, 2));
  assert.ok(near(res.movedY, 2));
});

test('resolveMove: no muta la posición ni el input', () => {
  const pos = Object.freeze({ x: 10, feet: 20 });
  const move = Object.freeze({ x: 1, y: -1 });
  const res = resolveMove(pos, move, 1 / 60, PLAYER_SPEED);
  assert.deepEqual(pos, { x: 10, feet: 20 });
  assert.deepEqual(move, { x: 1, y: -1 });
  assert.notEqual(res.x, pos.x);
});

test('resolveMove: con dt normal no atraviesa una pared', () => {
  const isSolid = (box) => box.x + box.w > 64;
  let pos = { x: 0, feet: 100 };
  for (let i = 0; i < 300; i += 1) {
    pos = resolveMove(pos, { x: 1, y: 0 }, 1 / 60, PLAYER_SPEED, null, isSolid);
  }
  assert.ok(Number.isFinite(pos.x));
  assert.ok(pos.x + FOOT_W / 2 <= 64 + 1e-6);
  assert.ok(pos.x > 50);
});

test('walkFrame: cicla sincronizado con la distancia', () => {
  assert.equal(walkFrame(0), 0);
  assert.equal(walkFrame(4), 0);
  assert.equal(walkFrame(5), 1);
  assert.equal(walkFrame(10), 2);
  assert.equal(walkFrame(15), 3);
  assert.equal(walkFrame(20), 0);
  assert.equal(walkFrame(25), 1);
  assert.equal(walkFrame(0, 6), 0);
  assert.equal(walkFrame(5, 6), 1);
});
