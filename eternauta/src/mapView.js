import * as THREE from 'three';
import {
  depthFor, imageSprite, regionTexture, makeGlow, buildFloorTexture, opaqueRect,
} from './sprite.js';
import { VIEW_W, VIEW_H } from './sprite.js';
import { viewport, snapCamera } from './viewport.js';
import { bumpMapVersion } from './reach.js';

// Atlas donde buscar cada sprite de mapa, en orden. Las piezas viejas viven
// en objects.png; las nuevas en los atlases del concepto.
export const SPRITE_ATLASES = [
  ['objectsData', 'objects'],
  ['interior2Data', 'interior2'],
  ['propsData', 'props'],
  ['street2Data', 'street2'],
  ['housesData', 'houses'],
  ['fxData', 'fx'],
];

/** Sprite de cualquier atlas del juego (objects, interior2, props, street2...). */
export function anySprite(assets, name) {
  for (const [dataKey, imageKey] of SPRITE_ATLASES) {
    const data = assets[dataKey];
    const frame = data && data.frames && data.frames[name];
    if (!frame) continue;
    const sheet = assets[imageKey];
    const [x, y, w, h] = Array.isArray(frame)
      ? frame
      : [frame.x, frame.y, frame.w, frame.h];
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({
        map: regionTexture(sheet, x, y, w, h),
        transparent: true, alphaTest: 0.5, side: THREE.DoubleSide,
      }),
    );
    mesh.userData.frame = { x, y, w, h };
    mesh.userData.sheet = sheet;
    return mesh;
  }
  throw new Error(`Falta el sprite "${name}" en todos los atlases de mapa`);
}

/** Copia superficial de un mapa para que cada escena tenga sus propios
 * objetos/meshes (la calle se usa en calle, arena, muerte y final). */
export function cloneMap(map) {
  return {
    ...map,
    objects: (map.objects || []).map((obj) => ({ ...obj })),
    lights: (map.lights || []).map((light) => ({ ...light })),
  };
}

/** Capa de piso + objetos del mapa, colisiones y candidatos de interaccion. */
export class WorldMap {
  constructor(scene, assets, map) {
    this.scene = scene;
    this.assets = assets;
    this.map = map;
    this.w = map.cols * 16;
    this.h = map.rows * 16;
    this.solids = [];
    this.candidates = [];
    this.glows = [];
    // Posición original de cada mueble (para reset() y para devolver un
    // mueble liviano a su lugar si la historia interrumpe el acarreo).
    this.home = new Map();

    const floorTex = buildFloorTexture(map, assets);
    const floor = imageSprite(floorTex, this.w, this.h, 0.5);
    floor.position.set(this.w / 2, this.h / 2, 0.5);
    floor.material.depthWrite = false;
    scene.add(floor);
    this.floor = floor;

    for (const obj of map.objects) {
      this.home.set(obj.id, { x: obj.x, y: obj.y, solid: obj.solid });
      this.addObject(obj);
    }
    this.rebuildSolids();
  }

  /** Geometría de dibujo de un objeto según su posición actual en la grilla. */
  layout(obj) {
    const mesh = obj.mesh;
    const w = mesh.geometry.parameters.width;
    const h = mesh.geometry.parameters.height;
    const anchorX = (obj.x + obj.tw / 2) * 16;
    const anchorY = (obj.y + obj.th) * 16;
    const [ox, oy] = obj.offset || [0, 0];
    const px = Math.round(anchorX + ox);
    const py = Math.round(anchorY - h / 2 + oy);
    const z = Number.isFinite(obj.z) ? obj.z : (obj.flat ? 1.9 : depthFor(anchorY));
    const trim = opaqueRect(mesh.userData.sheet && mesh.userData.sheet.image,
      [mesh.userData.frame.x, mesh.userData.frame.y, w, h]);
    const drawBox = trim
      ? {
        x: Math.round(px - w / 2 + trim.x) - 1,
        y: Math.round(py - h / 2 + trim.y) - 1,
        w: trim.w + 2,
        h: trim.h + 2,
      }
      : { x: px - w / 2 - 1, y: py - h / 2 - 1, w: w + 2, h: h + 2 };
    return {
      anchorX, anchorY, px, py, w, h, z, drawBox,
    };
  }

