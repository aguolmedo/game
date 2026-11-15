"""Retratos calcados a mano sobre la vineta (64x64): cada forma esta ubicada
con la grilla sobre el primer plano del comic y dibujada limpia encima."""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')
sys.path.insert(0, os.path.join(ROOT, 'tools', 'art'))
from pixel import Pix, hx, mix  # noqa: E402

OUT = os.path.join(HERE, 'out')
N = 64
SK = [hx('#4a2426'), hx('#8e5244'), hx('#c07a62'), hx('#e2a886'), hx('#f6cdaa')]


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


def line(p, pts, c, w=1):
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        n = max(abs(x1 - x0), abs(y1 - y0), 1)
        for k in range(n + 1):
            x = round(x0 + (x1 - x0) * k / n); y = round(y0 + (y1 - y0) * k / n)
            for t in range(w):
                p.set(x, y + t, c)


def recolor_if(p, region_pts, frm, to):
    tmp = Pix(N, N); poly(tmp, region_pts, (255, 0, 255))
    for y in range(N):
        for x in range(N):
            if tmp.get(x, y)[3] and p.get(x, y)[:3] in frm:
                p.set(x, y, to)


def juan():
    """Juan Salvo, pag. 033 (primer plano, 3/4, luz desde la izquierda)."""
    p = Pix(N, N)
    H = [hx('#1a100c'), hx('#33211a'), hx('#523624'), hx('#765034'), hx('#9a704c')]
    DARK = [hx('#14141e'), hx('#22232e'), hx('#363848')]
    JK = [hx('#9a927c'), hx('#cfc6ae'), hx('#e8e1cc')]
    # ropa: polera oscura de cuello alto, campera clara abierta a la izquierda
    poly(p, [(14, 64), (20, 55), (32, 56), (44, 51), (56, 50), (64, 55), (64, 64)], DARK[1])
    line(p, [(20, 55), (32, 56), (44, 51), (56, 50)], DARK[2])
    poly(p, [(0, 64), (0, 52), (10, 54), (18, 64)], JK[1]); line(p, [(0, 53), (10, 55), (17, 63)], JK[2])
    # cuello (en sombra bajo la mandibula)
    poly(p, [(22, 56), (24, 50), (44, 46), (46, 52), (40, 56)], SK[1])
    # cara: forma en 3/4 tomada de la vineta
    face = [(9, 16), (13, 9), (24, 6), (38, 6), (47, 10), (50, 20), (50, 34), (48, 42), (44, 50),
            (36, 57), (27, 59), (20, 56), (14, 49), (11, 41), (9, 31)]
    poly(p, face, SK[3])
    # luz y sombra por planos
    recolor_if(p, [(38, 20), (51, 20), (51, 44), (44, 52), (36, 58), (34, 48), (39, 40)], (SK[3],), SK[2])   # lado derecho
    recolor_if(p, [(43, 24), (51, 24), (50, 40), (46, 47), (43, 40)], (SK[2], SK[3]), SK[1])
    recolor_if(p, [(12, 18), (22, 14), (34, 15), (30, 22), (14, 24)], (SK[3],), SK[4])                    # frente con luz
    recolor_if(p, [(11, 34), (17, 34), (17, 44), (12, 42)], (SK[3],), SK[4])                               # pomulo izq
    recolor_if(p, [(20, 54), (28, 56), (36, 54), (28, 59)], (SK[3], SK[2]), SK[2])                          # bajo el menton
    # oreja (derecha)
    poly(p, [(49, 26), (53, 25), (55, 30), (54, 40), (50, 46), (48, 40)], SK[2])
    line(p, [(52, 29), (53, 34), (51, 40)], SK[0]); line(p, [(50, 28), (51, 33)], SK[1])
    # pelo peinado hacia atras, con mechones hacia arriba-derecha
    poly(p, [(6, 32), (5, 16), (9, 6), (18, 1), (32, 0), (46, 2), (55, 9), (56, 24), (52, 25),
             (49, 16), (42, 13), (31, 14), (21, 16), (13, 20), (10, 32)], H[2])
    poly(p, [(7, 22), (9, 10), (15, 4), (22, 2), (17, 9), (11, 16)], H[3])
    poly(p, [(22, 4), (32, 1), (40, 2), (33, 6), (25, 8)], H[3])
    for x0, y0, x1, y1 in ((14, 18, 22, 3), (20, 16, 30, 2), (27, 14, 38, 2), (34, 13, 46, 4),
                           (41, 13, 51, 8), (46, 15, 54, 14)):
        line(p, [(x0, y0), (x1, y1)], H[1])
    for x0, y0, x1, y1 in ((12, 14, 18, 5), (24, 10, 31, 3)):
        line(p, [(x0, y0), (x1, y1)], H[4])
    poly(p, [(5, 18), (8, 18), (10, 34), (7, 34)], H[1])                 # costado izquierdo en sombra
    poly(p, [(48, 16), (53, 15), (54, 25), (50, 26)], H[1])             # sobre la oreja
    # cejas gruesas y marcadas (pag. 033)
    poly(p, [(10, 26), (14, 24), (21, 24), (21, 26), (14, 27)], H[0])
    poly(p, [(25, 26), (30, 24), (37, 23), (38, 25), (30, 27)], H[0])
    line(p, [(11, 28), (20, 28)], SK[2]); line(p, [(25, 28), (36, 27)], SK[1])   # sombra bajo la ceja
    # ojos entrecerrados: parpado pesado, blanco chico, iris oscuro
    for (x0, y0, w, ix) in ((11, 29, 9, 15), (26, 29, 10, 31)):
        line(p, [(x0, y0), (x0 + w - 1, y0)], H[0], w=2)
        line(p, [(x0 + 1, y0 + 2), (x0 + w - 2, y0 + 2)], hx('#ece4da'))
        p.rect(ix, y0 + 2, 3, 2, hx('#3a4250')); p.set(ix, y0 + 2, hx('#ffffff'))
        line(p, [(x0 + 1, y0 + 4), (x0 + w - 2, y0 + 4)], SK[1])
    # nariz: dorso con luz, sombra del lado izquierdo (la luz viene de la izquierda pero la nariz tapa)
    line(p, [(23, 31), (23, 40)], SK[4])
    poly(p, [(18, 34), (21, 33), (21, 41), (17, 43)], SK[2])
    poly(p, [(17, 41), (21, 40), (27, 41), (27, 44), (20, 45), (16, 44)], SK[3])     # punta
    line(p, [(18, 44), (26, 44)], SK[1]); p.set(19, 43, SK[0]); p.set(25, 43, SK[0])   # fosas
    line(p, [(21, 41), (24, 41)], SK[4])
    # surcos y boca (leve sonrisa de costado)
    line(p, [(27, 43), (31, 46), (33, 50)], SK[1])
    line(p, [(16, 46), (14, 49)], SK[2])
    line(p, [(15, 49), (19, 50), (26, 50), (31, 48)], SK[0])
    line(p, [(17, 48), (28, 48)], SK[2])                                 # labio superior
    line(p, [(18, 51), (27, 51)], SK[4]); line(p, [(19, 52), (26, 52)], SK[2])
    line(p, [(21, 56), (30, 57)], SK[2])                                 # menton duro
    line(p, [(36, 57), (44, 50)], SK[1])                                 # linea de mandibula
    p.outline(0.6, 0.3)
    return p


