// Captura headless del mapa del barrio (semilla 1) sin abrir ventana.
// Levanta Vite, dibuja piso + objetos en un canvas 2D con los atlas PNG
// y guarda docs/capturas/barrio_seed_1.png (1280x640).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Uso: node tools/barrio_preview.mjs [semilla] [nombre.png]
// Sin argumentos: semilla 1 -> docs/capturas/barrio_seed_1.png
const SEED = Number(process.argv[2] || 1);
const NAME = process.argv[3] || `barrio_seed_${SEED}.png`;
const OUT = path.join(ROOT, 'docs/capturas', NAME);
const URL = 'http://localhost:5199/';
const CHROME = process.env.HOME + '/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function up(timeout = 800) {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeout);
    const res = await fetch(URL, { signal: ctl.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

async function waitServer(timeoutMs = 30000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    if (await up()) return true;
    await sleep(300);
  }
  return false;
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });

let vite = null;       // proceso propio (null si reusamos uno ya levantado)
let browser = null;
let exitCode = 0;

try {
  if (await up()) {
    console.log('vite ya estaba corriendo en 5199, lo reuso (no lo mato)');
  } else {
    vite = spawn('npx', ['vite', '--port', '5199', '--strictPort'], {
      cwd: ROOT, detached: true, stdio: 'ignore',
    });
    if (!(await waitServer())) throw new Error('vite no respondio en 30s');
  }

  browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
  });
  const page = await browser.newPage({ viewport: { width: 1400, height: 800 } });
  await page.goto(URL, { waitUntil: 'load' });

  const info = await page.evaluate(async (seed) => {
    const { buildBarrio } = await import('/src/maps/barrio/index.js');
    const { map } = buildBarrio(seed);

    // Atlas del juego, en el mismo orden de busqueda que src/mapView.js.
    const ATLASES = ['objects', 'interior2', 'street2', 'houses', 'tiles'];
    const atlases = {};
    for (const name of ATLASES) {
      const [json, img] = await Promise.all([
        fetch(`/assets/${name}.json`).then((r) => {
          if (!r.ok) throw new Error(`atlas ${name}.json: ${r.status}`);
          return r.json();
        }),
        (async () => {
          const im = new Image();
          im.src = `/assets/${name}.png`;
          await im.decode();
          return im;
        })(),
      ]);
      atlases[name] = { frames: json.frames, img };
    }
    const frameOf = (name) => {
      for (const a of ATLASES) {
        const f = atlases[a].frames[name];
        if (f) return { img: atlases[a].img, f: Array.isArray(f) ? f : [f.x, f.y, f.w, f.h] };
      }
      return null;
    };

    const W = map.cols * 16;
    const H = map.rows * 16;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const missing = [];
    // 1) piso: cada baldosa 16x16 en (x*16, y*16)
    for (let y = 0; y < map.rows; y++) {
      for (let x = 0; x < map.cols; x++) {
        const name = map.floor[y] && map.floor[y][x];
        if (!name) continue;
        const s = frameOf(name);
        if (!s) { missing.push(name); continue; }
        const [fx, fy, fw, fh] = s.f;
        ctx.drawImage(s.img, fx, fy, fw, fh, x * 16, y * 16, 16, 16);
      }
    }

    // 2) objetos: flats primero, despues de menor a mayor baseY.
    // Array.sort de JS es estable: empates conservan el orden de insercion.
    const ordered = map.objects.map((o, i) => ({ o, i }));
    ordered.sort((a, b) => {
      const fa = a.o.flat ? 0 : 1;
      const fb = b.o.flat ? 0 : 1;
      if (fa !== fb) return fa - fb;
      const ba = (a.o.y + a.o.th) * 16;
      const bb = (b.o.y + b.o.th) * 16;
      if (ba !== bb) return ba - bb;
      return a.i - b.i;
    });

    for (const { o } of ordered) {
      const s = frameOf(o.sprite);
      if (!s) { missing.push(o.sprite); continue; }
      const [fx, fy, fw, fh] = s.f;
      const ox = o.offset ? o.offset[0] : 0;
      const oy = o.offset ? o.offset[1] : 0;
      const left = Math.round(o.x * 16 + o.tw * 8 + ox - fw / 2);
      const top = Math.round((o.y + o.th) * 16 - fh + oy);
      if (o.flipX) {
        ctx.save();
        ctx.translate(left + fw, top);
        ctx.scale(-1, 1);
        ctx.drawImage(s.img, fx, fy, fw, fh, 0, 0, fw, fh);
        ctx.restore();
      } else {
        ctx.drawImage(s.img, fx, fy, fw, fh, left, top, fw, fh);
      }
    }

    canvas.id = 'barrio-preview';
    Object.assign(canvas.style, {
      position: 'fixed', left: '0', top: '0', zIndex: '99999',
      imageRendering: 'pixelated',
    });
    document.body.appendChild(canvas);

    return {
      width: W,
      height: H,
      objects: map.objects.length,
      missing: [...new Set(missing)],
    };
  }, SEED);

  await page.waitForSelector('#barrio-preview');
  await page.locator('#barrio-preview').screenshot({ path: OUT });

  const bytes = fs.statSync(OUT).size;
  console.log(`mapa ${info.width}x${info.height}, ${info.objects} objetos`);
  if (info.missing.length) console.log('sprites sin atlas:', info.missing.join(', '));
  console.log(`captura: ${path.relative(ROOT, OUT)} (${bytes} bytes)`);
  if (bytes < 5000) {
    console.error('ERROR: el PNG pesa menos de 5000 bytes, parece vacio');
    exitCode = 1;
  }
} catch (err) {
  console.error('ERROR:', err.message || err);
  exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  if (vite) {
    try { process.kill(-vite.pid, 'SIGTERM'); } catch { vite.kill('SIGTERM'); }
    // esperar que libere el puerto
    for (let i = 0; i < 20 && await up(); i++) await sleep(200);
  }
  process.exit(exitCode);
}
