"""Retratos CALCADOS del comic: lineas de tinta del dibujo original + relleno
plano de pixel art (luz y sombra), sin el rayado ni el ruido de un filtro."""
import os, sys
from collections import deque
from PIL import Image, ImageOps, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'tools', 'art')); sys.path.insert(0, HERE)
import portraits as pt
from pixel import hx

OUT = os.path.join(HERE, 'out')
N = 64
INK = (34, 22, 30)
RAMP = {   # (sombra, base, luz)
    'skin': ((176, 104, 84), (232, 168, 132), (248, 208, 176)),
    'hair_brown': ((58, 38, 28), (110, 74, 50), (150, 108, 74)),
    'hair_dark': ((28, 22, 28), (52, 42, 50), (84, 70, 78)),
    'hair_white': ((150, 150, 164), (210, 210, 218), (240, 240, 246)),
    'hair_blonde': ((168, 124, 64), (216, 176, 110), (242, 214, 152)),
    'cloth_cream': ((150, 140, 118), (206, 198, 174), (236, 230, 212)),
    'cloth_dark': ((34, 34, 46), (58, 57, 70), (88, 88, 108)),
    'glass': ((40, 60, 80), (90, 120, 150), (190, 220, 232)),
}
PANEL = (42, 34, 54)


def trace(name, size=N):
    page, box = pt.FACES[name]
    src = Image.open(os.path.join(pt.COMIC, page)).crop(box)
    g = ImageOps.grayscale(src)
    g = ImageOps.autocontrast(g, cutoff=1)
    smooth = g.filter(ImageFilter.MedianFilter(5)).filter(ImageFilter.GaussianBlur(1.2))  # mata el rayado
    small = smooth.resize((size, size), Image.LANCZOS)
    ink_src = g.filter(ImageFilter.MinFilter(3)).resize((size, size), Image.LANCZOS)        # lineas fuertes
    sp, ip = small.load(), ink_src.load()
    z = pt.ZONES.get(name)
    fx, fy, rx, ry = z['face']
    out = Image.new('RGB', (size, size)); op = out.load()
    for y in range(size):
        for x in range(size):
            v = sp[x, y]
            inside = ((x - fx) / rx) ** 2 + ((y - fy) / ry) ** 2 <= 1
            if inside or name == 'traje':
                ramp = 'skin'
            elif y >= z['cloth_y']:
                ramp = z['cloth']
            else:
                ramp = z['hair'] if z['hair'] != 'skin' else 'skin'
            sh, base, lt = RAMP[ramp]
            if ip[x, y] < 60:
                c = INK
            elif v < 95:
                c = sh
            elif v < 185:
                c = base
            else:
                c = lt
            op[x, y] = c
    # fondo de papel -> panel (flood desde el borde, solo zonas claras fuera de la cara)
    seen = set(); dq = deque([(x, 0) for x in range(size)] + [(0, y) for y in range(size)] + [(size - 1, y) for y in range(size)])
    while dq:
        x, y = dq.popleft()
        if (x, y) in seen or not (0 <= x < size and 0 <= y < size) or y >= z['cloth_y']:
            continue
        if sp[x, y] < 185 or ((x - fx) / rx) ** 2 + ((y - fy) / ry) ** 2 <= 1.1:
            continue
        seen.add((x, y)); op[x, y] = PANEL
        dq.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    # limpieza: pixeles sueltos toman el color mayoritario de sus vecinos
    for _ in range(2):
        cp = out.copy(); cpp = cp.load()
        for y in range(1, size - 1):
            for x in range(1, size - 1):
                c = cpp[x, y]
                nb = [cpp[x + dx, y + dy] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))]
                if c not in nb:
                    op[x, y] = max(set(nb), key=nb.count)
    return out


if __name__ == '__main__':
    names = ['juan', 'favalli', 'polsky', 'lucas', 'elena', 'martita', 'traje']
    S = 5
    sheet = Image.new('RGB', (len(names) * (N * S + 10) + 10, N * S + 20), (18, 22, 44))
    for i, n in enumerate(names):
        im = trace(n)
        im.save(os.path.join(OUT, f'trace_{n}.png'))
        sheet.paste(im.resize((N * S, N * S), Image.NEAREST), (10 + i * (N * S + 10), 10))
    sheet.save(os.path.join(OUT, 'trace_x5.png'))
    print('ok')