def compare(name, fn, page, box):
    from PIL import Image
    ref = Image.open(os.path.join(ROOT, 'ref', 'comic', page)).crop(box).convert('RGBA').resize((384, 384))
    im = fn().img
    o = Image.new('RGBA', (384 * 2 + 30, 404), (34, 30, 52, 255))
    o.alpha_composite(ref, (10, 10)); o.alpha_composite(im.resize((384, 384), Image.NEAREST), (404, 10))
    o.save(os.path.join(OUT, f'hand_{name}_compare.png'))
    im.save(os.path.join(OUT, f'hand_{name}.png'))


if __name__ == '__main__':
    compare('juan', juan, 'p033.jpg', (805, 295, 1005, 495))
    print('ok')


# ---------------------------------------------------------------- calco literal de las lineas
def rotoscope(page, box, zones, size=N, ink_t=0.38, shade_t=0.12, gray_t=125):
    """Cada pixel del retrato = cuanta tinta hay en esa celda de la vineta.
    zones: lista de (poligono en coords 64, (sombra, base)) de atras hacia adelante."""
    from PIL import Image, ImageOps
    src = Image.open(os.path.join(ROOT, 'ref', 'comic', page)).crop(box)
    g = ImageOps.autocontrast(ImageOps.grayscale(src), cutoff=1).resize((size * 10, size * 10), Image.LANCZOS)
    gp = g.load()
    zone = Pix(size, size)
    for k, (pts, _) in enumerate(zones):
        poly(zone, pts, (k + 1, 0, 0))
    out = Pix(size, size)
    INKC = hx('#20161e')
    for y in range(size):
        for x in range(size):
            zc = zone.get(x, y)
            if not zc[3]:
                continue
            sh, base = zones[zc[0] - 1][1]
            ink = sum(1 for yy in range(y * 10, y * 10 + 10) for xx in range(x * 10, x * 10 + 10) if gp[xx, yy] < gray_t) / 100
            out.set(x, y, INKC if ink > ink_t else (sh if ink > shade_t else base))
    # limpieza de pixeles sueltos (no toca las lineas largas)
    for y in range(1, size - 1):
        for x in range(1, size - 1):
            c = out.get(x, y)
            if not c[3]:
                continue
            nb = [out.get(x + dx, y + dy)[:3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))]
            if c[:3] not in nb and c[:3] != INKC:
                out.set(x, y, max(set(nb), key=nb.count))
    return out


