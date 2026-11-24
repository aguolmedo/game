import { overlaps } from '../geom.js';
// Flow field BFS para la IA de los cascarudos (análisis A1–A7, sección 1.2).
// Puro: sin DOM ni three. La grilla son las baldosas del mapa (16 px).
// `dist` = pasos BFS hasta la baldosa del jugador; `parent` apunta hacia ella.

export const FLOW_INF = 0xffff;
export const TILE = 16;

/** Máscara de baldosas sólidas (1 = no caminable) rasterizando cajas en px. */
export function buildSolidMask(cols, rows, boxes = []) {
  const mask = new Uint8Array(cols * rows);
  for (const b of boxes) {
    const x0 = Math.max(0, Math.floor(b.x / TILE));
    const x1 = Math.min(cols - 1, Math.floor((b.x + b.w - 1e-3) / TILE));
    const y0 = Math.max(0, Math.floor(b.y / TILE));
    const y1 = Math.min(rows - 1, Math.floor((b.y + b.h - 1e-3) / TILE));
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) mask[y * cols + x] = 1;
    }
  }
  return mask;
}

/**
 * Máscara ancha (acorazado, caja 16,8 px): una baldosa libre del mapa solo
 * sirve si además tiene un vecino horizontal libre, o sea que hay al menos
 * 2 baldosas de ancho (32 px) para entrar. Misma convención que buildSolidMask:
 * 1 = bloqueada.
 */
export function widenMask(mask, cols, rows, minRun = 2) {
  const out = new Uint8Array(cols * rows);
  if (minRun < 2) {
    out.set(mask);
    return out;
  }
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const i = y * cols + x;
      if (mask[i]) {
        out[i] = 1;
        continue;
      }
      const leftFree = x > 0 && !mask[i - 1];
      const rightFree = x < cols - 1 && !mask[i + 1];
      out[i] = leftFree || rightFree ? 0 : 1;
    }
  }
  return out;
}

/**
 * Máscara caminable para un bicho concreto: una baldosa sirve si su caja de
 * choque, centrada en la baldosa (x*16+8), cabe en alguna altura de la baldosa
 * (el bicho puede ajustar los pies; ver BOX_MASK_FEET), sin tocar sólidos.
 * Es más fiable que rasterizar cajas a baldosas: un sólido que roza una esquina
 * ya no bloquea toda la baldosa ni manda el camino contra la pared.
 */
export const BOX_MASK_FEET = [4, 8, 12];

export function buildBoxMask(cols, rows, boxes, size, slack = 0) {
  const w = Math.max(1, size.w - slack);
  const h = Math.max(1, size.h - slack);
  const mask = new Uint8Array(cols * rows);
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const cx = x * TILE + 8;
      // Un bicho puede ajustar los pies dentro de la baldosa: si cabe en
      // alguna altura, la baldosa es caminable. Probar una sola altura dejaba
      // sólida la baldosa del propio jugador (se paraban a 2 baldosas).
      let free = false;
      for (const off of BOX_MASK_FEET) {
        const box = {
          x: cx - w / 2, y: y * TILE + off - h, w, h,
        };
        let hit = false;
        for (let k = 0; k < boxes.length; k += 1) {
          const b = boxes[k];
          if (overlaps(box, b)) {
            hit = true;
            break;
          }
        }
        if (!hit) { free = true; break; }
      }
      if (!free) mask[y * cols + x] = 1;
    }
  }
  return mask;
}

/** Baldosa libre más cercana en anillos de Chebyshev (determinista), o -1. */
export function nearestFree(mask, cols, rows, tx, ty, maxR = 4) {
  for (let r = 1; r <= maxR; r += 1) {
    for (let dy = -r; dy <= r; dy += 1) {
      for (let dx = -r; dx <= r; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = tx + dx;
        const y = ty + dy;
        if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
        const i = y * cols + x;
        if (!mask[i]) return i;
      }
    }
  }
  return -1;
}

/** Baldosa alcanzable más cercana (por anillos), o -1. */
function nearestReachable(field, tx, ty, maxR = 4) {
  const { cols, rows, dist } = field;
  for (let r = 0; r <= maxR; r += 1) {
    for (let dy = -r; dy <= r; dy += 1) {
      for (let dx = -r; dx <= r; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = tx + dx;
        const y = ty + dy;
        if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
        const i = y * cols + x;
        if (dist[i] !== FLOW_INF) return i;
      }
    }
  }
  return -1;
}

