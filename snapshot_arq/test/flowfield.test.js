// Flow field BFS de la IA de la arena (análisis A1–A7, sección 1.2).
// Contrato de src/arena/flowfield.js: máscara de sólidos, BFS desde la baldosa
// del jugador, vector de flujo, alcanzabilidad y máscara ancha para el acorazado.
// Puro: sin DOM ni three. Índice de baldosa = ty * cols + tx.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FLOW_INF,
  TILE,
  buildSolidMask,
  buildBoxMask,
  nearestFree,
  createField,
  rebuild,
  flowVector,
  isReachableAt,
  widenMask,
} from '../src/arena/flowfield.js';

const at = (cols, tx, ty) => ty * cols + tx;

// Escenario en U: techo y dos paredes, abierto al sur. El jugador está al norte.
const U_SOLIDS = [
  { x: 96, y: 64, w: 96, h: 16 }, // techo
  { x: 96, y: 64, w: 16, h: 64 }, // pared izquierda
  { x: 176, y: 64, w: 16, h: 64 }, // pared derecha
];

function emptyMask(cols, rows) {
  return new Uint8Array(cols * rows);
}

test('flowfield: TILE es 16 y FLOW_INF marca sin camino', () => {
  assert.equal(TILE, 16);
  assert.equal(FLOW_INF, 0xffff);
});

test('buildSolidMask: una caja de 16x16 marca solo su baldosa', () => {
  const cols = 8;
  const rows = 8;
  const mask = buildSolidMask(cols, rows, [{ x: 16, y: 16, w: 16, h: 16 }]);
  assert.ok(mask instanceof Uint8Array);
  assert.equal(mask.length, cols * rows);
  assert.equal(mask[at(cols, 1, 1)], 1);
  for (let ty = 0; ty < rows; ty += 1) {
    for (let tx = 0; tx < cols; tx += 1) {
      if (tx === 1 && ty === 1) continue;
      assert.equal(mask[at(cols, tx, ty)], 0, `(${tx},${ty}) debe quedar libre`);
    }
  }
});

test('buildSolidMask: una caja que cruza media baldosa marca las dos', () => {
  const cols = 8;
  const rows = 8;
  const mask = buildSolidMask(cols, rows, [{ x: 8, y: 8, w: 16, h: 16 }]);
  assert.equal(mask[at(cols, 0, 0)], 1);
  assert.equal(mask[at(cols, 1, 0)], 1);
  assert.equal(mask[at(cols, 0, 1)], 1);
  assert.equal(mask[at(cols, 1, 1)], 1);
  assert.equal(mask[at(cols, 2, 2)], 0);
});

test('buildSolidMask: una caja fuera del mapa no rompe', () => {
  const cols = 8;
  const rows = 8;
  const mask = buildSolidMask(cols, rows, [{ x: 1000, y: 1000, w: 16, h: 16 }]);
  assert.ok(mask instanceof Uint8Array);
  assert.equal(mask.length, cols * rows);
  // Del mismo modo, una que entra media baldosa desde el borde se recorta.
  const clipped = buildSolidMask(cols, rows, [{ x: -8, y: -8, w: 16, h: 16 }]);
  assert.equal(clipped[at(cols, 0, 0)], 1);
  assert.equal(clipped[at(cols, 1, 0)], 0);
  assert.equal(clipped[at(cols, 0, 1)], 0);
});

test('buildBoxMask: un objeto bajo no cierra la baldosa (el cuerpo cabe más arriba)', () => {
  const cols = 4;
  const rows = 4;
  // Caja de 12x8. En la baldosa (1,1) hay una franja de 4 px en su parte baja:
  // con los pies abajo el cuerpo choca, pero más arriba entra. La baldosa debe
  // quedar caminable (antes la del propio jugador se marcaba sólida).
  const mask = buildBoxMask(cols, rows, [{ x: 16, y: 24, w: 12, h: 4 }], { w: 12, h: 8 });
  assert.equal(mask[at(cols, 1, 1)], 0);
  // Una pared que ocupa toda la altura sí cierra la baldosa.
  const wall = buildBoxMask(cols, rows, [{ x: 16, y: 16, w: 12, h: 16 }], { w: 12, h: 8 });
  assert.equal(wall[at(cols, 1, 1)], 1);
});

