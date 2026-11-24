OBJETIVO (worker G): un ANÁLISIS a fondo del juego El Eternauta (/home/mateyfasito/dev/game/eternauta), con foco en el roguelike recién implementado. **Es solo análisis: NO se modifica código del juego.** Los únicos archivos que podés crear son el informe y, si hacen falta, scripts de diagnóstico en `tools/diag/` y capturas en `docs/capturas/diag_*`.

Contexto: `docs/diseno_roguelike.md` y `docs/brief_rl_{A..F}_resultado.md`. Las partes nuevas son:
- `src/run/*`
- `src/maps/barrio/*` (las manzanas)
- `src/scenes/arena.js` y `src/arena/*` (la salida)
- `src/scenes/prologue.js`
- `src/taller.js`, `src/base.js`, `src/scenes/garage.js`

El código previo grande: `src/scenes/world.js` (2500 líneas), `src/menus.js`, `src/main.js`.

Lo que reportó el dueño jugando:
- "Algunas manzanas no tienen tanto sentido."
- "Las colisiones también."
- "Los cascarudos se chocan, se traban, no te siguen de una buena manera: se quedan detrás de una pared, colgados, en vez de dar la vuelta."

Paralelizá con `dsagent analyzer` (solo lectura), un analyzer por área, y verificá vos lo que reporten antes de ponerlo en el informe. Las áreas son:

1. **IA y movimiento de los cascarudos** (`src/arena/enemies.js` steer, `src/scenes/arena.js` updateEnemies, colisión con sólidos):
   - ¿Por qué se traban detrás de paredes y entre ellos?
   - Explicá el algoritmo actual (steering con repulsión y rodeo) y su falla con obstáculos en un mapa de grilla.
   - **Proponé la solución concreta**, con pseudocódigo, archivos y costo: por ejemplo un **flow field** (BFS o Dijkstra desde la baldosa del jugador sobre la grilla de 80×40 de baldosas caminables, recalculado cada ~0,25 s o al cambiar de baldosa, del que cada bicho toma la dirección hacia la vecina de menor distancia), más la separación entre bichos y un "desatascador".
   - Considerá los tamaños: acorazado 28×22, cascarudo 20×16, veloz 14×12. Y el pasaje angosto de la cortada.
   - Medí si hace falta: cuántos bichos vivos hay (hasta 40) y el costo por frame.
   - Si podés, reproducí el atasco headless (`npx vite --port 5199 --strictPort`, playwright-core según `.dsagent.md`, los hooks `debugSpawn`/`state()` de la arena) y sacá una captura `docs/capturas/diag_atasco.png`.
2. **Colisiones del barrio:**
   - ¿Los `solid` de los objetos de `src/maps/barrio/pieces.js` coinciden con el dibujo? Revisá autos, vagón, paredes de la cortada, verjas, casas, árboles, bancos y la baranda de la plaza.
   - Buscá zonas invisibles bloqueadas o cosas atravesables que no deberían serlo, baldosas sólidas que no se ven y bordes de estática.
   - ¿Qué partes del mapa quedan inalcanzables? Hacé un BFS por pieza y un mapa de calor de lo caminable.
   - Generá una imagen de diagnóstico por pieza: el render más los sólidos en rojo semitransparente (`docs/capturas/diag_solidos_<pieza>.png`). Podés basarte en `tools/barrio_preview.mjs`.
3. **Sentido de las manzanas** (diseño de nivel):
   - Para cada pieza y para el armado de la grilla (`layoutCells`): ¿qué no tiene sentido al jugar? Por ejemplo calles que terminan en estática sin aviso, salidas al norte que dan a la nada, objetos que bloquean el paso natural, spawns de cascarudos encerrados o en lugares que no llegan al jugador, botín inalcanzable, el exitHome tapado, piezas repetidas, transiciones raras entre piezas, verjas dobles, o el borde del loop cortando una vereda.
   - Proponé reglas concretas para arreglarlo.
4. **Performance:**
   - Asignaciones por frame en update/draw: canvas que se redibuja entero cada frame, objetos o arrays nuevos por frame, geometrías y materiales que se crean sin liberar, texturas repetidas.
   - Cantidad de meshes y draw calls en el barrio (80×40 baldosas y cientos de objetos).
   - La pasada de luz (`lightpost.js`), la nieve y las huellas.
   - Fugas al reiniciar una salida (buildWorld): ¿se liberan las geometrías, materiales, texturas y listeners?
   - Si podés, medí: FPS o tiempo de frame headless con muchos bichos (`performance.now` en `page.evaluate`) y cantidad de objetos de la escena tras 3 reinicios.
5. **Mantenibilidad y malas prácticas:**
   - Archivos gigantes (world.js, arena.js, menus.js): proponé cómo partirlos (en qué módulos) sin reescribir.
   - Lógica duplicada (por ejemplo, el dibujo de madera de los menús en varios lugares, varias implementaciones de "put", varias funciones de wrap de texto).
   - Números mágicos, estado global en `game`, acoplamiento escena↔main, eventos ad hoc, flags sueltas, código muerto (la calle vieja de la arena, `street.arena`), tests frágiles (anchos de hojas hardcodeados), y nombres mezclados castellano/inglés.
   - Riesgos: localStorage, versión del save, carreras en changeScene.

**ENTREGABLE:** `docs/analisis_roguelike.md`, en castellano, con:
- Un resumen de 10 líneas con lo más grave primero.
- Una sección por área. Cada hallazgo con **gravedad** (alta / media / baja), **evidencia** (archivo:línea, y captura o medición si hay), **por qué es un problema** y **la propuesta de arreglo concreta** (qué archivos, qué cambiar y un costo estimado chico, mediano o grande).
- Al final, un **plan de arreglos priorizado** en tandas que no se pisen de archivos, listo para convertirse en briefs de implementación: la primera tanda es la IA de los cascarudos (flow field) y las colisiones.

No inventes hallazgos: todo con evidencia en el código o en una medición. Si algo no se pudo verificar, decilo. Matá vite y chrome al terminar. `npm test` y `npm run build` tienen que seguir igual (659 en verde), porque no tocás el código del juego.
