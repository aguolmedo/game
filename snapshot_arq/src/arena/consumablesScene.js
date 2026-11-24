// Bengala y botella de nafta: encendido, chispas, daño del fuego y limpieza.
// Funciones que reciben la escena.
import { depthFor } from '../sprite.js';
import {
  startBengala, startMolotov, fireTicks, inFire,
  MOLOTOV_DPS, BENGALA_RADIUS, MOLOTOV_RADIUS,
} from './effectsRun.js';

const BENGALA_COLOR = '#ff7a4a';
const FIRE_COLOR = '#ff9a4a';


export function useBengala(scene) {
  if (scene.bengala) {
    scene.toast('La bengala ya está encendida.');
    return;
  }
  if (scene.items.bengalas <= 0) {
    scene.toast('No queda bengala.');
    return;
  }
  scene.items.bengalas -= 1;
  const b = startBengala(scene.player);
  const mesh = scene.itemSprite('mejora_bengala');
  mesh.position.set(Math.round(b.x), Math.round(b.y) - 8, depthFor(b.y) + 0.01);
  scene.scene.add(mesh);
  const light = scene.addMapLight({
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
  scene.bengala = { ...b, mesh, light, sparkT: 0.2 };
  scene.spawnFx('sparkle', b.x, b.y - 8, 0.4, ['sparkle_0', 'sparkle_1']);
  scene.toast('Bengala encendida');
}

export function useBotella(scene) {
  if (scene.items.molotovs <= 0) {
    scene.toast('No queda botella.');
    return;
  }
  scene.items.molotovs -= 1;
  const aimPoint = {
    x: scene.player.x + scene.aim.x * 48,
    y: scene.player.feet + scene.aim.y * 48,
  };
  const fire = startMolotov(scene.player, aimPoint, scene.bounds, MOLOTOV_RADIUS);
  const light = scene.addMapLight({
    x: fire.x,
    y: fire.y,
    radius: MOLOTOV_RADIUS,
    color: FIRE_COLOR,
    kind: 'ember',
    flicker: 0.3,
    state: 'on',
    onlyIn: 'apagon',
  });
  scene.fires.push({ ...fire, light, sparkT: 0.1, seed: scene.rng() });
  scene.spawnFx('sparkle', fire.x, fire.y - 4, 0.4, ['sparkle_0', 'sparkle_1']);
  scene.toast('Botella de nafta');
}

export function updateConsumables(scene, dt) {
  if (scene.bengala) {
    scene.bengala.t -= dt;
    scene.bengala.sparkT -= dt;
    if (scene.bengala.sparkT <= 0 && scene.bengala.t > 0) {
      scene.bengala.sparkT = 0.26;
      scene.spawnFx('sparkle',
        scene.bengala.x + (scene.rng() - 0.5) * 12,
        scene.bengala.y - 6 - scene.rng() * 6,
        0.3, ['sparkle_0', 'sparkle_1']);
    }
    if (scene.bengala.t <= 0) {
      if (scene.bengala.mesh) scene.scene.remove(scene.bengala.mesh);
      scene.removeMapLight(scene.bengala.light);
      scene.bengala = null;
      scene.toast('La bengala se apagó.');
    }
  }

  for (let i = scene.fires.length - 1; i >= 0; i--) {
    const fire = scene.fires[i];
    fire.t -= dt;
    const step = fireTicks(fire, dt);
    fire.acc = step.acc;
    if (step.ticks > 0) {
      for (const enemy of scene.enemies) {
        if (enemy.dead || !inFire(enemy, fire)) continue;
        for (let k = 0; k < step.ticks; k++) {
          if (enemy.dead) break;
          if (inFire(enemy, fire)) scene.damageEnemy(enemy, MOLOTOV_DPS, { impact: false });
        }
      }
    }
    fire.sparkT -= dt;
    if (fire.sparkT <= 0 && fire.t > 0) {
      fire.sparkT = 0.16;
      scene.spawnFx('sparkle',
        fire.x + (scene.rng() - 0.5) * 20,
        fire.y - 4 - scene.rng() * 8,
        0.3, ['sparkle_0', 'sparkle_1']);
    }
    if (fire.t <= 0) {
      scene.removeMapLight(fire.light);
      scene.fires.splice(i, 1);
    }
  }
}

export function clearConsumables(scene) {
  if (scene.bengala) {
    if (scene.bengala.mesh) scene.scene.remove(scene.bengala.mesh);
    scene.removeMapLight(scene.bengala.light);
    scene.bengala = null;
  }
  for (const fire of scene.fires) scene.removeMapLight(fire.light);
  scene.fires = [];
  if (scene.farolLight) {
    scene.removeMapLight(scene.farolLight);
    scene.farolLight = null;
  }
}
