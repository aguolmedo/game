// Alcance por casilleros de acceso (DIRECCION.md, "Controles e interacción").
// Lógica pura: sin DOM ni Three.js. La usan la E/A, el click y el cuadradito.
//
// Huella = casilleros que pisa el objeto (su `solid`, o su caja de dibujo si
// es de pared). Accesos = casilleros de piso caminables pegados a la huella.
// Los muebles bajos (`low: true`) no tapan: se puede alcanzar lo que está un
// casillero más allá de ellos. Los objetos de pared se alcanzan desde el piso
// que queda del otro lado de la pared donde cuelgan.

export const TILE = 16;
export const MAX_WALL_STEP = 4;

const indexCache = new WeakMap();

/**
 * Marca el mapa como cambiado (mueble movido/oculto): la próxima consulta
 * rehace el índice de sólidos. Sin esto, la caché por mapa quedaría vieja.
 */
export function bumpMapVersion(map) {
  if (!map) return;
  map.__reachVersion = (map.__reachVersion || 0) + 1;
}

function solidRectOf(obj) {
  const s = obj.solid === true ? { x: 0, y: 0, w: obj.tw, h: obj.th } : obj.solid;
  if (!s) return null;
  return {
    x: (obj.x + s.x) * TILE,
    y: (obj.y + s.y) * TILE,
    w: s.w * TILE,
    h: s.h * TILE,
  };
}

/** Índice estable por mapa: rects sólidos y nombres de tiles sólidos. */
export function mapIndex(map) {
  if (!map) return { solids: [], low: [], solidTiles: [] };
  const version = map.__reachVersion || 0;
  const cached = indexCache.get(map);
  if (cached && cached.version === version) return cached.index;
  const solids = [];
  const low = [];
  for (const obj of map.objects || []) {
    if (!obj.solid || obj.hidden) continue;
    const rect = solidRectOf(obj);
    if (!rect || rect.w <= 0 || rect.h <= 0) continue;
    const entry = { ...rect, id: obj.id, obj };
    solids.push(entry);
    if (obj.low) low.push(entry);
  }
  const index = { solids, low, solidTiles: map.solidTiles || [] };
  indexCache.set(map, { version, index });
  return index;
}

function overlaps(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function tileNameSolid(index, name) {
  return index.solidTiles.some((p) => name === p || name.startsWith(p));
}

/** Rect del sprite/caja de un objeto en px (esquina superior izquierda). */
export function objectBox(obj) {
  return { x: (obj.x || 0) * TILE, y: (obj.y || 0) * TILE, w: (obj.tw || 1) * TILE, h: (obj.th || 1) * TILE };
}

function rectTiles(rect) {
  const x0 = Math.floor(rect.x / TILE);
  const x1 = Math.ceil((rect.x + rect.w) / TILE) - 1;
  const y0 = Math.floor(rect.y / TILE);
  const y1 = Math.ceil((rect.y + rect.h) / TILE) - 1;
  const out = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push({ tx: x, ty: y });
  return out;
}

/**
 * Huella en la grilla: los tiles del `solid` si el mueble lo declara, si no
 * los de su caja de interacción (pared: la fila donde cuelga).
 */
export function objectFootTiles(obj) {
  const rect = solidRectOf(obj) || objectBox(obj);
  return rectTiles(rect);
}

/** Huella de un candidato de la lista (misma forma que arma WorldScene). */
export function candidateFootTiles(cand, map = null) {
  if (!cand) return [];
  if (Array.isArray(cand.foot)) return cand.foot;
  const ref = cand.ref || (map && (map.objects || []).find((o) => o.id === cand.id));
  const obj = cand.kind === 'surfaceItem' ? supportObject(cand, map) : ref;
  if (obj && obj.x != null && obj.tw != null) return objectFootTiles(obj);
  if (cand.kind === 'npc' && cand.npc) {
    return [{ tx: Math.floor(cand.npc.x / TILE), ty: Math.floor((cand.npc.feet - 1) / TILE) }];
  }
  if (cand.kind === 'npc') {
    return [{ tx: Math.floor(cand.x / TILE), ty: Math.floor((cand.y - 1) / TILE) }];
  }
  if (cand.kind === 'warp' && cand.warp) {
    return rectTiles({ x: cand.warp.x, y: cand.warp.y, w: cand.warp.w, h: cand.warp.h });
  }
  const w = cand.w > 0 ? cand.w : TILE;
  const h = cand.h > 0 ? cand.h : TILE;
  return rectTiles({ x: cand.x - w / 2, y: cand.y - h, w, h });
}

/** Mueble que sostiene un objeto apoyado. */
export function supportObject(cand, map) {
  if (!cand || !map) return null;
  return (map.objects || []).find((o) => o.id === cand.objectId) || null;
}

function inBounds(map, x, feet) {
  const b = map.bounds || {};
  const minX = Number.isFinite(b.minX) ? b.minX : 0;
  const maxX = Number.isFinite(b.maxX) ? b.maxX : (map.cols || 0) * TILE;
  const minFeet = Number.isFinite(b.minFeet) ? b.minFeet : 0;
  const maxFeet = Number.isFinite(b.maxFeet) ? b.maxFeet : (map.rows || 0) * TILE;
  return x >= minX && x <= maxX && feet >= minFeet && feet <= maxFeet;
}

function nameAt(map, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= (map.cols || 0) || ty >= (map.rows || 0)) return null;
  const row = map.floor && map.floor[ty];
  return row ? row[tx] : null;
}

