# Pulido del roguelike — worker F (resultado)

Seis arreglos puntuales, sin features nuevas ni refactors. `npm test`: **659 tests
verdes** (642 + 17 nuevos). `npm run build`: OK (solo el aviso de chunk > 500 kB).

## 1. Título con 5 opciones
- `src/titleUi.js`: nueva función pura `fitSignWidth(sign, widest, margin = 12)`:
  ensancha el cartel de madera sin mover su centro y deja 12 px de aire por lado
  (>= 8 px aun descontando el marco de 4 px).
- `src/menus.js` (`TitleMenu.signBox`): mide la opción más ancha a scale 2 y aplica
  `fitSignWidth`. Con 5 opciones el cartel pasa de 160 a 174 de ancho, centrado en
  240; la letra sigue en scale 2. Con 4 opciones no cambia (160). Click, pad y
  teclado usan el mismo `signBox()`.
- Test nuevo en `test/title_ui.test.js`.

## 2. Cartelitos del garaje en modo base
- `src/scenes/garage.js`: reubicados los anclajes (coords de mundo):
  Favalli (56, 86) y Lucas (246, 58) quedan igual; **Elena pasa a (184, 140)**
  (abajo de ella, ya no tapa la cabeza de Juan) y **Electrógeno a (226, 128)**
  (abajo del electrógeno). Ninguno se superpone entre sí ni con la caja de un NPC.
- Nueva función pura `baseLabelRects(labels, measure, cam, zoom)`; la usa el
  dibujo y el test.
- Tests nuevos en `test/base_casa.test.js`: no-superposición estricta de los 4
  rectángulos y contra las cajas de los 3 NPC, con zoom 2 y 1,5 (los del juego).
  El caso puntual de Elena/Juan queda cubierto.

## 3. HUD de la arena: controles sin pisar paneles
- Nuevo `src/arena/hudLayout.js` (puro): `HUD_PANEL_Y`, `TRAJE_PANEL`,
  `EXTRA_PANEL`, `AMMO_PANEL`, `hintBarRect(total)`, `hudRects()` y `overlaps()`.
- `src/scenes/arena.js`: los tres paneles suben 16 px (y = 220, alto 28) y la fila
  de controles queda sola abajo (y = 254, alto 13), con 6 px de aire. Sigue siendo
  una sola fila (entran los 6 controles posibles, ~406 px de ancho) y no toca
  ningún panel en ningún caso.
- Test nuevo `test/arena_hud_layout.test.js`: dentro de pantalla, sin
  superposiciones (con y sin panel EXTRA) y controles debajo de los paneles.

## 4. Luz de la bengala
- `src/lighting.js`: `MAX_LIGHTS = 8` y `prioritizeLights(lights, max, origin)`,
  que siempre conserva las luces que no son de nieve (bengala, farol, velas) y
  recorta las luces de nieve MÁS LEJANAS al jugador. `LightOverlay.lights/draw`
  la usan (origen = pies de Juan).
- En el apagón la bengala (`kind: 'ember'`) ahora perfora más la oscuridad
  (x1,2, tope 0,95), tiene charco cálido al 0,55 y un núcleo caliente extra.
- `useBengala` en `arena.js`: radio 64, `flicker 0.35`, `intensity 1.35`,
  `hole 1.2`; las chispas siguen. La captura ahora se lee claramente como una luz
  roja-cálida fuerte.
- Tests nuevos en `test/lighting.test.js` (prioridad/tope y orden).

## 5. Pantalla de resultado
- `src/arena/resultScreen.js`: `resultOptionYs(view)` elige la posición de las
  opciones según haya o no resumen de bolsa: con bolsa bajan 6 px, dejando **8 px**
  entre "La mochila quedó en la nieve: …" y la barra de "Volver a la casa"; con
  la bolsa vacía quedan en las posiciones de siempre, sin hueco.
  `resultOptionRects(view)` usa la misma geometría (click = dibujo).
- `arena.js` (`updateResult`) pasa `{ bag: this.bag }` a los rects clickeables.
- Test nuevo en `test/result_screen.test.js`: separación >= 6 px con bolsa y
  layout equilibrado sin bolsa. Verificado también con captura de bolsa vacía.

## 6. Oleadas determinísticas por semilla
- `src/arena/waves.js`: `waveSequence(seed, opts)` pura, con el mismo orden de
  tiradas que la arena (posición, tipo, demora) usando
  `rngFromSeed((seed ^ 0x5eed) >>> 0)`.
- `src/scenes/arena.js`: `this.roundRng` = `Math.random` por defecto; en
  `setupRun()`, si hay `game.run` con semilla se arma con `seed ^ 0x5eed`.
  `updateRound`, `pickSpawn(rng)` y los helpers de QA lo usan. El Minijuego (sin
  `game.run`) sigue exactamente igual, con `Math.random`.
- Test nuevo en `test/waves.test.js`: misma semilla -> misma secuencia de 20
  apariciones (tipo, x, y, demora); otra semilla -> distinta. Además se verificó
  en vivo contra dos instancias reales de la arena: mismas posiciones/tipos.

## Capturas rehechas y revisadas
Con `npx vite --port 5199 --strictPort` + los scripts existentes (vite y chrome
quedaron apagados después):
- `tools/base_screens.mjs` -> `base_1_titulo_continuar.png` (cartel más ancho,
  "Partida nueva" con aire) y `base_2_garaje.png` (Elena y Electrógeno abajo, sin
  pisarse ni tapar NPCs).
- `tools/salida_screens.mjs` -> `salida_inicio.png` (paneles arriba, controles
  abajo sin pisar EXTRA), `salida_bengala.png` (luz fuerte y chispas),
  `salida_resultado.png` (8 px entre el resumen y la opción) y el resto de la
  salida sin errores de página. La captura extra de resultado con bolsa vacía
  confirmó que no queda un hueco.
