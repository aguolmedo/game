// Registro único de las banderas de la partida (game.flags).
//
// Uso normal:  import { FLAG } from './data/flags.js';
//              if (game.flags[FLAG.APAGON]) { ... }
//              game.flags[FLAG.APAGON] = true;
//
// Cada bandera dice quién la pone y qué significa. Si hace falta una nueva,
// se declara acá y se usa por constante: así un typo rompe el test en vez de
// crear una bandera fantasma.
//
// Las claves armadas dinámicamente tienen helper y prefijo documentado:
//   closedFlag(objectId) -> "closed_<id>"   (aberturas cerrables de la casa)
//   npcGoneFlag(npcId)   -> "npc_gone_<id>" (NPC que desaparece del mapa)

export const FLAG = Object.freeze({
  // --- apagón y clima (historia §6.1)
  /** Apagón general: la ciudad queda a oscuras y cambia la luz. La pone story.js
   *  (playTruco), game.blackout (main.js), la base y el título al Continuar. */
  APAGON: 'apagon',

  // --- tutorial del mate y la mesa (historia §6.2, objetivos 1-2)
  /** Juan ya cebó/tomó/compartió un mate: termina el tutorial. Lo pone
   *  world/interact.js (useMate) y story.js (itemUsed / mateShared). */
  MATE_TUTORIAL: 'mate_tutorial',
  /** Ya se jugó el truco de la mesa (viñeta). Lo pone story.js (playTruco). */
  TRUCO_JUGADO: 'truco_jugado',

  // --- ventana del altillo y nieve (historia §6.2, objetivo 3)
  /** Ya se vio la nevada mortal desde la ventana del altillo. Lo pone
   *  story.js (checkPendingView) después de las viñetas. */
  VIO_LA_NEVADA: 'vio_la_nevada',

  // --- Martita y el cierre de la casa (historia §6.2, objetivos 4-5)
  /** Resultado de la carrera de Martita: 'ok' si se cerró a tiempo, 'tarde'
   *  si venció el timer. Lo pone story.js; sin valor = todavía no pasó. */
  MARTITA_VENTANA: 'martita_ventana',
  /** Carrera de Martita activa (timer de 8 s corriendo). La pone y la limpia
   *  story.js (startMartita / windowClosed / timerEnd). */
  MARTITA_SPRINT: 'martita_sprint',
  /** Las cuatro aberturas están cerradas y la casa quedó sellada. La pone
   *  story.js (check) cuando closedCount(flags) >= 4. */
  CASA_SELLADA: 'casa_sellada',
  /** Elena ya habló del tema en el living. La pone story.js (interact npc). */
  ELENA_HABLADA: 'elena_hablada',
  /** Ramírez murió al mirar la ventana del living (viñeta). La pone story.js. */
  RAMIREZ_MUERTO: 'ramirez_muerto',

  // --- el plan del traje (historia §6.2, objetivos 6-8)
  /** Favalli explicó el plan del traje en el altillo. Lo pone story.js. */
  IDEA_TRAJE: 'idea_traje',
  /** El electrógeno arrancó con la nafta. Lo pone world/interact.js. */
  ELECTROGENO_ON: 'electrogeno_on',
  /** El extractor quedó instalado en el garaje. Lo pone world/interact.js. */
  EXTRACTOR_OK: 'extractor_ok',
  /** El traje se fabricó en el banco. Lo pone story.js al recibir
   *  itemCrafted('traje'); también viene en BASE_FLAGS. */
  TRAJE_FABRICADO: 'traje_fabricado',
  /** Nafta + extractor + traje listos: la esclusa está preparada. La pone
   *  story.js (check) y viene en BASE_FLAGS. */
  ESCLUSA_LISTA: 'esclusa_lista',
  /** Se vieron los dados (viñeta del living) y toca equiparse. story.js. */
  DADOS: 'dados',
  /** Traje y rifle puestos: se puede salir por el garaje. story.js; también
   *  gatea el warp de la calle (needsFlag en maps/garage.js). */
  LISTO_PARA_SALIR: 'listo_para_salir',
  /** Juan ya salió a la calle. Lo pone story.js (enterMap street). */
  AFUERA: 'afuera',

  // --- final de la demo / roguelike
  /** Polsky ya contó lo que sabía y se fue. Lo pone story.js (playPolsky). */
  POLSKY_MUERTO: 'polsky_muerto',
  /** Alias viejo de POLSKY_MUERTO: oculta a Polsky del altillo. Lo pone
   *  story.js (playPolsky). Se conserva por compatibilidad. */
  POLSKY_LEFT: 'polskyLeft',
  /** La partida está en la arena/calle de combate. La pone main.startArena y
   *  story.js; BASE_FLAGS la apaga. */
  ARENA: 'arena',
  /** Modo casa-base (Continuar): la historia no repite cinemáticas y aparecen
   *  las estaciones del taller. La pone main.applyBaseState. */
  BASE: 'base',

  // --- aberturas cerradas de la casa (historia §6.2, "casa sellada")
  /** La ventana de Martita está cerrada. La pone world/interact.js
   *  (closeWindow) o el sello con tiras. */
  CLOSED_WINDOW_MARTITA: 'closed_window_martita',
  /** La ventana del living está cerrada. La pone story.js (CLOSE_KEYS). */
  CLOSED_WINDOW_LIVING: 'closed_window_living',
  /** La puerta del hall está cerrada. La pone story.js (CLOSE_KEYS y
   *  playPolsky). */
  CLOSED_HALL_DOOR: 'closed_hall_door',
  /** La puerta del garaje está cerrada. La pone world/interact.js
   *  (closeWindow) y story.js (CLOSE_KEYS). */
  CLOSED_GARAGE_DOOR: 'closed_garage_door',

  // --- aparatos que se prenden y apagan (world/actions.js, toggleDevice)
  /** La radio está prendida. La togglea el mapa (house/attic). */
  RADIO_ON: 'radio_on',
  /** La vela del altillo está apagada (invertida: true = apagada). */
  CANDLE_APAGADA: 'candle_apagada',
});

