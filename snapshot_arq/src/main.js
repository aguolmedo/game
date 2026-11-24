import * as THREE from 'three';
import { loadAssets } from './assets.js';
import { Input } from './input.js';
import { MouseCursor } from './mouseCursor.js';
import { LightPost } from './lightpost.js';
import { TitleScene } from './scenes/title.js';
import { AtticScene } from './scenes/attic.js';
import { HouseScene } from './scenes/house.js';
import { StreetScene } from './scenes/street.js';
import { DeathScene } from './scenes/death.js';
import { EndScene } from './scenes/end.js';
import { GarageScene } from './scenes/garage.js';
import { ViewScene } from './scenes/view.js';
import { ArenaScene } from './scenes/arena.js';
import { PrologueScene } from './scenes/prologue.js';
import { initStory } from './story.js';
import { createMate, createPava, pavaItemId } from './mate.js';
import { removeItem } from './inventory.js';
import { PauseMenu, ChestPanel } from './menus.js';
import { AM3, OUT } from './uiSkin.js';
import { TallerPanel } from './taller.js';
import {
  BASE_FLAGS, abandonResult, baseObjective, bagSummary, createSceneQueue,
  endRunComplains, endRunSave, runPersists, startRunSave,
} from './base.js';
import { loadSave, writeSave } from './run/save.js';
import { createInventory, addItem } from './inventory.js';
import { resetWorld } from './surfaces.js';
import { getItem } from './items.js';
import { RECIPES, missingFor } from './recipes.js';
import { currentObjective } from './objectives.js';
import { canvasOverlay, VIEW_W, VIEW_H } from './sprite.js';
import { drawText, measureText } from './font.js';
import { viewport, updateViewport, viewToWorld } from './viewport.js';

const W = VIEW_W;
const H = VIEW_H;
const SUIT_RECIPE = RECIPES[0];