  /** Vuelve a ubicar malla, resplandor y candidatos de un objeto movido. */
  updateObject(obj) {
    if (!obj || !obj.mesh) return;
    bumpMapVersion(this.map);
    const box = this.layout(obj);
    obj.mesh.position.set(box.px, box.py, box.z);
    if (obj.glowMesh) obj.glowMesh.position.set(box.px, box.py - box.h * 0.2, box.z + 0.002);
    for (const c of this.candidates) {
      if (c.ref !== obj) continue;
      if (c.kind === 'object') {
        const hit = obj.hitFromSprite
          ? { x: box.px, y: box.py + box.h / 2, w: box.w, h: box.h }
          : { x: box.anchorX, y: box.anchorY, w: obj.tw * 16, h: obj.th * 16 };
        c.x = hit.x;
        c.y = hit.y;
        c.w = hit.w;
        c.h = hit.h;
      } else {
        c.x = box.anchorX;
        c.y = box.anchorY;
        c.w = obj.tw * 16;
        c.h = obj.th * 16;
      }
      c.cursorBox = box.drawBox;
    }
  }

  /** Muestra u oculta un objeto (mueble liviano levantado, historia). */
  hideObject(obj, hidden) {
    if (!obj) return;
    obj.hidden = Boolean(hidden);
    if (obj.mesh) obj.mesh.visible = !obj.hidden;
    if (obj.glowMesh) obj.glowMesh.visible = !obj.hidden;
    bumpMapVersion(this.map);
    this.rebuildSolids();
  }

  /** Rehace la lista de sólidos con los objetos visibles (movidos incluidos). */
  rebuildSolids() {
    bumpMapVersion(this.map);
    this.solids = [];
    for (const obj of this.map.objects || []) {
      if (!obj.solid || obj.hidden) continue;
      const s = obj.solid === true
        ? { x: 0, y: 0, w: obj.tw, h: obj.th }
        : obj.solid;
      this.solids.push({
        x: (obj.x + s.x) * 16,
        y: (obj.y + s.y) * 16,
        w: s.w * 16,
        h: s.h * 16,
        id: obj.id,
      });
    }
  }

  /** Devuelve todos los objetos a su casillero original (reset de partida). */
  resetPositions() {
    bumpMapVersion(this.map);
    for (const obj of this.map.objects || []) {
      const home = this.home.get(obj.id);
      if (home) {
        obj.x = home.x;
        obj.y = home.y;
        obj.solid = home.solid;
      }
      obj.hidden = false;
      if (obj.mesh) obj.mesh.visible = true;
      this.updateObject(obj);
    }
    this.rebuildSolids();
  }

  addObject(obj) {
    const mesh = anySprite(this.assets, obj.sprite);
    this.scene.add(mesh);
    obj.mesh = mesh;
    const box = this.layout(obj);
    mesh.position.set(box.px, box.py, box.z);

    if (obj.glow) {
      const glow = makeGlow(this.scene, 64, 40);
      glow.position.set(box.px, box.py - box.h * 0.2, box.z + 0.002);
      this.glows.push(glow);
      obj.glowMesh = glow;
    }

    if ((obj.type || obj.interact) && !obj.container) {
      // `hitFromSprite`: la caja de hover/accion es la del sprite dibujado
      // (con su offset), no la del tile de anclaje. La vela del altillo la usa.
      const hit = obj.hitFromSprite
        ? { x: box.px, y: box.py + box.h / 2, w: box.w, h: box.h }
        : { x: box.anchorX, y: box.anchorY, w: obj.tw * 16, h: obj.th * 16 };
      this.candidates.push({
        id: obj.id,
        kind: 'object',
        ...(Number.isFinite(obj.priority) ? { priority: obj.priority } : {}),
        x: hit.x,
        y: hit.y,
        w: hit.w,
        h: hit.h,
        cursorBox: box.drawBox,
        label: obj.name || obj.id,
        type: obj.type || 'decor',
        name: obj.name,
        talk: obj.talk || obj.interact?.talk,
        interact: obj.interact,
        ref: obj,
      });
    }
    if (obj.container) {
      this.candidates.push({
        id: obj.id,
        kind: 'container',
        priority: 1,
        x: box.anchorX,
        y: box.anchorY,
        w: obj.tw * 16,
        h: obj.th * 16,
        cursorBox: box.drawBox,
        label: obj.name || obj.container.name,
        type: obj.type || 'container',
        name: obj.name,
        talk: obj.talk,
        container: obj.container,
        ref: obj,
      });
    }
  }

