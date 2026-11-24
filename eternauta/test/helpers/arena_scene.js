// Fixture único de ArenaScene sin Three ni DOM: el prototipo real con el
// estado de la salida (RunState) y controles en reposo. Los tests pisan solo lo
// que necesitan vía overrides; si la escena cambia de campos, se arregla acá.
import { ArenaScene } from '../../src/scenes/arena.js';
import { createRunState } from '../../src/arena/runState.js';

export function makeArenaScene(overrides = {}) {
  return Object.assign(Object.create(ArenaScene.prototype), {
    state: createRunState(),
    controls: { fire: false, advance: false, confirm: false },
    ...overrides,
  });
}

export { ArenaScene };
