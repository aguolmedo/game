OBJETIVO (fix 3): performance. Fugas de GPU, draw calls y los canvas que se redibujan cada frame. Según `docs/analisis_roguelike.md`, sección de performance (hallazgos P1–P6) y la "Tanda 3" del plan. Sin cambios visuales.

Proyecto: /home/mateyfasito/dev/game/eternauta. Para medir: `tools/diag/leaks_gl.mjs`, `arena_drawcalls.mjs`, `arena_perf.mjs` y `arena_rebuild.mjs`.

ARCHIVOS PERMITIDOS: `src/arena/feedback.js`, `src/footprints.js`, `src/arena/reset.js`, `src/sprite.js`, `src/snow.js`, `src/lighting.js`, `src/font.js` y `src/main.js` (SOLO el fade vacío y, si hace falta, un hook de depuración de renderer.info), más tests. **NO toques** `src/scenes/arena.js`, `src/arena/enemies.js` ni `src/maps/*` ni `src/mapView.js` (los tocan otros workers en paralelo). Si un arreglo necesita arena.js, anotalo como pendiente en el resultado.

QUÉ:
- P1: liberar geometrías y materiales; compartir las de sombras y huellas; no hacer dispose del glow compartido.
- P3: cachear el texto, no subir el fade si está vacío, saltear la luz cuando está tapada.
- P4: menos asignaciones por frame.
- P6: gradientes.
- P2: la nieve con InstancedMesh, o al menos menos meshes.

ACEPTACIÓN:
- `leaks_gl.mjs` sin los +400 buffers tras 600 huellas.
- Los draw calls en reposo bajan de ~550 a menos de 300.
- drawHud por debajo de 1,5 ms en headless, si depende de archivos tuyos.
- Capturas antes y después de la salida y de la calle: sin diferencias visibles.
- `npm test` y build en verde.
- Resumen con las mediciones antes y después en `docs/brief_fix_3_resultado.md`. Matá vite y chrome.
