# El Eternauta — Guion de la demo

Base: el cómic de Oesterheld y Solano López (1957), páginas 013–045 (ver `docs/guion.md`, la referencia página por página, y `docs/referencias_visuales.md`, el catálogo de viñetas). La demo cuenta **la noche de la nevada** desde la partida de truco hasta la primera salida de Juan con el traje, y termina con un **minijuego de supervivencia** en la calle (licencia de gameplay: en el cómic los cascarudos aparecen recién desde la pág. 098).

Tono: íntimo, porteño, de 1957. Diálogos cortos, en castellano rioplatense de la época ("che", "vos", "fijate"). Las líneas entre comillas son **paráfrasis en la voz del cómic**, no transcripciones. Ninguna línea de diálogo supera 3 renglones del cuadro de diálogo.

Convenciones:
- **[VIÑETAS]** = escena en viñetas (sistema de historieta, sección 9 del diseño). Usa el modelo de los personajes del juego (retratos del concepto), no los retratos del diálogo.
- **[DIÁLOGO]** = cuadro de diálogo con retrato. Retratos de diálogo: los calcados a mano (`art/concept/calco_*.py`); mientras falte el calco de un personaje se usa su retrato del concepto (`art/concept/out/<id>_portrait.png`).
- **[VISTA]** = vista por la ventana (sección 10 del diseño).
- **[OBJETIVO]** = texto de la línea de objetivo del HUD.
- **[FLAG]** = bandera de estado que la escena activa.
- **Cartucho** = caja amarilla de narración: es la voz del Eternauta contando ("Recuerdo que…").

---

## ACTO 1 — La partida (antes del corte)

Iluminación: **eléctrica** (lámpara colgante del altillo encendida, ventanas del barrio encendidas, farolas prendidas). La nieve todavía no cae.

### Escena 1.1 — Título
Menú principal (Jugar / Controles / Créditos). Al elegir Jugar, fundido a negro y cartucho:
> Cartucho: "Era una noche fría de 1957, en Vicente López. Los cuatro estábamos en el altillo, jugando al truco, como tantas veces."

### Escena 1.2 — El altillo, la mesa de truco (tutorial)
Mapa: altillo. Juan empieza sentado frente a la mesa (silla de adelante); se levanta solo al mover.
- Favalli, Lucas y Polsky sentados a la mesa (idle, se dan vuelta al hablarles).
- La radio del mueble suena (música bajita; la vista del objeto muestra el dial encendido).
- Sobre la mesa de truco: naipes, anotador con porotos, sifón, botella de vino, vasos, cenicero de Favalli humeando, **el mate**.
- [OBJETIVO] "Cebate un mate antes de seguir la partida."
- [DIÁLOGO] Favalli: "¿Quién ceba, che? Esta ronda te toca a vos, Juan."
- **Tutorial del mate** (ver diseño §7): agarrar el mate de la mesa, la yerba del estante, la pava de la cocinita del altillo (calentador a alcohol en el banco del laboratorio), calentar el agua sin que hierva, cebar, tomar. Después se puede **convidar** a Favalli, Lucas y Polsky (cada uno tiene su línea).
  - Favalli (al convidarle): "Está bien cebado. Se nota la mano."
  - Lucas: "Gracias. Uno amargo me acomoda el estómago."
  - Polsky: "Como los que tomaba en la estación, de muchacho."
  - Si el agua hirvió: Favalli: "Lo quemaste, Juan. Ese mate está lavado de entrada."
- Al convidar a los tres (o hablar con todos), [OBJETIVO] "Volvé a la mesa." → interacción con la silla de Juan.

### Escena 1.3 — La mano de truco [VIÑETAS]
1. Plano general del altillo. Cartucho: "Separados del mundo, como si el chalecito fuera una isla."
2. Primer plano de Juan con las cartas: "Tres del mismo palo… Ahora sí que se enoja Favalli."
3. Favalli: "¡Te dije que cantamos falta envido!"
4. Plano de la ventana: luces del barrio, un colectivo que pasa a lo lejos.
- [FLAG] `truco_jugado`

### Escena 1.4 — El choque y el apagón [VIÑETAS] → cambio de iluminación
1. Cartucho: "Un ruido violento, que vino de la calle, me interrumpió."
2. Juan: "Me pareció oír un grito." / Lucas: "¿Qué fue? ¿Un choque?"
3. La lámpara del altillo parpadea dos veces y **se apaga**. Viñeta negra con las siluetas de los cuatro.
4. Favalli: "Algún fusible…" / Polsky: "¡Cállense! ¡Escuchen!"
5. Cartucho: "Aquel silencio total… Ni el tránsito de la avenida. La radio estaba muda."
- **APAGÓN**: el juego pasa al modo de iluminación `apagon` (diseño §8) para todo el resto de la demo. Se apagan la lámpara del altillo, la radio, las ventanas del barrio y las farolas. Favalli enciende una **vela** sobre la mesa de truco (fuente de luz cálida chica).
- [FLAG] `apagon`
- [OBJETIVO] "Mirá por la ventana."

