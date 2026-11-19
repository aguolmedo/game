# Resultado del brief · Menús de madera (19/11)

Estado: **implementado**. Se portó la maqueta `art/concept/menus_madera.py` a canvas 1x
(480×270) y se rearmó la pantalla de fin de partida del minijuego. No se commiteó nada.
No se tocó `bocetos/`, `src/maps/`, `art/sprites/` ni `public/assets/*.png`.

## Archivos cambiados

| Archivo | Qué se hizo |
|---|---|
| `src/titleUi.js` | `woodSign` acepta `seams` (número = juntas cada N px, `0/false` = sin juntas, sin definir = las juntas del título), `face` y `shadow`. El dibujo por defecto del cartel del título queda igual. Se agregaron las primitivas compartidas `carve`, `amberFrame` y `flake`, y la paleta de la maqueta (`FACE_HI`, `SEAM`, `NAIL`, `FALTA`, `OKC`, `CARVE`…). |
| `src/glyphs.js` | `promptBarLayout` / `drawPromptBar`: tablita oscura redondeada con `[glifo] etiqueta`, alineada a la derecha. La usan la pausa y el resultado. |
| `src/menus.js` | `PauseMenu` rearmado con el cartel `52,40,376,164`, juntas cada 20 px y sin nieve. Pestañas de 100×22 (la elegida 100×25, más clara, con dos clavos). Inventario 6×3 de casilleros tallados de 22 px, marco ámbar y ficha con ícono ×2. Fabricar con fila tallada, materiales en dos columnas y botón de 96×20 con sus dos estados. Opciones a escala 2, aviso en rojo suave y plaquita de objetivo. Barra de glifos abajo a la derecha. Se actualizaron `pauseTabRects`, `pauseSlotRects`, `pauseRecipeRects`, `pauseOptionRects` y `hintLayout`; se agregó `pauseCraftButtonRect` (el botón también es clickeable) y `PAUSE_BOX`. |
| `src/arena/resultScreen.js` | Cartel 280×176 en y=30, con nieve, sobre dos postes de 10 px con montoncitos de nieve. Título a escala 2, tres huecos tallados de 74×38 (Ronda / Bajas / Puntos), línea de mejor marca con copito y “¡Nueva marca!”, opciones a escala 2 con barra cálida + copito y glifo “Elegir” entre los postes. Se exporta `RESULT_BOARD` y se actualizaron `resultOptionRects`. Los puntos se muestran con separador de miles (`1.250`) como en la maqueta, solo en esta pantalla. |
| `src/items.js` | Descripción de `casco`: `'El casco del traje: capucha engomada, visera de vidrio y filtro de lata.'` |
| `test/menus_ui.test.js` | Medidas nuevas de pestañas, casilleros, receta, opciones, botón y barra de glifos. Test nuevo: todos los rects caen dentro de `PAUSE_BOX` (las pestañas lo tocan desde arriba). |
| `test/result_screen.test.js` | El glifo `mouse` ahora existe en los assets de prueba; se verifica `RESULT_BOARD` y que las opciones caigan dentro del cartel. |

## Verificación

- `npm run build`: **OK** (solo el aviso conocido de chunk > 500 kB).
- `npm test`: **384 tests, 0 fallos**.
- `node --check` sobre los archivos JS tocados: OK.
- Capturas headless (1920×1080 = vista ×4, Chromium + SwiftShader, sin errores de página), guardadas en `art/direccion/doc/capturas/`:
  - `menus_v2_inventario.png`
  - `menus_v2_fabricar.png`
  - `menus_v2_opciones.png`
  - `menus_v2_fin.png`
- Se usó `npx vite --port 5197 --strictPort` y se mató **solo** ese Vite (PID 402039 + hijo 402055). El Vite de 5199 quedó intacto.
- Además se revisó a mano el cartel del título (sigue igual) y dos casos del inventario: casco seleccionado (3 líneas de descripción) y mochila vacía (“La mochila está vacía.”).

## Cómo se sacaron las capturas

1. `__eternauta.go('house')` y se dieron los ítems de la maqueta (`guantes`, `pava_fria`, `lata`, `botas`, `casco`, `mate_cebado`).
2. `__eternauta.openMenu(0 | 1 | 2)` para Inventario / Fabricar / Opciones, una captura por pestaña.
3. Para el fin: `startArena()`, esperar a que termine la transición, fijar ronda/bajas/puntos como la maqueta, `game.scene.die()`, esperar la viñeta y `game.scene.openResult()`.

## Diferencias con la maqueta

- **Fondo de los menús.** La maqueta partía de capturas ya oscurecidas; en el juego el `dim` es el de antes (0.58 para la pausa, 0.70 para el resultado). El cartel, los colores y las posiciones son los de la maqueta.
- **HUD.** La maqueta muestra el HUD/objetivo atrás porque usó una captura. En el juego el HUD se oculta al abrir la mochila y en el resultado (comportamiento que ya existía).
- **Barra de glifos.** La maqueta usa un ancho fijo de 12 px por glifo; el juego usa el ancho real del glifo del dispositivo (mouse, teclado o pad). La tablita queda pegada al borde derecho del cartel (x=428) y a la misma altura (y=216); el ancho puede variar unos píxeles.
- **Fabricar.** Hay una sola receta en el juego, así que la fila siempre está elegida. El subtítulo usa la primera frase de la descripción del ítem resultante (“El traje hermético que armaron entre todos.”), que es el texto que muestra la maqueta.
- **Falta de materiales.** En la maqueta entraban dos nombres; si faltan más, la lista sigue en una segunda línea dentro del mismo renglón tallado (probado con los seis materiales).
- **Casillero elegido.** Ya no rebota: la selección se marca solo con el marco ámbar, como pide el diseño nuevo.
- **Sin materiales faltantes.** Si no falta nada, no se dibuja la junta ni la línea roja de abajo (el brief la pide “solo si faltan”).
- **Mejor marca.** El caso sin récord se centra sin copito ni cartelito; la maqueta solo muestra el caso con récord.
- **Puntos.** Se agregó el separador de miles solo en la pantalla de resultado (1.250). El HUD del minijuego sigue usando `formatPoints` sin puntos, para no cambiar otras pantallas fuera de este brief.