/**
 * ¿El jugador puede pararse en el casillero? Cuenta tiles sólidos, muebles
 * sólidos (salvo `ignoreId`, el propio objeto) y los límites del mapa.
 */
export function tileWalkable(map, tx, ty, { ignoreId = null } = {}) {
  if (!map) return true;
  const index = mapIndex(map);
  const name = nameAt(map, tx, ty);
  if (name == null) return false;
  if (tileNameSolid(index, name)) return false;
  const x = tx * TILE + 8;
  const feet = ty * TILE + 12;
  if (!inBounds(map, x, feet)) return false;
  const box = { x: x - 5, y: feet - 6, w: 10, h: 6 };
  return !index.solids.some((s) => (ignoreId == null || s.id !== ignoreId) && overlaps(box, s));
}

function lowSolidAt(index, tx, ty, ignoreId) {
  const x = tx * TILE + 8;
  const feet = ty * TILE + 12;
  const box = { x: x - 5, y: feet - 6, w: 10, h: 6 };
  return index.low.find((s) => (ignoreId == null || s.id !== ignoreId) && overlaps(box, s)) || null;
}

const DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0]];

/**
 * ¿El objeto cuelga de una pared? Ninguno de sus tiles de huella es piso
 * caminable (contando sus propios tiles sólidos como pared).
 */
export function isWallObject(obj, map) {
  if (!obj || !map) return false;
  const foot = objectFootTiles(obj);
  if (!foot.length) return false;
  return foot.every((t) => !tileWalkable(map, t.tx, t.ty, { ignoreId: obj.id }));
}

/**
 * Casilleros de acceso de un objeto: piso caminable pegado a la huella.
 * - Mueble: los 4 vecinos; si en el medio hay un mueble bajo, un casillero
 *   más allá en la misma dirección.
 * - Pared: se baja (o se sube, si cuelga del borde de abajo del mapa) derecho
 *   por la pared hasta el primer casillero caminable.
 */
