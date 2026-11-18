// PI-1: parámetros de luz del apagón por escena (posiciones en px de mundo).
// El shader (src/lightpost.js) hace el trabajo pesado; acá solo se arma la
// lista de luces cálidas, haces fríos, vidrios y los efectos chicos (llama,
// pucho). Ver art/concept/lighting2.py y lighting3.py.
import { viewport } from './viewport.js';

export const CANDLE_COL = [1.25, 1.06, 0.80];
export const EMBER_COL = [1.22, 0.80, 0.58];
export const SNOW_COL = [0.62, 0.92, 1.12];
// La lamparita del garaje es mas blanca que la vela (luz electrica vieja).
export const BULB_COL = [1.18, 1.10, 0.86];

export const APAGON_MAPS = new Set(['attic', 'house', 'street', 'garage']);

// Parpadeo de la vela: el radio cambia 1-3 px cada ~150 ms (nunca la opacidad).
const CANDLE_JIT = [0, 2, -1, 3, 1, 0, 2, -1, 1, 3];
// El mismo parpadeo para la lamparita, entre -2 y 3 px: titila mas nerviosa.
const BULB_JIT = [0, 3, -1, 2, -2, 1, 3, 0, -1, 2];

// El pucho de Lucas: [intensidad 0..1, duración ms]. Reposo largo, pitada,
// se apaga despacio (lighting3.py → PUCHO).
export const PUCHO = [
  [0, 420], [0, 420], [0.05, 380], [0.55, 110], [1, 160],
  [1, 220], [0.7, 160], [0.4, 180], [0.2, 220], [0, 420],
];
const PUCHO_TOTAL = PUCHO.reduce((sum, [, ms]) => sum + ms, 0);

/** Intensidad de la brasa de Lucas en el instante t (segundos). */
export function emberK(t) {
  let left = ((t * 1000) % PUCHO_TOTAL + PUCHO_TOTAL) % PUCHO_TOTAL;
  for (const [k, ms] of PUCHO) {
    if (left < ms) return k;
    left -= ms;
  }
  return 0;
}

/** Respiración lenta del pucho del cenicero: 0..1, período 2 s. */
export function breathK(t) {
  return 0.5 + 0.5 * Math.sin(t * Math.PI);
}

function bounds(obj) {
  const mesh = obj && obj.mesh;
  if (!mesh || !mesh.geometry || !mesh.geometry.parameters) return null;
  const p = mesh.geometry.parameters;
  const { x, y } = mesh.position;
  return {
    cx: x,
    cy: y,
    l: x - p.width / 2,
    r: x + p.width / 2,
    t: y - p.height / 2,
    b: y + p.height / 2,
  };
}

/**
 * Config completa del pase de apagón para una escena de mundo.
 * Devuelve null si el mapa no usa el pase (altillo, casa, calle y garaje sí).
 */
