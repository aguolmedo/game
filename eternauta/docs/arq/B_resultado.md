# Worker B: resultado (arena)

## Hecho
- `src/arena/runMode.js`: modo único `banner | active | dying | result`, tabla `TRANSITIONS`, `setMode` (valida, tira error si es inválida) y `forceMode` (solo para compatibilidad).
- `ArenaScene`: `scene.mode`, `scene.setMode(next)`. `phase`, `vignetteOpen`, `resultOpen`, `dead`, `blocksPause` son getters derivados (con setters que fuerzan el modo, para tools/tests que los asignan). `phase` conserva 'dead' para dying/result.
- Módulos (`wavesScene`, `resultFlow`, `runSetup`, `combatScene`, `hudArena`) usan `setMode` / `scene.mode`; se borraron las asignaciones combinadas de banderas.
- `src/arena/runState.js`: `createRunState()` plano sin Three (modo, ronda, cfg, spawn, integridad, invuln, puntos, arma, eff, bolsa, botín, items, enemigos lógicos, resultado, semillas y rngs). La escena guarda `scene.state` y expone `STATE_FIELDS` como accesores con los nombres viejos (tools y tests siguen andando sin cambios).
- `hudArena`: lee `scene.mode`; el pase de luz salió de `drawHud` a `lightPass`, llamado desde `applyCamera` (render).
- `src/arena/roundSim.js`: `roundStep(state, dt, env)` puro para banner/spawn/fin de ronda; `updateRound` delega ahí.
- Tests nuevos: `test/arena_mode.test.js` (tabla de transiciones) y `test/arena_determinismo.test.js` (600 pasos, misma semilla, mismo state). Total 758 verdes, build OK.

## Estado vs vista
- State: lo listado arriba. Vista (en la escena): meshes, player, snow, footprints, ui/lightUi, cámara, shooting, mapas de materiales, flow fields, mundo, luces.

## Segunda tanda (pedido del coordinador)
1. `ArenaScene.leave()` (suelta controles, mouse, toasts, oculta UI) y `dispose()` (mundo, `ShootingFx.dispose()`, cachés frameMats/fxMats/itemMats y frameGeos/fxGeos/itemGeos, overlays ui/lightUi). Las texturas del atlas son compartidas y no se liberan. Test: `test/arena_dispose.test.js` (escena armada a mano, sin WebGL).
2. `src/arena/simulate.js`: `shootStep`, `applyDamage`, `applyBite`, `stepBullets`, `stepEnemies` y `simulateStep(state, inputs, dt, env)`, puros. La escena los usa: `ShootingFx.update` avanza las balas con `stepBullets` (`state.bullets` es el mismo array que `shooting.bullets`), `updateEnemies`/`damageEnemy`/`bitBy` llaman a la lógica pura y solo agregan toasts, fx y sprites. `rewardKill` se eliminó (nadie lo usaba fuera de combatScene). El disparo real sigue entrando por `shooting.fire` (vista); `shootStep` es la versión pura que usa el test. Test de determinismo de combate (600 pasos, disparos con shotRng, mordidas) en `arena_determinismo.test.js`.
3. `hudArena` lee todo de `scene.state.*` (50 lecturas); lo único que escribe es `ui.mesh.visible`.
4. `feedback.js` (723 -> 579 líneas) partido en `feedbackParticles.js`, `feedbackShake.js` y `feedbackDraw.js` (luz del fogonazo y guía de tiro). No hay "popups" en ese archivo: los toasts viven en hudArena. La clase ShootingFx delega con métodos de una línea (API igual).
5. `runSetup`, `combatScene` y `resultFlow` acceden al estado como `scene.state.X`.

## Conteo de nombres distintos `scene.*` (antes -> después)
- runSetup 76 -> 48
- combatScene 49 -> 34
- hudArena 58 -> 40
- resultFlow 29 -> 18
- feedback.js: 723 -> 579 líneas (+185 en los 3 módulos nuevos)

