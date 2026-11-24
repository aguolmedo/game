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


export function bindMouse(state, view, svc) {
  if (typeof window === 'undefined') return;
  window.addEventListener('mousemove', (e) => {
    view.mouse.x = e.clientX;
    view.mouse.y = e.clientY;
    view.mouse.active = true;
  });
  window.addEventListener('mousedown', (e) => {
    if ((e.button ?? 0) === 0) view.mouse.down = true;
  });
  window.addEventListener('mouseup', () => { view.mouse.down = false; });
}

export function readControls(state, view, svc, input) {
  const source = svc.game.input;
  const keys = (source && source.keys) || EMPTY_KEYS;
  const pad = source && source.findPad ? source.findPad() : null;
  const btn = (i) => Boolean(pad && pad.buttons && pad.buttons[i] && pad.buttons[i].pressed);
  const padTap = (i) => btn(i) && !view.prevPad[i];
  const keyEdge = (code) => keys.has(code) && !view.prevKeys.has(code);
  // Doble buffer reutilizado: no se crean Sets/arrays por cuadro.
  const nextKeys = view.nextKeys;
  nextKeys.clear();
  for (const key of keys) nextKeys.add(key);
  const nextPad = view.nextPad;
  for (let i = 0; i < 16; i++) nextPad[i] = btn(i);

  // Con el mouse, un click cerca de la caja de municiones compra en vez de
  // disparar: el cartel de la tienda ya usa el glifo del mouse.
  const nearCrate = svc.nearCrate();
  const clickBuy = Boolean(input.click) && nearCrate;
  const fireArgs = view.fireArgs;
  fireArgs.mouseDown = view.mouse.down;
  fireArgs.click = Boolean(input.click);
  fireArgs.nearCrate = nearCrate;
  fireArgs.keyboardFire = keys.has('Space') || keys.has('KeyJ') || btn(7)
    || (Boolean(input.aPressed) && input.device === 'keyboard' && !nearCrate);
  let fire = firePressed(fireArgs);
  if (state.fireLock) {
    if (fire) fire = false;
    else state.fireLock = false;
  }

  const consArgs = view.consArgs;
  consArgs.slot = Number.isInteger(input.slotPressed) ? input.slotPressed : -1;
  consArgs.lb = padTap(4);
  consArgs.rb = padTap(5);
  consArgs.bengalas = state.items.bengalas;
  consArgs.molotovs = state.items.molotovs;
  consArgs.keyR = keys.has('KeyR');
  consArgs.padX = padTap(2);
  const cons = consumableAction(consArgs, view.consOut);

  const controls = view.controls;
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
  controls.home = state.exitArmed && svc.nearHome() && (keyEdge('KeyE')
    || Boolean(input.padAPressed) || Boolean(input.click));
  controls.bengala = cons.bengala;
  controls.botella = cons.botella;

  // Swap de los buffers: lo de este cuadro pasa a ser el "anterior".
  view.nextKeys = view.prevKeys;
  view.prevKeys = nextKeys;
  view.nextPad = view.prevPad;
  view.prevPad = nextPad;
}

export function readAim(state, view, svc) {
  const out = view.aimBuf;
  const pad = svc.game.input && svc.game.input.findPad
    ? svc.game.input.findPad() : null;
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
  if (view.mouse.active) {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const wx = view.cam.x + ((view.mouse.x - rect.left) / rect.width) * VIEW_W;
        const wy = view.cam.y + ((view.mouse.y - rect.top) / rect.height) * VIEW_H;
        // Se apunta desde el plano del piso (el mismo del tiro).
        const dx = wx - view.player.x;
        const dy = wy - (view.player.feet - 4);
        const mag = Math.hypot(dx, dy);
        if (mag >= 1e-6) {
          out.x = dx / mag;
          out.y = dy / mag;
          return out;
        }
      }
    }
  }
  const dir = DIR[view.player.dir] || DIR.down;
  out.x = dir.x;
  out.y = dir.y;
  return out;
}

export function faceAim(state, view, svc) {
  const dir = dirFromVector(state.aim.x, state.aim.y, view.player.dir);
  if (dir === view.player.dir) return;
  view.player.dir = dir;
  view.player.sprite.setDir(dir);
  view.player.draw();
}
