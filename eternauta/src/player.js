import { charSprite, depthFor, makeShadow } from './sprite.js';
import {
  PLAYER_SPEED, directionFromMove, footBox, resolveMove, walkFrame,
} from './movement.js';

const IDLE_FRAME_TIME = 0.55;
const WALK_FRAMES = 6;
const PIXELS_PER_FRAME = 5;

export class Player {
  constructor(scene, assets, who = 'juan') {
    this.assets = assets;
    this.who = who;
    this.suit = who === 'juan_suit' || who === 'juan_suit_rifle';
    this.rifle = who === 'juan_suit_rifle';
    this.sprite = charSprite(assets.chars2, assets.chars2Data, who);
    this.mesh = this.sprite.mesh;
    this.shadow = makeShadow(scene, assets.shadow, 14, 5);
    scene.add(this.mesh);
    this.shadow.material.opacity = 0.75;

    this.x = 160;
    this.feet = 150;
    this.dir = 'down';
    this.distance = 0;
    this.idleTime = 0;
    this.moving = false;
    this.frozen = false;
    this.walkFrame = 0;
    this.draw();
  }

  setSuit(on) {
    this.suit = Boolean(on);
    this.applyWho();
  }

  setRifle(on) {
    this.rifle = Boolean(on);
    this.applyWho();
  }

  applyWho() {
    const next = this.suit
      ? (this.rifle ? 'juan_suit_rifle' : 'juan_suit')
      : 'juan';
    if (next === this.who) return;
    this.who = next;
    this.sprite.setWho(next);
  }

  place(x, feet, dir = 'down') {
    this.x = x;
    this.feet = feet;
    this.dir = dir;
    this.sprite.setDir(dir);
    this.distance = 0;
    this.sprite.setFrame(6);
    this.draw();
  }

  setFrozen(frozen) {
    this.frozen = frozen;
    if (frozen) {
      this.moving = false;
      this.sprite.setFrame(6);
    }
  }

  draw() {
    const x = Math.round(this.x);
    const feet = Math.round(this.feet);
    this.mesh.position.set(x, feet - 16, depthFor(feet));
    this.shadow.position.set(x, feet - 2, depthFor(feet) - 0.001);
  }

  update(dt, move, world, bounds) {
    if (this.frozen) {
      this.moving = false;
      this.moved = 0;
      return { moved: 0 };
    }
    const beforeX = this.x;
    const beforeFeet = this.feet;
    const next = resolveMove(
      { x: this.x, feet: this.feet },
      move,
      dt,
      PLAYER_SPEED,
      bounds,
      world ? (box) => world.isSolid(box) : null,
    );
    const moved = Math.hypot(next.x - beforeX, next.feet - beforeFeet);
    this.moved = moved;
    this.moving = moved > 0.01;
    this.x = next.x;
    this.feet = next.feet;

    if (Math.hypot(move.x || 0, move.y || 0) > 0.05) {
      this.dir = directionFromMove(move, this.dir);
    }
    this.sprite.setDir(this.dir);

    if (this.moving) {
      this.distance += moved;
      this.idleTime = 0;
      this.walkFrame = walkFrame(this.distance, WALK_FRAMES, PIXELS_PER_FRAME);
      this.sprite.setFrame(this.walkFrame);
    } else {
      this.distance = 0;
      this.idleTime += dt;
      this.sprite.setFrame(this.idleTime % (IDLE_FRAME_TIME * 2) > IDLE_FRAME_TIME ? 7 : 6);
    }
    this.draw();
    return { moved };
  }

  get footBox() {
    return footBox(this.x, this.feet);
  }
}
