// Pure movement math: no DOM, no Three.js. Coordinates are Y-down (0 = top).
// Positions are { x, feet }: x is the horizontal center, feet is the Y of the
// bottom of the character (the ground contact point).

export const TILE = 16;
export const PLAYER_SPEED = 72; // px per second
export const FOOT_W = 10;
export const FOOT_H = 6;

const MOVE_EPS = 0.05;

function finite(value) {
  return Number.isFinite(value) ? value : 0;
}

/** Clamp `value` only on the sides whose limit is a finite number. */
function clamp(value, min, max) {
  let v = value;
  if (Number.isFinite(min) && v < min) v = min;
  if (Number.isFinite(max) && v > max) v = max;
  return v;
}

/**
 * Input vector -> safe movement vector.
 * Output magnitude is never > 1 and diagonals such as (1,1) become
 * (0.7071, 0.7071). Non-finite components are treated as 0.
 */
export function normalizeMove(move) {
  const x = finite(move && move.x);
  const y = finite(move && move.y);
  const mag = Math.hypot(x, y);
  if (mag === 0) return { x: 0, y: 0 };
  const k = mag > 1 ? 1 / mag : 1;
  return { x: x * k, y: y * k };
}

/**
 * Facing direction from a movement vector. On diagonals the horizontal axis
 * wins ("up-right" faces right). When not moving, keeps the last facing.
 */
export function directionFromMove(move, last = 'down') {
  const x = finite(move && move.x);
  const y = finite(move && move.y);
  if (Math.abs(x) > MOVE_EPS) return x > 0 ? 'right' : 'left';
  if (Math.abs(y) > MOVE_EPS) return y > 0 ? 'down' : 'up';
  return last;
}

/** Small collision box under the character, anchored at the feet. */
export function footBox(x, feet) {
  return { x: x - FOOT_W / 2, y: feet - FOOT_H, w: FOOT_W, h: FOOT_H };
}

/** Strict AABB overlap: boxes that only touch edges do NOT overlap. */
export function overlaps(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/**
 * Move `pos` by `move` * speed * dt, resolving axes one at a time so the
 * player slides along walls. Only the blocked axis is reverted.
 * `bounds` is optional ({minX,maxX,minFeet,maxFeet}) and clamps positions.
 * `isSolid(box)` returns truthy when that foot box is blocked.
 * Returns a new {x, feet, movedX, movedY, blockedX, blockedY}.
 */
export function resolveMove(pos, move, dt, speed = PLAYER_SPEED, bounds = null, isSolid = null) {
  const dir = normalizeMove(move);
  const rate = finite(speed);
  const time = Math.max(0, finite(dt));
  const step = rate * time;

  const startX = finite(pos && pos.x);
  const startFeet = finite(pos && pos.feet);
  let x = startX;
  let feet = startFeet;
  let blockedX = false;
  let blockedY = false;

  const dx = dir.x * step;
  if (dx !== 0) {
    const nextX = clamp(x + dx, bounds && bounds.minX, bounds && bounds.maxX);
    const box = footBox(nextX, feet);
    if (typeof isSolid === 'function' && isSolid(box)) {
      blockedX = true;
    } else {
      x = nextX;
    }
  }

  const dy = dir.y * step;
  if (dy !== 0) {
    const nextFeet = clamp(feet + dy, bounds && bounds.minFeet, bounds && bounds.maxFeet);
    const box = footBox(x, nextFeet);
    if (typeof isSolid === 'function' && isSolid(box)) {
      blockedY = true;
    } else {
      feet = nextFeet;
    }
  }

  return { x, feet, movedX: x - startX, movedY: feet - startFeet, blockedX, blockedY };
}

/**
 * Walk animation frame synced to distance walked (not to time), so the
 * character stops animating when it stops moving.
 */
export function walkFrame(distance, frames = 4, pixelsPerFrame = 5) {
  const count = Math.max(1, Math.floor(finite(frames)));
  const per = finite(pixelsPerFrame) || 5;
  const walked = Math.abs(finite(distance));
  return Math.floor(walked / per) % count;
}
