// Balas visibles, casquillos y guía de puntería (§11.2).
// Lógica pura: sin DOM ni three. Tiempos en segundos, distancias en píxeles.
// Y hacia abajo (como el resto de la arena): x = centro, y = plano de tiro.
import { PIERCE_DAMAGE } from './weapon.js';

export const BULLET_SPEED = 420; // px/s, bien rápido pero se ve viajar
export const BULLET_LIFE = 1.4; // s de vida máxima (después se apaga)
export const BULLET_RADIUS = 1.5; // radio de la bala para el choque
export const SHOT_HEIGHT = 4; // el tiro vive en el plano del piso (pies)
export const SPREAD_DEG = 2; // ±2° de dispersión, 0 si está quieto
export const TRAIL_LEN = 4; // estelas máximas por bala
export const TRAIL_TIME = 0.13; // vida de cada estela
export const TRAIL_STEP = 6; // cada cuántos px se deja una estela
export const AIM_LENGTH = 60; // largo de la guía punteada
export const AIM_STEP = 3; // una punteada cada 3 px
export const CASING_LIFE = 4.5; // la vaina queda unos segundos en la nieve
export const CASING_GRAVITY = 260;

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Origen del tiro: el plano de tiro a la altura del rifle. */
export function shotOrigin(player) {
  return { x: num(player && player.x), y: num(player && player.feet) - SHOT_HEIGHT };
}

/** Punta del caño (donde va el fogonazo), un poco adelante del origen. */
export function muzzlePoint(origin, dir) {
  return {
    x: num(origin && origin.x) + num(dir && dir.x) * 10,
    y: num(origin && origin.y) + num(dir && dir.y) * 6,
  };
}

/** Desvío del tiro: ±2° si se mueve, perfecto si está quieto. */
export function spreadAngle(moving, rng = Math.random) {
  if (!moving) return 0;
  const r = Math.max(0, Math.min(1, num(rng(), 0.5)));
  return (r - 0.5) * 2 * (SPREAD_DEG * Math.PI / 180);
}

export function normalize(x, y) {
  const mag = Math.hypot(num(x), num(y));
  if (mag < 1e-6) return { x: 0, y: 1 };
  return { x: num(x) / mag, y: num(y) / mag };
}

/**
 * Una bala por disparo. `shots` (de weapon.fire) define el daño: el primero
 * pega 1 y cada rebote de perforación la mitad (PIERCE_DAMAGE).
 */
export function createShot(origin, aim, opts = {}) {
  const dir = normalize(aim && aim.x, aim && aim.y);
  const angle = Math.atan2(dir.y, dir.x) + spreadAngle(opts.moving, opts.rng || Math.random);
  const shots = opts.shots && opts.shots.length
    ? opts.shots
    : [{ damage: 1 }, { damage: PIERCE_DAMAGE }];
  const x = num(origin && origin.x);
  const y = num(origin && origin.y);
  return {
    x,
    y,
    dx: Math.cos(angle),
    dy: Math.sin(angle),
    speed: num(opts.speed, BULLET_SPEED),
    life: num(opts.life, BULLET_LIFE),
    damage: num(shots[0] && shots[0].damage, 1),
    pierce: Math.max(0, Math.round(num(opts.pierce, shots.length - 1))),
    hitCount: 0,
    hits: [],
    trail: [],
    trailLast: { x, y },
    alive: true,
  };
}

function enemyCenter(enemy) {
  return { x: num(enemy && enemy.x), y: num(enemy && enemy.y) - num(enemy && enemy.h) / 2 };
}

function enemyRadius(enemy) {
  return num(enemy && enemy.radius, num(enemy && enemy.w, 16) * 0.45) + BULLET_RADIUS;
}

/** Primer enemigo que toca la bala en este paso (sin repetir). */
export function firstHit(bullet, enemies = []) {
  for (const enemy of enemies) {
    if (!enemy || enemy.dead) continue;
    if (bullet.hits.includes(enemy)) continue;
    const c = enemyCenter(enemy);
    const r = enemyRadius(enemy);
    if ((bullet.x - c.x) ** 2 + (bullet.y - c.y) ** 2 <= r * r) return enemy;
  }
  return null;
}

function pushTrail(bullet) {
  const last = bullet.trail[bullet.trail.length - 1];
  const ref = last || bullet.trailLast;
  if (Math.hypot(bullet.x - ref.x, bullet.y - ref.y) < TRAIL_STEP) return;
  bullet.trail.push({ x: bullet.x, y: bullet.y, life: TRAIL_TIME });
  if (bullet.trail.length > TRAIL_LEN) bullet.trail.shift();
}

function ageTrail(bullet, dt) {
  if (!bullet.trail.length) return;
  for (const dot of bullet.trail) dot.life -= dt;
  bullet.trail = bullet.trail.filter((dot) => dot.life > 0);
}

/**
 * Avanza la bala y devuelve los eventos del tramo:
 *   {type:'enemy', enemy, damage, x, y}
 *   {type:'wall', x, y}  (chispa y se frena)
 *   {type:'out', x, y} / {type:'expire', x, y}
 * world = { enemies, isSolid(x,y), isOut(x,y) }.
 */
