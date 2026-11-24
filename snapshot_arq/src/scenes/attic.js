import { WorldScene } from './world.js';
import { attic } from '../maps/attic.js';

export class AtticScene extends WorldScene {
  constructor(game) {
    super(game, attic, {});
  }
}
