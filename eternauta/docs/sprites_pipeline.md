# Sprites editables a mano (opción B)

Objetivo: cada sprite es un PNG suelto en `art/sprites/` que el dueño edita en LibreSprite. Un script arma las hojas `public/assets/*.png` y sus `.json`. Esos archivos sueltos pasan a ser la fuente; los generadores Python ya no pisan las hojas que estén ahí.

## Estructura
```
art/sprites/<hoja>/<nombre>.png    un archivo por sprite
art/sprites/<hoja>/_sheet.json     metadatos para volver a armar la hoja (no se edita a mano)
```
Hojas y tipos (formato actual de `public/assets/<hoja>.json`):
- **atlas** (`frames: {nombre: [x, y, w, h]}`): buttons, cascarudos, fx, fx_shooting, houses, interior2, objects, props, street2, tiles, items (además `cell`), cursor (además `w`, `h`, `hotspots`).
- **bloques** (`cell`, `blocks: {id: {x, y}}`; bloque = `cell.w*cols` × `cell.h*rows`, con `cols`/`rows` = 1 si no existen): chars2 (8×4 cuadros de 16×32; `ids` lista el orden), portraits_dlg (64×64), portraits_panel (32×32). Cada id es un PNG del tamaño del bloque, salvo **chars2**: cada personaje es una carpeta con un PNG por cuadro, `<dir>_<caminar|quieto>_<n>.png` (dir = abajo/arriba/izquierda/derecha), para que LibreSprite abra la secuencia como animación. Los personajes son una grilla de 8 columnas (walk1–6, idle1–2) × 4 filas (abajo, arriba, izquierda, derecha).
- **imagen suelta** (se copia tal cual): title, title_sky, snow, shadow, footprint, death_panel, views/attic_pan, views/attic_pan_dark, views/living. Sus `.json`, si existen (title.json, death_panel.json), no se tocan.
- Quedan afuera: chars, portraits (viejas), font.json, manifest.json.

## `_sheet.json`
`{"kind": "atlas"|"blocks"|"image", "size": [W, H], "layout": {nombre: [x, y, w, h]}, "meta": {...el json original sin frames/blocks...}, "keys": [orden de claves del json original]}`

## Comandos (`tools/sprites.py`, Python + Pillow, sin dependencias nuevas)
- `split [hoja...]`: corta las hojas actuales de `public/assets` y escribe `art/sprites/`. Si la carpeta de la hoja ya existe, no la pisa (avisa), salvo con `--force`.
- `pack [hoja...]`: arma `public/assets/<hoja>.png` y `.json` desde `art/sprites/`.
  - Si ningún sprite cambió de tamaño y no hay nuevos ni borrados, usa las posiciones y el tamaño de hoja guardados. El resultado es **idéntico** al original.
  - Si alguno cambió de tamaño o se agregó o borró un archivo, reempaqueta toda la hoja con estantes (alto descendente, 2 px de separación, ancho máximo = ancho anterior, con mínimo 256) y actualiza `_sheet.json`.
  - Bloques: si un PNG no mide exactamente lo que el bloque, falla con un mensaje claro ("chars2/juan.png tiene que medir 128x128: los cuadros son de 16x32"). Un id nuevo se agrega al final, y en chars2 también se suma a `ids`.
  - El json se escribe con el mismo orden de claves y la misma indentación que el original.
- `check`: hace split a una carpeta temporal y pack desde ahí, y compara contra `public/assets`: píxeles (RGBA) iguales y json igual al parsearlo. Imprime OK o la diferencia por hoja. Sale con código 1 si algo difiere.

npm: `"sprites:split"`, `"sprites:pack"`, `"sprites:check"`.

## Que los generadores no pisen lo editado
En `tools/export_assets.py` (`save_img`, `save_json`, `export_atlas`) y en `tools/art/concept_export.py` (`save_png`, `save_json`, `save_atlas`): si existe `art/sprites/<hoja>/`, se saltea esa hoja (png y json) y se imprime `"<hoja>: editada a mano en art/sprites, no se regenera"`.

## Criterios de aceptación
1. `python3 tools/sprites.py check` da OK en todas las hojas.
2. Hacer `split` y después `pack` de todas deja `public/assets` igual píxel por píxel, y el json igual al parsearlo.
3. Agrandar 4 px un PNG de `interior2` y correr `pack` reempaqueta sin superposiciones; el json nuevo apunta a rectángulos que contienen exactamente cada PNG (con un test).
4. `npm run build` y `npm test` pasan.
5. Correr `npm run assets` y `npm run concept` con `art/sprites/` presente no modifica esas hojas.
