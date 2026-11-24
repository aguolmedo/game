// Click derecho = Manos (DIRECCION.md, "Controles e interacción"). Ya no es
// Mirar: no hay botón de Mirar. Este test reemplaza al viejo "click derecho
// = Mirar": el comportamiento cambió a propósito.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Input } from '../../src/input.js';
import { makeWorldScene, WorldScene } from '../helpers/world_scene.js';

function makeTarget() {
  const listeners = {};
  return {
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
    fire(type, event = {}) {
      for (const fn of listeners[type] || []) {
        fn({ code: '', repeat: false, preventDefault() {}, ...event });
      }
    },
  };
}

test('input: el click derecho levanta Manos y no Mirar', () => {
  const target = makeTarget();
  const input = new Input(target);
  target.fire('mousedown', { button: 2, clientX: 60, clientY: 40 });
  const state = input.poll();
  assert.equal(state.handsPressed, true);
  assert.equal(state.click, null, 'no se mezcla con el click izquierdo');
});

test('mundo: el click derecho ejecuta Manos y nunca mira', () => {
  const world = makeWorldScene({
    t: 0,
    player: { x: 40, feet: 100, dir: 'up', update() {}, sprite: { setDir() {} } },
    hud: { update() {} }, surface: { update() {} }, snow: null, footprints: null,
    light: { setMode() {}, update() {}, setCamera() {} },
    comic: { open: false }, caption: { open: false }, balloon: { open: false },
    dialog: { open: false }, choice: { open: false },
    cursor: { hide() {}, fadeOut() {}, showAt() {} },
    ghostCursor: { hide() {} },
    npcs: [], pickups: [], cam: { x: 0, y: 0 }, hintRects: [],
    target: null, hoverTarget: null, hoverNear: false, selfHover: false,
    exitWarp: null, handsAim: null, handsAction: null,
    mapData: { warps: [], objects: [], cols: 20, rows: 20 },
    world: {}, worldState: { items: [], moved: {} },
    game: {
      flags: {}, inventory: [], selectedSlot: 0, pavaStation: null,
      lightingMode: 'electrica', input: { device: 'mouse' },
      mouseCursor: { setState() {} }, showToast() {}, emit() {},
    },
    updatePava() {}, updateTimedBar() {}, handleHotbar() {},
    followCamera() {}, candidates() { return []; },
    updateMouseTarget() {}, updateCursor() {}, drawHud() {},
    hudParams() { return {}; }, pointerView() { return null; },
    updateCarryMesh() {}, carryData() { return null; }, updateGhost() {},
    clearGhost() {},
    handsActionFor() {
      return { aim: null, action: { kind: 'grab', label: 'Agarrar Mate' } };
    },
    handed: [],
    runHands(action) { this.handed.push(action); },
    looks: 0,
    handleLook() { this.looks += 1; },
  });
  WorldScene.prototype.update.call(world, 0.016, {
    device: 'mouse', handsPressed: true,
    click: null, aPressed: false, padAPressed: false, bPressed: false,
    startPressed: false, yPressed: false,
    prevHotbar: false, nextHotbar: false, wheel: 0, slotPressed: -1,
    move: { x: 0, y: 0 },
  });
  assert.equal(world.handed.length, 1);
  assert.equal(world.handed[0].kind, 'grab');
  assert.equal(world.looks, 0, 'el click derecho no mira');
});
