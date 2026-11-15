"""Retratos de dialogo dibujados a mano (48x48), fieles al comic.

Nada de filtros sobre la vineta: cada rasgo esta puesto a proposito, con la
tecnica de los retratos de Stardew: formas limpias, contorno de color, 4-5
tonos de piel con luz desde arriba a la izquierda, ojos con blanco, iris y
brillo, pelo en mechones.
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'tools', 'art'))
from pixel import Pix, hx, mix  # noqa: E402

OUT = os.path.join(HERE, 'out')
N = 48
SKIN = [hx('#6e3a34'), hx('#a8664e'), hx('#d0906c'), hx('#eab48e'), hx('#f8d4b0')]   # oscuro..luz
OLDSKIN = [hx('#6a3c38'), hx('#a06a58'), hx('#c8927a'), hx('#e2b49a'), hx('#f2d0b8')]
EYE_W = hx('#f2ece4'); IRIS = hx('#2a2030'); IRIS2 = hx('#4a3a3a'); SHINE = hx('#ffffff')
LIP = hx('#9a4a4a'); LIP2 = hx('#c0605e')
BG = hx('#2a2236')


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


def line(p, x0, y0, x1, y1, c):
    n = max(abs(x1 - x0), abs(y1 - y0), 1)
    for k in range(n + 1):
        p.set(round(x0 + (x1 - x0) * k / n), round(y0 + (y1 - y0) * k / n), c)


# ---------------------------------------------------------------- cara
def face(p, S, top=8, chin=37, half=11, jaw=8, chin_w=4, cx=24):
    """Cabeza: ovalo arriba, mandibula abajo. jaw = ancho a la altura de la boca,
    chin_w = medio ancho del menton (grande = cuadrado)."""
    for y in range(top, chin + 1):
        t = (y - top) / (chin - top)
        if t < 0.55:
            w = half * math.sqrt(max(0, 1 - ((0.55 - t) / 0.55) ** 2 * 0.85))
        else:
            k = (t - 0.55) / 0.45
            w = half + (chin_w - half) * k ** 1.6
            w = max(w, chin_w)
        p.hline(round(cx - w), round(cx + w), y, S[2])
    # luz y sombra: frente y mejilla izquierda con luz; lado derecho en sombra
    for y in range(top, chin + 1):
        for x in range(cx - half - 1, cx + half + 2):
            if p.get(x, y)[:3] != S[2]:
                continue
            if x > cx + half * 0.45 and y > top + 4:
                p.set(x, y, S[1])
            elif x < cx - 2 and top + 2 < y < top + 9:
                p.set(x, y, S[3])
    for y in range(chin - 2, chin + 1):                        # sombra bajo el menton
        for x in range(cx - chin_w, cx + chin_w + 1):
            if p.get(x, y)[:3] in (S[2], S[3]):
                p.set(x, y, S[1])


def neck(p, S, y0=34, y1=42, w=5, cx=24):
    p.rect(cx - w, y0, 2 * w + 1, y1 - y0, S[1])
    p.rect(cx - w, y0, 2, y1 - y0, S[2])


def ear(p, S, side, y=20, h=8, cx=24, half=11):
    x = cx - half - 2 if side < 0 else cx + half
    p.rect(x, y, 3, h, S[1] if side > 0 else S[2])
    p.vline(x + (1 if side < 0 else 1), y + 2, y + h - 3, S[0])


def eye(p, x, y, deep=False, lashes=False, look=0):
    """Ojo de 5x3: parpado oscuro arriba, blanco, iris 2x2 con brillo."""
    if deep:
        p.hline(x - 1, x + 5, y - 1, SKIN[0])
    p.hline(x, x + 4, y, IRIS)                                    # parpado superior
    p.rect(x, y + 1, 5, 2, EYE_W)
    ix = x + 1 + look
    p.rect(ix, y + 1, 2, 2, IRIS2); p.set(ix + 1, y + 2, IRIS)
    p.set(ix, y + 1, SHINE)
    p.hline(x + 1, x + 3, y + 3, SKIN[1])                          # parpado inferior
    if lashes:
        p.set(x - 1, y, IRIS); p.set(x + 5, y, IRIS)


def brow(p, x, y, w, c, thick=2, slope=0):
    for k in range(w):
        yy = y + round(slope * k / max(1, w - 1))
        for t in range(thick):
            p.set(x + k, yy + t, c)


def nose(p, S, cx=24, y0=21, y1=28, big=False):
    p.vline(cx - 1, y0 + 1, y1 - 1, S[3])                          # dorso con luz
    p.vline(cx + 1, y0 + 2, y1, S[1])                              # lado en sombra
    if big:
        p.rect(cx - 2, y1 - 2, 5, 3, S[2]); p.hline(cx - 1, cx, y1 - 2, S[4]); p.vline(cx + 2, y1 - 2, y1, S[1])
    p.set(cx - 2, y1 + 1, S[0]); p.set(cx + 2, y1 + 1, S[0])     # fosas
    p.hline(cx - 1, cx + 1, y1 + 1, S[1])


def mouth(p, S, cx=24, y=31, w=4, lips=False):
    p.hline(cx - w, cx + w, y, LIP if lips else S[0])
    p.hline(cx - w + 1, cx + w - 1, y + 1, LIP2 if lips else S[3])
    p.set(cx - w - 1, y - 1, S[1]); p.set(cx + w + 1, y - 1, S[1])


def shoulders(p, main, light, dark, y=40):
    poly(p, [(2, N), (6, y + 2), (16, y - 1), (32, y - 1), (42, y + 2), (46, N)], main)
    poly(p, [(4, N), (8, y + 3), (16, y), (18, N)], light)
    poly(p, [(34, N), (32, y), (40, y + 3), (44, N)], dark)


# ---------------------------------------------------------------- personajes
def juan():
    p = Pix(N, N); p.rect(0, 0, N, N, BG)
    S = SKIN
    shoulders(p, hx('#cfc6ae'), hx('#e8e1cc'), hx('#9a927c'))     # campera clara
    poly(p, [(17, 39), (31, 39), (28, 44), (20, 44)], hx('#2b2f3e'))   # polera oscura
    p.vline(24, 44, N - 1, hx('#8a8270')); p.set(24, 44, hx('#c4c8d0'))   # cierre
    neck(p, S, y0=33, y1=40)
    face(p, S, top=8, chin=36, half=11, chin_w=8)                  # mandibula cuadrada
    ear(p, S, -1); ear(p, S, 1)
    H = [hx('#24180f'), hx('#3e2a1c'), hx('#5e4230'), hx('#7e5a40')]
    poly(p, [(12, 18), (12, 10), (16, 5), (24, 3), (32, 5), (36, 10), (36, 18), (34, 12), (24, 9), (16, 12)], H[1])
    poly(p, [(14, 12), (17, 6), (24, 4), (22, 9), (17, 12)], H[3])  # luz del peinado
    line(p, 18, 6, 15, 12, H[0]); line(p, 27, 5, 31, 10, H[0])     # raya y mechones
    line(p, 22, 5, 20, 10, H[2])
    brow(p, 15, 17, 6, H[0], thick=2, slope=0); brow(p, 27, 17, 6, H[0], thick=2, slope=0)
    eye(p, 15, 19); eye(p, 28, 19)
    nose(p, S, y0=20, y1=27)
    mouth(p, S, y=31, w=4)
    p.hline(17, 31, 35, S[1])                                     # linea de mandibula
    p.outline(0.55, 0.25)
    return p


def favalli():
    p = Pix(N, N); p.rect(0, 0, N, N, BG)
    S = SKIN
    shoulders(p, hx('#d8cfb6'), hx('#eee8d4'), hx('#a69e86'))
    for y in (43, 46):                                            # dos franjas del sweater
        for x in range(2, 46):
            if p.get(x, y)[:3] in (hx('#d8cfb6'), hx('#eee8d4'), hx('#a69e86')):
                p.set(x, y, hx('#3a3440'))
    p.rect(16, 36, 17, 5, hx('#d8cfb6'))                           # cuello alto acanalado
    for x in range(16, 33, 2):
        p.vline(x, 36, 40, hx('#a69e86'))
    face(p, S, top=9, chin=36, half=13, chin_w=8)                  # cara ancha
    ear(p, S, -1, half=13); ear(p, S, 1, half=13)
    H = [hx('#100c10'), hx('#221a20'), hx('#3a2e34'), hx('#5a4a50')]
    poly(p, [(10, 20), (10, 9), (14, 4), (22, 1), (30, 2), (36, 6), (39, 12), (38, 20), (35, 12), (24, 10), (13, 13)], H[1])
    for k, x in enumerate(range(13, 37, 5)):                       # ondas
        line(p, x, 3 + k % 2, x + 3, 8 + k % 2, H[3]); line(p, x + 1, 5, x + 3, 9, H[0])
    brow(p, 13, 16, 8, H[0], thick=3); brow(p, 27, 16, 8, H[0], thick=3)
    # anteojos de marco negro grueso
    G = hx('#0e0c12')
    for x0 in (12, 26):
        p.rect(x0 + 1, 19, 9, 7, hx('#a9c4cf'))
        for t in range(2):
            p.frame(x0 + t, 18 + t, 11 - 2 * t, 9 - 2 * t, G)
        p.rect(x0 + 4, 21, 2, 2, IRIS); p.set(x0 + 4, 21, SHINE)
        p.hline(x0 + 2, x0 + 4, 20, SHINE)
    p.hline(22, 26, 20, G); p.hline(22, 26, 21, G)
    p.set(11, 21, G); p.set(10, 21, G); p.set(37, 21, G); p.set(38, 21, G)
    nose(p, S, y0=24, y1=29)
    poly(p, [(16, 31), (20, 29), (28, 29), (32, 31), (29, 32), (19, 32)], H[1])   # bigote tupido
    p.hline(19, 29, 30, H[2])
    p.hline(20, 28, 34, S[0]); p.hline(21, 27, 35, S[3])
    p.outline(0.55, 0.25)
    return p


def lucas():
    p = Pix(N, N); p.rect(0, 0, N, N, BG)
    S = OLDSKIN
    shoulders(p, hx('#bdb6a2'), hx('#dcd6c4'), hx('#8f8a7a'))     # saco claro abierto
    poly(p, [(18, 39), (30, 39), (27, N), (21, N)], hx('#34374a'))   # camisa oscura
    p.rect(23, 40, 2, 8, hx('#5e2a32'))                            # corbata
    neck(p, S, y0=34, y1=40, w=4)
    face(p, S, top=7, chin=39, half=10, chin_w=4)                  # cara larga
    ear(p, S, -1, half=10, y=21); ear(p, S, 1, half=10, y=21)
    for y in (11, 13):                                            # frente surcada
        p.hline(18, 30, y, S[1])
    p.ellipse(19, 9, 4, 2, S[4])                                   # pelada con brillo
    Hs = [hx('#8a8272'), hx('#bcb4a2'), hx('#dcd6c6')]
    for x0, sgn in ((12, -1), (34, 1)):                            # pelo claro y ralo a los costados
        for k in range(5):
            line(p, x0 + (0 if sgn < 0 else 1), 14 + k * 2, x0 + 2 * sgn, 13 + k * 2, Hs[k % 3])
    brow(p, 15, 17, 6, hx('#6e6658'), thick=2, slope=1); brow(p, 27, 17, 6, hx('#6e6658'), thick=2, slope=-1)
    eye(p, 15, 20, deep=True); eye(p, 28, 20, deep=True)
    nose(p, S, y0=21, y1=30)
    for k in range(5):                                            # surcos nasogenianos
        p.set(18 - k // 3, 29 + k, S[0]); p.set(30 + k // 3, 29 + k, S[0])
    mouth(p, S, y=34, w=3)
    p.vline(14, 26, 32, S[1]); p.vline(34, 26, 32, S[0])          # mejillas hundidas
    p.outline(0.55, 0.25)
    return p


def polsky():
    p = Pix(N, N); p.rect(0, 0, N, N, BG)
    S = OLDSKIN
    shoulders(p, hx('#3a3946'), hx('#56556a'), hx('#26252f'))     # traje oscuro
    poly(p, [(18, 39), (30, 39), (26, 46), (22, 46)], hx('#d8d8de'))   # camisa blanca
    p.rect(23, 40, 2, 7, hx('#3c5446'))
    neck(p, S, y0=34, y1=40, w=4)
    face(p, S, top=10, chin=38, half=10, chin_w=4)
    ear(p, S, -1, half=10, y=22, h=9); ear(p, S, 1, half=10, y=22, h=9)
    W_ = [hx('#7a7a88'), hx('#b8b8c4'), hx('#dcdce4'), hx('#f6f6fa')]
    poly(p, [(11, 22), (9, 12), (13, 5), (22, 2), (32, 3), (38, 8), (39, 18), (36, 22), (35, 14), (24, 11), (14, 14)], W_[1])
    for k in range(7):                                            # peinado para atras, revuelto
        line(p, 13 + k * 4, 13 - k % 2, 16 + k * 4, 3 + k % 3, W_[3] if k < 4 else W_[2])
        line(p, 15 + k * 4, 12, 17 + k * 4, 6, W_[0])
    p.set(7, 10, W_[1]); p.set(40, 7, W_[1]); p.set(41, 12, W_[0])
    brow(p, 15, 19, 6, W_[0], thick=2, slope=1); brow(p, 27, 19, 6, W_[0], thick=2, slope=-1)
    eye(p, 15, 22, deep=True); eye(p, 28, 22, deep=True)
    nose(p, S, y0=23, y1=31, big=True)
    for y in (15, 17):
        p.hline(19, 29, y, S[1])
    mouth(p, S, y=34, w=4)
    for k in range(4):
        p.set(17, 31 + k, S[0]); p.set(31, 31 + k, S[0])
    p.outline(0.55, 0.25)
    return p


def elena():
    p = Pix(N, N); p.rect(0, 0, N, N, BG)
    S = SKIN
    Hb = [hx('#6a4a24'), hx('#a87e48'), hx('#d8b070'), hx('#f2d698')]
    poly(p, [(7, 42), (8, 16), (14, 6), (24, 3), (34, 6), (40, 16), (41, 42), (35, 40), (34, 22), (14, 22), (13, 40)], Hb[2])   # pelo de atras
    shoulders(p, hx('#6e4a62'), hx('#8e6880'), hx('#4c3246'))     # vestido oscuro
    poly(p, [(19, 39), (29, 39), (26, 43), (22, 43)], hx('#ece4d0'))   # cuello claro
    neck(p, S, y0=34, y1=40, w=4)
    face(p, S, top=10, chin=36, half=10, chin_w=3)                 # cara suave
    poly(p, [(12, 22), (13, 12), (19, 7), (26, 6), (32, 9), (36, 16), (36, 22), (32, 14), (24, 12), (17, 16)], Hb[2])   # flequillo de lado
    for k in range(6):                                            # ondas
        line(p, 9, 20 + k * 4, 12, 22 + k * 4, Hb[1]); line(p, 39, 20 + k * 4, 36, 22 + k * 4, Hb[1])
    line(p, 15, 10, 28, 7, Hb[3]); line(p, 17, 13, 26, 10, Hb[3])
    line(p, 22, 8, 30, 14, Hb[1])
    brow(p, 15, 18, 5, Hb[0], thick=1, slope=0); brow(p, 28, 18, 5, Hb[0], thick=1, slope=0)
    eye(p, 15, 20, lashes=True); eye(p, 28, 20, lashes=True)
    p.set(16, 27, mix(S[2], hx('#e07a7a'), 0.4)); p.set(32, 27, mix(S[2], hx('#e07a7a'), 0.4))
    p.vline(24, 23, 27, S[1]); p.set(23, 28, S[0]); p.set(25, 28, S[0])
    mouth(p, S, y=31, w=3, lips=True)
    p.outline(0.55, 0.25)
    return p


def martita():
    p = Pix(N, N); p.rect(0, 0, N, N, BG)
    S = SKIN
    Hb = [hx('#8a6a3a'), hx('#b09060'), hx('#e2c890'), hx('#f6e6b4')]
    poly(p, [(9, 40), (9, 17), (14, 8), (24, 5), (34, 8), (39, 17), (39, 40), (34, 38), (34, 24), (14, 24), (14, 38)], Hb[2])
    shoulders(p, hx('#e6dcc4'), hx('#faf4e4'), hx('#b6ab92'), y=42)
    poly(p, [(18, 41), (30, 41), (27, 45), (21, 45)], hx('#ffffff'))
    face(p, S, top=12, chin=38, half=11, chin_w=6)                 # cara redonda de nena
    poly(p, [(12, 22), (12, 14), (17, 9), (24, 7), (31, 9), (36, 14), (36, 22), (36, 20), (12, 20)], Hb[2])   # flequillo recto
    for x in range(14, 36, 3):
        p.vline(x, 12, 20, Hb[1])
    line(p, 15, 10, 30, 9, Hb[3])
    eye(p, 15, 23); eye(p, 28, 23)                                 # ojos grandes
    p.rect(16, 24, 3, 2, IRIS2); p.rect(29, 24, 3, 2, IRIS2); p.set(16, 24, SHINE); p.set(29, 24, SHINE)
    p.set(15, 29, mix(S[2], hx('#e07a7a'), 0.5)); p.set(33, 29, mix(S[2], hx('#e07a7a'), 0.5))
    p.set(24, 29, S[1])
    mouth(p, S, y=32, w=2, lips=True)
    p.outline(0.55, 0.25)
    return p


def traje():
    """Juan con la capucha y la visera eliptica; la cara de Juan adentro."""
    p = Pix(N, N); p.rect(0, 0, N, N, BG)
    F = [hx('#6f6c66'), hx('#a19c8e'), hx('#cfc9b8'), hx('#ece8dc')]
    shoulders(p, F[2], F[3], F[1], y=38)
    for x in range(8, 41, 4):                                     # pliegues
        p.vline(x, 42, N - 1, F[1])
    for x in range(12, 37):                                       # tira de goma enrollada al cuello
        p.set(x, 37, hx('#3a3634') if x % 2 else hx('#5a5650')); p.set(x, 38, hx('#5a5650') if x % 2 else hx('#3a3634'))
    # capucha: mas alta que ancha, costados rectos
    for y in range(2, 38):
        for x in range(6, 43):
            d = abs((x - 24) / 17) ** 3 + abs((y - 20) / 18) ** 3
            if d <= 1:
                c = F[2]
                if x > 30:
                    c = F[1]
                if x < 16 and y < 16:
                    c = F[3]
                p.set(x, y, c)
    for y in range(4, 14, 2):
        p.set(24, y, F[0])                                         # costura central a mano
    p.rect(10, 8, 5, 4, hx('#bcb4a0')); p.frame(10, 8, 5, 4, hx('#8e866e'))   # parche
    # visera eliptica: cara de Juan detras del vidrio
    jf = juan()
    for y in range(12, 32):
        for x in range(7, 42):
            dn = ((x - 24) / 16) ** 2 + ((y - 21) / 9.5) ** 2
            if dn <= 1:
                inner = ((x - 24) / 14.2) ** 2 + ((y - 21) / 7.8) ** 2
                if inner <= 1:
                    c = jf.get(x, y + 1)[:3]
                    p.set(x, y, mix(c, hx('#22303e'), 0.45))
                else:
                    p.set(x, y, hx('#8a94a0') if (x < 24 and y < 21) else hx('#3e434c'))
    for k, ang in enumerate(range(0, 360, 36)):                    # bulones
        a = math.radians(ang + 10)
        p.set(round(24 + 15 * math.cos(a)), round(21 + 8.6 * math.sin(a)), hx('#c4ced6'))
    for ang in range(200, 250, 4):                                 # reflejo
        a = math.radians(ang)
        p.set(round(24 + 11 * math.cos(a)), round(21 + 5 * math.sin(a)), hx('#dceaf2'))
    # filtro: lata atada con alambre
    p.rect(29, 28, 8, 8, hx('#4a4e56')); p.vline(29, 28, 35, hx('#a4acb6')); p.vline(36, 28, 35, hx('#2c2f36'))
    p.hline(28, 37, 31, hx('#8c8478')); p.hline(29, 36, 28, hx('#a4acb6'))
    p.outline(0.55, 0.25)
    return p


ALL = {'juan': juan, 'favalli': favalli, 'lucas': lucas, 'polsky': polsky, 'elena': elena,
       'martita': martita, 'traje': traje}


def build():
    from PIL import Image
    os.makedirs(OUT, exist_ok=True)
    S = 6
    sheet = Image.new('RGBA', (len(ALL) * (N * S + 12) + 12, N * S + 24), (18, 22, 44, 255))
    for i, (n, fn) in enumerate(ALL.items()):
        im = fn().img
        im.save(os.path.join(OUT, f'p2_{n}.png'))
        sheet.alpha_composite(im.resize((N * S, N * S), Image.NEAREST), (12 + i * (N * S + 12), 12))
    sheet.save(os.path.join(OUT, 'portraits2_x6.png'))


if __name__ == '__main__':
    build()
    print('ok')
