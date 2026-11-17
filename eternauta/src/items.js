// Items del juego: datos puros, sin DOM ni Three.js.
//
// `worldSprite` es el frame con el que el objeto se dibuja APOYADO en el mundo
// (props / interior2 / objects / items). SurfaceLayer lo resuelve con anySprite
// y, si el frame no está en los atlas de mapa, cae al icono de items.png.

export const ITEMS = {
  // ---- el mate (§5 / §7)
  mate_vacio: {
    id: 'mate_vacio',
    name: 'Mate',
    description: 'Un mate de calabaza, vacío. Hay que llenarlo de yerba.',
    kind: 'tool',
    worldSprite: 'mate',
  },
  mate_yerba: {
    id: 'mate_yerba',
    name: 'Mate con yerba',
    description: 'Mate con yerba. Falta el agua caliente.',
    kind: 'tool',
    worldSprite: 'mate',
  },
  mate_cebado: {
    id: 'mate_cebado',
    name: 'Mate cebado',
    description: 'Recién cebado. Todavía echa vapor.',
    kind: 'tool',
    worldSprite: 'mate',
  },
  mate_lavado: {
    id: 'mate_lavado',
    name: 'Mate lavado',
    description: 'La yerba ya no da más. Hay que tirarla.',
    kind: 'tool',
    worldSprite: 'mate',
  },
  yerba: {
    id: 'yerba',
    name: 'Paquete de yerba',
    description: 'Paquete de yerba. Alcanza para varias cebadas.',
    stack: true,
    kind: 'material',
    worldSprite: 'lata_verde',
  },
  pava_fria: {
    id: 'pava_fria',
    name: 'Pava (fría)',
    description: 'La pava de chapa, todavía fría.',
    kind: 'tool',
    worldSprite: 'pava',
  },
  pava_caliente: {
    id: 'pava_caliente',
    name: 'Pava (caliente)',
    description: 'El agua está justo: no quema, ceba bien.',
    kind: 'tool',
    worldSprite: 'pava',
  },
  pava_hervida: {
    id: 'pava_hervida',
    name: 'Pava (hervida)',
    description: 'Hirvió demasiado. Si cebás con esto, el mate se lava.',
    kind: 'tool',
    worldSprite: 'pava',
  },

  // ---- materiales del traje
  tela: {
    id: 'tela',
    name: 'Tela engomada',
    description: 'Un recorte de tela engomada, como la de los impermeables. No deja pasar el agua.',
    kind: 'material',
    worldSprite: 'tela',
  },
  guantes: {
    id: 'guantes',
    name: 'Guantes de goma',
    description: 'Guantes de goma gruesos, de los de trabajo.',
    kind: 'material',
    worldSprite: 'guantes',
  },
  botas: {
    id: 'botas',
    name: 'Botas de goma',
    description: 'Un par de botas altas para el barro y la nieve.',
    kind: 'material',
    worldSprite: 'botas',
  },
  casco: {
    id: 'casco',
    name: 'Casco de buzo',
    description: 'El casco de buzo de Juan, con visor de vidrio circular y filtro redondo.',
    kind: 'material',
    worldSprite: 'casco',
  },
  tiras: {
    id: 'tiras',
    name: 'Tiras de goma',
    description: 'Tiras y anillos de goma para sellar cuello, muñecas y tobillos.',
    stack: true,
    kind: 'material',
    worldSprite: 'rollo',
  },
  lata: {
    id: 'lata',
    name: 'Lata para el filtro',
    description: 'Una lata vacía, justo del tamaño del filtro del traje.',
    kind: 'material',
    worldSprite: 'lata_roja',
  },
  oxigeno: {
    id: 'oxigeno',
    name: 'Cilindro de oxígeno',
    description: 'Un cilindro chico de oxígeno. No dura mucho, pero alcanza para salir.',
    kind: 'material',
    worldSprite: 'oxigeno',
  },
  traje: {
    id: 'traje',
    name: 'Traje aislante',
    description: 'El traje hermético que armaron entre todos. Con esto se puede salir.',
    kind: 'suit',
    worldSprite: 'traje',
  },
  secador: {
    id: 'secador',
    name: 'Secador de Elena',
    description: 'El secador de pelo de Elena. Para el extractor del garaje viene justo.',
    kind: 'tool',
    worldSprite: 'valvula',
  },
  nafta: {
    id: 'nafta',
    name: 'Bidón de nafta',
    description: 'Un bidón de nafta para el electrógeno del garaje.',
    kind: 'material',
    worldSprite: 'bidon',
  },
  rifle: {
    id: 'rifle',
    name: 'Rifle',
    description: 'El rifle oscuro de la casa, con su cartuchera. Favalli pidió que no lo olvide.',
    kind: 'tool',
    worldSprite: 'rifle',
  },
  balas: {
    id: 'balas',
    name: 'Balas',
    description: 'Balas del rifle. Mejor tener de sobra.',
    stack: true,
    kind: 'material',
    worldSprite: 'cans',
  },

  // ---- decorativos que se pueden mirar (no se agarran)
  naipes: {
    id: 'naipes',
    name: 'Naipes',
    description: 'Naipes españoles, de los que vienen con el truco.',
    kind: 'decor',
    worldSprite: 'naipe_espada',
  },
  anotador: {
    id: 'anotador',
    name: 'Anotador',
    description: 'El anotador de los tantos, con los porotos al lado.',
    kind: 'decor',
    worldSprite: 'anotador',
  },
  sifon: {
    id: 'sifon',
    name: 'Sifón',
    description: 'Sifón de soda. El que gana el truco lo usa primero.',
    kind: 'decor',
    worldSprite: 'sifon',
  },
  vino: {
    id: 'vino',
    name: 'Vino',
    description: 'Botella de vino de la casa. Queda para después de la partida.',
    kind: 'decor',
    worldSprite: 'botella',
  },
  vaso: {
    id: 'vaso',
    name: 'Vaso',
    description: 'Vaso de vino. Un dedo, para acompañar.',
    kind: 'decor',
    worldSprite: 'vaso',
  },
  cenicero: {
    id: 'cenicero',
    name: 'Cenicero',
    description: 'Cenicero de Favalli. Nunca está vacío.',
    kind: 'decor',
    worldSprite: 'cenicero',
  },
  latas: {
    id: 'latas',
    name: 'Latas',
    description: 'Latas de conserva de la despensa de Elena.',
    kind: 'decor',
    worldSprite: 'cans',
  },
  frascos: {
    id: 'frascos',
    name: 'Frascos',
    description: 'Frascos de conserva con la fecha escrita a lápiz.',
    kind: 'decor',
    worldSprite: 'frasco',
  },
  pan: {
    id: 'pan',
    name: 'Pan',
    description: 'Pan del día. Todavía está tierno.',
    kind: 'decor',
    worldSprite: 'pan',
  },
  libros: {
    id: 'libros',
    name: 'Libros',
    description: 'Manuales de electricidad y una novela con la hoja doblada.',
    kind: 'decor',
    worldSprite: 'book',
  },
  tijera: {
    id: 'tijera',
    name: 'Tijera',
    description: 'La tijera de Elena. Corta la tela engomada como papel.',
    kind: 'decor',
    worldSprite: 'pinza',
  },
  calentador: {
    id: 'calentador',
    name: 'Calentador a alcohol',
    description: 'Calentador a alcohol. Calienta sin electricidad y no hace ruido.',
    kind: 'decor',
    worldSprite: 'oil_lamp',
  },
  lampara_aceite: {
    id: 'lampara_aceite',
    name: 'Lámpara de aceite',
    description: 'Lámpara de aceite. La luz de las noches de corte.',
    kind: 'decor',
    worldSprite: 'lampara_aceite',
  },
  lista: {
    id: 'lista',
    name: 'Lista de Elena',
    description: 'La lista de Elena: agua, velas, nafta y pan.',
    kind: 'decor',
    worldSprite: 'lista',
  },
  vela: {
    id: 'vela',
    name: 'Vela',
    description: 'Una vela corta. Con esto alcanza para ver la mesa.',
    kind: 'decor',
    worldSprite: 'oil_lamp',
  },
};

export const ITEM_ORDER = [
  'mate_vacio', 'mate_yerba', 'mate_cebado', 'mate_lavado', 'yerba',
  'pava_fria', 'pava_caliente', 'pava_hervida',
  'tela', 'guantes', 'botas', 'casco', 'tiras', 'lata', 'traje',
  'secador', 'nafta', 'rifle', 'balas',
  'naipes', 'anotador', 'sifon', 'vino', 'vaso', 'cenicero',
  'latas', 'frascos', 'pan', 'libros', 'tijera', 'calentador',
  'lampara_aceite', 'lista', 'vela',
];

/** ¿Este item se puede levantar del mundo? Los decorativos no. */
export function isGrabbable(id) {
  const item = ITEMS[id];
  return Boolean(item) && item.kind !== 'decor';
}

/** Devuelve el item pedido o un fallback mínimo con el mismo id. */
export function getItem(id) {
  return ITEMS[id] || {
    id,
    name: id,
    description: '',
    kind: 'material',
    worldSprite: id,
  };
}
