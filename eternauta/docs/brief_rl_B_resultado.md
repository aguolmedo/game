# Resultado — Worker B (tanda 1): el barrio del roguelike

Datos de mapa + función pura. No toca escenas, `main.js` ni menús.

## Archivos

- `src/maps/barrio/sizes.js` — tabla generada `SIZE[sprite] = [w,h]` y `ATLAS[sprite] = 'objects'|'street2'|'houses'|'interior2'` (152 sprites).
- `tools/gen_barrio_sizes.mjs` — regenera `sizes.js` leyendo `public/assets/{objects,street2,houses,interior2}.json` con `fs`.
- `src/maps/barrio/pieces.js` — `PIECES = { casa, esquina, plaza, vias, cortada }` y `tileFor(...)`.
- `src/maps/barrio/index.js` — `layoutCells(seed)` y `buildBarrio(seed)` (+ constantes `CELL=20`, `COLS=80`, `ROWS=40`).
- `test/barrio.test.js` — 7 pruebas (determinismo, layout, baldosas, sprites, spawns/loot/exitHome, conectividad).
- `tools/barrio_preview.mjs` — captura headless del mapa con Vite + playwright-core. Uso: `node tools/barrio_preview.mjs [semilla] [nombre.png]` (sin args: semilla 1 → `barrio_seed_1.png`).
- `docs/capturas/barrio_seed_1.png` — 1280x640, semilla 1 (198 objetos).
- `docs/capturas/barrio_loop_a.png` — 1280x640, semilla 3455: reproduce la misma disposición que `art/concept/out/manzanas/barrio_loop_a.png` (plaza y cortada arriba, casa/esquina/vías/cortada abajo) para comparar de frente (235 objetos).
- `src/mapView.js` — único cambio fuera de `src/maps/barrio/`: `if (obj.flipX) mesh.scale.x = -1` en `addObject`.

## Firmas

```js
// src/maps/barrio/pieces.js
export const PIECES = { casa, esquina, plaza, vias, cortada };
// cada pieza: (opts = { openSouth: false }) =>
//   { type, grid: [20 strings de 20 letras], objects: [...], marks: [...] }
export function tileFor(type, tx, ty, letter, gx, gy) // baldosa para una letra de la grilla
export function inPlazaPath(tx, ty)                   // caminos de nieve pisada de la plaza

// src/maps/barrio/index.js
export function layoutCells(seed) // [{ type, col, row, openSouth }]  (grilla 4x2)
export function buildBarrio(seed) // { cells, map }
```

Los objetos de una pieza usan la misma forma que `src/maps/street.js`: `{ id, sprite, x, y, tw, th, offset:[ox,oy], ...extra }`, con `x,y` en baldosas LOCALES y `put(sprite, left, base)` ubicándolos por la esquina inferior izquierda en px locales (0..320).

## Forma de `map`

```js
{
  id: 'barrio', name: 'Barrio', cols: 80, rows: 40,
  floor,                       // 80x40 de nombres de baldosa (tiles.json)
  objects,                     // ids únicos c{col}r{row}_{n}, x/y desplazados a la grilla
  solidTiles: ['black', 'grass_', 'estatica_'],
  spawn: { x: 82, y: 520, dir: 'right' },   // vereda frente al portón de la casa
  bounds: { minX: 0, maxX: 1280, minY: 0, maxY: 640, minFeet: 0, maxFeet: 640 },
  lights: [],
  emissive: 'snow',
  emissiveTiles: ['snow_', 'sidewalk_', 'curb_', 'road_', 'path_'],
  arena: { minX: 0, maxX: 1280, minY: 0, maxY: 640 },
  spawns: { m1: {x,y}, ..., boca_1: {x,y}, ... },
  loot: [{ x, y, kind: 'loot'|'nafta', cell: type }],
  crate: { x, y } | null,                 // caja de municiones (sólo si hay esquina)
  exitHome: { x: 66, y: 496, w: 32, h: 20 },
  cells, endX: 1280,
  surfaces: [], windows: [], npcs: [], pickups: [], warps: [],
}
```

