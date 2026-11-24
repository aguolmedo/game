import test from 'node:test';
import assert from 'node:assert/strict';
import {
  tallerModel, cycleStation, stationIndex, moveSel,
  tallerTabRects, tallerRowRects, tallerButtonRect, tallerPrompts, tallerPromptLayout,
  TALLER_BOX, ROW_W, ROW_H, BUTTON,
} from '../src/taller.js';
import { STATIONS, UPGRADES, upgradeState } from '../src/run/upgrades.js';
import { emptySave } from '../src/run/save.js';
import { pointInRect } from '../src/uiHit.js';

const BLANK = ['######'];
const ASSETS = {
  font: { glyphs: { ' ': BLANK } },
  buttonsData: { frames: { key_q: [0, 0, 9, 11], mouse: [0, 0, 11, 13], key_esc: [0, 0, 17, 11], lb: [0, 0, 15, 9], a: [0, 0, 11, 11], b: [0, 0, 11, 11] } },
};

function saveWith({ mejoras = {}, botin = {} } = {}) {
  const save = emptySave();
  save.mejoras = { ...save.mejoras, ...mejoras };
  save.botin = { ...save.botin, ...botin };
  return save;
}

test('cycleStation recorre las cuatro estaciones en los dos sentidos', () => {
  assert.deepEqual(STATIONS, ['favalli', 'elena', 'lucas', 'luz']);
  assert.equal(cycleStation('favalli', 1), 'elena');
  assert.equal(cycleStation('luz', 1), 'favalli');
  assert.equal(cycleStation('favalli', -1), 'luz');
  assert.equal(stationIndex('elena'), 1);
  assert.equal(stationIndex('no-existe'), 0);
});

test('moveSel mueve la fila y se queda dentro de las tres', () => {
  assert.equal(moveSel(0, 1), 1);
  assert.equal(moveSel(2, 1), 2);
  assert.equal(moveSel(0, -1), 0);
  assert.equal(moveSel(9, 0), 2);
  assert.equal(moveSel(-4, 1), 1);
});

test('tallerModel: filas hechas, disponible y bloqueada con una compra', () => {
  const save = saveWith({ mejoras: { favalli: 1 }, botin: { chatarra: 5, pieza: 2 } });
  const model = tallerModel(save, 'favalli', 1);
  assert.equal(model.who, 'Favalli');
  assert.equal(model.what, 'El rifle');
  assert.equal(model.level, 1);
  assert.equal(model.rows.length, 3);
  assert.deepEqual(model.rows.map((r) => r.state), ['hecho', 'disponible', 'bloqueado']);
  // La ficha muestra los costos con lo que hay en la casa.
  const cargo = model.selected;
  assert.equal(cargo.id, 'cargador');
  assert.deepEqual(cargo.cost.map((c) => [c.kind, c.have, c.need]), [['chatarra', 5, 6], ['pieza', 2, 1]]);
  assert.deepEqual(cargo.cost.map((c) => c.ok), [false, true]);
  // 6 de chatarra no alcanza: el boton pide botin.
  assert.equal(model.canBuy, false);
  assert.equal(model.buttonLabel, 'Falta botín');
});

test('tallerModel: la disponible con botin suficiente se puede comprar', () => {
  const save = saveWith({ botin: { chatarra: 4 } });
  const model = tallerModel(save, 'favalli', 0);
  assert.equal(model.rows[0].state, 'disponible');
  assert.equal(model.canBuy, true);
  assert.equal(model.buttonLabel, 'Hacer');
  // Sin plata, no.
  assert.equal(tallerModel(emptySave(), 'favalli', 0).canBuy, false);
});

test('tallerModel: Lucas con la tercera bloqueada y las cuatro pestañas', () => {
  const save = saveWith({ mejoras: { lucas: 1 }, botin: { chatarra: 4, pieza: 2 } });
  const model = tallerModel(save, 'lucas', 2);
  assert.equal(model.rows[0].state, 'hecho');
  assert.equal(model.rows[1].state, 'disponible');
  assert.equal(model.rows[2].state, 'bloqueado');
  assert.equal(model.rows[2].name, UPGRADES.lucas[2].name);
  assert.equal(model.tabs.length, 4);
  assert.deepEqual(model.tabs.map((t) => t.active), [false, false, true, false]);
  // Solo se compra la siguiente: la bloqueada nunca puede comprarse.
  assert.equal(model.canBuy, false);
});

test('el nivel de cada estacion respeta los estados de upgrades.js', () => {
  for (const station of STATIONS) {
    const save = saveWith({ mejoras: { [station]: 2 } });
    for (let i = 0; i < 3; i++) {
      assert.equal(tallerModel(save, station, i).rows[i].state, upgradeState(save, station, i));
    }
  }
});

test('geometria del taller: cartel, cuatro pestañas, tres filas y boton', () => {
  assert.deepEqual(TALLER_BOX, { x: 40, y: 44, w: 400, h: 176 });
  const tabs = tallerTabRects();
  assert.equal(tabs.length, 4);
  assert.equal(tabs[0].w, 88);
  assert.equal(tabs[1].x - tabs[0].x, 94);
  // Las pestañas se apoyan arriba del cartel y no se salen de el.
  for (const tab of tabs) {
    assert.ok(tab.y < TALLER_BOX.y);
    assert.ok(tab.y + tab.h > TALLER_BOX.y);
    assert.ok(tab.x >= TALLER_BOX.x && tab.x + tab.w <= TALLER_BOX.x + TALLER_BOX.w);
  }
  const rows = tallerRowRects();
  assert.equal(rows.length, 3);
  assert.deepEqual([rows[0].x, rows[0].w, rows[0].h], [56, ROW_W, ROW_H]);
  assert.equal(rows[1].y - rows[0].y, 30);
  for (const row of rows) {
    assert.ok(row.y >= TALLER_BOX.y && row.y + row.h <= TALLER_BOX.y + TALLER_BOX.h);
    assert.ok(!pointInRect({ x: tabs[0].x + 2, y: tabs[0].y + 2 }, row), 'pestaña pisa una fila');
  }
  assert.deepEqual(BUTTON, { x: 283, y: 190, w: 96, h: 20 });
  assert.ok(pointInRect({ x: 300, y: 200 }, tallerButtonRect()));
});

test('los prompts cambian de glifo segun el dispositivo', () => {
  const mouse = tallerPrompts('mouse');
  const pad = tallerPrompts('pad');
  assert.deepEqual(mouse.map((p) => p.glyph), ['key_q', 'mouse', 'key_esc']);
  assert.deepEqual(pad.map((p) => p.glyph), ['lb', 'a', 'b']);
  assert.deepEqual(mouse.map((p) => p.label), ['Estación', 'Hacer', 'Cerrar']);
  const layout = tallerPromptLayout(ASSETS, 'mouse');
  assert.equal(layout.items.length, 3);
  // La tablita termina en el borde derecho del cartel.
  assert.equal(layout.x + layout.total, TALLER_BOX.x + TALLER_BOX.w);
  for (let i = 1; i < layout.items.length; i++) {
    assert.ok(layout.items[i].x >= layout.items[i - 1].x + layout.items[i - 1].width);
  }
});
