# Brief · Retoques visuales de Manos (19/11)

Repo `/home/mateyfasito/dev/game/eternauta`. Viene de `docs/brief_manos_resultado.md`; diseño `docs/diseno_manos.md` §8 y
lámina `art/concept/out/manos.png`. No tocar `bocetos/`, el arte ni el Vite del 5173.

1. **Etiqueta suelta "pava"** en `art/direccion/doc/capturas/manos_barra_pava.png`: junto a la cocina aparece el texto
   "pava" sin fondo (arriba a la derecha de la estufa). Averiguar qué lo dibuja (¿nombre del ítem de la estación, etiqueta de
   Manos, aviso flotante?) y sacarlo o pasarlo al estilo de las etiquetas (tablita oscura). Además, en esa captura no se ve
   la pava sobre el fuego: verificar que la pava apoyada en la estación se dibuje (como antes de esta tanda) y que
   "Agarrar la pava" la apunte.
2. **Etiquetas de inválido tapan a Juan y la silueta rojiza no se ve** (`manos_invalido.png`, `manos_taparia.png`):
   "No entra ahí." / "Taparía el paso." tienen que ir **arriba de la silueta** (no sobre Juan; usar `placeLabel` de
   `src/hud.js` con la caja de la silueta y evitando la caja de Juan), y la silueta rojiza tiene que verse: sprite al 45 %
   teñido `#f09a7a` (mezcla 55 %) en el casillero apuntado, dibujado encima del piso/muebles y debajo de las etiquetas.
   Revisar que la capa de la silueta no quede debajo del piso o tapada por la iluminación.
3. Regenerar `URL=http://localhost:5197/ node art/direccion/capturas_manos.mjs` (con `npx vite --port 5197 --strictPort`
   en background) y comparar con la lámina: piso, silueta válida, inválida, cargar silla, taparía, pava. Matar SOLO ese Vite
   por PID.

`npm run build` y `npm test` sin errores. Resultado breve en `docs/brief_manos_fix_resultado.md`. No commitear.
