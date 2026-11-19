// Auditoría de alcance de TODOS los mapas (DIRECCION.md, regla única).
// Cada interactivo tiene que tener al menos un casillero de acceso caminable
// y alcanzable a pie desde el spawn, y desde ahí la E (mirando) y el click
// tienen que elegir lo mismo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { attic } from '../src/maps/attic.js';
import { house } from '../src/maps/house.js';
import { garage } from '../src/maps/garage.js';
import { street } from '../src/maps/street.js';
import { pickAt, pickTarget } from '../src/interaction.js';
import {
  objectAccessTiles, playerInAccess, tileWalkable,
} from '../src/reach.js';
import { itemsForMap } from '../src/surfaces.js';
import { supportCheck } from '../src/placement.js';
import { INITIAL_ITEMS } from '../src/data/surfaces.js';
import { getItem, isGrabbable } from '../src/items.js';

const MAPS = [attic, house, garage, street];
const DIRS = ['up', 'down', 'left', 'right'];

/** Candidato como los arma mapView.addObject() (sin recorte de textura). */
function objectCandidate(obj) {
  const w = (obj.tw || 1) * 16;
  const h = (obj.th || 1) * 16;
  return {
    id: obj.id,
    kind: obj.container ? 'container' : 'object',
    type: obj.type || (obj.container ? 'container' : 'decor'),
    name: obj.name,
    talk: obj.talk,
    priority: obj.container ? 1 : 1,
    x: (obj.x + (obj.tw || 1) / 2) * 16,
    y: (obj.y + (obj.th || 1)) * 16,
    w,
    h,
    cursorBox: { x: obj.x * 16, y: obj.y * 16, w, h },
    ref: obj,
    container: obj.container,
    interact: obj.interact,
    label: obj.name || (obj.container ? obj.container.name : obj.id),
  };
}

function candidatesOf(map) {
  const list = [];
  for (const obj of map.objects || []) {
    if (obj.type || obj.interact || obj.container) list.push(objectCandidate(obj));
  }
  for (const wi of itemsForMap(map.id, INITIAL_ITEMS, map)) {
    const item = getItem(wi.itemId);
    list.push({
      id: `surface_${wi.uid}`, kind: 'surfaceItem', priority: 3,
      x: wi.x, y: wi.y, w: 12, h: 12,
      cursorBox: { x: wi.x - 6, y: wi.y - 12, w: 12, h: 12 },
      objectId: wi.objectId, worldItem: wi, item,
      grabbable: isGrabbable(wi.itemId),
      label: `${isGrabbable(wi.itemId) ? 'Agarrar' : 'Mirar'} ${item.name}`,
    });
  }
  for (const npc of map.npcs || []) {
    list.push({
      id: npc.id, kind: 'npc', priority: 2,
      x: npc.x, y: npc.feet + 26, w: 20, h: 52, npc,
      cursorBox: { x: npc.x - 8, y: npc.feet - 32, w: 16, h: 32 },
      label: `Hablar con ${npc.name || npc.id}`, type: 'person', name: npc.name || npc.id,
    });
  }
  for (const warp of map.warps || []) {
    list.push({
      id: `warp_${warp.id}`, kind: 'warp', priority: 0,
      x: warp.x + warp.w / 2, y: warp.y + warp.h, w: warp.w, h: warp.h,
      cursorBox: { x: warp.x, y: warp.y, w: warp.w, h: warp.h },
      warp, label: warp.label,
    });
  }
  return list;
}

function playerAt(tx, ty, dir = 'up') {
  return { x: tx * 16 + 8, feet: ty * 16 + 12, dir };
}

