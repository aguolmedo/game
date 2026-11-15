# El Eternauta — Hoja de diseño (software)

Documento para implementar la demo descripta en `docs/guion_demo.md`. Proyecto: `/home/mateyfasito/dev/game/eternauta/` (Vite + three, JS ES modules, sin TypeScript, sin dependencias nuevas). Reglas generales: `/home/mateyfasito/dev/game/.dsagent.md` (proyección oblicua 3/4, grilla 16 px, vista 480×270 escalada entera, cámara Y hacia abajo → `side: DoubleSide` y `flipY = false`, `NearestFilter`).

**Fuente de verdad del arte: `art/concept/`** (generadores Python hechos por la dirección de arte) y la presentación `art/direccion/Eternauta-direccion-de-arte.pdf`. No se inventa arte nuevo si un generador ya lo tiene; lo que falte se dibuja **con las mismas reglas y paletas** de esos generadores. `bocetos/` no se toca.

---

## 0. Estado actual (leer antes de empezar)

Ya existe y funciona (v3): `src/main.js`, `input.js` (gamepad + teclado, último dispositivo), `movement.js` (8 direcciones, colisión por pies, deslizamiento), `interaction.js` (casilla de acción + cursor), `inventory.js`, `crafting.js`, `recipes.js`, `items.js`, `pickup.js` (imán), `dialog.js` / `dialogs.js`, `menu.js` / `menus.js`, `hud.js`, `objectives.js`, `npc.js`, `snow.js`, `footprints.js`, `glyphs.js` (botones Xbox/teclado), `mapView.js`, `scenes/world.js` (escena genérica de mapa), mapas `maps/attic.js`, `maps/house.js`, `maps/street.js`, assets vía `tools/export_assets.py` + `tools/art/*.py`. Tests en `test/` (`node --test`, 117 pasando). **Reusar todo esto**; extender, no reescribir.

---

## 1. Hitos (para delegar en paralelo)

| Hito | Contenido | Depende de |
|---|---|---|
| H1 Assets | Exportar todo el arte del concepto a atlas PNG+JSON (§2) | — |
| H2 Mapas | Altillo (ajustes), planta baja nueva, garaje nuevo, calle/arena nueva (§3) | H1 |
| H3 Superficies y objetos | Objetos apoyados en muebles, agarrar/soltar/mirar (§4–5) | H1 |
| H4 Sistemas | Mate (§7), luz/apagón (§8), historieta (§9), vistas (§10), retratos de diálogo (§12) | H1, H3 |
| H5 Historia | Actos, banderas, objetivos, guion completo (§6) | H2, H3, H4 |
| H6 Minijuego | Arena de oleadas, cascarudos, disparo, puntos, compra de balas (§11) | H1, H2 |
| H7 QA | Recorrido completo headless, capturas, tests (§14) | todo |

H1 primero (bloquea); después H2, H3, H4 y H6 en paralelo; H5 al final; H7 cierra.

---

## 2. Assets (H1)

Escribir `tools/art/concept_export.py` que **importe los módulos de `art/concept/`** (agregar `art/concept` y `tools/art` a `sys.path`) y exporte a `public/assets/`:

