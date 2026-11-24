OBJETIVO (fix 2): que las manzanas tengan sentido al jugarlas. Según `docs/analisis_roguelike.md`, sección de diseño de nivel (hallazgos L1–L12) y la "Tanda 2" del plan. Este arreglo corre DESPUÉS de los fixes 1A (IA) y 1B (colisiones): leé sus resultados en `docs/brief_fix_1A_resultado.md` y `docs/brief_fix_1B_resultado.md` y no deshagas lo que hicieron.

Proyecto: /home/mateyfasito/dev/game/eternauta. Para medir: `tools/diag/barrio_level_audit.mjs`, `barrio_audit.mjs` y `barrio_visual.mjs`. El diseño original de las piezas está en `art/concept/manzanas.py` y `art/concept/out/manzanas/`.

ARCHIVOS PERMITIDOS: `src/maps/barrio/pieces.js`, `src/maps/barrio/index.js`, `src/scenes/arena.js` (SOLO bounds/minFeet), tests de barrio. **NO toques** `src/main.js`, `src/run/*`, `src/taller.js` ni `src/base.js` (otro worker en paralelo).

QUÉ:
- L1: llenar todas las columnas elegibles de la fila de arriba.
- L2: toda salida sin vecino se cierra con algo legible (verja, un auto cruzado, montones de nieve), y la estática no entra en la calzada.
- L3: los fondos de las piezas no se conectan entre sí (medianeras); la cortada es un callejón de verdad.
- L4: la plaza da botín.
- L5: tipos sin repetición mientras se pueda.
- L6: pasos de al menos 48 px.
- L7: minFeet=32.
- L8: la casa, abrir o cerrar.
- L9: topes en los rieles.
- L10: verjas.
- L11: los datos muertos (por ejemplo, marcas que no se usan).

ACEPTACIÓN:
- En 200 semillas, 0 salidas muertas sin cierre, 0 bocas sobre estática y 0 botín dentro de un sólido.
- Un test de conectividad CON objetos: desde el spawn se llega a todo el botín, al exitHome y a la calzada de cada pieza.
- `diag_solidos_barrio.png` y `diag_caminable.png` rehechas, sin bolsones grandes inalcanzables.
- Una captura del barrio armado: miralo y fijate que se lea como un barrio.
- `npm test` y build en verde.
- Resumen en `docs/brief_fix_2_resultado.md`. Matá vite y chrome.
