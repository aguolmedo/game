# Resultado · Dos botones: Hacer y Manos (19/11)

Implementado `docs/brief_dos_botones.md` según `art/direccion/DIRECCION.md` →
“Controles e interacción”. No se commiteó nada. No se tocó `bocetos/` ni el
Vite del 5173.

## 1. Mirar deja de ser botón

- `src/input.js`: se borró `LOOK_KEYS`, la tecla Q y los campos `look` /
  `lookPressed` del estado. Q ya no se lee ni se previene.
- `src/scenes/world.js`: se borró la rama que hacía mirar con Q o con B en el
  mundo. En menús y diálogos la B sigue siendo Volver: esas pantallas cortan
  en `dialog.update` / `choice.update` antes de llegar al input del mundo.
- `src/glyphs.js`: se borró la entrada `look` de `ACTIONS`. Quedan Hacer,
  Manos, Mochila, Volver, Menú, Mover y Elegir ítem.
- `src/actions.js`: `resolveAction(ctx, target, heldId)` ya no recibe modo; se
  borró el modo `look` (y el viejo `item`). `handleLook` ahora llama directo a
  `lookTarget`. Se actualizaron todas las llamadas de `src/` y de los tests
  que pasaban `'primary'`.
- La barra nunca agrega una entrada Mirar aparte (ver punto 5).

## 2. Hacer

- El botón se llama **Hacer** en los textos que ve el jugador: etiqueta de
  `ACTIONS.interact` (`src/glyphs.js`) y fila de Controles (`src/menus.js`).
  También se renombraron los comentarios de `src/actions.js` y de
  `src/scenes/world.js` (“Acción” → “Hacer”).
- **Mirar no pide alcance.** En los tipos sin verbo propio (decorado, cosa,
  superficie y aparatos cuyo estado es Mirar), la acción de Hacer devuelve
  `kind: 'look'` con `needsNear: false`. Así un click lejano sobre un decorado
  lo mira en vez de decir “Acercate un poco.”. Lo que no es mirar (abrir,
  hablar, prender, pasar, sentarse, agarrar/dejar, usar un ítem) sigue con
  `needsNear: true`.
- Orden sin cambios: uso del ítem en la mano → verbo del tipo → Mirar.

## 3. Manos pasa a la X

- `src/input.js`: `readGamepad()` lee Manos de **X = botón 2**. El RT (botón 7)
  ya no se lee y no cuenta como botón apretado. El click derecho del mouse
  sigue igual.
- Mapeo no estándar documentado y usado: A=0, B=1, X=2, Y=3, LB=4, RB=5,
  Start=9. No hay otros botones de verbo.
- `src/scenes/arena.js`: como el RT ya no existe, en el minijuego **dispara la
  X**; se corrigió además la leyenda, que decía “X” para recargar cuando el
  código ya recargaba con RB (ahora muestra `[RB] Recargar`).

## 4. Línea de mirar de la primera vez

- Estado por partida: `game.seenLook` (`src/main.js`). Lo borra `resetWorld()`
  (`src/surfaces.js`), que es lo que llama `game.newGame()`.
- `WorldScene.firstUseLine(target, action)`: si el objetivo tiene verbo propio
  (`container`, `device`, `passage`, `view`, `seat`), no es persona y la acción
  no es Mirar, busca su línea de mirar y, si todavía no se dijo, la marca y la
  devuelve. Texto: `lookLine` de `src/data/descriptions.js` (radio, reloj,
  escalera del altillo); si no hay, `warp.look` de los mapas; si no, la primera
  línea de su diálogo propio de `src/data/script.js` (ropero, cocina, portón…).
- `runAction` la muestra como toast **antes** del resultado. Si la acción abre
  un diálogo propio de la historia (Sentarse), el diálogo manda: la línea solo
  se marca como dicha, sin toast duplicado.
- **Pasos**: `tryWarp` usa `firstWarpLine`. La línea se muestra y el cambio de
  ambiente espera 1,2 s (`pendingWarp` + `updatePendingWarp`), tanto al usar el
  paso con Hacer como al pisarlo caminando. En la segunda vez pasa enseguida.
- Clave del registro: id del objeto o del warp. La radio y la escalera se
  probaron en headless: la línea sale una sola vez y `resetWorld()` la vuelve a
  habilitar.
