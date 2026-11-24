# Fix 2 — Manzanas con sentido (resultado)

**Fecha:** 23/11/2026 · **Alcance:** Tanda 2 del plan de `docs/analisis_roguelike.md`
(hallazgos L1–L12) después de los fixes 1A (IA) y 1B (sólidos). No se tocó
`src/main.js`, `src/run/*`, `src/taller.js` ni `src/base.js`.

## Qué existe ahora

| Archivo | Cambio |
|---|---|
| `src/maps/barrio/index.js` | Fila de arriba **llena** en todas las columnas elegibles y tipos **sin repetición** (L1/L5). La estática del borde solo se come **nieve** (nunca calzada/vereda, L2b). Los vecinos se pasan a cada pieza (`northOpen/eastOpen/westOpen`). Bocas 2 baldosas adentro y en la vereda de enfrente (fuera de los autos). `bounds.minFeet = 32`, `minX/maxX = 12/1268` (L7). Fuera `endX` y la boca sur muerta (L11). |
| `src/maps/barrio/pieces.js` | **Medianeras** de 3 tramos en los dos costados de cada pieza, filas 0-11 (L3). **Cierres legibles**: muro de ladrillo en cada calle sin vecino (este/oeste y borde del mapa) y cerca + tapiales en el fondo del lote con la avenida norte tapada (L2). **`fenceLine`**: cercas en fila sin superponer y recortadas al borde de la pieza (L10). **Casa**: portón lateral de 3 baldosas en la fila 11, alineado con el pasillo entre los dos chalets (L8); la farola se corrió para no taparlo. **Plaza**: 2 puntos de botín junto al busto y la hamaca (L4), avenida pintada de 48 px (L6). **Cortada**: callejón a 64 px con cuello de 48, tapiales que cierran los recovecos laterales, y el fondo del lote conectado al patio (sigue siendo un callejón con una sola entrada desde la calle). **Vías**: nieve sobre las puntas de los rieles + las medianeras como tope (L9). Fuera las marcas `entrada` (L11). |
| `test/barrio_level.test.js` (nuevo) | 12 tests. Los 6 críticos (L1, L2, conectividad con objetos, bolsones, L3 y L4) recorren **200 semillas** con el modelo de sólidos del juego (solidPx + bbox opaco de los PNG + la caja de municiones) y la caja de pies 10x6; L7/L11 usan 4 semillas y L6/L9/L10 se miden por pieza. |
| `tools/diag/barrio_level_audit.mjs` | Solo medición: usa el rect sólido real (`solidRectFor`) en vez del rect de baldosas (quedó viejo tras 1B) y mide el alcance del botín con la tolerancia de una baldosa (el BFS es por baldosas; el jugador se para al lado). Sigue sin pasar el `trim` de los PNG: es más conservador que el juego. |
| `tools/diag/barrio_visual.mjs` | Solo medición: agrega el sólido de 16x16 de la caja de municiones (lo crea la arena, C2) para que el mapa de calor no pinte de verde baldosas que frenan. |
| `tools/diag/arena_stuck.mjs` | Solo medición: el punto fijo del jugador (330,480) quedó dentro de una medianera nueva; se movió a la vereda oeste de la ferretería (340,540), un punto libre de verdad. La IA no se tocó. |

Capturas nuevas en `docs/capturas/`:

- `barrio_fix2.png` — el barrio armado entero (sin overlay), semilla 3455.
- `diag_solidos_barrio.png` / `diag_caminable.png` — rehechas con `barrio_visual.mjs`.
- `fix2_00…05_<pieza>.png` — la cámara del juego en la calzada de cada pieza.
- `fix2_casa_fondo.png`, `fix2_cortada_patio.png` — Juan adentro del fondo de la
  casa y del patio de la cortada (ronda congelada para que se vea).
- `fix2_cierre_calle.png`, `fix2_cierre_vereda.png` — Juan frenado contra el muro
  del borde este sin vecino, en la calzada y en la vereda.

## Cómo se verifica

