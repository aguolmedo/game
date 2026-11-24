// T5/B1: etiqueta flotante. placeLabel elige candidatos en orden fijo (arriba
// centrada primero) y nunca tapa al jugador ni al cursor si hay lugar.
// promptRect queda como alias de la API vieja (un solo obstáculo).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  placeLabel, placeGhostLabel, promptRect, VIEW_W, VIEW_H,
} from '../src/hud.js';

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

test('placeLabel: la escalera del living pide la etiqueta al costado derecho', () => {
  // Escalera 32x64 pegada al borde superior: x=48, y=24 en la vista (zoom 1.5),
  // marco de 48x96. Arriba no entra (minY) y abajo pisaría al jugador.
  const player = { x: 39, y: 84, w: 18, h: 45 };
  const base = { x: 48, y: 24, w: 56, h: 15, frameH: 96, frameW: 48, obstacles: [player] };
  const fallback = placeLabel(base);
  assert.ok(overlaps(fallback, { x: 24, y: 24, w: 48, h: 96 }),
    'sin side, la etiqueta se apoya sobre el dibujo de la escalera');
  const side = placeLabel({ ...base, side: 'right' });
  assert.equal(side.x, 75);
  assert.equal(side.y, 26);
  assert.ok(!overlaps(side, { x: 24, y: 24, w: 48, h: 96 }),
    'al costado no tapa la escalera');
  assert.ok(!overlaps(side, player));
  assert.ok(onScreen(side));
});

// ------------------------------------------- aviso rojo de Manos (§8)

test('placeGhostLabel: arriba de la silueta y sin tapar a Juan (mate en el piso)', () => {
  // Caso real de manos_invalido.png (zoom 1.5): Juan a la izquierda y la
  // silueta rojiza en el casillero de al lado.
  const box = { x: 257, y: 147, w: 14, h: 18 };
  const player = { x: 228, y: 114, w: 24, h: 48 };
  const w = 90;   // "No entra ahí." + panel
  const r = placeGhostLabel({ box, playerBox: player, w });
  assert.ok(onScreen(r), `fuera de pantalla: ${JSON.stringify(r)}`);
  assert.ok(!overlaps(r, player), 'la etiqueta tapa a Juan');
  assert.ok(r.y + r.h <= box.y, 'la etiqueta no queda arriba de la silueta');
});

test('placeGhostLabel: arriba de la silla, corrida de Juan (taparía el paso)', () => {
  const box = { x: 252, y: 132, w: 24, h: 36 };
  const player = { x: 228, y: 87, w: 24, h: 48 };
  const w = 108;  // "Taparía el paso." + panel
  const r = placeGhostLabel({ box, playerBox: player, w });
  assert.ok(onScreen(r), `fuera de pantalla: ${JSON.stringify(r)}`);
  assert.ok(!overlaps(r, player), 'la etiqueta tapa a Juan');
  assert.ok(r.y + r.h <= box.y, 'la etiqueta no queda arriba de la silueta');
});

test('placeGhostLabel: sin Juan cerca, va centrada arriba de la silueta', () => {
  const box = { x: 200, y: 120, w: 14, h: 18 };
  const r = placeGhostLabel({ box, w: 90 });
  assert.deepEqual(r, { x: 162, y: 102, w: 90, h: 15 });
});
