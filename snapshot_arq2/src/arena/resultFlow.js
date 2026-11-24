// Muerte, viñeta y pantalla de resultado: récord, navegación y salida.
// Funciones que reciben la escena.
import { createResultNav, stepResultNav, resultAction, isNewBest } from './results.js';
import { resultOptionRects } from './resultScreen.js';
import { pointInRect } from '../geom.js';
import { deathResult } from './exit.js';


export function die(scene) {
  if (scene.dead) return;
  scene.exitLock = true;
  scene.state.integrity = 0;
  scene.setMode('dying');
  scene.state.deathT = 0;
  scene.state.patchT = 0;
  scene.player.setFrozen(true);
  scene.player.mesh.visible = false;
  scene.player.shadow.visible = false;
  scene.shake = 0.25;
  scene.state.newBest = isNewBest(scene.best, { round: scene.state.round, points: scene.state.points.score });
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
    round: Math.max(scene.best.round, scene.state.round),
    points: Math.max(scene.best.points, scene.state.points.score),
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
  scene.state.deathT += dt;
  scene.updateFx(dt);
  // La viñeta se entinta en 0.4 s; un click temprano queda en buffer 0.3 s.
  if (scene.controls.advance) scene.advanceBuffer = 0.3;
  scene.advanceBuffer = Math.max(0, scene.advanceBuffer - dt);
  if (scene.state.deathT > 0.45 && (scene.controls.advance || scene.advanceBuffer > 0)) {
    scene.advanceBuffer = 0;
    scene.openResult();
  }
}

export function openResult(scene) {
  scene.game.mouseCursor?.setHidden?.(false); // resultado: vuelve el guante
  scene.setMode('result');
  scene.state.resultT = 0;
  scene.state.resultSel = 0;
  scene.state.nav = createResultNav();
}

export function updateResult(scene, input, dt) {
  scene.state.resultT += dt;
  // stepResultNav exige un flanco y haber soltado la dirección al abrir:
  // el stick no elige por su cuenta ni la selección se dispara sola.
  scene.state.nav = stepResultNav(scene.state.nav, input.menuMove || { x: 0, y: 0 });
  scene.state.resultSel = scene.state.nav.sel;

  // Mouse: el hover mueve la opcion y pone la manito; afuera, flecha.
  const rects = resultOptionRects({ bag: scene.state.bag });
  const pointer = input.device === 'mouse' && input.pointer
    ? scene.game.screenToView(input.pointer.x, input.pointer.y) : null;
  const click = input.device === 'mouse' && input.click
    ? scene.game.screenToView(input.click.x, input.click.y) : null;
  const hitAt = (point) => rects.findIndex((rect) => pointInRect(point, rect));
  const hover = pointer ? hitAt(pointer) : -1;
  if (hover >= 0) {
    scene.state.resultSel = hover;
    scene.state.nav = { ...scene.state.nav, sel: hover };
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
  if (scene.state.resultT < 0.22) return;
  // Teclado / pad: A/Enter/Space confirman la seleccion actual como siempre.
  if (scene.controls.confirm) scene.pickResult(scene.state.resultSel);
}

export function pickResult(scene, sel) {
  scene.state.resultSel = sel;
  scene.state.nav = { ...scene.state.nav, sel };
  if (resultAction(sel) === 'home') {
    if (typeof scene.game.endRun === 'function') {
      scene.game.mouseCursor?.setHidden?.(false);
      scene.game.endRun(deathResult({
        bag: scene.state.bag,
        round: scene.state.round,
        points: scene.state.points.score,
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
  scene.resetRun();
  scene.ui.mesh.visible = true;
}
