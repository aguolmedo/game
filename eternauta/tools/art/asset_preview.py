"""Hojas de contacto de los assets nuevos, para revisar a ojo.

Uso: python3 tools/art/asset_preview.py
Salida: docs/screens/assets/*.png
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent.parent
ASSETS = ROOT / 'public' / 'assets'
OUT = ROOT / 'docs' / 'screens' / 'assets'
BG = (30, 26, 40, 255)
CHK = (38, 34, 50, 255)
INK = (238, 228, 208)
INK2 = (18, 14, 26)
SNOWBG = (90, 112, 134, 255)


def load(name):
    return Image.open(ASSETS / name).convert('RGBA')


def data(name):
    return json.loads((ASSETS / name).read_text(encoding='utf-8'))


def checker(w, h, s=8, base=BG, alt=CHK):
    img = Image.new('RGBA', (w, h), base)
    d = ImageDraw.Draw(img)
    for y in range(0, h, s):
        for x in range(0, w, s):
            if (x // s + y // s) % 2:
                d.rectangle([x, y, x + s - 1, y + s - 1], fill=alt)
    return img, d


def label(d, x, y, txt):
    d.text((x + 1, y + 1), txt, fill=INK2)
    d.text((x, y), txt, fill=INK)


def frames_sheet(png, js, out, scale=4, maxw=1500, bg=BG, per_row=None):
    """Hoja generica: cada frame del JSON con su nombre."""
    atlas = load(png)
    meta = data(js)
    if 'frames' in meta:
        frames = meta['frames']
    else:
        cw, ch = meta['cell']['w'], meta['cell']['h']
        frames = {n: [b['x'], b['y'], cw, ch] for n, b in meta['blocks'].items()}
    names = list(frames)
    cell_w = max(f[2] for f in frames.values()) * scale + 14
    cell_h = max(f[3] for f in frames.values()) * scale + 24
    cols = per_row or max(1, maxw // cell_w)
    rows = (len(names) + cols - 1) // cols
    img, d = checker(cols * cell_w + 8, rows * cell_h + 8)
    for i, name in enumerate(names):
        x, y, w, h = frames[name]
        cx = 4 + (i % cols) * cell_w
        cy = 4 + (i // cols) * cell_h
        crop = atlas.crop((x, y, x + w, y + h)).resize((w * scale, h * scale), Image.NEAREST)
        img.alpha_composite(crop, (cx + (cell_w - w * scale) // 2, cy + 2))
        d.text((cx + 2, cy + cell_h - 16), name[:34], fill=INK)
        d.rectangle([cx, cy, cx + cell_w - 3, cy + cell_h - 3], outline=(58, 52, 74, 255))
    img.convert('RGB').save(OUT / out)
    print(f"{out:<24} {img.width}x{img.height}  {len(names)} frames")


def chars_sheet(scale=6):
    atlas = load('chars2.png')
    meta = data('chars2.json')
    ids = meta['ids']
    dirs = meta['dirs']
    bw = meta['cell']['w'] * meta['cols']
    bh = meta['cell']['h'] * meta['rows']
    per = 3
    groups = [ids[i:i + per] for i in range(0, len(ids), per)]
    row_w = per * bw * scale + 24
    img, d = checker(row_w + 16, len(groups) * (bh * scale + 30) + 12)
    for gi, group in enumerate(groups):
        for ci, name in enumerate(group):
            bx = meta['blocks'][name]['x']
            block = atlas.crop((bx, 0, bx + bw, bh)).resize((bw * scale, bh * scale), Image.NEAREST)
            ox = 12 + ci * bw * scale
            oy = 12 + gi * (bh * scale + 30)
            img.alpha_composite(block, (ox, oy))
            label(d, ox + 4, oy + 2, name)
            for r, dr in enumerate(dirs):
                d.line([ox, oy + r * meta['cell']['h'] * scale, ox + bw * scale,
                        oy + r * meta['cell']['h'] * scale], fill=(70, 60, 92, 255))
                d.text((ox + 2, oy + r * meta['cell']['h'] * scale + 2), dr, fill=(150, 220, 240))
        d.line([10, oy, row_w + 6, oy], fill=(70, 60, 92, 255))
    img.convert('RGB').save(OUT / 'chars2_x6.png')
    print(f"{'chars2_x6.png':<24} {img.width}x{img.height}  {len(ids)} personajes")


def cascarudos_sheet(scale=6):
    atlas = load('cascarudos.png')
    frames = data('cascarudos.json')['frames']
    kinds = ['cascarudo', 'veloz', 'acorazado']
    dirs = ['down', 'up', 'left', 'right']
    cw = 28 * scale + 16
    ch = 22 * scale + 24
    rows = len(kinds) * (len(dirs) + 1)
    img, d = checker(8 * cw + 16, rows * ch + 12, base=SNOWBG, alt=(98, 120, 142, 255))
    row = 0
    for kind in kinds:
        for dr in dirs + ['extras']:
            names = ([f'{kind}:{dr}:{k}' for k in range(4)] if dr != 'extras'
                     else [f'{kind}:hit'] + [f'{kind}:death:{k}' for k in range(3)])
            for i, name in enumerate(names):
                x, y, w, h = frames[name]
                crop = atlas.crop((x, y, x + w, y + h)).resize((w * scale, h * scale), Image.NEAREST)
                cx = 8 + i * cw
                cy = 6 + row * ch
                img.alpha_composite(crop, (cx + (cw - w * scale) // 2, cy + 2))
                d.text((cx + 2, cy + ch - 15), name, fill=INK)
            d.text((8, 6 + row * ch + ch - 15), dr, fill=(240, 220, 150))
            row += 1
    img.convert('RGB').save(OUT / 'cascarudos_x6.png')
    print(f"{'cascarudos_x6.png':<24} {img.width}x{img.height}  {len(frames)} cuadros")


def views_sheet():
    pano = load('views/attic_pan.png')
    dark = load('views/attic_pan_dark.png')
    living = load('views/living.png')
    img = Image.new('RGBA', (968, 300 * 2 + 270 + 46), BG)
    d = ImageDraw.Draw(img)
    img.alpha_composite(pano, (4, 18))
    label(d, 6, 2, 'views/attic_pan.png  960x300')
    img.alpha_composite(dark, (4, 18 + 300 + 16))
    label(d, 6, 300 + 20, 'views/attic_pan_dark.png (apagon)')
    img.alpha_composite(living, (4, 18 + 600 + 32))
    label(d, 6, 600 + 36, 'views/living.png  480x270')
    img.convert('RGB').save(OUT / 'views_preview.png')
    print(f"{'views_preview.png':<24} {img.width}x{img.height}")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    chars_sheet()
    cascarudos_sheet()
    frames_sheet('props.png', 'props.json', 'props_x4.png', scale=4, maxw=1500)
    frames_sheet('interior2.png', 'interior2.json', 'interior2_x3.png', scale=3, maxw=1500)
    frames_sheet('street2.png', 'street2.json', 'street2_x2.png', scale=2, maxw=1500)
    frames_sheet('houses.png', 'houses.json', 'houses_x2.png', scale=2, maxw=1500)
    frames_sheet('fx.png', 'fx.json', 'fx_x8.png', scale=8, maxw=1500)
    frames_sheet('portraits_dlg.png', 'portraits_dlg.json', 'portraits_dlg_x2.png',
                 scale=2, maxw=1500)
    frames_sheet('portraits_panel.png', 'portraits_panel.json', 'portraits_panel_x4.png',
                 scale=4, maxw=1500)
    views_sheet()


if __name__ == '__main__':
    main()
