import { canvasOverlay } from '../sprite.js';
import { viewport, snapCamera, worldToView as toView } from '../viewport.js';
import { buildApagon } from '../apagon.js';


/** Mundo -> vista UI (480x270). Los prompts y globos viven en la vista. */
export function worldToView(scene, x, y) {
  return toView(x, y, scene.cam, viewport.zoom);
}

/** Caja del jugador en coordenadas de la vista (para esquivar la etiqueta). */
export function playerViewBox(scene) {
  if (!scene.player) return null;
  const z = viewport.zoom;
  const p = scene.worldToView(scene.player.x - 6, scene.player.feet - 30);
  return { x: p.x, y: p.y, w: 12 * z, h: 30 * z };
}

export function applyCamera(scene, camera) {
  camera.left = scene.cam.x;
  camera.right = scene.cam.x + viewport.worldW;
  camera.top = scene.cam.y;
  camera.bottom = scene.cam.y + viewport.worldH;
  camera.updateProjectionMatrix();
}

export function followCamera(scene, dt) {
  const want = scene.world.cameraFor(scene.player.x, scene.player.feet - 18);
  const k = Math.min(1, dt * 9);
  scene.cam.x += (want.x - scene.cam.x) * k;
  scene.cam.y += (want.y - scene.cam.y) * k;
  if (Math.abs(want.x - scene.cam.x) < 0.3) scene.cam.x = want.x;
  if (Math.abs(want.y - scene.cam.y) < 0.3) scene.cam.y = want.y;
  // Pixel-perfect: la cámara se redondea a 1/worldPx (no a px entero).
  scene.cam.x = snapCamera(scene.cam.x);
  scene.cam.y = snapCamera(scene.cam.y);
}

/** Canvas de luz del tamaño de la vista del mundo; se rehace si cambia. */
export function ensureLightUi(scene) {
  const w = Math.ceil(viewport.worldW);
  const h = Math.ceil(viewport.worldH);
  if (scene.lightUi && scene.lightUi.canvas.width === w
    && scene.lightUi.canvas.height === h) return;
  if (scene.lightUi) {
    scene.scene.remove(scene.lightUi.mesh);
    scene.lightUi.mesh.geometry.dispose();
    scene.lightUi.mesh.material.dispose();
    scene.lightUi.texture.dispose();
  }
  scene.lightUi = canvasOverlay(w, h, 20);
  scene.scene.add(scene.lightUi.mesh);
}

/** Config del pase de luz del apagón, o null si esta escena no lo usa. */
export function apagonParams(scene) {
  if (scene.game.lightingMode !== 'apagon') return null;
  return buildApagon(scene);
}

/** Llama y pucho: píxeles de mundo dibujados sobre la escena y bajo el HUD. */
export function drawApagonFx(scene) {
  const fx = scene.apagonFx;
  if (!fx) return;
  const params = scene.apagonParams();
  if (!params || !params.fx.length) {
    fx.clear();
    fx.commit();
    fx.mesh.visible = false;
    return;
  }
  fx.mesh.visible = true;
  fx.clear();
  const ctx = fx.ctx;
  const z = viewport.zoom || 1;
  const s = Math.max(1, Math.round(z));
  const px = (wx) => Math.round((wx - scene.cam.x) * z);
  const py = (wy) => Math.round((wy - scene.cam.y) * z);
  const dot = (wx, wy, col) => { ctx.fillStyle = col; ctx.fillRect(px(wx), py(wy), s, s); };
  const smokeStep = Math.floor(scene.t * 6) % 3;
  const SMOKE = [[0, -3], [1, -5], [0, -7], [1, -9], [2, -11]];
  for (const it of params.fx) {
    if (it.type === 'flame') {
      dot(it.x, it.y, '#fff6c8');
      dot(it.x, it.y - 1, '#ffd678');
      dot(it.x, it.y - 2, '#ffaa46');
      dot(it.x + 1, it.y, '#ffdc8c');
      continue;
    }
    if (it.type === 'smoke') {
      ctx.globalAlpha = 0.42;
      SMOKE.forEach(([dx, dy], i) => {
        if ((i + smokeStep) % 3 === 0) return;
        dot(it.x + dx, it.y + dy, '#9a9aa4');
      });
      ctx.globalAlpha = 1;
      continue;
    }
    const k = it.k ?? 0;
    if (it.type === 'ember') {
      // cigarrillo: 2 px de papel desde la comisura, brasa en la punta
      dot(it.x, it.y, '#c4beb2');
      dot(it.x + 1, it.y, '#b0aaa0');
      if (k < 0.3) {
        dot(it.x + 2, it.y, '#b23a1e');
      } else {
        dot(it.x + 2, it.y, k > 0.8 ? '#ffd68c' : '#f07832');
        dot(it.x + 3, it.y, '#e25424');
        if (k > 0.8) dot(it.x + 2, it.y - 1, '#ff9646');
      }
      continue;
    }
    // cherry: la brasa del cenicero, sin papel
    if (k < 0.3) dot(it.x, it.y, '#b23a1e');
    else {
      dot(it.x, it.y, k > 0.8 ? '#ffd68c' : '#f07832');
      dot(it.x + 1, it.y, '#e25424');
      if (k > 0.8) dot(it.x, it.y - 1, '#ff9646');
    }
  }
  fx.commit();
}

export function warnNear(scene) {
  const now = scene.t || 0;
  if (scene.nearWarnAt == null || now - scene.nearWarnAt >= 1) {
    scene.nearWarnAt = now;
    scene.game.showToast('Acercate un poco.');
  }
}
