// Input unificado: Gamepad API primero, teclado como fallback.
import { combineMoves, keysToMove, stickToMove, DEADZONE } from './logic.js';

const INTERACT_KEYS = ['KeyE', 'Enter', 'Space'];
const START_KEYS = ['Escape'];
const BACK_KEYS = ['KeyB', 'Backspace'];
const X_KEYS = ['KeyF'];
const Y_KEYS = ['KeyI', 'Tab'];
const PREV_HOTBAR_KEYS = ['KeyQ'];
const NEXT_HOTBAR_KEYS = ['KeyR'];
const SLOT_KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8'];
const MOVE_KEYS = [
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
];
const ALL_KEYS = [
  ...INTERACT_KEYS, ...START_KEYS, ...BACK_KEYS, ...X_KEYS, ...Y_KEYS,
  ...PREV_HOTBAR_KEYS, ...NEXT_HOTBAR_KEYS, ...SLOT_KEYS, ...MOVE_KEYS,
];

const NONE = { a: false, b: false, start: false, x: false, y: false, lb: false, rb: false };

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

function clampWheel(value) {
  return Math.max(-1, Math.min(1, value));
}

/**
 * Último dispositivo usado. Si en el frame hubo teclado gana el teclado;
 * si no, gana el pad; si no hubo actividad, se mantiene el anterior.
 */
export function deviceAfter(previous, { keyboard = false, pad = false } = {}) {
  if (keyboard) return 'keyboard';
  if (pad) return 'pad';
  return previous || 'keyboard';
}

function defaultTarget() {
  return typeof window !== 'undefined' ? window : null;
}

export class Input {
  constructor(target = defaultTarget()) {
    this.keys = new Set();
    this.tapped = new Set();
    this.prev = { ...NONE };
    this.lastDevice = 'keyboard';
    this.keyboardActivity = false;
    this.wheel = 0;
    this.click = null;

    if (!target) return;
    target.addEventListener('keydown', (e) => {
      this.lastDevice = 'keyboard';
      this.keyboardActivity = true;
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
    }, { passive: false });
    target.addEventListener('mousedown', (e) => {
      if ((e.button ?? 0) !== 0) return;
      this.click = { x: e.clientX || 0, y: e.clientY || 0 };
    });
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
    const held = {
      a: down(0),
      b: down(1),
      start: down(9),
      x: down(2),
      y: down(3),
      lb: down(4),
      rb: down(5),
    };
    // cualquier boton (cruceta, gatillos, sticks apretados...) o cualquier stick cuenta como "usando joystick"
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
   * aPressed/bPressed/xPressed/yPressed/startPressed/prevHotbar/nextHotbar son de flanco;
   * slotPressed vale -1 o 0..7; wheel se resetea a 0 en cada poll.
   */
  poll() {
    const prev = this.prev || NONE;
    const keyboard = {
      move: keysToMove(this.keys),
      a: anyHeld(this.keys, INTERACT_KEYS),
      b: anyHeld(this.keys, BACK_KEYS),
      start: anyHeld(this.keys, START_KEYS),
      x: anyHeld(this.keys, X_KEYS),
      y: anyHeld(this.keys, Y_KEYS),
      prevHotbar: anyHeld(this.keys, PREV_HOTBAR_KEYS),
      nextHotbar: anyHeld(this.keys, NEXT_HOTBAR_KEYS),
    };
    const pad = this.readGamepad();
    const a = keyboard.a || pad.a;
    const b = keyboard.b || pad.b;
    const start = keyboard.start || pad.start;
    const x = keyboard.x || pad.x;
    const y = keyboard.y || pad.y;
    const prevHotbar = keyboard.prevHotbar || pad.lb;
    const nextHotbar = keyboard.nextHotbar || pad.rb;

    const device = deviceAfter(this.lastDevice, {
      keyboard: this.keyboardActivity,
      pad: pad.active,
    });
    const tap = tapDirection(this.tapped);
    const state = {
      move: combineMoves(keyboard.move, pad.move),
      menuMove: combineMoves(tap, keyboard.move, pad.move),
      a,
      b,
      start,
      x,
      y,
      prevHotbar: (prevHotbar && !prev.lb) || anyTapped(this.tapped, PREV_HOTBAR_KEYS),
      nextHotbar: (nextHotbar && !prev.rb) || anyTapped(this.tapped, NEXT_HOTBAR_KEYS),
      slotPressed: this.readSlot(),
      aPressed: (a && !prev.a) || anyTapped(this.tapped, INTERACT_KEYS),
      bPressed: (b && !prev.b) || anyTapped(this.tapped, BACK_KEYS),
      xPressed: (x && !prev.x) || anyTapped(this.tapped, X_KEYS),
      yPressed: (y && !prev.y) || anyTapped(this.tapped, Y_KEYS),
      startPressed: (start && !prev.start) || anyTapped(this.tapped, START_KEYS),
      wheel: this.wheel,
      click: this.click,
      device,
    };
    this.lastDevice = device;
    this.device = device;
    this.prev = { a, b, start, x, y, lb: prevHotbar, rb: nextHotbar };
    this.tapped.clear();
    this.keyboardActivity = false;
    this.wheel = 0;
    this.click = null;
    return state;
  }
}
