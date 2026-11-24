import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Input, deviceAfter, MOUSE_MOVE_THRESHOLD } from '../../src/input.js';
import { glyphName, ACTIONS, drawPrompt } from '../../src/glyphs.js';
import { makeWorldScene, WorldScene } from '../helpers/world_scene.js';
import { CONTROLS_ROWS, controlsTexts } from '../../src/menus.js';
import { FAR_RGB, FAR_ALPHA, FAR_FRAME_ALPHA } from '../../src/cursor.js';
import { attic } from '../../src/maps/attic.js';
import { garage } from '../../src/maps/garage.js';
import { house } from '../../src/maps/house.js';
import { street } from '../../src/maps/street.js';
import { ITEM_USES, SELF_USES } from '../../src/data/actions.js';
import { resolveAction, resolveHands } from '../../src/actions.js';
import { itemsForMap, resetWorld } from '../../src/surfaces.js';
import { INITIAL_ITEMS } from '../../src/data/surfaces.js';
import { getItem, isGrabbable } from '../../src/items.js';
import { DialogBox } from '../../src/dialog.js';
import { createMate, putYerba, cebar, sip, isLavado } from '../../src/mate.js';

// --- controls.test.js
{
// Controles e interacción (DIRECCION.md, "Manos"): mouse + teclado o joystick.
// Se borraron E, Espacio, Enter, R, F y X como verbos del mundo; Entrar/Espacio
// solo confirman en menús y diálogos.

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
}

// --- controls_fixes.test.js
{
// Retoques de controles: dos botones (Hacer y Manos), glifos del mouse que se
// distinguen, textos del cartel que existen en la fuente y cursor lejos legible.

const FONT = JSON.parse(fs.readFileSync(
  new URL('../../public/assets/font.json', import.meta.url), 'utf8'));
const GLYPHS = FONT.glyphs;

const MOUSE = [78, 24, 11, 13];
const MOUSE_R = [91, 24, 11, 13];

/** Contexto falso que anota qué frame de botones se dibujó. */
function fakeCtx() {
  const drawn = [];
  return {
    drawn,
    fillStyle: '',
    fillRect() {},
    drawImage(image, sx, sy, w, h, dx, dy, dw, dh) {
      drawn.push({ sx, w, dx, dy, dw, dh });
    },
  };
}

const KEY_I = [104, 24, 9, 9];

const ASSETS = {
  font: { glyphs: GLYPHS },
  buttons: { image: {} },
  buttonsData: { frames: { mouse: MOUSE, mouse_r: MOUSE_R, key_i: KEY_I } },
};

test('barra de acciones: Manos con mouse dibuja mouse_r (click derecho)', () => {
  assert.equal(glyphName('mouse', 'hands'), 'mouse_r');
  assert.equal(glyphName('mouse', 'interact'), 'mouse');
  assert.equal(glyphName('mouse', 'look'), null, 'Mirar ya no es un botón');
  const ctx = fakeCtx();
  drawPrompt(ctx, ASSETS, 'mouse', 'hands', 10, 10, 0);
  assert.equal(ctx.drawn.length, 1);
  assert.equal(ctx.drawn[0].sx, MOUSE_R[0], 'Manos debe usar el frame mouse_r');
  // y Mochila muestra siempre [I], también con mouse
  const other = fakeCtx();
  drawPrompt(other, ASSETS, 'mouse', 'bag', 10, 10, 0);
  assert.equal(other.drawn[0].sx, KEY_I[0]);
});

test('pantalla de Controles: dos columnas, Hacer y Manos con X', () => {
  assert.equal(CONTROLS_ROWS.find((row) => row.action === 'look'), undefined,
    'no hay fila Mirar');
  const hands = CONTROLS_ROWS.find((row) => row.action === 'hands');
  assert.deepEqual(hands.mouse, ['mouse_r']);
  assert.equal(hands.mouseLabel, 'Click der.');
  assert.deepEqual(hands.pad, ['x']);
  assert.equal(hands.padLabel, 'X');
  const hacer = CONTROLS_ROWS.find((row) => row.action === 'interact');
  assert.equal(hacer.label, 'Hacer');
  assert.deepEqual(hacer.pad, ['a']);
  assert.equal(hacer.padLabel, 'A');
  // la columna de mouse de cada fila coincide con glyphName
  for (const row of CONTROLS_ROWS) {
    if (!row.mouse.length) continue;
    assert.ok(row.mouse.includes(glyphName('mouse', row.action)),
      `glifo de mouse distinto en ${row.action}`);
  }
  const item = CONTROLS_ROWS.find((r) => r.action === 'item');
  assert.equal(item.mouseLabel, 'Rueda, 1 a 8');
  assert.deepEqual(item.pad, ['lb', 'rb']);
});

test('Controles y barra: todos los caracteres existen en la fuente', () => {
  const bar = Object.values(ACTIONS).map((action) => action.label);
  for (const map of [house, attic, garage, street]) {
    for (const object of map.objects || []) {
      if (object.interact?.label) bar.push(object.interact.label);
    }
    for (const warp of map.warps || []) {
      if (warp.label) bar.push(warp.label);
    }
  }
  for (const row of ITEM_USES) {
    if (typeof row.label === 'string') bar.push(row.label);
  }
  for (const row of SELF_USES) {
    if (typeof row.label === 'string') {
      bar.push(row.label);
      continue;
    }
    // Las funciones devuelven la etiqueta de cada estado/ítem posible.
    bar.push(row.label({ hasSuit: true, hasRifle: true }, 'mate_vacio'));
    bar.push(row.label({ hasSuit: false, hasRifle: false }, 'mate_cebado'));
  }

  const missing = [];
  for (const text of [...controlsTexts(), ...bar]) {
    for (const ch of text) {
      if (!GLYPHS[ch]) missing.push(`"${ch}" (U+${ch.codePointAt(0).toString(16)}) en "${text}"`);
    }
  }
  assert.deepEqual(missing, [], `la fuente no tiene: ${missing.join(', ')}`);
});

test('cursor lejos: ámbar fijo y legible, marco tenue', () => {
  assert.equal(FAR_RGB, '255, 190, 120');
  assert.ok(Math.abs(FAR_ALPHA - 0.75) < 0.01);
  assert.ok(Math.abs(FAR_FRAME_ALPHA - 0.18) < 0.01);
});
}

