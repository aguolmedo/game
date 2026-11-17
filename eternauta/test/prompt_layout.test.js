// T5/B1: etiqueta flotante. placeLabel elige candidatos en orden fijo (arriba
// centrada primero) y nunca tapa al jugador ni al cursor si hay lugar.
// promptRect queda como alias de la API vieja (un solo obstáculo).
import test from 'node:test';
import assert from 'node:assert/strict';
import { placeLabel, promptRect, VIEW_W, VIEW_H } from '../src/hud.js';

const BASE = { w: 60, h: 15, frameH: 32 };
const MIN_Y = 18;

function overlaps(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** "En pantalla": el último recurso puede quedar sobre la franja del HUD. */
function onScreen(r) {
  return r.x >= 4 && r.x + r.w <= VIEW_W - 4
    && r.y >= MIN_Y && r.y + r.h <= VIEW_H - 4;
}

/** Candidato "válido": entra en la franja del brief y no pisa un obstáculo. */
function fits(r, obstacles) {
  return r.x >= 4 && r.x + r.w <= VIEW_W - 4
    && r.y >= MIN_Y && r.y + r.h <= VIEW_H - 72
    && !obstacles.some((ob) => overlaps(r, ob));
}

/** Candidatos del brief, en su orden (para chequear el invariante). */
function candidatesFor(x, y, obstacles, base = BASE) {
  const { w, h, frameH } = base;
  const clampX = (bx) => Math.max(4, Math.min(VIEW_W - w - 4, Math.round(bx)));
  const cx = clampX(x - w / 2);
  const above = Math.round(y - 3 - h);
  const list = [{ x: cx, y: above, w, h }];
  const hit = obstacles.find((ob) => overlaps(list[0], ob));
  if (hit) {
    list.push({ x: clampX(hit.x + hit.w + 2), y: above, w, h });
    list.push({ x: clampX(hit.x - w - 2), y: above, w, h });
    list.push({ x: cx, y: Math.round(hit.y - 3 - h), w, h });
  }
  list.push({ x: cx, y: Math.round(y + frameH + 3), w, h });
  return list;
}

// ------------------------------------------------------------- placeLabel

test('placeLabel: por defecto va arriba centrada', () => {
  const r = placeLabel({ x: 240, y: 120, ...BASE });
  assert.deepEqual(r, { x: 210, y: 102, w: 60, h: 15 });
});

test('placeLabel: cerca del borde superior cae abajo del marco', () => {
  const r = placeLabel({ x: 240, y: 20, ...BASE });
  assert.equal(r.y, 20 + 32 + 3);
});

test('placeLabel: clamp horizontal a la pantalla', () => {
  assert.equal(placeLabel({ x: 2, y: 120, ...BASE }).x, 4);
  assert.equal(placeLabel({ x: VIEW_W - 2, y: 120, ...BASE }).x, VIEW_W - 60 - 4);
});

test('placeLabel: esquiva al jugador y al cursor, sin irse abajo', () => {
  const player = { x: 200, y: 100, w: 12, h: 30 };
  const cursor = { x: 232, y: 96, w: 14, h: 16 };
  const r = placeLabel({ x: 240, y: 120, ...BASE, obstacles: [player, cursor] });
  assert.ok(!overlaps(r, player), 'no pisa a Juan');
  assert.ok(!overlaps(r, cursor), 'no pisa el cursor');
  assert.ok(r.y < 120, 'sigue arriba del marco');
  assert.ok(onScreen(r));
});

// ------------------------------------------------------------ promptRect

test('promptRect: por defecto va centrada arriba del marco', () => {
  const r = promptRect({ x: 240, y: 120, ...BASE });
  assert.deepEqual(r, { x: 210, y: 102, w: 60, h: 15 });
});

test('promptRect: cerca del borde superior cae abajo del marco', () => {
  const r = promptRect({ x: 240, y: 20, ...BASE });
  assert.equal(r.y, 20 + 32 + 3);
});

test('promptRect: clamp horizontal a la pantalla', () => {
  assert.equal(promptRect({ x: 2, y: 120, ...BASE }).x, 4);
  assert.equal(promptRect({ x: VIEW_W - 2, y: 120, ...BASE }).x, VIEW_W - 60 - 4);
});

test('promptRect: si pisa al jugador se corre de costado, nunca abajo', () => {
  // La etiqueta de arriba caería justo encima de la caja del jugador.
  const avoid = { x: 200, y: 100, w: 20, h: 30 };
  const r = promptRect({ x: 240, y: 120, ...BASE, avoid });
  assert.ok(r.y < 120, 'sigue arriba del marco');
  assert.ok(!overlaps(r, avoid), 'no pisa al jugador');
  assert.ok(r.y >= 18 && r.y + r.h <= VIEW_H - 4);
});

// --------------------------------------------------------------- barridos

test('barrido objeto × jugador: siempre en pantalla y sin tapar a Juan si hay lugar', () => {
  let checked = 0;
  for (let oy = 0; oy <= VIEW_H; oy += 16) {
    for (let ox = 0; ox <= VIEW_W; ox += 16) {
      // El cursor está sobre el objeto, como en el juego.
      const cursor = { x: ox - 2, y: oy - 2, w: 14, h: 16 };
      for (let py = 0; py <= VIEW_H; py += 16) {
        for (let px = 0; px <= VIEW_W; px += 16) {
          const player = { x: px, y: py, w: 12, h: 30 };
          const obstacles = [player, cursor];
          const r = placeLabel({ x: ox, y: oy, ...BASE, obstacles });
          assert.ok(onScreen(r), `fuera de pantalla: ${JSON.stringify(r)}`);
          if (candidatesFor(ox, oy, obstacles).some((c) => fits(c, obstacles))) {
            assert.ok(!obstacles.some((ob) => overlaps(r, ob)),
              `pisa un obstáculo (objeto ${ox},${oy}; jugador ${px},${py})`);
          }
          checked += 1;
        }
      }
    }
  }
  assert.ok(checked > 0, 'el barrido corrió');
});

test('barrido objeto × cursor: el puntero nunca queda tapado si hay lugar', () => {
  let checked = 0;
  for (let oy = 0; oy <= VIEW_H; oy += 16) {
    for (let ox = 0; ox <= VIEW_W; ox += 16) {
      // Juan está justo debajo del marco del objeto (caso normal de uso).
      const player = { x: ox - 6, y: oy + 4, w: 12, h: 30 };
      for (let cy = 0; cy <= VIEW_H; cy += 16) {
        for (let cx = 0; cx <= VIEW_W; cx += 16) {
          const cursor = { x: cx - 2, y: cy - 2, w: 14, h: 16 };
          const obstacles = [player, cursor];
          const r = placeLabel({ x: ox, y: oy, ...BASE, obstacles });
          assert.ok(onScreen(r), `fuera de pantalla: ${JSON.stringify(r)}`);
          if (candidatesFor(ox, oy, obstacles).some((c) => fits(c, obstacles))) {
            assert.ok(!obstacles.some((ob) => overlaps(r, ob)),
              `pisa un obstáculo (objeto ${ox},${oy}; cursor ${cx},${cy})`);
          }
          checked += 1;
        }
      }
    }
  }
  assert.ok(checked > 0, 'el barrido corrió');
});
