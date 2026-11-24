OBJETIVO (fix 1A): los cascarudos tienen que encontrar la vuelta en vez de trabarse. Implementar el flow field, la separación, el desatascador y spawns válidos, según `docs/analisis_roguelike.md`, sección 1 (hallazgos A1–A7 y "1.2 Solución propuesta", con pseudocódigo y costos) y la "Tanda 1A" del plan, más la parte de la Tanda 0 que corresponde a la IA.

Proyecto: /home/mateyfasito/dev/game/eternauta. Los diagnósticos ya existen en `tools/diag/` (enemy_stuck.mjs, enemy_reach.mjs, flowfield_proto.mjs, arena_stuck.mjs, arena_choke*.mjs).

ARCHIVOS PERMITIDOS: `src/arena/flowfield.js` (nuevo), `src/arena/enemies.js`, `src/scenes/arena.js`, `src/maps/barrio/index.js` (SOLO las bocas de spawn, 2 baldosas adentro), y tests nuevos `test/flowfield.test.js` y `test/enemies_flow.test.js`. **NO toques** `src/maps/barrio/pieces.js` ni `src/mapView.js` (los arregla otro worker en paralelo), ni main.js, footprints, snow, sprite, lighting, feedback o reset (otro worker hace performance en paralelo).

PASOS:
0. Primero, tests que FALLEN con el código actual: el bolsillo en U (el bicho tiene que llegar al jugador) y 40 bichos en un pasillo sin congelarse.
1. `flowfield.js` puro:
   - buildSolidMask desde los solidBoxes de la arena.
   - BFS de 4 vecinos desde la baldosa del jugador (nearestFree en espiral ≤ 4).
   - Recalcular al cambiar de baldosa o cada 0,25 s, con enfriamiento de 0,08 s.
   - Una máscara ancha para el acorazado.
   - flowVector para cualquier posición.
2. `steer()`:
   - Seguir el flow, con separación proyectada (que no desarme la cola en pasillos).
   - Paso real sin la sonda de 16 px.
   - Desatascador: si queda bloqueado en X y en Y, empujón lateral hacia la baldosa vecina con menor distancia.
   - Con línea de vista libre y cerca, ir directo al jugador.
3. Spawns:
   - pickSpawn/spawnEnemy validan la caja del enemigo contra los sólidos y contra lo alcanzable en el flow.
   - Si no hay punto válido, NO spawnear ese tick.
   - Sacá el fallback que spawnea dentro de sólidos.
4. Arreglar la caja de municiones doble (C2) en arena.js.

ACEPTACIÓN:
- En la simulación en U el bicho llega en menos de 20 s, y los 40 del pasillo no se congelan.
- `node tools/diag/enemy_stuck.mjs` y `arena_stuck.mjs` ya no muestran bichos trabados: rehacé `docs/capturas/diag_atasco.png` y la del acorazado.
- `npm test` en verde (659 más los nuevos) y `npm run build` OK.
- Una captura headless de una ronda normal (que se siga viendo igual). Matá vite y chrome.
- Resumen en `docs/brief_fix_1A_resultado.md`.
