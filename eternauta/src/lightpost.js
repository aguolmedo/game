// PI-1: luz del apagón como post-proceso (no un velo encima).
// La escena del mundo se dibuja a un render target y se pasa por un shader que
// repaleta la noche, cuantiza las luces en 4 bandas con tramado Bayer, pinta
// los haces fríos de las ventanas y enfría (no apaga) la nieve. El HUD vive en
// otra escena (uiScene), así que nunca se oscurece.
import * as THREE from 'three';

const VERT = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;

uniform sampler2D uTex;
uniform vec2 uCam;
uniform vec2 uViewWorld;     // ancho/alto de la vista en px de mundo
uniform int uLightCount;
uniform vec3 uLights[8];     // x, y, radio (px de mundo)
uniform vec3 uLightCol[8];   // multiplicador de color de cada luz
uniform int uBeamCount;
uniform vec4 uBeams[4];      // x0, x1, ytop, largo
uniform int uGlassCount;
uniform vec4 uGlass[8];      // x0, y0, x1, y1
uniform int uSnowGlows;      // 1 = mapa calle: la nieve brilla
uniform int uStreet;         // 1 = calle: ventanas pintadas se apagan
uniform vec4 uLitWindow;     // la única ventana con vela

const vec3 CANDLE = vec3(1.25, 1.06, 0.80);
const vec3 EMBER = vec3(1.22, 0.80, 0.58);
const vec3 SNOW_COL = vec3(0.62, 0.92, 1.12);

float lum(vec3 c) { return 0.3 * c.r + 0.59 * c.g + 0.11 * c.b; }

// Bayer 4x4 como en lighting2.py: solo mueve el borde entre bandas.
float bayer(vec2 p) {
  int x = int(mod(floor(p.x), 4.0));
  int y = int(mod(floor(p.y), 4.0));
  int i = y * 4 + x;
  float v = 0.0;
  if (i == 0) v = 0.0;  else if (i == 1) v = 8.0;  else if (i == 2) v = 2.0;
  else if (i == 3) v = 10.0; else if (i == 4) v = 12.0; else if (i == 5) v = 4.0;
  else if (i == 6) v = 14.0; else if (i == 7) v = 6.0;  else if (i == 8) v = 3.0;
  else if (i == 9) v = 11.0; else if (i == 10) v = 1.0; else if (i == 11) v = 9.0;
  else if (i == 12) v = 15.0; else if (i == 13) v = 7.0;
  else if (i == 14) v = 13.0; else v = 5.0;
  return (v + 0.5) / 16.0 - 0.5;
}

// Repaleta nocturna: desaturar 30% y multiplicar por el tono frío.
vec3 night(vec3 c) {
  float L = lum(c);
  vec3 d = c * 0.70 + vec3(L) * 0.30;
  return d * vec3(0.49, 0.55, 0.79);
}

float warmBand(float v, vec2 p) {
  v += bayer(p) * 0.09;
  float n = 0.0;
  if (v > 0.12) n += 1.0;
  if (v > 0.32) n += 1.0;
  if (v > 0.56) n += 1.0;
  if (v > 0.80) n += 1.0;
  return n;
}

float beamBand(float v, vec2 p) {
  v += bayer(p) * 0.09;
  float n = 0.0;
  if (v > 0.10) n += 1.0;
  if (v > 0.28) n += 1.0;
  if (v > 0.48) n += 1.0;
  if (v > 0.90) n += 1.0;
  return n;
}

