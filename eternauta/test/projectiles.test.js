import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BULLET_SPEED, BULLET_LIFE, SHOT_HEIGHT, SPREAD_DEG, TRAIL_LEN, TRAIL_TIME,
  CASING_LIFE,
  shotOrigin, muzzlePoint, spreadAngle, normalize, createShot, firstHit,
  updateBullet, isOutOfView, aimDots, aimDotAlpha, ejectCasing, stepCasing,
  recoilPush,
} from '../src/arena/projectiles.js';
import { createWeapon, fire } from '../src/arena/weapon.js';

const enemyAt = (x, y = 8, extra = {}) => ({
  x, y, feet: y, h: 16, w: 20, radius: 9, dead: false, ...extra,
});

test('createShot: una bala por disparo con daño y perforación del arma', () => {
  const w = createWeapon();
  const shot = fire(w, 0);
  const b = createShot({ x: 40, y: 30 }, { x: 1, y: 0 },
    { shots: shot.shots, moving: false, rng: () => 0.5 });
  assert.equal(b.damage, 1);
  assert.equal(b.pierce, 1); // 2 objetivos: el segundo a la mitad
  assert.equal(b.x, 40);
  assert.equal(b.y, 30);
  assert.ok(Math.abs(b.dx - 1) < 1e-9);
  assert.ok(Math.abs(b.dy) < 1e-9);
  assert.equal(b.alive, true);
  assert.equal(b.life, BULLET_LIFE);
});

test('movimiento: viaja recto a 420 px/s y gasta vida', () => {
  const b = createShot({ x: 0, y: 0 }, { x: 1, y: 0 }, { moving: false, rng: () => 0.5 });
  updateBullet(b, 0.01, {});
  assert.ok(Math.abs(b.x - BULLET_SPEED * 0.01) < 1e-6);
  assert.ok(Math.abs(b.y) < 1e-9);
  assert.ok(Math.abs(b.life - (BULLET_LIFE - 0.01)) < 1e-9);

  const up = createShot({ x: 0, y: 50 }, { x: 0, y: -1 }, { moving: false, rng: () => 0.5 });
  updateBullet(up, 0.05, {});
  assert.ok(up.y < 50);
  assert.ok(Math.abs(up.x) < 1e-9);
});

test('colisión con cascarudo: pega, perfora y el segundo recibe la mitad', () => {
  const b = createShot({ x: 0, y: 0 }, { x: 1, y: 0 }, { moving: false, rng: () => 0.5 });
  const one = enemyAt(20);
  const events = updateBullet(b, 0.1, { enemies: [one] });
  const hits = events.filter((e) => e.type === 'enemy');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].enemy, one);
  assert.equal(hits[0].damage, 1);
  assert.equal(b.alive, true); // sigue de largo: perfora 1

  const a = enemyAt(20);
  const c = enemyAt(40);
  const b2 = createShot({ x: 0, y: 0 }, { x: 1, y: 0 }, { moving: false, rng: () => 0.5 });
  const ev2 = updateBullet(b2, 0.1, { enemies: [a, c] });
  const hits2 = ev2.filter((e) => e.type === 'enemy');
  assert.equal(hits2.length, 2);
  assert.equal(hits2[0].damage, 1);
  assert.equal(hits2[1].damage, 0.5);
  assert.equal(b2.alive, false); // ya no da para más
});

test('colisión: no pega dos veces al mismo bicho ni a los muertos', () => {
  const b = createShot({ x: 0, y: 0 }, { x: 1, y: 0 }, { moving: false, rng: () => 0.5 });
  const bug = enemyAt(8, 8, { radius: 40 });
  const events = [];
  for (let i = 0; i < 8; i++) {
    events.push(...updateBullet(b, 1 / 60, { enemies: [bug] }));
  }
  assert.equal(events.filter((e) => e.type === 'enemy').length, 1);
  assert.equal(firstHit(b, [bug]), null); // ya lo tocó

  const dead = enemyAt(0, 8, { dead: true, radius: 40 });
  const b2 = createShot({ x: 0, y: 0 }, { x: 1, y: 0 }, { moving: false, rng: () => 0.5 });
  assert.equal(firstHit(b2, [dead]), null);
});

test('colisión con pared: chispa y se frena ahí', () => {
  const b = createShot({ x: 0, y: 0 }, { x: 1, y: 0 }, { moving: false, rng: () => 0.5 });
  const events = updateBullet(b, 0.1, { isSolid: (x) => x >= 30 });
  const wall = events.filter((e) => e.type === 'wall');
  assert.equal(wall.length, 1);
  assert.ok(wall[0].x >= 30 && wall[0].x < 34.1);
  assert.equal(b.alive, false);
});

test('se va de la pantalla o se apaga por vida', () => {
  const out = createShot({ x: 0, y: 0 }, { x: 1, y: 0 }, { moving: false, rng: () => 0.5 });
  const ev = updateBullet(out, 0.2, { isOut: (x) => x > 50 });
  assert.equal(ev.filter((e) => e.type === 'out').length, 1);
  assert.equal(out.alive, false);

  const slow = createShot({ x: 0, y: 0 }, { x: 1, y: 0 }, { moving: false, rng: () => 0.5 });
  let expired = null;
  for (let i = 0; i < 20 && !expired; i++) {
    expired = updateBullet(slow, 0.2, {}).find((e) => e.type === 'expire') || null;
  }
  assert.ok(expired);
  assert.equal(slow.alive, false);
  assert.ok(slow.x > 400); // sí viajó
});