```bash
npm test                                  # 744+ pass, 0 fail (incluye los 12 nuevos)
npm run build                             # OK
node --test test/barrio_level.test.js     # 12/12 (L1/L2/conectividad/bolsones/L3/L4 sobre 200 semillas)
node tools/diag/barrio_visual.mjs 3455    # sólidos fuera del dibujo: 0
                                          # hueco del paso a nivel: 144..192 (48 px)
                                          # caminable: 1370/1370 (100,0 %)
node tools/diag/barrio_level_audit.mjs 3455 3455   # lootUnreachable: [], mouthsStatic: 0
node tools/diag/barrio_audit.mjs 3455     # mismatches: [] (los 3 "problems" son el
                                          # reporte de crate/exitHome/spawn, todo libre)
node tools/diag/barrio_colision.mjs       # 0,10 px / -0,05 px -> "OK colisiones" (1B intacto)
node tools/diag/enemy_stuck.mjs           # U llega en 5,47 s; pasillo 40/40
node tools/diag/arena_stuck.mjs           # 5/5 llegan a 0,7-4,5 px, 0 trabados (1A intacto)
node tools/diag/arena_drawcalls.mjs       # 166,3 draw calls/frame en reposo
node tools/diag/arena_choke2.mjs          # 4/4 llegan, 0 trabados
```

## Resultado por hallazgo

- **L1.** `layoutCells` llena **todas** las columnas elegibles (las que tienen
  salida al norte en la pieza de abajo): 3 celdas arriba cuando la fila de abajo
  no tiene cortada y 2 cuando la tiene (la cortada no encastra al norte). Antes
  llenaba 1,31 de 4 en promedio; ahora 2,25 de 4, y no queda ninguna columna
  elegible vacía.
- **L2.** En las 200 semillas: **0 salidas muertas sin cierre** y **0 bocas sobre
  estática** (y ninguna boca dentro de un sólido). La estática solo aparece en
  nieve de borde; la calzada y la vereda llegan enteras hasta el cierre. Los
  cierres son legibles: muro de ladrillo a plomo en las calles sin vecino (tapa
  de la fila 10 a la 19, calzada y vereda incluidas), tapiales en la avenida
  norte, cerca de tapiales/vara en el fondo del lote.
- **L3.** Medianeras de 2 lados en todas las piezas (filas 0-11), incluida la
  fila 0. Test: **ningún fondo pasa de una pieza a la vecina** en 200 semillas.
  La cortada es un callejón de una sola entrada: el patio y el fondo del lote se
  conectan entre sí, pero solo salen a la calle por la boca de cols 8-11.
- **L4.** La plaza tiene **2 marcas de botín** (busto y hamaca) y las vías
  conservan la suya en la franja norte (ahora sobre el balasto, no en el techo
  del chalet).
- **L5.** Los tipos de arriba no se repiten y son distintos del de abajo
  (permutaciones filtradas). La casa sigue siendo única y en (0,1).
- **L6.** Paso a nivel: 144..192 = **48 px**. Callejón de la cortada: **60 px**
  entre las caras de las paredes (4 baldosas libres = 64 px de grilla) con cuello
  de 50 px por la farola. Baranda de la plaza: 64 px.
  Avenida pintada de la plaza: 48 px. Pasos este/oeste y norte/sur: 48 px.
  (`fenceLine` ya no deja huecos de 16 px al recortar.)
- **L7.** `bounds.minFeet = 32` (el sprite se dibuja entero) y `minX/maxX = 12/1268`.
- **L8.** La casa quedó **abierta**: portón lateral de 3 baldosas en la fila 11
  (144..192) entre los dos chalets; el pino se movió para dejar el paso y la
  farola se apartó. El fondo ahora es alcanzable y está encerrado por las
  medianeras y la cerca del norte.
- **L9.** Los rieles terminan en las medianeras (muro de ladrillo) y tienen dos
  médanos de nieve en las puntas. Ningún riel "muere" contra un lote sin tope.
- **L10.** `fenceLine` reemplaza a `verjaRun`: los tramos se apoyan sin
  superponerse y el último se recorta al borde. Test de solapamiento de cercas
  (`fence/hedge/tapial48/tapial80/gate/baranda`) en las 5 piezas: 0. Excepción
  documentada: el `alambrado` de las vías se pisa 18 px de arte a propósito
  (sus postes no se duplican y el hueco del cruce queda en 48 px; ver fix 1B).
- **L11.** Fuera las marcas `entrada` (nadie las consumía), `endX` del mapa y la
  rama de boca sur (imposible con el layout). Los objetos que caían enteros
  fuera del mapa ya no se agregan.
- **L12** (lo que ya andaba) sigue andando: exitHome alcanzable, autos que
  bloquean la fila 17 con paso por las veredas, baranda con hueco real.

## Verificación de la aceptación

