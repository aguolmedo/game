"""Menú inicial (diseño, no toca el juego). Pedido 18/11: "es muy croto, que diga solo
ETERNAUTA, un pixel art lindo de las letras".
  - Logo dibujado a mano (no la letra 5x7 agrandada): letras de 20x32, bloque recto
    tipo título de historieta de los 50; relleno de hielo (blanco arriba -> celeste
    abajo), contorno oscuro, sombra, nieve acumulada sobre cada letra y un halo cian
    tenue (la nevada fosforescente).
  - Menú sin cartel de madera: la letra fina del juego (escala 1) sobre el cielo.
    Elegida: crema con el copo a la izquierda. Resto: celeste apagado.
  - La nevada nueva (nieve.py) de fondo.
Salida: out/titulo_logo_x4.png, out/titulo.png, out/titulo.gif, out/titulo_compare.png
"""
import json
import math
import os
import random

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
A = os.path.join(ROOT, 'public', 'assets')
OUT = os.path.join(HERE, 'out')

# Letras en grilla 10x16 (se dibujan a x2 = 20x32 y se les agrega detalle a 1x).
N_ = []
for y in range(16):
    r = ['.'] * 10
    for x in (0, 1, 2, 7, 8, 9):
        r[x] = '#'
    c = 3 + y // 4
    for x in (c, c + 1):
        if 3 <= x <= 6:
            r[x] = '#'
    N_.append(''.join(r))
L = {
    'E': ['##########', '##########'] + ['###.......'] * 4 + ['#######...'] * 2 + ['###.......'] * 6 + ['##########'] * 2,
    'T': ['##########', '##########'] + ['...####...'] * 14,
    'R': ['#########.', '##########'] + ['###....###'] * 4 + ['##########', '#########.', '###..###..', '###...###.'] + ['###....###'] * 6,
    'N': N_,
    'A': ['.########.', '##########'] + ['###....###'] * 5 + ['##########'] * 2 + ['###....###'] * 7,
    'U': ['###....###'] * 13 + ['####..####', '.########.', '..######..'],
}
WORD = 'ETERNAUTA'

INK = (11, 12, 29)
SHADOW = (27, 36, 64)
ICE = [(200, 226, 238), (159, 191, 212), (120, 150, 176), (90, 118, 150), (62, 86, 116)]   # hielo: celeste -> acero (la nieve de arriba se recorta)
SNOW = (255, 255, 255)
GLOW = (150, 225, 240)


