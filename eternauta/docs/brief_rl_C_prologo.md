OBJETIVO (worker C, tanda 1): el prólogo del roguelike de El Eternauta. El Eternauta viejo llega al universo 16 bits (la tinta se vuelve píxeles) y cae en el cuarto de un programador, que le explica, como gag, que está atrapado en un roguelike. Además, una versión corta, "la queja", para usar entre loops.

Proyecto: /home/mateyfasito/dev/game/eternauta (Three.js + Vite, vista 480×270). Leé:
- `docs/diseno_roguelike.md`
- `docs/roguelike_narrativa.md` (secciones "Estructura" y el gag textual)
- `art/direccion/DIRECCION.md`, sección "Roguelike (en diseño)". Mirá las imágenes `art/concept/out/roguelike/llegada_tira.png`, `cuarto_vacio.png`, `cuarto_llegada.png` y `gag_1..5.png`: así tiene que verse.
- Escenas de ejemplo: `src/scenes/view.js` y `src/scenes/death.js` (escenas chicas: scene, uiScene, applyCamera, update, enter).
- El cuadro de diálogo, `src/dialog.js` (DialogBox; lo usa `src/scenes/world.js`, openDialog/talkTo), y los retratos, `src/data/portraits.js` (spriteHeadFor recorta la cabeza del sprite de chars2).
- `src/main.js` (registro de escenas, setScene/changeScene, newGame) y `src/scenes/title.js` (qué hace "Jugar").

ARTE (ya existe, no dibujar):
- `public/assets/roguelike/llegada_1.png` a `llegada_7.png` (64×128): 1 estática, 2 la mancha, 3 tinta, 4 cuadritos, 5 agarra color, 6 16 bits, 7 "¿y esto?" (se mira las manos).
- `public/assets/roguelike/cuarto_vacio.png`, `cuarto_llegada.png` y `cuarto_gag.png` (320×180, píxeles de MUNDO, con la luz ya horneada; se muestran con el zoom del mundo, 1,5×, para que llenen los 480×270 nítidos).
- Retratos: en el atlas objects están `eternauta_viejo_abajo` y `programador_abajo` (16×32). El retrato es su cabeza (filas 0–15) ×4 sobre fondo oscuro, igual que hace hoy el cuadro de diálogo con chars2.

QUÉ HACER:

1. `src/scenes/prologue.js` → `export class PrologueScene`. Se registra en main.js como `prologue`. Tiene dos modos:
   - **`mode = 'intro'`** (partida nueva):
     a. **Llegada:** fondo negro con estática suave (puntitos cian y violeta, que se pueden dibujar en un canvas UI). Muestra llegada_1 → 7 centradas ×2 (128×256 en la vista 480×270; centralas y que entre: 256 de alto en 270, con 7 px de margen). Tiempos: 0,6 / 0,6 / 1,0 / 0,5 / 0,5 / 0,8 / 1,4 s. Entre cuadros, un parpadeo de estática de 1 frame.
     b. Corte a negro (0,3 s).
     c. **Cuarto:** cuarto_vacio 1,6 s → cuarto_llegada 1,2 s (que titile: alternar con cuarto_vacio cada 0,1 s los primeros 0,4 s) → cuarto_gag y el diálogo del gag, con DialogBox, 5 entradas en este orden:
        1. El Eternauta: "Llevo no sé cuántas veces la misma noche. Salgo a la calle, me matan los bichos y vuelvo al truco. Siempre el truco."
        2. Programador: "Ah, sí... es que el juego todavía no tiene final."
        3. El Eternauta: "¿El qué?"
        4. Programador: "Te estoy programando. Esto es un roguelike."
        5. El Eternauta: "...¿Un qué?"
     d. Fade y `game.changeScene('attic')`, que es donde empieza la historia de hoy. Revisá qué escena y spawn usa hoy "Jugar" y respetalo. La historia de siempre sigue igual.
   - **`mode = 'queja'`** (la usa la tanda 2 entre loops): directo a cuarto_gag con 2 entradas. La primera es una queja del viejo al azar, de una lista `QUEJAS` exportada, con al menos 6 variantes en el mismo tono. Por ejemplo:
     - "Otra vez. Los bichos, la nieve, el truco."
     - "¿Ya le pusiste final?"
     - "Esta vez llegué hasta la plaza."
     - "Me olvidé de todo menos de esto."
     - "Favalli me miró raro. Creo que se acuerda."
     - "La mochila la dejé tirada otra vez."

     La segunda es una respuesta corta del programador, de una lista `RESPUESTAS` ("Estoy en eso.", "Dale, una más.", "Ya casi.", "Anotado."...). Al terminar: `game.changeScene(this.returnTo || 'garage')`.
   - API: `scene.start(mode, opts)` guarda el modo (y opts.returnTo) antes de `changeScene('prologue')`. Exponé `game.startPrologue(mode = 'intro', opts = {})` en main.js.
   - **Saltear:** Esc / B / Start saltean todo el prólogo y van al final de ese modo. Mostrá un glifo chico "Saltar" abajo a la derecha, como los prompts de otras escenas (`src/glyphs.js`). Click o A avanzan el diálogo como en world.js.
   - Sin HUD de juego, sin mochila, sin pausa (pausable = false).

2. **Retratos del viejo y del programador:** hacé que el cuadro de diálogo muestre su cabeza. Lo más simple es una entrada nueva en `src/data/portraits.js` con su fuente (objects en vez de chars2), y en `dialog.js` el recorte desde el atlas de objects cuando corresponde. Cuidá no romper los retratos actuales (hay pruebas: dialog_ui, dialogs).

3. **assets.js:** cargá las 10 imágenes de `public/assets/roguelike/` (texture(...)) y exponelas, por ejemplo `assets.roguelike = { llegada: [7 texturas], cuarto: { vacio, llegada, gag } }`. Hay una prueba de assets que chequea que existan; sumá las nuevas a esa lista si corresponde.

4. **"Jugar" en el título:** hoy hace newGame() y arranca la historia. Ahora: newGame() y después `game.startPrologue('intro')`. "Minijuego" no cambia.

5. **Pruebas** (`test/prologue.test.js`), con la lógica de tiempos separada en una función pura, por ejemplo `export function prologueTimeline()` y `stepPrologue(state, dt, input)`:
   - El orden de las fases.
   - Que saltear vaya al final.
   - Que 'queja' tenga 2 entradas.
   - Que los textos del gag sean exactamente los de arriba.
   - Que QUEJAS tenga al menos 6.

VERIFICACIÓN VISUAL: captura headless con playwright-core (ver `.dsagent.md`; `npx vite --port 5199 --strictPort` en segundo plano):
- Una de la llegada en el cuadro 3 (tinta).
- Una de cuarto_gag con el diálogo 4 abierto.

Guardalas en `docs/capturas/prologo_*.png`. Que se vean nítidas, llenando la pantalla y con el retrato correcto. Matá vite y chrome al terminar.

ACEPTACIÓN: `npm test` en verde (todas, las 475+ de antes). `npm run build` OK. Las capturas existen y se ven bien. Archivos tocados: `src/scenes/prologue.js` (nuevo), `src/main.js` (registro y startPrologue, NADA más), `src/scenes/title.js` (solo "Jugar"), `src/assets.js`, `src/dialog.js`, `src/data/portraits.js`, tests. Resumen en `docs/brief_rl_C_resultado.md`.
