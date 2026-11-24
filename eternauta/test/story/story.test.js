// Historia con un game falso: sin three ni DOM, cinemáticas resueltas al toque.
import test from 'node:test';
import assert from 'node:assert/strict';
import { initStory } from '../../src/story.js';
import { COMICS } from '../../src/data/script.js';
import { currentObjective } from '../../src/objectives.js';
import { createInventory, addItem } from '../../src/inventory.js';
import { SUIT_NEEDS } from '../../src/objectives.js';

function makeScene(name = 'attic') {
  return {
    name,
    player: { x: 0, feet: 0, dir: 'right', frozen: false },
    npcs: [],
    dialog: { open: false },
    choice: { open: false },
    comic: { open: false },
    caption: { open: false },
    timedBar: null,
    calls: [],
    opened: [],
    applied: 0,
    openDialog(entry, id) {
      this.opened.push({ entry, id });
      this.dialog.open = true;
      queueMicrotask(() => { if (this.dialog.open) this.closeDialog(); });
    },
    closeDialog() {
      const record = this.opened[this.opened.length - 1];
      this.dialog.open = false;
      record?.entry?.onClose?.();
    },
    async playCaption(text) { this.calls.push(['caption', text]); },
    async playComic(spec) { this.calls.push(['comic', spec]); },
    startTimedBar(id, seconds, label) { this.timedBar = { id, left: seconds, total: seconds, label }; },
    setLightState() {},
    applyStoryState() { this.applied += 1; },
  };
}

function makeGame(overrides = {}) {
  const game = {
    runId: 1,
    flags: {},
    inventory: createInventory(),
    hasSuit: false,
    hasRifle: false,
    crafted: false,
    mateShared: {},
    sceneName: 'attic',
    scene: makeScene('attic'),
    toasts: [],
    blackouts: 0,
    arenas: 0,
    showToast(text) { this.toasts.push(text); },
    blackout() { this.blackouts += 1; this.flags.apagon = true; },
    startArena() { this.arenas += 1; this.flags.arena = true; this.changeScene('arena'); },
    changeScene(name) { this.sceneName = name; },
    setLighting(mode) { this.lighting = mode; },
    emit(type, data) { this.story.handle(type, data, this); },
    ...overrides,
  };
  const story = initStory(game);
  return { game, story };
}

const comicCount = (scene) => scene.calls.filter((c) => c[0] === 'comic').length;

test('intro: cartucho de 1957 y Favalli pidiendo el mate', async () => {
  const { game, story } = makeGame();
  game.emit('enterMap', { map: 'attic' });
  await story.idle();
  const captions = game.scene.calls.filter((c) => c[0] === 'caption');
  assert.equal(captions.length, 1);
  assert.match(captions[0][1], /1957/);
  assert.equal(game.scene.opened.length, 1);
  assert.match(game.scene.opened[0].entry.lines.join(' '), /Quién ceba/);
  assert.equal(currentObjective(game).id, 'mate');
});

test('mate → mesa → viñetas del truco → apagón', async () => {
  const { game, story } = makeGame();
  game.story.shown.intro = true;
  game.emit('enterMap', { map: 'attic' });
  game.flags.mate_tutorial = true;

  game.emit('interact', { id: 'chair_juan', kind: 'object' });
  await story.idle();

  assert.equal(game.flags.truco_jugado, true);
  assert.equal(game.flags.apagon, true);
  assert.equal(game.blackouts, 1);
  assert.equal(comicCount(game.scene), 2, 'truco y choque');
  const comics = game.scene.calls.filter((c) => c[0] === 'comic');
  assert.equal(comics[0][1], COMICS.truco);
  assert.equal(comics[1][1], COMICS.choque);
  assert.equal(currentObjective(game).id, 'window');
});

