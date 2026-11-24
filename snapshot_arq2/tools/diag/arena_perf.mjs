// DIAGNÓSTICO (no toca el juego): mide en headless el costo de update/draw y
// cuántos meshes/texturas quedan tras 3 reinicios de buildWorld.
// Uso: node tools/diag/arena_perf.mjs
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const URL = 'http://localhost:5199/';
const CHROME = process.env.HOME + '/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function up(timeout = 800) {
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeout);
    const res = await fetch(URL, { signal: ctl.signal }); clearTimeout(t); return res.ok;
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
  await page.evaluate(() => window.__eternauta.game.startArena({ minigame: true }));
  await page.waitForFunction(() => window.__eternauta.state().scene === 'arena', null, { timeout: 30000 });
  await sleep(1500);

  const counts = () => page.evaluate(() => {
    const sc = window.__eternauta.game.scene;
    let meshes = 0; let visible = 0; let groups = 0; let empty = 0;
    const textures = new Set(); const geos = new Set(); const mats = new Set();
    sc.scene.traverse((o) => {
      if (o.isGroup) groups++;
      if (!o.isMesh) return;
      meshes++;
      if (o.visible) visible++;
      if (o.geometry) geos.add(o.geometry.uuid);
      const list = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of list) {
        if (!m) continue;
        mats.add(m.uuid);
        if (m.map) textures.add(m.map.uuid);
      }
    });
    return {
      children: sc.scene.children.length,
      meshes, visibleMeshes: visible, groups, geos: geos.size, materials: mats.size, textures: textures.size,
      heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null,
      objects: sc.mapData ? sc.mapData.objects.length : 0,
    };
  });

  const base = await counts();
  console.log('estado base (1 mundo):', JSON.stringify(base));

  // 3 reinicios de buildWorld con semillas distintas.
  for (const seed of [101, 202, 303]) {
    await page.evaluate((s) => {
      const sc = window.__eternauta.game.scene;
      sc.seed = s; sc.seedBuilt = s; sc.rebuildWorld(s); sc.resetRun();
    }, seed);
    await sleep(300);
  }
  const after3 = await counts();
  console.log('tras 3 reinicios:    ', JSON.stringify(after3));

  // Medir update() y drawHud() con 40 bichos.
  const perf = await page.evaluate(async () => {
    const sc = window.__eternauta.game.scene;
    sc.phase = 'active'; sc.spawned = sc.cfg.total;
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      sc.spawnEnemy(i % 7 === 0 ? 'acorazado' : 'cascarudo',
        sc.player.x + Math.cos(a) * 140, sc.player.feet + Math.sin(a) * 140);
    }
    sc.invuln = 999;
    const times = []; const hud = [];
    const oUpdate = sc.update.bind(sc);
    const oHud = sc.drawHud.bind(sc);
    sc.update = (dt, input) => { const t = performance.now(); oUpdate(dt, input); times.push(performance.now() - t); };
    sc.drawHud = (input) => { const t = performance.now(); oHud(input); hud.push(performance.now() - t); };
    await new Promise((r) => setTimeout(r, 2500));
    sc.update = oUpdate; sc.drawHud = oHud;
    const avg = (a) => +(a.reduce((x, y) => x + y, 0) / Math.max(1, a.length)).toFixed(3);
    const p95 = (a) => { const b = [...a].sort((x, y) => x - y); return +(b[Math.min(b.length - 1, Math.floor(b.length * 0.95))] || 0).toFixed(3); };
    return {
      frames: times.length,
      updateAvgMs: avg(times), updateP95Ms: p95(times),
      drawHudAvgMs: avg(hud), drawHudP95Ms: p95(hud),
      alive: sc.aliveCount(),
      enemiesInList: sc.enemies.length,
      solidBoxes: sc.solidBoxes.length,
      fx: sc.fx.length,
      footprints: sc.footprints.items.length,
    };
  });
  console.log('perf 40 bichos:      ', JSON.stringify(perf));

  // FPS de rAF (indicativo, swiftshader).
  const fps = await page.evaluate(() => new Promise((resolve) => {
    const t = []; let last = performance.now();
    function frame(now) { t.push(now - last); last = now; if (t.length < 120) requestAnimationFrame(frame); else resolve(t); }
    requestAnimationFrame(frame);
  }));
  const avgF = fps.reduce((a, b) => a + b, 0) / fps.length;
  console.log('rAF promedio:        ', `frame ${avgF.toFixed(2)} ms (~${(1000 / avgF).toFixed(1)} fps, swiftshader)`);
  if (after3.meshes > base.meshes + 50) { console.error('POSIBLE FUGA: meshes crecieron', base.meshes, '->', after3.meshes); exitCode = 1; }
  // Desde el batch estático (P2) el mundo son ~50 mallas aunque haya 300+ objetos.
  if (base.meshes < 20) { console.error('ERROR: escena sin meshes'); exitCode = 1; }
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
