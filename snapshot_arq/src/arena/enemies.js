// Cascarudos: datos, steering y daño (§11.3–11.4). Sin DOM ni three.
// x = centro horizontal, y = pies (igual que el jugador). Y hacia abajo.
import { overlaps } from '../geom.js';
import { flowVector } from './flowfield.js';

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

// Sonda de línea de vista y desatascador (sección 1.2 del análisis).
const LOS_STEP = 6;
const DIRECT_RANGE = 56;
const STUCK_TIME = 0.45;
const JIGGLE_TIME = 0.35;
const JIGGLE_PROBE = 16;
const JIGGLE_STEP = 4;

// Scratch reutilizados por el steering: evita AABBs/vectores nuevos por cuadro.
const BOX_SCRATCH = { x: 0, y: 0, w: 0, h: 0 };
const FLOW_SCRATCH = { x: 0, y: 0 };
const JIGGLE_SCRATCH = { x: 0, y: 0 };

export function createEnemy(type, x, y, rng) {
  if (typeof rng !== 'function') throw new Error('createEnemy: falta rng');
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
    // Desatascador: tiempo pegado contra dos ejes y empujón lateral en curso.
    stuckT: 0,
    jiggleT: 0,
    jiggleX: 0,
    jiggleY: 0,
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

/** Caja de choque a los pies del bicho. `out` opcional para no asignar. */
export function enemyBox(e, x = e.x, y = e.y, out = null) {
  const w = e.w * 0.6;
  const h = e.h * 0.45;
  const box = out || { x: 0, y: 0, w: 0, h: 0 };
  box.x = x - w / 2;
  box.y = y - h;
  box.w = w;
  box.h = h;
  return box;
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

/** ¿La caja del bicho puede ir de A a B sin tocar un sólido? */
function lineFree(e, ax, ay, bx, by, solids) {
  if (!solids.length) return true;
  const dx = bx - ax;
  const dy = by - ay;
  const d = Math.hypot(dx, dy);
  if (d < 1e-3) return true;
  const steps = Math.max(1, Math.ceil(d / LOS_STEP));
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    if (boxHitsSolids(enemyBox(e, ax + dx * t, ay + dy * t, BOX_SCRATCH), solids)) return false;
  }
  return true;
}

/** Distancia libre (px, múltiplos de JIGGLE_STEP) en una dirección. */
function clearAhead(e, ux, uy, solids) {
  let clear = 0;
  for (let d = JIGGLE_STEP; d <= JIGGLE_PROBE; d += JIGGLE_STEP) {
    if (boxHitsSolids(enemyBox(e, e.x + ux * d, e.y + uy * d, BOX_SCRATCH), solids)) break;
    clear = d;
  }
  return clear;
}

/**
 * Dirección del empujón de desatasco: una vecina alcanzable, lateral al flujo
 * y con hueco real por delante (no basta con que la baldosa del flow sea
 * libre: el cuerpo puede estar pegado a un borde). Devuelve unitario o null.
 */
function jiggleVector(field, e, solids = [], mx = 0, my = 0) {
  if (!field) return null;
  const {
    cols, rows, dist,
  } = field;
  const tx = Math.floor(e.x / 16);
  const ty = Math.floor(e.y / 16);
  if (tx < 0 || ty < 0 || tx >= cols || ty >= rows) return null;
  let best = null;
  let bestScore = Infinity;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = tx + dx;
    const ny = ty + dy;
    if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
    const d = dist[ny * cols + nx];
    if (d === 0xffff) continue;
    // Dirección hacia el centro de la vecina, y cuánto hueco real hay.
    const vx = nx * 16 + 8 - e.x;
    const vy = ny * 16 + 12 - e.y;
    const len = Math.hypot(vx, vy) || 1;
    const ux = vx / len;
    const uy = vy / len;
    const clear = clearAhead(e, ux, uy, solids);
    if (clear < JIGGLE_STEP) continue;
    // Lateral antes que seguir de frente (de frente está bloqueado) y nunca
    // retroceder contra el flujo si hay otra opción. Más hueco = mejor.
    const along = dx * mx + dy * my;
    let score = Math.abs(along) * 50 - clear;
    if (along < -0.3) score += 1000;
    if (score < bestScore) {
      bestScore = score;
      best = JIGGLE_SCRATCH;
      best.x = ux;
      best.y = uy;
    }
  }
  return best;
}

/**
 * Persecución con flow field, separación proyectada y desatascador.
 * Muta e.x/e.y/e.dir y devuelve {x, y, dir}. `solids` es una lista de AABB.
 * `flow` es un campo de flowfield.js (opcional: sin él persigue en línea recta).
 * `out` opcional: objeto a reusar para el resultado (sin asignar por cuadro).
 */