test('si el diálogo de la silla sigue abierto, las viñetas esperan al dialogEnd', async () => {
  const { game, story } = makeGame();
  game.story.shown.intro = true;
  game.flags.mate_tutorial = true;
  game.scene.dialog.open = true;
  game.emit('interact', { id: 'chair_juan', kind: 'object' });
  await story.idle();
  assert.equal(comicCount(game.scene), 0);
  game.scene.dialog.open = false;
  game.emit('dialogEnd', { id: 'chair_juan' });
  await story.idle();
  assert.equal(game.flags.truco_jugado, true);
  assert.equal(comicCount(game.scene), 2);
});

test('ventana del altillo: al volver de la vista, Juan frena a Lucas', async () => {
  const { game, story } = makeGame();
  game.story.shown.intro = true;
  game.flags.mate_tutorial = true;
  game.flags.truco_jugado = true;
  game.flags.apagon = true;
  game.emit('viewEnd', { id: 'window' });
  story.update(0.3, game);
  await story.idle();

  assert.equal(game.flags.vio_la_nevada, true);
  const texts = game.scene.opened.map((o) => o.entry.lines.join(' ')).join(' | ');
  assert.match(texts, /No abras, Lucas/);
  assert.match(texts, /por qué/);
  assert.match(texts, /radiactiva/);
  assert.equal(currentObjective(game).id, 'downstairs');
});

test('ventana de Martita: cartucho y barra de 8 s', async () => {
  const { game, story } = makeGame();
  game.flags = {
    mate_tutorial: true, truco_jugado: true, apagon: true, vio_la_nevada: true,
  };
  game.scene = makeScene('house');
  game.sceneName = 'house';
  game.emit('enterMap', { map: 'house' });
  await story.idle();

  assert.match(game.scene.calls[0][1], /Me precipité/);
  assert.ok(game.scene.timedBar);
  assert.equal(game.scene.timedBar.id, 'martita');
  assert.equal(game.scene.timedBar.total, 8);
  assert.equal(game.flags.martita_sprint, true);
  assert.equal(currentObjective(game).id, 'martita');

  game.flags.closed_window_martita = true;
  game.emit('interact', { id: 'window_martita', kind: 'windowClosed' });
  await story.idle();
  assert.equal(game.flags.martita_ventana, 'ok');
  assert.equal(game.scene.timedBar, null);
  const texts = game.scene.opened.map((o) => o.entry.lines.join(' ')).join(' | ');
  assert.match(texts, /¿Qué pasa, Juan\?/);
  assert.match(texts, /No abras ninguna ventana/);
  assert.equal(currentObjective(game).id, 'seal');
});

test('ventana de Martita: si se acaba el tiempo, viñeta y sigue la escena', async () => {
  const { game, story } = makeGame();
  game.flags = {
    mate_tutorial: true, truco_jugado: true, apagon: true, vio_la_nevada: true,
  };
  game.scene = makeScene('house');
  game.sceneName = 'house';
  game.emit('enterMap', { map: 'house' });
  await story.idle();

  game.emit('timerEnd', { id: 'martita' });
  await story.idle();
  assert.equal(game.flags.martita_ventana, 'tarde');
  assert.equal(game.flags.martita_sprint, false);
  assert.equal(comicCount(game.scene), 1);
  assert.equal(game.scene.calls.find((c) => c[0] === 'comic')[1], COMICS.martitaTarde);
  assert.equal(currentObjective(game).id, 'seal');
});

test('casa sellada: cuenta las cuatro aberturas y dispara la escena de Polsky', async () => {
  const { game, story } = makeGame();
  story.shown.intro = true;
  game.flags = {
    mate_tutorial: true, truco_jugado: true, apagon: true, vio_la_nevada: true,
    martita_ventana: 'ok',
    closed_window_martita: true, closed_window_living: true, closed_hall_door: true,
  };
  game.scene = makeScene('house');
  game.sceneName = 'house';
  story.update(0.3, game);
  await story.idle();
  assert.ok(!game.flags.casa_sellada, 'faltan 3 de 4');

  game.flags.closed_garage_door = true;
  story.update(0.3, game);
  await story.idle();
  assert.equal(game.flags.casa_sellada, true);
  assert.equal(game.flags.polsky_muerto, true);
  assert.equal(game.flags.polskyLeft, true);
  assert.equal(game.flags.closed_hall_door, true);
  assert.equal(game.scene.calls.find((c) => c[0] === 'comic')[1], COMICS.polsky);
  assert.ok(game.scene.applied >= 1);
  assert.equal(currentObjective(game).id, 'elena');
});

