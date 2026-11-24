OBJETIVO (fix 6): cerrar los pendientes chicos que dejaron los fixes 3 y 4 porque necesitaban `src/scenes/arena.js`, que en ese momento tocaban otros workers. Leé las secciones "Pendiente" de `docs/brief_fix_3_resultado.md` y `docs/brief_fix_4_resultado.md`.

Proyecto: /home/mateyfasito/dev/game/eternauta.

QUÉ:
1. **Récord (M12):** la arena deja de usar su propia clave (BEST_KEY, loadBest, saveBest) y usa `save.best` vía el save en memoria (`game.baseSave`, ver main.js) o lo que exponga main. Después borrá el espejo de compatibilidad en `src/run/save.js` (LEGACY_BEST_KEY, mirrorBest y la importación) y el parche `saveBestIsolated` de main.js. En el Minijuego el récord solo vive en memoria (no se persiste).
2. **Minijuego:** en la pantalla de resultado, la opción "Volver a la casa" se llama "Otra vez" y reinicia la salida.
3. **Título:** las opciones salen de `game.baseSave || loadSave()`.
4. **Performance pendiente en arena.js:**
   - Saltear el pase de luz cuando la viñeta o el resultado tapan la escena.
   - Sacar las asignaciones por frame de readControls, readAim, updateToasts, collectLoot y steer (reusar objetos).
   - Liberar la sombra en removeEnemy.
   - Purgar en buildWorld (P5).
   - Sin cambios visuales.

ACEPTACIÓN:
- `npm test` en verde (hoy 744) y `npm run build` OK.
- `node tools/diag/minigame_save.mjs` sale con 0.
- `leaks_gl.mjs` y `arena_drawcalls.mjs` iguales o mejores que en el resultado del fix 3.
- Captura de la salida y del resultado del Minijuego ("Otra vez").
- Resumen en `docs/brief_fix_6_resultado.md`. Matá vite y chrome.
