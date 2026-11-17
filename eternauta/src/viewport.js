// Tamaño de la vista del mundo (T2). La UI sigue en 480x270 con escala entera;
// el mundo se dibuja a `worldPx` px de pantalla por px de arte (zoom ~1.5x).
//
//   scale   = factor entero de la ventana respecto de 480x270 (para la UI)
//   worldPx = px de pantalla por px de mundo (pixel-perfect)
//   worldW  = ancho de la vista del mundo en px de arte (puede ser fraccionario)
//   zoom    = worldPx / scale (factor mundo -> UI)
export function computeViewport(innerW, innerH, { zoom = true } = {}) {
  const scale = Math.max(1, Math.floor(Math.min(innerW / 480, innerH / 270)));
  const worldPx = zoom ? Math.max(scale + 1, Math.round(scale * 1.5)) : scale;
  return {
    scale,
    worldPx,
    worldW: 480 * scale / worldPx,
    worldH: 270 * scale / worldPx,
    zoom: worldPx / scale,
  };
}

// Viewport activo y mutable: main.js lo actualiza en resize() y al cambiar de
// escena. Arranca en 480x270 sin zoom (el estado seguro por defecto).
export const viewport = {
  scale: 1, worldPx: 1, worldW: 480, worldH: 270, zoom: 1,
};

/** Actualiza el viewport activo; `zoom=false` para escenas que no lo usan. */
export function updateViewport(innerW, innerH, zoom = true) {
  Object.assign(viewport, computeViewport(innerW, innerH, { zoom }));
  return viewport;
}

/** Redondea una coordenada de cámara a 1/worldPx (pixel-perfect del mundo). */
export function snapCamera(v, worldPx = viewport.worldPx) {
  const px = Math.max(1, worldPx || 1);
  return Math.round(v * px) / px;
}

/** Coordenada de la vista UI (480x270) -> px del mundo, con zoom. */
export function viewToWorld(v, cam, zoom = 1) {
  const z = zoom || 1;
  return { x: cam.x + v.x / z, y: cam.y + v.y / z };
}

/** px del mundo -> coordenada de la vista UI (480x270), con zoom. */
export function worldToView(x, y, cam, zoom = 1) {
  return { x: (x - cam.x) * zoom, y: (y - cam.y) * zoom };
}