/** BFS de casilleros caminables desde el spawn del mapa. */
function reachableTiles(map) {
  const spawn = map.spawn || { x: 16, y: 16 };
  const start = { tx: Math.floor(spawn.x / 16), ty: Math.floor((spawn.y - 1) / 16) };
  const seen = new Set();
  const queue = [];
  const key = (t) => `${t.tx},${t.ty}`;
  if (tileWalkable(map, start.tx, start.ty)) {
    seen.add(key(start));
    queue.push(start);
  }
  while (queue.length) {
    const t = queue.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = { tx: t.tx + dx, ty: t.ty + dy };
      const k = key(n);
      if (seen.has(k) || !tileWalkable(map, n.tx, n.ty)) continue;
      seen.add(k);
      queue.push(n);
    }
  }
  return seen;
}

/** Accesos de un candidato como pares {tx,ty}. */
function accessOf(cand, map) {
  if (cand.kind === 'surfaceItem') {
    const obj = map.objects.find((o) => o.id === cand.objectId);
    return obj ? [...objectAccessTiles(obj, map)] : [];
  }
  const obj = cand.ref || (cand.kind === 'npc' ? null : null);
  if (obj) return [...objectAccessTiles(obj, map)];
  // NPC / warp: los 4 vecinos de su huella (reusa la regla de reach.js).
  const set = playerInAccess;
  void set;
  const foot = cand.kind === 'npc'
    ? [{ tx: Math.floor(cand.npc.x / 16), ty: Math.floor((cand.npc.feet - 1) / 16) }]
    : (() => {
      const w = cand.warp;
      const out = [];
      for (let y = Math.floor(w.y / 16); y < Math.ceil((w.y + w.h) / 16); y++) {
        for (let x = Math.floor(w.x / 16); x < Math.ceil((w.x + w.w) / 16); x++) out.push({ tx: x, ty: y });
      }
      return out;
    })();
  const out = [];
  for (const t of foot) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = t.tx + dx;
      const ny = t.ty + dy;
      if (tileWalkable(map, nx, ny)) out.push(`${nx},${ny}`);
    }
  }
  return out;
}

test('auditoría: todos los interactivos tienen acceso caminable desde el spawn', () => {
  const failures = [];
  for (const map of MAPS) {
    const reachable = reachableTiles(map);
    for (const cand of candidatesOf(map)) {
      const access = accessOf(cand, map).filter((k) => reachable.has(k));
      if (access.length === 0) {
        failures.push(`${map.id}/${cand.id} [${cand.kind}] sin acceso caminable (${cand.label})`);
      }
    }
  }
  assert.deepEqual(failures, [], `objetos inalcanzables:\n${failures.join('\n')}`);
});

test('auditoría: desde cada acceso, la E y el click eligen el mismo objetivo', () => {
  const failures = [];
  for (const map of MAPS) {
    const reachable = reachableTiles(map);
    const cands = candidatesOf(map);
    for (const cand of cands) {
      const access = accessOf(cand, map).filter((k) => reachable.has(k));
      for (const key of access) {
        const [tx, ty] = key.split(',').map(Number);
        let sawTarget = false;
        for (const dir of DIRS) {
          const player = playerAt(tx, ty, dir);
          const byE = pickTarget(player, cands, { dir, map });
          if (!byE.target) continue;
          sawTarget = true;
          const box = byE.target.cursorBox;
          const point = { x: box.x + box.w / 2, y: box.y + box.h / 2 };
          const byClick = pickAt(player, cands, point, { dir, map });
          if (byClick.target?.id !== byE.target.id || byClick.near !== true) {
            failures.push(
              `${map.id}/${cand.id} desde ${key} ${dir}: E=${byE.target.id} click=${byClick.target?.id} near=${byClick.near}`,
            );
          }
        }
        if (!sawTarget) failures.push(`${map.id}/${cand.id} desde ${key}: ningún adorno de dirección da objetivo`);
      }
    }
  }
  assert.deepEqual(failures, [], `E/click divergen:\n${failures.join('\n')}`);
});

// ------------------------------------------------------------- casos fijos
function targetFrom(map, cands, tx, ty, dir) {
  return pickTarget(playerAt(tx, ty, dir), cands, { dir, map });
}

