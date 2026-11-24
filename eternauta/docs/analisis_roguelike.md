# Análisis a fondo del roguelike — El Eternauta

**Fecha:** 22/11/2026 · **Alcance:** todo el juego, con foco en el roguelike nuevo
(`src/run/*`, `src/maps/barrio/*`, `src/scenes/arena.js`, `src/arena/*`,
`src/scenes/prologue.js`, `src/taller.js`, `src/base.js`, `src/scenes/garage.js`).

**Esto es solo análisis.** No se modificó ni un archivo del juego. Lo único que se
agregó son scripts de diagnóstico en `tools/diag/` y capturas `docs/capturas/diag_*`.
Línea base verificada antes de empezar: `npm test` → **659 pass, 0 fail**;
`npm run build` → OK (95 módulos). Al final se volvió a correr: sigue igual.

## Cómo se verificó (y qué no)

- Lectura completa de los módulos nuevos y de las zonas calientes de `world.js`,
  `menus.js`, `main.js`, `mapView.js`, `sprite.js`, `snow.js`, `footprints.js`,
  `lighting.js` y `arena/*`.
- Cálculos con Node sobre el barrio real (`buildBarrio(seed)`): sólidos, BFS,
  conectividad, componentes por tamaño de bicho, spawns, botín, layout.
- Auditoría objeto por objeto de 49 instancias representativas (autos, vagón,
  paredes, verjas, casas, árboles, bancos, baranda, cartel, cajas): ~10 coinciden
  razonablemente, ~25 están desplazadas 2-10 px y ~10 tienen sólido groseramente
  distinto del dibujo.
- Simulaciones puras de `steer()` para medir atascos y costo por frame
  (`tools/diag/enemy_stuck.mjs`).
- Headless con Vite + playwright-core y Swiftshader: capturas, draw calls reales,
  meshes/texturas, buffers GL vivos, atascos reproducidos, save del Minijuego
  (`tools/diag/arena_*.mjs`, `barrio_*.mjs`, `leaks_gl.mjs`, `minigame_save.mjs`).
- **No** se midió FPS en hardware real: los FPS de Swiftshader son solo una cota
  inferior. Los números de CPU (update, drawHud, steer) sí son útiles.
- No se evaluó a fondo el arte ni la narrativa; el foco es el roguelike.

## Resumen (lo más grave primero)

1. **Los cascarudos no tienen pathfinding.** `pickFreeDir` prueba 5 direcciones a
   16 px y, si todas chocan, devuelve `{0,0}`: el bicho se congela a 4 px de la
   pared para siempre. Reproducido headless: **5/5 trabados** contra la ferretería
   (`diag_atasco.png`); el acorazado se traba en el paso a nivel (`diag_atasco_acorazado.png`).
2. **Los sólidos no coinciden con el dibujo.** `WorldMap.rebuildSolids()` ignora
   el `offset` del sprite; en la semilla 3455, **105 de 106** objetos `solid:true`
   tienen offset distinto de cero. Casas corridas 6-8 px, árboles ±11 px, caja de
   municiones con **dos sólidos** (24×24 para un sprite de 16×16).
3. **Muchas manzanas no cierran:** el **78 %** de las semillas tiene al menos una
   salida al norte que termina en estática; el **71,5 %** tiene una sola pieza
   arriba; los fondos de todas las piezas se conectan por atrás. La cortada no es
   un callejón sin salida.
4. **El 47,3 % de las bocas de spawn caen sobre estática** (570/1205), y el 98 %
   de los barrios tiene al menos un spawn marcado en sólido. El spawn de
   emergencia, además, no chequea sólidos.
5. **El Minijuego escribe en el save real.** Verificado: morir en el Minijuego
   subió `muertes` de 1 a 2 y creó una `mochila` con el botín, en localStorage.
6. **Fugas de GPU continuas:** +136 buffers GL por 100 bichos; tras limpiarlos y
   crear 600 huellas quedan **+416 buffers** vivos (huellas, sombras y FX no se
   liberan). Medido con `leaks_gl.mjs`.
7. **Render pesado:** **550 draw calls/frame** en reposo y **715 con 42 bichos**;
   697 meshes (483 visibles) en el barrio de la semilla 3455; la nieve sola son
   428 meshes (~214 draws).
8. **HUD y luz son canvas 480×270 redibujados y subidos enteros cada frame**
   (más el fade, aunque esté vacío): `drawHud` ~2 ms y `update` ~2,7 ms de CPU
   con 40 bichos en headless.
9. **La IA no es el cuello de botella de CPU** (0,28 ms/frame en el peor caso
   medido con 40 bichos y 1500 sólidos): el problema es de **comportamiento**.
   El flow field cuesta ~0,04 ms por BFS (~0,18 ms/s a 4 Hz).
10. **Mantenibilidad:** archivos de 2000+ líneas, 4 copias de `put()`, 4 wraps de
    texto, helpers repetidos; el save no migra, `writeSave` puede fallar sin aviso
    y `changeScene` descarta pedidos en silencio.

---

# 1. IA y movimiento de los cascarudos

## 1.1 Qué hace hoy

`steer()` (`src/arena/enemies.js:103-161`) hace, por bicho y por frame:

1. Vector directo al jugador (`target.y = player.feet - 8`,
   `enemies.js:113-120`).
2. Repulsión lineal contra **todos** los demás bichos (`enemies.js:122-135`),
   O(n²) por frame.
3. Mezcla y normaliza (`enemies.js:137-141`).
4. `pickFreeDir()` (`enemies.js:90-97`) prueba `SAMPLE_DIRS = [0, ±0.7, ±1.3]`
   radianes a una sonda fija de `PROBE = 16` px (`enemies.js:17-18`). Devuelve la
   primera dirección libre o **`{x:0,y:0}`**.
5. Mueve y resuelve X e Y por separado contra `solidBoxes`
   (`enemies.js:149-156`).

`updateEnemies()` (`src/scenes/arena.js:1111-1139`) pasa `this.solidBoxes`, que
incluye un AABB por objeto sólido **y uno por cada baldosa sólida**
(`arena.js:373-383`): **1.171 a 1.529 AABBs** según la semilla (medido: semilla 1
= 1529; semilla 3455 = 1189).

## Hallazgos

### A1 — Sin pathfinding: la sonda de 5 direcciones y el vector cero (GRAVEDAD: ALTA)

**Evidencia.**
- `src/arena/enemies.js:17` (`SAMPLE_DIRS`), `:90-97` (`pickFreeDir`),
  `:143` (`going = pickFreeDir(...)`).
- No hay ninguna noción de camino, distancia a la baldosa del jugador ni punto
  de rodeo. Es steering puramente reactivo.
- Simulación pura (`tools/diag/enemy_stuck.mjs`): pared vertical de 16 px entre
  bicho y jugador; en 12 s el bicho quedó a **50,1 px** del jugador (empezó a
  80,4), se movió 53,3 px y pasó el **86,9 % de los frames sin moverse**. Terminó
  en x=149,9 con la pared en x=160.
- Headless sobre el juego real (`tools/diag/arena_stuck.mjs`): 5 cascarudos
  contra el lateral este de la ferretería (semilla 3455); a los 6 s **5/5**
  seguían a 103-126 px del jugador, en x≈425-456. Juan estaba en x=330, del otro
  lado del local. Captura: `docs/capturas/diag_atasco.png`.

**Por qué es un problema.** El vector directo apunta a la pared; las 5 muestras
tienen componente horizontal hacia la pared y las 5 chocan; `pickFreeDir`
devuelve `{0,0}` y el bicho se queda pegado. No es que “rodee mal”: no rodea.
Es exactamente el síntoma del dueño (“se quedan detrás de una pared, colgados”).

**Propuesta.** Flow field BFS + separación + desatascador (sección 1.2).
Costo: **mediano**. Archivos: `src/arena/flowfield.js` (nuevo),
`src/arena/enemies.js`, `src/scenes/arena.js`, tests nuevos.

### A2 — El acorazado se traba en el paso a nivel de las vías (GRAVEDAD: ALTA)

**Evidencia.**
- `src/maps/barrio/pieces.js:333-340`: el alambrado se coloca con `x += 32`
  pero el sprite mide 33 px. El último tramo de la izquierda arranca en 128 y
  termina en 161; el hueco real entre alambrados es **480-512 px (32 px)**, no
  los 48 px que sugiere la grilla/tablón (`pieces.js:454`).
- Headless (`tools/diag/arena_choke2.mjs`, semilla 8): 4 bichos (3 acorazados y
  1 cascarudo) desde el norte del cruce hacia Juan al sur. A los 20 s **0/4**
  habían llegado; dos acorazados quedaron a 153 y 214 px, otro a 55 px, trabado
  contra el segundo alambrado. Captura: `docs/capturas/diag_atasco_acorazado.png`.
- En otra corrida con el mismo escenario pero posiciones alineadas, los 4
  cruzaron: el comportamiento es **inestable**, no un bloqueo geométrico duro.
- Prueba de laboratorio con el flow field ingenuo: una máscara por centro de
  baldosa con la caja del acorazado (16,8 px) cierra el hueco de 32 px por
  **0,4 px**; en la semilla 8 deja 409 baldosas inalcanzables para el acorazado.

**Por qué es un problema.** Es el mismo síntoma que A1, agravado por el tamaño:
el acorazado entra físicamente (16,8 < 32) pero el steering lo deja vibrando en
la boca. Y si se implementa un flow field con máscara ingenua, el bug cambia de
forma en vez de desaparecer.

