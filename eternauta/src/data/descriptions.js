// Líneas de "Mirar" para los objetos decorativos que se apoyan en superficies.
// Devuelven texto en castellano rioplatense; algunas dependen de banderas
// (la radio y el reloj cambian después del apagón).

export const LOOK_LINES = {
  naipes: 'Tres del mismo palo… y Favalli ni se enteró.',
  anotador: 'Vamos 14 a 11. Los porotos están de testigos.',
  cenicero: 'El de Favalli. Nunca para.',
  sifon: 'El sifón de soda de siempre. Se usa después de la partida, no antes.',
  vino: 'Vino de la casa. Queda media botella para el que gane.',
  botella: 'Vino de la casa. Queda media botella para el que gane.',
  vaso: 'Un vaso con un dedo de vino, para acompañar.',
  latas: 'Latas de conserva. La despensa de Elena nunca falla.',
  lata_roja: 'Latas de conserva. La despensa de Elena nunca falla.',
  frascos: 'Frasquitos de conserva, con la fecha escrita a lápiz.',
  frasco: 'Un frasco de conserva, con la fecha escrita a lápiz.',
  pan: 'Pan del día. Todavía está tierno.',
  libros: 'Manuales de electricidad y una novela con la hoja doblada.',
  book: 'Manuales de electricidad y una novela con la hoja doblada.',
  tijera: 'La tijera de Elena. Tiene la hoja un poco trabada.',
  calentador: 'El calentador a alcohol. Calienta sin pedir electricidad.',
  lampara_aceite: 'La lámpara de aceite. Con esto se ve algo cuando no hay luz.',
  lista: 'La lista de Elena: agua, velas, nafta… y pan.',
  mate: 'El mate de siempre, con la bombilla mordida de tanto uso.',
  mate_vacio: 'El mate de siempre, con la bombilla mordida de tanto uso.',
  pava: 'La pava de chapa, con la base tiznada del calentador.',
  radio: 'Suena bajito, como si no quisiera molestar.',
  reloj: 'Las once y diez.',
  velador: 'El velador de la mesa de luz.',
  telefono: 'El teléfono no tiene tono. Ni siquiera el ruido de la línea.',
  retrato: 'Una foto de la familia en la playa. Otro verano.',
  piano: 'El piano de Elena. Nadie lo toca desde hace meses.',
  sillon: 'El sillón del living. Todavía guarda el calor de alguien.',
  sofa: 'El sillón del living. Todavía guarda el calor de alguien.',
  kid_drawing: 'El dibujo de Martita, con crayón: una casa y la nieve.',
  wedding_photo: 'La foto de casamiento de Juan y Elena.',
  sink: 'La pileta de la cocina.',
  stairs_up: 'La escalera rebatible que sube al altillo.',
};

/** Línea de (A) "Mirar" para un objeto; null si no tiene una propia. */
export function lookLine(objectId, flags = {}) {
  if (objectId === 'radio') {
    return flags && flags.apagon ? 'Muda.' : LOOK_LINES.radio;
  }
  if (objectId === 'reloj') {
    return flags && flags.apagon ? 'Las once y diez. Se paró.' : LOOK_LINES.reloj;
  }
  return LOOK_LINES[objectId] || null;
}
