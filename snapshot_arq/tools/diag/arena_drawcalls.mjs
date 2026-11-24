// DIAGNÓSTICO (no toca el juego): cuenta draw calls reales por frame envolviendo
// WebGLRenderingContext/WebGL2RenderingContext con page.addInitScript.
// Uso: node tools/diag/arena_drawcalls.mjs
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const URL = 'http://localhost:5199/';
const CHROME = process.env.HOME + '/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function up(timeout = 800) { try { const c = new AbortController(); const t = setTimeout(() => c.abort(), timeout); const r = await fetch(URL, { signal: c.signal }); clearTimeout(t); return r.ok; } catch { return false; } }
async function waitServer(ms = 30000) { const u = Date.now() + ms; while (Date.now() < u) { if (await up()) return true; await sleep(300); } return false; }

let vite = null; let browser = null; let exitCode = 0;
try {
  if (await up()) console.log('vite ya estaba en 5199, lo reuso');
  else { vite = spawn('npx', ['vite', '--port', '5199', '--strictPort'], { cwd: ROOT, detached: true, stdio: 'ignore' }); if (!(await waitServer())) throw new Error('vite no respondio'); }
  browser = await chromium.launch({ executablePath: CHROME, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1400, height: 800 } });
  page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
  await page.addInitScript(() => {
    window.__glDraws = 0;
    const wrap = (C) => {
      if (!C) return;
      for (const m of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
        const orig = C.prototype[m];
        if (typeof orig !== 'function') continue;
        C.prototype[m] = function (...args) { window.__glDraws += 1; return orig.apply(this, args); };
      }
    };
    wrap(window.WebGLRenderingContext);
    wrap(window.WebGL2RenderingContext);
  });
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__eternauta && window.__eternauta.state, null, { timeout: 30000 });
  await page.evaluate(() => window.__eternauta.game.startArena({ minigame: true }));
  await page.waitForFunction(() => window.__eternauta.state().scene === 'arena', null, { timeout: 30000 });
  await sleep(1000);
  const measure = async (label) => {
    const r = await page.evaluate(() => new Promise((resolve) => {
      const samples = [];
      let last = window.__glDraws;
      let frames = 0;
      function tick() {
        const now = window.__glDraws;
        samples.push(now - last);
        last = now;
        frames++;
        if (frames < 45) requestAnimationFrame(tick);
        else resolve({ samples, state: window.__eternauta.game.scene.state() });
      }
      requestAnimationFrame(tick);
    }));
    const s = r.samples.filter((x) => x > 0);
    const avg = s.reduce((a, b) => a + b, 0) / Math.max(1, s.length);
    console.log(`${label}: drawCalls/frame avg=${avg.toFixed(1)} min=${Math.min(...s)} max=${Math.max(...s)} (${s.length} frames), bichos=${r.state.alive}`);
    return avg;
  };
  const idle = await measure('barrio sin bichos');
  await page.evaluate(() => {
    const sc = window.__eternauta.game.scene;
    sc.phase = 'active'; sc.spawned = sc.cfg.total; sc.invuln = 999;
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      sc.spawnEnemy(i % 7 === 0 ? 'acorazado' : 'cascarudo',
        sc.player.x + Math.cos(a) * 140, sc.player.feet + Math.sin(a) * 140);
    }
  });
  await sleep(1200);
  const with40 = await measure('con 40 bichos');
  console.log(`delta por bicho ≈ ${((with40 - idle) / 40).toFixed(2)} draw calls`);
  if (with40 < 50) { console.error('ERROR: medición sospechosa'); exitCode = 1; }
} catch (err) { console.error('ERROR:', err.message || err); exitCode = 1; }
finally {
  if (browser) await browser.close().catch(() => {});
  if (vite) { try { process.kill(-vite.pid, 'SIGTERM'); } catch { vite.kill('SIGTERM'); } for (let i = 0; i < 20 && await up(); i++) await sleep(200); }
  process.exit(exitCode);
}
