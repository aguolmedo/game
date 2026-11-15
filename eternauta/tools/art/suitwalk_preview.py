"""Hojas de contacto del atlas chars2 (caminatas de todos los personajes).

Solo preview: lee public/assets/chars2.png + .json (16x32, 8 columnas,
4 filas en el orden de "dirs") y escribe dos PNG en docs/screens/suitwalk/.
No toca ningun otro archivo.

Uso: python3 tools/art/suitwalk_preview.py
"""
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent.parent
ASSETS = ROOT / 'public' / 'assets'
OUT = ROOT / 'docs' / 'screens' / 'suitwalk'

BG = (42, 34, 54)          # fondo oscuro
SEP = (74, 62, 92)         # linea separadora entre bloques
INK = (226, 216, 196)      # texto
INK_SHADOW = (18, 14, 26)

PAD = 8                    # margen exterior
GUTTER = 6                 # separacion entre celdas
BLOCK_GAP = 16             # separacion entre bloques (con linea en el medio)


def load():
    atlas = Image.open(ASSETS / 'chars2.png').convert('RGBA')
    meta = json.loads((ASSETS / 'chars2.json').read_text(encoding='utf-8'))
    return atlas, meta


def build_sheet(atlas, meta, ids, scale, path, per_row):
    """Una hoja: por cada id, una grilla de filas=direcciones x cols=frames."""
    cw = meta['cell']['w'] * scale
    ch = meta['cell']['h'] * scale
    cols = meta['cols']
    dirs = meta['dirs']

    font = ImageFont.load_default()
    labels = [f'{i} / {d}' for i in ids for d in dirs]
    label_w = max(int(font.getlength(t)) for t in labels) + 6

    block_w = label_w + cols * cw + (cols - 1) * GUTTER
    block_h = len(dirs) * ch + (len(dirs) - 1) * GUTTER
    ncols = min(per_row, len(ids))
    nrows = math.ceil(len(ids) / ncols)

    w = 2 * PAD + ncols * block_w + (ncols - 1) * BLOCK_GAP
    h = 2 * PAD + nrows * block_h + (nrows - 1) * BLOCK_GAP
    img = Image.new('RGB', (w, h), BG)
    draw = ImageDraw.Draw(img)

    # lineas separadoras entre bloques (verticales y horizontales)
    for i in range(1, ncols):
        x = PAD + i * (block_w + BLOCK_GAP) - BLOCK_GAP // 2 - 1
        draw.rectangle([x, PAD - 4, x, h - PAD + 3], fill=SEP)
    for j in range(1, nrows):
        y = PAD + j * (block_h + BLOCK_GAP) - BLOCK_GAP // 2 - 1
        draw.rectangle([PAD - 4, y, w - PAD + 3, y], fill=SEP)

    for n, char_id in enumerate(ids):
        bx = PAD + (n % ncols) * (block_w + BLOCK_GAP)
        by = PAD + (n // ncols) * (block_h + BLOCK_GAP)
        base = meta['blocks'][char_id]
        for r, d in enumerate(dirs):
            ry = by + r * (ch + GUTTER)
            # etiqueta de la fila
            txt = f'{char_id} / {d}'
            ty = ry + ch // 2 - 5
            draw.text((bx + 1, ty + 1), txt, fill=INK_SHADOW, font=font)
            draw.text((bx, ty), txt, fill=INK, font=font)
            for c in range(cols):
                sx = base['x'] + c * meta['cell']['w']
                sy = base['y'] + r * meta['cell']['h']
                cell = atlas.crop((sx, sy, sx + meta['cell']['w'], sy + meta['cell']['h']))
                # x4 / x8 SIEMPRE nearest-neighbour, sin suavizado
                cell = cell.resize((cw, ch), Image.NEAREST)
                px = bx + label_w + c * (cw + GUTTER)
                img.paste(cell, (px, ry), cell)

    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path)
    print(f'{path.relative_to(ROOT)}  {img.size[0]}x{img.size[1]}px  (celdas {cw}x{ch})')
    return img.size


def main():
    atlas, meta = load()
    build_sheet(atlas, meta, meta['ids'], 4, OUT / 'frames_x4.png', per_row=3)
    build_sheet(atlas, meta, ['juan_suit', 'juan_suit_rifle'], 8,
                OUT / 'frames_suit_x8.png', per_row=2)


if __name__ == '__main__':
    main()
