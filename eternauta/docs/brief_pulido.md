# Brief · Pulido de la tanda del 19/11

Repo: `/home/mateyfasito/dev/game/eternauta` (Three.js + Vite; UI en canvas 1x de 480×270).
Tablero: `art/direccion/DIRECCION.md`, ítems #1 a #5. Reglas de los menús de madera: misma doc, sección "Menús y pantallas".

No tocar `bocetos/`, ni dibujar arte nuevo. No tocar el Vite del puerto 5173 (es del usuario).

## Tareas

1. **Nombre del casco** (`src/items.js`, ítem `casco`): `name` pasa de `'Casco de buzo'` a `'Casco del traje'`.
   Buscar con grep si "Casco de buzo" o "buzo" aparece en otros textos (diálogos, objetivos, tests) y alinearlo.
2. **Ícono de la lata:** el arte ya está redibujado en `art/sprites/items/lata.png` y `art/sprites/items/latas.png`
   (antes medían 5×6 px y se leían como una "E"). Correr `npm run sprites:pack` y verificar que `public/assets/items.png`
   tenga los íconos nuevos. Si algún test fija el tamaño/hash de la hoja, actualizarlo. La lata apoyada en el mundo usa
   otro sprite (`lata_roja`) y no cambia.
3. **Etiqueta "Subir" de la escalera** (warp `stairs_up` en `src/maps/house.js`, escalera de 32×64 en x 16..48, y 16..80):
   averiguar dónde y cómo se dibuja la etiqueta del objetivo/warp (hover del mouse y joystick) y sacar una captura con el
   jugador al pie de la escalera mirando hacia arriba y otra con el mouse encima. Si la etiqueta tapa el dibujo de la
   escalera, moverla para que quede al costado o arriba del dibujo sin taparlo (sin cambiar cómo se ven las demás etiquetas).
   Si no la tapa, no cambiar nada y decirlo en el resultado.
4. **Apuntado con joystick/teclado** (`pickTarget` en `src/interaction.js`, llamado desde `src/scenes/world.js` ~línea 500
   con `reach: 22`): la pasada "adjacent" elige lo más cercano a los pies **sin mirar la dirección**. En el living, parado
   frente al sofá mirando hacia arriba (x≈104–112, pies≈80–96), se elige un objeto de la mesa ratona que está **a la espalda**.
   Arreglarlo: en la pasada adjacent, descartar (o poner al final) los candidatos que quedan detrás del jugador respecto de
   `dir` (por ejemplo: mirando arriba, descartar cajas cuyo borde superior esté por debajo de los pies). Debe seguir
   funcionando todo lo demás (prioridades, mate sobre la mesa, NPC delante de muebles, extractor del garaje con `reach: 56`,
   ventana del living con `reach: 48`). Agregar tests en `test/` con este caso del living (frente al sofá mirando arriba →
   ventana o sofá, nunca la mesa de atrás) y un caso de control que ya funcionaba.
5. **Cofre de madera** (`ChestPanel` en `src/menus.js` ~línea 864; captura actual `art/direccion/doc/capturas/cofre.png`):
   hoy usa el panel de papel rayado. Pasarlo al estilo de la mochila (`PauseMenu`, mismo archivo) con las primitivas de
   `src/titleUi.js` (`woodSign` con `seams`, `carve`, `amberFrame`, `selectBar`, `flake`) y la barra de glifos
   `drawPromptBar` de `src/glyphs.js`:
   - cartel de madera sin nieve, con juntas; título del cofre ("Cajón de herramientas") en una tablita clavada arriba,
     como la pestaña elegida de la mochila (cara `#9a663a`, texto crema `#fff8e2`);
   - casilleros tallados de 22 px como los del inventario, el elegido con marco ámbar `#ffcf6e`;
   - ficha del ítem: ícono ×2 en hueco tallado de 38×38, nombre crema, descripción en `#d9ad7c` (mismo layout que la
     ficha del inventario, adaptado al ancho);
   - glifos "Agarrar" / "Cerrar" en la tablita oscura abajo a la derecha, como la mochila;
   - nada de papel rayado ni texto marrón sobre crema.
   Actualizar los rectángulos de click del cofre y sus tests (mouse, teclado y joystick tienen que seguir igual), y
   agregar un test de que los rects caen dentro del cartel.

## Verificación

- `npm run build` y `npm test` sin errores.
- Capturas headless (NO abrir ventanas) con `npx vite --port 5197 --strictPort` en background:
  `URL=http://localhost:5197/ node art/direccion/capturas.mjs` (regenera `cofre.png`, `menu_pausa_*.png`, etc.) y las
  capturas de la escalera de la tarea 3 en `art/direccion/doc/capturas/pulido_subir_{joystick,mouse}.png`.
- Al terminar, matar SOLO ese Vite por PID (`ss -ltnp | grep ':5197 '`), nunca con `pkill -f`.

## Resultado

Escribir `docs/brief_pulido_resultado.md`: archivos cambiados, build/tests, capturas y qué se decidió en la tarea 3.
No commitear.