| Archivo | Origen | Contenido |
|---|---|---|
| `chars2.png/.json` | `characters.py` (`GRIDS`, `palette`), `walk.py` (ciclo), `suit.py` | 9 personajes × 4 direcciones × (6 caminata + 2 reposo) en celdas 16×32 (ver abajo) |
| `portraits_dlg.png/.json` | `calco_juan.py` (+ futuros `calco_*.py`) y, si falta el calco, `characters.portrait()` / `suit.portrait_suit()` | retratos de diálogo 64×64 (los de concepto 32×32 se escalan ×2 NEAREST) |
| `portraits_panel.png/.json` | `characters.portrait()`, `suit.portrait_suit()` | retratos 32×32 para las viñetas (§9) |
| `houses.png/.json` | `houses.front_gable_house('salvo'|'californiano', seed)` | 4 variantes (2 estilos × 2 seeds, más espejadas en runtime) |
| `street2.png/.json` | `street.py` (`farola`, `cartel_esquina`, `tapial(w)`, `polsky_caido`, `papel`, `bush`), `trees.pine(snowy, glow, seed)`, `vehicles.sedan(color, snowy)`, `vehicles.colectivo(snowy)`, auto dado vuelta y auto de trompa (los de `street.auto_volcado/auto_parado` y `window_view.build_game_view`), `window_view.fallen()` | piezas de la calle |
| `interior2.png/.json` | `house.py` (`door_porthole`, `wall_clock`, `railing`, `garage_door`, `extractor`, `bed`, `nightstand`, `crib`, `toy_horse`, `alacena`, `oil_lamp_lit`), `garage.py` (`double_door`, `generator`, `bidon`, `bulb`, `broom_bucket`, `stool`, `bench_suit`, `oil_stain`) | muebles nuevos |
| `props.png/.json` | `props.py` (todas las funciones de `SETS`) | objetos chicos 4–14 px |
| `views/attic_pan.png` | `window_view.build_panorama()` (960×300) | vista del altillo (sin marco: el marco se dibuja en runtime) |
| `views/living.png` | `window_view.build_living_view()` sin `window_frame`/`curtains` | vista del living |
| `cascarudos.png/.json` | **nuevo**, ver §11.3 | 3 tipos × 4 direcciones × 4 cuadros + muerte |
| `fx.png/.json` | nuevo | fogonazo del disparo (3 cuadros), impacto, salpicadura de nieve, brillo de objeto agarrable |

**Personajes (celdas 16×32):** ids `juan`, `juan_suit` (traje casero, `suit.sprite_front/side/back`), `juan_suit_rifle` (`suit.sprite_front_rifle/side_rifle`; espalda = `sprite_back`), `favalli`, `lucas`, `polsky`, `elena`, `martita`, `polsky_coat` (Polsky con el abrigo). Filas: down, up, left, right. Columnas: 6 de caminata + 2 de reposo.
- Frente: grilla de `characters.GRIDS[id]`.
- La **caminata de 6 cuadros** se genera con la técnica de `walk.py` (cuerpo por partes, cabeza fija que solo se desplaza, cabeceo `BOB=[0,1,1,0,1,1]`, tijera de piernas, brazos opuestos, `TIMES=[150,95,95,150,95,95]` ms). `walk.py` hoy solo tiene a Juan: **generalizar** a todos usando sus grillas.
- **Perfil y espalda** de cada personaje: dibujarlos siguiendo `walk.HEAD_SIDE` y `walk.HEAD_BACK` de Juan como modelo anatómico (cráneo en huevo que se extiende detrás del cuello, oreja al centro, cara en el tercio de adelante, cuello en la mitad de atrás; espalda: pelo hasta la nuca). Mantener rasgos: anteojos de Favalli (de perfil se ve una patilla y el lente), pelada de Lucas, pelo revuelto de Polsky, ondas de Elena, flequillo de Martita.
- Martita: más baja (grilla con 7 filas vacías arriba).
- `chars2.json`: `{cell:{w:16,h:32}, dirs:[...], walk:[0..5], idle:[6,7], times:[...], blocks:{id:{x,y}}}`.

---

## 3. Mapas (H2)

Formato de mapa existente (`maps/*.js`): `floor` (grilla de tiles), `solidTiles`, `objects` (con `sprite`, `x`,`y`,`tw`,`th`, `solid`, `interact`, `container`, `offset`, `glow`), `npcs`, `pickups`, `warps`, `spawn`, `bounds`. **Agregar**:
- `surfaces`: ver §4.
- `lights`: lista de fuentes `{x,y,radius,color,kind:'electric'|'candle'|'oil'|'bulb'|'snow', flicker:0..1, state:'on'|'off', onlyIn:'electrica'|'apagon'|null}`.
- `windows`: `{id, x, y, view:'attic'|'living'|null, openable:bool}`.
- Suavizado de bordes en interiores: portar `art/concept/edges.py` a runtime **o** pre-renderizarlo en el exportador (sombra de contacto, canto de tabiques, marco, umbrales). Las paredes conservan su textura.

