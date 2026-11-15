import { WorldScene } from './world.js';
import { street } from '../maps/street.js';

export class StreetScene extends WorldScene {
  constructor(game) {
    super(game, street, { snow: true, footprints: true });
  }
}