**Propuesta.** (a) Arreglar el hueco a 48 px (nivel, sección 3.L6); (b) flow
field con máscara por tamaño o subgrilla de 8 px si se quiere que entre en
pasillos de 2 baldosas; (c) desatascador y, si sigue sin ruta, no spawnearlo ahí.
Costo: **chico** (nivel) + **mediano** (IA).

### A3 — La separación isotrópica desarma la cola en pasillos (GRAVEDAD: MEDIA)

**Evidencia.** `enemies.js:122-141` suma repulsión sin distinguir “lateral” de
“freno”. Simulación de 10 cascarudos en un pasillo de 48 px
(`tools/diag/enemy_stuck.mjs`): llegaron 8/10 en 15 s, con **4.943 pares-frame
solapados** (distancia < 60 % de la suma de radios) y posiciones oscilando entre
y=38,6 y y=62,2 dentro del pasillo. En campo abierto, con 40 bichos, la
distancia mínima entre centros bajó a **2,4 px** (radios 9+9).

**Por qué es un problema.** Se empujan, se frenan y se cruzan; en un cuello de
botella la repulsión puede anular el avance. Además es O(n²) (40 bichos = 1.560
pares/frame).

**Propuesta.** En `steer`, proyectar la separación sobre la perpendicular a la
dirección de flujo (nunca contra el avance) y usar distancia al cuadrado.
Costo: **chico** (incluido en el flow field).

### A4 — Spawns mal validados y fallback dentro de sólidos (GRAVEDAD: MEDIA)

**Evidencia.**
- `src/scenes/arena.js:1326-1348`: `pickSpawn` valida una caja de **8×6** (no la
  caja real del bicho), descarta sólidos y limita a 96-380 px; si no encuentra,
  `spawnPoint` no tiene tope de 380; si tampoco, el fallback a ±160 px del
  jugador **no chequea `isSolid`** (`arena.js:1343-1347`).
- Medición sobre 200 semillas: **570/1205 bocas (47,3 %)** caen sobre una baldosa
  sólida; **196/200 barrios (98 %)** tienen al menos un spawn marcado sobre
  sólido. Los médanos (2.352) no caen nunca sobre sólido.
- `waveSequence()` (`src/arena/waves.js:74-82`) tampoco filtra sólidos: es lógica
  pura, pero sus tests pueden fijar un contrato que el juego no cumple.

**Por qué es un problema.** Se pierde casi la mitad de las bocas de spawn; el
fallback puede crear un bicho dentro de una casa o de la estática, y todos los
probes fallan: queda inmóvil desde el frame 0.

**Propuesta.** Elegir primero el tipo y validar la caja real (`enemyBox`) contra
`solidBoxes` y la alcanzabilidad de la baldosa en la máscara de ese tamaño;
mover las bocas 2 baldosas hacia adentro (`index.js:128-131`); si no hay punto,
no spawnear. Costo: **chico**.

### A5 — No hay tests de `steer`; el test de conectividad ignora los objetos (GRAVEDAD: MEDIA)

**Evidencia.**
- `grep -rn "steer" test/` no devuelve nada: la parte más frágil no tiene
  cobertura.
- `test/barrio.test.js:121-150` define `solid()` mirando solo `map.floor` y
  `map.solidTiles`, **nunca `map.objects`**. Puede pasar con una casa cortando el
  camino; si el flow field copia esa lógica, pathfindea a través de paredes.

**Propuesta.** `test/flowfield.test.js` (pasillo en U, bolsillo, máscara ancha,
determinismo, sin allocaciones) y `test/enemies_flow.test.js` (simulación U y
pasillo); agregar alcanzabilidad con objetos a `barrio.test.js` sin tocar el test
existente. Costo: **chico-mediano**.

### A6 — El objetivo apunta a offsets distintos por tamaño (GRAVEDAD: BAJA)

**Evidencia.** `enemies.js:113-118`: el objetivo es `player.feet - 8` y la
distancia se mide desde `enemy.y - enemy.h/2`; el centro está a 8 px de los pies
en el cascarudo, 11 en el acorazado (3 px de sesgo) y 6 en el veloz. No explica
el atasco.

**Propuesta.** Con flow field, apuntar al centro-bajo de la baldosa
(`x*16+8`, `y*16+12`), igual para todos. Costo: incluido.

### A7 — O(n²) y 7 barridos por frame: patológico pero no el cuello de botella (GRAVEDAD: BAJA)

**Evidencia.** En espacio abierto `pickFreeDir` acierta la primera muestra (3
barridos de S); trabado hace las 5 más los 2 ejes (7·S). Con S≈1.500 y 40 bichos
son ~185.000-431.000 tests AABB/frame. **Medición real en Node**
(`enemy_stuck.mjs`, 40 bichos, 1.500 sólidos): **0,284 ms/frame** en el peor
caso (pared al medio) y 0,227 ms en campo abierto. Es despreciable frente a
2,7 ms de `update` o 550 draw calls.

**Por qué importa igual.** El costo crece con bichos y empeora cuando se traban,
pero el motivo para cambiarlo es la **correctitud**. El flow field también deja
un barrido por eje; un broadphase por baldosa es opcional (sección 4).

## 1.2 Solución propuesta: flow field (BFS) + separación + desatascador

### Diseño

- **Grilla:** las 80×40 = 3.200 baldosas del mapa. Nodo = baldosa.
- **Fuente:** baldosa del jugador (`floor(x/16)`, `floor(feet/16)`). Si esa
  baldosa está bloqueada para la máscara del tamaño, se usa la libre más cercana
  en espiral ≤4.
- **BFS 4-vecinos** (sin diagonales, para no cortar esquinas). Cada celda guarda
  `dist` (`Uint16Array`) y `parent` (`Int16Array`); el `parent` apunta hacia el
  jugador. Se recorre del bicho al `parent`, o se deriva una dirección
  (`Uint8Array`) al construir.
- **Recálculo:** al cambiar la baldosa del jugador o cada 0,25 s, con
  enfriamiento de 0,08 s para no rebuildear 60 veces/s en un borde.
- **Máscara base:** rasterizar `this.solidBoxes` (ya incluye objetos, baldosas y
  la caja) a baldosas. **No** usar solo `map.floor`.
- **Acorazado:** exigir 3 baldosas libres horizontales seguidas (caja 16,8 px)
  o una subgrilla de 8 px. Ojo con el falso bloqueo de 0,4 px medido en A2.
- **Spawns:** validar la baldosa contra la máscara del tipo antes de spawnear.

### Pseudocódigo (núcleo)

```js
// src/arena/flowfield.js (nuevo, puro)
export const FLOW_INF = 0xffff;

export function buildSolidMask(cols, rows, boxes) {
  const mask = new Uint8Array(cols * rows);
  for (const b of boxes) {
    const x0 = Math.max(0, Math.floor(b.x / 16));
    const x1 = Math.min(cols - 1, Math.floor((b.x + b.w - 1e-3) / 16));
    const y0 = Math.max(0, Math.floor(b.y / 16));
    const y1 = Math.min(rows - 1, Math.floor((b.y + b.h - 1e-3) / 16));
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) mask[y * cols + x] = 1;
  }
  return mask;
}

export function createField(cols, rows) {
  const n = cols * rows;
  return { cols, rows, dist: new Uint16Array(n), parent: new Int16Array(n),
    queue: new Uint32Array(n), seed: -1 };
}

export function rebuild(field, mask, tx, ty) {
  const { cols, rows, dist, parent, queue } = field;
  dist.fill(FLOW_INF);
  let seed = ty * cols + tx;
  if (!inBounds(cols, rows, tx, ty) || mask[seed]) {
    seed = nearestFree(mask, cols, rows, tx, ty, 4);
    if (seed < 0) return false;
  }
  field.seed = seed;
  dist[seed] = 0; parent[seed] = -1;
  let head = 0, tail = 1; queue[0] = seed;
  while (head < tail) {
    const i = queue[head++];
    const d = dist[i] + 1;
    const x = i % cols, y = (i / cols) | 0;
    const push = (j) => {
      if (mask[j] || dist[j] !== FLOW_INF) return;
      dist[j] = d; parent[j] = i; queue[tail++] = j;
    };
    if (x > 0) push(i - 1);
    if (x < cols - 1) push(i + 1);
    if (y > 0) push(i - cols);
    if (y < rows - 1) push(i + cols);
  }
  return true;
}

export function flowVector(field, x, feet) {
  const { cols, rows, dist, parent } = field;
  let tx = Math.floor(x / 16), ty = Math.floor(feet / 16);
  if (tx < 0 || ty < 0 || tx >= cols || ty >= rows) return null;
  let i = ty * cols + tx;
  if (dist[i] === FLOW_INF) {
    i = nearestReachable(field, tx, ty, 4);
    if (i < 0) return null;
  }
  const p = parent[i];
  if (p < 0) return null; // ya está en la baldosa del jugador
  const px = (p % cols) * 16 + 8;
  const py = ((p / cols) | 0) * 16 + 12;
  const dx = px - x, dy = py - feet;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

export function isReachableAt(field, x, feet) {
  const tx = Math.floor(x / 16), ty = Math.floor(feet / 16);
  return tx >= 0 && ty >= 0 && tx < field.cols && ty < field.rows
    && field.dist[ty * field.cols + tx] !== FLOW_INF;
}
```

### Integración en `steer()` (resumen)

