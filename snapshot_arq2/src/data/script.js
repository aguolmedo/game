// Todos los textos de la historia (diseño §6.4): cartuchos, diálogos y viñetas.
// Las escenas y src/story.js leen de acá; nada de texto hardcodeado.
// Líneas entre comillas = paráfrasis en la voz del cómic (Oesterheld / Solano
// López, 1957), no transcripción. Retratos: ids de src/data/portraits.js.
import { getItem } from '../items.js';
import { FLAG } from './flags.js';
import { missingFor, RECIPES } from '../recipes.js';

const SUIT = RECIPES[0];

export function entry(speaker, portrait, lines) {
  return { speaker, portrait, lines };
}

// ------------------------------------------------------------- cartuchos
export const CAPTIONS = {
  intro: 'Era una noche fría de 1957, en Vicente López. Los cuatro estábamos en el altillo, jugando al truco, como tantas veces.',
  martitaRoom: 'Me precipité al otro cuarto, el de Martita. El corazón se me estrujó.',
  outside: 'Afuera, la nieve brillaba y el silencio era total.',
  streetMid: 'Entonces lo oí. Un roce de patas sobre la nieve, como de muchas uñas.',
};

// ------------------------------------------------- diálogos de la historia
export const DIALOGS = {
  intro_favalli: entry('Favalli', 'favalli', [
    '¿Quién ceba, che? Esta ronda te toca a vos, Juan.',
  ]),

  juan_no_abras: entry('Juan', 'juan', ['¡No abras, Lucas!']),
  lucas_porque: entry('Lucas', 'lucas', ['Pero… ¿por qué?']),
  favalli_aire: entry('Favalli', 'favalli', [
    'Hay algo en el aire. ¿No ves que parece estar nevando?',
  ]),
  favalli_radiactiva: entry('Favalli', 'favalli', [
    'Debe ser la sustancia radiactiva que dijo la radio. ¡Hay que cerrar todo!',
  ]),

  elena_que_pasa: entry('Elena', 'elena', ['¿Qué pasa, Juan? ¿Qué pasa?']),
  juan_explicare: entry('Juan', 'juan', ['Ya te explicaré… ¡No abras ninguna ventana!']),

  favalli_idea: entry('Favalli', 'favalli', [
    'Si queremos sobrevivir hay que salir: aire, agua, comida, armas.',
    'Un traje hermético, algo así como un traje de buzo. Los copos matan al tocar la piel.',
    'No hace falta oxígeno: alcanza con un filtro que deje afuera las partículas.',
  ]),

  lucas_extractor: entry('Lucas', 'lucas', ['¿Y si el extractor no aguanta?']),
  favalli_resuelto: entry('Favalli', 'favalli', ['Ya está resuelto, Lucas.']),
};

