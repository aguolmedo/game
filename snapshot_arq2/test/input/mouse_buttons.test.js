// Dos botones: Hacer (click izq. / A) y Manos (click der. / X). Mirar deja de
// ser un botón (brief docs/brief_dos_botones.md, DIRECCION.md "Controles e
// interacción"). Todo lógica pura: Input, mapa y resolvedores, sin Three.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Input } from '../../src/input.js';
import { makeWorldScene } from '../helpers/world_scene.js';
import { resolveAction, resolveHands } from '../../src/actions.js';
import { itemsForMap, resetWorld } from '../../src/surfaces.js';
import { INITIAL_ITEMS } from '../../src/data/surfaces.js';
import { getItem, isGrabbable } from '../../src/items.js';
import { attic } from '../../src/maps/attic.js';
import { house } from '../../src/maps/house.js';
import { garage } from '../../src/maps/garage.js';
import { street } from '../../src/maps/street.js';
import { DialogBox } from '../../src/dialog.js';
import { ACTIONS, glyphName } from '../../src/glyphs.js';
import { CONTROLS_ROWS } from '../../src/menus.js';
import { createMate, putYerba, cebar, sip, isLavado } from '../../src/mate.js';

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
