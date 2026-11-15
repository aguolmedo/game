import * as THREE from 'three';

/** Z de cada capa: lejos detras del menu (z 40), cerca delante. */
const LAYER_Z = { far: 24, mid: 31, near: 48 };

/**
 * Mueve un copo un paso. Muta f = { x, y, speed, sway, phase }.
 * Envuelve arriba/abajo y a los costados para que nunca se pierda.
 */
export function advanceFlake(f, dt, time, wind, width, height) {
  f.y += f.speed * dt;
  f.x += (Math.sin(time * 1.6 + f.phase) * f.sway + wind) * dt;
  if (f.y > height + 2) f.y = -2;
  if (f.x < -4) f.x += width + 8;
  if (f.x > width + 4) f.x -= width + 8;
}

/** Las tres capas de parallax de la pantalla de titulo. */
export function layerSpecs() {
  return [
    { name: 'far', count: 40, size: 1, speed: 8, sway: 1.5, opacity: 0.45, glow: 0 },
    { name: 'mid', count: 26, size: 2, speed: 16, sway: 3, opacity: 0.7, glow: 0 },
    { name: 'near', count: 14, size: 3, speed: 26, sway: 5, opacity: 0.95, glow: 1 },
  ];
}

/** Halo frio 32x32 (se genera una sola vez, dentro del constructor). */
function makeGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(190,240,255,0.55)');
  grad.addColorStop(1, 'rgba(190,240,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, 32);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Nevada del titulo: tres capas con viento en rafagas y glow en la capa cercana. */
export class TitleSnow {
  constructor(scene, snowTexture, { width = 480, height = 270 } = {}) {
    this.width = width;
    this.height = height;
    this.time = 0;
    this.gust = 0;
    this.nextGust = 2.5 + Math.random() * 3;

    this.group = new THREE.Group();
    scene.add(this.group);

    const flakeGeo = new THREE.PlaneGeometry(1, 1);
    const glowGeo = new THREE.PlaneGeometry(7, 7);
    const glowTex = makeGlowTexture();
    this.layers = [];

    for (const spec of layerSpecs()) {
      const material = new THREE.MeshBasicMaterial({
        map: snowTexture, transparent: true, depthWrite: false,
        side: THREE.DoubleSide, opacity: spec.opacity,
      });
      const glowMaterial = spec.glow === 1
        ? new THREE.MeshBasicMaterial({
          map: glowTex, transparent: true, depthWrite: false,
          blending: THREE.AdditiveBlending, opacity: 0.16,
          side: THREE.DoubleSide,
        })
        : null;

      const flakes = [];
      for (let i = 0; i < spec.count; i++) {
        const mesh = new THREE.Mesh(flakeGeo, material);
        mesh.scale.setScalar(spec.size);
        let obj = mesh;
        if (glowMaterial) {
          // El copo cercano es un grupo: copo + halo frio detras.
          obj = new THREE.Group();
          obj.add(mesh);
          const halo = new THREE.Mesh(glowGeo, glowMaterial);
          halo.scale.setScalar(spec.size * 1.6);
          halo.position.z = -0.1;
          obj.add(halo);
        }
        obj.position.z = LAYER_Z[spec.name];
        this.group.add(obj);
        flakes.push({
          obj,
          x: Math.random() * width,
          y: Math.random() * height,
          speed: spec.speed * (0.8 + 0.4 * Math.random()),
          sway: spec.sway * (0.6 + 0.8 * Math.random()),
          phase: Math.random() * Math.PI * 2,
        });
      }
      this.layers.push({ spec, flakes });
    }

    this.scatter();
  }

  update(dt) {
    this.time += dt;
    this.nextGust -= dt;
    if (this.nextGust <= 0) {
      this.gust = 1.6 + Math.random() * 1.4;
      this.nextGust = 4.5 + Math.random() * 5;
    }
    this.gust = Math.max(0, this.gust - dt);
    const wind = Math.sin(this.time * 0.7) * 10 + (this.gust > 0 ? 34 : 0);
    for (const layer of this.layers) {
      for (const f of layer.flakes) {
        advanceFlake(f, dt, this.time, wind, this.width, this.height);
        this.draw(layer.spec, f);
      }
    }
  }

  scatter() {
    for (const layer of this.layers) {
      for (const f of layer.flakes) {
        f.x = Math.random() * this.width;
        f.y = Math.random() * this.height;
        this.draw(layer.spec, f);
      }
    }
  }

  /** Posicion entera, sin subpixeles. */
  draw(spec, f) {
    f.obj.position.set(Math.round(f.x), Math.round(f.y), LAYER_Z[spec.name]);
  }
}
