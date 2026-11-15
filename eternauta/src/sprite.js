import * as THREE from 'three';

export const VIEW_W = 480;
export const VIEW_H = 270;

/** z de un objeto segun su linea de pies/suelo: mas abajo = mas adelante. */
export function depthFor(y) {
  return 2 + y / 1000;
}

export function imageSprite(texture, w, h, z = 1) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({
      map: texture, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide,
    }),
  );
  mesh.position.z = z;
  return mesh;
}

/** Sprite de una region de un atlas (offset/repeat normalizados). */
export function regionTexture(sheet, x, y, w, h) {
  const texture = sheet.clone();
  texture.needsUpdate = true;
  texture.repeat.set(w / sheet.image.width, h / sheet.image.height);
  texture.offset.set(x / sheet.image.width, y / sheet.image.height);
  return texture;
}

/** Personaje 16x32 desde chars.png: 4 filas (down/up/left/right) x 6 frames. */
export function charSprite(sheet, data, who) {
  const texture = sheet.clone();
  texture.needsUpdate = true;
  texture.repeat.set(data.cell.w / sheet.image.width, data.cell.h / sheet.image.height);
  const material = new THREE.MeshBasicMaterial({
    map: texture, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(data.cell.w, data.cell.h), material);

  let dir = 0;
  let frame = 0;
  let blockX = data.blocks[who].x;
  const dirIndex = { down: 0, up: 1, left: 2, right: 3 };
  const apply = () => {
    texture.offset.set(
      (blockX + frame * data.cell.w) / sheet.image.width,
      (dir * data.cell.h) / sheet.image.height,
    );
  };
  apply();

  return {
    mesh,
    setFrame(k) {
      frame = ((k % data.cols) + data.cols) % data.cols;
      apply();
    },
    setDir(name) {
      dir = dirIndex[name] ?? 0;
      apply();
    },
    setWho(nextWho) {
      const b = data.blocks[nextWho];
      if (!b) return;
      blockX = b.x;
      apply();
    },
    get dir() { return dir; },
    get frame() { return frame; },
  };
}

export function frameBox(frame) {
  if (!frame) return null;
  if (Array.isArray(frame)) return { x: frame[0], y: frame[1], w: frame[2], h: frame[3] };
  return frame;
}

/** Icono 16x16 desde un atlas chico (items.png). */
export function iconSprite(sheet, frame, w = 16, h = 16) {
  const f = frameBox(frame);
  const texture = regionTexture(sheet, f.x, f.y, f.w, f.h);
  return new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({
      map: texture, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide,
    }),
  );
}

/** Sprite de un frame del atlas de objetos. */
export function objectSprite(assets, name, scale = 1) {
  const f = assets.objectsData.frames[name];
  if (!f) throw new Error(`Falta el objeto ${name} en objects.json`);
  const [x, y, w, h] = f;
  const texture = regionTexture(assets.objects, x, y, w, h);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w * scale, h * scale),
    new THREE.MeshBasicMaterial({
      map: texture, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide,
    }),
  );
  return mesh;
}

/** Mancha calida de luz (textura radial suave) para faroles y lamparas. */
let glowTexture = null;
export function getGlowTexture() {
  if (glowTexture) return glowTexture;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255, 220, 140, 0.85)');
  grad.addColorStop(0.45, 'rgba(255, 190, 90, 0.35)');
  grad.addColorStop(1, 'rgba(255, 180, 80, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  glowTexture = new THREE.CanvasTexture(canvas);
  glowTexture.magFilter = THREE.NearestFilter;
  glowTexture.minFilter = THREE.NearestFilter;
  glowTexture.generateMipmaps = false;
  glowTexture.flipY = false;
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  return glowTexture;
}

export function makeGlow(scene, w = 56, h = 32) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({
      map: getGlowTexture(), transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    }),
  );
  scene.add(mesh);
  return mesh;
}

/** Sombra redonda suave debajo de un personaje/pickup. */
export function makeShadow(scene, texture, w = 14, h = 5) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({
      map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    }),
  );
  scene.add(mesh);
  return mesh;
}

/** Canvas transparente dibujado en 1x y subido como textura NearestFilter. */
export function canvasOverlay(width, height, z = 10) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.flipY = false;
  texture.colorSpace = THREE.SRGBColorSpace;

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
    }),
  );
  mesh.position.set(width / 2, height / 2, z);

  return {
    canvas,
    ctx,
    texture,
    mesh,
    clear() {
      ctx.clearRect(0, 0, width, height);
    },
    commit() {
      texture.needsUpdate = true;
    },
  };
}

/** Pre-render de la capa de piso del mapa a una textura. */
export function buildFloorTexture(map, assets) {
  const canvas = document.createElement('canvas');
  canvas.width = map.cols * 16;
  canvas.height = map.rows * 16;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const frames = assets.tilesData.frames;
  const atlas = assets.tiles.image;
  for (let y = 0; y < map.rows; y++) {
    for (let x = 0; x < map.cols; x++) {
      const name = map.floor[y][x];
      const f = frames[name];
      if (!f) {
        ctx.fillStyle = '#101018';
        ctx.fillRect(x * 16, y * 16, 16, 16);
        continue;
      }
      ctx.drawImage(atlas, f[0], f[1], 16, 16, x * 16, y * 16, 16, 16);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.flipY = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
