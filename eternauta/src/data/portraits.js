// Mapeo id de personaje -> frame del atlas de retratos.
// dlg   = portraits_dlg.png (64x64, cuadro de diálogo)
// panel = portraits_panel.png (32x32, viñetas de historieta)
// Para sumar un calco nuevo alcanza con tocar esta tabla.

export const PORTRAITS = {
  juan: { dlg: 'juan', panel: 'juan' },
  juan_suit: { dlg: 'juan_suit', panel: 'juan_suit' },
  juan_rifle: { dlg: 'juan_rifle', panel: 'juan_suit' },
  juan_suit_rifle: { dlg: 'juan_rifle', panel: 'juan_suit' },
  favalli: { dlg: 'favalli', panel: 'favalli' },
  lucas: { dlg: 'lucas', panel: 'lucas' },
  polsky: { dlg: 'polsky', panel: 'polsky' },
  polsky_coat: { dlg: 'polsky', panel: 'polsky' },
  elena: { dlg: 'elena', panel: 'elena' },
  martita: { dlg: 'martita', panel: 'martita' },
};

/** Nombre del frame de retrato para un id ('dlg' o 'panel'), o null. */
export function portraitFor(id, kind = 'dlg') {
  if (typeof id === 'string') {
    const entry = PORTRAITS[id];
    if (entry) return kind === 'panel' ? entry.panel : entry.dlg;
    if (id in PORTRAITS) return id;
  }
  return null;
}

// Id de personaje -> bloque de chars2.png (hoja de personajes 16x32).
// El cuadro de diálogo recorta de ahí la cara + el torso en vez de portraits_dlg.
const SPRITE_HEADS = {
  juan: 'juan',
  juan_suit: 'juan_suit',
  juan_rifle: 'juan_suit_rifle',
  juan_suit_rifle: 'juan_suit_rifle',
  favalli: 'favalli',
  lucas: 'lucas',
  polsky: 'polsky',
  polsky_coat: 'polsky_coat',
  elena: 'elena',
  martita: 'martita',
};

/** Bloque de chars2 para un id de personaje, o null si no hay sprite. */
export function spriteHeadFor(id) {
  if (typeof id !== 'string') return null;
  return SPRITE_HEADS[id] || null;
}