## No llegué / límites
- El disparo de la escena no pasa todavía por `simulateStep` completo (el fuego, vainas y partículas son vista); `simulateStep` se ejercita solo en tests.
- `scene.state.mode` se lee directo, pero las escrituras siguen por `setMode` (el test de modo cubre la tabla).
- Los otros módulos (wavesScene, lootScene, consumablesScene, worldScene, debugScene) aún usan los accesores de compatibilidad.
- Tests: 780 verdes, build OK. No corrí tools/*.mjs (necesitan navegador).

## Tercera tanda: migración a scene.state.X
Nombres distintos `scene.*` por módulo (antes -> después):

| módulo | antes | después |
|---|---|---|
| wavesScene | 30 | 15 |
| lootScene | 31 | 29 |
| consumablesScene | 16 | 15 |
| worldScene | 32 | 32 (no usa campos del state) |
| debugScene | 31 | 18 |

`aliveCount` conserva `scene.enemies` (el test de la fachada lo llama con una escena mínima). No pasé state/view explícitos como argumentos separados: las funciones siguen recibiendo la escena y leen `scene.state`; solo lo hicieron limpio `simulate.js`, `roundSim.js` y `runMode.js`. 782 tests verdes, build OK.

## Renombre del snapshot de depuración
`ArenaScene.state()` pasó a `debugSnapshot()` (scene.state es ahora el RunState). `src/core/debugApi.js` usa `sceneSnapshot()` (prefiere `debugSnapshot`, cae a `state()` en otras escenas); tools y test actualizados. Capturas: death_screens y salida_screens pasan; salida_* difieren 0.8-2.6% de px (>8) de fix5_antes (nieve/animación). shooting_screens corre sin errores de página, pero su escenario (teleport a 640,262) cae hoy en una zona vacía del barrio nuevo y la baja no se produce; con un script propio la bala sí impacta y mata (hp 1 -> 0).

## Cuarta tanda: view/state, render, shooting_screens
1. `scene.view` (src/arena/runView.js: Three, canvas, sprites, buffers de entrada, cámara, toasts) junto a `scene.state` (runState.js: simulación, mundo lógico, rngs). Los campos viejos siguen como accesores (VIEW_FIELDS / STATE_FIELDS) para tools/tests. Los módulos leen `scene.state.X` / `scene.view.X`.
   Nombres distintos `scene.*` por módulo (originales -> ahora; entre paréntesis, campos de datos que no son state/view: solo game/assets/dead/phase):
   combatScene 49 -> 15 (2), consumablesScene 16 -> 11 (0), enemyVisuals 8 -> 8 (2), fxScene 7 -> 6 (1), hudArena 58 -> 24 (2), inputScene 19 -> 6 (2), lootScene 31 -> 17 (1), resultFlow 29 -> 11 (2), runSetup 76 -> 17 (1), wavesScene 30 -> 14 (1), worldScene 32 -> 15 (1), debugScene 31 -> 18 (fachada permitida).
   Lo que queda en esos módulos son llamadas a métodos de la fachada (`scene.toast(...)`, `scene.spawnFx(...)`) y los servicios `scene.game` / `scene.assets`. La meta "ningún módulo lee `scene.`" NO se cumplió: las funciones siguen recibiendo la escena como primer argumento; no cambié las firmas a `(state, view, ctx)` (queda para otra tanda; las puras `simulate.js`, `roundSim.js`, `runMode.js` ya las tienen).
2. `ArenaScene.render(ctx)` implementado con `renderFlat` de `src/core/scene.js` (mundo + capa uiScene; la luz va por el canvas lightUi, sin shader). main ya lo llama.
3. `tools/shooting_screens.mjs`: semilla fija 3455 (como salida_screens), busca un tramo libre en la calle de abajo con `world.isSolid`/`canSpawnAt` (hoy x=640,y=552), y falla si la baja no ocurre (kills >= 1) o el golpe no marca (hitT > 0). Las 13 capturas de docs/screens/shooting se revisaron (sin ruido fuera del mapa). salida_screens, death_screens y shooting_screens: sin errores. 784 tests, build OK.

## Quinta tanda: firmas explícitas
- Los módulos `inputScene, runSetup, worldScene, lootScene, consumablesScene, combatScene, wavesScene, resultFlow, enemyVisuals, fxScene, hudArena` exportan funciones `(state, view, svc, ...args)`. `svc` (no `ctx`, porque en hudArena `ctx` es el canvas 2D) lleva `game`, `assets`, `setMode` y todos los métodos de la fachada, resueltos por la instancia (un override en tools/tests también cuenta). La escena lo arma al primer uso (`scene.ctx`); la fachada delega `fn(this.state, this.view, this.ctx, ...)`. `debugScene` sigue recibiendo la escena (fachada de debug).
- `view.three` es la THREE.Scene (accesor `scene.scene` intacto); `ShootingFx.root` reemplaza a `ShootingFx.scene`; `reset.js` y `runMode.js` ya no usan el nombre `scene`.
- Cierre: `grep -n "scene\." src/arena/*.js` da 0 fuera de debugScene.js. 
- No hecho: las funciones que solo necesitan state igual reciben (state, view, svc) porque la fachada es uniforme.
- 784 tests, build OK; salida_screens, death_screens y shooting_screens sin errores (vite 5199 matado).
