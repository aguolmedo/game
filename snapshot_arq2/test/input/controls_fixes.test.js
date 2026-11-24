// Retoques de controles: dos botones (Hacer y Manos), glifos del mouse que se
// distinguen, textos del cartel que existen en la fuente y cursor lejos legible.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ACTIONS, glyphName, drawPrompt } from '../../src/glyphs.js';
import { CONTROLS_ROWS, controlsTexts } from '../../src/menus.js';
import { FAR_RGB, FAR_ALPHA, FAR_FRAME_ALPHA } from '../../src/cursor.js';
import { attic } from '../../src/maps/attic.js';
import { garage } from '../../src/maps/garage.js';
import { house } from '../../src/maps/house.js';
import { street } from '../../src/maps/street.js';
import { ITEM_USES, SELF_USES } from '../../src/data/actions.js';

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
