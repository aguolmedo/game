# Resultado · Retoques de controles (19/11)

Brief: `docs/brief_controles_fix.md`. No se commiteó nada. No se tocó `bocetos/` ni el arte.

## 1. Glifo de Mirar con mouse

`glyphName('mouse', 'look')` ya devolvía `mouse_r` y la fila "Mirar" de
`CONTROLS_ROWS` ya lo declaraba, pero no había nada que lo fijara. Ahora:

- `test/controles_fix.test.js` dibuja un `drawPrompt` con un canvas falso y verifica que
  con mouse + `look` se dibuja el frame `mouse_r` (botón derecho resaltado) y que
  `interact`/`bag` siguen usando `mouse` (click izquierdo).
- El mismo test recorre la columna Mouse de `CONTROLS_ROWS` y exige que cada fila coincida
  con `glyphName('mouse', row.action)`.
- En las capturas se ve la diferencia: en Controles la fila Mirar tiene el botón derecho
  en crema; en la barra, el glifo de "Mirar" también.

## 2. "1 a 8" y caracteres de la fuente

- La fila "Barra de ítems" pasó de `1 – 8` (guion en dash, ausente en la fuente) a
  **`1 a 8`**.
- Los dos `—` (guion largo) de las columnas Mouse de Menú y Mover pasaron a `-`.
- `menus.js` exporta `CONTROLS_HEADERS`, `CONTROLS_NOTES` y `controlsTexts()` para que el
  test recorra todo lo que se dibuja en la pantalla de Controles.
- El test compara cada carácter contra `public/assets/font.json` para:
  pantalla de Controles + barra de acciones (etiquetas de `ACTIONS`, etiquetas de objetos
  y warps de los 4 mapas, y etiquetas de `ITEM_USES` / `SELF_USES`). Sin faltantes.

## 3. Cuadradito lejos

En `src/cursor.js` quedaron constantes explícitas:

| Constante | Valor |
|---|---|
| `FAR_RGB` | `255, 190, 120` (ámbar) |
| `FAR_ALPHA` | `0.75` fijo, sin latido |
| `FAR_FRAME_ALPHA` | `0.18` (marco tenue) |

Los corchetes lejos usan la misma sombra oscura de 1 px que cerca; solo cambia el color,
el alpha (fijo vs. latido) y el marco más tenue. El test fija los tres valores y en
`ctrl_cursor_lejos.png` los corchetes de la ventana se leen claro.

## 4. Verificación

- `npm test`: **413 tests, 0 fallas** (incluye los 4 nuevos de
  `test/controles_fix.test.js`).
- `npm run build`: pasa (mismo warning de chunk grande de siempre).
- `npx vite --port 5197 --strictPort` en background + `URL=http://localhost:5197/ node
  art/direccion/capturas_ctrl.mjs`: 8 capturas, "sin errores de página". Revisadas
  `ctrl_barra_mouse.png`, `ctrl_pantalla_controles.png` y `ctrl_cursor_lejos.png`
  (además de cerca/apoyado/teclado/pad). Vite 5197 muerto por PID; el 5173 no se tocó.

## 5. Archivos

- `src/menus.js` — `1 a 8`, `-` en vez de `—`, headers/notes exportados y `controlsTexts()`.
- `src/cursor.js` — `FAR_RGB` / `FAR_ALPHA` / `FAR_FRAME_ALPHA`; lejos a 0.75.
- `test/controles_fix.test.js` — nuevo (4 tests).
- `art/direccion/doc/capturas/ctrl_*.png` — recapturadas.
- `docs/brief_controles_fix_resultado.md` — este archivo.
