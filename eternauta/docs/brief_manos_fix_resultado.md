# Resultado · Retoques visuales de Manos (19/11)

Implementado `docs/brief_manos_fix.md`. No se commiteó nada. No se tocó
`bocetos/` ni el Vite de 5173.

## 1. Etiqueta suelta "pava"

**Qué la dibujaba:** no era una etiqueta de mundo ni un aviso flotante. Era el
texto del termómetro de la pava, en `WorldScene.drawHud`:

```js
drawText(ex, glyphs, VIEW_W - 52, 126, 'pava', ...);
```

Se dibujaba en la capa extra de UI, en una posición fija de pantalla y sin
fondo. A 1920x1080 caía justo encima de la pava de la estufa.

**Arreglo:** el texto ahora va en una tablita oscura (`darkPanel`) **arriba**
del termómetro, que sigue en el borde derecho. Así queda como el resto de las
etiquetas y no tapa nada del mundo.

**La pava sobre el fuego:** se verificó que la pava está dibujada en el propio
frame `stove` (`tools/art/objects.py::stove()`, la silueta de chapa sobre la
tapa). Lo único que la ocultaba era el texto flotante. En la captura nueva se
ve la pava sobre la estufa y la barra de Manos anuncia **"Agarrar la pava"**
(el objetivo es `stove`, estado `ocupada`).

## 2. Etiquetas de inválido y silueta rojiza

### Etiquetas
Se agregó `placeGhostLabel()` en `src/hud.js`:

- usa `placeLabel` con la **caja de la silueta** (centro arriba de ella);
- pasa la **caja completa de Juan** (16x32 en mundo, escalada por el zoom)
  como obstáculo;
- si la etiqueta centrada pisaría a Juan, `placeLabel` la corre al costado
  (arriba a la derecha o a la izquierda), nunca abajo.

`drawHandsFeedback` ahora guarda en `handsFeedback.box` la caja del sprite
fantasma y dibuja el aviso con `placeGhostLabel`. "No entra ahí." y "Taparía
el paso." quedan arriba de la silueta y fuera de Juan.

### Silueta rojiza
Había dos problemas:

1. **No se dibujaba nunca.** El material clonado del atlas conservaba
   `alphaTest = 0.5`, y la silueta inválida va con `opacity = 0.45`: el
   fragmento quedaba descartado por completo (alfa final 0.45 < 0.5). Se puso
   `alphaTest = 0` en el fantasma. Ahora sí se ve.
2. **El tinte no se leía sobre el piso.** Multiplicar el color del sprite por
   un salmón claro casi no cambia un sprite marrón sobre un piso marrón. Se
   genera una **máscara blanca del frame** (`silhouetteTexture`, canvas con el
   alfa del atlas) y se pinta plana con `#f09a7a` al 45 % de opacidad; el 55 %
   restante es la mezcla con el fondo, como pide el brief.
   La silueta válida sigue siendo el sprite real, al 55 %, con cuadradito.

### Capa
La silueta va en `GHOST_Z = 21` (el overlay de luz está en z=20 y el piso en
0.5), con `depthTest = false` y `renderOrder = 4`: queda **encima del piso,
los muebles y la iluminación**, y **debajo de las etiquetas** (capa extra en
`uiScene`, z=31, y HUD). Se verificó también en apagón: la silueta se ve, sólo
que el post-proceso oscurece todo el mundo por igual.

### Tests
Se agregaron 3 pruebas en `test/prompt_layout.test.js` para
`placeGhostLabel`: arriba de la silueta, sin tapar a Juan (caso del mate en el
piso), corrida de Juan en el vano (caso de la silla) y centrada cuando no hay
obstáculo.

## 3. Capturas regeneradas

Con `npx vite --port 5197 --strictPort` (matado por PID al terminar) y
`URL=http://localhost:5197/ node art/direccion/capturas_manos.mjs`. Sin
errores de página.

Comparadas contra la lámina `art/concept/out/manos.png`:

- `manos_piso_agarrar.png`: cosa en el piso con sombra, brillito y cuadradito.
- `manos_dejar_silueta.png`: silueta válida texturada al 55 % y cuadradito
  dorado.
- `manos_invalido.png`: silueta rojiza plana **visible** en el casillero
  apuntado; "No entra ahí." arriba y corrida, sin tapar a Juan.
- `manos_cargar_silla.png`: silla sobre la cabeza, silueta válida de apoyo y
  `[RT] Apoyar la silla`.
- `manos_taparia.png`: silueta rojiza de la silla en el vano; "Taparía el
  paso." arriba, sin tapar a Juan.
- `manos_barra_pava.png`: la pava se ve sobre la estufa, el termómetro con su
  etiqueta en tablita oscura y `[RT] Agarrar la pava` en la barra.
- `manos_barra_dejar.png`, `manos_barra_sobre_juan.png`,
  `manos_barra_accion_sin_objetivo.png`, `manos_controles.png`: sin cambios
  de comportamiento, regeneradas.

## Verificación

- `npm run build`: OK (mismo aviso de tamaño de chunk que ya existía).
- `npm test`: **464 tests, 464 pass, 0 fail**.
- `URL=http://localhost:5197/ node art/direccion/pruebas_manos.mjs`:
  **22/22 pruebas OK**, sin errores de página.
- Vite de 5197 detenido por PID; el de 5173 no se tocó.

## Archivos

- `src/hud.js`: `placeGhostLabel()` (usa `placeLabel` con caja de silueta y de
  Juan).
- `src/scenes/world.js`: etiqueta del termómetro en tablita oscura; máscara de
  silueta (`silhouetteTexture`), `alphaTest: 0`, tinte `#f09a7a` al 45 %,
  `GHOST_Z = 21`, `depthTest: false`, `renderOrder: 4`; `handsFeedback.box` y
  aviso con `placeGhostLabel`.
- `test/prompt_layout.test.js`: 3 pruebas nuevas.
- `art/direccion/doc/capturas/manos_*.png`: regeneradas.
- Este documento.

## Decisiones

- La silueta inválida es una **silueta plana** teñida (máscara de alfa), no el
  sprite multiplicado por el tinte: con multiplicación el rojo se perdía sobre
  el piso y los muebles oscuros. Es lo que el brief llama "silueta rojiza".
- El aviso rojo se corre al costado cuando el centrado pisaría a Juan; sigue
  cumpliendo "arriba de la silueta".
- En apagón, el post-proceso oscurece la silueta junto con el resto del mundo;
  no queda tapada, sólo más oscura, igual que los demás sprites.
