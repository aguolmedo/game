// Prólogo del roguelike: el Eternauta viejo cae en el universo 16 bits, en el
// cuarto de un programador que le explica el chiste. Dos modos:
// - 'intro': la llegada (la tinta se vuelve píxeles), el cuarto y el gag.
// - 'queja': la versión corta que usa el loop (dos líneas y afuera).
// La lógica de tiempos es pura (prologueTimeline / stepPrologue) para poder
// probarla sin DOM; la escena solo dibuja y maneja el diálogo.
import * as THREE from 'three';
import { imageSprite, canvasOverlay, VIEW_W, VIEW_H } from '../sprite.js';
import { viewport } from '../viewport.js';
import { DialogBox } from '../dialog.js';
import { drawPromptBar } from '../glyphs.js';
import { renderFlat } from '../core/scene.js';

const CONTINUUM_BG = '#06060e';
const STATIC_CYAN = '#8fe6ff';
const STATIC_VIOLET = '#b48cff';

// Cuadro de la llegada: 7 dibujos de 64x128, mostrados x2 (128x256).
export const LLEGADA_TIMES = [0.6, 0.6, 1.0, 0.5, 0.5, 0.8, 1.4];
export const BLINK_TIME = 1 / 60;     // un frame de estática entre cuadros
export const CUT_TIME = 0.3;          // corte a negro
export const ROOM_EMPTY_TIME = 1.6;   // el cuarto vacío
export const ROOM_ARRIVE_TIME = 1.2;  // la mancha en la silla (titila)
export const FLICKER_TIME = 0.4;
export const FLICKER_STEP = 0.1;
export const ROOM_W = 320;
export const ROOM_H = 180;

// El gag, textual (docs/roguelike_narrativa.md).
export const GAG = [
  {
    speaker: 'El Eternauta', portrait: 'eternauta_viejo',
    lines: ['Llevo no sé cuántas veces la misma noche. Salgo a la calle, me matan los bichos y vuelvo al truco. Siempre el truco.'],
  },
  {
    speaker: 'Programador', portrait: 'programador',
    lines: ['Ah, sí... es que el juego todavía no tiene final.'],
  },
  {
    speaker: 'El Eternauta', portrait: 'eternauta_viejo',
    lines: ['¿El qué?'],
  },
  {
    speaker: 'Programador', portrait: 'programador',
    lines: ['Te estoy programando. Esto es un roguelike.'],
  },
  {
    speaker: 'El Eternauta', portrait: 'eternauta_viejo',
    lines: ['...¿Un qué?'],
  },
];

// La queja del loop: una línea del viejo y una respuesta corta.
export const QUEJAS = [
  'Otra vez. Los bichos, la nieve, el truco.',
  '¿Ya le pusiste final?',
  'Esta vez llegué hasta la plaza.',
  'Me olvidé de todo menos de esto.',
  'Favalli me miró raro. Creo que se acuerda.',
  'La mochila la dejé tirada otra vez.',
];

export const RESPUESTAS = [
  'Estoy en eso.',
  'Dale, una más.',
  'Ya casi.',
  'Anotado.',
];

function pickFrom(list, random) {
  const i = Math.min(list.length - 1, Math.max(0, Math.floor(random() * list.length)));
  return list[i];
}

/** Entradas de diálogo del modo. `random` se inyecta en las pruebas. */
export function prologueDialog(mode = 'intro', random = Math.random) {
  if (mode === 'queja') {
    return [
      { speaker: 'El Eternauta', portrait: 'eternauta_viejo', lines: [pickFrom(QUEJAS, random)] },
      { speaker: 'Programador', portrait: 'programador', lines: [pickFrom(RESPUESTAS, random)] },
    ];
  }
  return GAG.map((entry) => ({ ...entry, lines: [...entry.lines] }));
}

/** Lista plana de pasos: la escena y las pruebas leen lo mismo. */
export function prologueTimeline(mode = 'intro') {
  if (mode === 'queja') {
    return [
      { phase: 'room', room: 'gag', dur: 0.3 },
      { phase: 'dialog', dialog: 'queja' },
    ];
  }
  const steps = [];
  LLEGADA_TIMES.forEach((dur, frame) => {
    if (frame > 0) steps.push({ phase: 'blink', dur: BLINK_TIME });
    steps.push({ phase: 'arrival', frame, dur });
  });
  steps.push({ phase: 'cut', dur: CUT_TIME });
  steps.push({ phase: 'room', room: 'vacio', dur: ROOM_EMPTY_TIME });
  steps.push({ phase: 'room', room: 'llegada', dur: ROOM_ARRIVE_TIME });
  steps.push({ phase: 'room', room: 'gag', dur: 0.4 });
  steps.push({ phase: 'dialog', dialog: 'gag' });
  return steps;
}

