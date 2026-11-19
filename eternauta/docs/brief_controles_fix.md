# Brief · Retoques de controles (19/11)

Repo `/home/mateyfasito/dev/game/eternauta`. Viene de `docs/brief_controles.md` / `docs/brief_controles_resultado.md`.
No tocar `bocetos/` ni el arte. No tocar el Vite del 5173.

1. **Glifo de Mirar con mouse:** en la barra de acciones (`ctrl_barra_mouse.png`) y en la pantalla de Controles
   (`ctrl_pantalla_controles.png`, fila "Mirar", columna Mouse) se dibuja el glifo `mouse` (click izquierdo). Tiene que ser
   `mouse_r` (ya existe en `public/assets/buttons.json`). Revisar `glyphName` en `src/glyphs.js` y la tabla de Controles en
   `src/menus.js`; test que lo fije.
2. **"1 8" en Controles:** la fila "Barra de ítems", columna Teclado, muestra "1  8": la fuente no tiene el guion largo.
   Usar un carácter que exista en la fuente (`public/assets/font.json`), p. ej. "1 a 8" o "1-8". Revisar que ningún otro
   texto nuevo de esta tanda use caracteres que la fuente no tiene (`–`, `—`, `·`, comillas tipográficas); test que recorra
   los textos de la pantalla de Controles y de la barra y verifique que todos los caracteres existen en la fuente.
3. **Cuadradito lejos casi invisible:** en `ctrl_cursor_lejos.png` (mouse sobre la ventana del living, lejos) los corchetes
   ámbar casi no se ven. Lejos tiene que verse claro pero distinto de cerca: corchetes ámbar `rgb(255,190,120)` con alpha
   ~0.75 fijo (sin latido) y la sombra oscura de 1 px como cerca; el marco tenue puede quedar en ~0.18. `src/cursor.js`.

Verificación: `npm run build`, `npm test`; con `npx vite --port 5197 --strictPort` en background,
`URL=http://localhost:5197/ node art/direccion/capturas_ctrl.mjs` y revisar las tres capturas. Matar SOLO ese Vite por PID.
Resultado breve en `docs/brief_controles_fix_resultado.md`. No commitear.
