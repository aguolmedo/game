# Brief · Tipos de objeto: la mecánica básica generalizada (19/11, aprobado)

Repo `/home/mateyfasito/dev/game/eternauta`. **Especificación:** `art/direccion/DIRECCION.md`, sección "Controles e
interacción" → **"Tipos de objeto"** (leerla entera, y también "Tres verbos" y "Barra de acciones"). Viene después de
`docs/brief_controles_resultado.md` (alcance por casilleros, `src/reach.js`): no romper esa regla.
No tocar `bocetos/` ni dibujar arte. No tocar el Vite del 5173.

## Hoy (por qué se rehace)

- 46 objetos con `interact: { kind: 'look', label: 'Mirar …' }` escritos a mano en `src/maps/*.js`; para casi todos,
  la Acción (E/A/click) y Mirar (Q/B/click der.) hacen lo mismo con resultados apenas distintos (E: diálogo `talk`;
  Q: solo `lookAt`, la línea corta), y la barra muestra "Mirar" dos veces (`[E] Mirar el parlante · [Q] Mirar`).
- ~20 kinds internos sin criterio (`look use view ammo takePava closeWindow drop open take talk lookItem …`) y un
  `targetAction` (`src/actions.js`) lleno de casos (`caja_municiones`, ventanas, pava…).
- Textos sin verbo ("Caja de municiones"); la ventana del living dice "Mirar por la ventana" pero abre la vista.

## Qué hacer

1. **Modelo:** cada interactivo declara `type` ∈ `decor | thing | surface | container | device | person | passage | view | seat`
   (vista y asiento son dos tipos, la tabla los agrupa) y `name` con artículo ("el parlante", "la radio"; personas: "Favalli").
   Objetos de mapa en `src/maps/*.js`, ítems apoyados/sueltos (`src/surfaces.js`, pickups) = `thing`, NPCs = `person`,
   warps = `passage` (con su verbo: Entrar/Salir/Subir/Bajar, o "Ir al garaje"/"Volver a la casa" si ya existe ese texto),
   cofres = `container`. Los `device` declaran su estado y verbos por estado (radio prender/apagar, ventana abrir/cerrar,
   vela, cocina/estación de calor con "Sacar la pava", electrógeno, extractor, pileta).
2. **Resolvedor único** (`src/actions.js`): `verbFor(type, state)` + tabla `ITEM_USES` (ya existe en `src/data/actions.js`)
   para el uso con ítem en la mano. Orden: uso del ítem sobre el objetivo si aplica → verbo del tipo → Mirar.
   Eliminar los casos especiales por id. Sin mensajes "No tenés nada en la mano" desde la Acción.
3. **Mirar unificado:** Q/B/click derecho y la Acción-Mirar llaman a lo mismo: diálogo propio (`talk`) si existe, si no la
   línea. Sigue sin requerir alcance (de lejos también).
4. **Textos generados:** `<Verbo> <name>` ("Mirar el parlante", "Prender la radio", "Hablar con Favalli", "Asomarse a la
   ventana", "Abrir la caja de municiones", "Agarrar <nombre del ítem>", "Dejar <ítem>"). Borrar los `label` a mano de los
   mapas (salvo warps con texto propio). Todos los caracteres tienen que existir en la fuente (ya hay test).
5. **Barra de acciones** (`hudParams` en `src/scenes/world.js`, `src/glyphs.js`):
   - Acción siempre; **Mirar solo si la Acción no es Mirar**; Usar en mí solo con uso propio; Mochila siempre.
   - **Mochila:** glifo `key_i` con mouse y con teclado, `y` con pad (nunca el glifo del mouse). Se abre con I/Tab, Y, o
     **click sobre la entrada "Mochila"** de la barra; al pasar el mouse por encima, la entrada se resalta (texto crema más
     claro o fondo un tono más claro). Las otras entradas de la barra no son clickeables (son leyenda).
6. **Cuadradito por tipo** (`src/cursor.js`): dorado latiendo en lo que tiene acción propia; brillito de agarrable en `thing`
   agarrable (ya existe); **más tenue** (alpha ~0.6, sin latido) en `decor` y en cosas decorativas que solo se miran.
7. **Tests:**
   - todos los interactivos de los 4 mapas tienen `type` válido y `name`;
   - ningún objeto muestra la misma acción dos veces en la barra;
   - ningún texto de Acción empieza con "Mirar" salvo que la acción sea mirar;
   - casos: parlante (`[E] Mirar el parlante`, sin entrada Mirar aparte), radio (Prender/Apagar + Mirar), ventana del living
     (Asomarse + Mirar), caja de municiones (Abrir la caja de municiones), pava en la cocina (Sacar la pava / Poner la pava al
     fuego con la pava en la mano), Favalli con mate cebado (Convidar mate), mesa con un ítem en la mano (Dejar …);
   - Mochila: glifo `key_i`/`y` y rect clickeable.
   Actualizar los tests viejos que fijen textos o kinds (explicar cada cambio en el resultado). La auditoría de alcance
   (`test/alcance_audit.test.js`, `art/concept/auditoria_alcance.mjs`) tiene que seguir en 0 fallos.
8. **Historia:** los diálogos, flags y objetivos tienen que seguir funcionando igual (radio, ventana de Martita, vela,
   pava/mate, secador/extractor, nafta/electrógeno, truco/sentarse). Probar el recorrido completo de la demo en headless
   si existe un helper (`window.__eternauta`); si no, al menos cada uno de esos pasos.

## Verificación

`npm run build`, `npm test`. Headless (NO abrir ventanas) con `npx vite --port 5197 --strictPort` en background:
`URL=http://localhost:5197/ node art/concept/auditoria_alcance.mjs` (0 fallos), `node art/direccion/capturas_ctrl.mjs` y
`node art/direccion/capturas.mjs` con `URL=…5197`; capturas nuevas de la barra con el parlante, la radio y la ventana del
living en `art/direccion/doc/capturas/tipos_*.png`, y una del hover sobre "Mochila". Matar SOLO ese Vite por PID.

## Resultado

`docs/brief_tipos_resultado.md`: modelo final (tabla tipo → verbos), lista de objetos por tipo y mapa, archivos cambiados,
tests cambiados y por qué, build/tests, capturas. No commitear.
