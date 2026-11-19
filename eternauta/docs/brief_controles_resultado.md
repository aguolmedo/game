# Resultado · Controles e interacción unificados (19/11)

Brief: `docs/brief_controles.md`. Especificación: `art/direccion/DIRECCION.md`, sección
**"Controles e interacción"**. No se commiteó nada.

## 1. Resumen

- Tres verbos, un botón cada uno: **Acción** (click izq. / E-Espacio-Enter / A),
  **Mirar** (click der. / Q / B en el mundo), **Usar en mí** (click en el ítem elegido /
  F / X). B sigue volviendo en menús y diálogos; B del teclado ya no hace nada en el mundo.
- **Alcance único por casilleros de acceso**: huella del objeto + piso caminable pegado a
  la huella. Se borraron los `reach` por objeto (ventana 48, extractor 56) y la doble
  medida 22/28. La E/A además exige mirar la huella; el click alcanza con estar en un
  acceso y Juan se da vuelta. Muebles bajos (`low: true`) no tapan; los altos sí.
- Sin duplicados: cada objeto aparece una sola vez en `candidates()` (los objetos apoyados
  ya no se copian con la caja del mueble).
- Una sola prioridad para las tres vías: **apoyado > NPC > mueble > warp**; a igual
  prioridad gana la caja más chica. Los casos especiales de la historia (pava en el fuego,
  secador/extractor, nafta/electrógeno, ventana de Martita, vela) conservan su prioridad.
- Cuadradito: solo con objetivo, recortado a los píxeles opacos del sprite (caché por
  frame), se desliza entre objetivos (~80 ms), hace pop al aparecer (~100 ms), se apaga
  sin saltar (~120 ms) y tiene histéresis. Cerca dorado y latiendo; lejos ámbar fijo.
- Barra y pantalla de Controles con los glifos del dispositivo actual (mouse / teclado /
  pad) y el texto real de la acción. El mouse toma el control recién con un movimiento de
  más de 4 px o un click; la ventana de ~1 s permite mezclar WASD + mouse.
- Al pasar a teclado/pad se oculta el puntero, se limpia el hover y el cuadradito vuelve
  al objetivo de adelante.

## 2. Archivos nuevos

| Archivo | Qué |
|---|---|
| `src/reach.js` | Regla única: huella, accesos, muebles bajos, objetos de pared, `playerInAccess`, `facesFootprint`. Puro, sin DOM ni Three.js, con caché por mapa. |
| `test/controles.test.js` | Mapeo de teclas/botones, Q mira, R libre, F sin uso propio = Acción, B mundo/diálogo, glifos por dispositivo, umbral del mouse. |
| `test/alcance_audit.test.js` | Recorre los 4 mapas, BFS desde el spawn y verifica accesos + E/click iguales + los casos fijos. |
| `art/direccion/capturas_ctrl.mjs` | Capturas headless `ctrl_*.png`. |
| `docs/brief_controles_resultado.md` | Este archivo. |

## 3. Archivos cambiados

- `src/interaction.js` — `pickTarget`/`pickAt` por accesos; `actionInsideFoot`; se fue el
  alcance por píxeles y el fallback a `candidateReach`.
- `src/input.js` — Q = Mirar (`look`/`lookPressed`); Q/R fuera de la barra; `deviceAfter`
  con umbral de 4 px y ventana de 1 s; el pad toma el control enseguida; el puntero se
  actualiza aunque el movimiento no alcance el umbral.
- `src/glyphs.js` — `ACTIONS` nuevos (interact E/A, look Q/B, self F/X, bag I/Y),
  `glyphName` por dispositivo; el mouse siempre muestra el click (y `mouse_r` para Mirar).
- `src/actions.js` — modo `item` = solo `SELF_USES`, nunca actúa sobre el objetivo;
  devuelve `null` si el ítem no tiene uso propio.
- `src/cursor.js` — deslizamiento, pop, fundido al desaparecer, objetivo con `id`; lejos
  sin latido (ámbar fijo).
- `src/mapView.js` + `src/sprite.js` — `opaqueRect` con caché por frame; cada objeto y
  contenedor lleva `cursorBox` recortado al dibujo + 1 px de aire.
- `src/scenes/world.js` — prioridades únicas, lista sin duplicados, histéresis, Mirar con
  Q/B, `useSelected` (F/X) con compatibilidad, `selfUse` (click en el ítem), cuadradito
  solo con objetivo, barra nueva y oclusión del puntero.
- `src/main.js` — oculta el guante en el mundo cuando se juega con teclado/pad.
- `src/menus.js` — pantalla de Controles nueva: 7 verbos × mando/teclado/mouse.
- `src/maps/house.js`, `attic.js`, `garage.js` — `low: true` en sofá, mesas, camas,
  sillas, sillones, mesa de luz y bancos de trabajo; además radio y parlante del altillo
  (son bajos y permiten alcanzar el estante izquierdo). Se borraron los `reach` 48/56.
- Tests actualizados: `interaction`, `extractor_reach`, `input`, `glyphs`,
  `actions_invariants`, `world_fixes`, `world_hints`, `result_screen`, `menus_ui`.
- `art/concept/auditoria_alcance.mjs` — reescrito a la regla nueva (usa los candidatos
  reales de la escena y sale con código ≠ 0 si hay fallos).

