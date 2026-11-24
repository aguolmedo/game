// DIAGNÓSTICO (no toca el juego): ¿buildWorld libera todo? Reinicia la misma
// semilla 3 veces y compara meshes/texturas; revisa la textura compartida de glow.
// Uso: node tools/diag/arena_rebuild.mjs
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
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__eternauta && window.__eternauta.state, null, { timeout: 30000 });
  await page.evaluate(() => window.__eternauta.game.startArena({ minigame: true }));
  await page.waitForFunction(() => window.__eternauta.state().scene === 'arena', null, { timeout: 30000 });
  await sleep(800);

  const out = await page.evaluate(async () => {
    const sc = window.__eternauta.game.scene;
    const count = () => {
      let meshes = 0; let visible = 0; const tex = new Set(); const geo = new Set(); const mat = new Set();
      sc.scene.traverse((o) => {
        if (!o.isMesh) return; meshes++; if (o.visible) visible++;
        if (o.geometry) geo.add(o.geometry.uuid);
        const list = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of list) { if (!m) continue; mat.add(m.uuid); if (m.map) tex.add(m.map.uuid); }
      });
      return { children: sc.scene.children.length, meshes, visible, geo: geo.size, mat: mat.size, tex: tex.size, objects: sc.mapData.objects.length };
    };
    sc.seed = 3455; sc.seedBuilt = 3455; sc.rebuildWorld(3455); sc.resetRun();
    const runs = [count()];

    // Textura compartida de glow (singleton en sprite.js).
    const glowObjs = sc.mapData.objects.filter((o) => o.glow && o.glowMesh);
    const oldGlow = glowObjs.length ? glowObjs[0].glowMesh.material.map : null;
    let disposed = false;
    if (oldGlow) oldGlow.addEventListener('dispose', () => { disposed = true; });
    // Footprints: 120 huellas para ver cuántos items viven a la vez.
    for (let i = 0; i < 120; i++) { sc.footprints.spawn(sc.player); }
    const fpAfter = sc.footprints.items.length;

    for (let i = 0; i < 3; i++) {
      sc.rebuildWorld(3455); sc.resetRun();
      runs.push(count());
    }
    const newGlowObjs = sc.mapData.objects.filter((o) => o.glow && o.glowMesh);
    const newGlow = newGlowObjs.length ? newGlowObjs[0].glowMesh.material.map : null;
    return {
      runs,
      glowCount: glowObjs.length,
      glowSameObjectAfterRebuild: oldGlow === newGlow,
      glowTextureDisposedByDisposeWorld: disposed,
      footprintsAliveAfter120Spawns: fpAfter,
      footprintMax: sc.footprints.max,
    };
  });
  console.log(JSON.stringify(out, null, 2));
  const [a, , , d] = out.runs;
  if (d.meshes !== a.meshes || d.tex !== a.tex) { console.error('FUGA: mismo set cambiado', a, d); exitCode = 1; }
  if (out.glowTextureDisposedByDisposeWorld) { console.log('OJO: disposeWorld dispuso la textura compartida de glow'); }
} catch (err) { console.error('ERROR:', err.message || err); exitCode = 1; }
finally {
  if (browser) await browser.close().catch(() => {});
  if (vite) { try { process.kill(-vite.pid, 'SIGTERM'); } catch { vite.kill('SIGTERM'); } for (let i = 0; i < 20 && await up(); i++) await sleep(200); }
  process.exit(exitCode);
}
