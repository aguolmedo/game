import { WorldScene } from './world.js';
import { house } from '../maps/house.js';

export class HouseScene extends WorldScene {
  constructor(game) {
    super(game, house, {});
  }
}
