// Historia de la demo (diseño §6): actos, banderas y objetivos.
// Los textos viven en src/data/script.js; acá sólo va la máquina de estados.
//
// Uso desde main.js:  import { initStory } from './story.js';  initStory(game);
// El juego emite eventos con game.emit(type, data) y llama story.update(dt, game)
// una vez por frame (game.updateMate ya lo hace).
import { CAPTIONS, DIALOGS, COMICS } from './data/script.js';
import { FLAG } from './data/flags.js';
import { closedCount, currentObjective } from './objectives.js';
import { loadSave, writeSave } from './run/save.js';

// Objetos que marcan la lista de "casa cerrada" (§6.2). La ventana de Martita
// la marca world.js al cerrarla; estas tres las marca la historia al usarlas.
const CLOSE_KEYS = {
  window_living: FLAG.CLOSED_WINDOW_LIVING,
  hall_door: FLAG.CLOSED_HALL_DOOR,
  garage_door: FLAG.CLOSED_GARAGE_DOOR,
};

const STREET_ARENA_X = 62 * 16;   // mitad de camino: salen los cascarudos (3.1)
const CHECK_EVERY = 0.25;         // update barato: 4 chequeos por segundo

export class Story {
  constructor() {
    this.runId = null;
    this.shown = {};
    this.queue = Promise.resolve();
    this.acc = 0;
    this.pendingView = null;
    this.pendingChair = false;
  }

  /** Una partida nueva (game.newGame sube runId) limpia lo ya mostrado. */
  sync(game) {
    if (!game || game.runId === this.runId) return;
    if (this.runId !== null) {
      this.shown = {};
      this.pendingView = null;
      this.pendingChair = false;
      this.acc = 0;
      this.queue = Promise.resolve();
    }
    this.runId = game.runId;
  }

  /** Cola serial: dos cinemáticas nunca se pisan. */
  run(game, fn) {
    const token = this.runId;
    this.queue = this.queue
      .then(async () => {
        if (game.runId !== token) return;
        await fn();
      })
      .catch((err) => console.error('[story]', err));
    return this.queue;
  }

  /** Para tests: espera a que termine la cinemática en curso. */
  idle() {
    return this.queue;
  }

  handle(type, data = {}, game) {
    if (!game || !game.flags) return;
    this.sync(game);
    switch (type) {
      case 'enterMap': this.onEnterMap(data, game); break;
      case 'interact': this.onInteract(data, game); break;
      case 'dialogEnd': this.onDialogEnd(data, game); break;
      case 'viewEnd': this.onViewEnd(data, game); break;
      case 'itemUsed': this.onItemUsed(data, game); break;
      case 'itemCrafted':
        if (data.id === 'traje') {
          game.flags[FLAG.TRAJE_FABRICADO] = true;
          // El traje queda hecho para siempre: desde el título se puede
          // Continuar en la casa sin volver a armar la historia. El save en
          // memoria manda y game.persist avisa si el storage falla (M3).
          const next = { ...(game.baseSave || loadSave()), trajeHecho: true };
          if (typeof game.persist === 'function') game.persist(next);
          else writeSave(next);
        }
        break;
      case 'mateShared': this.onMateShared(data, game); break;
      case 'timerEnd': this.onTimerEnd(data, game); break;
      case 'pavaBoiled':
        if (!this.shown.burnt) {
          this.shown.burnt = true;
          game.showToast?.('Lo quemaste, Juan. Ese mate está lavado de entrada.');
        }
        break;
      default: break;
    }
  }

  update(dt, game) {
    if (!game || !game.flags) return;
    this.sync(game);
    this.acc += dt;
    if (this.acc < CHECK_EVERY) return;
    this.acc = 0;
    this.check(game);
  }

  // ------------------------------------------------------------- eventos

