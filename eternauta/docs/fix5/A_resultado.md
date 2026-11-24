# Fix 5 — Parte A: partir `src/scenes/arena.js`

Refactor **puro**: mismos tests, mismo comportamiento, misma API pública.
`src/scenes/arena.js` pasó de **2221** a **278** líneas y quedó como fachada.
No se editó ningún archivo preexistente de `src/arena/`; sólo se agregaron
módulos nuevos.

## Cómo quedó la fachada

- La clase `ArenaScene` conserva en el archivo: el `constructor` (arma la
  escena, Jugador, nieve, huellas, HUD, save, mundo inicial), `update(dt,
  input)`, `followCamera`, `applyCamera` y los getters del contrato de escena
  (`blocksPause`, `dialog`, `choice`).
- Cada módulo nuevo exporta **funciones que reciben la escena como primer
  argumento** (`export function updateLoot(scene, dt) { ... }`), sin herencia
  ni `this`.
- Al final de `arena.js` un lazo cuelga cada función de
  `ArenaScene.prototype` con el mismo nombre de método:
  `ArenaScene.prototype[name] = function facade(...args) { return fn(this, ...args); }`.
  Así `arena.updateLoot(dt)`, `Object.create(ArenaScene.prototype)` y
  `window.__eternauta.scenes.arena.pickResult(0)` siguen funcionando igual.
- `ARENA` se movió a `src/arena/config.js` y `arena.js` lo reexporta
  (`export { ARENA } from '../arena/config.js'`), para que HUD/combate/runSetup
  lo lean sin importar `arena.js` (evita el ciclo). El objeto sigue siendo el
  mismo `{ ammo: 'compra' }` mutable que usan tests y tools.

## Mapa de módulos nuevos

| Archivo | Qué tiene | Líneas |
|---|---|---|
| `src/scenes/arena.js` | fachada: constructor, update, cámaras, getters y binding de módulos | 278 |
| `src/arena/inputScene.js` | `bindMouse`, `readControls` (flanco teclado/pad/mouse), `readAim`, `faceAim`; `DIR` y `EMPTY_KEYS` | 140 |
| `src/arena/runSetup.js` | `setupRun`, `rebuildWorld`, `startPoint`, `resetRun`, `enter`, `reset`; `ROUND_BANNER_FIRST` | 169 |
| `src/arena/worldScene.js` | `buildWorld`, `disposeWorld`, luces (`addSnowLights`, `addMapLight`, `removeMapLight`, `clearDynamicLights`), `readSpawns`, `findCrate`, `addCrateVisual`, `buildSolids`, flow fields (`buildFlowFields`, `updateFlow`, `canSpawnAt`); `fallbackSpawns` | 254 |
| `src/arena/lootScene.js` | `setupLoot`, `reachableGround`, `setupFarol`, sprites de ítems, `addGroundLoot`, `removeGroundLoot`, `clearGroundLoot`, sobreviviente, `updateLoot` (recogida y mochila) | 194 |
| `src/arena/consumablesScene.js` | `useBengala`, `useBotella`, `updateConsumables` (chispas y daño del fuego), `clearConsumables` | 130 |
| `src/arena/combatScene.js` | `tryFire`, `damageEnemy`, `rewardKill`, `tryPatch`, `cancelPatch`, `updatePatch`, `nearCrate`, `tryBuy`, `nearHome`, `goHome`, `updateEnemies`, `bitBy`, `pushPlayer` | 199 |
| `src/arena/resultFlow.js` | `die`, `bestFromSave`, `updateBest`, `updateVignette`, `openResult`, `updateResult`, `pickResult`, `restart` | 135 |
| `src/arena/wavesScene.js` | `startRound`, `completeRound`, `updateRound`, `pickSpawn`, `spawnEnemy`, `aliveCount`, `debugSetRound`, `debugSpawn`; `MAX_SPAWN_DIST` | 125 |
| `src/arena/enemyVisuals.js` | mallas, sombras, cuadros de animación y limpieza de bichos | 80 |
| `src/arena/fxScene.js` | `fxMaterial`, `fxGeometry`, `spawnFx`, `updateFx`, `clearFx` | 60 |
| `src/arena/hudArena.js` | `toast`/`updateToasts` y todo el HUD: paneles, bolsa, munición, consumibles, mira, hints, carteles, banner, fuego, mochila, viñeta y resultado; `SHOP_TEXT`, `SHOP_LABEL`, `MOCHILA_CYAN` | 475 |
| `src/arena/debugScene.js` | `state()` y atajos de QA (`debugAddPoints`, `debugGive`) | 60 |
| `src/arena/config.js` | `ARENA` mutable de la salida | 4 |
| `src/arena/util.js` | `clamp` compartido por los módulos nuevos | 5 |

Ningún archivo nuevo supera las 800 líneas; el más grande es `hudArena.js`
(475). `arena.js` quedó en 278.

## Qué no se movió (y por qué)

- **`constructor`, `update`, `followCamera`, `applyCamera`, getters**: son la
  orquestación y el contrato de escena; moverlos no reduce acoplamiento.
- **`crateMesh`**: campo muerto preexistente (`disposeWorld` lo nulea pero
  nadie lo asigna). No se tocó para no mezclar este refactor con la limpieza
  de código muerto (punto 5 del brief general).
- **Helpers duplicados** (`clamp`, `put`, wrap de texto, `geom`): quedan para
  el punto 1 del brief general. Acá sólo se evitó duplicar `clamp` creando
  `src/arena/util.js`; `dirFromVector` se reutiliza de `src/arena/enemies.js`.
- **Constantes**: se movieron junto al módulo que las usa, con los mismos
  valores. `VIEW_W`/`VIEW_H` del HUD salen de `hudLayout.js` (480×270, idéntico
  a `sprite.js`).

## Verificación

- `npm test`: **748/748 en verde** (745 previos + 3 nuevos de
  `test/arena_facade.test.js`, que cuidan la API pública de la fachada).
- `npm run build`: **OK** (`vite build`, 128 módulos).
- `node --check` sobre `arena.js` y todos los módulos nuevos: OK.
- Smoke de runtime en Node: se llamó cada método de la fachada con una escena
  falsa (Proxy); **0 `ReferenceError`** por identificadores/imports faltantes.
- Dos auditorías independientes (read-only) compararon el original
  (`fix5_snapshot/src/scenes/arena.js`) contra el refactor: sin diferencias de
  cuerpo más allá de `this.`→`scene.`/indentación/`scene` como primer
  parámetro, sin métodos faltantes, sin colisiones de nombres, sin ciclos de
  import. La única diferencia textual es `disposeWorld`, donde la variable
  local `const scene = this.scene` pasó a llamarse `three` para no chocar con
  el parámetro (mismo objeto Three.js).
- No se abrió navegador ni se levantó Vite, según `docs/fix5/comun.md`; las
  capturas comparativas las hace la tanda 2.
