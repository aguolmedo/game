// Fixture único de WorldScene sin Three ni DOM: el estado mínimo para probar
// lógica de mundo (acciones, barra de pistas, controles). Si WorldScene gana o
// cambia un campo, se arregla acá y no en cada test.
import { WorldScene } from '../../src/scenes/world.js';

const noop = () => {};
const closed = () => ({ open: false, update: noop });

export function makeWorldScene(overrides = {}) {
  return Object.assign(Object.create(WorldScene.prototype), {
    t: 0,
    player: { x: 0, feet: 0, dir: 'down', update: noop, sprite: { setDir: noop } },
    hud: { update: noop },
    surface: { update: noop },
    snow: null,
    footprints: null,
    light: { setMode: noop, update: noop, setCamera: noop },
    comic: closed(), caption: closed(), balloon: closed(),
    dialog: closed(), choice: closed(),
    cursor: { hide: noop, fadeOut: noop, showAt: noop, setPosition: noop },
    ghostCursor: { hide: noop },
    npcs: [], pickups: [], cam: { x: 0, y: 0 }, hintRects: [],
    target: null, hoverTarget: null, hoverNear: false, selfHover: false,
    exitWarp: null, handsAim: null, handsAction: null,
    mapData: { warps: [], objects: [], cols: 20, rows: 20 },
    world: {}, worldState: { items: [], moved: {} },
    game: {
      flags: {}, inventory: [], selectedSlot: 0, pavaStation: null,
      input: { device: 'mouse' }, mouseCursor: { setState: noop },
      showToast: noop, emit: noop,
    },
    ...overrides,
  });
}
export { WorldScene };
