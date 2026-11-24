// Vista por la ventana (diseño §10). Escena propia que ocupa la pantalla:
// - 'attic': panorama 960x300 que panea lento, marco de madera ya dibujado
//   (views/attic_frame.png) y copos en runtime.
// - 'living': la casa de los Ramírez, con la vela que titila.
import * as THREE from 'three';
import { imageSprite, canvasOverlay, VIEW_W, VIEW_H } from '../sprite.js';

const PAN_W = 960;
const PAN_H = 300;
const PAN_MAX = PAN_W - VIEW_W;      // 480 px de recorrido
const PAN_SECONDS = 40;              // ida (y otros 40 de vuelta)
const PAN_Y = 15;                    // centrado vertical del panorama

// Abertura de vidrio del altillo (coincide con la zona transparente de
// views/attic_frame.png, que se dibuja encima como marco de madera).
const GLASS = { x: 36, y: 24, w: 408, h: 199 };

// La vela de Ramírez en views/living.png (480x270).
const CANDLE = { x: 286, y: 64 };

function createFlakes(count = 46) {
  const flakes = [];
  for (let i = 0; i < count; i++) {
    flakes.push({
      x: GLASS.x + Math.random() * GLASS.w,
      y: GLASS.y + Math.random() * GLASS.h,
      speed: 8 + Math.random() * 22,
      sway: 1 + Math.random() * 5,
      phase: Math.random() * Math.PI * 2,
      big: Math.random() < 0.18,
    });
  }
  return flakes;
}

export class ViewScene {
  constructor(game, viewId = 'attic', opts = {}) {
    this.game = game;
    this.viewId = viewId;
    this.opts = opts;
    this.pausable = false;
    this.blocksPause = true;
    // Pantalla fija: sin zoom del mundo (T2).
    this.worldZoom = false;
    this.scene = new THREE.Scene();
    this.cam = { x: 0, y: 0 };
    this.t = 0;
    this.dark = false;
    this.mesh = null;
    this.snow = [];
    this.exited = false;
    // Capa de UI fija en pantalla: se dibuja con uiCamera (no viaja con el mundo).
    this.uiScene = new THREE.Scene();
    this.overlay = canvasOverlay(VIEW_W, VIEW_H, 30);
    this.uiScene.add(this.overlay.mesh);
  }

  enter() {
    this.t = 0;
    this.exited = false;
    this.dark = Boolean(this.game.flags && this.game.flags.apagon);
    this.buildSprite();
    this.cam = this.viewId === 'attic'
      ? { x: 0, y: PAN_Y }
      : { x: 0, y: 0 };
    this.snow = this.viewId === 'attic' ? createFlakes() : [];
    this.drawOverlay();
  }

  buildSprite() {
    const assets = this.game.assets;
    let texture;
    let w = VIEW_W;
    let h = VIEW_H;
    if (this.viewId === 'attic') {
      texture = this.dark ? assets.viewAtticPanDark : assets.viewAtticPan;
      w = PAN_W;
      h = PAN_H;
    } else {
      texture = assets.viewLiving;
    }
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }
    this.mesh = imageSprite(texture, w, h, 1);
    this.mesh.position.set(w / 2, h / 2, 1);
    this.scene.add(this.mesh);
  }

  applyCamera(camera) {
    camera.left = this.cam.x;
    camera.right = this.cam.x + VIEW_W;
    camera.top = this.cam.y;
    camera.bottom = this.cam.y + VIEW_H;
    camera.updateProjectionMatrix();
  }

  update(dt, input) {
    this.t += dt;
    if (this.viewId === 'attic') {
      // paneo de ida y vuelta: 40 s a cada lado
      const cycle = this.t % (PAN_SECONDS * 2);
      const phase = cycle < PAN_SECONDS
        ? cycle / PAN_SECONDS
        : (PAN_SECONDS * 2 - cycle) / PAN_SECONDS;
      this.cam.x = Math.round(phase * PAN_MAX);
      this.cam.y = PAN_Y;
      this.updateFlakes(dt);
    }
    this.drawOverlay();

    if (!this.exited && this.t > 0.15 && input && (input.bPressed || input.startPressed || input.click)) {
      this.exit();
    }
  }

  updateFlakes(dt) {
    for (const f of this.snow) {
      f.y += f.speed * dt;
      f.x += Math.sin(this.t * 1.4 + f.phase) * f.sway * dt;
      if (f.y > GLASS.y + GLASS.h) {
        f.y = GLASS.y;
        f.x = GLASS.x + Math.random() * GLASS.w;
      }
      if (f.x < GLASS.x) f.x = GLASS.x + GLASS.w;
      if (f.x > GLASS.x + GLASS.w) f.x = GLASS.x;
    }
  }

  exit() {
    this.exited = true;
    if (typeof this.opts.onExit === 'function') {
      this.opts.onExit();
      return;
    }
    this.game.changeScene(this.opts.returnTo || 'attic', this.opts.spawn);
  }

  drawOverlay() {
    const { ctx } = this.overlay;
    this.overlay.clear();
    if (this.viewId === 'attic') {
      // copos detrás del vidrio, marco de madera (imagen ya hecha) encima
      this.drawFlakes(ctx);
      const img = this.game.assets.viewAtticFrame && this.game.assets.viewAtticFrame.image;
      if (img) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, VIEW_W, VIEW_H);
      }
    } else {
      this.drawLiving(ctx);
    }
    this.overlay.commit();
  }

  drawFlakes(ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(GLASS.x, GLASS.y, GLASS.w, GLASS.h);
    ctx.clip();
    for (const f of this.snow) {
      ctx.fillStyle = f.big ? '#eefaff' : '#bdeffa';
      ctx.globalAlpha = f.big ? 0.95 : 0.65;
      const s = f.big ? 2 : 1;
      ctx.fillRect(Math.round(f.x), Math.round(f.y), s, s);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawLiving(ctx) {
    if (this.dark) {
      // apagón: apenas más oscuro y frío, la nieve de afuera sigue brillando
      ctx.fillStyle = 'rgba(10, 14, 32, 0.22)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    // la vela de Ramírez titila
    const f = 0.78 + Math.sin(this.t * 7.3) * 0.12 + Math.sin(this.t * 13.1 + 1.7) * 0.06;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [r, a] of [[48, 0.16], [24, 0.20], [10, 0.28]]) {
      const g = ctx.createRadialGradient(CANDLE.x, CANDLE.y, 0, CANDLE.x, CANDLE.y, r);
      g.addColorStop(0, `rgba(255, 207, 110, ${a * f})`);
      g.addColorStop(0.55, `rgba(255, 176, 64, ${a * 0.45 * f})`);
      g.addColorStop(1, 'rgba(255, 176, 64, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(CANDLE.x, CANDLE.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // un reflejo en el vidrio
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#eefaff';
    for (let k = 0; k < 60; k++) ctx.fillRect(30 + k, 40 + k * 2, 1, 1);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  get dialog() { return { open: false }; }
  get choice() { return { open: false }; }
}
