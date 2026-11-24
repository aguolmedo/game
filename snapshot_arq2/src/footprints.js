import * as THREE from 'three';
import { depthFor } from './sprite.js';

// Una sola geometria para todas las huellas (el tamano nunca cambia).
let sharedGeometry = null;
function footprintGeometry() {
  if (!sharedGeometry) sharedGeometry = new THREE.PlaneGeometry(6, 3);
  return sharedGeometry;
}

// El alpha se cachea por bucket de 1/64: ~55 materiales como maximo.
const ALPHA_STEPS = 64;
const ALPHA_BUCKET = (alpha) => Math.round(alpha * ALPHA_STEPS);

/** Huellas en la nieve que aparecen al caminar y se borran solas. */
export class Footprints {
  constructor(scene, texture, max = 70) {
    this.scene = scene;
    this.texture = texture;
    this.max = max;
    this.items = [];
    this.materials = new Map();
    this.acc = 0;
    this.side = 1;
    this.time = 0;
  }

  /** Material compartido por todas las huellas con el mismo alpha. */
  materialFor(bucket) {
    let mat = this.materials.get(bucket);
    if (!mat) {
      mat = new THREE.MeshBasicMaterial({
        map: this.texture, transparent: true, opacity: bucket / ALPHA_STEPS,
        depthWrite: false, side: THREE.DoubleSide,
      });
      this.materials.set(bucket, mat);
    }
    return mat;
  }

  reset() {
    for (const item of this.items) this.scene.remove(item.mesh);
    this.items.length = 0;
    this.acc = 0;
  }

  update(dt, player, active) {
    this.time += dt;
    const items = this.items;
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      item.life -= dt;
      if (item.life <= 0) {
        this.scene.remove(item.mesh);
        items.splice(i, 1);
        continue;
      }
      const alpha = Math.max(0, Math.min(0.85, item.life / 3));
      const bucket = ALPHA_BUCKET(alpha);
      if (bucket !== item.bucket) {
        item.bucket = bucket;
        item.mesh.material = this.materialFor(bucket);
      }
    }

    if (active && player.moving) {
      this.acc += player.moved || 0;
      if (this.acc >= 9) {
        this.acc = 0;
        this.spawn(player);
      }
    } else {
      this.acc = 9;
    }
  }

  spawn(player) {
    const bucket = ALPHA_BUCKET(0.7);
    const mesh = new THREE.Mesh(footprintGeometry(), this.materialFor(bucket));
    this.side *= -1;
    const x = Math.round(player.x + this.side * 2);
    const feet = Math.round(player.feet + 1);
    mesh.position.set(x, feet, depthFor(feet) - 0.002);
    this.scene.add(mesh);
    this.items.push({ mesh, life: 7, bucket });
    if (this.items.length > this.max) {
      const first = this.items.shift();
      this.scene.remove(first.mesh);
    }
  }
}
