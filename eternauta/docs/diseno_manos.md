# Diseño técnico · Manos: agarrar, dejar y mover (19/11)

> **Actualizado el 19/11 por `docs/brief_dos_botones.md`:** quedan dos botones (Hacer y Manos), Mirar deja de ser
> botón y Manos pasa del RT a la **X** del joystick. Resultado: `docs/brief_dos_botones_resultado.md`.

Diseño de juego aprobado: `art/direccion/DIRECCION.md` → "Controles e interacción" → **"Manos"**.
Lámina: `art/concept/out/manos.png` (fuente `art/concept/manos.py`).
Se apoya en: alcance por casilleros (`src/reach.js`), tipos de objeto (`src/data/types.js`, tanda "tipos").

## 1. Verbos y entradas (final)

**Dos formas de jugar: mouse + teclado, o joystick.** No hay modo "solo teclado": el teclado acompaña al mouse.

| Verbo | Mouse + teclado | Joystick |
|---|---|---|
| Hacer | click izq. | A (botón 0) |
| Manos | click der. | X (botón 2, con flanco) |
| Mover | WASD / flechas | stick / cruceta |
| Elegir ítem | rueda, 1 a 8, click en la barra (solo elige) | LB / RB |
| Mochila | I, Tab, click en "Mochila" | Y |
| Menú | Esc | Start |

**Se borran**: E, Espacio y Enter como Hacer en el mundo, R, F, el RT (7), el modo `item` / "Usar en mí", el click en
la barra que usaba el ítem, `ACTIONS.use/self/look`, la fila "Usar en mí" de Controles, el click derecho = Mirar y la Q.
**Se borra el dispositivo `keyboard`** de `deviceAfter` y de los glifos: hay `mouse` (glifos de mouse + `key_i`, `key_esc`)
y `pad`. Tocar el teclado (caminar con WASD, I) no saca el modo mouse. En menús y diálogos el teclado sigue navegando
(flechas + Enter/Espacio para elegir, Esc para volver) y la B del joystick es Volver.

## 2. Hacer con uso propio

`resolveAction(ctx, target, heldId)`:
1. Hay objetivo → uso del ítem sobre el objetivo (`ITEM_USES`) si aplica; si no, verbo del tipo.
2. No hay objetivo (nada en el tile de acción / el puntero no está sobre nada), **o** el puntero está sobre Juan
   (caja del sprite del jugador) → uso propio del ítem de la mano (`SELF_USES`). Si no tiene uso propio → `null`
   (la barra no muestra Hacer; apretar no hace nada).
3. Al pasar el mouse sobre Juan con un ítem con uso propio: cuadradito sobre Juan y barra `[click] Tomar mate`.

## 3. Modelo de cosas en el mundo

Estado **por partida** (no por escena), en `game.world[mapId]`, creado desde `INITIAL_ITEMS` la primera vez que se entra
al mapa y borrado en `reset()`:

```js
game.world[mapId] = {
  items: [ { uid, itemId, count, place } ],      // place: ver abajo
  moved: { [objectId]: { tx, ty } },             // muebles livianos movidos
};
// place:
{ kind: 'surface', objectId, slot }              // como hoy
{ kind: 'floor', tx, ty }                        // NUEVO: un casillero del piso
// (los contenedores siguen con su panel y su estado actual)
```

- `SurfaceLayer` pasa a leer/escribir `game.world[mapId].items` (hoy arma `itemsForMap(INITIAL_ITEMS)` en `reset()`).
- **Piso:** se dibuja con `createItemVisual` (`src/worldItems.js`): ícono apoyado con la base en `ty*16+14`, centrado en
  `tx*16+8`, sombra de 1 px y brillito si es agarrable. Profundidad por su `y` (como todo). **No hay imán**: se borra el
  uso de `Pickup` para cosas dejadas (la clase puede quedar si algo más la usa; hoy todos los mapas tienen `pickups: []`).
- Candidato: `type: 'thing'`, una entrada por cosa, huella = su casillero, accesos = **su propio casillero y** los vecinos
  caminables (una cosa en el piso **no es sólida**: se puede caminar por encima, y parado encima también se agarra).
- Una cosa por casillero; si se deja una cosa apilable (`stack: true`) sobre otra igual, se suma `count`.

