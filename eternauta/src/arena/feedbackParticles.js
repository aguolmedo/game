// Partículas del disparo (viruta, nieve, chispas, humo). Funciones sobre ShootingFx.
import { depthFor } from '../sprite.js';

export const LIFT = 6;

export function addParticle(fx, name, x, y, opts = {}) {
  const f = fx.frame(name);
  if (!f) return null;
  const lift = opts.lift ?? LIFT;
  const sprite = fx.spawnSprite(name, x, y, opts.additive ?? false, 0.055, lift);
  if (!sprite) return null;
  if (opts.scale && opts.scale !== 1) {
    sprite.mesh.scale.set(opts.scale, opts.scale, 1);
  }
  const particle = {
    ...sprite,
    name,
    x,
    y,
    lift,
    z: opts.z ?? 0,
    vx: opts.vx ?? 0,
    vy: opts.vy ?? 0,
    vz: opts.vz ?? 0,
    gravity: opts.gravity ?? 260,
    life: opts.life ?? 0.25,
    max: opts.life ?? 0.25,
    spin: opts.spin ?? 0,
  };
  sprite.mesh.rotation.z = opts.angle ?? 0;
  fx.particles.push(particle);
  return particle;
}

export function burstChitin(fx, x, y, dir, count = 3) {
  for (let i = 0; i < count; i++) {
    const name = i % 2 ? 'chitin_1' : 'chitin_0';
    fx.addParticle(name, x + Math.random() * 4 - 2, y + Math.random() * 3 - 2, {
      vx: dir.x * 34 + (Math.random() - 0.5) * 50,
      vy: dir.y * 34 + (Math.random() - 0.5) * 40 - 6,
      vz: 40 + Math.random() * 55,
      life: 0.2 + Math.random() * 0.18,
      spin: Math.random() * 6,
    });
  }
}

export function burstSnow(fx, x, y, count = 2, power = 1) {
  for (let i = 0; i < count; i++) {
    const name = i % 2 ? 'puff_1' : 'puff_0';
    fx.addParticle(name, x, y - 2, {
      vx: (Math.random() - 0.5) * 34 * power,
      vy: (Math.random() - 0.5) * 24 * power - 4,
      vz: 12 + Math.random() * 22,
      life: 0.22 + Math.random() * 0.16,
      gravity: 40,
      scale: name === 'puff_1' ? 1 : 0.85,
    });
  }
}

export function burstSpark(fx, x, y, dir) {
  fx.addParticle('spark_0', x, y, {
    vx: -dir.x * 8, vy: -dir.y * 8, vz: 30, life: 0.09, gravity: 60,
  });
  fx.addParticle('spark_1', x - dir.x * 2, y - dir.y * 2, {
    vx: dir.x * 6, vy: dir.y * 6, vz: 12, life: 0.07, gravity: 0,
  });
  fx.burstSnow(x, y, 1, 0.6);
}

export function updateParticles(fx, dt) {
  for (let i = fx.particles.length - 1; i >= 0; i--) {
    const p = fx.particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      fx.dropSprite(p);
      fx.particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vz -= p.gravity * dt;
    p.z = Math.max(0, p.z + p.vz * dt);
    if (p.z === 0) {
      p.vx *= Math.max(0, 1 - 12 * dt);
      p.vy *= Math.max(0, 1 - 12 * dt);
      p.vz = 0;
    }
    p.mesh.position.set(Math.round(p.x), Math.round(p.y - p.z - p.lift), depthFor(p.y) + 0.055);
    p.mesh.rotation.z += p.spin * dt;
    p.material.opacity = Math.max(0, Math.min(1, p.life / p.max));
  }
}

