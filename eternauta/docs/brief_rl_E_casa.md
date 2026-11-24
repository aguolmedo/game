OBJETIVO (worker E, tanda 2): la casa como base del roguelike y el flujo completo de la partida. El traje queda guardado una vez hecho. Desde el título se puede Continuar; el garaje tiene cuatro estaciones de mejora con su taller; se sale por el portón (empieza un loop) y se vuelve (con botín o muerto). Cada 3 muertes, el viejo se queja.

Proyecto: /home/mateyfasito/dev/game/eternauta. Leé:
- `docs/diseno_roguelike.md` (contratos)
- `docs/brief_rl_A_resultado.md` (src/run: save, upgrades, loot, seed, radio)
- `docs/brief_rl_C_resultado.md` (game.startPrologue(mode, opts), el modo 'queja')
- `docs/roguelike_narrativa.md` (la casa como base, Lucas radioaficionado)
- **Las maquetas, que son la referencia visual exacta:** `art/concept/out/roguelike/casa_garaje.png` (el garaje con cada uno en su estación y los cartelitos), `casa_taller_favalli.png` y `casa_taller_lucas.png` (la pantalla del taller) y `casa_mejoras.png` (los 12 íconos y sus costos). También `art/concept/roguelike_casa.py`, donde está la maqueta del taller en código PIL con las medidas exactas (función `taller`).
- Código: `src/main.js` (game, setScene, newGame, startArena), `src/scenes/title.js`, `src/menus.js` (el cartel de madera de la mochila: wood, pestañas, tallado; reusá esas funciones o el estilo de `uiSkin`/`titleUi`), `src/maps/garage.js`, `src/scenes/world.js` (interacción, npcs, talkTo, openDialog), `src/story.js` (flag traje_fabricado) y `src/hud.js`.

ARCHIVOS QUE PODÉS TOCAR: `src/main.js`, `src/scenes/title.js`, `src/menus.js` (solo las opciones del título), `src/maps/garage.js`, `src/scenes/world.js` (lo mínimo para npcs y objetos de la base), `src/story.js` (guardar el traje), `src/hud.js` (el botín en la base), y nuevos: `src/taller.js`, `src/base.js`, tests `test/base_*.test.js` y `test/taller_*.test.js`. **NO toques** `src/scenes/arena.js` ni `src/arena/*` (los hace D en paralelo), ni `src/run/*` ni `src/maps/barrio/*`.

CAMBIOS:

1. **`src/base.js`** (lógica pura, con pruebas):
   - `titleOptions(save)` → `['Continuar', 'Partida nueva', 'Minijuego', 'Controles', 'Creditos']` si `save.trajeHecho`; si no, las 4 de hoy (`['Jugar', 'Minijuego', 'Controles', 'Creditos']`).
   - `BASE_FLAGS` → las flags que deja la historia al terminar el traje, para que el garaje funcione como si la historia hubiera pasado: apagon, vio_la_nevada, casa_sellada, traje_fabricado, electrogeno_on, extractor_ok, esclusa_lista, listo_para_salir, y las demás que hagan falta. Revisá story.js y objectives.js.
   - `endRunSave(save, result)` → save nuevo:
     - `volvio`: `addBotin(save, result.bag)`.
     - `murio`: `dropMochila(save, result.bag, save.loop)`.
     - En los dos casos actualiza `best` (round, points).
   - `shouldComplain(save)` → `save.muertes > 0 && save.muertes % 3 === 0` (justo después de morir).
   - `startRunSave(save)` → `{ save (loop + 1), run: { loop, seed: seedFor(loop), save } }`.

2. **Guardar el traje:** cuando la historia pone `traje_fabricado` (story.js, alrededor de la línea 71), hacé `writeSave({ ...loadSave(), trajeHecho: true })`.

3. **Título** (title.js + menus.js): opciones de `titleOptions(loadSave())`.
   - **Continuar** → `game.enterBase()`.
   - **Partida nueva** → `clearSave()` y lo mismo que Jugar.
   - **Jugar** → lo de hoy (newGame + prólogo, que ya hizo C).
   - **Minijuego** → `game.startArena()`, igual que hoy: D hace que la arena funcione sola, sin game.run.
   - Cuidá la navegación con mouse, pad y teclado: con 5 opciones, el cartel crece o se ajusta. Hay pruebas del título (title_ui, menus_ui); adaptalas.

4. **`game.enterBase(spawn)`** en main.js: newGame(), hasSuit y hasRifle en true, el inventario con traje y rifle si hace falta, `Object.assign(flags, BASE_FLAGS)`, `flags.base = true`, lighting 'apagon' y `changeScene('garage', spawn || { x: 9*16+8, y: 7*16+8, dir: 'down' })`.