`marks` de cada pieza: `{ kind: 'spawn'|'loot'|'nafta'|'crate'|'exitHome'|'entrada', x, y }`; `exitHome` lleva además `w/h`. Los `spawn` son los médanos; `nafta` va en el centro de cada auto; `crate` y el `loot` de la ferretería comparten el punto de la caja de municiones.

## Reglas de armado

- Fila de abajo: casa en `(0,1)` + 3 piezas distintas al azar de `[esquina, plaza, vias, cortada]`.
- Fila de arriba: sobre cada pieza con salida al norte (esquina/plaza/vias), 50 % y mínimo una, una pieza al azar no-casa con `openSouth: true`.
- `openSouth`: filas 18 y 19, columnas 9–11 = `r`; la verja sur se corta en x 144..192.
- Piso: `S→snow_*`, `g→grass_0`, `v→sidewalk_{(x+y)%2}`, `r→road_*`, `b→tile_0/1`, `t→balasto_*`; filas 14 y 18 con vereda pasan a `curb_0`; vías con `via_0` en filas 5 y 7 y `via_tablon_0` en columnas 9–11; la plaza cambia `S` por `nieve_pisada_0/1` dentro de la rotonda (r 38 en 160,118), la avenida vertical (±20 px) y las cuatro diagonales (±9 px).
- Borde del loop: las baldosas de una pieza a 1 baldosa de una celda vacía o del borde del mapa pasan a `estatica_*` con 50 % (rng derivado de la semilla). Entre dos celdas llenas nunca se toca la calzada.
- Celdas vacías: `estatica_{(x*7+y*3)%4}`.

## Verificación

- `npm test` en verde (570 pruebas, incluidas las 7 nuevas).
- `npm run build` sin errores.
- `node --check` en todos los archivos nuevos.
- `node tools/barrio_preview.mjs` → `docs/capturas/barrio_seed_1.png` (1280x640, 198 objetos, sin sprites faltantes). Levanta Vite y lo mata solo.
- `node tools/barrio_preview.mjs 3455 barrio_loop_a.png` → misma disposición de piezas que el concepto `art/concept/out/manzanas/barrio_loop_a.png`; comparadas lado a lado: mismos objetos en las mismas posiciones. También se comparó cada pieza con `manzana_1..5.png` (crops ×3): casa, esquina, plaza, vías y cortada coinciden objeto por objeto.

## Lo que quedó aproximado

- La farola torcida de la esquina se dibuja derecha (`farola`), sin rotar.
- Los médanos `big=True` de la plaza usan el `snow_mound` normal (no hay versión 48x24 en los atlas).
- El concepto recorta las verjas contra el borde de la pieza; acá la pieza que se pasa de ancho se pega al borde (se superpone unos px con la anterior) para no invadir la celda vecina.
- Las huellas de la nieve (`huellas()`) se omitieron. Las marcas `trampa` y `salida_e/n/s` del concepto no se exportan porque el contrato de `marks` sólo admite los seis kinds pedidos: las salidas quedan codificadas en la grilla/piso.
- Los caminos de la plaza son una aproximación por baldosas: se ven escalonados, no curvas suaves como el concepto.
- El borde del loop es una franja de 1 baldosa con 50 % de estática; el concepto deshace la pieza con un tramado Bayer de 28 px. Se respetó la regla del brief (más simple y legible a 1x).
- El paso a nivel usa tablones sólo en las filas 5 y 7 (las de los rieles); las filas 6 y 8 quedan de balasto, como pide el brief.
- `exitHome` queda en x 66..98 / y 176..196 (local) tal cual el brief. Ojo para la arena (worker D): el portón es sólido y la fila de pasto también, así que el jugador no puede *pararse* con los pies dentro del rect (el mínimo alcanzable es `feet = 518`, 2 px abajo del borde inferior). La salida hay que dispararla con el cuerpo: el `footBox` de 10x6 (que va de `feet-6` a `feet`) sí solapa el rect desde `feet = 518` (`overlaps(footBox, exitHome)`), o por cercanía al borde inferior. No alcanza con `warpAt(x, feet, [exitHome])`.
- Polsky se mantiene con `showIfFlag: 'polsky_muerto'`, como en `street.js`.
