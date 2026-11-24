OBJETIVO (worker B, tanda 1): las cinco piezas del barrio del roguelike y el armado del barrio como un solo mapa jugable, a partir de una semilla. Es datos de mapa más una función pura. NO tocar escenas (arena.js, world.js), main.js ni menús.

Proyecto: /home/mateyfasito/dev/game/eternauta. Leé antes:
- `docs/diseno_roguelike.md`, sobre todo "El barrio (B)" y "Arte disponible".
- `src/maps/street.js`: formato de mapa. Copiá su `put(id, sprite, left, base, extra)`, que ubica un sprite por su esquina inferior izquierda en px.
- `src/maps/grid.js` (makeGrid, pick).
- `src/mapView.js`, para ver cómo se dibujan objetos y piso.
- `src/run/rng.js`, que ya existe (rngFromSeed, pick, shuffled).

**FUENTE DE VERDAD DEL DISEÑO:** `art/concept/manzanas.py`. Ahí cada pieza es una función (casa_de_juan, esquina_del_choque, la_plaza, las_vias, la_cortada) con su grilla de 20×20 caracteres y la lista de `m.put(img, left, base)` con coordenadas en px dentro de la pieza (320×320). Mirá también las imágenes `art/concept/out/manzanas/manzana_1..5.png` (×4) y `barrio_loop_a.png`. Portá cada pieza FIELMENTE: mismas posiciones y mismos objetos.

TRADUCCIÓN DE NOMBRES (Python → sprite del juego):
- `S2('x')` → sprite 'x' (atlas street2).
- `OB('x')` → sprite 'x' (atlas objects).
- `HOUSE('x')` → sprite 'x' (atlas houses).
- Funciones propias → sprite en objects: `bicicleta()`→'bicicleta', `banco()`→'banco_plaza', `busto()`→'busto', `hamaca()`→'hamaca', `baranda(32)`→'baranda', `vagon()`→'vagon', `barrera(rota=True)`→'barrera_caida', `barrera(rota='alta')`→'barrera_alta', `garita()`→'garita', `cruz_san_andres()`→'cruz_san_andres', `alambrado(32)`→'alambrado', `pared_ns(48)`→'pared_ns_48', `pared_ns(62)`→'pared_ns_62', `pared_eo(48)`→'pared_eo_48', `vidrios()`→'vidrios', `cajon_frutas()`→'cajon_frutas', `buzon_correo()`→'buzon_correo', `arbol_vereda()`→'arbol_vereda', `vidriera_rota(OB('shop_almacen'))`→'almacen_roto', `medano(m, x, base)`→'snow_mound' (más una marca de spawn), `huellas(...)`→ omitir, `papeles`→'papel'.
- `flip(x)`: agregá soporte opcional `flipX: true` en `WorldMap.addObject` de `src/mapView.js` (mesh.scale.x = -1). Es el ÚNICO cambio permitido fuera de `src/maps/barrio/`. Si es muy riesgoso, omití el flip.
- `S2('farola').rotate(...)` (la farola torcida): usá 'farola' derecha.
- Los tamaños de cada sprite salen de los json de los atlas (`public/assets/{objects,street2,houses}.json`, campo frames: [x,y,w,h]). Armá la tabla SIZE leyendo esos json en Node con `fs`… NO: los mapas se importan en el navegador. Generá en cambio `src/maps/barrio/sizes.js` con un script `tools/gen_barrio_sizes.mjs` que lea los json y escriba la tabla. Commiteá el resultado generado.

PISO (letras de la grilla del concepto → baldosas):
- S → `snow_N` (variado con `pick('snow', x, y, 6)`)
- g → `grass_0`
- v → `sidewalk_${(x+y)%2}`
- r → `road_0` o `road_1`
- b → `tile_0`/`tile_1` alternados
- t → `balasto_0..2`
- La fila que en street.js es cordón: en las piezas con calzada en las filas 15–17, la fila 14 es `curb_0` donde hay vereda arriba (como `CURB_TOP` en street.js), y la 18 también `curb_0`. Donde corre la bocacalle (columnas 9–11), es calzada.
- Plaza: los caminos de nieve pisada del concepto (círculo de radio 38 px en (160,118), línea norte-sur de 40 px de ancho, cuatro diagonales de 18 px) se aproximan con baldosas `nieve_pisada_0/1`: una baldosa es camino si su centro cae dentro de esas formas.
- Vías: las filas 5–8 son balasto. Las filas 5 y 7 llevan `via_0` (rieles), y en las columnas 9–11, `via_tablon_0` (el paso a nivel).