5. **Garaje en modo base** (`flags.base`). Seguí `casa_garaje.png`:
   - **NPCs:** Favalli detrás del banco de herramientas (izquierda), Elena al lado del traje colgado (centro) y Lucas al lado de una radio. Agregá un objeto 'radio' (sprite objects 'radio') sobre las cajas de la derecha, con type que se pueda usar.
   - Que aparezcan **solo en modo base** (por ejemplo `showIfFlag: 'base'` en los npcs y objetos; si world.js no lo soporta para npcs, agregalo simple).
   - **Interacción** (el verbo Hacer: click izquierdo / A):
     - Favalli, Elena y Lucas: "Mejoras" → abre el taller en su pestaña.
     - El electrógeno: "Mejoras" → taller en la pestaña luz.
     - La radio: "Escuchar la radio" → diálogo de Lucas con `radioLine(save.mejoras.lucas, rng)`.
   - **El portón en modo base:** label "Salir (loop N)", con N = save.loop + 1. Llama `game.startRun()` en vez del warp a la calle.
   - **Cartelitos** de madera con "Favalli: el rifle", "Elena: el traje", "Lucas: la radio" y "Electrógeno: luz", como en la maqueta. Opcional si complica la oclusión; lo importante son los NPCs y la interacción.
   - **Objetivo de la barra** en modo base: "Mejorá lo que puedas y volvé a salir." Si hay mochila: "Volvé a salir. La mochila de otra vez quedó en la calle."

6. **`src/taller.js`, el taller** (UI de canvas, como los menús de madera de `src/menus.js`), idéntico a la maqueta `casa_taller_favalli.png`:
   - Cartel de madera de 400×176 en (40, 44) de la vista 480×270.
   - 4 pestañas de 88 px, cada una con la cabeza del personaje (de chars2: favalli, elena, lucas; para el electrógeno, el ícono `mejora_bengala`) y el nombre.
   - **A la izquierda:** "El rifle" (o el `what` de la estación) y las 3 mejoras en filas talladas de 168×26. Cada fila tiene su ícono `mejora_<id>` y su nombre; las hechas llevan tilde verde, la bloqueada un candadito tallado y el ícono apagado, y la elegida la barra cálida.
   - **A la derecha:** la ficha. Ícono ×2 en un hueco de 38×38, el nombre, "Favalli, el rifle" en ámbar, la descripción en 2 líneas, una junta y "Con lo que trajiste de afuera", y los costos (ícono de botín + "tengo/necesito", verde si alcanza y rojo si no). Abajo el botón "Hacer" o "Falta botín".
   - **Prompts:** Q Estación · Click Hacer · Esc Cerrar (con los glifos del dispositivo).
   - **Controles:** mouse (hover y click en filas, pestañas y botón); teclado (flechas arriba y abajo para las filas, Q o izquierda y derecha para las pestañas, Enter para hacer, Esc para cerrar); pad (stick o dpad, A, LB/RB para las pestañas, B).
   - **Comprar:** `buyUpgrade(save, station)` → `writeSave` → toast "¡Listo! Cerrojo aceitado." Si falta plata: toast "Falta botín." Solo se puede comprar la siguiente (la disponible).
   - Mientras el taller está abierto, el mundo no recibe input (como el cofre o la pausa).

7. **`game.startRun()` y `game.endRun(result)`** en main.js:
   - startRun: `startRunSave(loadSave())` → writeSave → `game.run = run` → `changeScene('arena')`. Además, `game.startArena` arranca un run cuando `loadSave().trajeHecho` (así la historia, al salir a la calle por primera vez, ya entra en el loop).
   - endRun: `save = endRunSave(loadSave(), result)` → writeSave → `game.run = null`.
     - Si `result.type === 'murio' && shouldComplain(save)` → `game.startPrologue('queja', { returnTo: 'garage' })`.
     - Si no → `game.enterBase()`.
     - Al volver vivo: toast "Volviste con: 3 chatarra, 1 goma" (o "Volviste con las manos vacías.").

8. **HUD en la base:** una plaquita de madera arriba a la derecha con los 4 íconos de botín (chatarra, goma, nafta, pieza_cascarudo) y sus cantidades de `save.botin`. Solo en modo base.

PRUEBAS: base.js completo (titleOptions, endRunSave, shouldComplain, startRunSave), taller (la navegación y el estado de las filas con una función pura, por ejemplo `tallerModel(save, station, sel)`), y que las del título y los menús sigan en verde.

VERIFICACIÓN VISUAL (headless, `.dsagent.md`). Para el save, sembrá localStorage con `page.addInitScript` (por ejemplo, botin chatarra 5 y pieza 2, mejoras favalli 1, trajeHecho true):
1. El título con "Continuar".
2. El garaje en modo base con los NPCs.
3. El taller de Favalli (comparalo con `casa_taller_favalli.png`).
4. El taller de Lucas con la tercera bloqueada.

Guardalas en `docs/capturas/base_*.png` y miralas. Matá vite y chrome.

ACEPTACIÓN: `npm test` en verde (todas). `npm run build` OK. Capturas correctas. Resumen en `docs/brief_rl_E_resultado.md`.
