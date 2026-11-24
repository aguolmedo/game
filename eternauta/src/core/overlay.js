/**
 * Overlay único: lo que tapa/congela el mundo en este momento.
 * null | 'pause' | 'chest' | 'taller' | 'equip' | 'transition'.
 * Los paneles necesitan que no haya nada abierto; 'transition' y 'equip'
 * pueden cerrar un panel (el router los esconde al cambiar de escena).
 */
export const OVERLAYS = ['pause', 'chest', 'taller', 'equip', 'transition'];
const PANELS = ['pause', 'chest', 'taller'];

/** ¿Se puede pasar de `from` a `to`? (to = null siempre se puede.) */
export function canSetOverlay(from, to) {
  if (to === null) return true;
  if (!OVERLAYS.includes(to)) return false;
  if (from === null) return true;
  if (from === to) return false;
  // Un fundido o el traje pueden cerrar un panel, pero no pisarse entre sí.
  return (to === 'transition' || to === 'equip') && PANELS.includes(from);
}

/**
 * Instala game.overlay / setOverlay / clearOverlay y los derivados de
 * compatibilidad (chestOpen, tallerOpen, transition, equipAnim) como accesores.
 */
export function installOverlay(game) {
  let name = null;
  let data = null;
  const set = (next, payload = null) => {
    if (!canSetOverlay(name, next)) return false;
    name = next;
    data = next ? payload : null;
    return true;
  };
  game.setOverlay = set;
  /** Limpia solo si el overlay actual es `only` (o cualquiera si se omite). */
  game.clearOverlay = (only) => {
    if (only && name !== only) return false;
    return set(null);
  };
  const flag = (key) => ({
    get: () => name === key,
    set: (v) => { if (v) set(key); else game.clearOverlay(key); },
    enumerable: true,
  });
  const slot = (key) => ({
    get: () => (name === key ? data : null),
    set: (v) => { if (v) { game.clearOverlay(key); set(key, v); } else game.clearOverlay(key); },
    enumerable: true,
  });
  Object.defineProperties(game, {
    overlay: { get: () => name, enumerable: true },
    chestOpen: flag('chest'),
    tallerOpen: flag('taller'),
    transition: slot('transition'),
    equipAnim: slot('equip'),
  });
  return game;
}
