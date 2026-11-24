// Salida de la salida: el portón de la casa y los payloads de fin de ronda.
// Puro, sin three ni DOM.

export const EXIT_RADIUS = 26;

/** Centro del borde de abajo del portón. exitHome = {x,y,w,h}. */
export function exitPoint(exitHome) {
  return { x: exitHome.x + exitHome.w / 2, y: exitHome.y + exitHome.h };
}

/**
 * ¿Juan está cerca del portón? Se mide desde el centro del borde de abajo del
 * portón hasta (player.x, player.feet ?? player.y). El pasto del rect es sólido.
 */
export function nearExit(exitHome, player, radius = EXIT_RADIUS) {
  if (!exitHome || !player) return false;
  const p = exitPoint(exitHome);
  const x = Number(player.x);
  const y = Number(player.feet ?? player.y);
  if (![p.x, p.y, x, y].every(Number.isFinite)) return false;
  const dx = x - p.x;
  const dy = y - p.y;
  const r = Number(radius);
  if (!Number.isFinite(r) || r < 0) return false;
  return dx * dx + dy * dy <= r * r;
}

/** Payload de fin de salida para game.endRun(result). */
export function homeResult({ bag, round, points }) {
  return { type: 'volvio', bag, round, points };
}

export function deathResult({ bag, round, points }) {
  return { type: 'murio', bag, round, points };
}
