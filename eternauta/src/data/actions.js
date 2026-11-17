// Tabla de usos declarativa (R2): qué hace el ítem en la mano.
//
// `item` es un id (igualdad) o una RegExp. `on` describe el objetivo:
//   station: 'heat'            -> stationOf(target) tiene esa estación
//     free: true               -> además la estación está libre (sin pava)
//   objectId: 'generator'      -> el objeto del objetivo tiene ese id
//   window: 'openable', open   -> ventana cerrable y abierta/cerrada
//   kind: 'npc'                -> el objetivo es un NPC
//   idMatch: /bucket|pileta/i  -> el id del objetivo matchea
// Agregar un ítem nuevo = una fila acá, sin tocar world.js.

// Uso del item en la mano SOBRE un objetivo. Orden = prioridad.
export const ITEM_USES = [
  { id: 'heatPava', item: /^pava_(fria|caliente)$/, on: { station: 'heat', free: true }, label: 'Poner la pava al fuego' },
  { id: 'installExtractor', item: 'secador', on: { station: 'extractor' }, label: 'Instalar el secador' },
  { id: 'fuelGenerator', item: 'nafta', on: { objectId: 'generator' }, label: 'Cargar nafta' },
  { id: 'sealWindow', item: 'tiras', on: { window: 'openable', open: true }, label: 'Sellar la ventana' },
  { id: 'shareMate', item: 'mate_cebado', on: { kind: 'npc' }, label: 'Convidar mate' },
  { id: 'dumpMate', item: 'mate_lavado', on: { idMatch: /bucket|pileta|sink|balde/i }, label: 'Tirar la yerba' },
];

// Uso del item SOBRE UNO MISMO (sin objetivo). label puede ser función del estado.
export const SELF_USES = [
  { id: 'equipSuit', item: 'traje', label: (g) => (g.hasSuit ? 'Sacar traje' : 'Poner traje') },
  { id: 'toggleRifle', item: 'rifle', label: (g) => (g.hasRifle ? 'Guardar rifle' : 'Equipar rifle') },
  {
    id: 'mateSelf',
    item: /^mate_/,
    label: (g, id) => ({
      mate_vacio: 'Ponerle yerba',
      mate_yerba: 'Cebar',
      mate_cebado: 'Tomar mate',
      mate_lavado: 'Tirar la yerba',
    }[id] || 'Usar mate'),
  },
  { id: 'pavaSelf', item: /^pava_/, label: 'Mirar la pava' },
  { id: 'yerbaSelf', item: 'yerba', label: 'Usar yerba' },
];
