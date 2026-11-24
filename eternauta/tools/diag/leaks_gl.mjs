// DIAGNÓSTICO (no toca el juego): cuenta buffers/texturas WebGL vivos para
// confirmar las fugas de geometrías/materiales al matar bichos y pisar nieve.
// Uso: node tools/diag/leaks_gl.mjs
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
  browser = await chromium.launch({ executablePath: CHROME, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--js-flags=--expose-gc'] });
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
  await page.addInitScript(() => {
    window.__gl = { buffers: 0, textures: 0, programs: 0 };
    const wrap = (C) => {
      if (!C) return;
      const add = (name, delta) => {
        const orig = C.prototype[name];
        if (typeof orig !== 'function') return;
        C.prototype[name] = function (...a) {
          const r = orig.apply(this, a);
          if (delta > 0) window.__gl[name.includes('Texture') ? 'textures' : name.includes('Program') ? 'programs' : 'buffers'] += 1;
          else if (r === undefined) window.__gl[name.includes('Texture') ? 'textures' : name.includes('Program') ? 'programs' : 'buffers'] -= 1;
          return r;
        };
      };
      add('createBuffer', 1); add('deleteBuffer', -1);
      add('createTexture', 1); add('deleteTexture', -1);
      add('createProgram', 1); add('deleteProgram', -1);
    };
    wrap(window.WebGLRenderingContext);
    wrap(window.WebGL2RenderingContext);
  });
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__eternauta && window.__eternauta.state, null, { timeout: 30000 });
  await page.evaluate(() => window.__eternauta.game.startArena({ minigame: true }));
  await page.waitForFunction(() => window.__eternauta.state().scene === 'arena', null, { timeout: 30000 });
  await sleep(1200);
  const snap = () => page.evaluate(() => ({ ...window.__gl, heap: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null }));
  const base = await snap();
  console.log('base:', JSON.stringify(base));

  const afterEnemies = await page.evaluate(async () => {
    const sc = window.__eternauta.game.scene;
    sc.phase = 'active'; sc.spawned = sc.cfg.total; sc.invuln = 999;
    for (let i = 0; i < 100; i++) sc.spawnEnemy('cascarudo', 100 + (i % 20) * 40, 300 + Math.floor(i / 20) * 30);
    await new Promise((r) => setTimeout(r, 1200));
    return { alive: sc.aliveCount(), meshes: sc.enemies.length };
  });
  await page.evaluate(() => { if (window.gc) window.gc(); });
  await sleep(400);
  const withEnemies = await snap();
  console.log('con 100 bichos:', JSON.stringify(afterEnemies), JSON.stringify(withEnemies));

  await page.evaluate(() => {
    const sc = window.__eternauta.game.scene;
    sc.clearEnemies();
    for (let i = 0; i < 300; i++) sc.footprints.spawn(sc.player);
    for (let i = 0; i < 300; i++) sc.footprints.spawn({ x: 100 + (i % 30) * 10, feet: 400 + (i % 20) });
    if (window.gc) window.gc();
  });
  await sleep(500);
  const afterCleanup = await snap();
  const fp = await page.evaluate(() => window.__eternauta.game.scene.footprints.items.length);
  console.log('tras clearEnemies + 600 huellas (vivas', fp, '):', JSON.stringify(afterCleanup));

  console.log('\nDeltas:');
  console.log('  bichos 100: buffers', withEnemies.buffers - base.buffers, 'textures', withEnemies.textures - base.textures);
  console.log('  al limpiar: buffers', afterCleanup.buffers - base.buffers, 'textures', afterCleanup.textures - base.textures);
  if (afterCleanup.buffers - base.buffers > 20) {
    console.error('CONFIRMADO: buffers GL que no se liberan al matar bichos/pisar nieve');
    exitCode = 1;
  }
} catch (err) { console.error('ERROR:', err.message || err); exitCode = 1; }
finally {
  if (browser) await browser.close().catch(() => {});
  if (vite) { try { process.kill(-vite.pid, 'SIGTERM'); } catch { vite.kill('SIGTERM'); } for (let i = 0; i < 20 && await up(); i++) await sleep(200); }
  process.exit(exitCode);
}
