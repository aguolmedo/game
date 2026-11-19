// Auditoría de alcance (regla única de casilleros de acceso, DIRECCION.md).
// Recorre todos los mapas, cuenta los accesos de cada interactivo con los
// candidatos REALES de la escena y verifica que la E y el click eligen lo
// mismo desde cada acceso. Imprime 0 fallos cuando está todo bien.
// Uso: npx vite --port 5197 --strictPort &  URL=http://localhost:5197/ node art/concept/auditoria_alcance.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const b = await chromium.launch({
  executablePath: `${process.env.HOME}/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
await p.goto(process.env.URL || 'http://localhost:5197/');
await p.waitForFunction(() => window.__eternauta, { timeout: 15000 });
await p.waitForTimeout(500);

const all = {};
for (const map of ['attic', 'house', 'garage', 'street']) {
  await p.evaluate((m) => {
    window.__eternauta.game.story.shown.intro = true;
    window.__eternauta.go(m);
  }, map);
  await p.waitForTimeout(900);
  all[map] = await p.evaluate(async () => {
    const { pickTarget, pickAt } = await import('/src/interaction.js');
    const {
      candidateAccessTiles, tileWalkable, playerInAccess,
    } = await import('/src/reach.js');
    const s = window.__eternauta.game.scene;
    const map = s.mapData;
    const cands = s.candidates().filter(Boolean);
    const playerAt = (tx, ty, dir) => ({ x: tx * 16 + 8, feet: ty * 16 + 12, dir });

    // BFS desde el spawn: los accesos tienen que ser alcanzables a pie.
    const spawn = map.spawn || { x: 16, y: 16 };
    const start = { tx: Math.floor(spawn.x / 16), ty: Math.floor((spawn.y - 1) / 16) };
    const seen = new Set();
    const q = [];
    const key = (t) => `${t.tx},${t.ty}`;
    if (tileWalkable(map, start.tx, start.ty)) { seen.add(key(start)); q.push(start); }
    while (q.length) {
      const t = q.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = { tx: t.tx + dx, ty: t.ty + dy };
        if (seen.has(key(n)) || !tileWalkable(map, n.tx, n.ty)) continue;
        seen.add(key(n));
        q.push(n);
      }
    }

    const out = [];
    for (const c of cands) {
      const access = [...candidateAccessTiles(c, map)].filter((k) => seen.has(k));
      const dirs = ['up', 'down', 'left', 'right'];
      let byE = 0;
      let byClick = 0;
      let mismatch = 0;
      for (const k of access) {
        const [tx, ty] = k.split(',').map(Number);
        for (const dir of dirs) {
          const player = playerAt(tx, ty, dir);
          const e = pickTarget(player, cands, { dir, map });
          if (!e.target) continue;
          byE += 1;
          const box = e.target.cursorBox || { x: e.target.x - 8, y: e.target.y - 16, w: 16, h: 16 };
          const hit = pickAt(player, cands, {
            x: box.x + box.w / 2, y: box.y + box.h / 2,
          }, { dir, map });
          if (hit.target?.id === e.target.id && hit.near) byClick += 1;
          else mismatch += 1;
        }
      }
      out.push({
        id: c.id, kind: c.kind, label: c.label || '',
        access: access.length, byE, byClick, mismatch,
        ok: access.length > 0 && byE > 0 && mismatch === 0,
      });
    }
    return { walk: seen.size, out };
  });
  const r = all[map];
  const bad = r.out.filter((o) => !o.ok);
  console.log(`\n== ${map} (${r.walk} casilleros caminables, ${r.out.length} interactivos)`);
  for (const o of bad) {
    console.log(`  FALLA ${o.id} [${o.kind}] "${o.label}" accesos:${o.access} E:${o.byE} click:${o.byClick} dispares:${o.mismatch}`);
  }
  console.log(`  (${r.out.length - bad.length} OK, ${bad.length} fallos)`);
  all[map].failures = bad.length;
}
const total = Object.values(all).reduce((n, r) => n + r.failures, 0);
console.log(`\nFallos totales: ${total}`);
fs.mkdirSync(process.env.OUTDIR || 'art/concept/out', { recursive: true });
fs.writeFileSync(process.env.OUT || 'art/concept/out/auditoria_alcance.json', JSON.stringify(all, null, 1));
if (errors.length) console.log(`errores de página:\n${errors.slice(0, 8).join('\n')}`);
await b.close();
process.exit(total === 0 ? 0 : 1);
