OBJETIVO (worker F): una pasada CORTA de pulido del roguelike de El Eternauta, ya implementado (ver `docs/diseno_roguelike.md` y `docs/brief_rl_{A..E}_resultado.md`). Son 6 arreglos puntuales. No hay features nuevas y no se refactoriza nada.

Proyecto: /home/mateyfasito/dev/game/eternauta. Las capturas de referencia del problema están en `docs/capturas/`.

Paralelizá con `dsagent coder` lo que no comparta archivos: el 1, el 2 y el 3–6 (estos últimos son todos de la arena) pueden ir por separado.

1. **Título** (`src/menus.js` / `src/scenes/title.js`; captura `base_1_titulo_continuar.png`): con 5 opciones, "Partida nueva" queda justa contra los bordes del cartel de madera. Que todas las opciones entren con al menos 8 px de margen a cada lado. Lo más simple: ensanchar el cartel, o bajar la escala del texto SOLO cuando hay 5 opciones. Que se siga leyendo como el título de siempre (cartel centrado, letra grande).

2. **Garaje en modo base** (`src/scenes/garage.js`, los cartelitos de las estaciones; captura `base_2_garaje.png`): los cartelitos "Elena: el traje" y "Electrógeno: luz" se pisan, y el de Elena tapa la cabeza de Juan cuando está parado ahí. Reubicalos para que ninguno se superponga con otro ni con un NPC. El de Elena puede ir abajo de ella y el del electrógeno abajo del electrógeno. Agregá una prueba pura de que los rectángulos de los 4 cartelitos no se superponen.

3. **Barra de controles de la arena** (`src/scenes/arena.js`, drawHints/drawBottom; capturas `salida_inicio.png` y `salida_bengala.png`): la fila de controles abajo ("Disparar, Recargar, Parche, Bengala, Botella") pisa el panel "EXTRA" de bengala y botella. Movela, achicala o partila para que no se superponga con ningún panel del HUD (TRAJE/TIRAS, EXTRA, MUNICIÓN). Prueba pura de no-superposición de los rectángulos del HUD, si la geometría está en una función.

4. **Luz de la bengala** (arena; captura `salida_bengala.png`): casi no se ve. Tiene que leerse claramente: una luz roja-cálida fuerte de radio 64 que titila un poco, más las chispas. Revisá cómo entra en la pasada de luz del apagón (lightpost/lighting: máximo 8 luces; si están todas ocupadas por la nieve, priorizá la bengala y el farol sobre las luces de nieve más lejanas).

5. **Pantalla de resultado** (`src/arena/resultScreen.js`; captura `salida_resultado.png`): la línea "La mochila quedó en la nieve: …" queda pegada a la opción seleccionada "Volver a la casa". Dejá al menos 6 px entre esa línea y la barra de la opción, aunque haya que achicar el espaciado de arriba o agrandar el cartel. Revisá también con la bolsa vacía (sin esa línea) que no quede un hueco feo.

6. **Oleadas con la semilla** (`src/scenes/arena.js`: updateRound/pickSpawn/pickType/nextSpawnDelay usan Math.random): cuando hay `game.run` (o semilla de la salida), usá un rng derivado de la semilla (`rngFromSeed(seed ^ 0x5eed)`, en `src/run/rng.js`) para el tipo, el spawn y la demora. El Minijuego sigue igual. Prueba: dos instancias con la misma semilla generan la misma secuencia de (tipo, spawn) en las primeras 20 apariciones.

VERIFICACIÓN: `npm test` en verde (hoy 642) y `npm run build` OK. Rehacé SOLO las capturas afectadas con los scripts que ya existen (`tools/base_screens.mjs`, `tools/salida_screens.mjs`; mirá cómo se corren en los resultados D y E) y miralas. Matá vite y chrome al terminar. Resumen en `docs/brief_rl_F_resultado.md`, con lo que cambió en cada punto.
