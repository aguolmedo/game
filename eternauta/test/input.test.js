import test from 'node:test';
import assert from 'node:assert/strict';
import { Input, deviceAfter } from '../src/input.js';

function makeTarget() {
  const listeners = {};
  return {
    addEventListener(type, fn) {
      (listeners[type] ||= []).push(fn);
    },
    fire(type, event = {}) {
      for (const fn of listeners[type] || []) {
        fn({ code: '', repeat: false, preventDefault() {}, ...event });
      }
    },
  };
}

function makePad({ axes = [0, 0], buttons = [] } = {}) {
  const all = Array.from({ length: 16 }, (_, i) => ({ pressed: Boolean(buttons[i]) }));
  return { connected: true, axes, buttons: all };
}

function withPad(pad, fn) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { getGamepads: () => [pad] },
  });
  try {
    return fn();
  } finally {
    if (previous) Object.defineProperty(globalThis, 'navigator', previous);
  }
}

test('input teclado: movimiento, interactuar y pausa', () => {
  const target = makeTarget();
  const input = new Input(target);

  assert.deepEqual(input.poll().move, { x: 0, y: 0 });

  target.fire('keydown', { code: 'KeyD' });
  const right = input.poll();
  assert.equal(right.move.x, 1);
  assert.equal(right.a, false);

  target.fire('keydown', { code: 'KeyW' });
  const diagonal = input.poll();
  assert.ok(Math.abs(Math.hypot(diagonal.move.x, diagonal.move.y) - 1) < 1e-6);

  target.fire('keyup', { code: 'KeyD' });
  target.fire('keyup', { code: 'KeyW' });
  assert.deepEqual(input.poll().move, { x: 0, y: 0 });

  target.fire('keydown', { code: 'KeyE' });
  const interact = input.poll();
  assert.equal(interact.a, true);
  assert.equal(interact.aPressed, true);
  assert.equal(input.poll().aPressed, false);

  target.fire('keyup', { code: 'KeyE' });
  target.fire('keydown', { code: 'Escape' });
  assert.equal(input.poll().startPressed, true);
});

test('input gamepad: deadzone, ejes, cruceta, A y Start', () => {
  const target = makeTarget();
  const input = new Input(target);

  withPad(makePad({ axes: [0.1, 0.1] }), () => {
    input.prev = { a: false, b: false, start: false };
    assert.deepEqual(input.poll().move, { x: 0, y: 0 });
  });

  withPad(makePad({ axes: [1, 0] }), () => {
    const move = input.poll().move;
    assert.ok(move.x > 0.99);
    assert.equal(move.y, 0);
  });

  withPad(makePad({ axes: [0, -1] }), () => {
    const move = input.poll().move;
    assert.ok(move.y < -0.99);
  });

  withPad(makePad({ buttons: { 14: true } }), () => {
    assert.equal(input.poll().move.x, -1);
  });

  withPad(makePad({ buttons: { 0: true } }), () => {
    input.prev = { a: false, b: false, start: false };
    const pressed = input.poll();
    assert.equal(pressed.a, true);
    assert.equal(pressed.aPressed, true);
    assert.equal(input.poll().aPressed, false);
  });

  withPad(makePad({ buttons: { 9: true } }), () => {
    input.prev = { a: false, b: false, start: false };
    assert.equal(input.poll().startPressed, true);
  });
});

test('input teclado: Q/R cambian de hotbar sólo en el primer frame', () => {
  const target = makeTarget();
  const input = new Input(target);

  const idle = input.poll();
  assert.equal(idle.prevHotbar, false);
  assert.equal(idle.nextHotbar, false);
  assert.equal(idle.slotPressed, -1);

  target.fire('keydown', { code: 'KeyQ' });
  const prevFrame = input.poll();
  assert.equal(prevFrame.prevHotbar, true);
  assert.equal(prevFrame.nextHotbar, false);
  assert.equal(input.poll().prevHotbar, false);

  target.fire('keyup', { code: 'KeyQ' });
  target.fire('keydown', { code: 'KeyR' });
  const nextFrame = input.poll();
  assert.equal(nextFrame.nextHotbar, true);
  assert.equal(nextFrame.prevHotbar, false);
  assert.equal(input.poll().nextHotbar, false);

  // Un toque corto (keydown + keyup en el mismo frame) también dispara una vez.
  target.fire('keyup', { code: 'KeyR' });
  target.fire('keydown', { code: 'KeyR' });
  target.fire('keyup', { code: 'KeyR' });
  assert.equal(input.poll().nextHotbar, true);
  assert.equal(input.poll().nextHotbar, false);
});

