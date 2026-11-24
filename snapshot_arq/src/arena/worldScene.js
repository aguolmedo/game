// Mundo de la salida: mapa del barrio, límites, sólidos, spawns, luces y
// flow fields de los bichos. Funciones que reciben la escena.
import { WorldMap } from '../mapView.js';
import { LightOverlay } from '../lighting.js';
import { ENEMY_TYPES, enemyBox, boxHitsSolids } from './enemies.js';
import {
  buildBoxMask, widenMask, createField, rebuild, isReachableAt,
  TILE as FLOW_TILE,
} from './flowfield.js';

// Flow field (IA): recálculo al cambiar de baldosa o cada 0,25 s, con
// enfriamiento de 0,08 s para no reconstruir 60 veces por segundo.
const FLOW_INTERVAL = 0.25;
const FLOW_COOLDOWN = 0.08;
const SNOW_LIGHT_RADIUS = 310;
const MAX_SNOW_LIGHTS = 8;

/** Puntos de aparición de respaldo si el mapa no trae spawns. */
function fallbackSpawns(map) {
  const w = (map && map.cols ? map.cols : 80) * 16;
  const h = (map && map.rows ? map.rows : 40) * 16;
  const list = [];
  for (const fx of [0.1, 0.3, 0.5, 0.7, 0.9]) {
    list.push({ x: Math.round(w * fx), y: Math.round(h * 0.6) });
    list.push({ x: Math.round(w * fx), y: Math.round(h * 0.85) });
  }
  return list;
}


/** Reemplaza el mapa de la salida, liberando el mundo anterior. */
export function buildWorld(scene, map) {
  scene.disposeWorld();
  // P5: al reconstruir no puede quedar nada de la salida anterior.
  scene.clearEnemies();
  scene.clearFx();
  scene.clearGroundLoot();
  scene.mapData = map;
  scene.world = new WorldMap(scene.scene, scene.assets, map);

  const arena = map.arena || {};
  const bounds = map.bounds || {};
  const mapW = map.cols * 16;
  const mapH = map.rows * 16;
  scene.arena = {
    minX: Number.isFinite(arena.minX) ? arena.minX : 16,
    maxX: Number.isFinite(arena.maxX) ? arena.maxX : mapW - 16,
    minY: Number.isFinite(arena.minY) ? arena.minY : 7 * 16,
    maxY: Number.isFinite(arena.maxY) ? arena.maxY : mapH - 2,
  };
  scene.bounds = {
    minX: Number.isFinite(bounds.minX) ? bounds.minX : scene.arena.minX,
    maxX: Number.isFinite(bounds.maxX) ? bounds.maxX : scene.arena.maxX,
    minFeet: Math.max(
      Number.isFinite(bounds.minFeet) ? bounds.minFeet : 0,
      Number.isFinite(arena.minY) ? arena.minY : 0,
    ),
    maxFeet: Math.min(
      Number.isFinite(bounds.maxFeet) ? bounds.maxFeet : mapH,
      Number.isFinite(arena.maxY) ? arena.maxY : mapH,
      mapH - 2,
    ),
  };
  scene.exitHome = map.exitHome || null;
  scene.spawns = scene.readSpawns(map.spawns);
  scene.crate = scene.findCrate(map);
  scene.addCrateVisual();
  scene.solidBoxes = scene.buildSolids();
  scene.buildFlowFields();
  scene.snowLights = [];
  scene.dynamicLights = [];
  scene.addSnowLights();
  scene.light = new LightOverlay(scene.assets, scene.mapData);
  scene.cam = scene.world.cameraFor(scene.player.x, scene.player.feet - 18);
}

/** Saca del scene el piso, los muebles y la caja, y libera sus recursos. */
export function disposeWorld(scene) {
  const three = scene.scene;
  const drop = (mesh) => {
    if (!mesh) return;
    three.remove(mesh);
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = mesh.material;
    if (!mat) return;
    if (mat.map) mat.map.dispose();
    mat.dispose();
  };
  if (scene.world) {
    drop(scene.world.floor);
    for (const obj of scene.world.map.objects || []) {
      drop(obj.mesh);
      drop(obj.glowMesh);
      obj.mesh = null;
      obj.glowMesh = null;
    }
    // Las mallas batcheadas tienen su propio atlas: se libera todo.
    for (const mesh of scene.world.batches || []) {
      three.remove(mesh);
      mesh.geometry.dispose();
      if (mesh.material.map) mesh.material.map.dispose();
      mesh.material.dispose();
    }
    scene.world.batches = [];
  }
  scene.world = null;
  scene.light = null;
}

/** Luces de nieve en el centro de cada pieza, máximo 8 (el shader usa 8). */
export function addSnowLights(scene) {
  const lights = scene.mapData.lights || (scene.mapData.lights = []);
  for (const cell of scene.cells.slice(0, MAX_SNOW_LIGHTS)) {
    const light = {
      x: cell.col * 20 * 16 + 160,
      y: cell.row * 20 * 16 + 160,
      radius: SNOW_LIGHT_RADIUS,
      color: '#96e1f0',
      kind: 'snow',
      flicker: 0.02,
      state: 'on',
      onlyIn: 'apagon',
    };
    lights.push(light);
    scene.snowLights.push(light);
  }
}

