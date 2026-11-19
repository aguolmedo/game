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

  // E ya no es Acción en el mundo: Enter/Espacio confirman en menús/diálogos.
  target.fire('keydown', { code: 'KeyE' });
  assert.equal(input.poll().a, false);
  target.fire('keyup', { code: 'KeyE' });

  target.fire('keydown', { code: 'Enter' });
  const confirm = input.poll();
  assert.equal(confirm.a, true);
  assert.equal(confirm.aPressed, true);
  assert.equal(input.poll().aPressed, false);

  target.fire('keyup', { code: 'Enter' });
  target.fire('keydown', { code: 'Escape' });
  assert.equal(input.poll().startPressed, true);
});

test('input gamepad: deadzone, ejes, cruceta, A, B, X, Y y Start', () => {
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

  // X (botón 2) = Manos, con flanco.
  withPad(makePad({ buttons: { 2: true } }), () => {
    input.prev = { ...input.prev, hands: false };
    const hands = input.poll();
    assert.equal(hands.hands, true);
    assert.equal(hands.handsPressed, true);
    assert.equal(input.poll().handsPressed, false);
  });

  // RT (botón 7) ya no es Manos: no hace nada.
  withPad(makePad({ buttons: { 7: true } }), () => {
    input.prev = { a: false, b: false, start: false };
    const pressed = input.poll();
    assert.equal(pressed.hands, false);
    assert.equal(pressed.handsPressed, false);
  });
});

test('input teclado: Q y R no hacen nada (no hay botón de Mirar)', () => {
  const target = makeTarget();
  const input = new Input(target);

  const idle = input.poll();
  assert.equal(idle.handsPressed, false);
  assert.equal(idle.prevHotbar, false);
  assert.equal(idle.nextHotbar, false);
  assert.equal(idle.slotPressed, -1);

  target.fire('keydown', { code: 'KeyQ' });
  const q = input.poll();
  assert.equal(q.handsPressed, false, 'Q ya no mira ni hace nada');
  assert.equal(q.prevHotbar, false);
  assert.equal(q.nextHotbar, false);
  target.fire('keyup', { code: 'KeyQ' });

  target.fire('keydown', { code: 'KeyR' });
  const r = input.poll();
  assert.equal(r.nextHotbar, false, 'R queda libre');
  assert.equal(r.prevHotbar, false);
  assert.equal(r.handsPressed, false);
  target.fire('keyup', { code: 'KeyR' });

  // La barra con teclado va con 1-8.
  target.fire('keydown', { code: 'Digit4' });
  assert.equal(input.poll().slotPressed, 3);
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
    assert.equal(input.poll().handsPressed, false, 'Q no hace nada');
    target.fire('keyup', { code: 'KeyQ' });

    target.fire('keydown', { code: 'Digit5' });
    assert.equal(input.poll().slotPressed, 4);
    target.fire('keyup', { code: 'Digit5' });

    target.fire('keydown', { code: 'KeyB' });
    assert.equal(input.poll().bPressed, true);
  });
});

test('deviceAfter: solo mouse y pad; el teclado nunca cambia el modo', () => {
  assert.equal(deviceAfter(undefined, {}), 'mouse');
  assert.equal(deviceAfter('pad', { pad: true }), 'pad');
  assert.equal(deviceAfter('mouse', { pad: true }), 'pad');
  // Usar el teclado no saca el modo mouse.
  assert.equal(deviceAfter('mouse', { keyboard: true }), 'mouse');
  assert.equal(deviceAfter('pad', { keyboard: true }), 'pad');
  assert.equal(deviceAfter('pad', { keyboard: true, pad: true }), 'pad');
});

test('deviceAfter: el mouse gana sobre teclado y pad', () => {
  assert.equal(deviceAfter('keyboard', { mouse: true }), 'mouse');
  assert.equal(deviceAfter('pad', { mouse: true }), 'mouse');
  assert.equal(deviceAfter('pad', { mouse: true, keyboard: true, pad: true }), 'mouse');
});

test('deviceAfter: el pad toma el control; el mouse queda si fue reciente', () => {
  assert.equal(deviceAfter('mouse', { keyboard: true, mouseRecent: true }), 'mouse');
  assert.equal(deviceAfter('mouse', { pad: true, mouseRecent: true }), 'pad',
    'el pad toma el control enseguida');
  assert.equal(deviceAfter('mouse', { keyboard: true, mouseRecent: false }), 'mouse');
  assert.equal(deviceAfter('pad', { keyboard: true, mouseRecent: false }), 'pad',
    'usar el teclado no cambia de dispositivo');
});

test('input mouse: un temblor de 2 px no toma el control, 5 px sí', () => {
  const target = makeTarget();
  const input = new Input(target);
  // Primer movimiento: toma el control (no hay referencia previa).
  target.fire('pointermove', { clientX: 100, clientY: 100 });
  assert.equal(input.poll().device, 'mouse');

  target.fire('keydown', { code: 'KeyW' });
  assert.equal(input.poll().device, 'mouse', 'el teclado no cambia el modo');
  target.fire('keyup', { code: 'KeyW' });

  input.mouseAt = 0;
  target.fire('keydown', { code: 'KeyW' });
  assert.equal(input.poll().device, 'mouse', 'sin mouse sigue mouse, no "keyboard"');
  target.fire('keyup', { code: 'KeyW' });

  // Temblor de 2 px: no vuelve a marcar actividad.
  input.mouseAt = 0;
  target.fire('pointermove', { clientX: 102, clientY: 101 });
  assert.equal(input.poll().device, 'mouse');
  assert.equal(input.mouseAt, 0, 'el temblor no cuenta como movimiento');

  // Movimiento real de 5 px: sí.
  input.mouseAt = 0;
  target.fire('pointermove', { clientX: 107, clientY: 101 });
  assert.equal(input.poll().device, 'mouse');
  assert.ok(input.mouseAt > 0);
});

