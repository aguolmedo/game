# Fix 5 — resultado final (mantenibilidad)

Refactor puro: mismos tests (748, ver abajo), build OK y capturas sin diferencias
estructurales. Se completaron los pasos 1, 5 y 6 del brief después de las partes
A (arena), B (menús) y C (world). No se hizo ningún comando git que escriba; la
foto previa (`/home/mateyfasito/dev/game/fix5_snapshot/`) no se tocó y
`bocetos/`, `art/` y `public/` quedaron intactos.

## 1. Mapa completo de módulos nuevos

### Parte A — `src/scenes/arena.js`
La escena quedó como fachada (278 líneas) que cuelga cada función de módulo en
el prototipo. `ARENA` vive en `src/arena/config.js` y se reexporta.

| Archivo | Contenido | Líneas |
|---|---|---:|
| `src/scenes/arena.js` | fachada: constructor, update, cámaras, getters y binding | 278 |
| `src/arena/config.js` | `ARENA` mutable de la salida | 4 |
| `src/arena/util.js` | `clamp` (ahora reexportado de `src/geom.js`) | 2 |
| `src/arena/inputScene.js` | bindMouse, readControls, readAim, faceAim | 140 |
| `src/arena/runSetup.js` | setupRun, rebuildWorld, startPoint, resetRun, enter, reset | 169 |
| `src/arena/worldScene.js` | buildWorld/disposeWorld, luces, spawns, sólidos, flow fields | 252 |
| `src/arena/lootScene.js` | botín del piso, mochila y sobreviviente | 194 |
| `src/arena/consumablesScene.js` | bengala, botella, fuego | 130 |
| `src/arena/combatScene.js` | disparo, daño, parche, caja, casa, enemigos | 199 |
| `src/arena/resultFlow.js` | muerte, récord, viñeta, resultado, reinicio | 135 |
| `src/arena/wavesScene.js` | rondas y spawns | 125 |
| `src/arena/enemyVisuals.js` | mallas y animación de bichos | 80 |
| `src/arena/fxScene.js` | partículas | 60 |
| `src/arena/hudArena.js` | HUD, carteles, toasts, mira, mochila, resultado | 475 |
| `src/arena/debugScene.js` | estado y atajos de QA | 55 |

### Parte B — `src/menus.js`
`src/menus.js` es una fachada de 15 líneas que reexporta los 20 nombres
públicos de siempre.

| Archivo | Contenido | Líneas |
|---|---|---:|
| `src/menus/shared.js` | medidas, puntero, cajas y helpers de UI | 66 |
| `src/menus/title.js` | título + vistas de Controles y Créditos | 239 |
| `src/menus/controls.js` | datos de la tabla de Controles | 85 |
| `src/menus/pause.js` | pausa: mochila / fabricar / opciones | 546 |
| `src/menus/chest.js` | panel de cofre | 272 |

### Parte C — `src/scenes/world.js`
La clase quedó como fachada (416 líneas) con un delegador de una línea por
método; los módulos son funciones `(scene, ...args)`.

| Archivo | Contenido | Líneas |
|---|---|---:|
| `src/world/actions.js` | resolución y ejecución de acciones, warps | 373 |
| `src/world/camera.js` | cámara, apagón/luz, warnNear | 130 |
| `src/world/carry.js` | acarreo de muebles | 153 |
| `src/world/constants.js` | PRIORITY, OWN_VERB_TYPES, NPC_NAMES | 15 |
| `src/world/ghost.js` | silueta fantasma de Manos | 226 |
| `src/world/helpers.js` | capName, boxOf, boxOfWarp, warpLabel | 36 |
| `src/world/hud.js` | HUD, etiquetas, cursor de acción, barras | 325 |
| `src/world/interact.js` | hablar, recoger, mate/pava, warps, cómic | 416 |
| `src/world/look.js` | Mirar y líneas de primera vez | 146 |
| `src/world/pointer.js` | puntero, hover y hotbar | 187 |
| `src/world/state.js` | estado del mundo, historia, luces | 96 |
| `src/world/update.js` | candidates y bucle de update | 332 |

