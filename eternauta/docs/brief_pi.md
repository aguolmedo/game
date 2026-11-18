# Brief para el LEAD: implementar "Por implementar" (dirección de arte, 18/11)

Fuente de verdad del diseño: `art/direccion/DIRECCION.md`, sección **Por implementar** (PI-1 a PI-9).
Este brief lo baja a tareas concretas. **Si algo de acá choca con `.dsagent.md`, manda este brief**
(por ejemplo: el traje NO es un casco redondo de buzo, es el diseño de PI-3).

**NO implementar PI-8 (logo del menú inicial): no está aprobado. No tocar el título.**

## Reglas de este trabajo (leer antes de empezar)

1. **El arte ya está hecho. NO redibujar nada, NO generar sprites nuevos.** Todos los PNG finales están en
   `art/concept/out/pi/`, con la misma estructura que `art/sprites/<hoja>/`. Se copian y se corre
   `npm run sprites:pack`. Si un PNG "parece raro", igual se usa tal cual.
2. Las imágenes de referencia (cómo tiene que verse) están en `art/concept/out/`: cada tarea dice cuál.
   Mirarlas. El resultado en el juego tiene que parecerse a esa imagen.
3. Coordenadas: **mapa/mundo en px** (16 px = 1 baldosa), salvo que diga "vista" (480×270).
   `put(id, sprite, izquierda, base)` = esquina **inferior izquierda** en px de mapa, como en `src/maps/house.js`.
4. Verificar SIEMPRE: `npm run build` sin errores, `npm test` (hoy pasan 370; no romper ninguno; se pueden
   agregar), y **capturas headless** (ver `.dsagent.md` y el ejemplo `art/direccion/capturas.mjs`).
   Guardar las capturas finales en `art/direccion/doc/capturas/pi_<n>_*.png`.
5. No commitear. No tocar `bocetos/`. No borrar archivos de `art/concept/`.
6. Un coder por tarea cuando los archivos no se pisan (ver "Orden y paralelismo" al final).

---

## PI-3 · Juan con traje (solo arte, empezar por acá)
- Copiar `art/concept/out/pi/chars2/juan_suit/*.png` → `art/sprites/chars2/juan_suit/` (pisa los 32 cuadros).
- Copiar `art/concept/out/pi/chars2/juan_suit_rifle/*.png` → `art/sprites/chars2/juan_suit_rifle/`.
- `npm run sprites:pack chars2`.
- Referencia: `art/concept/out/suit_unify_lamina.png` (fila "unificado") y `suit_unify_caminata.gif`.
- Listo cuando: captura en la calle con el traje (frente) muestra la cara de Juan dentro de la visera, la
  costura punteada y el parche en la capucha.

## PI-5 · HUD: glifo de click derecho + avisos abajo a la izquierda + inventario al borde
Arte: copiar `art/concept/out/pi/buttons/mouse_r.png` → `art/sprites/buttons/mouse_r.png`; `npm run sprites:pack buttons`.
1. **Glifo:** en la barra de acciones (hint bar del HUD), con mouse, la acción "Mirar" (click derecho) usa el
   glifo `mouse_r` y el texto **"Mirar"** (hoy dice "Click der. Mirar" con el glifo `mouse`). "Usar" y
   "Mochila" siguen con `mouse`. Buscar dónde se arma ese texto (`src/hud.js` / `src/actions.js` / prompts).
2. **Inventario (barra de 8 casilleros) pegado al borde de abajo:** su borde inferior queda en y = 270
   (vista). La barra de acciones queda justo arriba, como hoy relativo a la barra.
3. **Avisos (toasts, `game.showToast`)** se dibujan **abajo a la izquierda, apilados**: x = 6 (vista), el más
   nuevo abajo con su borde inferior a la altura del borde inferior del inventario; cada aviso anterior
   14 px más arriba; máximo 3; los anteriores al 60% de opacidad; se desvanecen solos (~2,5 s). El objetivo
   queda solo arriba a la izquierda.
