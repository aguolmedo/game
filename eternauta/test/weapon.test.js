import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createWeapon, fire, reload, updateWeapon, buyAmmo, ammoLabel,
  reloadProgress, reloadShells, pickHits, AMMO_PRICE, AMMO_PACK,
} from '../src/arena/weapon.js';
import {
  createPoints, addImpact, addKill, addRound, formatPoints,
} from '../src/arena/points.js';

test('createWeapon: valores por defecto del cerrojo', () => {
  const w = createWeapon();
  assert.equal(w.mag, 5);
  assert.equal(w.magSize, 5);
  assert.equal(w.reserve, 30);
  assert.equal(w.fireRate, 0.55);
  assert.equal(w.reloadTime, 1.6);
  assert.equal(w.pierce, 1);
  assert.equal(w.mag, 5);
});

test('fire: cadencia 0.55 s y dos impactos (1 y 0.5)', () => {
  const w = createWeapon();
  const first = fire(w, 0);
  assert.equal(first.blocked, false);
  assert.equal(first.shots.length, 2);
  assert.equal(first.shots[0].damage, 1);
  assert.equal(first.shots[1].damage, 0.5);
  assert.equal(w.mag, 4);

  const early = fire(w, 0.2);
  assert.equal(early.blocked, true);
  assert.equal(early.shots.length, 0);
  assert.equal(w.mag, 4);

  const later = fire(w, 0.56);
  assert.equal(later.shots.length, 2);
  assert.equal(w.mag, 3);
});

test('fire: cargador vacío con reserva pide recargar', () => {
  const w = createWeapon({ mag: 0, reserve: 10 });
  const shot = fire(w, 0);
  assert.equal(shot.shots.length, 0);
  assert.equal(shot.needReload, true);
  assert.equal(shot.empty, true);
  assert.equal(w.mag, 0);
});

test('reload: 1.6 s y bala por bala', () => {
  const w = createWeapon({ mag: 2, reserve: 30 });
  const start = reload(w, 0);
  assert.equal(start.ok, true);
  assert.equal(w.reloading, true);
  assert.equal(w.mag, 2);

  assert.equal(updateWeapon(w, 0.5, 1.0).reloaded, false);
  assert.equal(reloadShells(w, 1.0), 1); // ya entró 1 de 3
  assert.equal(w.mag, 2);

  const done = updateWeapon(w, 0.1, 1.61);
  assert.equal(done.reloaded, true);
  assert.equal(done.loaded, 3);
  assert.equal(w.mag, 5);
  assert.equal(w.reserve, 27);
  assert.equal(reloadProgress(w, 2), 0);
});

test('reload: sin reserva no arranca; cargador lleno tampoco', () => {
  assert.equal(reload(createWeapon({ mag: 2, reserve: 0 }), 0).ok, false);
  assert.equal(reload(createWeapon(), 0).ok, false);
});

test('buyAmmo: 250 puntos -> +30 balas', () => {
  const w = createWeapon();
  const buy = buyAmmo(w, 300);
  assert.equal(buy.ok, true);
  assert.equal(buy.points, 300 - AMMO_PRICE);
  assert.equal(w.reserve, 30 + AMMO_PACK);

  const poor = buyAmmo(w, AMMO_PRICE - 1);
  assert.equal(poor.ok, false);
  assert.equal(poor.points, AMMO_PRICE - 1);
  assert.equal(ammoLabel(w), `5/${30 + AMMO_PACK}`);
});

test('fire: balas de emergencia sin cargador ni reserva', () => {
  const w = createWeapon({ mag: 0, reserve: 0 });
  const first = fire(w, 0);
  assert.equal(first.emergency, true);
  assert.equal(first.shots.length, 1);
  assert.equal(first.shots[0].damage, 1);
  assert.equal(w.mag, 0);

  assert.equal(fire(w, 1.0).blocked, true);
  const second = fire(w, 1.61);
  assert.equal(second.shots.length, 1);
  assert.equal(second.emergency, true);
});

test('ammoLabel y modo infinito', () => {
  assert.equal(ammoLabel(createWeapon({ mag: 3, reserve: 12 })), '3/12');
  const w = createWeapon({ infinite: true, mag: 0, reserve: 0 });
  assert.equal(ammoLabel(w), '0/∞');
  assert.equal(reload(w, 0).ok, true);
  updateWeapon(w, 0.1, 1.61);
  assert.equal(w.mag, 5);
});

test('pickHits: alcance, ancho del rayo y perforación', () => {
  const enemies = [
    { x: 150, y: 20, w: 20, h: 16 },
    { x: 50, y: 20, w: 20, h: 16 },
    { x: 100, y: 20, w: 20, h: 16 },
  ];
  const hits = pickHits({ x: 0, y: 12 }, { x: 1, y: 0 }, enemies, { range: 200, width: 10, max: 2 });
  assert.deepEqual(hits.map((e) => e.x), [50, 100]);

  const offLine = [{ x: 50, y: 60, w: 20, h: 16 }];
  assert.equal(pickHits({ x: 0, y: 12 }, { x: 1, y: 0 }, offLine, { width: 10 }).length, 0);

  const far = [{ x: 250, y: 20, w: 20, h: 16 }];
  assert.equal(pickHits({ x: 0, y: 12 }, { x: 1, y: 0 }, far, { range: 200 }).length, 0);

  const dead = [{ x: 50, y: 20, w: 20, h: 16, dead: true }];
  assert.equal(pickHits({ x: 0, y: 12 }, { x: 1, y: 0 }, dead).length, 0);
});

test('points: impacto, baja, acorazado y ronda', () => {
  const p = createPoints();
  addImpact(p);
  assert.equal(p.score, 10);
  assert.equal(p.impacts, 1);

  addKill(p, 'cascarudo');
  assert.equal(p.score, 70);
  addKill(p, { type: 'acorazado' });
  assert.equal(p.score, 190);
  assert.equal(p.kills, 2);

  addRound(p, 3);
  assert.equal(p.score, 490);
  assert.equal(p.rounds, 1);
  assert.equal(formatPoints(p.score), '490');
});
