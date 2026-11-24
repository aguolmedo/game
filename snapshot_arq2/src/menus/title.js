// Pantalla de título, con sus vistas de Controles y Créditos.
import { drawText, measureText } from '../font.js';
import { drawPrompt, promptWidth } from '../glyphs.js';
import { Cursor } from '../menu.js';
import {
  woodSign, selectBar, snowflake, introAlpha, easeOut, fitSignWidth,
  CREAM, CREAM2, ROW_H, ROW_Y, SIGN_H,
} from '../titleUi.js';
import { OUT } from '../uiSkin.js';
import { pointInRect, hitIndex, rowRects } from '../geom.js';
import { mousePoint } from '../uiHit.js';
import {
  VIEW_W, VIEW_H, clickPoint, setHand, promptBox, drawBoxedPrompt, uiCanvas, place,
} from './shared.js';
import {
  CONTROLS_HEADERS, CONTROLS_ROWS, CONTROLS_NOTES, drawGlyphRun,
} from './controls.js';

// logo del titulo (art/concept/out/titulo3d_logo.png): tamano fijo, 1x
const LOGO_W = 276;
const LOGO_H = 63;
const LOGO_Y = 22;

// ------------------------------------------------------------- menu del titulo
const SIGN_FALLBACK = { x: 160, y: 120, w: 160, h: SIGN_H };
const CREDITS = { w: 300, h: 162, y: 52 };

/** Filas de opciones dentro del cartel (una por cada opcion). */
export function titleOptionRects(sign, count) {
  return rowRects({
    x: sign.x + 7, y: sign.y + ROW_Y - 1, w: sign.w - 14, h: ROW_H, gap: 0, count,
  });
}

export class TitleMenu {
  constructor(scene, assets, game) {
    this.assets = assets;
    this.game = game;
    this.ui = uiCanvas(scene, 40);
    this.view = 'main';
    this.cursor = new Cursor(4);
    this.t = 0;
    this.intro = 0;
    this.options = ['Jugar', 'Minijuego', 'Controles', 'Creditos'];
  }

  setCamera(x, y) { place(this.ui, x, y); }
  show() { this.ui.mesh.visible = true; this.intro = 0; this.draw(); }
  hide() { this.ui.mesh.visible = false; }

  /** Caja del cartel: la manda el fondo exportado (title.json) si existe.
   *  Con cinco opciones crece hacia arriba y conserva el borde de abajo.
   *  A lo ancho crece solo lo justo para que el texto mas ancho respire. */
  signBox() {
    const raw = (this.assets.titleData && this.assets.titleData.sign) || SIGN_FALLBACK;
    const s = { ...raw };
    const need = ROW_Y + this.options.length * ROW_H + 8;
    if (need > s.h) {
      s.y = Math.max(50, s.y + s.h - need);
      s.h = need;
    }
    const glyphs = this.assets.font.glyphs;
    const widest = Math.max(0, ...this.options.map((label) => measureText(glyphs, label, 2)));
    return fitSignWidth(s, widest);
  }

  /** Rects clickeables de las opciones (las mismas que dibuja drawMain). */
  optionRects() {
    return titleOptionRects(this.signBox(), this.options.length);
  }

  /** Caja del prompt Volver de Controles/Creditos (dibujo y click juntos). */
  volverRect(device) {
    const width = promptWidth(this.assets, device, 'back', 'Volver');
    if (this.view === 'credits') {
      return promptBox(Math.round((VIEW_W - width) / 2), CREDITS.y + CREDITS.h - 24, width);
    }
    return promptBox(VIEW_W - width - 30, 236, width);
  }

  /** Accion de la opcion `index`: la comparten el pad, el teclado y el click.
   *  Con partida guardada las opciones son Continuar / Partida nueva / ...;
   *  sin guardado, la primera es Jugar. */
  activate(index) {
    const label = this.options[index];
    if (label === 'Continuar') return 'continue';
    if (label === 'Partida nueva') return 'new';
    if (label === 'Jugar') return 'play';
    if (label === 'Minijuego') return 'arena';
    if (label === 'Controles') {
      this.view = 'controls';
      this.intro = 0;
      return null;
    }
    if (label === 'Creditos') {
      this.view = 'credits';
      this.intro = 0;
      return null;
    }
    return null;
  }

  update(dt, input) {
    this.t += dt;
    this.intro += dt;
    const point = mousePoint(this.game, input);
    const click = clickPoint(this.game, input);
    if (this.view !== 'main') {
      const rect = this.volverRect(input.device);
      const over = pointInRect(point, rect);
      const clicked = pointInRect(click, rect);
      setHand(this.game, over);
      if (input.aPressed || input.bPressed || input.startPressed || clicked) {
        this.view = 'main';
        this.intro = 0;
      }
      this.draw();
      return null;
    }
    const rects = this.optionRects();
    const hoverHit = point ? hitIndex(point, rects) : -1;
    if (hoverHit >= 0) this.cursor.index = hoverHit;
    // El click se ubica con las coordenadas del mousedown (screenToView), no
    // con el ultimo pointermove: un click rapido no depende de haber movido.
    const clickHit = click ? hitIndex(click, rects) : -1;
    setHand(this.game, hoverHit >= 0 || clickHit >= 0);
    let action = null;
    if (click) {
      if (clickHit >= 0) action = this.activate(clickHit);
    } else {
      // Con el mouse sobre el cartel, las teclas mantenidas no roban el hover.
      if (!point) this.cursor.update(dt, input.menuMove || input.move);
      if (input.aPressed || input.startPressed) action = this.activate(this.cursor.index);
    }
    this.draw();
    return action;
  }

