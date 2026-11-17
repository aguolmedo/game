# Pulido: zoom del mundo, legibilidad de props y click

Diseño escrito por Claude el 2026-11-17 a partir del código actual (working tree sin commitear) y de las capturas de `qa/screens-round2-2026-11-16/`.
Está partido en **tareas chicas e independientes** (T1…T12, sin T9: descartada). Cada una dice qué archivos toca, qué hacer exactamente y cómo se verifica. Se hacen **de a una**, en orden, con `npm run build && npm test` verde al final de cada una.

Reglas para cualquier tarea:
- No commitear, no `git checkout/reset/stash`. Backup: `~/dev/game/eternauta-backup-20261117-prezoom.tar.gz`.
- No tocar `~/dev/game/bocetos/`. Arte solo vía `tools/art/*.py` + `tools/export_assets.py`.
- No abrir navegador interactivo. Capturas solo con Chromium headless (como en `qa/qa-round2-2026-11-16.md`), un proceso a la vez, matar Vite/Chromium al final.
- Si una tarea no cierra en un intento razonable, **parar y reportar qué bloqueó**, no improvisar un rediseño.

---

## 0. Qué detecté

### Escala
- La vista del mundo es 480×270 px de arte (`src/sprite.js:3-4`), tiles de 16 px → **30×17 tiles en pantalla**. Los mapas interiores entran casi enteros: casa 448×256, altillo 352×224, garaje 288×176. Resultado: todo se ve desde lejos y los objetos apoyados miden 4–8 px.
- **Mesa ratona del living** (`src/maps/house.js:111`, sprite `living_table` 32×24): los objetos apoyados son manchas de 3–5 px, con el mismo valor tonal que la madera. No se lee qué hay.
- **Mesa del altillo**: 6+ objetos (mate, vela, vino, cenicero, naipes, sifón…) en 3 tiles. Se superponen y forman una mancha, y el hover cae en el vecino (vela → "Agarrar Mate", vino → "Mirar Cenicero").
- **Mesa de la cocina** (`house.js:185`): reusa el sprite `living_table` (32×24) con **6 slots** (`[[6,8],[16,8],[26,8],[6,16],[16,16],[26,16]]`). Está saturada por diseño.
- HUD, diálogos y menús se leen bien. El problema es solo del mundo.

### Arquitectura relevante para el zoom
- `main.js:35` crea una cámara de mundo 480×270, y `main.js:37` un `uiCamera` que hoy solo usa `menuScene` (pausa/cofre/fade).
- **Toda la UI del mundo vive dentro de la escena del mundo** y se mueve con la cámara: `hud.ui` (`hud.js:61`, `setCamera`), `lightUi`, `extra`, `comicUi` y `captionUi` (`world.js:897-941`), todos en `cam + VIEW/2`. Si se cambia el tamaño de la cámara de mundo, **la UI se agranda con el mundo**. Por eso el zoom requiere sacar la UI a una escena propia (T1).
- Mouse: `game.screenToWorld` (`main.js:104`) asume que 1 px de vista = 1 px de mundo.
- Los prompts flotantes se posicionan como `b.x - cam.x` (`world.js:834-855`), es decir, en px de mundo relativos a la cámara. Con zoom hay que multiplicarlos por el factor.
- El globo (`balloon.draw(ex, cam.x, cam.y)`) es texto de UI anclado a una posición del mundo: mismo caso que los prompts.

### Click: lo que ya está bien (no tocar)
Prioridades en `pickTarget`/`pickAt`, extractor con teclado, prompt del extractor vs. "Salir sin traje", escalera de la casa, HUD oculto con el cofre, feedback al pisar el portón bloqueado y gap de glifos (`GLYPH_GAP`). Todo eso ya está arreglado en el working tree.