// ------------------------------------------------------------- viñetas
// spec = { layout, panels:[{type:'caption'|'portrait'|'map'|'color', ...}] }
export const COMICS = {
  truco: {
    layout: '3+3',
    panels: [
      { type: 'caption', text: 'Separados del mundo, como si el chalecito fuera una isla.' },
      { type: 'portrait', portrait: 'juan', caption: 'Tres del mismo palo… Ahora sí que se enoja Favalli.' },
      { type: 'portrait', portrait: 'favalli', balloon: '¡Te dije que cantamos falta envido!' },
      { type: 'map', caption: 'Por la ventana, las luces del barrio. Un colectivo pasa a lo lejos.' },
      { type: 'portrait', portrait: 'lucas', balloon: 'Después de esta mano se acabó. Lo digo en serio.' },
      { type: 'color', color: '#2a2236', caption: 'Ninguno sabía que era la última mano tranquila.' },
    ],
  },

  choque: {
    layout: '3+3',
    panels: [
      { type: 'caption', text: 'Un ruido violento, que vino de la calle, me interrumpió.' },
      { type: 'portrait', portrait: 'juan', balloon: 'Me pareció oír un grito.' },
      { type: 'portrait', portrait: 'lucas', balloon: '¿Qué fue? ¿Un choque?' },
      { type: 'color', color: '#0b0a12', caption: 'La lámpara parpadeó dos veces y se apagó.' },
      { type: 'portrait', portrait: 'polsky', balloon: '¡Cállense! ¡Escuchen!' },
      { type: 'caption', text: 'Aquel silencio total… Ni el tránsito de la avenida. La radio estaba muda.' },
    ],
  },

  polsky: {
    layout: '3+3',
    panels: [
      { type: 'portrait', portrait: 'polsky', balloon: 'Tengo que ir a casa… Edith y los chicos están solos.' },
      { type: 'portrait', portrait: 'favalli', balloon: '¡No salgas! ¡No se puede salir!' },
      { type: 'portrait', portrait: 'polsky', balloon: '¡Déjame!' },
      { type: 'map', caption: 'Cruzó el jardín bajo la nieve, con el saco sobre la cabeza.' },
      { type: 'map', caption: 'Se dobló en la calle. Cayó boca abajo.' },
      { type: 'caption', text: 'No llegó a cruzar la calle.' },
    ],
  },

  ramirez: {
    layout: '3+3',
    panels: [
      { type: 'caption', text: 'En la casa de los Ramírez ardía una vela. La única luz del barrio.' },
      { type: 'portrait', portrait: 'favalli', balloon: 'La casa de los Ramírez es hermética. Ni un copo encontró por dónde colarse.' },
      { type: 'portrait', portrait: 'elena', balloon: '¡Juan! ¡Va a abrir la ventana!' },
      { type: 'map', caption: 'Ramírez abrió la ventana y levantó el candelabro.' },
      { type: 'map', caption: 'La vela se apagó. Quedó caído sobre el alféizar.' },
      { type: 'caption', text: 'Murió sin un grito. Desde acá todo parecía cine mudo.' },
    ],
  },

  dados: {
    layout: '3+3',
    panels: [
      { type: 'portrait', portrait: 'favalli', balloon: 'Para no seguir peleando: un par de dados. El que saca más, sale primero.' },
      { type: 'portrait', portrait: 'favalli', balloon: 'Un dos.' },
      { type: 'portrait', portrait: 'lucas', balloon: 'Un dos.' },
      { type: 'portrait', portrait: 'juan', balloon: 'Un seis.' },
      { type: 'portrait', portrait: 'elena', caption: 'Elena se abrazó a Juan y escondió la cara en su hombro.' },
      { type: 'caption', text: 'Por dentro temblaba.' },
    ],
  },

  martitaTarde: {
    layout: '2+2',
    panels: [
      { type: 'caption', text: 'El viento me ganó de mano. La ventana quedó abierta.' },
      { type: 'map', caption: 'Elena ya había sacado a Martita del cuarto.' },
      { type: 'portrait', portrait: 'martita', balloon: '¡Papito! ¿Qué pasa?' },
      { type: 'caption', text: 'La nena estaba a salvo. Esa vez.' },
    ],
  },

  cascudos: {
    layout: '2+2',
    panels: [
      { type: 'caption', text: 'Entonces lo oí. Un roce de patas sobre la nieve.' },
      { type: 'map', caption: 'De los médanos salieron las primeras sombras.' },
      { type: 'color', color: '#141a2e', caption: 'Muchas. Demasiadas.' },
      { type: 'caption', text: 'Cargué el rifle y esperé.' },
    ],
  },
};

// ------------------------------------------------------------- objetos
export const NEUTRAL = 'No hay nada que decir ahora.';

function missingNames(game) {
  return missingFor(game.inventory || [], SUIT).map((id) => getItem(id).name);
}

function look(lines) {
  return () => entry('Juan', 'juan', lines);
}

