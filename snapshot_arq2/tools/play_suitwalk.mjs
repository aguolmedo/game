// Captura el minijuego (arena) caminando en las 4 direcciones con el traje.
// Uso: npx vite --port 5199 --strictPort &  node tools/play_suitwalk.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const OUT = 'docs/screens/suitwalk';
fs.mkdirSync(OUT, { recursive: true });

const WALK = [
  { name: 'left', key: 'KeyA' },
  { name: 'right', key: 'KeyD' },
  { name: 'up', key: 'KeyW' },
  { name: 'down', key: 'KeyS' },
];

const browser = await chromium.launch({
  executablePath: `${process.env.HOME}/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.stack || String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

const wait = (ms) => page.waitForTimeout(ms);
const state = () => page.evaluate(() => window.__eternauta.state());
const waitScene = (name) => page.waitForFunction(
  (n) => window.__eternauta.state().scene === n, name, { timeout: 15000 },
);

async function shot(name) {
  const path = `${OUT}/${name}.png`;
  await page.screenshot({ path });
  const size = fs.statSync(path).size;
  if (size < 2000) console.warn(`WARN ${path} pesa ${size} bytes (¿frame negro?)`);
  console.log('shot', path, `${size}b`);
}

try {
  await page.goto('http://localhost:5199/', { waitUntil: 'networkidle' });
  await page.waitForFunction(
    () => window.__eternauta && window.__eternauta.state().scene === 'title',
    undefined, { timeout: 15000 },
  );
  await wait(700);

  // Titulo: 'Jugar' -> 'Minijuego' (arena) y confirmar.
  await page.keyboard.press('ArrowDown');
  await wait(200);
  await page.keyboard.press('Enter');
  await waitScene('arena');
  // El cartel "RONDA 1 / Preparate" tapa al personaje: esperar a que arranque.
  await page.waitForFunction(
    () => window.__eternauta.state().arena.phase === 'active',
    undefined, { timeout: 20000 },
  );
  await wait(400);
  console.log('scene', (await state()).scene, (await state()).arena.phase);

  // Primero la pasada a 4x (el juego escala por enteros): asi se ve el paso.
  await page.setViewportSize({ width: 1920, height: 1080 });
  await wait(500);
  for (const { name, key } of WALK) {
    await page.keyboard.down(key);
    await wait(120);
    await shot(`arena_${name}_x4`);
    await page.keyboard.up(key);
    await wait(250);
  }

  await page.setViewportSize({ width: 960, height: 540 });
  await wait(500);
  for (const { name, key } of WALK) {
    await page.keyboard.down(key);
    for (let i = 1; i <= 3; i++) {
      await wait(130);
      await shot(`arena_${name}_${i}`);
    }
    await page.keyboard.up(key);
    await wait(300);
  }
  const end = (await state()).arena;
  if (end.dead) console.warn('WARN el personaje murio durante la captura');
} finally {
  await browser.close();
}

if (errors.length) {
  console.log(`ERRORS (${errors.length}):`);
  for (const e of errors) console.log(' -', e);
} else {
  console.log('ERRORS: ninguno');
}