```js
export function steer(e, player, enemies, solids, dt, flow = null) {
  // 1. dirección de flujo (o la última si no hay)
  const f = flow ? flowVector(flow, e.x, e.y) : null;
  // 2. separación solo lateral: se le saca la componente que frena el avance
  //    (dot = s·f; s -= f * min(0, dot)), con distancias al cuadrado
  // 3. paso real (sin sonda de 16 px), resolviendo X e Y por separado
  // 4. si blockedX && blockedY: stuckT += dt; a los 0,45 s hacer un jiggle
  //    perpendicular al flujo durante 0,35 s (signo por e.seed)
  // 5. si dist === INF durante >8 s: despawnear con salpicadura (opcional)
}
```

### Costo medido

`tools/diag/flowfield_proto.mjs` sobre la semilla 3455:

| Tipo | Baldosas libres | BFS visitadas | ms por BFS | ms/s a 4 Hz |
|---|---:|---:|---:|---:|
| cascarudo (12×7,2) | 1.719 | 1.705 | 0,044 | 0,176 |
| veloz (8,4×5,4) | 1.719 | 1.705 | 0,019 | 0,075 |
| acorazado (16,8×9,9) | 1.465 | 1.465 | 0,018 | 0,072 |

Memoria: `dist` 6,4 KB + `parent` 6,4 KB + `queue` 12,8 KB + máscaras ~6,4 KB
≈ **32 KB** (dos campos ≈ 58 KB). Contra 0,28 ms/frame de steering actual, el
flow field es más barato y, sobre todo, **no se traba**.

El prototipo encuentra el camino que hoy no existe: del punto (300,480) al
jugador (450,480), rodeando la ferretería, **15 pasos / 240 px / 7,1 s** a la
velocidad del cascarudo. El steering actual recorre 53 px y se queda a 108 px.

### Archivos y costo

| Archivo | Acción | Costo |
|---|---|---|
| `src/arena/flowfield.js` | nuevo, ~150-200 líneas puras | mediano |
| `src/arena/enemies.js` | separación proyectada, paso real, desatascador, firma opcional `flow` | mediano |
| `src/scenes/arena.js` | crear máscaras/campos en `buildWorld`, reconstruir en `update`, pasar por tipo, validar spawns | chico |
| `test/flowfield.test.js`, `test/enemies_flow.test.js` | pasillo en U, bolsillo, máscara ancha, llegada en N s | chico-mediano |

**Riesgos.** (1) Máscara construida solo con `map.floor` → pathing a través de
casas; usar `solidBoxes`. (2) Acorazado sin ruta en pasillos de 2 baldosas →
filtrar spawns o aceptar que espere. (3) Cambiar la firma de `steer` rompe
llamadas; el sexto parámetro opcional mantiene compatibilidad. (4) `barrio.test.js`
no cubre objetos; agregar test nuevo. Plan en 2 pasos: flow field + separación +
spawns; después desatascador + broadphase opcional.

---

# 2. Colisiones del barrio

## 2.1 Cómo se calculan

- `put()` (`src/maps/barrio/pieces.js:14-25`) ubica el sprite por su esquina
  inferior izquierda y calcula `x,y` en baldosas, `tw/th` y **`offset [ox,oy]`**
  para que el dibujo quede centrado en la grilla.
- `WorldMap.rebuildSolids()` (`src/mapView.js:147-163`): si `solid === true`
  usa **todo el rectángulo de baldosas** `{0,0,tw,th}`; si es un objeto, usa
  `obj.solid` en unidades de baldosa relativo a `obj.x/obj.y`.
- **El `offset` no se usa para el sólido.** `buildSolids()`
  (`src/scenes/arena.js:373-383`) suma un AABB por baldosa sólida.

## Hallazgos

### C1 — El sólido ignora el offset del dibujo: desalineación sistémica (GRAVEDAD: ALTA)

**Evidencia.**
- `src/mapView.js:152-160` usa `obj.x + s.x`, `obj.y + s.y`; no consulta
  `obj.offset`. Lo mismo repite `src/reach.js:24-33` (alcance de interacción) y
  `src/scenes/arena.js:373-383` (colisión de bichos/balas): el error se propaga a
  jugador, enemigos, balas, interacción y herramientas.
- Semilla 3455: **189 objetos sólidos; 106 son `solid:true`; 105 de esos 106
  tienen offset ≠ 0.** Ejemplos medidos (rect sólido vs rect dibujado):

| Sprite | Sólido (px) | Dibujo (px) | Efecto |
|---|---|---|---|
| `salvo_7` | 16,368 128×128 | 20,364 124×132 | 4 px de pared invisible a la izquierda |
| `chalet_c` (casa) | 208,432 64×64 | 214,424 64×64 | 6 px a la izquierda, 8 px abajo |
| `shop_ferreteria` | 352,448 80×64 | 346,440 80×64 | 6 px a la derecha, 8 px abajo |
| `chalet_b` | 560,432 80×64 | 552,424 80×64 | 8 px a la derecha/abajo |
| `almacen_roto` | 1088,336 80×64 | 1080,340 80×64 | 8 px a la derecha, 4 px arriba |
| `crate` (municiones) | 432,512 16×16 | 424,504 16×16 | 8 px a la derecha/abajo |
| `trash` | 1184,400 16×16 | 1182,404 8×16 | casi todo el sólido está en el aire |
| `tree_a` | centro 539,2 | centro 550,0 | **10,8 px** a la izquierda del tronco |
| `arbol_vereda` | centro 283,2 | centro 273,0 | **10,2 px** a la derecha del tronco |
| `barrera_alta` | 768,464 16×16 | 760,440 16×41 | 8 px a la derecha; sólo 20 % del dibujo |

- El tronco de los árboles (`baseSolid`, `pieces.js:56-64`) tiene solo
  9,6×16 px de sólido, pero con offsets de hasta ±10,8 px: **se atraviesa el
  tronco y se choca con el aire de al lado**.
- No es solo visual: el jugador tiene una caja de pies de 10×6 (`movement.js:7-8`)
  y nota perfectamente 8 px.

**Por qué es un problema.** El dueño dice “las colisiones tampoco”; esto es la
causa estructural. Cada casa/cerco/caja choca 4-8 px corrida, y algunos objetos
chocan donde no se ve nada.

**Propuesta.** Calcular el sólido a partir del **mismo rectángulo dibujado**
(`layout()` de `mapView.js:83-111`) o agregar `solidPx` explícito por objeto.
Mínimo: un helper `solidRectFor(obj, size)` que use `obj.offset`. Validar con un
test que compare el centro del sólido con el centro del dibujo para los sprites
conocidos. Costo: **mediano** (afecta a todos los mapas) o **chico** si se hace
solo en el barrio con una tabla por sprite.

### C2 — La caja de municiones tiene dos sólidos (GRAVEDAD: ALTA)

**Evidencia.** `src/scenes/arena.js:355-370`: el objeto `crate` ya trae
`solid:true` (sólido 432,512 16×16 por C1); `findCrate()` crea **otra** caja
16×16 en 424,504 a partir de la marca; `addCrateVisual()` la empuja a
`world.solids`. Unión: **424-448 × 504-528 (24×24)** para un sprite de 16×16.
Verificado en la auditoría (`tools/diag/barrio_audit.mjs`).

**Por qué es un problema.** Alrededor de la caja de municiones (una interacción
central del loop) hay 8 px de bloqueo invisible en dos lados.

**Propuesta.** Usar la marca como **esquina** y no sumar el sólido del objeto, o
marcar el `crate` del mapa con `solid:false` y dejar solo el sólido de
`findCrate`. Costo: **chico**.

### C3 — El hueco del paso a nivel mide 32 px, no 48 (GRAVEDAD: ALTA)

**Evidencia.** `pieces.js:333-340`: `for (let x = 0; x < 144; x += 32)` coloca
`alambrado` de 33 px; el tramo de x=128 termina en 161, así que el hueco real
con el tramo de x=192 es **480-512 global = 32 px**, no el 144-192 = 48 px que
declara el comentario y que se pinta como tablón (`pieces.js:454`). Medido y
reproducido en A2: acorazados trabados en el cruce
(`docs/capturas/diag_atasco_acorazado.png`).

**Propuesta.** Terminar el loop en `x + 33 <= 144` (o usar una lista fija
0,32,64,96,112 con un tramo de 16 px) y alinear tablón y baranda a 48 px.
Costo: **chico**.

### C4 — Autos y vagón: sólido solo en la fila base (GRAVEDAD: MEDIA)

**Evidencia.** `pieces.js:69-73` (`auto`) y `:342` (`vagon`) usan
`baseSolid` con `h:1`. `auto_parado`: sólido 566-606 × 592-608 (40×16) contra
un dibujo de 56×74; `vagon`: sólido 656-752 × 432-448 contra 102×48. Se puede
caminar por encima del 60-70 % superior del sprite.

**Por qué puede ser un problema.** En 3/4 se acepta “caminar detrás”, pero acá el
auto/vagón se puede atravesar de costado y el jugador queda tapado por el sprite.
El dueño puede leerlo como “colisión que no cierra”. No es tan grave como C1.

**Propuesta.** Decidir por objeto: si es un obstáculo, sólido de 2-3 filas (o
todo el cuerpo); si es decorado, dejarlo atravesable y dibujarlo como `flat`.
Costo: **chico** (tabla por sprite).

### C5 — Sólidos invisibles y desplazados en objetos chicos (GRAVEDAD: ALTA)

