OBJETIVO (fix 5): mantenibilidad SIN cambiar el comportamiento. Según `docs/analisis_roguelike.md`, hallazgos M7–M11 y la "Tanda 5" del plan. Corre AL FINAL, cuando ya están todos los otros fixes (leé `docs/brief_fix_*_resultado.md`).

Proyecto: /home/mateyfasito/dev/game/eternauta.

REGLA DE ORO: es un refactor puro. Mismos tests, mismas capturas, mismo comportamiento. Hacelo en pasos chicos, con `npm test` y build en verde después de CADA paso. Si un paso rompe algo y no es trivial, revertilo (git checkout del archivo) y seguí con el próximo.

QUÉ (en este orden, parando si se complica):
1. Helpers duplicados a un solo módulo:
   - `put()` → `src/maps/place.js`.
   - wrap de texto → un `wrapText` único.
   - Geometría (rects, pointInRect) → `src/geom.js`.
   - Paleta de madera y UI → reusar la de uiSkin.
   - Que todos los usos importen de ahí.
2. Partir `src/scenes/arena.js` en módulos con fachada (HUD de la arena, botín, mochila, consumibles, ondas y spawns) dentro de `src/arena/`, sin cambiar la API pública de la escena.
3. Partir `src/scenes/world.js` igual, en módulos dentro de `src/world/` (input, interacción, HUD/prompt, cofre/acarreo). La clase queda como fachada.
4. Partir `src/menus.js` (título, pausa, mochila/fabricar, opciones).
5. Código muerto: la calle vieja de la arena, `street.arena` si ya nadie lo usa, marcas sin uso. Los tests que solo sostenían código muerto, adaptarlos.
6. Tests frágiles (anchos de hoja hardcodeados y similares): que verifiquen el contrato, no el número.

ACEPTACIÓN:
- `npm test` en verde, con la misma cantidad de tests o más (salvo los de código muerto, explicados).
- `npm run build` OK.
- Ningún archivo de src pasa las ~800 líneas, o se explica por qué.
- Capturas headless del título, del altillo, de la base, del taller y de la salida, comparadas con las de antes: sin diferencias visibles.
- Resumen en `docs/brief_fix_5_resultado.md`, con el mapa nuevo de módulos. Matá vite y chrome.
