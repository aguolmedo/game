import { PauseMenu, ChestPanel } from '../menus.js';
import { TallerPanel } from '../taller.js';
import { addItem } from '../inventory.js';
import { getItem } from '../items.js';
import { FLAG } from '../data/flags.js';

const EQUIP_DUR = 0.5;

/**
 * Mediadores de menús: pausa, cofre, taller y el traje (equip). Cada uno
 * toma el overlay (game.overlay), congela la escena y la libera al cerrar.
 * deps: { game, scenes, menuScene, assets, mouseCursor, router }.
 */
export function createPanels({ game, scenes, menuScene, assets, mouseCursor, router }) {
  const pauseMenu = new PauseMenu(menuScene, assets, game);
  const chestPanel = new ChestPanel(menuScene, assets, game);
  const tallerPanel = new TallerPanel(menuScene, assets, game);

  function hideAll() {
    pauseMenu.hide();
    chestPanel.hide();
    tallerPanel.hide();
  }

  /** Congela la escena mientras hay un panel (HUD, cursor y jugador). */
  function freezeScene() {
    const sc = game.scene;
    sc.hideCursor();
    sc.hideHud();
    sc.freezePlayer(true);
  }

  function releaseScene() {
    const sc = game.scene;
    sc.showHud();
    sc.freezePlayer(false);
  }

  function openMenu(tab = 0) {
    const sc = game.scene;
    if (!sc || !sc.pausable || sc.blocksPause) return;
    if (game.overlay) return;
    sc.hideCursor();
    pauseMenu.tab = tab;
    pauseMenu.syncCursor();
    pauseMenu.show();
    game.setOverlay('pause');
    sc.hideHud();
    sc.freezePlayer(true);
  }

  function closeMenu() {
    pauseMenu.hide();
    game.clearOverlay('pause');
    releaseScene();
  }

  function openChest(container) {
    if (!container || !game.scene || game.overlay === 'transition') return;
    game.scene.hideCursor();
    chestPanel.show(container);
    game.setOverlay('chest');
    game.scene.hideHud();
    game.scene.freezePlayer(true);
  }

  function closeChest() {
    chestPanel.hide();
    game.clearOverlay('chest');
    releaseScene();
  }

  /** Abre el taller de una estacion (Favalli, Elena, Lucas o el electrogeno). */
  function openTaller(station = 'favalli') {
    if (!game.flags[FLAG.BASE] || game.overlay) return false;
    game.scene.hideCursor();
    game.scene.hideHud();
    game.scene.freezePlayer(true);
    mouseCursor.setState('arrow');
    game.setOverlay('taller');
    tallerPanel.show(station);
    return true;
  }

  function closeTaller() {
    tallerPanel.hide();
    game.clearOverlay('taller');
    releaseScene();
  }

  function requestEquip() {
    if (game.overlay === 'equip') return;
    if (!game.crafted) {
      game.showToast('Todavía no tenés el traje.');
      return;
    }
    if (game.overlay === 'transition' || game.sceneName === 'title') return;
    hideAll();
    game.setOverlay('equip', { t: 0, mid: false, on: !game.hasSuit, dur: EQUIP_DUR });
    game.scene.hideHud();
    game.scene.freezePlayer(true);
  }

  /** Aplica el traje (o su ausencia) a todos los jugadores de las escenas. */
  function applySuit() {
    for (const sc of Object.values(scenes)) {
      if (!sc.player) continue;
      sc.player.setSuit(game.hasSuit);
      if (sc.player.setRifle) sc.player.setRifle(game.hasSuit && game.hasRifle);
    }
  }

  function tickEquip(dt) {
    const anim = game.equipAnim;
    anim.t += dt;
    game.fade = anim.t < anim.dur ? anim.t / anim.dur : Math.max(0, 1 - (anim.t - anim.dur) / anim.dur);
    if (!anim.mid && anim.t >= anim.dur) {
      anim.mid = true;
      game.hasSuit = anim.on;
      applySuit();
      game.showToast(anim.on ? 'Te pusiste el traje' : 'Te sacaste el traje');
      if (!anim.on && game.sceneName === 'street') game.changeScene('death');
    }
    if (anim.t >= anim.dur * 2) {
      game.clearOverlay('equip');
      game.fade = 0;
      releaseScene();
      // M2: sacarse el traje en la calle pidió 'death' a mitad del animado;
      // el pedido quedó encolado y se ejecuta ahora.
      router.drainQueue();
    }
  }

  /** Un paso de panel según el overlay activo (pausa, cofre, taller). */
  function tickPanel(dt, state) {
    if (game.overlay === 'taller') {
      if (tallerPanel.update(dt, state) === 'close') closeTaller();
    } else if (game.overlay === 'chest') {
      chestPanel.update(dt, state);
      if (!chestPanel.visible) closeChest();
    } else if (game.overlay === 'pause') {
      const action = pauseMenu.update(dt, state);
      if (action === 'close') closeMenu();
      else if (action === 'title') {
        pauseMenu.hide();
        game.clearOverlay('pause');
        game.scene.freezePlayer(false);
        // M5: si hay una salida abierta, changeScene la cierra como abandono.
        game.changeScene('title');
      }
    }
  }

  function takeFromContainer(container, entry) {
    if (!container || !entry) return false;
    const id = typeof entry === 'string' ? entry : entry.id;
    const n = typeof entry === 'string' ? 1 : (entry.n || 1);
    const result = addItem(game.inventory, id, n);
    if (result.added <= 0) return false;
    game.inventory = result.slots;
    const index = container.items.indexOf(entry);
    if (index >= 0) container.items.splice(index, 1);
    game.showToast(`+${result.added} ${getItem(id).name}`, { group: 'pickup' });
    game.onInventoryChanged();
    game.emit('itemPicked', { id, count: result.added });
    return true;
  }

  function install() {
    game.openMenu = openMenu;
    game.openChest = openChest;
    game.openTaller = openTaller;
    game.requestEquip = requestEquip;
    game.takeFromContainer = takeFromContainer;
  }

  return {
    pauseMenu, chestPanel, tallerPanel, hideAll, openMenu, closeMenu, openChest, closeChest,
    openTaller, closeTaller, requestEquip, applySuit, tickEquip, tickPanel,
    takeFromContainer, install,
  };
}
