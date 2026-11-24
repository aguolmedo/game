# Resultado: rng obligatorio + constantes y colores

Brief: `docs/brief_rng_constantes.md`. Sin cambios de comportamiento visibles ni
de jugabilidad (salvo que las tiradas de ronda del Minijuego ahora salen de un
rng sembrado, no de `Math.random`).

## PARTE 1 — rng obligatorio en la lógica

### Funciones que ahora exigen `rng` (tiran `Error` claro si falta)
- `src/arena/enemies.js`: `createEnemy(type, x, y, rng)` y `patchDrop(type, rng)`
  → `createEnemy: falta rng` / `patchDrop: falta rng`.
- `src/arena/waves.js`: `pickType(r, rng)`, `spawnPoint(rng, ...)`,
  `nextSpawnDelay(rng)` → `<fn>: falta rng`.
- `src/arena/projectiles.js`: `spreadAngle(moving, rng)`,
  `createShot(origin, aim, { rng })` (se sacó `opts.rng || Math.random`),
  `ejectCasing(origin, dir, rng)`.
- `src/run/radio.js`: `rumorFor(cells, rng)` y `radioLine(level, rng)` (se sacó
  `typeof rng === 'function' ? rng : Math.random`).

### Callers arreglados
- `src/arena/wavesScene.js`: `spawnEnemy` pasa `scene.roundRng` a `createEnemy`.
- `src/arena/runSetup.js`: `scene.roundSeed = seed` y
  `scene.roundRng = rngFromSeed((seed ^ 0x5eed) >>> 0)`. En la salida `seed` es
  `run.seed`; en el Minijuego es `seedFor(Date.now() % 100000)`, o sea un rng
  sembrado explícito guardado en la escena para poder reproducirlo.
- `src/scenes/arena.js` (constructor): `roundSeed = seedFor(Date.now() % 100000)`
  y `roundRng = rngFromSeed(...)`; al entrar, `setupRun` lo rearma.
- `src/world/actions.js`: la radio de la casa-base usa
  `rngFromSeed(seedFor(loop, 1))`, con `loop` del save.
- Tests: `test/projectiles.test.js` (`spreadAngle(false, rng)`),
  `test/feedback_perf.test.js` (los 3 `createShot` reciben `{ rng }`).
- Tool: `tools/diag/enemy_stuck.mjs` pasa `RNG` a todos los `createEnemy`.

### Decisiones
- **`ejectCasing`**: la vaina es sólo visual, pero se le quitó el default
  `Math.random` igual porque la aceptación prohíbe `Math.random` en
  `src/arena/projectiles.js`. Su único caller (`feedback.fire`) siempre le pasa
  una función; ese `opts.rng || Math.random` vive en la capa cosmética
  (`src/arena/feedback.js`), que el brief pide no tocar.
- **`prologueDialog(mode, random = Math.random)`** (`src/scenes/prologue.js`):
  se deja con default. Sólo elige líneas de sabor del modo `'queja'`; no forma
  parte de las tiradas de una salida con semilla (el prólogo no usa `run.seed`).
  Se considera texto/cosmética narrativa, no lógica de juego reproducible.
- **Radio de la base**: se eligió el loop del save como semilla
  (`seedFor(loop, 1)`, sal 1 para no pisar la semilla de la noche). Misma noche
  → misma línea de radio.
- **Sin tocar** (cosmética, siguen con `Math.random`): `src/snow.js`,
  `src/arena/feedback.js`, `src/scenes/prologue.js` (estática, 308-312),
  `title.js`, `view.js`, `npc.js`, `pickup.js`, `worldItems.js`.

### Tests nuevos
`test/rng_obligatorio.test.js` (3 tests):
1. cada función de la lista tira sin `rng`;
2. misma semilla → misma secuencia de `pickType` / `spawnPoint` / `createEnemy`;
3. grep por `fs.readFileSync` de la lógica (`src/arena/{enemies,waves,
   projectiles,wavesScene,runSetup}.js`, `src/scenes/arena.js`,
   `src/world/actions.js`, todos los `src/run/*.js`) falla si aparece
   `Math.random`.

## PARTE 2 — números y colores mágicos

