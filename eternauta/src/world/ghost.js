import * as THREE from 'three';
import { hudBlocksPoint } from '../hud.js';
import { iconSprite } from '../sprite.js';
import { floorPos, adjacentToPlayer } from '../placement.js';
import { anySprite } from '../mapView.js';
import { getItem as getItemById } from '../items.js';


// La silueta de Manos (§8) se dibuja encima del piso y de los muebles y del
// overlay de luz (z=20), pero debajo de las etiquetas (capa extra z=31 y HUD).
const GHOST_Z = 21;
// Inválida: silueta plana al 45 % teñida #f09a7a (mezcla 55 % con el fondo).
const INVALID_GHOST_COLOR = 0xf09a7a;

/**
 * Máscara blanca de un frame del atlas: mismos píxeles opacos que el sprite,
 * todo lo demás transparente. Sirve para teñir la silueta de un color plano
 * (multiplicar el color del sprite por un tinte casi no se nota en el piso).
 */
function silhouetteTexture(map) {
  const img = map.image;
  const w = Math.max(1, Math.round(map.repeat.x * img.width));
  const h = Math.max(1, Math.round(map.repeat.y * img.height));
  const sx = Math.round(map.offset.x * img.width);
  const sy = Math.round(map.offset.y * img.height);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, sx, sy, w, h, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < data.data.length; i += 4) {
    data.data[i + 3] = data.data[i + 3] >= 128 ? 255 : 0;
    data.data[i] = 255;
    data.data[i + 1] = 255;
    data.data[i + 2] = 255;
  }
  ctx.putImageData(data, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function ghostSpriteFor(scene, name, itemId) {
  try {
    return anySprite(scene.game.assets, name);
  } catch {
    const data = scene.game.assets.itemsData;
    const sheet = scene.game.assets.items;
    const raw = data?.frames?.[itemId] || data?.frames?.[name];
    if (!raw || !sheet) return null;
    const box = Array.isArray(raw)
      ? { x: raw[0], y: raw[1], w: raw[2], h: raw[3] } : raw;
    return iconSprite(sheet, box, box.w, box.h);
  }
}

export function setGhost(scene, name, x, base, valid) {
  if (!name) {
    scene.clearGhost();
    return null;
  }
  if (!scene.ghost || scene.ghostName !== name) {
    if (scene.ghost) scene.scene.remove(scene.ghost);
    if (scene.ghostMask) scene.ghostMask.dispose();
    scene.ghost = scene.ghostSpriteFor(name);
    scene.ghostName = name;
    if (!scene.ghost) return null;
    scene.ghostTex = scene.ghost.material.map;
    scene.ghostMask = silhouetteTexture(scene.ghostTex);
    scene.ghost.material = scene.ghost.material.clone();
    scene.ghost.material.transparent = true;
    scene.ghost.material.depthWrite = false;
    scene.ghost.material.depthTest = false;
    // ¡Clave! El alphaTest del atlas (0.5) descartaba la silueta inválida,
    // que va al 45 %: nunca se veía. La máscara ya tiene alfa duro.
    scene.ghost.material.alphaTest = 0;
    scene.ghost.renderOrder = 4;
    scene.scene.add(scene.ghost);
  }
  const w = scene.ghost.geometry.parameters.width;
  const h = scene.ghost.geometry.parameters.height;
  scene.ghost.position.set(Math.round(x), Math.round(base - h / 2), GHOST_Z);
  scene.ghost.material.opacity = valid ? 0.55 : 0.45;
  scene.ghost.material.map = valid ? scene.ghostTex : scene.ghostMask;
  scene.ghost.material.color.setHex(valid ? 0xffffff : INVALID_GHOST_COLOR);
  scene.ghost.visible = true;
  scene.ghostInfo = {
    x, base, w, h, valid, name,
    box: { x: x - w / 2, y: base - h, w, h },
  };
  return scene.ghost;
}

export function showGhostCursor(scene, box) {
  scene.ghostCursor.showAt(box, scene.t, { mode: 'near', grab: false, id: 'ghost' });
  scene.ghostCursor.setPosition(box.x + box.w / 2, box.y + box.h / 2);
}

export function clearGhost(scene) {
  if (scene.ghost) {
    scene.scene.remove(scene.ghost);
    scene.ghost = null;
  }
  if (scene.ghostMask) scene.ghostMask.dispose();
  scene.ghostMask = null;
  scene.ghostTex = null;
  scene.ghostName = null;
  scene.ghostInfo = null;
  scene.handsFeedback = null;
  scene.ghostCursor?.hide();
}

/** Silueta + cuadradito del lugar apuntado (o el aviso rojo si no entra). */
export function updateGhost(scene, input, aim, action) {
  const device = aim?.device || 'mouse';
  scene.handsFeedback = null;
  if (!aim || !aim.tile) {
    scene.clearGhost();
    return;
  }
  if (device === 'mouse') {
    const view = scene.pointerView(input);
    if (view && hudBlocksPoint(view, scene.hintRects)) {
      scene.clearGhost();
      return;
    }
  }
  if (!scene.carryData() && scene.selfHover) {
    // Sobre Juan manda el uso propio: no es un lugar de dejar (§2).
    scene.clearGhost();
    return;
  }
  const carry = scene.carryData();
  if (carry && carry.object) {
    const obj = carry.object;
    const check = scene.checkSupportCached({
      map: scene.mapData,
      objects: scene.mapData.objects,
      npcs: scene.mapData.npcs,
      warps: scene.mapData.warps,
      player: { x: scene.player.x, feet: scene.player.feet },
      items: scene.worldState.items,
      object: obj,
      tx: aim.tile.tx,
      ty: aim.tile.ty,
    });
    if (check.ok) {
      scene.showFurnitureGhost(obj, aim.tile.tx, aim.tile.ty, true);
      return;
    }
    if (device === 'mouse' && adjacentToPlayer(scene.player, aim.tile.tx, aim.tile.ty)) {
      scene.showFurnitureGhost(obj, aim.tile.tx, aim.tile.ty, false);
      scene.handsFeedback = {
        text: check.reason === 'taparia' ? 'Taparía el paso.' : 'No entra ahí.',
        box: scene.ghostInfo?.box || null,
        x: aim.tile.tx * 16 + 8,
        y: aim.tile.ty * 16,
      };
      return;
    }
    scene.clearGhost();
    return;
  }

  const held = scene.heldId();
  if (!held) {
    scene.clearGhost();
    return;
  }
  if (action && action.kind === 'drop') {
    const pos = action.payload.pos;
    const name = getItemById(held).worldSprite;
    scene.setGhost(name, pos.x, pos.y, true);
    const box = action.payload.tx != null
      ? {
        x: action.payload.tx * 16,
        y: action.payload.ty * 16,
        w: 16,
        h: 16,
      }
      : { x: pos.x - 6, y: pos.y - 12, w: 12, h: 12 };
    scene.showGhostCursor(box);
    return;
  }
  // Con mouse, apuntar a un lugar inválido muestra la silueta rojiza.
  const surfaceTarget = aim.target && aim.target.surface;
  const blockedTarget = aim.target && !aim.target.surface
    && action && action.kind !== 'drop';
  const reachable = aim.target
    ? scene.hoverNear
    : adjacentToPlayer(scene.player, aim.tile.tx, aim.tile.ty);
  if (device === 'mouse' && !blockedTarget && reachable) {
    const pos = surfaceTarget ? aim.point : floorPos(aim.tile.tx, aim.tile.ty);
    const name = getItemById(held).worldSprite;
    scene.setGhost(name, pos.x, pos.y, false);
    scene.ghostCursor.hide();
    scene.handsFeedback = {
      text: 'No entra ahí.',
      box: scene.ghostInfo?.box || null,
      x: pos.x,
      y: surfaceTarget ? pos.y - 12 : aim.tile.ty * 16,
    };
    return;
  }
  scene.clearGhost();
}

export function showFurnitureGhost(scene, obj, tx, ty, valid) {
  const tw = Math.max(1, obj.tw || 1);
  const th = Math.max(1, obj.th || 1);
  const [ox, oy] = obj.offset || [0, 0];
  const x = (tx + tw / 2) * 16 + ox;
  const base = (ty + th) * 16 + oy;
  scene.setGhost(obj.sprite, x, base, valid);
  if (valid) {
    scene.showGhostCursor({ x: tx * 16, y: ty * 16, w: tw * 16, h: th * 16 });
  } else {
    scene.ghostCursor.hide();
  }
}
