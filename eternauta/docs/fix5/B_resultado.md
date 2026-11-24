# Fix 5 — Parte B: partir `src/menus.js`

Resultado: `src/menus.js` pasó de **1186 líneas** a una fachada de **15 líneas**.
Las pantallas viven ahora en `src/menus/` (carpeta nueva), todas por debajo de
las 800 líneas. Refactor puro: no cambió ningún comportamiento ni ninguna
exportación pública.

## Mapa de módulos

| Archivo | Qué tiene | Líneas |
|---|---|---:|
| `src/menus.js` | Fachada: re-exporta los 20 nombres públicos de siempre (incluido `moveSlot`). | 15 |
| `src/menus/shared.js` | Lo compartido: `VIEW_W/VIEW_H`, `clickPoint`, `setHand`, `promptBox`, `drawBoxedPrompt`, `hitSlot`, `uiCanvas`, `place`, `centerText`. | 66 |
| `src/menus/title.js` | Pantalla de título: logo, cartel de opciones (`titleOptionRects`), `TitleMenu` con sus vistas de Controles y Créditos. | 238 |
| `src/menus/controls.js` | Tabla de Controles: `CONTROLS_HEADERS`, `CONTROLS_NOTES`, `CONTROLS_ROWS`, `controlsTexts` y el dibujado de glifos por columna. | 85 |
| `src/menus/pause.js` | Panel de pausa: medidas/rects (`PAUSE_BOX`, `pause*Rects`, `hintLayout`) y `PauseMenu` con las pestañas mochila / fabricar / opciones. | 554 |
| `src/menus/chest.js` | Panel de cofre: `chestBox`, `chestTitleRect`, `chestSlotRects` y `ChestPanel`. | 271 |

Ningún archivo supera las ~800 líneas; el mayor es `pause.js` con 554.

### Por qué las pestañas de pausa quedan juntas
Mochila, fabricar y opciones comparten el mismo estado (`PauseMenu`: cursor,
`tab`, `recipeIndex`, `optionIndex`) y el mismo cartel/pestañas/barra de
prompts. Partirlas en archivos separados obligaba a pasar ese estado de un lado
a otro sin ganar claridad, así que la pantalla de pausa es un solo módulo
(`pause.js`). Controles y Créditos, en cambio, son vistas de la pantalla de
título y quedaron en `title.js`; la tabla de datos de Controles se aisló en
`controls.js` porque es la parte reutilizable/verificable por tests.

## API pública intacta

Se comparó el conjunto de exportaciones del archivo previo
(`fix5_snapshot/src/menus.js`) contra el nuevo (`Object.keys` del módulo):
**20 nombres, idénticos**:

`CONTROLS_HEADERS`, `CONTROLS_NOTES`, `CONTROLS_ROWS`, `ChestPanel`,
`PAUSE_BOX`, `PauseMenu`, `TitleMenu`, `chestBox`, `chestSlotRects`,
`chestTitleRect`, `controlsTexts`, `hintLayout`, `moveSlot`,
`pauseCraftButtonRect`, `pauseOptionRects`, `pauseRecipeRects`,
`pauseSlotRects`, `pauseTabRects`, `promptBox`, `titleOptionRects`.

Ningún importador se tocó:

- `src/main.js`: `import { PauseMenu, ChestPanel } from './menus.js';`
- `src/scenes/title.js`: `import { TitleMenu } from '../menus.js';`
- `test/menus_ui.test.js`, `test/clickable_hints.test.js`,
  `test/controles_fix.test.js`, `test/dos_botones.test.js`: sin cambios.

## Verificación

- `node --check` sobre `src/menus.js` y los 5 módulos nuevos: OK.
- `npm test`: **745 tests, 745 pass, 0 fail** (misma cantidad que antes).
- `npm run build`: **OK** (Vite, 97 módulos transformados).
- Capturas headless: no se hicieron en esta parte; según
  `docs/fix5/comun.md` las hace la tanda 2. El cambio es de archivos, no de
  dibujo: el código de render se movió verbatim.
