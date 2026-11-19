// Capturas del fin de partida del minijuego (cartel de muerte + resultado), para los concepts de menús.
// Uso: npx vite --port 5198 --strictPort &  URL=http://localhost:5198/ node art/concept/capturas_menus.mjs
import { chromium } from 'playwright-core';
const OUT = 'art/direccion/doc/capturas';
const browser = await chromium.launch({
  executablePath: `${process.env.HOME}/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(process.env.URL || 'http://localhost:5198/');
await page.waitForFunction(() => window.__eternauta, { timeout: 15000 });
await page.waitForTimeout(600);
await page.evaluate(() => window.__eternauta.startArena());
await page.waitForTimeout(3500);
await page.evaluate(() => window.__eternauta.game.scene.die());
await page.waitForTimeout(1600);
await page.mouse.move(1919, 1079);
await page.screenshot({ path: `${OUT}/arena_muerte.png` });
await page.evaluate(() => window.__eternauta.game.scene.openResult());
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/arena_resultado.png` });
console.log('ok');
await browser.close();