test('input teclado: Digit3 -> slotPressed 2 una vez y después -1', () => {
  const target = makeTarget();
  const input = new Input(target);

  assert.equal(input.poll().slotPressed, -1);

  target.fire('keydown', { code: 'Digit3' });
  assert.equal(input.poll().slotPressed, 2);
  target.fire('keyup', { code: 'Digit3' });
  assert.equal(input.poll().slotPressed, -1);

  target.fire('keydown', { code: 'Digit1' });
  assert.equal(input.poll().slotPressed, 0);
  target.fire('keyup', { code: 'Digit1' });

  target.fire('keydown', { code: 'Digit8' });
  assert.equal(input.poll().slotPressed, 7);
  target.fire('keyup', { code: 'Digit8' });

  // Mantener apretada una tecla que no es de ranura no cambia nada.
  target.fire('keydown', { code: 'KeyQ' });
  assert.equal(input.poll().slotPressed, -1);
});

test('input teclado: KeyB es la tecla de volver', () => {
  const target = makeTarget();
  const input = new Input(target);

  target.fire('keydown', { code: 'KeyB' });
  const back = input.poll();
  assert.equal(back.b, true);
  assert.equal(back.bPressed, true);
  assert.equal(input.poll().bPressed, false);

  target.fire('keyup', { code: 'KeyB' });
  // B del gamepad sigue funcionando.
  withPad(makePad({ buttons: { 1: true } }), () => {
    input.prev = { a: false, b: false, start: false };
    assert.equal(input.poll().bPressed, true);
  });
});

test('input gamepad: LB/RB cambian de hotbar sólo en el primer frame', () => {
  const target = makeTarget();
  const input = new Input(target);

  withPad(makePad({ buttons: { 4: true } }), () => {
    input.prev = { a: false, b: false, start: false };
    const lb = input.poll();
    assert.equal(lb.prevHotbar, true);
    assert.equal(lb.nextHotbar, false);
    assert.equal(input.poll().prevHotbar, false);
  });

  withPad(makePad({ buttons: { 5: true } }), () => {
    const rb = input.poll();
    assert.equal(rb.nextHotbar, true);
    assert.equal(rb.prevHotbar, false);
    assert.equal(input.poll().nextHotbar, false);
  });

  withPad(makePad(), () => {
    const idle = input.poll();
    assert.equal(idle.prevHotbar, false);
    assert.equal(idle.nextHotbar, false);
    assert.equal(idle.slotPressed, -1);
  });
});

test('input mixto: las teclas funcionan aunque haya gamepad conectado', () => {
  const target = makeTarget();
  const input = new Input(target);

  withPad(makePad(), () => {
    target.fire('keydown', { code: 'KeyQ' });
    assert.equal(input.poll().prevHotbar, true);
    target.fire('keyup', { code: 'KeyQ' });

    target.fire('keydown', { code: 'KeyR' });
    assert.equal(input.poll().nextHotbar, true);
    target.fire('keyup', { code: 'KeyR' });

    target.fire('keydown', { code: 'Digit5' });
    assert.equal(input.poll().slotPressed, 4);
    target.fire('keyup', { code: 'Digit5' });

    target.fire('keydown', { code: 'KeyB' });
    assert.equal(input.poll().bPressed, true);
  });
});

test('deviceAfter: teclado gana, después pad, si no hay actividad se mantiene', () => {
  assert.equal(deviceAfter('keyboard', {}), 'keyboard');
  assert.equal(deviceAfter('pad', { pad: true }), 'pad');
  assert.equal(deviceAfter('keyboard', { pad: true }), 'pad');
  assert.equal(deviceAfter('pad', { keyboard: true }), 'keyboard');
  assert.equal(deviceAfter('pad', { keyboard: true, pad: true }), 'keyboard');
  assert.equal(deviceAfter(undefined, {}), 'keyboard');
});

