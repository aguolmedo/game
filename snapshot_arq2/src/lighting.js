// Luz de la casa: antes y después del corte (diseño §8).
// Se dibuja en un canvas 480x270 encima del render 3D. El HUD va aparte, sin oscurecer.
// La nieve brilla: en apagón el ambiente se tiñe de cian y las velas quedan cálidas.

export const AMBIENT = {
  electrica: { color: '#2a1c18', alpha: 0.10, tint: '#ffcf6e' },
  apagon: { color: '#0e1228', alpha: 0.62, tint: '#96e1f0' },
};

export const WARM = '#ffcf6e';
export const SNOW_GLOW = '#96e1f0';
export const MAX_LIGHTS = 8;

function lightDistance(light, origin) {
  return Math.hypot((light.x || 0) - origin.x, (light.y || 0) - origin.y);
}

/**
 * Recorta la lista a `max` luces conservando el orden original.
 * Las que no son nieve (bengala, farol, velas) entran siempre; el resto
 * del cupo se llena con las luces de nieve más cercanas a `origin`.
 * Sin origin se conservan las primeras. No muta la lista.
 */
export function prioritizeLights(lights, max = MAX_LIGHTS, origin = null) {
  const list = Array.isArray(lights) ? lights : [];
  const limit = Math.max(0, Math.floor(Number(max)));
  if (list.length <= limit) return list.slice();

  const keep = new Set();
  const snow = [];
  list.forEach((light, i) => {
    if (light && light.kind === 'snow') snow.push(i);
    else if (keep.size < limit) keep.add(i);
  });

  const candidates = origin && Number.isFinite(origin.x) && Number.isFinite(origin.y)
    ? snow.slice().sort((a, b) => lightDistance(list[a], origin) - lightDistance(list[b], origin)
      || a - b)
    : snow;
  for (const i of candidates) {
    if (keep.size >= limit) break;
    keep.add(i);
  }

  return list.filter((_, i) => keep.has(i));
}

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

// Cuantización del alpha (1/128): permite cachear gradientes sin que el
// flicker cree uno nuevo por frame. La diferencia es imperceptible.
const ALPHA_STEPS = 128;
function quantizeAlpha(a) {
  return Math.round(a * ALPHA_STEPS) / ALPHA_STEPS;
}

// Tope de gradientes cacheados por contexto (si se pasa, se tira todo).
const GRADIENT_CACHE_MAX = 600;

/** Oscurecido + charcos de luz sobre un canvas 480x270. */
export class LightOverlay {
  constructor(assets, map) {
    this.assets = assets;
    this.map = map;
    this.mode = 'electrica';
    this.camX = 0;
    this.camY = 0;
    this.time = 0;
    // Reutilizados por frame: entradas {light, f}, el filtro y el array devuelto.
    this._entries = [];
    for (let i = 0; i < MAX_LIGHTS; i++) this._entries.push({ light: null, f: 0 });
    this._out = [];
    this._filtered = [];
    this._origin = { x: 0, y: 0 };
    // Un gradiente de canvas solo sirve para el ctx que lo creó.
    this._caches = new WeakMap();
  }

  /** Cache de gradientes del ctx (Map por contexto, sin allocation extra). */
  _cache(ctx) {
    let cache = this._caches.get(ctx);
    if (!cache) {
      cache = new Map();
      this._caches.set(ctx, cache);
    }
    return cache;
  }

  /** Guarda un gradiente recién creado (respeta el tope del cache). */
  _store(cache, key, gradient) {
    if (cache.size >= GRADIENT_CACHE_MAX) cache.clear();
    cache.set(key, gradient);
    return gradient;
  }

  _holeGradient(ctx, r, alpha) {
    const a = quantizeAlpha(alpha);
    const key = `hole|${r}|${a}`;
    const cache = this._cache(ctx);
    const hit = cache.get(key);
    if (hit) return hit;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, rgba('#000000', a));
    g.addColorStop(0.55, rgba('#000000', a * 0.5));
    g.addColorStop(1, rgba('#000000', 0));
    return this._store(cache, key, g);
  }

  _poolGradient(ctx, r, color, alpha) {
    const radius = r * 0.95;
    const a = quantizeAlpha(alpha);
    const key = `pool|${color}|${radius}|${a}`;
    const cache = this._cache(ctx);
    const hit = cache.get(key);
    if (hit) return hit;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    g.addColorStop(0, rgba(color, a));
    g.addColorStop(0.45, rgba(color, a * 0.42));
    g.addColorStop(1, rgba(color, 0));
    return this._store(cache, key, g);
  }

  _coreGradient(ctx, r, alpha) {
    const radius = r * 0.45;
    const a = quantizeAlpha(alpha);
    const key = `core|${radius}|${a}`;
    const cache = this._cache(ctx);
    const hit = cache.get(key);
    if (hit) return hit;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    g.addColorStop(0, rgba('#ffb070', a));
    g.addColorStop(1, rgba('#ffb070', 0));
    return this._store(cache, key, g);
  }

  /** Círculo relleno con un gradiente ya centrado en (0,0). */
  _blit(ctx, gradient, sx, sy, radius) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  setMode(mode) {
    this.mode = mode === 'apagon' ? 'apagon' : 'electrica';
  }

  setCamera(camX, camY) {
    // Sin redondear: la cámara puede estar en 1/worldPx (zoom del mundo).
    this.camX = camX || 0;
    this.camY = camY || 0;
  }

  update(dt) {
    this.time += dt;
  }

  lights(t = this.time, origin = null) {
    // Filtro en el lugar (mismo resultado que lightsFor) para no crear un
    // array nuevo por frame; el recorte sólo asigna si hay más de MAX_LIGHTS.
    const raw = (this.map && this.map.lights) || [];
    const filtered = this._filtered;
    let count = 0;
    for (const light of raw) {
      if (lightOn(light, this.mode)) filtered[count++] = light;
    }
    filtered.length = count;
    const source = filtered.length > MAX_LIGHTS
      ? prioritizeLights(filtered, MAX_LIGHTS, origin)
      : filtered;
    let n = 0;
    for (let i = 0; i < source.length; i++) {
      const light = source[i];
      const f = lightIntensity(light, t);
      if (!(f > 0)) continue;
      const entry = this._entries[n];
      entry.light = light;
      entry.f = f;
      this._out[n] = entry;
      n++;
    }
    this._out.length = n;
    return this._out;
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
    const origin = this._origin;
    if (player) {
      origin.x = player.x;
      origin.y = player.feet ?? player.y;
    } else {
      origin.x = this.camX + W / 2;
      origin.y = this.camY + H / 2;
    }
    const list = this.lights(t, origin);
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
        const ember = light.kind === 'ember';
        const hole = Math.min(0.95, 0.74 * f * (light.hole ?? 1) * (ember ? 1.2 : 1));
        this._blit(ctx, this._holeGradient(ctx, r, hole), sx, sy, r);
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
      const ember = light.kind === 'ember';
      const glow = dark ? (ember ? 0.55 : 0.34) : 0.16;
      this._blit(ctx, this._poolGradient(ctx, r, color, glow * f), sx, sy, r * 0.95);
      // Núcleo caliente de la bengala: se lee fuerte aun sobre la nieve.
      if (ember) {
        const cr = r * 0.45;
        this._blit(
          ctx,
          this._coreGradient(ctx, r, Math.min(1, 0.45 * f)),
          sx, sy, cr,
        );
      }
    }

    ctx.restore();
  }
}
