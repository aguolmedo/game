import { typeOf } from '../actions.js';

/** "el balde" -> "El balde" (para avisos que empiezan por el nombre). */
export function capName(name) {
  const text = name || 'El mueble';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Cosas agarrables (type thing): muestran el destello del cursor. */
export function isGrabbable(target) {
  if (!target) return false;
  if (typeOf(target) !== 'thing') return false;
  return target.kind === 'pickup' || target.grabbable !== false;
}

export function boxOf(target) {
  if (target.w && target.h) {
    return { x: target.x - target.w / 2, y: target.y - target.h, w: target.w, h: target.h };
  }
  return { x: target.x - 8, y: target.y - 16, w: 16, h: 16 };
}

export function boxOfWarp(warp) {
  return { x: warp.x, y: warp.y, w: warp.w, h: warp.h };
}

/** Etiqueta del warp: la del mapa o una por destino. */
export function warpLabel(warp) {
  if (warp && warp.label) return warp.label;
  const to = warp && warp.to;
  const id = (warp && warp.id) || '';
  if (to === 'street') return 'Salir';
  if (to === 'attic' || /stairs_up|escalera_sube/i.test(id)) return 'Subir';
  if (/stairs|escalera/i.test(id)) return 'Bajar';
  return 'Entrar';
}
