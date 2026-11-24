// Las cuatro estaciones de mejora del garaje y sus efectos sobre la salida.
// Datos puros: nada acá muta un save ni los propios datos.

export const STATIONS = ['favalli', 'elena', 'lucas', 'luz'];

export const UPGRADES = {
  favalli: [
    { id: 'cerrojo', name: 'Cerrojo aceitado', desc: 'Dispara más rápido: un tiro cada 0,45 s en vez de 0,55.', cost: { chatarra: 4 } },
    { id: 'cargador', name: 'Cargador de ocho', desc: 'Ocho balas por cargador en vez de cinco.', cost: { chatarra: 6, pieza: 1 } },
    { id: 'punta', name: 'Punta de élitro', desc: 'La bala atraviesa a dos cascarudos sin perder fuerza.', cost: { pieza: 3, chatarra: 2 } },
  ],
  elena: [
    { id: 'capa', name: 'Doble capa', desc: 'El traje aguanta una mordida más (cuatro parches).', cost: { goma: 3 } },
    { id: 'remiendo', name: 'Remiendo rápido', desc: 'Ponerse un parche tarda la mitad.', cost: { goma: 2, chatarra: 1 } },
    { id: 'hombreras', name: 'Hombreras de élitro', desc: 'La primera mordida de cada ronda no rompe nada.', cost: { pieza: 2, goma: 2 } },
  ],
  lucas: [
    { id: 'antena', name: 'Antena en el techo', desc: 'Lucas agarra rumores de esta noche. Algunos son ciertos.', cost: { chatarra: 3 } },
    { id: 'valvulas', name: 'Válvulas nuevas', desc: 'Más frecuencias: sobrevivientes que piden ayuda en la salida.', cost: { chatarra: 2, pieza: 1 } },
    { id: 'frecuencia', name: 'La frecuencia de ellos', desc: 'Una voz que cuenta números. Avisa antes de algo grande.', cost: { pieza: 3 } },
  ],
  luz: [
    { id: 'bengala', name: 'Bengala', desc: 'Una por salida: los cascarudos se frenan en su luz.', cost: { nafta: 2 } },
    { id: 'molotov', name: 'Botella de nafta', desc: 'Una por salida: fuego en el piso unos segundos.', cost: { nafta: 2, chatarra: 1 } },
    { id: 'farol', name: 'Farol de mano', desc: 'Luz alrededor de Juan: de noche se ve más lejos.', cost: { nafta: 3, chatarra: 2 } },
  ],
};

export const STATION_INFO = {
  favalli: { who: 'Favalli', what: 'El rifle' },
  elena: { who: 'Elena', what: 'El traje' },
  lucas: { who: 'Lucas', what: 'La radio' },
  luz: { who: 'Electrógeno', what: 'Luz y fuego' },
};

/** Nivel comprado en una estación (0..3), defensivo. */
function levelOf(save, station) {
  const n = save?.mejoras?.[station];
  return Number.isInteger(n) && n > 0 ? Math.min(n, 3) : 0;
}

/** La próxima mejora de la estación, o null si ya está completa o no existe. */
export function nextUpgrade(save, station) {
  const path = UPGRADES[station];
  if (!path) return null;
  const level = levelOf(save, station);
  return level >= path.length ? null : path[level];
}

/** Estado de una mejora del camino: 'hecho', 'disponible' o 'bloqueado'. */
export function upgradeState(save, station, index) {
  const path = UPGRADES[station];
  if (!path || !Number.isInteger(index) || index < 0 || index >= path.length) return 'bloqueado';
  const level = levelOf(save, station);
  if (index < level) return 'hecho';
  if (index === level) return 'disponible';
  return 'bloqueado';
}

/** ¿Alcanza el botín guardado para pagar el costo? */
export function canAfford(save, cost) {
  if (!cost || typeof cost !== 'object') return true;
  return Object.entries(cost).every(([key, amount]) => (save?.botin?.[key] ?? 0) >= amount);
}

/** Compra la próxima mejora de la estación. Devuelve { ok, save, reason }. */
export function buyUpgrade(save, station) {
  const path = UPGRADES[station];
  const level = levelOf(save, station);
  if (!path || level >= path.length) return { ok: false, save, reason: 'completo' };
  const upgrade = path[level];
  if (!canAfford(save, upgrade.cost)) return { ok: false, save, reason: 'falta' };

  const botin = { ...(save?.botin ?? {}) };
  for (const [key, amount] of Object.entries(upgrade.cost)) {
    botin[key] = (botin[key] ?? 0) - amount;
  }
  return {
    ok: true,
    reason: null,
    save: {
      ...save,
      botin,
      mejoras: { ...(save?.mejoras ?? {}), [station]: level + 1 },
    },
  };
}

/** Todo lo que cambia en la salida según las mejoras compradas. */
export function effects(save) {
  const favalli = levelOf(save, 'favalli');
  const elena = levelOf(save, 'elena');
  const lucas = levelOf(save, 'lucas');
  const luz = levelOf(save, 'luz');
  return {
    fireRate: favalli >= 1 ? 0.45 : 0.55,
    magSize: favalli >= 2 ? 8 : 5,
    pierceDamage: favalli >= 3 ? 1 : 0.5,
    integrityMax: elena >= 1 ? 4 : 3,
    patchTime: elena >= 2 ? 0.75 : 1.5,
    firstBiteFree: elena >= 3,
    rumor: lucas >= 1,
    sobreviviente: lucas >= 2,
    frecuencia: lucas >= 3,
    bengalas: luz >= 1 ? 1 : 0,
    molotovs: luz >= 2 ? 1 : 0,
    farol: luz >= 3,
  };
}
