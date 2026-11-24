# Fix 5 parte C: resultado (world.js)

Refactor puro. `src/scenes/world.js` queda como fachada: constructor, `reset`, `enter`, `blocksPause` y un delegador de una línea por método (`foo(a) { return mod.foo(this, a); }`). Mismos exports (WorldScene, PRIORITY, OWN_VERB_TYPES, depthFor, PLAYER_SPEED) y mismos métodos/campos. Los módulos son funciones `(scene, ...args)` que llaman a `scene.metodo()`, así que los tests/tools que pisan métodos de la instancia siguen funcionando.

| Archivo | Contenido | Líneas |
|---|---|---|
| src/scenes/world.js | fachada: constructor, reset, enter, delegadores | 416 |
| src/world/actions.js | resolvedor y ejecución: ctx, runAction, runHands, dropHeld, acciones base, warps | 373 |
| src/world/camera.js | cámara, apagón/luz, warnNear | 130 |
| src/world/carry.js | acarreo de muebles | 153 |
| src/world/constants.js | PRIORITY, OWN_VERB_TYPES, NPC_NAMES | 15 |
| src/world/ghost.js | silueta fantasma de Manos | 226 |
| src/world/helpers.js | capName, isGrabbable, boxOf, boxOfWarp, warpLabel | 36 |
| src/world/hud.js | HUD, etiquetas, cursor de acción, barras | 324 |
| src/world/interact.js | interacción: hablar, recoger, mate/pava, warps, cómic/globos | 416 |
| src/world/look.js | Mirar y líneas de primera vez | 146 |
| src/world/pointer.js | input de mouse/puntero, hover, hotbar | 188 |
| src/world/state.js | estado del mundo, historia, luces | 96 |
| src/world/update.js | candidates y update (bucle) | 332 |

No se movió: constructor, reset, enter, blocksPause (quedan en la clase). world.js tiene 416 líneas; ningún módulo nuevo pasa de 420.
