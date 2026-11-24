// Controles e interacción (DIRECCION.md, "Manos"): mouse + teclado o joystick.
// Se borraron E, Espacio, Enter, R, F y X como verbos del mundo; Entrar/Espacio
// solo confirman en menús y diálogos.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Input, deviceAfter, MOUSE_MOVE_THRESHOLD } from '../../src/input.js';
import { glyphName } from '../../src/glyphs.js';
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

function makePad({ axes = [0, 0], buttons = [] } = {}) {
  const all = Array.from({ length: 16 }, (_, i) => ({
    pressed: Boolean(buttons[i]), value: buttons[i] ? 1 : 0,
  }));
  return { connected: true, axes, buttons: all, mapping: 'standard' };
}

function withPad(pad, fn) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true, value: { getGamepads: () => [pad] },
  });
  try { return fn(); } finally {
    if (previous) Object.defineProperty(globalThis, 'navigator', previous);
  }
}

const RADIO = {
  id: 'radio', kind: 'object', type: 'device', name: 'la radio',
  cursorBox: { x: 0, y: 0, w: 16, h: 16 },
  ref: {
    id: 'radio', type: 'device', name: 'la radio',
    device: {
      toggle: 'radio_on', action: 'toggle',
      state: (g) => (g.flags?.radio_on ? 'on' : 'off'),
      states: { off: { verb: 'Prender' }, on: { verb: 'Apagar' } },
    },
  },
  foot: [{ tx: 2, ty: 5 }],
  access: ['2,6'],
};

const EMPTY_STATE = {
  device: 'mouse', move: { x: 0, y: 0 }, click: null, rightClick: null,
  a: false, b: false, start: false, y: false, hands: false,
  aPressed: false, padAPressed: false, bPressed: false, startPressed: false,
  yPressed: false, handsPressed: false,
  prevHotbar: false, nextHotbar: false, wheel: 0, slotPressed: -1,
};

function bareWorld(overrides = {}) {
  const world = makeWorldScene({
    t: 0,
    hud: { update() {} },
    surface: { update() {} },
    snow: null,
    footprints: null,
    light: { setMode() {}, update() {}, setCamera() {} },
    comic: { open: false },
    caption: { open: false },
    balloon: { open: false },
    dialog: { open: false, update() {} },
    choice: { open: false },
    cursor: { hide() {}, fadeOut() {}, showAt() {} },
    ghostCursor: { hide() {} },
    player: {
      x: 40, feet: 100, dir: 'up', update() {},
      sprite: { setDir() {} },
    },
    npcs: [],
    pickups: [],
    mapData: { warps: [], objects: [], cols: 20, rows: 20 },
    world: {},
    worldState: { items: [], moved: {} },
    cam: { x: 0, y: 0 },
    hintRects: [],
    target: RADIO,
    hoverTarget: null,
    hoverNear: false,
    selfHover: false,
    exitWarp: null,
    handsAim: null,
    handsAction: null,
    game: {
      flags: {}, inventory: [], selectedSlot: 0, pavaStation: null,
      lightingMode: 'electrica', input: { device: 'mouse' },
      mouseCursor: { setState() {} },
      showToast() {}, emit() {},
    },
    updatePava() {}, updateTimedBar() {}, handleHotbar() {},
    followCamera() {}, candidates() { return [RADIO]; },
    updateMouseTarget() {}, updateCursor() {},
    handsActionFor() { return { aim: null, action: null }; },
    carryData() { return null; },
    updateCarryMesh() {},
    updateGhost() {},
    clearGhost() {},
    drawHud() {},
    hudParams() { return {}; },
    pointerView() { return null; },
    lookCount: 0,
    handleLook(target) { this.lookCount += 1; this.lookedAt = target; },
    handed: [],
    runHands(action) { this.handed.push(action); },
    interacted: 0,
    interact() { this.interacted += 1; },
    ...overrides,
  });
  return world;
}

function run(world, state) {
  WorldScene.prototype.update.call(world, 0.016, { ...EMPTY_STATE, ...state });
}