test('rebuild: allowBlockedSeed siembra igual en la baldosa del jugador', () => {
  const cols = 8;
  const rows = 8;
  const mask = new Uint8Array(cols * rows).fill(1);
  mask[at(cols, 5, 5)] = 0;
  const field = createField(cols, rows);
  // Sin permiso, cae en la libre más cercana.
  assert.equal(rebuild(field, mask, 2, 2), true);
  assert.equal(field.seed, at(cols, 5, 5));
  // Con permiso, la semilla es la baldosa pedida aunque la máscara la vea dura.
  const forced = createField(cols, rows);
  assert.equal(rebuild(forced, mask, 2, 2, true), true);
  assert.equal(forced.seed, at(cols, 2, 2));
  assert.equal(forced.dist[at(cols, 2, 2)], 0);
});

test('nearestFree: encuentra la única baldosa libre en un anillo', () => {
  const cols = 8;
  const rows = 8;
  const mask = new Uint8Array(cols * rows).fill(1);
  mask[at(cols, 3, 3)] = 0;
  assert.equal(nearestFree(mask, cols, rows, 0, 0), at(cols, 3, 3));
  // No considera la propia baldosa: desde (3,3) con r=1 no hay nada.
  assert.equal(nearestFree(mask, cols, rows, 3, 3, 1), -1);
});

test('nearestFree: con todo sólido devuelve -1', () => {
  const cols = 8;
  const rows = 8;
  const mask = new Uint8Array(cols * rows).fill(1);
  assert.equal(nearestFree(mask, cols, rows, 4, 4), -1);
});

test('rebuild: distancias BFS y parent hacia la semilla', () => {
  const cols = 8;
  const rows = 8;
  const mask = emptyMask(cols, rows);
  const field = createField(cols, rows);
  assert.equal(field.cols, cols);
  assert.equal(field.rows, rows);
  assert.equal(field.seed, -1);
  assert.equal(rebuild(field, mask, 2, 2), true);
  assert.equal(field.seed, at(cols, 2, 2));
  assert.equal(field.dist[at(cols, 2, 2)], 0);
  assert.equal(field.parent[at(cols, 2, 2)], -1);
  // BFS de 4 vecinos = distancia Manhattan.
  assert.equal(field.dist[at(cols, 5, 2)], 3);
  assert.equal(field.dist[at(cols, 5, 5)], 6);
  assert.equal(field.dist[at(cols, 0, 0)], 4);
  assert.equal(field.parent[at(cols, 3, 2)], at(cols, 2, 2));
});

test('rebuild: con la máscara toda sólida devuelve false', () => {
  const cols = 8;
  const rows = 8;
  const mask = new Uint8Array(cols * rows).fill(1);
  const field = createField(cols, rows);
  assert.equal(rebuild(field, mask, 2, 2), false);
});

test('rebuild + flowVector: bolsillo en U, el interior sale hacia el sur', () => {
  const cols = 20;
  const rows = 10;
  const mask = buildSolidMask(cols, rows, U_SOLIDS);
  const field = createField(cols, rows);
  // Jugador en (136,40) -> baldosa (8,2).
  assert.equal(rebuild(field, mask, Math.floor(136 / TILE), Math.floor(40 / TILE)), true);
  assert.equal(field.seed, at(cols, 8, 2));
  // El techo corta el paso hacia el interior.
  assert.equal(field.dist[at(cols, 8, 4)], FLOW_INF);
  // El interior del bolsillo (136,100) es alcanzable...
  assert.equal(isReachableAt(field, 136, 100), true);
  // ...y el flujo apunta a salir (hacia el sur, o sea y positivo).
  const v = flowVector(field, 136, 100);
  assert.ok(v, 'debe haber vector en el interior del bolsillo');
  assert.ok(v.y > 0.9, `debe apuntar al sur, llegó ${JSON.stringify(v)}`);
});