export function addMapLight(scene, light) {
  const lights = scene.mapData.lights || (scene.mapData.lights = []);
  lights.push(light);
  scene.dynamicLights.push(light);
  return light;
}

export function removeMapLight(scene, light) {
  if (!light) return;
  const lights = (scene.mapData && scene.mapData.lights) || [];
  const i = lights.indexOf(light);
  if (i >= 0) lights.splice(i, 1);
  const j = scene.dynamicLights.indexOf(light);
  if (j >= 0) scene.dynamicLights.splice(j, 1);
}

export function clearDynamicLights(scene) {
  for (const light of [...scene.dynamicLights]) scene.removeMapLight(light);
  scene.dynamicLights = [];
}

/** H2 puede exportar spawns como lista o como mapa con nombre. */
export function readSpawns(scene, raw) {
  let list = null;
  if (Array.isArray(raw)) list = raw;
  else if (raw && typeof raw === 'object') list = Object.values(raw);
  if (!list || !list.length) list = fallbackSpawns(scene.mapData);
  return list.map((s) => (
    Array.isArray(s) ? { x: s[0], y: s[1] } : { x: s.x, y: s.y }
  )).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
}

export function findCrate(scene, map) {
  const mark = map && map.crate;
  if (!mark || !Number.isFinite(mark.x) || !Number.isFinite(mark.y)) return null;
  return {
    x: Math.round(mark.x - 8),
    y: Math.round(mark.y - 8),
    w: 16,
    h: 16,
    fromMap: true,
  };
}

export function addCrateVisual(scene) {
  if (!scene.crate) return;
  // C2: la caja de municiones ya viene como objeto sólido del mapa. Si está,
  // se reemplaza por la marca (una sola caja de 16x16) en vez de sumar otra.
  const crateObj = (scene.mapData.objects || []).find(
    (obj) => obj.sprite === 'crate' && obj.type === 'container',
  );
  const already = crateObj && scene.world.solids.some((solid) => solid.id === crateObj.id);
  if (!already) {
    // La caja siempre frena a los cascarudos, aunque el mapa no la marque sólida.
    scene.world.solids.push({ ...scene.crate, id: 'caja_municiones' });
  }
}

export function buildSolids(scene) {
  const list = scene.world.solids.map((s) => ({ x: s.x, y: s.y, w: s.w, h: s.h }));
  const map = scene.world.map;
  for (let y = 0; y < map.rows; y++) {
    for (let x = 0; x < map.cols; x++) {
      if (!scene.world.solidTile(x, y)) continue;
      list.push({ x: x * 16, y: y * 16, w: 16, h: 16 });
    }
  }
  return list;
}

/** Arma las máscaras y los campos de los tres tamaños de bicho. */
export function buildFlowFields(scene) {
  const cols = scene.mapData.cols;
  const rows = scene.mapData.rows;
  // Máscaras por tamaño: la caja real del bicho validada en el centro de
  // cada baldosa (los sólidos salen de scene.solidBoxes, como pide el diseño;
  // rasterizar cajas a baldosas enteras mandaba el camino contra la pared).
  const maskFor = (type) => {
    const def = ENEMY_TYPES[type] || ENEMY_TYPES.cascarudo;
    const box = enemyBox(def, 0, 0);
    // 1 px de tolerancia: la caja del acorazado (16,8) entra en 2 baldosas.
    return buildBoxMask(cols, rows, scene.solidBoxes, box, 1);
  };
  scene.flowMasks = {
    cascarudo: maskFor('cascarudo'),
    veloz: maskFor('veloz'),
    acorazado: widenMask(maskFor('acorazado'), cols, rows, 2),
  };
  scene.flows = {
    cascarudo: createField(cols, rows),
    veloz: createField(cols, rows),
    acorazado: createField(cols, rows),
  };
  scene.flowTile = { x: -1, y: -1 };
  scene.flowT = FLOW_COOLDOWN; // el primer update reconstruye
  scene.updateFlow(0);
}

/** Recalcula los campos si el jugador cambió de baldosa o pasó 0,25 s. */
export function updateFlow(scene, dt) {
  if (!scene.flows) return;
  const tx = Math.floor(scene.player.x / FLOW_TILE);
  const ty = Math.floor(scene.player.feet / FLOW_TILE);
  const moved = tx !== scene.flowTile.x || ty !== scene.flowTile.y;
  scene.flowT += Math.max(0, Number(dt) || 0);
  if (scene.flowT < FLOW_COOLDOWN) return;
  if (!moved && scene.flowT < FLOW_INTERVAL) return;
  for (const type of Object.keys(scene.flows)) {
    // El jugador está físicamente en su baldosa: es la semilla aunque la
    // máscara la vea tapada por un objeto bajo.
    rebuild(scene.flows[type], scene.flowMasks[type], tx, ty, true);
  }
  scene.flowTile = { x: tx, y: ty };
  scene.flowT = 0;
}

/** ¿El bicho entra en este punto y puede llegar desde donde está el jugador? */
export function canSpawnAt(scene, type, x, y) {
  const def = ENEMY_TYPES[type] || ENEMY_TYPES.cascarudo;
  if (boxHitsSolids(enemyBox(def, x, y), scene.solidBoxes)) return false;
  const flow = scene.flows && scene.flows[def === ENEMY_TYPES[type] ? type : 'cascarudo'];
  if (flow && !isReachableAt(flow, x, y, 1)) return false;
  return true;
}