// --- mouse_buttons.test.js
{
// Dos botones: Hacer (click izq. / A) y Manos (click der. / X). Mirar deja de
// ser un botón (brief docs/brief_dos_botones.md, DIRECCION.md "Controles e
// interacción"). Todo lógica pura: Input, mapa y resolvedores, sin Three.js.

const MAPS = [attic, house, garage, street];

// ---------------------------------------------------------------- input
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

function makePad({ buttons = [] } = {}) {
  const all = Array.from({ length: 16 }, (_, i) => ({ pressed: Boolean(buttons[i]) }));
  return { connected: true, axes: [0, 0], buttons: all, mapping: 'standard' };
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

// ------------------------------------------------------------- candidatos
function objectCandidate(obj) {
  const w = (obj.tw || 1) * 16;
  const h = (obj.th || 1) * 16;
  return {
    id: obj.id,
    kind: obj.container ? 'container' : 'object',
    type: obj.type || (obj.container ? 'container' : 'decor'),
    name: obj.name,
    talk: obj.talk,
    x: obj.x * 16, y: obj.y * 16, w, h,
    cursorBox: { x: obj.x * 16, y: obj.y * 16, w, h },
    ref: obj,
    container: obj.container,
  };
}

function warpCandidate(warp) {
  return {
    id: `warp_${warp.id}`,
    kind: 'warp',
    type: 'passage',
    name: warp.label,
    x: warp.x + warp.w / 2, y: warp.y + warp.h, w: warp.w, h: warp.h,
    cursorBox: { x: warp.x, y: warp.y, w: warp.w, h: warp.h },
    warp,
  };
}

function npcCandidates(map) {
  return (map.npcs || []).map((npc) => ({
    id: npc.id,
    kind: 'npc',
    type: 'person',
    name: npc.name || npc.id,
    x: npc.x, y: npc.feet + 26, w: 20, h: 52,
    cursorBox: { x: npc.x - 8, y: npc.feet - 32, w: 16, h: 32 },
    npc,
  }));
}

function surfaceCandidates(map) {
  return itemsForMap(map.id, INITIAL_ITEMS, map).map((wi) => {
    const item = getItem(wi.itemId);
    return {
      id: `surface_${wi.uid}`,
      kind: 'surfaceItem',
      type: 'thing',
      name: item.name,
      x: wi.x, y: wi.y, w: 12, h: 12,
      cursorRect: null,
      cursorBox: { x: wi.x - 6, y: wi.y - 12, w: 12, h: 12 },
      item, worldItem: wi, objectId: wi.objectId, slot: wi.slot,
      grabbable: isGrabbable(wi.itemId),
    };
  });
}

function candidatesOf(map) {
  return [
    ...(map.objects || []).filter((o) => o.type || o.container).map(objectCandidate),
    ...surfaceCandidates(map),
    ...npcCandidates(map),
    ...(map.warps || []).map(warpCandidate),
  ];
}

function pick(map, predicate) {
  const found = candidatesOf(map).find(predicate);
  assert.ok(found, 'falta el candidato');
  return found;
}

/** Escena mínima con el resolvedor real y los efectos anotados. */
function makeScene(map, overrides = {}) {
  const toasts = [];
  const changes = [];
  const world = makeWorldScene();
  Object.assign(world, {
    name: map.id,
    mapData: { ...map },
    worldState: { items: [], moved: {} },
    world: {},
    npcs: [],
    pickups: [],
    player: {
      x: 0, feet: 0, dir: 'down', speedScale: 1,
      update() {}, sprite: { setDir() {} },
    },
    hud: { update() {} },
    surface: { update() {}, candidates: [] },
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
    t: 0,
    target: null,
    hoverTarget: null,
    hoverNear: false,
    selfHover: false,
    handsAim: null,
    handsAction: null,
    hintRects: [],
    exitWarp: null,
    cam: { x: 0, y: 0 },
    toasts,
    changes,
    toggled: [],
    looked: [],
    nearWarnings: 0,
    game: {
      flags: {}, inventory: [], selectedSlot: 0, pavaStation: null,
      hasSuit: true, hasRifle: false, carry: null, seenLook: {},
      showToast: (text) => toasts.push(text),
      emit: () => {},
      changeScene: (name, spawn) => changes.push({ name, spawn }),
    },
    toggleDevice(obj) { this.toggled.push(obj.id); },
    faceTarget() {},
    lookTarget(target) { this.looked.push(target.id); },
    warnNear() { this.nearWarnings += 1; },
    labelObstacles() { return []; },
    worldToView() { return { x: 0, y: 0 }; },
    useLabel() { return 'Usar'; },
    verbFor() { return 'Mirar'; },
    updatePava() {}, updateTimedBar() {}, handleHotbar() {},
    updateCarryMesh() {}, updateGhost() {}, clearGhost() {},
    drawHud() {}, followCamera() {},
    candidates() { return []; },
    updateMouseTarget() {}, updateCursor() {},
    handsActionFor() { return { aim: null, action: null }; },
    carryData() { return null; },
    pointerView() { return null; },
    ...overrides,
  });
  return world;
}

// ------------------------------------------------------------------ tests

test('Q y el RT no hacen nada en el mundo', () => {
  const target = makeTarget();
  const input = new Input(target);
  target.fire('keydown', { code: 'KeyQ' });
  const q = input.poll();
  assert.equal(q.handsPressed, false);
  assert.equal(q.padAPressed, false);
  assert.equal(q.aPressed, false);
  assert.equal('lookPressed' in q, false, 'Mirar ya no es una entrada');
  target.fire('keyup', { code: 'KeyQ' });

  withPad(makePad({ buttons: { 7: true } }), () => {
    input.prev = { a: false, b: false, start: false, y: false, lb: false, rb: false, hands: false };
    const rt = input.poll();
    assert.equal(rt.handsPressed, false, 'el RT ya no es Manos');
    assert.equal(rt.padAPressed, false);
  });
});

test('X (botón 2) agarra y deja: Manos con flanco', () => {
  const target = makeTarget();
  const input = new Input(target);
  withPad(makePad({ buttons: { 2: true } }), () => {
    input.prev = { a: false, b: false, start: false, y: false, lb: false, rb: false, hands: false };
    const first = input.poll();
    assert.equal(first.hands, true);
    assert.equal(first.handsPressed, true);
    assert.equal(input.poll().handsPressed, false, 'un solo flanco');
  });
  assert.equal(glyphName('pad', 'hands'), 'x');

  // Con la X el mundo ejecuta la acción de Manos que resuelve el mapa.
  const scene = makeScene(attic);
  const mate = pick(attic, (c) => c.kind === 'surfaceItem'
    && c.worldItem.itemId === 'mate_vacio');
  const grab = resolveHands(
    scene.ctx(), { target: mate, tile: null, point: null, device: 'pad' }, null, null,
  );
  assert.equal(grab.kind, 'grab');
  assert.equal(grab.label, 'Agarrar Mate');
  const hands = [];
  scene.runHands = (action) => hands.push(action);
  scene.handsActionFor = () => ({
    aim: { target: mate, tile: null, point: null, device: 'pad' },
    action: grab,
  });
  scene.update(0.016, {
    device: 'pad', handsPressed: true, move: { x: 0, y: 0 },
    aPressed: false, padAPressed: false, bPressed: false, startPressed: false,
    yPressed: false, click: null, rightClick: null, wheel: 0, slotPressed: -1,
    prevHotbar: false, nextHotbar: false,
  });
  assert.equal(hands.length, 1, 'X ejecutó Manos');
  assert.equal(hands[0].label, 'Agarrar Mate');

  // Del otro lado: con un ítem en la mano y un casillero libre al lado, X deja.
  const dropScene = makeScene(house);
  dropScene.player.x = 19 * 16 + 8;
  dropScene.player.feet = 13 * 16 + 12;
  const drop = resolveHands(
    dropScene.ctx(),
    { target: null, tile: { tx: 19, ty: 14 }, point: null, device: 'pad' },
    'mate_vacio', null,
  );
  assert.equal(drop.kind, 'drop');
  assert.equal(drop.label, 'Dejar Mate');
});

test('B en diálogo vuelve; en el mundo no hace nada', () => {
  // En el diálogo, B (y Esc) cierran/retroceden.
  const assets = {
    font: { glyphs: { ' ': ['######'] } },
    buttonsData: { frames: { mouse: [0, 0, 11, 13], a: [0, 0, 11, 11], b: [0, 0, 11, 11] } },
  };
  const dialog = new DialogBox(assets);
  dialog.show({ lines: ['Hola.'] });
  const input = { aPressed: false, bPressed: true, startPressed: false, click: null };
  assert.equal(dialog.update(0.016, input, 'pad', null), 'closed');
  assert.equal(dialog.open, false);

  // En el mundo la B no mira (Q tampoco): no hay botón de Mirar.
  const scene = makeScene(attic);
  scene.update(0.016, {
    device: 'pad', bPressed: true, move: { x: 0, y: 0 },
    aPressed: false, padAPressed: false, startPressed: false, yPressed: false,
    handsPressed: false, click: null, rightClick: null, wheel: 0, slotPressed: -1,
    prevHotbar: false, nextHotbar: false,
  });
  assert.equal(scene.looked.length, 0);
});

test('la barra nunca muestra Mirar como entrada aparte', () => {
  for (const map of MAPS) {
    const scene = makeScene(map);
    for (const target of candidatesOf(map)) {
      for (const held of [null, 'mate_cebado']) {
        scene.target = target;
        scene.game.inventory = held ? [{ id: held, count: 1 }] : [];
        const hints = scene.hudParams({ device: 'mouse' }).hintActions;
        for (const hint of hints) {
          assert.ok(['interact', 'hands', 'bag'].includes(hint.action),
            `${map.id}/${target.id}: entrada ${hint.action}`);
          if (hint.label.startsWith('Mirar')) {
            assert.equal(hint.action, 'interact',
              `${map.id}/${target.id}: "Mirar" va dentro de Hacer`);
          }
        }
        assert.equal(hints.find((h) => h.label === 'Mirar'), undefined,
          `${map.id}/${target.id}: "Mirar" suelto`);
      }
    }
  }
  // El parlante se mira con Hacer: una sola entrada.
  const scene = makeScene(attic);
  scene.target = pick(attic, (c) => c.id === 'speaker');
  assert.deepEqual(
    scene.hudParams({ device: 'mouse' }).hintActions.map((h) => h.label),
    ['Mirar el parlante', 'Mochila'],
  );
  // Ni Mirar ni RT como acciones de los glifos.
  assert.equal(ACTIONS.look, undefined);
  assert.equal(CONTROLS_ROWS.find((r) => r.action === 'look'), undefined);
  assert.equal(CONTROLS_ROWS.find((r) => r.action === 'interact').label, 'Hacer');
  assert.deepEqual(CONTROLS_ROWS.find((r) => r.action === 'hands').pad, ['x']);
});

test('click lejos sobre un decorado lo mira, no pide alcance', () => {
  const speaker = pick(attic, (c) => c.id === 'speaker');
  const scene = makeScene(attic);
  const action = resolveAction(scene.ctx(), speaker, null);
  assert.equal(action.kind, 'look');
  assert.equal(action.needsNear, false, 'Mirar no pide alcance');

  scene.target = speaker;
  scene.hoverTarget = speaker;
  scene.hoverNear = false; // click lejos
  scene.handleMouseClick();
  assert.deepEqual(scene.looked, [speaker.id], 'miró el decorado de lejos');
  assert.equal(scene.nearWarnings, 0);
  assert.ok(!scene.toasts.includes('Acercate un poco.'));

  // Lo que no es Mirar sí pide alcance (la radio se prende de cerca).
  const radio = pick(attic, (c) => c.id === 'radio');
  assert.equal(resolveAction(scene.ctx(), radio, null).needsNear, true);
});

test('la línea de mirar de la primera vez sale una sola vez (radio)', () => {
  const scene = makeScene(attic);
  const radio = pick(attic, (c) => c.id === 'radio');
  const line = 'Suena bajito, como si no quisiera molestar.';
  scene.runAction(resolveAction(scene.ctx(), radio, null), radio);
  assert.ok(scene.toasts.includes(line));
  assert.equal(scene.toggled.length, 1, 'el resultado igual se ejecutó');
  assert.equal(scene.game.seenLook.radio, true);

  scene.runAction(resolveAction(scene.ctx(), radio, null), radio);
  assert.equal(scene.toasts.filter((t) => t === line).length, 1, 'no se repite');
});

test('la escalera dice su línea antes de cambiar de ambiente, una sola vez', () => {
  const scene = makeScene(house);
  const warp = house.warps.find((w) => w.id === 'stairs_up');
  const target = warpCandidate(warp);
  const line = 'La escalera rebatible que sube al altillo.';
  scene.runAction(resolveAction(scene.ctx(), target, null), target);
  assert.ok(scene.toasts.includes(line));
  assert.ok(scene.pendingWarp, 'espera antes de irse');
  assert.equal(scene.changes.length, 0, 'todavía no cambió de ambiente');
  assert.equal(scene.updatePendingWarp(0.5), false);
  assert.equal(scene.changes.length, 0);
  assert.equal(scene.updatePendingWarp(1), true);
  assert.equal(scene.changes[0].name, 'attic');

  scene.runAction(resolveAction(scene.ctx(), target, null), target);
  assert.equal(scene.toasts.filter((t) => t === line).length, 1, 'no se repite');
  assert.equal(scene.changes.length, 2, 'la segunda vez pasa enseguida');
});

test('la escalera del altillo toma su línea de script.js', () => {
  const scene = makeScene(attic);
  const warp = attic.warps.find((w) => w.id === 'stairs');
  const target = warpCandidate(warp);
  scene.runAction(resolveAction(scene.ctx(), target, null), target);
  assert.ok(scene.toasts.includes('La escalera baja a la planta baja.'));
  assert.ok(scene.pendingWarp);
});

test('la escalera también dice su línea si se la pisa caminando', () => {
  const scene = makeScene(house);
  const warp = house.warps.find((w) => w.id === 'stairs_up');
  scene.player.x = warp.x + 8;
  scene.player.feet = warp.y + 40; // dentro del rect del paso
  scene.update(0.016, {
    device: 'pad', move: { x: 0, y: 0 },
    aPressed: false, padAPressed: false, bPressed: false, startPressed: false,
    yPressed: false, handsPressed: false, click: null, rightClick: null,
    wheel: 0, slotPressed: -1, prevHotbar: false, nextHotbar: false,
  });
  assert.ok(scene.toasts.includes('La escalera rebatible que sube al altillo.'));
  assert.ok(scene.pendingWarp);
  assert.equal(scene.changes.length, 0);
  assert.equal(scene.updatePendingWarp(1.5), true);
  assert.equal(scene.changes[0].name, 'attic');
});

test('reset() borra las líneas de la primera vez', () => {
  const scene = makeScene(attic);
  const radio = pick(attic, (c) => c.id === 'radio');
  const line = 'Suena bajito, como si no quisiera molestar.';
  scene.runAction(resolveAction(scene.ctx(), radio, null), radio);
  assert.equal(scene.toasts.filter((t) => t === line).length, 1);
  assert.equal(scene.game.seenLook.radio, true);

  resetWorld(scene.game);
  assert.deepEqual(scene.game.seenLook, {});

  scene.runAction(resolveAction(scene.ctx(), radio, null), radio);
  assert.equal(scene.toasts.filter((t) => t === line).length, 2,
    'en una partida nueva vuelve a decirla');
});

test('recorrido del mate y la pava intactos', () => {
  // Mate sobre la mesa del altillo: Hacer lo mira, Manos lo agarra.
  const scene = makeScene(attic);
  const mateItem = pick(attic, (c) => c.kind === 'surfaceItem'
    && c.worldItem.itemId === 'mate_vacio');
  const look = resolveAction(scene.ctx(), mateItem, null);
  assert.equal(look.kind, 'look');
  assert.equal(look.label, 'Mirar Mate');
  const grab = resolveHands(
    scene.ctx(), { target: mateItem, tile: null, point: null, device: 'mouse' }, null, null,
  );
  assert.equal(grab.label, 'Agarrar Mate');

  // La pava en el fuego se agarra con Manos; la pava fría se pone con Hacer.
  const stove = pick(house, (c) => c.id === 'stove' && c.kind === 'object');
  scene.game.pavaStation = 'stove';
  const pava = resolveHands(
    scene.ctx(), { target: stove, tile: null, point: null, device: 'mouse' }, null, null,
  );
  assert.equal(pava.kind, 'takePava');
  assert.equal(pava.label, 'Agarrar la pava');
  scene.game.pavaStation = null;
  const heat = resolveAction(scene.ctx(), stove, 'pava_fria');
  assert.equal(heat.kind, 'use');
  assert.equal(heat.label, 'Poner la pava al fuego');

  // Sin objetivo, Hacer usa el mate en la mano (uso propio).
  assert.equal(resolveAction(scene.ctx(), null, 'mate_cebado').label, 'Tomar mate');

  // Máquina de estados del mate: yerba -> cebar -> tomar -> lavar.
  const mate = createMate();
  assert.equal(putYerba(mate), true);
  assert.equal(cebar(mate, { temp: 78 }), true);
  assert.equal(sip(mate), true);
  assert.equal(isLavado(mate), false);
});
}

// --- right_click_hands.test.js
{
// Click derecho = Manos (DIRECCION.md, "Controles e interacción"). Ya no es
// Mirar: no hay botón de Mirar. Este test reemplaza al viejo "click derecho
// = Mirar": el comportamiento cambió a propósito.

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
}
