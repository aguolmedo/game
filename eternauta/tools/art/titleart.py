"""Fondo del titulo 480x270: Vicente Lopez de noche, sin texto.

Cielo estrellado, chalets bajos con techos a dos aguas nevados, UNA ventana
calida encendida, farol apagado, cerco y arboles; el tercio inferior queda
libre y oscuro para el menu.
"""
from math import sin
from random import Random
from pixel import Pix, hx, mix
import objects as O

SKY = [hx('#070913'), hx('#0a0d1c'), hx('#0f1428'), hx('#141a32')]
STAR = [hx('#5e6e94'), hx('#9fb4d4'), hx('#eaf6ff')]
SN = O.SN
HORIZON = 164


def _stars(p, rnd):
    for _ in range(96):
        x = rnd.randrange(1, 479)
        y = rnd.randrange(1, 146)
        r = rnd.random()
        c = STAR[0] if r < 0.58 else (STAR[1] if r < 0.88 else STAR[2])
        p.set(x, y, c)
        if r > 0.965:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                p.set(x + dx, y + dy, mix(c, SKY[1], 0.5))


def _treeline(p):
    for x in range(480):
        top = HORIZON - int(round(7 + 4 * sin(x / 23.0) + 2 * sin(x / 9.0 + 1.3)))
        p.vline(x, top, HORIZON - 1, hx('#101a30'))
        p.set(x, top, hx('#3e5a7c'))
        if x % 7 == 3:
            p.set(x, top + 1, hx('#20304c'))
    # un par de techos lejanos entre los arboles
    for (hx0, base, w) in ((58, HORIZON, 30), (356, HORIZON, 34)):
        hh = 14
        p.rect(hx0, base - hh, w, hh, hx('#0c1224'))
        cx = hx0 + w // 2
        for i in range(w // 2 + 1):
            yy = base - hh - i
            p.hline(cx - i, cx + i, yy, hx('#0c1224'))
            p.set(cx - i, yy - 1, hx('#2e4a6c'))
            p.set(cx + i, yy - 1, hx('#2e4a6c'))


def _ground(p, rnd):
    p.rect(0, HORIZON, 480, 270 - HORIZON, hx('#6e8ca8'))
    p.rect(0, HORIZON, 480, 14, hx('#7e9cb8'))
    p.hline(0, 479, HORIZON, hx('#a8c8dd'))
    p.rect(0, 206, 480, 30, hx('#647f9c'))
    p.hline(0, 479, 206, hx('#5a7590'))
    p.rect(0, 236, 480, 34, hx('#587392'))
    p.hline(0, 479, 236, hx('#506a88'))
    # lomas largas y chatas (no elipses cerradas)
    for (cy, h, c1, c2, seed) in ((178, 3, '#7896b0', '#88a6c0', 3),
                                  (198, 4, '#6a86a2', '#7a98b4', 7),
                                  (250, 3, '#52708e', '#5f7d9a', 11)):
        for x in range(480):
            top = cy + int(round(2 * sin((x + seed * 13) / 41.0)))
            p.vline(x, top, top + h, c2 if (x // 17) % 3 else c1)
            p.set(x, top, mix(hx(c2), SN[3], 0.25))
    for _ in range(34):
        x = rnd.randrange(1, 479)
        y = rnd.randrange(HORIZON + 4, 262)
        p.set(x, y, mix(SN[2], SN[0], rnd.choice((0.0, 0.25, 0.5))))


def _spill(p, cx, cy, rx, ry, col=(255, 192, 100), a=0.30):
    for y in range(int(cy - ry), int(cy + ry) + 1):
        for x in range(int(cx - rx), int(cx + rx) + 1):
            d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2
            if 0 <= d <= 1.0 and 0 <= x < p.w and 0 <= y < p.h:
                c = p.get(x, y)[:3]
                p.set(x, y, mix(c, col, a * (1.0 - d)))


def build():
    p = Pix(480, 270)
    rnd = Random(1957)
    p.rect(0, 0, 480, 58, SKY[0])
    p.rect(0, 58, 480, 58, SKY[1])
    p.rect(0, 116, 480, 30, SKY[2])
    p.rect(0, 146, 480, 18, SKY[3])
    _stars(p, rnd)
    _treeline(p)
    _ground(p, rnd)
    # casas: una principal con la unica ventana encendida, otra al borde
    main = O._chalet(96, 80, seed=1, storeys=2, wall='plaster', roofk=0, lit=0)
    p.paste(main, 168, 184 - main.h)
    right = O._chalet(64, 64, seed=6, storeys=1, wall='brick', roofk=1, lit=-1)
    p.paste(right, 398, 180 - right.h)
    left = O._chalet(64, 64, seed=4, storeys=1, wall='plaster', roofk=2, lit=-1)
    p.paste(left, 18, 182 - left.h)
    # arboles y cerco
    p.paste(O.tree_a(), 42, 202 - 48)
    p.paste(O.tree_b(), 300, 198 - 40)
    p.paste(O.tree_a(), 436, 190 - 48)
    for i in range(4):
        p.paste(O.fence(), 12 + i * 31, 190 - 16)
    p.paste(O.mailbox(), 292, 194 - 16)
    p.paste(O.streetlight(False), 326, 212 - 48)
    # monticulos al pie
    p.paste(O.snow_mound(), 8, 252 - 16)
    p.paste(O.snow_mound(), 356, 246 - 16)
    # unica luz calida: ventana del altillo + derrame sobre pared y nieve
    _spill(p, 187, 148, 15, 12, (255, 198, 112), 0.30)
    _spill(p, 190, 198, 30, 13, (255, 192, 104), 0.24)
    _spill(p, 190, 224, 46, 20, (255, 184, 96), 0.15)
    # copos
    for _ in range(74):
        x = rnd.randrange(0, 480)
        y = rnd.randrange(0, 268)
        p.set(x, y, mix(SN[3], SN[1], rnd.choice((0.0, 0.22, 0.5))))
    return p
