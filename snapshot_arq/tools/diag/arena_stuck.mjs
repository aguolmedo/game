// DIAGNÓSTICO (no toca el juego): verifica que los cascarudos RODEEN la pared
// vertical de la ferretería de la esquina (semilla 3455) y lleguen hasta Juan;
// guarda docs/capturas/diag_atasco.png. Uso: node tools/diag/arena_stuck.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'docs/capturas/diag_atasco.png');
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

let vite = null; let browser = null; let exitCode = 0;
try {
  if (await up()) console.log('vite ya estaba en 5199, lo reuso');
  else {
    vite = spawn('npx', ['vite', '--port', '5199', '--strictPort'], { cwd: ROOT, detached: true, stdio: 'ignore' });
    if (!(await waitServer())) throw new Error('vite no respondio');
  }
  browser = await chromium.launch({ executablePath: CHROME, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1400, height: 800 } });
  page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__eternauta && window.__eternauta.state, null, { timeout: 30000 });

  // Entrar al minijuego de la arena (no toca el save del dueño).
  await page.evaluate(() => window.__eternauta.game.startArena({ minigame: true }));
  await page.waitForFunction(() => window.__eternauta.state().scene === 'arena', null, { timeout: 30000 });
  await sleep(800);

  const info = await page.evaluate(() => {
    const sc = window.__eternauta.game.scene;
    // Mundo determinista y conocido: semilla 3455 (esquina en col1,row1).
    sc.seed = 3455; sc.seedBuilt = 3455;
    sc.rebuildWorld(3455);
    sc.resetRun();
    sc.phase = 'active';
    sc.spawned = sc.cfg.total; // que no aparezcan oleadas durante la prueba
    // Fix 2: (330,480) quedo dentro de la medianera nueva del fondo; el
    // jugador va a la vereda oeste de la ferreteria, con la pared en el medio.
    sc.player.place(340, 540, 'right');
    sc.invuln = 999;            // sólo mirar: que no lo muerdan
    sc.cam = sc.world.cameraFor(sc.player.x, sc.player.feet - 18);
    const ys = [440, 460, 480, 500, 510];
    for (const y of ys) sc.spawnEnemy('cascarudo', 500, y);
    sc.toast('DIAG: 5 cascarudos rodean la ferretería hasta Juan', 20);
    return { shopSolid: true, player: { x: sc.player.x, y: sc.player.feet } };
  });
  await sleep(14000);
  const st = await page.evaluate(() => {
    const sc = window.__eternauta.game.scene;
    const alive = sc.enemies.filter((e) => !e.dead);
    // Anotación del diagnóstico: círculos sobre los bichos y sobre Juan.
    const vp = window.__eternauta.viewport;
    const canvas = document.querySelector('canvas');
    const rect = canvas.getBoundingClientRect();
    const px = vp.worldPx;
    const sx = rect.left;
    const ann = document.createElement('canvas');
    ann.width = window.innerWidth; ann.height = window.innerHeight;
    Object.assign(ann.style, { position: 'fixed', left: '0', top: '0', zIndex: '99999', pointerEvents: 'none' });
    document.body.appendChild(ann);
    const g = ann.getContext('2d');
    const toScreen = (x, y) => ({ x: sx + (x - sc.cam.x) * px, y: rect.top + (y - sc.cam.y) * px });
    g.lineWidth = 3; g.font = 'bold 18px monospace';
    for (const e of alive) {
      const p = toScreen(e.x, e.y - e.h / 2);
      const d = Math.hypot(e.x - sc.player.x, e.y - sc.player.feet);
      g.strokeStyle = d > 80 ? '#ff3030' : '#30e0ff'; // rojo = trabado, cian = llegó/zona
      g.beginPath(); g.arc(p.x, p.y, 16, 0, Math.PI * 2); g.stroke();
    }
    const pp = toScreen(sc.player.x, sc.player.feet - 10);
    g.strokeStyle = '#30e0ff'; g.beginPath(); g.arc(pp.x, pp.y, 18, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#30e0ff'; g.fillText('Juan', pp.x + 22, pp.y + 6);
    return {
      state: sc.state(),
      enemies: alive.map((e) => ({ x: +e.x.toFixed(1), y: +e.y.toFixed(1), dist: +Math.hypot(e.x - sc.player.x, e.y - sc.player.feet).toFixed(1) })),
    };
  });
  await sleep(300);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  await page.screenshot({ path: OUT });
  const bytes = fs.statSync(OUT).size;
  console.log('info', JSON.stringify(info));
  console.log('enemigos', JSON.stringify(st.enemies));
  console.log('captura', path.relative(ROOT, OUT), bytes, 'bytes');
  if (bytes < 5000) { console.error('ERROR: captura vacía'); exitCode = 1; }
  const stuck = st.enemies.filter((e) => e.dist > 80).length;
  console.log(`llegaron: ${st.enemies.length - stuck}/${st.enemies.length}, trabados (>80 px): ${stuck}`);
  if (stuck > 0) { console.error('ERROR: quedan bichos trabados (>80 px)'); exitCode = 1; }
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
