# Fix 6 — Pendientes de los fixes 3 y 4: resultado

**Fecha:** 23/11/2026 · **Alcance:** los pendientes de
`docs/brief_fix_3_resultado.md` y `docs/brief_fix_4_resultado.md` que necesitaban
`src/scenes/arena.js`. Se tocaron `src/scenes/arena.js`, `src/arena/*` (loot,
steer, controles, resultScreen), `src/mapView.js`, `src/run/save.js`,
`src/main.js`, `src/scenes/title.js`, tests y `tools/diag/arena_perf.mjs`.

## 1. Récord unificado (M12) — `save.best` y nada más

- **`src/scenes/arena.js`**: se borraron `BEST_KEY`, `loadBest()` y `saveBest()`.
  Ahora `this.best` sale de `save.best` (`bestFromSave`) y `updateBest()` deja
  el récord en el save en memoria (`this.save.best`). Si la salida es real
  (`game.run` y no `game.isolated`) se persiste con `game.persist(this.save)`;
  en el **Minijuego no se escribe nada** (sólo vive en memoria).
- **`src/run/save.js`**: se borraron `LEGACY_BEST_KEY`, `mirrorBest()`,
  `legacyBest()` y `mergeBest()`. `writeSave` sólo escribe `eternauta.save.v1`;
  `loadSave` ya no importa la clave vieja de la arena. `clearSave` borra el
  save completo: ahora el récord vive ahí y no en un segundo silo.
- **`src/main.js`**: se borró el parche `saveBestIsolated` (ya no hace falta).
- Verificado headless en una salida real: con save `best {2,300}` la arena
  entra con ese récord; al morir en ronda 5 con 900 pts y volver a la casa,
  `eternauta.save.v1.best` queda `{5,900}`, no aparece `eternauta.arena.best`
  y la escena vuelve a `garage`.

## 2. Minijuego: "Otra vez"

- `src/arena/resultScreen.js`: nueva `resultOptionLabels(view)`; con
  `view.retry` la primera opción dice **"Otra vez"** en vez de "Volver a la
  casa". `arena.drawResult` pasa `retry` cuando no hay `game.run` (Minijuego).
- La acción ya era la correcta: `pickResult(0)` llama a `game.endRun`, que en
  modo aislado hace `restart()` sin tocar localStorage (`minigame_save`).

## 3. Título

- `src/scenes/title.js`: `enter()` arma las opciones con
  `titleOptions(this.game.baseSave || loadSave())`, así "Continuar" aparece
  aunque el storage haya fallado y la partida siga sólo en memoria.

## 4. Performance pendiente (sin cambios visuales)

- **Pase de luz salteado** (`drawHud`): con la viñeta o el resultado abiertos no
  se hace `clear/draw/commit` del canvas de luz. Como la cámara no se mueve en
  esos estados, el canvas conserva el último mapa de luz y se ahorra el pase.
- **Cero asignaciones por cuadro en el loop**:
  - `readControls`: doble buffer de `Set`/array de teclas y botones del pad,
    objeto `controls` mutado, y `consumableAction(args, out)` reusando `out`.
  - `readAim`: escribe en `this.aimBuf` (no crea vectores; tampoco `normalize`).
  - `updateToasts`: compacta el array en el lugar (sin `filter`).
  - `collectLoot`: nueva `collectLootInto()` en `lootRun.js` que escribe en un
    `out` reutilizable; la arena alterna dos arrays para `left` (nunca es el
    mismo que `items`). `collectLoot` sigue existiendo y devuelve arrays nuevos.
  - `steer`: AABB de sonda, vector de flow y resultado se reusan (`enemyBox`
    y `flowVector` aceptan `out`); `playerPoint` se reusa en
    `updateEnemies`/`updateLoot`.
- **`removeEnemy`**: libera el material propio de la sombra del bicho que muere
  suelto (la geometría es compartida), igual que `clearEnemyEntities`.
- **`buildWorld` (P5)**: al reconstruir el mundo limpia enemigos, FX y botín del
  piso antes de armar el mapa nuevo.
