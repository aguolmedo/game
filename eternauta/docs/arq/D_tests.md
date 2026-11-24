Worker D: reorganizar los tests (#9 de la auditoría). Leé docs/arq/comun.md (prohibido git que escriba; foto en /home/mateyfasito/dev/game/snapshot_arq/). Ya no hay otros workers: podés tocar todo test/. NO toques src/ salvo que un test revele un bug real (anotalo, no lo arregles en silencio).

Problemas: ~87 archivos con nombres de tanda, no de feature (controles_fix, dos_botones, world_fixes, v4_layout, pi_layout, tipos, manos_bar...). arena_facade.test.js solo verifica que existan ~50 métodos. Varios *_layout.test.js fijan posiciones en píxeles. 23 tests arman escenas con Object.create(X.prototype) y campos inventados a mano.

Qué:
1. Inventario: para cada archivo de test, qué feature protege y si prueba COMPORTAMIENTO, DATOS (integridad de assets/JSON) o FORMA (existencia de métodos, píxeles exactos sin razón de gameplay). Tabla en docs/arq/D_resultado.md.
2. Reagrupar por feature en subcarpetas: test/world/, test/arena/, test/run/, test/ui/, test/story/, test/input/, test/assets/, test/core/ (mové con mv y renombrá por feature, p. ej. dos_botones → input/mouse_buttons). Fusioná archivos que prueban lo mismo. Verificá que `node --test` los siga encontrando (si no, ajustá el script "test" en package.json a `node --test 'test/**/*.test.js'` o equivalente).
3. Borrá o reescribí los tests de FORMA: arena_facade → reducir a la API que realmente usan main.js/src/core y tools/*.mjs (grep). Layout en píxeles: conservá solo los que protegen una regla (no se pisan, entra en pantalla, no tapa al jugador) y reescribilos como esa regla (no `x === 132`).
4. Object.create(prototype): donde sea viable, reemplazá por un fixture único en test/helpers/ (p. ej. makeWorldScene(overrides)) que construya el estado mínimo de forma centralizada, así cuando cambia un campo se arregla en un solo lugar.
5. No bajes la cobertura de comportamiento: cada test borrado → justificado en la tabla. Contá tests antes/después.

Aceptación: `npm test` verde, `npm run build` OK, D_resultado.md con la tabla, el árbol nuevo y conteo antes/después.