test('teclado: E, Espacio y Enter no son Acción del mundo; Enter/Space confirman', () => {
  const target = makeTarget();
  const input = new Input(target);
  for (const code of ['KeyE', 'KeyF', 'KeyR']) {
    target.fire('keydown', { code });
    const s = input.poll();
    assert.equal(s.padAPressed, false, `${code} no actúa en el mundo`);
    assert.equal(s.aPressed, false, `${code} no confirma`);
    target.fire('keyup', { code });
  }
  for (const code of ['Enter', 'Space']) {
    target.fire('keydown', { code });
    const s = input.poll();
    assert.equal(s.aPressed, true, `${code} confirma menús/diálogos`);
    assert.equal(s.padAPressed, false, `${code} no es la Acción del mundo`);
    target.fire('keyup', { code });
    input.poll();
  }
});

test('teclado: Q no hace nada; I/Tab abren la mochila y 1-8 eligen ítem', () => {
  const target = makeTarget();
  const input = new Input(target);
  target.fire('keydown', { code: 'KeyQ' });
  assert.equal(input.poll().handsPressed, false, 'Q ya no mira');
  target.fire('keyup', { code: 'KeyQ' });
  input.poll();
  target.fire('keydown', { code: 'KeyI' });
  assert.equal(input.poll().yPressed, true);
  target.fire('keyup', { code: 'KeyI' });
  input.poll();
  target.fire('keydown', { code: 'Digit8' });
  assert.equal(input.poll().slotPressed, 7);
});

test('joystick: A=0, B=1, X=2 (Manos), Y=3, LB=4, RB=5 y Start=9', () => {
  const target = makeTarget();
  const input = new Input(target);
  const tap = (button, check) => withPad(makePad({ buttons: { [button]: true } }), () => {
    input.prev = { a: false, b: false, start: false, y: false, lb: false, rb: false, hands: false };
    check(input.poll());
  });
  tap(0, (s) => assert.equal(s.padAPressed, true));
  tap(1, (s) => assert.equal(s.bPressed, true));
  tap(2, (s) => assert.equal(s.handsPressed, true));
  tap(3, (s) => assert.equal(s.yPressed, true));
  tap(9, (s) => assert.equal(s.startPressed, true));
  // RT (7) ya no es Manos.
  tap(7, (s) => assert.equal(s.handsPressed, false));
  withPad(makePad({ buttons: { 4: true } }), () => {
    input.prev = { a: false, b: false, start: false, y: false, lb: false, rb: false, hands: false };
    assert.equal(input.poll().prevHotbar, true);
  });
});

test('glyphName: mouse/joystick, sin dispositivo teclado ni Mirar', () => {
  assert.equal(glyphName('pad', 'interact'), 'a');
  assert.equal(glyphName('pad', 'hands'), 'x');
  assert.equal(glyphName('pad', 'bag'), 'y');
  assert.equal(glyphName('mouse', 'interact'), 'mouse');
  assert.equal(glyphName('mouse', 'hands'), 'mouse_r');
  assert.equal(glyphName('mouse', 'bag'), 'key_i');
  // Mirar dejó de ser un botón.
  assert.equal(glyphName('pad', 'look'), null);
  assert.equal(glyphName('mouse', 'look'), null);
});

test('deviceAfter: umbral de 4 px; el teclado no cambia el modo', () => {
  assert.equal(MOUSE_MOVE_THRESHOLD, 4);
  assert.equal(deviceAfter('mouse', { mouse: true }), 'mouse');
  assert.equal(deviceAfter('mouse', { keyboard: true, mouseRecent: true }), 'mouse');
  assert.equal(deviceAfter('mouse', { keyboard: true, mouseRecent: false }), 'mouse');
  assert.equal(deviceAfter(undefined, { pad: true }), 'pad');
  assert.equal(deviceAfter('mouse', { pad: true, mouseRecent: true }), 'pad');
});

test('mundo: solo el A del pad ejecuta la Acción (Enter/Espacio no)', () => {
  const w1 = bareWorld();
  run(w1, { device: 'pad', padAPressed: true, aPressed: true });
  assert.equal(w1.interacted, 1);
  const w2 = bareWorld();
  run(w2, { device: 'mouse', aPressed: true, padAPressed: false });
  assert.equal(w2.interacted, 0);
});

