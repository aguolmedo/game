// Bengala y botella de nafta: encendido, chispas, daño del fuego y limpieza.
// Funciones que reciben la escena.
import { depthFor } from '../sprite.js';
import {
  startBengala, startMolotov, fireTicks, inFire,
  MOLOTOV_DPS, BENGALA_RADIUS, MOLOTOV_RADIUS,
} from './effectsRun.js';

const BENGALA_COLOR = '#ff7a4a';
const FIRE_COLOR = '#ff9a4a';


export function useBengala(state, view, svc) {
  if (state.bengala) {
    svc.toast('La bengala ya está encendida.');
    return;
  }
  if (state.items.bengalas <= 0) {
    svc.toast('No queda bengala.');
    return;
  }
  state.items.bengalas -= 1;
  const b = startBengala(view.player);
  const mesh = svc.itemSprite('mejora_bengala');
  mesh.position.set(Math.round(b.x), Math.round(b.y) - 8, depthFor(b.y) + 0.01);
  view.three.add(mesh);
  const light = svc.addMapLight({
    x: b.x,
    y: b.y,
    radius: BENGALA_RADIUS,
    color: BENGALA_COLOR,
    kind: 'ember',
    flicker: 0.35,
    intensity: 1.35,
    hole: 1.2,
    state: 'on',
    onlyIn: 'apagon',
  });
  state.bengala = { ...b, mesh, light, sparkT: 0.2 };
  svc.spawnFx('sparkle', b.x, b.y - 8, 0.4, ['sparkle_0', 'sparkle_1']);
  svc.toast('Bengala encendida');
}

export function useBotella(state, view, svc) {
  if (state.items.molotovs <= 0) {
    svc.toast('No queda botella.');
    return;
  }
  state.items.molotovs -= 1;
  const aimPoint = {
    x: view.player.x + state.aim.x * 48,
    y: view.player.feet + state.aim.y * 48,
  };
  const fire = startMolotov(view.player, aimPoint, state.bounds, MOLOTOV_RADIUS);
  const light = svc.addMapLight({
    x: fire.x,
    y: fire.y,
    radius: MOLOTOV_RADIUS,
    color: FIRE_COLOR,
    kind: 'ember',
    flicker: 0.3,
    state: 'on',
    onlyIn: 'apagon',
  });
  state.fires.push({ ...fire, light, sparkT: 0.1, seed: state.rng() });
  svc.spawnFx('sparkle', fire.x, fire.y - 4, 0.4, ['sparkle_0', 'sparkle_1']);
  svc.toast('Botella de nafta');
}

export function updateConsumables(state, view, svc, dt) {
  if (state.bengala) {
    state.bengala.t -= dt;
    state.bengala.sparkT -= dt;
    if (state.bengala.sparkT <= 0 && state.bengala.t > 0) {
      state.bengala.sparkT = 0.26;
      svc.spawnFx('sparkle',
        state.bengala.x + (state.rng() - 0.5) * 12,
        state.bengala.y - 6 - state.rng() * 6,
        0.3, ['sparkle_0', 'sparkle_1']);
    }
    if (state.bengala.t <= 0) {
      if (state.bengala.mesh) view.three.remove(state.bengala.mesh);
      svc.removeMapLight(state.bengala.light);
      state.bengala = null;
      svc.toast('La bengala se apagó.');
    }
  }

  for (let i = state.fires.length - 1; i >= 0; i--) {
    const fire = state.fires[i];
    fire.t -= dt;
    const step = fireTicks(fire, dt);
    fire.acc = step.acc;
    if (step.ticks > 0) {
      for (const enemy of state.enemies) {
        if (enemy.dead || !inFire(enemy, fire)) continue;
        for (let k = 0; k < step.ticks; k++) {
          if (enemy.dead) break;
          if (inFire(enemy, fire)) svc.damageEnemy(enemy, MOLOTOV_DPS, { impact: false });
        }
      }
    }
    fire.sparkT -= dt;
    if (fire.sparkT <= 0 && fire.t > 0) {
      fire.sparkT = 0.16;
      svc.spawnFx('sparkle',
        fire.x + (state.rng() - 0.5) * 20,
        fire.y - 4 - state.rng() * 8,
        0.3, ['sparkle_0', 'sparkle_1']);
    }
    if (fire.t <= 0) {
      svc.removeMapLight(fire.light);
      state.fires.splice(i, 1);
    }
  }
}

export function clearConsumables(state, view, svc) {
  if (state.bengala) {
    if (state.bengala.mesh) view.three.remove(state.bengala.mesh);
    svc.removeMapLight(state.bengala.light);
    state.bengala = null;
  }
  for (const fire of state.fires) svc.removeMapLight(fire.light);
  state.fires = [];
  if (view.farolLight) {
    svc.removeMapLight(view.farolLight);
    view.farolLight = null;
  }
}