export function createPrologueState(mode = 'intro') {
  return {
    mode: mode === 'queja' ? 'queja' : 'intro',
    step: 0,
    t: 0,
    done: false,
    skipped: false,
  };
}

/** Paso actual de la línea de tiempo, o null si ya terminó. */
export function prologueStep(state) {
  if (!state || state.done) return null;
  const timeline = prologueTimeline(state.mode);
  return state.step < timeline.length ? timeline[state.step] : null;
}

/**
 * Avanza el reloj del prólogo. En el paso de diálogo se detiene: lo maneja
 * DialogBox. input.skip (Esc/B/Start) salta directo al final del modo.
 */
export function stepPrologue(state, dt, input = {}) {
  if (!state || state.done) return state;
  const timeline = prologueTimeline(state.mode);
  if (input.skip) {
    state.skipped = true;
    state.done = true;
    state.step = timeline.length;
    state.t = 0;
    return state;
  }
  if (timeline[state.step] && timeline[state.step].phase === 'dialog') return state;
  state.t += Math.max(0, dt || 0);
  while (state.step < timeline.length) {
    const step = timeline[state.step];
    if (step.phase === 'dialog' || state.t < step.dur) break;
    state.t -= step.dur;
    state.step += 1;
  }
  if (state.step >= timeline.length) {
    state.done = true;
    state.t = 0;
  } else if (timeline[state.step].phase === 'dialog') {
    state.t = 0;
  }
  return state;
}

export class PrologueScene {
  constructor(game) {
    this.game = game;
    this.pausable = false;
    this.blocksPause = true;
    // El cuarto son píxeles de mundo: se ve con el zoom 1.5x (320x180 llenan
    // los 480x270 de la vista). La llegada va en la capa de UI.
    this.worldZoom = true;
    this.scene = new THREE.Scene();
    this.cam = { x: 0, y: 0 };
    this.uiScene = new THREE.Scene();
    this.overlay = canvasOverlay(VIEW_W, VIEW_H, 30);
    this.uiScene.add(this.overlay.mesh);
    this.dialog = new DialogBox(game.assets);
    this.rooms = {};
    this.roomKey = null;
    this.mode = 'intro';
    this.returnTo = null;
    this.progress = createPrologueState('intro');
    this.entries = [];
    this.entry = 0;
    this.finished = false;
    this.t = 0;
  }

  /** main.js: game.startPrologue(mode, opts) llama acá. */
  start(mode = 'intro', opts = {}) {
    this.mode = mode === 'queja' ? 'queja' : 'intro';
    this.returnTo = (opts && opts.returnTo) || null;
    this.game.changeScene('prologue');
  }

  buildRooms() {
    const roguelike = this.game.assets.roguelike;
    if (!roguelike || this.rooms.vacio) return;
    for (const key of ['vacio', 'llegada', 'gag']) {
      const texture = roguelike.cuarto[key];
      const mesh = imageSprite(texture, ROOM_W, ROOM_H, 1);
      mesh.position.set(ROOM_W / 2, ROOM_H / 2, 1);
      mesh.visible = false;
      this.scene.add(mesh);
      this.rooms[key] = mesh;
    }
  }

  enter() {
    this.buildRooms();
    this.progress = createPrologueState(this.mode);
    this.entries = prologueDialog(this.mode);
    this.entry = 0;
    this.finished = false;
    this.t = 0;
    this.dialog.hide();
    this.showRoom(null);
    this.game.mouseCursor?.setState?.('arrow');
    this.drawUi();
  }

  /** Pantalla fija: sin luz de apagón (ver core/scene.js). */
  render(ctx) { renderFlat(this, ctx); }

  applyCamera(camera) {
    camera.left = this.cam.x;
    camera.right = this.cam.x + (viewport.worldW || VIEW_W);
    camera.top = this.cam.y;
    camera.bottom = this.cam.y + (viewport.worldH || VIEW_H);
    camera.updateProjectionMatrix();
  }

