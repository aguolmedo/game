# Fix 1A — IA de los cascarudos: resultado

**Fecha:** 23/11/2026 · **Alcance:** retomar el intento cortado, completar y verificar
flow field + separación + desatascador + spawns válidos + C2. Se comparó contra el
backup `eternauta-backup-20261122-prefix.tar.gz` y el análisis
`docs/analisis_roguelike.md` (§1, A1–A7 y 1.2).

## Qué se encontró del intento anterior

El trabajo parcial tenía el flow field, los tests y casi toda la integración, pero
**no funcionaba en el juego real**:

1. `buildBoxMask` usaba un error (`box.x + b.w` en vez de `box.x + box.w`) y una sola
   altura de pies: la baldosa del jugador quedaba **sólida**. El BFS se sembraba a 2
   baldosas (fila 32) y los bichos se paraban a 47 px sin poder morder.
2. La semilla forzada en la baldosa del jugador no existía: con el punto anterior,
   media manzana quedaba inalcanzable en el flow.
3. El desatascador sólo miraba `blockedX && blockedY`. Si el flujo iba en un solo eje
   (p. ej. recto al este) y ese eje estaba bloqueado, el bicho quedaba pegado para
   siempre: el otro eje nunca se movía y la condición jamás se cumplía.
4. El empujón lateral elegía la vecina de menor `dist` sin mirar si el cuerpo entraba
   y podía retroceder; en la esquina de la ferretería elegía el este (de nuevo contra
   la pared) y entraba en un ciclo.
5. Al sacar el fallback de spawn, una ronda normal podía quedar **sin ningún bicho**:
   si el jugador arranca lejos de las bocas (borde del barrio), ninguna cae en el
   radio de 380 px y `pickSpawn` devolvía `null` para siempre.

## Cambios

- **`src/arena/flowfield.js`**
  - `buildSolidMask` (cajas → baldosas) como pide el diseño.
  - `createField` / `rebuild` / `flowVector` / `isReachableAt`, BFS de 4 vecinos,
    `parent` hacia el jugador y `nearestFree` en espiral ≤ 4.
  - `rebuild(..., allowBlockedSeed)`: la baldosa del jugador es semilla aunque la
    máscara la vea tapada (el jugador está físicamente ahí).
  - `buildBoxMask` prueba la caja real en varias alturas de la baldosa
    (`BOX_MASK_FEET = [4, 8, 12]`): un objeto bajo no cierra la baldosa entera.
  - `widenMask` para el acorazado (exige 2 baldosas horizontales libres).
- **`src/arena/enemies.js`**
  - `steer(e, player, enemies, solids, dt, flow)` sigue el flow, separación
    proyectada (anula sólo la componente que frena), línea de vista directa ≤ 56 px,
    paso real sin la sonda de 16 px.
  - Desatascador por **falta de progreso real** (no sólo dos ejes bloqueados):
    a los 0,45 s, empujón lateral de 0,35 s. Elige una vecina alcanzable, lateral al
    flujo, con hueco físico por delante (`clearAhead`) y sin retroceder si hay opción.
- **`src/scenes/arena.js`**
  - Campos por tipo (cascarudo/veloz/acorazado) y máscaras desde `solidBoxes`;
    recálculo al cambiar de baldosa o cada 0,25 s con enfriamiento de 0,08 s.
  - `canSpawnAt` valida la caja real del tipo contra sólidos **y** alcanzabilidad.
  - `pickSpawn`/`spawnEnemy` ya no crean bichos dentro de sólidos. Si no hay boca
    cerca (≤ 380 px) usa cualquier boca validada más lejana; si no hay ninguna, no
    spawnea ese tick.
  - C2: la caja de municiones usa un único sólido de 16×16 (el de la marca), no dos.
- **`src/maps/barrio/index.js`** (ya venía del intento anterior): bocas 2 baldosas
  adentro.
- **Tests nuevos:** `test/flowfield.test.js` y `test/enemies_flow.test.js`
  (19 + 3 de regresión: máscara con objeto bajo, semilla forzada y desatascador de
  un solo eje).

## Verificación (todo corrido de nuevo)

| Check | Resultado |
|---|---|
| `npm test` | **717 pass, 0 fail** (659 base + tests de otras tandas + 22 nuevos) |
| `npm run build` | **OK** (97 módulos; sólo warning de tamaño de chunk) |
| `node tools/diag/enemy_stuck.mjs` | exit 0 — U llega en **5,47 s**; pasillo 40: **40/40** se mueven y **40/40** llegan |
| `node tools/diag/arena_stuck.mjs` | **5/5** a 1–7 px de Juan; **0 trabados**; recapturó `docs/capturas/diag_atasco.png` |
| `node tools/diag/arena_choke2.mjs` | **4/4** (3 acorazados por el hueco de 32 px) a 2–6 px; **0 trabados**; recapturó `docs/capturas/diag_atasco_acorazado.png` |
| Ronda normal headless | `phase: active`, 9 bichos, **0 errores de página**; `docs/capturas/fix_1a_ronda_normal.png` |
| C2 en el mundo real | 1 solo sólido de 16×16 en (424, 504), id `caja_municiones` |

Capturas revisadas a ojo: en las dos de atasco los círculos cian quedan encima de
Juan (antes quedaban lejos, en rojo). La ronda normal se sigue viendo igual.

### Ajustes a los diagnósticos

- `arena_stuck.mjs`: la espera pasó de 6 s a 14 s. El camino válido alrededor de la
  ferretería es más largo que el viejo “pegado a la pared”; a los 6 s un bicho todavía
  está en viaje (a 105 px) y el script lo contaba como trabado.
- `arena_choke2.mjs`: el punto (504,136) quedó dentro de un sólido tras el fix 1B. Se
  reemplazó por (488,184) y el cascarudo por (472,184), validados con `canSpawnAt`.

## Pendiente / notas

- No queda nada de la Tanda 1A. El acorazado puede seguir esperando si una boca no
  tiene 2 baldosas de ancho: ahora directamente no se lo spawnea ahí.
- El spawn lejano puede repetir la misma boca si es la única validada (los bichos se
  separan solos). Mejorar la variedad es parte de la Tanda 2 (manzanas).
- Las tandas 1B (sólidos) y 3 (performance) son de otros workers; no se tocaron sus
  archivos.
