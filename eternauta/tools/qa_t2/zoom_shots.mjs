// T2 (zoom del mundo): capturas headless a 960x540 y 1920x1080 + test de hover.
// Uso: node tools/qa_t2/zoom_shots.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = `${process.env.HOME}/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`;
const URL = 'http://localhost:5199/';
const OUT = '/home/mateyfasito/dev/game/qa/screens-zoom-2026-11-17';
const SIZES = [[960, 540], [1920, 1080]];

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
      if (sc && sc.__t2Orig) { sc.update = sc.__t2Orig; delete sc.__t2Orig; }
    }
  });
}

async function go(page, name) {
  await restoreAll(page);
  await page.evaluate((n) => window.__eternauta.go(n), name);
  await page.waitForFunction((n) => window.__eternauta.game.sceneName === n, name,
    { timeout: 10000 });
  await sleep(page, 400);
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
    // Sin objetivo/hover heredado de la captura anterior.
    s.target = null;
    s.aimTarget = null;
    s.targetVia = null;
    s.hoverTarget = null;
    s.hoverNear = false;
    s.lastHoverTarget = null;
    s.lastHoverNear = false;
    s.hintRects = [];
    s.hintBoxes = [];
    // El canvas 2D del overlay necesita dos pases en Chromium headless para
    // descartar el frame anterior (bug de clearRect tras subir la textura).
    if (s.extra) {
      s.extra.clear();
      s.extra.clear();
      s.extra.commit();
    }
  });
  await page.mouse.move(2, 2);
}

/** Congela la escena de mundo para una foto estable. */
async function freezeWorld(page, opts = {}) {
  await page.evaluate((o) => {
    const g = window.__eternauta.game;
    const vp = window.__eternauta.viewport;
    const s = g.scene;
    if (!s.__t2Orig) s.__t2Orig = s.update;
    s.update = () => {};
    // Foto limpia: sin prompt ni hover heredado.
    s.target = null;
    s.aimTarget = null;
    s.hoverTarget = null;
    s.hoverNear = false;
    s.lastHoverTarget = null;
    s.t = o.t ?? 0;
    if (s.light) {
      s.light.time = s.t;
      s.light.setMode(g.lightingMode);
      s.light.setCamera(s.cam.x, s.cam.y);
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
    if (s.snow) {
      s.snow.syncViewSize?.();
      s.snow.particles.forEach((p, i) => {
        p.x = (i * 73 + 17) % s.snow.width;
        p.y = (i * 41 + 29) % s.snow.height;
        p.mesh.position.x = Math.round(p.x);
        p.mesh.position.y = Math.round(p.y);
      });
      s.snow.setCamera(s.cam.x, s.cam.y);
    }
    if (s.footprints?.reset) s.footprints.reset();
    const input = { device: 'keyboard' };
    s.updateCursor?.(input);
    if (o.overlay) {
      s.drawHud(input, { prompt: null, showHotbar: false, hintActions: null });
    } else {
      s.drawHud(input, s.hudParams());
    }
    void vp;
  }, opts);
  await sleep(page, 250);
}

async function freezeArena(page) {
  await page.evaluate(() => {
    const g = window.__eternauta.game;
    const s = g.scene;
    if (!s.__t2Orig) s.__t2Orig = s.update;
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
      s.snow.syncViewSize?.();
      s.snow.particles.forEach((p, i) => {
        p.x = (i * 73 + 17) % s.snow.width;
        p.y = (i * 41 + 29) % s.snow.height;
        p.mesh.position.x = Math.round(p.x);
        p.mesh.position.y = Math.round(p.y);
      });
      s.snow.setCamera(s.cam.x, s.cam.y);
    }
    s.light.time = 0;
    s.light.setMode(g.flags.apagon ? 'apagon' : 'electrica');
    s.light.setCamera(s.cam.x, s.cam.y);
    s.drawHud({ device: 'keyboard' });
  });
  await sleep(page, 250);
}

