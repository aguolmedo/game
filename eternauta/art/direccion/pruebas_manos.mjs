// Pruebas funcionales de Manos en headless (docs/diseno_manos.md §10 y brief).
// Chromium + SwiftShader, sin abrir ventanas.
// Uso: npx vite --port 5197 --strictPort & ; URL=http://localhost:5197/ node art/direccion/pruebas_manos.mjs
import { chromium } from 'playwright-core';

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
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(ok ? 'OK  ' : 'FAIL', name, detail);
}

const settle = async (ms = 600) => {
  await page.waitForFunction(() => {
    const s = window.__eternauta.state();
    return !s.transition && s.fade === 0;
  }, { timeout: 8000 }).catch(() => {});
  await wait(ms);
};

async function reset(scene = 'house') {
  await page.goto(URL);
  await page.waitForFunction(() => window.__eternauta, { timeout: 15000 });
  await wait(500);
  await api(() => { window.__eternauta.game.story.shown.intro = true; });
  await api((s) => window.__eternauta.go(s), scene);
  await settle();
}

async function teleport(x, feet, dir) {
  await api(([px, pf, pd]) => window.__eternauta.teleport(px, pf, pd), [x, feet, dir]);
  await settle(450);
}

async function pointAt(wx, wy) {
  return api(([x, y]) => {
    const s = window.__eternauta.game.scene;
    const v = s.worldToView(x, y);
    const c = document.querySelector('canvas');
    const r = c.getBoundingClientRect();
    return {
      x: r.left + (v.x / 480) * r.width,
      y: r.top + (v.y / 270) * r.height,
    };
  }, [wx, wy]);
}

async function pointTile(tx, ty) {
  return pointAt(tx * 16 + 8, ty * 16 + 8);
}

async function hover(x, y) {
  const p = await pointAt(x, y);
  await page.mouse.move(p.x, p.y);
  await wait(280);
  return p;
}

/** Levanta/agarra con Manos usando el A del pad (sin gamepad físico). */
async function handsAtObject(id) {
  return api(async (wanted) => {
    const { pickTarget } = await import('/src/interaction.js');
    const { candidateAccessTiles } = await import('/src/reach.js');
    const s = window.__eternauta.game.scene;
    const cands = s.candidates().filter(Boolean);
    const cand = cands.find((c) => c.id === wanted);
    if (!cand) return { ok: false, why: 'sin candidato' };
    for (const key of candidateAccessTiles(cand, s.mapData)) {
      const [tx, ty] = key.split(',').map(Number);
      for (const dir of ['up', 'down', 'left', 'right']) {
        const player = { x: tx * 16 + 8, feet: ty * 16 + 12, dir };
        const hit = pickTarget(player, cands, { dir, map: s.mapData });
        if (hit.target?.id !== wanted) continue;
        window.__eternauta.teleport(tx * 16 + 8, ty * 16 + 12, dir);
        s.target = hit.target;
        const action = s.handsActionFor({ device: 'pad' }).action;
        s.runHands(action, { device: 'pad' });
        return {
          ok: Boolean(action), label: action?.label, spot: [tx, ty, dir],
        };
      }
    }
    return { ok: false, why: 'sin acceso' };
  }, id);
}

async function state() {
  return api(() => window.__eternauta.state());
}

// ---------------------------------------------------------------- 1. piso
await reset('house');
await api(() => window.__eternauta.give('mate_vacio', 1));
await teleport(19 * 16 + 8, 13 * 16 + 12, 'right');
await hover(19 * 16 + 8, 14 * 16 + 8);
let s = await state();
check('silueta válida al apuntar un casillero libre',
  await api(() => {
    const sc = window.__eternauta.game.scene;
    return sc.ghostInfo?.valid === true && sc.handsAction?.kind === 'drop';
  }));
let p = await pointTile(19, 14);
await page.mouse.click(p.x, p.y, { button: 'right' });
await wait(320);
s = await state();
const floor1 = s.world.house.items.filter((wi) => wi.place?.kind === 'floor');
check('dejar el mate en el piso de la casa',
  floor1.length === 1 && floor1[0].itemId === 'mate_vacio',
  JSON.stringify(floor1));

// ---------------------------------------------------- 2. garaje y vuelta
await api(() => window.__eternauta.go('garage'));
await settle(700);
await api(() => window.__eternauta.go('house'));
await settle(700);
s = await state();
check('la cosa sigue en el piso al ir al garaje y volver',
  s.world.house.items.some((wi) => wi.place?.kind === 'floor'
    && wi.place.tx === 19 && wi.place.ty === 14));

// ------------------------------------------ 3. agarrar parado encima
await teleport(19 * 16 + 8, 14 * 16 + 12, 'up');
await hover(19 * 16 + 8, 14 * 16 + 10);
s = await state();
check('parado encima, el cuadradito apunta a la cosa',
  await api(() => {
    const sc = window.__eternauta.game.scene;
    return sc.target?.kind === 'floorItem' && sc.handsAction?.kind === 'grab';
  }));
