"""El garaje-esclusa (pags. 032, 040-042): por aca sale Juan con el traje.

Estantes con latas y frascos, manguera enrollada en la pared, neumatico
tirado, balde con escoba, piso de baldosas claras con juntas, puerta de dos
hojas a la calle con el extractor hecho con el secador de Elena encima, el
equipo electrogeno a nafta de Favalli que alimenta una lamparita colgando (la
unica luz electrica de la casa), y el banco donde terminan el traje.
"""
import math
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')
sys.path.insert(0, os.path.join(ROOT, 'tools', 'art'))
sys.path.insert(0, HERE)
import objects as ob  # noqa: E402
import house as hs  # noqa: E402
import props as pr  # noqa: E402
from pixel import Pix, hx, mix  # noqa: E402
from PIL import Image  # noqa: E402

OUT = os.path.join(HERE, 'out')
COLS, ROWS = 18, 11


def double_door():
    """Puerta de dos hojas con paneles y picaportes redondos; luz fria por la rendija."""
    p = Pix(40, 38)
    for x0 in (1, 20):
        ob.box(p, x0, 1, 19, 34, ob.WD)
        p.frame(x0 + 3, 4, 13, 12, ob.WD[1]); p.frame(x0 + 3, 19, 13, 13, ob.WD[1])
    p.vline(20, 1, 34, ob.WD[0])
    p.circle(17, 20, 1.6, ob.BR[2]); p.circle(23, 20, 1.6, ob.BR[2])
    p.rect(0, 35, 40, 2, hx('#bdeffa'))                                  # rendija: la nieve brilla afuera
    return ob.finish(p)


def generator():
    """Equipo electrogeno a nafta: motor, tanque, escape, cables."""
    p = Pix(28, 24)
    p.rect(2, 10, 24, 12, ob.RD[1]); p.hline(2, 25, 10, ob.RD[3]); p.rect(2, 20, 24, 2, ob.RD[0])
    p.rect(4, 4, 12, 7, ob.MT[1]); p.hline(4, 15, 4, ob.MT[3])            # tanque
    p.rect(8, 2, 4, 2, ob.MT[0])
    p.circle(20, 15, 4, ob.BK[1]); p.circle(20, 15, 2.5, ob.MT[2])         # volante del motor
    for k in range(3):
        p.set(20 + k - 1, 15, ob.BK[1])
    p.rect(23, 4, 2, 7, ob.BK[2])                                         # escape
    p.set(23, 2, hx('#8a92a4')); p.set(24, 1, hx('#6a7286'))              # humito
    p.rect(3, 22, 3, 2, ob.BK[1]); p.rect(22, 22, 3, 2, ob.BK[1])
    return ob.finish(p, (14, 23, 12, 1))


def bidon():
    p = Pix(10, 13)
    p.rect(1, 3, 8, 10, ob.RD[2]); p.hline(1, 8, 3, ob.RD[3]); p.vline(8, 3, 12, ob.RD[0])
    p.rect(2, 0, 3, 3, ob.MT[1]); p.rect(6, 1, 2, 2, ob.BK[1])
    p.rect(3, 6, 4, 3, ob.CR[2])
    return ob.finish(p, (5, 12, 4, 1))


def bulb():
    """Lamparita desnuda colgando del cable."""
    p = Pix(8, 22)
    p.vline(4, 0, 14, ob.BK[1])
    p.rect(3, 14, 3, 2, ob.MT[1])
    p.ellipse(4, 18, 2.5, 3, hx('#fff0c0')); p.set(3, 17, hx('#ffffff'))
    return p


def broom_bucket():
    p = Pix(16, 26)
    p.vline(11, 0, 18, ob.WD[3]); p.vline(12, 0, 18, ob.WD[1])
    p.rect(8, 18, 8, 6, hx('#c8a050'))
    for x in range(8, 16, 2):
        p.vline(x, 20, 25, hx('#8a6a30'))
    p.rect(1, 14, 8, 10, ob.MT[1]); p.hline(1, 8, 14, ob.MT[3]); p.vline(8, 14, 23, ob.MT[0])
    p.hline(1, 8, 13, ob.BK[1])
    return ob.finish(p, (8, 25, 7, 1))


def oil_stain(w=20, h=8):
    p = Pix(w, h)
    p.ellipse(w / 2, h / 2, w / 2 - 1, h / 2 - 1, (40, 34, 44), 120)
    p.ellipse(w / 2 - 2, h / 2, w / 4, h / 4, (30, 26, 34), 140)
    return p


def stool():
    p = Pix(12, 14)
    p.rect(1, 2, 10, 3, ob.WD[2]); p.hline(1, 10, 2, ob.WD[3])
    for x in (2, 9):
        p.vline(x, 5, 13, ob.WD[1])
    p.hline(2, 9, 10, ob.WD[1])
    return ob.finish(p, (6, 13, 5, 1))


