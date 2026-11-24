// Muerte, viñeta y pantalla de resultado: récord, navegación y salida.
// Funciones que reciben la escena.
import { createResultNav, stepResultNav, resultAction, isNewBest } from './results.js';
import { resultOptionRects } from './resultScreen.js';
import { pointInRect } from '../geom.js';
import { deathResult } from './exit.js';


export function die(scene) {
  if (scene.dead) return;
  scene.dead = true;
  scene.exitLock = true;
  scene.integrity = 0;
  scene.phase = 'dead';
  scene.vignetteOpen = true;
  scene.deathT = 0;
  scene.patchT = 0;
  scene.player.setFrozen(true);
  scene.player.mesh.visible = false;
  scene.player.shadow.visible = false;
  scene.shake = 0.25;
  scene.newBest = isNewBest(scene.best, { round: scene.round, points: scene.points.score });
  scene.updateBest();
}

/** M12: el récord vive en el save (nunca en una clave propia). */
export function bestFromSave(scene, save) {
  const best = save && save.best ? save.best : null;
  return {
    round: Math.max(0, Math.floor(Number(best && best.round) || 0)),
    points: Math.max(0, Math.floor(Number(best && best.points) || 0)),
  };
}

export function updateBest(scene) {
  const next = {
    round: Math.max(scene.best.round, scene.round),
    points: Math.max(scene.best.points, scene.points.score),
  };
  scene.best = next;
  scene.save = { ...scene.save, best: { ...next } };
  // En la salida real el récord se guarda ya; el Minijuego lo deja sólo en
  // memoria (game.isolated) y no persiste nada.
  if (scene.game.run && !scene.game.isolated && typeof scene.game.persist === 'function') {
    scene.game.persist(scene.save);
  }
}

export function updateVignette(scene, input, dt) {
  scene.deathT += dt;
  scene.updateFx(dt);
  // La viñeta se entinta en 0.4 s; un click temprano queda en buffer 0.3 s.
  if (scene.controls.advance) scene.advanceBuffer = 0.3;
  scene.advanceBuffer = Math.max(0, scene.advanceBuffer - dt);
  if (scene.deathT > 0.45 && (scene.controls.advance || scene.advanceBuffer > 0)) {
    scene.advanceBuffer = 0;
    scene.openResult();
  }
}

export function openResult(scene) {
  scene.game.mouseCursor?.setHidden?.(false); // resultado: vuelve el guante
  scene.vignetteOpen = false;
  scene.resultOpen = true;
  scene.resultT = 0;
  scene.resultSel = 0;
  scene.nav = createResultNav();
}

export function updateResult(scene, input, dt) {
  scene.resultT += dt;
  // stepResultNav exige un flanco y haber soltado la dirección al abrir:
  // el stick no elige por su cuenta ni la selección se dispara sola.
  scene.nav = stepResultNav(scene.nav, input.menuMove || { x: 0, y: 0 });
  scene.resultSel = scene.nav.sel;

  // Mouse: el hover mueve la opcion y pone la manito; afuera, flecha.
  const rects = resultOptionRects({ bag: scene.bag });
  const pointer = input.device === 'mouse' && input.pointer
    ? scene.game.screenToView(input.pointer.x, input.pointer.y) : null;
  const click = input.device === 'mouse' && input.click
    ? scene.game.screenToView(input.click.x, input.click.y) : null;
  const hitAt = (point) => rects.findIndex((rect) => pointInRect(point, rect));
  const hover = pointer ? hitAt(pointer) : -1;
  if (hover >= 0) {
    scene.resultSel = hover;
    scene.nav = { ...scene.nav, sel: hover };
  }
  scene.game.mouseCursor?.setState(hover >= 0 ? 'hand' : 'arrow');

  // Un click SOLO actua si cae sobre una opcion: en zona vacia es no-op.
  // Vale desde el primer cuadro visible (no se pierde el primer click).
  const clicked = click ? hitAt(click) : -1;
  if (clicked >= 0) {
    scene.pickResult(clicked);
    return;
  }
  if (input.bPressed || input.startPressed) {
    scene.game.mouseCursor?.setHidden?.(false);
    scene.game.changeScene('title');
    return;
  }
  if (scene.resultT < 0.22) return;
  // Teclado / pad: A/Enter/Space confirman la seleccion actual como siempre.
  if (scene.controls.confirm) scene.pickResult(scene.resultSel);
}

export function pickResult(scene, sel) {
  scene.resultSel = sel;
  scene.nav = { ...scene.nav, sel };
  if (resultAction(sel) === 'home') {
    if (typeof scene.game.endRun === 'function') {
      scene.game.mouseCursor?.setHidden?.(false);
      scene.game.endRun(deathResult({
        bag: scene.bag,
        round: scene.round,
        points: scene.points.score,
      }));
    } else {
      scene.restart();
    }
    return;
  }
  scene.game.mouseCursor?.setHidden?.(false); // volver al titulo: guante
  scene.game.changeScene('title');
}

export function restart(scene) {
  scene.game.mouseCursor?.setHidden?.(true); // de nuevo a combatir
  scene.resultOpen = false;
  scene.vignetteOpen = false;
  scene.dead = false;
  scene.resetRun();
  scene.ui.mesh.visible = true;
}