async function boot() {
  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x06060e, 1);
  document.body.appendChild(renderer.domElement);

  const camera = new THREE.OrthographicCamera(0, W, 0, H, 0.1, 1000);
  camera.position.z = 100;
  const lightPost = new LightPost();
  const uiCamera = new THREE.OrthographicCamera(0, W, 0, H, 0.1, 1000);
  uiCamera.position.z = 100;

  // Zoom del mundo según la escena activa (T2). Las pantallas fijas usan 1x.
  let activeZoom = true;
  const resize = () => {
    updateViewport(window.innerWidth, window.innerHeight, activeZoom);
    const scale = viewport.scale;
    renderer.setSize(W * scale, H * scale, false);
    renderer.domElement.style.width = `${W * scale}px`;
    renderer.domElement.style.height = `${H * scale}px`;
  };
  window.addEventListener('resize', resize);
  resize();

  const assets = await loadAssets(import.meta.env.BASE_URL);
  const input = new Input();
  const mouseCursor = new MouseCursor(assets, renderer.domElement);

  const game = {
    W, H, assets, input, mouseCursor,
    inventory: createInventory(),
    hasSuit: false,
    hasRifle: false,
    crafted: false,
    selectedSlot: 0,
    lastTab: 0,
    flags: {},
    lightingMode: 'electrica',
    mate: createMate(),
    pava: createPava(),
    pavaStation: null,
    pavaCool: 0,
    mateCalma: 0,
    mateShared: {},
    story: null,
    // Estado de cosas por partida (§3): game.world[mapId] = { items, moved }.
    world: {},
    // Líneas de mirar ya dichas (primera vez que se usa un objeto): por partida.
    seenLook: {},
    carry: null,
    blackoutT: -1,
    clock: 0,
    scene: null,
    sceneName: '',
    runId: 0,
    fade: 0,
    transition: null,
    equipAnim: null,
    chestOpen: false,
    run: null,
    baseSave: null,
    baseBotin: null,
    isolated: false,
    saveWarned: false,
    pendingToasts: [],
    go: () => {},
    changeScene: () => {},
    newGame: () => {},
    requestEquip: () => {},
    showToast: () => {},
    openMenu: () => {},
    openChest: () => {},
    takeFromContainer: () => false,
    onInventoryChanged: () => {},
    objective: () => currentObjective({}),
    missingParts: () => [],
  };

  /** Client px -> coordenadas de la vista (480x270), o null fuera del canvas. */
  game.screenToView = (clientX, clientY) => {
    const rect = renderer.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const x = ((clientX - rect.left) / rect.width) * W;
    const y = ((clientY - rect.top) / rect.height) * H;
    if (x < 0 || y < 0 || x >= W || y >= H) return null;
    return { x, y };
  };

  /** Client px -> pixels del mundo (camara + zoom), para el mouse. */
  game.screenToWorld = (clientX, clientY) => {
    const v = game.screenToView(clientX, clientY);
    if (!v) return null;
    const cam = game.scene && game.scene.cam ? game.scene.cam : { x: 0, y: 0 };
    const world = viewToWorld(v, cam, viewport.zoom);
    return { x: world.x, y: world.y, vx: v.x, vy: v.y };
  };

  const scenes = {
    title: new TitleScene(game),
    attic: new AtticScene(game),
    house: new HouseScene(game),
    garage: new GarageScene(game),
    street: new StreetScene(game),
    view: new ViewScene(game, 'attic', { returnTo: 'attic' }),
    arena: new ArenaScene(game),
    prologue: new PrologueScene(game),
    death: new DeathScene(game),
    end: new EndScene(game),
  };

  initStory(game);
  // En la base el objetivo es del roguelike, no de la historia.
  game.objective = () => (
    game.flags && game.flags.base ? baseObjective(game.baseSave) : currentObjective(game)
  );

  const menuScene = new THREE.Scene();
  const pauseMenu = new PauseMenu(menuScene, assets, game);
  const chestPanel = new ChestPanel(menuScene, assets, game);
  const tallerPanel = new TallerPanel(menuScene, assets, game);
  const fadeUi = canvasOverlay(W, H, 90);
  menuScene.add(fadeUi.mesh);

  function setScene(name, spawn) {
    const next = scenes[name];
    if (!next) throw new Error(`Escena desconocida: ${name}`);
    // Si la historia saca a Juan del lugar cargando un mueble, lo apoya solo
    // en el casillero válido más cercano (o lo devuelve a su lugar) (§7).
    if (game.carry && game.scene && typeof game.scene.autoPlaceCarry === 'function') {
      game.scene.autoPlaceCarry();
    }
    pauseMenu.hide();
    chestPanel.hide();
    tallerPanel.hide();
    game.tallerOpen = false;
    game.chestOpen = false;
    game.scene = next;
    game.sceneName = name;
    activeZoom = next.worldZoom !== false;
    resize();
    mouseCursor.setState('arrow');
    if (next.enter) next.enter(spawn);
  }

  const sceneQueue = createSceneQueue();

  /** Arranca el fundido de salida hacia `name`. */
  function beginScene(name, spawn) {
    game.transition = { phase: 'out', t: 0, name, spawn };
  }

  /** Si quedó un pedido encolado (M6), arranca ahora que no hay transición. */
  function drainSceneQueue() {
    const next = sceneQueue.take();
    if (next) beginScene(next.name, next.spawn);
  }

  /** Lo que deja la salida al abandonarla: bolsa, ronda y puntos de la arena. */
  const abandonFromArena = () => {
    const sc = game.scene;
    return {
      bag: sc && sc.bag ? { ...sc.bag } : null,
      round: Number(sc && sc.round) || 0,
      points: Number(sc && sc.points && sc.points.score) || 0,
    };
  };

  game.changeScene = (name, spawn) => {
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
    const start = sceneQueue.request(name, spawn, Boolean(game.transition || game.equipAnim));
    if (!start) return false;
    beginScene(start.name, start.spawn);
    return true;
  };

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
    game.tallerOpen = false;
    tallerPanel.hide();
    resetWorld(game);
    game.clock = 0;
    game.runId += 1;
    game.transition = null;
    game.equipAnim = null;
    sceneQueue.clear();
    game.chestOpen = false;
    game.fade = 0;
    for (const scene of Object.values(scenes)) {
      if (scene.reset) scene.reset();
    }
  };

  /** Evento de historia (H5). Si no hay historia cargada, no hace nada. */
  game.emit = (type, data = {}) => {
    if (game.story && game.story.handle) game.story.handle(type, data, game);
  };

  game.setLighting = (mode) => {
    game.lightingMode = mode === 'apagon' ? 'apagon' : 'electrica';
  };

  /** Apagón: dos parpadeos y el modo `apagon` para el resto de la demo. */
  game.blackout = () => {
    game.flags.apagon = true;
    if (game.lightingMode === 'apagon' && game.blackoutT < 0) return;
    game.blackoutT = 0;
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
    game.flags.base = false;
    game.flags.arena = true;
    game.changeScene('arena');
  };

  /** Estado comun de la casa-base: traje puesto, rifle y las flags del final. */
  const applyBaseState = (save) => {
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
  };

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

  /** Abre el taller de una estacion (Favalli, Elena, Lucas o el electrogeno). */
  game.openTaller = (station = 'favalli') => {
    if (!game.flags.base || game.transition || game.equipAnim) return false;
    if (pauseMenu.visible || chestPanel.visible) return false;
    game.scene?.cursor?.hide?.();
    game.scene?.hud?.hide();
    game.scene?.player?.setFrozen(true);
    mouseCursor.setState('arrow');
    game.tallerOpen = true;
    tallerPanel.show(station);
    return true;
  };

  /** El porton de la base: sube el loop y arranca la salida. */
  game.startRun = () => {
    if (game.transition || game.equipAnim) return false;
    const started = startRunSave(game.baseSave || loadSave());
    game.persist(started.save);
    game.isolated = false;
    game.run = started.run;
    game.flags.base = false;
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
    if (hud && !game.transition && !game.equipAnim) game.showToast(text);
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
      game.scene?.restart?.();
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

  /** La pava se enfría; la calma del mate dura 120 s (bonus en la arena). */
  game.updateMate = (dt) => {
    game.clock += dt;
    game.mateCalma = Math.max(0, game.mateCalma - dt);
    game.pavaCool = Math.max(0, game.pavaCool - dt);
    if (game.pavaCool === 0 && game.pavaCoolWas > 0) {
      const result = removeItem(game.inventory, 'pava_caliente', 1);
      if (result.removed > 0) {
        game.inventory = addItem(result.slots, 'pava_fria', 1).slots;
        game.showToast('La pava se enfrió.');
      }
    }
    game.pavaCoolWas = game.pavaCool;
    if (game.story && game.story.update) game.story.update(dt, game);
  };

  /** Id de item de la pava según su temperatura (helper de guion). */
  game.pavaItem = () => pavaItemId(game.pava.temp);

  game.showToast = (text, opts = {}) => {
    const hud = game.scene && game.scene.hud;
    if (hud) hud.toast(text, opts);
  };

  game.missingParts = () => missingFor(game.inventory, SUIT_RECIPE);

  game.onInventoryChanged = () => {
    if (game.inventory.some((slot) => slot && slot.id === 'traje')) game.crafted = true;
  };

  game.requestEquip = () => {
    if (game.equipAnim) return;
    if (!game.crafted) {
      game.showToast('Todavía no tenés el traje.');
      return;
    }
    if (game.transition || game.sceneName === 'title') return;
    pauseMenu.hide();
    chestPanel.hide();
    game.chestOpen = false;
    game.scene.hud?.hide();
    game.scene.player?.setFrozen(true);
    game.equipAnim = { t: 0, mid: false, on: !game.hasSuit, dur: 0.5 };
  };

  game.openMenu = (tab = 0) => {
    if (!game.scene || !game.scene.pausable || game.scene.blocksPause) return;
    if (game.transition || game.equipAnim) return;
    if (chestPanel.visible) return;
    game.scene.cursor?.hide?.();
    pauseMenu.tab = tab;
    pauseMenu.syncCursor();
    pauseMenu.show();
    game.scene.hud?.hide();
    game.scene.player?.setFrozen(true);
  };

  game.openChest = (container) => {
    if (!container || !game.scene || game.transition) return;
    game.scene.cursor?.hide?.();
    chestPanel.show(container);
    game.chestOpen = true;
    game.scene.hud?.hide();
    game.scene.player?.setFrozen(true);
  };

  game.takeFromContainer = (container, entry) => {
    if (!container || !entry) return false;
    const id = typeof entry === 'string' ? entry : entry.id;
    const n = typeof entry === 'string' ? 1 : (entry.n || 1);
    const result = addItem(game.inventory, id, n);
    if (result.added <= 0) return false;
    game.inventory = result.slots;
    const index = container.items.indexOf(entry);
    if (index >= 0) container.items.splice(index, 1);
    const item = getItem(id);
    game.showToast(`+${result.added} ${item.name}`, { group: 'pickup' });
    game.onInventoryChanged();
    game.emit('itemPicked', { id, count: result.added });
    return true;
  };

  game.go = (name) => game.changeScene(name);

  setScene('title');

  let last = performance.now();
  // La capa de fade sólo se sube cuando tiene contenido (ver bloque del fade).
  let fadeDrawn = false;

  function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    const state = input.poll();
    const scene = game.scene;

    // Relojes de la demo: mate, pava y guion.
    game.updateMate(dt);

    // Apagón: dos parpadeos y después el modo `apagon` (§8).
    if (game.blackoutT >= 0) {
      game.blackoutT += dt;
      if (game.blackoutT >= 0.92) {
        game.blackoutT = -1;
        game.setLighting('apagon');
        scene.setLightState?.('candle', true);
        scene.setLightState?.('velador', false);
        scene.applyStoryState?.();
        game.showToast('Se cortó la luz.');
      }
    }

    // Fundidos y cambio de escena (0.3 s).
    if (game.transition) {
      const tr = game.transition;
      tr.t += dt;
      if (tr.phase === 'out') {
        game.fade = Math.min(1, tr.t / 0.3);
        if (tr.t >= 0.3) {
          setScene(tr.name, tr.spawn);
          tr.phase = 'in';
          tr.t = 0;
          game.fade = 1;
        }
      } else {
        game.fade = Math.max(0, 1 - tr.t / 0.3);
        if (tr.t >= 0.3) {
          game.transition = null;
          game.fade = 0;
          drainSceneQueue();
        }
      }
    } else if (game.equipAnim) {
      const anim = game.equipAnim;
      anim.t += dt;
      game.fade = anim.t < anim.dur ? anim.t / anim.dur : Math.max(0, 1 - (anim.t - anim.dur) / anim.dur);
      if (!anim.mid && anim.t >= anim.dur) {
        anim.mid = true;
        game.hasSuit = anim.on;
        for (const sc of Object.values(scenes)) {
          if (!sc.player) continue;
          sc.player.setSuit(game.hasSuit);
          sc.player.setRifle?.(game.hasSuit && game.hasRifle);
        }
        game.showToast(anim.on ? 'Te pusiste el traje' : 'Te sacaste el traje');
        if (!anim.on && game.sceneName === 'street') {
          game.changeScene('death');
        }
      }
      if (anim.t >= anim.dur * 2) {
        game.equipAnim = null;
        game.fade = 0;
        game.scene.player?.setFrozen(false);
        game.scene.hud?.show();
        // M2: sacarse el traje en la calle pidió 'death' a mitad del animado;
        // el pedido quedó encolado y se ejecuta ahora.
        drainSceneQueue();
      }
    } else if (tallerPanel.visible) {
      // El taller abierto congela el mundo igual que el cofre o la pausa.
      const action = tallerPanel.update(dt, state);
      if (action === 'close') {
        game.tallerOpen = false;
        scene.hud?.show();
        scene.player?.setFrozen(false);
      }
    } else if (chestPanel.visible) {
      chestPanel.update(dt, state);
      if (!chestPanel.visible) {
        game.chestOpen = false;
        scene.hud?.show();
        scene.player?.setFrozen(false);
      }
    } else if (pauseMenu.visible) {
      const action = pauseMenu.update(dt, state);
      if (action === 'close') {
        pauseMenu.hide();
        scene.hud?.show();
        scene.player?.setFrozen(false);
      } else if (action === 'title') {
        pauseMenu.hide();
        game.scene.player?.setFrozen(false);
        // M5: si hay una salida abierta, changeScene la cierra como abandono.
        game.changeScene('title');
      }
    } else if (state.startPressed && scene.pausable && !scene.blocksPause) {
      game.openMenu(game.lastTab || 0);
    } else {
      scene.update(dt, state);
    }

    // Avisos que esperan a que termine el cambio de escena (volver a la base).
    if (game.pendingToasts.length && !game.transition && !game.equipAnim
      && game.sceneName !== 'arena' && game.scene) {
      for (const text of game.pendingToasts) game.showToast(text);
      game.pendingToasts = [];
    }

    // La transición o el equipado pudieron cambiar de escena en este mismo
    // frame (M6): se relee para no dibujar la cámara de la escena vieja.
    const liveScene = game.scene;

    // En el combate solo manda la mira: el guante vuelve en menús y resultados.
    // En el mundo, al jugar con teclado/joystick se oculta el puntero.
    const hideGlove = (!pauseMenu.visible && !chestPanel.visible && !tallerPanel.visible
      && !liveScene.blocksPause)
      && (game.sceneName === 'arena'
        || (liveScene.worldZoom && state.device !== 'mouse'));
    if (mouseCursor.hidden !== hideGlove) mouseCursor.setHidden(hideGlove);

    // Camara del mundo. En el apagón (PI-1) la escena pasa por el shader de
    // luz; el HUD va después en uiScene, así que nunca se oscurece.
    liveScene.applyCamera(camera);
    const apagon = typeof liveScene.apagonParams === 'function' ? liveScene.apagonParams() : null;
    if (apagon) lightPost.render(renderer, liveScene.scene, camera, apagon);
    else renderer.render(liveScene.scene, camera);

    // Capa de UI de la escena, fija en pantalla (coordenadas de vista).
    if (liveScene.uiScene) {
      renderer.autoClear = false;
      renderer.clearDepth();
      renderer.render(liveScene.uiScene, uiCamera);
    }

    // Capa de UI/menus fija en pantalla. Si no hay nada que dibujar no se
    // limpia ni se sube la textura (una subida 480x270 por frame no es gratis).
    const needsFade = game.fade > 0 || game.blackoutT >= 0 || Boolean(game.equipAnim);
    if (needsFade) {
      fadeUi.clear();
      if (game.fade > 0) {
        fadeUi.ctx.fillStyle = `rgba(4, 4, 10, ${Math.min(1, game.fade)})`;
        fadeUi.ctx.fillRect(0, 0, W, H);
      }
      if (game.blackoutT >= 0) {
        const t = game.blackoutT;
        const flash = (t >= 0.28 && t < 0.44) || (t >= 0.58 && t < 0.74);
        fadeUi.ctx.fillStyle = `rgba(2, 3, 8, ${flash ? 0.82 : 0.18})`;
        fadeUi.ctx.fillRect(0, 0, W, H);
      }
      if (game.equipAnim) {
        const ctx = fadeUi.ctx;
        const glyphs = assets.font.glyphs;
        const f = assets.itemsData.frames.traje;
        const box = Array.isArray(f) ? { x: f[0], y: f[1], w: f[2], h: f[3] } : f;
        if (box) {
          ctx.drawImage(assets.items.image, box.x, box.y, box.w, box.h,
            W / 2 - 16, H / 2 - 30, 32, 32);
        }
        const label = game.equipAnim.on ? 'Poniéndose el traje' : 'Sacándose el traje';
        const tw = measureText(glyphs, label);
        drawText(ctx, glyphs, Math.round((W - tw) / 2), H / 2 + 10, label, AM3,
          { outline: OUT });
      }
      fadeUi.commit();
      fadeDrawn = true;
    } else if (fadeDrawn) {
      // Se borra una sola vez para que no quede pegado el último contenido.
      fadeUi.clear();
      fadeUi.commit();
      fadeDrawn = false;
    }
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(menuScene, uiCamera);
    renderer.autoClear = true;
  }
  requestAnimationFrame(tick);

  // API chica para tests headless / capturas.
  window.__eternauta = {
    game,
    scenes,
    viewport,
    /** Hook de depuración: contadores de three del último frame renderizado. */
    rendererInfo: () => ({
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
      programs: renderer.info.programs ? renderer.info.programs.length : 0,
    }),
    state: () => ({
      scene: game.sceneName,
      hasSuit: game.hasSuit,
      crafted: game.crafted,
      selectedSlot: game.selectedSlot,
      inventory: game.inventory.map((slot) => (slot ? { ...slot } : null)),
      objective: game.objective(),
      player: game.scene.player ? { x: game.scene.player.x, feet: game.scene.player.feet, dir: game.scene.player.dir } : null,
      device: game.input.device,
      pointer: game.input.pointer ? { ...game.input.pointer } : null,
      cursor: mouseCursor.state,
      cursorVisible: mouseCursor.visible,
      dialogOpen: Boolean(game.scene.dialog && game.scene.dialog.open),
      choiceOpen: Boolean(game.scene.choice && game.scene.choice.open),
      menuOpen: pauseMenu.visible,
      menuTab: pauseMenu.tab,
      menuCursor: pauseMenu.cursor.index,
      chestOpen: chestPanel.visible,
      transition: Boolean(game.transition || game.equipAnim),
      pendingScene: sceneQueue.pending ? { ...sceneQueue.pending } : null,
      isolated: Boolean(game.isolated),
      saveWarned: Boolean(game.saveWarned),
      fade: game.fade,
      flags: { ...game.flags },
      base: Boolean(game.flags.base),
      run: game.run ? { loop: game.run.loop, seed: game.run.seed } : null,
      taller: tallerPanel.state(),
      baseBotin: game.baseBotin ? { ...game.baseBotin } : null,
      carry: game.carry
        ? { mapId: game.carry.mapId, objectId: game.carry.objectId,
          name: game.carry.object?.name || null }
        : null,
      world: Object.fromEntries(Object.entries(game.world).map(([id, st]) => [id, {
        items: (st.items || []).map((wi) => ({
          uid: wi.uid, itemId: wi.itemId, count: wi.count || 1,
          place: wi.place ? { ...wi.place } : null,
        })),
        moved: { ...(st.moved || {}) },
      }])),
      lighting: game.lightingMode,
      mate: { ...game.mate },
      pava: { ...game.pava },
      mateShared: { ...game.mateShared },
      mateCalma: game.mateCalma,
      arena: game.sceneName === 'arena' && game.scene?.state ? game.scene.state() : null,
      sceneState: game.scene?.state ? game.scene.state() : null,
    }),
    addItem: (id, n = 1) => {
      const result = addItem(game.inventory, id, n);
      game.inventory = result.slots;
      game.onInventoryChanged();
      return result.added;
    },
    giveCraftingParts: () => {
      for (const need of SUIT_RECIPE.needs) {
        const result = addItem(game.inventory, need.id, need.n);
        game.inventory = result.slots;
      }
      game.onInventoryChanged();
    },
    teleport: (x, feet, dir) => {
      const p = game.scene.player;
      if (p) {
        p.place(x, feet, dir || p.dir);
        game.scene.cam = game.scene.world.cameraFor(x, feet);
      }
    },
    openMenu: (tab = 0) => game.openMenu(tab),
    closeMenu: () => {
      pauseMenu.hide();
      game.scene.hud?.show();
      game.scene.player?.setFrozen(false);
    },
    equipSuit: () => game.requestEquip(),
    setSuit: (on) => {
      game.hasSuit = Boolean(on);
      for (const sc of Object.values(scenes)) {
        if (!sc.player) continue;
        sc.player.setSuit(game.hasSuit);
        sc.player.setRifle?.(game.hasSuit && game.hasRifle);
      }
    },
    setRifle: (on) => {
      game.hasRifle = Boolean(on);
      for (const sc of Object.values(scenes)) {
        sc.player?.setRifle?.(game.hasSuit && game.hasRifle);
      }
    },
    blackout: () => game.blackout(),
    openView: (id, back = game.sceneName, spawn = null) => game.openView(id, back, spawn),
    startArena: (opts = {}) => game.startArena(opts),
    enterBase: (spawn) => game.enterBase(spawn),
    startRun: () => game.startRun(),
    endRun: (result) => game.endRun(result),
    openTaller: (station) => game.openTaller(station),
    closeTaller: () => {
      tallerPanel.hide();
      game.tallerOpen = false;
      game.scene?.hud?.show();
      game.scene?.player?.setFrozen(false);
    },
    emit: (type, data) => game.emit(type, data),
    setMate: (state) => { game.mate = { ...game.mate, ...state }; },
    setPava: (state) => { game.pava = { ...game.pava, ...state }; },
    placePava: (station = 'workbench') => {
      game.pava = createPava();
      game.pava.heating = true;
      game.pava.station = station;
      game.pavaStation = station;
    },
    give: (id, n = 1) => {
      const result = addItem(game.inventory, id, n);
      game.inventory = result.slots;
      game.onInventoryChanged();
      return result.added;
    },
    remove: (id, n = 1) => {
      const result = removeItem(game.inventory, id, n);
      game.inventory = result.slots;
      return result.removed;
    },
    setCrafted: (on = true) => { game.crafted = Boolean(on); },
    openChest: (id) => {
      const obj = game.scene.mapData.objects.find((o) => o.id === id);
      if (obj && obj.container) game.openChest(obj.container);
    },
    closeChest: () => {
      chestPanel.hide();
      game.chestOpen = false;
      game.scene.hud?.show();
      game.scene.player?.setFrozen(false);
    },
    go: (name, spawn) => {
      setScene(name, spawn);
      game.fade = 0;
      game.transition = null;
      sceneQueue.clear();
      if (name !== 'arena') game.isolated = false;
    },
    changeScene: (name, spawn) => game.changeScene(name, spawn),
    startDialog: (id) => {
      const sc = game.scene;
      const target = sc.candidates().find((c) => c.kind === 'npc' && c.id === id);
      if (!target) return false;
      sc.target = target;
      sc.interact();
      return true;
    },
    toast: (text) => game.showToast(text),
    setFlags: (flags) => { game.flags = { ...game.flags, ...flags }; },
    /** Manos sin mouse: resuelve y ejecuta la acción apuntada. */
    hands: () => {
      const sc = game.scene;
      if (!sc || typeof sc.handsActionFor !== 'function') return false;
      const { action } = sc.handsActionFor({ device: 'pad' });
      sc.runHands(action, { device: 'pad' });
      return Boolean(action);
    },
    /** Hacer sin mouse (A del pad / click sobre el objetivo). */
    action: () => {
      const sc = game.scene;
      if (!sc) return false;
      sc.interact({ device: 'pad' });
      return true;
    },
    /** Deja un ítem en el piso con Manos desde la API (pruebas headless). */
    dropAt: (slot, tx, ty) => {
      const sc = game.scene;
      if (!sc) return false;
      const result = sc.surface.dropOnFloor(game.inventory, slot, tx, ty);
      if (!result) return false;
      game.inventory = result.inventory;
      sc.invalidateReach();
      return true;
    },
  };
}

boot().catch((err) => {
  console.error(err);
  const box = document.getElementById('error');
  if (box) {
    box.style.display = 'flex';
    box.textContent = `No se pudo iniciar el juego.\n${err.message}\n\n¿Corriste "python3 tools/export_assets.py"?`;
  }
});
