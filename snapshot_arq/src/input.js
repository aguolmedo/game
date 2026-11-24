// Input unificado: mouse + teclado (complementarios) o joystick.
//
// Dispositivos: solo hay dos modos, `mouse` y `pad` (DIRECCION.md, "Controles
// e interacción"). El teclado no es un dispositivo propio: acompaña al mouse
// (WASD/flechas para caminar, I/Tab mochila, Esc menú, 1-8 para elegir ítem) y
// en menús/diálogos navega con flechas + Enter/Espacio, y Esc para volver.
//
// Dos verbos, uno por botón: Hacer = click izq. / A (botón 0); Manos = click
// der. / X (botón 2). No hay botón de Mirar: se mira con Hacer en lo que solo
// se mira. Q, E, Espacio, Enter, R, F y el RT no hacen nada en el mundo
// (Espacio/Enter solo confirman en menús y diálogos).
//
// Mapeo no estándar del pad: A=0, B=1, X=2, Y=3, LB=4, RB=5, Start=9.
import { combineMoves, keysToMove, stickToMove, DEADZONE } from './logic.js';

const CONFIRM_KEYS = ['Enter', 'Space'];
const START_KEYS = ['Escape'];
const BACK_KEYS = ['KeyB', 'Backspace'];
const Y_KEYS = ['KeyI', 'Tab'];
// La barra de items con teclado va con 1-8.
const SLOT_KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8'];
const MOVE_KEYS = [
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
];
const ALL_KEYS = [
  ...CONFIRM_KEYS, ...START_KEYS, ...BACK_KEYS, ...Y_KEYS,
  ...SLOT_KEYS, ...MOVE_KEYS,
];

const NONE = {
  a: false, b: false, start: false, y: false,
  lb: false, rb: false, hands: false,
};

const TAP_DIRS = {
  ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
  KeyW: { x: 0, y: -1 }, KeyS: { x: 0, y: 1 },
  KeyA: { x: -1, y: 0 }, KeyD: { x: 1, y: 0 },
};

/** Direccion de un toque corto de teclado, para menus (un frame). */
export function tapDirection(tapped) {
  for (const [code, dir] of Object.entries(TAP_DIRS)) {
    if (tapped.has(code)) return dir;
  }
  return { x: 0, y: 0 };
}

function anyHeld(keys, codes) {
  for (const code of codes) if (keys.has(code)) return true;
  return false;
}

function anyTapped(tapped, codes) {
  for (const code of codes) if (tapped.has(code)) return true;
  return false;
}

function nowMs() {
  return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
}

function clampWheel(value) {
  return Math.max(-1, Math.min(1, value));
}

/**
 * Último dispositivo usado. Solo hay dos: `mouse` (con teclado al lado) y
 * `pad`. El teclado nunca cambia el modo; si el puntero se movió hace menos
 * de ~1 s, sigue mandando el mouse.
 */
export function deviceAfter(previous, {
  pad = false, mouse = false, mouseRecent = false,
} = {}) {
  if (mouse) return 'mouse';
  if (pad) return 'pad';
  if (mouseRecent && previous === 'mouse') return 'mouse';
  // Solo hay dos dispositivos: si el anterior era pad, sigue el pad; si no,
  // mouse + teclado.
  return previous === 'pad' ? 'pad' : 'mouse';
}

/** Umbral en px de pantalla para que el mouse tome el control. */
export const MOUSE_MOVE_THRESHOLD = 4;
/** Ventana en ms en la que el mouse sigue mandando aunque se use el teclado. */
export const MOUSE_RECENT_MS = 1000;

function defaultTarget() {
  return typeof window !== 'undefined' ? window : null;
}

