// Entrada de la salida: controles por flanco (teclado/pad/mouse), mira y
// orientación de Juan. Funciones que reciben la escena; sin estado propio.
import { VIEW_W, VIEW_H } from './hudLayout.js';
import { firePressed, consumableAction } from './controls.js';
import { dirFromVector } from './enemies.js';

const DIR = {
  down: { x: 0, y: 1 },
  up: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const EMPTY_KEYS = new Set();


export function bindMouse(scene) {
  if (typeof window === 'undefined') return;
  window.addEventListener('mousemove', (e) => {
    scene.mouse.x = e.clientX;
    scene.mouse.y = e.clientY;
    scene.mouse.active = true;
  });
  window.addEventListener('mousedown', (e) => {
    if ((e.button ?? 0) === 0) scene.mouse.down = true;
  });
  window.addEventListener('mouseup', () => { scene.mouse.down = false; });
}

export function readControls(scene, input) {
  const source = scene.game.input;
  const keys = (source && source.keys) || EMPTY_KEYS;
  const pad = source && source.findPad ? source.findPad() : null;
  const btn = (i) => Boolean(pad && pad.buttons && pad.buttons[i] && pad.buttons[i].pressed);
  const padTap = (i) => btn(i) && !scene.prevPad[i];
  const keyEdge = (code) => keys.has(code) && !scene.prevKeys.has(code);
  // Doble buffer reutilizado: no se crean Sets/arrays por cuadro.
  const nextKeys = scene.nextKeys;
  nextKeys.clear();
  for (const key of keys) nextKeys.add(key);
  const nextPad = scene.nextPad;
  for (let i = 0; i < 16; i++) nextPad[i] = btn(i);

  // Con el mouse, un click cerca de la caja de municiones compra en vez de
  // disparar: el cartel de la tienda ya usa el glifo del mouse.
  const nearCrate = scene.nearCrate();
  const clickBuy = Boolean(input.click) && nearCrate;
  const fireArgs = scene.fireArgs;
  fireArgs.mouseDown = scene.mouse.down;
  fireArgs.click = Boolean(input.click);
  fireArgs.nearCrate = nearCrate;
  fireArgs.keyboardFire = keys.has('Space') || keys.has('KeyJ') || btn(7)
    || (Boolean(input.aPressed) && input.device === 'keyboard' && !nearCrate);
  let fire = firePressed(fireArgs);
  if (scene.fireLock) {
    if (fire) fire = false;
    else scene.fireLock = false;
  }

  const consArgs = scene.consArgs;
  consArgs.slot = Number.isInteger(input.slotPressed) ? input.slotPressed : -1;
  consArgs.lb = padTap(4);
  consArgs.rb = padTap(5);
  consArgs.bengalas = scene.items.bengalas;
  consArgs.molotovs = scene.items.molotovs;
  consArgs.keyR = keys.has('KeyR');
  consArgs.padX = padTap(2);
  const cons = consumableAction(consArgs, scene.consOut);

  const controls = scene.controls;
  controls.fire = fire;
  controls.reload = cons.reload;
  // Y / I / Tab abren el parche.
  controls.patch = Boolean(input.yPressed);
  // A del joystick o E del teclado (Space/Enter están reservados al disparo).
  controls.buy = clickBuy || (Boolean(input.aPressed) && !keys.has('Space') && !keys.has('Enter'));
  // Click tambien continua viñeta/resultado (durante la partida no se usa).
  controls.advance = Boolean(input.aPressed) || Boolean(input.click);
  // Confirmacion de teclado/pad (sin click): el resultado solo avanza con
  // A/Enter/Space o con un click sobre una opcion.
  controls.confirm = Boolean(input.aPressed);
  // Volver a casa: E, A del pad o click cerca del portón. Hay que alejarse
  // una vez del portón antes de que cuente (no se sale sin querer al entrar).
  controls.home = scene.exitArmed && scene.nearHome() && (keyEdge('KeyE')
    || Boolean(input.padAPressed) || Boolean(input.click));
  controls.bengala = cons.bengala;
  controls.botella = cons.botella;

  // Swap de los buffers: lo de este cuadro pasa a ser el "anterior".
  scene.nextKeys = scene.prevKeys;
  scene.prevKeys = nextKeys;
  scene.nextPad = scene.prevPad;
  scene.prevPad = nextPad;
}

export function readAim(scene) {
  const out = scene.aimBuf;
  const pad = scene.game.input && scene.game.input.findPad
    ? scene.game.input.findPad() : null;
  if (pad && pad.axes) {
    const ax = pad.axes[2] || 0;
    const ay = pad.axes[3] || 0;
    const mag = Math.hypot(ax, ay);
    if (mag > 0.3) {
      out.x = ax / mag;
      out.y = ay / mag;
      return out;
    }
  }
  if (scene.mouse.active) {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const wx = scene.cam.x + ((scene.mouse.x - rect.left) / rect.width) * VIEW_W;
        const wy = scene.cam.y + ((scene.mouse.y - rect.top) / rect.height) * VIEW_H;
        // Se apunta desde el plano del piso (el mismo del tiro).
        const dx = wx - scene.player.x;
        const dy = wy - (scene.player.feet - 4);
        const mag = Math.hypot(dx, dy);
        if (mag >= 1e-6) {
          out.x = dx / mag;
          out.y = dy / mag;
          return out;
        }
      }
    }
  }
  const dir = DIR[scene.player.dir] || DIR.down;
  out.x = dir.x;
  out.y = dir.y;
  return out;
}

export function faceAim(scene) {
  const dir = dirFromVector(scene.aim.x, scene.aim.y, scene.player.dir);
  if (dir === scene.player.dir) return;
  scene.player.dir = dir;
  scene.player.sprite.setDir(dir);
  scene.player.draw();
}
