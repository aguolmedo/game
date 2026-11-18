# Rediseño de la luz del apagón (diseño, sin implementar)

**Estado:** propuesta aprobada el 2026-11-17 y extendida a la calle y a la planta baja el 2026-11-18. Diseño cerrado: es PI-1 en `art/direccion/DIRECCION.md`.

Concepto: `art/concept/lighting2.py` → `out/light_compare_x3.png` (hoy | propuesta), `out/light_flicker.gif`.

## Por qué hoy parece un filtro (`src/lighting.js`)
1. **Velo plano:** un `fillRect` azul marino al 62% sobre toda la escena. Oscurece todo igual (piso, paredes, personajes) y aplana el contraste.
2. **Tinte cian `lighter`:** suma color a toda la pantalla, así que levanta los negros y deja todo neblinoso.
3. **Luces con degradé suave:** los `createRadialGradient` dan círculos borrosos que no son pixel art.
4. **La luz no sale de ningún lado:** la ventana no ilumina y la nieve "que brilla" no se ve como fuente.

## Propuesta: la oscuridad se pinta, no se superpone
1. **Repaleta nocturna (multiplicar, no velar):** cada color se desatura al 55% y se **multiplica** por `(0.49, 0.55, 0.79)`. Los negros siguen negros y se conserva el contraste. En el juego: un pase con `multiply` o un shader de postproceso, nunca un `fillRect` con alpha.
2. **Charcos escalonados:** el mapa de luz de cada fuente se cuantiza en **4 bandas**, con **tramado Bayer 4×4** solo en el borde de cada banda. Nada de degradé continuo.
3. **Cada banda se recolorea con su fuente:** la vela calienta, con `(1.10, 0.96, 0.76)` sobre el color original. La nieve enfría, con `(0.62, 0.92, 1.12)`.
4. **La ventana es una fuente:** el vidrio brilla cian (la nevada de afuera) y entra un **haz inclinado** que cae al piso.
5. **Viñeta escalonada:** los bordes del ambiente bajan un escalón (×0.88) y después otro (×0.76).
6. **Parpadeo:** el borde de las bandas se mueve 1–3 px. No se cambia el alpha.
7. **La llama:** 2–3 px blanco-amarillo-ámbar sobre la vela.

## Decisiones (cerradas el 2026-11-18)
Todo está en `art/direccion/DIRECCION.md` → **PI-1**, con concepts en `art/concept/lighting3.py`:
- **Oscuridad legible:** lejos de la luz todo se sigue leyendo.
- **Lamparita del techo:** tiene un cuadro apagado propio (`art/concept/out/light3_hanging_lamp_off.png`).
- **Calle:** farolas apagadas (su halo no se dibuja), la nieve es la luz del suelo y una sola ventana conserva una vela.
- **Planta baja:** una lámpara de aceite junto a la escalera, y la ventana y el ojo de buey de la puerta como fuentes frías.
- **El pucho:** Lucas fuma en el apagón, con una brasa que se aviva cuando pita.