- Referencia: `art/concept/out/hud_aviso_B.png` y `house_v3_martita.png` (inventario al borde).

## PI-4 · En el combate no hay guante, solo la mira (`src/scenes/arena.js`, `src/mouseCursor.js`)
1. `MouseCursor`: agregar `setHidden(on)` → `canvas.style.cursor = 'none'` mientras está oculto; al
   mostrar vuelve el cursor actual (re-aplicar el css guardado).
2. Al entrar a la arena: `game.mouseCursor.setHidden(true)`. Al salir (muerte, final, menú, título):
   `setHidden(false)`. Revisar todas las salidas.
3. `drawCrosshair` (arena.js ~línea 1071): si `input.device === 'mouse'` y hay puntero, la mira se dibuja
   **en la posición del puntero** (convertida a la vista 480×270, la misma conversión que usa el
   apuntado). Con joystick, como hoy (a 24 px del jugador). No cambiar el dibujo de la mira.
- Listo cuando: en la arena con mouse no se ve el guante ni al hacer click, y la mira sigue al puntero.

## PI-2 · Retratos de diálogo = cabezas de los sprites (`src/dialog.js`, `src/data/portraits.js`)
- Para cada personaje que habla, el retrato se arma **desde `chars2`**: cuadro de reposo mirando abajo
  (columna 6 = `quieto_1`, fila 0 = abajo) de su bloque.
  - Recorte: 16 px de ancho, desde (fila del primer pixel opaco − 1) hasta 21 filas.
  - **Diálogo (caja de 64×64):** fondo `#2a2236`, el recorte agrandado ×3 sin suavizar (48×63), centrado en
    x y apoyado abajo (x+8, y+1).
  - **Panel (32×32):** mismo recorte a 1x, centrado y apoyado abajo.
- **Excepción, Juan con traje:** en el DIÁLOGO usa el retrato de siempre de `portraits_dlg`
  (`juan_suit`; con rifle `juan_rifle`). En el panel usa la cabeza del sprite como los demás.
- Mapear id de retrato → id de `chars2` (juan, favalli, lucas, polsky, polsky_coat, elena, martita,
  juan_suit, juan_suit_rifle). Las viñetas (`src/comic.js`) NO se tocan.
- Referencia: `art/concept/out/pi2_retratos_cabezas.png`, fila **B**.
- Listo cuando: captura del diálogo con Favalli y con Lucas como la referencia B.

## PI-9 · Marco de la vista por la ventana del altillo (`src/scenes/view.js`)
Arte: crear `art/sprites/views/attic_frame/attic_frame.png` copiando `art/concept/out/pi/views/attic_frame.png`
y un `_sheet.json` igual al de `art/sprites/views/attic_pan/_sheet.json` pero con size `[480, 270]` y layout
`{"attic_frame": [0,0,480,270]}`. `npm run sprites:pack views/attic_frame` (si el pack no la toma, copiarla
también a `public/assets/views/attic_frame.png`). Cargarla en `src/assets.js` como las otras vistas.
1. En `view.js` (modo 'attic'): **reemplazar `drawFrame` por dibujar la imagen `attic_frame` encima** del
   panorama y de los copos (el vidrio de la imagen es transparente, con escarcha y reflejos semitransparentes).
2. `GLASS = { x: 36, y: 24, w: 408, h: 199 }` (lo dice `art/concept/out/pi/views/attic_frame.json`).
   Los copos nacen y viven dentro de ese rect.
- Referencia: `art/concept/out/vista.png` / `vista.gif`.