### Parte D — helpers compartidos
| Archivo | Contenido | Líneas |
|---|---|---:|
| `src/geom.js` | `pointInRect`, `hitIndex`, `hoverIndex`, `rowRects`, `gridRects`, `overlaps`, `clamp` | 63 |
| `src/maps/place.js` | `place`, `placer(SIZE)`, `slotPlacer(SIZE)` | 44 |
| `src/uiHit.js` | reexporta la geometría de `geom.js` + `mousePoint` | 12 |

## 2. Helpers unificados

- **`put()` de los mapas** → `src/maps/place.js`. Las cuatro copias
  (`street.js`, `house.js`, `garage.js`, `barrio/pieces.js`) eran idénticas
  salvo el `SIZE` de cada mapa. Ahora cada mapa hace `const put = placer(SIZE)`.
  La variante de `pieces.js` (`alignLeft`) quedó soportada por el helper común.
  También se unificó el `slots()` duplicado de `house.js`/`garage.js`
  (`slotPlacer(SIZE)`).
- **Wrap de texto** → `src/font.js#wrapText`. Un solo algoritmo con opciones:
  `scale`, `spacing`, `maxLines`, `truncate` y `firstWidth`.
  - `uiSkin.wrapLines` quedó como adaptador de 1 línea (`spacing: 1`,
    `maxLines`, `truncate: true`).
  - `taller.js` ya no tiene `wrapTwo`: llama a `wrapText` con `maxLines: 2`.
  - `menus/pause.js#drawWrappedNames` usa `wrapText` con `firstWidth`.
  - Se verificó equivalencia exacta contra las implementaciones viejas con
    147.000 casos aleatorios (texto, ancho, escala, maxLines): **0 diferencias**.
- **Geometría** → `src/geom.js`. Se mudaron `pointInRect`, `hitIndex`,
  `hoverIndex`, `rowRects` y `gridRects` desde `uiHit.js`; `uiHit` los
  reexporta (los tests siguen importando de ahí) y conserva `mousePoint`.
  Todos los importadores internos usan `geom.js`.
  - `overlaps` estaba copiado en `movement.js`, `mapView.js`, `hud.js`,
    `arena/hudLayout.js`, `arena/enemies.js` y `reach.js`, y embebido en
    `arena/flowfield.js`: ahora hay una sola definición en `geom.js`
    (`mapView`, `movement` y `hudLayout` la reexportan para no cambiar su API).
  - `clamp` estaba repetido en `mapView.js`, `mate.js` y `comic.js`; se unificó
    en `geom.js`. `arena/util.js` ahora la reexporta. Se dejaron los `clamp`
    especiales de `movement.js` (admite límites infinitos), `input.js`
    (rueda), `run/radio.js` (nivel) y `effectsRun.js` (inset), que no son el
    mismo contrato.
  - `warpAt`/`warpAtTile`/hover del jugador usan `pointInRect` en vez de
    repetir la comparación a mano.
- **Paleta de madera/UI** → `src/uiSkin.js` es la fuente. `titleUi.js` importa y
  reexporta `OUT`, `WOOD1`, `AM3`, y define `WOOD3` como alias de
  `uiSkin.WOOD2` (mismo `#a06a3c`; el `WOOD0`/`WOOD2` del cartel son tonos
  propios y se conservan). Se agregó `TEXT` (`#fff0c0`) a `uiSkin` y se
  reemplazaron literales duplicados en `hud.js`, `world/hud.js`, `glyphs.js`,
  `taller.js`, `arena/hudArena.js`, `mate.js`, `npc.js`, `main.js` y
  `scenes/garage.js`. Los colores de iluminación (`#ffcf6e` como `WARM` en
  `lighting.js`, mapas) se dejaron: son dominio de luz, no de UI.

## 3. Código muerto borrado