export function steer(e, player, enemies = [], solids = [], dt = 0, flow = null, out = null) {
  const time = Math.max(0, Number(dt) || 0);
  if (!e || e.dead) {
    if (!out) return { x: e ? e.x : 0, y: e ? e.y : 0, dir: e ? e.dir : 'down' };
    out.x = e ? e.x : 0;
    out.y = e ? e.y : 0;
    out.dir = e ? e.dir : 'down';
    return out;
  }
  e.age += time;
  e.animT += time;
  if (e.hitT > 0) e.hitT = Math.max(0, e.hitT - time);
  if (e.biteCd > 0) e.biteCd = Math.max(0, e.biteCd - time);
  if (e.jiggleT > 0) e.jiggleT = Math.max(0, e.jiggleT - time);

  const px = Number(player && player.x) || 0;
  const pfeet = Number(player && (player.feet ?? player.y)) || 0;
  const targetY = pfeet - 8;
  const cy = e.y - e.h / 2;
  const tdx = px - e.x;
  const tdy = targetY - cy;
  const distance = Math.hypot(tdx, tdy) || 1;

  // 1) Seguir el flow; si no hay, ir derecho al jugador.
  const f = flow ? flowVector(flow, e.x, e.y, FLOW_SCRATCH) : null;
  let mx = f ? f.x : tdx / distance;
  let my = f ? f.y : tdy / distance;

  // 2) Con línea de vista libre y cerca, ir directo (evita el zigzag de baldosas).
  if (distance <= DIRECT_RANGE && lineFree(e, e.x, cy, px, targetY, solids)) {
    mx = tdx / distance;
    my = tdy / distance;
  }

  // 3) Separación solo lateral: se le saca la componente que frena el avance,
  //    así una cola en un pasillo no se desarma. Distancias al cuadrado.
  let sepX = 0;
  let sepY = 0;
  let crowded = false;
  for (const other of enemies) {
    if (!other || other === e || other.dead) continue;
    const ox = other.x - e.x;
    const oy = (other.y - other.h / 2) - cy;
    const d2 = ox * ox + oy * oy;
    const minD = (e.radius + other.radius) * 0.9;
    if (d2 < 0.0001 || d2 > minD * minD) continue;
    if (d2 < (minD * 0.2) * (minD * 0.2)) crowded = true;
    const d = Math.sqrt(d2);
    const push = (minD - d) / minD;
    sepX -= (ox / d) * push;
    sepY -= (oy / d) * push;
  }
  const dot = sepX * mx + sepY * my;
  if (dot < 0 && !crowded) {
    // Se anula lo que va en contra del flujo; queda solo el empuje lateral.
    // Si están casi encimados, se conserva el empuje para que no se apilen.
    sepX -= mx * dot;
    sepY -= my * dot;
  }

  // 4) Desatascador: empujón lateral perpendicular al avance.
  if (e.jiggleT > 0) {
    mx = e.jiggleX;
    my = e.jiggleY;
    sepX = 0;
    sepY = 0;
  } else {
    mx += sepX * 1.6;
    my += sepY * 1.6;
    const mag = Math.hypot(mx, my) || 1;
    mx /= mag;
    my /= mag;
  }

  // 5) Paso real (sin sonda de 16 px), resolviendo X e Y por separado.
  const step = e.speed * time;
  const nx = e.x + mx * step;
  const ny = e.y + my * step;
  let movedX = 0;
  let movedY = 0;
  if (Math.abs(nx - e.x) > 1e-6) {
    if (!boxHitsSolids(enemyBox(e, nx, e.y, BOX_SCRATCH), solids)) {
      movedX = nx - e.x;
      e.x = nx;
    }
  }
  if (Math.abs(ny - e.y) > 1e-6) {
    if (!boxHitsSolids(enemyBox(e, e.x, ny, BOX_SCRATCH), solids)) {
      movedY = ny - e.y;
      e.y = ny;
    }
  }

  // 6) Desatascador: si quiere avanzar y no avanza (bloqueado de frente o
  //    encajado en una esquina), a los 0,45 s pega un empujón lateral de
  //    0,35 s hacia una vecina con menos distancia y hueco real. Mirar sólo
  //    blockedX && blockedY dejaba congelados a los que iban en un solo eje.
  const wanted = Math.hypot(mx, my) > 1e-4 && step > 1e-4;
  const progress = step > 1e-4 ? Math.hypot(movedX, movedY) / step : 1;
  if (wanted && progress < 0.25) {
    e.stuckT += time;
    if (e.stuckT >= STUCK_TIME && e.jiggleT <= 0) {
      const j = jiggleVector(flow, e, solids, mx, my);
      if (j) {
        e.jiggleX = j.x;
        e.jiggleY = j.y;
        e.jiggleT = JIGGLE_TIME;
      }
      e.stuckT = 0;
    }
  } else {
    e.stuckT = Math.max(0, e.stuckT - time * 2);
  }

  e.feet = e.y;
  e.moving = Math.hypot(movedX, movedY) > 0.01;
  e.dir = dirFromVector(e.moving ? movedX : mx, e.moving ? movedY : my, e.dir);
  if (!out) return { x: e.x, y: e.y, dir: e.dir };
  out.x = e.x;
  out.y = e.y;
  out.dir = e.dir;
  return out;
}

/** ¿Llegó a morder? (los dos centros a distancia de contacto). */
export function biteReach(e) {
  return e.radius + BITE_RANGE;
}

export function patchDrop(type, rng) {
  if (typeof rng !== 'function') throw new Error('patchDrop: falta rng');
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
