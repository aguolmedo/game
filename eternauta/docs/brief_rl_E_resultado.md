# Resultado — La casa como base y el flujo completo (worker E, tanda 2)

## Qué quedó

### `src/base.js` (nuevo, lógica pura)
- `BASE_FLAGS`: las flags que deja la historia al terminar el traje (apagón, nevada vista,
  casa sellada, traje, electrógeno, extractor, esclusa, dados, listo para salir, etc.). No
  incluye `base`: lo pone `game.enterBase`.
- `titleOptions(save)` → `Continuar / Partida nueva / Minijuego / Controles / Creditos` si
  `save.trajeHecho`; si no, las cuatro de siempre (`Jugar / Minijuego / ...`).
- `endRunSave(save, result)` → save nuevo: `volvio` suma la bolsa (`addBotin`), `murio` deja
  la mochila de otra vez (`dropMochila`, +1 muerte) y en los dos casos actualiza `best`
  (round/points con máximo, ignorando valores inválidos). `result.recovered` limpia la
  mochila al volver.
- `shouldComplain(save)`: `muertes > 0 && muertes % 3 === 0`.
- `startRunSave(save)`: sube `loop` y arma `run = { loop, seed: seedFor(loop), save }`.
- `bagSummary(bag)`: "Volviste con: 3 chatarra, 1 goma" / "Volviste con las manos vacías."
- `baseObjective(save)`: el texto de la barra en la base (con o sin mochila).

### El traje queda guardado
`src/story.js`: al emitirse `itemCrafted {id:'traje'}` se marca `traje_fabricado` y se
escribe `trajeHecho: true` en `eternauta.save.v1`. La casa base no vuelve a pedir la historia.

### Título
- `src/scenes/title.js` arma las opciones con `titleOptions(loadSave())`.
  - **Continuar** → `game.enterBase()`.
  - **Partida nueva** → `clearSave()` + `newGame()` + prólogo (como Jugar).
  - **Jugar** → prólogo.
  - **Minijuego** → `startArena({ minigame: true })` (arena suelta, sin `game.run`).
- `src/menus.js`: `TitleMenu.activate` devuelve `continue`/`new`/`play`/`arena` por etiqueta y
  el cartel crece a 5 filas conservando el borde de abajo. Mouse, pad y teclado siguen igual.

### `game.enterBase` / `game.startRun` / `game.endRun` (`src/main.js`)
- `enterBase(spawn)`: `newGame()`, traje y rifle puestos e inventariados, `BASE_FLAGS` +
  `base: true`, luz de apagón y `changeScene('garage', spawn)` (spawn por defecto 9,7).
- `startRun()`: `startRunSave` → `writeSave` → `game.run` → arena. `startArena()` también
  arranca un run si `loadSave().trajeHecho` (salvo el Minijuego) y apaga `flags.base`.
- `endRun(result)`: usa el save vivo de la arena si está (así la mochila recuperada no
  revive), `endRunSave` → `writeSave` → `run = null`.
  - `murio` + `shouldComplain` → `startPrologue('queja', { returnTo: 'garage' })`.
  - si no → `enterBase()`.
  - Al volver vivo deja pendiente el toast "Volviste con: ..." y lo muestra cuando termina
    el fundido (en la base).
- `game.objective()` en base devuelve `baseObjective(baseSave)`.

### Garaje en modo base (`src/maps/garage.js`, `src/scenes/world.js`)
- NPCs **solo en base** (`showIfFlag: 'base'`): Favalli detrás del banco, Elena junto al
  traje colgado y Lucas junto a la radio. `world.js` ahora respeta `showIfFlag` en NPCs.
- Objeto `base_radio` (sprite `radio`) sobre las cajas de la derecha, con `baseAction`.
- Hacer (click izq. / A) sobre Favalli, Elena, Lucas o el electrógeno → **Mejoras** (abre el
  taller en esa pestaña). Sobre la radio → **Escuchar la radio**: diálogo de Lucas con una
  línea de `radioLine(save.mejoras.lucas, rng)` (portrait de Lucas, cierra con B/Esc).
- Las acciones de base van por `baseActionFor`/`actionFor` (mismo resolvedor para el prompt
  y para ejecutar). No tocan `src/actions.js`.
- Portón: label **"Salir (loop N)"** (N = `save.loop + 1`); al usarlo o pisarlo llama
  `game.startRun()`. Los demás pasos del garaje quedan bloqueados en base ("Desde la base se
  sale por el portón.").
- Cartelitos de madera "Favalli: el rifle", "Elena: el traje", "Lucas: la radio",
  "Electrógeno: luz": se dibujan en la capa de UI anclados a la posición del mundo (quedan
  legibles sobre la luz del apagón y siguen a la cámara).
- Objetivo de la barra: "Mejorá lo que puedas y volvé a salir." o, con mochila, "Volvé a
  salir. La mochila de otra vez quedó en la calle." (el HUD parte en dos líneas los textos
  largos para no pisar la plaquita de botín).

