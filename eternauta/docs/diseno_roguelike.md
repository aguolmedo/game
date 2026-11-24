# Diseño técnico: el roguelike (22/11)

Narrativa y decisiones: `docs/roguelike_narrativa.md`. Arte de concepto: `art/direccion/DIRECCION.md`, sección "Roguelike (en diseño)", y las imágenes de `art/concept/out/roguelike/` y `art/concept/out/manzanas/`. **El arte ya está en el juego** (lo exportó `tools/art/export_roguelike.py`). Ver "Arte disponible" abajo: los workers NO dibujan, usan esos nombres.

## Resumen del juego

1. **Partida nueva:** prólogo (la llegada del Eternauta viejo, la tinta que se vuelve píxeles, el gag con el programador). Después, la historia de siempre: truco, apagón, nevada y el traje.
2. **Al terminar el traje** (flag `traje_fabricado`) queda guardado: `save.trajeHecho = true`. Ya no se vuelve a armar.
3. **La casa es la base:** el garaje, con cuatro estaciones de mejora (Favalli, Elena, Lucas y el electrógeno). Se pagan con botín.
4. **Salir por el portón = una salida (un loop).** El barrio se arma con una semilla, como una grilla de manzanas (piezas de 20×20). Se pelea por rondas como en la arena de hoy. Los enemigos y los puntos de botín sueltan chatarra, goma, nafta y piezas de cascarudo.
5. **Volver a casa** (en el portón de la casa de Juan): el botín de la salida se suma al de la casa. **Morir:** el botín queda en la **mochila de otra vez**, tirada en la nieve. En la salida siguiente se la puede ir a buscar; si se muere de nuevo antes de recuperarla, se pierde.
6. **Cada 3 muertes**, antes de volver a la base, el viejo aparece en el cuarto del programador a quejarse (una línea al azar).

## Módulos (quién los escribe)

| Módulo | Archivo(s) | Tanda | Worker |
|---|---|---|---|
| RNG con semilla | `src/run/rng.js` | hecho | Claude |
| Guardado persistente | `src/run/save.js` | 1 | A |
| Mejoras (datos y efectos) | `src/run/upgrades.js` | 1 | A |
| Botín y mochila | `src/run/loot.js` | 1 | A |
| Semilla y mano de truco | `src/run/seed.js` | 1 | A |
| Radio de Lucas (rumores y gags) | `src/run/radio.js` | 1 | A |
| Piezas del barrio | `src/maps/barrio/*.js` | 1 | B |
| Armado del barrio (grilla y mapa) | `src/maps/barrio/index.js` | 1 | B |
| Prólogo (llegada y cuarto) y queja del viejo | `src/scenes/prologue.js`, retratos | 1 | C |
| La salida (arena sobre el barrio) | `src/scenes/arena.js`, `src/arena/*` | 2 | D |
| La base (estaciones, taller, flujo, guardado) | `src/maps/garage.js`, `src/taller.js`, `src/main.js`, `src/scenes/title.js`, `src/menus.js`, `src/story.js` | 2 | E |

La tanda 1 corre en paralelo: A, B y C no tocan los mismos archivos. La tanda 2 (D y E) arranca cuando termina la 1, también en paralelo. D no toca `main.js`: llama a `game.endRun(result)`, que implementa E.

## Datos compartidos (contratos)

### `save` (localStorage `eternauta.save.v1`, todo con try/catch)
```js
{
  v: 1,
  trajeHecho: false,
  loop: 0,                       // cuántas salidas empezaron
  muertes: 0,
  botin: { chatarra: 0, goma: 0, nafta: 0, pieza: 0 },          // lo guardado en la casa
  mejoras: { favalli: 0, elena: 0, lucas: 0, luz: 0 },          // cuántas de las 3 de cada estación (0..3)
  mochila: null | { loop: n, contenido: { chatarra, goma, nafta, pieza } },  // la de otra vez
  best: { round: 0, points: 0 },
}
```

