// DIAGNÓSTICO (no toca el juego): capturas del barrio con los sólidos en rojo
// semitransparente y un mapa de calor de lo caminable (BFS con la caja del jugador).
// Uso: node tools/diag/barrio_visual.mjs [semilla]
// Escribe docs/capturas/diag_solidos_<pieza>.png, diag_solidos_barrio.png y
// diag_caminable.png. Levanta Vite en 5199 y lo mata al terminar.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SEED = Number(process.argv[2] || 3455);
// BARRIO_DIAG_LEGACY=1 dibuja los solidos de ANTES del fix 1B (rect de
// baldosas, sin offset) para poder comparar el antes y el despues.
// BARRIO_DIAG_OUT permite mandar las capturas a otra carpeta.
const LEGACY = process.env.BARRIO_DIAG_LEGACY === '1';
const OUT = path.join(ROOT, process.env.BARRIO_DIAG_OUT || 'docs/capturas');
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
  } catch { return false; }
}
async function waitServer(timeoutMs = 30000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) { if (await up()) return true; await sleep(300); }
  return false;
}

fs.mkdirSync(OUT, { recursive: true });
let vite = null;
let browser = null;
let exitCode = 0;
try {
  if (await up()) console.log('vite ya estaba en 5199, lo reuso');
  else {
    vite = spawn('npx', ['vite', '--port', '5199', '--strictPort'], { cwd: ROOT, detached: true, stdio: 'ignore' });
    if (!(await waitServer())) throw new Error('vite no respondio');
  }
  browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
  });
  const page = await browser.newPage({ viewport: { width: 1400, height: 800 } });
  page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
  await page.goto(URL, { waitUntil: 'load' });

  const info = await page.evaluate(async ({ seed, legacy }) => {
    const { buildBarrio } = await import('/src/maps/barrio/index.js');
    const { SIZE } = await import('/src/maps/barrio/sizes.js');
    const { solidRectFor, drawOrigin } = await import('/src/maps/solid.js');
    const { map, cells } = buildBarrio(seed);

    const ATLASES = ['objects', 'interior2', 'street2', 'houses', 'tiles'];
    const atlases = {};
    for (const name of ATLASES) {
      const json = await fetch(`/assets/${name}.json`).then((r) => r.json());
      const im = new Image();
      im.src = `/assets/${name}.png`;
      await im.decode();
      atlases[name] = { frames: json.frames, img: im };
    }
    const frameOf = (name) => {
      for (const a of ATLASES) {
        const f = atlases[a].frames[name];
        if (f) return { img: atlases[a].img, f: Array.isArray(f) ? f : [f.x, f.y, f.w, f.h] };
      }
      return null;
    };
    // BBox opaco del frame (lo mismo que opaqueRect de sprite.js).
    const trims = new Map();
    const trimOf = (name) => {
      if (trims.has(name)) return trims.get(name);
      const s = frameOf(name);
      let out = null;
      if (s) {
        const [fx, fy, fw, fh] = s.f;
        const c = document.createElement('canvas');
        c.width = fw; c.height = fh;
        const g = c.getContext('2d');
        g.drawImage(s.img, fx, fy, fw, fh, 0, 0, fw, fh);
        const d = g.getImageData(0, 0, fw, fh).data;
        let x0 = fw; let y0 = fh; let x1 = -1; let y1 = -1;
        for (let j = 0; j < fh; j++) {
          for (let i = 0; i < fw; i++) {
            if (d[(j * fw + i) * 4 + 3] <= 16) continue;
            if (i < x0) x0 = i;
            if (i > x1) x1 = i;
            if (j < y0) y0 = j;
            if (j > y1) y1 = j;
          }
        }
        if (x1 >= x0 && y1 >= y0) out = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
      }
      trims.set(name, out);
      return out;
    };

    const W = map.cols * 16;
    const H = map.rows * 16;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    for (let y = 0; y < map.rows; y++) {
      for (let x = 0; x < map.cols; x++) {
        const name = map.floor[y] && map.floor[y][x];
        const s = name && frameOf(name);
        if (!s) continue;
        const [fx, fy, fw, fh] = s.f;
        ctx.drawImage(s.img, fx, fy, fw, fh, x * 16, y * 16, 16, 16);
      }
    }

    const ordered = map.objects.map((o, i) => ({ o, i }));
    ordered.sort((a, b) => {
      const fa = a.o.flat ? 0 : 1; const fb = b.o.flat ? 0 : 1;
      if (fa !== fb) return fa - fb;
      const ba = (a.o.y + a.o.th) * 16; const bb = (b.o.y + b.o.th) * 16;
      if (ba !== bb) return ba - bb;
      return a.i - b.i;
    });
    for (const { o } of ordered) {
      const s = frameOf(o.sprite);
      if (!s) continue;
      const [fx, fy, fw, fh] = s.f;
      // Misma esquina que WorldMap.layout (drawOrigin).
      const org = drawOrigin(o, SIZE[o.sprite] || [fw, fh]);
      if (o.flipX) {
        ctx.save(); ctx.translate(org.x + fw, org.y); ctx.scale(-1, 1);
        ctx.drawImage(s.img, fx, fy, fw, fh, 0, 0, fw, fh); ctx.restore();
      } else ctx.drawImage(s.img, fx, fy, fw, fh, org.x, org.y, fw, fh);
    }

    // Sólidos de objetos: el mismo helper que usa WorldMap.rebuildSolids.
    const boxes = [];
    let outside = 0;
    // La caja de municiones: la arena le agrega un sólido de 16x16 desde la
    // marca (fix 1A, C2); sin esto el mapa de calor pinta de verde 3-4
    // baldosas que en el juego frenan.
    if (map.crate) boxes.push({ x: map.crate.x - 8, y: map.crate.y - 8, w: 16, h: 16, id: 'caja_municiones', sprite: 'crate' });
    for (const o of map.objects) {
      if (!o.solid) continue;
      const size = SIZE[o.sprite];
      if (!size) continue;
      const trim = trimOf(o.sprite);
      // Antes del fix 1B: todo el rect de baldosas del objeto, sin offset.
      const s = legacy
        ? { x: o.x * 16, y: o.y * 16, w: o.tw * 16, h: o.th * 16 }
        : solidRectFor(o, size, trim);
      if (!s) continue;
      const d = { ...drawOrigin(o, size), w: size[0], h: size[1] };
      if (s.x < d.x || s.y < d.y || s.x + s.w > d.x + d.w || s.y + s.h > d.y + d.h) outside += 1;
      boxes.push({ ...s, id: o.id, sprite: o.sprite });
    }
    ctx.fillStyle = 'rgba(255, 30, 30, 0.38)';
    for (const b of boxes) ctx.fillRect(b.x, b.y, b.w, b.h);
    // Baldosas sólidas: magenta más suave, para distinguir.
    const SOLID = ['black', 'grass_', 'estatica_'];
    const solidName = (n) => SOLID.some((p) => n === p || n.startsWith(p));
    ctx.fillStyle = 'rgba(255, 80, 220, 0.30)';
    for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) {
      if (solidName(map.floor[y][x])) ctx.fillRect(x * 16, y * 16, 16, 16);
    }

    // BFS con la caja de los pies del jugador (10x6), sin three.
    const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    const isSolidBox = (box) => {
      for (const b of boxes) if (overlaps(box, b)) return true;
      const x0 = Math.floor(box.x / 16); const x1 = Math.floor((box.x + box.w - 0.01) / 16);
      const y0 = Math.floor(box.y / 16); const y1 = Math.floor((box.y + box.h - 0.01) / 16);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        if (x < 0 || y < 0 || x >= map.cols || y >= map.rows) return true;
        if (solidName(map.floor[y][x])) return true;
      }
      return false;
    };
    const free = Array.from({ length: map.rows }, () => new Uint8Array(map.cols));
    for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) {
      const box = { x: x * 16 + 8 - 5, y: y * 16 + 12 - 6, w: 10, h: 6 };
      free[y][x] = isSolidBox(box) ? 0 : 1;
    }
    const sx = Math.floor(map.spawn.x / 16); const sy = Math.floor(map.spawn.y / 16);
    const seen = Array.from({ length: map.rows }, () => new Uint8Array(map.cols));
    const q = [[sx, sy]]; seen[sy][sx] = 1;
    let reach = free[sy][sx] ? 1 : 0;
    while (q.length) {
      const [x, y] = q.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx; const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= map.cols || ny >= map.rows || seen[ny][nx] || !free[ny][nx]) continue;
        seen[ny][nx] = 1; reach += 1; q.push([nx, ny]);
      }
    }
    let freeCount = 0;
    for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) freeCount += free[y][x];

    // Heatmap: verde alcanzable, rojo no alcanzable, azul sólido.
    const heat = document.createElement('canvas');
    heat.width = W; heat.height = H;
    const hctx = heat.getContext('2d');
    hctx.fillStyle = '#0e1218'; hctx.fillRect(0, 0, W, H);
    for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) {
      hctx.fillStyle = !free[y][x] ? '#243040' : (seen[y][x] ? '#28c878' : '#e03030');
      hctx.fillRect(x * 16, y * 16, 16, 16);
    }
    hctx.strokeStyle = '#ffffff'; hctx.lineWidth = 2;
    hctx.strokeRect(sx * 16, sy * 16, 16, 16);

    const style = {
      position: 'fixed', left: '0', top: '0', zIndex: '99999', imageRendering: 'pixelated',
    };
    canvas.id = 'diag-map';
    Object.assign(canvas.style, style);
    document.body.appendChild(canvas);
    heat.id = 'diag-heat';
    // Tapado hasta el final: si no, tapa al mapa en la captura del barrio.
    Object.assign(heat.style, style, { display: 'none' });
    document.body.appendChild(heat);
    // Lienzo reutilizable para recortar una pieza a la vez.
    const piece = document.createElement('canvas');
    piece.id = 'diag-piece';
    piece.width = 320; piece.height = 320;
    Object.assign(piece.style, style, { display: 'none' });
    document.body.appendChild(piece);
    window.__diag = { canvas, heat, piece };

    // Hueco del paso a nivel, en coordenadas locales de la pieza de vías:
    // borde derecho del último alambrado de la izquierda y borde izquierdo
    // del primero de la derecha. Se compara con las baldosas del tablón.
    const vias = cells.find((c) => c.type === 'vias');
    let gap = null;
    let tablon = null;
    if (vias) {
      const X = vias.col * 320;
      const Y = vias.row * 320;
      const fence = boxes
        .filter((b) => b.sprite === 'alambrado')
        .map((b) => ({ x: b.x - X, r: b.x + b.w - X }))
        .filter((b) => b.x >= 0 && b.r <= 320);
      if (fence.length) {
        const leftEdge = Math.max(...fence.filter((b) => b.x < 160).map((b) => b.r), 0);
        const rightEdge = Math.min(...fence.filter((b) => b.x >= 160).map((b) => b.x), 1e9);
        gap = [leftEdge, rightEdge];
      }
      const cols = [];
      for (let ty = 0; ty < map.rows; ty++) {
        for (let tx = X / 16; tx < X / 16 + 20; tx++) {
          if (map.floor[ty] && map.floor[ty][tx] === 'via_tablon_0') cols.push(tx * 16 - X);
        }
      }
      if (cols.length) tablon = [Math.min(...cols), Math.max(...cols) + 16];
    }
    return {
      W, H, cells, objects: map.objects.length, boxes: boxes.length, outside,
      freeCount, reach, spawn: { x: sx, y: sy }, gap, tablon,
    };
  }, { seed: SEED, legacy: LEGACY });

  console.log(`barrio ${info.W}x${info.H}: ${info.objects} objetos, ${info.boxes} sólidos AABB`);
  console.log(`sólidos fuera del dibujo: ${info.outside}`);
  if (info.gap) {
    console.log(`hueco del paso a nivel: ${info.gap[0]}..${info.gap[1]} (${info.gap[1] - info.gap[0]} px)`);
    console.log(`tablon del paso: ${info.tablon ? info.tablon.join('..') : 'no hay vias en esta semilla'}`);
  } else console.log('la semilla no tiene pieza de vías: no se mide el cruce');
  console.log(`caminable: ${info.reach}/${info.freeCount} (${(100 * info.reach / info.freeCount).toFixed(1)}%)`);

  // Barrio entero.
  await page.locator('#diag-map').screenshot({ path: path.join(OUT, 'diag_solidos_barrio.png') });

  // Recorte por celda (cada pieza) sin depender de coordenadas de clip:
  // se copia la región al lienzo #diag-piece y se captura ese elemento.
  const seenTypes = new Set();
  const shoot = async (cell, file) => {
    await page.evaluate(({ x, y }) => {
      const { canvas, piece } = window.__diag;
      const g = piece.getContext('2d');
      g.clearRect(0, 0, piece.width, piece.height);
      g.drawImage(canvas, x, y, piece.width, piece.height, 0, 0, piece.width, piece.height);
      canvas.style.display = 'none';
      piece.style.display = 'block';
    }, { x: cell.col * 320, y: cell.row * 320 });
    await page.locator('#diag-piece').screenshot({ path: file });
  };
  for (const cell of info.cells) {
    const suffix = `${cell.type}${cell.col},${cell.row}${cell.openSouth ? '_s' : ''}`;
    await shoot(cell, path.join(OUT, `diag_solidos_${suffix}.png`));
    if (!seenTypes.has(cell.type)) {
      seenTypes.add(cell.type);
      await shoot(cell, path.join(OUT, `diag_solidos_${cell.type}.png`));
    }
  }

  // El heatmap.
  await page.evaluate(() => {
    const { canvas, heat, piece } = window.__diag;
    canvas.style.display = 'none';
    piece.style.display = 'none';
    heat.style.display = 'block';
  });
  await page.locator('#diag-heat').screenshot({ path: path.join(OUT, 'diag_caminable.png') });

  for (const f of fs.readdirSync(OUT).filter((n) => n.startsWith('diag_'))) {
    const bytes = fs.statSync(path.join(OUT, f)).size;
    if (bytes < 1200) { console.error(`ERROR: ${f} pesa ${bytes} bytes`); exitCode = 1; }
  }
  if (info.outside > 0) { console.error(`ERROR: ${info.outside} sólidos fuera del dibujo`); exitCode = 1; }
  if (info.gap && info.gap[1] - info.gap[0] !== 48) {
    console.error(`ERROR: el cruce mide ${info.gap[1] - info.gap[0]} px (esperado 48)`);
    exitCode = 1;
  }
} catch (err) {
  console.error('ERROR:', err.message || err);
  exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  if (vite) {
    try { process.kill(-vite.pid, 'SIGTERM'); } catch { vite.kill('SIGTERM'); }
    for (let i = 0; i < 20 && await up(); i++) await sleep(200);
  }
  process.exit(exitCode);
}
