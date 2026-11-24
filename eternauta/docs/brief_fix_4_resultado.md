# Fix 4 — Guardado, flujo y Minijuego: resultado

**Fecha:** 23/11/2026 · **Alcance:** hallazgos M1–M6 y M12 de
`docs/analisis_roguelike.md` y "Tanda 4" del plan. Se tocaron solo
`src/main.js`, `src/run/save.js`, `src/taller.js`, `src/story.js`, `src/base.js`
y tests. **No se tocó** `src/scenes/arena.js` ni `src/maps/*` (corre en paralelo
con el fix 2).

## Cambios por hallazgo

### M1 — Minijuego aislado (no escribe localStorage)
- `game.startArena({ minigame })` marca `game.isolated`; `game.endRun` consulta
  `runPersists(game.run, game.isolated)` (`src/base.js`) y, si no hay salida
  real, **no persiste**: `restart()` como el viejo "Otra vez" (diseño de la
  salida, punto 7) y `game.run` queda en `null`. `changeScene` apaga el modo
  aislado al salir de la arena.
- La arena guarda el récord por su cuenta (`eternauta.arena.best`, en
  `arena.js`). Como ese archivo no se puede tocar, `main.js:154` envuelve
  `arena.saveBest`: en el Minijuego actualiza el récord **en memoria** y no
  llama al original. Verificado: morir, elegir "Volver a la casa" y después
  "Volver al título" deja **todas** las claves de localStorage idénticas.

### M2 — Sacarse el traje en la calle vuelve a matar
- El pedido `changeScene('death')` se hacía a mitad de `equipAnim`, cuando
  `changeScene` lo descartaba. Ahora ese pedido **se encola** y `drainSceneQueue()`
  lo arranca al terminar el animado (`src/main.js` tick). Headless: la escena
  termina en `death`.

### M3 — Save en memoria como fuente de verdad y aviso si falla
- `game.persist(save)` (`main.js:369`) es el único camino de escritura desde
  main/taller/story: deja `game.baseSave` actualizado **siempre** y, si
  `writeSave` devuelve `false`, encola una sola vez el toast
  "No se pudo guardar. La partida sigue en memoria.".
- `enterBase(spawn, save)`, `startRun`, `startArena`, `TallerPanel.show/setStation/buy`
  y el evento del traje leen `game.baseSave || loadSave()`; `endRun` pasa el save
  explícito a `enterBase`, así que un storage lleno no pierde el botín.
- Headless con `Storage.prototype.setItem` tirando: la base queda con
  `botin` 10/4/1/2 (7+3 chatarra, 3+1 goma), el toast aparece y el aviso se
  muestra una sola vez.

### M4 — Migración v1→v2, respaldo y todo el storage dentro de `try`
- `src/run/save.js`: `SAVE_VERSION = 2`; `loadSave` migra v1 en la primera
  lectura, escribe el original intacto en `eternauta.save.v1.bak`
  (`BACKUP_KEY`) y persiste el v2. Una versión desconocida sigue dando save
  vacío.
- `storageOrNull()` resuelve `globalThis.localStorage` **dentro** de try; todas
  las lecturas/escrituras/borrados pasan por helpers que atrapan errores.
  `writeSave(save)` sin storage ahora devuelve `false` en vez de tirar.
- La clave sigue siendo `eternauta.save.v1` (es la clave histórica y la que usa
  `tools/diag/minigame_save.mjs`); lo que cambia es el campo `v`.

### M5 — Abandonar una salida: **muerte sin queja**
- Decisión: abandonar (pausa → título o resultado → título) cuenta como
  muerte: se deja la mochila en la nieve, sube `muertes` y se actualiza el
  récord, pero **no** dispara el prólogo de queja. Se implementa en
  `src/base.js` (`endRunKind`, `endRunComplains`, `abandonResult`) y en
  `main.js`: `changeScene` detecta que se sale de la arena con `game.run` vivo y
  cierra la salida con `endRun({ type:'abandono', to, spawn })`.
- `game.run` queda en `null` y el save en memoria/disco queda consistente.

### M6 — `changeScene` encola en vez de descartar
- `createSceneQueue()` (`src/base.js`) es una cola de una ranura: con una
  transición o `equipAnim` en curso el pedido queda encolado (gana el último) y
  `changeScene` devuelve `false`; al terminar la transición/equipado
  `drainSceneQueue()` lo arranca. `newGame()` limpia la cola.