## PI-7 · La nevada (`src/snow.js`)
Arte: crear la hoja de imagen o atlas `snow_flakes` con los 6 PNG de `art/concept/out/pi/snow_flakes/`
(`back_on/off` 1×1, `mid_on` 7×7 / `mid_off` 3×3, `front_on` 12×12 / `front_off` 6×6). Lo más simple:
cargarlos como texturas sueltas desde `public/assets/snow_flakes/` (copiarlos ahí) en `src/assets.js`.
Reescribir `Snowfall` (misma API: constructor, `setCamera`, `syncViewSize`, `scatter`, `update`, `draw`):
1. **Tres capas, tamaño REAL** (el plano mide lo mismo que la textura en px de mundo; hoy el bug es un
   plano de 2×2 con una textura de 3×3), **opacidad 1**, `transparent: true`, `alphaTest: 0.01`,
   `NearestFilter`, posiciones redondeadas a px enteros:
   - atrás: 90 copos `back`, 8–16 px/s
   - medio: 45 copos `mid`, 18–30 px/s
   - adelante: 12 copos `front`, 40–60 px/s (z por encima de las otras)
2. **Fosforescencia:** cada copo tiene fase `ph` y ritmo `blink` aleatorio en [0,9 … 2,2] rad/s;
   `b = 0.5 + 0.5*sin(t*blink + ph*3)`; si `b > 0.55` usa la textura `_on`, si no `_off`. Al cambiar de
   textura, mantener el CENTRO del copo en el mismo lugar (las `_on` tienen el halo alrededor: 2 px el medio,
   3 px el de adelante).
3. Mantener ráfagas de viento y vaivén como hoy.
- Referencia: `art/concept/out/nieve_noche.gif` (de noche) y `nieve_compare.gif`. Fuente del diseño:
  `art/concept/nieve.py` (`draw_night`).
- Listo cuando: en la calle los copos se ven claramente sobre la nieve y titilan.

## PI-6 · Planta baja (`src/maps/house.js`, mapa `house` 28×16 baldosas)
Arte: copiar todo `art/concept/out/pi/objects/*.png` → `art/sprites/objects/`; `npm run sprites:pack objects`.
Agregar los tamaños nuevos a `SIZE` en `house.js`. Cambios (coordenadas de mapa, `put(id, sprite, izq, base)`):
| Qué | Cómo |
|---|---|
| Escalera | `stairs_up` → sprite **`stairs_attic`** (32×48), mismo `put(16, 80)`. El warp `stairs_up` no cambia. Texto de "Mirar": la escalera rebatible que sube al altillo. |
| Ventana interior de Martita | **sacar** el objeto `window_martita` de (192, 176). En su lugar: `put('kid_drawing', 'kid_drawing', 200, 164)`, decorativo con "Mirar" (dibujo de Martita con crayón). |
| Pared trasera | en la fila 15 (y 240–255), de x = 16 a 431: el sprite `back_wall` (16×16) repetido, una baldosa por objeto (o como baldosa del piso si es más simple), sólido. |
| Ventana de Martita (la del objetivo) | objeto `window_martita` con sprite **`window_back`** (32×16) en `put(192, 256)`; mantiene `window: { view: null, openable: true }` y la interacción "Cerrar la ventana". Actualizar `windows[]`: `{ id: 'window_martita', x: 208, y: 248, view: null, openable: true }`. **Mientras está abierta** (flag `closed_window_martita` falso) se dibuja `snow_drift` (27×5) en `put(194, 240)` (no sólido). Al cerrarla, desaparece. El objetivo tiene que seguir funcionando (`src/story.js` ~144 y ~320, `src/objectives.js`). |
| Cuna | **sacar** `crib`. `put('kid_bed', 'kid_bed', 164, 214)`, sólido abajo. |
| Cajón de Martita | **sacar** `martita_crate`. |
| Cocina | `alacena` pasa de (276, 192) a **(342, 192)** (mantiene su contenedor). `put('sink', 'sink', 274, 192)` con "Mirar". Sillas: `put('kchair_l', 'chair', 320, 224)` y `put('kchair_r', 'chair_r', 384, 224)`, no sólidas. La puerta de la cocina (x 320–335, filas 9–10) tiene que quedar libre. |
| Dormitorio | `put('wedding_photo', 'wedding_photo', 30, 162)` decorativo con "Mirar" (foto de casamiento de Juan y Elena). |
| Garaje-entrada | `put('broom_bucket', 'broom_bucket', 410, 112)` y `put('bidon', 'bidon', 308, 112)` (hoja interior2, ya existen). |
| Cámara | en este mapa la cámara puede bajar **17 px de mundo más allá del borde de abajo** del mapa (afuera se ve negro/noche), para que la pared trasera y la ventana queden arriba del HUD. Ver `cameraFor` en `src/mapView.js:200`; hacerlo con un margen por mapa (p. ej. `camBottomPad: 17` en el mapa de la casa). |
Los textos de "Mirar" van en `src/data/script.js` / `descriptions.js` (mismo estilo que los existentes, castellano rioplatense, cortos).
- Referencias: `art/concept/out/house_v3.png` (plano entero, sin zoom) y `house_v3_martita.png` (jugando).
  Coordenadas exactas en `art/concept/house_v3.py` → `build_full()`.
