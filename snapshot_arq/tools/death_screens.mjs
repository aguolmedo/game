// Capturas headless de la muerte y el resultado de la arena.
// Uso: npx vite --port 5199 --strictPort & node tools/death_screens.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { installPad, padSet, padTap, stickStop } from './_pad.mjs';

const PORT = process.env.PORT || 5199;
const OUT = 'docs/screens/death';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: `${process.env.HOME}/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
await installPad(page);

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
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.screenshot({ path: `${OUT}/${name}.png`, timeout: 90000 });
      console.log('shot', name);
      return;
    } catch (err) {
      console.log('reintento', name, String(err.message).split('\n')[0]);
      await wait(600);
    }
  }
  throw new Error(`No se pudo capturar ${name}`);
};
const state = () => page.evaluate(() => window.__eternauta.state());
const resultSel = async () => (await state()).arena.resultSel;
async function keyStep(key, want) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.keyboard.press(key);
    await wait(320);
    if (await resultSel() === want) return;
  }
  throw new Error(`teclado: ${key} no dejó la selección en ${want}`);
}
async function padStep(button, want) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await padTap(page, button, 220);
    await wait(380);
    if (await resultSel() === want) return;
  }
  throw new Error(`pad: botón ${button} no dejó la selección en ${want}`);
}
async function padConfirmRetry() {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await padTap(page, 0, 260);
    await wait(450);
    const s = await state();
    if (!s.arena.resultOpen && !s.arena.dead) return;
  }
  throw new Error('pad: A no confirmó Otra vez');
}

try {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__eternauta, null, { timeout: 15000 });
  await wait(500);

  // Entrar por el menú del título: abajo -> Minijuego -> Enter.
  await page.keyboard.press('ArrowDown');
  await wait(120);
  await page.keyboard.press('Enter');
  await page.waitForFunction(
    () => window.__eternauta.state().scene === 'arena'
      && !window.__eternauta.state().transition,
    null, { timeout: 15000 },
  );
  await wait(900);
  await shot('01_arena_antes');

  // Morir (la escena expone die() para las pruebas).
  await page.evaluate(() => window.__eternauta.game.scene.die());
  await wait(130);
  await shot('02_vineta_dibujando');
  await wait(800);
  await shot('03_vineta_completa');

  // Bugfix: dejar el stick apoyado ANTES de que abra el resultado.
  await padSet(page, { axes: [0, 1, 0, 0] });
  await wait(250);
  await page.keyboard.press('Space');
  await wait(800);
  const drift = await state();
  console.log('resultado con stick apoyado:', JSON.stringify({
    sel: drift.arena.resultSel, device: drift.device,
  }));
  if (drift.arena.resultSel !== 0) throw new Error('la selección se movió sola con el stick apoyado');
  await shot('04_resultado_sin_flip');

  // Soltar el stick: recién ahí la navegación se arma.
  await stickStop(page);
  await wait(250);
  await keyStep('ArrowDown', 1);
  await shot('05_resultado_kb_titulo');
  await keyStep('ArrowUp', 0);
  await shot('06_resultado_kb_otra_vez');

  // Gamepad falso: cruceta abajo/arriba.
  await padStep(13, 1);
  await shot('07_resultado_pad_titulo');
  await padStep(12, 0);
  await shot('08_resultado_pad_otra_vez');

  // Confirmar Otra vez con A del pad y verificar limpieza total.
  await padTap(page, 0);
  await wait(800);
  let s = await state();
  const clean = await page.evaluate(() => {
    const a = window.__eternauta.scenes.arena;
    return {
      resultOpen: a.resultOpen,
      vignetteOpen: a.vignetteOpen,
      dead: a.dead,
      phase: a.phase,
      enemies: a.enemies.length,
      corpses: a.enemies.filter((e) => e.dead).length,
      fx: a.fx.length,
      bullets: a.shooting.bullets.length,
      casings: a.shooting.casings.length,
      particles: a.shooting.particles.length,
      footprints: a.footprints.items.length,
      playerVisible: a.player.mesh.visible,
      shadowVisible: a.player.shadow.visible,
      frozen: a.player.frozen,
      fireLock: a.fireLock,
    };
  });
  console.log('arena tras Otra vez:', JSON.stringify(clean));
  for (const key of ['resultOpen', 'vignetteOpen', 'dead']) {
    if (clean[key]) throw new Error(`quedó ${key} activo`);
  }
  for (const key of ['enemies', 'corpses', 'fx', 'bullets', 'casings',
    'particles', 'footprints']) {
    if (clean[key] !== 0) throw new Error(`quedaron ${clean[key]} ${key}`);
  }
  if (!clean.playerVisible || !clean.shadowVisible || clean.frozen) {
    throw new Error('el jugador no quedó restaurado');
  }
  await shot('09_arena_tras_otra_vez');

  // Jugar 10 s: mover y disparar.
  await page.keyboard.down('ArrowRight');
  for (let i = 0; i < 10; i += 1) {
    await page.keyboard.press('Space');
    await wait(1000);
  }
  await page.keyboard.up('ArrowRight');
  await wait(300);
  await shot('10_arena_limpia_10s');
  const after = await state();
  console.log('tras 10 s:', JSON.stringify({
    round: after.arena.round, enemies: after.arena.enemyCount,
    shots: after.arena.shots, integrity: after.arena.integrity,
    player: after.player,
  }));
  if (after.arena.resultOpen || after.arena.vignetteOpen) {
    throw new Error('la arena volvió a quedar en muerte/resultado');
  }

  // Segunda muerte: confirmar "Otra vez" con la barra espaciadora APRETADA.
  // Ese mismo botón no debe salir como disparo al reiniciar.
  await page.evaluate(() => window.__eternauta.game.scene.die());
  await wait(700);
  await page.keyboard.press('Space');   // flanco que abre el resultado
  await wait(450);
  const opened = await state();
  if (!opened.arena.resultOpen) throw new Error('Space no abrió el resultado');
  let held = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.keyboard.down('Space');  // confirma Otra vez y sigue apretada
    await wait(650);
    await page.keyboard.up('Space');
    await wait(350);
    held = await page.evaluate(() => {
      const a = window.__eternauta.scenes.arena;
      return {
        resultOpen: a.resultOpen,
        dead: a.dead,
        mag: a.weapon.mag,
        magSize: a.weapon.magSize,
        bullets: a.shooting.bullets.length,
        fireLock: a.fireLock,
      };
    });
    if (!held.resultOpen && !held.dead) break;
  }
  console.log('reinicio con Space apretado:', JSON.stringify(held));
  if (held.resultOpen) throw new Error('Space no confirmó Otra vez');
  if (held.mag !== held.magSize || held.bullets !== 0) {
    throw new Error('el botón de confirmar se coló como disparo');
  }
  await shot('11_tecla_confirmar_sin_disparo');

  if (errors.length) {
    console.error('ERRORES DE PÁGINA:\n' + errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log('sin errores de página');
  }
} catch (err) {
  console.error('FALLO:', err.stack || err);
  process.exitCode = 1;
  if (errors.length) console.error('ERRORES:', errors.join('\n'));
} finally {
  await browser.close();
}