## 4. Objetos que fallaban y cómo quedaron

| Mapa / objeto | Antes | Ahora |
|---|---|---|
| `attic/shelf_left` (libros, frascos) | sin acceso: el radio y el parlante tapaban la fila 4 | radio/parlante `low`; acceso en la fila 5; los ítems apoyados heredan ese acceso |
| `house/window_living` | `reach: 48` | acceso de pared en la fila 3 y, por el sofá bajo, también la fila 5 (adelante del sofá) |
| `garage/extractor` | `reach: 56`, solo E | acceso de pared en el piso frente al portón (fila 3); E y click |
| `house/wall_clock` | sin acceso (zócalo en la fila 2) | el escaneo de pared baja hasta el piso del hall (fila 3) |
| `house/kid_drawing` | sin acceso (pared de frente) | escaneo de pared hasta el piso del cuarto (fila 11) |
| `street/ferreteria` | solo click | escaneo de pared hasta la vereda (fila 12); E y click |
| `street/caja_municiones` | solo click | mismo acceso de vereda (fila 12) |
| `house/wedding_photo` | podía tomarse de los dos lados de la pared | solo desde el dormitorio (fila 11), su lado real |
| `garage/garage_shelf` (casco) | solo E | acceso de fila 4; E y click |
| Todos los apoyados | se duplicaban con la caja del mueble | una sola entrada; prioridad 3 |

Resultado de la auditoría headless: **0 fallos** (attic 33/33, house 33/33, garage 12/12,
street 5/5 interactivos). El test `alcance_audit` recorre además el BFS desde el spawn:
ningún acceso quedó en una isla.

## 5. Tests cambiados y por qué

- `test/interaction.test.js` — se reescribieron los casos de `pickTarget`/`pickAt`: ya no
  miden píxeles de distancia sino casilleros de acceso y mirada. Se conservaron los tests
  puros (`tileOf`, `actionTile`, warps, magnet). Los casos del living ahora usan el mapa
  real de la casa.
- `test/extractor_reach.test.js` — el extractor ya no tiene `reach` propio: se verifica su
  acceso de pared y que lejos se pueda apuntar pero no llegar.
- `test/input.test.js` — Q ahora es Mirar y R no hace nada; la barra va con 1–8; el pad
  gana si está activo; se agregó el umbral de 4 px y la ventana del mouse.
- `test/glyphs.test.js` — glifos reales por dispositivo (E/Q/F/I, A/B/X/Y, mouse/mouse_r).
- `test/actions_invariants.test.js` — "Usar en mí" ya no acepta objetivos ni devuelve un
  "Usar" genérico; la pava al fuego se usa con la Acción (primary). Se ajustó el uso de
  `useLabel`.
- `test/world_fixes.test.js` — el click sobre el warp pasa el mapa (accesos) y la F con
  mate hace el uso propio, no saca la pava.
- `test/world_hints.test.js` — barra nueva: acción real, Mirar, uso propio opcional y
  Mochila; con mouse los hints son leyenda salvo Mochila.
- `test/result_screen.test.js` — el atlas falso suma los glifos de teclado que ahora usa
  la barra.
- `test/menus_ui.test.js` — tabla de Controles de tres dispositivos.
- Nuevos `test/controles.test.js` y `test/alcance_audit.test.js`.

## 6. Verificación

- `npm test`: **409 tests, 0 fallas**.
- `npm run build`: pasa (único aviso, el chunk > 500 kB de siempre).
- `node --check` sobre todos los archivos tocados: OK.
- Auditar con Vite en 5197:
  `URL=http://localhost:5197/ node art/concept/auditoria_alcance.mjs` → **0 fallos**.
- `URL=http://localhost:5197/ node art/direccion/capturas.mjs` → todas las capturas de
  dirección, **sin errores de página**.
- `URL=http://localhost:5197/ node art/direccion/capturas_ctrl.mjs` → 8 capturas, sin
  errores de página:
  - `ctrl_cursor_cerca.png` (radio, teclado)
  - `ctrl_cursor_lejos.png` (ventana, mouse lejos, ámbar)
  - `ctrl_cursor_apoyado.png` (naipes sobre la mesa de truco)
  - `ctrl_cursor_sofa_ventana.png` (ventana del living desde adelante del sofá)
  - `ctrl_barra_mouse.png`, `ctrl_barra_teclado.png`, `ctrl_barra_pad.png`
  - `ctrl_pantalla_controles.png`
- Prueba funcional en headless (sin ventanas): E abre el diálogo del radio, Q describe sin
  abrirlo, F sin ítem no hace nada, F con mate hace el uso propio, click izquierdo y
  derecho andan, el pad B mira, el secador se instala en el extractor, el casco se levanta
  del estante y la ventana del living abre la vista. Sin errores de página.
- El Vite de 5197 se cerró por PID (`ss -ltnp | grep ':5197 '` → 944546). No se tocó el
  de 5173.

## 7. Pendiente / notas

- No se movió ningún mueble para lograr accesos: los dos casos que no tenían salida se
  resolvieron marcando muebles bajos (radio y parlante del altillo), como permite la regla.
- Los apoyados agarrables conservan el brillito de "agarrable"; el cuadradito del mouse
  lejano queda ámbar fijo y sin latido.
- `useLabel()` quedó como helper interno (la barra ya no muestra el "Usar" genérico).