test('dispersión: ±2° al moverse, cero quieto', () => {
  assert.equal(spreadAngle(false), 0);
  assert.equal(spreadAngle(false, () => 0.1), 0);
  assert.ok(Math.abs(spreadAngle(true, () => 0) + SPREAD_DEG * Math.PI / 180) < 1e-9);
  assert.ok(Math.abs(spreadAngle(true, () => 1) - SPREAD_DEG * Math.PI / 180) < 1e-9);
  assert.ok(Math.abs(spreadAngle(true, () => 0.5)) < 1e-12);
  const neg = createShot({ x: 0, y: 0 }, { x: 1, y: 0 }, { moving: true, rng: () => 0 });
  assert.ok(Math.abs(Math.atan2(neg.dy, neg.dx) * 180 / Math.PI + SPREAD_DEG) < 1e-6);
  const pos = createShot({ x: 0, y: 0 }, { x: 1, y: 0 }, { moving: true, rng: () => 1 });
  assert.ok(Math.abs(Math.atan2(pos.dy, pos.dx) * 180 / Math.PI - SPREAD_DEG) < 1e-6);
  const still = createShot({ x: 0, y: 0 }, { x: 1, y: 0 }, { moving: false, rng: () => 1 });
  assert.ok(Math.abs(still.dy) < 1e-12);
});

test('estela: hasta 4 afterimages que se apagan solas', () => {
  const b = createShot({ x: 0, y: 0 }, { x: 1, y: 0 }, { moving: false, rng: () => 0.5 });
  for (let i = 0; i < 6; i++) updateBullet(b, 1 / 60, {});
  assert.ok(b.trail.length >= 1 && b.trail.length <= TRAIL_LEN);
  for (const dot of b.trail) {
    assert.ok(dot.life > 0 && dot.life <= TRAIL_TIME);
    assert.ok(dot.x <= b.x);
  }
  updateBullet(b, 0.3, {});
  assert.equal(b.trail.length, 0);
});

test('origen y punta del caño', () => {
  assert.deepEqual(shotOrigin({ x: 40, feet: 100 }), { x: 40, y: 100 - SHOT_HEIGHT });
  assert.deepEqual(shotOrigin(null), { x: 0, y: -SHOT_HEIGHT });
  const muzzle = muzzlePoint({ x: 10, y: 20 }, { x: 0, y: 1 });
  assert.equal(muzzle.x, 10);
  assert.equal(muzzle.y, 26);
  assert.deepEqual(normalize(0, 0), { x: 0, y: 1 });
});

test('guía punteada: cada 3 px, 60 px, se apaga con la distancia', () => {
  const dots = aimDots({ x: 10, y: 20 }, { x: 0, y: 1 });
  assert.equal(dots.length, 20);
  assert.equal(dots[0].y, 23);
  assert.ok(Math.abs(dots[dots.length - 1].y - 80) < 1e-9);
  assert.ok(dots[0].t < dots[dots.length - 1].t);
  assert.ok(aimDotAlpha(dots[0].t) > aimDotAlpha(dots[dots.length - 1].t));
  assert.ok(aimDotAlpha(0.5, true) > aimDotAlpha(0.5, false));
  assert.equal(aimDots({ x: 0, y: 0 }, { x: 1, y: 0 }, { length: 0 }).length, 0);
});

test('vaina: arco, rebote en la nieve y queda un rato', () => {
  const values = [0.2, 0.4, 0.3, 0.6];
  let i = 0;
  const casing = ejectCasing({ x: 0, y: 0 }, { x: 1, y: 0 }, () => values[i++ % values.length]);
  const startX = casing.x;
  assert.ok(casing.z > 0);
  assert.ok(casing.vz > 0);
  let bounces = 0;
  let steps = 0;
  while (casing.life > 0 && steps < 600) {
    const res = stepCasing(casing, 1 / 60);
    if (res.bounced) bounces += 1;
    steps += 1;
  }
  assert.ok(bounces >= 1);
  assert.equal(casing.settled, true);
  assert.equal(casing.z, 0);
  assert.ok(casing.x !== startX);
  assert.equal(stepCasing(casing, 1 / 60).alive, false);
});

test('retroceso: 2 px atrás (1 si hay pared, nada si está trabado)', () => {
  const player = { x: 100, feet: 100 };
  assert.deepEqual(recoilPush(player, { x: 1, y: 0 }), { x: 98, feet: 100 });
  const blocked = recoilPush(player, { x: 1, y: 0 }, () => true);
  assert.equal(blocked, null);
  const nearWall = recoilPush(player, { x: 1, y: 0 }, (box) => box.x < 94.5);
  assert.deepEqual(nearWall, { x: 99, feet: 100 });
});

test('isOutOfView: margen fuera de la cámara', () => {
  const view = { x: 0, y: 0, w: 480, h: 270 };
  assert.equal(isOutOfView(10, 10, view), false);
  assert.equal(isOutOfView(500, 10, view), false); // dentro del margen
  assert.equal(isOutOfView(520, 10, view), true);
  assert.equal(isOutOfView(10, -30, view), true);
  assert.equal(isOutOfView(10, 10, null), false);
});