  onEnterMap({ map }, game) {
    const flags = game.flags;
    if (map === 'attic') {
      if (!this.shown.intro) {
        this.shown.intro = true;
        this.run(game, async () => {
          await this.playCaption(game, CAPTIONS.intro);
          await this.playDialog(game, 'intro_favalli', 'favalli');
        });
      }
      if (flags[FLAG.RAMIREZ_MUERTO] && !flags[FLAG.IDEA_TRAJE] && !this.shown.idea) {
        this.shown.idea = true;
        this.run(game, async () => {
          await this.playDialog(game, 'favalli_idea', 'favalli');
          game.flags[FLAG.IDEA_TRAJE] = true;
          game.showToast?.('Favalli tiene un plan: el traje.');
        });
      }
    }
    if (map === 'house' && flags[FLAG.VIO_LA_NEVADA] && !flags[FLAG.CASA_SELLADA]
      && !flags[FLAG.MARTITA_VENTANA] && !this.shown.martita) {
      this.shown.martita = true;
      this.run(game, () => this.startMartita(game));
    }
    if (map === 'street' && flags[FLAG.LISTO_PARA_SALIR] && !flags[FLAG.AFUERA] && !this.shown.outside) {
      this.shown.outside = true;
      flags[FLAG.AFUERA] = true;
      this.run(game, () => this.playCaption(game, CAPTIONS.outside));
    }
  }

  onInteract({ id, kind }, game) {
    const flags = game.flags;

    // Elena en el living abre el hilo: primero la ventana, después el altillo.
    if (kind === 'npc' && id === 'elena' && flags[FLAG.CASA_SELLADA] && !flags[FLAG.ELENA_HABLADA]) {
      flags[FLAG.ELENA_HABLADA] = true;
    }

    // Sentarse a la mesa: después del diálogo ("Sentarse") corren las viñetas.
    if ((id === 'chair_juan' || id === 'chair') && flags[FLAG.MATE_TUTORIAL]
      && !flags[FLAG.TRUCO_JUGADO] && !this.shown.chair) {
      this.shown.chair = true;
      if (game.scene?.dialog?.open) this.pendingChair = true;
      else this.run(game, () => this.playTruco(game));
    }

    // Cerrar la ventana de Martita a tiempo (evento con barra de 8 s).
    if (kind === 'windowClosed' && id === 'window_martita'
      && flags[FLAG.MARTITA_SPRINT] && !flags[FLAG.MARTITA_VENTANA]) {
      flags[FLAG.MARTITA_VENTANA] = 'ok';
      flags[FLAG.MARTITA_SPRINT] = false;
      if (game.scene) game.scene.timedBar = null;
      this.run(game, () => this.playElenaMartita(game));
    }

    // Ventanas con vista: dejamos pendiente la escena para cuando se vuelva
    // al mapa (también llega viewEnd; el pending es el respaldo).
    if (kind === 'window') {
      if (id === 'window' && flags[FLAG.APAGON] && !flags[FLAG.VIO_LA_NEVADA]) {
        this.pendingView = 'window';
      } else if (id === 'window_living' && flags[FLAG.CASA_SELLADA] && !flags[FLAG.RAMIREZ_MUERTO]) {
        this.pendingView = 'window_living';
      }
    }

    // Lista de la casa cerrada: ventana del living, puerta del hall y portón.
    const key = CLOSE_KEYS[id];
    if (key && flags[FLAG.APAGON] && !flags[FLAG.CASA_SELLADA] && !flags[key]) {
      flags[key] = true;
      game.showToast?.('Cerraste todo por acá.');
    }
  }

  onDialogEnd({ id }, game) {
    if (id === 'chair_juan' && this.pendingChair) {
      this.pendingChair = false;
      this.run(game, () => this.playTruco(game));
    }
  }

  onViewEnd({ id }, game) {
    const flags = game.flags;
    if (id === 'window' && flags[FLAG.APAGON] && !flags[FLAG.VIO_LA_NEVADA]) {
      this.pendingView = 'window';
    } else if (id === 'window_living' && flags[FLAG.CASA_SELLADA] && !flags[FLAG.RAMIREZ_MUERTO]) {
      this.pendingView = 'window_living';
    }
  }

  onItemUsed({ id, action }, game) {
    if (!id || !String(id).startsWith('mate_')) return;
    if (action !== 'cebar' && action !== 'sip') return;
    if (!game.flags[FLAG.MATE_TUTORIAL]) game.flags[FLAG.MATE_TUTORIAL] = true;
  }

