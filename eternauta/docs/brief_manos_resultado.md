# Resultado · Manos: agarrar, dejar y mover (19/11)

Implementado el brief `docs/brief_manos.md` según `docs/diseno_manos.md`
(secciones 1 a 11). No se commiteó nada. No se tocó `bocetos/` ni el Vite de
5173.

## 1. Verbos y entradas

- **Dos formas de jugar, sin modo “solo teclado”:** `src/input.js` ahora solo
  produce dos dispositivos, `mouse` y `pad`. El teclado acompaña al mouse:
  WASD/flechas caminan, Q mira, I/Tab abren la mochila, 1-8 eligen ítem, Esc
  abre el menú. Usar el teclado ya no cambia el modo (`deviceAfter`).
- **Manos = click derecho / RT (botón 7, con flanco):** `handsPressed` une el
  click derecho del mouse y el RT del pad. El click derecho ya no mira.
- **Acción = click izquierdo / A (botón 0).** El mundo usa `padAPressed`, no
  `aPressed`: Enter y Espacio siguen confirmando en menús y diálogos, pero no
  actúan en el mundo. E, R y F no hacen nada; el botón X (2) se borró del pad.
- **Menús y diálogos:** siguen navegables con flechas + Enter/Espacio y Esc
  (sin cambios en su lógica). La partida del minijuego ya no usa X: recarga con
  RB y el parche va con Y/I/Tab.
- **Pantalla de Controles:** dos columnas, `MOUSE + TECLADO` y `JOYSTICK`, con
  siete filas: Acción, Manos, Mirar, Mover, Elegir ítem, Mochila y Menú. Se
  borró la fila “Usar en mí”. Se agregó al pie: “Click en la barra elige ítem.
  Click en Mochila la abre.”

## 2. Acción con uso propio

- `resolveAction(ctx, target, heldId, 'primary')`: con objetivo usa el ítem
  sobre el objetivo (`ITEM_USES`) o el verbo del tipo; sin objetivo usa
  `SELF_USES`; si el ítem no tiene uso propio devuelve `null`, así la barra no
  muestra una Acción vacía.
- **Puntero sobre Juan:** `updateMouseTarget` detecta la caja del sprite del
  jugador. Con un ítem con uso propio muestra el cuadradito dorado sobre Juan,
  el aviso flotante y la barra anuncia la Acción (`[click] Tomar mate`). El
  click izquierdo ejecuta ese uso propio. Con joystick, A en el aire también
  hace el uso propio.
- Con mouse, clickear piso vacío con un ítem en la mano **no** usa el ítem
  (§11.5): solo el click sobre Juan.
- La Acción **nunca agarra ni deja**: sobre una cosa (`thing`) siempre mira; el
  verbo Agarrar/Dejar/Levantar/Apoyar es de Manos.

## 3. Modelo de cosas en el mundo

- Estado por partida en `game.world[mapId] = { items, moved }`, creado desde
  `INITIAL_ITEMS` y borrado en `reset()` (`resetWorld()` en `src/surfaces.js`,
  llamado por `main.newGame`).
- `SurfaceLayer` lee y escribe `game.world[mapId].items`; cada cosa tiene
  `place: { kind:'surface', objectId, slot }` o `{ kind:'floor', tx, ty }`.
  Se mantienen `objectId/slot/x/y` por compatibilidad con los tests viejos.
- **Piso:** se dibuja con `createItemVisual` (ícono apoyado con la base en
  `ty*16+14`, centrado en `tx*16+8`, sombra de 1 px y brillito si es
  agarrable), profundidad por su `y`, **sin imán**.
- Candidato `floorItem` de tipo `thing`: huella = su casillero; accesos = su
  propio casillero + los vecinos caminables. No es sólida: se camina por
  encima y se agarra parado encima.
- Una cosa por casillero; la misma apilable suma `count` (`dropFloorItem`).

## 4. `resolveHands`

Función pura en `src/actions.js`, en el orden pedido:

1. `carry` → `Apoyar <nombre>` si el lugar es válido para muebles; si no,
   `null`.
2. cosa agarrable (`thing` con `grabbable`) → `Agarrar <nombre>`. Mochila
   llena → la acción trae `blocked:'full'` y al ejecutar avisa “La mochila está
   llena.”; la cosa queda.
