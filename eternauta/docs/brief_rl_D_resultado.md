# Roguelike, tanda 2 — worker D: la salida (resultado)

La arena de oleadas ahora es **la salida del roguelike**: se juega sobre el barrio
armado con semilla (`buildBarrio`), con botín en el piso, la mochila de otra vez,
las mejoras compradas en la casa, bengala/botella y el portón para volver.

## Archivos

- `src/scenes/arena.js` — reescrita sobre el barrio por semilla (2033 líneas).
- `src/arena/lootRun.js` — lógica pura del botín y la mochila (nuevo).
- `src/arena/effectsRun.js` — efectos de mejoras + bengala/botella (nuevo).
- `src/arena/exit.js` — cercanía al portón y payloads de fin de salida (nuevo).
- `src/arena/weapon.js` — opción `pierceDamage` en `createWeapon`/`shotList`.
- `src/arena/results.js` — opciones `home` ("Volver a la casa") y `title`.
- `src/arena/resultScreen.js` — cartel más alto y fila de la mochila perdida.
- `src/arena/controls.js` — `consumableAction` (bengala/botella/recarga).
- Tests nuevos: `test/salida_{loot,effects,exit,controls}.test.js`.
  Adaptados: `weapon`, `arena_result`, `result_screen`.
- `tools/salida_screens.mjs` — capturas headless + chequeos en vivo de la salida.
- Capturas: `docs/capturas/salida_*.png`.

## Qué hace la salida

1. **Mapa por semilla.** `setupRun()` toma `game.run = { loop, seed, save }` si
   existe (worker E); si no (Minijuego del título) usa `seedFor(Date.now() % 100000)`
   y `loadSave()`. `buildWorld(map)` reemplaza el `WorldMap`, liberando geometrías
   y materiales del mundo anterior. `bounds`, `arena`, `spawns`, `crate` y
   `exitHome` salen del mapa. La cámara sigue a Juan y se recorta a 1280×640.
   Luces de nieve en el centro de cada pieza (máximo 8).
2. **Botín.** Al morir un bicho, `enemyDrop()` deja sus íconos en el piso con
   sparkle. Se levantan al pasar (radio 10 px) y suman a `this.bag` con toast
   `+1 chatarra`. Los puntos `map.loot` son íconos con brillito periódico y dan
   `spotLoot` al pisarlos. Las marcas se corren unos px al punto caminable más
   cercano (el centro de la caja es sólido). `patchDrop` sigue dando tiras y
   además suma goma a la bolsa.
3. **Mochila de otra vez.** Si `save.mochila` existe, aparece en un punto loot
   del piso que no sea la casa, animada (`mochila_nieve_0..2`, 0,15 s) con
   puntitos cian. Se dibuja después del velo nocturno, así que no la apaga el
   apagón. Al tocarla: toast "Esto es mío... de otra vez.", la bolsa suma y el
   `save` vivo queda con `mochila: null` (E lo persiste). Si está fuera de la
   vista, una flechita cian en el borde apunta hacia ella.
4. **Mejoras.** `effects(save)` arma `createWeapon({ fireRate, magSize,
   pierceDamage })`, `integrityMax` (parches del HUD y "Integridad x/4"),
   `patchTime`, `firstBiteFree` (una vez por ronda: "Las hombreras aguantaron"),
   `farol` (luz cálida de 70 px que sigue a Juan) y `frecuencia` (el banner suma
   "…siete… cuatro… cuatro… uno…" cuando la ronda puede traer acorazados).
5. **Bengala (1 / LB).** Una por salida. Cae a los pies, luz rojiza de 64 px por
   8 s; los bichos dentro de la luz avanzan a la mitad. Botella (2 / RB): vuela
   48 px hacia la mira, fuego de 40 px por 5 s con 1 de daño por segundo (ticks
   de 1 s) y partículas naranjas/amarillas.
6. **Volver a casa.** Junto al portón (E / A / click) aparece el prompt "Volver
   a casa con el botín". Confirma con
   `game.endRun({ type: 'volvio', bag, round, points })`. Hay que alejarse una
   vez del portón para armarlo (no se sale sin querer al entrar).
