// Recorre la demo completa con teclado en Chromium headless y guarda capturas.
// Uso: npx vite --port 5199 --strictPort &  node tools/play_screens.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const OUT = 'docs/screens/polish';
fs.mkdirSync(OUT, { recursive: true });

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

const KEYS = ['KeyW', 'KeyS', 'KeyA', 'KeyD'];
async function releaseAll() {
  for (const k of KEYS) await page.keyboard.up(k).catch(() => {});
}
async function walkTo(tx, ty, { tol = 7, timeout = 16000 } = {}) {
  const start = Date.now();
  const startScene = (await state()).scene;
  let last = null;
  while (Date.now() - start < timeout) {
    const s = await state();
    if (s.scene !== startScene) break;
    if (!s.player) { await wait(60); continue; }
    const dx = tx - s.player.x;
    const dy = ty - s.player.feet;
    last = { x: s.player.x, y: s.player.feet };
    if (Math.hypot(dx, dy) <= tol) break;
    const want = [];
    if (dx > 3) want.push('KeyD'); else if (dx < -3) want.push('KeyA');
    if (dy > 3) want.push('KeyS'); else if (dy < -3) want.push('KeyW');
    for (const k of KEYS) if (!want.includes(k)) await page.keyboard.up(k).catch(() => {});
    for (const k of want) await page.keyboard.down(k).catch(() => {});
    await wait(65);
  }
  await releaseAll();
  await wait(60);
  return last;
}
async function press(key, ms = 250) {
  await page.keyboard.press(key);
  await wait(ms);
}
async function counts() {
  const s = await state();
  const out = {};
  for (const slot of s.inventory) if (slot) out[slot.id] = (out[slot.id] || 0) + slot.count;
  return out;
}
async function closeModals() {
  let s = await state();
  if (s.chestOpen) { await press('Escape', 250); }
  s = await state();
  if (s.dialogOpen) { await press('KeyB', 250); }
}
async function ensure(id, n = 1) {
  let c = await counts();
  if ((c[id] || 0) >= n) return;
  await press('KeyE', 250);
  c = await counts();
  if ((c[id] || 0) >= n) return;
  await press('KeyB', 150);
  await press('KeyE', 250);
  c = await counts();
  if ((c[id] || 0) < n) {
    const s = await state();
    throw new Error(`no se pudo juntar ${id}: ${JSON.stringify({ inv: c, player: s.player })}`);
  }
}

