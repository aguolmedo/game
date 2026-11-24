# Fix 3 — Performance: resultado

Retomado desde el intento cortado. Se completó lo que faltaba y se verificó todo
en headless. **Sin cambios visuales** en las capturas de la salida y de la calle.

## Qué se hizo (por hallazgo)

### P1 — Fugas de GPU
- `src/footprints.js`: una sola `PlaneGeometry(6,3)` para todas las huellas y
  materiales compartidos por bucket de alpha (1/64). Ya no se crea geometría ni
  material por huella y no hace falta liberarlos al expirar.
- `src/arena/feedback.js`: textura y geometría del atlas **cacheadas por frame**
  (`textures`/`geos`); `dropSprite` libera sólo el material de la instancia.
  Al cambiar el frame de un fogonazo/vaina se reusa la geometría sin `dispose`.
  `ShootingFx.update()` reusa el objeto `world`, el `viewBuf` y compacta balas y
  estelas en el lugar.
- `src/sprite.js`: geometrías de sombra cacheadas por tamaño (14x5, 12x4, ...).
  El glow compartido ya no se puede disponer: `arena.disposeWorld()` sigue
  llamando `map.dispose()`, pero la textura singleton lo ignora (antes el mundo
  nuevo reusaba una textura ya liberada).
- `src/arena/reset.js`: al limpiar enemigos se libera el material propio de cada
  sombra (la geometría es compartida). Los meshes de enemigos/fx usan material y
  geometría cacheados por la arena, así que no se disponen.

### P2 — Draw calls / nieve
- `src/snow.js`: la nevada pasó de **428 meshes** (2 por copo) a **6
  InstancedMesh** (on/off por capa), con matrices escritas por frame sin
  allocaciones. Mismo tamaño, z, texturas, orden y alternancia on/off.

### P3 — Canvas que se redibujan por frame
- `src/font.js`: cache de puntos por `(glyphs, texto, escala, spacing)` + cache
  de canvas offscreen por texto/color/opciones, que se pega con **un solo
  `drawImage`** (en Node, sin DOM, cae al camino viejo de `fillRect`). Se
  arregló `wrapText` para que vuelva al corte histórico (sin contar el spacing
  de dibujo en el ancho de ajuste), como pide `test/font_cache.test.js`.
- `src/main.js`: la capa de fade ya no se limpia ni se sube si no hay nada que
  dibujar (`fade`, `blackoutT`, `equipAnim`); se limpia una sola vez al quedar
  vacía.
- Se agregó el hook de depuración `__eternauta.rendererInfo()`.

### P4 — Menos asignaciones por frame
- `src/arena/feedback.js`: arrays vacíos compartidos en `update`, cache de
  strings `rgba()` de la guía de tiro.
- `src/lighting.js`: el filtro de luces se hace en el array reutilizado
  `_filtered`; sólo se llama a `prioritizeLights` si hay más de 8.
- El cache de texto de `font.js` elimina la mayor parte de los arrays/Sets por
  etiqueta del HUD.

### P6 — Gradientes
- `src/lighting.js`: los gradientes radiales (hueco, charco y núcleo) se cachean
  por `(tipo, radio, color, alpha cuantizado a 1/128)` en un `WeakMap` por
  contexto, y se dibujan centrados en (0,0) con `translate`.

## Mediciones (headless, swiftshader)

Comando: `node tools/diag/<script>.mjs`. "Antes" = mismos archivos del proyecto
con los 7 archivos de esta tanda revertidos a HEAD; "Después" = estado actual.

| Medición | Antes | Después |
|---|---:|---:|
| `arena_drawcalls`: draw calls/frame en reposo | **547,9** (542–558) | **136,8** (136–142) |
| `arena_perf`: meshes en escena (1 mundo) | 725 | 221 |
| `arena_perf`: materiales / texturas | 294 / 286 | 212 / 209 |
| `arena_perf`: `update()` promedio | 3,679 ms | **0,806 ms** |
| `arena_perf`: `drawHud()` promedio | 2,871 ms (p95 4,9) | **0,458 ms** (p95 1,0) |
| `arena_perf`: rAF (sólo cota swiftshader) | 166,7 ms (~6 fps) | 43,6 ms (~23 fps) |
| `leaks_gl`: buffers tras clearEnemies + 600 huellas | +384 (708 vs 324) | **+16** (352 vs 336) |
| `leaks_gl`: buffers con 100 bichos | +104 | +12 |
| `arena_rebuild`: meshes por mundo (misma semilla) | 695 | 273 |
| `arena_rebuild`: glow dispuesto por `disposeWorld` | sí | **no** |
| `arena_rebuild`: estabilidad tras 3 rebuilds | estable | estable (273/273) |

`leaks_gl` ya no imprime "CONFIRMADO": queda por debajo del umbral de 20 buffers
(antes +384 por las huellas).

## Capturas antes / después

`docs/capturas/perf_antes/{calle,salida}.png` y
`docs/capturas/perf_despues/{calle,salida}.png`.

Método: dos servidores Vite (proyecto con la tanda revertida vs. actual),
Chromium headless, nieve y jugador congelados a valores deterministas para que
la comparación no dependa del azar ni del frame. Resultado: **0 píxeles con
diferencia >8** (máx. 5 sobre 765, sólo por la cuantización 1/128 del alpha de
los gradientes de luz; imperceptible).

## Tests y build

- `npm test`: **701/701 OK** (incluye `font_cache`, `feedback_perf`,
  `footprints_perf`, `title_snow`, `lighting`).
- `npm run build`: OK.
- `node --check` sobre los 8 archivos tocados: OK.

## Pendiente (necesita `src/scenes/arena.js`, no permitido en esta tanda)

- **P3**: `drawHud()` sigue ejecutando el pase de luz (`lightUi.clear/draw/
  commit`) cuando el resultado o la viñeta tapan la escena. Para saltearlo hace
  falta que `arena.js` consulte `resultOpen`/`vignetteOpen` antes del pase.
- **P4**: quedan allocaciones por frame en `readControls`/`readAim`,
  `updateEnemies`/`steer`, `updateToasts` (`filter`) y `collectLoot`; todas en
  `arena.js`.
- **P1/P5**: `removeEnemy`/`clearSurvivor` sólo hacen `scene.remove`; conviene
  liberar el material de sombra del bicho que muere suelto y limpiar
  enemigos/FX/botín al inicio de `buildWorld`. Requiere `arena.js`.
- **P2**: el mobiliario del barrio sigue siendo ~1 mesh por objeto (235). El
  batch por atlas (UVs + geometría estática) necesita `mapView.js`/`arena.js`.
  Con la nieve instanciada los draw calls en reposo ya quedan muy por debajo de
  300.
