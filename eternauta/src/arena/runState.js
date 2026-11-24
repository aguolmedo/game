// Estado de la corrida de la salida: objeto plano, sin Three ni DOM.
// La escena lo guarda en su state y expone getters/setters de
// compatibilidad con los nombres viejos (ver STATE_FIELDS).
import { emptyBag } from '../run/loot.js';

export function createRunState(overrides = {}) {
  return {
    mode: 'banner',
    // ronda y oleadas
    round: 1,
    cfg: null,
    bannerT: 0,
    spawned: 0,
    spawnTimer: 0,
    firstBiteReady: false,
    // jugador
    integrity: 0,
    integrityMax: 0,
    invuln: 0,
    patchT: 0,
    strips: 0,
    points: null,
    weapon: null,
    eff: null,
    // botín
    bag: emptyBag(),
    groundLoot: [],
    items: { bengalas: 0, molotovs: 0 },
    // lógica de combate
    enemies: [],
    bullets: [],
    // resultado
    deathT: 0,
    resultT: 0,
    resultSel: 0,
    newBest: false,
    nav: null,
    // semillas y rngs
    seed: 0,
    rng: null,
    roundSeed: 0,
    roundRng: null,
    shotRng: null,
    // resto de la simulación: se arma en la escena (constructor/setupRun)
    t: undefined,
    aim: undefined,
    arena: undefined,
    bounds: undefined,
    spawns: undefined,
    crate: undefined,
    solidBoxes: undefined,
    flows: undefined,
    flowMasks: undefined,
    flowTile: undefined,
    flowT: undefined,
    exitHome: undefined,
    mapData: undefined,
    cells: undefined,
    seedBuilt: undefined,
    bengala: undefined,
    fires: undefined,
    mochila: undefined,
    survivor: undefined,
    exitLock: undefined,
    exitArmed: undefined,
    fireLock: undefined,
    advanceBuffer: undefined,
    reloadHintAt: undefined,
    recoil: undefined,
    recoilX: undefined,
    recoilY: undefined,
    shake: undefined,
    loop: undefined,
    best: undefined,
    hand: undefined,
    save: undefined,
    ...overrides,
  };
}

// Campos de la escena que viven en state (la escena los expone como accesores).
export const STATE_FIELDS = Object.keys(createRunState()).filter((k) => k !== 'mode');
