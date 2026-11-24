# Roguelike: propuesta narrativa (brainstorming)

22/11/2026. Ideas sueltas, nada implementado. Primero va el arte.

## La premisa

Juan, perdido en el continuum, cae en un universo paralelo: el **universo 16 bits**. Ahí queda atrapado en un **loop**: la noche de la nevada se repite, y cada vez sale distinta (objetos, lo que dicen los NPCs, la mano de truco, el ritmo de las oleadas).

**Poca historia:** es un gag y después se juega. Lo filosófico queda de fondo y no es trama: los loops, y si las Elena y Martita en píxeles "son ellas".

## Estructura

1. **La llegada.** Negro, con el continuum como estática. Aparece el Eternauta viejo en tinta, con el trazo de la historieta, y al tocar este universo el dibujo se **cuantiza**: la tinta se vuelve píxeles y la paleta se achica. Se mira las manos, que son cuadraditos.
2. **El gag del programador.** Cae en la silla de al lado del programador (guiño a la p013, el guionista), en un cuarto que también está en 16 bits. No viene a contar la invasión: viene a **quejarse**.

   > — Llevo no sé cuántas veces la misma noche. Salgo a la calle, me matan los bichos y vuelvo al truco. Siempre el truco.
   > — Ah, sí... es que el juego todavía no tiene final.
   > — ¿El qué?
   > — Te estoy programando. Esto es un roguelike.
   > — ...¿Un qué?

   Explica todo de una: está atrapado porque la historia no tiene final, y cada loop sale distinto porque el programador lo va cambiando.
3. **La nevada.** Lo que ya existe: el truco, el apagón, la nevada. Se juega con el Juan joven (el viejo cuenta y el joven se juega, como en la original).
4. **El traje, una sola vez.** Se arma con la historia, se guarda la partida y queda en el garaje para siempre.
5. **La calle es el roguelike.** Salís, sobrevivís y volvés (o te matan y volvés a la casa).
6. **La casa es la base.** Con lo que traés de afuera (chatarra, goma, piezas de cascarudo, nafta) se fabrican mejoras:
   - Favalli, en el banco del garaje: el rifle (cargador, cerrojo, mira).
   - Lucas, con la radio: detectar a los Manos, ver de dónde salen.
   - Elena: remendar el traje y agregarle capas.
   - El electrógeno: luz y bengalas.

## Las mejoras de la casa (primera pasada)

Cada estación es un camino de tres mejoras que se hacen en orden. Se pagan con botín: chatarra (Ch), goma (G), nafta (N) y pieza de cascarudo (P), que es la cara.

| Estación | Mejora | Efecto | Costo |
|---|---|---|---|
| Favalli · el rifle | Cerrojo aceitado | Un tiro cada 0,45 s (en vez de 0,55) | 4 Ch |
| | Cargador de ocho | Ocho balas por cargador (en vez de cinco) | 6 Ch + 1 P |
| | Punta de élitro | La bala atraviesa dos cascarudos sin perder fuerza | 3 P + 2 Ch |
| Elena · el traje | Doble capa | Una mordida más (cuatro parches) | 3 G |
| | Remiendo rápido | El parche tarda la mitad | 2 G + 1 Ch |
| | Hombreras de élitro | La primera mordida de cada ronda no rompe nada | 2 P + 2 G |
| Lucas · la radio | Antena en el techo | Agarra rumores de esta noche; algunos son ciertos | 3 Ch |
| | Válvulas nuevas | Más frecuencias: sobrevivientes que piden ayuda (encuentros en la salida) | 2 Ch + 1 P |
| | La frecuencia de ellos | Una voz que cuenta números; avisa antes de algo grande | 3 P |
| Electrógeno · luz y fuego | Bengala | Una por salida: los cascarudos se frenan en su luz | 2 N |
| | Botella de nafta | Una por salida: fuego en el piso unos segundos | 2 N + 1 Ch |
| | Farol de mano | Luz alrededor de Juan: de noche se ve más lejos | 3 N + 2 Ch |

Arte: `art/concept/roguelike_casa.py` (garaje con las estaciones, pantalla del taller, íconos).

## Lucas, radioaficionado

La radio no es un radar: es la **fuente de gags y de pistas del loop**. Cada mejora destraba más frecuencias.

- **Rumores de la noche:** "dicen que en la ferretería quedaron balas", "por la esquina del choque no vayas". Según el loop, son ciertos o no: son pistas de cómo se armó el barrio esta vez.
- **Sobrevivientes que piden ayuda** por radio, que aparecen como encuentros en la salida.
- **Gags de lo que agarra la radio:**
  - Otro radioaficionado de otro loop: "CQ, CQ, acá desde Vicente López... ¿Juan? ¿Sos vos?" Es Juan, en otra noche.
  - Un partido de 1957 que sigue transmitiendo como si nada: "¡Gol!", mientras afuera cae la nevada.
  - Un tango cortado por la estática, siempre en el mismo lugar del loop.
  - Una voz que cuenta números, que nadie entiende. Es la frecuencia de ellos: inquietante, sin explicación.

## Los tres pilares del roguelike

Es un roguelite: se pierde la salida, pero lo construido en la casa queda.

