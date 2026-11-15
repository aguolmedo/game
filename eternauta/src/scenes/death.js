import * as THREE from 'three';
import { WorldMap, cloneMap } from '../mapView.js';
import { Snowfall } from '../snow.js';
import { canvasOverlay, VIEW_W, VIEW_H } from '../sprite.js';
import { drawCentered } from '../font.js';
import { OUT, SNOW, PAR, darkPanel } from '../uiSkin.js';
import { drawPrompt, promptWidth } from '../glyphs.js';
import { street } from '../maps/street.js';

export class DeathScene {
  constructor(game) {
    this.game = game;
    this.pausable = false;
    this.scene = new THREE.Scene();
    this.world = new WorldMap(this.scene, game.assets, cloneMap(street));
    this.snow = new Snowfall(this.scene, game.assets.snow, { count: 80, front: 20 });
    this.cam = this.world.cameraFor(6 * 16, 9 * 16);
    this.ui = canvasOverlay(VIEW_W, VIEW_H, 40);
    this.ui.mesh.position.set(this.cam.x + VIEW_W / 2, this.cam.y + VIEW_H / 2, 40);
    this.scene.add(this.ui.mesh);
    this.t = 0;
    this.blink = null;
  }

  enter() {
    this.t = 0;
    this.blink = null;
    this.snow.scatter();
    this.draw(true);
  }

  applyCamera(camera) {
    camera.left = this.cam.x;
    camera.right = this.cam.x + VIEW_W;
    camera.top = this.cam.y;
    camera.bottom = this.cam.y + VIEW_H;
    camera.updateProjectionMatrix();
  }

  draw(visible) {
    if (this.blink === visible) return;
    this.blink = visible;
    const { ctx } = this.ui;
    const glyphs = this.game.assets.font.glyphs;
    const device = this.game.input.device;
    this.ui.clear();
    ctx.fillStyle = 'rgba(8, 8, 18, 0.62)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    darkPanel(ctx, 40, 52, VIEW_W - 80, 124, 0.72);
    drawCentered(ctx, glyphs, 'LA NEVADA MATA', 74, SNOW, { scale: 3, outline: OUT });
    drawCentered(ctx, glyphs, 'AL CONTACTO', 104, SNOW, { scale: 3, outline: OUT });
    drawCentered(ctx, glyphs, 'Sin el traje aislante no hay salida.', 144, PAR, { outline: OUT });
    if (true) {
      const w = promptWidth(this.game.assets, device, 'interact', 'Volver a la casa');
      drawPrompt(ctx, this.game.assets, device, 'interact',
        Math.round((VIEW_W - w) / 2), 190, this.t, { label: 'Volver a la casa' });
    }
    this.ui.commit();
  }

  update(dt, input) {
    this.t += dt;
    this.snow.update(dt);
    this.snow.setCamera(this.cam.x, this.cam.y);
    this.draw(this.t % 1.2 < 0.8);
    if (input.aPressed && this.t > 0.4) {
      this.game.changeScene('house', { x: 26 * 16 + 8, y: 17 * 16 + 8, dir: 'up' });
    }
  }

  get blocksPause() { return true; }
  get dialog() { return { open: false }; }
  get choice() { return { open: false }; }
}

void THREE;
