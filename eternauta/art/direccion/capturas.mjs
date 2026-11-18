// Capturas del juego para el documento de dirección de arte (art/direccion/DIRECCION.md).
// Chromium headless a 1920x1080 = vista 480x270 x4 (pixel-perfect).
// Uso (desde eternauta/):
//   npx vite --port 5199 --strictPort &   node art/direccion/capturas.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const OUT = 'art/direccion/doc/capturas';
fs.mkdirSync(OUT, { recursive: true });
const URL = process.env.URL || 'http://localhost:5199/';

const browser = await chromium.launch({
  executablePath: `${process.env.HOME}/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const wait = (ms) => page.waitForTimeout(ms);
const api = (fn, arg) => page.evaluate(fn, arg);
const settle = async (ms = 700) => {
  await page.waitForFunction(() => {
    const s = window.__eternauta.state();
    return !s.transition && s.fade === 0;
  }, { timeout: 8000 }).catch(() => {});
  await wait(ms);
};
const shot = async (name, fn) => {
  try {
    await fn();
    await page.mouse.move(1919, 1079);
    await page.screenshot({ path: `${OUT}/${name}.png` });
    console.log('ok  ', name);
  } catch (e) {
    console.log('FAIL', name, String(e).split('\n')[0]);
  }
};
const reset = async (scene = 'attic', keepIntro = false) => {
  await page.goto(URL);
  await page.waitForFunction(() => window.__eternauta, { timeout: 15000 });
  await wait(600);
  // Sin el cartel + diálogo de la intro, salvo que se pida.
  if (!keepIntro) await api(() => { window.__eternauta.game.story.shown.intro = true; });
  if (scene) {
    await api((s) => window.__eternauta.go(s), scene);
    await settle();
  }
};
const comic = (key) => api(async (k) => {
  const { COMICS } = await import('/src/data/script.js');
  window.__eternauta.game.scene.playComic(COMICS[k]);
}, key);

// --- Menús
await reset(null);
await shot('menu_titulo', () => wait(2500));
// TODO: Controles y Créditos (la navegación con teclado del título no entra en headless).

// --- Escenarios con HUD
await reset('attic');
await shot('esc_altillo', () => settle(1500));
await shot('hud_toast', async () => { await api(() => window.__eternauta.toast('Agarraste: tiras de goma')); await wait(300); });
await reset('house'); await shot('esc_casa', () => settle(1200));
await reset('garage'); await shot('esc_garage', () => settle(1200));
await reset('street');
await shot('esc_calle', async () => { await api(() => window.__eternauta.setSuit(true)); await settle(1200); });
await reset('attic');
await shot('esc_vista_altillo', async () => { await api(() => window.__eternauta.openView('attic')); await settle(1500); });
await reset('attic');
await shot('luz_apagon', async () => { await api(() => window.__eternauta.blackout()); await wait(2500); });

// --- Diálogos y viñetas
await reset('attic', true);
await shot('dlg_cartel_intro', () => wait(3500));
await shot('dlg_favalli', async () => { await page.keyboard.press('Enter'); await wait(400); await page.keyboard.press('Enter'); await wait(3500); });
await reset('attic');
await shot('dlg_lucas', async () => { await api(() => window.__eternauta.startDialog('lucas')); await wait(3500); });
for (const k of ['truco', 'choque', 'polsky', 'dados']) {
  await reset(k === 'truco' || k === 'dados' ? 'attic' : 'street');
  await shot(`vineta_${k}`, async () => { await comic(k); await wait(2200); });
}

// --- Inventario, menú de pausa, cofre
await reset('attic');
await api(() => { window.__eternauta.giveCraftingParts(); window.__eternauta.give('mate_cebado', 1); });
await settle(400);
await shot('hud_inventario', () => wait(300));
for (let t = 0; t < 3; t++) {
  await shot(`menu_pausa_${t}`, async () => { await api((tab) => window.__eternauta.openMenu(tab), t); await wait(600); });
  await api(() => window.__eternauta.closeMenu());
}
await shot('cofre', async () => { await api(() => window.__eternauta.openChest('crate')); await wait(600); });

// --- Minijuego, muerte, final
await reset(null);
await shot('arena', async () => { await api(() => window.__eternauta.startArena()); await settle(3000); });
await reset('death'); await shot('muerte', () => wait(2500));
await reset('end'); await shot('final', () => wait(2500));

console.log(errors.length ? `errores de página:\n${errors.slice(0, 8).join('\n')}` : 'sin errores de página');
await browser.close();
