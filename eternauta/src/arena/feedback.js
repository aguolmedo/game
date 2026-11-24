// Feedback del disparo en la arena: balas visibles, fogonazo, retroceso,
// vainas, chispas, hit-stop, sacudida y guía de puntería.
// Dibuja con three + sprites de public/assets/fx_shooting.png (generado por
// tools/art/fx_shooting.py). La lógica pura vive en projectiles.js.
import * as THREE from 'three';
import { regionTexture, depthFor, VIEW_W, VIEW_H } from '../sprite.js';
import { reloadProgress } from './weapon.js';
import { stepBullets } from './simulate.js';
import * as particles from './feedbackParticles.js';
import * as shake from './feedbackShake.js';
import * as draw from './feedbackDraw.js';
import { LIFT } from './feedbackParticles.js';
import {
  createShot, ejectCasing,
  isOutOfView, muzzlePoint, recoilPush, shotOrigin, stepCasing,
  TRAIL_TIME,
} from './projectiles.js';

const FLASH_TIME = 0.08;
const CLICK_TIME = 0.13;
const LIGHT_TIME = 0.13;
const HITSTOP_KILL = 0.03;
const CASING_FADE = 0.6;
const SLIDE_TIME = 0.3;
// La bala colisiona en el plano del piso pero se dibuja a la altura del cuerpo.
const MUZZLE_LIFT = 10;

// Listas vacías compartidas: update() no debe crear arrays si no hay contexto.
const NO_ENEMIES = [];
const NO_SOLIDS = [];

function pointInBoxes(x, y, boxes) {
  for (const box of boxes) {
    if (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) return true;
  }
  return false;
}

/**
 * Sprite chico del atlas de efectos. `additive` para fuego y chispas.
 * La textura y la geometría son compartidas por frame (cacheadas): acá sólo
 * se crea el material, que sí es por instancia porque cada sprite cambia su
 * opacidad.
 */
function makeSprite(texture, geometry, additive = false) {
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.25,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const mesh = new THREE.Mesh(geometry, material);
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
  fx.bullets.length = 0; // el array es del state: se vacía en el lugar
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
  // Soltar las referencias del mundo y de las estelas del último run.
  if (fx.world) {
    fx.world.enemies = [];
    fx.world.solids = [];
    fx.world.view = null;
  }
  if (fx.liveTrail) fx.liveTrail.clear();
}

