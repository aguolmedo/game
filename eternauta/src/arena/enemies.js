// Cascarudos: datos, steering y daño (§11.3–11.4). Sin DOM ni three.
// x = centro horizontal, y = pies (igual que el jugador). Y hacia abajo.

export const ENEMY_TYPES = {
  cascarudo: { w: 20, h: 16, hp: 2, speed: 34, damage: 1, radius: 9, patchChance: 0.08 },
  veloz: { w: 14, h: 12, hp: 1, speed: 62, damage: 1, radius: 6, patchChance: 0.08 },
  acorazado: {
    w: 28, h: 22, hp: 8, speed: 22, damage: 1, radius: 13, patchChance: 0.25, push: true,
  },
};

export const BITE_COOLDOWN = 0.8;
export const BITE_RANGE = 6; // píxeles extra además de los radios
export const CORPSE_TIME = 20; // el cuerpo queda en la nieve
export const HIT_FLASH = 0.08;

const SAMPLE_DIRS = [0, 0.7, -0.7, 1.3, -1.3];
const PROBE = 16;

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x
    && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function createEnemy(type, x, y, rng = Math.random) {
  const def = ENEMY_TYPES[type] || ENEMY_TYPES.cascarudo;
  return {
    type: def === ENEMY_TYPES[type] ? type : 'cascarudo',
    x: Number(x) || 0,
    y: Number(y) || 0,
    feet: Number(y) || 0,
    w: def.w,
    h: def.h,
    radius: def.radius,
    baseHp: def.hp,
    baseSpeed: def.speed,
    hp: def.hp,
    maxHp: def.hp,
    speed: def.speed,
    damage: def.damage,
    dir: 'down',
    moving: false,
    hitT: 0,
    biteCd: 0,
    dead: false,
    deathT: 0,
    age: 0,
    // fase de animación distinta por bicho, para que no caminen sincronizados
    animT: (Number(rng()) || 0) * 0.5,
    seed: (Number(rng()) || 0) * Math.PI * 2,
  };
}

/** Vida y velocidad escaladas por la ronda. */
export function applyRound(e, hpMul = 1, speedMul = 1) {
  e.maxHp = e.baseHp * hpMul;
  e.hp = e.maxHp;
  e.speed = e.baseSpeed * speedMul;
  return e;
}

export function enemyCenter(e) {
  return { x: e.x, y: e.y - e.h / 2 };
}

/** Caja de choque a los pies del bicho. */
export function enemyBox(e, x = e.x, y = e.y) {
  const w = e.w * 0.6;
  const h = e.h * 0.45;
  return { x: x - w / 2, y: y - h, w, h };
}

export function boxHitsSolids(box, solids = []) {
  for (const s of solids) if (overlaps(box, s)) return true;
  return false;
}

export function dirFromVector(dx, dy, last = 'down') {
  if (Math.abs(dx) <= 0.01 && Math.abs(dy) <= 0.01) return last;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

function rotate(x, y, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: x * c - y * s, y: x * s + y * c };
}

function pickFreeDir(e, mx, my, solids) {
  for (const angle of SAMPLE_DIRS) {
    const dir = angle === 0 ? { x: mx, y: my } : rotate(mx, my, angle);
    const box = enemyBox(e, e.x + dir.x * PROBE, e.y + dir.y * PROBE);
    if (!boxHitsSolids(box, solids)) return dir;
  }
  return { x: 0, y: 0 };
}

/**
 * Persecución con separación y rodeo simple de sólidos.
 * Muta e.x/e.y/e.dir y devuelve {x, y, dir}. `solids` es una lista de AABB.
 */
export function steer(e, player, enemies = [], solids = [], dt = 0) {
  const time = Math.max(0, Number(dt) || 0);
  if (!e || e.dead) {
    return { x: e ? e.x : 0, y: e ? e.y : 0, dir: e ? e.dir : 'down' };
  }
  e.age += time;
  e.animT += time;
  if (e.hitT > 0) e.hitT = Math.max(0, e.hitT - time);
  if (e.biteCd > 0) e.biteCd = Math.max(0, e.biteCd - time);

  const px = Number(player && player.x) || 0;
  const pfeet = Number(player && (player.feet ?? player.y)) || 0;
  const target = { x: px, y: pfeet - 8 };
  let dx = target.x - e.x;
  let dy = target.y - (e.y - e.h / 2);
  const len = Math.hypot(dx, dy) || 1;
  dx /= len;
  dy /= len;

  let sepX = 0;
  let sepY = 0;
  for (const other of enemies) {
    if (!other || other === e || other.dead) continue;
    const ox = other.x - e.x;
    const oy = (other.y - other.h / 2) - (e.y - e.h / 2);
    const d = Math.hypot(ox, oy);
    const minD = (e.radius + other.radius) * 0.9;
    if (d > 0.001 && d < minD) {
      const push = (minD - d) / minD;
      sepX -= (ox / d) * push;
      sepY -= (oy / d) * push;
    }
  }

  let mx = dx + sepX * 1.6;
  let my = dy + sepY * 1.6;
  const mag = Math.hypot(mx, my) || 1;
  mx /= mag;
  my /= mag;

  const going = pickFreeDir(e, mx, my, solids);
  const step = e.speed * time;
  const nx = e.x + going.x * step;
  const ny = e.y + going.y * step;
  let movedX = 0;
  let movedY = 0;
  if (!boxHitsSolids(enemyBox(e, nx, e.y), solids)) {
    movedX = nx - e.x;
    e.x = nx;
  }
  if (!boxHitsSolids(enemyBox(e, e.x, ny), solids)) {
    movedY = ny - e.y;
    e.y = ny;
  }
  e.feet = e.y;
  e.moving = Math.hypot(movedX, movedY) > 0.01;
  e.dir = dirFromVector(e.moving ? movedX : going.x, e.moving ? movedY : going.y, e.dir);
  return { x: e.x, y: e.y, dir: e.dir };
}

/** ¿Llegó a morder? (los dos centros a distancia de contacto). */
export function biteReach(e) {
  return e.radius + BITE_RANGE;
}

export function patchDrop(type, rng = Math.random) {
  const def = ENEMY_TYPES[type] || ENEMY_TYPES.cascarudo;
  return (Number(rng()) || 0) < def.patchChance;
}

/** Aplica daño. Devuelve {dead}; un bicho ya muerto no se vuelve a contar. */
export function hitEnemy(e, damage) {
  if (e.dead) return { dead: false, ignored: true };
  e.hp -= Math.max(0, Number(damage) || 0);
  e.hitT = HIT_FLASH;
  if (e.hp <= 0) {
    e.hp = 0;
    e.dead = true;
    e.deathT = 0;
    e.moving = false;
    return { dead: true };
  }
  return { dead: false };
}

/** Avanza la animación de muerte (3 cuadros) y devuelve el tiempo acumulado. */
export function updateDeath(e, dt) {
  if (!e.dead) return 0;
  e.deathT += Math.max(0, Number(dt) || 0);
  return e.deathT;
}
