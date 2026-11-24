FIX 5 — PARTE B: partir src/menus.js (1186 líneas). Leé primero docs/fix5/comun.md y obedecelo.

Archivos permitidos: src/menus.js y archivos NUEVOS dentro de src/menus/ (carpeta nueva). Tests nuevos en test/ si querés.

Qué: separar por pantalla (título, pausa, mochila/fabricar, opciones/controles/créditos, lo compartido). src/menus.js queda como fachada que re-exporta exactamente los mismos nombres que hoy (grep de quién importa de './menus.js' / '../menus.js' antes de empezar; ninguno de esos imports debe cambiar).

Aceptación: ningún archivo > ~800 líneas, `npm test` (745+ en verde) y `npm run build` OK. Escribí docs/fix5/B_resultado.md: mapa de módulos (archivo → qué tiene → líneas).
