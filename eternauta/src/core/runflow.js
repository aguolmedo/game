import { createMate, createPava } from '../mate.js';
import {
  BASE_FLAGS, bagSummary, endRunComplains, endRunSave, runPersists, startRunSave,
} from '../base.js';
import { loadSave, writeSave } from '../run/save.js';
import { createInventory, addItem } from '../inventory.js';
import { resetWorld } from '../surfaces.js';
import { FLAG } from '../data/flags.js';

/**
 * Flujo de partida y del loop roguelike: newGame, base, salida (startArena /
 * startRun / endRun), guardado y avisos. deps: { game, scenes, router, panels }.
 */
export function installRunFlow({ game, scenes, router, panels }) {
  game.newGame = () => {
    game.inventory = createInventory();
    game.hasSuit = false;
    game.hasRifle = false;
    game.crafted = false;
    game.selectedSlot = 0;
    game.flags = {};
    game.lightingMode = 'electrica';
    game.mate = createMate();
    game.pava = createPava();
    game.pavaStation = null;
    game.pavaCool = 0;
    game.mateCalma = 0;
    game.mateShared = {};
    game.blackoutT = -1;
    game.run = null;
    game.baseSave = null;
    game.baseBotin = null;
    game.isolated = false;
    // Los avisos pendientes y el "ya avisé" sobreviven a la partida nueva:
    // si el storage falla, el dueño tiene que enterarse igual (M3).
    panels.hideAll();
    resetWorld(game);
    game.clock = 0;
    game.runId += 1;
    game.clearOverlay();
    router.clearQueue();
    game.fade = 0;
    for (const scene of Object.values(scenes)) scene.reset();
  };

  /** Evento de historia (H5). Si no hay historia cargada, no hace nada. */
  game.emit = (type, data = {}) => {
    if (game.story && game.story.handle) game.story.handle(type, data, game);
  };

  /** Abre una vista por la ventana ('attic' | 'living'). */
  game.openView = (id, back = game.sceneName, spawn = null, onExit = null) => {
    const view = scenes.view;
    if (!view) return;
    view.viewId = id;
    view.opts = { returnTo: back, spawn, onExit };
    game.changeScene('view');
  };

  game.startArena = (opts = {}) => {
    if (game.sceneName === 'arena') return;
    // M1: el Minijuego corre aislado (no hay game.run y no se escribe nada).
    game.isolated = Boolean(opts.minigame);
    // Con el traje hecho, salir a la calle ya entra en el loop del roguelike;
    // el "Minijuego" del título pide una arena suelta, sin run (opts.minigame).
    // El Minijuego no lee ni migra el save: entra en modo solo lectura.
    if (!opts.minigame) {
      const base = game.baseSave || loadSave();
      if (base.trajeHecho && !game.run) {
        const started = startRunSave(base);
        game.persist(started.save);
        game.run = started.run;
      }
    }
    game.flags[FLAG.BASE] = false;
    game.flags[FLAG.ARENA] = true;
    game.changeScene('arena');
  };

  /** Estado comun de la casa-base: traje puesto, rifle y las flags del final. */
  function applyBaseState(save) {
    game.hasSuit = true;
    game.hasRifle = true;
    if (!game.inventory.some((slot) => slot && slot.id === 'traje')) {
      game.inventory = addItem(game.inventory, 'traje', 1).slots;
    }
    if (!game.inventory.some((slot) => slot && slot.id === 'rifle')) {
      game.inventory = addItem(game.inventory, 'rifle', 1).slots;
    }
    game.crafted = true;
    game.flags = { ...(game.flags || {}), ...BASE_FLAGS, base: true, arena: false };
    game.baseSave = save;
    game.baseBotin = { ...save.botin };
    game.setLighting('apagon');
  }

  /**
   * "Continuar": la casa como base, con el traje ya hecho. El save en memoria
   * (`game.baseSave`) manda: si el storage falló, la salida no se pierde (M3).
   */
  game.enterBase = (spawn, saveIn = null) => {
    const save = saveIn || game.baseSave || loadSave();
    game.newGame();
    applyBaseState(save);
    game.changeScene('garage', spawn || { x: 9 * 16 + 8, y: 7 * 16 + 8, dir: 'down' });
  };

  /** El porton de la base: sube el loop y arranca la salida. */
  game.startRun = () => {
    if (game.overlay === 'transition' || game.overlay === 'equip') return false;
    const started = startRunSave(game.baseSave || loadSave());
    game.persist(started.save);
    game.isolated = false;
    game.run = started.run;
    game.flags[FLAG.BASE] = false;
    return game.changeScene('arena');
  };

  /** Guarda el save y lo deja como fuente de verdad en memoria (M3). */
  game.persist = (save) => {
    const ok = writeSave(save);
    game.baseSave = save;
    if (!ok && !game.saveWarned) {
      game.saveWarned = true;
      game.queueToast('No se pudo guardar. La partida sigue en memoria.');
    }
    return ok;
  };

  /** Aviso: si hay HUD se muestra ya; si no, espera el próximo cambio de escena. */
  game.queueToast = (text) => {
    if (!text) return;
    const hud = game.scene && game.scene.hud;
    const busy = game.overlay === 'transition' || game.overlay === 'equip';
    if (hud && !busy) game.showToast(text);
    else game.pendingToasts.push(text);
  };

  /** Cierra la salida en memoria y en disco; nunca pierde el botín (M3). */
  function finishRun(result) {
    // La arena tiene el save vivo (si levantaste la mochila de otra vez, ya
    // viene sin ella). Si no, manda el save en memoria y recién después el disco.
    const live = game.sceneName === 'arena' && game.scene?.save
      && typeof game.scene.save === 'object' ? game.scene.save : null;
    const save = endRunSave(live || game.baseSave || loadSave(), result);
    game.run = null;
    game.baseSave = save;
    game.persist(save);
    return save;
  }

  /** Cierra la salida: vuelve con el botin o deja la mochila en la nieve. */
  game.endRun = (result = {}) => {
    // M1: el Minijuego no persiste nada; "Volver a la casa" reinicia como el
    // viejo "Otra vez" (diseño de la salida, punto 7).
    if (!runPersists(game.run, game.isolated)) {
      if (game.scene && game.scene.restart) game.scene.restart();
      return null;
    }
    const save = finishRun(result);
    if (result.to) {
      // Abandono (M5): la salida ya quedó cerrada; se sigue a la escena pedida.
      game.changeScene(result.to, result.spawn);
    } else if (endRunComplains(result, save)) {
      // Cada tres muertes, el viejo se queja antes de volver a la casa.
      applyBaseState(save);
      game.startPrologue('queja', { returnTo: 'garage' });
    } else {
      // El save va explícito: newGame() limpia baseSave y no hay que releer disco.
      game.enterBase(null, save);
    }
    // El aviso se encola y sale cuando termina el cambio de escena.
    if (result.type === 'volvio') game.queueToast(bagSummary(result.bag));
    return save;
  };

  /** Prólogo del roguelike: 'intro' (partida nueva) o 'queja' (entre loops). */
  game.startPrologue = (mode = 'intro', opts = {}) => {
    scenes.prologue.start(mode, opts);
  };
}