3. pava sobre el fuego (`station:'heat'` ocupada) → `Agarrar la pava`.
4. mueble liviano (`movable:true`) sin cosas encima → `Levantar <nombre>`.
5. ítem en la mano + lugar apuntado válido → `Dejar <nombre>` (mueble con
   `surface` o piso).
6. si no → `null` (Manos no aparece en la barra).

“Apuntado” = objeto bajo el puntero (mouse) o tile de acción (pad). Con mouse
lejos: las acciones con alcance avisan “Acercate un poco.”; un lugar de piso
lejano no se pinta en rojo (corresponde el aviso de alcance, §4).

## 5. Dónde dejar una cosa chica

`src/placement.js` (`floorTileCheck` / `canDropFloor`): casillero caminable,
sin huella de objeto, sin warp, sin NPC (los ocultos por la historia no
cuentan), sin Juan encima, sin otra cosa (salvo la misma apilable) y vecino del
casillero de Juan. En un mueble con `surface`, se elige el slot libre más
cercano al puntero (mouse) o a Juan (pad). Inválido con mouse → silueta rojiza
y “No entra ahí.”; con pad no hay entrada de Manos.

## 6. Dónde apoyar un mueble liviano

`supportCheck` aplica las mismas reglas a toda la huella, exige que el mueble
sea sólido y recalcula el alcance con `reach.js`: BFS desde Juan y todos los
interactivos del mapa y todos los warps conservan al menos un acceso
alcanzable. Si algo se pierde → inválido con “Taparía el paso.” (caso real:
silla de la cocina en el vano living-hall). `checkSupportCached` cachea por
mueble + casillero + casillero de Juan y se invalida al mover/ocultar algo.

## 7. Muebles livianos

Lista cerrada implementada exactamente:

- altillo: `crate`, `box`, `suitcase`, `crate_stairs`, `box_stairs`;
- casa: `kchair_l`, `kchair_r`, `entry_tire`, `entry_bucket`,
  `kitchen_bucket`, `bidon`, `toy_horse`;
- garaje: `stool`, `garage_crate`, `garage_box`, `garage_box2`,
  `garage_cardboard`, `tire`.

No se pueden levantar las sillas del truco ni el bidón del garaje (tiene la
nafta encima), ni nada de la calle.

- `game.carry = { mapId, objectId, object, origin }`: el objeto se oculta, se
  quitan sus sólidos y su huella, se invalida el alcance y no ocupa mochila.
- Se dibuja sobre la cabeza (base en `pies − 26`, centrado en `x`, bamboleo de
  1 px al caminar, profundidad de Juan + 0.001) y Juan camina al 80 %
  (`player.speedScale`).
- No se cambia de mapa cargando: el warp avisa “Primero apoyá <nombre>.”
- Mientras carga no se agarra ni se deja nada más; la Mochila se abre y hablar
  con personas sigue andando.
- Apoyar deja `game.world[mapId].moved[objectId] = {tx,ty}`, rearma sólidos y
  huellas y persiste al volver al mapa.
- Si la historia saca a Juan del lugar (cambio de escena, viñeta o muerte), el
  mueble se apoya solo en el casillero válido más cercano; si no hay ninguno,
  vuelve a su lugar original. El gancho está en `main.setScene` y en
  `WorldScene.playComic` (viñeta).

## 8. Lo que se ve

- Silueta válida al 55 % con cuadradito dorado alrededor del casillero o slot;
  inválida con mouse al 45 % teñida `#f09a7a` (mezcla) sin cuadradito y con
  “No entra ahí.” / “Taparía el paso.” arriba, en `#f09a7a`.
- Cosa en el piso con sombra y brillito; mueble sobre la cabeza; silueta del
  mueble cargado en el lugar de apoyar.
- Barra: Acción (si hay algo que hacer), Manos (solo si `resolveHands` devuelve
  algo), Mirar solo si es distinta de la Acción y Mochila siempre. Se borró
  “Usar en mí”. Mientras se carga un mueble, la barra muestra una sola vez
  `[Manos] Apoyar <nombre>` (la Acción hace lo mismo, sin repetir la etiqueta).
- Con mouse, el aviso flotante del objetivo sigue siendo el de la Acción. La
  cosa agarrable muestra `Mirar <nombre>` en el aviso y `Agarrar <nombre>` en
  la barra de Manos (la Acción nunca agarra; §1 y §11.3).

