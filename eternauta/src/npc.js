import { charSprite, canvasOverlay, depthFor, makeShadow } from './sprite.js';
import { drawText } from './font.js';

const IDLE_FRAME_TIME = 0.55;

/** Personaje quieto. Mira al jugador al hablar y vuelve a su pose al cerrar. */
export class NPC {
  constructor(scene, assets, def) {
    this.assets = assets;
    this.id = def.id;
    this.who = def.who;
    this.sprite = charSprite(assets.chars2, assets.chars2Data, def.who);
    this.mesh = this.sprite.mesh;
    this.shadow = makeShadow(scene, assets.shadow, 14, 5);
    scene.add(this.mesh);
    this.x = def.x;
    this.feet = def.feet;
    this.restDir = def.dir || 'down';
    this.dir = this.restDir;
    this.sprite.setDir(this.dir);
    this.time = Math.random() * 2;
    this.hasNew = def.hasNew !== false;
    this.talking = false;

    // Burbuja "...": un canvas chiquito que flota sobre la cabeza.
    this.bubble = canvasOverlay(15, 12, 0);
    this.bubble.mesh.material.depthTest = true;
    this.bubble.mesh.position.set(0, 0, 0);
    this.bubbleText = '';
    scene.add(this.bubble.mesh);
    this.drawBubble();
    this.bubble.mesh.visible = false;

    this.draw();
    this.sprite.setFrame(6);
  }

  drawBubble() {
    if (this.bubbleText === '...') return;
    this.bubbleText = '...';
    const { ctx } = this.bubble;
    this.bubble.clear();
    // globito de historieta chico, crema con contorno oscuro y colita
    ctx.fillStyle = '#1a1426';
    ctx.fillRect(2, 0, 11, 8);
    ctx.fillRect(3, 8, 9, 1);
    ctx.fillRect(4, 9, 7, 1);
    ctx.fillRect(5, 10, 5, 1);
    ctx.fillRect(6, 11, 3, 1);
    ctx.fillStyle = '#ecd6a4';
    ctx.fillRect(3, 1, 9, 6);
    ctx.fillRect(4, 7, 7, 1);
    ctx.fillRect(5, 8, 5, 1);
    ctx.fillRect(6, 9, 3, 1);
    ctx.fillStyle = '#3a2418';
    ctx.fillRect(5, 3, 1, 1);
    ctx.fillRect(7, 3, 1, 1);
    ctx.fillRect(9, 3, 1, 1);
    this.bubble.commit();
  }

  get box() {
    return { x: this.x - 8, y: this.feet - 36, w: 16, h: 36 };
  }

  /** Caja generosa que llega hasta el borde de la mesa, para poder hablar. */
  get reachBox() {
    return { x: this.x - 9, y: this.feet - 26, w: 18, h: 52 };
  }

  place(x, feet) {
    this.x = x;
    this.feet = feet;
    this.draw();
  }

  lookAt(player) {
    const dx = player.x - this.x;
    const dy = player.feet - this.feet;
    const next = Math.abs(dx) > Math.abs(dy)
      ? (dx < 0 ? 'left' : 'right')
      : (dy < 0 ? 'up' : 'down');
    this.dir = next;
    this.talking = true;
    this.sprite.setDir(next);
    this.sprite.setFrame(6);
  }

  resetPose() {
    this.talking = false;
    this.dir = this.restDir;
    this.sprite.setDir(this.dir);
    this.sprite.setFrame(6);
    this.draw();
  }

  markSeen() {
    this.hasNew = false;
    this.drawBubble();
    this.bubble.mesh.visible = false;
  }

  draw() {
    const x = Math.round(this.x);
    const feet = Math.round(this.feet);
    this.mesh.position.set(x, feet - 16, depthFor(feet));
    this.shadow.position.set(x, feet - 2, depthFor(feet) - 0.001);
  }

  update(dt, player, near) {
    this.time += dt;
    if (!this.talking) {
      const frames = this.assets.chars2Data.idle;
      const k = Math.floor((this.time + (this.x % 7) * 0.1) / IDLE_FRAME_TIME) % frames.length;
      this.sprite.setFrame(frames[k]);
    }
    const show = this.hasNew && near && !this.talking;
    this.bubble.mesh.visible = show;
    if (show) {
      const bob = Math.round(Math.sin(this.time * 3) * 1);
      this.bubble.mesh.position.set(
        Math.round(this.x), Math.round(this.feet - 36 + bob), depthFor(this.feet) + 0.4,
      );
    }
  }
}
