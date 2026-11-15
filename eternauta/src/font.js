// Dibuja la fuente pixel 5x7 exportada desde bocetos/eternauta/scripts/lib.py.

function glyph(glyphs, ch) {
  return glyphs[ch] || glyphs[' '];
}

export function measureText(glyphs, text, scale = 1, spacing = 1) {
  let width = 0;
  for (const ch of text) {
    const g = glyph(glyphs, ch);
    width += (g[0].length + spacing) * scale;
  }
  return Math.max(0, width - spacing * scale);
}

export function textPoints(glyphs, text, scale = 1, spacing = 1) {
  const points = [];
  let x = 0;
  for (const ch of text) {
    const g = glyph(glyphs, ch);
    for (let j = 0; j < g.length; j++) {
      for (let i = 0; i < g[j].length; i++) {
        if (g[j][i] !== '#') continue;
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            points.push([x + i * scale + sx, j * scale + sy]);
          }
        }
      }
    }
    x += (g[0].length + spacing) * scale;
  }
  return points;
}

export function drawText(ctx, glyphs, x, y, text, color, opts = {}) {
  const { scale = 1, spacing = 1, shadow = null, outline = null } = opts;
  const points = textPoints(glyphs, text, scale, spacing);
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

export function drawCentered(ctx, glyphs, text, y, color, opts = {}) {
  const scale = opts.scale || 1;
  const spacing = opts.spacing || 1;
  const x = Math.round((ctx.canvas.width - measureText(glyphs, text, scale, spacing)) / 2);
  drawText(ctx, glyphs, x, y, text, color, opts);
}

/** Corta un texto en líneas que entren en maxWidth (por palabras). */
export function wrapText(glyphs, text, maxWidth, scale = 1, spacing = 1) {
  const words = String(text).split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && measureText(glyphs, next, scale, spacing) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}