  onMateShared({ all }, game) {
    if (!all) return;
    game.flags[FLAG.MATE_TUTORIAL] = true;
    if (!this.shown.sharedAll) {
      this.shown.sharedAll = true;
      game.showToast?.('Convidaste a los tres. Volvé a la mesa.');
    }
  }

  onTimerEnd({ id }, game) {
    const flags = game.flags;
    if (id !== 'martita' || !flags[FLAG.MARTITA_SPRINT] || flags[FLAG.MARTITA_VENTANA]) return;
    flags[FLAG.MARTITA_VENTANA] = 'tarde';
    flags[FLAG.MARTITA_SPRINT] = false;
    this.run(game, async () => {
      await this.playComic(game, COMICS.martitaTarde);
      await this.playElenaMartita(game);
    });
  }

  // ------------------------------------------------------------- chequeos

  check(game) {
    const flags = game.flags;
    const scene = game.scene;

    // La casa como base del roguelike no repite las cinemáticas de la historia.
    if (flags[FLAG.BASE]) return;

    this.checkPendingView(game);
    if (!this.ready(game)) return;

    // 1. Las cuatro aberturas cerradas: la casa queda sellada y se va Polsky.
    if (flags[FLAG.APAGON] && flags[FLAG.VIO_LA_NEVADA] && flags[FLAG.MARTITA_VENTANA]
      && !flags[FLAG.CASA_SELLADA] && closedCount(flags) >= 4) {
      flags[FLAG.CASA_SELLADA] = true;
      game.showToast?.('La casa quedó sellada.');
    }
    if (flags[FLAG.CASA_SELLADA] && !flags[FLAG.POLSKY_MUERTO] && !this.shown.polsky
      && (scene.name === 'house' || scene.name === 'attic')) {
      this.shown.polsky = true;
      this.run(game, () => this.playPolsky(game));
    }

    // 2. Esclusa del garaje: nafta + extractor + traje.
    if (flags[FLAG.ELECTROGENO_ON] && flags[FLAG.EXTRACTOR_OK] && flags[FLAG.TRAJE_FABRICADO]
      && !flags[FLAG.ESCLUSA_LISTA]) {
      flags[FLAG.ESCLUSA_LISTA] = true;
    }
    if (flags[FLAG.ESCLUSA_LISTA] && !this.shown.eclusa) {
      this.shown.eclusa = true;
      this.run(game, async () => {
        await this.playDialog(game, 'lucas_extractor', 'lucas');
        await this.playDialog(game, 'favalli_resuelto', 'favalli');
      });
    }

    // 3. Los dados: en el living, con la esclusa lista.
    if (flags[FLAG.ESCLUSA_LISTA] && !flags[FLAG.DADOS] && !this.shown.dados
      && scene?.name === 'house') {
      this.shown.dados = true;
      this.run(game, async () => {
        await this.playComic(game, COMICS.dados);
        game.flags[FLAG.DADOS] = true;
        game.showToast?.('Equipate: el traje y el rifle.');
      });
    }

    // 4. Equipado: traje y rifle puestos.
    if (flags[FLAG.ESCLUSA_LISTA] && flags[FLAG.DADOS] && game.hasSuit && game.hasRifle
      && !flags[FLAG.LISTO_PARA_SALIR]) {
      flags[FLAG.LISTO_PARA_SALIR] = true;
      game.showToast?.('Estás listo. Salí por el garaje.');
    }

    // 5. Mitad de la calle: salen los cascarudos y empieza la arena.
    if (scene?.name === 'street' && flags[FLAG.AFUERA] && !flags[FLAG.ARENA]
      && !this.shown.arena && scene.player && scene.player.x > STREET_ARENA_X) {
      this.shown.arena = true;
      this.run(game, async () => {
        await this.playCaption(game, CAPTIONS.streetMid);
        await this.playComic(game, COMICS.cascudos);
        game.startArena?.();
        game.flags[FLAG.ARENA] = true;
      });
    }

    // 6. Aviso una sola vez cuando ya están los seis materiales.
    if (flags[FLAG.IDEA_TRAJE] && !flags[FLAG.TRAJE_FABRICADO] && !this.shown.materials
      && currentObjective(game).id === 'craft') {
      this.shown.materials = true;
      game.showToast?.('Ya están los materiales. Armá el traje en el garaje.');
    }
  }

