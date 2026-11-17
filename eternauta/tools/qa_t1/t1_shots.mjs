// T1 (refactor UI/world scene): capturas headless deterministas.
// Uso: node tools/qa_t1/t1_shots.mjs before|after
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = `${process.env.HOME}/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`;
const URL = 'http://localhost:5199/';
const PHASE = process.argv[2] || 'before';
const OUT = `/home/mateyfasito/dev/game/qa/screens-t1-2026-11-17/${PHASE}`;

const SEED = `
(() => {
  let a = 0x9e3779b9 >>> 0;
  Math.random = () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})();
`;

const sleep = (page, ms) => page.waitForTimeout(ms);

async function restoreAll(page) {
  await page.evaluate(() => {
    const scenes = (window.__eternauta && window.__eternauta.scenes) || {};
    for (const sc of Object.values(scenes)) {
      if (sc && sc.__t1Orig) { sc.update = sc.__t1Orig; delete sc.__t1Orig; }
    }
  });
}

async function go(page, name) {
  await restoreAll(page);
  await page.evaluate((n) => window.__eternauta.go(n), name);
  await page.waitForFunction((n) => window.__eternauta.game.sceneName === n, name, { timeout: 10000 });
  await sleep(page, 500);
}

async function clearOverlays(page) {
  await page.evaluate(() => {
    const s = window.__eternauta.game.scene;
    if (!s) return;
    s.dialog?.hide?.();
    s.choice?.hide?.();
    if (s.comic?.open) s.comic.close();
    if (s.caption?.open) {
      s.caption.open = false;
      if (s.captionUi) s.captionUi.mesh.visible = false;
      if (s.captionResolve) { const r = s.captionResolve; s.captionResolve = null; r(); }
    }
    if (s.balloon) s.balloon.open = false;
    if (s.comicUi) s.comicUi.mesh.visible = false;
    if (s.captionUi) s.captionUi.mesh.visible = false;
    if (s.extra) s.extra.mesh.visible = true;
    s.timedBar = null;
  });
}

function freezeBody({ overlay, t }) {
  const g = window.__eternauta.game;
  const s = g.scene;
  if (!s.__t1Orig) s.__t1Orig = s.update;
  s.update = () => {};
  s.t = t;
  if (s.light) {
    s.light.time = t;
    s.light.setMode(g.lightingMode);
    s.light.setCamera(Math.round(s.cam.x), Math.round(s.cam.y));
  }
  if (s.player) {
    s.player.idleTime = 0;
    s.player.sprite.setFrame(6);
    s.player.draw?.();
  }
  for (const n of s.npcs || []) {
    n.resetPose();
    n.bubble.mesh.visible = false;
  }
  if (s.surface) {
    for (const v of s.surface.visuals) v.phase = 0.1;
    s.surface.time = 0;
    s.surface.update(0, s.player);
  }
  if (s.comic?.open) {
    s.comic.revealed = s.comic.cells.length;
    s.comic.timer = 0;
  }
  if (s.snow) {
    s.snow.particles.forEach((p, i) => {
      p.x = (i * 73 + 17) % 480;
      p.y = (i * 41 + 29) % 270;
      p.mesh.position.x = Math.round(p.x);
      p.mesh.position.y = Math.round(p.y);
    });
    s.snow.setCamera(s.cam.x, s.cam.y);
  }
  if (s.footprints?.reset) s.footprints.reset();
  if (s.hud?.setCamera) s.hud.setCamera(s.cam.x, s.cam.y);
  if (s.hud) s.hud.t = 0;
  const input = { device: 'keyboard' };
  s.updateCursor?.(input);
  if (overlay) {
    s.drawHud(input, { prompt: null, showHotbar: false, hintActions: null });
  } else {
    s.drawHud(input, s.hudParams());
  }
}

async function freezeWorld(page, opts = {}) {
  await page.evaluate(freezeBody, { overlay: false, t: 0, ...opts });
  await sleep(page, 250);
}

async function freezeArena(page) {
  await page.evaluate(() => {
    const g = window.__eternauta.game;
    const s = g.scene;
    if (!s.__t1Orig) s.__t1Orig = s.update;
    s.update = () => {};
    s.t = 10;
    s.shake = 0;
    s.recoil = 0;
    s.recoilX = 0;
    s.recoilY = 0;
    s.invuln = 0;
    s.patchT = 0;
    s.player.idleTime = 0;
    s.player.sprite.setFrame(6);
    s.player.mesh.visible = true;
    s.player.draw?.();
    s.clearEnemies();
    s.clearFx();
    const px = s.player.x;
    const py = s.player.feet;
    const list = [
      ['cascarudo', px - 56, py + 12],
      ['veloz', px + 64, py - 22],
      ['acorazado', px + 92, py + 30],
    ];
    for (const [type, x, y] of list) {
      const e = s.spawnEnemy(type, x, y);
      e.animT = 0;
      e.dir = 'down';
      e.hitT = 0;
      e.biteCd = 99;
      s.updateEnemyVisual(e);
    }
    s.clearFx();
    if (s.snow) {
      s.snow.particles.forEach((p, i) => {
        p.x = (i * 73 + 17) % 480;
        p.y = (i * 41 + 29) % 270;
        p.mesh.position.x = Math.round(p.x);
        p.mesh.position.y = Math.round(p.y);
      });
      s.snow.setCamera(s.cam.x, s.cam.y);
    }
    s.light.time = 0;
    s.light.setMode(g.flags.apagon ? 'apagon' : 'electrica');
    s.light.setCamera(Math.round(s.cam.x), Math.round(s.cam.y));
    s.drawHud({ device: 'keyboard' });
  });
  await sleep(page, 250);
}