p = await pointTile(19, 14);
await page.mouse.click(p.x, p.y, { button: 'right' });
await wait(320);
s = await state();
check('agarrar del piso parado encima',
  s.inventory.filter(Boolean).some((it) => it.id === 'mate_vacio')
  && !s.world.house.items.some((wi) => wi.place?.kind === 'floor'));

// ------------------------------------ 4. click sobre Juan = uso propio
await reset('house');
await api(() => { window.__eternauta.give('mate_vacio', 1); window.__eternauta.give('yerba', 1); });
await teleport(5 * 16 + 8, 7 * 16 + 12, 'down');
const pp = await api(() => {
  const sc = window.__eternauta.game.scene;
  const v = sc.worldToView(sc.player.x, sc.player.feet - 18);
  const c = document.querySelector('canvas');
  const r = c.getBoundingClientRect();
  return { x: r.left + (v.x / 480) * r.width, y: r.top + (v.y / 270) * r.height };
});
await page.mouse.move(pp.x, pp.y);
await wait(280);
check('sobre Juan la barra anuncia el uso propio',
  await api(() => {
    const sc = window.__eternauta.game.scene;
    const hints = sc.hudParams({ device: 'mouse' }).hintActions;
    return sc.selfHover && hints.some((h) => h.label === 'Ponerle yerba');
  }));
await page.mouse.click(pp.x, pp.y);
await wait(320);
s = await state();
check('click sobre Juan usa el ítem en uno mismo',
  s.inventory.filter(Boolean).some((it) => it.id === 'mate_yerba'));

// ------------------------------ 5. Acción sin objetivo (pad) = uso propio
await api(() => {
  const g = window.__eternauta.game;
  g.inventory = Array(18).fill(null);
  g.inventory[0] = { id: 'mate_cebado', count: 1 };
  g.selectedSlot = 0;
  g.scene.target = null;
});
const selfLabel = await api(() => {
  const sc = window.__eternauta.game.scene;
  return sc.actionLabel(null);
});
check('Acción sin objetivo anuncia el uso propio', selfLabel === 'Tomar mate', selfLabel);

// ----------------------------------- 6. E, R y F no hacen nada en el mundo
await reset('house');
await api(() => window.__eternauta.teleport(112, 160, 'up'));
await settle(400);
const beforeFlags = await api(() => JSON.stringify(window.__eternauta.state().flags));
for (const key of ['KeyE', 'KeyR', 'KeyF', 'Space', 'Enter']) {
  await page.keyboard.press(key);
  await wait(80);
}
await settle(300);
s = await state();
check('E/R/F/Espacio/Enter no actúan en el mundo',
  beforeFlags === JSON.stringify(s.flags));

// ------------------------------------------- 7. mover la silla y apoyarla
await reset('house');
await teleport(19 * 16 + 8, 13 * 16 + 12, 'right');
const lift = await handsAtObject('kchair_l');
check('levantar la silla de la cocina', lift.ok && lift.label === 'Levantar la silla',
  JSON.stringify(lift));
await settle(400);
s = await state();
check('la silla va sobre la cabeza y Juan camina al 80 %',
  s.carry?.objectId === 'kchair_l'
  && await api(() => window.__eternauta.game.scene.player.speedScale === 0.8));
check('no se puede cambiar de mapa cargando',
  await api(() => {
    const sc = window.__eternauta.game.scene;
    return !sc.canWarp(sc.mapData.warps[0]);
  }));
await teleport(19 * 16 + 8, 13 * 16 + 12, 'right');
const support = await api(() => {
  const sc = window.__eternauta.game.scene;
  const action = sc.handsActionFor({ device: 'pad' }).action;
  if (action) sc.runHands(action, { device: 'pad' });
  return { label: action?.label, moved: sc.worldState.moved.kchair_l };
});
check('apoyar la silla en un casillero válido',
  support.label === 'Apoyar la silla'
  && support.moved?.tx === 20 && support.moved?.ty === 13,
  JSON.stringify(support));
s = await state();
check('el mueble movido persiste en game.world[map].moved',
  s.world.house.moved.kchair_l?.tx === 20);

// --------------------------------------- 8. "Taparía el paso." en el vano
await reset('house');
await teleport(19 * 16 + 8, 13 * 16 + 12, 'right');
await handsAtObject('kchair_l');
await teleport(11 * 16 + 8, 5 * 16 + 12, 'right');
await hover(12 * 16 + 8, 5 * 16 + 8);
check('apoyar en el vano avisa "Taparía el paso."',
  await api(() => {
    const sc = window.__eternauta.game.scene;
    return sc.handsAction === null
      && sc.handsFeedback?.text === 'Taparía el paso.';
  }));

// ------------------------------- 9. la pava se agarra del fuego con Manos
await reset('house');
await api(() => window.__eternauta.placePava('stove'));
await settle(400);
const pava = await handsAtObject('stove');
await wait(300);
s = await state();
check('Manos agarra la pava del fuego',
  pava.label === 'Agarrar la pava'
  && s.inventory.filter(Boolean).some((it) => /^pava_/.test(it.id))
  && s.pavaStation == null,
  JSON.stringify(pava));

