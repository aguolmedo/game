// Capturas de los controles unificados (DIRECCION.md, "Controles e interacción").
// Chromium headless a 1920x1080 = vista 480x270 x4. No abre ventanas.
// Uso (desde eternauta/):
//   npx vite --port 5197 --strictPort &
//   URL=http://localhost:5197/ node art/direccion/capturas_ctrl.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const OUT = 'art/direccion/doc/capturas';
fs.mkdirSync(OUT, { recursive: true });
const URL = process.env.URL || 'http://localhost:5197/';

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

async function reset(scene) {
  await page.goto(URL);
  await page.waitForFunction(() => window.__eternauta, { timeout: 15000 });
  await wait(500);
  await api(() => { window.__eternauta.game.story.shown.intro = true; });
  await api((s) => window.__eternauta.go(s), scene);
  await settle();
}

/** px de pantalla del punto del mundo (centro del dibujo). */
async function pointAt(wx, wy) {
  return api(([x, y]) => {
    const s = window.__eternauta.game.scene;
    const v = s.worldToView(x, y);
    const c = document.querySelector('canvas');
    const r = c.getBoundingClientRect();
    return { x: r.left + (v.x / 480) * r.width, y: r.top + (v.y / 270) * r.height };
  }, [wx, wy]);
}

/** Mueve el puntero al centro de un objeto interactivo (para ver su barra). */
async function hoverObject(id) {
  const at = await api((wanted) => {
    const s = window.__eternauta.game.scene;
    const o = (s.mapData.objects || []).find((x) => x.id === wanted);
    if (!o) return null;
    return { x: o.x * 16 + (o.tw || 1) * 8, y: o.y * 16 + (o.th || 1) * 8 };
  }, id);
  if (!at) return false;
  const p = await pointAt(at.x, at.y);
  await page.mouse.move(p.x, p.y);
  await wait(260);
  return true;
}

async function setDevice(device) {
  // Ya no existe el dispositivo "keyboard": el teclado acompaña al mouse.
  await api((d) => {
    const i = window.__eternauta.game.input;
    i.lastDevice = d === 'keyboard' ? 'mouse' : d;
    i.mouseActivity = false;
  }, device);
  await wait(160);
}

async function teleport(x, feet, dir) {
  await api(([px, pf, pd]) => window.__eternauta.teleport(px, pf, pd), [x, feet, dir]);
  await settle(500);
}

/** Casillero de acceso y dirección donde la E elige exactamente `id`. */
async function spotFor(id) {
  return api(async (wanted) => {
    const { pickTarget } = await import('/src/interaction.js');
    const { candidateAccessTiles } = await import('/src/reach.js');
    const s = window.__eternauta.game.scene;
    const map = s.mapData;
    const cands = s.candidates().filter(Boolean);
    const c = cands.find((x) => x.id === wanted);
    if (!c) return null;
    const access = [...candidateAccessTiles(c, map)];
    for (const key of access) {
      const [tx, ty] = key.split(',').map(Number);
      for (const dir of ['up', 'down', 'left', 'right']) {
        const player = { x: tx * 16 + 8, feet: ty * 16 + 12, dir };
        const hit = pickTarget(player, cands, { dir, map });
        if (hit.target?.id === wanted) {
          return { x: tx * 16 + 8, feet: ty * 16 + 12, dir };
        }
      }
    }
    return null;
  }, id);
}

async function shot(name) {
  await wait(180);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  const state = await api(() => window.__eternauta.state());
  console.log('ok  ', name, `(${state.device}, objetivo: ${state.scene})`);
}

// 1. Cuadradito cerca (teclado): radio del living de la casa.
await reset('house');
await teleport(2 * 16 + 8, 7 * 16 + 12, 'up');
await setDevice('keyboard');
await shot('ctrl_cursor_cerca');

// 2. Cuadradito lejos (mouse sobre la ventana, lejos del jugador).
await page.mouse.move(1200, 700);
await teleport(2 * 16 + 8, 7 * 16 + 12, 'up');
const win = await pointAt(112, 32);
await page.mouse.move(win.x, win.y);
await wait(220);
await shot('ctrl_cursor_lejos');

// 3. Cuadradito sobre un ítem apoyado (mesa de truco del altillo).
await reset('attic');
await teleport(10 * 16 + 8, 8 * 16 + 12, 'up');
await setDevice('keyboard');
await shot('ctrl_cursor_apoyado');

