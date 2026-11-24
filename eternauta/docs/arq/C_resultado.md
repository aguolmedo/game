# Worker C — registro de banderas (`src/data/flags.js`)

## Qué quedó

- **`src/data/flags.js`** (NUEVO): registro único de las banderas de `game.flags`.
  - `FLAG`: objeto congelado con las 27 banderas de hoy, cada una con comentario
    de quién la pone y qué significa.
  - Claves dinámicas documentadas y con helper: `closedFlag(id)` (`closed_<id>`)
    y `npcGoneFlag(id)` (`npc_gone_<id>`). `CLOSABLE_IDS` lista las cuatro
    aberturas cerrables (`window_martita`, `window_living`, `hall_door`,
    `garage_door`).
  - `isKnownFlag(key)`: declara si una clave pertenece a `FLAG` o a las familias
    dinámicas válidas.
  - `guardFlags(flags)`: devuelve un `Proxy` que hace `console.warn` al leer,
    escribir, consultar (`in`) o borrar una clave desconocida. En
    `import.meta.env.DEV` (Vite dev) avisa; en build de producción devuelve el
    objeto tal cual; sin entorno (node --test) avisa siempre.
- **`test/flags.test.js`** (NUEVO, 7 tests):
  1. todas las claves de `FLAG` son únicas y con nombre `MAYUSCULAS`.
  2. escanea **todo `src/**/*.js`** y falla si encuentra `flags.<id>`,
     `flags?.<id>` o `flags['literal']` con una clave no declarada. Ignora
     strings, templates y comentarios para no dar falsos positivos con rutas
     tipo `./data/flags.js`. Comprobado: inyectar `game.flags.apagno` en
     `src/data/script.js` hace fallar el test con `archivo:línea`.
  3. cada `FLAG.<CONST>` referenciado en `src` existe (un typo en el nombre de
     la constante daría `flags[undefined]` y antes pasaba).
  4. los literales de datos de mapas (`toggle:`, `showIfFlag:`, `hideIfFlag:`,
     `needsFlag:`) están declarados; cubre lo que se lee por variable
     (`flags[obj.showIfFlag]`) y el escaneo estático no ve.
  5. `guardFlags` avisa en escritura, lectura y borrado desconocidos, y no
     avisa con claves de `FLAG` ni con `closed_<id>`.
  6. `guardFlags` devuelve tal cual lo que no es objeto.
  7. familias `closed_<id>` / `npc_gone_<id>` y `isKnownFlag` con basura.
- Reemplazo de literales por `FLAG.X` en todos mis archivos permitidos (lecturas,
  escrituras y borrados; también alias tipo `f.electrogeno_on` en `world/hud.js`).

## Banderas (27)