- `src/maps/street.js`: `arena` y `spawns` (configuración de la calle vieja del
  minijuego; la salida usa `buildBarrio`, nadie en `src/` los leía). Se ajustó
  el comentario de los médanos.
- `src/glyphs.js`: `drawHintBar` (sin usos; la barra real es
  `drawPromptBar`/`promptBarLayout`).
- `src/lightpost.js`: `LIGHT_COLORS` y sus `CANDLE_VEC`/`EMBER_VEC`/`SNOW_VEC`.
- `src/data/surfaces.js`: `INITIAL_CONTAINERS`.
- `src/items.js`: `ITEM_ORDER`.
- `src/maps/grid.js`: `tilePx`.
- `src/placement.js`: `furnitureTiles`.
- `src/run/rng.js`: `randInt`.
- `src/sprite.js`: `objectSprite`.
- `src/titleUi.js`: `GRAIN`.
- `src/uiSkin.js`: `SEL`, `BAD`.
- `src/arena/debugScene.js`: `debugAddPoints` (no estaba ni en el contrato de la
  fachada; `debugGive`, `debugSpawn` y `debugSetRound` siguen).
- `src/arena/worldScene.js`: se limpió el campo muerto `crateMesh` (nadie lo
  asignaba; sólo se nuleaba al disponer el mundo).
- Imports muertos: `heat`/`coolPava` en `main.js`, `fillRect` en `maps/house.js`
  y `drawText` en `npc.js`. `wrapTwo` en `taller.js` (reemplazado por
  `wrapText`).

No quedan helpers duplicados de `put`, wrap, `overlaps` ni `clamp` (grep
exhaustivo). El chequeo de imports/ciclos propios no encontró imports sin uso
ni ciclos reales (el único "ciclo" que reporta el heurístico es un comentario de
`story.js` que menciona `import { initStory } from './story.js'`).

## 4. Tests cambiados (siguen siendo 748)

No se borró ningún test. Se adaptaron aserciones que sólo sostenían datos
muertos o números frágiles:

- `test/maps.test.js`: en vez de exigir `street.spawns && street.arena`, exige
  `street.spawn` con coordenadas finitas (contrato vivo de la escena de calle).
- `test/maps2.test.js`: se quitó el bloque de `street.spawns`/`street.arena`
  (sólo verificaba los datos muertos) y se reemplazó por `street.spawn` y
  `street.bounds` válidos.
- `test/assets2.test.js` (chars2): ya no hardcodea `9*8*16`, `cols=8`, `rows=4`
  ni `block.x = i*8*16`. Verifica el contrato: celdas 16x32, 4 direcciones,
  `cols = walk + idle`, `rows = dirs`, índices de cuadros válidos, un tiempo por
  cuadro, todos los ids con bloque, bloques enteros y dentro de la hoja, sin
  superponerse.
- `test/assets.test.js`: `chars.png` y `portraits.png` se validan contra su JSON
  (los bloques entran en la hoja; retratos = `order.length * cell.w`), en vez de
  exigir `672x128`/`224x32`.
- `test/death_assets.test.js`: el PNG de muerte se compara con el `size` de su
  JSON, en vez de repetir `350x160` en dos archivos.

## 5. Capturas headless y diff de píxeles

Servidor: `npx vite --port 5199 --strictPort` (PID guardado y matado al final).
Herramientas: `tools/base_screens.mjs` (0 errores de consola) y
`tools/salida_screens.mjs` ("sin errores de página"). Se comparó cada PNG de
`docs/capturas/` con `docs/capturas/fix5_antes/` (960x540, mismo nombre).

> **Bug real encontrado y arreglado por las capturas:** la fachada de world
> tenía `applyCamera(camera) { return camera.applyCamera(...) }`; el parámetro
> tapaba el módulo `camera.js` y tiraba `camera.applyCamera is not a function`
> en cada frame (169 errores en la primera corrida de base). Se renombró el
> parámetro a `cam`. Después: 0 errores.