try {
  await page.goto('http://localhost:5199/', { waitUntil: 'networkidle' });
  await wait(700);
  await shot('00-title');

  await press('KeyE', 400);
  await waitScene('attic');
  await waitQuiet();
  await shot('01-attic-start');

  // --- Cursor sobre la mesa, con teclado y con joystick.
  await walkTo(184, 144);
  await walkTo(232, 144);
  await shot('02-behind-table-ysort');
  await walkTo(232, 176, { tol: 10 });
  await press('ArrowUp', 120);
  await wait(200);
  await shot('03-action-cursor-keyboard');
  await page.evaluate(() => {
    window.__fakePad = {
      connected: true, axes: [0.8, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })),
    };
    Object.defineProperty(navigator, 'getGamepads', { value: () => [window.__fakePad], configurable: true });
  });
  await wait(200);
  await shot('04-action-cursor-gamepad');
  await page.evaluate(() => { delete window.__fakePad; Object.defineProperty(navigator, 'getGamepads', { value: () => [], configurable: true }); });
  await page.keyboard.press('ArrowDown');
  await wait(120);

  // --- Juntar las cuatro piezas del piso (iman).
  await walkTo(100, 176);
  await shot('05-magnet-pickup');
  await wait(600);
  await ensure('tela');
  await walkTo(100, 220);
  await walkTo(168, 280);
  await wait(600);
  await ensure('botas');
  await walkTo(408, 280);
  await walkTo(408, 220);
  await walkTo(408, 206);
  await wait(600);
  await ensure('guantes');
  await walkTo(488, 206);
  await walkTo(488, 150);
  await wait(600);
  await ensure('casco');
  // --- Cofre del altillo: tiras de goma.
  await walkTo(456, 220);
  await walkTo(456, 248);
  await walkTo(472, 248);
  for (let i = 0; i < 3 && !(await state()).chestOpen; i++) await press('KeyE', 350);
  if (!(await state()).chestOpen) throw new Error('el cofre no se abre');
  await shot('06-container-crate');
  for (let i = 0; i < 3; i++) {
    await press('KeyE', 350);
    if ((await counts()).tiras === 2) break;
  }
  await press('Escape', 300);
  if ((await state()).chestOpen) await press('KeyB', 300);
  if ((await state()).chestOpen) throw new Error('el cofre no se cierra');
  let inv = await counts();
  if (inv.tiras !== 2) throw new Error(`tiras=${inv.tiras} (se esperaban 2)`);
  await walkTo(424, 238, { tol: 6 });
  await wait(800);
  await ensure('oxigeno');
  await closeModals();
  console.log('piezas', await counts());

  // --- Fabricar el traje y ponerselo en el altillo.
  await closeModals();
  await press('KeyI', 300);
  if (!(await state()).menuOpen) throw new Error(`el menu no se abre: ${JSON.stringify(await state()).slice(0,600)}`);
  await press('KeyR', 300);
  await shot('09-crafting-menu');
  await press('KeyE', 400);
  if (!(await state()).crafted) throw new Error('no se fabrico el traje');
  await press('KeyQ', 300);
  await shot('10-crafted-suit-in-inventory');
  const trajeIndex = (await state()).inventory.findIndex((slot) => slot && slot.id === 'traje');
  for (let i = 0; i < trajeIndex; i++) await press('ArrowRight', 90);
  await press('KeyE', 60);
  for (let i = 0; i < 30; i++) {
    const s = await page.evaluate(() => ({ fade: window.__eternauta.game.fade, anim: Boolean(window.__eternauta.game.equipAnim), suit: window.__eternauta.state().hasSuit }));
    if (s.anim && s.fade > 0.55) { await shot('11-putting-on-suit'); break; }
    await wait(40);
  }
  await wait(1400);
  await walkTo(350, 160, { tol: 8 });
  await page.keyboard.press('ArrowDown');
  await wait(2800);
  await shot('12-suited-player-attic');
  let s2 = await state();
  if (!s2.hasSuit) throw new Error('el traje no se puso');

  // --- Bajar por la escalera (warp con fundido).
  await walkTo(340, 220);
  await walkTo(340, 270);
  await walkTo(400, 272);
  await walkTo(472, 272);
  await walkTo(528, 272);
  console.log('before stairs', await state());
  await walkTo(528, 302, { tol: 6, timeout: 8000 });
  await waitScene('house');
  for (let i = 0; i < 30; i++) {
    const fade = await page.evaluate(() => window.__eternauta.game.fade);
    if (fade > 0.3 && fade < 0.95) { await shot('07-door-warp'); break; }
    await wait(25);
  }
  await waitQuiet();
  await shot('08-house');

  // --- Salir a la calle con el traje (por la casa).
  await walkTo(232, 220);
  await walkTo(528, 264);
  await walkTo(528, 300);
  await waitScene('house');
  await waitQuiet();
  await walkTo(144, 110);
  await walkTo(144, 172);
  await walkTo(300, 172);
  await walkTo(400, 200);
  await walkTo(432, 272);
  await walkTo(432, 288, { tol: 10 });
  await wait(250);
  await shot('13-suited-exit-prompt');
  console.log('before exit', await state());
  await walkTo(432, 304, { tol: 4, timeout: 6000 });
  await waitScene('street');
  await waitQuiet();
  console.log('street', await state());
  await shot('14-street-with-suit');

  // --- Caminar hasta el final de la calle, con huellas.
  await walkTo(176, 120, { tol: 10 });
  await shot('15-behind-tree-ysort');
  await walkTo(200, 140);
  await page.keyboard.down('KeyD');
  await wait(1400);
  await page.keyboard.up('KeyD');
  await wait(250);
  await shot('16-footprints');
  const reach = await walkTo(1240, 140, { tol: 6, timeout: 45000 });
  console.log('street end reach', reach, await state());
  await waitScene('end');
  await waitQuiet();
  await wait(500);
  await shot('17-end');

  // --- Aviso de salida sin traje (partida nueva, puerta de calle).
  await page.evaluate(() => window.__eternauta.go('title'));
  await wait(500);
  await page.keyboard.press('KeyE');
  await waitScene('attic');
  await waitQuiet();
  await page.evaluate(() => {
    window.__eternauta.setSuit(false);
    window.__eternauta.go('house', { x: 27 * 16 + 8, y: 17 * 16 + 8, dir: 'down' });
  });
  await wait(600);
  await shot('18-exit-prompt-no-suit');
  await press('KeyE', 300);
  await shot('19-exit-warning-no-suit');
  await press('KeyB', 200);

  // --- Menu con barra de pistas y glifos de teclado.
  await press('KeyI', 300);
  await shot('20-menu-hintbar-keyboard');
  await page.evaluate(() => {
    window.__fakePad = { connected: true, axes: [0.8, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })) };
    Object.defineProperty(navigator, 'getGamepads', { value: () => [window.__fakePad], configurable: true });
  });
  await wait(200);
  await shot('21-menu-hintbar-gamepad');
  await press('Escape', 200);

  // --- Pantalla de Controles con los glifos grandes.
  await page.evaluate(() => window.__eternauta.go('title'));
  await wait(500);
  await page.keyboard.press('ArrowDown');
  await wait(200);
  await page.keyboard.press('KeyE');
  await wait(400);
  await shot('22-controls');

  const aliases = {
    'crafted-suit-in-inventory': '10-crafted-suit-in-inventory',
    'putting-on-suit': '11-putting-on-suit',
    'suited-player-attic': '12-suited-player-attic',
    'exit-warning-no-suit': '19-exit-warning-no-suit',
    'suited-exit-prompt': '13-suited-exit-prompt',
    'street-with-suit': '14-street-with-suit',
    footprints: '16-footprints',
    end: '17-end',
    'action-tile-cursor': '03-action-cursor-keyboard',
    'magnet-pickup': '05-magnet-pickup',
    'walking-behind-table': '02-behind-table-ysort',
    'door-warp': '07-door-warp',
    'prompt-controller': '04-action-cursor-gamepad',
    'prompt-keyboard': '03-action-cursor-keyboard',
    'menu-hintbar-gamepad': '21-menu-hintbar-gamepad',
  };
  for (const [dst, src] of Object.entries(aliases)) {
    fs.copyFileSync(`${OUT}/${src}.png`, `${OUT}/${dst}.png`);
  }
  const final = await state();
  console.log('FINAL', JSON.stringify(final).slice(0, 400));
  console.log('ERRORS', errors.filter((e) => !e.includes('404')).slice(0, 5));
} finally {
  await browser.close();
}
