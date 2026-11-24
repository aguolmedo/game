# Resultado — Prólogo del roguelike (worker C, tanda 1)

## Qué quedó

- **`src/scenes/prologue.js`** (nuevo): `PrologueScene` con dos modos.
  - `intro`: llegada (llegada_1..7 a ×2, negras con estática cian/violeta y un
    frame de estática entre cuadros), corte a negro, cuarto vacío → llegada
    (titila con el vacío los primeros 0,4 s) → cuarto del gag y las 5 líneas
    del gag con `DialogBox`. Al terminar (o al saltear) va a `attic`, igual que
    hacía "Jugar".
  - `queja`: cuarto del gag, una queja al azar de `QUEJAS`, una respuesta de
    `RESPUESTAS` y vuelve a `this.returnTo || 'garage'`.
  - La lógica de tiempos es pura y exportada: `prologueTimeline(mode)`,
    `createPrologueState(mode)`, `prologueStep(state)`, `stepPrologue(state, dt, input)`,
    `prologueDialog(mode, random)`, más `GAG`, `QUEJAS`, `RESPUESTAS` y los
    tiempos (`LLEGADA_TIMES`, `BLINK_TIME`, `CUT_TIME`, ...).
  - `scene.start(mode, opts)` guarda modo y `returnTo` y hace `changeScene('prologue')`.
  - Saltear con Esc / B / Start en cualquier momento; el glifo "Saltar" va abajo
    a la derecha (con el cuadro abierto sube justo encima para no tapar los
    prompts). Click o A avanzan el diálogo con la misma `DialogBox` del mundo.
  - Sin HUD, sin mochila y sin pausa (`pausable = false`, `blocksPause = true`).
- **`src/main.js`**: registro `prologue: new PrologueScene(game)` y
  `game.startPrologue(mode = 'intro', opts = {})`. Nada más.
- **`src/scenes/title.js`**: "Jugar" hace `newGame()` y llama a
  `startPrologue('intro')`. "Minijuego" queda igual.
- **`src/assets.js`**: carga las 10 imágenes de `public/assets/roguelike/` y las
  expone como `assets.roguelike = { llegada: [7 texturas], cuarto: { vacio, llegada, gag } }`.
- **`src/data/portraits.js`**: `objectHeadFor(id)` con
  `eternauta_viejo → eternauta_viejo_abajo` y `programador → programador_abajo`.
- **`src/dialog.js`**: si el retrato sale de `objects.png`, recorta la cabeza
  (filas 0..15 del frame de 16×32) y la dibuja ×4 sobre `#2a2236` en el cuadro
  de 64×64. Los retratos de chars2, `portraits_dlg` y el caso `panel` siguen igual.
- **`test/prologue.test.js`**: orden de fases y tiempos, avance del reloj,
  saltear al final, modo queja con 2 entradas, textos exactos del gag,
  `QUEJAS.length >= 6`, retratos de objects y existencia/tamaño de las imágenes.

## Cómo verlo

```
cd /home/mateyfasito/dev/game/eternauta
npm test          # suite completa
npm run build
npx vite --port 5199 --strictPort
```
En el título, **Jugar** arranca el prólogo. Para la versión corta:
`window.__eternauta.game.startPrologue('queja', { returnTo: 'garage' })`.

## Verificado

- `npm test`: **570 pass / 0 fail** (incluye las 8 pruebas nuevas).
- `npm run build`: OK.
- Capturas headless (960×540, Chromium + swiftshader), en `docs/capturas/`:
  - `prologo_llegada_tinta.png`: cuadro 3 (tinta) centrado a ×2 con estática.
  - `prologo_cuarto_gag.png`: `cuarto_gag` a zoom de mundo (320×180 → 480×270),
    entrada 4 del gag, retrato del programador ×4.
  - `prologo_queja.png` (extra): modo queja con el retrato del Eternauta viejo.
- Flujos headless: "Jugar" → intro completo → `attic` (5 entradas);
  queja completa → `garage`; Esc en el diálogo saltea a `attic`; queja sin
  `returnTo` vuelve a `garage`. Sin errores de consola.
- Chrome y el Vite de estas capturas quedaron cerrados.

## Pendiente / notas

- El prólogo no se ve en `dist/` de una partida ya guardada: entra por "Jugar"
  (partida nueva), como pide el brief.
- La tanda 2 puede llamar a `game.startPrologue('queja', { returnTo })` después
  de cada tercera muerte; el modo ya devuelve a `garage` por defecto.