async function shot(page, dir, name) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}.png`);
  await page.screenshot({ path: file });
  console.log(`${path.relative(OUT, file)}`);
  return file;
}

/** Pone al jugador en una posición fija y la cámara en su lugar. */
async function placePlayer(page, x, feet, dir = 'down') {
  await page.evaluate(({ x, feet, dir }) => {
    const s = window.__eternauta.game.scene;
    s.player.place(x, feet, dir);
    s.cam = s.world.cameraFor(x, feet - 18);
  }, { x, feet, dir });
  await sleep(page, 120);
}

/** Centra la cámara en un punto del mundo (para encuadrar un mueble). */
async function frameCamera(page, x, y) {
  await page.evaluate(({ x, y }) => {
    const s = window.__eternauta.game.scene;
    s.cam = s.world.cameraFor(x, y);
  }, { x, y });
  await sleep(page, 120);
}

/** Posición de pantalla (client px) del centro de un rect del mundo. */
async function worldPointToClient(page, wx, wy) {
  return page.evaluate(({ wx, wy }) => {
    const g = window.__eternauta.game;
    const s = g.scene;
    const vp = window.__eternauta.viewport;
    const rect = g.scene.scene ? document.querySelector('canvas').getBoundingClientRect()
      : { left: 0, top: 0, width: 480, height: 270 };
    const vx = (wx - s.cam.x) * vp.zoom;
    const vy = (wy - s.cam.y) * vp.zoom;
    return {
      x: rect.left + (vx / 480) * rect.width,
      y: rect.top + (vy / 270) * rect.height,
      vx, vy,
    };
  }, { wx, wy });
}

/** Hover sobre el mate del altillo: lo selecciona con zoom (pickAt). */
async function hoverMate(page, dir) {
  await go(page, 'attic');
  await clearOverlays(page);
  await sleep(page, 250);
  const info = await page.evaluate(() => {
    const g = window.__eternauta.game;
    const s = g.scene;
    const c = s.surface.candidates.find((it) => it.worldItem?.itemId === 'mate_vacio');
    if (!c) return { error: 'no está el mate en el altillo' };
    const b = c.cursorBox;
    // Juan abajo de la mesa, al alcance del mate.
    s.player.place(b.x + b.w / 2, b.y + b.h + 26, 'up');
    s.cam = s.world.cameraFor(s.player.x, s.player.feet - 18);
    return {
      bx: b.x, by: b.y, bw: b.w, bh: b.h,
      wx: b.x + b.w / 2, wy: b.y + b.h / 2,
      label: c.label,
      zoom: window.__eternauta.viewport.zoom,
      cam: { x: s.cam.x, y: s.cam.y },
    };
  });
  if (info.error) throw new Error(info.error);
  await sleep(page, 250);
  const client = await worldPointToClient(page, info.wx, info.wy);
  await page.mouse.move(client.x, client.y);
  await sleep(page, 350);
  const result = await page.evaluate(() => {
    const s = window.__eternauta.game.scene;
    const p = s.hudParams().prompt;
    return {
      hover: s.hoverTarget
        ? { label: s.hoverTarget.label, item: s.hoverTarget.worldItem?.itemId, near: s.hoverNear }
        : null,
      prompt: p ? { label: p.label, x: p.x, y: p.y } : null,
      cursor: window.__eternauta.state().cursor,
    };
  });
  if (!result.hover || result.hover.item !== 'mate_vacio') {
    throw new Error(`hover del mate no selecciona: ${JSON.stringify(result)}`);
  }
  if (!result.prompt || !/mate/i.test(result.prompt.label)) {
    throw new Error(`prompt del mate ausente: ${JSON.stringify(result)}`);
  }
  // La etiqueta tiene que caer junto al objeto (a su derecha), en coords de vista.
  const expected = await page.evaluate(({ wx, wy }) => {
    const s = window.__eternauta.game.scene;
    const vp = window.__eternauta.viewport;
    const b = s.hoverTarget.cursorBox;
    return {
      x: (b.x + b.w + 6 - s.cam.x) * vp.zoom,
      y: (b.y + Math.round(b.h / 2) - 7 - s.cam.y) * vp.zoom,
    };
  }, { wx: info.wx, wy: info.wy });
  if (Math.abs(result.prompt.x - expected.x) > 0.01
    || Math.abs(result.prompt.y - expected.y) > 0.01) {
    throw new Error(`prompt no pegado al objeto: ${JSON.stringify({ result, expected })}`);
  }
  const file = await shot(page, dir, '07-hover-mate');
  return { info, result, client, file };
}

async function balloonShot(page, dir) {
  await go(page, 'attic');
  await clearOverlays(page);
  await sleep(page, 200);
  await page.evaluate(() => {
    const s = window.__eternauta.game.scene;
    s.sayBalloon({ text: 'El mate está sobre la mesa.' });
  });
  await sleep(page, 350);
  return shot(page, dir, '08-globo');
}

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox',
      '--disable-gpu-sandbox', '--hide-scrollbars'],
  });
  const logs = [];
  const results = [];
  try {
    const page = await browser.newPage({ viewport: { width: SIZES[0][0], height: SIZES[0][1] } });
    page.on('console', (m) => logs.push({ type: m.type(), text: m.text() }));
    page.on('pageerror', (e) => logs.push({ type: 'pageerror', text: String(e) }));
    await page.addInitScript(SEED);
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__eternauta && window.__eternauta.game, null,
      { timeout: 20000 });
    await sleep(page, 500);
    await page.evaluate(() => {
      const st = window.__eternauta.game.story;
      if (st && st.shown) { st.shown.intro = true; st.shown.idea = true; }
    });

    for (const [w, h] of SIZES) {
      await page.setViewportSize({ width: w, height: h });
      // Página limpia por resolución: evita overlays heredados del tamaño anterior.
      await page.reload({ waitUntil: 'load' });
      await page.waitForFunction(() => window.__eternauta && window.__eternauta.game, null,
        { timeout: 20000 });
      await sleep(page, 500);
      await page.evaluate(() => {
        const st = window.__eternauta.game.story;
        if (st && st.shown) { st.shown.intro = true; st.shown.idea = true; }
      });
      const dir = path.join(OUT, `${w}x${h}`);

      // 01 altillo
      await go(page, 'attic');
      const vp = await page.evaluate(() => ({ ...window.__eternauta.viewport }));
      console.log(`viewport ${w}x${h} (mundo):`, JSON.stringify(vp));
      await clearOverlays(page);
      await freezeWorld(page);
      await shot(page, dir, '01-altillo');

      // 02 living (la mesa ratona) en el spawn de la casa
      await go(page, 'house');
      await clearOverlays(page);
      await placePlayer(page, 160, 150, 'left');
      await frameCamera(page, 120, 135);
      await freezeWorld(page);
      await shot(page, dir, '02-living');

      // 03 cocina (mesa de la cocina)
      await placePlayer(page, 336, 252, 'up');
      await freezeWorld(page);
      await shot(page, dir, '03-cocina');

      // 04 garaje
      await go(page, 'garage');
      await clearOverlays(page);
      await freezeWorld(page);
      await shot(page, dir, '04-garaje');

      // 05 calle
      await go(page, 'street');
      await clearOverlays(page);
      await freezeWorld(page);
      await shot(page, dir, '05-calle');

      // 06 arena (zoom 1)
      await go(page, 'arena');
      await page.waitForFunction(() => {
        const s = window.__eternauta.game.scene;
        return s && s.name === 'arena' && s.phase === 'active';
      }, null, { timeout: 25000 });
      await sleep(page, 200);
      await freezeArena(page);
      await shot(page, dir, '06-arena');

      // 07 hover del mate (label pegada al objeto) + test de pickAt
      const hover = await hoverMate(page, dir);
      results.push({ size: `${w}x${h}`, ...hover.info, hover: hover.result.hover,
        prompt: hover.result.prompt });
      await restoreAll(page);

      // 08 globo anclado a un personaje
      await balloonShot(page, dir);
      await restoreAll(page);
    }

    fs.writeFileSync(path.join(OUT, 'console-logs.json'), JSON.stringify(logs, null, 2));
    fs.writeFileSync(path.join(OUT, 'hover-check.json'), JSON.stringify(results, null, 2));
    const errors = logs.filter((l) => l.type === 'pageerror' || l.type === 'error');
    if (errors.length) throw new Error(`errores de consola: ${JSON.stringify(errors)}`);
    console.log('HOVER OK:', JSON.stringify(results.map((r) => ({
      size: r.size, item: r.hover?.item, label: r.hover?.label, near: r.hover?.near,
      prompt: r.prompt?.label,
    }))));
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
