// Capturas headless del flujo de la casa-base (worker E).
// Uso: npx vite --port 5199 --strictPort &  node tools/base_screens.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const OUT = 'docs/capturas';
fs.mkdirSync(OUT, { recursive: true });

const SAVE = {
  v: 1,
  trajeHecho: true,
  loop: 2,
  muertes: 0,
  botin: { chatarra: 5, goma: 2, nafta: 1, pieza: 2 },
  mejoras: { favalli: 1, elena: 0, lucas: 1, luz: 0 },
  mochila: null,
  best: { round: 3, points: 120 },
};

const browser = await chromium.launch({
  executablePath: `${process.env.HOME}/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
await page.addInitScript((save) => {
  localStorage.setItem('eternauta.save.v1', JSON.stringify(save));
}, SAVE);
const errors = [];
page.on('pageerror', (e) => errors.push(e.stack || String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

const wait = (ms) => page.waitForTimeout(ms);
const state = () => page.evaluate(() => window.__eternauta.state());
const shot = async (name) => {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('shot', name);
};
const waitScene = (name) => page.waitForFunction(
  (n) => window.__eternauta.state().scene === n, name, { timeout: 12000 },
);
const waitQuiet = () => page.waitForFunction(() => {
  const s = window.__eternauta.state();
  return !s.transition && s.fade === 0;
}, { timeout: 12000 }).catch(() => {});

await page.goto('http://localhost:5199/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__eternauta && window.__eternauta.state);
await waitScene('title');
await wait(900);

// 1. Titulo con "Continuar".
const opts = await page.evaluate(() => window.__eternauta.scenes.title.menu.options);
console.log('opciones del titulo:', opts.join(' | '));
if (opts[0] !== 'Continuar') throw new Error('el titulo no muestra Continuar');
await shot('base_1_titulo_continuar');

// Click en la primera opcion (mouse), como un jugador.
const rect = await page.evaluate(() => window.__eternauta.scenes.title.menu.optionRects()[0]);
await page.mouse.click((rect.x + rect.w / 2) * 2, (rect.y + rect.h / 2) * 2);
await waitScene('garage');
await waitQuiet();
await wait(700);

// 2. El garaje en modo base con los NPCs y los cartelitos.
let s = await state();
console.log('base:', s.base, 'objective:', s.objective.text);
const npcs = await page.evaluate(() => window.__eternauta.scenes.garage.npcs
  .map((n) => ({ id: n.id, hidden: n.hidden })));
console.log('npcs:', JSON.stringify(npcs));
if (npcs.filter((n) => !n.hidden).length !== 3) throw new Error('faltan NPCs en la base');
await shot('base_2_garaje');

// La interaccion de Favalli abre el taller (Hacer).
const label = await page.evaluate(() => {
  const sc = window.__eternauta.scenes.garage;
  const cand = sc.candidates().find((c) => c.id === 'favalli');
  return cand ? sc.actionFor(cand).label : null;
});
console.log('accion de Favalli:', label);
const opened = await page.evaluate(() => {
  const sc = window.__eternauta.scenes.garage;
  const cand = sc.candidates().find((c) => c.id === 'favalli');
  sc.target = cand;
  sc.interact({ device: 'pad' });
  return window.__eternauta.state().taller.open;
});
console.log('taller abierto:', opened);
if (!opened) throw new Error('Favalli no abrio el taller');
await wait(300);

// 3. Taller de Favalli (comparar con casa_taller_favalli.png).
let taller = await state();
console.log('taller:', JSON.stringify(taller.taller));
await shot('base_3_taller_favalli');

// 4. Taller de Lucas, tercera bloqueada: Escape, abrir el de Lucas y bajar.
await page.keyboard.press('Escape');
await wait(350);
console.log('tras cerrar:', JSON.stringify(await state().then((x) => x.taller)));
const openedLucas = await page.evaluate(() => window.__eternauta.openTaller('lucas'));
await wait(350);
console.log('lucas abierto:', openedLucas, JSON.stringify((await state()).taller));
await page.keyboard.press('ArrowDown');
await wait(220);
await page.keyboard.press('ArrowDown');
await wait(320);
taller = await state();
console.log('taller lucas:', JSON.stringify(taller.taller));
if (taller.taller.station !== 'lucas' || taller.taller.rows[2].state !== 'bloqueado') {
  throw new Error('el taller de Lucas no muestra la tercera bloqueada');
}
await shot('base_4_taller_lucas');

console.log('errores de consola:', errors.length);
for (const e of errors.slice(0, 5)) console.log('ERR', e);
await browser.close();
if (errors.length) process.exitCode = 1;
