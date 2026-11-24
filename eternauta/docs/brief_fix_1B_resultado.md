# Fix 1B — sólidos del barrio pegados al dibujo (resultado)

**Tanda 1B del plan de `docs/analisis_roguelike.md`** (sección 2, C1–C11) más la
parte de sólidos de la Tanda 0. El objetivo era uno solo: **que lo que frena sea
exactamente lo que se ve**. No se tocó `src/maps/barrio/index.js` (worker 1A) ni
`src/scenes/arena.js`.

## Qué existe ahora

| Archivo | Qué hace |
|---|---|
| `src/maps/solid.js` (nuevo) | Helper puro: `drawOrigin()` (la misma esquina que dibuja `WorldMap.layout`) y `solidRectFor(obj, size, trim)`, que devuelve la huella en px del mapa desde el **rect dibujado**, con el `offset` del sprite, recortada al bbox opaco. `solidRectsOf()` para listas. |
| `src/maps/barrio/pieces.js` | Cada objeto sólido declara su huella: `solidPx: FULL` (casas, verjas, cajas, autos, vagón, paredes, bancos, busto, hamaca, baranda) o una franja `{x,y,w,h}` medida sobre el sprite (troncos de árboles/pinos, postes de farola y cartel, cruz de San Andrés, barrera alta). Además: alambrado del paso a nivel con el hueco exacto de 48 px, verjas del sur sin recolocarse y recortadas al borde de la pieza, y el hedge que se salía 2 px de la pieza corregido. |
| `src/mapView.js` | `rebuildSolids()` usa `solidRectFor` **solo si el objeto trae `solidPx`** (opt-in por objeto). Se agregó `layout().trim` (bbox opaco sin el margen del cursor) y `flipX` ahora espeja el mesh. Los mapas viejos (altillo, casa, garaje, calle) siguen con su rect de baldosas, intactos. |
| `test/barrio_objects.test.js` (nuevo) | 13 tests: alineación sólido/dibujo con los **PNG** de los atlases (decodificador propio, sin DOM), huellas de troncos, opt-in, `flipX`, cruce de 48 px + tablón, verjas sin tramos dobles, decorado vs obstáculo, autos/vagón y alcance con la caja de pies. |
| `tools/diag/barrio_visual.mjs` | Ahora mide el hueco del cruce en coordenadas de la pieza (antes daba 640 px por comparar coords globales), informa el tablón y tiene `BARRIO_DIAG_LEGACY=1` para dibujar los sólidos de **antes** y `BARRIO_DIAG_OUT=<carpeta>` para la salida. |
| `tools/diag/barrio_colision.mjs` (nuevo) | Verificación headless contra el juego real: camina contra el busto (vertical) y contra un auto (lateral) con pasos finos y compara el freno con el borde dibujado. |

## Cómo se verifica

```bash
npm test                     # 717 pass (incluye los 13 nuevos)
npm run build                # OK
node tools/diag/barrio_audit.mjs 3455      # mismatches: []
node tools/diag/barrio_visual.mjs 3455     # sólidos fuera del dibujo: 0
                                           # hueco del paso a nivel: 144..192 (48 px)
                                           # tablón del paso: 144..192
node tools/diag/barrio_colision.mjs        # err 0.10 px / -0.05 px  → "OK colisiones"
# el "antes" para comparar:
BARRIO_DIAG_LEGACY=1 BARRIO_DIAG_OUT=docs/capturas/antes_1B node tools/diag/barrio_visual.mjs 3455
```

Capturas (rojo = sólido, magenta = baldosa sólida):

- `docs/capturas/diag_solidos_barrio.png` — el barrio entero con los sólidos.
- `docs/capturas/diag_solidos_barrio_antes_despues.png` — el mismo barrio antes
  (arriba) y después (abajo).
- `docs/capturas/diag_solidos_antes_despues.png` — las 6 piezas, antes/después.
- `docs/capturas/diag_solidos_<pieza>.png` y `docs/capturas/antes_1B/`.
- `docs/capturas/diag_caminable.png` — mapa de calor de lo caminable.
- `docs/capturas/diag_colision_busto.png`, `diag_colision_auto.png` y
  `diag_barrio_juego.png` — el juego real headless frenando contra el dibujo.

(De paso: el mapa de calor se dibujaba encima del mapa y `diag_solidos_barrio.png`
salía siendo el heatmap; ahora el heatmap arranca oculto.)

## Antes y después