1. **Riesgo y recompensa:** volver a casa con lo juntado o quedarse una ronda más por más botín. Le da tensión a cada salida.
2. **La casa como progresión:** le da sentido a morir.
3. **El loop distinto en cada salida:** le da ganas de volver a salir.

Vienen después: los jefes (los Manos), las sinergias entre mejoras de la casa y hallazgos de la salida, y el mapa ampliado.

## El barrio es una grilla (primera iteración, 22/11)

Para que no sea siempre una calle horizontal, el barrio es una **grilla de piezas de 20×20 baldosas** (320×320 px), como las salas de un roguelike. Las salidas son fijas para que encastren: este/oeste por la calzada (filas 15-17) y norte/sur por la bocacalle (columnas 9-11). Una pieza que sale al norte encastra con una de arriba en su **variante con salida al sur**, que abre la vereda de enfrente.

Las cinco primeras (arte: `art/concept/manzanas.py`):

| # | Pieza | Forma | Qué tiene |
|---|---|---|---|
| 1 | La casa de Juan | Cuadra recta (O-E). Siempre la primera | El chalet de los Salvo, el rastro de Juan desde el portón, el auto tapado, Polsky si murió |
| 2 | La esquina del choque | Cruce en T (O-E-N) | La ferretería en la ochava (caja de municiones, bicicleta, el del umbral), el buzón del Correo, el volcado y el de trompa contra la farola torcida |
| 3 | La plaza | Abierta, caminos en diagonal; sale al norte | Busto con gorro de nieve, bancos, hamaca, árboles pelados. Médanos grandes: salen de todos lados |
| 4 | Las vías | Paso a nivel del Mitre; las vías parten la pieza | Barrera caída, garita, cruz de San Andrés, un vagón que tapa media vía. Solo se cruza por los tablones |
| 5 | La cortada | Callejón sin salida | El almacén con la vidriera rota al fondo. Botín, pero si te alcanzan adentro no hay salida |

**El borde del loop:** donde no hay pieza, el barrio se termina en estática del continuum, y las piezas se deshacen contra ese borde (la llegada al revés). No se puede pasar.

Ideas para las próximas formas: una diagonal (como las de Buenos Aires), un boulevard con cantero en el medio, la barranca que baja al río, una obra en construcción, la estación del tren, un baldío con un auto quemado y la cancha.

## Qué se pierde al morir

**La mochila queda tirada en la calle.** Al morir, lo que juntaste en la salida (chatarra, goma, nafta, piezas, hallazgos) queda en la nieve donde caíste.

- En la próxima salida podés ir a buscarla, pero el barrio se rearmó: queda en otro lugar y con más bichos alrededor.
- Si volvés a morir antes de recuperarla, se pierde para siempre (como en Hollow Knight o Dark Souls).
- Va con el loop: la mochila de la noche anterior aparece en esta noche. "Esto es mío… de otra vez."
- La muerte se vuelve un objetivo para la salida siguiente: ir a buscar lo propio.

**Nunca se pierde:** el traje, las mejoras fabricadas en la casa, las recetas destrabadas y el récord.

## El mapa cambia en cada loop

El barrio es el mismo, pero se rearma distinto cada noche ("esta esquina ayer no estaba acá"). No es todo procedural: son **piezas hechas a mano que se recombinan**, como en Spelunky o Dead Cells.

- **Manzanas hechas a mano.** Cada tramo de calle se diseña y se dibuja como una pieza: la ferretería, el almacén, la esquina del choque, la casa de Ramírez, una plaza, un baldío. El arte queda cuidado.
- **Cada loop las ordena distinto.** Se encadenan 3 a 5 manzanas en otro orden y con otras conexiones. La casa de Juan es siempre el punto de partida.
- **Encima, los detalles son procedurales.** Autos, colectivos, médanos, cuerpos, papeles, de dónde salen los cascarudos y dónde aparece el botín. Es como las variantes de casas de hoy, con semilla y espejado.
- **La mano de truco como semilla.** Las cartas definen cómo se arma la noche. La misma mano da el mismo barrio, así que se puede compartir ("jugá la del 33 de mano").
- **Por qué no todo procedural:** con pixel-art a mano y un barrio con identidad (Vicente López, los chalets, el colectivo 10), un generador puro da calles genéricas y se pierde lo de El Eternauta.
- **Costo:** cada manzana nueva es una pieza de arte. Para arrancar alcanzan 4 o 5, partiendo de lo que ya tiene la calle.

## Chistes recurrentes

- Cada tantas salidas, el viejo reaparece en la silla del programador a quejarse de nuevo.
- Déjà vu de los NPCs: Favalli frena y dice "¿esta mano no la jugamos ya?".

## Ideas abiertas (sin decidir)

- La mano de truco como semilla del loop: las cartas definen cómo es esa noche, y el "33 de mano" es la del cómic.
- Enemigos del cómic para sumar: hombres-robot (vecinos controlados), gurbos (jefe gigante que rompe el mapa), los Manos (jefe al que se lo vence asustándolo, por la glándula del terror). Ellos no se ven.
- Más adelante, otros universos (8 bits, tinta) como mundos siguientes.
