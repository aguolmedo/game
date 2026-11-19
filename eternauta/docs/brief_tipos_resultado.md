# Resultado · Tipos de objeto (19/11)

Implementado el brief `docs/brief_tipos.md` según la especificación de
`art/direccion/DIRECCION.md` → “Controles e interacción” → “Tipos de objeto”.
No se commiteó nada.

## Modelo final

Cada interactivo de los mapas declara `type` y `name` (con artículo; las
personas, sin artículo). El tipo fija el verbo de la Acción; los aparatos lo
fijan por estado. Los textos salen del resolvedor, no de los mapas.

| Tipo | Verbo de la Acción | Con un ítem en la mano |
|---|---|---|
| `decor` | Mirar | el uso del ítem si la tabla lo contempla |
| `thing` | Agarrar (si es agarrable; si es decorativa, Mirar) | — |
| `surface` | Mirar | Dejar `<ítem>` |
| `container` | Abrir | — |
| `device` | el verbo de su estado (Prender/Apagar, Cerrar/Abrir, Sacar la pava) | el uso del ítem si la tabla lo contempla |
| `person` | Hablar con `<nombre>` | Convidar mate |
| `passage` | el texto del paso (Entrar/Salir/Subir/Bajar, Ir al garaje, Volver a la casa, Salir a la calle) | — |
| `view` | Asomarse a `<nombre>` | — |
| `seat` | Sentarse | — |

Estados declarados por los aparatos:

- `radio`: `radio_on` → Prender / Apagar.
- `vela`: `candle_apagada` → Apagar / Prender (dos sprites: encendida y apagada).
- `window_martita` y `puerta del garaje`: `closed_<id>` → Cerrar / Abrir.
- `workbench` (altillo) y `stove` (cocina): `pavaStation === id` → Sacar la pava; libre → Mirar. La pava en la mano sobre la estación libre pasa a “Poner la pava al fuego” por `ITEM_USES`.
- `extractor` y `electrógeno`: Mirar; el verbo real aparece cuando el ítem en la mano sirve (Instalar el secador / Cargar nafta).
- `pileta`: Mirar; con mate lavado, Tirar la yerba.

Resolvedor único (`src/actions.js`): `verbFor(type, state)` + tabla
`ITEM_USES`. Orden: uso del ítem sobre el objetivo → verbo del tipo →
Mirar. Se eliminaron los casos especiales por id (`caja_municiones`,
ventanas, pava); la tabla de usos sigue declarativa. Ya no hay mensajes
“No tenés nada en la mano” desde la Acción.

Mirar es uno solo: Q/B/click derecho y la Acción-Mirar llaman a
`WorldScene.lookTarget()`: diálogo propio (`talk`) si existe, si no la línea
corta. No requiere alcance.

## Objetos por tipo y mapa

### Altillo
- `surface`: `shelf_left`, `shelf_right` (el estante), `table` (la mesa).
- `view`: `window` (la ventana).
- `device`: `radio` (la radio), `candle` / `candle_off` (la vela), `workbench` (el banco, estación de calor).
- `decor`: `speaker`, `tool_table`, `air_tank`, `coat_stand`, `violin_bench`.
- `seat`: `chair_juan` (la silla).
- `container`: `crate`, `box`.
- `thing` apoyados: vino, cenicero, anotador, naipes, mate, vaso, libros, frascos, calentador, pava, tela, tijera, yerba.
- `person`: Favalli, Polsky, Lucas.
- `passage`: `stairs` (Bajar).

### Casa
- `view`: `window_living` (la ventana).
- `device`: `radio_cabinet`, `garage_door` (la puerta del garaje), `window_martita`, `sink`, `stove`.
- `surface`: `living_table`, `nightstand`, `kitchen_table`.
- `decor`: `bookshelf`, `sofa`, `hall_door`, `coat_stand`, `wall_clock`, `entry_shelf`, `wedding_photo`, `toy_horse`, `kid_drawing`.
- `container`: `wardrobe`, `alacena`.
- `thing` apoyados: frascos, latas, lista, lata, pan, libros, cenicero, botas, secador.
- `person`: Elena, Martita.
- `passage`: `stairs_up` (Subir), `garage_door` (Ir al garaje).

### Garaje
- `surface`: `garage_shelf`, `bidon`, `bench_suit`.
- `device`: `extractor`, `generator`.
- `decor`: `garage_shelf_r`.
- `thing` apoyados: casco, bidón de nafta.
- `passage`: `door_home` (Volver a la casa), `garage_door` (Salir a la calle).

### Calle
- `decor`: `ferreteria`, `colectivo`, `auto_1`, `auto_parado`, `polsky_body`.
- `container`: `caja_municiones` (Abrir la caja de municiones).

## Barra y cuadradito

- Acción siempre; Mirar solo si la Acción no es Mirar; Usar en mí solo con
  uso propio (y sin repetir el texto de la Acción); Mochila siempre.
- Mochila: `[key_i]` con mouse y teclado, `[y]` con pad. Se abre con I/Tab,
  Y o click sobre la entrada; las demás entradas son leyenda (`static: true`).
  Al pasar el mouse por “Mochila”, la entrada se resalta (fondo más claro y
  texto crema más vivo).
