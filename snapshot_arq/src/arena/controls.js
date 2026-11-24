// Reglas puras de los controles de la arena (sin DOM ni three).
// Un click es UNA accion: si compra en la caja, no dispara.

/**
 * ¿Este cuadro dispara? El mouse dispara con click/boton sostenido, salvo
 * cuando el click compra municiones (parado cerca de la caja). El teclado y
 * el pad disparan siempre.
 */
export function firePressed({
  mouseDown = false, click = false, keyboardFire = false, nearCrate = false,
} = {}) {
  const mouseFire = (Boolean(mouseDown) || Boolean(click)) && !nearCrate;
  return Boolean(keyboardFire) || mouseFire;
}

/**
 * Qué acción disparan los botones de consumibles/recarga este cuadro.
 * slot: índice de input.slotPressed (0 = tecla 1, 1 = tecla 2) o -1.
 * lb/rb: flancos de LB (botón 4) / RB (botón 5). keyR: tecla R.
 * padX: flanco de X del pad (botón 2). bengalas/molotovs: stock de la salida.
 * RB deja de recargar: con botella disponible ese botón es de la botella.
 * `out` opcional: objeto a reusar (el loop de la arena evita asignar por cuadro).
 */
export function consumableAction(args = {}, out = null) {
  const {
    slot = -1, lb = false, rb = false, bengalas = 0, molotovs = 0, keyR = false, padX = false,
  } = args;
  const result = out || {};
  result.bengala = (slot === 0 || lb) && bengalas > 0;
  result.botella = (slot === 1 || rb) && molotovs > 0;
  result.reload = Boolean(keyR) || Boolean(padX);
  return result;
}