test('fijo: la ventana del living se alcanza desde adelante del sofá', () => {
  const cands = candidatesOf(house);
  const windowCand = cands.find((c) => c.id === 'window_living');
  const res = targetFrom(house, cands, 7, 5, 'up');
  assert.ok(res.target, 'sin objetivo desde adelante del sofá');
  assert.equal(res.target.id, 'window_living');
  assert.ok(playerInAccess(playerAt(7, 5), windowCand, house));
});

test('fijo: frente al sofá mirando arriba nunca elige la mesa de atrás', () => {
  const cands = candidatesOf(house);
  const table = house.objects.find((o) => o.id === 'living_table');
  for (const [tx, ty] of [[6, 5], [7, 5], [7, 4]]) {
    const res = targetFrom(house, cands, tx, ty, 'up');
    if (!res.target) continue;
    assert.notEqual(res.target.id, 'living_table', `eligió la mesa en (${tx},${ty})`);
    assert.notEqual(res.target.objectId, 'living_table', `eligió lo apoyado en la mesa en (${tx},${ty})`);
    const player = playerAt(tx, ty, 'up');
    const footAbove = table.y * 16 <= player.feet - 16;
    if (!footAbove) assert.ok(true);
  }
});

test('fijo: estante izquierdo del altillo (libros y frascos) alcanzable', () => {
  const cands = candidatesOf(attic);
  const shelf = attic.objects.find((o) => o.id === 'shelf_left');
  const access = [...objectAccessTiles(shelf, attic)];
  assert.ok(access.length >= 1, 'el estante no tiene accesos');
  const key = access.includes('3,5') ? '3,5' : access[0];
  const [tx, ty] = key.split(',').map(Number);
  const byE = pickTarget(playerAt(tx, ty, 'up'), cands, { dir: 'up', map: attic });
  assert.equal(byE.target.objectId, 'shelf_left', 'la E no elige nada del estante');
  for (const itemId of ['libros', 'frascos']) {
    const cand = cands.find((c) => c.kind === 'surfaceItem' && c.worldItem.itemId === itemId);
    assert.ok(cand, `falta ${itemId} en el estante`);
    const byClick = pickAt(playerAt(tx, ty, 'up'), cands, {
      x: cand.cursorBox.x + cand.cursorBox.w / 2,
      y: cand.cursorBox.y + cand.cursorBox.h / 2,
    }, { dir: 'up', map: attic });
    assert.equal(byClick.target.id, cand.id, `${itemId} no se elige con el click`);
    assert.equal(byClick.near, true, `${itemId} queda lejos desde el acceso`);
  }
});

test('fijo: el casco del estante del garaje se alcanza con las dos vías', () => {
  const cands = candidatesOf(garage);
  const casco = cands.find((c) => c.kind === 'surfaceItem' && c.worldItem.itemId === 'casco');
  assert.ok(casco, 'falta el casco');
  const obj = garage.objects.find((o) => o.id === casco.objectId);
  const access = [...objectAccessTiles(obj, garage)];
  assert.ok(access.length >= 1);
  const [tx, ty] = access[0].split(',').map(Number);
  const player = playerAt(tx, ty, 'up');
  const byE = pickTarget(player, cands, { dir: 'up', map: garage });
  assert.equal(byE.target.id, casco.id);
  const byClick = pickAt(player, cands, {
    x: casco.cursorBox.x + casco.cursorBox.w / 2,
    y: casco.cursorBox.y + casco.cursorBox.h / 2,
  }, { dir: 'up', map: garage });
  assert.equal(byClick.target.id, casco.id);
  assert.equal(byClick.near, true);
});

