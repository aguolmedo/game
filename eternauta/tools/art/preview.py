"""Genera previews grandes (nearest) de los atlases para revisar a ojo.

Salida:
  /tmp/art_preview_tiles.png    tiles 16x16 x6 con nombres
  /tmp/art_preview_objects.png  objetos x3 con nombres
  /tmp/art_preview_title.png    titulo 480x270 x2

Uso: python3 tools/art/preview.py
"""
import sys
from math import ceil
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
import tiles      # noqa: E402
import objects    # noqa: E402
import titleart   # noqa: E402

BG = (24, 21, 34, 255)
CHK = (34, 30, 48, 255)
INK = (236, 226, 206)
INK2 = (18, 14, 26)


def checker(w, h, s=8):
    img = Image.new('RGBA', (w, h), BG)
    d = ImageDraw.Draw(img)
    for y in range(0, h, s):
        for x in range(0, w, s):
            if (x // s + y // s) % 2:
                d.rectangle([x, y, x + s - 1, y + s - 1], fill=CHK)
    return img, d


def label(d, x, y, txt):
    d.text((x + 1, y + 1), txt, fill=INK2)
    d.text((x, y), txt, fill=INK)


def frame_img(atlas, fr):
    x, y, w, h = fr
    return atlas.img.crop((x, y, x + w, y + h))


def check(name, atlas, frames, expected):
    problems = []
    if len(frames) != expected:
        problems.append(f"{name}: {len(frames)} frames (esperados {expected})")
    for n, (x, y, w, h) in frames.items():
        if x < 0 or y < 0 or x + w > atlas.w or y + h > atlas.h:
            problems.append(f"{name}: {n} fuera del atlas")
        crop = frame_img(atlas, frames[n])
        if crop.getbbox() is None:
            problems.append(f"{name}: {n} vacio")
    return problems


def preview_tiles(scale=6, cols=8):
    atlas, frames = tiles.build()
    names = list(frames)
    cell = 16 * scale + 8
    lab = 12
    W = cols * cell + 8
    rows = ceil(len(names) / cols)
    H = rows * (cell + lab) + 8
    img, d = checker(W, H)
    for i, n in enumerate(names):
        cx = 4 + (i % cols) * cell
        cy = 4 + (i // cols) * (cell + lab)
        im = frame_img(atlas, frames[n]).resize((16 * scale, 16 * scale), Image.NEAREST)
        img.alpha_composite(im, (cx + 4, cy))
        d.rectangle([cx, cy, cx + cell - 2, cy + cell - 2], outline=(58, 52, 74, 255))
        label(d, cx + 2, cy + 16 * scale + 4, n)
    img.convert('RGB').save('/tmp/art_preview_tiles.png')
    return atlas, frames


def preview_objects(scale=3, maxw=1500):
    atlas, frames = objects.build()
    names = list(frames)
    cells = []
    x = y = 6
    rowh = 0
    for n in names:
        w, h = frames[n][2], frames[n][3]
        iw, ih = w * scale, h * scale
        if x + iw + 10 > maxw:
            x, y, rowh = 6, y + rowh + 18, 0
        cells.append((n, x, y))
        x += iw + 14
        rowh = max(rowh, ih)
    W = maxw
    H = y + rowh + 24
    img, d = checker(W, H)
    for n, cx, cy in cells:
        w, h = frames[n][2], frames[n][3]
        im = frame_img(atlas, frames[n]).resize((w * scale, h * scale), Image.NEAREST)
        img.alpha_composite(im, (cx, cy))
        d.rectangle([cx - 1, cy - 1, cx + w * scale, cy + h * scale], outline=(54, 48, 70, 255))
        label(d, cx, cy + h * scale + 3, n)
    img.convert('RGB').save('/tmp/art_preview_objects.png')
    return atlas, frames


def preview_title():
    p = titleart.build()
    img = checker(p.w * 2, p.h * 2)[0]
    img.alpha_composite(p.img.resize((p.w * 2, p.h * 2), Image.NEAREST), (0, 0))
    img.convert('RGB').save('/tmp/art_preview_title.png')


def main():
    ta, tf = preview_tiles()
    oa, of = preview_objects()
    preview_title()
    print(f"tiles: {len(tf)} frames, atlas {ta.w}x{ta.h}")
    print(f"objects: {len(of)} frames, atlas {oa.w}x{oa.h}")
    print(f"title: 480x270")
    probs = check('tiles', ta, tf, 48) + check('objects', oa, of, 62)
    for pr in probs:
        print("PROBLEMA:", pr)
    if not probs:
        print("OK: sin frames vacios ni fuera de rango")


if __name__ == '__main__':
    main()
