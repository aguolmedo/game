// Estado observable y atajos de QA de la salida.
// Funciones que reciben la escena.
import { ammoLabel } from './weapon.js';
import { addToBag } from '../run/loot.js';


export function debugSnapshot(scene) {
  const alive = scene.aliveCount();
  return {
    round: scene.state.round,
    kills: scene.state.points.kills,
    points: scene.state.points.score,
    integrity: scene.state.integrity,
    integrityMax: scene.state.integrityMax,
    strips: scene.state.strips,
    ammo: {
      mag: scene.state.weapon.mag,
      reserve: scene.state.weapon.reserve,
      label: ammoLabel(scene.state.weapon),
    },
    alive,
    enemies: alive,
    enemyCount: scene.state.enemies.length,
    corpses: scene.state.enemies.filter((e) => e.dead).length,
    fx: scene.fx.length,
    footprints: scene.footprints.items.length,
    shots: scene.shooting.count(),
    phase: scene.phase,
    dead: scene.dead,
    resultOpen: scene.resultOpen,
    vignetteOpen: scene.vignetteOpen,
    resultSel: scene.state.nav ? scene.state.nav.sel : scene.state.resultSel,
    newBest: scene.state.newBest,
    fireLock: Boolean(scene.fireLock),
    loop: scene.loop,
    seed: scene.state.seed,
    bag: { ...scene.state.bag },
    groundLoot: scene.state.groundLoot.length,
    mochila: Boolean(scene.mochila),
    survivor: Boolean(scene.survivor && !scene.survivor.done),
    bengalas: scene.state.items.bengalas,
    molotovs: scene.state.items.molotovs,
    bengalaOn: Boolean(scene.bengala),
    fires: scene.fires.length,
    exitNear: scene.nearHome(),
    exitArmed: scene.exitArmed,
    hasEndRun: typeof scene.game.endRun === 'function',
  };
}

/** Atajo de QA: deja botín en la mano y devuelve la bolsa. */
export function debugGive(scene, kind, n = 1) {
  scene.state.bag = addToBag(scene.state.bag, kind, n);
  return { ...scene.state.bag };
}