def logo():
    lw, lh, gap = 20, 32, 4
    W = len(WORD) * lw + (len(WORD) - 1) * gap
    mask = Image.new('L', (W, lh), 0)
    m = mask.load()
    for i, ch in enumerate(WORD):
        ox = i * (lw + gap)
        for y, row in enumerate(L[ch]):
            for x, c in enumerate(row):
                if c == '#':
                    for dy in range(2):
                        for dx in range(2):
                            m[ox + x * 2 + dx, y * 2 + dy] = 255
    pad = 8
    out = Image.new('RGBA', (W + pad * 2, lh + pad * 2), (0, 0, 0, 0))
    px = out.load()

    def on(x, y):
        return 0 <= x < W and 0 <= y < lh and m[x, y]
    # halo cian tenue (2 px, tramado) — la nieve que brilla
    for y in range(-pad, lh + pad):
        for x in range(-pad, W + pad):
            if on(x, y):
                continue
            d = min((abs(dx) + abs(dy) for dx in range(-3, 4) for dy in range(-3, 4) if on(x + dx, y + dy)), default=99)
            if d == 3 and (x + y) % 2 == 0:
                px[x + pad, y + pad] = GLOW + (90,)
            elif d == 2:
                px[x + pad, y + pad] = GLOW + (70,)
    # sombra (2 px abajo-derecha) y contorno
    for y in range(lh):
        for x in range(W):
            if on(x, y):
                for dx, dy in ((2, 2), (1, 2), (2, 1)):
                    if not on(x + dx, y + dy):
                        px[x + dx + pad, y + dy + pad] = SHADOW + (255,)
    for y in range(-1, lh + 1):
        for x in range(-1, W + 1):
            if on(x, y):
                continue
            if any(on(x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1)):
                px[x + pad, y + pad] = INK + (255,)
    # relleno de hielo por bandas + luz arriba/izquierda de cada trazo
    for y in range(lh):
        band = ICE[min(4, y * 5 // lh)]
        for x in range(W):
            if not on(x, y):
                continue
            c = band
            if not on(x - 1, y) or not on(x, y - 1):
                c = ICE[0] if y < lh // 2 else ICE[1]
            if not on(x + 1, y) and y > 4:
                c = ICE[min(4, y * 5 // lh + 1)]
            px[x + pad, y + pad] = c + (255,)
    # nieve acumulada sobre cada borde de arriba (1-2 px) con alguna gota que cae
    rnd = random.Random(7)
    for x in range(W):
        for y in range(lh):
            if on(x, y) and not on(x, y - 1):
                px[x + pad, y + pad - 1] = SNOW + (255,)
                px[x + pad, y + pad] = SNOW + (255,)                 # 2 px de nieve
                if rnd.random() < 0.5:
                    px[x + pad, y + pad - 2] = SNOW + (255,)
                    if not on(x, y - 3):
                        px[x + pad, y + pad - 3] = INK + (255,) if not on(x - 1, y) else px[x + pad, y + pad - 3]
                if rnd.random() < 0.14 and on(x, y + 3):
                    px[x + pad, y + pad + 1] = SNOW + (255,)         # gota que chorrea
                    px[x + pad, y + pad + 2] = (238, 250, 255, 255)
                break
    return out


def font():
    d = json.load(open(os.path.join(A, 'font.json')))
    return d['glyphs']


def text(im, glyphs, x, y, s, color, shadow=None):
    px = im.load()
    cx = x
    for ch in s:
        g = glyphs.get(ch) or glyphs.get(ch.upper()) or glyphs[' ']
        for j, row in enumerate(g):
            for i, c in enumerate(row):
                if c == '#':
                    if shadow:
                        px[cx + i + 1, y + j + 1] = shadow
                    px[cx + i, y + j] = color
        cx += len(g[0]) + 1
    return cx - x - 1


def width(glyphs, s):
    return sum(len((glyphs.get(c) or glyphs.get(c.upper()) or glyphs[' '])[0]) + 1 for c in s) - 1


def scene():
    sky = Image.open(os.path.join(A, 'title_sky.png')).convert('RGBA')
    fg = Image.open(os.path.join(A, 'title.png')).convert('RGBA')
    sky.alpha_composite(fg)
    ox, oy = (sky.width - 480) // 2, (sky.height - 270) // 2
    return sky.crop((ox, oy, ox + 480, oy + 270))


OPTIONS = ['Jugar', 'Minijuego', 'Controles', 'Créditos']
CREAM = (255, 240, 200)
DIM = (159, 191, 212)
FLAKE = [(1, 0), (0, 1), (1, 1), (2, 1), (1, 2)]


def frame(base, lg, glyphs, t, sel=0, flakes=None):
    im = base.copy()
    # el logo respira apenas (el halo, no las letras)
    im.alpha_composite(lg, ((480 - lg.width) // 2, 26))
    y0 = 112
    # panel nocturno chico (en lugar del cartel de madera)
    pw, ph = 104, len(OPTIONS) * 14 + 12
    px0, py0 = (480 - pw) // 2, y0 - 7
    panel = Image.new('RGBA', (pw, ph), (11, 12, 29, 190))
    pp = panel.load()
    for x in range(pw):
        pp[x, 0] = pp[x, ph - 1] = (46, 60, 90, 255)
    for y in range(ph):
        pp[0, y] = pp[pw - 1, y] = (46, 60, 90, 255)
    for (cx_, cy_) in ((0, 0), (pw - 1, 0), (0, ph - 1), (pw - 1, ph - 1)):
        pp[cx_, cy_] = (0, 0, 0, 0)
    im.alpha_composite(panel, (px0, py0))
    for i, o in enumerate(OPTIONS):
        w = width(glyphs, o)
        x = (480 - w) // 2
        y = y0 + i * 14
        if i == sel:
            text(im, glyphs, x, y, o, CREAM + (255,), (27, 36, 64, 255))
            bob = round(math.sin(t * 3.1))
            for dx, dy in FLAKE:
                im.putpixel((x - 9 + dx, y + 2 + dy + bob), (255, 255, 255, 255))
        else:
            text(im, glyphs, x, y, o, DIM + (255,), (11, 12, 29, 255))
    text(im, glyphs, 8, 258, 'Oesterheld - Solano Lopez, 1957', (159, 191, 212, 255), (11, 12, 29, 255))
    if flakes:
        import nieve as N
        rgb = im.convert('RGB')
        rgb = N.draw_night(rgb, flakes, t)
        im = rgb.convert('RGBA')
    return im


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    lg = logo()
    lg.resize((lg.width * 4, lg.height * 4), Image.NEAREST).save(os.path.join(OUT, 'titulo_logo_x4.png'))
    glyphs = font()
    base = scene()
    import nieve as N
    flakes = N.make_flakes(5, [('back', 70, 8, 16), ('mid', 30, 18, 30), ('front', 8, 40, 60)])
    rnd = random.Random(4)
    for f in flakes:
        f['blink'] = rnd.uniform(0.9, 2.2)
    frames = [frame(base, lg, glyphs, i * 0.08, flakes=flakes).resize((1440, 810), Image.NEAREST).convert('RGB') for i in range(40)]
    frames[0].save(os.path.join(OUT, 'titulo.gif'), save_all=True, append_images=frames[1:], duration=80, loop=0)
    frames[6].save(os.path.join(OUT, 'titulo.png'))
    hoy = Image.open(os.path.join(ROOT, 'art', 'direccion', 'doc', 'capturas', 'menu_titulo.png')).convert('RGB').resize((960, 540), Image.NEAREST)
    cmp_ = Image.new('RGB', (960 * 2 + 20, 540), (17, 14, 20))
    cmp_.paste(hoy, (0, 0))
    cmp_.paste(frames[6].resize((960, 540), Image.NEAREST), (980, 0))
    cmp_.save(os.path.join(OUT, 'titulo_compare.png'))
    print('ok', lg.size)


# ====================================================================== v2 (18/11)
# "nono el menú de madera me gustaba": el cartel de madera con las opciones queda
# como está; solo cambia el título (EL ETERNAUTA + La nevada -> logo ETERNAUTA).
def frame_wood(cap, sky, lg, t, flakes):
    im = cap.copy()
    im.paste(sky.crop((0, 0, 480, 100)), (0, 0))            # se va el título viejo
    im = im.convert('RGBA')
    im.alpha_composite(lg, ((480 - lg.width) // 2, 22))
    import nieve as N
    return N.draw_night(im.convert('RGB'), flakes, t)


if __name__ == '__main__':
    cap = Image.open(os.path.join(ROOT, 'art', 'direccion', 'doc', 'capturas', 'menu_titulo.png')).convert('RGB').resize((480, 270), Image.NEAREST)
    sky = scene().convert('RGB')
    lg = logo()
    import nieve as N
    fl = N.make_flakes(5, [('back', 70, 8, 16), ('mid', 30, 18, 30), ('front', 8, 40, 60)])
    rnd = random.Random(4)
    for f in fl:
        f['blink'] = rnd.uniform(0.9, 2.2)
    frs = [frame_wood(cap, sky, lg, i * 0.08, fl).resize((1440, 810), Image.NEAREST) for i in range(40)]
    frs[0].save(os.path.join(OUT, 'titulo.gif'), save_all=True, append_images=frs[1:], duration=80, loop=0)
    frs[6].save(os.path.join(OUT, 'titulo.png'))
    cmp_ = Image.new('RGB', (960 * 2 + 20, 540), (17, 14, 20))
    cmp_.paste(cap.resize((960, 540), Image.NEAREST), (0, 0))
    cmp_.paste(frs[6].resize((960, 540), Image.NEAREST), (980, 0))
    cmp_.save(os.path.join(OUT, 'titulo_compare.png'))
    lg.resize((lg.width * 4, lg.height * 4), Image.NEAREST).save(os.path.join(OUT, 'titulo_logo_x4.png'))
    print('ok v2 madera')


# ====================================================================== v3 (18/11): 3D
# Pedido: "letras con 3D tipo DOOM, pero no tan copiado". Se toma el VOLUMEN
# (extrusión + bisel), no la forma de sus letras ni sus texturas:
#   - extrusión de 7 px hacia abajo (monumento visto desde abajo), canto de acero
#     azulado que se oscurece hacia el fondo, con contorno;
#   - cara frontal con bisel de 2 px (luz arriba-izq, sombra abajo-der) y relleno de
#     HIELO: bandas frías + escarcha tramada + alguna grieta;
#   - nieve acumulada sobre cada letra;
#   - letras propias en grilla 12x18 (x2 = 24x36), más altas y pesadas.
L3 = {
    'E': ['############', '############', '############'] + ['####........'] * 4 + ['#########...'] * 3 + ['####........'] * 5 + ['############'] * 3,
    'T': ['############'] * 3 + ['....####....'] * 15,
    'R': ['###########.', '############', '############'] + ['####....####'] * 4 + ['############', '###########.', '####.####...', '####..####..', '####...####.'] + ['####....####'] * 4,
    'A': ['..########..', '.##########.', '############'] + ['####....####'] * 5 + ['############'] * 3 + ['####....####'] * 7,
    'U': ['####....####'] * 15 + ['############', '.##########.', '..########..'],
}
_n = []
for y in range(18):
    r = ['.'] * 12
    for x in (0, 1, 2, 3, 8, 9, 10, 11):
        r[x] = '#'
    c = 4 + (y * 4) // 18
    for x in (c - 1, c, c + 1):
        if 4 <= x <= 7:
            r[x] = '#'
    _n.append(''.join(r))
L3['N'] = _n

STEEL = [(110, 140, 170), (82, 108, 140), (60, 80, 110), (44, 58, 84), (30, 40, 62), (22, 28, 46)]
ICE3 = [(232, 246, 252), (200, 226, 238), (168, 204, 222), (140, 178, 204), (112, 150, 182)]
BEV_HI, BEV_LO = (255, 255, 255), (70, 96, 128)


def logo3d():
    lw, lh, gap, depth = 24, 36, 5, 7
    W = len(WORD) * lw + (len(WORD) - 1) * gap
    mask = Image.new('L', (W, lh), 0)
    m = mask.load()
    for i, ch in enumerate(WORD):
        ox = i * (lw + gap)
        for y, row in enumerate(L3[ch]):
            for x, c in enumerate(row):
                if c == '#':
                    for dy in range(2):
                        for dx in range(2):
                            m[ox + x * 2 + dx, y * 2 + dy] = 255
    pad = 10
    out = Image.new('RGBA', (W + pad * 2, lh + depth + pad * 2), (0, 0, 0, 0))
    px = out.load()

    def on(x, y):
        return 0 <= x < W and 0 <= y < lh and m[x, y]

    # 1) halo cian tenue (fosforescencia)
    for y in range(-pad, lh + depth + pad):
        for x in range(-pad, W + pad):
            near = any(on(x + dx, y + dy - k) for k in range(0, depth + 1, 2) for dx, dy in ((0, 3), (3, 0), (0, -3), (-3, 0)))
            if near and not any(on(x, y - k) for k in range(depth + 1)) and (x + y) % 2 == 0:
                px[x + pad, y + pad] = GLOW + (70,)
    # 2) extrusión hacia abajo (de atrás hacia adelante)
    for k in range(depth, 0, -1):
        # canto macizo en 3 tonos: borde con luz, cuerpo, fondo en sombra
        col = STEEL[1] if k == 1 else (STEEL[5] if k == depth else STEEL[3])
        for y in range(lh):
            for x in range(W):
                if on(x, y):
                    px[x + pad, y + pad + k] = col + (255,)
    # contorno de la extrusión
    for y in range(-1, lh + depth + 1):
        for x in range(-1, W + 1):
            filled = any(on(x, y - k) for k in range(depth + 1))
            if filled:
                continue
            if any(any(on(x + dx, y + dy - k) for k in range(depth + 1)) for dx in (-1, 0, 1) for dy in (-1, 0, 1)):
                px[x + pad, y + pad] = INK + (255,)
    # aristas verticales del canto (sombra en los costados)
    for y in range(lh):
        for x in range(W):
            if on(x, y) and not on(x + 1, y):
                for k in range(1, depth + 1):
                    px[x + pad, y + pad + k] = STEEL[-1] + (255,)
    # 3) cara frontal: hielo con bisel de 2 px
    rnd = random.Random(11)
    cracks = set()
    for i in range(len(WORD)):                       # una grieta corta por letra
        ox = i * (lw + gap) + rnd.randint(6, 16)
        y = rnd.randint(8, 20)
        for s in range(rnd.randint(5, 9)):
            cracks.add((ox, y))
            ox += rnd.choice((-1, 0, 1))
            y += 1
    for y in range(lh):
        for x in range(W):
            if not on(x, y):
                continue
            band = ICE3[min(4, 1 + y * 4 // lh)]
            c = band
            # escarcha tramada arriba
            if y < lh // 4 and BAYER2[y % 4][x % 4] < 4 - y // 3:
                c = ICE3[0]
            if (x, y) in cracks:
                c = BEV_LO
            # bisel: 2 px desde el borde
            dl = 0 if not on(x - 1, y) else (1 if not on(x - 2, y) else 9)
            du = 0 if not on(x, y - 1) else (1 if not on(x, y - 2) else 9)
            dr = 0 if not on(x + 1, y) else (1 if not on(x + 2, y) else 9)
            dd = 0 if not on(x, y + 1) else (1 if not on(x, y + 2) else 9)
            if min(dl, du) == 0:
                c = BEV_HI
            elif min(dl, du) == 1:
                c = ICE3[0]
            if min(dr, dd) == 0:
                c = BEV_LO
            elif min(dr, dd) == 1 and c not in (BEV_HI,):
                c = ICE3[4]
            px[x + pad, y + pad] = c + (255,)
    # 4) nieve acumulada arriba
    for x in range(W):
        for y in range(lh):
            if on(x, y) and not on(x, y - 1):
                px[x + pad, y + pad - 1] = SNOW + (255,)
                if rnd.random() < 0.55:
                    px[x + pad, y + pad - 2] = SNOW + (255,)
                    if rnd.random() < 0.3:
                        px[x + pad, y + pad - 3] = (238, 250, 255, 255)
                break
    return out


BAYER2 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]

if __name__ == '__main__':
    lg3 = logo3d()
    lg3.save(os.path.join(OUT, 'titulo3d_logo.png'))
    lg3.resize((lg3.width * 4, lg3.height * 4), Image.NEAREST).save(os.path.join(OUT, 'titulo3d_logo_x4.png'))
    cap = Image.open(os.path.join(ROOT, 'art', 'direccion', 'doc', 'capturas', 'menu_titulo.png')).convert('RGB').resize((480, 270), Image.NEAREST)
    sky = scene().convert('RGB')
    import nieve as N
    fl = N.make_flakes(5, [('back', 70, 8, 16), ('mid', 30, 18, 30), ('front', 8, 40, 60)])
    rnd = random.Random(4)
    for f in fl:
        f['blink'] = rnd.uniform(0.9, 2.2)
    frs = [frame_wood(cap, sky, lg3, i * 0.08, fl).resize((1440, 810), Image.NEAREST) for i in range(40)]
    frs[0].save(os.path.join(OUT, 'titulo3d.gif'), save_all=True, append_images=frs[1:], duration=80, loop=0)
    frs[6].save(os.path.join(OUT, 'titulo3d.png'))
    print('ok 3d', lg3.size)
