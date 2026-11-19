# Brief v4 · Resultado (19/11)

Planta baja y casco: reempaquetado de hojas, living rearmado, entrada del garaje despejada y escalera
nueva de 32×64. **No se commiteó nada** y no se tocó `bocetos/` ni el arte de `art/sprites/` (solo se
leyó para empaquetar).

## 1. Hojas reempaquetadas (`npm run sprites:pack`)

- `public/assets/objects.png` pasó de **500×212 a 500×228** y `public/assets/objects.json` se
  reacomodó con estantes (cambian las coordenadas de todos los frames de la hoja). `stairs_attic`
  ahora es `[2, 84, 32, 64]`. `art/sprites/objects/_sheet.json` quedó con el layout nuevo.
- `public/assets/items.png` copió el casco nuevo: mide igual (128×85), no hizo falta reempaquetar.
- `python3 tools/sprites.py check`: **26 hojas OK**.
- El ancho de `objects.png` no cambió, así que el test que fija `500` en `test/assets.test.js`
  sigue pasando sin tocarlo.

## 2. Archivos cambiados

- `src/maps/house.js`
  - `SIZE.stairs_attic` → `[32, 64]`; `put('stairs_up', 'stairs_attic', 16, 80, …)` igual. El objeto
    queda en los tiles `y 1..4` (px 16..80): su parte de arriba llega al borde superior de la pared.
    Sigue `flat: true, solid: false`.
  - Warp `stairs_up` ampliado a `{ x: 16, y: 16, w: 32, h: 64 }` para que el hover/click tomen también
    la parte nueva de arriba. **La base no cambia** (`y + h = 80`) y los pies del jugador no pasan de
    `y = 54` (`bounds.minFeet`), así que el warp automático al pisarla se comporta igual que antes.
  - Sofá: `put('sofa', 'sofa', 88, 77, …)` (contra la pared del fondo, bajo la ventana, mirando a la
    mesa ratona). Mismo `solid` y mismo `interact`.
  - Rueda: `put('entry_tire', 'tire', 394, 142, …)`. Bidón: `put('bidon', 'bidon', 414, 141, {})`.
    Los dos al rincón de abajo a la derecha de la entrada, junto a la escoba y el balde.
  - Elena, la mesa ratona, los sillones y la radio no se movieron.
  - **Extra chico:** la ventana del living quedó justo arriba del sofá y desde el piso no entraba en
    el alcance de "Mirar" (el sofá se queda con el tile de acción). Le puse `reach: 48` al objeto
    `window_living`, igual que el extractor del garaje (`reach: 56`): así se mira desde el piso con el
    mouse. Detalle abajo, en "Problemas".
- `test/v4_layout.test.js` (**nuevo**, 3 tests): reconstruye la esquina inferior izquierda de cada
  sprite como lo hace `mapView` y verifica sofá `[88, 77]`, rueda `[394, 142]`, bidón `[414, 141]`,
  que el sofá conserva su `solid`/`interact`, que Elena y la mesa ratona no se movieron, que
  `stairs_attic` mide **32×64** en `objects.json`, que el objeto ocupa `y 1..4` y que el warp cubre
  la escalera entera con la base en 80. Además chequea que ningún sólido se meta en los vanos del
  hall (columnas 12 y 18) ni en el paso de la entrada al garaje.
- `art/direccion/DIRECCION.md` (3 líneas): la escalera figuraba como 32×48 y la entrada mencionaba
  solo el bidón. Ahora dice 32×64, sofá bajo la ventana y rueda+bidón al rincón. Nada más.
- Ningún test viejo fijaba estas posiciones (`pi_layout.test.js` solo chequea ids, textos y el
  `look` del warp), así que no hubo que actualizar valores esperados.

## 3. Tests y build

- `npm test`: **383 tests, 383 pass, 0 fail** (eran 380; +3 del test nuevo).
- `npm run build`: OK (`✓ 76 modules transformed`, `✓ built`). El aviso de chunk >500 kB es el de
  siempre. `node --check` sobre `src/maps/house.js` y el test nuevo: OK.

