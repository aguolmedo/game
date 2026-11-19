# Brief · Controles e interacción unificados (19/11, aprobado)

Repo: `/home/mateyfasito/dev/game/eternauta` (Three.js + Vite; UI en canvas 1x 480×270).
**Diseño aprobado:** `art/direccion/DIRECCION.md`, sección **"Controles e interacción"**. Leela entera: es la especificación.
Reemplaza a `docs/brief_alcance.md` (no implementar ese). Corre después de `docs/brief_pulido.md` (leé su resultado,
`docs/brief_pulido_resultado.md`, para saber qué cambió en `src/interaction.js` y `src/menus.js`).

No tocar `bocetos/` ni dibujar arte (los glifos que hacen falta ya existen en `public/assets/buttons.json`:
`key_e key_f key_i key_q key_esc key_tab mouse mouse_r a b x y lb rb start`). No tocar el Vite del 5173.

Código actual relevante: `src/input.js` (teclas, pad, `deviceAfter`), `src/glyphs.js` (`ACTIONS`, `glyphName`),
`src/actions.js` (`resolveAction` con modos `primary` / `item` / `look`), `src/interaction.js` (`pickTarget`, `pickAt`,
`candidateBox`, `visualBox`, `candidateReach`), `src/scenes/world.js` (`candidates()`, `update` ~l.500–575,
`updateMouseTarget`, `setHover`, `updateCursor`, `handleMouseClick`, `handleRightClick`, `useSelected`, `runAction`,
`hudParams`), `src/cursor.js` (`ActionCursor`), `src/maps/*.js` (objetos con `reach`, `solid`, `interact`),
`src/surfaces.js` (ítems apoyados, `cursorBox`), menú de Controles en `src/menus.js`.

## 1. Tres verbos, uno por botón

| Verbo | Mouse | Teclado | Joystick |
|---|---|---|---|
| Acción (modo `primary`: incluye usar el ítem de la mano SOBRE el objetivo) | click izq. | E, Espacio, Enter | A |
| Mirar (modo `look`, sin alcance) | click der. | **Q** | **B** en el mundo (en menús/diálogos B sigue siendo Volver) |
| Usar en mí (solo usos propios del ítem: `SELF_USES`) | click en el ítem ya elegido de la barra | F | X |
| Mochila | click en "Mochila" | I, Tab | Y |
| Barra de ítems | rueda, click | 1–8 (Q/R ya no mueven la barra) | LB / RB |
| Menú | — | Esc | Start |

- Acción y Usar en mí no se pisan: lo que se hace con el mundo es Acción; Usar en mí nunca actúa sobre el objetivo.
  **Compatibilidad:** si se aprieta F/X sin uso propio y hay objetivo alcanzable, hace la Acción (no "No tenés nada en la mano").
  Sin ítem en la mano, F/X no hace nada (sin aviso).
- Q = Mirar con teclado (sacar Q de `PREV_HOTBAR_KEYS`; R queda libre). B = Mirar en el mundo con pad.

## 2. Alcance por casilleros de acceso (regla única)

Una sola función (p. ej. `accessTiles(obj)` + `canReach(player, target)`) usada por la E/A, el click y el cuadradito:
1. **Huella** en la grilla de 16 px: muebles = tiles que pisan (derivar del `solid` o de la caja de interacción);
   objetos de pared (ventana, estante, cuadro, extractor, carteles de la calle como la ferretería) = la fila de pared donde
   cuelgan.
2. **Accesos** = tiles de piso caminables adyacentes (4 vecinos) a la huella; en pared, el tile de piso debajo.
3. Se alcanza si el jugador (tile de sus pies) está en un acceso. E/A además exige **mirar hacia** la huella (el tile de
   acción cae en la huella, o la huella está en la dirección de `dir`). Click: alcanza con estar en el acceso y Juan se
   da vuelta (`faceTarget`). Lejos: cursor `far` + "Acercate un poco." (como hoy, sin caminar solo).
4. **Lo apoyado** (ítems de `surfaces.js`) se alcanza desde los accesos del mueble que lo sostiene.
5. **Muebles bajos** (marcar en los mapas `low: true`: sofá, mesa ratona, mesas, camas, bancos, mesa de luz) no tapan:
   un acceso puede estar del otro lado de un mueble bajo, a 1 tile de distancia (ej.: la ventana del living se alcanza
   desde el piso de adelante del sofá). Muebles altos (alacena, ropero, biblioteca, estantes) sí tapan.
6. **Borrar los `reach` por objeto** (ventana del living 48, extractor 56, etc.) y la doble medida 22/28.
7. **Prioridad única** para superpuestos: apoyado > NPC > mueble > warp; entre iguales, el más chico; misma en todas las vías.
8. Sin duplicados: cada objeto aparece **una sola vez** en `candidates()` (hoy los ítems apoyados se repiten con la caja
   del mueble, ~línea 330 de `world.js`).
