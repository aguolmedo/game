OBJETIVO (fix 4): guardado, flujo y Minijuego. Según `docs/analisis_roguelike.md`, sección de mantenibilidad y riesgos (hallazgos M1–M6 y M12) y la "Tanda 4" del plan. Este arreglo corre en paralelo con el fix 2 (manzanas).

Proyecto: /home/mateyfasito/dev/game/eternauta. Para verificar: `tools/diag/minigame_save.mjs` confirma hoy que el Minijuego escribe el save real.

ARCHIVOS PERMITIDOS: `src/main.js`, `src/run/save.js`, `src/taller.js`, `src/base.js`, `src/story.js` (solo si hace falta para M2), tests. **NO toques** `src/scenes/arena.js` ni `src/maps/*`. M1 se resuelve del lado de main/endRun/startArena: el Minijuego corre con un save en memoria y endRun no lo persiste. Si de verdad hace falta tocar arena.js, anotalo como pendiente en el resultado en vez de hacerlo.

QUÉ:
- M1: el Minijuego aislado, sin escribir localStorage.
- M2: sacarse el traje en la calle vuelve a matar (revisá cómo era antes).
- M3: un save en memoria como fuente de verdad, y avisar (toast) si writeSave falla, sin perder la salida.
- M4: migración v1→v2 con backup (`eternauta.save.v1.bak`), y todo el acceso a localStorage dentro de try.
- M5: abandonar una salida (pausa → título) cuenta como "volvió con las manos vacías" o como muerte. Decidí uno y documentalo; sugerencia: como muerte sin queja.
- M6: changeScene encola el pedido si hay una transición en curso, en vez de descartarlo en silencio.
- M12: unificar `best` (hoy está en dos lugares).

ACEPTACIÓN:
- Un test (o el script headless) de que jugar y morir en el Minijuego no modifica localStorage.
- Tests de migración de save, de abandono y de la cola de changeScene.
- `npm test` y build en verde.
- Resumen en `docs/brief_fix_4_resultado.md`. Matá vite y chrome.