def juan_roto():
    SKIN = (hx('#c4806a'), hx('#ecb894'))
    HAIR = (hx('#6a4a34'), hx('#a07a58'))
    DARKC = (hx('#1a1a24'), hx('#2c2e3c'))
    JACK = (hx('#a49c84'), hx('#e2dac4'))
    face = [(9, 16), (13, 9), (24, 6), (38, 6), (47, 10), (50, 20), (50, 34), (48, 42), (44, 50),
            (36, 57), (27, 59), (20, 56), (14, 49), (11, 41), (8, 31)]
    hair = [(4, 34), (4, 14), (9, 4), (18, 0), (34, 0), (48, 1), (57, 9), (58, 26), (52, 26),
            (49, 16), (42, 13), (31, 14), (21, 16), (13, 20), (10, 34)]
    ear = [(48, 24), (54, 22), (57, 30), (56, 42), (51, 48), (47, 42)]
    neck = [(18, 64), (20, 52), (46, 44), (50, 56), (44, 64)]
    turtle = [(14, 64), (24, 56), (36, 56), (46, 50), (58, 48), (64, 52), (64, 64)]
    jacket = [(0, 64), (0, 50), (10, 52), (20, 64)]
    zones = [(neck, SKIN), (face, SKIN), (ear, SKIN), (hair, HAIR), (turtle, DARKC), (jacket, JACK)]
    p = rotoscope('p033.jpg', (805, 295, 1005, 495), zones)
    p.outline(0.6, 0.3)
    return p


def juan_roto96():
    s = 1.5
    sc = lambda pts: [(x * s, y * s) for x, y in pts]
    SKIN = (hx('#c4806a'), hx('#ecb894'))
    HAIR = (hx('#6a4a34'), hx('#a07a58'))
    DARKC = (hx('#1a1a24'), hx('#2c2e3c'))
    JACK = (hx('#a49c84'), hx('#e2dac4'))
    face = [(9, 16), (13, 9), (24, 6), (38, 6), (47, 10), (50, 20), (50, 34), (48, 42), (44, 50),
            (36, 57), (27, 59), (20, 56), (14, 49), (11, 41), (8, 31)]
    hair = [(4, 34), (4, 14), (9, 4), (18, 0), (34, 0), (48, 1), (57, 9), (58, 26), (52, 26),
            (49, 16), (42, 13), (31, 14), (21, 16), (13, 20), (10, 34)]
    ear = [(48, 24), (54, 22), (57, 30), (56, 42), (51, 48), (47, 42)]
    neck = [(18, 64), (20, 52), (46, 44), (50, 56), (44, 64)]
    turtle = [(14, 64), (24, 56), (36, 56), (46, 50), (58, 48), (64, 52), (64, 64)]
    jacket = [(0, 64), (0, 50), (10, 52), (20, 64)]
    zones = [(sc(neck), SKIN), (sc(face), SKIN), (sc(ear), SKIN), (sc(hair), HAIR), (sc(turtle), DARKC), (sc(jacket), JACK)]
    p = rotoscope('p033.jpg', (805, 295, 1005, 495), zones, size=96, ink_t=0.26, shade_t=0.09)
    p.outline(0.6, 0.3)
    return p
