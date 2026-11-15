// Rifle de cerrojo y munición (§11.2). Lógica pura: sin DOM ni three.
// Los tiempos son segundos del reloj de la escena (`now`).

export const MAG_SIZE = 5;
export const START_RESERVE = 30;
export const FIRE_RATE = 0.55;
export const RELOAD_TIME = 1.6;
export const EMPTY_RATE = 1.6; // bala de emergencia si no queda nada
export const AMMO_PRICE = 250;
export const AMMO_PACK = 30;
export const PIERCE_DAMAGE = 0.5;

export function createWeapon(opts = {}) {
  const magSize = opts.magSize ?? MAG_SIZE;
  const mag = Math.max(0, Math.min(opts.mag ?? magSize, magSize));
  return {
    magSize,
    mag,
    reserve: opts.reserve ?? START_RESERVE,
    damage: opts.damage ?? 1,
    pierce: opts.pierce ?? 1,
    fireRate: opts.fireRate ?? FIRE_RATE,
    reloadTime: opts.reloadTime ?? RELOAD_TIME,
    emptyRate: opts.emptyRate ?? EMPTY_RATE,
    infinite: Boolean(opts.infinite),
    nextShotAt: 0,
    reloading: false,
    reloadStart: 0,
    reloadEnd: 0,
    reloadNeed: 0,
    emergency: false,
    shotsFired: 0,
  };
}

function shotList(w) {
  const shots = [{ damage: w.damage }];
  for (let i = 0; i < w.pierce; i++) {
    shots.push({ damage: w.damage * PIERCE_DAMAGE });
  }
  return shots;
}

/**
 * Intenta disparar. Devuelve {shots, w, empty, blocked, needReload?, emergency?}.
 * - shots: [{damage:1},{damage:0.5}] si salió el tiro (2 enemigos máx).
 * - empty: no queda munición (o el cargador está vacío y hay reserva).
 * - needReload: hay balas en la reserva pero el cargador está vacío.
 * - sin cargador ni reserva: 1 bala de emergencia cada 1.6 s.
 * No muta nada si todavía no toca (blocked).
 */
export function fire(w, now = 0) {
  const t = Number(now) || 0;
  if (w.reloading) {
    return { shots: [], w, empty: false, blocked: true, reloading: true };
  }
  if (t + 1e-9 < w.nextShotAt) {
    const dry = w.mag <= 0 && w.reserve <= 0;
    return { shots: [], w, empty: dry, blocked: true };
  }
  if (w.mag > 0) {
    w.mag -= 1;
    w.nextShotAt = t + w.fireRate;
    w.emergency = false;
    w.shotsFired += 1;
    return { shots: shotList(w), w, empty: false, blocked: false };
  }
  if (w.reserve > 0 || w.infinite) {
    return { shots: [], w, empty: true, blocked: false, needReload: true };
  }
  // Emergencia: el rifle nunca queda trabado.
  w.nextShotAt = t + w.emptyRate;
  w.emergency = true;
  w.shotsFired += 1;
  return { shots: [{ damage: w.damage }], w, empty: true, blocked: false, emergency: true };
}

/** Empieza la recarga (1.6 s). La munición se transfiere al terminar. */
export function reload(w, now = 0) {
  if (w.reloading) return { ok: false, w, reason: 'reloading' };
  const need = w.magSize - w.mag;
  if (need <= 0) return { ok: false, w, reason: 'full' };
  if (w.reserve <= 0 && !w.infinite) return { ok: false, w, reason: 'reserve' };
  const t = Number(now) || 0;
  w.reloading = true;
  w.reloadStart = t;
  w.reloadEnd = t + w.reloadTime;
  w.reloadNeed = need;
  return { ok: true, w, need };
}

/** Avanza recargas pendientes. Devuelve {reloaded, loaded?}. */
export function updateWeapon(w, dt, now = 0) {
  void dt;
  if (!w.reloading) return { reloaded: false };
  const t = Number(now) || 0;
  if (t + 1e-9 < w.reloadEnd) return { reloaded: false };
  const loaded = w.infinite ? w.reloadNeed : Math.min(w.reloadNeed, w.reserve);
  w.mag = Math.min(w.magSize, w.mag + loaded);
  if (!w.infinite) w.reserve = Math.max(0, w.reserve - loaded);
  w.reloading = false;
  w.reloadNeed = 0;
  w.reloadStart = 0;
  w.reloadEnd = 0;
  w.emergency = false;
  return { reloaded: true, loaded };
}

/** Compra 30 balas por 250 puntos. No muta si falta plata. */
export function buyAmmo(w, points) {
  const score = Math.max(0, Math.floor(Number(points) || 0));
  if (w.infinite) return { ok: false, w, points: score, reason: 'infinite' };
  if (score < AMMO_PRICE) return { ok: false, w, points: score, reason: 'points' };
  w.reserve += AMMO_PACK;
  return { ok: true, w, points: score - AMMO_PRICE, added: AMMO_PACK };
}

export function ammoLabel(w) {
  return `${w.mag}/${w.infinite ? '∞' : w.reserve}`;
}

/** Progreso 0..1 de la recarga (para llenar los casquillos del HUD). */
export function reloadProgress(w, now = 0) {
  if (!w.reloading) return 0;
  const span = w.reloadEnd - w.reloadStart;
  if (span <= 0) return 1;
  const t = (Number(now) || 0) - w.reloadStart;
  return Math.max(0, Math.min(1, t / span));
}

/** Casquillos que ya entraron en el cargador durante la recarga. */
export function reloadShells(w, now = 0) {
  return Math.floor(reloadProgress(w, now) * w.reloadNeed + 1e-6);
}

/**
 * Enemigos sobre la línea de tiro (hitscan). Devuelve hasta `max`
 * ordenados por distancia. `width` es el ancho del rayo en píxeles.
 */
export function pickHits(origin, dir, enemies = [], opts = {}) {
  const range = opts.range ?? 200;
  const width = opts.width ?? 10;
  const max = opts.max ?? 2;
  const dx = Number(dir && dir.x) || 0;
  const dy = Number(dir && dir.y) || 0;
  const mag = Math.hypot(dx, dy);
  if (mag < 1e-6) return [];
  const ux = dx / mag;
  const uy = dy / mag;
  const ox = Number(origin && origin.x) || 0;
  const oy = Number(origin && origin.y) || 0;
  const hits = [];
  for (const e of enemies) {
    if (!e || e.dead) continue;
    const feet = e.feet ?? e.y ?? 0;
    const h = e.h ?? 16;
    const cx = e.x ?? 0;
    const cy = feet - h / 2;
    const along = (cx - ox) * ux + (cy - oy) * uy;
    if (along < 0 || along > range) continue;
    const cross = Math.abs((cx - ox) * uy - (cy - oy) * ux);
    const radius = (e.w ?? 16) * 0.45;
    if (cross > width / 2 + radius) continue;
    hits.push({ enemy: e, along });
  }
  hits.sort((a, b) => a.along - b.along);
  return hits.slice(0, Math.max(1, max)).map((hit) => hit.enemy);
}