export class Input {
  constructor(target = defaultTarget()) {
    this.keys = new Set();
    this.tapped = new Set();
    this.prev = { ...NONE };
    this.lastDevice = 'mouse';
    this.mouseActivity = false;
    this.mouseAt = 0;
    this.pointer = null;
    this.pointerMoveFrom = null;
    this.wheel = 0;
    this.click = null;
    this.rightClick = null;

    if (!target) return;
    target.addEventListener('keydown', (e) => {
      if (ALL_KEYS.includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code);
      this.tapped.add(e.code);
    });
    target.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
    target.addEventListener('blur', () => this.keys.clear());
    target.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.wheel = clampWheel(this.wheel + Math.sign(e.deltaY || 0));
      this.mouseActivity = true;
      this.mouseAt = nowMs();
    }, { passive: false });
    target.addEventListener('pointermove', (e) => {
      const point = { x: e.clientX || 0, y: e.clientY || 0 };
      // Solo un movimiento real (>4 px) toma el control: un temblor no.
      const from = this.pointerMoveFrom || this.pointer;
      if (!from || Math.hypot(point.x - from.x, point.y - from.y) > MOUSE_MOVE_THRESHOLD) {
        this.mouseActivity = true;
        this.mouseAt = nowMs();
        this.pointerMoveFrom = point;
      }
      this.pointer = point;
    });
    target.addEventListener('mousedown', (e) => {
      const button = e.button ?? 0;
      if (button !== 0 && button !== 2) return;
      this.mouseActivity = true;
      this.mouseAt = nowMs();
      const point = { x: e.clientX || 0, y: e.clientY || 0 };
      this.pointer = point;
      this.pointerMoveFrom = point;
      if (button === 2) this.rightClick = point;
      else this.click = point;
    });
    // Click derecho = Manos: sin menú contextual del navegador sobre el canvas.
    target.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  readGamepad() {
    const pad = this.findPad();
    if (!pad) return { move: { x: 0, y: 0 }, active: false, ...NONE };

    const axes = pad.axes || [];
    const ax = axes[0] || 0;
    const ay = axes[1] || 0;
    const stick = stickToMove(ax, ay);
    const buttons = pad.buttons || [];
    const down = (i) => Boolean(buttons[i] && buttons[i].pressed);
    const dx = (down(15) ? 1 : 0) - (down(14) ? 1 : 0);
    const dy = (down(13) ? 1 : 0) - (down(12) ? 1 : 0);
    // Manos = X (botón 2), según el mapeo no estándar de DIRECCION.md.
    const hands = down(2);
    const held = {
      a: down(0),
      b: down(1),
      start: down(9),
      y: down(3),
      lb: down(4),
      rb: down(5),
      hands,
    };
    // cualquier botón (cruceta, gatillos, sticks apretados...) o stick cuenta
    // como "usando joystick"
    const anyButton = buttons.some((b) => b && (b.pressed || (b.value || 0) > 0.5));
    const anyAxis = axes.slice(0, 4).some((v) => Math.abs(v || 0) > DEADZONE);
    const active = anyButton || anyAxis;
    return {
      move: combineMoves(stick, { x: dx, y: dy }),
      active,
      ...held,
    };
  }

  findPad() {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return null;
    let pads;
    try {
      pads = navigator.getGamepads();
    } catch {
      return null;
    }
    if (!pads) return null;
    // elegir el joystick real: preferir mapeo estandar y, entre esos, el ultimo que se toco
    let best = null;
    for (let i = 0; i < pads.length; i++) {
      const pad = pads[i];
      if (!pad || !pad.connected) continue;
      const score = (pad.mapping === 'standard' ? 1e15 : 0) + (pad.timestamp || 0);
      if (!best || score > best.score) best = { pad, score };
    }
    return best ? best.pad : null;
  }

  /** Ranura de hotbar tapada este frame, o -1. Digit1 -> 0 ... Digit8 -> 7. */
  readSlot() {
    for (let i = 0; i < SLOT_KEYS.length; i++) {
      if (this.tapped.has(SLOT_KEYS[i])) return i;
    }
    return -1;
  }

  /**
   * Llamar una vez por frame.
   * aPressed/bPressed/startPressed/yPressed/handsPressed son de flanco;
   * slotPressed vale -1 o 0..7; wheel se resetea a 0 en cada poll.
   *
   * `a`/`aPressed` incluyen Enter/Espacio (confirmar en menús y diálogos);
   * el mundo usa `padAPressed` para Hacer con joystick. `handsPressed`
   * incluye el click derecho del mouse (Manos).
   */
  poll() {
    const prev = this.prev || NONE;
    const confirm = anyHeld(this.keys, CONFIRM_KEYS);
    const keyboard = {
      move: keysToMove(this.keys),
      a: confirm,
      b: anyHeld(this.keys, BACK_KEYS),
      start: anyHeld(this.keys, START_KEYS),
      y: anyHeld(this.keys, Y_KEYS),
      prevHotbar: false,
      nextHotbar: false,
      hands: false,
    };
    const pad = this.readGamepad();
    const a = keyboard.a || pad.a;
    const b = keyboard.b || pad.b;
    const start = keyboard.start || pad.start;
    const y = keyboard.y || pad.y;
    const prevHotbar = pad.lb;
    const nextHotbar = pad.rb;
    // Manos: X del pad (con flanco) o click derecho del mouse.
    const hands = pad.hands;
    const handsPressed = (hands && !prev.hands) || Boolean(this.rightClick);

    const device = deviceAfter(this.lastDevice, {
      pad: pad.active,
      mouse: this.mouseActivity,
      mouseRecent: this.mouseAt > 0 && nowMs() - this.mouseAt < MOUSE_RECENT_MS,
    });
    const tap = tapDirection(this.tapped);
    const state = {
      move: combineMoves(keyboard.move, pad.move),
      menuMove: combineMoves(tap, keyboard.move, pad.move),
      a,
      b,
      start,
      y,
      hands,
      handsPressed,
      prevHotbar: (prevHotbar && !prev.lb) || anyTapped(this.tapped, []),
      nextHotbar: (nextHotbar && !prev.rb) || anyTapped(this.tapped, []),
      slotPressed: this.readSlot(),
      // El mundo usa SOLO el A del pad para Hacer (el click va aparte):
      // Enter/Espacio siguen siendo confirmar en menús y diálogos.
      padAPressed: (pad.a && !prev.a) || anyTapped(this.tapped, []),
      aPressed: (a && !prev.a) || anyTapped(this.tapped, CONFIRM_KEYS),
      bPressed: (b && !prev.b) || anyTapped(this.tapped, BACK_KEYS),
      yPressed: (y && !prev.y) || anyTapped(this.tapped, Y_KEYS),
      startPressed: (start && !prev.start) || anyTapped(this.tapped, START_KEYS),
      wheel: this.wheel,
      click: this.click,
      rightClick: this.rightClick,
      pointer: this.pointer,
      device,
    };
    this.lastDevice = device;
    this.device = device;
    this.prev = { a, b, start, y, lb: prevHotbar, rb: nextHotbar, hands };
    this.tapped.clear();
    this.mouseActivity = false;
    this.wheel = 0;
    this.click = null;
    this.rightClick = null;
    return state;
  }
}
