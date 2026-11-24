// Prioridad única de superpuestos: apoyado > NPC > mueble > warp.
export const PRIORITY = { warp: 0, object: 1, npc: 2, surface: 3 };

// Tipos con verbo propio: en estos, la línea de mirar se dice la primera vez
// que se usan (DIRECCION.md, "Tipos de objeto" regla 2). Las personas no:
// Hablar ya las cubre. Decorado, cosa, superficie y mueble liviano tampoco:
// su Hacer ya es Mirar.
export const OWN_VERB_TYPES = new Set([
  'container', 'device', 'passage', 'view', 'seat',
]);

export const NPC_NAMES = {
  favalli: 'Favalli', lucas: 'Lucas', polsky: 'Polsky',
  elena: 'Elena', martita: 'Martita',
};
