// Feedback del disparo en la arena: balas visibles, fogonazo, retroceso,
// vainas, chispas, hit-stop, sacudida y guía de puntería.
// Dibuja con three + sprites de public/assets/fx_shooting.png (generado por
// tools/art/fx_shooting.py). La lógica pura vive en projectiles.js.
import * as THREE from 'three';
import { regionTexture, depthFor, VIEW_W, VIEW_H } from '../sprite.js';
import { reloadProgress } from './weapon.js';
import {
  AIM_LENGTH, aimDotAlpha, aimDots, createShot, ejectCasing,
  isOutOfView, muzzlePoint, recoilPush, shotOrigin, stepCasing, updateBullet,
  TRAIL_TIME,
} from './projectiles.js';

const FLASH_TIME = 0.08;
const CLICK_TIME = 0.13;
const LIGHT_TIME = 0.13;
const HITSTOP_KILL = 0.03;
const CASING_FADE = 0.6;
const SLIDE_TIME = 0.3;
// La bala colisiona en el plano del piso pero se dibuja a la altura del cuerpo.
const LIFT = 6;
const MUZZLE_LIFT = 10;

function rgba(hex, alpha) {
  const s = hex.replace('#', '');
  const n = parseInt(s, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function pointInBoxes(x, y, boxes) {
  for (const box of boxes) {
    if (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) return true;
  }
  return false;
}

/** Sprite chico del atlas de efectos. `additive` para fuego y chispas. */
function makeSprite(tex, frame, additive = false) {
  const texture = regionTexture(tex, frame[0], frame[1], frame[2], frame[3]);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.25,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(frame[2], frame[3]), material);
  return { mesh, material };
}

/** Limpia todo el estado visual del disparo (balas, vainas, chispas, sacudida). */
export function resetShootingFx(fx) {
  for (const bullet of fx.bullets.slice()) fx.dropBullet(bullet);
  for (const casing of fx.casings) fx.dropSprite(casing.sprite);
  for (const particle of fx.particles) fx.dropSprite(particle);
  if (fx.flash) fx.dropSprite(fx.flash);
  if (fx.click) fx.dropSprite(fx.click);
  if (fx.bolt) fx.dropSprite(fx.bolt);
  fx.bullets = [];
  fx.casings = [];
  fx.particles = [];
  fx.slides = [];
  fx.flash = null;
  fx.click = null;
  fx.bolt = null;
  fx.trailDots = [];
  fx.shakeT = 0;
  fx.shakeAmp = 0;
  fx.hitStop = 0;
  fx.lightT = 0;
}

export class ShootingFx {
  constructor(scene, assets) {
    this.scene = scene;
    this.assets = assets;
    this.tex = null;
    this.frames = null;
    this.geos = new Map();
    this.bullets = [];
    this.casings = [];
    this.particles = [];
    this.flash = null;
    this.click = null;
    this.bolt = null;
    this.trailDots = [];
    this.slides = [];
    this.shakeT = 0;
    this.shakeAmp = 0;
    this.hitStop = 0;
    this.lightT = 0;
    this.lightPos = { x: 0, y: 0 };
    this.mouseAim = false;
    this.load();
    this.bindAim();
  }

  // ------------------------------------------------------------- assets

  async load() {
    try {
      const raw = (import.meta.env && import.meta.env.BASE_URL) || './';
      const base = raw.endsWith('/') ? raw : `${raw}/`;
      const loader = new THREE.TextureLoader();
      const tex = await loader.loadAsync(`${base}assets/fx_shooting.png`);
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.generateMipmaps = false;
      tex.flipY = false;
      tex.colorSpace = THREE.SRGBColorSpace;
      const res = await fetch(`${base}assets/fx_shooting.json`);
      if (!res.ok) throw new Error(`fx_shooting.json ${res.status}`);
      const data = await res.json();
      this.tex = tex;
      this.frames = data.frames;
    } catch (err) {
      // Sin efectos: el juego sigue andando igual.
      console.warn('Sin fx de disparo:', err && err.message);
    }
  }

  bindAim() {
    if (typeof window === 'undefined') return;
    window.addEventListener('mousedown', (e) => {
      if (e.button === 2) this.mouseAim = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) this.mouseAim = false;
    });
    window.addEventListener('contextmenu', (e) => {
      if (e.target && e.target.tagName === 'CANVAS') e.preventDefault();
    });
  }

  /** ¿Está apuntando fino? LT del joystick o clic derecho. */
  aimHeld(input) {
    if (this.mouseAim) return true;
    const pad = input && input.findPad ? input.findPad() : null;
    const buttons = (pad && pad.buttons) || [];
    return Boolean(buttons[6] && buttons[6].pressed);
  }

  // ------------------------------------------------------------- sprites

  ready() {
    return Boolean(this.tex && this.frames);
  }

  frame(name) {
    return this.frames && this.frames[name];
  }

  geometry(name) {
    const f = this.frame(name);
    if (!f) return null;
    if (!this.geos.has(name)) this.geos.set(name, new THREE.PlaneGeometry(f[2], f[3]));
    return this.geos.get(name);
  }

  spawnSprite(name, x, y, additive = false, z = 0.05, lift = 0) {
    const f = this.frame(name);
    if (!f) return null;
    const sprite = makeSprite(this.tex, f, additive);
    sprite.mesh.position.set(Math.round(x), Math.round(y - lift), depthFor(y) + z);
    this.scene.add(sprite.mesh);
    return sprite;
  }

  dropSprite(sprite) {
    if (!sprite) return;
    this.scene.remove(sprite.mesh);
    sprite.material.map.dispose();
    sprite.material.dispose();
  }

  // ------------------------------------------------------------- disparo

  /**
   * Dispara: bala visible + fogonazo + vaina + sacudida + empujón.
   * opts = { shots, moving, player, isSolid, emergency, rng }
   */
  fire(origin, aim, opts = {}) {
    const dir = aim && (aim.x || aim.y) ? aim : { x: 0, y: 1 };
    const rng = opts.rng || Math.random;
    const bullet = createShot(origin, dir, {
      shots: opts.shots,
      moving: opts.moving,
      rng,
    });
    this.bullets.push(bullet);
    this.addBulletSprite(bullet);

    const muzzle = muzzlePoint(origin, dir);
    this.spawnFlash(muzzle, Boolean(opts.emergency));
    this.lightT = LIGHT_TIME;
    this.lightPos = { x: muzzle.x, y: muzzle.y - MUZZLE_LIFT };
    this.addShake(1, 0.06);

    const casing = ejectCasing(origin, dir, rng);
    this.addCasingSprite(casing);

    // Retroceso: 1-2 px para atrás si no hay pared.
    if (opts.player) {
      const push = recoilPush(opts.player, dir, opts.isSolid, 2);
      if (push) {
        opts.player.x = push.x;
        opts.player.feet = push.feet;
        opts.player.draw?.();
      }
    }
    // Humo chico del caño.
    this.addParticle('puff_0', muzzle.x, muzzle.y, {
      vx: dir.x * 10 - dir.y * 8, vy: dir.y * 10 + dir.x * 8, vz: 14,
      life: 0.3, gravity: -6, scale: 0.8, lift: MUZZLE_LIFT,
    });
    return bullet;
  }

  /** Disparo en seco: solo el chasquido, sin bala, vaina ni patada. */
  dryFire(origin, aim) {
    const muzzle = muzzlePoint(origin, aim);
    this.click = this.spawnSprite('click', muzzle.x, muzzle.y, false, 0.07, MUZZLE_LIFT);
    if (this.click) {
      this.click.t = 0;
      this.click.dur = CLICK_TIME;
    }
  }

  addBulletSprite(bullet) {
    const sprite = this.spawnSprite('bullet', bullet.x, bullet.y, false, 0.06, LIFT);
    if (!sprite) return;
    sprite.mesh.rotation.z = Math.atan2(bullet.dy, bullet.dx);
    bullet.sprite = sprite;
  }

  dropBullet(bullet) {
    if (bullet.sprite) this.dropSprite(bullet.sprite);
    bullet.sprite = null;
    for (const dot of bullet.trail) {
      if (dot.sprite) this.dropSprite(dot.sprite);
      dot.sprite = null;
    }
  }

  spawnFlash(pos, emergency = false) {
    this.flash = this.spawnSprite('flash_0', pos.x, pos.y, false, 0.08, MUZZLE_LIFT);
    if (!this.flash) return;
    this.flash.t = 0;
    this.flash.dur = FLASH_TIME;
    this.flash.size = emergency ? 0.7 : 1;
  }

  // ------------------------------------------------------------- vainas

  addCasingSprite(casing) {
    this.casings.push(casing);
    const sprite = this.spawnSprite('casing_0', casing.x, casing.y, false, 0.04);
    if (!sprite) return;
    casing.sprite = sprite;
  }

  updateCasings(dt) {
    for (let i = this.casings.length - 1; i >= 0; i--) {
      const casing = this.casings[i];
      const result = stepCasing(casing, dt);
      const sprite = casing.sprite;
      if (sprite) {
        sprite.mesh.position.set(
          Math.round(casing.x), Math.round(casing.y - casing.z), depthFor(casing.y) + 0.04,
        );
        const name = casing.settled ? 'casing_1' : 'casing_0';
        const f = this.frame(name);
        const geo = sprite.mesh.geometry.parameters;
        if (f && (geo.width !== f[2] || geo.height !== f[3])) {
          sprite.mesh.geometry.dispose();
          sprite.mesh.geometry = this.geometry(name);
        }
        sprite.material.opacity = Math.min(1, casing.life / CASING_FADE);
        if (result.bounced && casing.bounces === 1) {
          this.addParticle('puff_0', casing.x, casing.y, {
            vx: 4, vy: 0, vz: 8, life: 0.2, gravity: -20,
          });
        }
      }
      if (!result.alive) {
        if (sprite) this.dropSprite(sprite);
        this.casings.splice(i, 1);
      }
    }
  }

  // ------------------------------------------------------------- partículas

  addParticle(name, x, y, opts = {}) {
    const f = this.frame(name);
    if (!f) return null;
    const lift = opts.lift ?? LIFT;
    const sprite = this.spawnSprite(name, x, y, opts.additive ?? false, 0.055, lift);
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
    this.particles.push(particle);
    return particle;
  }

  burstChitin(x, y, dir, count = 3) {
    for (let i = 0; i < count; i++) {
      const name = i % 2 ? 'chitin_1' : 'chitin_0';
      this.addParticle(name, x + Math.random() * 4 - 2, y + Math.random() * 3 - 2, {
        vx: dir.x * 34 + (Math.random() - 0.5) * 50,
        vy: dir.y * 34 + (Math.random() - 0.5) * 40 - 6,
        vz: 40 + Math.random() * 55,
        life: 0.2 + Math.random() * 0.18,
        spin: Math.random() * 6,
      });
    }
  }

  burstSnow(x, y, count = 2, power = 1) {
    for (let i = 0; i < count; i++) {
      const name = i % 2 ? 'puff_1' : 'puff_0';
      this.addParticle(name, x, y - 2, {
        vx: (Math.random() - 0.5) * 34 * power,
        vy: (Math.random() - 0.5) * 24 * power - 4,
        vz: 12 + Math.random() * 22,
        life: 0.22 + Math.random() * 0.16,
        gravity: 40,
        scale: name === 'puff_1' ? 1 : 0.85,
      });
    }
  }

  burstSpark(x, y, dir) {
    this.addParticle('spark_0', x, y, {
      vx: -dir.x * 8, vy: -dir.y * 8, vz: 30, life: 0.09, gravity: 60,
    });
    this.addParticle('spark_1', x - dir.x * 2, y - dir.y * 2, {
      vx: dir.x * 6, vy: dir.y * 6, vz: 12, life: 0.07, gravity: 0,
    });
    this.burstSnow(x, y, 1, 0.6);
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.dropSprite(p);
        this.particles.splice(i, 1);
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

  // ------------------------------------------------------------- impacto

  /** Retroceso del bicho al recibir el balazo (los muertos resbalan). */
  knock(enemy, bullet, dead) {
    const power = dead ? 3.2 : 2.2;
    if (!enemy) return;
    if (dead) {
      this.slides.push({
        enemy,
        vx: bullet.dx * 46 * power, vy: bullet.dy * 46 * power, t: SLIDE_TIME,
      });
      return;
    }
    enemy.x += bullet.dx * power;
    enemy.y += bullet.dy * power;
    enemy.feet = enemy.y;
  }

  updateSlides(dt) {
    for (let i = this.slides.length - 1; i >= 0; i--) {
      const slide = this.slides[i];
      slide.t -= dt;
      const k = Math.max(0, slide.t / SLIDE_TIME);
      if (slide.enemy) {
        slide.enemy.x += slide.vx * dt * k;
        slide.enemy.y += slide.vy * dt * k;
        slide.enemy.feet = slide.enemy.y;
      }
      if (slide.t <= 0) this.slides.splice(i, 1);
    }
  }

  handleHit(event, onHit) {
    const bullet = event.bullet;
    const enemy = event.enemy;
    const outcome = onHit ? (onHit(enemy, event.damage, bullet) || {}) : {};
    const hitY = event.y;
    this.burstChitin(event.x, hitY, bullet, outcome.dead ? 6 : 3);
    this.burstSnow(event.x, hitY, outcome.dead ? 3 : 2, outcome.dead ? 1.3 : 0.8);
    this.knock(enemy, bullet, Boolean(outcome.dead));
    if (outcome.dead) {
      this.addShake(2, 0.12);
      this.hitStop = Math.max(this.hitStop, HITSTOP_KILL);
      this.addParticle('spark_1', event.x, hitY, {
        vx: 0, vy: 0, vz: 0, life: 0.09, gravity: 0,
      });
    }
    return outcome;
  }

  handleWall(event) {
    this.burstSpark(event.x, event.y, event.bullet);
  }

  // ------------------------------------------------------------- update

  /**
   * Avanza el sistema. ctx = { enemies, solids, view, player, aim, weapon,
   * input, onHit(enemy, damage, bullet) -> {dead} }.
   */
  update(dt, ctx = {}) {
    const step = Math.max(0, dt);
    this.shakeT = Math.max(0, this.shakeT - step);
    if (this.shakeT <= 0) this.shakeAmp = 0;
    this.lightT = Math.max(0, this.lightT - step);
    this.hitStop = Math.max(0, this.hitStop - step);
    const worldDt = this.hitStop > 0 ? 0 : step;

    const solids = ctx.solids || [];
    const view = ctx.view
      ? { x: ctx.view.x, y: ctx.view.y, w: VIEW_W, h: VIEW_H }
      : null;
    const world = {
      enemies: ctx.enemies || [],
      isSolid: (x, y) => pointInBoxes(x, y, solids),
      isOut: view ? (x, y) => isOutOfView(x, y, view) : null,
    };

    for (const bullet of this.bullets) {
      if (!bullet.alive) continue;
      const events = updateBullet(bullet, worldDt, world);
      for (const event of events) {
        if (event.type === 'enemy') this.handleHit(event, ctx.onHit);
        else if (event.type === 'wall') this.handleWall(event);
      }
      this.updateBulletVisual(bullet);
      if (!bullet.alive) this.dropBullet(bullet);
    }
    this.bullets = this.bullets.filter((bullet) => bullet.alive);
    this.cleanupTrails();

    this.updateSlides(worldDt);
    this.updateCasings(worldDt);
    this.updateParticles(worldDt);
    this.updateFlash(step);
    this.updateClick(step);
    this.updateBolt(ctx);
  }

  updateBulletVisual(bullet) {
    if (bullet.sprite) {
      const sprite = bullet.sprite;
      sprite.mesh.position.set(
        Math.round(bullet.x), Math.round(bullet.y - LIFT), depthFor(bullet.y) + 0.06,
      );
      sprite.mesh.rotation.z = Math.atan2(bullet.dy, bullet.dx);
    }
    for (const dot of bullet.trail) {
      if (!dot.sprite) {
        dot.sprite = this.spawnSprite('trail', dot.x, dot.y, false, 0.03, LIFT);
        if (dot.sprite) this.trailDots.push(dot);
      }
      if (dot.sprite) {
        dot.sprite.material.opacity = Math.max(0, dot.life / TRAIL_TIME) * 0.8;
      }
    }
  }

  /** Estelas que ya no pertenecen a ninguna bala: se sacan de la escena. */
  cleanupTrails() {
    const live = new Set();
    for (const bullet of this.bullets) {
      for (const dot of bullet.trail) live.add(dot);
    }
    this.trailDots = this.trailDots.filter((dot) => {
      if (live.has(dot) && dot.sprite) return true;
      if (dot.sprite) {
        this.dropSprite(dot.sprite);
        dot.sprite = null;
      }
      return false;
    });
  }

  updateFlash(dt) {
    if (!this.flash) return;
    const flash = this.flash;
    flash.t += dt;
    const name = flash.t < flash.dur * 0.5 ? 'flash_0' : 'flash_1';
    const f = this.frame(name);
    const geo = flash.mesh.geometry.parameters;
    if (f && (geo.width !== f[2] || geo.height !== f[3])) {
      flash.mesh.geometry.dispose();
      flash.mesh.geometry = this.geometry(name);
    }
    const k = flash.size || 1;
    flash.mesh.scale.set(k, k, 1);
    flash.material.opacity = Math.max(0, 1 - flash.t / flash.dur);
    if (flash.t >= flash.dur) {
      this.dropSprite(flash);
      this.flash = null;
    }
  }

  updateClick(dt) {
    if (!this.click) return;
    this.click.t += dt;
    this.click.material.opacity = Math.max(0, 1 - this.click.t / this.click.dur);
    if (this.click.t >= this.click.dur) {
      this.dropSprite(this.click);
      this.click = null;
    }
  }

  /** Cerrojo visible mientras recarga (2-3 cuadros). */
  updateBolt(ctx) {
    const weapon = ctx.weapon;
    if (!weapon || !weapon.reloading || !ctx.player) {
      if (this.bolt) {
        this.dropSprite(this.bolt);
        this.bolt = null;
      }
      return;
    }
    const progress = reloadProgress(weapon, ctx.now ?? 0);
    const index = progress < 0.34 ? 0 : (progress < 0.67 ? 1 : 2);
    const name = `bolt_${index}`;
    const origin = shotOrigin(ctx.player);
    const aim = ctx.aim || { x: 0, y: 1 };
    const x = origin.x + aim.x * 7;
    const y = origin.y + aim.y * 4;
    if (!this.bolt) this.bolt = this.spawnSprite(name, x, y, false, 0.07, MUZZLE_LIFT);
    if (!this.bolt) return;
    const f = this.frame(name);
    const geo = this.bolt.mesh.geometry.parameters;
    if (f && (geo.width !== f[2] || geo.height !== f[3])) {
      this.bolt.mesh.geometry.dispose();
      this.bolt.mesh.geometry = this.geometry(name);
    }
    this.bolt.mesh.position.set(
      Math.round(x), Math.round(y - MUZZLE_LIFT), depthFor(origin.y) + 0.07,
    );
  }

  // ------------------------------------------------------------- cámara/luz

  addShake(amp, time) {
    this.shakeAmp = Math.max(this.shakeAmp, amp);
    this.shakeT = Math.max(this.shakeT, time);
  }

  /** Desvío de cámara por la sacudida (1 px por disparo, 2 px por baja). */
  shakeOffset(t = 0) {
    if (this.shakeT <= 0 || this.shakeAmp <= 0) return { x: 0, y: 0 };
    return {
      x: Math.round(Math.sin(t * 143) * this.shakeAmp),
      y: Math.round(Math.cos(t * 111) * this.shakeAmp),
    };
  }

  /** Fogonazo que ilumina alrededor en el apagón (canvas de luz). */
  drawMuzzleLight(ctx, cam) {
    if (this.lightT <= 0 || !ctx) return;
    const k = Math.min(1, this.lightT / LIGHT_TIME);
    const sx = Math.round(this.lightPos.x - cam.x);
    const sy = Math.round(this.lightPos.y - cam.y);
    const r = 26 + (1 - k) * 26;
    if (sx < -r || sy < -r || sx > VIEW_W + r || sy > VIEW_H + r) return;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    let g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
    g.addColorStop(0, `rgba(0, 0, 0, ${0.62 * k})`);
    g.addColorStop(0.5, `rgba(0, 0, 0, ${0.28 * k})`);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 0.85);
    g.addColorStop(0, `rgba(255, 228, 150, ${0.46 * k})`);
    g.addColorStop(0.45, `rgba(255, 170, 70, ${0.2 * k})`);
    g.addColorStop(1, 'rgba(255, 160, 60, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sx, sy, r * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** Guía de tiro punteada: punto cada 3 px, se apaga con la distancia. */
  drawAimLine(ctx, player, aim, cam, input) {
    if (!ctx || !player || !aim) return;
    const hold = this.aimHeld(input);
    const origin = shotOrigin(player);
    // Arranca un poco adelante del traje y se dibuja a la altura del arma.
    const start = { x: origin.x + aim.x * 8, y: origin.y + aim.y * 6 - LIFT };
    const dots = aimDots(start, aim, { length: hold ? AIM_LENGTH + 18 : AIM_LENGTH });
    for (const dot of dots) {
      const sx = Math.round(dot.x - cam.x);
      const sy = Math.round(dot.y - cam.y);
      if (sx < 0 || sy < 0 || sx >= VIEW_W || sy >= VIEW_H) continue;
      const alpha = aimDotAlpha(dot.t, hold);
      ctx.fillStyle = rgba(dot.t < 0.45 ? '#fff4c0' : '#ecab4c', alpha);
      ctx.fillRect(sx, sy, 1, 1);
    }
  }

  // ------------------------------------------------------------- debug

  count() {
    return {
      bullets: this.bullets.length,
      casings: this.casings.length,
      particles: this.particles.length,
      shake: this.shakeT > 0,
      hitStop: this.hitStop > 0,
    };
  }

  reset() {
    resetShootingFx(this);
  }
}