**Altillo** (`maps/attic.js`): se conserva el layout actual (22×14). Cambios: mesa de truco con superficie y objetos (§4); estante con la yerba; banco del laboratorio con el calentador a alcohol, la pava y la tela engomada; cajón de herramientas con 3 tiras de goma; la silla de Juan es interactuable ("Sentarse").

**Planta baja** (`maps/house.js`): reemplazar por el plano de `art/concept/house.py` (`plan()` y las ubicaciones de `build()`): 28×16; arriba living / hall / garaje-entrada, abajo dormitorio / cuarto de Martita / cocina. Ventanas: living (vista `living`), Martita (abrible, evento 2.2). Puerta del hall: sellada (no warp). Warps: escalera → altillo; puerta del garaje → mapa garaje.

**Garaje** (`maps/garage.js`, nuevo): plano de `art/concept/garage.py` (18×11): puerta de dos hojas al fondo (warp a la calle, `needsSuit` y `needsFlag:'listo_para_salir'`), extractor, estantes, electrógeno + bidón, lamparita (`light kind:'bulb'`, `state:'off'` hasta arrancar el electrógeno), banco del traje (estación de fabricación), traje colgado (decorativo hasta fabricarlo), neumático, balde/escoba, cajas.

**Calle** (`maps/street.js`): reconstruir con la composición de `art/concept/street.py` (`build()`): casas de hastial de frente (`houses`) con sus tapiales/cercos/portones, farolas (apagadas en `apagon`), pinos nuevos, vereda/calzada/cordones con montones de nieve, colectivo, autos, la esquina del choque (auto dado vuelta + de trompa + cartel), Polsky caído (si `polsky_muerto`), papeles. Mapa ancho (80×20 aprox) con cámara que sigue. La **arena del minijuego** es este mismo mapa: zona jugable = vereda + calzada entre x=8 y x=72 tiles; spawns en los bordes y en 6 médanos.

---

## 4. Superficies y objetos apoyados (H3)

Cada mueble que sostiene cosas declara `surface: {slots:[{x,y}], maxItems}` (coordenadas en px relativas al sprite del mueble). Los objetos del mundo (`worldItems`) tienen `{id:itemId, surface:objId, slot:n}` o `{x,y}` si están en el piso. Se dibujan encima del mueble, con una sombra de 1 px, y entran en el y-sort por el mueble.

Interacciones (casilla de acción sobre el mueble o el objeto):
- **(A) Mirar / Agarrar**: si hay objetos en la superficie, el cursor recorre los objetos (LB/RB o ←/→ en el menú contextual chico); (A) agarra el seleccionado → inventario. Si no es agarrable, muestra su descripción.
- **(A) Dejar**: con un objeto seleccionado en la barra, mirando una superficie con slot libre → aparece "Dejar <objeto>" y lo apoya en el slot.
- **Brillo**: los objetos agarrables tienen un brillito de 2 cuadros cada 1.5 s (sprite `fx.sparkle`).
- Objetos decorativos (no agarrables) que **sí** responden a (A) con una línea: naipes ("Tres del mismo palo…"), anotador ("Vamos 14 a 11."), cenicero ("El de Favalli. Nunca para."), sifón, reloj de pared ("Las once y diez. Se paró."—después del apagón), radio (antes: música; después: "Muda.").

Data: `src/data/surfaces.js` con la lista por mapa de objetos iniciales (ver §6.3).

---

## 5. Objetos (items.js — agregar)