7. **Morir.** Viñeta y cartel de siempre; opciones "Volver a la casa"
   (`endRun({ type: 'murio', ... })`) y "Volver al título". El cartel suma
   "La mochila quedó en la nieve:" + el resumen de la bolsa. Sin `game.endRun`
   (Minijuego solo), "Volver a la casa" reinicia como el viejo "Otra vez".
8. **Cartel de inicio.** La primera ronda muestra "Loop N" y la mano de la noche
   (`handText(handFromSeed(seed))`; el separador `·` no está en la fuente, se
   dibuja como ` / `). Con `effects.rumor`, el rumor de Lucas sale como toast
   largo al empezar. Además `frecuencia` agrega su línea chiquita.
9. **HUD.** La bolsa (4 íconos + cantidades) arriba a la derecha bajo PUNTOS;
   bengala/botella con su contador abajo, al lado del panel del traje.
10. **Sobreviviente.** Con `effects.sobreviviente`, un vecino quieto
    (`chars2: polsky_coat`, tintado gris) espera en un punto loot. Al llegar:
    "¡Gracias! Tomá, es lo que tengo." y +2 de un tipo al azar. Una vez.

## Controles nuevos de la salida

| Acción | Teclado | Joystick |
|---|---|---|
| Bengala | `1` | LB (botón 4) |
| Botella | `2` | RB (botón 5) |
| Volver a casa (junto al portón) | `E` | A |
| Recargar | `R` | X (RB ya no recarga) |

Todo lo demás igual: moverse WASD/flechas/stick, disparar Space/J/RT/click,
parche Y/I, resultado con A/Enter/Space/click y flechas/stick.

## Pruebas y verificación

- `npm test` → **642 pass, 0 fail** (incluye 34 de `salida_loot/effects/exit`,
  6 de `salida_controls`, y las de la tanda 1 de A/B/C y de E en paralelo).
- `npm run build` → OK (94 módulos, solo el aviso de tamaño de chunk de siempre).
- `node --check` OK en la escena, los tres módulos nuevos y los tests.
- Capturas headless (`npx vite --port 5199 --strictPort & node tools/salida_screens.mjs`):
  - `salida_inicio.png` — banner con "Loop 3" y la mano.
  - `salida_esquina.png` — Juan en la esquina de la ferretería (caja, bici, buzón).
  - `salida_mochila.png` — la mochila de otra vez en el piso, con sus puntos cian.
  - `salida_mochila_flecha.png` — flechita cian cuando la mochila queda fuera.
  - `salida_bengala.png` y `salida_botella.png` — bengala encendida y fuego.
  - `salida_porton.png` — prompt "Volver a casa con el botín".
  - `salida_frecuencia.png` — la línea de números antes de una ronda ≥ 5.
  - `salida_sobreviviente.png` — el vecino y el regalo +2.
  - `salida_resultado.png` — "FIN DE LA SALIDA" con la fila de la mochila.
  El script además verifica en vivo: recoger botín del piso, recuperar la mochila,
  drops de 6 bichos, hombreras, farol, y los payloads `volvio`/`murio` de
  `game.endRun`. Sin errores de página. Vite y chromium se matan al terminar.
- Flujo real con E (script headless temporal, no quedó en el repo):
  base → `startRun()` → salida 1 (loop 1, seed de `seedFor(1)`, armas/parches
  mejorados) → morir con botín → garaje con `save.mochila` y `best` actualizados
  → salida 2 (loop 2) con la mochila de otra vez en el barrio → recuperarla
  (`save.mochila = null`, bolsa sumada) → volver por el portón → botín sumado a
  `save.botin`. Sin errores de página.

## Lo que quedó aproximado / pendiente

- La mochila se dibuja en la pasada de luz (encima del apagón y de los objetos)
  para conservar su brillo cian; si queda detrás de un mueble, se ve igual.
- El fuego de la botella son partículas de canvas + luz cálida, no un sprite
  animado del atlas `fx`.
- La bengala es de a una por vez: si ya hay una encendida, la segunda tecla no
  gasta la otra (avisa con un toast).
- La composición de las oleadas sigue usando `Math.random`; el botín, la mochila
  y el regalo del sobreviviente usan el RNG de la semilla.
- El sobreviviente es un NPC quieto de un solo cuadro (mirando abajo).
- El cartel "Casa" sobre el portón se muestra siempre que el portón está en
  pantalla; el prompt grande, solo cerca. No hay ícono en el minimapa (no hay
  minimapa).
