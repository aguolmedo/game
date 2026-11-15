"""Vehiculos de los 50 en vista 3/4 desde arriba (como el camion de Stardew).

Se ve desde arriba lo horizontal (techo, capot, baul, parabrisas) con brillos
que dan volumen, y de costado lo vertical (puertas, moldura cromada, ruedas).
  sedan      dos tonos, cubiertas de banda blanca, cromados, faros redondos
  colectivo  dos tonos, frente redondeado, ventanillas, cartel, fileteado
Ambos miran a la derecha; las variantes "nevado" llevan nieve en lo horizontal.
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'tools', 'art'))
import objects as ob  # noqa: E402
from pixel import Pix, hx, mix  # noqa: E402

OUT = os.path.join(HERE, 'out')
SNOW = [hx('#8eaec6'), hx('#b4d2e2'), hx('#d8eef6'), hx('#f4fcff')]
CHROME = [hx('#4a5260'), hx('#8a96a4'), hx('#c4ced8'), hx('#f0f6fa')]
GLASS = [hx('#24384c'), hx('#3e5c76'), hx('#6e92ac'), hx('#b8d4e4')]
TIRE = [hx('#141218'), hx('#24222a')]
WHITEWALL = hx('#d8d4cc')
RED = [hx('#6a1a1e'), hx('#b8343a'), hx('#ff7a6a')]
WARM = [hx('#f0b450'), hx('#ffe6a8')]

PAINT = {
    'teal': [hx('#16302e'), hx('#21484a'), hx('#2f6662'), hx('#4a8a80'), hx('#7ab8a8')],
    'bordo': [hx('#3a1418'), hx('#5a2026'), hx('#7e3036'), hx('#a8464a'), hx('#cc6c66')],
    'celeste': [hx('#24384e'), hx('#34506c'), hx('#4a6e8e'), hx('#6e94b2'), hx('#a0c2d8')],
}
CREAM = [hx('#8a8070'), hx('#b8ad94'), hx('#dcd2b8'), hx('#f2ead6')]


def rrect(p, x, y, w, h, r, c):
    for j in range(h):
        for i in range(w):
            cx = min(i, w - 1 - i); cy = min(j, h - 1 - j)
            if cx < r and cy < r and (r - cx - 0.5) ** 2 + (r - cy - 0.5) ** 2 > r * r:
                continue
            p.set(x + i, y + j, c)


def wheel(p, cx, cy, r=6):
    p.circle(cx, cy, r, TIRE[0])
    p.circle(cx, cy, r - 1.2, TIRE[1])
    p.circle(cx, cy, r - 2, WHITEWALL)                       # banda blanca
    p.circle(cx, cy, r - 3.2, CHROME[1])                     # taza
    p.set(int(cx) - 1, int(cy) - 1, CHROME[3])


def sedan(paint='teal', snowy=False):
    P = PAINT[paint]
    p = Pix(66, 42)
    # costado (lo vertical): carroceria baja redondeada
    rrect(p, 2, 18, 62, 15, 6, P[1])
    p.hline(4, 61, 18, P[2])
    for x in range(3, 63):                                   # sombra baja del costado
        p.set(x, 30, P[0]); p.set(x, 31, P[0])
    # guardabarros abombados sobre las ruedas
    for wx in (16, 50):
        p.ellipse(wx, 25, 9, 6, P[2]); p.ellipse(wx - 2, 23, 5, 2, P[3])
    # moldura cromada y puertas
    p.hline(6, 60, 24, CHROME[2]); p.hline(6, 60, 25, CHROME[0])
    for dx in (27, 39):
        p.vline(dx, 19, 30, P[0])
    p.hline(30, 32, 22, CHROME[3]); p.hline(42, 44, 22, CHROME[3])     # manijas
    # arriba (lo horizontal): baul, cabina, capot vistos desde arriba
    rrect(p, 3, 11, 18, 9, 4, P[2])                          # baul
    rrect(p, 40, 9, 24, 11, 5, P[2])                         # capot largo
    p.hline(44, 60, 10, P[4]); p.hline(42, 62, 11, P[3])     # brillo del capot
    p.vline(52, 12, 18, P[3])                                # moldura central del capot
    rrect(p, 15, 6, 30, 15, 6, P[2])                         # cabina: sale de la carroceria
    for x in range(16, 44):                                  # sombra donde la cabina toca el capot/baul
        if p.get(x, 20)[3]:
            p.set(x, 20, P[1])
    rrect(p, 17, 2, 26, 11, 5, CREAM[2])                     # techo crema (dos tonos) apoyado en la cabina
    p.hline(21, 38, 3, CREAM[3]); p.hline(19, 40, 4, CREAM[3])
    p.hline(19, 40, 12, CREAM[1])
    # vidrios: luneta, parabrisas y ventanillas laterales
    for y in range(4, 13):                                   # parabrisas (inclinado)
        x0 = 41 - (y - 4) // 3
        p.hline(x0, x0 + 3, y, GLASS[2] if y < 7 else GLASS[1])
    for y in range(5, 13):                                   # luneta
        x0 = 16 + (y - 5) // 3
        p.hline(x0, x0 + 2, y, GLASS[1])
    rrect(p, 19, 13, 23, 6, 2, GLASS[1])                     # ventanillas de costado
    for x in (19, 30, 41):                                   # parantes de la carroceria
        p.vline(x, 13, 18, P[2]); p.vline(x + 1, 13, 18, P[1]) if x < 41 else None
    p.hline(18, 42, 12, CREAM[1])                            # borde del techo sobre las ventanillas
    p.hline(21, 27, 14, GLASS[3]); p.hline(32, 37, 14, GLASS[2])
    # trompa: paragolpes, parrilla, faro; cola: luz roja
    rrect(p, 59, 17, 6, 12, 2, CHROME[2]); p.vline(64, 18, 27, CHROME[0])
    p.vline(61, 20, 25, CHROME[0]); p.vline(62, 20, 25, CHROME[3])
    p.circle(60, 15, 2.6, CHROME[2]); p.circle(60, 15, 1.6, WARM[1])
    rrect(p, 0, 18, 4, 11, 1, CHROME[1])
    p.rect(1, 14, 3, 4, RED[1]); p.set(1, 14, RED[2])
    # ruedas
    wheel(p, 16, 32); wheel(p, 50, 32)
    if snowy:
        rrect(p, 18, 1, 24, 5, 3, SNOW[3]); p.hline(19, 40, 6, SNOW[1])
        for x in range(42, 62):
            p.set(x, 9, SNOW[3]); p.set(x, 10, SNOW[2] if x % 3 else SNOW[3])
        for x in range(4, 19):
            p.set(x, 11, SNOW[3])
        p.hline(6, 60, 18, SNOW[2])
    p = ob.finish(p, (33, 38, 30, 2))
    return p


def colectivo(snowy=False):
    P = PAINT['bordo']
    p = Pix(100, 52)
    # costado: mitad inferior bordo, superior crema
    rrect(p, 2, 14, 94, 26, 5, CREAM[2])
    rrect(p, 2, 26, 94, 14, 4, P[2])
    p.hline(4, 93, 26, P[4]); p.hline(3, 94, 38, P[0]); p.hline(3, 94, 39, P[0])
    # frente redondeado a la derecha
    for y in range(14, 40):
        t = (y - 14) / 26
        cut = int(6 * (1 - math.sin(math.pi * min(1, t * 1.4) / 2)))
        for x in range(96 - cut, 100):
            p.set(x, y, (0, 0, 0, 0)) if False else None
    rrect(p, 86, 12, 12, 28, 6, CREAM[2])
    rrect(p, 86, 26, 12, 14, 5, P[2])
    for y in range(15, 25):                                  # parabrisas
        p.hline(90, 95, y, GLASS[2] if y < 18 else GLASS[1])
    p.circle(94, 31, 2.4, CHROME[2]); p.circle(94, 31, 1.4, WARM[1])   # faro
    rrect(p, 84, 36, 15, 4, 1, CHROME[2])                    # paragolpes
    # techo visto desde arriba
    rrect(p, 4, 4, 88, 11, 4, CREAM[3])
    p.hline(8, 88, 6, hx('#ffffff')); p.hline(6, 90, 13, CREAM[1])
    # cartel de recorrido arriba del parabrisas
    p.rect(80, 8, 14, 5, hx('#14121a')); p.hline(82, 91, 10, WARM[0])
    # ventanillas con parantes
    for k in range(8):
        x = 8 + k * 9
        rrect(p, x, 16, 7, 8, 1, GLASS[1])
        p.hline(x + 1, x + 4, 17, GLASS[3]); p.set(x + 1, 18, GLASS[2])
    p.rect(74, 16, 7, 18, GLASS[0]); p.vline(77, 16, 33, CHROME[1])       # puerta
    # guarda de fileteado: filete con volutas sobre la linea de cintura
    for x in range(6, 72):
        y = 29 + round(1.5 * math.sin(x * 0.45))
        p.set(x, y, WARM[0])
        if x % 9 == 0:
            p.set(x, y - 1, CREAM[3]); p.set(x + 1, y - 2, CREAM[3]); p.set(x - 1, y + 1, hx('#3a9a6a'))
    p.hline(6, 72, 33, CREAM[3])
    # ruedas y guardabarros
    for wx in (20, 76):
        p.ellipse(wx, 38, 9, 4, P[1])
        wheel(p, wx, 42, 6)
    p.rect(1, 22, 3, 4, RED[1])
    if snowy:
        rrect(p, 6, 2, 84, 6, 3, SNOW[3]); p.hline(8, 86, 8, SNOW[1])
        p.hline(86, 96, 11, SNOW[3])
    return ob.finish(p, (50, 49, 46, 2))


def build():
    os.makedirs(OUT, exist_ok=True)
    pieces = [sedan('teal'), sedan('bordo', True), sedan('celeste', True), colectivo(True)]
    from PIL import Image
    W = sum(s.w for s in pieces) + 12 * (len(pieces) + 1)
    H = max(s.h for s in pieces) + 16
    sheet = Image.new('RGBA', (W, H), (178, 206, 222, 255))
    x = 12
    for s in pieces:
        sheet.alpha_composite(s.img, (x, H - 8 - s.h)); x += s.w + 12
    sheet.resize((W * 4, H * 4), 0).save(os.path.join(OUT, 'vehicles_x4.png'))
    for i, s in enumerate(pieces):
        s.img.save(os.path.join(OUT, f'vehicle_{i}.png'))


if __name__ == '__main__':
    build()
    print('ok')