test('input teclado: X (KeyF) e Y (KeyI o Tab) de flanco', () => {
  const target = makeTarget();
  const input = new Input(target);

  assert.equal(input.poll().xPressed, false);
  target.fire('keydown', { code: 'KeyF' });
  const x = input.poll();
  assert.equal(x.x, true);
  assert.equal(x.xPressed, true);
  assert.equal(input.poll().xPressed, false);
  target.fire('keyup', { code: 'KeyF' });

  target.fire('keydown', { code: 'KeyI' });
  const y = input.poll();
  assert.equal(y.y, true);
  assert.equal(y.yPressed, true);
  assert.equal(input.poll().yPressed, false);
  target.fire('keyup', { code: 'KeyI' });

  target.fire('keydown', { code: 'Tab' });
  assert.equal(input.poll().yPressed, true);
  target.fire('keyup', { code: 'Tab' });
  assert.equal(input.poll().yPressed, false);
});

test('input gamepad: botones 2 y 3 son X e Y', () => {
  const target = makeTarget();
  const input = new Input(target);

  withPad(makePad({ buttons: { 2: true } }), () => {
    input.prev = { a: false, b: false, start: false };
    const pressed = input.poll();
    assert.equal(pressed.x, true);
    assert.equal(pressed.xPressed, true);
    assert.equal(pressed.yPressed, false);
    assert.equal(input.poll().xPressed, false);
  });

  withPad(makePad({ buttons: { 3: true } }), () => {
    input.prev = { a: false, b: false, start: false };
    const pressed = input.poll();
    assert.equal(pressed.y, true);
    assert.equal(pressed.yPressed, true);
    assert.equal(pressed.xPressed, false);
  });
});

test('input: el dispositivo cambia pad -> teclado y viceversa', () => {
  const target = makeTarget();
  const input = new Input(target);

  assert.equal(input.poll().device, 'keyboard');

  withPad(makePad({ buttons: { 0: true } }), () => {
    assert.equal(input.poll().device, 'pad');
  });

  // Sin actividad de ningún tipo se mantiene el último dispositivo.
  withPad(makePad(), () => {
    assert.equal(input.poll().device, 'pad');
  });

  target.fire('keydown', { code: 'KeyW' });
  assert.equal(input.poll().device, 'keyboard');
  target.fire('keyup', { code: 'KeyW' });

  // El stick fuera de la deadzone también cuenta como actividad del pad.
  withPad(makePad({ axes: [1, 0] }), () => {
    assert.equal(input.poll().device, 'pad');
  });
  // Con teclado y pad en el mismo frame gana el teclado.
  withPad(makePad({ buttons: { 0: true } }), () => {
    target.fire('keydown', { code: 'KeyW' });
    assert.equal(input.poll().device, 'keyboard');
    target.fire('keyup', { code: 'KeyW' });
  });
});

test('input teclado: Backspace también es volver', () => {
  const target = makeTarget();
  const input = new Input(target);

  target.fire('keydown', { code: 'Backspace' });
  const back = input.poll();
  assert.equal(back.b, true);
  assert.equal(back.bPressed, true);
  assert.equal(input.poll().bPressed, false);
});

test('input mouse: la rueda se normaliza a -1/0/1 y se resetea por frame', () => {
  const target = makeTarget();
  const input = new Input(target);

  assert.equal(input.poll().wheel, 0);

  target.fire('wheel', { deltaY: -120 });
  assert.equal(input.poll().wheel, -1);
  assert.equal(input.poll().wheel, 0);

  target.fire('wheel', { deltaY: 100 });
  target.fire('wheel', { deltaY: 100 });
  assert.equal(input.poll().wheel, 1);

  target.fire('wheel', { deltaY: -40 });
  target.fire('wheel', { deltaY: 180 });
  assert.equal(input.poll().wheel, 0);
});

test('input mouse: click izquierdo con coordenadas, una vez por frame', () => {
  const target = makeTarget();
  const input = new Input(target);

  assert.equal(input.poll().click, null);

  // Botón derecho no cuenta.
  target.fire('mousedown', { button: 2, clientX: 5, clientY: 6 });
  assert.equal(input.poll().click, null);

  target.fire('mousedown', { button: 0, clientX: 12, clientY: 34 });
  assert.deepEqual(input.poll().click, { x: 12, y: 34 });
  assert.equal(input.poll().click, null);
});
