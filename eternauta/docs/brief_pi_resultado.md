# Resultado del brief PI (dirección de arte, 18/11)

Estado: **implementado PI-1 a PI-9, salvo PI-8 (logo del menú: no se tocó)**.
No se commiteó nada. No se tocó `bocetos/` ni `src/scenes/title.js`.

## Verificación global

- `npm run build`: **OK** (sin errores).
- `npm test`: **378 tests, 0 fallos** (arrancó en 370; se agregaron 8: 2 de `src/apagon.js`, 3 de layout PI-6 y 3 de retratos PI-2; se actualizaron los tests de HUD/avisos al diseño nuevo). También se ajustaron los tamaños esperados de `objects.png` y `buttons.png` porque el repack de PI-5/PI-6 los cambia (500 px y 254×64).
- Capturas headless (1920×1080 = vista ×4, Chromium + SwiftShader), **sin errores de página**.
- El HUD nunca se oscurece: en el apagón el post-proceso se aplica solo a `scene.scene`; el HUD vive en `uiScene`, que se dibuja después, y el `LightOverlay` viejo no se dibuja en esos mapas.
- Objetivo de cerrar la ventana de Martita: verificado en headless con mouse (hover + click) y con teclado (E) durante `martita_sprint`; el `snow_drift` desaparece al cerrar.

## Tabla por PI

| PI | Qué se implementó | Archivos cambiados | Capturas | Pendientes |
|---|---|---|---|---|
| **PI-3** | Traje unificado y con rifle copiados desde `art/concept/out/pi/chars2/` a las hojas editables y reempaquetados. | `art/sprites/chars2/juan_suit/*` (32 PNG), `art/sprites/chars2/juan_suit_rifle/*` (32 PNG), `public/assets/chars2.png` (vía `npm run sprites:pack chars2`). | `pi_3_calle_traje_frente.png`, `pi_3_traje_frente_zoom.png` | — |
| **PI-9** | La vista del altillo usa la imagen fija `attic_frame` (ladrillo + marco + escarcha) encima del panorama y de los copos; vidrio `{36,24,408,199}`. | `src/scenes/view.js`, `src/assets.js`, `tools/sprites.py` (hoja imagen), `art/sprites/views/attic_frame/`, `public/assets/views/attic_frame.png`. | `pi_9_vista.png` | — |
| **PI-7** | `Snowfall` reescrita: 3 capas a tamaño real, opacidad 1, `alphaTest .01`, Nearest, posiciones enteras, fosforescencia por copo (on/off centrados) y viento/vaivén de antes. Texturas sueltas en `public/assets/snow_flakes/`. | `src/snow.js`, `src/assets.js`, `public/assets/snow_flakes/*.png`, llamadas en `world.js`, `death.js`, `end.js` y `arena.js`. | `pi_7_calle_dia.png`, `pi_7_calle_apagon.png` | Se cargan como texturas sueltas (la opción más simple del brief), no como atlas. |
| **PI-4** | Guante oculto en combate (`setHidden`/`cursor:none`) y restaurado en resultado/menú/título; la mira del mouse va en la posición del puntero (joystick sigue a 24 px). | `src/mouseCursor.js`, `src/scenes/arena.js`, `src/main.js` (seguro por frame). | `pi_4_arena_mira.png`, `pi_4_arena_click.png` (CSS del canvas `cursor:none` en ambos). | — |
| **PI-2** | Retratos de diálogo desde `chars2`: recorte 16×21 desde el primer pixel opaco−1, ×3 en caja 64×64 sobre `#2a2236`; panel 32×32 a 1x. Excepción `juan_suit`/`juan_rifle` en diálogo con `portraits_dlg`. Las viñetas no se tocaron. | `src/dialog.js`, `src/data/portraits.js`, `test/dialog_ui.test.js`. | `pi_2_dialogo_favalli.png`, `pi_2_dialogo_lucas.png` | El camino “panel 32×32” queda implementado pero hoy ningún diálogo lo usa (las viñetas siguen con `comic.js`, por diseño). |
| **PI-5** | Glifo `mouse_r` para “Mirar” (texto corto); hotbar de 8 casilleros pegada al borde (panel inferior en y=270); barra de acciones relativa arriba; avisos abajo a la izquierda apilados (máx. 3, 2,5 s, viejos al 60%). | `src/hud.js`, `src/glyphs.js`, `src/scenes/world.js` (etiqueta), `test/toasts.test.js`, `test/hud_occlusion.test.js`, `test/world_hints.test.js`, `test/glyphs.test.js`, `art/sprites/buttons/mouse_r.png`, `public/assets/buttons.*`. | `pi_5_hud_avisos.png` | Los tests de avisos se actualizaron al diseño nuevo (2→3, 2,0→2,5 s). |
| **PI-6** | Planta baja v3: escalera rebatible, ventana del objetivo al muro del fondo + dibujo, camita, pileta/alacena/sillas, foto, escoba/bidón, 26 tiles de pared trasera, `camBottomPad:17`, textos de Mirar. | `src/maps/house.js`, `src/mapView.js` (z por objeto + margen de cámara), `src/data/script.js`, `src/data/descriptions.js`, `test/pi_layout.test.js`, sprites en `art/sprites/objects/` y `public/assets/objects.*`. | `pi_6_plano.png`, `pi_6_martita.png`, `pi_6_martita_juan.png` | La pared trasera se dibuja como objetos (no tiles) sobre la fila 15; la fila ya era sólida por `black`+bounds, así que no hace falta hitbox extra. |
| **PI-1** | Luz del apagón por post-proceso: render target + shader con repaleta nocturna, 4 bandas Bayer, luces cálidas (vela/aceite/brasa), haces fríos, vidrios cian, nieve que brilla, ventana única de la calle, viñeta y parpadeo. Llama/pucho/humo como píxeles sobre la escena y bajo el HUD. Lamparita apagada y lámpara de aceite nuevas. | `src/lightpost.js` (nuevo), `src/apagon.js` (nuevo), `src/main.js`, `src/scenes/world.js`, `src/maps/attic.js`, `src/maps/house.js`, `art/sprites/objects/hanging_lamp_off.png`, `public/assets/objects.*`, `test/apagon.test.js`. | `pi_1_altillo.png`, `pi_1_casa.png`, `pi_1_calle.png`, `pi_1_*_electrica.png`, `pi_1_*_compare.png` | El pase cubre altillo, casa y calle (lo pedido); el garaje sigue con el velo 2D viejo. La brasa de Lucas usa el radio `5+12k` del brief (el concepto usaba `8+18k`). |

## Cómo reproducir las capturas

Con el servidor de Vite en `http://localhost:5199/` y Chromium headless (SwiftShader), se usó `page.screenshot` sobre `1920×1080`. Los escenarios se fuerzan con la API de test (`window.__eternauta.go`, `blackout`, `startDialog`, `openView`, `startArena`, `toast`, `setSuit`) y el apagón directo (`flags.apagon`, `setLighting('apagon')`, `applyStoryState`) para no depender de los tiempos del parpadeo en headless.

- Capturas finales: `art/direccion/doc/capturas/pi_<n>_*.png`.
- Comparaciones PI-1: `pi_1_<escena>_compare.png` = referencia de `art/concept/out/` a la izquierda, juego en apagón a la derecha.
