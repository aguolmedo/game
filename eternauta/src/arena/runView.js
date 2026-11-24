// Vista de la salida: todo lo que toca Three, canvas o sprites. La simulación
// vive en runState.js; la escena guarda su view y su state por separado
// y expone accesores de compatibilidad con los nombres viejos (VIEW_FIELDS).
export function createView() {
  return {
    three: null, // THREE.Scene del mundo (ArenaScene.scene)
    uiScene: null,
    player: null,
    snow: null,
    footprints: null,
    ui: null, // overlay del HUD
    lightUi: null, // overlay de la luz
    shooting: null, // ShootingFx
    world: null,
    light: null,
    fx: [],
    frameMats: new Map(),
    frameGeos: new Map(),
    fxMats: new Map(),
    fxGeos: new Map(),
    itemMats: new Map(),
    itemGeos: new Map(),
    // buffers, entradas y capas de la vista
    cam: undefined,
    toasts: undefined,
    controls: undefined,
    mouse: undefined,
    prevKeys: undefined,
    prevPad: undefined,
    nextKeys: undefined,
    nextPad: undefined,
    aimBuf: undefined,
    fireArgs: undefined,
    consArgs: undefined,
    consOut: undefined,
    steerOut: undefined,
    lootOut: undefined,
    lootPoints: undefined,
    farolLight: undefined,
    snowLights: undefined,
    dynamicLights: undefined,
    menuSign: undefined,
    playerPoint: undefined,
  };
}

export const VIEW_FIELDS = Object.keys(createView());
