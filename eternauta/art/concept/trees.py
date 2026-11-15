"""Pinos con textura (nivel Stardew): mechones de agujas que caen en capas.

Cada capa es una fila de mechones en "chevron" (pico al centro, puntas que
caen); cada mechon tiene el borde de arriba iluminado, la panza en sombra y
el borde de abajo dentado. Se dibujan de abajo hacia arriba para que cada
capa tape el nacimiento de la de abajo. El tronco es grueso, con corteza
veteada y raices abiertas.
  pine(snowy=False)   verde de noche
  pine(snowy=True)    con la nieve apoyada en cada mechon
  pine(glow=True)     la nevada mortal: copos que brillan pegados a las ramas
"""
import math
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'tools', 'art'))
from pixel import Pix, hx, mix  # noqa: E402

OUT = os.path.join(HERE, 'out')
G = [hx('#0a1a1e'), hx('#12302e'), hx('#1c4a40'), hx('#2a6a52'), hx('#4a9068')]   # agujas de noche
BARK = [hx('#1e120c'), hx('#3a2416'), hx('#5e3a20'), hx('#86562e')]
SN = [hx('#3e5e86'), hx('#7aa2c4'), hx('#b8d8ea'), hx('#e8f6fc'), hx('#ffffff')]
GLOW = hx('#bdeffa')


def trunk(p, cx, top, base):
    for y in range(top, base + 1):
        t = (y - top) / max(1, base - top)
        half = 1.5 + 1.6 * t + (2.5 if y > base - 3 else 0) * ((y - (base - 3)) / 3 if y > base - 3 else 0)
        x0, x1 = round(cx - half), round(cx + half)
        for x in range(x0, x1 + 1):
            k = (x - x0) / max(1, x1 - x0)
            c = BARK[2] if k < 0.35 else BARK[1] if k < 0.8 else BARK[0]
            if (x * 3 + y) % 7 == 0:
                c = BARK[3] if k < 0.5 else BARK[0]                   # vetas
            p.set(x, y, c)


def lobe(p, cx, cy, lw, rnd, snowy, glow, shade_right=False):
    """Un mechon de agujas que cae: lobulo con pico arriba, puntas caidas,
    borde de abajo dentado; luz arriba-izq, panza oscura, nieve gruesa arriba."""
    half = lw / 2
    for dx in range(-int(half), int(half) + 1):
        x = cx + dx
        droop = (dx * dx) / (lw * 0.9)
        top = round(cy + droop)
        bot = round(cy + 4 + droop * 0.6 + (1 if (x + cy) % 2 == 0 else 0))
        for y in range(top, bot + 1):
            d = (y - top) / max(1, bot - top)
            c = G[3] if d < 0.3 else G[2] if d < 0.7 else G[1]
            if shade_right or dx > half * 0.3:
                c = G[2] if d < 0.3 else G[1]
            p.set(x, y, c)
        p.set(x, bot + 1, G[0])
        if dx < 0 and not snowy:
            p.set(x, top, G[4])
        if snowy:
            k_cover = 2 if abs(dx) < half - 1 else 1
            for k in range(k_cover):
                c = SN[3] if k == 0 else SN[2]
                if dx > half * 0.3 or shade_right:
                    c = SN[2] if k == 0 else SN[1]
                p.set(x, top - 1 + k, c)
            p.set(x, top - 1 + k_cover, SN[0])
            if dx < 0 and rnd.random() < 0.4:
                p.set(x, top - 1, SN[4])
        if glow and rnd.random() < 0.08:
            p.set(x, top + 2, GLOW)


def pine(snowy=True, glow=False, seed=3, w=36, h=64):
    rnd = random.Random(seed)
    p = Pix(w, h)
    cx = w // 2
    trunk(p, cx, h - 20, h - 4)
    tiers = 9
    for t in reversed(range(tiers)):                                   # de abajo hacia arriba
        cy = 3 + t * 4.8
        hw = 2 + t * 1.75
        n = 1 + (t + 1) // 2
        offs = [(-hw + (2 * hw) * (i + 0.5) / n) + (1.5 if t % 2 else -1.5) * (n > 1) for i in range(n)]
        offs.sort(key=lambda o: -abs(o))                               # de afuera hacia el centro
        for o in offs:
            lw = 7 + (1 if t > 4 else 0) + rnd.choice((0, 1))
            lobe(p, round(cx + o), round(cy + abs(o) * 0.25 + rnd.choice((0, 0, 1))), lw, rnd, snowy, glow,
                 shade_right=o > hw * 0.35)
    p.vline(cx, 0, 4, G[2]); p.set(cx, 0, SN[4] if snowy else G[3])
    if snowy:
        p.set(cx, 1, SN[3]); p.set(cx - 1, 2, SN[3])
    p.outline(0.6, 0.35)
    for x in range(cx - 9, cx + 10):                                   # sombra al pie (sin contorno)
        if p.get(x, h - 3)[3] == 0:
            p.set(x, h - 3, (20, 16, 34), 80)
    if glow:
        for y in range(h):
            for x in range(w):
                if p.get(x, y)[:3] == GLOW:
                    for ddx, ddy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        xx, yy = min(w - 1, max(0, x + ddx)), min(h - 1, max(0, y + ddy))
                        c = p.get(xx, yy)
                        if c[3] and c[:3] != GLOW:
                            p.set(xx, yy, mix(c[:3], GLOW, 0.45))
    return p


def build():
    os.makedirs(OUT, exist_ok=True)
    from PIL import Image
    trees = [pine(False, seed=3), pine(True, seed=5), pine(True, glow=True, seed=8), pine(True, seed=13, w=30, h=56)]
    W = sum(t.w for t in trees) + 12 * (len(trees) + 1)
    H = max(t.h for t in trees) + 16
    sheet = Image.new('RGBA', (W, H), (150, 180, 200, 255))
    x = 12
    for t in trees:
        sheet.alpha_composite(t.img, (x, H - 8 - t.h)); x += t.w + 12
    sheet.resize((W * 6, H * 6), 0).save(os.path.join(OUT, 'pines_x6.png'))


if __name__ == '__main__':
    build()
    print('ok')
