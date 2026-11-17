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
