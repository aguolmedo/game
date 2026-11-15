import { WorldScene } from './world.js';
import { garage } from '../maps/garage.js';

export class GarageScene extends WorldScene {
  constructor(game) {
    super(game, garage, {});
  }
}
