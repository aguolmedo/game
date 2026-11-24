// DIAGNÓSTICO (no toca el juego): ¿pasa un acorazado por el paso a nivel de
// las vías (hueco real 31px) en la semilla 8? Mide 20 s de persecución.
import { spawn } from 'node:child_process';
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
    for (const [type, y] of [['acorazado', 300], ['cascarudo', 300], ['cascarudo', 420], ['acorazado', 420]]) {
      const e = sc.spawnEnemy(type, 488, y); es.push(e);
    }
    return es.map((e) => ({ type: e.type, x: e.x, y: e.y, d0: +Math.hypot(e.x - sc.player.x, e.y - sc.player.feet).toFixed(1) }));
  });
  await sleep(20000);
  const res = await page.evaluate(() => {
    const sc = window.__eternauta.game.scene;
    return sc.enemies.filter((e) => !e.dead).map((e) => ({ type: e.type, x: +e.x.toFixed(1), y: +e.y.toFixed(1), d: +Math.hypot(e.x - sc.player.x, e.y - sc.player.feet).toFixed(1), bite: sc.player.integrity }));
  });
  console.log('inicio', JSON.stringify(cases));
  console.log('a los 20 s', JSON.stringify(res));
  const passed = res.filter((e) => e.d < 40).length;
  console.log(`llegaron al jugador: ${passed}/${res.length}`);
  if (passed === 0) { console.error('CONFIRMADO: ninguno cruzó el paso a nivel'); exitCode = 1; }
} catch (err) { console.error('ERROR:', err.message || err); exitCode = 1; }
finally {
  if (browser) await browser.close().catch(() => {});
  if (vite) { try { process.kill(-vite.pid, 'SIGTERM'); } catch { vite.kill('SIGTERM'); } for (let i = 0; i < 20 && await up(); i++) await sleep(200); }
  process.exit(exitCode);
}
