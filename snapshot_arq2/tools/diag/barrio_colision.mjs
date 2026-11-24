// DIAGNÓSTICO (no toca el juego): colisiones del barrio contra el dibujo.
// Uso: node tools/diag/barrio_colision.mjs (semilla 3455, minijuego, sin save).
// Camina contra el busto de la plaza (vertical) y contra un auto (lateral) con
// pasos finos y compara el freno con el borde dibujado (tolerancia 1 px).
// Guarda docs/capturas/diag_colision_busto.png, diag_colision_auto.png y
// diag_barrio_juego.png.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { chromium } from 'playwright-core';

const ROOT = '/home/mateyfasito/dev/game/eternauta';
const OUT = path.join(ROOT, 'docs/capturas');
const URL = 'http://localhost:5199/';
const CHROME = process.env.HOME + '/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function up() {
  try {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 800);
    const res = await fetch(URL, { signal: c.signal }); clearTimeout(t); return res.ok;
  } catch { return false; }
}
let vite = null; let browser = null;
try {
  if (!(await up())) {
    vite = spawn('npx', ['vite', '--port', '5199', '--strictPort'], { cwd: ROOT, detached: true, stdio: 'ignore' });
    for (let i = 0; i < 100 && !(await up()); i++) await sleep(300);
  }
  browser = await chromium.launch({ executablePath: CHROME, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__eternauta && window.__eternauta.state, null, { timeout: 30000 });
  await page.evaluate(() => window.__eternauta.game.startArena({ minigame: true }));
  await page.waitForFunction(() => window.__eternauta.state().scene === 'arena', null, { timeout: 30000 });
  await sleep(600);

  const start = await page.evaluate(() => {
    const sc = window.__eternauta.game.scene;
    sc.seed = 3455; sc.seedBuilt = 3455;
    sc.rebuildWorld(3455);
    sc.resetRun();
    sc.phase = 'active';
    sc.spawned = sc.cfg.total;
    sc.invuln = 9999;
    sc.bannerT = 0;             // sin cartel de ronda en la captura
    sc.toasts = [];
    const objs = sc.world.map.objects;
    const solidOf = (sprite) => {
      const o = objs.find((x) => x.sprite === sprite);
      const s = sc.world.solids.find((b) => b.id === o.id);
      return { sprite, ...s };
    };
    const free = (x, feet) => !sc.world.isSolid({
      x: x - 5, y: feet - 6, w: 10, h: 6,
    });
    // Punto libre a `dist` px por encima/debajo del sólido.
    const startAbove = (s, dist) => {
      const x = s.x + s.w / 2;
      for (let k = dist; k < dist + 64; k += 4) if (free(x, s.y + s.h + k)) return { x, feet: s.y + s.h + k };
      return null;
    };
    const startLeft = (s, dist) => {
      const feet = s.y + s.h / 2;
      for (let k = dist; k < dist + 64; k += 4) if (free(s.x - k, feet)) return { x: s.x - k, feet };
      return null;
    };
    const busto = solidOf('busto');
    const auto = solidOf('auto_parado');
    return {
      busto, auto, up: startAbove(busto, 40), side: startLeft(auto, 40),
      solids: sc.world.solids.length,
    };
  });
  console.log('sólidos', start.solids, '| busto', JSON.stringify(start.busto), '| auto', JSON.stringify(start.auto));
  console.log('inicio vertical', JSON.stringify(start.up), '| inicio lateral', JSON.stringify(start.side));

  // A) vertical: caminar hacia arriba contra el busto.
  await page.evaluate(({ s, p }) => {
    const sc = window.__eternauta.game.scene;
    sc.player.place(p.x, p.feet, 'up');
    sc.player.setFrozen(false);
    sc.cam = sc.world.cameraFor(sc.player.x, sc.player.feet - 18);
  }, { s: start.busto, p: start.up });
  await sleep(200);
  await page.keyboard.down('ArrowUp');
  await sleep(2000);
  await page.keyboard.up('ArrowUp');
  await sleep(150);
  const upRes = await page.evaluate(async (s) => {
    const sc = window.__eternauta.game.scene;
    const { resolveMove } = await import('/src/movement.js');
    // Camino determinista con pasos finos (los fps de swiftshader son bajos).
    let pos = { x: s.x + s.w / 2, feet: s.y + s.h + 40 };
    for (let i = 0; i < 4000; i += 1) {
      const next = resolveMove(pos, { x: 0, y: -1 }, 1 / 480, 72, null, (b) => sc.world.isSolid(b));
      if (next.blockedY) break;
      pos = next;
    }
    return { feet: pos.feet, want: s.y + s.h + 6, walked: sc.player.feet };
  }, start.busto);
  await page.evaluate(() => {
    const sc = window.__eternauta.game.scene;
    sc.bannerT = 0; sc.toasts = []; sc.player.setFrozen(true);
  });
  await sleep(300);
  await page.screenshot({ path: path.join(OUT, 'diag_colision_busto.png') });
  console.log(`vertical (pasos finos): pies=${upRes.feet.toFixed(2)} esperado=${upRes.want} err=${(upRes.feet - upRes.want).toFixed(2)} | teclado llegó a ${upRes.walked.toFixed(1)}`);

  // B) lateral: caminar hacia la derecha contra el auto.
  await page.evaluate(({ s, p }) => {
    const sc = window.__eternauta.game.scene;
    sc.player.place(p.x, p.feet, 'right');
    sc.player.setFrozen(false);
    sc.cam = sc.world.cameraFor(sc.player.x, sc.player.feet - 18);
  }, { s: start.auto, p: start.side });
  await sleep(200);
  await page.keyboard.down('ArrowRight');
  await sleep(2000);
  await page.keyboard.up('ArrowRight');
  await sleep(150);
  const sideRes = await page.evaluate(async (s) => {
    const sc = window.__eternauta.game.scene;
    const { resolveMove } = await import('/src/movement.js');
    let pos = { x: s.x - 40, feet: s.y + s.h / 2 };
    for (let i = 0; i < 4000; i += 1) {
      const next = resolveMove(pos, { x: 1, y: 0 }, 1 / 480, 72, null, (b) => sc.world.isSolid(b));
      if (next.blockedX) break;
      pos = next;
    }
    return { x: pos.x, want: s.x - 5, walked: sc.player.x };
  }, start.auto);
  await page.evaluate(() => {
    const sc = window.__eternauta.game.scene;
    sc.bannerT = 0; sc.toasts = []; sc.player.setFrozen(true);
  });
  await sleep(300);
  await page.screenshot({ path: path.join(OUT, 'diag_colision_auto.png') });
  console.log(`lateral (pasos finos): x=${sideRes.x.toFixed(2)} esperado=${sideRes.want} err=${(sideRes.x - sideRes.want).toFixed(2)} | teclado llegó a ${sideRes.walked.toFixed(1)}`);

  // C) barrio en juego, sin anotaciones (mira que se dibuje todo).
  await page.evaluate(() => {
    const sc = window.__eternauta.game.scene;
    sc.player.place(370, 505, 'up');
    sc.cam = sc.world.cameraFor(sc.player.x, sc.player.feet - 18);
    sc.bannerT = 0; sc.toasts = []; sc.player.setFrozen(true);
  });
  await sleep(600);
  await page.screenshot({ path: path.join(OUT, 'diag_barrio_juego.png') });
  const ok = Math.abs(upRes.feet - upRes.want) <= 1 && Math.abs(sideRes.x - sideRes.want) <= 1
    && upRes.walked < upRes.want + 20 && sideRes.walked < sideRes.want + 20;
  console.log(ok ? 'OK colisiones' : 'ERROR colisiones');
  process.exitCode = ok ? 0 : 1;
} catch (e) {
  console.error('ERROR', e.message);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  if (vite) { try { process.kill(-vite.pid, 'SIGTERM'); } catch { vite.kill('SIGTERM'); } }
}