void main() {
  // El render target guarda color lineal: volvemos al sRGB de la imagen para
  // hacer la repaleta con los mismos valores que el concepto en Python.
  vec3 c = pow(texture2D(uTex, vUv).rgb, vec3(1.0 / 2.2));
  // Pixel de mundo (el tramado queda del tamaño del pixel art).
  vec2 wp = floor(uCam + vec2(vUv.x * uViewWorld.x,
                             (1.0 - vUv.y) * uViewWorld.y));

  // 1) luz cálida: charco cuantizado en 4 bandas; gana la de mayor nivel.
  float lv = 0.0;
  vec3 lcol = CANDLE;
  for (int i = 0; i < 8; i++) {
    if (i >= uLightCount) break;
    vec3 L = uLights[i];
    float d = length((wp - L.xy) * vec2(1.0, 1.25)) / max(1.0, L.z);
    float v = pow(max(0.0, 1.0 - d), 1.6);
    float b = warmBand(v, wp);
    if (b > lv) { lv = b; lcol = uLightCol[i]; }
  }

  // 2) haces fríos de ventana: paralelogramo inclinado que baja del vidrio.
  float sv = 0.0;
  for (int i = 0; i < 4; i++) {
    if (i >= uBeamCount) break;
    vec4 B = uBeams[i];
    float k = wp.y - B.z;
    if (k > 0.0 && k < B.w) {
      float xl = B.x + k * 0.35;
      float xr = B.y + k * 0.35;
      if (wp.x >= xl && wp.x <= xr) {
        sv = max(sv, beamBand(0.85 * (1.0 - k / B.w), wp));
      }
    }
  }

  // 3) viñeta escalonada en los bordes de la vista.
  float e = min(min(wp.x - uCam.x, uCam.x + uViewWorld.x - wp.x),
                min(wp.y - uCam.y, uCam.y + uViewWorld.y - wp.y));
  float vig = e < 7.0 ? 0.76 : (e < 15.0 ? 0.88 : 1.0);

  vec3 n;
  if (lv > 0.0) {
    float t = lv / 4.0;
    n = mix(night(c), c * lcol, t);
  } else if (sv > 0.0) {
    float t = sv / 4.0 * 0.8;
    n = mix(night(c), c * SNOW_COL * 0.8, t);
  } else if (uSnowGlows == 1 && lum(c) > 0.588 && c.b >= c.r - 6.0 / 255.0) {
    // la nieve no se apaga: se enfría y queda como luz del suelo
    float L = lum(c);
    n = vec3(L * 0.50, L * 0.72, L * 0.92);
  } else {
    n = night(c) * vig;
  }

  // 4) vidrios que dan afuera: brillan cian.
  for (int i = 0; i < 8; i++) {
    if (i >= uGlassCount) break;
    vec4 G = uGlass[i];
    if (wp.x >= G.x && wp.x < G.z && wp.y >= G.y && wp.y < G.w
        && lum(c) > 110.0 / 255.0) {
      float L = lum(c);
      n = vec3(L * 0.62, L * 0.98, L * 1.12);
    }
  }

  // 5) calle: las ventanas amarillas pintadas se apagan; una sola queda tibia.
  if (uStreet == 1) {
    bool inside = wp.x >= uLitWindow.x && wp.x < uLitWindow.z
      && wp.y >= uLitWindow.y && wp.y < uLitWindow.w;
    if (inside) {
      float k = 0.5;
      if (mod(wp.x + wp.y, 2.0) < 1.0 && wp.y > (uLitWindow.y + uLitWindow.w) * 0.5) {
        k = 0.75;
      }
      n = c * vec3(k, k * 0.85, k * 0.60);
    } else if (c.r > c.b + 30.0 / 255.0 && lum(c) > 120.0 / 255.0) {
      float L = lum(c);
      n = vec3(L * 0.15, L * 0.18, L * 0.27);
    }
  }

  gl_FragColor = vec4(clamp(n, 0.0, 1.0), 1.0);
}
`;

export class LightPost {
  constructor() {
    this.rt = null;
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTex: { value: null },
        uCam: { value: new THREE.Vector2() },
        uViewWorld: { value: new THREE.Vector2(480, 270) },
        uLightCount: { value: 0 },
        uLights: { value: Array.from({ length: 8 }, () => new THREE.Vector3()) },
        uLightCol: { value: Array.from({ length: 8 }, () => new THREE.Vector3(1, 1, 1)) },
        uBeamCount: { value: 0 },
        uBeams: { value: Array.from({ length: 4 }, () => new THREE.Vector4()) },
        uGlassCount: { value: 0 },
        uGlass: { value: Array.from({ length: 8 }, () => new THREE.Vector4()) },
        uSnowGlows: { value: 0 },
        uStreet: { value: 0 },
        uLitWindow: { value: new THREE.Vector4() },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      depthTest: false,
      depthWrite: false,
      transparent: false,
      side: THREE.DoubleSide,
    });
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, this.material);
    mesh.frustumCulled = false;
    this.quad = new THREE.Scene();
    this.quad.add(mesh);
  }

  ensureTarget(renderer) {
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    if (!this.rt || this.rt.width !== size.x || this.rt.height !== size.y) {
      if (this.rt) this.rt.dispose();
      this.rt = new THREE.WebGLRenderTarget(size.x, size.y, {
        depthBuffer: true,
        stencilBuffer: false,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        generateMipmaps: false,
      });
      this.rt.texture.colorSpace = THREE.SRGBColorSpace;
    }
  }

  /** Dibuja `scene` con `camera` a través del shader de apagón. */
  render(renderer, scene, camera, params) {
    this.ensureTarget(renderer);
    const target = this.rt;
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(prev);

    this.setUniforms(params);
    this.material.uniforms.uTex.value = target.texture;
    renderer.render(this.quad, this.camera);
  }

  setUniforms(params = {}) {
    const u = this.material.uniforms;
    const lights = (params.lights || []).slice(0, 8);
    u.uLightCount.value = lights.length;
    lights.forEach((L, i) => {
      u.uLights.value[i].set(L.x, L.y, Math.max(1, L.r));
      const col = L.col || [1.25, 1.06, 0.80];
      u.uLightCol.value[i].set(col[0], col[1], col[2]);
    });
    const beams = (params.beams || []).slice(0, 4);
    u.uBeamCount.value = beams.length;
    beams.forEach((B, i) => {
      u.uBeams.value[i].set(B.x0, B.x1, B.ytop, Math.max(1, B.L));
    });
    const glass = (params.glass || []).slice(0, 8);
    u.uGlassCount.value = glass.length;
    glass.forEach((G, i) => {
      u.uGlass.value[i].set(G.x0, G.y0, G.x1, G.y1);
    });
    const cam = params.cam || { x: 0, y: 0 };
    const view = params.view || { w: 480, h: 270 };
    u.uCam.value.set(cam.x, cam.y);
    u.uViewWorld.value.set(view.w, view.h);
    u.uSnowGlows.value = params.snowGlows ? 1 : 0;
    u.uStreet.value = params.street ? 1 : 0;
    const lw = params.litWindow;
    if (lw) u.uLitWindow.value.set(lw.x0, lw.y0, lw.x1, lw.y1);
    else u.uLitWindow.value.set(-999, -999, -999, -999);
  }
}

/** Colores de fuente compartidos con el diseño (lighting2/3.py). */
export const LIGHT_COLORS = { candle: CANDLE_VEC(), ember: EMBER_VEC(), snow: SNOW_VEC() };

function CANDLE_VEC() { return [1.25, 1.06, 0.80]; }
function EMBER_VEC() { return [1.22, 0.80, 0.58]; }
function SNOW_VEC() { return [0.62, 0.92, 1.12]; }