// ------------------- 10. tirar la yerba en el balde después de moverlo
await reset('house');
await handsAtObject('kitchen_bucket');
await wait(350);
const bucketSpot = await api(() => {
  const sc = window.__eternauta.game.scene;
  for (const [px, py, dir] of [[24, 13, 'down'], [25, 13, 'down'], [24, 14, 'right'], [26, 13, 'down']]) {
    window.__eternauta.teleport(px * 16 + 8, py * 16 + 12, dir);
    const a = sc.handsActionFor({ device: 'pad' }).action;
    if (a?.kind === 'support') {
      sc.runHands(a, { device: 'pad' });
      return { tx: a.payload.tx, ty: a.payload.ty };
    }
  }
  return null;
});
await settle(300);
const dump = await api(async () => {
  const { pickTarget } = await import('/src/interaction.js');
  const { candidateAccessTiles } = await import('/src/reach.js');
  window.__eternauta.give('mate_lavado', 1);
  const sc = window.__eternauta.game.scene;
  const cands = sc.candidates().filter(Boolean);
  const cand = cands.find((c) => c.id === 'kitchen_bucket');
  for (const key of candidateAccessTiles(cand, sc.mapData)) {
    const [tx, ty] = key.split(',').map(Number);
    for (const dir of ['up', 'down', 'left', 'right']) {
      const player = { x: tx * 16 + 8, feet: ty * 16 + 12, dir };
      const hit = pickTarget(player, cands, { dir, map: sc.mapData });
      if (hit.target?.id !== 'kitchen_bucket') continue;
      window.__eternauta.teleport(tx * 16 + 8, ty * 16 + 12, dir);
      sc.target = hit.target;
      const label = sc.actionLabel(hit.target);
      window.__eternauta.action();
      return {
        label,
        inv: sc.game.inventory.filter(Boolean).map((it) => it.id),
        toasts: sc.hud.toasts.map((t) => t.text),
      };
    }
  }
  return null;
});
check('el balde movido sigue sirviendo para tirar la yerba',
  Boolean(bucketSpot) && dump?.label === 'Tirar la yerba'
  && dump.inv.includes('mate_vacio')
  && dump.toasts.some((t) => /Tiraste la yerba/.test(t)),
  JSON.stringify({ bucketSpot, dump }));

// ----------------------------------------------- 11. recorrido del mate
const loop = await api(() => {
  const sc = window.__eternauta.game.scene;
  window.__eternauta.game.inventory = Array(18).fill(null);
  window.__eternauta.give('mate_vacio', 1);
  window.__eternauta.give('yerba', 1);
  window.__eternauta.give('pava_caliente', 1);
  sc.target = null;
  const out = [];
  for (let i = 0; i < 3; i++) {
    const label = sc.actionLabel(null);
    window.__eternauta.action();
    out.push({ label, inv: sc.game.inventory.filter(Boolean).map((it) => it.id) });
  }
  return out;
});
check('ciclo del mate: yerba -> cebar -> tomar',
  loop[0].label === 'Ponerle yerba' && loop[0].inv.includes('mate_yerba')
  && loop[1].label === 'Cebar' && loop[1].inv.includes('mate_cebado')
  && loop[2].label === 'Tomar mate',
  JSON.stringify(loop));

// ------------------------------------- 12. silueta inválida con mouse
await reset('house');
await api(() => window.__eternauta.give('mate_vacio', 1));
await teleport(11 * 16 + 8, 7 * 16 + 12, 'right');
await hover(12 * 16 + 8, 7 * 16 + 8);
check('lugar inválido: silueta rojiza y "No entra ahí."',
  await api(() => {
    const sc = window.__eternauta.game.scene;
    return sc.ghostInfo?.valid === false
      && sc.handsAction === null
      && sc.handsFeedback?.text === 'No entra ahí.';
  }));

// ----------------------------------- 13. la historia apoya sola el mueble
await reset('house');
await handsAtObject('kchair_l');
await wait(300);
await api(() => window.__eternauta.go('garage'));
await settle(800);
s = await state();
check('si la historia cambia de mapa, el mueble se apoya solo',
  s.carry === null && s.world.house.moved.kchair_l !== undefined,
  JSON.stringify(s.carry));

// ------------------------------------------------------- 14. reset borra
await api(() => window.__eternauta.game.newGame());
await settle(500);
s = await state();
check('reset() borra las cosas y los muebles movidos del mundo',
  Object.values(s.world).every((w) => (w.items || []).every(
    (wi) => wi.place?.kind !== 'floor',
  ) && Object.keys(w.moved || {}).length === 0));

// ------------------------------------------------------------- cierre
check('sin errores de página', errors.length === 0, errors.slice(0, 3).join(' | '));
const fails = results.filter((r) => !r.ok);
console.log(`\n${results.length - fails.length}/${results.length} pruebas OK`);
await browser.close();
process.exit(fails.length === 0 ? 0 : 1);
