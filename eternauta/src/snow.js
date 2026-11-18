import * as THREE from 'three';
import { viewport } from './viewport.js';

/**
 * Nevada en pantalla (viaja con la camara). Tres capas de copos a tamaño real
 * + fosforescencia: cada copo alterna entre su textura "on" (halo) y "off"
 * (nucleo), las dos centradas en el mismo punto, asi el halo crece parejo.
 *
 *   capa    copos            velocidad   texturas        z
 *   back    count (90)       8-16 px/s   back_on/off     6
 *   mid     count/2 (45)     18-30       mid_on/off      6.5
 *   front   front (12)       40-60       front_on/off    8
 */
const LAYER_DEFS = [
  {
    on: 'backOn', off: 'backOff', sizeOn: 1, sizeOff: 1,
    minSpeed: 8, maxSpeed: 16, z: 6,
  },
  {
    on: 'midOn', off: 'midOff', sizeOn: 7, sizeOff: 3,
    minSpeed: 18, maxSpeed: 30, z: 6.5,
  },
  {
    on: 'frontOn', off: 'frontOff', sizeOn: 12, sizeOff: 6,
    minSpeed: 40, maxSpeed: 60, z: 8,
  },
];

export class Snowfall {
  constructor(scene, textures, { count = 90, front = 12, speed = 1 } = {}) {
    this.group = new THREE.Group();
    scene.add(this.group);

    this.textures = textures;
    this.speedScale = speed; // opcion vieja: multiplica todas las velocidades
    this.width = viewport.worldW;
    this.height = viewport.worldH;
    this.time = 0;
    this.gust = 0;
    this.nextGust = 2.5 + Math.random() * 3;

    this.geos = new Map(); // tamaño en px -> PlaneGeometry compartida
    this.materials = new Map(); // textura -> material compartido
    this.flakes = [];

    const amounts = [count, Math.round(count / 2), front];
    LAYER_DEFS.forEach((def, i) => this.makeFlakes(def, amounts[i]));
    this.scatter();
  }

  /** Geometria de un tamaño exacto, compartida por todos los copos. */
  geometryFor(size) {
    let geo = this.geos.get(size);
    if (!geo) {
      geo = new THREE.PlaneGeometry(size, size);
      this.geos.set(size, geo);
    }
    return geo;
  }

  materialFor(texture) {
    let mat = this.materials.get(texture);
    if (!mat) {
      mat = new THREE.MeshBasicMaterial({
        map: texture, transparent: true, alphaTest: 0.01, depthWrite: false,
        side: THREE.DoubleSide, opacity: 1,
      });
      this.materials.set(texture, mat);
    }
    return mat;
  }

  /** Crea `n` copos de una capa: dos meshes (on/off) por copo. */
  makeFlakes(def, n) {
    const geoOn = this.geometryFor(def.sizeOn);
    const geoOff = this.geometryFor(def.sizeOff);
    const matOn = this.materialFor(this.textures[def.on]);
    const matOff = this.materialFor(this.textures[def.off]);
    for (let i = 0; i < n; i++) {
      const on = new THREE.Mesh(geoOn, matOn);
      const off = new THREE.Mesh(geoOff, matOff);
      on.position.z = def.z;
      off.position.z = def.z;
      this.group.add(on, off);
      this.flakes.push({
        on,
        off,
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        speed: (def.minSpeed + Math.random() * (def.maxSpeed - def.minSpeed)) * this.speedScale,
        sway: 2 + Math.random() * 7,
        phase: Math.random() * Math.PI * 2,
        ph: Math.random() * Math.PI * 2,
        blink: 0.9 + Math.random() * 1.3,
      });
    }
  }

  setCamera(x, y) {
    this.group.position.x = Math.round(x);
    this.group.position.y = Math.round(y);
  }

  /** Ajusta el área de nieve al tamaño actual de la vista del mundo. */
  syncViewSize() {
    const w = viewport.worldW;
    const h = viewport.worldH;
    if (w === this.width && h === this.height) return;
    this.width = w;
    this.height = h;
    for (const f of this.flakes) {
      if (f.x < -4 || f.x > w + 4) f.x = Math.random() * w;
      if (f.y < -2 || f.y > h + 2) f.y = Math.random() * h;
    }
    this.draw();
  }

  scatter() {
    this.syncViewSize();
    for (const f of this.flakes) {
      f.x = Math.random() * this.width;
      f.y = Math.random() * this.height;
    }
    this.draw();
  }

  update(dt) {
    this.syncViewSize();
    this.time += dt;
    this.nextGust -= dt;
    if (this.nextGust <= 0) {
      this.gust = 1.6 + Math.random() * 1.4;
      this.nextGust = 4.5 + Math.random() * 5;
    }
    this.gust = Math.max(0, this.gust - dt);
    const wind = Math.sin(this.time * 0.7) * 10 + (this.gust > 0 ? 34 : 0);
    for (const f of this.flakes) {
      f.y += f.speed * dt;
      f.x += (Math.sin(this.time * 1.6 + f.phase) * f.sway + wind) * dt;
      if (f.y > this.height + 2) {
        f.y = -2;
        f.x = Math.random() * this.width;
      }
      if (f.x < -4) f.x = this.width + 3;
      if (f.x > this.width + 4) f.x = -3;
    }
    this.draw();
  }

  /** Posiciones enteras (sin subpixeles) y textura on/off segun la fosforescencia. */
  draw() {
    for (const f of this.flakes) {
      const x = Math.round(f.x);
      const y = Math.round(f.y);
      f.on.position.x = x;
      f.on.position.y = y;
      f.off.position.x = x;
      f.off.position.y = y;
      const b = 0.5 + 0.5 * Math.sin(this.time * f.blink + f.ph * 3);
      const glowing = b > 0.55;
      f.on.visible = glowing;
      f.off.visible = !glowing;
    }
  }
}