test('Elena: hablar abre el paso a la ventana del living y después al altillo', async () => {
  const { game, story } = makeGame();
  story.shown.intro = true;
  game.flags = {
    mate_tutorial: true, truco_jugado: true, apagon: true, vio_la_nevada: true,
    martita_ventana: 'ok', casa_sellada: true, polsky_muerto: true,
  };
  game.scene = makeScene('house');
  game.sceneName = 'house';

  // Sin hablar con Elena el objetivo sigue siendo hablar con ella.
  assert.equal(currentObjective(game).id, 'elena');

  game.emit('interact', { id: 'elena', kind: 'npc' });
  await story.idle();
  assert.equal(game.flags.elena_hablada, true);
  assert.equal(currentObjective(game).id, 'ramirez');

  // Volver de la vista del living mata a Ramírez y manda al altillo.
  game.emit('viewEnd', { id: 'window_living' });
  story.update(0.3, game);
  await story.idle();
  assert.equal(game.flags.ramirez_muerto, true);
  assert.equal(currentObjective(game).id, 'attic');
});

test('Ramírez: al volver de la vista del living, la vela se apaga', async () => {
  const { game, story } = makeGame();
  game.flags = {
    mate_tutorial: true, truco_jugado: true, apagon: true, vio_la_nevada: true,
    martita_ventana: 'ok', casa_sellada: true, polsky_muerto: true,
  };
  game.scene = makeScene('house');
  game.sceneName = 'house';
  game.emit('viewEnd', { id: 'window_living' });
  story.update(0.3, game);
  await story.idle();
  assert.equal(game.flags.ramirez_muerto, true);
  assert.equal(game.scene.calls.find((c) => c[0] === 'comic')[1], COMICS.ramirez);
});

test('idea del traje: Favalli la explica al volver al altillo', async () => {
  const { game, story } = makeGame();
  story.shown.intro = true;
  game.flags = {
    mate_tutorial: true, truco_jugado: true, apagon: true, vio_la_nevada: true,
    martita_ventana: 'ok', casa_sellada: true, ramirez_muerto: true,
  };
  game.emit('enterMap', { map: 'attic' });
  await story.idle();
  assert.equal(game.flags.idea_traje, true);
  const texts = game.scene.opened.map((o) => o.entry.lines.join(' ')).join(' | ');
  assert.match(texts, /traje de buzo/);
  assert.equal(currentObjective(game).id, 'materials');
});

test('materiales: con los seis, el objetivo pasa a armar el traje', async () => {
  const { game, story } = makeGame();
  game.flags = {
    mate_tutorial: true, truco_jugado: true, apagon: true, vio_la_nevada: true,
    martita_ventana: 'ok', casa_sellada: true, polsky_muerto: true, idea_traje: true,
  };
  let inventory = createInventory();
  for (const need of SUIT_NEEDS) inventory = addItem(inventory, need.id, need.n).slots;
  game.inventory = inventory;
  story.update(0.3, game);
  await story.idle();
  assert.equal(currentObjective(game).id, 'craft');
  assert.match(currentObjective(game).text, /Armá el traje/);
});

test('esclusa: nafta + extractor + traje, con el diálogo de Lucas', async () => {
  const { game, story } = makeGame();
  game.flags = {
    mate_tutorial: true, truco_jugado: true, apagon: true, vio_la_nevada: true,
    martita_ventana: 'ok', casa_sellada: true, polsky_muerto: true, idea_traje: true, dados: false,
    traje_fabricado: true, electrogeno_on: true, extractor_ok: true,
  };
  game.scene = makeScene('garage');
  game.sceneName = 'garage';
  story.update(0.3, game);
  await story.idle();
  assert.equal(game.flags.esclusa_lista, true);
  const texts = game.scene.opened.map((o) => o.entry.lines.join(' ')).join(' | ');
  assert.match(texts, /extractor no aguanta/);
  assert.match(texts, /Ya está resuelto/);
  assert.equal(currentObjective(game).id, 'equip');
});