## 9. Historia

- La pava de la cocina se agarra con Manos: `Agarrar la pava` reemplaza a
  “Sacar la pava” de la Acción. La Acción sobre la cocina ocupada ahora mira, y
  con la pava en la mano sigue “Poner la pava al fuego”.
- Objetivos y conteo de ítems siguen mirando la mochila. Dejar el casco en el
  piso funciona igual: se vuelve a agarrar.
- Ciclo del mate (yerba → cebar → tomar → lavar), convidar, truco, sentarse y
  diálogos quedan intactos. Tirar la yerba se resuelve por id: sigue andando en
  el balde después de moverlo.
- Se verificó en headless el recorrido del mate y el “Tirar la yerba” en el
  balde movido.

## 10. Tests

Nuevos:

- `test/manos.test.js` (23 pruebas): los cinco casos de `resolveHands`, mochila
  llena, pava, cargando, validez de piso (caminable/objeto/NPC/Juan/warp/
  vecino/apilable), validez de mueble con “Taparía el paso.” real, lista
  cerrada, persistencia/reset, agarrar del piso, slot más cercano, agarrar
  parado encima, caché de alcance invalidada y NPC oculto.
- `test/manos_bar.test.js` (10): barra por contexto (sin objetivo, cosa en el
  piso, dejar, sobre Juan, uso propio con pad, mesa con ítem, cargando, pava,
  mueble liviano, leyenda/clickeable), incluido el caso §11.4 (apuntar a una
  cosa tiene prioridad sobre dejar) y §11.1.
- `test/alcance_audit.test.js`: se agregó una prueba que mueve **cada** mueble
  liviano a un lugar válido de prueba y vuelve a auditar los cuatro mapas
  (0 fallos).

Tests viejos actualizados y por qué:

- `input.test.js`, `controles.test.js`: E/Espacio/Enter ya no son Acción del
  mundo; Enter/Espacio confirman menús; F/R no hacen nada; X del pad borrado;
  solo `mouse`/`pad`; RT y click derecho levantan Manos; click derecho ya no
  mira.
- `glyphs.test.js`, `controles_fix.test.js`, `menus_ui.test.js`: la tabla nueva
  de dos columnas, Manos con `mouse_r`/`rt`, Mirar con `key_q`/`b`, sin
  `ACTIONS.use/self`.
- `right_click.test.js`: reescrito de “click derecho = Mirar” a “click derecho
  = Manos” (el comportamiento cambió a propósito).
- `world_fixes.test.js`: la pava se agarra con Manos; la Acción ya no dice
  “Sacar la pava”; el prompt del extractor se verifica con el resolvedor real.
- `world_hints.test.js`: sin objetivo y sin uso propio no hay Acción; el uso
  propio es la Acción sobre Juan (ya no hay entrada `self`).
- `actions_invariants.test.js`: la Acción no agarra ni deja; el uso propio se
  prueba con `primary` sin objetivo; Manos agarra/deja.
- `tipos.test.js`: cosa y superficie se miran con la Acción; Manos deja/agarra;
  pava con Manos.
- `hud.js`, `dialog.js`, `comic.js`: el dispositivo por defecto pasó de
  `keyboard` a `mouse` (el juego ya no emite `keyboard`).

## Verificación

- `npm run build`: OK (Vite 6.4.6; únicamente el aviso ya existente de tamaño
  de chunk).
- `npm test`: **461 tests, 461 pass, 0 fail**.
- Auditoría de alcance con Vite en 5197:
  `URL=http://localhost:5197/ node art/concept/auditoria_alcance.mjs` →
  altillo 36/36, casa 39/39, garaje 16/16, calle 5/5, **0 fallos**.
- `node art/direccion/pruebas_manos.mjs`: **22/22 pruebas OK**, sin errores de
  página. Cubre: dejar el mate en el piso de la casa y volver del garaje;
  agarrarlo parado encima; la silueta válida; click sobre Juan; Acción sin
  objetivo; E/R/F/Espacio/Enter sin efecto; levantar/apoyar la silla; velocidad
  ×0.8; Warp bloqueado cargando; “Taparía el paso.” en el vano; agarrar la pava
  con Manos; tirar la yerba en el balde movido; ciclo del mate; silueta
  inválida; auto-apoyo al cambiar de escena; `reset()`.
