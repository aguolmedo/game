OBJETIVO: dos arreglos chicos de calidad, SIN cambiar lo que se ve ni cómo se juega (salvo lo explicado). Proyecto: /home/mateyfasito/dev/game/eternauta.

PROHIBIDO cualquier comando git que escriba (checkout/restore/stash/reset/commit): no hay nada commiteado. Para volver atrás un archivo, copialo de /home/mateyfasito/dev/game/snapshot_rng/{src,test}/... No toques bocetos/, art/, public/. `npm test` y `npm run build` en verde después de cada paso.

== PARTE 1: rng obligatorio en la lógica de juego ==
Hoy la lógica cae en Math.random en silencio cuando nadie le pasa un rng, y eso rompe el determinismo de las salidas con semilla (src/run/seed.js, src/run/rng.js).
Regla: Math.random SOLO en cosmética (partículas, nieve, fases de animación, estática del prólogo). La lógica recibe el rng siempre, sin default.
1. Quitar el default `= Math.random` / `|| Math.random` / `typeof rng === 'function' ? rng : Math.random` de:
   - src/arena/enemies.js createEnemy (l.32), patchDrop (l.305)
   - src/arena/waves.js pickType, spawnPoint, nextSpawnDelay
   - src/arena/projectiles.js spreadAngle, el `opts.rng || Math.random` de l.56, ejectCasing (l.200, si solo afecta la vaina visual: decidí; si es cosmético puede quedar, anotalo)
   - src/run/radio.js l.137 y l.146
   Si falta el rng, que tire un Error claro (`throw new Error('createEnemy: falta rng')`), no que invente uno.
2. Arreglar los callers que pasaban Math.random a mano o no pasaban nada:
   - src/arena/wavesScene.js:80 `createEnemy(type, x, y, Math.random)` → usar el rng de la ronda de la escena (scene.roundRng o el que corresponda; leé runSetup.js).
   - src/arena/runSetup.js:37 y src/scenes/arena.js:133 (`roundRng = Math.random`): el Minijuego (sin run.seed) usa un rng sembrado explícito: `rngFromSeed(semilla)` con semilla de `Date.now()` (o seedFor), guardada en la escena (p. ej. scene.roundSeed) para poder reproducirla. Leé run/rng.js para la API real.
   - src/world/actions.js:320 `radioLine(..., Math.random)`: es una línea de radio en la casa-base; usá un rng sembrado del save si hay algo razonable (p. ej. loop), si no un rngFromSeed(Date.now()) explícito. Anotá la decisión.
   - Cualquier otro caller que encuentres con grep de las funciones del punto 1 (incluí tests y tools/*.mjs).
3. NO tocar (cosmética, se queda con Math.random): src/snow.js, src/arena/feedback.js (partículas), src/scenes/prologue.js 308-312 (estática), title.js, view.js, npc.js, pickup.js, worldItems.js (fases de animación). prologueDialog(mode, random = Math.random) en prologue.js:71: decidí si es lógica (elige texto) y documentalo.
4. Tests: agregá test/rng_obligatorio.test.js que (a) verifique que cada función del punto 1 tira sin rng, y (b) que dos rondas simuladas con la misma semilla dan la misma secuencia de pickType/spawnPoint/createEnemy. Agregá un test que haga `grep` (fs.readFileSync de los archivos de lógica: src/arena/{enemies,waves,projectiles,wavesScene,runSetup}.js, src/run/*.js) y falle si aparece `Math.random`.

== PARTE 2: números y colores mágicos ==
1. src/arena/hudArena.js:21-22 (`'30 balas — 250 puntos'`, `'Comprar 30 balas — 250 puntos'`) y src/arena/combatScene.js:112-114 (`'+30 balas'`, `son 250`): construir los textos desde las constantes de src/arena/weapon.js (AMMO_PRICE y la de cantidad del paquete; si no existe la del paquete, creá AMMO_PACK = 30 ahí y usala también donde se suman las balas). Los textos resultantes tienen que ser idénticos a los de hoy.
2. Grep de otros textos con precios/cantidades repetidos a mano en src/arena, src/taller.js, src/base.js, src/run/: mismo tratamiento.
3. Colores literales ('#rrggbb' y 'rgba(...)') en src/arena/deathPanel.js, src/arena/hudArena.js y src/scenes/prologue.js: si el color ya existe en src/uiSkin.js (mismo valor), importarlo; si no existe pero se repite en 2+ archivos, agregarlo a uiSkin con nombre descriptivo. Colores de un solo uso muy específicos pueden quedar locales como constante con nombre al tope del archivo. Mismo valor exacto: cero cambio visual.

== ACEPTACIÓN ==
- `npm test` en verde (≥748 + los nuevos), `npm run build` OK.
- grep: ningún Math.random en src/arena/{enemies,waves,projectiles,wavesScene,runSetup}.js, src/run/*.js, src/scenes/arena.js, src/world/actions.js.
- Capturas: levantá `npx vite --port 5199 --strictPort` en background, corré `node tools/base_screens.mjs` y `node tools/salida_screens.mjs`, revisá que no haya errores de consola y que el HUD de la arena (cartel de balas) diga lo mismo que antes (compará con docs/capturas/fix5_antes/salida_porton.png). Matá vite y chrome por PID (no `pkill -f` dentro del mismo comando).
- Escribí docs/brief_rng_constantes_resultado.md: lista de funciones cambiadas, callers arreglados, decisiones (ejectCasing, prologueDialog, radio), constantes/colores movidos, tests nuevos.
