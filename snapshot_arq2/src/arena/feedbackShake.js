// Sacudida de cámara del disparo. Funciones sobre ShootingFx.

export function addShake(fx, amp, time) {
  fx.shakeAmp = Math.max(fx.shakeAmp, amp);
  fx.shakeT = Math.max(fx.shakeT, time);
}

/** Desvío de cámara por la sacudida (1 px por disparo, 2 px por baja). */
export function shakeOffset(fx, t = 0) {
  const out = fx.shake;
  if (fx.shakeT <= 0 || fx.shakeAmp <= 0) {
    out.x = 0;
    out.y = 0;
    return out;
  }
  out.x = Math.round(Math.sin(t * 143) * fx.shakeAmp);
  out.y = Math.round(Math.cos(t * 111) * fx.shakeAmp);
  return out;
}