| id | Nombre | Agarrable | Usos |
|---|---|---|---|
| mate_vacio | Mate | sí | + yerba → `mate_yerba` |
| mate_yerba | Mate con yerba | sí | + `pava_caliente` → `mate_cebado` |
| mate_cebado | Mate cebado | sí | tomar → `mate_yerba` (+1 cebada); convidar a NPC |
| mate_lavado | Mate lavado | sí | tirar la yerba (en la pileta o el balde) → `mate_vacio` |
| yerba | Paquete de yerba | sí | sobre mate |
| pava_fria | Pava (fría) | sí | sobre el calentador/cocina → calentando (§7) |
| pava_caliente | Pava (caliente) | sí | cebar; se enfría a fría en 90 s |
| pava_hervida | Pava (hervida) | sí | cebar → `mate_cebado` quemado (§7) |
| tela, guantes, botas, tiras, casco (visera), lata | (receta del traje) | sí | — |
| traje | Traje casero | sí | ponerse / sacarse |
| secador | Secador de Elena | sí | usar sobre el extractor |
| nafta | Bidón de nafta | sí | usar sobre el electrógeno |
| rifle | Rifle | sí | equipa el arma (sprite `juan_suit_rifle`) |
| balas | Balas | sí (stack) | munición del rifle |
| vela | Vela | no | fuente de luz |
| naipes, anotador, sifon, vino, vaso, cenicero, latas, frascos, pan | decorativos | no | descripción |

Receta `traje` (ya existe; actualizar materiales): tela + guantes + botas + tiras×2 + casco + lata → traje. Estación: banco del garaje (si se fabrica en otro lado, mensaje "Mejor en el banco del garaje").

---

## 6. Historia: actos, banderas, objetivos (H5)

`src/story.js`: máquina de estados con `game.flags` y una tabla de **disparadores** `{when: (flags, event) => bool, run: async (game) => {...}}`. Eventos: `enterMap`, `interact(objId)`, `itemCrafted(id)`, `itemUsed(id,targetId)`, `dialogEnd(id)`, `timer`.

### 6.1 Banderas (en orden)
`mate_tutorial` → `truco_jugado` → `apagon` → `vio_la_nevada` → `martita_ventana` (ok/tarde) → `casa_sellada` → `polsky_muerto` → `ramirez_muerto` → `idea_traje` → `traje_fabricado` → `electrogeno_on` → `extractor_ok` → `esclusa_lista` → `dados` → `listo_para_salir` → `afuera` → `arena`.

### 6.2 Objetivos (texto del HUD, en orden)
"Cebate un mate antes de seguir la partida." → "Volvé a la mesa." → "Mirá por la ventana." → "Bajá a ver a Elena y Martita." → "¡Cerrá la ventana de Martita!" (con barra de 8 s) → "Revisá que toda la casa esté cerrada (0/4)." → "Hablá con Elena en el living." → "Juntá los materiales del traje (0/6)." → "Prepará la esclusa: nafta, extractor, traje (0/3)." → "Equipate: el traje y el rifle." → "Salí por el garaje." → "¡Sobreviví!".

### 6.3 Objetos iniciales por mapa
- Altillo / mesa de truco: naipes×3 (decorativos), anotador, sifón, vino, vaso×2, cenicero, **mate_vacio**. Estante izquierdo: **yerba**, libros, frascos. Banco del laboratorio: calentador a alcohol (estación de calentar), **pava_fria**, **tela** (con tijera decorativa). Cajón de herramientas: **tiras×3**.
- Cocina: alacena → **guantes**; mesa → latas, frascos, **lata** (la del filtro), pan, lámpara de aceite (luz `oil`), lista de Elena; cocina a gas (estación de calentar; funciona sin electricidad).
- Hall: perchero → **botas** al pie.
- Dormitorio: mesa de luz → **secador**, velador (apagado tras el apagón); ropero (contenedor) → **rifle**, **balas×30**.
- Garaje: estante → **casco**; electrógeno; **nafta** (bidón) al lado.

### 6.4 Diálogos
Todos los textos van en `src/data/script.js` como datos (no hardcodeados en escenas), con `speaker`, `portrait`, `lines[]`, `choices[]` opcional, `next`. Copiar las líneas de `guion_demo.md` tal cual.

---

## 7. El mate (H4) — mecánica propia

Máquina de estados sobre los items del §5:

```
mate_vacio --(usar yerba)--> mate_yerba --(cebar con pava_caliente)--> mate_cebado
mate_cebado --(tomar)--> mate_yerba [cebadas+1]
mate_cebado --(convidar a NPC)--> NPC dice su línea, devuelve mate_yerba [cebadas+1]
cebadas >= 8 --> mate_lavado ("Está lavado.") --(tirar yerba en balde/pileta)--> mate_vacio
```