- **P2 (pendiente de fix 3) — batch del mobiliario del barrio**: como
  `arena_drawcalls` tenía que quedar igual o mejor que el fix 3, se hizo el
  batch por atlas que faltaba. Sólo para la arena (`map.batchStatic`):
  - Una **única malla** por mundo con todos los objetos estáticos, con un atlas
    vertical armado al vuelo (borde de 1 px con la orilla del sheet repetida,
    para que el muestreo en los bordes sea igual al `ClampToEdge` original).
  - Cada vértice lleva su `z`; las caras se ordenan como el pase transparente
    de three (z de cerca a lejos, empate por id) + un bias de 0,05 px para el
    empate con el jugador. Resultado: idéntico al dibujo objeto por objeto.
  - Quedan con malla propia los objetos que `setDark()` tiñe (ventanas, casas,
    farolas, pinos) y los que caen dentro de un resplandor aditivo (el glow no
    escribe z; mezclarlos cambiaba el orden). `disposeWorld` libera geometría,
    material y el atlas del batch.

## Mediciones (headless, swiftshader)

| Medición | Fix 3 | Fix 6 |
|---|---:|---:|
| `arena_drawcalls`: reposo (avg/min–max) | 136,8 (136–142) | **47,1 (46–52)** |
| `arena_drawcalls`: con 40 spawns | — | 78,2 (76–84) · Δ ≈ 0,78 por bicho |
| `leaks_gl`: +buffers con 100 bichos | +12 | **+12** |
| `leaks_gl`: +buffers tras clear + 600 huellas | +16 | **+16** |
| `arena_rebuild`: meshes por mundo (misma semilla) | 273 | **72** (4 corridas iguales) |
| `arena_rebuild`: texturas | — | **42**, estables |
| `arena_rebuild`: glow dispuesto por `disposeWorld` | no | **no** |
| `arena_perf`: `update()` promedio | 0,806 ms | **0,65–0,67 ms** |
| `arena_perf`: `drawHud()` promedio | 0,458 ms | **0,35–0,36 ms** |
| `arena_perf`: meshes en escena | 221 | **50–74** |

`leaks_gl.mjs` sigue sin imprimir "CONFIRMADO" (por debajo del umbral de 20) y
`arena_perf.mjs` sale 0 (se ajustó su chequeo de sanidad de "escena sin meshes"
a la nueva realidad del batch: ~50 mallas para 300+ objetos).

## Verificación visual

- **A/B pixel a pixel del batch** (mismo frame, con y sin batch): 3 semillas
  (3455, 101, 303) × 6 posiciones de cámara = 18 pares, **0 píxeles con
  diferencia > 8** (idénticos). Para lograrlo se dejaron fuera del batch los
  objetos dentro de los resplandores y se agregó el borde repetido al atlas.
- Capturas revisadas (no negras, HUD y sprites visibles):
  - `docs/capturas/fix6_salida.png` — la salida del Minijuego (barrio, nieve,
    luz de farola, HUD).
  - `docs/capturas/fix6_resultado_otra_vez.png` — resultado del Minijuego con
    la opción **"Otra vez"** seleccionada.

## Tests y build

- `npm test`: **745/745 OK**. Se reemplazaron los 4 tests del espejo M12 por 3
  del récord único y se sumaron `collectLootInto` (reuso de buffers) y
  `resultOptionLabels` ("Otra vez").
- `npm run build`: OK.
- `node --check` sobre todos los archivos tocados: OK.
- `node tools/diag/minigame_save.mjs`: **EXIT=0** (todas las claves de
  localStorage idénticas antes/después de morir y elegir "Otra vez").
- `node tools/diag/leaks_gl.mjs`, `arena_drawcalls.mjs`, `arena_rebuild.mjs`,
  `arena_perf.mjs`: EXIT=0.
- Servidores Vite (5199) y Chromium de las verificaciones: cerrados.

## Notas

- Una clave vieja `eternauta.arena.best` que haya quedado en un navegador ya no
  se lee ni se escribe: se ignora. No hay migración (el récord nuevo sale de
  `save.best`).
- El batch estático se habilita sólo para el mapa del barrio de la arena; las
  escenas con muebles que se mueven/ocultan (altillo, casa, calle) siguen con
  una malla por objeto.
