import * as THREE from 'three';
import {
  depthFor, imageSprite, regionTexture, makeGlow, buildFloorTexture, opaqueRect,
} from './sprite.js';
import { VIEW_W, VIEW_H } from './sprite.js';
import { viewport, snapCamera } from './viewport.js';
import { bumpMapVersion } from './reach.js';
import { solidRectFor } from './maps/solid.js';
import { clamp, overlaps } from './geom.js';

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
    // Mallas juntadas por atlas (sólo si el mapa lo pide, ver batchStatic).
    this.batches = [];
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
    // P2: el mobiliario estático del barrio se junta en una malla por atlas.
    if (map.batchStatic) this.buildStaticBatches();
  }

  /**
   * P2: junta el mobiliario estático en UNA malla (un atlas armado al vuelo con
   * los sheets que usa el mapa). Los UVs de cada sprite quedan grabados y cada
   * vértice lleva su z. Los objetos se ordenan como el pase transparente de
   * three (z de cerca a lejos, empate por id de malla), así el dibujo queda
   * igual que con una malla por objeto. Los que setDark tiñe (ventanas, casas,
   * farolas, pinos) quedan con su malla propia.
   * Las mallas individuales se sacan de la escena pero se conservan en obj.mesh
   * porque layout() lee de ahí tamaño y frame (para sólidos y hover).
   */
  buildStaticBatches() {
    const sheetY = new Map();
    const items = [];
    // Los objetos dentro de un resplandor aditivo (farolas) se dejan sueltos:
    // el glow no escribe z y su orden con los sprites debe quedar igual.
    const glowRects = [];
    for (const obj of this.map.objects || []) {
      const glow = obj.glowMesh;
      if (!glow || !glow.geometry || !glow.geometry.parameters) continue;
      const gw = glow.geometry.parameters.width;
      const gh = glow.geometry.parameters.height;
      glowRects.push({
        x: glow.position.x - gw / 2,
        y: glow.position.y - gh / 2,
        w: gw,
        h: gh,
      });
    }
    const inGlow = (x, y, w, h) => glowRects.some((r) => (
      x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y
    ));
    for (const obj of this.map.objects || []) {
      const mesh = obj.mesh;
      if (!mesh || needsOwnMaterial(obj)) continue;
      const sheet = mesh.userData.sheet;
      const frame = mesh.userData.frame;
      if (!sheet || !sheet.image || !frame) continue;
      const w = mesh.geometry.parameters.width;
      const h = mesh.geometry.parameters.height;
      if (inGlow(mesh.position.x - w / 2, mesh.position.y - h / 2, w, h)) continue;
      if (!sheetY.has(sheet)) sheetY.set(sheet, 0);
      const { x: px, y: py, z } = mesh.position;
      items.push({
        z,
        id: mesh.id,
        sheet,
        frame,
        px,
        py,
        w,
        h,
        flipX: Boolean(obj.flipX),
      });
      this.scene.remove(mesh);
    }
    if (!items.length) return;

    // Atlas vertical con los sheets usados (todos chicos: ~560x700). Cada
    // sheet lleva 1 px de borde con su propia orilla repetida: así un sprite
    // pegado al borde del sheet muestrea lo mismo que el ClampToEdge original.
    const PAD = 1;
    let atlasW = 0;
    let atlasH = 0;
    for (const sheet of sheetY.keys()) {
      atlasW = Math.max(atlasW, sheet.image.width);
      atlasH += sheet.image.height + PAD * 2;
    }
    atlasW += PAD * 2;
    const canvas = document.createElement('canvas');
    canvas.width = atlasW;
    canvas.height = atlasH;
    const ctx = canvas.getContext('2d');
    let oy = PAD;
    for (const sheet of sheetY.keys()) {
      const img = sheet.image;
      const iw = img.width;
      const ih = img.height;
      sheetY.set(sheet, oy);
      ctx.drawImage(img, PAD, oy);
      // Orillas repetidas (arriba/abajo/izquierda/derecha y esquinas).
      ctx.drawImage(img, 0, 0, iw, 1, PAD, oy - PAD, iw, PAD);
      ctx.drawImage(img, 0, ih - 1, iw, 1, PAD, oy + ih, iw, PAD);
      ctx.drawImage(img, 0, 0, 1, ih, 0, oy, PAD, ih);
      ctx.drawImage(img, iw - 1, 0, 1, ih, PAD + iw, oy, PAD, ih);
      ctx.drawImage(img, 0, 0, 1, 1, 0, oy - PAD, PAD, PAD);
      ctx.drawImage(img, iw - 1, 0, 1, 1, PAD + iw, oy - PAD, PAD, PAD);
      ctx.drawImage(img, 0, ih - 1, 1, 1, 0, oy + ih, PAD, PAD);
      ctx.drawImage(img, iw - 1, ih - 1, 1, 1, PAD + iw, oy + ih, PAD, PAD);
      oy += ih + PAD * 2;
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.flipY = false;
    texture.colorSpace = THREE.SRGBColorSpace;

    // Mismo orden que reversePainterSortStable: cerca primero, empate por id.
    // Un bias diminuto (0,05 px) hace que, en un empate exacto de z, el mueble
    // gane sobre el jugador (creado antes; en el dibujo objeto por objeto el
    // desempate por id lo dejaba adelante). No altera diferencias de 1 px.
    items.sort((a, b) => (b.z - a.z) || (a.id - b.id));
    const Z_BIAS = 0.00005;
    const pos = [];
    const uv = [];
    const idx = [];
    let b = 0;
    for (const it of items) {
      const u0 = (PAD + it.frame.x) / atlasW;
      const u1 = (PAD + it.frame.x + it.frame.w) / atlasW;
      const yBase = sheetY.get(it.sheet) + it.frame.y;
      const v0 = yBase / atlasH;
      const v1 = (yBase + it.frame.h) / atlasH;
      const ul = it.flipX ? u1 : u0;
      const ur = it.flipX ? u0 : u1;
      const x0 = it.px - it.w / 2;
      const x1 = it.px + it.w / 2;
      const yTop = it.py + it.h / 2;
      const yBottom = it.py - it.h / 2;
      const z = it.z + Z_BIAS;
      pos.push(x0, yTop, z, x1, yTop, z, x0, yBottom, z, x1, yBottom, z);
      uv.push(ul, v1, ur, v1, ul, v0, ur, v0);
      idx.push(b, b + 2, b + 1, b + 2, b + 3, b + 1);
      b += 4;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      map: texture, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide,
    }));
    this.scene.add(mesh);
    this.batches.push(mesh);
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
    // `trim` va sin el margen de 1 px de `drawBox`: lo usa el sólido del barrio
    // (solidPx, ver src/maps/solid.js) para no tapar píxeles transparentes.
    const trimRect = trim ? { x: trim.x, y: trim.y, w: trim.w, h: trim.h } : null;
    return {
      anchorX, anchorY, px, py, w, h, z, drawBox, trim: trimRect,
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
      // Barrio: el sólido sale del rect dibujado (offset incluido). Opt-in por
      // objeto (`solidPx`), así los demás mapas conservan su rect de baldosas.
      if (obj.solidPx) {
        const box = this.layout(obj);
        const rect = solidRectFor(obj, [box.w, box.h], box.trim);
        if (rect) this.solids.push({ ...rect, id: obj.id });
        continue;
      }
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
    // Espejado horizontal opcional (p. ej. la cruz de San Andres del paso a nivel).
    if (obj.flipX) mesh.scale.x = -1;
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

export { overlaps };

/**
 * ¿`setDark()` puede cambiar el color de este objeto? Los que sí necesitan su
 * propio material (no se pueden juntar en el batch estático).
 */
function needsOwnMaterial(obj) {
  const sprite = obj.sprite || '';
  const id = obj.id || '';
  return Boolean(obj.window) || /window/i.test(sprite)
    || /^house_|^shop_/i.test(id)
    || /farola|streetlight/i.test(sprite)
    || /^pino|^arbusto/i.test(id)
    || /oil_lamp|candle|lampara/i.test(sprite);
}