  checkPendingView(game) {
    if (!this.pendingView) return;
    const flags = game.flags;
    const scene = game.scene;
    if (!this.ready(game)) return;
    if (this.pendingView === 'window') {
      if (!flags[FLAG.APAGON]) { this.pendingView = null; return; }
      if (scene?.name !== 'attic' || flags[FLAG.VIO_LA_NEVADA] || this.shown.snow) return;
      this.pendingView = null;
      this.shown.snow = true;
      this.run(game, async () => {
        await this.playDialog(game, 'juan_no_abras', 'juan');
        await this.playDialog(game, 'lucas_porque', 'lucas');
        await this.playDialog(game, 'favalli_aire', 'favalli');
        await this.playDialog(game, 'favalli_radiactiva', 'favalli');
        game.flags[FLAG.VIO_LA_NEVADA] = true;
        game.showToast?.('Bajá a ver a Elena y Martita.');
      });
      return;
    }
    if (this.pendingView === 'window_living') {
      if (!flags[FLAG.CASA_SELLADA]) { this.pendingView = null; return; }
      if (scene?.name !== 'house' || flags[FLAG.RAMIREZ_MUERTO]) return;
      this.pendingView = null;
      this.run(game, async () => {
        await this.playComic(game, COMICS.ramirez);
        game.flags[FLAG.RAMIREZ_MUERTO] = true;
      });
    }
  }

  // ------------------------------------------------------------- escenas

  async startMartita(game) {
    await this.playCaption(game, CAPTIONS.martitaRoom);
    // Si ya la había cerrado antes, no hay carrera: Elena aparece igual.
    if (game.flags[FLAG.CLOSED_WINDOW_MARTITA]) {
      game.flags[FLAG.MARTITA_VENTANA] = 'ok';
      await this.playElenaMartita(game);
      return;
    }
    game.flags[FLAG.MARTITA_SPRINT] = true;
    game.scene?.startTimedBar?.('martita', 8, '¡Cerrá la ventana de Martita!');
  }

  async playElenaMartita(game) {
    if (this.shown.martitaDialog) return;
    this.shown.martitaDialog = true;
    await this.playDialog(game, 'elena_que_pasa', 'elena');
    await this.playDialog(game, 'juan_explicare', 'juan');
  }

  async playTruco(game) {
    await this.playComic(game, COMICS.truco);
    game.flags[FLAG.TRUCO_JUGADO] = true;
    await this.playComic(game, COMICS.choque);
    game.blackout?.();
    game.flags[FLAG.APAGON] = true;
  }

  async playPolsky(game) {
    await this.playComic(game, COMICS.polsky);
    const flags = game.flags;
    flags[FLAG.POLSKY_MUERTO] = true;
    flags[FLAG.POLSKY_LEFT] = true;
    flags[FLAG.CLOSED_HALL_DOOR] = true;
    game.scene?.applyStoryState?.();
  }

  // ------------------------------------------------------------- helpers

  ready(game) {
    const s = game.scene;
    return Boolean(s && s.name && s.player && !s.player.frozen
      && !game.transition && !game.equipAnim
      && !(s.dialog && s.dialog.open) && !(s.choice && s.choice.open)
      && !(s.comic && s.comic.open) && !(s.caption && s.caption.open)
      && typeof s.openDialog === 'function');
  }

  playDialog(game, name, id = null) {
    const base = DIALOGS[name];
    const scene = game.scene;
    if (!base || !scene || typeof scene.openDialog !== 'function') return Promise.resolve();
    return new Promise((resolve) => {
      const prev = base.onClose;
      scene.openDialog({
        ...base,
        onClose: () => {
          if (prev) prev();
          resolve();
        },
      }, id);
    });
  }

  async playCaption(game, text) {
    if (text && game.scene?.playCaption) await game.scene.playCaption(text);
  }

  async playComic(game, spec) {
    if (spec && game.scene?.playComic) await game.scene.playComic(spec);
  }
}

/** Crea la historia, la cuelga de game y deja el HUD leyendo los objetivos. */
export function initStory(game) {
  const story = new Story();
  game.story = story;
  game.objective = () => currentObjective(game);
  return story;
}

export default initStory;
