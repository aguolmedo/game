// Base para los concepts de planta baja v4: la casa entera a 1x (sin zoom), sin HUD.
// Uso (desde eternauta/): npx vite --port 5199 --strictPort &  node art/concept/capturas_planta.mjs
// Salida: art/direccion/doc/capturas/raw_house_v4[_npc].png (1920x1080 = 480x270 x4) + .json con la cámara.
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const OUT = 'art/direccion/doc/capturas';
const browser = await chromium.launch({
  executablePath: `${process.env.HOME}/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(process.env.URL || 'http://localhost:5199/');
await page.waitForFunction(() => window.__eternauta, { timeout: 15000 });
await page.waitForTimeout(600);
await page.evaluate(() => { window.__eternauta.game.story.shown.intro = true; window.__eternauta.go('house'); });
await page.waitForTimeout(800);

async function shot(name, npcs) {
  const cam = await page.evaluate(async (npcs) => {
    const { viewport } = await import('/src/viewport.js');
    Object.assign(viewport, { worldPx: viewport.scale, worldW: 480, worldH: 270, zoom: 1 });
    const s = window.__eternauta.game.scene;
    if (s.uiScene) s.uiScene.visible = false;
    for (const n of s.npcs || []) if (n.sprite || n.mesh || n.group) (n.group || n.mesh || n.sprite).visible = npcs;
    s.player.place(29 * 16, 1 * 16, 'down');
    for (const k of ['mesh', 'shadow', 'sprite']) if (s.player[k]) s.player[k].visible = false;
    const c = s.world.cameraFor(0, 0);
    s.cam = { ...c };
    return c;
  }, npcs);
  await page.waitForTimeout(900);
  await page.mouse.move(1919, 1079);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  fs.writeFileSync(`${OUT}/${name}.json`, JSON.stringify({ cam }));
  console.log('ok', name, JSON.stringify(cam));
}
await shot('raw_house_v4_npc', true);
await shot('raw_house_v4', false);

// Propuesta v4: living rearmado, bidón y rueda adentro de la entrada, escalera vieja oculta
// (la nueva se pega en planta_v4.py). Mueve las mallas ya armadas: [id, izquierda, base].
await page.evaluate(async () => {
  const { depthFor } = await import('/src/sprite.js');
  const s = window.__eternauta.game.scene;
  const MOVES = [['sofa', 88, 77], ['entry_tire', 394, 142], ['bidon', 414, 141]];
  for (const [id, left, base] of MOVES) {
    const o = s.mapData.objects.find((x) => x.id === id);
    const m = o.mesh; const w = m.geometry.parameters.width; const h = m.geometry.parameters.height;
    m.position.set(Math.round(left + w / 2), Math.round(base - h / 2), depthFor(base));
  }
  const st = s.mapData.objects.find((x) => x.id === 'stairs_up');
  st.mesh.visible = false;
});
await shot('raw_house_v4_prop', true);
await browser.close();
