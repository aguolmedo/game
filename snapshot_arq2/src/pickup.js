import * as THREE from 'three';
import { depthFor, iconSprite, makeShadow } from './sprite.js';
import { inMagnetRange } from './interaction.js';

/** Objeto chico en el piso: flota, tiene sombra y se junta por iman. */
export class Pickup {
  constructor(scene, assets, def) {
    this.assets = assets;
    this.itemId = def.itemId;
    this.count = def.count || 1;
    this.x = def.x;
    this.y = def.y;
    this.taken = false;
    this.takeNow = false;
    this.state = 'idle';
    this.time = Math.random() * 3;
    this.anim = 0;
    this.startX = def.x;
    this.startY = def.y - 12;

    const frame = assets.itemsData.frames[this.itemId];
    this.mesh = iconSprite(assets.items, frame);
    this.mesh.position.set(def.x, def.y - 12, depthFor(def.y) + 0.002);
    scene.add(this.mesh);

    this.shadow = makeShadow(scene, assets.shadow, 10, 4);
    this.shadow.position.set(def.x, def.y - 1, depthFor(def.y) - 0.001);

    this.glow = makeShadow(scene, assets.shadow, 16, 6);
    this.glow.material.color = new THREE.Color(0xffcf6e);
    this.glow.material.blending = THREE.AdditiveBlending;
    this.glow.material.opacity = 0.28;
    this.glow.position.set(def.x, def.y - 2, depthFor(def.y) - 0.002);
  }

  get candidate() {
    return {
      id: `pickup_${this.itemId}_${Math.round(this.x)}`,
      kind: 'pickup',
      x: this.x,
      y: this.y,
      w: 16,
      h: 16,
      label: 'Levantar',
      pickup: this,
    };
  }

  update(dt, player) {
    if (this.taken) return;
    this.time += dt;

    if (this.state === 'idle') {
      if (player && inMagnetRange(player, { x: this.x, y: this.y }, 16)) {
        this.startMagnet(player);
      }
      const bob = Math.sin(this.time * 2.6);
      this.mesh.position.y = Math.round(this.y - 12 + bob * 1.2);
      this.mesh.position.z = depthFor(this.y) + 0.002;
      this.glow.material.opacity = 0.2 + 0.12 * (0.5 + 0.5 * Math.sin(this.time * 3.2));
    } else if (this.state === 'magnet') {
      this.anim += dt;
      const t = Math.min(1, this.anim / 0.28);
      const tx = player.x;
      const ty = player.feet - 14;
      this.mesh.position.x = Math.round(this.startX + (tx - this.startX) * t);
      this.mesh.position.y = Math.round(
        this.startY + (ty - this.startY) * t - Math.sin(t * Math.PI) * 9,
      );
      this.glow.visible = false;
      this.shadow.visible = false;
      if (t >= 1) {
        this.state = 'gone';
        this.taken = true;
        this.takeNow = true;
        this.mesh.visible = false;
      }
    }
  }

  startMagnet(player) {
    this.state = 'magnet';
    this.anim = 0;
    this.startX = this.mesh.position.x;
    this.startY = this.mesh.position.y;
    this.player = player;
  }

  /** Agarre directo con A (sin animacion de iman). */
  take() {
    this.taken = true;
    this.takeNow = true;
    this.state = 'gone';
    this.mesh.visible = false;
    this.shadow.visible = false;
    this.glow.visible = false;
  }

  dispose(scene) {
    scene.remove(this.mesh);
    scene.remove(this.shadow);
    scene.remove(this.glow);
  }
}
