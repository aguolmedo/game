// Estado observable y atajos de QA de la salida.
// Funciones que reciben la escena.
import { ammoLabel } from './weapon.js';
import { addToBag } from '../run/loot.js';


export function state(scene) {
  const alive = scene.aliveCount();
  return {
    round: scene.round,
    kills: scene.points.kills,
    points: scene.points.score,
    integrity: scene.integrity,
    integrityMax: scene.integrityMax,
    strips: scene.strips,
    ammo: {
      mag: scene.weapon.mag,
      reserve: scene.weapon.reserve,
      label: ammoLabel(scene.weapon),
    },
    alive,
    enemies: alive,
    enemyCount: scene.enemies.length,
    corpses: scene.enemies.filter((e) => e.dead).length,
    fx: scene.fx.length,
    footprints: scene.footprints.items.length,
    shots: scene.shooting.count(),
    phase: scene.phase,
    dead: scene.dead,
    resultOpen: scene.resultOpen,
    vignetteOpen: scene.vignetteOpen,
    resultSel: scene.nav ? scene.nav.sel : scene.resultSel,
    newBest: scene.newBest,
    fireLock: Boolean(scene.fireLock),
    loop: scene.loop,
    seed: scene.seed,
    bag: { ...scene.bag },
    groundLoot: scene.groundLoot.length,
    mochila: Boolean(scene.mochila),
    survivor: Boolean(scene.survivor && !scene.survivor.done),
    bengalas: scene.items.bengalas,
    molotovs: scene.items.molotovs,
    bengalaOn: Boolean(scene.bengala),
    fires: scene.fires.length,
    exitNear: scene.nearHome(),
    exitArmed: scene.exitArmed,
    hasEndRun: typeof scene.game.endRun === 'function',
  };
}

/** Atajo de QA: deja botín en la mano y devuelve la bolsa. */
export function debugGive(scene, kind, n = 1) {
  scene.bag = addToBag(scene.bag, kind, n);
  return { ...scene.bag };
}
