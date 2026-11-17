// Fixes de la ronda 2 de QA sobre el mundo: extractor vs porton, prompt,
// warp bloqueado, cofre y escalera de la casa. Lógica pura, sin Three.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { WorldScene } from '../src/scenes/world.js';
import { house } from '../src/maps/house.js';
import { pickAt } from '../src/interaction.js';
import { resolveAction } from '../src/actions.js';

function fakeGame(overrides = {}) {
  const toasts = [];
  return {
    toasts,
    flags: {},
    hasSuit: false,
    inventory: [],
    selectedSlot: 0,
    showToast(text) { toasts.push(text); },
    emit() {},
    openChest() {},
    ...overrides,
  };
}

function fakeWorld(overrides = {}) {
  const world = Object.create(WorldScene.prototype);
  Object.assign(world, {
    hoverTarget: null,
    hoverNear: false,
    hintRects: [],
    cam: { x: 0, y: 0 },
    target: null,
    exitWarp: null,
    game: fakeGame(),
    ...overrides,
  });
  return world;
}

const EXTRACTOR = {
  id: 'extractor', kind: 'object',
  x: 136, y: 16, w: 16, h: 16,
  cursorBox: { x: 128, y: 0, w: 16, h: 16 },
  interact: { kind: 'look', talk: 'extractor', label: 'Mirar el extractor' },
  ref: {
    id: 'extractor', station: 'extractor',
    interact: { kind: 'look', talk: 'extractor', label: 'Mirar el extractor' },
  },
};

const BLOCKED_GATE = {
  id: 'garage_door', needsSuit: true, needsFlag: 'listo_para_salir',
};

test('interact: un objeto apuntado no es robado por el warp bloqueado de los pies', () => {
  const world = fakeWorld();
  world.exitWarp = BLOCKED_GATE;
  world.target = EXTRACTOR;
  let warps = 0;
  const opened = [];
  world.tryWarp = () => { warps += 1; };
  world.openDialog = (entry) => { opened.push(entry); };
  world.interact();
  assert.equal(warps, 0, 'el warp no se dispara');
  assert.equal(opened.length, 1, 'interactua con el objeto apuntado');
  assert.match(opened[0].lines.join(' '), /extractor/i);
});

test('interact: si el objetivo es el propio warp, sigue funcionando', () => {
  const world = fakeWorld();
  world.exitWarp = BLOCKED_GATE;
  world.target = { id: 'warp_garage_door', kind: 'warp', warp: BLOCKED_GATE };
  let warps = 0;
  world.tryWarp = () => { warps += 1; };
  world.interact();
  assert.equal(warps, 1);
});

test('prompt: con el puntero sobre el extractor no dice "Salir sin traje"', () => {
  const world = fakeWorld();
  world.exitWarp = BLOCKED_GATE;
  world.target = EXTRACTOR;
  world.actionLabel = () => 'Instalar el secador';
  world.useLabel = () => 'Usar';
  world.verbFor = () => 'Mirar';
  const prompt = world.hudParams().prompt;
  assert.equal(prompt.label, 'Instalar el secador');
});

test('prompt: sobre el warp bloqueado conserva "Salir sin traje"/lo que falta', () => {
  const world = fakeWorld();
  world.exitWarp = BLOCKED_GATE;
  world.target = { id: 'warp_garage_door', kind: 'warp', warp: BLOCKED_GATE };
  world.useLabel = () => 'Usar';
  assert.equal(world.hudParams().prompt.label, 'Salir sin traje');

  world.target = null;
  world.game.flags = { electrogeno_on: false };
  assert.equal(world.hudParams().prompt.label, 'Salir sin traje');
});

test('porton bloqueado: avisa una vez por aproximacion, sin spam', () => {
  const world = fakeWorld();
  world.game.flags = {};
  const gate = { id: 'garage_door', needsFlag: 'listo_para_salir' };
  assert.equal(world.warpBlockedFeedback(gate), true);
  assert.deepEqual(world.game.toasts, ['Falta cargar nafta.']);
  assert.equal(world.warpBlockedFeedback(gate), false, 'no repite mientras sigue arriba');
  assert.equal(world.game.toasts.length, 1);

  // Sale del rect (el update limpia warpWarnId) y vuelve a pisarlo.
  world.warpWarnId = null;
  assert.equal(world.warpBlockedFeedback(gate), true);
  assert.equal(world.game.toasts.length, 2);

  // Con el porton habilitado no hay aviso y no rompe el auto-warp.
  world.game.flags = { listo_para_salir: true };
  world.game.hasSuit = true;
  assert.equal(world.warpBlockedFeedback(gate), false);
  assert.equal(world.warpWarnId, null);
});

