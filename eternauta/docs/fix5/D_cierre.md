FIX 5 — PARTE D (cierre). Leé docs/fix5/comun.md y obedecelo (sobre todo: NINGÚN git que escriba; foto previa en /home/mateyfasito/dev/game/fix5_snapshot/). Ya no hay otros workers: podés tocar cualquier archivo de src/ y test/ (no bocetos/, art/, public/).
Ya se partieron arena.js (docs/fix5/A_resultado.md), menus.js (B_resultado.md) y world.js (C_resultado.md). Leelos.

Hacé, en este orden, pasos 1, 5 y 6 de docs/brief_fix_5_mantenibilidad.md:
1. Helpers duplicados a un solo módulo: put() (hoy en src/maps/street.js, house.js, garage.js, barrio/pieces.js) → src/maps/place.js; wrap de texto (font.js wrapText, uiSkin.js wrapLines, taller.js wrapTwo, y cualquier otro) → uno solo con lo que haga falta parametrizar, sin cambiar el resultado de ningún uso; geometría (pointInRect de src/uiHit.js, rects) → src/geom.js (uiHit puede re-exportar); paleta de madera/UI repetida → la de src/uiSkin.js. Grep exhaustivo de duplicados.
5. Código muerto: calle vieja de la arena, street.arena si nadie lo usa, marcas/exports sin uso. Adaptá los tests que solo sostenían código muerto y anotá cuáles.
6. Tests frágiles (anchos de hoja hardcodeados, etc.): que verifiquen el contrato, no el número.

Después: capturas. Levantá `npx vite --port 5199 --strictPort` en background, corré `node tools/base_screens.mjs` y `node tools/salida_screens.mjs`, y compará cada PNG nuevo de docs/capturas/{base_,salida_}*.png contra docs/capturas/fix5_antes/ (mismo nombre) con un diff de píxeles (script node o python; reportá % de píxeles distintos). Diferencias visibles = bug a arreglar (o explicar si es aleatoriedad conocida). Matá vite y chrome por PID al terminar (no uses pkill -f dentro del mismo comando: se mata a sí mismo).

Aceptación: `npm test` en verde (≥745, salvo tests de código muerto explicados), build OK, ningún archivo de src > ~800 líneas (listá los que pasen y por qué), capturas sin diferencias visibles. Escribí docs/brief_fix_5_resultado.md con: mapa completo de módulos nuevos (juntando A, B, C y lo tuyo), helpers unificados, código muerto borrado, tests cambiados y tabla del diff de capturas.
