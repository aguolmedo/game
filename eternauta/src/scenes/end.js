import * as THREE from 'three';
import { WorldMap, cloneMap } from '../mapView.js';
import { Snowfall } from '../snow.js';
import { Player } from '../player.js';
import { canvasOverlay, VIEW_W, VIEW_H } from '../sprite.js';
import { drawCentered } from '../font.js';
import { OUT, SNOW, PAR, AM3, darkPanel } from '../uiSkin.js';
import { drawPrompt, promptWidth } from '../glyphs.js';
import { street } from '../maps/street.js';

export class EndScene {
  constructor(game) {
    this.game = game;
    this.pausable = false;
    // Pantalla fija: sin zoom del mundo (T2).
    this.worldZoom = false;
    this.scene = new THREE.Scene();
    // Capa de UI fija en pantalla: se dibuja con uiCamera (no viaja con el mundo).
    this.uiScene = new THREE.Scene();
    this.world = new WorldMap(this.scene, game.assets, cloneMap(street));
    this.snow = new Snowfall(this.scene, game.assets.snowFlakes, { count: 90, front: 24 });
    this.player = new Player(this.scene, game.assets, 'juan_suit');
    this.cam = this.world.cameraFor(street.endX - 70, 8 * 16);
    this.ui = canvasOverlay(VIEW_W, VIEW_H, 40);
    this.uiScene.add(this.ui.mesh);
    this.t = 0;
    this.blink = null;
  }

  enter() {
    this.t = 0;
    this.blink = null;
    const x = street.endX - 70;
    this.player.setSuit(true);
    this.player.place(x, 8 * 16 + 8, 'right');
    this.cam = this.world.cameraFor(x, 8 * 16);
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
    ctx.fillStyle = 'rgba(8, 9, 18, 0.48)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    darkPanel(ctx, 40, 42, VIEW_W - 80, 124, 0.66);
    drawCentered(ctx, glyphs, 'FIN DE LA DEMO', 66, SNOW, { scale: 3, outline: OUT });
    drawCentered(ctx, glyphs, 'Juan Salvo llegó al final de la calle.', 112, PAR,
      { outline: OUT });
    drawCentered(ctx, glyphs, 'El barrio entero sigue bajo la nevada.', 126, PAR,
      { outline: OUT });
    drawCentered(ctx, glyphs, 'Continuará…', 150, '#9aa8c8', { outline: OUT });
    if (true) {
      const w = promptWidth(this.game.assets, device, 'interact', 'Volver al título');
      drawPrompt(ctx, this.game.assets, device, 'interact',
        Math.round((VIEW_W - w) / 2), 210, this.t, { label: 'Volver al título' });
    }
    this.ui.commit();
  }

  update(dt, input) {
    this.t += dt;
    // Pantalla fija: el cursor siempre es la flecha (T11).
    this.game.mouseCursor?.setState('arrow');
    this.snow.update(dt);
    this.snow.setCamera(this.cam.x, this.cam.y);
    this.draw(this.t % 1.2 < 0.8);
    if ((input.aPressed || input.click) && this.t > 0.4) this.game.changeScene('title');
  }

  get blocksPause() { return true; }
  get dialog() { return { open: false }; }
  get choice() { return { open: false }; }
}

void THREE;
void AM3;
