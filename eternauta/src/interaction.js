// Pure interaction helpers: action tile in front of the player, target
// picking, item magnet and warp (teleport) triggers. No DOM, no Three.js.

import {
  candidateFootTiles, candidateAccessTiles, playerInAccess, facesFootprint,
} from './reach.js';

export const ACTION_RADIUS = 16;
export const MAGNET_RADIUS = 16;

const DIRS = {
  down: [0, 1],
  up: [0, -1],
  left: [-1, 0],
  right: [1, 0],
};
const OPPOSITE = { down: 'up', up: 'down', left: 'right', right: 'left' };

/** Pixel point -> tile coordinates. */
export function tileOf(x, y, tile = 16) {
  return { tx: Math.floor(x / tile), ty: Math.floor(y / tile) };
}

/** Tile the player is facing, one tile away, plus that tile's center in px. */
export function actionTile(x, feet, dir, tile = 16) {
  // The feet point is at the very bottom of the sprite, so step 1px up to
  // get the tile the character is really standing on.
  const base = tileOf(x, feet - 1, tile);
  const [dx, dy] = DIRS[dir] || DIRS.down;
  const tx = base.tx + dx;
  const ty = base.ty + dy;
  return { tx, ty, cx: (tx + 0.5) * tile, cy: (ty + 0.5) * tile };
}

/** Pixel rect of the action tile. */
export function actionBox(player, dir, tile = 16) {
  const { tx, ty } = actionTile(player.x, player.feet, dir, tile);
  return { x: tx * tile, y: ty * tile, w: tile, h: tile };
}

/** Distance from a point to an AABB (0 when the point is inside). */
function pointToBox(px, py, box) {
  const dx = Math.max(box.x - px, 0, px - (box.x + box.w));
  const dy = Math.max(box.y - py, 0, py - (box.y + box.h));
  return Math.hypot(dx, dy);
}

/** Candidate anchor (x, y = feet) -> collision box centered horizontally. */
function candidateBox(c, tile) {
  const w = c.w > 0 ? c.w : tile;
  const h = c.h > 0 ? c.h : tile;
  return { x: c.x - w / 2, y: c.y - h, w, h };
}

/** Caja de dibujo/acción del candidato (la misma que usa el cursor). */
export function visualBox(c, tile = 16) {
  if (c && c.cursorBox) return c.cursorBox;
  return candidateBox(c, tile);
}

/** Huella y accesos del candidato (ver src/reach.js). */
export { candidateFootTiles, candidateAccessTiles, playerInAccess, facesFootprint };

/**
 * Elige el interactivo alcanzable y mirado (E/A). La regla es única: el
 * jugador parado en un casillero de acceso y mirando hacia la huella. Entre
 * los que cumplen manda la prioridad (apoyado > NPC > mueble > warp), después
 * la caja más chica y después el orden de la lista.
 * Devuelve {target, via:'access'} o {target:null, via:null}.
 */
export function pickTarget(player, candidates, opts = {}) {
  const tile = opts.tile || 16;
  const dir = opts.dir || player.dir || 'down';
  const map = opts.map || null;

  let best = null;
  let bestPrio = -Infinity;
  let bestArea = Infinity;
  let bestDist = Infinity;

  (candidates || []).forEach((c) => {
    if (!c) return;
    if (!playerInAccess(player, c, map)) return;
    if (!facesFootprint(player, c, map, dir)) return;
    const box = visualBox(c, tile);
    const prio = Number.isFinite(c.priority) ? c.priority : 0;
    const area = box.w * box.h;
    const dist = pointToBox(player.x, player.feet, candidateBox(c, tile));
    const better = !best || prio > bestPrio
      || (prio === bestPrio && (area < bestArea
        || (area === bestArea && dist < bestDist)));
    if (!better) return;
    best = c;
    bestPrio = prio;
    bestArea = area;
    bestDist = dist;
  });

  return { target: best, via: best ? 'access' : null };
}

/** ¿El tile de adelante cae dentro de la huella? (para la histéresis). */
export function actionInsideFoot(player, cand, map, dir) {
  const foot = candidateFootTiles(cand, map);
  const action = actionTile(player.x, player.feet, dir);
  return foot.some((t) => t.tx === action.tx && t.ty === action.ty);
}

/**
 * Candidato bajo un punto del mundo (hover del mouse). Manda la prioridad
 * (objeto apoyado > NPC > mueble), después la caja más chica, después el
 * centro más cercano al puntero y por último el orden de dibujo (`front`).
 * `near` dice si el jugador está en un casillero de acceso del objetivo.
 */
export function pickAt(player, candidates, point, opts = {}) {
  const tile = opts.tile || 16;
  const tolerance = Number.isFinite(opts.tolerance) ? opts.tolerance : 2;
  const map = opts.map || null;
  const px = point.x;
  const py = point.y;

  let best = null;
  let bestPrio = -Infinity;
  let bestArea = Infinity;
  let bestCenter = Infinity;
  let bestDist = Infinity;
  let bestFront = -Infinity;

  (candidates || []).forEach((c) => {
    if (!c) return;
    const box = visualBox(c, tile);
    if (px < box.x - tolerance || px > box.x + box.w + tolerance
      || py < box.y - tolerance || py > box.y + box.h + tolerance) {
      return;
    }
    const prio = Number.isFinite(c.priority) ? c.priority : 0;
    const area = box.w * box.h;
    const dist = pointToBox(px, py, box);
    const center = Math.hypot(px - (box.x + box.w / 2), py - (box.y + box.h / 2));
    const front = Number.isFinite(c.front) ? c.front : 0;
    const better = !best || prio > bestPrio
      || (prio === bestPrio && (area < bestArea
        || (area === bestArea && (center < bestCenter
          || (center === bestCenter && (dist < bestDist
            || (dist === bestDist && front > bestFront)))))));
    if (better) {
      best = c;
      bestPrio = prio;
      bestArea = area;
      bestCenter = center;
      bestDist = dist;
      bestFront = front;
    }
  });

  if (!best) return { target: null, near: false };
  return { target: best, near: playerInAccess(player, best, map) };
}

/** Is the item close enough to the player's feet to be collected? */
export function inMagnetRange(player, item, radius = MAGNET_RADIUS) {
  return Math.hypot(item.x - player.x, item.y - player.feet) <= radius;
}

/** Warp rect containing the feet point (half-open rect), or null. */
export function warpAt(x, feet, warps) {
  for (const w of warps || []) {
    if (!w) continue;
    if (x >= w.x && x < w.x + w.w && feet >= w.y && feet < w.y + w.h) return w;
  }
  return null;
}

/** Destination spawn of a warp; falls back to the warp rect top-left. */
export function warpSpawn(warp) {
  const w = warp || {};
  const spawn = w.spawn || {};
  return {
    x: Number.isFinite(spawn.x) ? spawn.x : w.x || 0,
    y: Number.isFinite(spawn.y) ? spawn.y : w.y || 0,
    dir: spawn.dir || 'down',
  };
}

/** Opposite facing: the player appears coming out of the door, back turned. */
export function facingAway(dir) {
  return OPPOSITE[dir] || 'down';
}
