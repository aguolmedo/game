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
import { createMate, createPava } from './mate.js';
import { baseObjective } from './base.js';
import { createInventory } from './inventory.js';
import { missingFor, RECIPES } from './recipes.js';
import { currentObjective } from './objectives.js';
import { VIEW_W, VIEW_H } from './sprite.js';
import { viewport, updateViewport, viewToWorld } from './viewport.js';
import { ensureSceneContract } from './core/scene.js';
import { installOverlay } from './core/overlay.js';
import { createRouter } from './core/router.js';
import { createPanels } from './core/panels.js';
import { installClocks, tickBlackout } from './core/clocks.js';
import { installRunFlow } from './core/runflow.js';
import { createFadeLayer } from './core/fadeLayer.js';
import { installDebugApi } from './core/debugApi.js';
import { FLAG, guardFlags } from './data/flags.js';
import { STEP, stepAccumulator, createInputGate } from './core/loop.js';

const W = VIEW_W;
const H = VIEW_H;
const SUIT_RECIPE = RECIPES[0];
const PANEL_OVERLAYS = ['pause', 'chest', 'taller'];

function createRenderer() {
  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x06060e, 1);
  document.body.appendChild(renderer.domElement);
  return renderer;
}

function orthoCamera() {
  const cam = new THREE.OrthographicCamera(0, W, 0, H, 0.1, 1000);
  cam.position.z = 100;
  return cam;
}

function createGame(assets, input, mouseCursor) {
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
    run: null,
    baseSave: null,
    baseBotin: null,
    isolated: false,
    saveWarned: false,
    pendingToasts: [],
    go: () => {},
    changeScene: () => {},
    showToast: () => {},
    onInventoryChanged: () => {},
    objective: () => currentObjective({}),
    missingParts: () => [],
  };

  // Banderas de historia: toda asignación (game.flags = {...}) queda envuelta en
  // guardFlags, que avisa en dev si se usa una clave no declarada en FLAG.
  let flagsObj = guardFlags({});
  Object.defineProperty(game, 'flags', {
    enumerable: true,
    get: () => flagsObj,
    set: (value) => { flagsObj = guardFlags(value || {}); },
  });
  // transition / equipAnim / chestOpen / tallerOpen son derivados de game.overlay.
  return installOverlay(game);
}

function installScreenMapping(game, renderer) {
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
}

function createScenes(game) {
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
  for (const scene of Object.values(scenes)) ensureSceneContract(scene);
  return scenes;
}

/** Dibujado estándar de una escena: mundo (con luz del apagón) y su capa de UI. */
function renderScene(scene, ctx) {
  const { renderer, camera, uiCamera, lightPost } = ctx;
  scene.applyCamera(camera);
  const apagon = typeof scene.apagonParams === 'function' ? scene.apagonParams() : null;
  if (apagon) lightPost.render(renderer, scene.scene, camera, apagon);
  else renderer.render(scene.scene, camera);
  // Capa de UI de la escena, fija en pantalla (coordenadas de vista).
  if (scene.uiScene) {
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(scene.uiScene, uiCamera);
  }
}

async function boot() {
  const renderer = createRenderer();
  const camera = orthoCamera();
  const uiCamera = orthoCamera();
  const lightPost = new LightPost();

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
  const game = createGame(assets, input, mouseCursor);
  installScreenMapping(game, renderer);
  const scenes = createScenes(game);

  initStory(game);
  // En la base el objetivo es del roguelike, no de la historia.
  game.objective = () => (
    game.flags && game.flags[FLAG.BASE] ? baseObjective(game.baseSave) : currentObjective(game)
  );

  const menuScene = new THREE.Scene();
  // El router y los paneles se necesitan entre sí: se enlazan por cierre.
  let panels = null;
  const router = createRouter({
    game, scenes, mouseCursor,
    hidePanels: () => panels.hideAll(),
    setZoom: (zoom) => { activeZoom = zoom; resize(); },
  });
  panels = createPanels({ game, scenes, menuScene, assets, mouseCursor, router });
  const fadeLayer = createFadeLayer(menuScene, game, assets, W, H);

  game.changeScene = router.changeScene;
  game.go = (name) => game.changeScene(name);
  panels.install();
  installClocks(game);
  installRunFlow({ game, scenes, router, panels });

  game.showToast = (text, opts = {}) => {
    const hud = game.scene && game.scene.hud;
    if (hud) hud.toast(text, opts);
  };
  game.missingParts = () => missingFor(game.inventory, SUIT_RECIPE);
  game.onInventoryChanged = () => {
    if (game.inventory.some((slot) => slot && slot.id === 'traje')) game.crafted = true;
  };

  router.setScene('title');

  /** Un paso fijo de lógica: relojes, fundidos, paneles o la escena activa. */
  function stepLogic(dt, state) {
    game.updateMate(dt);
    tickBlackout(game, dt);
    const scene = game.scene;
    if (game.overlay === 'transition') router.tickTransition(dt);
    else if (game.overlay === 'equip') panels.tickEquip(dt);
    else if (PANEL_OVERLAYS.includes(game.overlay)) panels.tickPanel(dt, state);
    else if (state.startPressed && scene.pausable && !scene.blocksPause) game.openMenu(game.lastTab || 0);
    else scene.update(dt, state);
  }

  /** Avisos que esperan a que termine el cambio de escena (volver a la base). */
  function flushToasts() {
    const busy = game.overlay === 'transition' || game.overlay === 'equip';
    if (!game.pendingToasts.length || busy || game.sceneName === 'arena' || !game.scene) return;
    for (const text of game.pendingToasts) game.showToast(text);
    game.pendingToasts = [];
  }

  function renderFrame(state) {
    // La transición o el equipado pudieron cambiar de escena en este mismo
    // frame (M6): se relee para no dibujar la cámara de la escena vieja.
    const liveScene = game.scene;
    // En el combate solo manda la mira: el guante vuelve en menús y resultados.
    // En el mundo, al jugar con teclado/joystick se oculta el puntero.
    const hideGlove = !PANEL_OVERLAYS.includes(game.overlay) && !liveScene.blocksPause
      && (game.sceneName === 'arena' || (liveScene.worldZoom && state.device !== 'mouse'));
    if (mouseCursor.hidden !== hideGlove) mouseCursor.setHidden(hideGlove);

    const ctx = { renderer, camera, uiCamera, lightPost };
    if (typeof liveScene.render === 'function') liveScene.render(ctx);
    else renderScene(liveScene, ctx);

    fadeLayer.update();
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(menuScene, uiCamera);
    renderer.autoClear = true;
  }

  let last = performance.now();
  let acc = 0;
  const gate = createInputGate();
  function tick(now) {
    requestAnimationFrame(tick);
    const frameDt = Math.max(0, (now - last) / 1000);
    last = now;
    const state = input.poll();
    const stepped = stepAccumulator(acc, frameDt);
    acc = stepped.acc;
    for (const stepInput of gate.take(state, stepped.steps)) stepLogic(STEP, stepInput);
    flushToasts();
    renderFrame(state);
  }
  requestAnimationFrame(tick);

  installDebugApi({ game, scenes, panels, router, mouseCursor, renderer });
}

boot().catch((err) => {
  console.error(err);
  const box = document.getElementById('error');
  if (box) {
    box.style.display = 'flex';
    box.textContent = `No se pudo iniciar el juego.\n${err.message}\n\n¿Corriste "python3 tools/export_assets.py"?`;
  }
});
