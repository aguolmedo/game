OBJETIVO (worker A, tanda 1): el núcleo lógico del roguelike de El Eternauta. Solo lógica pura en módulos nuevos más sus pruebas. NO tocar escenas, main.js ni mapas.

Proyecto: /home/mateyfasito/dev/game/eternauta (Vite + Three.js, ES modules, pruebas con `node --test`). Leé primero `docs/diseno_roguelike.md` (contratos) y `src/run/rng.js` (ya existe: rngFromSeed, randInt, pick, shuffled; no lo modifiques).

ARCHIVOS A CREAR (solo estos, más sus tests):

1. `src/run/save.js`
   - `export const SAVE_KEY = 'eternauta.save.v1'`
   - `export function emptySave()` → el objeto exacto de "save" del diseño (v:1, trajeHecho:false, loop:0, muertes:0, botin {chatarra,goma,nafta,pieza en 0}, mejoras {favalli,elena,lucas,luz en 0}, mochila:null, best {round:0, points:0}).
   - `export function loadSave(storage = globalThis.localStorage)` → lee JSON. Si falta, está roto o la versión no coincide, devuelve emptySave(). Mezcla con emptySave() para completar los campos que falten. Todo dentro de try/catch (localStorage puede tirar error).
   - `export function writeSave(save, storage = globalThis.localStorage)` → guarda y devuelve true o false; nunca tira error.
   - `export function clearSave(storage)`.
   - `export function addBotin(save, bag)` → devuelve un save NUEVO (inmutable) con la bolsa sumada. Ignora claves desconocidas y valores negativos.
   - Pruebas con un storage falso (un objeto con getItem/setItem/removeItem), y uno que tira error en todos los métodos.

2. `src/run/upgrades.js`
   - `export const STATIONS = ['favalli','elena','lucas','luz']`
   - `export const UPGRADES = { favalli: [{id:'cerrojo', name:'Cerrojo aceitado', desc:'Dispara más rápido: un tiro cada 0,45 s en vez de 0,55.', cost:{chatarra:4}}, {id:'cargador', name:'Cargador de ocho', desc:'Ocho balas por cargador en vez de cinco.', cost:{chatarra:6, pieza:1}}, {id:'punta', name:'Punta de élitro', desc:'La bala atraviesa a dos cascarudos sin perder fuerza.', cost:{pieza:3, chatarra:2}}], elena: [{id:'capa', name:'Doble capa', desc:'El traje aguanta una mordida más (cuatro parches).', cost:{goma:3}}, {id:'remiendo', name:'Remiendo rápido', desc:'Ponerse un parche tarda la mitad.', cost:{goma:2, chatarra:1}}, {id:'hombreras', name:'Hombreras de élitro', desc:'La primera mordida de cada ronda no rompe nada.', cost:{pieza:2, goma:2}}], lucas: [{id:'antena', name:'Antena en el techo', desc:'Lucas agarra rumores de esta noche. Algunos son ciertos.', cost:{chatarra:3}}, {id:'valvulas', name:'Válvulas nuevas', desc:'Más frecuencias: sobrevivientes que piden ayuda en la salida.', cost:{chatarra:2, pieza:1}}, {id:'frecuencia', name:'La frecuencia de ellos', desc:'Una voz que cuenta números. Avisa antes de algo grande.', cost:{pieza:3}}], luz: [{id:'bengala', name:'Bengala', desc:'Una por salida: los cascarudos se frenan en su luz.', cost:{nafta:2}}, {id:'molotov', name:'Botella de nafta', desc:'Una por salida: fuego en el piso unos segundos.', cost:{nafta:2, chatarra:1}}, {id:'farol', name:'Farol de mano', desc:'Luz alrededor de Juan: de noche se ve más lejos.', cost:{nafta:3, chatarra:2}}] }`
   - `export const STATION_INFO = { favalli:{who:'Favalli', what:'El rifle'}, elena:{who:'Elena', what:'El traje'}, lucas:{who:'Lucas', what:'La radio'}, luz:{who:'Electrógeno', what:'Luz y fuego'} }`
   - `export function nextUpgrade(save, station)` → la siguiente mejora (objeto) o null si ya están las 3.
   - `export function upgradeState(save, station, index)` → 'hecho' | 'disponible' | 'bloqueado' (en orden: índice < nivel → hecho; == nivel → disponible; > nivel → bloqueado).
   - `export function canAfford(save, cost)` → bool. `export function buyUpgrade(save, station)` → `{ ok, save, reason }` inmutable: chequea que sea la siguiente y que alcance, descuenta el costo de save.botin y sube save.mejoras[station]. reason: 'completo' | 'falta' | null.
   - `export function effects(save)` → `{ fireRate:0.55|0.45, magSize:5|8, pierceDamage:0.5|1, integrityMax:3|4, patchTime:1.5|0.75, firstBiteFree:false|true, rumor:bool, sobreviviente:bool, frecuencia:bool, bengalas:0|1, molotovs:0|1, farol:bool }` según los niveles (nivel ≥ k activa la k-ésima mejora de esa estación).
   - Pruebas: costos, el orden, que no se pueda comprar sin plata ni saltear, que effects cambie con cada nivel y que save no se mute.