**Calentar el agua:** usar `pava_fria` sobre una estación de calentar (calentador a alcohol del altillo o cocina a gas). La pava queda apoyada en la estación con un **termómetro** chico en el HUD: 0→100 en 9 s. Zona ideal 70–85 (verde). Agarrarla:
- < 70: sigue fría → "Todavía está fría."
- 70–85: `pava_caliente` → al cebar, `mate_cebado` "bien cebado".
- > 95: `pava_hervida` (silbido, vapor) → al cebar, el mate sale "quemado" (Favalli comenta, §escena 1.2) y queda `mate_lavado` en 2 cebadas.

**Tomar:** animación de 1.2 s (Juan levanta el mate, sorbe: 3 cuadros simples o mover el ítem al costado de la cabeza), sonido opcional de bombilla. Efecto: **calma** +1 (contador oculto que solo cambia líneas de diálogo y, en la arena, da +5% de recarga si se tomó un mate en los últimos 120 s de juego: "Mate en la panza").
**Convidar:** con `mate_cebado` en la mano, (A) sobre un NPC → animación de pasar, línea propia del NPC (ver guion 1.2), el NPC "devuelve" el mate.
Tests: transiciones, temperatura, lavado tras 8, convidar.

---

## 8. Luz: antes y después del corte (H4)

`src/lighting.js`. Dos modos globales: `electrica` (acto 1) y `apagon` (desde el flag `apagon`). Implementación en three:
1. La escena se renderiza a un `WebGLRenderTarget` (480×270).
2. Pase de luz: un quad pantalla completa con un shader que aplica: `color * ambiente(modo)` + suma de luces (`lights` del mapa: radio, color, parpadeo).
   - `electrica`: ambiente cálido 0.85; lámparas `electric` encendidas.
   - `apagon`: ambiente 0.36 tintado frío `#0e1228`; luces `electric` apagadas; `candle`/`oil`/`bulb` encendidas con parpadeo (`flicker`); **la nieve es emisiva**: los tiles/sprites marcados `emissive:snow` (nieve del piso, techos nevados, copos) se suman con color `#96e1f0` (fórmula de referencia: `art/concept/lighting.py`, función `blackout`: oscurecer, apagar lo eléctrico, la nieve brilla, tinte cian alrededor, velas cálidas).
3. El HUD y la UI **no** pasan por el pase de luz.
Transición del apagón: la lámpara parpadea 2 veces (0.15 s) y en 0.4 s se pasa a `apagon`.
Referencias visuales: diapositivas "Se cortó la luz" y "Velas, aceite y la nieve que brilla".

---

## 9. Historieta: cartuchos, globos y viñetas (H4)

`src/comic.js`:
- **Cartucho**: caja amarilla `#efe0a8` con borde de tinta, texto en mayúsculas con la fuente del juego, arriba a la izquierda; avanza con (A).
- **Globo**: globo blanco con cola hacia el personaje que habla (coordenada de la cabeza en el mapa), para líneas cortas en el mapa (sin retrato). Ver `art/concept/comic_ui.py` (`balloon`, `caption`).
- **Escena en viñetas**: pantalla de papel `#f6f1e4` dividida en paneles (layout 3+3 o 2+2) con borde de tinta doble y medianiles; cada panel = recorte de una captura del mapa en vivo **o** retrato de panel (32×32 ×3) sobre fondo, más globos/cartuchos. Los paneles aparecen de a uno (0.25 s), (A) avanza. Datos en `src/data/script.js` (`panels:[{layout, cells:[{type:'map'|'portrait'|'color', ...}]}]`). Usa los **retratos de panel** (modelo del juego), no los de diálogo.

---

## 10. Vistas por la ventana (H4)

`src/scenes/view.js`: al interactuar con una ventana con `view`:
- **attic**: imagen `views/attic_pan.png` (960×300) dentro del marco de la ventana (marco de madera dibujado en runtime, cuatro vidrios). La cámara **panea** de izquierda a derecha (40 s ida, 40 s vuelta) con copos animados por delante y brillo de la nieve. (B) sale.
- **living**: `views/living.png` con el **cortinado** (dibujar en runtime o exportar como capa aparte: terciopelo bordó, pliegues anchos, cordón dorado con borla, galería con festones; ver `window_view.curtains`). La vela de Ramírez titila. En la escena 2.4 la vista dispara las viñetas.
- En modo `apagon` las vistas usan la versión oscura (aplicar el pase de luz o exportar ambas variantes).