async function freezeView(page, viewId) {
  await restoreAll(page);
  await page.evaluate((id) => {
    const s = window.__eternauta.scenes.view;
    s.viewId = id;
    s.opts = { returnTo: 'attic' };
    window.__eternauta.go('view');
    if (!s.__t1Orig) s.__t1Orig = s.update;
    s.update = () => {};
    const FIXED_T = 5;
    s.t = FIXED_T;
    if (id === 'attic') {
      const PAN_SECONDS = 40;
      const PAN_MAX = 480;
      const cycle = FIXED_T % (PAN_SECONDS * 2);
      const phase = cycle < PAN_SECONDS
        ? cycle / PAN_SECONDS
        : (PAN_SECONDS * 2 - cycle) / PAN_SECONDS;
      s.cam = { x: Math.round(phase * PAN_MAX), y: 15 };
      s.snow.forEach((f, i) => {
        f.x = 28 + ((i * 53 + 7) % 424);
        f.y = 18 + ((i * 37 + 11) % 218);
        f.big = i % 6 === 0;
        f.speed = 8 + (i % 9);
        f.sway = 1 + (i % 5);
        f.phase = i * 0.7;
      });
    } else {
      s.cam = { x: 0, y: 0 };
    }
    s.placeOverlay?.();
    s.drawOverlay();
  }, viewId);
  await sleep(page, 250);
}

async function freezeStatic(page, name) {
  await go(page, name);
  await sleep(page, 200);
  await page.evaluate(() => {
    const s = window.__eternauta.game.scene;
    if (!s.__t1Orig) s.__t1Orig = s.update;
    s.update = () => {};
    s.t = 0;
    s.blink = null;
    if (s.player) {
      s.player.idleTime = 0;
      s.player.sprite.setFrame(6);
      s.player.draw?.();
    }
    if (s.snow) {
      s.snow.particles.forEach((p, i) => {
        p.x = (i * 73 + 17) % 480;
        p.y = (i * 41 + 29) % 270;
        p.mesh.position.x = Math.round(p.x);
        p.mesh.position.y = Math.round(p.y);
      });
      s.snow.setCamera(s.cam.x, s.cam.y);
    }
    if (s.hud?.setCamera) s.hud.setCamera(s.cam.x, s.cam.y);
    s.draw(true);
  });
  await sleep(page, 250);
}

async function shot(page, name) {
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file });
  console.log(`[${PHASE}] ${name}.png`);
}

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox',
      '--disable-gpu-sandbox', '--hide-scrollbars'],
  });
  const logs = [];
  try {
    const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
    page.on('console', (m) => logs.push({ type: m.type(), text: m.text() }));
    page.on('pageerror', (e) => logs.push({ type: 'pageerror', text: String(e) }));
    await page.addInitScript(SEED);
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__eternauta && window.__eternauta.game, null, { timeout: 20000 });
    await sleep(page, 500);
    // La intro del altillo abre caption + dialogo: la salteamos para la foto base.
    await page.evaluate(() => {
      const st = window.__eternauta.game.story;
      if (st && st.shown) { st.shown.intro = true; st.shown.idea = true; }
    });

    // 01 altillo
    await go(page, 'attic');
    await clearOverlays(page);
    await sleep(page, 300);
    await freezeWorld(page);
    await shot(page, '01-altillo');

    // 02 casa (living)
    await go(page, 'house');
    await clearOverlays(page);
    await sleep(page, 300);
    await freezeWorld(page);
    await shot(page, '02-casa');

    // 03 garaje
    await go(page, 'garage');
    await clearOverlays(page);
    await sleep(page, 300);
    await freezeWorld(page);
    await shot(page, '03-garaje');

    // 04 arena (fase activa)
    await go(page, 'arena');
    await page.waitForFunction(() => {
      const s = window.__eternauta.game.scene;
      return s && s.name === 'arena' && s.phase === 'active';
    }, null, { timeout: 25000 });
    await sleep(page, 200);
    await freezeArena(page);
    await shot(page, '04-arena');

    // 05 altillo + cartucho
    await go(page, 'attic');
    await clearOverlays(page);
    await sleep(page, 250);
    await page.evaluate(() => { window.__eternauta.game.scene.playCaption('Prueba de cartucho en el altillo.'); });
    await sleep(page, 250);
    await freezeWorld(page, { overlay: true });
    await shot(page, '05-altillo-caption');

    // 06 altillo + historieta
    await go(page, 'attic');
    await clearOverlays(page);
    await sleep(page, 250);
    await page.evaluate(async () => {
      const m = await import('/src/data/script.js');
      window.__eternauta.game.scene.playComic(m.COMICS.dados);
    });
    await sleep(page, 1900);
    await freezeWorld(page, { overlay: true });
    await shot(page, '06-altillo-comic');

    // 07 altillo + globo
    await go(page, 'attic');
    await clearOverlays(page);
    await sleep(page, 250);
    await page.evaluate(() => window.__eternauta.game.scene.sayBalloon({ text: 'Globo de prueba' }));
    await sleep(page, 150);
    await freezeWorld(page, { overlay: true });
    await shot(page, '07-altillo-balloon');

    // 08/09 vistas por la ventana (pantalla fija)
    await freezeView(page, 'attic');
    await shot(page, '08-view-attic');
    await freezeView(page, 'living');
    await shot(page, '09-view-living');

    // 10/11 muerte y final (pantallas fijas)
    await freezeStatic(page, 'death');
    await shot(page, '10-death');
    await freezeStatic(page, 'end');
    await shot(page, '11-end');

    fs.writeFileSync(path.join(OUT, 'console-logs.json'), JSON.stringify(logs, null, 2));
    const errors = logs.filter((l) => l.type === 'pageerror' || l.type === 'error');
    if (errors.length) console.log('CONSOLE ERRORS', JSON.stringify(errors));
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