## 4. Manos: qué hace según el contexto

Orden de decisión (una sola función `resolveHands(ctx, aim, heldId, carry)` en `src/actions.js`, pura y testeable):

1. **Llevando un mueble** (`carry`) → `Apoyar <name>` si el lugar apuntado es válido para muebles (§6); si no, nada.
   Hacer hace lo mismo mientras se lleva un mueble (las manos están ocupadas: no hay otra acción posible salvo
   hablar con una persona, que sigue andando).
2. **Apuntando a una cosa agarrable** (thing con `isGrabbable`) → `Agarrar <name>` (a la mochila). Mochila llena →
   aviso "La mochila está llena." y la cosa queda.
3. **Apuntando a un mueble liviano** (`movable: true`, §7) sin nada encima → `Levantar <name>`.
4. **Ítem en la mano** + lugar apuntado válido (§5) → `Dejar <nombre del ítem>`.
5. Si no → `null` (sin entrada en la barra).

"Apuntado" = con joystick, el tile de acción (adelante de Juan); con mouse, el objeto bajo el puntero y, si no hay
objeto, el casillero bajo el puntero. Con mouse lejos (fuera de alcance) → cursor `far` + "Acercate un poco." como hoy.

## 5. Dónde se puede dejar una cosa chica

- **Mueble con `surface`** apuntado: el slot libre más cercano al puntero (mouse) o a Juan (joystick). Sin slot libre
  → inválido.
- **Piso:** el casillero apuntado tiene que ser: caminable (no `solid`, no tile sólido), sin objeto con huella ahí, sin
  warp, sin NPC ni Juan encima, sin otra cosa (salvo la misma apilable), y **un acceso de Juan** (vecino de su casillero,
  4 direcciones; con joystick es el tile de acción). Así nunca queda donde no se alcanza.
- Inválido con mouse → silueta rojiza (§8) y etiqueta "No entra ahí."; con joystick la barra simplemente no ofrece Dejar.

## 6. Dónde se puede apoyar un mueble liviano

Como el piso de §5, más:
- el mueble ocupa su huella completa (todos sus casilleros) y **es sólido**;
- **chequeo de alcance**: con el mueble puesto, recalcular con `reach.js` y BFS desde Juan: todos los interactivos del mapa
  conservan al menos un acceso alcanzable y todos los warps siguen alcanzables. Si algo se pierde → inválido
  ("Taparía el paso."). Cachear por casillero mientras no cambie nada (recalcular solo al cambiar el casillero apuntado).

## 7. Muebles livianos (`movable: true`)

Lista cerrada (solo estos; nada que use la historia ni tenga cosas encima):
- altillo: `crate`, `box`, `suitcase`, `crate_stairs`, `box_stairs`
- casa: `kchair_l`, `kchair_r`, `entry_tire`, `entry_bucket`, `kitchen_bucket`, `bidon`, `toy_horse`
- garaje: `stool`, `garage_crate`, `garage_box`, `garage_box2`, `garage_cardboard`, `tire`
- **No**: sillas del truco (`chair_fav/pol/luc/juan`, las usan los NPC y la historia), el `bidon` del garaje (tiene la
  nafta encima), nada de la calle.

Cargar:
- `game.carry = { mapId, objectId }`; el objeto sale del mapa (malla oculta, sus sólidos y su huella se quitan, caché de
  `reach.js` invalidada). No ocupa lugar en la mochila; no se puede cambiar de mapa cargándolo (el warp avisa
  "Primero apoyá <name>.").
- Se dibuja **sobre la cabeza** de Juan: base del sprite en `pies − 26`, centrado en `x`, con un bamboleo de 1 px al
  caminar; profundidad = la de Juan + 0.001. Velocidad ×0.8.
- Mientras carga: no se agarra ni se deja nada más; la Mochila sí se abre; hablar con personas sí.
- **Si la historia saca a Juan del lugar** (cambio de mapa forzado, viñeta, muerte) mientras carga: el mueble se apoya
  solo en el casillero válido más cercano a Juan; si no hay ninguno, vuelve a su lugar original.
- Apoyar: el objeto vuelve al mapa en el casillero elegido (`game.world[mapId].moved[objectId] = {tx, ty}`), se rearman
  sólidos y huellas, se invalida la caché de alcance.