export class ShootingFx {
  constructor(scene, assets) {
    this.root = scene; // THREE.Scene donde se agregan los sprites
    this.assets = assets;
    this.tex = null;
    this.frames = null;
    this.textures = new Map();
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
    this.shake = { x: 0, y: 0 };
    this.liveTrail = new Set();
    // Mundo reutilizable para las balas: se le cambian las referencias por frame.
    this.viewBuf = { x: 0, y: 0, w: VIEW_W, h: VIEW_H };
    // Las funciones se crean una vez y leen las referencias del mundo; pueden
    // desestructurarse sin perder el `this` (updateBullet las usa sueltas).
    const world = {
      enemies: [],
      solids: [],
      view: null,
    };
    world.isSolid = (x, y) => pointInBoxes(x, y, world.solids);
    world.isOut = (x, y) => (world.view ? isOutOfView(x, y, world.view) : null);
    this.world = world;
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

  /** Textura recortada del atlas, una sola por frame (no se clona por sprite). */
  texture(name) {
    const f = this.frame(name);
    if (!f || !this.tex) return null;
    if (!this.textures.has(name)) {
      this.textures.set(name, regionTexture(this.tex, f[0], f[1], f[2], f[3]));
    }
    return this.textures.get(name);
  }

  spawnSprite(name, x, y, additive = false, z = 0.05, lift = 0) {
    const texture = this.texture(name);
    const geometry = this.geometry(name);
    if (!texture || !geometry) return null;
    const sprite = makeSprite(texture, geometry, additive);
    sprite.mesh.position.set(Math.round(x), Math.round(y - lift), depthFor(y) + z);
    this.root.add(sprite.mesh);
    return sprite;
  }

  dropSprite(sprite) {
    if (!sprite) return;
    this.root.remove(sprite.mesh);
    // La textura y la geometría son compartidas por frame: sólo se libera el
    // material de esta instancia.
    sprite.material.dispose();
  }

  // ------------------------------------------------------------- disparo

  /**
   * Dispara: bala visible + fogonazo + vaina + sacudida + empujón.
   * opts = { shots, moving, player, isSolid, emergency, rng }
   */
  fire(origin, aim, opts = {}) {
    const dir = aim && (aim.x || aim.y) ? aim : { x: 0, y: 1 };
    const rng = opts.rng;
    if (typeof rng !== 'function') throw new Error('fire: falta rng');
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
    this.lightPos.x = muzzle.x;
    this.lightPos.y = muzzle.y - MUZZLE_LIFT;
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

  addParticle(name, x, y, opts = {}) { return particles.addParticle(this, name, x, y, opts); }

  burstChitin(x, y, dir, count = 3) { return particles.burstChitin(this, x, y, dir, count); }

  burstSnow(x, y, count = 2, power = 1) { return particles.burstSnow(this, x, y, count, power); }

  burstSpark(x, y, dir) { return particles.burstSpark(this, x, y, dir); }

  updateParticles(dt) { return particles.updateParticles(this, dt); }


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

    this.world.enemies = ctx.enemies || NO_ENEMIES;
    this.world.solids = ctx.solids || NO_SOLIDS;
    if (ctx.view) {
      this.viewBuf.x = ctx.view.x;
      this.viewBuf.y = ctx.view.y;
      this.world.view = this.viewBuf;
    } else {
      this.world.view = null;
    }
    const world = this.world;

    // La física de las balas es pura (simulate.js); acá solo la vista.
    stepBullets(this.bullets, worldDt, world, {
      onEvent: (event) => {
        if (event.type === 'enemy') this.handleHit(event, ctx.onHit);
        else if (event.type === 'wall') this.handleWall(event);
      },
      afterBullet: (bullet) => {
        this.updateBulletVisual(bullet);
        if (!bullet.alive) this.dropBullet(bullet);
      },
    });
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
    if (!this.bullets.length && !this.trailDots.length) return;
    const live = this.liveTrail;
    live.clear();
    for (const bullet of this.bullets) {
      for (const dot of bullet.trail) live.add(dot);
    }
    // Compactar en el lugar en vez de crear un array nuevo por frame.
    let kept = 0;
    for (const dot of this.trailDots) {
      if (live.has(dot) && dot.sprite) {
        this.trailDots[kept++] = dot;
        continue;
      }
      if (dot.sprite) {
        this.dropSprite(dot.sprite);
        dot.sprite = null;
      }
    }
    this.trailDots.length = kept;
  }

  updateFlash(dt) {
    if (!this.flash) return;
    const flash = this.flash;
    flash.t += dt;
    const name = flash.t < flash.dur * 0.5 ? 'flash_0' : 'flash_1';
    const f = this.frame(name);
    const geo = flash.mesh.geometry.parameters;
    if (f && (geo.width !== f[2] || geo.height !== f[3])) {
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
      this.bolt.mesh.geometry = this.geometry(name);
    }
    this.bolt.mesh.position.set(
      Math.round(x), Math.round(y - MUZZLE_LIFT), depthFor(origin.y) + 0.07,
    );
  }

  // ------------------------------------------------------------- cámara/luz

  addShake(amp, time) { return shake.addShake(this, amp, time); }

  shakeOffset(t = 0) { return shake.shakeOffset(this, t); }

  drawMuzzleLight(ctx, cam) { return draw.drawMuzzleLight(this, ctx, cam); }

  drawAimLine(ctx, player, aim, cam, input) { return draw.drawAimLine(this, ctx, player, aim, cam, input); }

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

  /** Libera las geometrías propias (los materiales los suelta cada sprite). */
  dispose() {
    resetShootingFx(this);
    for (const geometry of this.geos.values()) geometry.dispose();
    this.geos.clear();
  }
}
