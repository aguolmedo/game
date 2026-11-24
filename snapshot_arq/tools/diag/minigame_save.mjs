// DIAGNÓSTICO (no toca el juego): ¿el Minijuego escribe en el save real?
// Uso: node tools/diag/minigame_save.mjs
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
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
  const SAVE = {
    v: 1, trajeHecho: true, loop: 2, muertes: 1,
    botin: { chatarra: 7, goma: 3, nafta: 1, pieza: 2 },
    mejoras: { favalli: 1, elena: 0, lucas: 0, luz: 0 },
    mochila: null, best: { round: 3, points: 500 },
  };
  await page.addInitScript((save) => {
    localStorage.setItem('eternauta.save.v1', JSON.stringify(save));
  }, SAVE);
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__eternauta && window.__eternauta.state, null, { timeout: 30000 });
  // Snapshot completo ANTES de entrar: ninguna clave puede cambiar (M1).
  const snapshot = () => page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort()));
  const before = await snapshot();
  await page.evaluate(() => window.__eternauta.game.startArena({ minigame: true }));
  await page.waitForFunction(() => window.__eternauta.state().scene === 'arena', null, { timeout: 30000 });
  await sleep(800);
  const out = await page.evaluate(() => {
    const sc = window.__eternauta.game.scene;
    sc.bag = { chatarra: 5, goma: 0, nafta: 0, pieza: 0 };
    sc.die(); sc.openResult(); sc.pickResult(0); // 'Volver a la casa'
    return { run: window.__eternauta.game.run ? true : false, scene: window.__eternauta.state().scene };
  });
  await sleep(800);
  const after = await snapshot();
  console.log('antes:', before);
  console.log('después:', after);
  console.log('run?', out.run, 'scene', out.scene);
  if (before !== after) { console.error('CONFIRMADO: el Minijuego modificó localStorage'); exitCode = 1; }
} catch (err) { console.error('ERROR:', err.message || err); exitCode = 1; }
finally {
  if (browser) await browser.close().catch(() => {});
  if (vite) { try { process.kill(-vite.pid, 'SIGTERM'); } catch { vite.kill('SIGTERM'); } for (let i = 0; i < 20 && await up(); i++) await sleep(200); }
  process.exit(exitCode);
}
