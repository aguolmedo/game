# El Eternauta - la nevada (demo v3)

Demo jugable basada en *El Eternauta* (1957) de H. G. Oesterheld y F. Solano
López. Vicente López, de noche: Juan Salvo, Favalli, Lucas y Polsky juegan al
truco en el altillo cuando empieza a caer una nieve luminosa que mata al
contacto con la piel. Hay que sellar la casa, armar un traje hermético de buzo
y salir a la calle.

Three.js + Vite, JavaScript plano, arte pixel generado con Python/PIL.
Resolución interna **480x270** (grilla de 16 px, vista Stardew-like de 30x17
tiles), escalada por un factor entero.

## Cómo correr

```bash
npm install
npm run dev
```

Build de producción: `npm run build` (queda en `dist/`).
Assets: `npm run assets` (equivale a `python3 tools/export_assets.py`, requiere Pillow).

## Controles

El juego detecta solo el último dispositivo usado y cambia los glifos de los
prompts (joystick o teclado). El joystick manda cuando está conectado y se usa.

| Acción | Joystick | Teclado |
| --- | --- | --- |
| Mover (8 direcciones) | stick izquierdo o cruceta | WASD o flechas |
| Hablar / mirar / confirmar | A (botón 0) | E, Enter o Espacio |
| Usar el objeto del slot | X (botón 2) | F |
| Mochila / inventario | Y (botón 3) | I o Tab |
| Cambiar slot de hotbar | LB / RB (4/5) | Q / R, 1-8 o rueda del mouse |
| Volver / cerrar | B (botón 1) | B, Retroceso o Esc |
| Menú / pausa | Start (botón 9) | Esc |

La deadzone del stick es 0.25. Los menús también se manejan con los toques
cortos de flechas/WASD.

## La demo

1. **Título** (Jugar / Controles / Créditos). Nieve suave sobre el menú.
2. **Altillo**: hablá con Favalli, Lucas y Polsky, escuchá la radio y mirá la
   ventana. Favalli explica qué hace falta para el traje (tela engomada, casco
   de buzo, guantes, botas, tiras de goma y oxígeno). Juntá las piezas: las del
   piso se atraen solas al pasar cerca; el cajón de herramientas se abre con A
   y tiene las tiras. El cilindro de oxígeno está junto al banco de trabajo.
3. **Fabricar**: abrí la mochila (Y / I / Tab) y andá a la pestaña Fabricar.
   Con todos los materiales, A fabrica el **Traje aislante**. En Inventario, A
   sobre el traje lo pone (fundido corto, icono en el HUD). Se puede sacar de
   nuevo desde el inventario.
4. **Casa**: bajá por la escalera (warp con fundido). Elena y Martita esperan
   abajo. La puerta de calle avisa: con el traje se sale; sin el traje aparece
   el aviso “Sin el traje, la nevada te mata. ¿Salir igual?” antes de la
   pantalla de muerte.
5. **Calle**: caminá hasta el final de la calle. Huellas que se borran, ráfagas
   de nieve, el auto, el colectivo 10, el almacén y la ferretería. Al llegar:
   **Fin de la demo**.

Objetivos en pantalla: juntar las piezas -> fabricar el traje -> ponérselo ->
salir a la calle -> llegar al final de la calle.

## Estructura

- `src/input.js`: Gamepad API + teclado, último dispositivo, toques para menús.
- `src/movement.js`, `src/interaction.js`, `src/objectives.js`: lógica pura y testeada.
- `src/maps/`: mapas de tiles (altillo 36x22, casa 34x20, calle 80x20) con
  objetos, colisiones, pickups, NPCs y warps.
- `src/mapView.js`: pre-render de tiles, objetos con y-sort y cajas de colisión.
- `src/scenes/`: título, altillo, casa, calle, muerte y final.
- `src/menus.js`, `src/hud.js`, `src/dialog.js`, `src/glyphs.js`: UI chica,
  prompts con glifos A/B/X/Y/LB/RB o teclas, diálogo con texto a máquina.
- `tools/art/`: generadores Python (tiles, objetos, personajes, iconos, glifos de
  botones, título). `tools/export_assets.py` escribe `public/assets/`.
- `docs/guion.md`: guion de referencia sacado del escaneo del cómic.
- `docs/screens/polish/`: capturas 960x540 del recorrido completo.

## Verificación

```bash
npm run build
node --test
```

Capturas headless del recorrido completo (necesita `npx vite --port 5199
--strictPort` corriendo y playwright-core):

```bash
node tools/play_screens.mjs
```

Las capturas quedan en `docs/screens/polish/` con nombres como
`crafted-suit-in-inventory.png`, `putting-on-suit.png`, `suited-player-attic.png`,
`exit-warning-no-suit.png`, `suited-exit-prompt.png`, `street-with-suit.png`,
`footprints.png`, `end.png`, `action-tile-cursor.png`, `magnet-pickup.png`,
`walking-behind-table.png`, `door-warp.png`.

## Créditos

*El Eternauta* (1957): H. G. Oesterheld y F. Solano López.
Demo fan sin fines de lucro. El arte es generado para esta demo, inspirado en el
cómic y en la técnica de pixel art de granjas (sin copiar sprites ni UI ajenos).