test('mundo: B del pad y Q no miran; click derecho ejecuta Manos', () => {
  // En el mundo la B no hace nada (en menús y diálogos sigue siendo Volver,
  // y esas pantallas cortan antes de llegar acá).
  const b = bareWorld();
  run(b, { device: 'pad', bPressed: true });
  assert.equal(b.lookCount, 0);
  const q = bareWorld();
  run(q, { device: 'mouse' });
  assert.equal(q.lookCount, 0);
  const r = bareWorld();
  run(r, { device: 'mouse', handsPressed: true });
  assert.equal(r.handed.length, 1);
});

test('mundo: E/F/R/Q y RT no hacen nada en el update', () => {
  const world = bareWorld();
  run(world, {
    device: 'mouse', aPressed: false, padAPressed: false,
    handsPressed: false, click: null,
  });
  assert.equal(world.interacted, 0);
  assert.equal(world.handed.length, 0);
  assert.equal(world.lookCount, 0);
});

test('mundo: la Acción sin objetivo usa el ítem en la mano (joystick)', () => {
  const world = bareWorld({ target: null });
  const runAction = [];
  world.game.inventory = [{ id: 'mate_cebado', count: 1 }];
  world.runAction = (action) => runAction.push(action);
  WorldScene.prototype.interact.call(world, { device: 'pad' });
  assert.equal(runAction.length, 1);
  assert.equal(runAction[0].kind, 'self');
  assert.equal(runAction[0].label, 'Tomar mate');
});

test('mundo: cargando un mueble, la Acción apoya (o habla con una persona)', () => {
  const chair = { id: 'kchair_l', name: 'la silla', movable: true };
  const support = { kind: 'support', id: 'support', label: 'Apoyar la silla' };
  const world = bareWorld({
    target: null,
    game: {
      flags: {}, inventory: [], selectedSlot: 0, pavaStation: null,
      lightingMode: 'electrica', input: { device: 'pad' },
      mouseCursor: { setState() {} }, showToast() {}, emit() {},
      carry: { mapId: 'x', objectId: 'kchair_l', object: chair },
    },
  });
  world.carryData = () => world.game.carry;
  world.handsActionFor = () => ({ aim: null, action: support });
  WorldScene.prototype.interact.call(world, { device: 'pad' });
  assert.equal(world.handed.length, 1);
  assert.equal(world.handed[0].label, 'Apoyar la silla');
});

test('mundo: click izquierdo cargando un mueble apoya (Acción = Manos)', () => {
  const chair = { id: 'kchair_l', name: 'la silla', movable: true };
  const support = { kind: 'support', id: 'support', label: 'Apoyar la silla' };
  const world = bareWorld({
    hoverTarget: null,
    selfHover: false,
    handsAction: support,
    game: {
      flags: {}, inventory: [], selectedSlot: 0, pavaStation: null,
      lightingMode: 'electrica', input: { device: 'mouse' },
      mouseCursor: { setState() {} }, showToast() {}, emit() {},
      carry: { mapId: 'x', objectId: 'kchair_l', object: chair },
    },
  });
  world.carryData = () => world.game.carry;
  WorldScene.prototype.handleMouseClick.call(world, { device: 'mouse' });
  assert.equal(world.handed.length, 1);
  assert.equal(world.handed[0].label, 'Apoyar la silla');
});

test('mundo: click sobre Juan usa el ítem en uno mismo', () => {
  const world = bareWorld({ selfHover: true, hoverTarget: null });
  const ran = [];
  world.game.inventory = [{ id: 'mate_cebado', count: 1 }];
  world.ctx = () => ({
    game: world.game, objects: [], map: world.mapData, items: [],
    npcs: [], warps: [], player: world.player,
  });
  world.runAction = (action, target) => ran.push({ action, target });
  WorldScene.prototype.handleMouseClick.call(world, { device: 'mouse' });
  assert.equal(ran.length, 1);
  assert.equal(ran[0].action.kind, 'self');
  assert.equal(ran[0].action.id, 'mateSelf');
});