- Listo cuando: captura del plano igual a `house_v3.png`, captura con Juan en el cuarto de Martita igual a
  `house_v3_martita.png`, y el objetivo de cerrar la ventana anda (test).

## PI-1 · Luz del apagón (`src/lighting.js` + escenas) — la más difícil, dejarla para el final
Referencias: `art/concept/out/light3_altillo_pucho.gif`, `light3_altillo_pucho_pitada.png`,
`light3_casa.gif`, `light3_calle.gif`, `light_flicker.gif`. **El algoritmo de referencia está en Python y
hay que portarlo:** `art/concept/lighting2.py` (`night`, `band`, constantes) y `art/concept/lighting3.py`
(`relight`, `flame`, `ember`, `smoke`). Leerlos completos.

**Cómo implementarlo:** hoy es un canvas 2D con un velo encima (`LightOverlay`), que no puede multiplicar
colores. Hacerlo como **post-proceso**: renderizar la escena del mundo a un `WebGLRenderTarget` y dibujarla
con un quad de pantalla completa con `ShaderMaterial` (después va el HUD, que NUNCA se oscurece: el HUD ya
está en `uiScene` aparte). Solo en modo `apagon`; en `electrica` todo como hoy.

Shader, por pixel (todo en **px de mundo**: `wp = floor(fragCoord / worldPx) + cam`, así el tramado es del
tamaño del pixel art):
1. `night(c)`: desaturar 30% (`c*0.70 + lum*0.30`, lum = 0.3r+0.59g+0.11b) y multiplicar por
   `(0.49, 0.55, 0.79)`.
2. Luces cálidas (lista por uniform, máx. 8): `d = length((wp - L.pos) * vec2(1, 1.25)) / (L.r + jitter)`;
   `v = pow(max(0, 1-d), 1.6)`; banda con Bayer 4×4: `v += (bayer(wp)+0.5)/16 - 0.5) * 0.09`;
   `nivel = cuántos de (0.12, 0.32, 0.56, 0.80) supera v` (0..4). Quedarse con la luz de mayor nivel.
   Si nivel > 0: `t = nivel/4`, `lit = c * L.col`, resultado `mix(night(c), lit, t)`.
   Colores: vela `(1.25, 1.06, 0.80)`, brasa `(1.22, 0.80, 0.58)`.
3. Haces fríos de ventana (lista, máx. 4): paralelogramo que baja desde el borde inferior del vidrio:
   para `k = wp.y - ytop` en [0, L): `x0 + k*0.35 <= wp.x <= x1 + k*0.35`, `v = 0.85*(1 - k/L)`, bandas
   `(0.10, 0.28, 0.48, 0.90)`; `t = nivel/4*0.8`, `lit = c*(0.62,0.92,1.12)*0.8`.
4. **Nieve que brilla (solo afuera, mapa `street`):** si `lum(c) > 150 && c.b >= c.r - 6/255` y no hay luz
   cálida ni haz: `(L*0.50, L*0.72, L*0.92)` (no se apaga, se enfría).
5. Resto: `night(c) * viñeta`; viñeta escalonada según distancia al borde del mapa visible: < 7 px de mundo
   → ×0.76, < 15 → ×0.88.