test('fijo: el extractor y la ferretería se alcanzan con las dos vías', () => {
  const extractor = garage.objects.find((o) => o.id === 'extractor');
  const gCands = candidatesOf(garage);
  const gAccess = [...objectAccessTiles(extractor, garage)];
  const [gx, gy] = gAccess[0].split(',').map(Number);
  const gp = playerAt(gx, gy, 'up');
  const gE = pickTarget(gp, gCands, { dir: 'up', map: garage });
  assert.equal(gE.target.id, 'extractor');
  const gClick = pickAt(gp, gCands, { x: 136, y: 10 }, { dir: 'up', map: garage });
  assert.equal(gClick.target.id, 'extractor');
  assert.equal(gClick.near, true);

  const ferreteria = street.objects.find((o) => o.id === 'ferreteria');
  const sCands = candidatesOf(street);
  const sAccess = [...objectAccessTiles(ferreteria, street)];
  let found = false;
  for (const key of sAccess) {
    const [tx, ty] = key.split(',').map(Number);
    const player = playerAt(tx, ty, 'up');
    const byE = pickTarget(player, sCands, { dir: 'up', map: street });
    if (byE.target?.id !== 'ferreteria') continue;
    found = true;
    const byClick = pickAt(player, sCands, {
      x: ferreteria.x * 16 + 40, y: ferreteria.y * 16 + 20,
    }, { dir: 'up', map: street });
    assert.equal(byClick.target.id, 'ferreteria');
    assert.equal(byClick.near, true);
  }
  assert.ok(found, 'la ferretería no se elige desde ningún acceso');
});

// ------------------------------------ auditoría después de mover cada mueble
// §10: mover cada mueble liviano a un lugar válido de prueba y volver a correr
// la auditoría (0 fallos). El mueble se apoya con la regla real (§6).
function withMovedObject(map, object, tx, ty) {
  return {
    ...map,
    objects: map.objects.map((obj) => (
      obj.id === object.id
        ? { ...obj, x: tx, y: ty, solid: true }
        : obj
    )),
  };
}

function findValidSupport(map, object) {
  const reachable = reachableTiles(map);
  for (let ty = 0; ty < map.rows; ty++) {
    for (let tx = 0; tx < map.cols; tx++) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const px = tx + dx;
        const py = ty + dy;
        if (!reachable.has(`${px},${py}`)) continue;
        const player = {
          x: px * 16 + 8, feet: py * 16 + 12, dir: 'down',
        };
        const check = supportCheck({
          map, npcs: map.npcs, warps: map.warps, items: [],
          player, object, tx, ty,
        });
        if (check.ok) return { tx, ty, player };
      }
    }
  }
  return null;
}

test('auditoría: mover cada mueble liviano a un lugar válido deja 0 fallos', () => {
  const failures = [];
  for (const map of MAPS) {
    const reachable = reachableTiles(map);
    for (const object of map.objects.filter((o) => o.movable)) {
      const spot = findValidSupport(map, object);
      if (!spot) {
        failures.push(`${map.id}/${object.id}: no encontró un lugar válido de prueba`);
        continue;
      }
      const moved = withMovedObject(map, object, spot.tx, spot.ty);
      const movedReach = reachableTiles(moved);
      for (const cand of candidatesOf(moved)) {
        const access = accessOf(cand, moved)
          .filter((k) => movedReach.has(k));
        if (access.length === 0) {
          failures.push(`${map.id}/${object.id} movido a ${spot.tx},${spot.ty}: `
            + `${cand.id} sin acceso`);
        }
      }
      for (const warp of moved.warps || []) {
        let ok = false;
        for (let y = Math.floor(warp.y / 16); y < Math.ceil((warp.y + warp.h) / 16); y++) {
          for (let x = Math.floor(warp.x / 16); x < Math.ceil((warp.x + warp.w) / 16); x++) {
            if (reachableTiles(moved).has(`${x},${y}`)) ok = true;
          }
        }
        if (!ok) failures.push(`${map.id}/${object.id}: el warp ${warp.id} quedó inalcanzable`);
      }
      void reachable;
    }
  }
  assert.deepEqual(failures, [], `después de mover:\n${failures.join('\n')}`);
});
