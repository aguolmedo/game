Leé y obedecé docs/arq/comun.md primero (prohibido git que escriba; foto previa en /home/mateyfasito/dev/game/snapshot_arq/). Sos el worker C.

Archivos permitidos: src/story.js, src/objectives.js, src/actions.js, src/world/*.js, src/data/*.js, archivo NUEVO src/data/flags.js, tests nuevos test/flags*.test.js (y adaptar test/story.test.js, objectives.test.js si hace falta). NO toques src/main.js, src/scenes/*, src/arena/*, src/core/* (otros workers en paralelo).

Problema: game.flags se escribe/lee con claves sueltas como texto (flags.apagon aparece 25 veces, 32 escrituras en total; también flags['...'] dinámicas como CLOSE_KEYS en story.js). Un typo crea una bandera nueva sin aviso.

Qué:
1. src/data/flags.js: `export const FLAG = Object.freeze({ APAGON: 'apagon', CASA_SELLADA: 'casa_sellada', ... })` con TODAS las claves que existen hoy (grep exhaustivo en todo src, incluidas main.js, scenes y arena para el inventario aunque no los edites; también claves armadas dinámicamente tipo `closed_${...}`: declaralas todas o un helper documentado). Un comentario por bandera: quién la pone y qué significa.
2. `export function isKnownFlag(key)` y `export function guardFlags(flags)`: devuelve un Proxy que en `import.meta.env?.DEV` (o si no hay env, siempre) hace console.warn al leer o escribir una clave desconocida; en producción devuelve el objeto tal cual. NO lo conectes en main.js (lo hace otro); dejá documentado en tu resultado la línea exacta a agregar.
3. Reemplazá los literales en tus archivos permitidos por FLAG.X (game.flags[FLAG.APAGON] o game.flags.apagon → elegí uno y sé consistente; preferí game.flags[FLAG.APAGON]).
4. Tests: test/flags.test.js: (a) todas las claves de FLAG son únicas; (b) un test que lea (fs.readFileSync) TODOS los archivos de src/**/*.js y falle si encuentra `flags.<identificador>` o `flags['literal']` cuya clave no esté en FLAG (así un typo en cualquier lado rompe el test, incluso en archivos que no editaste); (c) guardFlags avisa con clave desconocida.

Aceptación: `npm test` (≥751) y `npm run build` en verde. Escribí docs/arq/C_resultado.md: lista de banderas, archivos cambiados, líneas pendientes en main.js/scenes/arena (con archivo:línea) para que las cambie el orquestador.