### Mejoras (cada estación es un camino de 3, en orden)
| Estación | Nivel | id | Efecto | Costo |
|---|---|---|---|---|
| favalli | 1 | cerrojo | cadencia 0,55 → 0,45 s | 4 chatarra |
| favalli | 2 | cargador | cargador 5 → 8 | 6 chatarra + 1 pieza |
| favalli | 3 | punta | la bala atraviesa 2 sin perder daño (PIERCE 0,5 → 1) | 3 pieza + 2 chatarra |
| elena | 1 | capa | integridad máx. 3 → 4 | 3 goma |
| elena | 2 | remiendo | el parche tarda la mitad (1,5 → 0,75 s) | 2 goma + 1 chatarra |
| elena | 3 | hombreras | la primera mordida de cada ronda no daña | 2 pieza + 2 goma |
| lucas | 1 | antena | al salir, la radio da 1 rumor de esta noche (cierto o no) | 3 chatarra |
| lucas | 2 | valvulas | aparece 1 sobreviviente en el barrio, que da botín si lo alcanzás | 2 chatarra + 1 pieza |
| lucas | 3 | frecuencia | aviso ("la voz cuenta números") antes de una ronda con acorazados | 3 pieza |
| luz | 1 | bengala | 1 por salida: tecla 1 / LB; 8 s, los cascarudos a 64 px van a la mitad de velocidad | 2 nafta |
| luz | 2 | molotov | 1 por salida: tecla 2 / RB; fuego de 40 px de radio, 5 s, 1 de daño por segundo | 2 nafta + 1 chatarra |
| luz | 3 | farol | luz cálida de 70 px alrededor de Juan en el apagón | 3 nafta + 2 chatarra |

`effects(save)` devuelve `{ fireRate, magSize, pierceDamage, integrityMax, patchTime, firstBiteFree, rumor, sobreviviente, frecuencia, bengalas, molotovs, farol }` con los valores base si no hay mejora.

### Botín
- **Lo que sueltan:** cascarudo 30 % chatarra y 15 % goma; veloz 25 % goma; acorazado 60 % pieza y 50 % chatarra. Además los parches que ya existían (tiras de goma de `patchDrop`).
- **Puntos de botín de cada pieza** (marca `loot` en el mapa): 1 a 2 de chatarra, goma o nafta (en los autos, nafta).
- **Bolsa de la salida:** `run.bag = { chatarra, goma, nafta, pieza }`.
- **Mochila de otra vez:** al morir, `save.mochila = { loop, contenido: bag }`, y si había una sin recuperar, se reemplaza (la vieja se pierde). En la salida siguiente se ubica en un punto `loot` de una pieza que no sea la casa, elegido con la semilla. Al tocarla, `bag += contenido` y `save.mochila = null`.

### Semilla y mano de truco
`seed = hash(loop, salt)`. `handFromSeed(seed)` da 3 cartas españolas (`{n, palo}` con palo en espada, basto, oro o copa; n en 1–7, 10–12) para el cartel de inicio: "Esta noche: 7 de oro · 1 de espada · 4 de copa". La mano del cómic (33 de envido, Juan es mano) tiene una semilla fija, `SEED_33`, para pruebas.

### El barrio (B)
- **Piezas de 20×20 baldosas** (320×320 px). Salidas: este/oeste por la calzada (filas 15 a 17); norte/sur por la bocacalle (columnas 9 a 11). Variante `openSouth`: abre las filas 18 y 19 en las columnas 9 a 11.
- **Las cinco piezas:** `casa` (cuadra recta, siempre en la columna 0 de la fila de abajo), `esquina` (T, con salida al norte), `plaza` (salida al norte por el camino), `vias` (salida al norte por el paso a nivel), `cortada` (callejón, sin salida al norte).
- **`buildBarrio(seed)`** devuelve `{ cells: [{type, col, row, openSouth}], map }`. `map` tiene el mismo formato que `src/maps/street.js` (cols, rows, floor, objects, spawns, bounds, lights, etc.) más:
  - `loot: [{x, y, kind}]`
  - `exitHome: {x, y, w, h}` (el portón de la casa de Juan)
  - `crate` (la caja de municiones de la ferretería, si hay esquina)
  - `cells`
  - `spawns` (los médanos más los bordes de la calzada)
