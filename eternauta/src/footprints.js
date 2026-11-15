import * as THREE from 'three';
import { depthFor } from './sprite.js';

/** Huellas en la nieve que aparecen al caminar y se borran solas. */
export class Footprints {
  constructor(scene, texture, max = 70) {
    this.scene = scene;
    this.texture = texture;
    this.max = max;
    this.items = [];
    this.acc = 0;
    this.side = 1;
    this.time = 0;
  }

  reset() {
    for (const item of this.items) this.scene.remove(item.mesh);
    this.items = [];
    this.acc = 0;
  }

  update(dt, player, active) {
    this.time += dt;
    for (const item of this.items) {
      item.life -= dt;
      item.mesh.material.opacity = Math.max(0, Math.min(0.85, item.life / 3));
    }
    const dead = this.items.filter((item) => item.life <= 0);
    for (const item of dead) this.scene.remove(item.mesh);
    if (dead.length) this.items = this.items.filter((item) => item.life > 0);

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
    const geo = new THREE.PlaneGeometry(6, 3);
    const mat = new THREE.MeshBasicMaterial({
      map: this.texture, transparent: true, opacity: 0.7, depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    this.side *= -1;
    const x = Math.round(player.x + this.side * 2);
    const feet = Math.round(player.feet + 1);
    mesh.position.set(x, feet, depthFor(feet) - 0.002);
    this.scene.add(mesh);
    this.items.push({ mesh, life: 7 });
    if (this.items.length > this.max) {
      const first = this.items.shift();
      this.scene.remove(first.mesh);
    }
  }
}