  draw() {
    if (!this.ui.mesh.visible) return;
    const { ctx } = this.ui;
    const glyphs = this.assets.font.glyphs;
    const device = this.game.input.device;
    this.ui.clear();
    // fundido de entrada suave: alfa + 3 px de subida, en pasos enteros
    const alpha = easeOut(introAlpha(this.intro, 0.7));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(0, Math.round((1 - alpha) * 4));
    if (this.view === 'main') this.drawMain(ctx, glyphs, device);
    else if (this.view === 'controls') this.drawControls(ctx, glyphs, device);
    else this.drawCredits(ctx, glyphs, device);
    ctx.restore();
    this.ui.commit();
  }

  drawMain(ctx, glyphs, device) {
    // logo 3D en el cielo (imagen 276x63 a escala 1, sin estirar)
    ctx.imageSmoothingEnabled = false;
    const logo = this.assets.titleLogo && this.assets.titleLogo.image;
    if (logo) ctx.drawImage(logo, Math.round((VIEW_W - LOGO_W) / 2), LOGO_Y, LOGO_W, LOGO_H);
    // cartel de madera chico con las cuatro opciones
    const sign = this.signBox();
    woodSign(ctx, sign.x, sign.y, sign.w, sign.h);
    const cx = Math.round(VIEW_W / 2);
    const rects = this.optionRects();
    this.options.forEach((label, i) => {
      const rect = rects[i];
      const selected = i === this.cursor.index;
      const baseY = rect.y + 1;
      const bob = selected ? Math.round(Math.sin(this.t * 3.1) * 1.2) : 0;
      if (selected) selectBar(ctx, rect.x, rect.y + bob, rect.w, ROW_H);
      const w = measureText(glyphs, label, 2);
      drawText(ctx, glyphs, Math.round(cx - w / 2), baseY + bob, label,
        selected ? CREAM : CREAM2, { scale: 2, shadow: selected ? '#5a2e14' : '#4a2a18' });
      if (selected) snowflake(ctx, Math.round(cx - w / 2) - 11, baseY + 3 + bob, 1);
    });
    const hint = promptWidth(this.assets, device, 'interact', 'Elegir');
    drawPrompt(ctx, this.assets, device, 'interact', Math.round((VIEW_W - hint) / 2),
      sign.y + sign.h + 6, this.t, { label: 'Elegir' });
    drawText(ctx, glyphs, 8, VIEW_H - 12, 'Oesterheld - Solano Lopez, 1957', '#cfe6f5',
      { outline: OUT, shadow: '#1b2440' });
  }

  drawControls(ctx, glyphs, device) {
    woodSign(ctx, 10, 10, VIEW_W - 20, VIEW_H - 20, { seams: false });
    ctx.fillStyle = 'rgba(74, 42, 26, 0.45)';
    ctx.fillRect(26, 44, VIEW_W - 52, 1);
    ctx.fillRect(26, 196, VIEW_W - 52, 1);
    const title = 'CONTROLES';
    drawText(ctx, glyphs, Math.round((VIEW_W - measureText(glyphs, title, 2)) / 2), 26,
      title, CREAM, { scale: 2, shadow: '#5a2e14' });
    for (const [header, x] of CONTROLS_HEADERS) {
      drawText(ctx, glyphs, x, CTRL_HEADER_Y, header, CREAM2, { shadow: '#4a2a18' });
    }
    CONTROLS_ROWS.forEach((row, i) => {
      const y = CTRL_ROW_Y + i * CTRL_ROW_STEP;
      drawText(ctx, glyphs, CTRL_LABEL_X, y, row.label, CREAM, { shadow: '#4a2a18' });
      drawGlyphRun(ctx, this.assets, row.mouse, CTRL_MOUSE_X, y);
      drawText(ctx, glyphs, CTRL_MOUSE_LABEL_X, y, row.mouseLabel, CREAM2,
        { shadow: '#4a2a18' });
      drawGlyphRun(ctx, this.assets, row.pad, CTRL_PAD_X, y);
      drawText(ctx, glyphs, CTRL_PAD_LABEL_X, y, row.padLabel, CREAM2,
        { shadow: '#4a2a18' });
    });
    CONTROLS_NOTES.forEach((line, i) => {
      drawText(ctx, glyphs, 46, 202 + i * 12, line, CREAM2, { shadow: '#4a2a18' });
    });
    drawBoxedPrompt(ctx, this.assets, device, 'back', this.volverRect(device), this.t,
      { label: 'Volver' });
  }

  drawCredits(ctx, glyphs, device) {
    const { w, h, y } = CREDITS;
    const x = Math.round((VIEW_W - w) / 2);
    woodSign(ctx, x, y, w, h, { seams: false });
    ctx.fillStyle = 'rgba(74, 42, 26, 0.45)';
    ctx.fillRect(x + 18, 86, w - 36, 1);
    ctx.fillRect(x + 18, y + h - 30, w - 36, 1);
    const title = 'CREDITOS';
    drawText(ctx, glyphs, Math.round((VIEW_W - measureText(glyphs, title, 2)) / 2), 68,
      title, CREAM, { scale: 2, shadow: '#5a2e14' });
    const lines = [
      'EL ETERNAUTA (1957)',
      'H. G. Oesterheld',
      'F. Solano Lopez',
      '',
      'Demo fan, sin fines de lucro.',
      'Hecha con Three.js + Vite.',
    ];
    lines.forEach((line, i) => {
      const lw = measureText(glyphs, line);
      drawText(ctx, glyphs, Math.round((VIEW_W - lw) / 2), 96 + i * 13, line,
        CREAM2, { shadow: '#4a2a18' });
    });
    drawBoxedPrompt(ctx, this.assets, device, 'back', this.volverRect(device), this.t,
      { label: 'Volver' });
  }
}