export function objectAccessTiles(obj, map) {
  const foot = objectFootTiles(obj);
  const key = (t) => `${t.tx},${t.ty}`;
  const footSet = new Set(foot.map(key));
  const access = new Set();
  if (!foot.length) return access;
  const index = mapIndex(map);
  const wall = isWallObject(obj, map);

  if (wall) {
    const bottom = (obj.y + (obj.th || 1)) * TILE;
    const dy = bottom >= (map.rows || 0) * TILE - TILE / 2 ? -1 : 1;
    for (const t of foot) {
      let sx = t.tx;
      let sy = t.ty + dy;
      for (let step = 0; step < MAX_WALL_STEP; step++) {
        if (sx < 0 || sy < 0 || sx >= (map.cols || 0) || sy >= (map.rows || 0)) break;
        if (footSet.has(key({ tx: sx, ty: sy }))) { sy += dy; continue; }
        if (tileWalkable(map, sx, sy, { ignoreId: obj.id })) {
          access.add(key({ tx: sx, ty: sy }));
          // Mueble bajo pegado del otro lado (el sofá bajo la ventana): su
          // piso de adelante también es acceso.
          const bx = sx;
          const by = sy + dy;
          if (lowSolidAt(index, bx, by, obj.id)) {
            const ax = bx;
            const ay = by + dy;
            if (tileWalkable(map, ax, ay, { ignoreId: obj.id })) {
              access.add(key({ tx: ax, ty: ay }));
            }
          }
          break;
        }
        if (lowSolidAt(index, sx, sy, obj.id)) {
          sy += dy;
          if (tileWalkable(map, sx, sy, { ignoreId: obj.id })) access.add(key({ tx: sx, ty: sy }));
          break;
        }
        const name = nameAt(map, sx, sy);
        if (name == null || !tileNameSolid(index, name)) break;
        sy += dy;
      }
    }
    return access;
  }

  for (const t of foot) {
    for (const [dx, dy] of DIRS) {
      const nx = t.tx + dx;
      const ny = t.ty + dy;
      if (footSet.has(key({ tx: nx, ty: ny }))) continue;
      // 1) piso caminable: acceso directo.
      if (tileWalkable(map, nx, ny, { ignoreId: obj.id })) {
        access.add(key({ tx: nx, ty: ny }));
        continue;
      }
      // 2) mueble bajo en el medio: se alcanza un casillero más allá.
      if (lowSolidAt(index, nx, ny, obj.id)) {
        const ax = nx + dx;
        const ay = ny + dy;
        if (!footSet.has(key({ tx: ax, ty: ay }))
          && tileWalkable(map, ax, ay, { ignoreId: obj.id })) {
          access.add(key({ tx: ax, ty: ay }));
        }
      }
    }
  }
  return access;
}

/** Accesos de un candidato de la lista (soporte si es un objeto apoyado). */
export function candidateAccessTiles(cand, map) {
  if (!cand) return new Set();
  if (cand.access instanceof Set) return cand.access;
  if (Array.isArray(cand.access)) return new Set(cand.access.map((t) => (typeof t === 'string' ? t : `${t.tx},${t.ty}`)));
  if (!map) return new Set();
  if (cand.kind === 'surfaceItem') {
    const support = supportObject(cand, map);
    return support ? objectAccessTiles(support, map) : new Set();
  }
  const ref = cand.ref || (map.objects || []).find((o) => o.id === cand.id);
  if (ref && ref.x != null && ref.tw != null) return objectAccessTiles(ref, map);
  // NPC, pickup, warp: la huella ya es el casillero (o el rect) del candidato.
  const access = new Set();
  for (const t of candidateFootTiles(cand, map)) {
    for (const [dx, dy] of DIRS) {
      const nx = t.tx + dx;
      const ny = t.ty + dy;
      if (tileWalkable(map, nx, ny)) access.add(`${nx},${ny}`);
    }
  }
  return access;
}

/** Casillero donde están parados los pies del jugador. */
export function playerFootTile(player) {
  if (!player) return { tx: 0, ty: 0 };
  return { tx: Math.floor(player.x / TILE), ty: Math.floor((player.feet - 1) / TILE) };
}

/** ¿El jugador está parado en un acceso del candidato? */
export function playerInAccess(player, cand, map) {
  const t = playerFootTile(player);
  return candidateAccessTiles(cand, map).has(`${t.tx},${t.ty}`);
}

/**
 * ¿El jugador mira hacia la huella? Vale si el tile de acción cae en la
 * huella o si la huella queda en la dirección de `dir`.
 */
export function facesFootprint(player, cand, map, dir) {
  const foot = candidateFootTiles(cand, map);
  if (!foot.length) return false;
  const [dx, dy] = {
    down: [0, 1], up: [0, -1], right: [1, 0], left: [-1, 0],
  }[dir] || [0, 1];
  const base = playerFootTile(player);
  // Parado encima de una cosa del piso (no sólida) también se la alcanza.
  if (foot.some((t) => t.tx === base.tx && t.ty === base.ty)) return true;
  const at = { tx: base.tx + dx, ty: base.ty + dy };
  if (foot.some((t) => t.tx === at.tx && t.ty === at.ty)) return true;
  const cy = foot.reduce((s, t) => s + t.ty, 0) / foot.length;
  const cx = foot.reduce((s, t) => s + t.tx, 0) / foot.length;
  if (dir === 'up') return cy < base.ty;
  if (dir === 'down') return cy > base.ty;
  if (dir === 'left') return cx < base.tx;
  if (dir === 'right') return cx > base.tx;
  return false;
}
