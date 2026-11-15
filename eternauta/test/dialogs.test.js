import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { talkEntry, WARNING } from '../src/dialogs.js';
import { createInventory, addItem } from '../src/inventory.js';
import { RECIPES } from '../src/recipes.js';
import { CAPTIONS, COMICS, DIALOGS } from '../src/data/script.js';

const read = (name) => JSON.parse(
  fs.readFileSync(new URL(`../public/assets/${name}`, import.meta.url), 'utf8'),
);
const font = read('font.json');
const portraits = read('portraits_dlg.json');
const PORTRAITS = new Set(Object.keys(portraits.blocks));
const panelPortraits = read('portraits_panel.json');
const PANEL_PORTRAITS = new Set(Object.keys(panelPortraits.blocks));

function gameWith(flags = {}, stocked = false) {
  let inventory = createInventory();
  if (stocked) {
    for (const need of RECIPES[0].needs) {
      inventory = addItem(inventory, need.id, need.n).slots;
    }
  }
  return {
    flags: { ...flags }, inventory, crafted: false, hasSuit: false, hasRifle: false,
    mateShared: {},
  };
}

// Todos los ids que las escenas/mapas pueden pedir (guion + §6.3).
const IDS = [
  // personajes
  'favalli', 'lucas', 'polsky', 'elena', 'martita',
  // altillo
  'radio', 'window', 'table', 'chair', 'shelf', 'speaker', 'coat', 'violin',
  'worktable', 'workbench', 'candle',
  // planta baja
  'sofa', 'living_table', 'stove', 'kitchen_table', 'wardrobe', 'bed',
  'nightstand', 'crib', 'toy_horse', 'wall_clock', 'hall_door', 'door_home',
  'stairs',
  // garaje
  'garage_door', 'extractor', 'generator', 'bidon', 'bench_suit', 'suit_hanging',
  // calle
  'polsky_body', 'car', 'bus', 'almacen', 'ferreteria', 'caja_municiones',
];

test('todos los diálogos usan glifos exportados y retratos válidos', () => {
  const variants = [
    {},
    { apagon: true },
    { apagon: true, casa_sellada: true, polsky_muerto: true },
    { apagon: true, casa_sellada: true, idea_traje: true },
    { apagon: true, casa_sellada: true, idea_traje: true, dados: true },
    { apagon: true, casa_sellada: true, idea_traje: true, dados: true, listo_para_salir: true },
    { mate_tutorial: true },
  ];
  for (const flags of variants) {
    const game = gameWith(flags, true);
    for (const id of IDS) {
      const entry = talkEntry(id, game);
      assert.ok(entry, `falta el diálogo ${id}`);
      for (const text of [entry.speaker, ...entry.lines]) {
        for (const ch of String(text)) {
          assert.ok(font.glyphs[ch], `glifo faltante '${ch}' en ${id}`);
        }
      }
      if (entry.portrait !== null) {
        assert.ok(PORTRAITS.has(entry.portrait),
          `retrato inválido '${entry.portrait}' en ${id}`);
      }
    }
  }
});

test('un id desconocido devuelve una línea neutra; sin id, null', () => {
  assert.equal(talkEntry(undefined, gameWith()), null);
  const entry = talkEntry('objeto_que_no_existe', gameWith());
  assert.ok(entry);
  assert.ok(entry.lines.length >= 1);
});

test('el aviso de salida sin traje tiene las dos opciones', () => {
  for (const ch of WARNING.question) assert.ok(font.glyphs[ch], `glifo '${ch}'`);
  assert.deepEqual(WARNING.options, ['No', 'Sí']);
});

test('Favalli cambia antes y después del apagón', () => {
  const before = talkEntry('favalli', gameWith({}, true));
  assert.match(before.lines.join(' '), /falta envido/);
  const after = talkEntry('favalli', gameWith({ apagon: true }));
  assert.match(after.lines.join(' '), /cerrar todo/);
  const dead = talkEntry('favalli', gameWith({ apagon: true, polsky_muerto: true }));
  assert.match(dead.lines.join(' '), /No llegó a cruzar la calle/);
});

test('Favalli explica el traje y nombra lo que falta', () => {
  const game = gameWith({ apagon: true, casa_sellada: true, idea_traje: true });
  const entry = talkEntry('favalli', game);
  const text = entry.lines.join(' ');
  assert.match(text, /Todavía falta/);
  assert.match(text, /Casco de buzo/);
  assert.match(text, /Tela engomada/);

  const stocked = gameWith({ apagon: true, casa_sellada: true, idea_traje: true }, true);
  const ready = talkEntry('favalli', stocked);
  assert.match(ready.lines.join(' '), /Armá el traje en el banco del garaje/);
});

test('la radio cita al piloto de Punta del Este', () => {
  const entry = talkEntry('radio', gameWith());
  assert.match(entry.lines.join(' '), /Punta del Este/);
  const mute = talkEntry('radio', gameWith({ apagon: true }));
  assert.match(mute.lines[0], /Muda/);
});

test('Elena y Martita siguen la historia', () => {
  assert.match(talkEntry('elena', gameWith({ dados: true })).lines.join(' '), /beso/);
  assert.match(talkEntry('elena', gameWith({ casa_sellada: true })).lines.join(' '), /Ramírez/);
  assert.match(talkEntry('martita', gameWith({ casa_sellada: true })).lines.join(' '), /luz/);
});

test('los objetos de la casa responden a las banderas', () => {
  assert.match(talkEntry('wall_clock', gameWith()).lines[0], /once y diez/);
  assert.match(talkEntry('wall_clock', gameWith({ apagon: true })).lines[0], /se paró/);
  assert.match(talkEntry('generator', gameWith()).lines[0], /nafta/);
  assert.match(talkEntry('generator', gameWith({ electrogeno_on: true })).lines[0], /ronronea/);
  assert.match(talkEntry('window', gameWith({ apagon: true })).lines[0], /brilla sola/);
});

test('Polsky muerto usa la línea del cómic', () => {
  const entry = talkEntry('polsky_body', gameWith());
  assert.match(entry.lines[0], /Polsky, mi amigo/);
});

test('cartuchos, diálogos de la historia y viñetas usan glifos válidos', () => {
  const check = (text, where, upper = false) => {
    const value = upper ? String(text).toUpperCase() : String(text);
    for (const ch of value) assert.ok(font.glyphs[ch], `glifo '${ch}' en ${where}`);
  };
  for (const [id, text] of Object.entries(CAPTIONS)) check(text, `cartucho ${id}`);
  for (const [id, entry] of Object.entries(DIALOGS)) {
    check(entry.speaker, `diálogo ${id}`);
    for (const line of entry.lines) check(line, `diálogo ${id}`);
    if (entry.portrait !== null) assert.ok(PORTRAITS.has(entry.portrait), `retrato ${id}`);
  }
  for (const [id, spec] of Object.entries(COMICS)) {
    const expected = spec.layout === '2+2' ? 4 : 6;
    assert.equal(spec.panels.length, expected, `viñeta ${id}`);
    for (const [i, cell] of spec.panels.entries()) {
      assert.ok(['caption', 'portrait', 'map', 'color'].includes(cell.type), `celda ${id}[${i}]`);
      for (const key of ['text', 'caption', 'balloon']) {
        if (cell[key]) check(cell[key], `viñeta ${id}[${i}].${key}`, true);
      }
      if (cell.portrait) {
        assert.ok(PANEL_PORTRAITS.has(cell.portrait), `retrato de panel ${id}[${i}]`);
      }
    }
  }
});
