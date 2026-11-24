// Capturas headless de la salida del roguelike (worker D).
// Uso: npx vite --port 5199 --strictPort & node tools/salida_screens.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const PORT = process.env.PORT || 5199;
const OUT = 'docs/capturas';
fs.mkdirSync(OUT, { recursive: true });

const SAVE = {
  v: 1,
  trajeHecho: true,
  loop: 2,
  muertes: 1,
  botin: { chatarra: 5, goma: 3, nafta: 2, pieza: 1 },
  mejoras: { favalli: 3, elena: 3, lucas: 2, luz: 2 },
  mochila: { loop: 1, contenido: { chatarra: 2, goma: 1, nafta: 0, pieza: 1 } },
  best: { round: 3, points: 800 },
};
const SEED = 3455; // casa/esquina/vias/cortada abajo + plaza/cortada arriba

const browser = await chromium.launch({
  executablePath: `${process.env.HOME}/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.stack || String(e)));
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  const text = m.text();
  if (/favicon|404/.test(text)) return;
  errors.push(text);
});
const wait = (ms) => page.waitForTimeout(ms);
const shot = async (name) => {
  await page.screenshot({ path: `${OUT}/${name}.png`, timeout: 90000 });
  console.log('shot', name);
};
const state = () => page.evaluate(() => window.__eternauta.scenes.arena.debugSnapshot());

await page.addInitScript((save) => {
  localStorage.setItem('eternauta.save.v1', JSON.stringify(save));
}, SAVE);

try {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__eternauta, null, { timeout: 15000 });
  await page.evaluate((seed) => {
    const api = window.__eternauta;
    const save = JSON.parse(localStorage.getItem('eternauta.save.v1'));
    api.game.run = { loop: 3, seed, save };
    api.go('arena');
  }, SEED);
  await page.waitForFunction(() => window.__eternauta.state().scene === 'arena');
  await wait(700);

  // 1) Arranque: banner con Loop N y la mano, prompt del portón.
  const s1 = await state();
  console.log('inicio', JSON.stringify(s1));
  if (s1.phase !== 'banner') throw new Error(`esperaba banner, hay ${s1.phase}`);
  if (s1.loop !== 3) throw new Error(`loop ${s1.loop}`);
  if (!s1.exitNear) throw new Error('el spawn debería estar junto al portón');
  await shot('salida_inicio');

  // 2) El barrio: Juan en la esquina de la ferretería.
  await page.evaluate(() => {
    const a = window.__eternauta.scenes.arena;
    a.phase = 'active';
    a.bannerT = 0;
    a.spawnTimer = 999;
    a.clearEnemies();
    a.shooting.reset();
    window.__eternauta.teleport(432, 540, 'up');
    a.cam = a.world.cameraFor(432, 540 - 18);
    a.followCamera = () => {};
  });
  await wait(500);
  await shot('salida_esquina');

  // 3) La mochila de otra vez, visible en el piso.
  const mochila = await page.evaluate(() => {
    const a = window.__eternauta.scenes.arena;
    return a.mochila ? { x: a.mochila.x, y: a.mochila.y } : null;
  });
  console.log('mochila', JSON.stringify(mochila));
  if (!mochila) throw new Error('no apareció la mochila de otra vez');
  await page.evaluate((m) => {
    const a = window.__eternauta.scenes.arena;
    window.__eternauta.teleport(m.x, m.y + 50, 'up');
    a.cam = a.world.cameraFor(m.x, m.y + 50 - 18);
  }, mochila);
  await wait(500);
  await shot('salida_mochila');

  // 4) Flechita cian: la mochila queda fuera de la vista.
  await page.evaluate((m) => {
    const a = window.__eternauta.scenes.arena;
    const right = m.x <= 640;
    const x = right ? 1150 : 82;
    const y = right ? 470 : 540;
    window.__eternauta.teleport(x, y, right ? 'left' : 'down');
    a.cam = a.world.cameraFor(x, y - 18);
  }, mochila);
  await wait(500);
  await shot('salida_mochila_flecha');

  // 5) Recoger la mochila y el botín del piso.
  const recogido = await page.evaluate(async (m) => {
    const a = window.__eternauta.scenes.arena;
    window.__eternauta.teleport(m.x, m.y, 'down');
    await new Promise((r) => setTimeout(r, 400));
    const afterMochila = a.debugSnapshot();
    const loot = (a.lootPoints || []).find((s) => s.kind === 'loot' && s.cell === 'esquina');
    window.__eternauta.teleport(loot.x, loot.y, 'down');
    await new Promise((r) => setTimeout(r, 400));
    return { afterMochila, afterLoot: a.debugSnapshot() };
  }, mochila);
  console.log('recoger', JSON.stringify(recogido));
  if (recogido.afterMochila.mochila) throw new Error('la mochila no se recuperó');
  if (!recogido.afterMochila.bag.chatarra && !recogido.afterMochila.bag.pieza) {
    throw new Error('la mochila no sumó botín');
  }

  // 6) Una bengala encendida (luz cálida y freno de bichos).
  await page.evaluate(() => {
    const a = window.__eternauta.scenes.arena;
    window.__eternauta.teleport(520, 560, 'right');
    a.cam = a.world.cameraFor(520, 560 - 18);
    a.useBengala();
  });
  await wait(600);
  const sBengala = await state();
  console.log('bengala', JSON.stringify({ on: sBengala.bengalaOn, left: sBengala.bengalas }));
  if (!sBengala.bengalaOn) throw new Error('la bengala no quedó encendida');
  await shot('salida_bengala');

  // 7) Botella: fuego en el piso.
  await page.evaluate(() => {
    const a = window.__eternauta.scenes.arena;
    a.aim = { x: 1, y: 0 };
    a.useBotella();
  });
  await wait(600);
  const sFire = await state();
  console.log('botella', JSON.stringify({ fires: sFire.fires, left: sFire.molotovs }));
  if (sFire.fires < 1) throw new Error('la botella no encendió fuego');
  await shot('salida_botella');

  // 7b) El portón: prompt para volver a casa con el botín.
  await page.evaluate(() => {
    const a = window.__eternauta.scenes.arena;
    window.__eternauta.teleport(82, 540, 'up');
    a.cam = a.world.cameraFor(82, 540 - 18);
  });
  await wait(500);
  const sPorton = await state();
  console.log('porton', JSON.stringify({ near: sPorton.exitNear, armed: sPorton.exitArmed }));
  if (!sPorton.exitNear || !sPorton.exitArmed) throw new Error('el portón no quedó armado');
  await shot('salida_porton');

  // 7c) La frecuencia de Lucas avisa antes de una ronda con acorazados.
  await page.evaluate(() => {
    const a = window.__eternauta.scenes.arena;
    a.eff = { ...a.eff, frecuencia: true };
    a.round = 5;
    a.cfg = { ...a.cfg, armoredPct: 0.12 };
    a.phase = 'banner';
    a.bannerT = 999;
  });
  await wait(300);
  await shot('salida_frecuencia');
  await page.evaluate(() => {
    const a = window.__eternauta.scenes.arena;
    a.phase = 'active';
    a.round = 1;
    a.cfg = { ...a.cfg, armoredPct: 0 };
  });

  // 8) Sobreviviente de Lucas: NPC quieto en un punto de botín.
  const sobre = await page.evaluate(async () => {
    const a = window.__eternauta.scenes.arena;
    const save = JSON.parse(localStorage.getItem('eternauta.save.v1'));
    a.save = { ...save, mejoras: { ...save.mejoras, lucas: 2 }, mochila: null };
    a.eff = a.eff && { ...a.eff, sobreviviente: true };
    a.setupLoot();
    const s = a.survivor;
    if (!s) return { ok: false };
    window.__eternauta.teleport(s.x, s.y + 14, 'up');
    a.cam = a.world.cameraFor(s.x, s.y + 14 - 18);
    await new Promise((r) => setTimeout(r, 400));
    return { ok: true, done: s.done, bag: a.debugSnapshot().bag };
  });
  console.log('sobreviviente', JSON.stringify(sobre));
  if (!sobre.ok) throw new Error('no apareció el sobreviviente');
  if (!sobre.done) throw new Error('el sobreviviente no dio su regalo');
  await shot('salida_sobreviviente');

  // 9) Resultado al morir, con la fila de la mochila perdida.
  await page.evaluate(() => {
    const a = window.__eternauta.scenes.arena;
    a.bag = { chatarra: 3, goma: 1, nafta: 0, pieza: 0 };
    a.die();
    a.deathT = 1;
    a.openResult();
    a.resultT = 1;
  });
  await wait(700);
  const sResult = await state();
  console.log('resultado', JSON.stringify({ open: sResult.resultOpen, sel: sResult.resultSel }));
  if (!sResult.resultOpen) throw new Error('no abrió el resultado');
  await shot('salida_resultado');

  // 10) Chequeos de lógica en vivo: drops, hombreras y payloads de fin de salida.
  const checks = await page.evaluate(async () => {
    const api = window.__eternauta;
    const a = api.scenes.arena;
    const out = {};
    a.resultOpen = false;
    a.vignetteOpen = false;
    a.dead = false;
    a.phase = 'active';
    a.player.setFrozen(false);
    a.rng = () => 0; // todo drop, todo tira de goma
    const before = a.groundLoot.length;
    for (let i = 0; i < 6; i++) {
      const e = a.spawnEnemy('cascarudo', a.player.x + 30 + i, a.player.feet);
      a.damageEnemy(e, 99);
    }
    await new Promise((r) => setTimeout(r, 250));
    out.drops = a.groundLoot.length - before;
    out.gomaEnBolsa = a.debugSnapshot().bag.goma;

    a.integrity = a.integrityMax;
    a.firstBiteReady = true;
    a.bitBy({ type: 'cascarudo', damage: 1 });
    out.hombreras = a.integrity === a.integrityMax && a.firstBiteReady === false;

    a.eff = { ...a.eff, farol: true };
    a.setupFarol();
    out.farol = Boolean(a.farolLight && (a.mapData.lights || []).includes(a.farolLight));
    out.integrityMax = a.integrityMax;
    out.patchTime = a.eff.patchTime;

    const calls = [];
    const prev = api.game.endRun;
    api.game.endRun = (r) => { calls.push(r); };
    a.exitLock = false;
    a.dead = false;
    a.bag = { chatarra: 3, goma: 1, nafta: 0, pieza: 0 };
    a.round = 4;
    a.points.score = 500;
    a.goHome();
    a.resultOpen = true;
    a.nav = { sel: 0, armed: true, axis: null };
    a.pickResult(0);
    api.game.endRun = prev;
    out.calls = calls;
    return out;
  });
  console.log('chequeos', JSON.stringify(checks));
  if (checks.drops <= 0) throw new Error('los bichos no soltaron botín');
  if (!checks.hombreras) throw new Error('la primera mordida de la ronda no fue gratis');
  if (checks.calls.length !== 2 || checks.calls[0].type !== 'volvio'
    || checks.calls[1].type !== 'murio') {
    throw new Error('los payloads de fin de salida no son los esperados');
  }

  if (errors.length) {
    console.error('ERRORES DE PÁGINA:\n' + errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log('sin errores de página');
  }
} finally {
  await browser.close();
}