## 4. Capturas (Chromium headless, Vite en 5199)

- `node art/direccion/capturas.mjs`: 27 capturas OK (menú, altillo, casa, garaje, calle, apagón,
  diálogos, viñetas, HUD, cofre, arena, muerte, final) + "sin errores de página". Quedaron
  actualizadas en `art/direccion/doc/capturas/` (`esc_casa.png`, `esc_garage.png`,
  `luz_apagon_casa.png`, etc.).
- `node art/concept/capturas_planta.mjs`: `raw_house_v4_npc.png`, `raw_house_v4.png` y
  `raw_house_v4_prop.png` (1920×1080 = 480×270 ×4) + sus `.json` con la cámara, en
  `art/direccion/doc/capturas/`.
- Revisadas a ojo: la escalera nueva se dibuja entera (trampa con la luz del altillo, tapa con
  bisagras, largueros que se abren y peldaños), llega al borde de la pared y no tapa a Lucas parado
  adelante; el sofá queda bajo la ventana mirando la mesa y Elena sigue en el lado abierto de la
  alfombra; la rueda y el bidón quedan al rincón, dentro del ambiente, y el paso del hall al garaje
  queda libre de punta a punta.
- Chequeos extra con headless: el hover sobre la **parte de arriba** de la escalera devuelve
  `warp_stairs_up` (cerca) y el click ahí sube al altillo; el hover sobre la ventana del living
  desde el piso devuelve `window_living` con `near: true`.
- El Vite del 5199 se mató **por PID** (385406 y su padre 385390); el del 5173 no se tocó.

## 5. Problemas / cosas a saber

- **El sofá se queda con el tile de acción de la ventana.** Para el mouse no hay drama (con
  `reach: 48` la ventana se mira desde el piso), pero con joystick/teclado, parado frente al sofá, la
  acción principal es "Mirar el living" (el sofá está delante de la ventana: tiene sentido). Para
  mirar la calle con A/E hay que pararse **a un costado del sofá** (por ejemplo x≈152, fila de la
  pared) o usar el click derecho, que mira de lejos. No cambié el plano por esto.
- **`solid` del sofá vs. sprite:** el sprite arranca en x=88 (media tile) y el `solid` va por tiles
  (96..144), así que sobran 8 px de colisión a la derecha y faltan 8 px abajo el brazo izquierdo.
  Es la misma clase de desfasaje que ya tenían los demás muebles y no bloquea ningún paso.
- **Rueda:** el sprite cae en 394..410 y su `solid` (1 tile) en 400..416; el desfase es de 6 px y no
  molesta porque está en el rincón. El bidón no tiene sólido (como antes).
- **Verificación de pasos:** además del test, corrí un BFS sobre la caja de pies (10×6, paso de 2 px)
  con los sólidos del piso y de los objetos. Llegan: el pie de la escalera, los dos vanos del hall,
  el paso al garaje y la puerta del garaje, los cuatro lados de la mesa ratona, la alfombra, la
  cocina y el cuarto de Martita. Nada bloqueado.
- **Láminas de concepto:** no corrí `art/concept/planta_v4.py`. Las láminas de `out/`
  (`house_v4_detalles.png`, `hv4_escalera_x10.png`, `casco_v2.png`) son la propuesta "antes /
  después" y siguen sirviendo; si se regeneran ahora, el "Hoy" ya sale con el plano nuevo y la
  comparación pierde sentido.
- En `planta_v4.py`/`capturas_planta.mjs` el paso que mueve las mallas del sofá, la rueda y el bidón
  ahora es un no-op (el juego ya los tiene ahí) y el que oculta la escalera vieja ya no oculta nada:
  quedan como documentación de la propuesta, no rompen las capturas.
- Quedan sin tocar el **tablero de pendientes** (filas 1 a 4, que ya entraron al juego) y la lista
  **Pendiente** de Escenarios ("Living…", "Garaje-entrada…", "Redibujar la escalera…"): los dejé como
  estaban para que los cierre el director de arte. El único cambio en `DIRECCION.md` son las dos
  líneas descriptivas de arriba.