// Cada entrada es una función (game) => entry: así los textos cambian con las
// banderas sin que las escenas sepan nada de la historia.
export const TALK = {
  // ---------------------------------------------------------- personajes
  favalli(game) {
    const flags = game.flags || {};
    if (game.hasSuit || game.crafted || flags[FLAG.LISTO_PARA_SALIR]) {
      return entry('Favalli', 'favalli', [
        'Lo primero es ir a la armería. Después la comida.',
        'Cuando salgas, cerrá la puerta y no mires atrás.',
      ]);
    }
    if (flags[FLAG.DADOS]) {
      return entry('Favalli', 'favalli', [
        'Te tocó a vos. Así lo quisieron los dados.',
        'No te saques el traje ni para dormir.',
      ]);
    }
    if (flags[FLAG.IDEA_TRAJE]) {
      const missing = missingNames(game);
      if (missing.length) {
        return entry('Favalli', 'favalli', [
          'No hay tiempo que perder. Revisá el altillo, la cocina y el garaje.',
          `Todavía falta: ${missing.join(', ')}.`,
        ]);
      }
      return entry('Favalli', 'favalli', [
        'Ya está todo. Armá el traje en el banco del garaje.',
      ]);
    }
    if (flags[FLAG.APAGON]) {
      return entry('Favalli', 'favalli', flags[FLAG.POLSKY_MUERTO]
        ? [
          'Hay que cerrar todo. Ni una partícula puede entrar.',
          'Polsky salió a buscar a Edith y los chicos…',
          'No llegó a cruzar la calle.',
        ]
        : [
          'Hay que cerrar todo. Ni una partícula puede entrar.',
          'Fijate que no quede ni una ventana abierta.',
        ]);
    }
    return entry('Favalli', 'favalli', [
      '¡Estás en Babia, Juan! ¡Te dije que cantamos falta envido!',
      'Dejá las cartas y escuchá la radio.',
    ]);
  },

  lucas(game) {
    const flags = game.flags || {};
    if (game.hasSuit || game.crafted) {
      return entry('Lucas', 'lucas', [
        'El menos necesario de los tres soy yo… dejame ir a mí.',
        'Pero te tocó a vos. Volvé, Juan.',
      ]);
    }
    if (flags[FLAG.APAGON]) {
      return entry('Lucas', 'lucas', [
        'Afuera no pasa un alma. La calle quedó muda.',
        'Y esa nieve brilla. No es una nevada común.',
      ]);
    }
    return entry('Lucas', 'lucas', [
      'Doce años vendí todos los días al banco. Y ahora, esto.',
      'Yo no sé jugar al truco como ustedes.',
    ]);
  },

  polsky(game) {
    const flags = game.flags || {};
    if (flags[FLAG.APAGON]) {
      return entry('Polsky', 'polsky', [
        'Tengo que ir a casa. Edith y los chicos están solos.',
        'No me digan nada. Ya lo decidí.',
      ]);
    }
    return entry('Polsky', 'polsky', [
      'Un violín a medio hacer me espera abajo.',
      'Después de esta mano me voy a dormir.',
    ]);
  },

  elena(game) {
    const flags = game.flags || {};
    if (flags[FLAG.DADOS] || flags[FLAG.LISTO_PARA_SALIR]) {
      return entry('Elena', 'elena', [
        'No me diste un beso, Juan…',
        'Volvé. Martita te va a estar esperando.',
      ]);
    }
    if (flags[FLAG.IDEA_TRAJE]) {
      return entry('Elena', 'elena', [
        '¿Y cómo vas a respirar con eso?',
        'Favalli dice que el filtro del casco alcanza.',
        'Cuidate, Juan.',
      ]);
    }
    if (flags[FLAG.CASA_SELLADA]) {
      return entry('Elena', 'elena', [
        '¡Juan! ¡Va a abrir la ventana!',
        'La casa de los Ramírez tenía una vela encendida.',
      ]);
    }
    if (flags[FLAG.APAGON]) {
      return entry('Elena', 'elena', [
        '¿Qué pasa, Juan? ¿Qué pasa?',
        'Martita se asustó con el ruido.',
      ]);
    }
    return entry('Elena', 'elena', [
      'Quedate quieto, Juan. Martita recién se durmió.',
      'Nadie abre nada. Ni una ventana.',
    ]);
  },

  martita(game) {
    const flags = game.flags || {};
    if (flags[FLAG.CASA_SELLADA]) {
      return entry('Martita', 'martita', [
        '¡Hay una luz en la casa de enfrente!',
        '¿Ves, papito? Una vela.',
      ]);
    }
    if (flags[FLAG.APAGON]) {
      return entry('Martita', 'martita', [
        '¿Se apagó la luz para siempre?',
        'No me gusta la nieve que brilla.',
      ]);
    }
    return entry('Martita', 'martita', [
      '¡No te vayas, papito!',
      '¿Vas a volver antes de que se apague la lámpara?',
    ]);
  },

  // ---------------------------------------------------------- altillo
  radio(game) {
    const flags = game.flags || {};
    return flags[FLAG.APAGON]
      ? entry('Radio', null, ['Muda.', 'Ni siquiera la interferencia. Nada.'])
      : entry('Radio', null, [
        'La radio pasa de una emisora a otra.',
        'En la onda corta, un locutor en inglés habla de una nevada extraña, al norte de Punta del Este.',
        'Después, silencio.',
      ]);
  },
  window(game) {
    const flags = game.flags || {};
    return flags[FLAG.APAGON]
      ? entry('Juan', 'juan', [
        'La calle está blanca y brilla sola.',
        'No se oye ni un motor.',
      ])
      : entry('Juan', 'juan', [
        'La calle está blanca. Los copos se pegan al vidrio y brillan.',
        'No se derriten.',
      ]);
  },
  table: look([
    'Tengo treinta y tres para el envido, y soy mano…',
    'Sobre el paño, los naipes y la plata del truco.',
  ]),
  chair(game) {
    const flags = game.flags || {};
    return flags[FLAG.MATE_TUTORIAL]
      ? entry('Juan', 'juan', ['Me siento y reparto. La mano que viene es la última tranquila.'])
      : entry('Juan', 'juan', ['Todavía no. Primero, un mate.']);
  },
  shelf: look([
    'Frascos, libros y el paquete de yerba.',
    'Polsky guarda acá sus herramientas de violín.',
  ]),
  speaker: look(['El parlante negro del altillo.']),
  coat: look(['Los abrigos de la casa, todavía húmedos de la calle.']),
  violin: look(['Un violín a medio hacer. Madera, barniz y paciencia.']),
  worktable: look([
    'La tela engomada, a medio cortar con la tijera de Elena.',
    'De acá sale el traje.',
  ]),
  workbench: look([
    'El calentador a alcohol, la pava y la tela.',
    'Con esto se puede calentar agua sin electricidad.',
  ]),
  candle: look(['La vela que prendió Favalli. Es la única luz del altillo.']),

  // ---------------------------------------------------------- planta baja
  sofa: look(['El sillón del living. Todavía guarda el calor de alguien.']),
  living_table: look([
    'La lámpara de aceite sigue encendida.',
    'Martita pregunta si su amiguita Susanita estará igual.',
  ]),
  stove: look([
    'La cocina a gas anda sin electricidad.',
    'Hay arroz, latas y la torta de la heladera.',
  ]),
  kitchen_table: look([
    'La mesa de la cocina, entre latas y la lista de Elena.',
  ]),
  wardrobe: look(['El ropero. Adentro hay olor a naftalina.']),
  bed: look(['La cama de Juan y Elena, todavía tendida.']),
  nightstand: look(['La mesa de luz. El secador de Elena y el velador.']),
  crib: look(['La cuna de Martita. El osito de siempre.']),
  toy_horse: look(['El caballito de juguete. Martita no lo suelta ni para dormir.']),
  kid_drawing: look([
    'El dibujo de Martita, con crayón: una casa y la nieve.',
    'Hay un nene con un traje raro, del otro lado de la puerta.',
  ]),
  wedding_photo: look([
    'La foto de casamiento de Juan y Elena.',
    'Era verano y no había nieve en ninguna parte.',
  ]),
  sink: look(['La pileta de la cocina. El agua todavía sale, aunque sea un hilo.']),
  wall_clock(game) {
    const flags = game.flags || {};
    return entry('Juan', 'juan', [flags[FLAG.APAGON] ? 'Las once y diez. El reloj se paró.' : 'Las once y diez.']);
  },
  hall_door: look([
    'La puerta de calle. Está cerrada con llave.',
    'Por acá no se sale.',
  ]),
  door_home: look(['La puerta que da a la casa.']),
  stairs: look(['La escalera baja a la planta baja.', 'Abajo están Elena y Martita.']),

  // ---------------------------------------------------------- garaje
  garage_door: look(['El portón del garaje. Es la única salida posible.']),
  extractor(game) {
    const flags = game.flags || {};
    return entry('Juan', 'juan', flags[FLAG.EXTRACTOR_OK]
      ? ['El extractor de la pared ya tiene el secador de Elena instalado.']
      : ['El extractor de la pared. Le falta algo que sople el aire hacia afuera.']);
  },
  generator(game) {
    const flags = game.flags || {};
    return entry('Juan', 'juan', flags[FLAG.ELECTROGENO_ON]
      ? ['El electrógeno ronronea. La lamparita titila.']
      : ['El electrógeno de Favalli, seco. Le falta nafta.']);
  },
  bidon: look(['Un bidón de nafta para el electrógeno.']),
  bench_suit(game) {
    const flags = game.flags || {};
    return entry('Juan', 'juan', flags[FLAG.TRAJE_FABRICADO]
      ? ['El banco del garaje. El traje ya está listo.']
      : ['El banco donde se arma el traje.', 'Con los materiales a mano, acá se cose todo.']);
  },
  suit_hanging: look(['El traje colgado. Todavía es un montón de tela y goma.']),

  // ---------------------------------------------------------- calle
  polsky_body: () => entry('Juan', 'juan_suit', [
    'Sí, allí estaba Polsky, mi amigo…',
    'Apenas duró unos segundos en la nieve.',
    'No mires más y ocupate de lo que te encargaron.',
  ]),
  car: () => entry('Juan', 'juan_suit', ['Un auto tapado de nieve. Adentro no se mueve nadie.']),
  bus: () => entry('Juan', 'juan_suit', ['El colectivo quedó inclinado contra el poste. Nadie al volante.']),
  almacen: () => entry('Juan', 'juan_suit', [
    'El almacén, con la vidriera rota y un cliente caído sobre la mesa.',
  ]),
  ferreteria: () => entry('Juan', 'juan_suit', [
    'La ferretería. Acá están las armas que pidió Favalli.',
    'Un paso más y esta salida habrá valido la pena.',
  ]),
  caja_municiones: () => entry('Juan', 'juan_suit', [
    'La caja de municiones de la ferretería.',
    'Se paga con puntos, no con plata.',
  ]),
};