**Evidencia.**
- **Cartel de esquina:** `baseSolid('cartel_esquina', { y: 1 })`
  (`pieces.js:214,425`) sobre un sprite de 20×40. En `(212,214)` el sólido queda
  en **208,176 16×16** y el dibujo en **212,174 20×40**: el bloqueo está **22 px
  por encima de la base**, a la altura del panel. El poste se atraviesa y el
  jugador se frena contra un bloque invisible en el aire. Es el caso más claro
  de “colisión que no cierra”.
- **Busto:** sólido 160,112 16×16 vs dibujo 151,95 18×35: 9 px a la derecha; se
  atraviesa media estatua (`pieces.js:281`).
- **Hamaca:** sólido 256,48 32×16 vs dibujo 248,33 34×31: 8 px a la derecha;
  medio objeto atravesable (`pieces.js:285`).
- **Baranda:** sólido 32×16 en y 192-208, dibujo 33×14 en y 196-210 (4 px
  arriba). **Banco:** sólido y 192-208, dibujo y 188-205 (4 px).
- `grass_0` es sólido (`index.js:154`): las filas de pasto de casa/vías/cortada
  son “césped” visible pero muro. En casa la fila 11 entera es pasto sólido y no
  tiene paso al fondo; en vías/cortada solo se abre el corredor.

**Propuesta.** Convertir estos sólidos a px explícitos o a la fila base real
(el cartel debe anclarse a su poste, no a `y:1`); reemplazar el pasto sólido por
un objeto de linde (verja/medianera) para que el bloqueo se lea. Costo:
**chico-mediano**.

### C6 — Objetos que parecen sólidos y no lo son (GRAVEDAD: MEDIA)

**Evidencia.** `bicicleta` (`pieces.js:196`), `box` (`:195`, al lado de la
ferretería), `mailbox` (`:148`), `bush30` (`:148`), `figure_snow` (`:217`),
`fallen_*`, `bottle`, `snow_drift` no tienen `solid`. La bici, la caja, el buzón
y el arbusto se atraviesan en plena vereda. Los médanos tampoco son sólidos
(`pieces.js:65-68`) y encima son puntos de spawn: el jugador puede pararse
“dentro” de un spawn (el juego evita aparecer a menos de 96 px, pero se ve raro).
`fallen_*`/`figure_snow` pueden ser decorado intencional, pero hoy no está
documentado.

**Propuesta.** Agregar huella chica a `box`, `mailbox`, `bicicleta`, `bush30`;
decidir y documentar médanos y cuerpos. Costo: **chico** (tabla por sprite).

### C7 — Nafta escondida y `reachableGround` sin conectividad (GRAVEDAD: MEDIA)

**Evidencia.**
- `pieces.js:69-72`: la marca `nafta` va al **centro** del auto
  (`left+w/2, base-h/2`); `arena.js:492-497` la pasa por `reachableGround`, que
  solo mira la caja de pies 10×6 contra los sólidos. El sólido del auto es solo
  su fila base, así que el punto **no se mueve**. El ícono queda dibujado con
  `depthFor(y)+0.01` (`arena.js:606-610`) detrás del sprite del auto: para
  cobrarlo (radio 10) hay que pararse dentro del dibujo del auto.
- `arena.js:520-533`: `reachableGround` prueba una lista fija de 11 offsets; si
  todos fallan devuelve el punto original. No valida conectividad ni el rect
  dibujado. Hoy las 20 semillas dieron botín final alcanzable, pero es por suerte
  de la geometría, no por contrato.

**Propuesta.** Poner la nafta al costado del auto (calzada) y reemplazar
`reachableGround` por un `nearestWalkable` con BFS en un radio de 2-3 baldosas
(o reutilizar el flow field), verificando que el punto esté en la componente de
`map.spawn`. Costo: **chico-mediano**.

### C8 — `flipX` no espeja el sólido (GRAVEDAD: BAJA)

**Evidencia.** `mapView.js:185` espeja solo el mesh (`mesh.scale.x = -1`); el
sólido sigue siendo el mismo rect en baldosas. `pieces.js:346-348` usa
`flipX:true` en una cruz de San Andrés (casi simétrica, por eso no se nota).
Cualquier objeto asimétrico quedaría con el sólido del lado opuesto.

**Propuesta.** Si `obj.flipX`, espejar el sólido respecto del centro del sprite
(o documentar que no se espeja). Costo: **chico**.

### C9 — `map.spawn` no se valida y las marcas `entrada` son datos muertos (GRAVEDAD: BAJA)

**Evidencia.** `arena.js:398-403` devuelve `map.spawn` sin chequear `isSolid`;
hoy `(82,520)` es válido, pero si se mueve el portón el jugador puede arrancar
dentro de un sólido. Las marcas `entrada` (`pieces.js:159,220,301,365,430`) no
las consume nadie.

**Propuesta.** Assertar en el test que `map.spawn`, los `spawns`, el `crate` y el
punto de `exitHome` son libres y alcanzables; borrar o usar `entrada`.
Costo: **chico**.

### C10 — Solapamientos de sólidos: 34-46 pares por barrio (GRAVEDAD: BAJA)

**Evidencia.** Semilla 1: 34 pares con solape >2 px; semilla 3455: 46. Muchos
son intencionales (portón contra casa, paredes que se tocan, caja contra cajón).
Otros son **verjas dobles**: `fence`+`tapial80` 16×16 en el tramo final de
`southVerja` (`pieces.js:90-94` recoloca en vez de recortar). En el hueco sur de
la cortada se ven 48 px de cerco montado.

**Propuesta.** En `southVerja`, si `x + w > x1`, no dibujar el sprite (o
recortarlo como el concepto de arte). Costo: **chico**.

### C11 — Lo que está bien (verificado, para no inventar problemas)

- **Conectividad con la caja del jugador:** 1.719 baldosas libres, 1.705
  alcanzables en la semilla 3455 (**99,2 %**). En 20 semillas: 98,7-99,7 %.
  Los bolsones inalcanzables son de 1-3 baldosas, no zonas grandes. BFS por
  pieza (semilla 3455, caja 10×6, objetos incluidos):

| Pieza | Libres | Alcanzables | No alcanzables |
|---|---:|---:|---:|
| casa (0,1) | 248 | 245 | 3 |
| esquina (1,1) | 317 | 317 | 0 |
| vías (2,1) | 294 | 292 | 2 |
| cortada (3,1) | 267 | 261 | 6 |
| plaza (1,0) | 323 | 322 | 1 |
| cortada (2,0) | 270 | 268 | 2 |
- **Botín:** las marcas crudas a veces caen sobre sólido (46 en 20 semillas),
  pero `reachableGround()` (`arena.js:520-533`) las corre y **las 20 semillas
  quedaron con todo el botín final alcanzable**. No hay botín inalcanzable.
- **exitHome:** siempre alcanzable; el portón es sólido, pero `nearExit`
  (radio 26, `arena/exit.js:4-26`) se dispara desde los pies en y=518.
- **Baranda de la plaza:** hueco real de ~63 px (baranda de 33 px cada 32), pasa
  el jugador y los tres tamaños de bicho.
- **Pasaje de la cortada:** 48 px libres entre `pared_ns_62` (144-192 locales);
  entra el acorazado (16,8 px). El problema no es el ancho, es el steering.
- **Mapa de calor / capturas por pieza:** `diag_caminable.png`,
  `diag_solidos_barrio.png` y `diag_solidos_<pieza>.png`.
- **Test de conectividad:** el actual (`test/barrio.test.js:121-152`) ignora los
  sólidos de objetos; por eso todo lo anterior pasa en verde. Hace falta un test
  nuevo con la caja de pies y los objetos (ver Tanda 0).

---

# 3. Sentido de las manzanas (diseño de nivel)

## L1 — La mayoría de los barrios es media cuadra y un fondo muerto (GRAVEDAD: ALTA)

**Evidencia.** `layoutCells` (`index.js:17-44`) pone 1 pieza arriba con
probabilidad 0,5 por columna elegible. Medición sobre 200 semillas:

| Celdas (4 abajo + N arriba) | Semillas |
|---|---:|
| 5 (una arriba) | **143 / 200 = 71,5 %** |
| 6 (dos arriba) | 52 = 26 % |
| 7 (tres arriba) | 5 = 2,5 % |

Una celda vacía son 20×20 = 400 baldosas de `estatica_` sólida. Con 5 celdas,
**3 de las 8 celdas (37,5 % del mapa) son estática**, siempre incluida (0,0)
(arriba de la casa). La fila de arriba queda llena en promedio 1,31/4 = **33 %**.

**Por qué es un problema.** El barrio se lee como una calle con un fondo de
estática enorme, no como una grilla de manzanas. La variedad de layout, que es la
gracia del roguelike, queda en “qué tres piezas abajo y, a veces, una arriba”.

**Propuesta.** En `src/maps/barrio/index.js:25-38`, si hay al menos una pieza
arriba, llenar **todas** las columnas elegibles; la variedad sale de los tipos,
no de la conectividad. Alternativa: 2 arriba mínimo y garantizar que compartan
calle. Costo: **chico**.

## L2 — Salidas al norte que mueren en estática sin aviso (GRAVEDAD: ALTA)

**Evidencia.** El pase de borde (`index.js:89-108`) convierte el **50 %** de las
baldosas de la franja contra una celda vacía o el borde en `estatica_*`. Sobre
200 semillas:
- **156/200 (78 %)** tienen al menos una salida al norte de una pieza de abajo
  sin pieza arriba (medido con `layoutCells`).