- No dispara con Manos (agarrar/dejar): la regla del brief habla del uso del
  verbo del objeto, y Manos tiene su propia mecánica. Tampoco con Mirar: en ese
  caso la línea ya es el resultado.

## 5. Barra

- Solo tres clases de entrada: **Hacer** (si hay algo que hacer), **Manos** (si
  `resolveHands` devuelve algo) y **Mochila** (siempre). Nunca una entrada
  Mirar aparte. Cuando Hacer mira, el texto ya lo dice (“Mirar el parlante”).
- Glifos: mouse `[click]`, `[click der.]`, `[I]`; joystick `[A]`, `[X]`, `[Y]`.
- Si Hacer y Manos producen la misma etiqueta, se muestra una sola vez como
  Manos (mismo criterio que la tanda anterior).

## 6. Pantalla de Controles

`src/menus.js` → `CONTROLS_ROWS`, dos columnas y seis filas:
Hacer, Manos, Mover, Elegir ítem, Mochila, Menú. Manos con `mouse_r` / `X`.
Se borró la fila Mirar. Los textos siguen pasando el test de la fuente.

## 7. Tests

Nuevo `test/dos_botones.test.js` (11 pruebas):

1. Q y RT no hacen nada en el mundo (ni `lookPressed` existe).
2. X agarra y deja: flanco del botón 2 y ejecución de `Agarrar Mate` con Manos.
3. B en diálogo vuelve; en el mundo no mira.
4. La barra nunca muestra “Mirar” como entrada aparte (recorre los 4 mapas,
   objetos, cosas apoyadas, NPCs y warps) y el parlante queda como
   `Mirar el parlante` + `Mochila`.
5. Click lejano sobre un decorado lo mira y no avisa “Acercate un poco.”.
6. La línea de la radio sale una sola vez.
7. La escalera dice su línea antes de cambiar de ambiente y una sola vez.
8. La escalera del altillo toma su línea de la entrada `stairs` de
   `src/data/script.js` (“La escalera baja a la planta baja.”).
9. La escalera también la dice si se la pisa caminando (espera de 1,2 s).
10. `resetWorld()` borra `seenLook` y la línea vuelve en la partida nueva.
11. Recorrido del mate y la pava intactos (mirar/agarrar el mate, pava al
    fuego, uso propio `Tomar mate` y ciclo yerba → cebar → tomar).

Tests viejos actualizados (el comportamiento cambió a propósito):

- `input.test.js`: Q ya no mira; RT ya no es Manos; X (2) es Manos; el 3 sigue
  siendo Y; se borraron `xPressed` / `lookPressed`; F/R/Q no hacen nada.
- `controles.test.js`: nuevo estado de input; B y Q no miran en el mundo;
  glyphName sin Mirar; el mapeo A/B/X/Y.
- `controles_fix.test.js`: Controles sin fila Mirar, Manos con X y Hacer.
- `glyphs.test.js`: `ACTIONS.look` ya no existe; Hacer/X.
- `menus_ui.test.js`: seis filas y etiquetas nuevas.
- `right_click.test.js`: sin `lookPressed` (el click derecho sigue siendo
  Manos).
- `tipos.test.js`: la barra ya no suma Mirar; radio y ventana quedan con Hacer
  + Mochila; el test de fuente recorre una sola forma de resolver.
- `world_hints.test.js`: la barra de la radio es Hacer + Mochila y no hay
  entrada Mirar.

No hizo falta tocar los tests de Manos, del mate ni de la pava: siguen
pasando.

## Verificación

- `npm run build`: OK (Vite 6.4.6; solo el aviso ya existente de tamaño de
  chunk).
- `npm test`: **475 tests, 475 pass, 0 fail**.
- Auditoría de alcance en headless con Vite en 5197:
  `URL=http://localhost:5197/ node art/concept/auditoria_alcance.mjs` →
  altillo 36/36, casa 39/39, garaje 16/16, calle 5/5, **0 fallos**.
  `test/alcance_audit.test.js` también pasa dentro de `npm test`.
- `node art/direccion/capturas.mjs`, `node art/direccion/capturas_ctrl.mjs` y
  `node art/direccion/capturas_manos.mjs` con `URL=http://localhost:5197/`:
  todas las capturas OK, **sin errores de página**.
