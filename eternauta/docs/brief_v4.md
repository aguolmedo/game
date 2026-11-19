# Brief v4 · Planta baja y casco (19/11)

Repo: `/home/mateyfasito/dev/game/eternauta` (Three.js + Vite). Diseño aprobado por el usuario en
`art/direccion/DIRECCION.md` (tablero, ítems 1–4) y en las láminas `art/concept/out/house_v4_detalles.png`,
`art/concept/out/hv4_escalera_x10.png` y `art/concept/out/casco_v2.png`.

**El arte ya está en su lugar** (no dibujar nada ni tocar `bocetos/`):
- `art/sprites/objects/stairs_attic.png`: escalera nueva, **ahora 32×64** (antes 32×48).
- `art/sprites/items/casco.png`: casco nuevo, 16×16, mismo tamaño.

## Tareas

1. **Reempaquetar** las hojas: `npm run sprites:pack` (ver `docs/sprites_pipeline.md` y `tools/sprites.py`). Verificar que
   `public/assets/objects.json` tenga `stairs_attic` de 32×64 y que `public/assets/items.png` tenga el casco nuevo.
   Si algún test chequea el tamaño de la hoja `objects.png`, actualizar el valor esperado.
2. **`src/maps/house.js`**:
   - `SIZE.stairs_attic` pasa a `[32, 64]`. La escalera sigue con `put('stairs_up', 'stairs_attic', 16, 80, …)`
     (izquierda 16, base 80): ahora su parte de arriba llega al borde superior de la pared (y=16). Sigue `flat: true, solid: false`.
   - El warp `stairs_up` (`{ x: 16, y: 48, w: 32, h: 32 }`) puede quedar igual; si el click/hover sobre la parte nueva de
     arriba de la escalera (y 16..48) no lo toma, ampliarlo a `y: 16, h: 64` solo si eso no rompe tests.
   - **Sofá:** `put('sofa', 'sofa', 100, 142, …)` → `put('sofa', 'sofa', 88, 77, …)` (contra la pared del fondo, bajo la
     ventana, mirando a la mesa). Mantener `solid` e `interact`.
   - **Rueda:** `put('entry_tire', 'tire', 306, 128, …)` → `put('entry_tire', 'tire', 394, 142, …)`.
   - **Bidón:** `put('bidon', 'bidon', 308, 112, {})` → `put('bidon', 'bidon', 414, 141, {})`.
   - Elena (`npcs`, x 136, feet 136), la mesa ratona, los sillones y la radio NO se mueven.
3. Revisar que el jugador pueda seguir caminando: de la escalera al vano del hall (columna 12, filas 5–6), alrededor de la
   mesa ratona, y en la entrada del garaje del hall (vano columna 18, filas 6–7) hasta la puerta del garaje. Si algún
   sólido del sofá o de la rueda bloquea un paso, decirlo en el resultado (no inventar otro lugar).
4. Tests: `npm test` y `npm run build` sin errores. Si `test/pi_layout.test.js` u otro test fija las posiciones viejas,
   actualizarlo a las nuevas. Agregar un test chico que verifique las posiciones nuevas del sofá, la rueda y el bidón y
   que `stairs_attic` mida 32×64 en `public/assets/objects.json`.
5. **Capturas** (Chromium headless, NO abrir ventanas): con `npx vite --port 5199 --strictPort` en background,
   correr `node art/direccion/capturas.mjs` y `node art/concept/capturas_planta.mjs`. Al terminar, **matar el Vite del
   puerto 5199 por PID** (no usar `pkill -f` con un patrón que aparezca en tu propio comando). NO tocar el Vite del
   puerto 5173 (es del usuario).

## Resultado

Escribir `docs/brief_v4_resultado.md`: qué se cambió (archivos), resultado de build y tests, capturas generadas y
cualquier problema (por ejemplo, pasos bloqueados). No commitear.