export function buildApagon(scene) {
  if (!scene || !APAGON_MAPS.has(scene.name)) return null;
  const map = scene.mapData || {};
  const t = scene.t || 0;
  const obj = (id) => (map.objects || []).find((o) => o.id === id);
  const jitter = CANDLE_JIT[Math.floor(t / 0.15) % CANDLE_JIT.length];
  const params = {
    cam: { x: scene.cam?.x || 0, y: scene.cam?.y || 0 },
    view: { w: viewport.worldW, h: viewport.worldH },
    lights: [],
    beams: [],
    glass: [],
    snowGlows: false,
    street: scene.name === 'street',
    litWindow: null,
    fx: [],
  };

  if (scene.name === 'attic') {
    // Vela sobre la mesa de truco (R = 63 px de mundo) + llama.
    const candle = bounds(obj('candle'));
    if (candle) {
      const ly = candle.t + 3;
      params.lights.push({ x: candle.cx + jitter, y: ly, r: 63, col: CANDLE_COL });
      params.fx.push({ type: 'flame', x: candle.cx, y: ly - 3 });
    }
    // Ventana del altillo: vidrio cian + haz frío (L = 33).
    const win = bounds(obj('window'));
    if (win) {
      const x0 = win.l + 4;
      const x1 = win.r - 4;
      params.glass.push({ x0, y0: win.t + 4, x1, y1: win.b - 4 });
      params.beams.push({ x0, x1, ytop: win.b - 2, L: 33 });
    }
    // Lucas fuma: cigarrillo de 2 px desde la comisura, brasa en la punta.
    const lucas = (scene.npcs || []).find((n) => n.id === 'lucas');
    if (lucas && !lucas.hidden) {
      const k = emberK(t);
      const mx = lucas.x - 8 + 10;
      const my = lucas.feet - 32 + 13;
      params.lights.push({ x: mx + 2, y: my, r: 5 + 12 * k, col: EMBER_COL });
      params.fx.push({ type: 'ember', x: mx, y: my, k });
      params.fx.push({ type: 'smoke', x: mx + 2, y: my });
    }
  }

  if (scene.name === 'house') {
    // Lámpara de aceite junto a la escalera (la pone el mapa en apagón).
    params.lights.push({ x: 48, y: 74, r: 47 + jitter, col: CANDLE_COL });
    params.fx.push({ type: 'flame', x: 48, y: 71 });

    // Pucho del cenicero sobre la mesa ratona: brasa que respira.
    const cen = (scene.surface?.items || []).find((wi) => wi.itemId === 'cenicero');
    if (cen && Number.isFinite(cen.x) && Number.isFinite(cen.y)) {
      const k = breathK(t);
      const ex = cen.x + 2;
      const ey = cen.y - 1;
      params.lights.push({ x: ex, y: ey, r: 12 + 5 * k, col: EMBER_COL });
      params.fx.push({ type: 'cherry', x: ex, y: ey, k });
      params.fx.push({ type: 'smoke', x: ex, y: ey });
    }

    // Ventana del living: vidrio cian + haz frío (L = 40).
    const win = bounds(obj('window_living'));
    if (win) {
      const x0 = win.l + 4;
      const x1 = win.r - 4;
      params.glass.push({ x0, y0: win.t + 4, x1, y1: win.b - 4 });
      params.beams.push({ x0, x1, ytop: win.b, L: 40 });
    }
    // Ojo de buey de la puerta del hall: vidrio chico + haz (L = 24).
    const door = bounds(obj('hall_door'));
    if (door) {
      const x0 = door.cx - 4;
      const x1 = door.cx + 4;
      params.glass.push({ x0, y0: door.t + 7, x1, y1: door.t + 15 });
      params.beams.push({ x0, x1, ytop: door.t + 15, L: 24 });
    }
    // Ventana de Martita (muro del fondo): el vidrio da a la nevada.
    const martita = bounds(obj('window_martita'));
    if (martita) {
      params.glass.push({
        x0: martita.l + 4, y0: martita.t + 2,
        x1: martita.r - 4, y1: martita.b - 2,
      });
    }
  }

  if (scene.name === 'garage') {
    // Lámpara de aceite sobre la tabla del banco del traje: hasta que arranca
    // el electrógeno es la única luz cálida del garaje (la pone el mapa).
    const lamp = bounds(obj('oil_lamp_bench'));
    if (lamp) {
      const flameY = lamp.t + 5;
      params.lights.push({ x: lamp.cx, y: flameY, r: 50 + jitter, col: CANDLE_COL });
      params.fx.push({ type: 'flame', x: lamp.cx, y: flameY });
    }

    // Lamparita colgando del cable: apagada hasta cargar nafta en el electrógeno.
    const bulb = bounds(obj('bulb'));
    if (bulb && scene.game?.flags?.electrogeno_on) {
      const flick = BULB_JIT[Math.floor(t / 0.15) % BULB_JIT.length];
      params.lights.push({ x: bulb.cx, y: bulb.b - 4, r: 70 + flick, col: BULB_COL });
    }

    // Puerta de dos hojas: la rendija central brilla y del umbral baja el haz.
    const door = bounds(obj('garage_door'));
    if (door) {
      const cx = Math.round(door.cx);
      params.glass.push({ x0: cx - 1, y0: door.t + 6, x1: cx + 1, y1: door.b });
      params.beams.push({ x0: cx - 6, x1: cx + 6, ytop: door.b, L: 30 });
    }
    // Extractor: las aspas se ven como vidrio frío dentro del marco.
    const ext = bounds(obj('extractor'));
    if (ext) {
      params.glass.push({
        x0: ext.l + 3, y0: ext.t + 3, x1: ext.r - 3, y1: ext.b - 3,
      });
    }
  }

  if (scene.name === 'street') {
    // La nieve es la luz del suelo; una sola ventana conserva una vela.
    params.snowGlows = true;
    params.litWindow = { x0: 105, y0: 135, x1: 121, y1: 153 };
    params.lights.push({ x: 113, y: 146, r: 15 + jitter * 0.4, col: CANDLE_COL });
    params.fx.push({ type: 'flame', x: 113, y: 148 });
  }

  return params;
}
