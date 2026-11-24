// Los ocho tipos de objeto de DIRECCION.md ("Tipos de objeto"): el tipo fija
// el verbo de Hacer y, con un ítem en la mano, manda la tabla ITEM_USES
// (src/data/actions.js). Agregar un objeto es una línea en el mapa: type y name.

export const OBJECT_TYPES = [
  'decor', 'thing', 'surface', 'container', 'device', 'person', 'passage', 'view', 'seat',
];

const VALID = new Set(OBJECT_TYPES);

export function isValidType(type) {
  return VALID.has(type);
}

// Verbo base por tipo (los aparatos usan el verbo de su estado). `seat` no
// lleva nombre ("Sentarse"), igual que la tabla de la dirección de arte.
export const TYPE_VERBS = {
  decor: 'Mirar',
  thing: 'Agarrar',
  surface: 'Mirar',
  container: 'Abrir',
  device: 'Mirar',
  person: 'Hablar',
  passage: 'Entrar',
  view: 'Asomarse',
  seat: 'Sentarse',
};
