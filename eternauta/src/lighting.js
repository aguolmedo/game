// Luz de la casa: antes y después del corte (diseño §8).
// Se dibuja en un canvas 480x270 encima del render 3D. El HUD va aparte, sin oscurecer.
// La nieve brilla: en apagón el ambiente se tiñe de cian y las velas quedan cálidas.

export const AMBIENT = {
  electrica: { color: '#2a1c18', alpha: 0.10, tint: '#ffcf6e' },
  apagon: { color: '#0e1228', alpha: 0.62, tint: '#96e1f0' },
};

export const WARM = '#ffcf6e';
export const SNOW_GLOW = '#96e1f0';

/** Ruido determinístico 0..1 a partir de dos números. */
function hash(a = 0, b = 0) {
  const s = Math.sin(a * 127.1 + b * 311.7 + 0.37) * 43758.5453;
  return s - Math.floor(s);
}

/** ¿Esta luz está encendida en este modo? */
export function lightOn(light, mode = 'electrica') {
  if (!light) return false;
  if (light.state === 'off') return false;
  if (light.onlyIn && light.onlyIn !== mode) return false;
  if (mode === 'apagon' && light.kind === 'electric') return false;
  return true;
}

/** Luces del mapa que corresponden al modo actual. */
export function lightsFor(map, mode = 'electrica') {
  const list = (map && map.lights) || [];
  return list.filter((light) => lightOn(light, mode));
}

/**
 * Parpadeo suave y determinístico (seno + hash por posición).
 * Sin flicker devuelve 1. Siempre entre 0.6 y 1.1.
 */
export function flickerAt(light, t) {
  if (!light) return 1;
  const amt = Math.max(0, Math.min(1, light.flicker ?? 0));
  if (amt <= 0) return 1;
  const phase = hash(light.x, light.y) * Math.PI * 2;
  const n = Math.sin(t * 5.3 + phase) * 0.55
    + Math.sin(t * 11.7 + phase * 1.7) * 0.30
    + Math.sin(t * 2.1 + phase * 0.6) * 0.15;
  return Math.max(0.6, Math.min(1.1, 1 - amt * 0.18 + n * amt * 0.12));
}

/** Intensidad final de una luz en el instante t. */
export function lightIntensity(light, t) {
  return Math.max(0, (light.intensity ?? 1) * flickerAt(light, t));
}

/** Luz que llega a un punto (0..1), sumando todas las fuentes. */
export function sampleLight(x, y, lights = []) {
  let sum = 0;
  for (const light of lights || []) {
    const r = light.radius || 1;
    const dx = x - light.x;
    const dy = (y - light.y) * 1.2; // charco un poco más ancho que alto
    const d = Math.hypot(dx, dy) / r;
    if (d >= 1) continue;
    const fall = (1 - d) * (1 - d);
    sum += fall * (light.intensity ?? 1);
  }
  return Math.min(1, sum);
}

function rgba(hex, alpha) {
  const s = String(hex || WARM).replace('#', '');
  const v = s.length === 3
    ? s.split('').map((c) => c + c).join('')
    : s.padEnd(6, '0').slice(0, 6);
  const n = parseInt(v, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Oscurecido + charcos de luz sobre un canvas 480x270. */
export class LightOverlay {
  constructor(assets, map) {
    this.assets = assets;
    this.map = map;
    this.mode = 'electrica';
    this.camX = 0;
    this.camY = 0;
    this.time = 0;
  }

  setMode(mode) {
    this.mode = mode === 'apagon' ? 'apagon' : 'electrica';
  }

  setCamera(camX, camY) {
    this.camX = Math.round(camX || 0);
    this.camY = Math.round(camY || 0);
  }

  update(dt) {
    this.time += dt;
  }

  lights(t = this.time) {
    return lightsFor(this.map, this.mode).map((light) => ({
      light, f: lightIntensity(light, t),
    })).filter((entry) => entry.f > 0);
  }

  /**
   * Dibuja el ambiente y las luces. `ctx` es 2D sobre la escena (no el HUD).
   * `player` solo se mira para no castigar visualmente la calma del mate.
   */
  draw(ctx, t = this.time, player = null) {
    if (!ctx) return;
    const amb = AMBIENT[this.mode] || AMBIENT.electrica;
    const W = (ctx.canvas && ctx.canvas.width) || 480;
    const H = (ctx.canvas && ctx.canvas.height) || 270;
    const list = this.lights(t);
    const dark = this.mode === 'apagon';
    const mateCalma = Boolean(player && player.mateCalma);
    void mateCalma; // la calma del mate no cambia la luz

    ctx.save();

    // 1) oscurecer toda la escena (el HUD no pasa por acá)
    ctx.globalAlpha = amb.alpha;
    ctx.fillStyle = amb.color;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;

    // 2) abrir un hueco en la oscuridad alrededor de cada luz
    if (dark) {
      ctx.globalCompositeOperation = 'destination-out';
      for (const { light, f } of list) {
        const sx = light.x - this.camX;
        const sy = light.y - this.camY;
        const r = Math.max(4, light.radius || 40);
        if (sx < -r || sy < -r || sx > W + r || sy > H + r) continue;
        const hole = Math.min(0.95, 0.74 * f * (light.hole ?? 1));
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
        g.addColorStop(0, rgba('#000000', hole));
        g.addColorStop(0.55, rgba('#000000', hole * 0.5));
        g.addColorStop(1, rgba('#000000', 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3) tinte cian de la nieve (o calor eléctrico) sobre todo
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = dark ? 0.06 : 0.03;
    ctx.fillStyle = amb.tint;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;

    // 4) charcos cálidos (o brillo cian de la nieve)
    for (const { light, f } of list) {
      const sx = light.x - this.camX;
      const sy = light.y - this.camY;
      const r = Math.max(4, light.radius || 40);
      if (sx < -r || sy < -r || sx > W + r || sy > H + r) continue;
      const color = light.kind === 'snow' ? SNOW_GLOW : (light.color || WARM);
      const glow = dark ? 0.34 : 0.16;
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 0.95);
      g.addColorStop(0, rgba(color, glow * f));
      g.addColorStop(0.45, rgba(color, glow * 0.42 * f));
      g.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sx, sy, r * 0.95, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