---

## 11. Minijuego: oleadas de cascarudos (H6)

`src/scenes/arena.js` (usa el mapa de la calle) + `src/arena/*.js` (lógica pura testeable).

### 11.1 Controles en la arena
| Acción | Joystick | Teclado y mouse | Solo teclado |
|---|---|---|---|
| Moverse | stick izq. | WASD | flechas |
| Apuntar | stick der. (si está quieto: hacia donde mira) | mouse | dirección de la mirada |
| Disparar | RT (botón 7) | clic izq. | Espacio / J |
| Recargar | X (botón 2) | R | R |
| Parche de goma | Y (botón 3) | F | F |
| Comprar (en la caja) | A | E | E |
| Pausa | Start | Esc | Esc |
Mostrar los botones con `glyphs.js` (Xbox o teclas según el último dispositivo).

### 11.2 Rifle y munición
- Rifle de cerrojo: **cargador 5**, cadencia 0.55 s, recarga 1.6 s (bala por bala visible en el HUD: 5 casquillos), daño 1, atraviesa 1 cascarudo (el segundo recibe 0.5).
- Reserva inicial 30. **Puntos**: impacto +10, baja +60, baja de acorazado +120, ronda completa +100×ronda.
- **Comprar balas**: caja de municiones en la puerta de la ferretería (interacción con (A)): 250 puntos → +30 balas. Cartel en el mundo con el precio en la tipografía del juego.
- **Balas infinitas de emergencia**: si cargador y reserva están en 0, el rifle sigue disparando **1 bala cada 1.6 s** (aviso "¡Sin balas!" titilando). Nunca quedás trabado. Config `ARENA.ammo = 'compra'` (por defecto) o `'infinita'` (reserva infinita, para pruebas).

### 11.3 Cascarudos (arte nuevo, `tools/art/cascarudos.py`)
Escarabajos gigantes negros del cómic (ver catálogo, categoría "Criaturas", págs. 098, 100, 137, 138, 145, 154–165: masas negras brillantes, patas finas, en filas sobre la nieve). Vista 3/4 desde arriba, mismas reglas de arte (contorno de color, 3–4 tonos, luz arriba-izq):
- Caparazón negro-azulado brillante (`#0e0c14`, `#1e1c2a`, `#3a3850`, brillo `#8a90b8`), línea central del élitro, 6 patas finas que alternan en 4 cuadros, antenas, mandíbulas.
| Tipo | Tamaño | Vida | Velocidad | Daño | Aparece desde |
|---|---|---|---|---|---|
| cascarudo | 20×16 | 2 | 34 px/s | 1 | ronda 1 |
| veloz | 14×12 | 1 | 62 px/s | 1 | ronda 3 |
| acorazado | 28×22 (caparazón con placas, brillo frío) | 8 | 22 px/s | 1 (empuja) | ronda 5 |
Animaciones: caminar 4 cuadros × 4 direcciones; golpe (1 cuadro blanco); muerte (patas arriba, 3 cuadros) y el cuerpo queda 20 s en la nieve (como en las viñetas). En `apagon` su brillo especular toma el cian de la nieve.

### 11.4 Rondas (tipo "zombies")
`src/arena/waves.js` (puro, testeable):
- Cantidad de la ronda r: `total = 6 + 4·r + floor(r²/3)`; vivos a la vez máx `min(8 + 2·r, 40)`.
- Vida: `base × (1 + 0.18·(r−1))`; velocidad: `base × min(1.7, 1 + 0.05·(r−1))`.
- Mezcla: ronda 1–2 solo cascarudo; desde 3: 25% veloces; desde 5: +10% acorazados (+2% por ronda, tope 30%).
- Aparición: desde los bordes de la arena y de 6 médanos (puntos `spawns` del mapa), con 0.6–1.2 s entre apariciones; nunca a menos de 6 tiles del jugador.
- Entre rondas: 8 s de pausa; aparece el número de ronda en **palotes de tinta** (I, II, III, IIII, IIII tachado…) estilo cartucho, más grande al empezar y chico arriba a la izquierda durante la ronda.
- Comportamiento: caminan hacia el jugador esquivando obstáculos simples (repulsión entre ellos + rodeo de sólidos con steering); al tocarlo, muerden (0.8 s de enfriamiento).