- Cuadradito: dorado latiendo si hay acción propia; brillito en lo agarrable;
  tenue fijo (alpha 0.6, sin latido) en decorados y cosas que solo se miran;
  ámbar fijo de lejos.

## Archivos cambiados

- `src/data/types.js` (nuevo): ocho tipos, `isValidType`, verbos base.
- `src/actions.js`: modelo de tipos, `verbFor`, `stateOf`, `nameOf`, `labelFor`, resolvedor sin casos por id.
- `src/maps/{attic,house,garage,street}.js`: `type`/`name`/`talk` y estados de aparatos; warps con sus textos; puerta del garaje de la casa como aparato cerrable (la historia necesita `closed_garage_door`).
- `src/mapView.js`: candidatos con `type`/`name`/`talk`; contenedores y caja de municiones.
- `src/scenes/world.js`: textos generados en la barra, Mirar unificado (`lookTarget`), ejecución de `window`/`toggle`, pava, drop, entrada Mochila y hover.
- `src/surfaces.js`: ítems apoyados como `thing` con nombre.
- `src/glyphs.js`: Mochila siempre `key_i` con mouse/teclado y `y` con pad.
- `src/hud.js`: barra sin repetidos y resaltado de la entrada bajo el mouse.
- `src/cursor.js`: modo tenue para decorados.
- `src/menus.js`: la fila Mochila de Controles muestra `key_i` también en la columna del mouse.
- `art/direccion/capturas_ctrl.mjs`: capturas nuevas `tipos_*` y búsqueda del casillero exacto de cada objeto.
- `test/tipos.test.js` (nuevo) y actualizaciones de tests viejos.

## Tests nuevos y cambios

Nuevo `test/tipos.test.js` (14 pruebas):

1. todos los interactivos de los 4 mapas tienen `type` válido y `name`;
2. `verbFor` por tipo y por estado;
3. la barra nunca repite texto y Mirar aparece solo si suma;
4. ningún texto de Acción empieza con “Mirar” salvo que la acción sea mirar;
5. casos: parlante, radio (Prender/Apagar), ventana del living (Asomarse), ventana abrible (Cerrar/Abrir), caja de municiones, pava en la cocina, Favalli con mate, mesa con ítem;
6. Mochila (`key_i`/`y`, entrada clickeable);
7. cuadradito dorado vs. tenue;
8. todos los caracteres de los textos generados existen en la fuente.

Tests viejos actualizados y por qué:

- `action_label.test.js`, `actions_invariants.test.js`, `alcance_audit.test.js`: los constructores de candidatos usaban `obj.interact`; ahora usan `obj.type` / `obj.container` y `name`. La tijera (decorativa) ahora devuelve Mirar y la tela Agarrar, como manda el tipo `thing`.
- `pi_layout.test.js`: la ventana de Martita ya no tiene `interact.label`; se verifica `type: device`, `name` y `device.state`.
- `v4_layout.test.js`: el sofá ya no tiene `interact.label`; se verifica `type: decor` y `name`, y el NPC Elena ahora tiene `name`.
- `glyphs.test.js`, `controles.test.js`, `controles_fix.test.js`: Mochila con mouse ya no usa el glifo del mouse; usa `key_i` (lo pide el brief).
- `world_hints.test.js`: la barra sin objetivo ya no muestra Mirar (no hay nada que mirar); con target muestra el verbo real y el rect de Mochila no es `static`.
- `right_click.test.js`: el target falso de Mirar ahora es un decorado sin diálogo, para probar la línea corta sin abrir un diálogo inexistente en el fake.

## Verificación

- `npm run build`: OK (Vite 6.4.6; único aviso, el tamaño de chunk ya existente).
- `npm test`: **427 tests, 427 pass, 0 fail**.
- Auditoría de alcance con Vite en 5197:
  `URL=http://localhost:5197/ node art/concept/auditoria_alcance.mjs` →
  altillo 33/33, casa 33/33, garaje 10/10, calle 5/5, **0 fallos**.
- `node art/direccion/capturas_ctrl.mjs` y `node art/direccion/capturas.mjs`
  con `URL=http://localhost:5197/`: todas las capturas OK, sin errores de página.
- Capturas nuevas:
  - `art/direccion/doc/capturas/tipos_parlante.png` (`[E] Mirar el parlante`, sin Mirar aparte);
  - `tipos_radio.png` (`[E] Prender la radio · [Q] Mirar · [I] Mochila`);
  - `tipos_ventana.png` (`[E] Asomarse a la ventana · [Q] Mirar · [I] Mochila`);
  - `tipos_mochila_hover.png` (hover sobre Mochila resaltado).
- Recorrido headless con `window.__eternauta` (Chromium/SwiftShader, sin abrir ventanas):
  parlante, radio prender/apagar + diálogo, vela apagar/prender, mesa con ítem,
  Favalli con mate cebado, ventana del living (escena `view`), cierre de la
  ventana de Martita en carrera (`martita_ventana: ok`), puerta del garaje,
  pava de la cocina, secador en el extractor, nafta en el electrógeno, caja de
  municiones y click en Mochila abriendo el menú. Sentarse dispara el diálogo,
  la viñeta del truco y el apagón. El sellado de la casa con las cuatro
  aberturas sigue marcando `casa_sellada` y el objetivo avanza.
- El Vite de 5197 se mató por PID (solo ese servidor).