## 8. Lo que se ve (ver lámina)

- **Silueta válida:** el sprite de la cosa (o del mueble) al **55 %** de opacidad, en su posición exacta final, con el
  cuadradito alrededor del casillero (o del slot) en dorado.
- **Silueta inválida (solo mouse):** el sprite al 45 % teñido `#f09a7a` (55 % de mezcla), **sin** cuadradito, y la etiqueta
  "No entra ahí." o "Taparía el paso." en `#f09a7a` encima.
- **Cosa en el piso:** sombra de 1 px, brillito de agarrable (el mismo de las superficies).
- **Cargando:** mueble sobre la cabeza.
- Barra: `[Hacer] … · [Manos] Agarrar Mate / Dejar Mate / Levantar la silla / Apoyar la silla · [I] Mochila`
  (nunca una entrada Mirar aparte; Manos solo si `resolveHands` devuelve algo).

## 9. Historia: casos a cuidar

- La **pava en la cocina**: es una cosa sobre el fuego. Manos sobre ella = `Agarrar la pava` (reemplaza "Sacar la pava" de
  Hacer del aparato). Hacer sobre la cocina con la pava en la mano = "Poner la pava al fuego" (sin cambios).
- **Objetivos** que cuentan ítems siguen mirando la mochila. Dejar el casco en el piso no rompe nada: se vuelve a agarrar.
- **Mate**: el ciclo (yerba → cebar → tomar → lavar) sigue con Hacer (uso propio sin objetivo, o sobre la pava/pileta).
- **Truco / sentarse** y diálogos: sin cambios.

## 10. Tests

- `resolveHands`: los 5 casos de §4 + mochila llena + cargando.
- Validez de piso (§5) y de mueble (§6), incluido "taparía el paso" con un caso real (silla de la cocina en el vano de la
  puerta) y uno válido.
- Persistencia: dejar en la casa, ir al garaje y volver → sigue ahí; `reset()` lo borra.
- Apilar en el piso; agarrar del piso; dejar en un mueble en el slot más cercano.
- Entradas: X / click der. = Manos; E, R, F, Q y RT no hacen nada en el mundo; click sobre Juan = uso propio;
  no existe el dispositivo `keyboard` (WASD no cambia el modo mouse); menús y diálogos siguen andando con flechas/Enter/Esc.
- Barra: entradas por contexto (con y sin ítem, cargando un mueble, sobre la pava).
- Auditoría de alcance en 0 fallos, también después de mover cada mueble liviano a un lugar válido de prueba.

## 11. Revisión del diseño (19/11)

Problemas encontrados al revisar y cómo quedaron resueltos arriba:

1. **No se podía agarrar una cosa estando parado encima** (sus accesos eran solo los vecinos) → el casillero propio
   también es acceso (§3).
2. **Cutscenes cargando un mueble** (la historia cambia de mapa o abre una viñeta) → el mueble se apoya solo o vuelve a
   su lugar (§7).
3. **Etiqueta de nombre al dejar el mouse quieto:** repetía la etiqueta flotante que el juego ya muestra sobre el
   objetivo → se saca; en los decorados Hacer ya es Mirar (§1, §8).
4. **Con joystick, apuntando a una mesa que tiene una cosa adelante, Manos agarra en vez de dejar:** es lo correcto
   según el orden de §4 (lo apuntado manda) y la barra siempre dice qué va a pasar. Para dejar en esa mesa, mirar una
   parte libre de la mesa. Se acepta y se testea que la barra lo anuncie.
5. **Hacer sin objetivo = uso propio:** con joystick se puede tomar mate o ponerse el traje "sin querer" apretando A en el aire (con mouse hay que clickear sobre Juan).
   Se acepta porque la barra lo anuncia (`[A] Tomar mate`) y nada de eso es irreversible (el traje se saca igual).
6. **El balde de la cocina se mueve y además sirve para "Tirar la yerba":** sigue siendo interactivo donde quede
   (el uso se resuelve por id, no por posición). Testear tirar la yerba después de moverlo.
7. **Sin modo "solo teclado"** (decisión del usuario, 19/11): mouse y teclado son complementarios. Con mouse, el teclado
   camina, mira (Q), abre la mochila y elige ítems; todas las acciones con el mundo son con el mouse. Sin mouse, joystick.