- **570/1205 (47,3 %)** de las bocas de calzada caen sobre estática; **196/200
  barrios (98 %)** tienen al menos un spawn marcado en sólido.
- Se ve en `diag_solidos_barrio.png` y `diag_caminable.png`: las calzadas de la
  fila de arriba terminan en un damero de estática, no en una barrera legible.

**Por qué es un problema.** Es la queja “calles que terminan en estática sin
aviso”. El jugador camina 10-16 baldosas hacia un lugar que no existe; el
damero al 50 % parece un glitch, no un límite de diseño.

**Propuesta.** (a) En `index.js:89-108`, toda salida sin vecino se cierra con
un objeto legible (escombro, valla, médano, auto volcado) ocupando **todo** el
ancho del paso, no estática aleatoria. (b) La estática aleatoria, si queda, solo
sobre nieve, nunca sobre calzada/vereda. (c) En `index.js:128-131`, bocas 2
baldosas adentro. Costo: **chico** (regla) + **mediano** (arte/cierres).

## L3 — Los fondos de las piezas forman un contrafrente continuo; la cortada no es un callejón (GRAVEDAD: ALTA)

**Evidencia.** Las cinco grillas tienen las filas 0-10 como fondo (nieve/patio)
sin muro en las columnas 0/19. La cortada (`pieces.js:371-392`) deja el patio
abierto al norte y a los lados: el almacén bloquea cols 8-12 filas 1-4, pero las
filas 5-7 están abiertas y las paredes de la fila 7 solo cubren cols 5-8 y 12-14.
El BFS del barrio muestra que el fondo de la casa (filas 0-10, 220 baldosas) es
**inalcanzable desde su propia vereda, pero alcanzable desde el vecino**; el
jugador termina caminando detrás de los chalets, tapado por los sprites
frontales. La ficha de arte dice lo contrario para la cortada (“si te alcanzan
adentro no hay por dónde salir”) y la `trampa` del concepto no se implementó
(`docs/brief_rl_B_resultado.md:81`).

**Por qué es un problema.** Es la raíz de “algunas manzanas no tienen tanto
sentido”: el norte no es una salida, es un agujero que comunica todos los fondos.
La cortada pierde su rol de riesgo/recompensa.

**Propuesta.** `backyard: 'private' | 'through'` por pieza: casa y cortada con
medianera sólida en cols 0/19 filas 0-10 (2-3 `pared_ns_62`); las “through” con
un portón por linde. En la cortada, cerrar el norte del patio en la fila 5/6 con
una reja rota de 1 baldosa como única salida oculta. Costo: **mediano**.

## L4 — La plaza no da botín (GRAVEDAD: ALTA)

**Evidencia.** `pieces.js`: la plaza tiene 3 médanos y 1 nafta de auto, **0
marcas `loot`** (`:276-301`). El diseño dice 1-2 puntos de botín por pieza
(`docs/diseno_roguelike.md:68`). Es la pieza más abierta y con más rastro de
bichos, y no premia explorarla.

**Propuesta.** 1-2 `loot` junto al busto/bancos/hamaca y 1 en la franja norte de
las vías. Costo: **chico**.

## L5 — Piezas repetidas y apiladas (GRAVEDAD: MEDIA)

**Evidencia.** `index.js:41` usa `pick(rng, TYPES)` con reposición y sin excluir
el tipo de abajo. Medido: **8,5 %** de las semillas tiene dos piezas iguales
arriba; **20,6 %** de las piezas de arriba repiten el tipo de la de abajo
(54/262). Ejemplo: seed3 plaza arriba de plaza; seed10 plaza arriba de plaza.

**Propuesta.** En `index.js:39-43`, sortear los tipos de arriba **sin
reposición** y distintos del de abajo. Costo: **chico**.

## L6 — Anchuras de paso inconsistentes: 32, 40, 48, 64 px (GRAVEDAD: MEDIA)

**Evidencia.**
- Vías: tablón pintado en cols 9-11 (48 px) pero alambrado deja **32 px**
  (`pieces.js:333-340,454`).
- Plaza: baranda abre **64 px** (128-192), avenida pintada **40 px**
  (`pieces.js:245`), salida `openSouth` **48 px** (`index.js:37`).
- Cortada: callejón 64 px, cuellos de 48 px.
- `openSouth` siempre 3 baldosas (cols 9-11).

**Por qué es un problema.** El jugador no sabe por dónde “se supone” que se pasa;
el acorazado se traba en el más angosto. No es solo legibilidad: la IA y el
spawn dependen de esa geometría.

**Propuesta.** Declarar `exits: { w, e, n, s }` con ancho en baldosas y hacer que
todas las piezas usen el mismo paso de 3 baldosas (o documentar la excepción).
Costo: **mediano**.

## L7 — El borde norte se come al jugador (GRAVEDAD: MEDIA)

**Evidencia.** `bounds.minFeet = 0` (`index.js:143-147`); la caja de pies mide
10×6 (`movement.js:7-8`), así que los pies pueden llegar a y≈6. El sprite mide
16×32 y se dibuja desde `feet-32`: a y=6, **solo se ven 6 de 32 px**. Hay
baldosas caminables en la fila 0 por el damero de estática (nuestro BFS encontró
1-3 por semilla). La cámara se recorta a y≥0.

**Propuesta.** `minFeet = 32` (y `minX = 12`, `maxX = 1268`) o un `camTopPad`
de 32. Costo: **chico**.

## L8 — La casa pierde medio mapa y su entrada oeste da al borde (GRAVEDAD: MEDIA)

**Evidencia.** La fila 11 de `casa` es pasto sólido en las 20 columnas
(`pieces.js:125`); el fondo (filas 0-10) no tiene acceso desde su vereda. El
oeste de la casa es el borde del mapa y la `boca_oeste` se coloca en x=8; la
celda (0,0) nunca se llena (`index.js:19,27`). El portón `exitHome` está dentro
de la verja sólida y del pasto; el jugador no puede pararse dentro del rect
(por eso `nearExit` usa radio, no `warpAt`).

**Propuesta.** Abrir un portón lateral de 3 baldosas en la fila 11, o aceptar el
fondo como privado con medianera; llenar (0,0) con una pieza fija “fondo”
(baldío/tanque/lo de Ramírez) si se quiere que el mapa no tenga un hueco
permanente. Costo: **mediano**.

## L9 — Los rieles de las vías mueren contra los lotes (GRAVEDAD: MEDIA)

**Evidencia.** `pieces.js:313-316`: las filas 5-8 son `'t'` de col 0 a 19. Como
la fila de abajo exige 3 tipos distintos (`index.js:21`), las vías **nunca**
tienen otra vías al lado; los rieles cortan contra una casa o una plaza. En la
semilla 3455 se ve en `diag_solidos_vias2,1.png`. El concepto también corta,
pero el juego lo repite en casi todas las semillas.

**Propuesta.** Regla de piso “toda celda vecina a vías pinta balasto/terraplén en
filas 5-8”, o un tope de rieles nevado en las puntas para que el corte se lea.
Costo: **mediano**.

## L10 — Verjas dobles y cercos que invaden el lote vecino (GRAVEDAD: BAJA)

**Evidencia.** `southVerja` (`pieces.js:84-99`) recoloca el último sprite en
`x1-w` en vez de recortarlo; el tramo 192-320 se superpone 16-32 px. Además el
último `fence` de casa (x=306) y vías (x=304) cae en cols 19-20, 16-18 px dentro
de la pieza vecina.

**Propuesta.** No dibujar el sprite que no entra (o recortarlo como el
concepto); recortar el cerco al borde de la pieza. Costo: **chico**.

## L11 — Datos muertos y una boca imposible (GRAVEDAD: BAJA)

**Evidencia.** `mark('entrada')` se emite en las 5 piezas (`pieces.js:159,220,
301,365,430`) y no lo consume nadie; `index.js:172` exporta `endX` que el barrio
no usa; la boca `south` (`index.js:131`) solo podría darse con `openSouth` en la
fila 1, y el layout solo lo pone en la fila 0.

**Propuesta.** Borrar o usar `entrada` para el cartel de la casa/minimapa.
Costo: **chico**.

## L12 — Lo que funciona (verificado)

- `exitHome` no está tapado: se puede volver siempre (radio 26).
- Todo el botín final es alcanzable en 20 semillas.
- No hay piezas arriba sin celda abajo ni `openSouth` en la fila de abajo.
- Las salidas este/oeste por calzada están libres (los autos bloquean la fila
  17, queda paso por 15-16).
- La baranda de la plaza tiene hueco real (~63 px).

---

# 4. Performance

Mediciones headless (Swiftshader; **no** representan FPS de hardware real, pero
sí draw calls, meshes, CPU y fugas).