### `src/taller.js` (nuevo)
Cartel de madera de 400×176 en (40,44), idéntico a `casa_taller_favalli.png`:
- 4 pestañas de 88 px con la cabeza de chars2 (Favalli, Elena, Lucas) y el ícono
  `mejora_bengala` para el electrógeno; la activa crece y se funde con el cartel.
- Izquierda: el `what` de la estación y las 3 mejoras en filas talladas 168×26 con ícono
  `mejora_<id>`, tilde verde si está hecha, candado tallado e ícono apagado si está
  bloqueada, barra cálida en la elegida.
- Derecha: ficha con ícono ×2 en hueco 38×38, nombre, "Favalli, el rifle" en ámbar,
  descripción en 2 líneas, junta, "Con lo que trajiste de afuera" y los costos con
  `tengo/necesito` (verde/rojo). Botón **Hacer** / **Falta botín**.
- Prompts con glifos del dispositivo: Q/LB Estación · mouse/A Hacer · Esc/B Cerrar.
- Controles: mouse (hover y click en filas, pestañas y botón), teclado (arriba/abajo filas,
  Q o izquierda/derecha estaciones, Enter compra, Esc cierra) y pad (stick/cruceta, A,
  LB/RB, B).
- Comprar: `buyUpgrade(loadSave(), station)` → `writeSave` → toast "¡Listo! Cerrojo
  aceitado."; si falta botín, "Falta botín.". Solo se compra la siguiente.
- Mientras está abierto el mundo no recibe input (como el cofre o la pausa) y el HUD de
  mundo queda oculto.

### HUD de la base (`src/hud.js`)
Plaquita de madera arriba a la derecha con los 4 íconos de botín (`chatarra`, `goma`,
`nafta`, `pieza_cascarudo`) y las cantidades de `save.botin`. Solo se dibuja en base
(`game.baseBotin`).

## Cómo verlo / verificarlo

```bash
cd /home/mateyfasito/dev/game/eternauta
npm test          # 642 pruebas
npm run build
# capturas headless (sin HMR, para que otras ediciones no recarguen la página):
npx vite --config tools/vite.qa.config.js --port 5199 --strictPort &
node tools/base_screens.mjs     # docs/capturas/base_*.png
```

Para sembrar una partida guardada a mano (como hace el script):
```js
localStorage.setItem('eternauta.save.v1', JSON.stringify({
  v: 1, trajeHecho: true, loop: 2, muertes: 0,
  botin: { chatarra: 5, goma: 2, nafta: 1, pieza: 2 },
  mejoras: { favalli: 1, elena: 0, lucas: 1, luz: 0 },
  mochila: null, best: { round: 3, points: 120 },
}));
```

## Verificado

- `npm test`: **642 pass / 0 fail** (incluye `test/base_logic.test.js` 18, `test/taller_model.test.js` 8 y `test/base_casa.test.js` 4).
- `npm run build`: OK.
- Headless (Chromium + swiftshader, 960×540), sin errores de consola:
  - Título con **Continuar** (`docs/capturas/base_1_titulo_continuar.png`).
  - Garaje base con los 3 NPCs, radio, cartelitos y plaquita de botín
    (`base_2_garaje.png`); además con la mochila en la calle (`base_2_garaje_mochila.png`).
  - Taller de Favalli (`base_3_taller_favalli.png`) comparado con
    `art/concept/out/roguelike/casa_taller_favalli.png`.
  - Taller de Lucas con la tercera bloqueada (`base_4_taller_lucas.png`).
- Flujos comprobados con la API de tests (`window.__eternauta`):
  - Radio: diálogo de Lucas con línea de `radioLine`.
  - Electrógeno/Favalli/Elena/Lucas: acción "Mejoras" y apertura del taller.
  - Portón: label "Salir (loop 3)" → `startRun` → escena arena, `save.loop = 3`,
    `game.run = { loop, seed }`.
  - Volver vivo: botín sumado, `best` actualizado y toast "Volviste con: 3 chatarra, 1 goma".
  - Morir con 2 muertes → 3: mochila guardada con loop y prólogo en modo `queja`.
  - Menú del taller: click en "Hacer" compró Cerrojo (botín 5→1, mejoras 0→1, toast).
  - "Minijuego": arena sin `game.run` y sin tocar el loop guardado.
  - "Partida nueva": borra el save y arranca el prólogo `intro`.
  - `itemCrafted {id:'traje'}` deja `trajeHecho: true` en localStorage.

## Notas / pendiente

- Los cartelitos de las estaciones son UI anclada al mundo (no objetos sólidos): era la forma
  simple de que se lean sobre el apagón y no compliquen la oclusión.
- El botón del taller comparte etiqueta "Falta botín" para una fila bloqueada o ya hecha
  (la maqueta solo tiene esos dos estados de botón); la fila bloqueada nunca se compra.
- La mochila de otra vez depende de que la arena mantenga `scene.save` al día (D ya lo hace);
  `endRun` prefiere ese save vivo antes que el de localStorage.
