import * as THREE from 'three';
import { imageSprite, getGlowTexture, VIEW_W, VIEW_H } from '../sprite.js';
import { Snowfall } from '../snow.js';
import { TitleMenu } from '../menus.js';
import { titleOptions } from '../base.js';
import { loadSave, clearSave } from '../run/save.js';
import { FLAG } from '../data/flags.js';
import { renderFlat } from '../core/scene.js';

const LAYER_W = 512;
const LAYER_H = 286;

/** Textura suave de humo (se genera una sola vez y se comparte). */
let smokeTexture = null;
function getSmokeTexture() {
  if (smokeTexture) return smokeTexture;
  const size = 16;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(8, 8, 1, 8, 8, 8);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
  grad.addColorStop(0.55, 'rgba(255, 255, 255, 0.30)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  smokeTexture = new THREE.CanvasTexture(canvas);
  smokeTexture.magFilter = THREE.NearestFilter;
  smokeTexture.minFilter = THREE.NearestFilter;
  smokeTexture.generateMipmaps = false;
  smokeTexture.flipY = false;
  smokeTexture.colorSpace = THREE.SRGBColorSpace;
  return smokeTexture;
}

export class TitleScene {
  constructor(game) {
    this.game = game;
    this.pausable = false;
    // Pantalla fija: sin zoom del mundo (T2).
    this.worldZoom = false;
    this.scene = new THREE.Scene();
    this.data = game.assets.titleData || null;
    const size = (this.data && this.data.size) || [LAYER_W, LAYER_H];

    // dos capas: cielo lejano (con parallax suave) y barrio nevado
    this.sky = imageSprite(game.assets.titleSky || game.assets.title, size[0], size[1], 0.5);
    this.sky.position.set(VIEW_W / 2, VIEW_H / 2, 0.5);
    this.scene.add(this.sky);
    this.near = imageSprite(game.assets.title, size[0], size[1], 1);
    this.near.position.set(VIEW_W / 2, VIEW_H / 2, 1);
    this.scene.add(this.near);

    // nevada nueva: tres capas a tamaño real, copos fosforescentes (z 6-8:
    // delante del cielo y del barrio, detras de la UI del menu, z 40)
    this.snow = new Snowfall(this.scene, game.assets.snowFlakes, { count: 90, front: 10 });
    this.snow.setCamera(0, 0);

    this.addSmoke();
    this.addWindowLights();

    this.menu = new TitleMenu(this.scene, game.assets, game);
    this.cam = { x: 0, y: 0 };
    this.t = 0;
  }

  /** Humo chiquito en las chimeneas lejanas. */
  addSmoke() {
    const anchors = (this.data && this.data.chimneys) || [];
    this.puffs = [];
    const texture = getSmokeTexture();
    const geo = new THREE.PlaneGeometry(1, 1);
    anchors.forEach(([cx, cy], k) => {
      for (let i = 0; i < 5; i++) {
        const mat = new THREE.MeshBasicMaterial({
          map: texture, transparent: true, depthWrite: false,
          side: THREE.DoubleSide, color: 0xc6d6e6, opacity: 0,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(cx, cy, 2);
        this.scene.add(mesh);
        this.puffs.push({
          mesh, mat, cx, cy,
          life: (i / 5 + k * 0.13) % 1,
          speed: 0.22 + Math.random() * 0.05,
          phase: Math.random() * Math.PI * 2,
        });
      }
    });
  }

  /** Luz calida que respira en las ventanas encendidas y en la farola. */
  addWindowLights() {
    const data = this.data || {};
    const windows = data.windows || {};
    const list = [];
    (windows.lit || []).forEach(([x, y]) => list.push({ x, y, w: 22, h: 14, base: 0.10, amp: 0.05 }));
    (windows.attic || []).forEach(([x, y]) => list.push({ x, y, w: 14, h: 9, base: 0.06, amp: 0.03 }));
    (data.lamps || []).forEach(([x, y]) => list.push({ x, y, w: 18, h: 14, base: 0.12, amp: 0.05 }));
    this.lights = list.map((item, i) => {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(item.w, item.h),
        new THREE.MeshBasicMaterial({
          map: getGlowTexture(), transparent: true, depthWrite: false,
          blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: item.base,
        }),
      );
      mesh.position.set(item.x, item.y, 3);
      this.scene.add(mesh);
      return { ...item, mesh, phase: i * 1.7, speed: 1.6 + (i % 3) * 0.5 };
    });
  }

  enter() {
    this.menu.view = 'main';
    // Con el traje ya hecho aparece "Continuar" en vez de "Jugar".
    this.menu.options = titleOptions(this.game.baseSave || loadSave());
    this.menu.cursor.setLength(this.menu.options.length);
    this.menu.cursor.index = 0;
    this.menu.show();
    this.snow.scatter();
    this.t = 0;
  }

  /** Pantalla fija: sin luz de apagón (ver core/scene.js). */
  render(ctx) { renderFlat(this, ctx); }

  applyCamera(camera) {
    camera.left = 0;
    camera.right = VIEW_W;
    camera.top = 0;
    camera.bottom = VIEW_H;
    camera.updateProjectionMatrix();
  }

  update(dt, input) {
    this.t += dt;
    this.snow.update(dt);
    this.snow.setCamera(0, 0);

    // parallax muy suave: el cielo se corre, el barrio queda quieto (asi el
    // cartel de madera sigue pegado a sus postes)
    const dx = 4 * Math.sin(this.t * 0.13);
    const dy = 1.5 * Math.sin(this.t * 0.09 + 1.1);
    this.sky.position.set(
      Math.round(VIEW_W / 2 + dx), Math.round(VIEW_H / 2 + dy), 0.5,
    );

    // humo: sube, se abre y se desvanece
    for (const p of this.puffs) {
      p.life += dt * p.speed;
      if (p.life > 1) p.life -= 1;
      const k = p.life;
      const x = p.cx + Math.sin(k * 5 + p.phase) * 3 + k * 5;
      const y = p.cy - k * 18;
      const s = 1.6 + k * 4.2;
      p.mesh.position.set(Math.round(x), Math.round(y), 2);
      p.mesh.scale.set(Math.round(s), Math.round(s), 1);
      p.mat.opacity = Math.sin(Math.PI * k) * 0.5;
    }

    // ventanas calidas: un pulso lento y desparejo
    for (const l of this.lights) {
      l.mesh.material.opacity = l.base + l.amp * (0.5 + 0.5 * Math.sin(this.t * l.speed + l.phase));
      l.mesh.position.set(Math.round(l.x), Math.round(l.y), 3);
    }

    this.menu.setCamera(0, 0);
    const action = this.menu.update(dt, input);
    if (action === 'continue') {
      // La casa como base: el traje ya está hecho y no se repite la historia.
      this.menu.hide();
      this.game.enterBase();
    } else if (action === 'play') {
      this.menu.hide();
      this.game.newGame();
      this.game.startPrologue('intro');
    } else if (action === 'new') {
      // Partida nueva: se borra el guardado y arranca como Jugar.
      clearSave();
      this.menu.hide();
      this.game.newGame();
      this.game.startPrologue('intro');
    } else if (action === 'arena') {
      // directo al minijuego: Juan sale con el traje puesto y el rifle
      this.menu.hide();
      this.game.newGame();
      this.game.hasSuit = true;
      this.game.flags = { ...(this.game.flags || {}), [FLAG.APAGON]: true, [FLAG.LISTO_PARA_SALIR]: true };
      this.game.startArena({ minigame: true });
    }
  }

  get blocksPause() { return true; }
  get dialog() { return { open: false }; }
  get choice() { return { open: false }; }
}