| Medición | Valor | Cómo |
|---|---:|---|
| Draw calls/frame en reposo (2 bichos) | **550** (min 538, max 562) | envolviendo `drawElements/drawArrays` |
| Draw calls/frame con 42 bichos (40 agregados + 2 del banner) | **715,5** (708-728) | idem; delta ≈ **4,14/bicho** |
| Meshes en escena (seed 3455) | **697** (483 visibles) | `scene.traverse` |
| Meshes en escena (seed aleatoria) | 632 (412 visibles) | idem |
| Texturas/materiales/geometrías (seed 3455) | 249 / 254 / 253 | `scene.traverse` |
| `update()` con 40 bichos | **2,72 ms** (p95 3,9) | `performance.now` |
| `drawHud()` con 40 bichos | **1,97 ms** (p95 2,8) | `performance.now` |
| rAF en Swiftshader | 164 ms/frame (~6 fps) | solo cota inferior |
| `steer` peor caso (40 bichos, 1500 sólidos) | **0,284 ms/frame** | Node |
| BFS flow field | 0,018-0,044 ms | Node |
| GL buffers tras 100 bichos | **+136** | create/deleteBuffer |
| GL buffers tras `clearEnemies` + 600 huellas | **+416** (70 vivas) | idem |
| Escena tras 3 rebuild de la misma semilla | 270 children / 697 meshes / 249 tex, **estable** | `arena_rebuild.mjs` |

## P1 — Fugas de GPU continuas (GRAVEDAD: ALTA)

**Evidencia.**
- **Sombra de enemigo:** `makeEnemyVisual` crea `PlaneGeometry`+material por
  bicho (`arena.js:1395-1397`); `removeEnemy`/`clearEnemyEntities` solo hacen
  `scene.remove` (`arena.js:1444-1452`, `arena/reset.js:5-16`). Medido:
  **+136 buffers GL por 100 bichos**, y no bajan al limpiarlos.
- **Huellas:** una geometría y un material nuevos por huella
  (`footprints.js:43-49`); al expirar/reset se remueve el mesh sin `dispose`
  (`:16-20,28-30,56-59`). Medido: 600 huellas → 70 vivas y **+416 buffers GL**
  sobre la base.
- **FX de disparo:** `makeSprite` crea textura+material+geometría
  (`feedback.js:38-49`); `dropSprite` libera `map` y `material` pero **no la
  geometría** (`feedback.js:170-175`). Decenas por segundo disparando.
- **Sobreviviente:** `charSprite` + `makeShadow` (`arena.js:632-643`) y
  `clearSurvivor` solo remueve (`:645-650`).
- **Glow compartido:** `disposeWorld` hace `mat.map.dispose()` sobre
  `getGlowTexture()` cacheada (`arena.js:278-293`, `sprite.js:152-171`).
  Verificado: **la textura se dispone y el mundo nuevo reusa el mismo objeto**.

**Por qué es un problema.** La memoria de GPU crece durante la partida (huellas
y disparos) y en cada loop (sombras/sobreviviente). A la larga stutter o crash;
invisible en una prueba corta.

**Propuesta.** Cachear geometría/materiales de sombra y huellas; reutilizar una
geometría de huella; en `dropSprite` disponer la geometría propia o usar la
cacheada; en `clearEnemyEntities`/`clearSurvivor` liberar lo propio; no disponer
texturas compartidas (o clonar el glow por objeto). Costo: **chico**.

## P2 — 550-715 draw calls y 697 meshes (GRAVEDAD: ALTA)

**Evidencia.**
- La nieve son **428 meshes** (214 copos × 2: on/off, `snow.js:74-97`,
  `arena.js:120`), ~214 draw calls visibles.
- El barrio son 235 objetos = 235 meshes y **235 materiales**, cada uno con una
  `Texture` clonada (`mapView.js`, `sprite.js:66-72`). Three comparte el `source`
  de la textura, pero no el material ni el draw call.
- Con 42 bichos: +84 meshes (cuerpo+sombra) y +4,1 draws/bicho (medido).
- No hay batching/instancing de muebles ni de nieve.

**Propuesta.** (1) Nieve con `InstancedMesh` (de 428 meshes/214 draws a ~6);
(2) huellas con una geometría compartida o instancing; (3) muebles: textura por
atlas + UVs en la geometría y batch estático por atlas (de ~235 a ~6 draws);
(4) `matrixAutoUpdate=false` para objetos estáticos. Costo: **mediano** (nieve,
matrices) a **grande** (batch de muebles). El culling ya ayuda, pero no reduce
matrices ni switches de material.

## P3 — HUD, luz y fade: tres canvas 480×270 por frame (GRAVEDAD: MEDIA)

**Evidencia.**
- `drawHud` (`arena.js:1526-1565`): `lightUi.clear()` + `light.draw()` +
  `commit()` y `ui.clear()` + todos los `draw*` + `commit()`. **Dos subidas de
  textura de 480×270 por frame** (~0,52 MB cada una).
- `main.js:550-575`: `fadeUi.clear()` y `fadeUi.commit()` **incondicionales**,
  aunque `game.fade = 0`.
- `drawText` (`font.js:16-54`) crea arrays de puntos y un `Set` de strings por
  etiqueta; con outline hace ~8 `fillRect` por punto. El HUD dibuja 15-25
  etiquetas por frame.
- `drawHud` medido: **1,97 ms/frame** (más de la mitad de `update`).

**Propuesta.** Cachear texto por `(texto, escala, spacing)`; no subir el fade si
está vacío; saltear el pase de luz cuando el resultado/viñeta tapa la escena;
pre-renderizar cadenas fijas a canvas y hacer un `drawImage`. Costo:
**chico-mediano**.

## P4 — Asignaciones por frame (GRAVEDAD: MEDIA)

**Evidencia.** `readControls` crea `new Set(keys)`, `nextPad[16]` y closures
(`arena.js:815-871`); `readAim` hace `document.querySelector('canvas')` y
`getBoundingClientRect()` por frame (`arena.js:874-890`); `updateEnemies` crea
el objeto `player` y `steer` crea ~7 cajas/objetos por bicho; `updateToasts`
hace `filter` cada frame (`:1521-1524`); `updateLoot` llama `collectLoot` aunque
no haya botín (`:653-669`); `followCamera`/`cameraFor`/`shakeOffset` crean
objetos.

**Propuesta.** Reusar buffers/objetos, cachear el canvas, saltear `collectLoot`
si la lista está vacía, filtrar toasts solo si hay vencidos. Costo: **chico**.

## P5 — `buildWorld` y reinicios: bien en escena, mal en recursos (GRAVEDAD: MEDIA)

**Evidencia.** Con la **misma semilla**, 4 builds consecutivos dieron 270
children / 697 meshes / 249 texturas idénticos: `disposeWorld` no deja basura en
el grafo. Pero (a) `buildWorld` **no purga enemigos/FX/botín**: si se llama
directo, quedan colgados; el camino normal (`enter → setupRun → resetRun`) los
limpia después (`arena.js:216-218,559-562`); (b) `ArenaScene` se construye en el
boot y llama `rebuildWorld()` (`arena.js:201-202`) aunque no juegues el
roguelike; (c) las fugas P1 siguen.

**Propuesta.** Que `buildWorld` llame `purgeArena`/`clearGroundLoot` antes de
reemplazar el mundo; construir el barrio recién en `enter`; conservar el orden
actual como fallback. Costo: **chico**.

## P6 — Pase de luz: gradientes por frame (GRAVEDAD: BAJA)

**Evidencia.** La arena no usa el shader `LightPost`; usa `LightOverlay` sobre
canvas (`lighting.js:116-226`): velo + hasta 8 luces con `createRadialGradient`
y ~40-60 strings `rgba()` por frame; los radios de nieve son 310 px (más grandes
que la vista).

**Propuesta.** Cachear gradientes por `(kind, color, radio)` y dibujar con
traslación; o implementar `apagonParams()` y usar el shader existente. Costo:
**chico-mediano**.

---

# 5. Mantenibilidad y malas prácticas

## M1 — El Minijuego contamina el save real (GRAVEDAD: ALTA) — **verificado**

**Evidencia.**
- `ArenaScene.pickResult` llama `game.endRun` si existe (`arena.js:1253-1267`),
  y en `main.js` **siempre** existe.
- En el Minijuego `game.run` es `null`, pero `game.scene.save` es un objeto
  (`arena.js:179,210`); `game.endRun` lo toma como “save vivo”
  (`main.js:309-315`) y escribe.
- Prueba headless (`tools/diag/minigame_save.mjs`): save inicial con
  `muertes:1`, botín 7/3/1/2, `mochila:null`. Se entra al Minijuego, se muere
  con 5 chatarra y se elige “Volver a la casa”. Resultado:
  `muertes:2` y `mochila:{loop:2,contenido:{chatarra:5,...}}`.
- El diseño decía que sin `game.endRun` el Minijuego reinicia
  (`docs/brief_rl_D_resultado.md:56-58`); al existir siempre, ese camino quedó
  muerto.

**Propuesta.** En `src/main.js` (`startArena`, `endRun`) y
`src/scenes/arena.js` (`pickResult`), pasar `isolated: true` al Minijuego o
comprobar `game.run`; en modo aislado usar `restart()` y nunca
`endRun`/`writeSave`. Test de que el Minijuego no toca localStorage. Costo:
**chico**.

## M2 — Sacarse el traje en la calle ya no mata (GRAVEDAD: ALTA)

**Evidencia.** `main.js:478-480` llama `game.changeScene('death')` desde dentro
de `game.equipAnim`; `changeScene` descarta el pedido si `game.equipAnim` sigue
vivo (`main.js:180-182`). No hay reintento ni escena pendiente. El cambio se
pierde.

**Propuesta.** Guardar un `pendingScene` y ejecutarlo al terminar `equipAnim`, o
hacer la transición después de limpiar `game.equipAnim`. Costo: **chico**. (Es
código previo al roguelike, pero es un bug real.)

