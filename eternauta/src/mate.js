// El mate y la pava: lógica pura (sin DOM ni three) + el termómetro dibujado.
// Máquina de estados del diseño §7.

export const PERFECT_MIN = 70;
export const PERFECT_MAX = 85;
export const BOIL_TEMP = 95;       // arriba de esto el agua está hervida
export const HEAT_SECONDS = 9;     // 0 -> 100 en 9 s
export const COOL_SECONDS = 90;    // se enfría a fría en 90 s
export const LAVADO_AT = 8;        // cebadas para que quede lavado
export const BURNT_LAVADO_AT = 2;  // un mate quemado se lava enseguida

const MATE_ITEMS = {
  vacio: 'mate_vacio',
  yerba: 'mate_yerba',
  cebado: 'mate_cebado',
  lavado: 'mate_lavado',
};

/** Mate recién vacío. */
export function createMate() {
  return { state: 'vacio', cebadas: 0, burnt: false };
}

/** vacio -> yerba. Devuelve true si cambió. */
export function putYerba(mate) {
  if (mate.state !== 'vacio') return false;
  mate.state = 'yerba';
  mate.burnt = false;
  return true;
}

/** yerba -> cebado. Si el agua está hervida, el mate sale quemado. */
export function cebar(mate, pava = {}) {
  if (mate.state !== 'yerba') return false;
  mate.state = 'cebado';
  // acepta la pava viva {temp}, el item ('pava_hervida') o {hervida:true}
  const hervida = typeof pava === 'string'
    ? pava === 'pava_hervida'
    : (pava.hervida === true || tempZone(pava.temp ?? 0) === 'hervida');
  mate.burnt = hervida;
  return true;
}

/** cebado -> yerba (o lavado si ya no da más). +1 cebada. */
export function sip(mate) {
  if (mate.state !== 'cebado') return false;
  mate.state = 'yerba';
  mate.cebadas += 1;
  if (mate.burnt && mate.cebadas >= BURNT_LAVADO_AT) mate.state = 'lavado';
  else if (mate.cebadas >= LAVADO_AT) mate.state = 'lavado';
  return true;
}

/** Convidar: igual que sorber, pero devuelve el mate (para encadenar). */
export function share(mate) {
  if (mate.state !== 'cebado') return mate;
  sip(mate);
  return mate;
}

/** lavado -> vacio. Devuelve true si cambió. */
export function dump(mate) {
  if (mate.state !== 'lavado') return false;
  mate.state = 'vacio';
  mate.cebadas = 0;
  mate.burnt = false;
  return true;
}

export function isLavado(mate) {
  return mate.state === 'lavado';
}

/** Item del inventario que corresponde al estado del mate. */
export function mateItemId(mate) {
  return MATE_ITEMS[mate.state] || 'mate_vacio';
}

// ---------------------------------------------------------------- la pava

export function createPava() {
  return { temp: 0, heating: false, station: null };
}

/** Apoyar la pava en una estación de calentar. */
export function startHeating(pava, station = null) {
  pava.heating = true;
  pava.station = station;
  return pava;
}

export function stopHeating(pava) {
  pava.heating = false;
  pava.station = null;
  return pava;
}

/** Calienta mientras está en la estación (0 -> 100 en 9 s). */
export function heat(pava, dt) {
  if (!pava.heating) return pava;
  pava.temp = Math.min(100, pava.temp + (100 / HEAT_SECONDS) * Math.max(0, dt));
  return pava;
}

/** Se enfría sola cuando no está al fuego (100 -> 0 en 90 s). */
export function coolPava(pava, dt) {
  if (pava.heating) return pava;
  pava.temp = Math.max(0, pava.temp - (100 / COOL_SECONDS) * Math.max(0, dt));
  return pava;
}

/** Zona de temperatura del agua. */
export function tempZone(temp) {
  if (temp < PERFECT_MIN) return 'fria';
  if (temp <= PERFECT_MAX) return 'ideal';
  if (temp <= BOIL_TEMP) return 'caliente';
  return 'hervida';
}

/** Item que se lleva el jugador al levantar la pava. La pava deja la estación. */
export function takePava(pava) {
  pava.heating = false;
  pava.station = null;
  return pavaItemId(pava.temp);
}

export function pavaItemId(temp) {
  if (temp < PERFECT_MIN) return 'pava_fria';
  if (temp <= BOIL_TEMP) return 'pava_caliente';
  return 'pava_hervida';
}

// ------------------------------------------------------- termómetro (HUD)

const ZONE_COLOR = {
  fria: '#6a8ab0',
  ideal: '#2f7a4a',
  caliente: '#e8963a',
  hervida: '#a83a34',
};

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

/**
 * Barra vertical de 6x30 con la zona ideal en verde, marcas cada 10 y aguja.
 * (x, y) es la esquina de arriba a la izquierda de la barra.
 */
export function drawThermometer(ctx, x, y, temp) {
  const t = clamp(Number(temp) || 0, 0, 100);
  const w = 6;
  const h = 30;
  const innerY = y + 1;
  const innerH = h - 2;

  // marco de tinta
  ctx.fillStyle = '#1a1426';
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  // pista oscura
  ctx.fillStyle = '#2a2238';
  ctx.fillRect(x, y, w, h);

  // zona ideal 70-85 en verde suave
  const top85 = innerY + (1 - PERFECT_MAX / 100) * innerH;
  const top70 = innerY + (1 - PERFECT_MIN / 100) * innerH;
  ctx.fillStyle = 'rgba(47, 122, 74, 0.45)';
  ctx.fillRect(x, Math.round(top85), w, Math.max(1, Math.round(top70 - top85)));

  // columna de temperatura, de abajo hacia arriba
  const level = Math.round((t / 100) * innerH);
  ctx.fillStyle = ZONE_COLOR[tempZone(t)];
  ctx.fillRect(x, innerY + innerH - level, w, level);

  // marcas cada 10 grados, a la derecha de la barra
  ctx.fillStyle = '#6a5a70';
  for (let deg = 10; deg < 100; deg += 10) {
    const my = Math.round(innerY + (1 - deg / 100) * innerH);
    ctx.fillRect(x + w, my, 2, 1);
  }

  // aguja a la altura actual
  const ny = Math.round(innerY + innerH - level);
  ctx.fillStyle = '#ffcf6e';
  ctx.fillRect(x - 3, ny, 3, 1);
  ctx.fillRect(x - 2, ny - 1, 2, 1);
  ctx.fillRect(x - 2, ny + 1, 2, 1);
}