| Constante | Valor | La pone | Significa |
|---|---|---|---|
| `APAGON` | `apagon` | story.js (playTruco), `game.blackout`, base, título, arena | apagón general; cambia la luz |
| `MATE_TUTORIAL` | `mate_tutorial` | world/interact.js, story.js | tutorial del mate cumplido |
| `TRUCO_JUGADO` | `truco_jugado` | story.js (playTruco) | ya se jugó el truco de la mesa |
| `VIO_LA_NEVADA` | `vio_la_nevada` | story.js (checkPendingView) | se vio la nevada mortal desde el altillo |
| `MARTITA_VENTANA` | `martita_ventana` | story.js | `'ok'`/`'tarde'`: resultado de la carrera de Martita |
| `MARTITA_SPRINT` | `martita_sprint` | story.js | carrera de Martita activa |
| `CASA_SELLADA` | `casa_sellada` | story.js (check) | las 4 aberturas cerradas |
| `ELENA_HABLADA` | `elena_hablada` | story.js | Elena ya habló en el living |
| `RAMIREZ_MUERTO` | `ramirez_muerto` | story.js | murió Ramírez al mirar la ventana |
| `IDEA_TRAJE` | `idea_traje` | story.js | Favalli explicó el plan del traje |
| `ELECTROGENO_ON` | `electrogeno_on` | world/interact.js | electrógeno en marcha (nafta) |
| `EXTRACTOR_OK` | `extractor_ok` | world/interact.js | extractor instalado |
| `TRAJE_FABRICADO` | `traje_fabricado` | story.js (itemCrafted) | traje fabricado |
| `ESCLUSA_LISTA` | `esclusa_lista` | story.js | nafta + extractor + traje listos |
| `DADOS` | `dados` | story.js | viñeta de los dados vista |
| `LISTO_PARA_SALIR` | `listo_para_salir` | story.js | traje y rifle puestos; gatea el warp de la calle |
| `AFUERA` | `afuera` | story.js (enterMap street) | Juan salió a la calle |
| `POLSKY_MUERTO` | `polsky_muerto` | story.js (playPolsky) | Polsky se fue / ya contó lo suyo |
| `POLSKY_LEFT` | `polskyLeft` | story.js (playPolsky) | alias legacy; oculta a Polsky del altillo |
| `ARENA` | `arena` | main.startArena, story.js | partida en la arena/calle de combate |
| `BASE` | `base` | main.applyBaseState | modo casa-base (Continuar) |
| `CLOSED_WINDOW_MARTITA` | `closed_window_martita` | world/interact.js, story.js | ventana de Martita cerrada |
| `CLOSED_WINDOW_LIVING` | `closed_window_living` | story.js (CLOSE_KEYS) | ventana del living cerrada |
| `CLOSED_HALL_DOOR` | `closed_hall_door` | story.js (CLOSE_KEYS, playPolsky) | puerta del hall cerrada |
| `CLOSED_GARAGE_DOOR` | `closed_garage_door` | world/interact.js, story.js | puerta del garaje cerrada |
| `RADIO_ON` | `radio_on` | maps (toggleDevice) | radio prendida |
| `CANDLE_APAGADA` | `candle_apagada` | maps (toggleDevice) | vela del altillo apagada (invertida) |

Familias dinámicas: `closed_<id>` solo para los ids de `CLOSABLE_IDS`;
`npc_gone_<id>` acepta cualquier id documentado (hoy no se usa con ningún NPC).

## Archivos cambiados

- NUEVO `src/data/flags.js`
- NUEVO `test/flags.test.js`
- `src/story.js` (import + `CLOSE_KEYS` + todas las lecturas/escrituras)
- `src/objectives.js` (`CLOSED_KEYS`, `AIRLOCK_STEPS.flag`, `currentObjective`,
  `airlockCount`, `equipChecklist`)
- `src/actions.js` (`closedFlag` en `stateOf` y `matchOn`)
- `src/data/script.js`
- `src/data/descriptions.js`
- `src/world/actions.js` (borrado del `closed_<id>`)
- `src/world/hud.js` (`exitBlocker`, alias `f.*`)
- `src/world/interact.js` (`closeWindow` + flags de esclusa/mate)
- `src/world/state.js` (`closed_<id>`, `npc_gone_<id>`, apagón, Polsky)
- `src/world/update.js`
- NUEVO `docs/arq/C_resultado.md`

No toqué `main.js`, `scenes/*`, `arena/*`, `core/*`, `maps/*`, `base.js` ni
`apagon.js`.

## Conectar `guardFlags` (lo hace el orquestador)

`guardFlags` no está conectado a propósito. En build de producción devuelve el
mismo objeto (sin Proxy); solo avisa en dev/node. Para activarlo:

1. `src/main.js` (creación del game), línea 62:
   ```js
   flags: {},                       // -> flags: guardFlags({}),
   ```
   y el import arriba:
   ```js
   import { guardFlags } from './data/flags.js';
   ```
2. Cada reasignación de `game.flags` pierde el Proxy; envolverla:
   - `src/core/runflow.js:20`  `game.flags = {};`
   - `src/core/runflow.js:90`  `game.flags = { ...(game.flags || {}), ...BASE_FLAGS, base: true, arena: false };`
   - `src/core/debugApi.js:145` `setFlags: (flags) => { game.flags = { ...game.flags, ...flags }; }`
   - `src/scenes/title.js:185` `this.game.flags = { ...(this.game.flags || {}), apagon: true, listo_para_salir: true };`
   - (opcional, mis archivos) `src/world/actions.js:243,257` cuando crea
     `scene.game.flags = {}` si faltaba.
   Ejemplo: `game.flags = guardFlags({ ...(game.flags || {}), ...BASE_FLAGS, base: true, arena: false });`