## M3 — Si `writeSave` falla, la salida se pierde igual (GRAVEDAD: ALTA)

**Evidencia.** Todos ignoran el `false` de `writeSave` (`main.js:249,300,315`,
`taller.js:339`, `story.js:76`). Peor: `endRun` escribe (`main.js:315`) y luego
`enterBase()` vuelve a leer de localStorage (`main.js:276-280`); si la escritura
falló (storage lleno/privado), se pierde el botín y la mochila de la salida sin
aviso. `startRun` también usa `loadSave()` en vez de `game.baseSave`
(`main.js:299`).

**Propuesta.** Usar el save en memoria como fuente (`game.baseSave`), avisar una
vez si `writeSave` falla y no recargar de storage en el mismo flujo. Costo:
**chico**.

## M4 — Save sin migración ni respaldo; acceso a localStorage fuera del `try` (GRAVEDAD: MEDIA)

**Evidencia.** `loadSave` devuelve un save vacío si `v !== 1`
(`save.js:44-50`): no hay migración. El parámetro por defecto
`storage = globalThis.localStorage` se evalúa **antes** del `try` (`save.js:44,
57,67`); si el getter tira (origen restringido), no lo atrapa. Los unknowns se
copian tal cual (`copySave`).

**Propuesta.** `v:2` con migración desde `v:1`, clave de respaldo antes de
escribir y un helper `storageOrNull()` dentro de try. Costo: **chico-mediano**.

## M5 — Abandonar una salida no está modelado (GRAVEDAD: MEDIA)

**Evidencia.** Desde el resultado, B/Start va a título sin `endRun`
(`arena.js:1239-1243,1269-1270`); desde la pausa, “Volver al título” también
(`main.js:509-513`). No se deja mochila, no suben `muertes`, `loop` ya quedó
incrementado y `game.run` queda apuntando a la salida vieja hasta que
`newGame`/`startRun` lo pisen.

**Propuesta.** En `src/scenes/arena.js` (`updateResult`/`pickResult`) y
`src/main.js` (pausa), definir `endRun({type:'abandono'})` (o no dejar salir sin
confirmar): decidir si cuenta como muerte (deja mochila) o como salida sin
botín; limpiar `game.run`. Costo: **chico**.

## M6 — `changeScene` descarta en silencio y no encola (GRAVEDAD: MEDIA)

**Evidencia.** `main.js:180-182` sale sin avisar si hay transición/equipAnim; los
llamadores asumen que el cambio ocurrió (`main.js:240,255,280,304`;
`world.js:2562`; `arena.js:1241,1270`). En el tick se captura `const scene =
game.scene` antes del cambio y se renderiza la escena vieja en el frame en que
`setScene` ya cambió `game.scene` (`main.js:428,453,537`); hoy lo tapa el fade.

**Propuesta.** En `src/main.js`, devolver `true/false`, guardar `pendingScene` y
reintentar, y releer `game.scene` después de la transición. Costo: **mediano**.

## M7 — Archivos gigantes (GRAVEDAD: MEDIA)

**Evidencia.** `src/scenes/world.js` 2.606 líneas, `src/scenes/arena.js` 2.075,
`src/menus.js` 1.186. En `arena.js`, el HUD son ~440 líneas (1514-1953), el
mundo ~250 (205-408), botín/consumibles ~320 (487-811), combate ~330
(986-1386), debug ~100 (1983-2075).

**Propuesta de partición sin reescribir** (métodos fachada para no tocar tests):
`src/arena/hudArena.js` (~430), `sceneWorld.js` (~250), `lootScene.js` (~320),
`visuals.js` (~170), `combatScene.js` (~330), `debug.js` (~100); `arena.js` queda
como orquestador (~600). Para `world.js`: `carry.js`, `warps.js`, `ghost.js`,
`targeting.js`, `hud.js`, `actions.js`, `story.js` (fachadas). Para `menus.js`:
`panels.js`, `titleMenu.js`, `pauseMenu.js`, `chestPanel.js` + barrel. Orden:
hojas primero (debug/visuals/panels), después HUD, después lógica. Costo:
**grande** (1,5-3 días), hacerlo recién después de tandas 1-4.

## M8 — Duplicación (GRAVEDAD: MEDIA)

**Evidencia verificada.**
- `put()`: 4 copias (`src/maps/street.js`, `barrio/pieces.js:14`,
  `garage.js:24`, `house.js:34`) y 3 tablas `SIZE` locales; ya existe
  `src/maps/barrio/sizes.js` generada.
- Wrap de texto: `font.js:64` (`wrapText`), `uiSkin.js:134` (`wrapLines`),
  `taller.js:478` (`wrapTwo`), `menus.js:463` (`drawWrappedNames`).
- `overlaps`: 6+ copias (`mapView.js:322`, `movement.js:56`, `hud.js:78`,
  `arena/hudLayout.js:22`, `enemies.js:20`, `reach.js:56`).
- `clamp`: 5 (`arena.js:78`, `mapView.js:327`, `comic.js:29`, `mate.js:142`,
  `movement.js:17`). `dirFromVector`: 2 (`enemies.js:78`, `arena.js:82`).
  `normalize`: 2 (`projectiles.js:44`, `arena.js:88`).
- `wnode woodSign` está **centralizado** en `titleUi.js:104` (no hay dos
  implementaciones del tablón), pero hay **dos sistemas de madera** con nombres
  de paleta homónimos y valores distintos: `uiSkin.WOOD0='#4a2a1a'` vs
  `titleUi.WOOD0='#5a3820'`, `titleUi.WOOD3='#a06a3c'`. El nub de pestaña está
  copiado en `menus.js:784-799`, `menus.js:1117-1132` y `taller.js:227-236`.

**Propuesta.** `src/maps/place.js` con `put(SIZE,...)` y `SIZE` única;
`wrapText` única con opciones `{scale,maxLines}`; `src/util/geom.js` con
`clamp/normalize/overlaps/dirFromVector`; `src/ui/palette.js` con tokens
semánticos; `src/ui/wood.js` con `woodTab`. Costo: **mediano**.

## M9 — `game` como bolsa global y acoplamiento escena↔main (GRAVEDAD: MEDIA)

**Evidencia.** `main.js:66-112` define ~47 campos; se agregan métodos y campos
dinámicamente; main lee `game.scene.save` (interno de la arena,
`main.js:312-313`); las escenas leen/escriben `game.flags` (37 usos de
`hasSuit/crafted/flags`), `game.run`, `game.inventory`, `game.transition` y
`game.emit` (solo historia). Algunas flags se pisan entre escenas.

**Propuesta.** Contrato de escena (`enter/update/draw/applyCamera/state`) y un
`RunSession` chico que encapsule `{loop, seed, save, bag}` fuera de `game`; no
hacer una refactorización masiva. Costo: **grande** si se hace entero;
**mediano** si se acota a `game.run` y `game.scene.save`.

## M10 — Tests frágiles y código muerto sostenido por tests (GRAVEDAD: MEDIA)

**Evidencia.**
- `test/assets2.test.js:37-48` fija “9 personajes, celdas 16×32, cols 8” y el
  tamaño del PNG; `test/chars_walk.test.js:80-81` fija
  `sheet.w = bloques * cols * cell.w`. Agregar un personaje o cambiar el ancho
  de la hoja rompe tests que no tienen que ver con el roguelike.
- No hay tests de `steer`; `barrio.test.js` ignora objetos (A5).
- `bestLine` (`arena/results.js:72`), `hudRects`
  (`arena/hudLayout.js:16`) y `mochilaOnDeath` (`arena/lootRun.js:81`) solo los
  usan tests; `street.arena`/`street.spawns` solo se usan en `test/maps*.test.js`.
  `crateMesh` siempre es `null` (`arena.js:298-299`); `mark('entrada')` y `endX`
  del barrio no se consumen.

**Propuesta.** Tests de contrato (dimensiones derivadas del JSON, no números
mágicos), test de flow field, y borrar o usar el código muerto. Costo:
**chico-mediano**.

## M11 — Nombres mezclados castellano/inglés (GRAVEDAD: BAJA)

**Evidencia.** Datos en castellano (`botin`, `mejoras`, `mochila`, `trajeHecho`,
`muertes`) conviven con inglés (`loop`, `best`, `run`, `bag`, `save`); en mapas
`medano`, `verja`, `pino`, `arbol`, `cortada`, `vias`, `esquina`, `plaza`. El
proyecto ya acepta datos de dominio en castellano; el problema es que el mismo
concepto cambia de idioma (`bag` vs `botin`, `save` vs `partida`).

**Propuesta.** Regla escrita: dominio/historia en castellano, código/API en
inglés; no renombrar en masa. Costo: **chico**.

## M12 — Dos silos de persistencia (GRAVEDAD: BAJA)

**Evidencia.** `eternauta.save.v1` (`run/save.js:4`) y
`eternauta.arena.best` (`arena.js:65,1950-1980`) separados; el récord de la
arena no viaja con el save y se escribe aunque el save falle.

**Propuesta.** unificar `best` en el save v2 (ya está el campo) y borrar la
clave vieja con migración. Costo: **chico**.

---

# 6. Plan de arreglos priorizado (tandas que no se pisan archivos)

La idea es que cada tanda se pueda convertir en un brief de implementación y
correr sin conflictos de archivos con las demás. Las tandas 1A y 1B se pueden
hacer en paralelo salvo `arena.js`; para evitar el choque, el arreglo de la
caja de municiones va con 1A (que ya toca `arena.js`) y 1B no toca `arena.js`
salvo el final.