6. Vidrios de ventana que dan afuera brillan cian: para rects de vidrio dados, si `lum(c) > 110`:
   `(L*0.62, L*0.98, L*1.12)`.
Parpadeo: el radio de la vela suma un jitter que cambia cada ~120–180 ms entre {0, 2, −1, 3, 1} px; nunca
cambiar opacidades. Llama: 2–3 px blanco-amarillo-ámbar encima de la vela (`flame` en lighting3.py).

**Radios en px de MUNDO** (los conceptos están a zoom 1,5: ya están convertidos):
- **Altillo:** vela de la mesa (objeto `candle`) R = 63. Ventana del altillo: vidrio brilla cian + haz
  (L = 33). **Lamparita del techo** (`hanging_lamp`): en apagón usa el sprite `hanging_lamp_off`.
- **Lucas fuma (pucho)**, solo en apagón, en el altillo: cigarrillo de 2 px de papel (`#c4beb2`, `#b0aaa0`)
  desde la comisura y la brasa en la punta. Comisura = pixel (10, 13) del cuadro de Lucas mirando abajo →
  mundo `(npc.x - 8 + 10, npc.feet - 32 + 13)`. Brasa en x+2. Ciclo (intensidad, ms):
  `(0,420)(0,420)(0.05,380)(0.55,110)(1,160)(1,220)(0.7,160)(0.4,180)(0.2,220)(0,420)` en loop;
  radio de luz `5 + 12*k` px de mundo, color brasa. Brasa: k<0.3 → 1 px `#b23a1e`; si no `#f07832` (k>0.8:
  `#ffd68c` y 1 px `#ff9646` arriba) + 1 px `#e25424` a la derecha. Humo: 5 px grises que suben (ver `smoke`).
- **Planta baja:** lámpara de aceite cálida sobre el mueble de la radio (`radio_cabinet`, izq 32 base 104):
  agregar `oil_lamp_lit` en `put(43, 84)` (solo visible en apagón), luz en (48, 74) R = 47. **Pucho del
  cenicero** (ítem `cenicero` sobre `living_table`, slot 2): brasa que respira despacio, luz en la posición
  del ítem +(2, −1), R entre 12 y 17 (ciclo lento ~2 s), color brasa, + humo. Ventana del living y ojo de
  buey de la puerta del hall: vidrio cian + haz frío (L = 40 y 24).
- **Calle:** las **farolas apagadas** (no dibujar su halo/luz en apagón); la nieve brilla (regla 4); las
  ventanas amarillas pintadas de los chalets se oscurecen (pixeles con r > b+30 y lum > 120 →
  `(L*0.15, L*0.18, L*0.27)` con L = lum*0.3), **salvo una ventana** con vela (la izquierda del chalet frente
  a la puerta del jardín de los Salvo): esa queda tibia (×0.75 / ×0.5 tramado) con una llamita y una luz
  cálida R = 15.
- Referencia de cada escena: `light3_altillo_pucho.gif`, `light3_casa.gif`, `light3_calle.gif`.
- Listo cuando: capturas en apagón de altillo, casa y calle comparadas lado a lado con esas imágenes
  (guardar `pi_1_*_compare.png`), sin capa gris, vela brillante, Lucas con el pucho, y el HUD sin oscurecer.

---

## Orden y paralelismo sugerido
1. **En paralelo (no se pisan):** PI-3 (arte chars2) · PI-9 (view.js) · PI-7 (snow.js) · PI-4 (arena.js + mouseCursor.js).
2. **Después:** PI-2 (dialog.js) · PI-5 (HUD).
3. **Después:** PI-6 (house.js + cámara + textos).
4. **Al final:** PI-1 (lighting + escenas), que usa la casa ya cambiada.
Entre fase y fase: `npm run build`, `npm test` y capturas headless. Al terminar: una tabla en
`docs/brief_pi_resultado.md` con cada PI, qué se cambió (archivos), las capturas y lo que quedó pendiente.