### Click: lo que está mal o flojo
1. **Dos textos distintos para lo mismo.** El prompt flotante usa `actionLabel()` ("Sentarse") y la barra de pistas usa `verbFor()` ("Mirar"). En `12-attic-gameplay.png` dice "Sentarse" arriba y "Mirar" abajo para el mismo objeto. El jugador no sabe qué pasa al hacer click.
2. **Fuera de alcance se pierde la información**: el prompt reemplaza el nombre del objeto por "Acercate", así que no sabés qué era ni qué harías.
3. **La barra de pistas en modo mouse es redundante y frágil.** "[mouse] Mirar" duplica el click sobre el objeto, y para que se pueda clickear existe toda la lógica de `lastHoverTarget`/`hoverGrace`/`pointOverInteractHint` (`world.js:660-754`). Es la parte más enredada y la que más bugs dio en QA.
4. **Toasts**: hasta 3 apilados al centro-abajo (`hud.js:57`, `hud.js:220-224`). Tapan al personaje y al prompt (`21-house-materials.png`: "+1 Secador / +1 Lata / +1 Rifle" encima de "Dejar Mate con yerba").
5. **Prompt flotante a la derecha del objeto** (`left:true, x: b.x+b.w+6`): tapa al NPC o al mueble de al lado (en el altillo, "Sentarse" queda arriba del banco de trabajo).
6. **Usar un ítem sobre la pava en el fuego la saca siempre** (`world.js useOnObject`: `if (this.game.pavaStation === obj.id) this.takePava()` sin mirar `itemId`). QA #7, sigue abierto.
7. Vela/vino de la mesa del altillo no seleccionables (QA #8). Se resuelve en buena parte con T3 (layout de la mesa) más el zoom.
8. Toasts de recolección: "+1 Secador de Elena", "+1 Lata…" son tres toasts por tres ítems. Ruido.

---

## 1. Decisiones de diseño

### Zoom
- **El mundo se ve a ~1.5× y la UI queda igual.** La vista del mundo pasa a ≈320×180 px de arte (20×11 tiles, escala tipo Stardew). La casa y el altillo pasan a scrollear con la cámara siguiendo a Juan; el garaje entra casi entero.
- **Pixel-perfect siempre**: cada px de arte del mundo ocupa un número entero de px de pantalla.
  - `scale = max(1, floor(min(innerW/480, innerH/270)))` (como hoy, para la UI).
  - `worldPx = max(scale + 1, round(scale * 1.5))` → 960×540: 3; 1440×810: 5; 1920×1080: 6.
  - `WORLD_W = (480*scale)/worldPx`, `WORLD_H = (270*scale)/worldPx` (pueden ser fraccionarios; la cámara se redondea a 1/worldPx).
  - `zoom = worldPx / scale` = factor mundo→UI (px de vista UI por px de mundo).
- **La arena queda con zoom 1** (necesita ver el campo para disparar). La escena declara `worldZoom: false`.
- `view.js` (ventanas), `death.js`, `end.js` y `title.js` son pantallas fijas: zoom 1.

### Modelo de click (mouse)
| Situación | Cursor | Marco | Etiqueta | Click izquierdo |
|---|---|---|---|---|
| Nada interactuable | flecha | — | — | Nada |
| Objeto al alcance | manito | dorado | **"Acción Nombre"** | Hace la acción |
| Objeto lejos | manito ámbar (`hand_far`) | ámbar | **misma** "Acción Nombre", más tenue | Juan mira hacia el objeto + toast "Acercate un poco." (con cooldown 1 s) |

- **Una sola fuente de texto**: `actionLabel(target)` decide la etiqueta y la acción (incluido usar el ítem en mano: "Instalar el secador", "Cargar nafta", "Dejar Mate"). `verbFor` desaparece del camino del mouse.
- **Click derecho = Mirar** (descripción del objeto, `lookLine`), siempre, sin caminar. Da acceso a los textos sin pisar acciones.
- **Barra de pistas en modo mouse**: deja de ser botonera del objeto. Muestra solo la leyenda fija `[click] Usar · [click der] Mirar · [I] Mochila`, sin estado de hover y sin grace. "Mochila" sigue siendo clickeable. Con teclado/pad la barra queda como está hoy.
- **Etiqueta flotante**: centrada **arriba** del marco del objeto, y si no entra, abajo. Clampeada a la pantalla, nunca encima del jugador.
- **Toasts**: máximo 2, arriba-centro (debajo del objetivo), 2.0 s. Los pickups que llegan en el mismo cuadro o en 0.3 s se agrupan: "+1 Secador, +1 Lata, +1 Rifle".

### Movimiento
- **Decidido por el usuario (2026-11-17): el mouse NO mueve al personaje.** Ni click en el piso ni caminar hasta el objeto. Se camina siempre con teclado/pad; el mouse solo apunta e interactúa.

---

## 2. Tareas

### T1 — Separar la UI del mundo en una escena con `uiCamera` (sin zoom todavía)
Objetivo: refactor puro; el juego se tiene que ver **idéntico** al terminar.
- `WorldScene` crea `this.uiScene = new THREE.Scene()` y mueve ahí `hud.ui`, `extra`, `comicUi` y `captionUi`, con mesh en posición fija `(VIEW_W/2, VIEW_H/2, z)`. Se borran todos los `setCamera`/`position.set(cam + VIEW/2)` de esos overlays (`hud.js:60-62`, `world.js:922,935,941`). `lightUi` **queda en el mundo** (es luz del mundo).
- Los prompts y el globo, que hoy reciben `x - cam.x`, siguen igual (ya están en coordenadas de vista).
- `main.js` render: `renderer.render(scene.scene, camera)` → si `scene.uiScene`, `clearDepth` + `render(scene.uiScene, uiCamera)` → `menuScene` como hoy.
- Lo mismo para `ArenaScene` si tiene overlays de UI en la escena del mundo (revisar `arena.js` y `arena/feedback.js`).
- Verificación: build y tests; capturas headless de altillo/casa/garaje/arena antes y después **iguales px a px** (comparar con PIL, diferencia 0 o solo en zonas animadas).

### T2 — Zoom del mundo
- Nuevo `src/viewport.js` (puro, testeable):
  ```js
  export function computeViewport(innerW, innerH, { zoom = true } = {}) {
    const scale = Math.max(1, Math.floor(Math.min(innerW / 480, innerH / 270)));
    const worldPx = zoom ? Math.max(scale + 1, Math.round(scale * 1.5)) : scale;
    return { scale, worldPx, worldW: 480 * scale / worldPx, worldH: 270 * scale / worldPx,
             zoom: worldPx / scale };
  }
  ```
  y un objeto mutable `viewport` que `main.js` actualiza en `resize()` y al cambiar de escena (según `scene.worldZoom !== false`).
- `WorldScene.applyCamera`: `camera.right = cam.x + viewport.worldW`, `camera.bottom = cam.y + viewport.worldH`.
- `mapView.cameraFor` usa `viewport.worldW/H` en vez de `VIEW_W/H` (centrado si el mapa es más chico, igual que hoy). `followCamera` redondea a `1/worldPx` en vez de a 1.
- `lightUi`: canvas de tamaño `ceil(worldW)×ceil(worldH)` (recrear en resize) y posicionado en `cam + world/2`. Revisar `light.draw` por usos de `VIEW_W/H`.
- `snow` y `footprints`: revisar que usen el tamaño de la vista de mundo.
- `screenToWorld`: `x = cam.x + v.x / viewport.zoom`, `y = cam.y + v.y / viewport.zoom`.
- **Mundo→UI** para prompts y globo: helper `worldToView(x, y) = ((x - cam.x) * zoom, (y - cam.y) * zoom)`. Reemplazar `x - this.cam.x` en `hudParams()` (`world.js:822-860`) y en `balloon.draw`. `hud.drawPrompt` ya clampea a la pantalla (`hud.js:145-147`).
- `ActionCursor` (corchetes) vive en el mundo: sin cambios.
- `ArenaScene.worldZoom = false`; también `view`, `death`, `end`, `title`.
- Tests: `computeViewport` (480×270→zoom 2 con worldPx 2; 960×540→3/320×180; 1440×810→5/288×162; 1920×1080→6/320×180), `screenToWorld` con zoom y `worldToView`.
- Capturas a 960×540 y 1920×1080: altillo, living (mesa ratona), cocina, garaje, calle y arena (sin zoom).

### T3 — Mesas legibles (arte)
Con el zoom puesto, mirar las capturas de T2 y recién ahí:
- **Ítems apoyados** (los frames de mesa en `tools/art/objects.py`/`items.py`): contorno oscuro de 1 px (`#1a1426`) en cada objeto, 1 px de luz arriba y tamaño mínimo de 6×6 de silueta. Contraste: el objeto tiene que diferir ≥ 25% en luminancia de la tapa de la mesa.
- **Tapa de mesa** (`living_table()` en `objects.py:719`, `table_truco()` en `:86`): tapa de un tono **liso** más claro o más oscuro que los objetos, sin veta, para que funcione de fondo. Borde frontal de 2 px para el volumen.
- **Mesa de la cocina**: sprite propio `kitchen_table` de 48×24 (3 tiles), en vez de reusar `living_table`. Slots a 2 filas × 3 con 14 px de separación horizontal. Ajustar `house.js:185-190` y la colisión.
- **Mesa del altillo**: repartir los 6+ objetos para que no se superpongan sus cajas (`cursorBox`): mínimo 2 px entre cajas. Si no entran, sacar un decorativo (sifón o cenicero) a otra superficie.
- Regenerar con `tools/export_assets.py`. Capturas antes/después del living, la cocina y el altillo, recortadas y ampliadas ×4.

### T4 — Una sola etiqueta de acción
- `actionLabel(target)` pasa a ser la única fuente; si no hay caso específico, cae a `verbFor(target) + ' ' + nombre` (p. ej. "Hablar con Elena", "Abrir Cajón", "Mirar Mesa").
- `hudParams()`: con mouse, el prompt usa siempre `actionLabel`, también lejos (no más "Acercate"); `far` solo cambia el color (`#ffb07a`) y el alpha 0.75.
- Test: para cada candidato de cada mapa, `actionLabel` devuelve un string no vacío.

### T5 — Etiqueta arriba del objeto
- `hud.drawPrompt` con `{ anchor: 'above' }`: centrada en `x`, base en `y - 3`. Si `y - h < 18` (choca con el objetivo), va abajo del marco.
- `hudParams()` manda `x = centro del marco`, `y = tope del marco` (vía `worldToView`).
- Si el rect de la etiqueta cruza la caja del jugador (también en vista), correrla al lado opuesto.
- Test unitario del layout: arriba por defecto, abajo cerca del borde superior, clamp horizontal.

### T6 — Click derecho = Mirar
- `input.js:101`: hoy ignora todo botón ≠ 0. Agregar `rightClick` (botón 2) con el mismo formato que `click`, y `contextmenu` con `preventDefault` sobre el canvas.
- `WorldScene`: `rightClick` sobre un objeto hovereado → `faceTarget` + `openDialog`/toast con `lookLine` del objeto (sin alcance: mirar se puede de lejos). Sobre nada: no-op.
- Test en `test/input.test.js` y uno de escena con un objeto.

### T7 — Barra de pistas fija en modo mouse
- `hudParams()` con `device === 'mouse'`: `hintActions = [{action:'interact', label:'Usar', static:true}, {action:'look', label:'Mirar', static:true}, {action:'bag', label:'Mochila'}]`. `interact` y `look` no son clickeables (`static`). Glifos: `mouse` (izq) y `mouse_r` (der). Si `mouse_r` no existe en `buttons.png`, agregarlo en `tools/art/buttons.py`.
- Borrar la lógica de resurrección del hover: `lastHoverTarget`, `lastHoverNear`, `hoverGrace`, `pointOverInteractHint`, `hintTarget`, `hintNear`, `hintChoiceTarget` y las ramas `hint.action === 'use'/'interact'` del click (`world.js:443-465`). `hudBlocksPoint` (oclusión real del HUD) **queda**.
- Teclado/pad: sin cambios.
- Actualizar/borrar los tests que cubrían la resurrección (`test/world_hints.test.js`, `test/clickable_hints.test.js`) y escribir los nuevos: con mouse, la barra no cambia al hacer hover.

### T8 — Toasts
- `hud.js`: máximo 2, vida 2.0 s, posición arriba-centro `y = 22 + i*16` (debajo del objetivo).
- `game.showToast(text, { group: 'pickup' })`: si el último toast es del mismo grupo y tiene menos de 0.3 s de vida consumida, se concatena (`"+1 Secador, +1 Lata"`), hasta 40 caracteres; si se pasa, se arma uno nuevo. `main.js:142` usa el grupo `pickup`.
- Test unitario de agrupado y del tope de 2.

### T10 — Pava: usar un ítem no la saca
- `useOnObject` (`world.js`): `takePava()` solo si `itemId` es null/la mano está vacía o el ítem no tiene uso sobre la estación. Con mate en la mano sobre la pava caliente en el fuego → la acción es **cebar desde la estación** si ese flujo existe; si no, toast "Primero sacá la pava." y no hace nada.
- `actionLabel` refleja lo mismo (no debe decir "Sacar la pava" si el click va a hacer otra cosa).
- Test en `test/world_fixes.test.js`.

### T11 — Cursor en overlays
- Cómic, caption, final y viñeta: `mouseCursor.setState('arrow')` al abrir y en cada cuadro mientras están abiertos (QA #17).

### T12 — QA corta
Un solo script headless, sin rondas largas:
1. Título → altillo: hover sobre la mesa, ver la etiqueta; caminar con teclado y agarrar el mate con click.
2. Click derecho sobre la ventana → texto de mirar. Click lejano a un objeto → etiqueta tenue, toast, Juan no se mueve.
3. Casa: living, mesa ratona (captura ×4), cocina.
4. Garaje: con el secador en la mano, acercarse con teclado y click en el extractor → instala. Con teclado, `F` frente al extractor.
5. Arena: sin zoom; disparar y comprar siguen andando.
Reporte breve en `qa/zoom-click-2026-11-17.md` con las capturas en `qa/screens-zoom-2026-11-17/`.

---

## 3. Orden y quién
- **T1 → T2** son el corazón del zoom y tocan render y mouse en todo el juego. Las hago yo (Claude, `coder`) o un worker DeepSeek **de a una**, con este documento como brief literal.
- **T3** (arte) después de ver T2: el criterio final de legibilidad lo pone el usuario mirando las capturas.
- **T4–T8, T10, T11** son chicas e independientes entre sí (cuidado: T4/T5/T7 tocan `hudParams`, ir en ese orden). Buenas para DeepSeek de a una.

---

## 4. Análisis general: por qué aparecen bugs como "Poner la pava al fuego" sobre la tijera

Escrito el 2026-11-17 después del bug del banco del altillo (con la pava en la mano, cualquier objeto del banco decía "Poner la pava al fuego") y de la etiqueta que saltaba abajo, encima de Juan y bajo el cursor.

### Causa 1: la regla "qué pasa si hago X sobre Y" está repartida en ~12 funciones
En `src/scenes/world.js` deciden, cada una por su cuenta: `actionLabel`, `itemUseLabel`, `verbFor`, `useLabel`, `handleMouseClick`, `handleRightClick`, `interact`, `useSelected`, `useOnObject`, `useMate`, `usePava`, `itemOverPava` y `targetObject`. Hay **29 comparaciones sueltas de ids de ítem** (`slot.id === 'secador'`, `startsWith('mate_')`…) y 14 chequeos de `station`.
- La **etiqueta** (lo que el juego promete) y la **ejecución** (lo que hace) salen de caminos distintos, así que pueden contradecirse. El T10 lo mostró: un parche cambió `interact` y otro `actionLabel`, y la regla se dio vuelta dos veces en un día.
- Cada fix de QA agrega un `if` en el lugar donde apareció el síntoma. Nadie mira las otras 11 funciones.

### Causa 2: los datos del mapa no dicen lo que el código supone
`station: 'heat'` está puesto en **todo el banco** (`attic.js:128`), no en el calentador. Cualquier regla que suba de "objeto apoyado" a "mueble" (`targetObject`) hereda la estación para la tijera, la tela o la yerba. El modelo de datos es ambiguo, y cada función lo interpreta distinto: `useSelected` sube al mueble, `interact` no.

### Causa 3: la etiqueta se posiciona con heurísticas encadenadas, sin lista de obstáculos
`promptRect` decide arriba/abajo/costado mirando solo una cosa a la vez: el borde, después el jugador. No sabe dónde está el cursor ni el HUD. Cada caso nuevo agregó una rama, y una rama ("si pisa al jugador, abajo") mandó la etiqueta justo bajo la manito.

### Causa 4: los tests fijan comportamientos puntuales, no invariantes
Los tests decían "con mate en la mano la etiqueta es 'Usar Mate con yerba'" o "si pisa al jugador va abajo". Cuando la regla cambió, el test se reescribió para que coincidiera. Ningún test dice "la etiqueta siempre describe lo que hace el click", "un uso de estación solo aparece sobre la fuente de esa estación" o "la etiqueta nunca tapa al jugador ni al cursor". Por eso nada atrapó el bug del banco.

### Causa 5 (proceso): QA → parche directo, sin modelo de interacción escrito
Los workers reciben "arreglá el hallazgo #7" y lo arreglan donde aparece. Falta una tabla única "objetivo × ítem en la mano → acción" contra la que se pueda revisar cada cambio.

---

## 5. Propuesta: un solo resolvedor de acciones dirigido por datos

### R1 — `src/actions.js`: resolvedor único (puro, sin Three.js)
```js
resolveAction(ctx, target, heldId, mode) → {
  kind: 'use' | 'take' | 'drop' | 'open' | 'talk' | 'look' | 'warp' | 'self' | 'none',
  label: 'Poner la pava al fuego',
  needsNear: true,
  run(world) { … },   // la ÚNICA implementación de esa acción
}
```
- `mode: 'primary'` = click izquierdo y E/A. `mode: 'item'` = F/X (uso del ítem: sobre el objetivo o sobre uno mismo). `mode: 'look'` = click derecho.
- `actionLabel`, `useLabel`, la leyenda y el prompt **solo leen `.label`**. El click, E y F **solo llaman `.run`**. Así, etiqueta y comportamiento no pueden divergir.
- Orden de reglas fijo y documentado: (1) uso del ítem en la mano sobre el objetivo (tabla R2), (2) acción propia del objetivo (warp, hablar, abrir, agarrar, sacar la pava, dejar sobre superficie), (3) mirar. Sin objetivo y en `primary`/`item`: uso sobre uno mismo.
- Se borran `itemUseLabel`, `itemOverPava`, `targetObject` y las ramas por id de `handleMouseClick`/`interact`/`useSelected`. `useMate`/`useOnObject` quedan como efectos que llaman las reglas.

### R2 — `src/data/actions.js`: tabla de usos declarativa
```js
export const ITEM_USES = [
  { item: /^pava_(fria|caliente)$/, on: { station: 'heat', free: true }, label: 'Poner la pava al fuego', effect: 'heatPava' },
  { item: 'secador', on: { station: 'extractor' }, label: 'Instalar el secador', effect: 'installExtractor' },
  { item: 'nafta', on: { id: 'generator' }, label: 'Cargar nafta', effect: 'fuelGenerator' },
  { item: 'tiras', on: { window: 'openable' }, label: 'Sellar la ventana', effect: 'sealWindow' },
  { item: 'mate_cebado', on: { kind: 'npc' }, label: 'Convidar mate', effect: 'shareMate' },
];
export const SELF_USES = [ /* yerba al mate, cebar, tomar, traje, rifle */ ];
```
Agregar un ítem nuevo = una fila, sin tocar `world.js`.

### R3 — Estaciones en la cosa exacta
`station: 'heat'` sale del banco y va al **calentador** (surface item, vía `INITIAL_ITEMS`/`items.js`) y a la **cocina** (objeto). La regla de R2 matchea solo objetivos que declaran la estación. "Subir al mueble" deja de existir como regla general.

### R4 — Colocación de etiquetas con obstáculos
`placeLabel({ anchor, size, obstacles: [jugador, cursor, HUD], view })` prueba candidatos en orden fijo (arriba centrado → arriba corrido a izquierda/derecha → arriba del jugador → abajo solo si arriba no entra en pantalla) y devuelve el primero que no pisa ningún obstáculo. El cursor entra como obstáculo (su caja de 12×12 desde el hotspot).

### R5 — Tests de invariantes sobre los mapas reales
Un test que carga attic/house/garage/street y, para **cada candidato × cada ítem del juego (o mano vacía) × cada modo**:
1. `resolveAction` devuelve `label` no vacío y `run` (o `kind:'none'`).
2. Un uso de `ITEM_USES` con `on.station` solo aparece si ese objetivo declara la estación. Ese test atrapa el bug del banco.
3. La etiqueta del prompt === `resolveAction(...,'primary').label`, y la leyenda === `resolveAction(null, held, 'item').label`.
4. Ejecutar `run` en un mundo falso produce el efecto de su `kind`: `take` suma al inventario, `drop` resta, `use` emite `itemUsed`.

Y para R4, un test por barrido: jugador, cursor y objeto en una grilla de posiciones; la etiqueta nunca pisa al jugador ni al cursor y siempre queda en pantalla.

### R6 — Proceso
- Todo hallazgo de QA de interacción se arregla en `data/actions.js` o en el resolvedor, nunca con un `if` en `world.js`.
- Si un fix contradice un test de invariante, se discute, no se reescribe el test.
- El brief a los workers incluye esta sección.

### Orden
R3 → R2 → R1 → R5 (los tests tienen que pasar contra el resolvedor) → R4. Tamaño: medio. Toca `world.js` (interacción), `hud.js` (layout), `maps/attic.js`, `maps/house.js`, `items.js` y `data/`. El movimiento, el zoom y el arte no se tocan.