Antes (análisis, semilla 3455): **105 de 106** objetos `solid:true` tenían offset
distinto de cero y el rect era el de baldosas, así que frenaba 4–10 px corrido o
en el aire (cartel 22 px arriba de su base, troncos ±11 px, caja de municiones con
dos sólidos de 24×24, `trash` con 16×16 para un sprite de 8×16). El paso a nivel
medía 32 px y el tablón 48. En la captura legacy: **154 sólidos fuera del dibujo**.

Después (medido hoy, semilla 3455):

- **0 sólidos fuera del dibujo** y **0 desalineados** (`mismatches: []` en la
  auditoría; el test lo fija en ≤1 px, y en la práctica es **0 px** para `FULL`).
- Huellas de troncos/postes: apoyan en el pie del sprite (0 px) y cubren las
  columnas opacas del tronco (0–1 px de error, ≥90 % de los píxeles del tronco).
- **Cruce de las vías: 144..192 = 48 px**, y el tablón (`via_tablon_0`, filas 5 y 7)
  cae exactamente en 144..192.
- `flipX` espeja el sólido: la cruz de San Andrés espejada frena del otro lado.
- Verja del sur: sin tramos superpuestos y llega justo a 320 (antes se recolocaba
  o dejaba un hueco de 16 px); único hueco el del paso (48 px).
- Caminable con la caja de pies y los objetos: **93,8 %** (1372/1462 baldosas;
  antes del fix la captura legacy daba 92,3 %). El spawn, el portón y la caja de
  municiones son libres y alcanzables; hay botín y bocas a 1 baldosa de un punto
  alcanzable (los corre `reachableGround` / los valida `canSpawnAt` de 1A).
- En el juego real (headless, Swiftshader) el jugador se frena a **0,1 px** del
  borde dibujado de la base del busto y a **0,05 px** del costado del auto.

## Decisiones (para no volver a discutirlas)

- **Autos y vagón: sólidos de cuerpo entero (C4).** Se puede caminar detrás del
  sprite por el orden de dibujo, pero no atravesarlos de costado ni quedar tapado.
  La nafta del auto se marca al pie, sobre la calzada, para poder cobrarla.
- **Casas, locales y paredes: `FULL`** (todo el rect opaco). No hay sótanos ni
  techos caminables; el borde que importa es el pie y ahora coincide.
- **Troncos y postes: solo la base.** El cartel, la luminaria, el brazo de la
  barrera y el caño de la cruz siguen en el aire y no frenan; el poste sí.
- **Alambrado de las vías:** el sprite mide 33 px y se repite cada 32. 144 no es
  múltiplo de 32, así que el último tramo va en 111 y **espejado**: sus postes
  caen en 125/141 y no encima de los del tramo anterior (97/113). Sin postes
  dobles y con el hueco en 48 exacto.
- **Decorado que se pisa a propósito** (documentado en el test): médanos
  (`snow_mound`, y son puntos de spawn), `fallen_*`, `figure_snow`, `polsky_caido`,
  `bottle`, `papel`, `vidrios`, `snow_drift`.
- **Objetos que ahora sí frenan (C6):** `box`, `mailbox`, `bicicleta`, `bush30`,
  `crate`, `cajon_frutas`, `trash`, `buzon_correo`.

## Lo que queda (fuera de 1B)

- `grass_0` sigue siendo baldosa sólida: las filas de pasto de casa/vías/cortada
  frenan sin leerse. Cambiarlo por una linde (verja/medianera) es diseño de nivel:
  **Tanda 2 (L3/L8)**, no un arreglo de sólidos.
- Consecuencia de leer las verjas como verjas: **el fondo de la casa y el patio
  de la cortada quedan cerrados** (semillas 1/77/123: ~86–88 % caminable; el
  bolsón más grande es el jardín de atrás, ~140 baldosas). Antes se entraba por el
  hueco que dejaba un sólido corrido. Abrirlo (portón, "backyard through") es
  Tanda 2.
- Los médanos que caen en esos patios quedan como bocas no alcanzables;
  `canSpawnAt` (1A) las descarta. Conviene mover esos médanos o abrir el patio.
  Ojo 1A: si `pickSpawn` no encuentra ningún punto, la ronda no avanza — la
  decisión de qué hacer ahí está en `arena.js` (no es de 1B).
- `src/reach.js` (alcance de interacción) sigue armando las huellas con el rect de
  baldosas: para el alcance por casilleros anda, pero no lee `solidPx`. Unificarlo
  es Tanda 5.
- La verja del sur se dibuja 4 px por debajo del borde de la pieza (recorte a
  propósito); su sólido queda fuera del mapa en las piezas de la fila de abajo.
  Inofensivo, pero es candidato a limpieza en la Tanda 2.