### Textos construidos desde constantes (resultado idéntico)
- `src/arena/hudArena.js`: `SHOP_TEXT = `${AMMO_PACK} balas — ${AMMO_PRICE} puntos``
  y `SHOP_LABEL = `Comprar ${AMMO_PACK} balas — ${AMMO_PRICE} puntos``
  (importa `AMMO_PACK`/`AMMO_PRICE` de `src/arena/weapon.js`; ambos ya existían).
- `src/arena/combatScene.js`: `+${AMMO_PACK} balas` y
  `Faltan puntos: son ${AMMO_PRICE} (...)`. Además `STRIPS_PER_PATCH = 1`
  (tira que da el parche), `PATCH_INTEGRITY = 1` y `PATCH_STRIP_COST = 1`
  para los `+1 tira de goma` / `+1 integridad` y las mutaciones asociadas.
- `src/arena/wavesScene.js`: `+${ROUND_FACTOR * scene.round} puntos`
  (importa `ROUND_FACTOR` de `points.js`) en vez de `100 * scene.round`.
- Revisado y sin cambios: descripciones de mejoras (`src/run/upgrades.js`) y
  costos del taller; no hay precio/cantidad de UI duplicado que se pueda
  derivar sin cambiar el texto en prosa (`Ocho`, `cinco`, `cuatro`).

### Colores
Se mantuvieron los strings exactos: cero cambio visual.

`src/uiSkin.js` — nuevos exports:
`WHITE #ffffff`, `WARN #ff9a8a`, `SLOT_DARK #2a1a14`, `SLOT_EDGE #8a5a2a`,
`PANEL_PAPER #f6f1e4`, `CAPTION_PAPER #efe0a8`, `DARK_INK #16131c`,
`SOFT_SHADOW rgba(8, 8, 18, 0.42)`. `slot()` ahora usa `SLOT_EDGE`/`SLOT_DARK`.

`src/arena/hudArena.js` — importa `WHITE`, `WARN`, `SLOT_DARK`, `SLOT_EDGE` y
define constantes locales para los de un solo uso: `TALLY_INK`, `AMBER_TRACK`,
`OUT_HALF`, `OUT_MORE`, `PATCH_BG`, `PATCH_LIGHT`, `PATCH_SEAM`, `PATCH_OFF`,
`SHELL_DARK`, `SHELL_BRASS`, `SHELL_HI`, `CROSS_SHADOW`, `BANNER_EDGE`,
`BANNER_PAPER`, `BANNER_SHADE`, `BANNER_TITLE`, `BANNER_INK`, `MOCHILA_GLOW`,
`MOCHILA_GLOW_END`, `MOCHILA_SPARK_HI`, `MOCHILA_SPARK`, `ARROW_SHADOW`,
`FIRE_GLOW`, `FIRE_YELLOW`, `FIRE_ORANGE` (`MOCHILA_CYAN` ya existía).

`src/arena/deathPanel.js` — importa `PANEL_PAPER`, `CAPTION_PAPER`, `DARK_INK`
y `SOFT_SHADOW`; borra los locales `PAPER`/`CAPTION`/`INK`; agrega locales
`SNOW_CROSS`, `CAPTION_LINE`, `PANEL_SHADOW`, `MISSING_IMAGE_BG`, `WIPE_HI`.
Quedan como estaban `PAPER2`, `SNOW_HI`, `SNOW_GLOW`.

`src/scenes/prologue.js` — locales `CONTINUUM_BG`, `STATIC_CYAN`, `STATIC_VIOLET`;
la estática sigue con `Math.random`.

## Verificación
- `npm test`: **751 tests, 0 fallas** (748 previos + 3 nuevos).
- `npm run build`: OK (Vite).
- Grep de aceptación: sin `Math.random` en `src/arena/{enemies,waves,
  projectiles,wavesScene,runSetup}.js`, `src/run/*.js`, `src/scenes/arena.js`
  ni `src/world/actions.js`.
- Headless con `npx vite --port 5199 --strictPort`: `node tools/base_screens.mjs`,
  `node tools/salida_screens.mjs` y `node tools/death_screens.mjs` sin errores
  de consola. El HUD de la arena (cartel "30 balas — 250 puntos", munición,
  paneles) coincide con `docs/capturas/fix5_antes/salida_porton.png`.
