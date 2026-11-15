// Objetos iniciales apoyados en muebles (§6.3), por mapa.
//
// Cada entrada de `items` usa `objectId` + `slot` (el índice del slot que el
// mapa declara en `surface.slots`). `sprite` es opcional y solo cambia el
// frame con que se dibuja ese objeto (por ejemplo, tres naipes distintos).
//
// `containers` completa los contenedores que el mapa no traiga declarados:
// objetos con `container.items` en el mapa tienen prioridad (ver
// applyContainers() en src/surfaces.js).

export const INITIAL_ITEMS = {
  attic: {
    items: [
      // Mesa de truco: la partida servida.
      { objectId: 'table', slot: 0, itemId: 'naipes', sprite: 'naipe_espada' },
      { objectId: 'table', slot: 1, itemId: 'naipes', sprite: 'naipe_oro' },
      { objectId: 'table', slot: 2, itemId: 'naipes', sprite: 'naipe_basto_back' },
      { objectId: 'table', slot: 3, itemId: 'anotador' },
      { objectId: 'table', slot: 4, itemId: 'sifon' },
      { objectId: 'table', slot: 5, itemId: 'vino' },
      { objectId: 'table', slot: 6, itemId: 'vaso' },
      { objectId: 'table', slot: 7, itemId: 'vaso' },
      { objectId: 'table', slot: 8, itemId: 'cenicero' },
      { objectId: 'table', slot: 9, itemId: 'mate_vacio' },

      // Estante izquierdo.
      { objectId: 'shelf_left', slot: 1, itemId: 'libros' },
      { objectId: 'shelf_left', slot: 2, itemId: 'frascos' },

      // Banco del laboratorio: estación de calentar y tela a medio cortar.
      { objectId: 'workbench', slot: 0, itemId: 'calentador' },
      { objectId: 'workbench', slot: 1, itemId: 'pava_fria' },
      { objectId: 'workbench', slot: 2, itemId: 'tela' },
      { objectId: 'workbench', slot: 3, itemId: 'tijera' },
      { objectId: 'workbench', slot: 4, itemId: 'yerba' },   // junto a la pava: todo lo del mate a mano
    ],
    containers: {
      // Cajón de herramientas.
      crate: [{ id: 'tiras', n: 3 }],
    },
  },

  house: {
    items: [
      // Mesa de la cocina.
      { objectId: 'kitchen_table', slot: 0, itemId: 'latas' },
      { objectId: 'kitchen_table', slot: 1, itemId: 'frascos' },
      { objectId: 'kitchen_table', slot: 2, itemId: 'lata' },
      { objectId: 'kitchen_table', slot: 3, itemId: 'pan' },
      { objectId: 'kitchen_table', slot: 4, itemId: 'lista' },
      { objectId: 'kitchen_table', slot: 5, itemId: 'lampara_aceite' },

      // Hall: las botas al pie del perchero.
      { objectId: 'coat_stand', slot: 0, itemId: 'botas' },

      // Dormitorio: el secador de Elena en la mesa de luz.
      { objectId: 'nightstand', slot: 0, itemId: 'secador' },
    ],
    containers: {
      alacena: [{ id: 'guantes', n: 1 }],
      wardrobe: [{ id: 'rifle', n: 1 }, { id: 'balas', n: 30 }],
    },
  },

  garage: {
    items: [
      // Estante del garaje: el casco de buzo adaptado.
      { objectId: 'garage_shelf', slot: 0, itemId: 'casco' },
      // El bidón de nafta, listo para el electrógeno.
      { objectId: 'bidon', slot: 0, itemId: 'nafta' },
    ],
    containers: {},
  },
};

export const INITIAL_CONTAINERS = Object.fromEntries(
  Object.entries(INITIAL_ITEMS).map(([mapId, data]) => [mapId, data.containers || {}]),
);
