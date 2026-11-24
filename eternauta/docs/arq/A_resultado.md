# Worker A - resultado (main.js, router, overlay, paso fijo)

main.js: 887 -> 278 lineas (bootstrap + loop). `game` mantiene los mismos campos publicos.

## Mapa
- src/core/scene.js: contrato de escena + `ensureSceneContract` (no-ops: enter/leave/update/reset/dispose, setLightState, applyStoryState, autoPlaceCarry; freezePlayer/hideHud/showHud/hideCursor delegan en player/hud/cursor). `render(ctx)` opcional sin default.
- src/core/overlay.js: `game.overlay` (null|pause|chest|taller|equip|transition), `setOverlay/clearOverlay`, `canSetOverlay`. `chestOpen`, `tallerOpen`, `transition`, `equipAnim` son accesores derivados (con setter de compat).
- src/core/router.js: setScene/changeScene/fundido/cola/jump.
- src/core/panels.js: pausa, cofre, taller, traje (openMenu/openChest/openTaller/requestEquip/takeFromContainer).
- src/core/clocks.js: mate/pava/guion y apagon. src/core/runflow.js: newGame, base, startArena/startRun/endRun, persist, toasts.
- src/core/fadeLayer.js, src/core/debugApi.js (window.__eternauta, igual que antes).
- src/core/loop.js: `stepAccumulator` (paso 1/60, tope 5) y `createInputGate` (flancos solo al primer sub-paso; si un frame no corre pasos se acumulan para el siguiente).
- Tests: test/core_router.test.js, test/core_loop.test.js.

## Decisiones / cambios menores de comportamiento
- Router llama `leave()` de la escena anterior (antes no existia; default no-op).
- openMenu/openTaller exigen overlay null (antes el cofre/taller se chequeaba por separado).
- newGame oculta tambien la pausa y limpia el overlay.
- Input poll una vez por frame; update n veces (hasta 5); render una vez.

## No hecho
- ArenaScene no editada (solo envuelta por ensureSceneContract); su `render` y `reset` siguen como los tiene B.
- tools/*.mjs no probados (no se corre navegador); solo build + tests.

## Verificacion headless (vite :5199, matado por PID)
- tools/base_screens.mjs: OK, 0 errores de consola; taller Favalli/Lucas abre y cierra via overlay 'taller'.
- Diff de pixeles vs docs/capturas/fix5_antes (delta>8): titulo 0.90%, garaje 0.68% (nieve/animacion), taller Favalli/Lucas y mochila 0.00%.
- tools/barrio_preview.mjs: OK.
- tools/death_screens.mjs: falla en `state().arena` null. Causa: B hizo de `scene.state` un objeto (createRunState) y `debugApi` espera el metodo `state()`. debugApi ahora tolera ambos, pero B debe exponer el snapshot (arena.resultSel, etc.) con otro nombre/hook. No es del router.
- Tests nuevos: flujo titulo->prologue->attic con escenas falsas y ciclo de overlays pausa/cofre/taller. npm test 782 verde.

## Tanda 2: render(ctx) por escena
- Contrato en src/core/scene.js: `render(ctx)`, ctx = { renderer, camera, uiCamera, lightPost, viewport, game }. `defaultRender(scene, ctx)` = lo que hacia main (applyCamera, lightPost si hay apagonParams, uiScene). `renderFlat` para pantallas fijas. `ensureSceneContract` rellena render con defaultRender: ArenaScene (B) lo usa tal cual o define el suyo; renderUiLayer exportado para reutilizar.
- title/death/end/view/prologue implementan render con renderFlat; world/garage/arena usan el default.
- main.js (271 lineas) solo llama scene.render(ctx) y despues dibuja la capa de overlay (fade + menuScene) y el cursor.
- Verificacion tanda 2: npm test 785 verde, build OK. 5199 estaba ocupado por el vite de B (el mio no arranco, no lo toque): base_screens 0 errores de consola; death_screens sin errores de pagina; diff vs fix5_antes: titulo 0.91%, garaje 0.53%, talleres y mochila 0.00%.