3. Recordar que `game.flags` se lee/expande en varios lados; el Proxy solo
   cubre el objeto vigente, por eso hay que envolver cada reasignación.

## Pendientes fuera de mis archivos (literales, con línea actual)

No rompen nada (las claves están en `FLAG` y el test las acepta), pero el
orquestador puede pasarlas a `FLAG.X` para terminar la unificación. Ojo: hay
workers en paralelo, las líneas pueden correrse.

`src/main.js`
- 180: `game.flags && game.flags.base ? ...` -> `FLAG.BASE`

`src/scenes/`
- garage.js:50 `!this.game.flags.base`
- view.js:61 `this.game.flags.apagon`
- world.js:246 `this.game.flags.base`
- title.js:185 `{ apagon: true, listo_para_salir: true }` (además reasigna flags)

`src/arena/`
- hudArena.js:77 `scene.game.flags.apagon`
- runSetup.js:146 `scene.game.flags.apagon = true`
- runSetup.js:166 `scene.game.flags && scene.game.flags.apagon`

`src/core/` (archivos nuevos de otro worker)
- clocks.js:43 `game.flags.apagon = true`
- panels.js:74 `!game.flags.base`
- runflow.js:74 `game.flags.base = false`
- runflow.js:75 `game.flags.arena = true`
- runflow.js:114 `game.flags.base = false`
- debugApi.js:46 `Boolean(game.flags.base)`

`src/apagon.js`
- 162 `scene.game?.flags?.electrogeno_on`

`src/base.js`
- 9-26 `BASE_FLAGS`: las 16 claves son válidas; opcional pasarlas a `[FLAG.X]`.

`src/maps/` (opcional; son literales de datos)
- attic.js: 88,123,134 `toggle: 'radio_on'/'candle_apagada'`; 89,124,135
  `g.flags?.radio_on/candle_apagada`; 105,108,120,131 `showIfFlag/hideIfFlag`.
- garage.js: 66,98 `g.flags?.extractor_ok/electrogeno_on`; 84,126,164,169,174
  `showIfFlag`; 187 `needsFlag: 'listo_para_salir'`; 160 comentario.
- house.js: 102,103 `radio_on`; 111 `showIfFlag: 'apagon'`; 148 `closed_garage_door`;
  200,208 `closed_window_martita`.
- street.js:147 y barrio/pieces.js:247 `showIfFlag: 'polsky_muerto'`.

## Verificación

- `npm test`: **784 pass, 0 fail** (base 751; el resto del crecimiento es de
  otros workers en paralelo; los 7 nuevos son de `test/flags.test.js`).
- `npm run build`: **OK** (vite 6.4.6, 143 módulos, sin errores).
- `node --check` en todos los archivos tocados y en el test nuevo.
- Prueba de que el test (b) muerde: `game.flags.apagno` inyectado en
  `src/data/script.js` -> falla con `src/data/script.js:414 usa "apagno"`;
  restaurado el archivo, vuelve a verde.
- Auditoría independiente (`dsagent analyzer`, solo lectura) sobre todo `src`:
  **ninguna clave usada quedó sin declarar**. Sus observaciones de puntos
  ciegos (constantes `FLAG.<typo>`, literales de datos de mapas) quedaron
  cubiertas por los tests 3 y 4.
- Sin cambios visuales: no hizo falta screenshot headless (además `docs/arq/comun.md`
  prohíbe levantar vite/navegador para este trabajo).

## Lo que falta (fuera de alcance)

- Conectar `guardFlags` en `main.js`/`core`/`title` (líneas arriba): hasta
  entonces el Proxy existe y está testeado, pero nadie lo usa.
- Pasar los literales de `main/scenes/arena/core/maps/base/apagon` a `FLAG.X`
  (no son mis archivos).
- `npc_gone_<id>` no se usa hoy con ningún NPC: si se empieza a usar, alcanza
  con el helper (la familia ya está aceptada).
