// Cache de font.js: mismos píxeles que el camino viejo, pero sin miles de fillRect.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  measureText, textPoints, drawText, drawCentered, wrapText,
} from '../../src/font.js';

// Fuente mínima: 2x2, con espacio para el fallback de glifo.
const GLYPHS = {
  A: ['##', '#.', '#.'],
  B: ['.##', '##.', '.#.'],
  ' ': ['..', '..'],
};

function fakeCtx() {
  return {
    canvas: { width: 480, height: 270 },
    fillStyle: '',
    calls: [],
    fillRect(x, y, w, h) { this.calls.push([x, y, w, h, this.fillStyle]); },
  };
}

// Implementación vieja (Set de strings) para comparar píxel a píxel.
function oldDraw(ctx, glyphs, x, y, text, color, { scale = 1, spacing = 1, shadow, outline } = {}) {
  const points = [];
  let cx = 0;
  for (const ch of text) {
    const g = glyphs[ch] || glyphs[' '];
    for (let j = 0; j < g.length; j++) {
      for (let i = 0; i < g[j].length; i++) {
        if (g[j][i] !== '#') continue;
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            points.push([cx + i * scale + sx, j * scale + sy]);
          }
        }
      }
    }
    cx += (g[0].length + spacing) * scale;
  }
  if (outline) {
    const set = new Set(points.map(([px, py]) => `${px},${py}`));
    ctx.fillStyle = outline;
    for (const [px, py] of points) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        if (!set.has(`${px + dx},${py + dy}`)) ctx.fillRect(x + px + dx, y + py + dy, 1, 1);
      }
    }
  }
  if (shadow) {
    ctx.fillStyle = shadow;
    for (const [px, py] of points) ctx.fillRect(x + px + 1, y + py + 1, 1, 1);
  }
  ctx.fillStyle = color;
  for (const [px, py] of points) ctx.fillRect(x + px, y + py, 1, 1);
}

// El camino viejo repite fillRect en los bordes compartidos; lo que importa es
// el conjunto de píxeles pintados (mismo color) y no cuántas veces se pinta.
function rectSet(ctx) {
  return [...new Set(ctx.calls.map((call) => call.join(',')))].sort();
}

test('measureText no cambió', () => {
  assert.equal(measureText(GLYPHS, 'AB'), 2 + 1 + 3);
  assert.equal(measureText(GLYPHS, 'AB', 2, 2), (2 + 2) * 2 + (3 + 2) * 2 - 2 * 2);
  assert.equal(measureText(GLYPHS, ''), 0);
});

test('textPoints se cachea y devuelve los mismos puntos', () => {
  const a = textPoints(GLYPHS, 'AB');
  const b = textPoints(GLYPHS, 'AB');
  assert.equal(a, b, 'debería devolver el array cacheado');
  assert.deepEqual(a, [[0, 0], [1, 0], [0, 1], [0, 2],
    [4, 0], [5, 0], [3, 1], [4, 1], [4, 2]]);
  // Otra fuente con el mismo texto no puede reusar los puntos.
  const other = { A: ['##'], ' ': ['..'] };
  assert.deepEqual(textPoints(other, 'A'), [[0, 0], [1, 0]]);
});

test('drawText (sin DOM) es píxel-idéntico al camino viejo', () => {
  const opts = { scale: 2, outline: '#101018', shadow: '#202030' };
  const got = fakeCtx();
  const want = fakeCtx();
  drawText(got, GLYPHS, 7, 9, 'ABA', '#ffcc66', opts);
  oldDraw(want, GLYPHS, 7, 9, 'ABA', '#ffcc66', opts);
  assert.deepEqual(rectSet(got), rectSet(want));
});

test('drawText (sin DOM) con destino fraccionario también coincide', () => {
  const got = fakeCtx();
  const want = fakeCtx();
  drawText(got, GLYPHS, 3.5, 4, 'AB', '#fff', { outline: '#000' });
  oldDraw(want, GLYPHS, 3.5, 4, 'AB', '#fff', { outline: '#000' });
  assert.deepEqual(rectSet(got), rectSet(want));
});

test('muchos textos distintos no rompen el cache (tope y clear)', () => {
  for (let i = 0; i < 450; i++) {
    const ctx = fakeCtx();
    drawText(ctx, GLYPHS, 0, 0, `A${i % 7}`, '#fff');
    assert.ok(ctx.calls.length > 0);
  }
});

test('con DOM falso: un solo drawImage y cache por texto/color', () => {
  const canvases = [];
  function fakeCanvas() {
    const calls = [];
    const c = {
      width: 0,
      height: 0,
      fillStyle: '',
      imageSmoothingEnabled: true,
      calls,
      getContext() { return this; },
      fillRect(x, y, w, h) { calls.push([x, y, w, h, this.fillStyle]); },
    };
    canvases.push(c);
    return c;
  }
  const dest = fakeCtx();
  dest.images = [];
  dest.drawImage = (...args) => dest.images.push(args);

  globalThis.document = { createElement: () => fakeCanvas() };
  try {
    const g = { ...GLYPHS };
    drawText(dest, g, 10, 12, 'AB', '#ffcf6e', { outline: '#1a1426' });
    assert.equal(dest.calls.length, 0, 'no debería usar fillRect en el destino');
    assert.equal(dest.images.length, 1);
    const [bitmap, dx, dy] = dest.images[0];
    assert.equal(dx, 9);
    assert.equal(dy, 11);
    assert.ok(bitmap.width >= measureText(g, 'AB') + 2);

    // El bitmap contiene exactamente los píxeles viejos corridos 1,1.
    const want = fakeCtx();
    oldDraw(want, g, 1, 1, 'AB', '#ffcf6e', { outline: '#1a1426' });
    assert.deepEqual(rectSet(bitmap), rectSet(want));

    // Cache: mismo canvas para el mismo pedido.
    drawText(dest, g, 40, 50, 'AB', '#ffcf6e', { outline: '#1a1426' });
    assert.equal(dest.images.length, 2);
    assert.equal(dest.images[1][0], bitmap, 'debería reusar el canvas cacheado');

    // Otro color => otra entrada.
    drawText(dest, g, 10, 12, 'AB', '#ffffff', { outline: '#1a1426' });
    assert.notEqual(dest.images[2][0], bitmap);
  } finally {
    delete globalThis.document;
  }
});

test('drawCentered y wrapText siguen andando', () => {
  const ctx = fakeCtx();
  drawCentered(ctx, GLYPHS, 'AB', 5, '#fff');
  assert.ok(ctx.calls.length > 0);
  assert.deepEqual(wrapText(GLYPHS, 'AB AB AB', 13), ['AB AB', 'AB']);
});
