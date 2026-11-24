// DIAGNÓSTICO (no toca el juego): mide el steering nuevo de src/arena/enemies.js
// (flow field BFS + separación + desatascador) en escenarios de grilla.
// Uso: node tools/diag/enemy_stuck.mjs
import { createEnemy, steer, biteReach } from '../../src/arena/enemies.js';
import { buildSolidMask, createField, rebuild, FLOW_INF } from '../../src/arena/flowfield.js';

const DT = 1 / 60;
const RNG = () => 0.5; // fase de animación fija: el diagnóstico no depende del azar
const SLACK = 4; // margen sobre el alcance de mordida para dar por "llegó"
const tile = (tx, ty, w = 1, h = 1) => ({ x: tx * 16, y: ty * 16, w: w * 16, h: h * 16 });

function wall(tx, ty0, ty1) { return { x: tx * 16, y: ty0 * 16, w: 16, h: (ty1 - ty0) * 16 }; }

// Flow field con semilla en la baldosa del jugador (pies).
function flowFor(cols, rows, solids, player) {
  const mask = buildSolidMask(cols, rows, solids);
  const field = createField(cols, rows);
  rebuild(field, mask, Math.floor(player.x / 16), Math.floor(player.feet / 16));
  return field;
}

// Distancia del field en la baldosa (x,y) en px; null si no hay ruta o no se puede leer.
function fieldDist(field, x, y) {
  const dist = field && field.dist;
  const cols = field && field.cols;
  if (!dist || !cols) return null;
  const d = dist[Math.floor(y / 16) * cols + Math.floor(x / 16)];
  return d === undefined || d === FLOW_INF ? null : d;
}

function runOne(e, player, solids, seconds = 12, flow = null) {
  const reach = biteReach(e) + SLACK;
  const d0 = Math.hypot(e.x - player.x, e.y - player.feet);
  let minD = d0;
  let stuckFrames = 0;
  let lastX = e.x; let lastY = e.y;
  let movedTotal = 0;
  let secondsToArrive = null;
  const frames = seconds / DT;
  for (let i = 0; i < frames; i++) {
    steer(e, player, [], solids, DT, flow);
    const d = Math.hypot(e.x - player.x, e.y - player.feet);
    minD = Math.min(minD, d);
    if (secondsToArrive === null && d <= reach) secondsToArrive = +(i * DT).toFixed(2);
    const moved = Math.hypot(e.x - lastX, e.y - lastY);
    movedTotal += moved;
    if (moved < 0.05) stuckFrames++;
    lastX = e.x; lastY = e.y;
  }
  const d1 = Math.hypot(e.x - player.x, e.y - player.feet);
  return {
    start: +d0.toFixed(1), end: +d1.toFixed(1), min: +minD.toFixed(1),
    movedTotal: +movedTotal.toFixed(1), stuckPct: +(100 * stuckFrames / frames).toFixed(1),
    llego: secondsToArrive !== null, seconds: secondsToArrive,
    x: +e.x.toFixed(1), y: +e.y.toFixed(1),
  };
}