Columnas: `%>0` = cualquier píxel distinto; `%>8` = diferencia visible
(delta máximo de canal > 8, para descartar el corrimiento global de ±1).

| Captura | %>0 | %>8 | Lectura |
|---|---:|---:|---|
| base_1_titulo_continuar | 0.995 | 0.909 | copos/estrellas y brillo de ventanas (animados) |
| base_2_garaje | 0.382 | 0.325 | un copo en la ventana + un cuadro de animación de NPC |
| base_2_garaje_mochila | 0.000 | 0.000 | idéntica |
| base_3_taller_favalli | 0.000 | 0.000 | idéntica |
| base_4_taller_lucas | 0.407 | 0.003 | 18 px: cuadro de animación del NPC que asoma junto al cartel |
| salida_inicio | 1.537 | 1.434 | copos |
| salida_esquina | 19.098 | 1.844 | copos (el %>0 alto es corrimiento global de ±1) |
| salida_mochila | 2.179 | 2.055 | copos + bob de la mochila |
| salida_mochila_flecha | 2.036 | 1.895 | copos + bob de la flecha |
| salida_bengala | 7.659 | 1.873 | copos + chispas de la bengala |
| salida_botella | 10.200 | 1.810 | copos + fuego |
| salida_porton | 44.593 | 1.746 | copos (corrimiento global de ±1 en el cielo) |
| salida_frecuencia | 3.041 | 2.576 | copos + etiqueta "Botella de nafta" (bob de 1 px) |
| salida_sobreviviente | 3.070 | 2.886 | copos + **regalo aleatorio** del sobreviviente ("+2 pieza" vs "+2 goma") |
| salida_resultado | 2.863 | 0.911 | copos |

No hay diferencias de layout, texto de UI, sprites ni colores de materiales:
la mochila y el taller de Favalli dan **0 píxeles**, y el de Lucas sólo 18 px
de un cuadro de animación del NPC que asoma al costado. El
resto es nieve/animación. En `salida_sobreviviente` cambia el tipo de regalo
porque `survivorGift(scene.rng)` consume el RNG sembrado después de una
secuencia que depende de cuántos bichos/objetos aparecieron en tiempo real; es
aleatoriedad conocida del minijuego, no del render.

Control de aleatoriedad de la herramienta: una segunda corrida completa de
`salida_screens.mjs` contra la primera dio diferencias mucho mayores
(p. ej. `salida_sobreviviente` 96 %, `salida_resultado` 55 %) porque el
recorrido del bot depende de tiempos de reloj y termina en otra cámara. La
tabla de arriba usa la primera corrida (la que coincide con las capturas
"antes"); la segunda se descartó. Eso confirma que el residuo es del arnés de
capturas, no del refactor.

## 6. Tamaño de archivos

Todos los archivos de `src/` quedan por debajo de ~800 líneas salvo:

- `src/main.js` — **887 líneas**. Es el bootstrap preexistente del juego
  (carga de assets, `Game`, router de escenas, guardado, modos base/arena).
  No estaba en los pasos 2–4 del brief (arena, world, menús) y partirlo
  implica tocar el ciclo de vida de las escenas sin tests de comportamiento que
  lo cubran; se deja anotado como candidato para un fix futuro.

El más grande después de `main.js` es `src/arena/feedback.js` (722).

## 7. Verificación final

- `npm test`: **748 tests, 748 pass, 0 fail** (misma cantidad que antes; no se
  eliminó ningún test, sólo se adaptaron aserciones de datos muertos/números
  frágiles).
- `npm run build`: **OK** (Vite, sin errores; sólo el aviso preexistente de
  chunk > 500 kB).
- `node --check` sobre todos los archivos tocados: OK.
- Chequeo propio de imports sin uso y ciclos: limpio (salvo el falso positivo
  del comentario de `story.js`).
- Capturas: base con **0 errores de consola**, salida **sin errores de página**;
  diff de píxeles de la tabla.
- Vite y Chromium cerrados por PID (no se usó `pkill -f`).