`test/barrio_level.test.js` corre **200 semillas** (1..200) y fija:

1. **0 salidas muertas sin cierre**: cada lado sin vecino tapa ≥40 de los 48 px
   del pasillo, dentro de los 24 px del borde (unión de sólidos).
2. **0 bocas sobre estática** (y ninguna dentro de un sólido ni inalcanzable).
3. **0 botín dentro de un sólido**: se replica `reachableGround` de `arena.js`
   con los sólidos reales (incluida la caja de municiones que agrega la arena).
4. **Conectividad con objetos**: desde el spawn se llega a **todo el botín**, al
   **exitHome** (radio 26 como `nearExit`) y a **la calzada de cada pieza**.
5. **Sin bolsones**: ningún componente inalcanzable de más de **3 baldosas**
   (en 200 semillas el máximo medido es 3; hay recovecos de 1-2 baldosas entre
   decorado y paredes).

En el juego real (headless, Swiftshader) se caminó de verdad: se entra por el
portón al fondo de la casa (pies 552→362), al patio de la cortada (540→410), el
cruce de vías se pasa (390→580), la **calzada y la vereda** de una calle sin
vecino frenan contra la pared (x→941/942 < 960) y la medianera no deja cruzar el
fondo a la pieza vecina (x→302 < 320). 0 errores de página. Las capturas
`fix2_casa_fondo.png` y `fix2_cortada_patio.png` muestran a Juan adentro (la
ronda se congela en el guion de captura para que no aparezca el cartel).

`diag_caminable.png` quedó **100 % verde** para la semilla 3455 (1379/1379
baldosas caminables alcanzables) y `diag_solidos_barrio.png` muestra los cierres
y medianeras sin sólidos fuera del dibujo.

De paso se midió el costo: el barrio pasó de 236 a ~319 objetos (cercas, muros y
medianeras) y `arena_drawcalls.mjs` da **166,3 draw calls/frame en reposo**
(antes del fix 2: 136,8; el techo que dejó anotado la Tanda 3 era 300). La IA
sigue igual: `enemy_stuck` (40/40), `arena_stuck` (5/5 a 0,7-4,5 px),
`arena_choke2` (4/4).

## Decisiones (para no volver a discutirlas)

- **No se inventó una pieza nueva.** L1 se resuelve llenando las columnas
  elegibles; arriba de la casa (sin salida al norte) no va pieza. Si se quisiera
  la grilla 4x2 completa haría falta una pieza fija "fondo" para (0,0) (queda
  como idea, no como deuda del fix).
- **Todos los fondos son privados** (`private`), cada uno con su acceso desde su
  propia calle: la casa por el portón lateral, la plaza por el hueco de la
  baranda, esquina/vías por la avenida, la cortada por el callejón. No hay
  "through": con medianeras ya no hace falta para recorrer el barrio.
- **La cortada conserva su rol**: una sola entrada (callejón), patio con botín
  al fondo y salida oculta al fondo del lote; si te alcanzan adentro, no hay
  salida rápida.
- **Los autos siguen siendo obstáculos de cuerpo entero** (1B/C4). Por eso las
  bocas este/oeste se movieron a la vereda de enfrente (fila 18): en la calzada
  caían dentro del auto estacionado de la esquina.
- **La estática de borde es solo nieve.** Es el "borde del loop" del concepto;
  la calzada nunca se deshace en damero.
- **Recovecos de 1-3 baldosas**: entre el decorado y las paredes quedan huecos
  chicos (el máximo en 200 semillas es 3 baldosas). No son bolsones jugables; se
  dejaron para no tapar el decorado con muros artificiales.
- **`barrio_level_audit.mjs` no era confiable**: seguía modelando los sólidos de
  los objetos como rect de baldosas (previo a 1B), así que marcaba botín
  inalcanzable que el juego sí alcanza. Se actualizó la medición; no cambia el
  juego.

## Pendiente / notas

- La grilla sigue siendo 4x2: la fila de arriba puede tener 2 o 3 piezas según
  si abajo hay cortada. La variedad viene de los tipos y del orden.
- El `barrio_audit.mjs` sigue sin usar los `trim` de los PNG (usa `solidRectFor`
  sin bbox opaco): es más conservador que el juego, pero ya no da falsos
  positivos de alineación.
- Si en el futuro se agrega la pieza "fondo" para (0,0), las medianeras y la
  cerca norte de la casa ya están listas para recibirla.