test('flowVector: null en la semilla y unitario en una vecina', () => {
  const cols = 8;
  const rows = 8;
  const mask = emptyMask(cols, rows);
  const field = createField(cols, rows);
  rebuild(field, mask, 2, 2);
  // En la baldosa semilla el parent es -1: no hay a dónde ir.
  assert.equal(flowVector(field, 2 * TILE + 8, 2 * TILE + 12), null);
  // Una vecina apunta a la semilla, que está a la izquierda.
  const v = flowVector(field, 3 * TILE + 8, 2 * TILE + 12);
  assert.ok(v, 'la vecina debe tener vector');
  assert.ok(Math.abs(Math.hypot(v.x, v.y) - 1) < 1e-6, 'el vector debe ser unitario');
  assert.ok(v.x < 0, 'debe apuntar hacia la semilla (izquierda)');
});

test('flowfield: dos campos construidos igual dan dist y parent idénticos', () => {
  const cols = 20;
  const rows = 10;
  const build = () => {
    const mask = buildSolidMask(cols, rows, U_SOLIDS);
    const field = createField(cols, rows);
    rebuild(field, mask, 8, 2);
    return field;
  };
  const a = build();
  const b = build();
  assert.deepEqual(Array.from(a.dist), Array.from(b.dist));
  assert.deepEqual(Array.from(a.parent), Array.from(b.parent));
});

// Pasillo vertical en la columna x=4: paredes a los costados. Con minRun=2 la
// máscara ancha cierra el pasillo de 1 baldosa y deja pasar el de 2.
function corridorMask(cols, rows, leftWall, rightWall) {
  const mask = emptyMask(cols, rows);
  for (let y = 0; y < rows; y += 1) {
    mask[at(cols, leftWall, y)] = 1;
    mask[at(cols, rightWall, y)] = 1;
  }
  return mask;
}

test('widenMask: un pasillo vertical de 1 baldosa queda cerrado', () => {
  const cols = 9;
  const rows = 9;
  const mask = corridorMask(cols, rows, 3, 5); // pasillo solo en x=4
  const wide = widenMask(mask, cols, rows);
  for (let y = 0; y < rows; y += 1) {
    assert.equal(wide[at(cols, 4, y)], 1, `la baldosa (4,${y}) debe quedar cerrada`);
  }
  // Las zonas abiertas a los costados siguen libres.
  assert.equal(wide[at(cols, 1, 1)], 0);
});

test('widenMask: un pasillo vertical de 2 baldosas queda abierto', () => {
  const cols = 9;
  const rows = 9;
  const mask = corridorMask(cols, rows, 3, 6); // pasillo en x=4 y x=5
  const wide = widenMask(mask, cols, rows);
  for (let y = 0; y < rows; y += 1) {
    assert.equal(wide[at(cols, 4, y)], 0, `la baldosa (4,${y}) debe quedar libre`);
    assert.equal(wide[at(cols, 5, y)], 0, `la baldosa (5,${y}) debe quedar libre`);
  }
});

test('máscara ancha + rebuild: el pasillo angosto no se alcanza', () => {
  const cols = 9;
  const rows = 9;
  const seedX = 4;
  const seedY = 2;

  // Pasillo de 1: cerrado por la máscara ancha. Se mira desde (72,40), que cae
  // en el pasillo: ninguna baldosa del radio 1 es alcanzable.
  const thin = widenMask(corridorMask(cols, rows, 3, 5), cols, rows);
  const f1 = createField(cols, rows);
  assert.equal(rebuild(f1, thin, seedX, seedY), true);
  assert.equal(isReachableAt(f1, 72, 40), false);

  // Pasillo de 2: abierto; el mismo punto queda alcanzable.
  const wide = widenMask(corridorMask(cols, rows, 3, 6), cols, rows);
  const f2 = createField(cols, rows);
  assert.equal(rebuild(f2, wide, seedX, seedY), true);
  assert.equal(f2.seed, at(cols, seedX, seedY));
  assert.equal(isReachableAt(f2, 72, 40), true);
});