const out = {};
// A) Muro infinito: el bicho nunca puede llegar (no hay rodeo posible).
{
  const e = createEnemy('cascarudo', 120, 100, RNG);
  const player = { x: 200, feet: 108 };
  const solids = [wall(10, -100, 100)]; // x160..176, y -1600..1600
  out.muroInfinito = runOne(e, player, solids, 12, flowFor(40, 24, solids, player));
}
// B) Muro finito de 8 baldosas: debería rodearlo.
{
  const e = createEnemy('cascarudo', 120, 100, RNG);
  const player = { x: 200, feet: 108 };
  const solids = [wall(10, 2, 10)]; // y32..160
  out.muro8 = runOne(e, player, solids, 12, flowFor(40, 24, solids, player));
}
// C) Bolsillo en U (abierto al sur, jugador al norte). El bicho debe salir solo.
{
  const solids = [
    { x: 96, y: 64, w: 96, h: 16 },   // techo
    { x: 96, y: 64, w: 16, h: 64 },   // pared izq
    { x: 176, y: 64, w: 16, h: 64 },  // pared der
  ];
  const enemy = createEnemy('casc', 136, 110, RNG);
  const player = { x: 136, feet: 40 };
  const field = flowFor(24, 16, solids, player);
  const u = runOne(enemy, player, solids, 20, field);
  u.fieldInicio = fieldDist(field, 136, 110);
  out.bolsilloU = u;
}
// D) Pasillo de 3 baldosas, 10 bichos en fila, jugador al final.
{
  const solids = [
    { x: 0, y: 0, w: 320, h: 16 },      // pared norte
    { x: 0, y: 64, w: 320, h: 16 },     // pared sur (pasillo y 16..64 => 48px)
  ];
  const enemies = [];
  for (let i = 0; i < 10; i++) enemies.push(createEnemy('cascarudo', 30 + i * 24, 48, RNG));
  const player = { x: 300, feet: 52 };
  const field = flowFor(20, 5, solids, player);
  let overlapsFrames = 0;
  const startD = enemies.map((e) => Math.hypot(e.x - player.x, e.y - player.feet));
  const startPos = enemies.map((e) => ({ x: e.x, y: e.y }));
  let movedTotal = enemies.map(() => 0);
  for (let f = 0; f < 15 / DT; f++) {
    for (const e of enemies) steer(e, player, enemies, solids, DT, field);
    for (let i = 0; i < enemies.length; i++) for (let j = i + 1; j < enemies.length; j++) {
      const a = enemies[i]; const b = enemies[j];
      if (Math.hypot(a.x - b.x, (a.y - a.h / 2) - (b.y - b.h / 2)) < (a.radius + b.radius) * 0.6) overlapsFrames++;
    }
  }
  movedTotal = enemies.map((e, i) => +Math.hypot(e.x - startPos[i].x, e.y - startPos[i].y).toFixed(1));
  const arrived = enemies.filter((e) => Math.hypot(e.x - player.x, e.y - player.feet) <= biteReach(e) + SLACK).length;
  const frozen = movedTotal.filter((m) => m < 4).length;
  out.pasillo10 = {
    arrived,
    frozen,
    cameClose: enemies.map((e, i) => +(startD[i] - Math.hypot(e.x - player.x, e.y - player.feet)).toFixed(1)),
    movedTotal,
    overlapPairsFrames: overlapsFrames,
    positions: enemies.map((e) => [+e.x.toFixed(1), +e.y.toFixed(1)]),
  };
}
// D2) 40 cascarudos en un pasillo de 48 px: todos deben moverse y llegar hasta Juan.
{
  const solids = [
    { x: 0, y: 0, w: 640, h: 16 },      // pared norte
    { x: 0, y: 64, w: 640, h: 16 },     // pared sur (pasillo y 16..64 => 48px)
  ];
  const enemies = [];
  for (let i = 0; i < 40; i++) enemies.push(createEnemy('cascarudo', 24 + (i % 20) * 30, i < 20 ? 32 : 52, RNG));
  const player = { x: 620, feet: 48 };
  const field = flowFor(40, 5, solids, player);
  const startPos = enemies.map((e) => ({ x: e.x, y: e.y }));
  for (let f = 0; f < 20 / DT; f++) for (const e of enemies) steer(e, player, enemies, solids, DT, field);
  const moved = enemies.filter((e, i) => Math.hypot(e.x - startPos[i].x, e.y - startPos[i].y) >= 8).length;
  const arrived = enemies.filter((e) => Math.hypot(e.x - player.x, e.y - player.feet) <= biteReach(e) + SLACK).length;
  out.pasillo40 = { moved, arrived, total: enemies.length };
}
// E) 40 bichos en campo abierto, jugador en el centro: separación y llegada.
{
  const enemies = [];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    enemies.push(createEnemy(i % 5 === 0 ? 'acorazado' : 'cascarudo', 200 + Math.cos(a) * 180, 300 + Math.sin(a) * 180, RNG));
  }
  const player = { x: 200, feet: 300 };
  const field = flowFor(40, 40, [], player);
  for (let f = 0; f < 15 / DT; f++) for (const e of enemies) steer(e, player, enemies, [], DT, field);
  const reached = enemies.filter((e) => Math.hypot(e.x - player.x, e.y - player.feet) <= biteReach(e) + 4).length;
  let minPair = Infinity;
  for (let i = 0; i < enemies.length; i++) for (let j = i + 1; j < enemies.length; j++) {
    minPair = Math.min(minPair, Math.hypot(enemies[i].x - enemies[j].x, (enemies[i].y - enemies[i].h / 2) - (enemies[j].y - enemies[j].h / 2)));
  }
  out.campo40 = { reached, minPairDistance: +minPair.toFixed(1), radiusSumMin: 18 };
}
// F) Costo por frame con la cantidad real de sólidos (1558) y 40 bichos.
{
  const solids = [];
  for (let y = 0; y < 40; y++) for (let x = 0; x < 80; x++) {
    const name = ((x * 7 + y * 3) % 11);
    if (name < 4) solids.push(tile(x, y));
  }
  const enemies = [];
  for (let i = 0; i < 40; i++) enemies.push(createEnemy(i % 7 === 0 ? 'acorazado' : 'cascarudo', 400 + (i % 8) * 40, 320 + Math.floor(i / 8) * 40, RNG));
  const player = { x: 640, feet: 320 };
  const field = flowFor(80, 40, solids, player); // se arma una vez, fuera del cronómetro
  for (let i = 0; i < 60; i++) for (const e of enemies) steer(e, player, enemies, solids, DT, field); // warmup
  const t0 = performance.now();
  const FRAMES = 300;
  for (let f = 0; f < FRAMES; f++) for (const e of enemies) steer(e, player, enemies, solids, DT, field);
  const ms = performance.now() - t0;
  out.costo = {
    solids: solids.length,
    enemies: enemies.length,
    msPerFrameIA: +(ms / FRAMES).toFixed(3),
    usPerEnemy: +((ms / FRAMES / enemies.length) * 1000).toFixed(1),
  };
}
console.log(JSON.stringify(out, null, 2));

const u = out.bolsilloU;
const p40 = out.pasillo40;
console.log(`U: ${u.llego ? 'LLEGA' : 'NO LLEGA'} en ${u.llego ? u.seconds : '>20'}s | pasillo 40: ${p40.moved}/40 se movieron, ${p40.arrived}/40 llegaron`);
process.exitCode = (u.llego && u.seconds < 20 && p40.moved === 40) ? 0 : 1;
