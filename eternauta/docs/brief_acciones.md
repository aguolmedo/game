# Brief: resolvedor único de acciones (R1–R6)

Contexto y motivo: `docs/pulido_zoom_click.md` §4 y §5. Este brief es la especificación **cerrada**: si algo no está acá, se mantiene el comportamiento actual. Diseño: Claude, 2026-11-17.

Reglas de trabajo:
- Repo `~/dev/game/eternauta`. Working tree SIN COMMITEAR: no commitear, no `git checkout/reset/stash`. No tocar `~/dev/game/bocetos/`, `tools/art/`, `public/assets/`. No abrir navegador ni Chromium.
- `npm run build && npm test` verde al final de **cada** paso (A1…A6, B1).
- Si un paso no cierra en un intento razonable: parar y reportar qué bloqueó. No rediseñar.
- No reescribir un test de invariante para que pase: si choca, reportarlo.

---

## Parte A — Acciones

### A1. Modelo de datos de estaciones (R3)
Hoy `station: 'heat'` está en todo el `workbench` (`src/maps/attic.js:~128`) y la regla "subir del objeto apoyado al mueble" hace que la tijera y la tela hereden la estación.
- El estado se queda en el mueble: `game.pavaStation` sigue guardando el id del **mueble** (`workbench` / `stove`). No cambiar `takePava`, `startHeating` ni `updatePava`.
- Agregar en el `workbench` de `attic.js`: `stationItem: 'calentador'`. Significa que, de lo apoyado, solo el `calentador` representa la estación.
- Función pura nueva en `src/actions.js`: `stationOf(target, objects)` →
  - `target.kind === 'object'` y `ref.station` → `ref` (el mueble mismo cuenta como estación, tenga o no `stationItem`).
  - `target.kind === 'surfaceItem'` → el mueble `objects.find(o => o.id === target.objectId)`, **solo si** el mueble tiene `station` **y** `mueble.stationItem === (target.item?.id || target.worldItem?.itemId)`. Si no, `null`.
  - Cualquier otro caso → `null`.

### A2. Tabla de usos (R2): `src/data/actions.js`
```js
// Uso del item en la mano SOBRE un objetivo. Orden = prioridad.
export const ITEM_USES = [
  { id: 'heatPava',   item: /^pava_(fria|caliente)$/, on: { station: 'heat', free: true }, label: 'Poner la pava al fuego' },
  { id: 'installExtractor', item: 'secador', on: { station: 'extractor' },               label: 'Instalar el secador' },
  { id: 'fuelGenerator',    item: 'nafta',   on: { objectId: 'generator' },              label: 'Cargar nafta' },
  { id: 'sealWindow',       item: 'tiras',   on: { window: 'openable', open: true },     label: 'Sellar la ventana' },
  { id: 'shareMate',        item: 'mate_cebado', on: { kind: 'npc' },                    label: 'Convidar mate' },
  { id: 'dumpMate',         item: 'mate_lavado', on: { idMatch: /bucket|pileta|sink|balde/i }, label: 'Tirar la yerba' },
];
// Uso del item SOBRE UNO MISMO (sin objetivo). label puede ser función del estado.
export const SELF_USES = [
  { id: 'equipSuit',  item: 'traje',      label: (g) => (g.hasSuit ? 'Sacar traje' : 'Poner traje') },
  { id: 'toggleRifle', item: 'rifle',     label: (g) => (g.hasRifle ? 'Guardar rifle' : 'Equipar rifle') },
  { id: 'mateSelf',   item: /^mate_/,     label: (g, id) => ({ mate_vacio: 'Ponerle yerba', mate_yerba: 'Cebar', mate_cebado: 'Tomar mate', mate_lavado: 'Tirar la yerba' }[id] || 'Usar mate') },
  { id: 'pavaSelf',   item: /^pava_/,     label: 'Mirar la pava' },
  { id: 'yerbaSelf',  item: 'yerba',      label: 'Usar yerba' },
];
// Fallback de SELF con cualquier otro item: id 'describe', label 'Usar'.
// SOLO con F/X ("item"); con click en el vacío ("primary") los items sin fila en SELF_USES no hacen nada.
```
Matcheo de `on`:
- `station: X` → `stationOf(target)?.station === X`. Con `free: true`, además `game.pavaStation !== estacion.id`.
- `objectId: X` → objeto cuyo `ref.id === X`.
- `window: 'openable', open: true` → `ref.window?.openable` y `!game.flags['closed_' + ref.id]`.
- `kind: 'npc'` → `target.kind === 'npc'`.
- `idMatch: re` → `re.test(target.id || '')`.
- `item` es un string (igualdad) o una RegExp.

