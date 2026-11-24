// Tabla de la pantalla de Controles: verbos, glifos de mouse y de joystick.
import { drawGlyph, glyphSize } from '../glyphs.js';

// ------------------------------------------------------- tabla de Controles
// Dos columnas de dispositivo: mouse + teclado (complementarios) y joystick.
const CTRL_LABEL_X = 44;
const CTRL_MOUSE_X = 196;
const CTRL_MOUSE_LABEL_X = 214;
const CTRL_PAD_X = 330;
const CTRL_PAD_LABEL_X = 371;
const CTRL_HEADER_Y = 46;
const CTRL_ROW_Y = 58;
const CTRL_ROW_STEP = 19;

export const CONTROLS_HEADERS = [
  ['VERBO', CTRL_LABEL_X],
  ['MOUSE + TECLADO', CTRL_MOUSE_X],
  ['JOYSTICK', CTRL_PAD_X],
];

/** Pie del cartel de Controles (se dibuja línea por línea). */
export const CONTROLS_NOTES = [
  'Objetivo: juntar las partes del traje, fabricarlo y salir.',
  'La nevada mata al contacto con la piel.',
  'Click en la barra elige ítem. Click en Mochila la abre.',
];

/**
 * Una fila por verbo. `mouse`/`pad` son listas de glifos y la etiqueta corta
 * de cada columna. No hay modo "solo teclado": el teclado acompaña al mouse.
 */
export const CONTROLS_ROWS = [
  {
    action: 'interact', label: 'Hacer',
    mouse: ['mouse'], mouseLabel: 'Click izq.',
    pad: ['a'], padLabel: 'A',
  },
  {
    action: 'hands', label: 'Manos',
    mouse: ['mouse_r'], mouseLabel: 'Click der.',
    pad: ['x'], padLabel: 'X',
  },
  {
    action: 'move', label: 'Mover',
    mouse: ['key_arrow'], mouseLabel: 'WASD / flechas',
    pad: ['stick', 'dpad'], padLabel: 'Stick / cruceta',
  },
  {
    action: 'item', label: 'Elegir ítem',
    mouse: ['key_1'], mouseLabel: 'Rueda, 1 a 8',
    pad: ['lb', 'rb'], padLabel: 'LB / RB',
  },
  {
    action: 'bag', label: 'Mochila',
    mouse: ['key_i'], mouseLabel: 'I / Tab',
    pad: ['y'], padLabel: 'Y',
  },
  {
    action: 'menu', label: 'Menú',
    mouse: ['key_esc'], mouseLabel: 'Esc',
    pad: ['start'], padLabel: 'Start',
  },
];

/** Todos los textos fijos de la pantalla de Controles (test de fuente). */
export function controlsTexts() {
  return [
    'CONTROLES',
    ...CONTROLS_HEADERS.map(([header]) => header),
    ...CONTROLS_ROWS.flatMap((row) => [row.label, row.mouseLabel, row.padLabel]),
    ...CONTROLS_NOTES,
    'Volver',
  ];
}

/** Dibuja los glifos de una columna alineados con el texto de 7 px. */
export function drawGlyphRun(ctx, assets, names, x, y) {
  let cx = x;
  for (const name of names || []) {
    const size = glyphSize(assets, name);
    drawGlyph(ctx, assets, name, cx, y + Math.round((7 - size.h) / 2));
    cx += size.w + 3;
  }
  return cx;
}
