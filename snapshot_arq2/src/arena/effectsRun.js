// Efectos de las mejoras aplicados a la salida, más bengala y botella de nafta.
// Todo puro: no muta lo que recibe, no usa three ni DOM.

import { effects } from '../run/upgrades.js';

export const BENGALA_RADIUS = 64;
export const BENGALA_TIME = 8;
export const BENGALA_FACTOR = 0.5;
export const MOLOTOV_RADIUS = 40;
export const MOLOTOV_TIME = 5;
export const MOLOTOV_DPS = 1;
export const FAROL_RADIUS = 70;

// Distancia que vuela la botella y tope de segundos que puede sumar un solo dt.
const MOLOTOV_THROW = 48;
const MAX_FIRE_TICKS = 10; // 10 s de daño de un saque ya es castigo suficiente

export function runEffects(save) { return effects(save); }

/** Opciones para createWeapon() de src/arena/weapon.js */
export function weaponOptions(eff) {
  return { fireRate: eff.fireRate, magSize: eff.magSize, pierceDamage: eff.pierceDamage };
}

/** Parches que aguanta el traje. Nunca menos de uno. */
export function integrityMax(eff) {
  const n = Number(eff?.integrityMax);
  if (!Number.isFinite(n)) return 3;
  return Math.max(1, n);
}

/** Distancia al centro del bicho: enemy {x, y (pies), h} contra {x,y}. */
export function enemyDistance(enemy, point) {
  const ex = Number(enemy?.x) || 0;
  const ey = (Number(enemy?.y) || 0) - (Number(enemy?.h) || 0) / 2;
  const px = Number(point?.x) || 0;
  const py = Number(point?.y) || 0;
  return Math.hypot(ex - px, ey - py);
}

/** Factor de velocidad bajo la bengala: 0,5 cerca de la luz encendida. */
export function bengalaFactor(enemy, bengala) {
  if (!bengala) return 1;
  const t = Number(bengala.t);
  if (!Number.isFinite(t) || t <= 0) return 1;
  const d = enemyDistance(enemy, { x: bengala.x, y: bengala.y });
  return d < BENGALA_RADIUS ? BENGALA_FACTOR : 1;
}

/** ¿El enemigo está dentro del fuego? (radio 40 px al centro) */
export function inFire(enemy, fire, radius = MOLOTOV_RADIUS) {
  if (!fire) return false;
  return enemyDistance(enemy, fire) <= radius;
}

/**
 * Avance del daño por segundo del fuego. fire = {x,y,t,acc}. Devuelve
 * { acc, ticks } donde ticks = segundos enteros cumplidos. No muta fire.
 * dt negativo o inválido cuenta 0.
 */
export function fireTicks(fire, dt) {
  const prev = Number(fire?.acc);
  const base = Number.isFinite(prev) && prev > 0 ? prev : 0;
  const step = Number(dt);
  const delta = Number.isFinite(step) && step > 0 ? step : 0;
  const total = Math.min(base + delta, MAX_FIRE_TICKS);
  const ticks = Math.floor(total);
  const acc = Math.round((total - ticks) * 1e6) / 1e6;
  return { acc, ticks };
}

/** Bengala tirada a los pies del jugador. */
export function startBengala(player) {
  return { x: player.x, y: player.feet ?? player.y, t: BENGALA_TIME };
}

// Recorta dejando `inset` px adentro de cada borde; si no cabe, va al medio.
function clampInset(value, min, max, inset) {
  const hasMin = Number.isFinite(min);
  const hasMax = Number.isFinite(max);
  const lo = hasMin ? min + inset : -Infinity;
  const hi = hasMax ? max - inset : Infinity;
  if (lo > hi) return hasMin && hasMax ? (min + max) / 2 : value;
  return Math.min(hi, Math.max(lo, value));
}

/**
 * La botella vuela 48 px hacia donde apunta el jugador y queda en el piso,
 * sin salir de bounds (se mantiene `radius` px adentro del borde).
 * bounds = {minX,maxX,minFeet,maxFeet}. Devuelve { x, y, t, acc: 0 }.
 */
export function startMolotov(player, aim, bounds, radius = 20) {
  const px = Number(player?.x) || 0;
  const py = Number(player?.feet ?? player?.y) || 0;
  const ax = Number(aim?.x);
  const ay = Number(aim?.y);
  let dx = Number.isFinite(ax) ? ax - px : 0;
  let dy = Number.isFinite(ay) ? ay - py : -1;
  const len = Math.hypot(dx, dy);
  if (len > 1e-6) {
    dx /= len;
    dy /= len;
  } else {
    dx = 0; // sin puntería, para arriba
    dy = -1;
  }
  const b = bounds ?? {};
  const inset = Number.isFinite(Number(radius)) ? Math.max(0, Number(radius)) : 0;
  return {
    x: clampInset(px + dx * MOLOTOV_THROW, b.minX, b.maxX, inset),
    y: clampInset(py + dy * MOLOTOV_THROW, b.minFeet, b.maxFeet, inset),
    t: MOLOTOV_TIME,
    acc: 0,
  };
}