- Además el tick relee `game.scene` después de la transición (`liveScene`) para
  no aplicar cámara ni dibujar la escena vieja en el frame del cambio.

### M12 — Un solo `best`
- `save.best` es la fuente de verdad: `endRunSave` ya lo actualizaba y ahora
  `writeSave` lo espeja en `eternauta.arena.best`; `loadSave` importa el récord
  viejo (máximo entre ambos) **también cuando no hay save o está roto**, así
  una "Partida nueva" o un save corrupto no lo borran. `clearSave` borra el save
  y su respaldo, pero conserva el récord.
- La clave vieja **no se borra todavía**: `ArenaScene` la lee y escribe por su
  cuenta. Queda anotada como pendiente (ver abajo).

## Tests

- `test/run_save.test.js` (actualizado): versión 2, roundtrip, migración v1→v2
  con respaldo intacto, migración aunque el storage no escriba, versión
  desconocida, récord espejado/importado (con save, sin save y con save roto),
  `clearSave` conservando el récord, y un `localStorage` con getter que tira
  (todo dentro de `try`).
- `test/run_flow.test.js` (nuevo): `runPersists` (M1), `endRunKind` /
  `endRunComplains` / `abandonResult` / semántica de mochila (M5) y la cola de
  escenas con sus cuatro casos (M6).
- `test/base_logic.test.js`: el caso "tipo desconocido" pasa a `'otro'` y se
  agrega "abandono cuenta como muerte y deja la mochila".

## Verificación

- Nuestros tests: **735 pass, 0 fail** (`node --test` sin
  `test/barrio_level.test.js`, que es del fix 2 en curso). `npm test` completo
  da 747 con 3 rojos de `test/barrio_level.test.js` (L2/L3/L6) al cierre de
  esta tanda: son la red de
  seguridad de la Tanda 0 del fix 2, escrita para fallar hasta que ese fix
  termine; no tocan ni dependen de los archivos de esta tanda.
- `npm run build` → OK.
- `node tools/diag/minigame_save.mjs` → **EXIT=0** (antes fallaba): ahora
  compara un snapshot de **todas** las claves de localStorage antes de entrar
  al Minijuego contra el de después de morir y salir. Queda idéntico (save v2,
  respaldo v1 y `eternauta.arena.best`); `run? false`, `scene arena`.
- Headless propio (Vite 5199 + playwright-core/SwiftShader, páginas nuevas con
  save v1 sembrado), 16 chequeos, todos OK:
  - M1: morir en el Minijuego no cambia **ninguna** clave de localStorage; la
    salida al título apaga el modo aislado.
  - M2: el pedido de `death` queda en `pendingScene` durante el animado y la
    escena termina en `death`.
  - M3: con `setItem` tirando, la base conserva el botín en memoria, el toast
    "No se pudo guardar..." se muestra una sola vez y `game.run` queda limpio.
  - M5: abandonar desde la arena lleva al título, deja `mochila` con la bolsa,
    suma una muerte y no suma botín a la casa.
  - M6: el segundo `changeScene` devuelve `false`, queda en `pendingScene` y se
    ejecuta al terminar el fundido.
  - M4/M12 en navegador: v1→v2, `eternauta.save.v1.bak` con el v1 original y
    `eternauta.arena.best` espejado.
  - Flujo completo: Continuar → garage, taller abre con el save en memoria,
    `startRun` sube el loop y el save queda v2.
- Capturas revisadas (no negras, UI y sprites visibles): título, muerte,
  taller y arena de la ronda 1.

## Pendientes (fuera de los archivos permitidos)

1. **`src/scenes/arena.js`**: borrar `BEST_KEY`/`loadBest`/`saveBest` y usar
   `game.baseSave.best` (o un `game.best` inyectado). Cuando eso pase, se puede
   borrar el espejo `LEGACY_BEST_KEY` de `save.js` y el parche
   `saveBestIsolated` de `main.js` (hoy son la red de compatibilidad para M12 y
   para que el Minijuego no escriba nada).
2. **`src/scenes/arena.js`**: el cartel del Minijuego sigue diciendo "Volver a
   la casa" aunque reinicia; sería más claro "Otra vez" cuando `game.run` es
   `null` (cambio cosmético, no se tocó).
3. **`src/scenes/title.js`**: `enter()` arma las opciones con `loadSave()` en vez
   de `game.baseSave || loadSave()`. Si el storage falló y se abandona al
   título, "Continuar" no aparece aunque la partida siga en memoria. Es una
   línea, pero `title.js` no estaba entre los archivos permitidos.
