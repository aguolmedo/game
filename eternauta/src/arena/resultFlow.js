// Muerte, viñeta y pantalla de resultado: récord, navegación y salida.
// Funciones que reciben la escena.
import { isOverlay } from './runMode.js';
import { createResultNav, stepResultNav, resultAction, isNewBest } from './results.js';
import { resultOptionRects } from './resultScreen.js';
import { pointInRect } from '../geom.js';
import { deathResult } from './exit.js';


export function die(state, view, svc) {
  if (isOverlay(state.mode)) return;
  state.exitLock = true;
  state.integrity = 0;
  svc.setMode('dying');
  state.deathT = 0;
  state.patchT = 0;
  view.player.setFrozen(true);
  view.player.mesh.visible = false;
  view.player.shadow.visible = false;
  state.shake = 0.25;
  state.newBest = isNewBest(state.best, { round: state.round, points: state.points.score });
  svc.updateBest();
}

/** M12: el récord vive en el save (nunca en una clave propia). */
export function bestFromSave(state, view, svc, save) {
  const best = save && save.best ? save.best : null;
  return {
    round: Math.max(0, Math.floor(Number(best && best.round) || 0)),
    points: Math.max(0, Math.floor(Number(best && best.points) || 0)),
  };
}

export function updateBest(state, view, svc) {
  const next = {
    round: Math.max(state.best.round, state.round),
    points: Math.max(state.best.points, state.points.score),
  };
  state.best = next;
  state.save = { ...state.save, best: { ...next } };
  // En la salida real el récord se guarda ya; el Minijuego lo deja sólo en
  // memoria (game.isolated) y no persiste nada.
  if (svc.game.run && !svc.game.isolated && typeof svc.game.persist === 'function') {
    svc.game.persist(state.save);
  }
}

export function updateVignette(state, view, svc, input, dt) {
  state.deathT += dt;
  svc.updateFx(dt);
  // La viñeta se entinta en 0.4 s; un click temprano queda en buffer 0.3 s.
  if (view.controls.advance) state.advanceBuffer = 0.3;
  state.advanceBuffer = Math.max(0, state.advanceBuffer - dt);
  if (state.deathT > 0.45 && (view.controls.advance || state.advanceBuffer > 0)) {
    state.advanceBuffer = 0;
    svc.openResult();
  }
}

export function openResult(state, view, svc) {
  svc.game.mouseCursor?.setHidden?.(false); // resultado: vuelve el guante
  svc.setMode('result');
  state.resultT = 0;
  state.resultSel = 0;
  state.nav = createResultNav();
}

export function updateResult(state, view, svc, input, dt) {
  state.resultT += dt;
  // stepResultNav exige un flanco y haber soltado la dirección al abrir:
  // el stick no elige por su cuenta ni la selección se dispara sola.
  state.nav = stepResultNav(state.nav, input.menuMove || { x: 0, y: 0 });
  state.resultSel = state.nav.sel;

  // Mouse: el hover mueve la opcion y pone la manito; afuera, flecha.
  const rects = resultOptionRects({ bag: state.bag });
  const pointer = input.device === 'mouse' && input.pointer
    ? svc.game.screenToView(input.pointer.x, input.pointer.y) : null;
  const click = input.device === 'mouse' && input.click
    ? svc.game.screenToView(input.click.x, input.click.y) : null;
  const hitAt = (point) => rects.findIndex((rect) => pointInRect(point, rect));
  const hover = pointer ? hitAt(pointer) : -1;
  if (hover >= 0) {
    state.resultSel = hover;
    state.nav = { ...state.nav, sel: hover };
  }
  svc.game.mouseCursor?.setState(hover >= 0 ? 'hand' : 'arrow');

  // Un click SOLO actua si cae sobre una opcion: en zona vacia es no-op.
  // Vale desde el primer cuadro visible (no se pierde el primer click).
  const clicked = click ? hitAt(click) : -1;
  if (clicked >= 0) {
    svc.pickResult(clicked);
    return;
  }
  if (input.bPressed || input.startPressed) {
    svc.game.mouseCursor?.setHidden?.(false);
    svc.game.changeScene('title');
    return;
  }
  if (state.resultT < 0.22) return;
  // Teclado / pad: A/Enter/Space confirman la seleccion actual como siempre.
  if (view.controls.confirm) svc.pickResult(state.resultSel);
}

export function pickResult(state, view, svc, sel) {
  state.resultSel = sel;
  state.nav = { ...state.nav, sel };
  if (resultAction(sel) === 'home') {
    if (typeof svc.game.endRun === 'function') {
      svc.game.mouseCursor?.setHidden?.(false);
      svc.game.endRun(deathResult({
        bag: state.bag,
        round: state.round,
        points: state.points.score,
      }));
    } else {
      svc.restart();
    }
    return;
  }
  svc.game.mouseCursor?.setHidden?.(false); // volver al titulo: guante
  svc.game.changeScene('title');
}

export function restart(state, view, svc) {
  svc.game.mouseCursor?.setHidden?.(true); // de nuevo a combatir
  svc.resetRun();
  view.ui.mesh.visible = true;
}