def bench_suit():
    """El banco con lo que queda de armar el traje: tela, tijera, tiras de goma."""
    bench = ob.workbench().img.copy()
    p = Pix(bench.width, bench.height); p.img = bench; p.px = bench.load()
    for spr, (x, y) in ((pr.tela_engomada(), (4, 2)), (pr.rollo_cinta(), (24, 6)), (pr.rollo_cinta(), (30, 7)),
                        (pr.pinza(), (36, 9)), (pr.valvula(), (40, 3))):
        p.img.alpha_composite(spr.img, (x, y))
    return p


def plan():
    g = [['black'] * COLS for _ in range(ROWS)]
    for x in range(1, COLS - 1):
        g[1][x] = f'brick_{x % 2}'
        g[2][x] = f'brickbase_{x % 2}'
        for y in range(3, ROWS - 1):
            g[y][x] = f'tile_{(x + y) % 2}'
    for y in range(1, ROWS - 1):
        g[y][0] = 'plank_0'; g[y][COLS - 1] = 'plank_1'
    return g


def build():
    tiles = hs.load_tiles()
    g = plan()
    sc = Pix(COLS * 16, ROWS * 16)
    for y in range(ROWS):
        for x in range(COLS):
            sc.img.alpha_composite(tiles[g[y][x]], (x * 16, y * 16))
    sc.px = sc.img.load()
    import edges
    edges.soften(sc, g)

    def put(spr, tx, ty_bottom, ox=0, oy=0):
        img = spr.img if hasattr(spr, 'img') else spr
        sc.img.alpha_composite(img, (int(tx * 16 + ox), int(ty_bottom * 16 - img.height + oy)))

    # pared del fondo: estantes, manguera, la puerta a la calle con el extractor
    put(ob.garage_shelf(), 1, 4, 0, 0)
    put(ob.hose(), 4, 3, 2, -6)
    put(double_door(), 7, 3, 0, 3)
    put(hs.extractor(), 7, 1, 12, 4)
    put(ob.garage_shelf(), 11, 4, 4, 0)
    put(ob.crate(), 16, 4, 0, 0); put(ob.DRAW['box'](), 16, 5, 0, 2)
    # el electrogeno de Favalli con su bidon; el cable sube hasta la lamparita
    put(generator(), 13, 7, 0, 0)
    put(bidon(), 16, 7, 0, 0)
    for k in range(32):
        x = 13 * 16 + 2 - k * 2; y = 6 * 16 + 8 + int(2 * math.sin(k * 0.5))
        sc.set(x, y, ob.BK[1])
    sc.vline(9 * 16 + 6, 4 * 16, 6 * 16 + 8, ob.BK[1])
    put(bulb(), 9, 5, 2, 0)
    # el banco del traje, el banquito y cajas
    put(bench_suit(), 1, 8, 0, 0)
    put(stool(), 4, 9, 4, 0)
    put(ob.cardboard_box(), 1, 10, 0, 0)
    put(ob.DRAW['box'](), 2, 10, 2, 0)
    # el neumatico, el balde con la escoba, manchas de aceite
    put(ob.tire(), 11, 10, 0, 0)
    put(broom_bucket(), 15, 10, 0, 0)
    put(oil_stain(), 8, 8, 0, 0); put(oil_stain(14, 6), 12, 9, 0, 0)
    # el traje colgado de un clavo, esperando a Juan
    import suit
    hang = suit.sprite_front().img
    put(hang, 5, 7, 4, -6)
    sc.vline(5 * 16 + 12, 7 * 16 - 6 - 32 - 4, 7 * 16 - 6 - 32, ob.BK[1])

    os.makedirs(OUT, exist_ok=True)
    full = Image.new('RGBA', (480, 270), (11, 12, 29, 255))
    full.alpha_composite(sc.img, ((480 - sc.w) // 2, (270 - sc.h) // 2))
    full.save(os.path.join(OUT, 'garage_mockup.png'))
    full.resize((960, 540), Image.NEAREST).save(os.path.join(OUT, 'garage_mockup_x2.png'))
    # con la luz de la lamparita del electrogeno (despues del corte)
    import lighting as L
    ox, oy = (480 - sc.w) // 2, (270 - sc.h) // 2
    lit = L.blackout(full, candles=[(ox + 9 * 16 + 6, oy + 5 * 16 - 3, 110)], darkness=0.42)
    lit.resize((960, 540), Image.NEAREST).save(os.path.join(OUT, 'garage_lit_x2.png'))
    pieces = [double_door(), generator(), bidon(), bulb(), broom_bucket(), stool(), bench_suit()]
    W = sum(s.w for s in pieces) + 8 * (len(pieces) + 1); H = max(s.h for s in pieces) + 16
    sheet = Image.new('RGBA', (W, H), (0, 0, 0, 0)); x = 8
    for s in pieces:
        sheet.alpha_composite(s.img, (x, H - 8 - s.h)); x += s.w + 8
    sheet.resize((W * 4, H * 4), Image.NEAREST).save(os.path.join(OUT, 'garage_pieces_x4.png'))


if __name__ == '__main__':
    build()
    print('ok')