---

## ACTO 2 — Encerrados (después del corte)

Iluminación: **apagón**. Afuera, la nieve brilla sola. Adentro, solo velas y la lámpara de aceite.

### Escena 2.1 — La primera nevada [VISTA altillo]
Interactuar con la ventana del altillo abre la **vista panorámica** (paneo lento de izquierda a derecha): la esquina del choque (un auto dado vuelta contra la farola doblada, otro de trompa), un cuerpo caído sobre el tapial con la mano enguantada colgando, la nieve fosforescente.
- Cartucho: "Acunándose en el aire quieto, caían copos tenuísimos, casi transparentes. Emanaban una débil luz de trasmundo."
- Al salir de la vista: Lucas camina hacia la ventana con la mano en la manija.
- [DIÁLOGO] Juan (elección obligatoria): **"¡No abras, Lucas!"** — Lucas: "Pero… ¿por qué?" — Favalli: "Hay algo en el aire. ¿No ven que parece estar nevando?"
- Favalli: "Debe ser la sustancia radiactiva que dijo la radio. ¡Hay que cerrar todo!"
- [OBJETIVO] "Bajá a ver a Elena y Martita."
- [FLAG] `vio_la_nevada`

### Escena 2.2 — La ventana de Martita (tensión)
Mapa: planta baja. Al llegar a la escalera, cartucho: "Me precipité al otro cuarto, el de Martita. El corazón se me estrujó."
- La ventana del cuarto de Martita está **abierta** (sprite de ventana abierta, copos entrando que brillan en el piso).
- **Evento con tiempo** (8 s, barra visible): llegar a la ventana y cerrarla con (A). Si no llega a tiempo: viñeta de Martita a salvo igual (Elena la sacó del cuarto) pero Juan pierde una "calma" (solo narrativo) — la demo no castiga con muerte acá.
- [DIÁLOGO] Elena: "¿Qué pasa, Juan? ¿Qué pasa?" / Juan: "Ya te explicaré… ¡No abras ninguna ventana!"
- [OBJETIVO] "Revisá que toda la casa esté cerrada." (lista: ventana de Martita, ventana del living, puerta del hall, portón del garaje — interactuar con cada una marca ✓).
- [FLAG] `casa_sellada` al completar.

### Escena 2.3 — Polsky se va [VIÑETAS]
Al completar `casa_sellada`, Polsky baja la escalera con el abrigo puesto (NPC camina hasta el hall).
1. Polsky: "Tengo que ir a casa… Edith y los chicos están solos."
2. Favalli lo agarra del brazo: "¡No salgas! ¡No se puede salir!"
3. Polsky: "¡Déjame!" — abre la puerta y sale corriendo.
4. Desde la ventana del living: Polsky cruza el jardín bajo la nieve, con el saco sobre la cabeza.
5. Polsky se dobla en la calle, las manos abiertas como garras. Cae boca abajo.
6. Cartucho: "No llegó a cruzar la calle."
- La puerta del hall queda cerrada (la cierra Favalli). Polsky queda como cadáver en el mapa de la calle (sprite `polsky_caido`).
- [FLAG] `polsky_muerto`

### Escena 2.4 — La luz de Ramírez [VISTA living]
[OBJETIVO] "Hablá con Elena en el living." Martita, junto a la ventana: "¡Hay una luz en la casa de enfrente!"
- Interactuar con la ventana del living abre la **vista del living**: la casa de los Ramírez con la luz de una vela y la silueta de Ramírez con el candelabro. Es la única luz cálida del barrio.
- Favalli: "La casa de los Ramírez es nueva, hermética. Ni los copos más chicos encontraron por dónde colarse."
- Elena: "¡Juan! ¡Va a abrir la ventana!"
- [VIÑETAS] Ramírez abre la ventana; la vela se apaga; queda caído sobre el alféizar, la nieve amontonándose en la espalda. Cartucho: "Murió sin un grito. Desde acá todo parecía cine mudo."
- [FLAG] `ramirez_muerto`

### Escena 2.5 — La idea de Favalli
Mapa: altillo (de noche, a la luz de la vela). [DIÁLOGO] Favalli:
- "Si queremos sobrevivir hay que salir: aire, agua, comida, armas."
- "Un traje hermético, algo así como un traje de buzo. Los copos matan al tocar la piel."
- "No hará falta oxígeno: alcanza con un filtro que deje afuera las partículas."
- [OBJETIVO] "Juntá los materiales del traje." Lista visible en la mochila (ver diseño §6, receta `traje`). Los objetos están **apoyados donde tienen sentido** (nunca tirados en el piso):
  - Tela engomada (impermeable viejo): en el banco del laboratorio del altillo, a medio cortar con la tijera.
  - Guantes de goma: en la alacena de la cocina.
  - Botas de goma: junto al perchero del hall.
  - Tiras de goma (×3): en el cajón de herramientas del altillo (contenedor).
  - Visera (casco de buzo adaptado): en el estante del garaje.
  - Lata para el filtro: en la mesa de la cocina, entre las latas.
