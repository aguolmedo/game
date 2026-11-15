// Pure interaction helpers: action tile in front of the player, target
// picking, item magnet and warp (teleport) triggers. No DOM, no Three.js.

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

function intersects(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** Candidate anchor (x, y = feet) -> collision box centered horizontally. */
function candidateBox(c, tile) {
  const w = c.w > 0 ? c.w : tile;
  const h = c.h > 0 ? c.h : tile;
  return { x: c.x - w / 2, y: c.y - h, w, h };
}

/**
 * Pick the best interactable. Candidates are {id, kind, x, y, w, h, priority?}.
 * First pass: boxes touching the action tile (or within `tolerance` px of its
 * center); nearest wins. Fallback: boxes within `reach` px of the player's
 * feet (adjacent). Ties keep input order. Returns {target, via} where via is
 * 'action', 'adjacent' or null.
 *
 * `priority` desempata antes que la distancia: un objeto apoyado sobre la mesa
 * (surfaceItem) le gana al mueble que lo sostiene, y un NPC le gana al mueble
 * que tiene detrás.
 */
export function pickTarget(player, candidates, opts = {}) {
  const tile = opts.tile || 16;
  const reach = Number.isFinite(opts.reach)
    ? opts.reach
    : Number.isFinite(opts.radius)
      ? opts.radius
      : ACTION_RADIUS;
  const tolerance = Number.isFinite(opts.tolerance) ? opts.tolerance : 2;
  const dir = opts.dir || player.dir || 'down';

  const action = actionTile(player.x, player.feet, dir, tile);
  const tileBox = { x: action.tx * tile, y: action.ty * tile, w: tile, h: tile };
  const feetPoint = [player.x, player.feet];

  let best = null;
  let bestDist = Infinity;
  let bestPrio = -Infinity;
  let via = null;

  (candidates || []).forEach((c) => {
    if (!c) return;
    const box = candidateBox(c, tile);
    const touches = intersects(box, tileBox);
    const distToAction = pointToBox(action.cx, action.cy, box);
    const distToFeet = pointToBox(feetPoint[0], feetPoint[1], box);
    const isAction = touches || distToAction <= tolerance;
    const isAdjacent = distToFeet <= reach;

    if (!isAction && !isAdjacent) return;
    // Action-pass candidates always beat adjacent-only ones.
    if (via === 'action' && !isAction) return;
    const dist = isAction ? distToAction : distToFeet;
    const prio = Number.isFinite(c.priority) ? c.priority : 0;
    if (!best || (isAction !== (via === 'action'))) {
      best = c;
      via = isAction ? 'action' : 'adjacent';
      bestDist = dist;
      bestPrio = prio;
      return;
    }
    if (prio > bestPrio || (prio === bestPrio && dist < bestDist)) {
      best = c;
      bestDist = dist;
      bestPrio = prio;
    }
  });

  return { target: best, via: best ? via : null };
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
