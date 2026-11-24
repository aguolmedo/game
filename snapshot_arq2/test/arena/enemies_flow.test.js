// Steering de los bichos con flow field (análisis A1–A7, sección 1.2).
// Simulaciones puras (sin DOM ni three): el bicho tiene que rodear paredes,
// no congelarse en un pasillo y llegar al jugador.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createEnemy, steer, biteReach } from '../../src/arena/enemies.js';
import {
  buildSolidMask, widenMask, createField, rebuild, TILE,
} from '../../src/arena/flowfield.js';

const DT = 1 / 60;

// Escenario en U: techo y dos paredes, abierto al sur.
const U_SOLIDS = [
  { x: 96, y: 64, w: 96, h: 16 }, // techo
  { x: 96, y: 64, w: 16, h: 64 }, // pared izquierda
  { x: 176, y: 64, w: 16, h: 64 }, // pared derecha
];

/** Campo BFS con semilla en la baldosa (seedX, seedY). */
function buildField(cols, rows, solids, seedX, seedY, wide = false) {
  let mask = buildSolidMask(cols, rows, solids);
  if (wide) mask = widenMask(mask, cols, rows, 2);
  const field = createField(cols, rows);
  rebuild(field, mask, seedX, seedY);
  return field;
}

test('bolsillo en U: el cascarudo llega al jugador en menos de 20 s', () => {
  const cols = 20;
  const rows = 10;
  const player = { x: 136, feet: 40 };
  const field = buildField(cols, rows, U_SOLIDS,
    Math.floor(player.x / TILE), Math.floor(player.feet / TILE));
  const e = createEnemy('cascarudo', 136, 110, () => 0.5);

  const frames = Math.round(20 / DT);
  let frozen = 0;
  let lastX = e.x;
  let lastY = e.y;
  for (let f = 0; f < frames; f += 1) {
    steer(e, player, [e], U_SOLIDS, DT, field);
    if (Math.hypot(e.x - lastX, e.y - lastY) < 0.05) frozen += 1;
    lastX = e.x;
    lastY = e.y;
  }

  const d = Math.hypot(e.x - player.x, e.y - player.feet);
  assert.ok(d <= biteReach(e) + 4, `debió llegar; quedó a ${d.toFixed(1)} px`);
  const frozenPct = (100 * frozen) / frames;
  assert.ok(frozenPct < 20, `se congeló el ${frozenPct.toFixed(1)}% de los frames`);
});

test('40 bichos en un pasillo no se congelan y llegan al jugador', () => {
  const cols = 40;
  const rows = 6;
  // Pasillo horizontal libre entre y=16 y y=64 (filas 1 a 3).
  const solids = [
    { x: 0, y: 0, w: 640, h: 16 },
    { x: 0, y: 64, w: 640, h: 32 },
  ];
  const player = { x: 620, feet: 48 };
  const field = buildField(cols, rows, solids,
    Math.floor(player.x / TILE), Math.floor(player.feet / TILE));

  const enemies = [];
  for (let i = 0; i < 40; i += 1) {
    enemies.push(createEnemy(
      'cascarudo',
      20 + (i % 20) * 14,
      30 + Math.floor(i / 20) * 12,
      () => 0.5,
    ));
  }
  const start = enemies.map((e) => ({ x: e.x, y: e.y }));

  const frames = Math.round(20 / DT);
  for (let f = 0; f < frames; f += 1) {
    for (const e of enemies) steer(e, player, enemies, solids, DT, field);
  }

  let moved = 0;
  let arrived = 0;
  for (let i = 0; i < enemies.length; i += 1) {
    const e = enemies[i];
    if (Math.hypot(e.x - start[i].x, e.y - start[i].y) >= 8) moved += 1;
    if (Math.hypot(e.x - player.x, e.y - player.feet) <= biteReach(e) + 8) arrived += 1;
    // No atravesaron las paredes norte/sur.
    assert.ok(e.y >= 16 - 1, `el bicho ${i} salió por arriba (y=${e.y.toFixed(1)})`);
    assert.ok(e.y <= 64 + 1, `el bicho ${i} salió por abajo (y=${e.y.toFixed(1)})`);
  }
  assert.equal(moved, 40, `solo se movieron ${moved}/40 bichos`);
  assert.ok(arrived >= 30, `solo llegaron ${arrived}/40 bichos`);
});

test('línea de vista: cerca y sin obstáculos va derecho', () => {
  const cols = 20;
  const rows = 12;
  const player = { x: 140, feet: 100 };
  const field = buildField(cols, rows, [],
    Math.floor(player.x / TILE), Math.floor(player.feet / TILE));
  const e = createEnemy('cascarudo', 100, 100, () => 0.5);

  for (let f = 0; f < 30; f += 1) steer(e, player, [e], [], DT, field);

  assert.ok(Math.abs(e.y - 100) < 1.5, `no debía desviarse en Y (y=${e.y.toFixed(2)})`);
  assert.ok(e.x > 100, `debió avanzar hacia el jugador (x=${e.x.toFixed(2)})`);
});

test('sin flow no devuelve NaN y respeta la pared', () => {
  const solids = [{ x: 0, y: 0, w: 400, h: 16 }]; // pared norte
  const player = { x: 100, feet: 10 };
  const e = createEnemy('cascarudo', 100, 40, () => 0.5);

  for (let f = 0; f < 120; f += 1) steer(e, player, [e], solids, DT);

  assert.ok(Number.isFinite(e.x) && Number.isFinite(e.y), 'la posición debe ser finita');
  assert.ok(e.y >= 16, `no debe atravesar la pared (y=${e.y.toFixed(2)})`);
});

test('desatascador: bloqueado en un solo eje, pega un empujón lateral', () => {
  // Poste justo delante. El flujo va recto al este (el eje Y no se mueve), así
  // que el chequeo viejo `blockedX && blockedY` nunca despertaba: el bicho
  // quedaba pegado a 1 px del poste para siempre. Ahora, al no avanzar, tiene
  // que apartarse en Y (empujón lateral) en menos de 2 s.
  const cols = 20;
  const rows = 8;
  const player = { x: 240, feet: 60 };
  const field = buildField(cols, rows, [],
    Math.floor(player.x / TILE), Math.floor(player.feet / TILE));
  const solids = [{ x: 48, y: 56, w: 4, h: 8 }];
  const e = createEnemy('cascarudo', 40, 60, () => 0.5);

  let maxSide = 0;
  for (let f = 0; f < Math.round(2 / DT); f += 1) {
    steer(e, player, [e], solids, DT, field);
    maxSide = Math.max(maxSide, Math.abs(e.y - 60));
  }

  assert.ok(maxSide > 8,
    `debió apartarse en Y; máximo lateral ${maxSide.toFixed(1)} px`);
});

test('determinismo: dos corridas iguales dan las mismas posiciones', () => {
  const run = () => {
    const player = { x: 136, feet: 40 };
    const field = buildField(20, 10, U_SOLIDS,
      Math.floor(player.x / TILE), Math.floor(player.feet / TILE));
    const e = createEnemy('cascarudo', 136, 110, () => 0.5);
    for (let f = 0; f < Math.round(3 / DT); f += 1) {
      steer(e, player, [e], U_SOLIDS, DT, field);
    }
    return { x: e.x, y: e.y };
  };
  const a = run();
  const b = run();
  assert.ok(Math.abs(a.x - b.x) < 1e-9, `x difiere: ${a.x} vs ${b.x}`);
  assert.ok(Math.abs(a.y - b.y) < 1e-9, `y difiere: ${a.y} vs ${b.y}`);
});
