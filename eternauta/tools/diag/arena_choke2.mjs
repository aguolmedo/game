// DIAGNÓSTICO (no toca el juego): ¿pasa un acorazado por el paso a nivel de
// las vías (hueco real 31px) en la semilla 8? Mide 20 s de persecución.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const URL = 'http://localhost:5199/';
const CHROME = process.env.HOME + '/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function up(t = 800) { try { const c = new AbortController(); const x = setTimeout(() => c.abort(), t); const r = await fetch(URL, { signal: c.signal }); clearTimeout(x); return r.ok; } catch { return false; } }
async function waitServer(ms = 30000) { const u = Date.now() + ms; while (Date.now() < u) { if (await up()) return true; await sleep(300); } return false; }
let vite = null; let browser = null; let exitCode = 0;
try {
  if (await up()) console.log('vite ya estaba en 5199, lo reuso');
  else { vite = spawn('npx', ['vite', '--port', '5199', '--strictPort'], { cwd: ROOT, detached: true, stdio: 'ignore' }); if (!(await waitServer())) throw new Error('vite no respondio'); }
  browser = await chromium.launch({ executablePath: CHROME, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__eternauta && window.__eternauta.state, null, { timeout: 30000 });
  await page.evaluate(() => window.__eternauta.game.startArena({ minigame: true }));
  await page.waitForFunction(() => window.__eternauta.state().scene === 'arena', null, { timeout: 30000 });
  await sleep(800);
  const cases = await page.evaluate(() => {
    const sc = window.__eternauta.game.scene;
    sc.seed = 8; sc.seedBuilt = 8; sc.rebuildWorld(8); sc.resetRun();
    sc.phase = 'active'; sc.spawned = sc.cfg.total; sc.invuln = 999;
    sc.player.place(488, 530, 'up');
    sc.enemies = [];
    const es = [];
    // (504,136) quedó dentro de un sólido tras el fix 1B: se usa un punto
    // válido al norte del paso a nivel, misma zona.
    for (const [type, x, y] of [['acorazado', 416, 356], ['acorazado', 488, 184], ['acorazado', 586, 266], ['cascarudo', 472, 184]]) {
      const e = sc.spawnEnemy(type, x, y); es.push(e);
    }
    sc.toast('DIAG: acorazados cruzan el paso a nivel', 22);
    return es.map((e) => ({ type: e.type, x: e.x, y: e.y, d0: +Math.hypot(e.x - sc.player.x, e.y - sc.player.feet).toFixed(1) }));
  });
  await sleep(20000);
  const res = await page.evaluate(() => {
    const sc = window.__eternauta.game.scene;
    const alive = sc.enemies.filter((e) => !e.dead);
    const vp = window.__eternauta.viewport;
    const rect = document.querySelector('canvas').getBoundingClientRect();
    const ann = document.createElement('canvas');
    ann.width = window.innerWidth; ann.height = window.innerHeight;
    Object.assign(ann.style, { position: 'fixed', left: '0', top: '0', zIndex: '99999', pointerEvents: 'none' });
    document.body.appendChild(ann);
    const g = ann.getContext('2d');
    const toScreen = (x, y) => ({ x: rect.left + (x - sc.cam.x) * vp.worldPx, y: rect.top + (y - sc.cam.y) * vp.worldPx });
    g.lineWidth = 3; g.font = 'bold 16px monospace';
    for (const e of alive) {
      const p = toScreen(e.x, e.y - e.h / 2);
      const d = Math.hypot(e.x - sc.player.x, e.y - sc.player.feet);
      g.strokeStyle = d < 40 ? '#30e0ff' : '#ff3030';
      g.beginPath(); g.arc(p.x, p.y, e.type === 'acorazado' ? 20 : 14, 0, Math.PI * 2); g.stroke();
    }
    const pp = toScreen(sc.player.x, sc.player.feet - 10);
    g.strokeStyle = '#ffe060'; g.beginPath(); g.arc(pp.x, pp.y, 16, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#ffe060'; g.fillText('Juan', pp.x + 20, pp.y + 5);
    return alive.map((e) => ({ type: e.type, x: +e.x.toFixed(1), y: +e.y.toFixed(1), d: +Math.hypot(e.x - sc.player.x, e.y - sc.player.feet).toFixed(1) }));
  });
  fs.mkdirSync(path.join(ROOT, 'docs/capturas'), { recursive: true });
  await page.screenshot({ path: path.join(ROOT, 'docs/capturas/diag_atasco_acorazado.png') });
  console.log('inicio', JSON.stringify(cases));
  console.log('a los 20 s', JSON.stringify(res));
  const passed = res.filter((e) => e.d < 40).length;
  const stuck = res.filter((e) => e.d > 80).length;
  console.log(`llegaron al jugador: ${passed}/${res.length}, trabados (>80 px): ${stuck}`);
  if (stuck > 0) { console.error('ERROR: quedan bichos trabados'); exitCode = 1; }
} catch (err) { console.error('ERROR:', err.message || err); exitCode = 1; }
finally {
  if (browser) await browser.close().catch(() => {});
  if (vite) { try { process.kill(-vite.pid, 'SIGTERM'); } catch { vite.kill('SIGTERM'); } for (let i = 0; i < 20 && await up(); i++) await sleep(200); }
  process.exit(exitCode);
}
