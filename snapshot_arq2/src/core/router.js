import { abandonResult, createSceneQueue, runPersists } from '../base.js';

export const FADE_TIME = 0.3;

/**
 * Router de escenas: cambio inmediato (setScene), pedidos con fundido
 * (changeScene) y la cola de pedidos que llegan en plena transición.
 * deps: { game, scenes, hidePanels(), mouseCursor, setZoom(bool) }.
 */
export function createRouter({ game, scenes, hidePanels, mouseCursor, setZoom }) {
  const queue = createSceneQueue();

  /** Cambio inmediato: cierra paneles, sale de la vieja y entra a la nueva. */
  function setScene(name, spawn) {
    const next = scenes[name];
    if (!next) throw new Error(`Escena desconocida: ${name}`);
    const prev = game.scene;
    // Si la historia saca a Juan del lugar cargando un mueble, lo apoya solo
    // en el casillero válido más cercano (o lo devuelve a su lugar) (§7).
    if (game.carry && prev) prev.autoPlaceCarry();
    hidePanels();
    game.clearOverlay('pause');
    game.clearOverlay('chest');
    game.clearOverlay('taller');
    if (prev) prev.leave();
    game.scene = next;
    game.sceneName = name;
    setZoom(next.worldZoom !== false);
    mouseCursor.setState('arrow');
    next.enter(spawn);
  }

  /** Arranca el fundido de salida hacia `name`. */
  function beginScene(name, spawn) {
    game.setOverlay('transition', { phase: 'out', t: 0, name, spawn });
  }

  /** Si quedó un pedido encolado (M6), arranca ahora que no hay transición. */
  function drainQueue() {
    const next = queue.take();
    if (next) beginScene(next.name, next.spawn);
  }

  /** Lo que deja la salida al abandonarla: bolsa, ronda y puntos de la arena. */
  function abandonFromArena() {
    const sc = game.scene;
    return {
      bag: sc && sc.bag ? { ...sc.bag } : null,
      round: Number(sc && sc.round) || 0,
      points: Number(sc && sc.points && sc.points.score) || 0,
    };
  }

  function changeScene(name, spawn) {
    // M5: irse de la arena con la salida abierta la cierra como abandono
    // (muerte sin queja, deja la mochila) en vez de perderla en silencio.
    if (name !== 'arena' && game.sceneName === 'arena'
      && runPersists(game.run, game.isolated)) {
      game.endRun({ ...abandonResult(abandonFromArena()), to: name, spawn });
      return true;
    }
    // Al salir de la arena (también del Minijuego) se apaga el modo aislado.
    if (name !== 'arena') game.isolated = false;
    // M6: con una transición (o el traje) en curso el pedido queda encolado,
    // no se descarta; el último gana.
    const busy = game.overlay === 'transition' || game.overlay === 'equip';
    const start = queue.request(name, spawn, busy);
    if (!start) return false;
    beginScene(start.name, start.spawn);
    return true;
  }

  /** Avanza el fundido de `tr` en dt segundos; cambia de escena a mitad. */
  function tickTransition(dt) {
    const tr = game.transition;
    if (!tr) return;
    tr.t += dt;
    if (tr.phase === 'out') {
      game.fade = Math.min(1, tr.t / FADE_TIME);
      if (tr.t >= FADE_TIME) {
        setScene(tr.name, tr.spawn);
        tr.phase = 'in';
        tr.t = 0;
        game.fade = 1;
      }
      return;
    }
    game.fade = Math.max(0, 1 - tr.t / FADE_TIME);
    if (tr.t >= FADE_TIME) {
      game.clearOverlay('transition');
      game.fade = 0;
      drainQueue();
    }
  }

  /** Salto directo sin fundido (API de pruebas). */
  function jump(name, spawn) {
    setScene(name, spawn);
    game.fade = 0;
    game.clearOverlay('transition');
    queue.clear();
    if (name !== 'arena') game.isolated = false;
  }

  return {
    setScene, beginScene, drainQueue, changeScene, tickTransition, jump,
    get pending() { return queue.pending; },
    clearQueue: () => queue.clear(),
  };
}
