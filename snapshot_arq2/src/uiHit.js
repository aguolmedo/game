// Hit-testing de la UI: reexporta la geometría pura de src/geom.js y agrega
// el puntero del mouse en coordenadas de la vista.
export {
  pointInRect, hitIndex, hoverIndex, rowRects, gridRects, overlaps,
} from './geom.js';

/** Puntero en coordenadas 480x270, solo si el mouse es el dispositivo actual. */
export function mousePoint(game, input) {
  if (!input || input.device !== 'mouse' || !input.pointer) return null;
  if (!game || typeof game.screenToView !== 'function') return null;
  return game.screenToView(input.pointer.x, input.pointer.y);
}