  addCandidate(candidate) {
    this.candidates.push(candidate);
    return candidate;
  }

  /**
   * Modo apagón: apaga los resplandores de las farolas y enfría casas y pinos
   * (las ventanas están pintadas en los sprites). Las velas y lámparas de
   * aceite quedan encendidas. Lo usan WorldScene y la arena.
   */
  setDark(dark) {
    for (const obj of this.map.objects) {
      const mesh = obj.mesh;
      if (!mesh) continue;
      const isWindow = Boolean(obj.window) || /window/i.test(obj.sprite || '');
      if (isWindow) mesh.material.color.setHex(dark ? 0x6a7890 : 0xffffff);
      if (dark && /^house_|^shop_/i.test(obj.id || '')) {
        mesh.material.color.setHex(0x4a5268);
      }
      // Las farolas tienen la lámpara encendida pintada en el sprite: se
      // enfrían para que en el apagón no parezcan prendidas.
      if (dark && /farola|streetlight/i.test(obj.sprite || '')) {
        mesh.material.color.setHex(0x4a5268);
      }
      if (dark && /^pino|^arbusto/i.test(obj.id || '')) {
        mesh.material.color.setHex(0x6a7a90);
      }
      if (/oil_lamp|candle|lampara/i.test(obj.sprite || '')) {
        mesh.material.color.setHex(0xffffff);
      }
      if (obj.glowMesh) {
        const candle = /oil_lamp|candle|lampara|vela/i.test(obj.sprite || '');
        // Un objeto oculto (p. ej. la vela antes del apagón) no deja su resplandor.
        obj.glowMesh.visible = !obj.hidden && (!dark || candle);
      }
    }
  }

  /** ¿La caja (px) choca con un tile solido o un mueble? */
  isSolid(box) {
    for (const s of this.solids) {
      if (overlaps(box, s)) return true;
    }
    const x0 = Math.floor(box.x / 16);
    const x1 = Math.floor((box.x + box.w - 0.01) / 16);
    const y0 = Math.floor(box.y / 16);
    const y1 = Math.floor((box.y + box.h - 0.01) / 16);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (x < 0 || y < 0 || x >= this.map.cols || y >= this.map.rows) return true;
        const name = this.map.floor[y][x];
        for (const prefix of this.map.solidTiles) {
          if (name === prefix || name.startsWith(prefix)) return true;
        }
      }
    }
    return false;
  }

  cameraFor(x, y) {
    // La vista del mundo puede estar zoomeada (viewport.worldW/H).
    const vw = viewport.worldW || VIEW_W;
    const vh = viewport.worldH || VIEW_H;
    const maxX = this.w - vw;
    // Algunos mapas muestran un poco mas alla del borde de abajo (el fondo de
    // la casa, el cielo en la calle).
    const padBottom = this.map.camBottomPad || 0;
    const maxY = this.h - vh + padBottom;
    const cx = maxX <= 0 ? maxX / 2 : clamp(x - vw / 2, 0, maxX);
    const cy = maxY <= 0 ? maxY / 2 : clamp(y - vh / 2, 0, maxY);
    return { x: snapCamera(cx), y: snapCamera(cy) };
  }

  /** Rect del tile solido en (tx,ty) o null. */
  solidTile(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.map.cols || ty >= this.map.rows) return true;
    const name = this.map.floor[ty][tx];
    return this.map.solidTiles.some((p) => name === p || name.startsWith(p));
  }
}

export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x
    && a.y < b.y + b.h && a.y + a.h > b.y;
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}