### 11.5 Integridad del traje (vida)
- 3 tiras (HUD: tres parches de goma). Mordida: −1 y 1 s de invulnerabilidad (parpadeo).
- **Parche**: con tiras de goma en el inventario, (Y) → 1.5 s quieto, +1 integridad (máx 3). Los cascarudos sueltan tiras de goma con 8% de probabilidad (más en acorazados: 25%).
- Integridad 0 → muerte: viñeta final (la mano enguantada sobre la nieve) + pantalla de resultado (ronda, bajas, puntos, mejor marca guardada en localStorage con try/catch) + "Otra vez" / "Volver al título".

### 11.6 HUD de la arena
Arriba izq.: ronda en palotes. Arriba der.: puntos (contador que sube). Abajo izq.: integridad (3 parches) + tiras de goma. Abajo der.: munición (5 casquillos del cargador + reserva). Mira: retícula chica de 5×5 en la dirección de apunte a 24 px del jugador. Fogonazo y retroceso de 1 px al disparar; pantalla tiembla 1 px con las mordidas.

---

## 12. Retratos de diálogo (H4)

`dialog.js`: cuadro de madera con retrato de **64×64** a la izquierda y nombre en placa. Fuente de retratos `portraits_dlg` (§2): usar el **calco** si existe (`calco_juan.py`), si no el retrato de concepto ×2. Dejar el mapeo en `src/data/portraits.js` para poder ir sumando calcos sin tocar código.

---

## 13. Estructura de archivos nueva

```
src/story.js            src/data/script.js       src/data/surfaces.js    src/data/portraits.js
src/lighting.js         src/comic.js             src/mate.js             src/surfaces.js
src/scenes/view.js      src/scenes/arena.js      src/arena/waves.js      src/arena/enemies.js
src/arena/weapon.js     src/arena/points.js      src/maps/garage.js
tools/art/concept_export.py   tools/art/cascarudos.py
test/mate.test.js  test/story.test.js  test/waves.test.js  test/weapon.test.js  test/surfaces.test.js  test/lighting.test.js
```

---

## 14. Aceptación y QA (H7)

- `npm run build` sin errores; `node --test` todo verde (los 117 actuales + los nuevos).
- `python3 tools/art/concept_export.py` y `tools/export_assets.py` corren; todo asset referenciado existe.
- **Capturas headless** (playwright-core + Chromium de `~/.cache/ms-playwright`, ver `.dsagent.md`) en `docs/screens/demo/`, **mirarlas una por una** y comparar con la diapositiva correspondiente del PDF:
  01 título · 02 altillo con la mesa vestida · 03 cebando (termómetro) · 04 convidando a Favalli · 05 viñetas del truco · 06 el apagón (altillo a la luz de la vela) · 07 vista del altillo · 08 ventana de Martita (barra de tiempo) · 09 viñetas de Polsky · 10 vista del living con la vela de Ramírez · 11 mochila con la receta del traje · 12 garaje con la lamparita encendida · 13 Juan con el traje y el rifle · 14 calle en apagón (la nieve brilla) · 15 ronda 1 · 16 ronda 5 con acorazados · 17 comprando balas · 18 pantalla de resultado.
- Recorrido completo jugable con teclado headless del título a la arena (script `tools/play_demo.mjs`).
- Rendimiento: 60 fps con 40 cascarudos en pantalla en una máquina común (medir con `performance.now` en headless y reportar).

## 15. Fuera de alcance (por ahora)
Música y sonido (dejar ganchos `sfx(name)` sin implementar), guardado de partida, más armas, mejoras del rifle, jefes, más mapas.