- Al juntar todo: [OBJETIVO] "Armá el traje en el banco del garaje."

### Escena 2.6 — La esclusa del garaje
Mapa: garaje (lamparita del electrógeno apagada al entrar; oscuro).
- [OBJETIVO] "Prepará la esclusa." Pasos:
  1. Cargar nafta en el electrógeno (bidón de nafta del garaje → usar sobre el electrógeno). Al arrancar: sonido de motor (opcional) y **la lamparita colgante se enciende** (única luz eléctrica de la casa; titila).
  2. Instalar el extractor: usar el **secador de pelo de Elena** (está en la mesa de luz del dormitorio) sobre el extractor de la pared.
  3. Fabricar el traje en el banco (la receta del traje).
- Lucas: "¿Y si el extractor no aguanta?" / Favalli: "Ya está todo resuelto, Lucas."
- [FLAG] `esclusa_lista`, `traje_fabricado`

### Escena 2.7 — Los dados [VIÑETAS]
Living, a la luz de la vela.
1. Favalli: "Para no seguir peleando: un par de dados. El que saca más, sale primero."
2. Favalli: un dos. Lucas: un dos. Juan: **un seis**.
3. Elena abrazada a Juan, la cara escondida en su hombro.
4. Juan (pensando, cartucho): "Por dentro temblaba."
- [OBJETIVO] "Equipate: el traje y el rifle." El rifle está en el ropero del dormitorio (contenedor) con una caja de balas.
- Ponerse el traje desde la mochila (animación de 1 s; el sprite pasa a Juan con el traje casero).
- Favalli (al acercarse a la puerta del garaje): "Lo primero es ir a la armería. Después la comida." / Elena: "No me diste un beso, Juan…" (si hablás con ella: beso en viñeta chica).
- [FLAG] `listo_para_salir`

---

## ACTO 3 — Afuera

### Escena 3.1 — La primera salida
Salida **por el portón del garaje** (la puerta del hall está sellada). Fundido. Mapa: calle (modo apagón: solo la nieve brilla).
- Cartucho: "Afuera, la nieve brillaba y el silencio era total."
- Juan camina por la vereda (sin combate). Pasa junto al cuerpo de Polsky ([DIÁLOGO] Juan: "Polsky…") y llega a la esquina del choque (el auto dado vuelta, el cartel de calles).
- Cartucho: "Entonces lo oí. Un roce de patas sobre la nieve, como de muchas uñas."
- Aparecen los primeros **cascarudos** saliendo de los médanos. [OBJETIVO] "¡Sobreviví!" → **comienza el minijuego** (Escena 3.2).

### Escena 3.2 — Minijuego: las oleadas (ver diseño §11)
Supervivencia por **rondas** infinitas, cada vez más cascarudos, más fuertes y más rápidos. Entre ronda y ronda, el número de ronda aparece en palotes de tinta (I, II, III, IIII, ~~IIII~~…). Se ganan **puntos** por impacto y por baja; con puntos se compran **balas** en la caja de municiones de la ferretería.
- El traje tiene **integridad** (3 tiras). Cada mordida rompe una; con (X) Juan se pone un parche de **tiras de goma** si las tiene (se juntan de cascarudos muertos).
- Si la integridad llega a 0: la nieve entra. Viñeta final: la mano enguantada de Juan sobre la nieve. Cartucho: "Así terminó mi primera salida…" y pantalla de resultado: **ronda alcanzada, bajas, puntos**. Opciones: "Otra vez" (vuelve a la ronda 1 en la calle) / "Volver al título".
- No hay victoria: es una demo de resistencia. Cartel de cierre en la pantalla de resultado: "Continuará…"

---

## Personajes en la demo

| id | Quién | Dónde | Notas |
|---|---|---|---|
| juan | Juan Salvo (jugador) | todos | sprite normal / con traje casero / con traje y rifle |
| favalli | Favalli | altillo, living, garaje | fuma: su cenicero humea siempre |
| lucas | Lucas | altillo, living, garaje | nervioso; se acerca a las ventanas |
| polsky | Polsky | altillo → hall → calle (muerto) | se va en la escena 2.3 |
| elena | Elena | planta baja | dormitorio / living |
| martita | Martita | cuarto de Martita / living | descubre la luz de Ramírez |
| ramirez | Ramírez (NPC de la vista) | solo en la vista del living | silueta con candelabro |
