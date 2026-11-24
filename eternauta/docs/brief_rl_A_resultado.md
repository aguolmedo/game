# Roguelike, tanda 1 — worker A: núcleo lógico (resultado)

Módulos nuevos, todos lógica pura (sin DOM, sin Three.js). Pruebas en `test/run_*.test.js`.
No se tocó `src/run/rng.js`, escenas, `main.js` ni mapas.

## `src/run/save.js` — guardado persistente

```js
SAVE_KEY = 'eternauta.save.v1'
emptySave()                                  // save completo con valores base, siempre nuevo
loadSave(storage = globalThis.localStorage)  // valida v:1, mezcla con emptySave(); nunca tira
writeSave(save, storage = globalThis.localStorage) // -> true | false
clearSave(storage = globalThis.localStorage) // nunca tira
addBotin(save, bag)                          // save NUEVO con la bolsa sumada; ignora claves
                                             // desconocidas, negativos, NaN e Infinity
```

Todo el acceso al storage va en `try/catch` (storage ausente, lleno o roto).

## `src/run/upgrades.js` — estaciones y efectos

```js
STATIONS = ['favalli', 'elena', 'lucas', 'luz']
UPGRADES   // 4 estaciones x 3 mejoras {id, name, desc, cost}
STATION_INFO = { favalli:{who,what}, elena, lucas, luz }
nextUpgrade(save, station)          // siguiente mejora u null si ya están las 3
upgradeState(save, station, index)  // 'hecho' | 'disponible' | 'bloqueado'
canAfford(save, cost)               // bool
buyUpgrade(save, station)           // { ok, save (nuevo), reason:'completo'|'falta'|null }
effects(save)                       // { fireRate, magSize, pierceDamage, integrityMax,
                                    //   patchTime, firstBiteFree, rumor, sobreviviente,
                                    //   frecuencia, bengalas, molotovs, farol }
```

No se puede saltear ni comprar dos veces: siempre se compra `UPGRADES[station][nivel]`.
`buyUpgrade` no muta el save ni los datos de `UPGRADES`.

## `src/run/loot.js` — botín y mochila de otra vez

```js
LOOT_KINDS = ['chatarra', 'goma', 'nafta', 'pieza']
LOOT_ITEM  // sprite del atlas de items (pieza -> 'pieza_cascarudo')
LOOT_NAME  // nombre lindo para UI (pieza -> 'pieza de cascarudo')
emptyBag()                  // { chatarra:0, goma:0, nafta:0, pieza:0 }
addToBag(bag, kind, n = 1)  // bolsa NUEVA; ignora kind desconocido y n inválido/negativo
bagCount(bag)               // total de las 4 claves
enemyDrop(type, rng)        // lista [{kind,n}]; orden de tiradas fijo (ver abajo)
spotLoot(spot, rng)         // {kind,n}; spot.kind==='nafta' => nafta 1
dropMochila(save, bag, loop)// save NUEVO: mochila {loop,contenido} si bag>0, muertes+1
pickMochilaSpot(lootSpots, rng, excludeCell = 'casa') // spot | null
recoverMochila(save, bag)   // { save (mochila:null), bag (sumada) }
```

Tiradas de `enemyDrop`: cascarudo chatarra 30 % y goma 15 % (independientes, 2 tiradas);
veloz goma 25 % (1); acorazado pieza 60 % y chatarra 50 % (2); desconocido `[]` sin rng.
`spotLoot`: tipo 50 % chatarra / 35 % goma / 15 % nafta, después n 1 o 2 (50/50).

## `src/run/seed.js` — semilla y mano de truco

```js
seedFor(loop, salt = 0)  // FNV-1a de `${loop}:${salt}` -> entero 32 bits sin signo
PALOS  = ['espada', 'basto', 'oro', 'copa']
NUMEROS = [1,2,3,4,5,6,7,10,11,12]
handFromSeed(seed)       // 3 cartas distintas {n,palo}, determinísticas
handText(hand)           // '7 de oro · 1 de espada · 4 de copa'
envido(hand)             // mejor par mismo palo: 20 + suma (10,11,12 valen 0);
                         // sin par: carta más alta no figura (figuras 0)
SEED_33 = 57             // mano: 7 de oro · 12 de espada · 6 de oro -> envido 33
```

## `src/run/radio.js` — Lucas, radioaficionado

```js
RUMORES      // 12 x {id, text, check(cells)}; cells = [{type}]
GAGS_RADIO   // {0:[...],1:[...],2:[...],3:[...]}, 4-6 líneas por nivel
rumorFor(cells, rng) // { text, cierto }
radioLine(level, rng) // string; nivel fuera de rango se recorta a 0..3
```

Rumores ciertos según `esquina`, `plaza`, `vias` y `cortada`; dos son siempre falsos
("está tranquilo el barrio", "luz en lo de Ramírez"). Gags: otro loop (`CQ, CQ… ¿Juan? ¿Sos vos?`),
el partido de 1957 (`¡Gol!`), el tango cortado por la estática y, solo en el nivel 3, la voz
que cuenta números (`…siete… cuatro… cuatro… uno…`). Sin el gag del tutorial/programador.

## Verificación

- `node --check` OK en los 5 módulos y en los 5 tests nuevos.
- `node --test test/run_{save,upgrades,loot,seed,radio}.test.js` -> **80 pass, 0 fail**.
- `npm test` -> **563 pass, 0 fail** (las 475 previas + las 80 nuevas + tests de otras tandas
  que corren en paralelo).
- `npm run build` -> OK (`vite build`, 80 módulos, sin errores).
