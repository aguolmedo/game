# Brief · Manos: agarrar, dejar y mover (19/11, aprobado y revisado)

Repo `/home/mateyfasito/dev/game/eternauta`. **La especificación es `docs/diseno_manos.md` (leerla entera, incluida la
sección 11 "Revisión").** Diseño de juego: `art/direccion/DIRECCION.md` → "Controles e interacción" → "Manos".
Lámina de cómo se ve: `art/concept/out/manos.png`.
Corre **después** de la tanda de tipos: leé `docs/brief_tipos_resultado.md` y `src/data/types.js` antes de empezar, y
apoyate en ese modelo (tipos, `name`, textos generados) y en `src/reach.js` (alcance por casilleros). No romper ninguno.
No tocar `bocetos/` ni dibujar arte (el glifo `rt` ya existe en `public/assets/buttons.json`).
No tocar el Vite del 5173.

## Alcance del trabajo (todo está detallado en el diseño)

1. Entradas (§1): dos formas de jugar, **mouse + teclado** (complementarios) o **joystick**; borrar el dispositivo
   `keyboard`, las teclas de acción del mundo (E, Espacio, Enter, R, F) y la X del pad. Manos = click derecho / RT.
   Menús y diálogos siguen navegables con teclado. Actualizar la pantalla de Controles a dos columnas (mouse + teclado, joystick).
2. Acción con uso propio sin objetivo y click sobre Juan (§2). Sin objetivo y sin uso propio, la barra **no** muestra
   Acción (hoy aparece un "[mouse] Acción" vacío: ver `art/direccion/doc/capturas/tipos_mochila_hover.png`).
3. Estado de cosas por partida en `game.world[mapId]`, cosas en el piso (sin imán), apilar, persistencia entre mapas,
   borrado en `reset()` (§3).
4. `resolveHands` puro en `src/actions.js` con el orden de §4.
5. Validez de dejar (§5) y de apoyar muebles con chequeo de alcance (§6).
6. Muebles livianos con la lista cerrada de §7: cargar sobre la cabeza, velocidad ×0.8, no cambiar de mapa cargando,
   apoyar, persistir `moved`, y el caso de la historia que saca a Juan del lugar.
7. Lo que se ve (§8): silueta válida/inválida, cosa en el piso con sombra y brillito, mueble sobre la cabeza, barra.
8. Historia (§9): la pava se agarra con Manos; mate, objetivos, truco y diálogos intactos.
9. Pantalla de Controles con la tabla nueva (tres verbos + elegir ítem + mochila + menú).
10. Tests de §10 y los casos de la revisión (§11). Actualizar los tests viejos que fijen F/X/"Usar en mí"/click derecho
    = Mirar (explicar cada cambio).

## Verificación

- `npm run build` y `npm test` sin errores; auditoría de alcance (`test/alcance_audit.test.js`) en 0 fallos.
- Headless (NO abrir ventanas) con `npx vite --port 5197 --strictPort` en background:
  - `URL=http://localhost:5197/ node art/concept/auditoria_alcance.mjs` → 0 fallos;
  - `URL=…5197 node art/direccion/capturas.mjs` y `node art/direccion/capturas_ctrl.mjs` sin errores de página;
  - capturas nuevas en `art/direccion/doc/capturas/manos_*.png` que reproduzcan la lámina: cosa en el piso con el
    cuadradito, silueta válida, silueta inválida con mouse ("No entra ahí."), Juan cargando una silla de la cocina con
    la silueta de apoyar, la barra con cada caso, y la pantalla de Controles;
  - prueba funcional: dejar el mate en el piso de la casa, ir al garaje y volver (sigue ahí), agarrarlo parado encima;
    mover la silla de la cocina y apoyarla; intentar apoyarla en el vano de una puerta ("Taparía el paso.");
    agarrar la pava del fuego con Manos; tirar la yerba en el balde de la cocina después de moverlo; recorrido del mate.
- Matar SOLO ese Vite por PID (`ss -ltnp | grep ':5197 '`), nunca `pkill -f`.

## Resultado

`docs/brief_manos_resultado.md`: qué se hizo por sección del diseño, archivos cambiados, tests cambiados y por qué,
build/tests, auditoría, capturas y cualquier punto del diseño que no se pudo cumplir (decirlo, no inventar otra cosa).
No commitear.
