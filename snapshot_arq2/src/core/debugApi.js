import { createPava } from '../mate.js';
import { addItem, removeItem } from '../inventory.js';
import { RECIPES } from '../recipes.js';
import { viewport } from '../viewport.js';
import { FLAG } from '../data/flags.js';

const SUIT_RECIPE = RECIPES[0];

// La arena guarda su RunState en scene.state: su snapshot de depuración es debugSnapshot().
function sceneSnapshot(scene) {
  if (typeof scene?.debugSnapshot === 'function') return scene.debugSnapshot();
  return typeof scene?.state === 'function' ? scene.state() : null;
}

/** API chica para tests headless / capturas (window.__eternauta). */
export function installDebugApi({ game, scenes, panels, router, mouseCursor, renderer }) {
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
      menuOpen: panels.pauseMenu.visible,
      menuTab: panels.pauseMenu.tab,
      menuCursor: panels.pauseMenu.cursor.index,
      chestOpen: panels.chestPanel.visible,
      transition: game.overlay === 'transition' || game.overlay === 'equip',
      pendingScene: router.pending ? { ...router.pending } : null,
      isolated: Boolean(game.isolated),
      saveWarned: Boolean(game.saveWarned),
      fade: game.fade,
      flags: { ...game.flags },
      base: Boolean(game.flags[FLAG.BASE]),
      run: game.run ? { loop: game.run.loop, seed: game.run.seed } : null,
      taller: panels.tallerPanel.state(),
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
      arena: game.sceneName === 'arena' ? sceneSnapshot(game.scene) : null,
      sceneState: sceneSnapshot(game.scene),
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
    closeMenu: () => panels.closeMenu(),
    equipSuit: () => game.requestEquip(),
    setSuit: (on) => {
      game.hasSuit = Boolean(on);
      panels.applySuit();
    },
    setRifle: (on) => {
      game.hasRifle = Boolean(on);
      panels.applySuit();
    },
    blackout: () => game.blackout(),
    openView: (id, back = game.sceneName, spawn = null) => game.openView(id, back, spawn),
    startArena: (opts = {}) => game.startArena(opts),
    enterBase: (spawn) => game.enterBase(spawn),
    startRun: () => game.startRun(),
    endRun: (result) => game.endRun(result),
    openTaller: (station) => game.openTaller(station),
    closeTaller: () => panels.closeTaller(),
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
    closeChest: () => panels.closeChest(),
    go: (name, spawn) => router.jump(name, spawn),
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
