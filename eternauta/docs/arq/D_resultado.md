# D: tests reorganizados por feature

Conteo: antes 784 tests en 87 archivos planos; después 784 tests en 86 archivos (+2 helpers) en 8 carpetas.
`npm test` verde, `npm run build` OK. Script: `node --test "test/**/*.test.js"` (glob nativo de node).

Tipo: C = comportamiento, D = datos/integridad de assets o mapas, F = forma (solo existencia/píxeles).

## Borrado / reescrito (todo lo demás: movido tal cual)
| Antes | Ahora | Por qué |
|---|---|---|
| arena_facade (3 tests: ~50 métodos existen) | arena/facade (3) | Reducido a los 17 métodos que usan tools/*.mjs y src/core/debugApi; el contrato de escena y aliveCount quedan. Los otros ~33 métodos están cubiertos por comportamiento en arena/*. |
| pi_layout (3) + v4_layout (3), fijaban x/y de sprites, `[88,77]`, 26 tiles de pared, "el crib ya no está" | world/house_rules (6) | Reescritos como reglas: ids únicos, ventana abrible registrada, textos Mirar/Hablar, el warp de la escalera cubre su objeto, sólidos no tapan vanos ni acceso al garaje, hay lugar junto a la rueda. Se eliminó todo `x === N` y las aserciones de "lo viejo no existe". |
| arena_hud_layout | arena/hud_layout | Conservado: ya era regla (dentro de pantalla, sin pisarse, controles bajo paneles). |

No se borró ningún test de comportamiento. El total coincide porque los 6 de layout se reemplazaron por 6 de reglas.

## Fixtures (Object.create(prototype))
- `test/helpers/world_scene.js`: `makeWorldScene(overrides)` + re-export de `WorldScene`. Reemplaza 19 construcciones a mano en 11 archivos (action_invariants, right_click_hands, object_types, hands_bar, mouse_buttons, hint_bar, controls, action_label, prompt_and_extractor).
- `test/helpers/arena_scene.js`: `makeArenaScene(overrides)` (RunState + controles en reposo). Usado en arena/click, dispose, facade.
- Quedan 3 `Object.create` a mano para ChestPanel/PauseMenu (ui/menus, ui/clickable_hints): paneles con 1-2 campos, no justifican fixture.

## Árbol y inventario
- world/ (C salvo indicado): movement, interaction, hands, hands_bar, prompt_and_extractor (ex world_fixes), object_types (ex tipos), action_invariants, crafting, inventory, mate, gameflow, logic, surfaces, lighting, cigarette_butt (ex apagon), footprints_perf, extractor_reach, garage_base (ex base_casa), house_rules (nuevo); D: maps_contract, maps_interiors (ex maps2), barrio_pieces, barrio_level, barrio_solids, reach_audit (ex alcance_audit).
- arena/ (C): click, controls_axes, determinism, dispose, effects, enemies_flow, exit, exit_controls, facade (F reducido), feedback_perf, flowfield, hud_layout, projectiles, reset, result, result_screen, run_mode, waves, weapon.
- run/ (C): flow, home_logic (ex base_logic), loot, loot_pure (ex salida_loot), radio, save, seed, upgrades, workshop_model (ex taller_model).
- input/ (C): devices (ex input), controls, controls_fixes (ex controles_fix), mouse_buttons (ex dos_botones), right_click_hands.
- ui/ (C): action_label, balloon, clickable_hints, dialog, font_cache, glyphs, hint_bar (ex world_hints), hit, hud_occlusion, menu_keys (ex menu), menus (ex menus_ui), prompt_label (ex prompt_layout), title, title_snow, toasts, viewport.
- story/ (C): story, prologue, objectives, dialogs.
- core/: flags (D, escaneo de src), loop, router, rng_required (D, escaneo de src).
- assets/ (D): sheets (ex assets), sheets_more (ex assets2), death (ex death_assets), chars_walk.
- helpers/: world_scene.js, arena_scene.js.

## No hecho
- No fusioné archivos con temas parecidos (hands/hands_bar, controls/controls_fixes/mouse_buttons/right_click_hands, sheets/sheets_more): se renombraron por feature pero los casos individuales siguen donde estaban; fusionar es mover bloques sin ganar cobertura.
- No audité caso por caso los demás tests en busca de píxeles exactos sin razón (p. ej. barrio_level, prompt_label): protegen reglas de gameplay/diseño de nivel o orden de candidatos.
- Ningún test reveló bugs en src/.

## Segunda tanda (fusión y limpieza)
Conteo: antes de la tanda 785 tests en 86 archivos (A/B habían sumado 1 en core); después 784 tests en 72 archivos (+3 helpers). Build y `npm test` verdes. No toqué test/arena ni test/core.

Fusiones (cada caso original quedó en su propio bloque `{ }` del archivo fusionado, con imports unificados):
- world/hands (+ hands_bar), input/controls (+ controls_fixes + mouse_buttons + right_click_hands), ui/hint_bar (+ clickable_hints), ui/menus (+ menu_keys), ui/title (+ title_snow), assets/sheets (+ sheets_more), world/maps (+ maps_contract + maps_interiors), world/barrio (+ pieces + level + solids).
- Duplicado exacto eliminado: "garage: el extractor se alcanza desde el piso frente al portón" estaba en world/interaction y en world/extractor_reach (esta última más completa). Se borró la copia de interaction (-1 test).

Píxeles/forma:
- ui/menus hintLayout: `y === 216` y `x+total === 428` reescritos como "la barra entra en la vista de 480x270".
- Se quedan, con razón: viewport (escalado entero pixel-perfect es regla del proyecto), hotbar pegada al borde inferior (decisión PI-5), promptBox (padding fijo = contrato de las cajas de click), maps dimensiones (el motor y las herramientas las leen), title/fitSignWidth (centrado numérico, ya expresado como tolerancia) y los `equal` sobre posiciones de gameplay (movement, hands, interaction: tiles/alcances).
- No audité uno por uno los ~120 `equal` numéricos restantes fuera de lo anterior; la mayoría son lógica (conteos, tiles, dinero, rangos).

Fixtures: nuevo test/helpers/menu_panels.js (`makePauseMenu`, `makeChestPanel`); ya no queda ningún `Object.create` fuera de test/helpers.