### A3. Resolvedor (R1): `src/actions.js`, puro (sin Three.js ni DOM)
```js
export function resolveAction(ctx, target, heldId, mode) → Action | null
// ctx = { game, objects, verbFor?, describeTarget? }  (lo que haga falta, sin `this` de la escena)
// mode: 'primary' (click izq / E / A) | 'item' (F / X / click en el item elegido de la hotbar) | 'look' (click der)
// Action = { kind, id, label, needsNear, payload }
//   kind: 'use' | 'self' | 'take' | 'drop' | 'open' | 'talk' | 'look' | 'warp' | 'takePava' | 'view' | 'closeWindow' | 'ammo' | 'none'
```
**Orden de resolución (fijo):**

`mode === 'look'`: con target → `{kind:'look', label:'Mirar', needsNear:false}`; sin target → `null`.

`mode === 'primary'` con target:
1. `ITEM_USES` (primera fila que matchee item y `on`) → `{kind:'use', id: fila.id, label: fila.label, needsNear:true}`.
2. Acción propia del objetivo. Se preserva exactamente la lógica actual de `interact()` en `src/scenes/world.js`:
   - warp → `warp` (label = `target.label` o 'Entrar').
   - npc → `talk` ('Hablar con <Nombre>' como hoy en actionLabel/verbFor).
   - container → `open` ('Abrir <nombre>').
   - pickup → `take`.
   - surfaceItem → `take` (label = `target.label`: 'Agarrar X' o 'Mirar X' para decor).
   - object `caja_municiones` / `interact.kind==='ammo'` → `ammo`.
   - object con `window.view` → `view` ('Mirar por la ventana').
   - object con `window.openable` → `closeWindow` ('Cerrar la ventana'; si ya está cerrada → `look` 'Mirar la ventana').
   - estación de calor ocupada (`stationOf(target)?.station==='heat'` y `game.pavaStation === estacion.id`) → `takePava` ('Sacar la pava'), **tenga lo que tenga en la mano**.
   - object con `surface` y algo en la mano → `drop` ('Dejar <nombre del item>').
   - resto → `look` (label = `interact.label` si existe; si no, verbo + nombre como el fallback actual de `actionLabel`).
3. Nunca devuelve `null` con target.

`mode === 'primary'` **sin** target: si `heldId` matchea `SELF_USES` → `{kind:'self', id, label}`; si no, `null`.

`mode === 'item'` con target: (1) `ITEM_USES`; si ninguna matchea → igual que sin target. Excepción heredada de T10: si el objetivo es una estación de calor ocupada y `heldId` es `mate_*` o `pava_*`, devolver `{kind:'none', label:'Primero sacá la pava.'}`. El run muestra ese texto como toast.

`mode === 'item'` sin target: `SELF_USES`; si no hay fila → `{kind:'self', id:'describe', label:'Usar'}`. Sin item en la mano → `{kind:'none', label:'No tenés nada en la mano.'}`.

### A4. Ejecutor en `WorldScene`
- Nuevo `runAction(action, target)` en `world.js`: un `switch (action.kind)` que llama a los efectos **existentes** sin cambiar su lógica: `tryWarp`, `talkTo`, `game.openChest`, `pickup.take`, `takeSurfaceItem`, `openView`, `closeWindow`, `takePava`, `dropSelectedOn`, `lookAt`, el toast de munición. Para `use`, un mapa `id → efecto`: `heatPava`/`installExtractor`/`fuelGenerator`/`sealWindow` → la rama correspondiente de `useOnObject` (partir `useOnObject` en funciones con nombre), `shareMate` → `shareMate`, `dumpMate` → `useMate('mate_lavado', target)`. Para `self`: `equipSuit` → `requestEquip`, `toggleRifle` → lo de hoy, `mateSelf` → `useMate`, `pavaSelf` → `usePava`, `yerbaSelf` → `useMate('yerba')`, `describe` → toast de descripción. Mantener **todos** los `emit(...)` que hacen hoy.
- Si `action.needsNear` y el objetivo está lejos: `faceTarget` + toast 'Acercate un poco.' (cooldown 1 s) y no ejecutar.
- Reemplazos:
  - `handleMouseClick()` → `runAction(resolveAction(ctx, hoverTarget, held, 'primary'), hoverTarget)` (con `faceTarget` antes si hay target).
  - `interact()` (E/A) → igual con `this.target`. **Ojo**: hoy `interact()` primero resuelve el warp bajo los pies si no hay objetivo-objeto. Preservar esa regla: si no hay target o el target es un warp, y hay `exitWarp`, el target es el warp.
  - `useSelected()` (F/X y la hotbar) → `resolveAction(..., 'item')`.
  - `handleRightClick()` → `'look'`.
  - `actionLabel(target)` queda como wrapper: `resolveAction(ctx, target, held, 'primary')?.label ?? null` (lo usan los tests).
  - `useLabel()` → `resolveAction(ctx, null, held, 'item').label`. Lo usan la leyenda y la barra de teclado.
  - `verbFor()` solo se usa como helper interno del resolvedor para labels de teclado/pad. La barra de teclado muestra `resolveAction(target,'primary').label`.
