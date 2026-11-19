// Capturas de Manos (docs/diseno_manos.md §8, lámina art/concept/out/manos.png).
// Chromium headless a 1920x1080 = vista 480x270 x4. No abre ventanas.
// Uso (desde eternauta/):
//   npx vite --port 5197 --strictPort &
//   URL=http://localhost:5197/ node art/direccion/capturas_manos.mjs
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

async function setDevice(device) {
  await api((d) => {
    const i = window.__eternauta.game.input;
    i.lastDevice = d === 'keyboard' ? 'mouse' : d;
    i.mouseActivity = false;
  }, device);
  await wait(180);
}

async function teleport(x, feet, dir) {
  await api(([px, pf, pd]) => window.__eternauta.teleport(px, pf, pd), [x, feet, dir]);
  await settle(450);
}

/** px de pantalla del centro de un casillero del mundo. */
async function pointAtTile(tx, ty) {
  return api(([x, y]) => {
    const s = window.__eternauta.game.scene;
    const v = s.worldToView(x * 16 + 8, y * 16 + 8);
    const c = document.querySelector('canvas');
    const r = c.getBoundingClientRect();
    return {
      x: r.left + (v.x / 480) * r.width,
      y: r.top + (v.y / 270) * r.height,
    };
  }, [tx, ty]);
}

async function hoverTile(tx, ty) {
  const p = await pointAtTile(tx, ty);
  await page.mouse.move(p.x, p.y);
  await wait(260);
}

async function hoverPlayer() {
  const p = await api(() => {
    const s = window.__eternauta.game.scene;
    const v = s.worldToView(s.player.x, s.player.feet - 18);
    const c = document.querySelector('canvas');
    const r = c.getBoundingClientRect();
    return { x: r.left + (v.x / 480) * r.width, y: r.top + (v.y / 270) * r.height };
  });
  await page.mouse.move(p.x, p.y);
  await wait(260);
}

async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  const state = await api(() => {
    const s = window.__eternauta.game.scene;
    return {
      device: s.game.input.device,
      carry: s.game.carry ? s.game.carry.objectId : null,
      hands: s.handsAction ? s.handsAction.label : null,
      ghost: s.ghostInfo ? { valid: s.ghostInfo.valid } : null,
      feedback: s.handsFeedback ? s.handsFeedback.text : null,
    };
  });
  console.log('ok  ', name, JSON.stringify(state));
}

/** Agarra/levanta con la Acción de Manos (joystick), sin mouse. */
async function handsAtObject(id) {
  return api(async (wanted) => {
    const { pickTarget } = await import('/src/interaction.js');
    const { candidateAccessTiles } = await import('/src/reach.js');
    const s = window.__eternauta.game.scene;
    const cands = s.candidates().filter(Boolean);
    const c = cands.find((x) => x.id === wanted);
    if (!c) return { ok: false, why: 'sin candidato' };
    for (const key of candidateAccessTiles(c, s.mapData)) {
      const [tx, ty] = key.split(',').map(Number);
      for (const dir of ['up', 'down', 'left', 'right']) {
        const player = { x: tx * 16 + 8, feet: ty * 16 + 12, dir };
        const hit = pickTarget(player, cands, { dir, map: s.mapData });
        if (hit.target?.id !== wanted) continue;
        window.__eternauta.teleport(tx * 16 + 8, ty * 16 + 12, dir);
        s.target = hit.target;
        const action = s.handsActionFor({ device: 'pad' }).action;
        s.runHands(action, { device: 'pad' });
        return { ok: Boolean(action), action: action?.label, spot: [tx, ty, dir] };
      }
    }
    return { ok: false, why: 'sin acceso' };
  }, id);
}

// 1. Cosa en el piso con el cuadradito: se agarra con Manos (click derecho).
await reset('house');
await api(() => window.__eternauta.give('mate_vacio', 1));
await api(() => window.__eternauta.dropAt(0, 19, 14));
await teleport(19 * 16 + 8, 13 * 16 + 12, 'down');
await setDevice('mouse');
await hoverTile(19, 14);
await shot('manos_piso_agarrar');

// 2. Dejar: silueta válida y cuadradito en el casillero apuntado.
await reset('house');
await api(() => window.__eternauta.give('mate_vacio', 1));
await teleport(19 * 16 + 8, 13 * 16 + 12, 'right');
await setDevice('mouse');
await hoverTile(19, 14);
await shot('manos_dejar_silueta');

// 3. Lugar inválido con mouse: silueta rojiza y "No entra ahí.".
//    Un casillero vecino a la pared (sin objeto interactivo) muestra el rojo;
//    lejos, en cambio, corresponde "Acercate un poco." (§4).
await reset('house');
await api(() => window.__eternauta.give('mate_vacio', 1));
await teleport(11 * 16 + 8, 7 * 16 + 12, 'right');
await setDevice('mouse');
await hoverTile(12, 7);
await shot('manos_invalido');

// 4. Cargar un mueble liviano: la silla de la cocina sobre la cabeza y la
//    silueta de apoyar en el casillero de adelante.
await reset('house');
const lift = await handsAtObject('kchair_l');
if (!lift.ok) console.log('  aviso: no se pudo levantar la silla', JSON.stringify(lift));
await teleport(19 * 16 + 8, 13 * 16 + 12, 'right');
await setDevice('pad');
await wait(400);
await shot('manos_cargar_silla');

// 5. El vano de la puerta: "Taparía el paso." (mouse).
await teleport(11 * 16 + 8, 5 * 16 + 12, 'right');
await setDevice('mouse');
await hoverTile(12, 5);
await shot('manos_taparia');

// 6. Barra con cada caso.
await reset('house');
await api(() => window.__eternauta.give('mate_vacio', 1));
await teleport(19 * 16 + 8, 13 * 16 + 12, 'right');
await setDevice('mouse');
await hoverTile(19, 14);
await shot('manos_barra_dejar');

await reset('house');
await api(() => window.__eternauta.give('mate_cebado', 1));
await teleport(19 * 16 + 8, 13 * 16 + 12, 'up');
await setDevice('mouse');
await hoverPlayer();
await shot('manos_barra_sobre_juan');

await reset('house');
await api(() => window.__eternauta.give('mate_cebado', 1));
await teleport(5 * 16 + 8, 7 * 16 + 12, 'down');
await setDevice('pad');
await wait(360);
await shot('manos_barra_accion_sin_objetivo');

// 7. Manos sobre la pava del fuego.
await reset('house');
await api(() => window.__eternauta.placePava('stove'));
await teleport(24 * 16 + 8, 11 * 16 + 12, 'right');
await setDevice('pad');
await wait(360);
await shot('manos_barra_pava');

// 8. Pantalla de Controles nueva (mouse + teclado | joystick).
await page.goto(URL);
await page.waitForFunction(() => window.__eternauta, { timeout: 15000 });
await wait(2200);
await api(() => {
  const menu = window.__eternauta.game.scene.menu;
  menu.activate(2);
  menu.draw();
});
await wait(350);
await page.screenshot({ path: `${OUT}/manos_controles.png` });
console.log('ok   manos_controles');

console.log(errors.length
  ? `errores de página:\n${errors.slice(0, 8).join('\n')}`
  : 'sin errores de página');
await browser.close();