test('dados: en el living, después de la esclusa', async () => {
  const { game, story } = makeGame();
  story.shown.eclusa = true;
  game.flags = {
    mate_tutorial: true, truco_jugado: true, apagon: true, vio_la_nevada: true,
    martita_ventana: 'ok', casa_sellada: true, polsky_muerto: true, idea_traje: true,
    traje_fabricado: true, electrogeno_on: true, extractor_ok: true,
    esclusa_lista: true,
  };
  game.scene = makeScene('house');
  game.sceneName = 'house';
  story.update(0.3, game);
  await story.idle();
  assert.equal(game.flags.dados, true);
  assert.equal(game.scene.calls.find((c) => c[0] === 'comic')[1], COMICS.dados);
  assert.equal(currentObjective(game).id, 'equip');
});

test('equipado: con traje y rifle queda listo para salir', async () => {
  const { game, story } = makeGame();
  story.shown.eclusa = true;
  game.flags = {
    mate_tutorial: true, truco_jugado: true, apagon: true, vio_la_nevada: true,
    martita_ventana: 'ok', casa_sellada: true, polsky_muerto: true, idea_traje: true,
    traje_fabricado: true, electrogeno_on: true, extractor_ok: true,
    esclusa_lista: true, dados: true,
  };
  game.hasSuit = true;
  game.hasRifle = true;
  game.scene = makeScene('garage');
  game.sceneName = 'garage';
  story.update(0.3, game);
  await story.idle();
  assert.equal(game.flags.listo_para_salir, true);
  assert.match(game.toasts.join(' '), /Salí por el garaje/);
  assert.equal(currentObjective(game).id, 'exit');
});

test('calle: cartucho de salida y arena en la mitad del camino', async () => {
  const { game, story } = makeGame();
  game.flags = {
    mate_tutorial: true, truco_jugado: true, apagon: true, vio_la_nevada: true,
    martita_ventana: 'ok', casa_sellada: true, polsky_muerto: true, idea_traje: true,
    traje_fabricado: true, electrogeno_on: true, extractor_ok: true,
    esclusa_lista: true, dados: true, listo_para_salir: true,
  };
  game.hasSuit = true;
  game.hasRifle = true;
  game.scene = makeScene('street');
  game.sceneName = 'street';
  game.emit('enterMap', { map: 'street' });
  await story.idle();
  assert.equal(game.flags.afuera, true);
  assert.match(game.scene.calls[0][1], /nieve brillaba/);
  assert.equal(currentObjective(game).id, 'survive');

  game.scene.player.x = 60 * 16;
  story.update(0.3, game);
  await story.idle();
  assert.equal(game.arenas, 0, 'todavía no llegó a la mitad');

  game.scene.player.x = 63 * 16;
  story.update(0.3, game);
  await story.idle();
  assert.equal(game.arenas, 1);
  assert.equal(game.flags.arena, true);
  assert.ok(game.scene.calls.some((c) => c[0] === 'caption' && /roce de patas/.test(c[1])));
  assert.ok(game.scene.calls.some((c) => c[0] === 'comic' && c[1] === COMICS.cascudos));
});

test('partida nueva: la historia se limpia y el intro vuelve a sonar', async () => {
  const { game, story } = makeGame();
  game.emit('enterMap', { map: 'attic' });
  await story.idle();
  assert.equal(game.scene.calls.filter((c) => c[0] === 'caption').length, 1);

  game.runId = 2;
  game.flags = {};
  game.scene = makeScene('attic');
  game.sceneName = 'attic';
  game.emit('enterMap', { map: 'attic' });
  await story.idle();
  assert.equal(game.scene.calls.filter((c) => c[0] === 'caption').length, 1);
});