export function updateBullet(bullet, dt, world = {}) {
  const events = [];
  if (!bullet || !bullet.alive) return events;
  const time = Math.max(0, num(dt));
  if (time <= 0) return events;
  const enemies = world.enemies || [];
  const isSolid = world.isSolid || (() => false);
  const isOut = world.isOut || (() => false);
  const dist = bullet.speed * time;
  const steps = Math.max(1, Math.ceil(dist / 4)); // pasos de 4 px: no atraviesa nada
  const stepLen = dist / steps;

  for (let i = 0; i < steps && bullet.alive; i++) {
    bullet.x += bullet.dx * stepLen;
    bullet.y += bullet.dy * stepLen;
    pushTrail(bullet);

    if (isSolid(bullet.x, bullet.y)) {
      events.push({ type: 'wall', x: bullet.x, y: bullet.y, bullet });
      bullet.alive = false;
      break;
    }
    const enemy = firstHit(bullet, enemies);
    if (enemy) {
      const damage = bullet.damage * Math.pow(PIERCE_DAMAGE, bullet.hitCount);
      bullet.hitCount += 1;
      bullet.hits.push(enemy);
      events.push({ type: 'enemy', enemy, damage, x: bullet.x, y: bullet.y, bullet });
      if (bullet.hitCount > bullet.pierce) {
        bullet.alive = false;
        break;
      }
    }
    if (isOut(bullet.x, bullet.y)) {
      events.push({ type: 'out', x: bullet.x, y: bullet.y, bullet });
      bullet.alive = false;
      break;
    }
  }

  ageTrail(bullet, time);
  bullet.life -= time;
  if (bullet.alive && bullet.life <= 0) {
    events.push({ type: 'expire', x: bullet.x, y: bullet.y, bullet });
    bullet.alive = false;
  }
  return events;
}

/** ¿La bala se fue de la pantalla? (se corta ahí, sin seguir gastando). */
export function isOutOfView(x, y, view, margin = 24) {
  if (!view) return false;
  const left = num(view.x) - margin;
  const top = num(view.y) - margin;
  const right = left + num(view.w, 480) + margin * 2;
  const bottom = top + num(view.h, 270) + margin * 2;
  return x < left || x > right || y < top || y > bottom;
}

/** Puntos de la guía punteada: uno cada 3 px, apagándose con la distancia. */
export function aimDots(origin, dir, opts = {}) {
  const d = normalize(dir && dir.x, dir && dir.y);
  const length = Math.max(0, num(opts.length, AIM_LENGTH));
  const step = Math.max(1, num(opts.step, AIM_STEP));
  const ox = num(origin && origin.x);
  const oy = num(origin && origin.y);
  const dots = [];
  for (let dist = step; dist <= length + 1e-6; dist += step) {
    dots.push({ x: ox + d.x * dist, y: oy + d.y * dist, t: dist / length });
  }
  return dots;
}

/** Alfa de cada punteada: se apaga con la distancia; más fuerte con LT/clic derecho. */
export function aimDotAlpha(t, hold = false) {
  const base = hold ? 0.95 : 0.62;
  return Math.max(0.08, base * (1 - Math.max(0, Math.min(1, num(t))) * 0.72));
}

/** Vaina expulsada: sale de costado del caño, hace un arco y cae. */
export function ejectCasing(origin, dir, rng = Math.random) {
  const d = normalize(dir && dir.x, dir && dir.y);
  const side = num(rng(), 0.5) < 0.5 ? -1 : 1;
  const px = -d.y * side;
  const py = d.x * side;
  // Un poco de abanico para que no caigan todas en el mismo charco.
  const wobble = (num(rng(), 0.5) - 0.5) * 0.7;
  const ca = Math.cos(wobble);
  const sa = Math.sin(wobble);
  const qx = px * ca - py * sa;
  const qy = px * sa + py * ca;
  const out = 30 + num(rng()) * 28;
  return {
    x: num(origin && origin.x) + d.x * 8 + qx * 2,
    y: num(origin && origin.y) + d.y * 6 + qy * 2,
    z: 5,
    vx: qx * out - d.x * 8,
    vy: qy * out - d.y * 8,
    vz: 58 + num(rng()) * 34,
    spin: num(rng()) * Math.PI * 2,
    life: CASING_LIFE,
    bounces: 0,
    settled: false,
  };
}

/** Física de la vaina: arco, rebote en la nieve y frenada. Devuelve {alive, bounced}. */
export function stepCasing(casing, dt) {
  const time = Math.max(0, num(dt));
  if (!casing || time <= 0) return { alive: Boolean(casing && casing.life > 0), bounced: false };
  casing.life -= time;
  if (casing.life <= 0) return { alive: false, bounced: false };
  let bounced = false;
  casing.x += casing.vx * time;
  casing.y += casing.vy * time;
  casing.spin += time * 14;
  if (!casing.settled) {
    casing.z += casing.vz * time;
    casing.vz -= CASING_GRAVITY * time;
    if (casing.z <= 0) {
      casing.z = 0;
      casing.bounces += 1;
      bounced = true;
      if (Math.abs(casing.vz) > 26 && casing.bounces < 4) {
        casing.vz = -casing.vz * 0.42;
        casing.vx *= 0.55;
        casing.vy *= 0.55;
      } else {
        casing.vz = 0;
        casing.settled = true;
        casing.vx *= 0.35;
        casing.vy *= 0.35;
      }
    }
  } else {
    const drag = Math.max(0, 1 - 9 * time);
    casing.vx *= drag;
    casing.vy *= drag;
  }
  return { alive: true, bounced };
}

/**
 * Retroceso: empuja al jugador 1-2 px para atrás si no hay pared.
 * Devuelve {x, feet} o null. No muta al jugador.
 */
export function recoilPush(player, aim, isSolid, amount = 2) {
  if (!player) return null;
  const d = normalize(aim && aim.x, aim && aim.y);
  const solid = isSolid || (() => false);
  for (const dist of [amount, 1]) {
    const x = num(player.x) - d.x * dist;
    const feet = num(player.feet) - d.y * dist;
    const box = { x: x - 4, y: feet - 6, w: 8, h: 6 };
    if (!solid(box)) return { x, feet };
  }
  return null;
}
