"""Objetos chicos para vestir superficies (nivel Stardew), Argentina 1957.

Cada objeto mide 4-12 px y se lee por su silueta y 1-2 brillos. Las mesas se
"visten" apoyando muchos encima, con su sombrita, sin taparse del todo.
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'tools', 'art'))
import objects as ob  # noqa: E402
from pixel import Pix, hx, mix  # noqa: E402

OUT = os.path.join(HERE, 'out')
CARD = [hx('#c8bfa8'), hx('#f4eee0')]
SPAN = {'espada': hx('#3a5a8a'), 'basto': hx('#3a6a3a'), 'oro': hx('#d0a040'), 'copa': hx('#a83a3a')}
GLASSC = [hx('#5a7a8a'), hx('#9ab8c4'), hx('#e2f2f8')]
WINE = [hx('#3a0e18'), hx('#6a1a28')]
TIN = [hx('#5a6270'), hx('#9aa4b0'), hx('#d8e0e6')]
SHADOW = (20, 16, 34)


def P(w, h):
    return Pix(w, h)


def drop(p, cx, y, rx, a=80):
    for x in range(int(cx - rx), int(cx + rx) + 1):
        if 0 <= x < p.w and 0 <= y < p.h and p.get(x, y)[3] == 0:
            p.set(x, y, SHADOW, a)


# ---------------------------------------------------------------- truco
def naipe(palo='oro', back=False):
    p = P(5, 7)
    p.rect(0, 0, 5, 7, CARD[1]); p.vline(4, 0, 6, CARD[0]); p.hline(0, 4, 6, CARD[0])
    if back:
        p.rect(1, 1, 3, 5, hx('#7a2a32')); p.set(2, 3, hx('#d0a040'))
    else:
        c = SPAN[palo]
        p.set(2, 2, c); p.set(2, 3, c); p.set(1, 3, c) if palo in ('oro', 'copa') else p.set(2, 4, c)
    return p


def anotador():
    """Anotador de truco con dos porotos al lado (se cuentan los tantos)."""
    p = P(10, 9)
    p.rect(0, 1, 7, 8, CARD[1]); p.hline(0, 6, 1, hx('#b84040'))
    for y in (3, 5, 7):
        p.hline(1, 5, y, hx('#7a7668'))
    p.vline(3, 2, 8, hx('#7a7668'))
    for (x, y) in ((8, 4), (8, 7)):
        p.set(x, y, hx('#f0e0b8')); p.set(x + 1, y, hx('#b89a6a'))
    return p


def sifon():
    """Sifon de soda: vidrio azulado con cabeza metalica."""
    p = P(6, 14)
    p.rect(1, 5, 4, 9, GLASSC[0]); p.vline(1, 6, 12, GLASSC[2]); p.vline(2, 6, 12, GLASSC[1])
    p.rect(1, 1, 4, 4, TIN[1]); p.hline(1, 4, 1, TIN[2]); p.set(5, 2, TIN[0]); p.set(5, 3, TIN[1])
    p.vline(3, 0, 0, TIN[2])
    return p


def vaso_vino():
    p = P(4, 6)
    p.rect(0, 0, 4, 6, GLASSC[1]); p.rect(0, 2, 4, 4, WINE[1]); p.hline(0, 3, 2, WINE[0])
    p.vline(0, 0, 5, GLASSC[2])
    return p


def botella_vino():
    p = P(4, 13)
    p.rect(0, 4, 4, 9, hx('#1e2a1e')); p.rect(1, 0, 2, 4, hx('#1e2a1e'))
    p.vline(0, 5, 11, hx('#3a5a3a')); p.rect(0, 7, 4, 3, CARD[1]); p.hline(1, 2, 8, hx('#a83a3a'))
    p.hline(1, 2, 0, hx('#c8a060'))
    return p


def cenicero():
    """Cenicero con el cigarrillo de Favalli humeando."""
    p = P(9, 9)
    p.ellipse(4, 6, 4, 2.4, TIN[0]); p.ellipse(4, 6, 3, 1.5, hx('#3a3640'))
    p.hline(5, 8, 5, hx('#f0ece4')); p.set(8, 5, hx('#ff8a4a'))
    for k, (x, y) in enumerate(((8, 4), (7, 3), (8, 2), (7, 1), (8, 0))):
        p.set(x, y, hx('#c8ccd8'), 160 - k * 25)
    return p


def mate():
    """Mate de calabaza con virola de alpaca y bombilla: se lee sobre la madera."""
    p = P(7, 10)
    p.ellipse(3.5, 6.5, 3.2, 3.3, hx('#5a3418'))          # calabaza oscura
    p.ellipse(3.0, 6.0, 1.6, 1.8, hx('#8a5a30'))          # brillo de la panza
    p.set(2, 5, hx('#b07a44'))
    p.hline(1, 5, 3, TIN[2]); p.hline(1, 5, 4, TIN[1])    # virola
    p.hline(2, 4, 3, hx('#4a8a3a'))                       # yerba
    p.vline(5, 0, 3, TIN[2]); p.set(6, 0, TIN[1])         # bombilla
    return p


def outlined(p, dark=hx('#1a1426')):
    """Contorno oscuro de 1 px alrededor de la silueta (agrega 1 px por lado)."""
    q = P(p.w + 2, p.h + 2)
    q.paste(p, 1, 1)
    base = q.img.copy().load()
    for y in range(q.h):
        for x in range(q.w):
            if base[x, y][3]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                xx, yy = x + dx, y + dy
                if 0 <= xx < q.w and 0 <= yy < q.h and base[xx, yy][3] > 100:
                    q.set(x, y, dark, 230)
                    break
    return q


# ---------------------------------------------------------------- cocina
def lata(c=hx('#a83a3a')):
    p = P(5, 6)
    p.rect(0, 1, 5, 5, TIN[1]); p.rect(0, 2, 5, 3, c); p.hline(0, 4, 0, TIN[2]); p.vline(0, 1, 5, TIN[2])
    p.hline(1, 3, 3, CARD[1])
    return p


def frasco(c=hx('#c88a3a')):
    p = P(5, 8)
    p.rect(0, 2, 5, 6, GLASSC[1]); p.rect(1, 4, 3, 4, c); p.rect(0, 0, 5, 2, TIN[1]); p.vline(0, 2, 7, GLASSC[2])
    return p


def pan():
    p = P(9, 5)
    p.ellipse(4, 3, 4, 2, hx('#b8803a')); p.hline(2, 6, 2, hx('#e0a858'))
    for x in (3, 5):
        p.set(x, 2, hx('#7a4a20'))
    return p


def pava():
    """Pava de chapa enlozada."""
    p = P(11, 9)
    p.ellipse(5, 6, 4.5, 3, hx('#3a5a7a')); p.hline(2, 7, 4, hx('#6a8aaa'))
    p.rect(9, 4, 2, 2, hx('#3a5a7a')); p.set(10, 3, hx('#3a5a7a'))
    for x in range(3, 8):
        p.set(x, 1 if 4 <= x <= 6 else 2, hx('#24242c'))
    p.set(3, 3, hx('#24242c')); p.set(7, 3, hx('#24242c'))
    return p


def lampara_aceite():
    p = P(7, 12)
    p.rect(2, 9, 3, 3, hx('#b8903a')); p.hline(1, 5, 11, hx('#7a5a20'))
    p.ellipse(3, 5, 2.4, 3.2, hx('#f8ecc8')); p.set(3, 6, hx('#ffb040')); p.set(3, 5, hx('#ffe080'))
    p.hline(2, 4, 1, hx('#3a3640'))
    return p


def lista():
    """La lista de Elena con un lapiz."""
    p = P(8, 9)
    p.rect(0, 0, 6, 8, CARD[1]); p.vline(5, 0, 7, CARD[0])
    for y in (2, 4, 6):
        p.hline(1, 3 + (y % 3), y, hx('#4a4a5a'))
    for k in range(5):
        p.set(3 + k // 1 if False else 4 + k // 2, 4 + k, hx('#e0a030'))
    p.set(7, 8, hx('#3a3a3a'))
    return p


# ---------------------------------------------------------------- laboratorio
def valvula():
    p = P(4, 7)
    p.ellipse(2, 2.5, 1.6, 2.4, GLASSC[1]); p.set(1, 1, GLASSC[2]); p.set(2, 3, hx('#ffb040'))
    p.rect(0, 5, 4, 2, hx('#2a2a30'))
    return p


def destornillador():
    p = P(10, 3)
    p.rect(0, 0, 4, 3, hx('#c8343a')); p.hline(4, 9, 1, TIN[2]); p.set(1, 0, hx('#ff6a6a'))
    return p


def pinza():
    p = P(8, 6)
    for k in range(4):
        p.set(k, k, TIN[2]); p.set(k, 5 - k, TIN[1])
    p.hline(4, 7, 2, hx('#3a6aaa')); p.hline(4, 7, 3, hx('#2a4a7a'))
    return p


def tela_engomada():
    p = P(14, 8)
    p.rect(0, 1, 13, 7, hx('#cfc9b8')); p.hline(0, 12, 1, hx('#ece8dc'))
    for x in range(1, 12, 2):
        p.set(x, 5, hx('#8e866e'))
    p.rect(9, 3, 4, 5, hx('#a19c8e'))
    p.hline(11, 13, 0, TIN[2]); p.set(13, 1, TIN[1])                 # tijera
    return p


def rollo_cinta():
    p = P(6, 6)
    p.circle(3, 3, 2.8, hx('#3a3634')); p.circle(3, 3, 1.2, hx('#8a8070'))
    return p


SETS = {
    'truco': [naipe('espada'), naipe('oro'), naipe('basto', True), anotador(), sifon(), vaso_vino(),
              botella_vino(), cenicero(), mate()],
    'cocina': [lata(), lata(hx('#3a7a4a')), frasco(), frasco(hx('#6a3a2a')), pan(), pava(), lampara_aceite(), lista()],
    'laboratorio': [valvula(), destornillador(), pinza(), tela_engomada(), rollo_cinta()],
}


def dressed_truco_table():
    """La mesa de truco vestida, a escala de juego (56x40)."""
    p = P(56, 40)
    # mesa con pano verde (paño de juego) y borde de madera
    p.rect(2, 8, 52, 24, ob.WD[2]); p.hline(2, 53, 8, ob.WD[3]); p.rect(2, 30, 52, 3, ob.WD[1])
    p.rect(5, 10, 46, 19, hx('#2f5a4a')); p.hline(5, 50, 10, hx('#3f7a62'))
    for x in (5, 49):
        p.rect(x, 33, 3, 7, ob.WD[1])
    def put(spr, x, y):
        drop(spr, spr.w // 2, spr.h - 1, spr.w // 2) if False else None
        for sx in range(spr.w):
            if p.get(x + sx, y + spr.h)[3] and spr.get(sx, spr.h - 1)[3]:
                c = p.get(x + sx + 1, y + spr.h)
                p.set(x + sx + 1, y + spr.h, mix(c[:3], SHADOW, 0.35))
        p.img.alpha_composite(spr.img, (x, y))
    # las cartas de cada uno y el pozo del medio
    for k, palo in enumerate(('oro', 'copa', 'espada')):
        put(naipe(palo), 20 + k * 6, 16)
    for k in range(3):
        put(naipe(back=True), 7 + k * 3, 13 + k)
        put(naipe(back=True), 40 + k * 3, 13 + k)
    put(anotador(), 22, 5)
    put(sifon(), 46, 0)
    put(vaso_vino(), 9, 7); put(vaso_vino(), 38, 6)
    put(cenicero(), 13, 21)
    put(mate(), 34, 21)
    put(botella_vino(), 3, 0)
    return ob.finish(p, (28, 39, 24, 1))


def dressed_kitchen_table():
    p = P(56, 40)
    p.rect(2, 10, 52, 22, hx('#e8e0cc')); p.hline(2, 53, 10, hx('#f8f2e0'))
    for x in range(4, 53, 6):                                        # mantel a cuadros
        p.vline(x, 11, 31, hx('#c87a7a'))
    for y in range(13, 31, 6):
        p.hline(3, 53, y, hx('#c87a7a'))
    p.rect(2, 30, 52, 3, ob.WD[1])
    for x in (5, 49):
        p.rect(x, 33, 3, 7, ob.WD[1])
    def put(spr, x, y):
        p.img.alpha_composite(spr.img, (x, y))
    put(lampara_aceite(), 24, 2)
    put(lata(), 6, 8); put(lata(hx('#3a7a4a')), 11, 9); put(lata(), 8, 13)
    put(frasco(), 40, 5); put(frasco(hx('#6a3a2a')), 46, 6)
    put(pan(), 33, 18); put(pava(), 14, 18); put(lista(), 42, 18)
    return ob.finish(p, (28, 39, 24, 1))


def build():
    os.makedirs(OUT, exist_ok=True)
    from PIL import Image
    rows = list(SETS.items())
    S = 6
    W = 10 + max(sum(s.w + 6 for s in items) for _, items in rows)
    H = sum(max(s.h for s in items) + 10 for _, items in rows) + 10
    sheet = Image.new('RGBA', (W, H), (42, 34, 54, 255))
    y = 10
    for _, items in rows:
        x = 10; hmax = max(s.h for s in items)
        for s in items:
            sheet.alpha_composite(s.img, (x, y + hmax - s.h)); x += s.w + 6
        y += hmax + 10
    sheet.resize((W * S, H * S), 0).save(os.path.join(OUT, 'props_x6.png'))
    t = dressed_truco_table(); k = dressed_kitchen_table()
    both = Image.new('RGBA', (t.w + k.w + 30, max(t.h, k.h) + 20), (110, 72, 40, 255))
    both.alpha_composite(t.img, (10, 10)); both.alpha_composite(k.img, (t.w + 20, 10))
    both.resize((both.width * 6, both.height * 6), 0).save(os.path.join(OUT, 'dressed_tables_x6.png'))


if __name__ == '__main__':
    build()
    print('ok')