9. NPCs: su huella es el tile de sus pies; la E nunca elige algo que queda a la espalda.

## 3. El cuadradito (`src/cursor.js` + `updateCursor`)

- Solo visible si hay un objetivo con acción; **nunca** sobre piso/pared vacíos (borrar el fallback a `actionBox`).
- Enmarca la caja de **dibujo** del objetivo recortada a los píxeles opacos del sprite (calcular una vez por frame de
  sprite y cachear), con 1 px de aire.
- Mismo objetivo que la acción y que el texto de la barra.
- Al cambiar de objetivo, los corchetes se deslizan ~80 ms (interpolación de caja); al aparecer, "pop" de 3 px hacia adentro
  en ~100 ms; al desaparecer, se apagan sin saltar.
- Histéresis: mientras el jugador siga en un acceso del objetivo actual, no cambia a otro salvo que lo mire de frente.
- Cerca: dorado y latiendo (como hoy). Lejos (mouse): ámbar tenue y **sin latido**. Mantener el brillito de "agarrable".

## 4. Barra de acciones y dispositivos

- `deviceAfter`: tres dispositivos `mouse` / `keyboard` / `pad`. El mouse toma el control solo si se mueve > 4 px de
  pantalla (o hace click). WASD + mouse juntos no cambian de modo a cada rato: moverse con teclado no saca el modo mouse
  si el puntero se movió hace menos de ~1 s y está sobre el canvas.
- Al pasar a teclado/pad: ocultar el puntero/hover y el cuadradito vuelve al objetivo de adelante.
- Barra (`hudParams` / `ACTIONS` / `glyphName`): glifos del dispositivo actual, **sin** mouse cuando se juega con teclado:
  - mouse: `[mouse] <acción> · [mouse_r] Mirar`
  - teclado: `[key_e] <acción> · [key_q] Mirar`
  - pad: `[a] <acción> · [b] Mirar`
  - más `· [key_f / x / mouse en barra] <uso propio>` solo si el ítem de la mano tiene uso propio (ej. "Tomar mate"),
    y siempre `· [key_i / y / mouse] Mochila`.
  - El texto de la acción es el real ("Agarrar Lata para el filtro", "Hablar con Favalli"), nunca un "Usar" genérico.
- Pad: mapeo estándar; si `pad.mapping !== 'standard'`, usar igual A=0 B=1 X=2 Y=3 LB=4 RB=5 Start=9 y no romper.
- Actualizar la pantalla de **Controles** (`src/menus.js`) con la tabla nueva para los tres dispositivos.

## 5. Tests y auditoría

- `test/controles.test.js`: mapeo de teclas/botones → verbos (Q mira, R no hace nada, F sin uso propio con objetivo =
  Acción, B en el mundo mira y en diálogos vuelve), `glyphName` por dispositivo, `deviceAfter` con umbral del mouse.
- `test/alcance_audit.test.js`: recorre **todos los mapas** (`src/maps/*.js`) y verifica que cada interactivo tiene al
  menos un acceso caminable, que E (mirando) y click dan el mismo resultado desde cada acceso, y casos fijos:
  ventana del living desde adelante del sofá; frente al sofá mirando arriba nunca elige la mesa de atrás; estante
  izquierdo del altillo (libros, frascos), casco en el estante del garaje, extractor y ferretería alcanzables con las dos vías.
- Script headless de referencia con los fallos actuales: `art/concept/auditoria_alcance.mjs` (adaptarlo a la regla nueva
  y que imprima 0 fallos). Si un objeto no tiene acceso sin mover muebles, **no moverlo**: listarlo en el resultado.
- Actualizar los tests existentes que fijen el comportamiento viejo (explicar cada cambio en el resultado).

## Verificación

- `npm run build` y `npm test` sin errores.
- Headless (NO abrir ventanas) con `npx vite --port 5197 --strictPort` en background: correr la auditoría y
  `URL=http://localhost:5197/ node art/direccion/capturas.mjs`; sacar capturas del cuadradito (cerca, lejos, sobre un ítem
  apoyado, frente al sofá con la ventana) en `art/direccion/doc/capturas/ctrl_*.png` y de la barra con los tres dispositivos.
- Al terminar, matar SOLO ese Vite por PID (`ss -ltnp | grep ':5197 '`), nunca `pkill -f`.

## Resultado

`docs/brief_controles_resultado.md`: archivos cambiados, tabla de objetos que fallaban y cómo quedaron, tests cambiados y
por qué, build/tests, capturas. No commitear.