### Tanda 0 — Red de seguridad (antes de tocar nada)
- **Archivos:** `test/flowfield.test.js` (nuevo), `test/enemies_flow.test.js`
  (nuevo), `test/barrio_objects.test.js` (nuevo), `tools/diag/` (ya está).
- **Qué:** tests puros del flow field y de `steer` que **fallen con el código
  actual** (pasillo en U: el bicho debe llegar; hoy se congela), test de
  alcanzabilidad con objetos, y un test que compare el sólido con el dibujo para
  una lista de sprites.
- **Aceptación:** los tests nuevos fallan hoy por la razón correcta; `npm test`
  sigue en 659 + los nuevos (los viejos verdes).
- **Costo:** chico-mediano.

### Tanda 1A — IA: flow field + separación + spawns (prioridad máxima)
- **Archivos:** `src/arena/flowfield.js` (nuevo), `src/arena/enemies.js`,
  `src/scenes/arena.js`, `src/maps/barrio/index.js` (bocas 2 baldosas adentro),
  tests.
- **Qué:** BFS 4-vecinos desde la baldosa del jugador cada 0,25 s o al cambiar
  de baldosa; máscara desde `solidBoxes`; máscara ancha para acorazado;
  `flowVector`; separación proyectada; paso real sin sonda de 16 px;
  desatascador `blockedX && blockedY`; validar `enemyBox` y alcanzabilidad en
  `pickSpawn`/`spawnEnemy`; fallback con punto libre o no spawnear; arreglar la
  doble caja de municiones en `arena.js` (C2).
- **Aceptación:** simulación U llega en <20 s; 40 bichos en pasillo no se
  congelan; `diag_atasco.png` ya no muestra bichos a >80 px; tests nuevos verdes;
  `npm test` y `npm run build` verdes; captura headless.
- **Costo:** mediano. **Riesgo:** medio (toca IA).

### Tanda 1B — Colisiones: sólidos que coinciden con el dibujo (prioridad máxima)
- **Archivos:** `src/maps/barrio/pieces.js`, `src/mapView.js`, nuevo
  `src/maps/solid.js` (helper), `tools/diag/barrio_*` (si hace falta).
- **Qué:** derivar el sólido del rect dibujado (offset incluido) o agregar
  `solidPx` por objeto; corregir casas/árboles/cajas/verjas/cartel/baranda;
  arreglar el loop del alambrado de vías (hueco 48 px) y alinear tablón;
  `southVerja` sin recolocar; recortar cercos al borde de la pieza; decidir
  autos/vagón.
- **Aceptación:** test de alineación sólido/dibujo (<2 px de error para los
  sprites de la lista); `diag_solidos_*.png` sin bandas rojas fuera del sprite;
  cruce de vías con 48 px; `npm test`/build verdes.
- **Costo:** mediano. **Riesgo:** medio (afecta todos los mapas si se toca
  `mapView`; si se acota al barrio, bajo).

### Tanda 2 — Manzanas con sentido (después de 1B, misma carpeta)
- **Archivos:** `src/maps/barrio/pieces.js`, `src/maps/barrio/index.js`,
  `src/scenes/arena.js` (bounds), tests.
- **Qué:** llenar todas las columnas elegibles de arriba (L1); cerrar salidas
  sin vecino con un cierre legible y sacar la estática de la calzada (L2);
  `backyard` privado/through y medianeras, cerrar la cortada (L3); botín en la
  plaza (L4); tipos sin reposición (L5); pasos a 48 px (L6); `minFeet=32` (L7);
  abrir/cerrar la casa (L8); topes de rieles (L9); verjas (L10).
- **Aceptación:** `layoutCells` sin salidas muertas en 200 semillas (o con
  cierre); 0 bocas sobre estática; 0 botín raw dentro de sólido; test de
  conectividad con objetos; capturas `diag_solidos_barrio.png` y
  `diag_caminable.png` con 0 bolsones grandes.
- **Costo:** mediano.

### Tanda 3 — Performance: fugas y canvas (archivos distintos de 1A/2)
- **Archivos:** `src/arena/feedback.js`, `src/footprints.js`,
  `src/arena/reset.js`, `src/sprite.js`, `src/snow.js`, `src/lighting.js`,
  `src/font.js`, `src/main.js`.
- **Qué:** P1 (liberar geometrías/materiales, compartir sombras/huellas,
  no disponer el glow compartido); P3 (cachear texto, no subir fade vacío,
  saltear luz tapada); P4 (allocaciones); P6 (gradientes); nieve con
  `InstancedMesh` o al menos 1 mesh por copo (P2).
- **Aceptación:** `leaks_gl.mjs` sin +400 buffers tras 600 huellas; draw calls
  bajan de ~550 a <300; `drawHud` <1,5 ms; captura de la salida sin cambios
  visuales.
- **Costo:** mediano.

### Tanda 4 — Save, flujo y Minijuego (main/taller/base)
- **Archivos:** `src/main.js`, `src/run/save.js`, `src/taller.js`, `src/base.js`,
  `src/scenes/arena.js` (solo `pickResult`), tests.
- **Qué:** M1 Minijuego aislado; M2 escena pendiente; M3 usar save en memoria y
  avisar si falla; M4 migración/backup; M5 abandono; M6 `changeScene` con
  retorno/pending; M12 unificar `best`.
- **Aceptación:** test headless de Minijuego no modifica localStorage; test de
  save v1→v2; test de abandono; `npm test`/build verdes.
- **Costo:** mediano.

### Tanda 5 — Mantenibilidad (última, sin cambiar comportamiento)
- **Archivos:** extracciones de `arena.js`, `world.js`, `menus.js`, helpers
  duplicados.
- **Qué:** M7-M10: módulos nuevos con fachadas, `place.js`, `geom.js`,
  `palette.js`, `wrapText` único, borrar código muerto, tests de contrato.
- **Aceptación:** mismos tests y capturas; archivos <800 líneas; sin cambios
  visuales.
- **Costo:** grande.

---

# 7. Artefactos, cómo reproducir y qué falta

## Capturas
- `docs/capturas/diag_atasco.png` — 5 cascarudos trabados contra la ferretería
  (semilla 3455), con círculos de diagnóstico.
- `docs/capturas/diag_atasco_acorazado.png` — acorazados y un cascarudo trabados
  en el paso a nivel de las vías (semilla 8).
- `docs/capturas/diag_solidos_barrio.png` — barrio 1280×640 con sólidos de
  objetos en rojo y baldosas sólidas en magenta.
- `docs/capturas/diag_solidos_<pieza>.png` — una por pieza (casa, esquina, plaza,
  vías, cortada), 320×320.
- `docs/capturas/diag_caminable.png` — heatmap: verde alcanzable, rojo libre no
  alcanzable, azul sólido; el cuadrado blanco es el spawn.

## Scripts de diagnóstico (todos en `tools/diag/`)
- `barrio_audit.mjs [seed]` — sólidos vs dibujo, BFS con caja del jugador,
  spawns/loot/exitHome, anchos de la cortada.
- `barrio_level_audit.mjs [desde] [hasta]` — botín, salidas muertas, bocas,
  piezas apiladas.
- `barrio_visual.mjs [seed]` — capturas con overlay y heatmap.
- `enemy_stuck.mjs` — simulación de steering (muro, bolsillo U, pasillo, 40
  bichos, CPU).
- `enemy_reach.mjs` — alcanzabilidad por tamaño de bicho.
- `flowfield_proto.mjs [seed]` — prototipo y costo del BFS.
- `arena_stuck.mjs`, `arena_choke.mjs`, `arena_choke2.mjs` — reproducción
  headless de atascos.
- `arena_perf.mjs` — meshes/texturas, update/drawHud, rAF.
- `arena_rebuild.mjs` — fugas/reuso tras 3 builds y textura de glow.
- `arena_drawcalls.mjs` — draw calls reales por frame.
- `leaks_gl.mjs` — buffers/texturas GL vivos.
- `minigame_save.mjs` — confirma que el Minijuego escribe el save real.

Todos levantan Vite en 5199 y lo matan al terminar; ninguno toca `src/`.

## Qué no se pudo verificar (y cómo cerrarlo)
- **FPS en hardware real:** Swiftshader da ~6 fps y no representa una GPU. Falta
  medir en la máquina del dueño; usar `arena_drawcalls.mjs` + un FPS contador.
- **Lectura visual fina** de cercos superpuestos y carteles: hace falta un crop
  4× con PIL (no se generó para no tocar arte).
- **Si el acorazado pasa siempre o a veces por el cruce de 32 px:** se vio
  inestable (4/4 en una corrida, 0/4 en otra). Es evidencia suficiente para
  arreglar el hueco, pero no una tasa.
- **El flujo de 3 reinicios con enemigos/huellas sembradas y renderer.info:**
  medimos buffers GL, no `renderer.info`; no está expuesto. Si se quiere
  `renderer.info`, hace falta un hook de una línea en `main.js` (no se hizo
  porque este trabajo es solo análisis).
- **Balance de dificultad** (rondas, daño, botín): no se evaluó; no era el foco.

## Estado de los checks
- `npm test`: **659 pass, 0 fail** (se vuelve a correr al cerrar este informe).
- `npm run build`: **OK**, sin errores (solo el warning de tamaño de chunk).
- No se modificó código del juego; los scripts de `tools/diag/` son nuevos y no
  los importa nadie en producción.
