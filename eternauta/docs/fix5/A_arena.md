FIX 5 — PARTE A: partir src/scenes/arena.js (2221 líneas). Leé primero docs/fix5/comun.md y obedecelo.

Archivos permitidos: src/scenes/arena.js y archivos NUEVOS dentro de src/arena/ (no edites los existentes de src/arena/ salvo para importar de los nuevos si es imprescindible). Tests nuevos en test/ si querés.

Qué: sacar de arena.js módulos con responsabilidad clara (HUD de la arena, botín, mochila, consumibles, oleadas/spawns, etc.) a src/arena/*.js. La clase/escena queda como fachada con la misma API pública (mismos exports, mismos métodos que usan main.js, tests y tools/*.mjs — buscá los usos con grep antes de mover nada). Preferí funciones que reciben la escena (o un estado) a herencia.

Aceptación: arena.js < ~800 líneas (o explicá por qué no), ningún módulo nuevo > 800, `npm test` (745+ en verde) y `npm run build` OK. Escribí docs/fix5/A_resultado.md: mapa de módulos nuevos (archivo → qué tiene → líneas) y cualquier cosa que no hayas podido mover.
