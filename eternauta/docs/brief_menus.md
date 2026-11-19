# Brief · Menús de madera (19/11, aprobado)

Repo: `/home/mateyfasito/dev/game/eternauta` (Three.js + Vite; la UI se dibuja en canvas 1x de 480×270 con posiciones enteras).
Diseño aprobado: `art/concept/out/menus_madera_{inventario,fabricar,opciones,fin}.png` (1920×1080 = vista ×4).
**La maqueta es código:** `art/concept/menus_madera.py` tiene TODAS las coordenadas, colores y el orden de dibujo.
Portala a canvas tal cual (mismo layout, mismos colores). Reglas en `art/direccion/DIRECCION.md`, sección "Menús y pantallas".

No tocar `bocetos/`, `src/maps/`, `art/sprites/` ni `public/assets/*.png` (hay otro worker trabajando ahí).

## Qué cambiar

1. **Primitivas compartidas** (en `src/titleUi.js` o un archivo nuevo `src/woodUi.js`):
   - `woodSign` ya existe: agregarle las opciones que usa la maqueta (`seams` = separación de juntas en px o 0,
     `face` = color de la cara, `shadow`). Debe seguir dibujando el cartel del título igual que hoy.
   - `carve(ctx, x, y, w, h)`: hueco tallado (relleno `#5e3a22`, borde arriba/izquierda `#3e2416`, labio abajo/derecha `#a06a3c`).
   - `amberFrame`, `flake` (copito), y la barra cálida `selectBar` (ya existe).
2. **Menú de pausa / mochila** (`PauseMenu` en `src/menus.js`):
   - Cartel `BX,BY,BW,BH = 52,40,376,164`, juntas cada 20 px, sin nieve. Pestañas como tablitas de 100×22 (separación 8),
     la elegida 100×25, más clara (`#9a663a`), pegada al cartel y con dos clavos.
   - **Inventario:** grilla 6×3 de casilleros tallados de 22 px (gap 3) en `(BX+18, BY+20)`; el elegido con marco ámbar
     `#ffcf6e`. Ficha a la derecha: ícono ×2 en hueco de 38×38, nombre crema, "Para el traje" en ámbar si el ítem es material
     del traje, descripción en `#d9ad7c`. Abajo, junta + "Para el traje faltan: …" (lista en `#f09a7a`) solo si faltan.
     Si la mochila está vacía, la ficha dice "La mochila está vacía." en `#d9ad7c`.
   - **Fabricar:** receta en fila tallada con la barra cálida; "Materiales" en dos columnas con ícono en hueco de 18 px y
     conteo `n/m` en `#b8d890` (completo) o `#f09a7a` (falta). Botón "Fabricar" = tablita 96×20 centrada abajo; apagada
     (cara `#7a4e2c`, texto `#d9ad7c`) si falta algo, encendida (cara `#9a663a`, texto crema) si está lista.
   - **Opciones:** "Reanudar" / "Volver al título" a escala 2, centradas, con barra cálida + copito en la elegida;
     "Volver al título pierde la partida." en `#f09a7a`; plaquita tallada con "Objetivo actual" + objetivo.
   - Barra de glifos abajo a la derecha del cartel, en una tablita oscura (como "Elegir" del título).
   - **Actualizar los rectángulos de click** (`pauseTabRects`, `pauseSlotRects`, `pauseRecipeRects`, `pauseOptionRects`) para
     que coincidan con el dibujo nuevo, y sus tests. Mouse, teclado y joystick tienen que seguir funcionando igual.
3. **Fin de partida del minijuego** (`src/arena/resultScreen.js`):
   - Cartel 280×176 centrado en y=30, con nieve, sobre dos postes de 10 px que bajan hasta el borde con montoncitos de nieve.
   - "FIN DE LA SALIDA" escala 2 (`#ffe8b0`) + separador; tres huecos tallados de 74×38 (gap 10) con "Ronda", "Bajas",
     "Puntos" arriba y el número a escala 2 abajo; línea "Mejor: Ronda N — P pts" y, si es récord, copito + "¡Nueva marca!" en ámbar.
   - Opciones "Otra vez" / "Volver al título" a escala 2 con barra cálida + copito; glifo "Elegir" debajo, entre los postes.
   - Actualizar `resultOptionRects` y sus tests.
4. **Texto del casco** (`src/items.js`, ítem `casco`): la descripción pasa a
   `'El casco del traje: capucha engomada, visera de vidrio y filtro de lata.'` (el diseño nuevo ya no tiene visor circular).

## Verificación

- `npm run build` y `npm test` sin errores (actualizar tests de layout/rects que cambien; agregar uno que verifique que los
  rects de las pestañas, casilleros y opciones caen dentro del cartel nuevo).
- Capturas headless (NO abrir ventanas): `npx vite --port 5197 --strictPort` en background y un script que saque las
  cuatro pantallas (`window.__eternauta.openMenu(0|1|2)`, y para el fin: `startArena()`, esperar, `game.scene.die()`,
  esperar, `game.scene.openResult()`), guardadas en `art/direccion/doc/capturas/menus_v2_*.png`. Compararlas con las maquetas.
  **Usar el puerto 5197** (el 5199 lo usa otro worker y el 5173 es del usuario). Al terminar, matar SOLO ese Vite por PID.

## Resultado

Escribir `docs/brief_menus_resultado.md`: archivos cambiados, build/tests, capturas y diferencias con la maqueta. No commitear.