- **Layout:** grilla de 4 columnas × 2 filas. Abajo: casa y 3 piezas distintas al azar de las otras cuatro. Arriba: sobre cada pieza de abajo con salida al norte, con 50 % (mínimo una), una pieza al azar (no casa) en variante `openSouth`.
- **Celdas vacías:** baldosas `estatica_0..3`, sólidas (el borde del loop). Además, una franja de 1 baldosa donde la pieza toca una celda vacía o el borde del mapa: 50 % de esas baldosas pasan a `estatica_*`.

## Arte disponible (nombres en los atlas; los resuelve `anySprite`)
- **items:** `chatarra`, `goma`, `pieza_cascarudo`, `mochila`, `nafta` (ya estaba), y `mejora_cerrojo`, `mejora_cargador`, `mejora_punta`, `mejora_capa`, `mejora_remiendo`, `mejora_hombreras`, `mejora_antena`, `mejora_valvulas`, `mejora_frecuencia`, `mejora_bengala`, `mejora_molotov`, `mejora_farol`.
- **objects:** `bicicleta`, `banco_plaza`, `busto`, `hamaca`, `baranda`, `vagon`, `barrera_caida`, `barrera_alta`, `garita`, `cruz_san_andres`, `alambrado`, `pared_ns_48`, `pared_ns_62`, `pared_eo_48`, `vidrios`, `cajon_frutas`, `buzon_correo`, `arbol_vereda`, `poste`, `almacen_roto`, `mochila_nieve_0`, `mochila_nieve_1`, `mochila_nieve_2`, `eternauta_sentado`, `eternauta_viejo_{abajo,arriba,derecha,izquierda}`, `programador_{abajo,arriba,derecha,izquierda}`. Además las que ya estaban (`shop_ferreteria`, `shop_almacen`, `chalet_a`..`d`, `crate`, `box`, `bottle`, `tree_a`, `tree_b`, `hedge`, `gate`, `fence`, `mailbox`, `streetlight`, `snow_mound`, `snow_drift`, `figure_snow`, `trash`…).
- **street2:** `pino_0..3`, `tapial48`, `tapial80`, `farola`, `cartel_esquina`, `sedan_*_snow`, `colectivo_snow`, `auto_volcado`, `auto_parado`, `fallen_0..2`, `polsky_caido`, `papel`, `bush30`.
- **houses:** `salvo_7`, `salvo_31`, `californiano_11`, `californiano_23`.
- **tiles:** `snow_0..5`, `grass_0`, `sidewalk_0..1`, `curb_0`, `road_0..1`, `tile_0..1` (baldosa del pasaje), `balasto_0..2`, `via_0`, `via_tablon_0`, `nieve_pisada_0..1`, `estatica_0..3`.
- **Imágenes sueltas** en `public/assets/roguelike/`: `llegada_1..7.png` (64×128), `cuarto_vacio.png`, `cuarto_llegada.png`, `cuarto_gag.png` (320×180, mundo, con la luz ya horneada).

## Criterios generales
- `npm run build` sin errores y `npm test` en verde (hoy: 475 pruebas). Cada módulo nuevo trae sus pruebas en `test/`.
- Textos del juego en castellano rioplatense. Código e identificadores en inglés (salvo nombres de datos ya en castellano, como `botin`, `mejoras` o `mochila`, que van así).
- No tocar `bocetos/` ni los PNG de `art/sprites/`.
- Capturas headless solo donde lo pide cada brief. Matar vite y chrome al terminar.