test('cofre abierto: drawHud no vuelve a mostrar el HUD de mundo', () => {
  let drawn = 0;
  const world = fakeWorld({
    game: fakeGame({ chestOpen: true }),
    hud: { draw() { drawn += 1; } },
  });
  world.drawHud({ device: 'keyboard' }, {});
  assert.equal(drawn, 0);
});

test('escalera de la casa: el decorado no roba el click y el warp queda solo', () => {
  const stairs = house.objects.find((o) => o.id === 'stairs_up');
  assert.ok(stairs, 'sigue existiendo el sprite de la escalera');
  assert.equal(stairs.interact, undefined, 'el decorado ya no es interactuable');

  const warp = house.warps.find((w) => w.id === 'stairs_up');
  assert.ok(warp, 'falta el warp de la escalera');
  assert.equal(warp.to, 'attic');

  // El click sobre el rect de la escalera ahora elige el warp.
  const warpCand = {
    id: 'warp_stairs_up', kind: 'warp', priority: 0,
    x: warp.x + warp.w / 2, y: warp.y + warp.h,
    w: warp.w, h: warp.h,
    cursorBox: { x: warp.x, y: warp.y, w: warp.w, h: warp.h },
    warp,
  };
  const player = { x: warp.x + warp.w / 2, feet: warp.y + warp.h + 16, dir: 'up' };
  const hit = pickAt(player, [warpCand], { x: warp.x + 16, y: warp.y + 16 }, { dir: 'up' });
  assert.equal(hit.target.kind, 'warp');
  assert.equal(hit.near, true);
});

// T10: usar un ítem sobre la pava no la saca (QA #7).
const STOVE = { id: 'stove', station: 'heat' };

test('pava: con mate en la mano el ítem no la saca', () => {
  const world = fakeWorld();
  world.game.pavaStation = 'stove';
  world.game.inventory = [{ id: 'mate_yerba', count: 1 }];
  let taken = 0;
  world.takePava = () => { taken += 1; };
  const target = { kind: 'object', id: 'stove', ref: STOVE };

  // Con F/X (uso del ítem en la mano) el mate no saca la pava: avisa primero.
  const action = resolveAction(world.ctx(), target, 'mate_yerba', 'item');
  assert.equal(action.kind, 'none');
  assert.equal(action.label, 'Primero sacá la pava.');
  world.runAction(action, target);
  assert.equal(taken, 0, 'la pava se queda en el fuego');
  assert.deepEqual(world.game.toasts, ['Primero sacá la pava.']);
  // Con click/E sí la saca, con lo que sea en la mano: lo cubre el test de abajo.
});

test('pava: el click sobre la pava en el fuego la saca, con lo que sea en la mano', () => {
  const world = fakeWorld();
  world.game.pavaStation = 'stove';
  const target = { kind: 'object', id: 'stove', ref: { id: 'stove', station: 'heat' } };

  world.game.inventory = [{ id: 'mate_yerba', count: 1 }];
  assert.equal(world.actionLabel(target), 'Sacar la pava');

  world.game.inventory = [{ id: 'rifle', count: 1 }];
  assert.equal(world.actionLabel(target), 'Sacar la pava');
});

test('click: la pava en la mano sobre la estacion de calor dice "Poner la pava al fuego"', () => {
  const world = fakeWorld();
  world.game.pavaStation = null;
  const target = { kind: 'object', id: 'stove', ref: { id: 'stove', station: 'heat' } };
  world.game.inventory = [{ id: 'pava_fria', count: 1 }];
  const action = resolveAction(world.ctx(), target, 'pava_fria', 'primary');
  assert.equal(action.kind, 'use');
  assert.equal(action.id, 'heatPava');
  assert.equal(action.label, 'Poner la pava al fuego');
  assert.equal(world.actionLabel(target), 'Poner la pava al fuego');
  // Un item sin uso ahi no tiene uso propio: el click hace la interaccion normal.
  assert.equal(resolveAction(world.ctx(), target, 'rifle', 'primary').kind, 'look');
});
