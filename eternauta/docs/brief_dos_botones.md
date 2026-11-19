# Brief · Dos botones: Hacer y Manos (19/11, aprobado)

Repo `/home/mateyfasito/dev/game/eternauta`. **Especificación:** `art/direccion/DIRECCION.md` → "Controles e interacción"
(Botones, Tipos de objeto reglas 1-5, Barra de acciones). Leé antes `docs/brief_manos_resultado.md`,
`docs/brief_tipos_resultado.md` y `docs/diseno_manos.md` para saber cómo está hoy el código.
No tocar `bocetos/` ni dibujar arte (el glifo `x` ya existe en `public/assets/buttons.json`). No tocar el Vite del 5173.

## Qué cambia

1. **Se borra Mirar como botón.** Fuera la Q (`LOOK_KEYS` en `src/input.js`), la B como Mirar en el mundo
   (`src/scenes/world.js` ~l.834; en menús y diálogos la B sigue siendo Volver) y la entrada `look` de `ACTIONS`
   en `src/glyphs.js`. El modo `look` de `resolveAction` (`src/actions.js`) deja de existir como modo de entrada.
2. **Hacer** = el modo `primary` de hoy (click izquierdo / A), renombrado en textos y comentarios ("Acción" → "Hacer"
   donde lo vea el jugador: barra, pantalla de Controles). En los tipos sin verbo propio (decorado, cosa, superficie,
   mueble liviano, aparato en estado `look`) Hacer es Mirar, como hoy. **Mirar no pide alcance** (de lejos se mira:
   que el click lejano sobre un decorado mire en vez de decir "Acercate un poco."); todo lo demás sí.
3. **Manos pasa del RT a la X del joystick** (botón 2; sacar el RT). Mouse: click derecho, sin cambios.
4. **Primera vez:** si un objeto con verbo propio (no persona) tiene línea de mirar (`src/data/script.js`, `lookLine`
   de `src/data/descriptions.js`), al usarlo por primera vez en la partida Juan dice esa línea antes del resultado; en
   un paso (escalera, portón, puertas), antes de cambiar de ambiente. Se guarda por partida (`game`), se borra en `reset()`.
   No debe romper diálogos ni objetivos de la historia (si el uso dispara un diálogo propio de la historia, ese manda y
   la línea se marca como dicha).
5. **Barra:** Hacer, Manos (si hay algo que agarrar o dejar) y Mochila. Nunca una entrada Mirar aparte. Glifos mouse
   `[click] [click der.] [I]`, joystick `[A] [X] [Y]`.
6. **Pantalla de Controles** (`src/menus.js`): tabla de DIRECCION.md (Hacer, Manos, Mover, Elegir ítem, Mochila, Menú),
   dos columnas.
7. Mapeo no estándar del pad: A=0 B=1 X=2 Y=3 LB=4 RB=5 Start=9.

## Tests

- Actualizar los que fijen Q/B = Mirar o RT = Manos (explicar cada cambio en el resultado).
- Nuevos: Q y RT no hacen nada en el mundo; X agarra/deja; B en diálogo vuelve y en el mundo no hace nada; la barra
  nunca muestra "Mirar" como entrada aparte salvo como texto de Hacer; click lejos sobre un decorado lo mira; la línea
  de la primera vez sale una sola vez (radio, escalera) y se borra con `reset()`; recorrido del mate y la pava intactos.
- Auditoría de alcance (`test/alcance_audit.test.js`) en 0 fallos.

## Verificación

- `npm run build` y `npm test` sin errores.
- Headless (NO abrir ventanas) con `npx vite --port 5197 --strictPort` en background:
  `URL=http://localhost:5197/ node art/concept/auditoria_alcance.mjs` → 0 fallos; `node art/direccion/capturas.mjs` y
  `node art/direccion/capturas_ctrl.mjs` sin errores de página. Rehacer las capturas de la sección de controles
  (`manos_controles.png`, `manos_barra_*.png`, `tipos_radio.png`, `tipos_parlante.png`) con el esquema nuevo, y una
  `dos_primera_vez.png` con la línea de la escalera.
- Matar SOLO ese Vite por PID (`ss -ltnp | grep ':5197 '`), nunca `pkill -f`.

## Resultado

`docs/brief_dos_botones_resultado.md`: qué se hizo por punto, archivos y tests cambiados (y por qué), build/tests,
auditoría, capturas, y lo que no se pudo cumplir. No commitear.
