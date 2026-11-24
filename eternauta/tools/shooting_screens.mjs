// Capturas headless del disparo de la arena (balas, fogonazo, vainas, baja).
// Uso: npx vite --port 5399 --strictPort & node tools/shooting_screens.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const PORT = process.env.PORT || 5399;
const SEED = 3455; // el mismo barrio que tools/salida_screens.mjs
const OUT = 'docs/screens/shooting';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: `${process.env.HOME}/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.stack || String(e)));
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  const text = m.text();
  if (/favicon|404/.test(text)) return;
  errors.push(text);
});
const wait = (ms) => page.waitForTimeout(ms);
const shot = async (name) => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.screenshot({ path: `${OUT}/${name}.png`, timeout: 90000 });
      console.log('shot', name);
      return;
    } catch (err) {
      console.log('reintento', name, String(err.message).split('\n')[0]);
      await wait(600);
    }
  }
  throw new Error(`No se pudo capturar ${name}`);
};
const state = () => page.evaluate(() => window.__eternauta.state());
const aimAt = (dx, dy = 0) => page.evaluate(([ax, ay]) => {
  const a = window.__eternauta.scenes.arena;
  const rect = document.querySelector('canvas').getBoundingClientRect();
  return {
    sx: rect.left + ((a.player.x + ax - a.cam.x) / 480) * rect.width,
    sy: rect.top + ((a.player.feet - 4 + ay - a.cam.y) / 270) * rect.height,
  };
}, [dx, dy]);

try {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__eternauta, null, { timeout: 15000 });
  await page.evaluate((seed) => {
    window.__eternauta.game.run = { loop: 1, seed };
    window.__eternauta.go('arena');
  }, SEED);
  await page.waitForFunction(() => window.__eternauta.state().scene === 'arena');
  await wait(900); // que carguen los fx

  const ready = await page.evaluate(() => {
    const a = window.__eternauta.scenes.arena;
    return { fx: a.shooting.ready(), bullets: a.shooting.count().bullets };
  });
  console.log('fx listo:', JSON.stringify(ready));

  // Tramo libre del barrio actual: Juan + un bicho 46 px a la derecha + la
  // bala, con el piso despejado (se busca con world.isSolid y canSpawnAt).
  const spot = await page.evaluate(() => {
    const a = window.__eternauta.scenes.arena;
    // La calle de abajo del barrio sembrado (la de salida_esquina): sin huecos del mapa a la vista.
    for (let y = 520; y <= 600; y += 8) {
      for (let x = 200; x <= 700; x += 8) {
        let clear = true;
        for (let dx = -20; dx <= 130 && clear; dx += 6) {
          if (a.world.isSolid({ x: x + dx - 5, y: y - 6, w: 10, h: 6 })) clear = false;
        }
        if (clear && a.canSpawnAt('veloz', x + 46, y) && a.canSpawnAt('cascarudo', x + 46, y)
          && !a.world.isSolid({ x: x - 5, y: y - 40, w: 10, h: 40 })) {
          return { x, y };
        }
      }
    }
    return null;
  });
  console.log('tramo libre:', JSON.stringify(spot));
  if (!spot) throw new Error('no hay tramo libre para el escenario');
  await page.evaluate((p) => { window.__spot = p; }, spot);

  // Escenario estable: ronda activa sin oleadas automáticas, en un tramo libre
  // de la calle (verificado con world.isSolid), apuntando a la derecha.
  await page.evaluate(() => {
    const a = window.__eternauta.scenes.arena;
    a.phase = 'active';
    a.spawnTimer = 999;
    a.cfg = { ...a.cfg, total: 9999 };
    a.clearEnemies();
    a.shooting.reset();
    const { x, y } = window.__spot;
    window.__eternauta.teleport(x, y, 'right');
    a.cam = a.world.cameraFor(x, y - 18);
    a.__followCamera = a.followCamera;
    a.followCamera = () => {};
    a.aim = { x: 1, y: 0 };
    a.player.dir = 'right';
    a.player.sprite.setDir('right');
    a.player.draw();
  });
  await wait(300);

  // --- 1) guía de puntería con el mouse apuntando a la derecha.
  let aim = await aimAt(110, 0);
  await page.mouse.move(aim.sx, aim.sy);
  await wait(250);
  await shot('01_aim_line');

  // --- 2) guía más fuerte con clic derecho (LT).
  await page.mouse.down({ button: 'right' });
  await wait(250);
  await shot('02_aim_line_hold_lt');
  await page.mouse.up({ button: 'right' });

  // --- 3) recarga real: cerrojo y casquillos del HUD llenándose.
  await page.evaluate(() => {
    const a = window.__eternauta.scenes.arena;
    a.weapon.mag = 0;
    a.weapon.reserve = 30;
    a.weapon.nextShotAt = 0;
    a.weapon.reloading = false;
  });
  await page.keyboard.press('KeyR');
  await wait(600);
  console.log('recarga a 600ms:', JSON.stringify(await page.evaluate(() => {
    const a = window.__eternauta.scenes.arena;
    return { mag: a.weapon.mag, reloading: a.weapon.reloading, bolt: Boolean(a.shooting.bolt) };
  })));
  await shot('03_reload_bolt_mid');
  await wait(1400);
  await shot('04_reload_full_mag');

  // --- 4) disparo real con el mouse: la bala viajando (congela 5 cuadros después).
  await page.evaluate(() => {
    const a = window.__eternauta.scenes.arena;
    a.__realUpdate = a.update.bind(a);
    a.update = (dt, input) => {
      a.__realUpdate(dt, input);
      const bullet = a.shooting.bullets[0];
      // Congela cuando la bala ya recorrió ~70 px: se ve el vuelo, no el fogonazo.
      if (bullet && Math.abs(bullet.x - a.player.x) > 70) a.update = () => {};
    };
  });
  await page.mouse.move(aim.sx, aim.sy);
  await wait(150);
  await page.mouse.down();
  await wait(900);
  await page.mouse.up();
  console.log('disparo real:', JSON.stringify(await state().then((st) => st.arena.shots)));
  await shot('05_real_shot_midflight');
  // Descongelamos para el resto de las capturas manuales.
  await page.evaluate(() => {
    const a = window.__eternauta.scenes.arena;
    a.update = a.__realUpdate;
  });

  // --- Congelamos la simulación para capturar cuadros exactos y avanzar a mano.
  await page.evaluate(() => {
    const a = window.__eternauta.scenes.arena;
    a.update = () => {};
    a.aim = { x: 1, y: 0 };
    a.player.dir = 'right';
    a.player.sprite.setDir('right');
    a.player.draw();
    a.shooting.reset();
    a.clearEnemies();
    a.toasts = [];
    window.__arm = () => {
      a.weapon.mag = 5;
      a.weapon.reserve = 30;
      a.weapon.reloading = false;
      a.weapon.nextShotAt = 0;
    };
    window.__step = (frames, dt = 1 / 60) => {
      const ctx = {
        enemies: a.enemies, solids: a.solidBoxes, view: a.cam, player: a.player,
        aim: a.aim, weapon: a.weapon, now: a.t, input: { device: 'keyboard' },
        onHit: (enemy, damage, bullet) => a.damageEnemy(enemy, damage, bullet),
      };
      for (let i = 0; i < frames; i++) {
        a.t += dt;
        a.shooting.update(dt, ctx);
        for (const enemy of a.enemies) a.updateEnemyVisual(enemy);
        a.drawHud({ device: 'keyboard' });
      }
      return a.shooting.count();
    };
  });

  // --- 5) fogonazo: estrella recién salida del caño (2 cuadros).
  const flash = await page.evaluate(() => {
    const a = window.__eternauta.scenes.arena;
    window.__arm();
    a.tryFire();
    a.drawHud({ device: 'keyboard' });
    return a.shooting.count();
  });
  console.log('fogonazo:', JSON.stringify(flash));
  await wait(120);
  await shot('06_muzzle_flash');
  await page.evaluate(() => window.__step(3));
  await shot('07_muzzle_flash_frame2');

  // --- 6) bala en vuelo con estela.
  const flight = await page.evaluate(() => {
    const a = window.__eternauta.scenes.arena;
    a.shooting.reset();
    a.clearEnemies();
    window.__arm();
    a.tryFire();
    return window.__step(5);
  });
  console.log('bala en vuelo:', JSON.stringify(flight));
  await wait(120);
  await shot('08_bullet_trail');

  // --- 7) vainas en la nieve (cinco tiros en diagonal y esperar que caigan).
  const casings = await page.evaluate(() => {
    const a = window.__eternauta.scenes.arena;
    a.shooting.reset();
    a.aim = { x: 0, y: -1 };
    for (let i = 0; i < 5; i++) {
      window.__arm();
      a.tryFire();
      window.__step(34);
    }
    window.__step(70);
    a.aim = { x: 1, y: 0 };
    a.drawHud({ device: 'keyboard' });
    return {
      casings: a.shooting.casings.length,
      settled: a.shooting.casings.map((c) => [Math.round(c.x), Math.round(c.y), c.settled]),
    };
  });
  console.log('vainas:', JSON.stringify(casings));
  await wait(120);
  await shot('09_casings_on_snow');

  // --- 8) baja: un veloz a 46 px, bala, volteado y resbalando.
  const kill = await page.evaluate(() => {
    const a = window.__eternauta.scenes.arena;
    a.shooting.reset();
    a.clearEnemies();
    const { x, y } = window.__spot;
    a.player.place(x, y, 'right');
    a.cam = a.world.cameraFor(x, y - 18);
    a.player.x = x; a.player.feet = y; a.player.draw();
    const bug = a.spawnEnemy('veloz', x + 46, y);
    a.updateEnemyVisual(bug);
    a.points.score = 0;
    a.points.kills = 0;
    window.__arm();
    a.tryFire();
    let steps = 0;
    while (steps < 30 && !bug.dead) { window.__step(1); steps += 1; }
    window.__step(2);
    return {
      steps, dead: bug.dead, x: Math.round(bug.x), kills: a.points.kills,
      count: a.shooting.count(),
    };
  });
  console.log('baja:', JSON.stringify(kill));
  if (!kill.dead || kill.kills < 1) throw new Error('la baja no se produjo');
  await wait(120);
  await shot('10_kill_knockback');

  // --- 9) golpe sin baja: cuadro blanco de golpe + empujón.
  const hit = await page.evaluate(() => {
    const a = window.__eternauta.scenes.arena;
    a.shooting.reset();
    a.clearEnemies();
    const { x, y } = window.__spot;
    a.player.place(x, y, 'right');
    a.cam = a.world.cameraFor(x, y - 18);
    a.player.x = x; a.player.feet = y; a.player.draw();
    const bug = a.spawnEnemy('cascarudo', x + 46, y);
    a.updateEnemyVisual(bug);
    window.__arm();
    a.tryFire();
    let steps = 0;
    while (steps < 30 && bug.hitT <= 0) { window.__step(1); steps += 1; }
    a.points.score = 0;
    a.points.kills = 0;
    return { steps, hp: bug.hp, hitT: bug.hitT, dead: bug.dead };
  });
  console.log('golpe:', JSON.stringify(hit));
  if (hit.hitT <= 0) throw new Error('el golpe no marcó al bicho');
  await wait(120);
  await shot('11_hit_flash_knockback');

  // --- 10) disparo en seco (cargador vacío con reserva): chasquido.
  const dry = await page.evaluate(() => {
    const a = window.__eternauta.scenes.arena;
    a.shooting.reset();
    a.clearEnemies();
    a.weapon.mag = 0;
    a.weapon.reserve = 30;
    a.weapon.reloading = false;
    a.weapon.nextShotAt = 0;
    a.tryFire();
    window.__step(1);
    return a.shooting.count();
  });
  console.log('seco:', JSON.stringify(dry));
  await wait(120);
  await shot('12_dry_fire_click');

  // --- 11) ronda real: oleada de cascarudos + disparos de verdad.
  await page.evaluate(() => {
    const a = window.__eternauta.scenes.arena;
    a.update = a.__realUpdate;
    a.followCamera = a.__followCamera;
    a.resetRun();
    const { x, y } = window.__spot;
    window.__eternauta.teleport(x, y, 'right');
    a.cam = a.world.cameraFor(x, y - 18);
    a.phase = 'active';
    a.spawnTimer = 0.2;
    a.debugSetRound(3);
    a.t = 15;
    // Ayuda de puntería para la prueba: apunta al bicho vivo más cercano y
    // no recibe mordidas (así la captura muestra el combate, no la muerte).
    // Sin mordidas: la captura muestra el combate, no la muerte ni el parpadeo.
    a.bitBy = () => {};
    a.readAim = () => {
      const alive = a.enemies.filter((e) => !e.dead);
      if (!alive.length) return a.aim;
      let best = alive[0];
      let bestD = Infinity;
      for (const e of alive) {
        const d = Math.hypot(e.x - a.player.x, e.y - a.player.feet);
        if (d < bestD) { bestD = d; best = e; }
      }
      const dx = best.x - a.player.x;
      const dy = (best.y - best.h / 2) - (a.player.feet - 4);
      const m = Math.hypot(dx, dy) || 1;
      return { x: dx / m, y: dy / m };
    };
    // Congela el cuadro cuando hay una bala en vuelo y ya hubo bajas.
    a.__dbg = { frames: 0, withBullet: 0, cond: 0, maxDist: 0 };
    a.update = (dt, input) => {
      a.__realUpdate(dt, input);
      a.__dbg.frames += 1;
      const bullet = a.shooting.bullets[0];
      if (!bullet) return;
      a.__dbg.withBullet += 1;
      const dist = Math.abs(bullet.x - a.player.x) + Math.abs(bullet.y - a.player.feet);
      a.__dbg.maxDist = Math.max(a.__dbg.maxDist, dist);
      if (a.points.kills >= 2 && dist > 14 && dist < 110) {
        a.__dbg.cond += 1;
        a.toasts = [];
        a.update = () => {};
        a.__frozen = true;
      }
    };
  });
  await wait(600);
  await page.mouse.move(aim.sx, aim.sy);
  await page.mouse.down();
  let liveState = await state();
  for (let i = 0; i < 90; i++) {
    await wait(200);
    const st = await page.evaluate(() => {
      const a = window.__eternauta.scenes.arena;
      return {
        frozen: Boolean(a.__frozen), mag: a.weapon.mag, reloading: a.weapon.reloading,
        kills: a.points.kills, points: a.points.score, alive: a.aliveCount(),
      };
    });
    if (st.frozen) break;
    if (st.mag <= 1 && !st.reloading) await page.keyboard.press('KeyR');
    liveState = await state();
  }
  await page.mouse.up();
  liveState = await state();
  console.log('ronda real:', JSON.stringify({
    kills: liveState.arena.kills, points: liveState.arena.points,
    alive: liveState.arena.alive, shots: liveState.arena.shots,
  }));
  console.log('dbg ronda:', JSON.stringify(await page.evaluate(() => {
    const a = window.__eternauta.scenes.arena;
    return { dbg: a.__dbg, frozen: Boolean(a.__frozen), kills: a.points.kills };
  })));
  await shot('13_live_round');

  const final = await state();
  console.log('estado final:', JSON.stringify(final.arena));
  if (errors.length) {
    console.error('ERRORES DE PAGINA:\n' + errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log('sin errores de página');
  }
} finally {
  await browser.close();
}
