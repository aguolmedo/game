OBJETIVO (fix 1B): que los sólidos del barrio coincidan con lo que se ve. Según `docs/analisis_roguelike.md`, sección 2 (hallazgos C1–C11) y la "Tanda 1B" del plan, más la parte de la Tanda 0 de sólidos.

Proyecto: /home/mateyfasito/dev/game/eternauta. Para ver el antes y el después: `tools/diag/barrio_audit.mjs` y `barrio_visual.mjs` (capturas `docs/capturas/diag_solidos_*.png`).

ARCHIVOS PERMITIDOS: `src/maps/barrio/pieces.js`, `src/mapView.js`, `src/maps/solid.js` (nuevo helper), `test/barrio_objects.test.js` (nuevo) y `test/barrio.test.js`. **NO toques** `src/maps/barrio/index.js` (lo toca el worker 1A) ni `src/scenes/arena.js`.

CUIDADO: mapView lo usan TODOS los mapas (altillo, casa, garaje, calle). Si el arreglo del offset (C1) se hace ahí, que sea opt-in. Por ejemplo, un campo `solidPx` por objeto o una opción del mapa `solidFromSprite: true` que solo active el barrio. Así los mapas viejos no cambian: hay muchas pruebas de alcance y colocación que lo cuidan.

QUÉ:
- C1: el sólido sale del rectángulo dibujado, con el offset incluido.
- Corregir casas, árboles, cajas, verjas, cartel, baranda y bancos (C5, C6).
- Hueco del paso a nivel de 48 px y el tablón alineado (C3).
- Autos y vagón: decidí y documentá (C4).
- flipX espeja el sólido (C8).
- southVerja sin recolocar, y los cercos recortados al borde de la pieza (C10).
- Test de alineación sólido/dibujo con menos de 2 px de error para la lista de sprites del análisis.

ACEPTACIÓN:
- `diag_solidos_*.png` rehechas, sin rojo fuera de los sprites.
- El cruce de las vías mide 48 px.
- `npm test` en verde (todas) y `npm run build` OK.
- Resumen en `docs/brief_fix_1B_resultado.md`, con el antes y el después.