ARCHIVOS:
- `src/maps/barrio/sizes.js` (generado) y `tools/gen_barrio_sizes.mjs`.
- `src/maps/barrio/pieces.js`: `export const PIECES = { casa, esquina, plaza, vias, cortada }`. Cada pieza es una función `(opts = { openSouth:false }) => ({ type, grid: [20 strings], objects: [...], marks: [...] })`:
  - Objetos con coordenadas LOCALES (0..320).
  - marks: `{kind:'spawn'|'loot'|'nafta'|'crate'|'exitHome'|'entrada', x, y}`. Spawn = cada médano. Loot = los cuadrados amarillos del plano (función `plano()` y `m.mark('botin')`); agregá además 1 'nafta' por auto (en el centro del auto). 'crate' = la caja de municiones de la ferretería (esquina). 'exitHome' = el portón de la casa de Juan (casa), en x 66..98, y 176..196.
  - Variante openSouth: filas 18 y 19 en las columnas 9–11 = 'r', sin verja sur en x 144..192 (igual que OPEN_SUR en el .py).
  - Objetos sólidos como en street.js: casas, tiendas, autos, vagón, garita, paredes y verjas sólidos (con un `solid` de una fila de baldosa en la base para lo alto). Papeles, vidrios, sombras y nieve, no sólidos.
- `src/maps/barrio/index.js`:
  - `export function layoutCells(seed)` → `[{type, col, row, openSouth}]` con las reglas del diseño. Grilla de 4×2. Fila 1 (abajo): casa en col 0 y 3 tipos distintos al azar de [esquina, plaza, vias, cortada]. Fila 0 (arriba): sobre cada pieza de abajo con salida al norte (esquina, plaza, vias), con 50 % (mínimo una), una pieza al azar que no sea casa, con openSouth=true. Determinístico por semilla (usá rngFromSeed).
  - `export function buildBarrio(seed)` → `{ cells, map }`, donde `map` tiene el formato de street.js:
    - id 'barrio', cols 80, rows 40, floor (grilla 80×40 de nombres de baldosa)
    - objects (con ids únicos `c{col}r{row}_{n}` y coordenadas desplazadas por la celda: x += col*320, y += row*320)
    - solidTiles: ['black', 'grass_', 'estatica_'] (las celdas vacías son estática sólida)
    - spawn (en la casa: la vereda frente al portón)
    - bounds (todo el mapa), lights: [] (la arena agrega las suyas), emissive 'snow', emissiveTiles como street.js
    - arena: {minX, maxX, minY, maxY} = todo el mapa
    - spawns: objeto `{ m1: {x,y}, … }` con todos los médanos en coordenadas globales, más puntos en las bocas de calzada que dan a celdas vacías
    - loot: [{x, y, kind:'loot'|'nafta', cell: type}]
    - crate: {x, y} o null
    - exitHome: {x, y, w, h}
    - cells
  - Celdas vacías: piso `estatica_${(x*7+y*3)%4}`. **El borde del loop:** en toda baldosa de una pieza adyacente (a 1 baldosa) a una celda vacía o al borde del mapa, con 50 % (rng de la semilla) la baldosa pasa a `estatica_*`. Nunca en la calzada que conecta dos piezas existentes.
  - Conexiones: un borde entre dos celdas llenas es abierto solo donde las dos piezas tienen calzada. Si una pieza con salida al norte no tiene nada arriba, esa boca da a la estática (sólida).
- `test/barrio.test.js`:
  - layoutCells es determinística.
  - Siempre hay casa en (0,1).
  - Las 4 columnas de abajo están llenas.
  - Toda pieza de arriba tiene openSouth y está sobre una pieza con salida al norte.
  - buildBarrio da floor de 80×40 con baldosas que existen en `public/assets/tiles.json`.
  - Todos los sprites de objects existen en algún atlas (objects, street2, houses, interior2).
  - Hay al menos 2 spawns, 3 loot y un exitHome.
  - **Conectividad:** BFS sobre baldosas no sólidas (sin contar objetos) desde el spawn alcanza la boca de calzada de cada pieza llena.

VERIFICACIÓN VISUAL (una sola captura): `tools/barrio_preview.mjs` arma el floor y los objetos de `buildBarrio(SEED)` en un canvas con node + los PNG de atlas (podés usar playwright-core con la página de vite, o mejor un script node con `pngjs`, si ya está en node_modules; si no, playwright). Guardá `docs/capturas/barrio_seed_1.png` y comparalo a ojo con `art/concept/out/manzanas/barrio_loop_a.png`: tienen que parecerse (mismos objetos en los mismos lugares). Si usás vite: `npx vite --port 5199 --strictPort` en segundo plano y matalo al final.

ACEPTACIÓN: `npm test` en verde (todas). `npm run build` OK. Archivos solo en `src/maps/barrio/`, `tools/gen_barrio_sizes.mjs`, `tools/barrio_preview.mjs`, `test/barrio.test.js`, `docs/capturas/` y, si hace falta, el flipX en `src/mapView.js`. Resumen en `docs/brief_rl_B_resultado.md`: las firmas, la forma de `map` y lo que quedó aproximado.
