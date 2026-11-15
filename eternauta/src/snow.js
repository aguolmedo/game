import * as THREE from 'three';

/** Nevada en pantalla (viaja con la camara). Con rafagas de viento. */
export class Snowfall {
  constructor(scene, texture, { count = 110, front = 30, speed = 1 } = {}) {
    this.group = new THREE.Group();
    scene.add(this.group);
    const geometry = new THREE.PlaneGeometry(2, 2);
    const matBack = new THREE.MeshBasicMaterial({
      map: texture, transparent: true, alphaTest: 0.2, depthWrite: false,
      side: THREE.DoubleSide, opacity: 0.55,
    });
    const matFront = new THREE.MeshBasicMaterial({
      map: texture, transparent: true, alphaTest: 0.2, depthWrite: false,
      side: THREE.DoubleSide, opacity: 0.95,
    });
    this.particles = [];
    this.width = 480;
    this.height = 270;
    for (let i = 0; i < count; i++) {
      const large = i >= count - front;
      const mesh = new THREE.Mesh(geometry, large ? matFront : matBack);
      if (large) mesh.scale.setScalar(1.5);
      mesh.position.z = large ? 8 : 6;
      mesh.position.x = Math.random() * this.width;
      mesh.position.y = Math.random() * this.height;
      this.group.add(mesh);
      this.particles.push({
        mesh,
        x: mesh.position.x,
        y: mesh.position.y,
        speed: (12 + Math.random() * 30) * speed,
        sway: 2 + Math.random() * 7,
        phase: Math.random() * Math.PI * 2,
      });
    }
    this.time = 0;
    this.gust = 0;
    this.nextGust = 2.5 + Math.random() * 3;
  }

  setCamera(x, y) {
    this.group.position.x = Math.round(x);
    this.group.position.y = Math.round(y);
  }

  scatter() {
    for (const p of this.particles) {
      p.x = Math.random() * this.width;
      p.y = Math.random() * this.height;
    }
    this.draw();
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
    for (const p of this.particles) {
      p.y += p.speed * dt;
      p.x += (Math.sin(this.time * 1.6 + p.phase) * p.sway + wind) * dt;
      if (p.y > this.height + 2) {
        p.y = -2;
        p.x = Math.random() * this.width;
      }
      if (p.x < -4) p.x = this.width + 3;
      if (p.x > this.width + 4) p.x = -3;
    }
    this.draw();
  }

  draw() {
    for (const p of this.particles) {
      p.mesh.position.x = Math.round(p.x);
      p.mesh.position.y = Math.round(p.y);
    }
  }
}