- `node art/direccion/pruebas_manos.mjs`: 22/22 pruebas OK (regresión de Manos,
  mate, pava, muebles y alcance).
- Headless de la radio: primer Hacer muestra `Suena bajito, como si no quisiera
  molestar.` y después `La radio se prende.`; el segundo Hacer solo muestra el
  resultado y `seenLook.radio` queda en `true`.
- El Vite de 5197 se mató por PID (`1204974` y, en la pasada final sobre el
  código definitivo, `1228037`); 5173 no se tocó.

### Capturas regeneradas

En `art/direccion/doc/capturas/`:

- `manos_controles.png`: Controles nuevo (Hacer, Manos X, sin Mirar).
- `manos_barra_dejar.png`: `[click der.] Dejar Mate · [I] Mochila`.
- `manos_barra_sobre_juan.png`: `[click] Tomar mate · [click der.] Dejar Mate
  cebado · [I] Mochila`.
- `manos_barra_accion_sin_objetivo.png` (nombre histórico): `[A] Tomar mate ·
  [X] Dejar Mate cebado · [Y] Mochila`.
- `manos_barra_pava.png`: `[A] Mirar la cocina · [X] Agarrar la pava · [Y]
  Mochila`.
- `tipos_radio.png`: `[click] Prender la radio · [I] Mochila`, sin entrada
  Mirar.
- `tipos_parlante.png`: `[click] Mirar el parlante · [I] Mochila`.
- `tipos_ventana.png`: `[click] Asomarse a la ventana · [I] Mochila`.
- `dos_primera_vez.png`: Juan frente a la escalera de la casa con el toast “La
  escalera rebatible que sube al altillo.”, la barra `[click] Subir · [I]
  Mochila` y el paso todavía sin ejecutarse.
- También se regeneraron las capturas generales (`esc_*`, `luz_*`, `dlg_*`,
  `vineta_*`, `menu_*`, `arena`, `muerte`, `final`, cursor, barra y mochila)
  porque corren en los mismos scripts.

`art/direccion/capturas_ctrl.mjs` ahora mueve el puntero sobre el objeto en
`tipos_*` (con mouse la barra lee el hover, no el casillero de acción) y tiene
el bloque de `dos_primera_vez.png`, disparado desde un casillero de piso debajo
de la escalera para no activar el warp automático antes de la captura.

## Puntos que no se pudieron cumplir exactamente / decisiones

- La línea de la primera vez de una **vista** (Asomarse) se muestra como toast
  y enseguida se abre la vista; el toast queda en el HUD del mapa anterior.
  El brief solo pide la espera antes de cambiar de ambiente para **pasos**, así
  que no se agregó una demora para las vistas.
- Manos no dice la línea de la primera vez: la regla se aplicó a Hacer y a los
  pasos, que son los usos que “reemplazan” al viejo Mirar.
- El estado se guarda en `game.seenLook` y lo borra `resetWorld()`, que es el
  reset real de la partida (`game.newGame()`). No hay otra función `reset()` en
  el juego.
- En la arena, la X dispara porque el RT se borró en todo el juego. Es un modo
  aparte y no aparece en la tabla de Controles del mundo.
- No se regeneraron las láminas de `art/direccion/laminas.py` (no lo pide el
  brief); las capturas sí.

## Archivos principales cambiados

- Lógica: `src/input.js`, `src/actions.js`, `src/glyphs.js`,
  `src/scenes/world.js`, `src/scenes/arena.js`, `src/menus.js`, `src/main.js`,
  `src/surfaces.js`.
- Tests: `test/dos_botones.test.js` (nuevo), `test/input.test.js`,
  `test/controles.test.js`, `test/controles_fix.test.js`, `test/glyphs.test.js`,
  `test/menus_ui.test.js`, `test/right_click.test.js`, `test/tipos.test.js`,
  `test/world_hints.test.js`.
- Capturas y docs: `art/direccion/capturas_ctrl.mjs`,
  `art/direccion/DIRECCION.md`, `docs/diseno_manos.md` (nota y tabla de
  entradas al día), las capturas de `art/direccion/doc/capturas/` y este
  documento.
