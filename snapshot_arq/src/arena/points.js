// Puntaje de la arena (§11.2). Lógica pura y mutable, sin DOM ni three.

export const IMPACT_POINTS = 10;
export const KILL_POINTS = 60;
export const ARMORED_POINTS = 120;
export const ROUND_FACTOR = 100;

export function createPoints() {
  return { score: 0, kills: 0, impacts: 0, rounds: 0 };
}

export function addImpact(p) {
  p.score += IMPACT_POINTS;
  p.impacts += 1;
  return p;
}

/** `type` puede ser 'acorazado' o el enemigo mismo. */
export function addKill(p, type = 'cascarudo') {
  const kind = typeof type === 'string' ? type : type && type.type;
  p.score += kind === 'acorazado' ? ARMORED_POINTS : KILL_POINTS;
  p.kills += 1;
  return p;
}

export function addRound(p, r) {
  p.score += ROUND_FACTOR * Math.max(1, Math.floor(Number(r) || 1));
  p.rounds += 1;
  return p;
}

export function formatPoints(n) {
  return String(Math.max(0, Math.floor(Number(n) || 0)));
}
