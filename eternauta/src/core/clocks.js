import { addItem, removeItem } from '../inventory.js';
import { pavaItemId } from '../mate.js';
import { FLAG } from '../data/flags.js';

const BLACKOUT_TIME = 0.92;

/** Relojes de la demo: mate, pava y guion (un paso de dt segundos). */
export function updateMate(game, dt) {
  game.clock += dt;
  game.mateCalma = Math.max(0, game.mateCalma - dt);
  game.pavaCool = Math.max(0, game.pavaCool - dt);
  if (game.pavaCool === 0 && game.pavaCoolWas > 0) {
    const result = removeItem(game.inventory, 'pava_caliente', 1);
    if (result.removed > 0) {
      game.inventory = addItem(result.slots, 'pava_fria', 1).slots;
      game.showToast('La pava se enfrió.');
    }
  }
  game.pavaCoolWas = game.pavaCool;
  if (game.story && game.story.update) game.story.update(dt, game);
}

/** Apagón: dos parpadeos y después el modo `apagon` (§8). */
export function tickBlackout(game, dt) {
  if (game.blackoutT < 0) return;
  game.blackoutT += dt;
  if (game.blackoutT < BLACKOUT_TIME) return;
  game.blackoutT = -1;
  game.setLighting('apagon');
  game.scene.setLightState('candle', true);
  game.scene.setLightState('velador', false);
  game.scene.applyStoryState();
  game.showToast('Se cortó la luz.');
}

/** Instala las funciones de mate, pava y apagón en `game`. */
export function installClocks(game) {
  game.updateMate = (dt) => updateMate(game, dt);
  game.pavaItem = () => pavaItemId(game.pava.temp);
  game.setLighting = (mode) => {
    game.lightingMode = mode === 'apagon' ? 'apagon' : 'electrica';
  };
  game.blackout = () => {
    game.flags[FLAG.APAGON] = true;
    if (game.lightingMode === 'apagon' && game.blackoutT < 0) return;
    game.blackoutT = 0;
  };
}