// ----------------------------------------------------------- claves dinámicas

/** Objetos de la casa que se pueden cerrar con "closed_<id>". */
export const CLOSABLE_IDS = Object.freeze([
  'window_martita', 'window_living', 'hall_door', 'garage_door',
]);

export const CLOSED_PREFIX = 'closed_';
export const NPC_GONE_PREFIX = 'npc_gone_';

/** Clave de bandera para una abertura cerrada ("closed_window_martita"). */
export function closedFlag(objectId) {
  return CLOSED_PREFIX + objectId;
}

/** Clave de bandera para un NPC que ya no está en el mapa. */
export function npcGoneFlag(npcId) {
  return NPC_GONE_PREFIX + npcId;
}

const FLAG_VALUES = new Set(Object.values(FLAG));

/** ¿La clave es una bandera declarada (o de una familia dinámica válida)? */
export function isKnownFlag(key) {
  if (typeof key !== 'string' || key === '') return false;
  if (FLAG_VALUES.has(key)) return true;
  if (key.startsWith(CLOSED_PREFIX)) {
    return CLOSABLE_IDS.includes(key.slice(CLOSED_PREFIX.length));
  }
  // Cualquier NPC puede desaparecer; el id no se puede enumerar sin mirar el
  // mapa, así que se acepta el prefijo (documentado).
  return key.startsWith(NPC_GONE_PREFIX) && key.length > NPC_GONE_PREFIX.length;
}

// En Vite: avisa solo en desarrollo. Sin entorno (node --test): siempre avisa.
function guardEnabled() {
  const env = import.meta.env;
  return env ? Boolean(env.DEV) : true;
}

/**
 * Envuelve el objeto de banderas para avisar (console.warn) al leer, escribir,
 * consultar o borrar una clave desconocida. En producción devuelve el mismo
 * objeto, sin Proxy. Una bandera nueva se declara en FLAG.
 */
export function guardFlags(flags) {
  if (!flags || typeof flags !== 'object') return flags;
  if (!guardEnabled()) return flags;
  // Claves que consultan JSON.stringify, await, inspect, etc.: no son banderas.
  const META = new Set(['toJSON', 'then', 'constructor', 'valueOf', 'toString', 'inspect']);
  const warn = (op, key) => {
    if (META.has(key)) return;
    console.warn(`[flags] bandera desconocida "${String(key)}" (${op}). Declarala en src/data/flags.js (FLAG).`);
  };
  return new Proxy(flags, {
    get(target, key, receiver) {
      if (typeof key === 'string' && !isKnownFlag(key)) warn('lectura', key);
      return Reflect.get(target, key, receiver);
    },
    set(target, key, value) {
      if (typeof key === 'string' && !isKnownFlag(key)) warn('escritura', key);
      return Reflect.set(target, key, value);
    },
    has(target, key) {
      if (typeof key === 'string' && !isKnownFlag(key)) warn('consulta', key);
      return Reflect.has(target, key);
    },
    deleteProperty(target, key) {
      if (typeof key === 'string' && !isKnownFlag(key)) warn('borrado', key);
      return Reflect.deleteProperty(target, key);
    },
  });
}
