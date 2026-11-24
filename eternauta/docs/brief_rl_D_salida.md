OBJETIVO (worker D, tanda 2): convertir la arena de oleadas en LA SALIDA del roguelike. Se juega sobre el barrio armado con semilla (las manzanas), con botín, mochila de otra vez, mejoras aplicadas, bengala y botella, y la opción de volver a casa. Es el corazón del juego: que quede jugable y prolijo.

Proyecto: /home/mateyfasito/dev/game/eternauta. Leé:
- `docs/diseno_roguelike.md` (contratos) y los resultados de la tanda 1: `docs/brief_rl_A_resultado.md` (src/run/*: save, upgrades, loot, seed, radio, rng) y `docs/brief_rl_B_resultado.md` (src/maps/barrio: buildBarrio(seed) → {cells, map}).
- `src/scenes/arena.js` (1300 líneas; la escena actual sobre la calle) y `src/arena/*.js` (waves, weapon, enemies, points, results, resultScreen, reset).
- Mirá `art/concept/out/roguelike/calle_mochila.png`: la mochila de otra vez en la calle, con su temblor cian y sin tomar la luz de la noche.

ARCHIVOS QUE PODÉS TOCAR: `src/scenes/arena.js`, `src/arena/*.js` (y archivos nuevos en `src/arena/`), tests de la arena (`test/arena_*.test.js`, `test/waves.test.js`, `test/weapon.test.js`, `test/result_screen.test.js`, y nuevos `test/salida_*.test.js`). **NO toques** `src/main.js`, `src/maps/*`, `src/run/*`, menús ni title. Si te falta algo de esos módulos, envolvelo en `src/arena/` sin modificarlos. Lo del flujo (volver a la base, guardar) lo hace el worker E: vos llamás a `this.game.endRun(result)` si existe; si no existe, volvés al título como hoy.

CAMBIOS:

1. **Mapa por semilla.** En vez de clonar `street`, `enter(spawn)` arma el barrio:
   - Si viene `this.game.run` (lo crea E con `{ loop, seed, save }`), usá esa semilla. Si no (el "Minijuego" del título), usá `seedFor(Date.now() % 100000)` con un save de `loadSave()`.
   - `const { cells, map } = buildBarrio(seed)`. Reconstruí WorldMap con ese mapa (hoy se hace en el constructor: movelo a un método `buildWorld(map)` que saque el mundo anterior de la escena y libere geometrías y materiales).
   - bounds, arena, spawns y crate salen de `map`. Las luces: las de nieve como hoy (en el centro de cada celda llena), máximo 8 en total (lightpost usa 8).
   - Cámara: sigue al jugador y se recorta a los bordes del mapa de 1280×640.

2. **Botín.**
   - Al matar un enemigo: `enemyDrop(type, rng)` → aparecen en el piso los sprites de items (`chatarra`, `goma`, `pieza_cascarudo`; `LOOT_ITEM` en loot.js) con el brillito de `fx` sparkle.
   - Se agarran pasando por encima (radio 10 px) → `this.bag = addToBag(...)` y un toast "+1 chatarra".
   - Los puntos `map.loot`: un sprite chico en el piso (por ejemplo el mismo ícono con sparkle) que da `spotLoot` al pasar.
   - Las tiras de goma de parche (`patchDrop`) siguen como hoy y además suman goma a la bolsa.

3. **La mochila de otra vez.**
   - Al entrar, si `save.mochila` existe: `pickMochilaSpot(map.loot, rng)` → sprite `mochila_nieve_0..2` (anima cada 0,15 s) más puntitos cian alrededor. NO le apliques la luz del apagón (renderOrder o capa emisiva; mirá cómo se hace con lo emisivo en lightpost/lighting; si no hay forma simple, que al menos quede encima con colores cálidos).
   - Al tocarla: `recoverMochila` → toast "Esto es mío... de otra vez." y la bolsa suma.
   - **Indicador:** si la mochila está fuera de pantalla, una flechita cian en el borde de la vista apuntando hacia ella.

4. **Mejoras** (`effects(save)`):
   - `createWeapon({ fireRate, magSize })`.
   - `pierceDamage`: agregá en weapon.js la opción `pierceDamage` (default PIERCE_DAMAGE) y usala en shotList.
   - `integrityMax` (el máximo, el HUD de parches y el texto "Integridad x/4").
   - `patchTime` (hoy 1,5 fijo).
   - `firstBiteFree` (por ronda: la primera mordida solo hace el toast "Las hombreras aguantaron").
   - `farol`: una luz cálida de 70 px que sigue al jugador en el apagón.
   - `frecuencia`: antes de una ronda donde `pickType` puede dar acorazado (ronda ≥ 5), el banner suma "…siete… cuatro… cuatro… uno…" chiquito.

5. **Bengala y botella** (si `effects.bengalas` / `molotovs` > 0; una de cada una por salida):
   - **Bengala:** tecla 1 / LB (botón 4). Se tira a los pies: luz roja-cálida (radio 64) durante 8 s, y los enemigos dentro de 64 px van a la mitad de velocidad. Sprite: `mejora_bengala` en el piso más chispas fx.
   - **Botella:** tecla 2 / RB (botón 5). Se tira hacia donde apunta, a 48 px: fuego de radio 40 durante 5 s, 1 de daño por segundo a los que estén adentro. Dibujalo simple: un óvalo naranja que parpadea, o fx, o partículas de 2 px naranjas y amarillas.
   - HUD: los íconos con el contador, abajo a la izquierda, al lado de los parches.
   - Sumalos a la ayuda de controles de la arena (`drawHints`) y a `src/arena/controls.js` si corresponde.

6. **Volver a casa.**
   - En `map.exitHome` (el portón de la casa de Juan), cuando Juan está cerca: prompt "Volver a casa con el botín" (E / A / click), como el de la caja de municiones.
   - Confirmar → `this.game.endRun({ type: 'volvio', bag: this.bag, round, points })`.

7. **Morir.** La viñeta de muerte y la pantalla de resultado como hoy, con dos cambios:
   - Las opciones pasan a ser "Volver a la casa" (que llama `this.game.endRun({ type: 'murio', bag: this.bag, round, points })`) y "Volver al título".
   - El cartel suma una fila con la bolsa perdida ("La mochila quedó en la nieve: 3 chatarra, 1 goma").
   - Si `game.endRun` no existe, "Volver a la casa" se comporta como el "Otra vez" de hoy.

8. **El cartel de inicio de la salida:** el banner de la primera ronda muestra "Loop N" y la mano de la noche (`handText(handFromSeed(seed))`). Si `effects.rumor`, además el rumor (`rumorFor(cells, rng).text`) como toast largo al empezar.

9. **HUD:** la bolsa (4 íconos chicos de items con su número) arriba a la derecha, debajo de los puntos. El resto, igual.

10. **Sobreviviente** (`effects.sobreviviente`): un NPC quieto (sprite objects `programador_abajo` NO; usá un personaje de chars2, `polsky_coat`, desaturado) en un punto loot de otra pieza. Al llegar: toast "¡Gracias! Tomá, es lo que tengo." y +2 de algo al azar. Una vez por salida.

PRUEBAS:
- Que ninguna prueba actual de la arena se rompa (adaptalas solo si cambia lo que se testea, como las opciones del resultado).
- Nuevas, con la lógica separada en funciones puras dentro de `src/arena/`: recoger botín, mochila (aparece, se recupera, se pisa al morir), efectos aplicados al arma y a la integridad, bengala (factor de velocidad dentro y fuera del radio), botella (daño por segundo) y la elección del exitHome.

VERIFICACIÓN VISUAL (capturas headless, `.dsagent.md`; usá los hooks de depuración que ya tiene la arena: debugSpawn, debugSetRound, state()):
1. El arranque de la salida (banner con loop y mano).
2. El barrio con Juan en la esquina de la ferretería.
3. La mochila de otra vez visible con su flecha.
4. Una bengala encendida.
5. El resultado al morir con la fila de la mochila.

Guardalas en `docs/capturas/salida_*.png` y miralas. Matá vite y chrome.

ACEPTACIÓN: `npm test` en verde (todas). `npm run build` OK. Capturas correctas. Resumen en `docs/brief_rl_D_resultado.md`: qué hace la salida, controles nuevos y qué quedó pendiente.