test('input mouse: guarda el puntero y marca el mouse como último dispositivo', () => {
  const target = makeTarget();
  const input = new Input(target);

  target.fire('pointermove', { clientX: 120, clientY: 80 });
  const first = input.poll();
  assert.deepEqual(first.pointer, { x: 120, y: 80 });
  assert.equal(first.device, 'mouse');
  // sin actividad se mantiene el último dispositivo y la posición
  const second = input.poll();
  assert.equal(second.device, 'mouse');
  assert.deepEqual(second.pointer, { x: 120, y: 80 });

  input.mouseAt = 0;
  target.fire('keydown', { code: 'KeyW' });
  assert.equal(input.poll().device, 'mouse', 'el teclado no toma el control');
});

test('input teclado: F/R/Q no hacen nada; I/Tab siguen abriendo la mochila', () => {
  const target = makeTarget();
  const input = new Input(target);

  for (const code of ['KeyF', 'KeyR', 'KeyQ']) {
    target.fire('keydown', { code });
    const frame = input.poll();
    assert.equal(frame.handsPressed, false, `${code} no es Manos`);
    target.fire('keyup', { code });
  }

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

test('input gamepad: el botón 3 es Y (Mochila) y el 2 es X (Manos)', () => {
  const target = makeTarget();
  const input = new Input(target);

  withPad(makePad({ buttons: { 2: true } }), () => {
    input.prev = { a: false, b: false, start: false };
    const pressed = input.poll();
    assert.equal(pressed.hands, true);
    assert.equal(pressed.handsPressed, true);
    assert.equal(pressed.y, false);
  });

  withPad(makePad({ buttons: { 3: true } }), () => {
    input.prev = { a: false, b: false, start: false };
    const pressed = input.poll();
    assert.equal(pressed.y, true);
    assert.equal(pressed.yPressed, true);
    assert.equal(pressed.handsPressed, false);
  });
});

test('input: hay dos dispositivos, mouse y pad; el teclado acompaña', () => {
  const target = makeTarget();
  const input = new Input(target);

  assert.equal(input.poll().device, 'mouse');

  withPad(makePad({ buttons: { 0: true } }), () => {
    assert.equal(input.poll().device, 'pad');
  });

  // Sin actividad de ningún tipo se mantiene el último dispositivo.
  withPad(makePad(), () => {
    assert.equal(input.poll().device, 'pad');
  });

  target.fire('keydown', { code: 'KeyW' });
  assert.equal(input.poll().device, 'pad', 'caminar con WASD no saca el pad');
  target.fire('keyup', { code: 'KeyW' });

  // El stick fuera de la deadzone cuenta como actividad del pad.
  withPad(makePad({ axes: [1, 0] }), () => {
    assert.equal(input.poll().device, 'pad');
  });
  // El mouse toma el control con un movimiento real.
  target.fire('pointermove', { clientX: 50, clientY: 50 });
  assert.equal(input.poll().device, 'mouse');
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

  // Botón derecho no cuenta como click izquierdo.
  target.fire('mousedown', { button: 2, clientX: 5, clientY: 6 });
  assert.equal(input.poll().click, null);

  target.fire('mousedown', { button: 0, clientX: 12, clientY: 34 });
  assert.deepEqual(input.poll().click, { x: 12, y: 34 });
  assert.equal(input.poll().click, null);
});

test('input mouse: click derecho va por su propio canal (y no por click)', () => {
  const target = makeTarget();
  const input = new Input(target);

  assert.equal(input.poll().rightClick, null);

  target.fire('mousedown', { button: 2, clientX: 7, clientY: 9 });
  const frame = input.poll();
  assert.deepEqual(frame.rightClick, { x: 7, y: 9 });
  assert.equal(frame.click, null, 'el derecho no dispara el izquierdo');
  assert.equal(frame.device, 'mouse');
  assert.equal(input.poll().rightClick, null, 'se resetea cada frame');

  // El izquierdo sigue intacto.
  target.fire('mousedown', { button: 0, clientX: 1, clientY: 2 });
  const left = input.poll();
  assert.deepEqual(left.click, { x: 1, y: 2 });
  assert.equal(left.rightClick, null);
});

test('input mouse: el menú contextual del canvas se cancela', () => {
  const target = makeTarget();
  new Input(target);
  let prevented = 0;
  target.fire('contextmenu', { preventDefault() { prevented += 1; } });
  assert.equal(prevented, 1);
});

test('input mouse: click derecho = Manos (con flanco), no Mirar', () => {
  const target = makeTarget();
  const input = new Input(target);

  assert.equal(input.poll().handsPressed, false);
  target.fire('mousedown', { button: 2, clientX: 10, clientY: 12 });
  const frame = input.poll();
  assert.equal(frame.handsPressed, true);
  assert.equal(frame.device, 'mouse');
  assert.equal(input.poll().handsPressed, false, 'se resetea cada frame');
  assert.deepEqual(frame.rightClick, { x: 10, y: 12 });
});

test('input: Enter y Espacio confirman en menús, no en el mundo', () => {
  const target = makeTarget();
  const input = new Input(target);
  target.fire('keydown', { code: 'Space' });
  const space = input.poll();
  assert.equal(space.aPressed, true, 'confirma menús/diálogos');
  assert.equal(space.padAPressed, false, 'el mundo solo actúa con A del pad');
  assert.equal(space.handsPressed, false);
});