// 4. Frente al sofá, la ventana del living (teclado).
await reset('house');
await teleport(7 * 16 + 8, 5 * 16 + 12, 'up');
await setDevice('keyboard');
await shot('ctrl_cursor_sofa_ventana');

// 5. Barra con los tres dispositivos, mismo lugar y objetivo.
await page.mouse.move(1200, 700);
const win2 = await pointAt(112, 32);
await page.mouse.move(win2.x, win2.y);
await wait(220);
await shot('ctrl_barra_mouse');
await setDevice('keyboard');
await shot('ctrl_barra_teclado');
await setDevice('pad');
await shot('ctrl_barra_pad');

// 6. Tipos de objeto (DIRECCION.md): dos botones, sin entrada Mirar aparte.
// Parlante (decorado): Hacer lo mira, sin una entrada Mirar suelta.
await reset('attic');
const speakerSpot = await spotFor('speaker');
if (speakerSpot) await teleport(speakerSpot.x, speakerSpot.feet, speakerSpot.dir);
await setDevice('keyboard');
await hoverObject('speaker');
await shot('tipos_parlante');

// Radio (aparato): Prender la radio, sin entrada Mirar.
await reset('attic');
const radioSpot = await spotFor('radio');
if (radioSpot) await teleport(radioSpot.x, radioSpot.feet, radioSpot.dir);
await setDevice('keyboard');
await hoverObject('radio');
await shot('tipos_radio');

// Ventana del living (vista): Asomarse, sin entrada Mirar.
await reset('house');
const winSpot = await spotFor('window_living');
if (winSpot) await teleport(winSpot.x, winSpot.feet, winSpot.dir);
await setDevice('keyboard');
await hoverObject('window_living');
await shot('tipos_ventana');

// Hover sobre "Mochila": la única entrada clickeable se resalta.
await reset('attic');
await page.mouse.move(10, 10);
await wait(200);
const bag = await api(() => {
  const s = window.__eternauta.game.scene;
  const hints = s.hudParams({ device: 'mouse' }).hintActions || [];
  const layout = s.hud.hintLayout('mouse', hints);
  const b = layout.boxes.find((x) => x.action === 'bag');
  if (!b) return null;
  const c = document.querySelector('canvas');
  const r = c.getBoundingClientRect();
  return {
    x: r.left + ((b.rect.x + b.rect.w / 2) / 480) * r.width,
    y: r.top + ((b.rect.y + b.rect.h / 2) / 270) * r.height,
  };
});
if (bag) await page.mouse.move(bag.x, bag.y);
await wait(260);
await shot('tipos_mochila_hover');

// 7. Dos botones: la línea de mirar de la primera vez (escalera), antes de
//    cambiar de ambiente. Se dispara con Hacer y se captura mientras se lee.
await reset('house');
// Un casillero de piso debajo de la escalera (fuera del warp, que ocupa
// y=1..4): así el paso se dispara con Hacer y no caminando encima.
await teleport(2 * 16 + 8, 5 * 16 + 12, 'up');
await setDevice('mouse');
await page.waitForFunction(() => {
  const s = window.__eternauta.game.scene;
  return s && s.name === 'house'
    && (s.mapData?.warps || []).some((w) => w.id === 'stairs_up');
}, { timeout: 8000 }).catch(() => {});
const stairsRect = await api(() => {
  const w = window.__eternauta.game.scene.mapData.warps.find((x) => x.id === 'stairs_up');
  return w ? { x: w.x + w.w / 2, y: w.y + w.h / 2 } : null;
});
if (stairsRect) {
  const p = await pointAt(stairsRect.x, stairsRect.y);
  await page.mouse.move(p.x, p.y);
  await wait(220);
  await page.mouse.click(p.x, p.y);
  await wait(320);
  await page.screenshot({ path: `${OUT}/dos_primera_vez.png` });
  console.log('ok   dos_primera_vez');
} else {
  console.log('FAIL dos_primera_vez (sin escalera)');
}

// 8. Pantalla de Controles (tabla nueva de dos botones).
await page.goto(URL);
await page.waitForFunction(() => window.__eternauta, { timeout: 15000 });
await wait(2200);
await api(() => {
  const menu = window.__eternauta.game.scene.menu;
  menu.activate(2);
  menu.draw();
});
await wait(350);
await page.screenshot({ path: `${OUT}/ctrl_pantalla_controles.png` });
console.log('ok   ctrl_pantalla_controles');

console.log(errors.length
  ? `errores de página:\n${errors.slice(0, 8).join('\n')}`
  : 'sin errores de página');
await browser.close();