  update(dt, input) {
    this.t += dt;
    if (this.finished) {
      // Si el cambio se pidió en pleno fundido, reintenta cuando termina.
      if (!this.game.transition) this.game.changeScene(this.exitScene());
      return;
    }
    // Esc / B / Start: se saltea todo el prólogo.
    if (input.bPressed || input.startPressed) {
      this.finish();
      return;
    }
    stepPrologue(this.progress, dt);
    const step = prologueStep(this.progress);
    if (!step) {
      this.finish();
      return;
    }
    if (step.phase === 'dialog') this.updateDialog(dt, input);
    this.showRoom(step.phase === 'dialog' ? { room: 'gag' } : (step.phase === 'room' ? step : null));
    this.drawUi();
  }

  updateDialog(dt, input) {
    if (!this.dialog.open) {
      this.openEntry();
      return;
    }
    const point = input.click
      ? this.game.screenToView(input.click.x, input.click.y)
      : null;
    const result = this.dialog.update(dt, input, input.device, point);
    if (result !== 'closed') return;
    this.entry += 1;
    if (this.entry >= this.entries.length) this.finish();
    else this.openEntry();
  }

  openEntry() {
    const entry = this.entries[this.entry];
    if (!entry) {
      this.finish();
      return;
    }
    this.dialog.show({ ...entry, lines: [...entry.lines] });
  }

  exitScene() {
    return this.mode === 'queja' ? (this.returnTo || 'garage') : 'attic';
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    this.dialog.hide();
    this.game.changeScene(this.exitScene());
  }

  /** Cuarto visible; en la llegada titila con el vacío los primeros 0,4 s. */
  showRoom(step) {
    let key = null;
    if (step) {
      key = step.room;
      if (step.room === 'llegada' && this.progress.t < FLICKER_TIME
        && Math.floor(this.progress.t / FLICKER_STEP) % 2 === 1) {
        key = 'vacio';
      }
    }
    if (key === this.roomKey) return;
    this.roomKey = key;
    for (const [name, mesh] of Object.entries(this.rooms)) mesh.visible = name === key;
  }

  drawUi() {
    const ctx = this.overlay.ctx;
    this.overlay.clear();
    const step = prologueStep(this.progress);
    if (step && (step.phase === 'arrival' || step.phase === 'blink')) {
      this.drawArrival(ctx, step);
    }
    if (this.dialog.open) this.dialog.draw(ctx, VIEW_W, VIEW_H, this.game.input.device);
    this.drawSkip(ctx);
    this.overlay.commit();
  }

  /** Negro, estática del continuum (cian y violeta) y el cuadro de la llegada. */
  drawArrival(ctx, step) {
    ctx.fillStyle = CONTINUUM_BG;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const heavy = step.phase === 'blink';
    const count = heavy ? 320 : 64;
    for (let i = 0; i < count; i++) {
      const x = Math.floor(Math.random() * VIEW_W);
      const y = Math.floor(Math.random() * VIEW_H);
      const size = heavy && Math.random() < 0.14 ? 2 : 1;
      ctx.globalAlpha = heavy ? 0.22 + Math.random() * 0.5 : 0.18 + Math.random() * 0.35;
      ctx.fillStyle = Math.random() < 0.5 ? STATIC_CYAN : STATIC_VIOLET;
      ctx.fillRect(x, y, size, 1);
    }
    ctx.globalAlpha = 1;
    if (step.phase !== 'arrival') return;
    const texture = this.game.assets.roguelike.llegada[step.frame];
    const image = texture && texture.image;
    if (!image) return;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      image, 0, 0, 64, 128,
      Math.round((VIEW_W - 128) / 2), Math.round((VIEW_H - 256) / 2), 128, 256,
    );
  }

  drawSkip(ctx) {
    // Abajo a la derecha; con el cuadro abierto sube justo encima.
    const y = this.dialog.open ? 152 : VIEW_H - 17;
    drawPromptBar(ctx, this.game.assets, this.game.input.device,
      [{ action: 'back', label: 'Saltar' }], VIEW_W - 6, y, this.t);
  }

  get choice() { return { open: false }; }

  state() {
    const step = prologueStep(this.progress);
    return {
      mode: this.mode,
      phase: step ? step.phase : (this.finished ? 'end' : 'none'),
      step: this.progress ? this.progress.step : -1,
      frame: step && step.phase === 'arrival' ? step.frame : -1,
      room: this.roomKey,
      entry: this.dialog.open ? this.entry : -1,
      entries: this.entries.length,
      typing: this.dialog.open ? this.dialog.typing : false,
      finished: this.finished,
      returnTo: this.returnTo,
    };
  }
}