- Borrar: `itemUseLabel`, `targetObject`, `itemOverPava`, la constante `SELF_USE` y las comparaciones de ids de ítems que queden en `handleMouseClick`/`interact`/`useSelected`/`actionLabel`. `useOnObject`, `useMate` y `usePava` quedan solo como efectos llamados por `runAction`.
- Criterio: `grep -nE "slot\.id ===|itemId ===|startsWith\('(mate|pava)_'\)" src/scenes/world.js` → solo puede aparecer dentro de los efectos (`useMate`, `usePava`, `shareMate`, efectos de `use`), no en código de decisión.

### A5. Tests de invariantes (R5): `test/actions_invariants.test.js`
Cargar los mapas reales (`src/maps/attic.js`, `house.js`, `garage.js`, `street.js`) e `INITIAL_ITEMS`. Construir los candidatos como lo hace el juego, sin Three.js: objetos con `interact`/`container`/`station`, surface items de `INITIAL_ITEMS` con `item`, `objectId` e `itemId`, warps, y un npc falso. Si construirlos es difícil, extraer a una función pura la parte de `mapView.js`/`surfaces.js` que arma candidatos. Ítems: todos los ids de `src/items.js` más `null`. Estados: `pavaStation` en `null`, `'workbench'` y `'stove'`. Para cada combinación:
1. `mode 'primary'` con target → no es `null` y `label` es un string no vacío.
2. Si `kind==='use'` y la fila tiene `on.station`, entonces `stationOf(target)` no es `null` y su `.station` coincide. **Este test atrapa el bug del banco**: con `pava_fria`, la tijera o la tela (surfaceItem del workbench) NO pueden dar `heatPava`. Agregar ese caso explícito además del barrido.
3. Si el objetivo es una estación de calor ocupada → `primary` da `takePava` para cualquier ítem.
4. `mode 'item'` sin target → nunca `null`.
5. `actionLabel(target)` del `WorldScene` (o del wrapper) === `resolveAction(...,'primary').label`. Basta con un fake mínimo de la escena.

Y un test de ejecución por kind con un mundo falso: `take` suma al inventario, `drop` resta, `use heatPava` setea `pavaStation`, `use installExtractor` setea `flags.extractor_ok`, `self mateSelf` con `mate_cebado` emite `itemUsed` con `action:'sip'`.

### A6. Limpiar tests viejos
`test/action_label.test.js`, `test/world_fixes.test.js` (pava), `test/right_click.test.js`, `test/world_hints.test.js`: adaptarlos al resolvedor **sin cambiar lo que verifican**. Excepción: los que verifican algo contradicho por este brief. Hoy son estos dos: el click sobre la pava en el fuego con mate en la mano la saca; y `itemUseLabel` ya no existe, así que sus asserts pasan a `resolveAction`.

---

## Parte B — Etiqueta flotante (R4), después de A

### B1. `placeLabel` en `src/hud.js` (reemplaza a `promptRect`; dejar `promptRect` como alias)
```js
placeLabel({ x, y, w, h, frameH, obstacles = [], viewW, viewH, minY = PROMPT_MIN_Y }) → { x, y, w, h }
```
- Candidatos en este orden. El primero que entra en pantalla (`x >= 4`, `x+w <= viewW-4`, `y >= minY`, `y+h <= viewH-72`) y no pisa ningún obstáculo gana:
  1. arriba centrado: `(x - w/2, y - 3 - h)`
  2. arriba corrido a la derecha del obstáculo que pisa: `ob.x + ob.w + 2`
  3. arriba corrido a la izquierda: `ob.x - w - 2`
  4. arriba del obstáculo: `(x - w/2, ob.y - 3 - h)`
  5. abajo del marco: `(x - w/2, y + frameH + 3)`. Es el único caso "abajo" y se usa solo si ninguno de arriba entra.
  6. si nada sirve: el candidato 1 clampeado.
- Clamp horizontal antes de chequear colisiones.
- Obstáculos que pasa `hudParams()`: la caja del jugador en vista (`playerViewBox()`), la del **cursor** en vista (si el dispositivo es mouse: `{x: px - 2, y: py - 2, w: 14, h: 16}` alrededor del puntero) y los rects de la barra de pistas y la hotbar.
- Tests `test/prompt_layout.test.js`: los casos actuales y un barrido con objeto, jugador y cursor en una grilla de posiciones (paso 16 px sobre 480×270). Invariantes: nunca pisa al jugador ni al cursor si existe un candidato válido, siempre queda en pantalla y por defecto va arriba centrado.

---

## Reporte final
Por paso: OK u omitido (con el motivo), archivos tocados, salida de `npm run build` y conteo de `npm test`. Pegar también la salida del grep del criterio A4.