3. `src/run/loot.js`
   - `export const LOOT_KINDS = ['chatarra','goma','nafta','pieza']`; `export const LOOT_ITEM = { chatarra:'chatarra', goma:'goma', nafta:'nafta', pieza:'pieza_cascarudo' }` (nombres de sprite en el atlas de items).
   - `export const LOOT_NAME = { chatarra:'chatarra', goma:'goma', nafta:'nafta', pieza:'pieza de cascarudo' }`
   - `export function emptyBag()`; `export function addToBag(bag, kind, n=1)` (inmutable); `export function bagCount(bag)`.
   - `export function enemyDrop(type, rng)` → lista de `{kind, n}`. cascarudo: 30 % chatarra 1, 15 % goma 1 (tiradas independientes); veloz: 25 % goma 1; acorazado: 60 % pieza 1, 50 % chatarra 1. Tipo desconocido → [].
   - `export function spotLoot(spot, rng)` → `{kind, n}` para un punto de botín del mapa: si spot.kind es 'nafta' → nafta 1; si no, al azar chatarra (50 %), goma (35 %) o nafta (15 %), con n 1 o 2.
   - `export function dropMochila(save, bag, loop)` → save nuevo con `mochila = bagCount(bag) > 0 ? { loop, contenido: bag } : save.mochila` (si la bolsa está vacía, no pisa una mochila anterior) y `muertes + 1`.
   - `export function pickMochilaSpot(lootSpots, rng, excludeCell = 'casa')` → un spot (de los que no tienen `cell === excludeCell`) o null.
   - `export function recoverMochila(save, bag)` → `{ save (mochila: null), bag (sumada) }`.
   - Pruebas con `rngFromSeed` (determinísticas) y con un rng falso que devuelve valores fijos.

4. `src/run/seed.js`
   - `export function seedFor(loop, salt = 0)` → entero de 32 bits determinístico (por ejemplo, un hash FNV-1a de `${loop}:${salt}`).
   - `export const PALOS = ['espada','basto','oro','copa']`; `export const NUMEROS = [1,2,3,4,5,6,7,10,11,12]`.
   - `export function handFromSeed(seed)` → 3 cartas distintas `{n, palo}` usando rngFromSeed.
   - `export function handText(hand)` → '7 de oro · 1 de espada · 4 de copa' (palo en singular; 1 de espada se escribe así).
   - `export function envido(hand)` → el envido de truco: con dos del mismo palo, 20 + la suma (10, 11 y 12 valen 0); si no, la carta más alta que no sea figura (las figuras valen 0).
   - `export const SEED_33` → una semilla cuya mano da envido 33 (buscala con un loop en el test o en el módulo y dejala fija). Test: `envido(handFromSeed(SEED_33)) === 33`.

5. `src/run/radio.js` (Lucas, radioaficionado)
   - `export const RUMORES` → lista de objetos `{ id, text, check(cells) }` donde `check` dice si el rumor es cierto para el barrio de esa noche (cells = [{type}]). Al menos 8 rumores, por ejemplo:
     - 'Dicen que en la ferretería quedaron balas.' (cierto si hay esquina)
     - 'Por las vías no pasa nadie hace horas.' (cierto si hay vías)
     - 'En la plaza se juntan los bichos.' (cierto si hay plaza)
     - 'Al fondo del pasaje hay un almacén que nadie saqueó.' (cierto si hay cortada)
     - 'Esta noche está tranquilo el barrio.' (nunca cierto)
     - 'Alguien vio luz en lo de Ramírez.' (nunca cierto)
     - y otros.
   - `export const GAGS_RADIO` → por nivel de Lucas (0..3), líneas que agarra la radio, en el tono de `docs/roguelike_narrativa.md`, sección "Lucas, radioaficionado". **NO incluir el gag del tutorial del programador** (está descartado). Incluir: la voz de otro loop ("CQ, CQ, acá desde Vicente López… ¿Juan? ¿Sos vos?"), el partido de 1957 que sigue transmitiendo ("¡Gol!"), el tango cortado por la estática y, solo en el nivel 3, la voz que cuenta números ("…siete… cuatro… cuatro… uno…"). Mínimo 3 líneas por nivel.
   - `export function rumorFor(cells, rng)` → `{ text, cierto }`. `export function radioLine(level, rng)` → string.
   - Pruebas de que check funciona con distintos cells, y de que ningún texto mencione "tutorial" ni "programa".

ACEPTACIÓN: `npm test` en verde (las 475 de antes más las nuevas). `npm run build` OK. `node --check` de cada archivo nuevo. Sin cambios fuera de `src/run/{save,upgrades,loot,seed,radio}.js` y `test/run_*.test.js`. Al final, escribí un resumen corto en `docs/brief_rl_A_resultado.md` (qué exporta cada módulo y las firmas).