/** Buffers reutilizables de un campo (dist, parent y cola del BFS). */
export function createField(cols, rows) {
  const n = cols * rows;
  const dist = new Uint16Array(n);
  dist.fill(FLOW_INF); // un campo sin reconstruir no tiene rutas
  const parent = new Int16Array(n);
  parent.fill(-1);
  return {
    cols, rows, dist, parent, queue: new Uint32Array(n), seed: -1,
  };
}

/**
 * BFS de 4 vecinos desde la baldosa (tx,ty). Devuelve false si no hay semilla.
 * Con `allowBlockedSeed` se siembra igual en la baldosa del jugador aunque la
 * máscara la marque sólida (el jugador está físicamente ahí): así los bichos
 * apuntan a su baldosa y no se quedan a 2 baldosas de distancia.
 */
export function rebuild(field, mask, tx, ty, allowBlockedSeed = false) {
  const {
    cols, rows, dist, parent, queue,
  } = field;
  dist.fill(FLOW_INF);
  field.seed = -1;
  if (tx < 0 || ty < 0 || tx >= cols || ty >= rows) return false;
  let seed = ty * cols + tx;
  if (mask[seed] && !allowBlockedSeed) seed = nearestFree(mask, cols, rows, tx, ty, 4);
  if (seed < 0) return false;
  field.seed = seed;
  dist[seed] = 0;
  parent[seed] = -1;
  let head = 0;
  let tail = 1;
  queue[0] = seed;
  while (head < tail) {
    const i = queue[head];
    head += 1;
    const d = dist[i] + 1;
    const x = i % cols;
    const y = (i / cols) | 0;
    if (x > 0) {
      const j = i - 1;
      if (!mask[j] && dist[j] === FLOW_INF) {
        dist[j] = d; parent[j] = i; queue[tail] = j; tail += 1;
      }
    }
    if (x < cols - 1) {
      const j = i + 1;
      if (!mask[j] && dist[j] === FLOW_INF) {
        dist[j] = d; parent[j] = i; queue[tail] = j; tail += 1;
      }
    }
    if (y > 0) {
      const j = i - cols;
      if (!mask[j] && dist[j] === FLOW_INF) {
        dist[j] = d; parent[j] = i; queue[tail] = j; tail += 1;
      }
    }
    if (y < rows - 1) {
      const j = i + cols;
      if (!mask[j] && dist[j] === FLOW_INF) {
        dist[j] = d; parent[j] = i; queue[tail] = j; tail += 1;
      }
    }
  }
  return true;
}

/** Dirección unitaria hacia la baldosa padre desde cualquier posición (px). */
/** Vector unitario hacia la baldosa padre; `out` opcional para no asignar. */
export function flowVector(field, x, feet, out = null) {
  const {
    cols, rows, dist, parent,
  } = field;
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(feet / TILE);
  if (tx < 0 || ty < 0 || tx >= cols || ty >= rows) return null;
  let i = ty * cols + tx;
  if (dist[i] === FLOW_INF) {
    i = nearestReachable(field, tx, ty, 4);
    if (i < 0) return null;
  }
  const p = parent[i];
  if (p < 0) return null; // ya está en la baldosa del jugador
  const px = (p % cols) * TILE + 8;
  const py = ((p / cols) | 0) * TILE + 12;
  const dx = px - x;
  const dy = py - feet;
  const len = Math.hypot(dx, dy) || 1;
  const v = out || { x: 0, y: 0 };
  v.x = dx / len;
  v.y = dy / len;
  return v;
}

/** ¿Hay alguna baldosa alcanzable a <= r baldosas de (x,feet)? */
export function isReachableAt(field, x, feet, r = 1) {
  const {
    cols, rows, dist,
  } = field;
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(feet / TILE);
  for (let dy = -r; dy <= r; dy += 1) {
    for (let dx = -r; dx <= r; dx += 1) {
      const nx = tx + dx;
      const ny = ty + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      if (dist[ny * cols + nx] !== FLOW_INF) return true;
    }
  }
  return false;
}