- `node art/direccion/capturas.mjs` y `node art/direccion/capturas_ctrl.mjs`:
  todas las capturas OK, sin errores de página.
- `node art/direccion/capturas_manos.mjs`: nuevas capturas, sin errores.
- Vite de 5197 matado por PID (`1088772`); el Vite de 5173 no se tocó.

### Capturas nuevas (`art/direccion/doc/capturas/`)

- `manos_piso_agarrar.png`: cosa en el piso con sombra, brillito y cuadradito;
  barra `[click der.] Agarrar Mate · [I] Mochila`.
- `manos_dejar_silueta.png`: mate en la mano, silueta válida al 55 % y
  cuadradito dorado; `[click der.] Dejar Mate`.
- `manos_invalido.png`: silueta teñida y “No entra ahí.” sobre un casillero
  vecino a la pared; la barra no ofrece Manos.
- `manos_cargar_silla.png`: Juan con la silla de la cocina sobre la cabeza,
  silueta de apoyar y `[RT] Apoyar la silla`.
- `manos_taparia.png`: silla cargada en el vano, silueta roja y “Taparía el
  paso.”.
- `manos_barra_dejar.png`, `manos_barra_sobre_juan.png`,
  `manos_barra_accion_sin_objetivo.png`, `manos_barra_pava.png`: la barra con
  cada caso (dejar, uso propio sobre Juan, Acción sin objetivo con pad, pava).
- `manos_controles.png` (y `ctrl_pantalla_controles.png` actualizada): pantalla
  de Controles nueva.

## Puntos que no se pudieron cumplir exactamente / decisiones

- El estado `game.world[mapId]` se crea cuando se construyen las escenas (las
  cuatro al arrancar), no literalmente en la primera entrada al mapa. El
  comportamiento de partida es el mismo: persiste entre mapas y `reset()` lo
  borra.
- Mientras se carga un mueble, la barra muestra una sola entrada de Manos
  (`Apoyar X`) en vez de repetir la misma etiqueta en Acción y Manos. La Acción
  igualmente apoya.
- Con mouse, el aviso flotante sobre una cosa agarrable muestra el verbo de la
  Acción (`Mirar Mate`); `Agarrar Mate` va en la barra de Manos. Así no se
  promete con un click lo que hace el otro, y se respeta §11.3 (sin etiquetas
  duplicadas).
- Apuntar lejos a un casillero de piso no pinta la silueta roja: se avisa
  “Acercate un poco.” al intentar Manos. La silueta roja es para lugares
  inválidos dentro del alcance.
- `glyphName` conserva una rama de compatibilidad para el string `keyboard`
  que usan tests viejos, pero `Input` nunca emite ese dispositivo.
- `game.carry` guarda además `object` y `origin` (además de `mapId` y
  `objectId`) para dibujar y devolver el mueble.

## Archivos principales cambiados

- Nuevos: `src/placement.js`, `art/direccion/capturas_manos.mjs`,
  `art/direccion/pruebas_manos.mjs`, `test/manos.test.js`,
  `test/manos_bar.test.js`, este documento.
- Lógica: `src/input.js`, `src/actions.js`, `src/reach.js`, `src/mapView.js`,
  `src/surfaces.js`, `src/scenes/world.js`, `src/main.js`, `src/player.js`.
- Datos/UI: `src/glyphs.js`, `src/menus.js`, `src/hud.js`, `src/dialog.js`,
  `src/comic.js`, `src/scenes/arena.js`, `src/maps/attic.js`,
  `src/maps/house.js`, `src/maps/garage.js`.
- Tests actualizados: `test/input.test.js`, `test/controles.test.js`,
  `test/controles_fix.test.js`, `test/glyphs.test.js`, `test/menus_ui.test.js`,
  `test/right_click.test.js`, `test/world_fixes.test.js`,
  `test/world_hints.test.js`, `test/actions_invariants.test.js`,
  `test/tipos.test.js`, `test/alcance_audit.test.js`.
- Capturas: `art/direccion/capturas_ctrl.mjs` (el dispositivo `keyboard` de
  los scripts ahora se mapea a `mouse`) y las `manos_*.png` nuevas.
