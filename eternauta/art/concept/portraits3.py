"""Retratos estilo Stardew (64x64) reconocibles del comic.

Cabeza grande que ocupa casi todo el cuadro, ojos grandes con iris de color,
parpado grueso y brillo; pelo en mechones con luz; sombreado por planos
(luz desde arriba a la izquierda); rubor; contorno oscuro de color.
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'tools', 'art'))
from pixel import Pix, hx, mix  # noqa: E402

OUT = os.path.join(HERE, 'out')
N = 64
SK = [hx('#5a2e2a'), hx('#9a5a48'), hx('#c8826a'), hx('#eab08c'), hx('#fad2b0')]
WHITE = hx('#f4f0ea'); LASH = hx('#2a1820'); SHINE = hx('#ffffff')


def poly(p, pts, c):
    ys = [y for _, y in pts]
    for y in range(int(min(ys)), int(max(ys)) + 1):
        xs = []
        for i in range(len(pts)):
            (x1, y1), (x2, y2) = pts[i], pts[(i + 1) % len(pts)]
            if (y1 <= y < y2) or (y2 <= y < y1):
                xs.append(x1 + (y - y1) * (x2 - x1) / (y2 - y1))
        xs.sort()
        for a, b in zip(xs[::2], xs[1::2]):
            p.hline(round(a), round(b), y, c)


def head(p, top, chin, half, jaw_w, chin_w, cx=32):
    pts = []
    for k in range(0, 181, 10):                                    # craneo
        a = math.radians(180 + k)
        pts.append((cx + half * math.cos(a), top + half * 0.95 + half * 0.95 * math.sin(a)))
    pts += [(cx + half, top + half * 1.6), (cx + jaw_w, chin - 5), (cx + chin_w, chin),
            (cx - chin_w, chin), (cx - jaw_w, chin - 5), (cx - half, top + half * 1.6)]
    poly(p, pts, SK[3])
    # planos: lado derecho en sombra, frente con luz, mejilla izquierda con luz
    for y in range(top, chin + 1):
        for x in range(cx - half, cx + half + 1):
            if p.get(x, y)[:3] != SK[3]:
                continue
            if x >= cx + half * 0.42:
                p.set(x, y, SK[2])
            if x >= cx + half * 0.75:
                p.set(x, y, SK[1])
            if x < cx - 2 and top + 4 < y < top + 13:
                p.set(x, y, SK[4])
    for y in range(chin - 4, chin + 1):                            # sombra bajo el menton
        for x in range(cx - chin_w - 2, cx + chin_w + 3):
            if p.get(x, y)[:3] in (SK[3], SK[4]):
                p.set(x, y, SK[2])


def neck(p, y0, y1, w=7, cx=32):
    p.rect(cx - w, y0, 2 * w + 1, y1 - y0, SK[2])
    p.rect(cx - w, y0, 2 * w + 1, 3, SK[1])                       # sombra de la cara sobre el cuello
    p.rect(cx - w, y0 + 3, 3, y1 - y0 - 3, SK[3])


def ears(p, y, h, half, cx=32):
    for side in (-1, 1):
        x = cx - half - 3 if side < 0 else cx + half
        p.rect(x, y, 4, h, SK[3] if side < 0 else SK[2])
        p.vline(x + (2 if side < 0 else 1), y + 2, y + h - 3, SK[1])


def eye(p, x, y, iris, w=7):
    """Ojo grande: parpado grueso, blanco, iris 3x3 con pupila y brillo."""
    p.hline(x, x + w - 1, y, LASH); p.hline(x + 1, x + w - 2, y - 1, LASH)
    p.rect(x, y + 1, w, 3, WHITE)
    ix = x + w // 2 - 1
    p.rect(ix, y + 1, 3, 3, iris); p.set(ix + 1, y + 2, LASH)
    p.set(ix, y + 1, SHINE); p.set(ix + 1, y + 1, SHINE)
    p.hline(x + 1, x + w - 2, y + 4, SK[1])
    p.set(x - 1, y, LASH)


def brow(p, x, y, w, c, thick=3, tilt=0):
    for k in range(w):
        yy = y + round(tilt * k / max(1, w - 1))
        for t in range(thick - (1 if k in (0, w - 1) else 0)):
            p.set(x + k, yy + t, c)


def nose(p, y0, y1, cx=32, wide=2):
    p.vline(cx - 1, y0 + 2, y1 - 2, SK[4])                         # dorso con luz
    poly(p, [(cx + 1, y0 + 2), (cx + 3, y1 - 1), (cx + 1, y1)], SK[1])   # sombra del lado derecho
    p.hline(cx - wide - 1, cx + wide + 1, y1 + 1, SK[1])
    p.set(cx - wide, y1, SK[0]); p.set(cx + wide + 1, y1, SK[0])     # fosas
    p.set(cx - 1, y1 - 1, SK[4])


def mouth(p, y, w, cx=32):
    p.hline(cx - w, cx + w, y, SK[0])
    p.hline(cx - w + 1, cx + w - 1, y + 1, hx('#b86a5e'))
    p.hline(cx - w + 2, cx + w - 2, y + 2, SK[4])
    p.set(cx - w - 1, y - 1, SK[1]); p.set(cx + w + 1, y - 1, SK[1])


def blush(p, y, cx=32, dx=12):
    for x0 in (cx - dx - 2, cx + dx - 1):
        for k in range(3):
            c = p.get(x0 + k, y)
            p.set(x0 + k, y, mix(c[:3], hx('#e86a6a'), 0.35))


def clumps(p, base, lights, darks):
    """Pelo: forma base + mechones con luz + separaciones oscuras."""
    poly(p, base[0], base[1])
    for pts, c in lights:
        poly(p, pts, c)
    for (x0, y0, x1, y1), c in darks:
        n = max(abs(x1 - x0), abs(y1 - y0), 1)
        for k in range(n + 1):
            p.set(round(x0 + (x1 - x0) * k / n), round(y0 + (y1 - y0) * k / n), c)


def torso(p, main, light, dark, y=50):
    poly(p, [(0, N), (4, y + 3), (18, y - 1), (46, y - 1), (60, y + 3), (64, N)], main)
    poly(p, [(2, N), (6, y + 4), (18, y), (22, N)], light)
    poly(p, [(44, N), (46, y), (58, y + 4), (62, N)], dark)


# ---------------------------------------------------------------- Juan
def juan():
    p = Pix(N, N)
    torso(p, hx('#d6cdb4'), hx('#eee7d2'), hx('#a49c84'))          # campera clara
    poly(p, [(22, 49), (42, 49), (38, 56), (26, 56)], hx('#262a38'))   # polera oscura
    p.hline(24, 40, 50, hx('#3a4050'))
    p.vline(32, 56, N - 1, hx('#8a8270')); p.set(32, 56, hx('#d0d4dc')); p.set(32, 57, hx('#9aa0aa'))
    for x in (12, 50):
        p.vline(x, 54, N - 1, hx('#a49c84'))                       # costuras
    neck(p, 42, 51)
    ears(p, 26, 10, 16)
    head(p, top=8, chin=47, half=15, jaw_w=14, chin_w=9)           # mandibula cuadrada, menton duro
    H = [hx('#1e140e'), hx('#3a2618'), hx('#5c3e28'), hx('#84603e'), hx('#a8805a')]
    clumps(p, ([(17, 20), (17, 12), (21, 5), (30, 1), (40, 3), (46, 8), (47, 18), (45, 13), (38, 11), (28, 11), (21, 14)], H[2]),
           [([(20, 11), (24, 4), (31, 2), (36, 4), (29, 7), (23, 11)], H[3]),          # jopo peinado hacia atras
            ([(25, 5), (31, 3), (34, 4), (29, 6)], H[4]),
            ([(38, 5), (44, 8), (46, 14), (41, 10)], H[3])],
           [((24, 5, 20, 15), H[0]), ((31, 3, 35, 10), H[1]), ((37, 5, 43, 13), H[1])])
    p.rect(17, 18, 2, 8, H[1]); p.rect(46, 18, 2, 8, H[0])           # patillas cortas
    brow(p, 19, 22, 10, H[0], thick=3, tilt=0)                     # cejas marcadas, rectas
    brow(p, 35, 22, 10, H[0], thick=3, tilt=0)
    p.hline(19, 28, 26, SK[2]); p.hline(36, 45, 26, SK[1])          # sombra bajo la ceja
    eye(p, 20, 27, hx('#5a6a7a')); eye(p, 37, 27, hx('#5a6a7a'))
    nose(p, 28, 37)
    mouth(p, 41, 5)
    p.hline(21, 43, 46, SK[1])                                     # linea de mandibula
    for k in range(5):                                            # pomulos marcados
        p.set(20 + k // 2, 35 + k, SK[2]); p.set(44 - k // 2, 35 + k, SK[1])
    p.outline(0.62, 0.32)
    return p


# ---------------------------------------------------------------- Favalli
def favalli():
    p = Pix(N, N)
    C = hx('#d8cfb6'); CL = hx('#eee8d4'); CD = hx('#a69e86'); ST = hx('#3a3440')
    torso(p, C, CL, CD, y=52)
    for y in (56, 60):                                             # franjas del sweater
        for x in range(N):
            if p.get(x, y)[:3] in (C, CL, CD):
                p.set(x, y, ST); p.set(x, y + 1, ST)
    p.rect(20, 46, 25, 8, C)                                       # cuello alto acanalado
    for x in range(20, 45, 2):
        p.vline(x, 46, 53, CD)
    p.hline(20, 44, 46, CL)
    ears(p, 26, 11, 18)
    head(p, top=10, chin=47, half=18, jaw_w=16, chin_w=11)          # cara ancha y pesada
    H = [hx('#0c080c'), hx('#1e161c'), hx('#32262e'), hx('#4e3e48'), hx('#6e5a66')]
    clumps(p, ([(13, 22), (12, 12), (17, 4), (27, 0), (38, 0), (48, 4), (53, 12), (52, 22), (48, 14), (40, 11), (24, 11), (16, 14)], H[2]),
           [([(15, 13), (18, 6), (24, 3), (23, 8), (19, 12)], H[3]),               # ondas gruesas en S
            ([(26, 5), (31, 1), (37, 2), (33, 7), (28, 9)], H[3]),
            ([(40, 4), (46, 5), (50, 11), (45, 10), (41, 8)], H[3]),
            ([(19, 6), (23, 4), (21, 8)], H[4]), ([(31, 2), (35, 2), (32, 5)], H[4]), ([(44, 5), (47, 7), (45, 8)], H[4])],
           [((24, 3, 22, 12), H[0]), ((33, 2, 30, 11), H[0]), ((41, 4, 44, 12), H[0]), ((17, 8, 14, 18), H[1])])
    brow(p, 18, 19, 10, H[0], thick=3, tilt=1); brow(p, 36, 19, 10, H[0], thick=3, tilt=-1)   # cejas separadas del marco
    # anteojos de marco negro grueso (su firma)
    G = hx('#0a080c'); LENS = hx('#b8d0da')
    for x0 in (15, 34):
        p.rect(x0 + 2, 26, 11, 9, LENS)
        for t in range(3):
            p.frame(x0 + t, 25 + t, 15 - 2 * t, 11 - 2 * t, G)
        p.hline(x0 + 3, x0 + 6, 28, SHINE); p.set(x0 + 3, 29, SHINE)
    eye(p, 19, 28, hx('#4a3a2a'), w=7); eye(p, 38, 28, hx('#4a3a2a'), w=7)
    for x0 in (15, 34):                                            # el marco tapa el borde de los ojos
        for t in range(3):
            p.frame(x0 + t, 25 + t, 15 - 2 * t, 11 - 2 * t, G)
    p.rect(29, 28, 6, 2, G)                                        # puente
    p.rect(11, 28, 4, 2, G); p.rect(49, 28, 4, 2, G)               # patillas
    nose(p, 32, 39, wide=3)
    poly(p, [(22, 43), (26, 40), (38, 40), (42, 43), (38, 45), (26, 45)], H[1])   # bigote tupido
    p.hline(26, 38, 41, H[3]); p.hline(27, 37, 42, H[2])
    p.hline(27, 37, 46, SK[1]); p.hline(28, 36, 47, SK[3])          # labio inferior
    p.outline(0.62, 0.32)
    return p


ALL = {'juan': juan, 'favalli': favalli}


def build():
    from PIL import Image
    os.makedirs(OUT, exist_ok=True)
    S = 6
    sheet = Image.new('RGBA', (len(ALL) * (N * S + 16) + 16, N * S + 32), (34, 30, 52, 255))
    for i, (n, fn) in enumerate(ALL.items()):
        im = fn().img
        im.save(os.path.join(OUT, f'p3_{n}.png'))
        sheet.alpha_composite(im.resize((N * S, N * S), Image.NEAREST), (16 + i * (N * S + 16), 16))
    sheet.save(os.path.join(OUT, 'portraits3_x6.png'))


if __name__ == '__main__':
    build()
    print('ok')
