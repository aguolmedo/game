"""Mockup de la calle: Vicente Lopez, noche de la nevada (pags. 018-019, 024).

Una escena de 480x270 (una pantalla del juego) armada con los sprites que
ya existen y piezas nuevas pensadas desde el comic:
  - fondo poblado: segunda fila de techos con chimeneas, tanques de agua,
    pinos y postes con cables, casi en silueta contra la noche
  - chalets con jardincito, tapial bajo con reja o cerco de madera
  - farolas altas de brazo curvo (avenida, pag. 018)
  - cartel de esquina con el nombre de las calles (pag. 019)
  - la esquina del choque: auto parado contra el poste, otro volcado
  - el colectivo nocturno detenido, Polsky caido en la nieve (pag. 024)
  - medanos de nieve, papeles tirados, huellas
"""
import math
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'tools', 'art'))
import objects as ob  # noqa: E402
sys.path.insert(0, HERE)
import vehicles as vh  # noqa: E402
import houses as hs  # noqa: E402
import trees as tr  # noqa: E402
from pixel import Pix, hx, mix  # noqa: E402

OUT = os.path.join(HERE, 'out')
W, H = 480, 270

NIGHT = [hx('#0b0c1d'), hx('#121630'), hx('#1b2440')]
SNOW = [hx('#7896b0'), hx('#8eaec6'), hx('#a6c4d8'), hx('#c8e2ee'), hx('#eefaff')]
ROAD = [hx('#1e2232'), hx('#262b3e'), hx('#30364c')]
SIL = [hx('#151a2e'), hx('#1c2238'), hx('#262e48')]        # siluetas del fondo
WARM = [hx('#b87028'), hx('#ecab4c'), hx('#ffe8b0')]
BRK = [hx('#5a2a30'), hx('#7a3a3a'), hx('#965050')]


# ------------------------------------------------------------ piezas nuevas
def farola():
    """Farola alta de brazo curvo, como en la avenida (pag. 018)."""
    p = Pix(24, 56)
    p.rect(3, 50, 6, 3, ob.BK[1]); p.hline(3, 8, 50, ob.BK[2])
    p.rect(5, 10, 2, 41, ob.BK[1]); p.vline(5, 10, 50, ob.BK[2])
    for k in range(12):                                        # brazo curvo
        a = math.radians(180 + k * 8)
        x = 12 + round(7 * math.cos(a)); y = 11 + round(7 * math.sin(a))
        p.set(x, y, ob.BK[1]); p.set(x, y + 1, ob.BK[1])
    p.rect(16, 9, 6, 3, ob.BK[1]); p.hline(16, 21, 9, ob.BK[2])
    p.rect(17, 12, 4, 2, WARM[2]); p.hline(17, 20, 13, WARM[1])
    p.rect(16, 7, 6, 2, ob.SN[3])                               # nieve arriba
    return ob.finish(p, (6, 53, 5, 1))


def glow(p_scene, cx, cy, r, col, a=70):
    for y in range(int(cy - r), int(cy + r) + 1):
        for x in range(int(cx - r), int(cx + r) + 1):
            if 0 <= x < W and 0 <= y < H:
                d = math.hypot(x - cx, (y - cy) * 1.4) / r
                if d < 1:
                    c = p_scene.get(x, y)
                    t = (1 - d) ** 2 * a / 255
                    p_scene.set(x, y, mix(c[:3], col, t))


def cartel_esquina():
    """Poste con los carteles de las dos calles cruzados."""
    p = Pix(20, 40)
    p.rect(9, 6, 2, 33, ob.MT[1]); p.vline(9, 6, 38, ob.MT[2])
    p.rect(1, 3, 18, 4, hx('#e8e4d8')); p.frame(1, 3, 18, 4, ob.BK[1])
    p.hline(3, 16, 5, ob.BK[2])
    p.rect(6, 8, 9, 3, hx('#e8e4d8')); p.frame(6, 8, 9, 3, ob.BK[1])
    p.hline(8, 13, 9, ob.BK[2])
    p.hline(1, 18, 2, ob.SN[3])
    return ob.finish(p, (10, 39, 3, 1))


def pino_viejo():
    p = Pix(24, 44)
    p.rect(11, 36, 2, 6, ob.WD[1])
    for k, (y, w) in enumerate(((4, 3), (8, 5), (12, 7), (17, 8), (22, 10), (28, 11))):
        for yy in range(y, y + 7):
            ww = int(w * (yy - y + 2) / 8)
            p.hline(12 - ww, 11 + ww, yy, ob.GR[0] if yy > y + 3 else ob.GR[1])
        p.hline(12 - w + 1, 11 + w - 2, y + 1, ob.SN[2])          # nieve en cada rama
        p.hline(12 - w // 2, 11 + w // 2 - 1, y, ob.SN[3])
    p.set(12, 2, ob.SN[3]); p.set(11, 3, ob.SN[2]); p.set(12, 3, ob.SN[3])
    return ob.finish(p, (12, 42, 7, 2))


_PINE_SEED = [0]


def pino():
    _PINE_SEED[0] += 1
    k = _PINE_SEED[0]
    return tr.pine(True, glow=(k % 3 == 0), seed=k * 7, w=30, h=54)


def tapial(w=48):
    """Tapial bajo de ladrillo con reja de hierro y nieve encima."""
    p = Pix(w, 20)
    p.rect(0, 10, w, 10, BRK[1])
    for y in range(11, 20, 3):
        off = 0 if (y // 3) % 2 else 3
        for x in range(off, w, 6):
            p.vline(x, y, y + 2, BRK[0])
        p.hline(0, w - 1, y + 2, BRK[0])
    p.hline(0, w - 1, 10, BRK[2])
    for x in range(1, w, 4):                                    # reja
        p.vline(x, 2, 9, ob.BK[1]); p.set(x, 1, ob.BK[2])
    p.hline(0, w - 1, 3, ob.BK[1])
    p.hline(0, w - 1, 9, ob.SN[3])
    for x in range(0, w, 7):
        p.set(x, 8, ob.SN[2])
    return ob.finish(p, (w // 2, 19, w // 2 - 2, 1))


def auto_parado():
    """El auto del choque, parado contra el poste (pag. 019)."""
    base = vh.sedan('teal', True)
    img = base.img.rotate(78, expand=True)
    p = Pix(img.width, img.height); p.img = img; p.px = img.load()
    for x in range(p.w):
        for y in range(p.h):
            if p.get(x, y)[3]:
                p.set(x, y, ob.SN[3])                               # nieve arriba
                break
    return p


def auto_volcado():
    base = vh.sedan('celeste', False)
    img = base.img.transpose(1)                                      # panza arriba
    p = Pix(img.width, img.height + 4); p.img.alpha_composite(img, (0, 4)); p.px = p.img.load()
    for x in range(4, p.w - 4):
        for y in range(p.h):
            if p.get(x, y)[3]:
                p.set(x, y - 1, ob.SN[3]); p.set(x, y - 2, ob.SN[2]) if x % 3 else None
                break
    return p


def polsky_caido():
    """Polsky boca abajo en la nieve, saco oscuro, un brazo estirado (pag. 024)."""
    p = Pix(28, 12)
    coat = [hx('#26252f'), hx('#3a3946'), hx('#56556a')]
    p.ellipse(13, 6, 9, 3.2, coat[1]); p.hline(6, 18, 4, coat[2])
    p.rect(20, 5, 5, 2, coat[1]); p.rect(25, 5, 2, 2, hx('#bb7f68'))   # brazo y mano
    p.ellipse(5, 6, 2.6, 2.4, hx('#d8d6d0'))                          # pelo blanco
    p.rect(17, 8, 7, 2, coat[0])                                      # piernas
    p.hline(3, 24, 2, ob.SN[3])
    for x in range(4, 22, 3):
        p.set(x, 3, ob.SN[2])
    return ob.finish(p, (13, 11, 11, 1))


def papel():
    p = Pix(6, 4)
    p.rect(0, 0, 6, 4, hx('#e8e4d8')); p.hline(1, 4, 1, hx('#9a968c')); p.hline(1, 3, 2, hx('#9a968c'))
    return p


# ------------------------------------------------------------ fondo
def backdrop(p, rnd, y_base=44):
    """Segunda fila de casas en silueta: techos, chimeneas, tanques de agua,
    pinos, postes con cables, alguna ventana encendida."""
    for y in range(0, y_base + 8):
        t = y / (y_base + 8)
        p.hline(0, W - 1, y, mix(NIGHT[0], NIGHT[2], t * 0.8))
    for _ in range(90):                                              # estrellas
        p.set(rnd.randrange(W), rnd.randrange(0, 26), mix(NIGHT[2], SNOW[4], rnd.random() * 0.6))
    x = -10
    while x < W:
        w = rnd.choice((40, 48, 56, 64))
        h = rnd.choice((14, 18, 22))
        roof = rnd.choice(('gable', 'flat', 'gable'))
        top = y_base - h
        col = SIL[rnd.randrange(3)]
        p.rect(x, top, w, h + 8, col)
        if roof == 'gable':
            for k in range(w // 2):
                p.hline(x + k, x + w - 1 - k, top - k // 2, col)
            for k in range(w // 2):                                  # nieve en el techo
                p.set(x + k, top - k // 2, SNOW[1]); p.set(x + w - 1 - k, top - k // 2, SNOW[0])
        else:
            p.hline(x, x + w - 1, top, SNOW[1])
            tx = x + rnd.randrange(6, w - 14)                        # tanque de agua
            p.rect(tx, top - 9, 9, 7, col); p.hline(tx, tx + 8, top - 10, SNOW[2])
            p.vline(tx + 1, top - 2, top, col); p.vline(tx + 7, top - 2, top, col)
        if rnd.random() < 0.7:                                       # chimenea
            cx = x + rnd.randrange(8, max(9, w - 8))
            ch_top = top - (w // 4 if roof == 'gable' else 0) - 6
            p.rect(cx, ch_top, 4, 8, col); p.hline(cx, cx + 3, ch_top, SNOW[2])
        if rnd.random() < 0.35:                                      # ventana encendida
            wx = x + rnd.randrange(6, w - 10)
            p.rect(wx, top + 6, 4, 4, WARM[1]); p.hline(wx, wx + 3, top + 6, WARM[2])
        x += w + rnd.choice((0, 4, 10))
    for px_ in range(20, W, 120):                                    # postes y cables
        p.rect(px_, 6, 2, y_base, SIL[0]); p.hline(px_ - 5, px_ + 6, 9, SIL[0])
    for k in range(3):
        y0 = 9 + k * 2
        for x in range(W):
            sag = int(3 * math.sin(math.pi * ((x - 21) % 120) / 120))
            p.set(x, y0 + sag, mix(SIL[0], NIGHT[0], 0.2))
    for _ in range(9):                                               # copas de pinos
        cx = rnd.randrange(W); top = rnd.randrange(14, 26)
        for yy in range(top, y_base + 4):
            ww = (yy - top) // 2 + 1
            p.hline(cx - ww, cx + ww, yy, hx('#141d24'))
        p.set(cx, top, SNOW[2])


YARD, WALK, CURB, ROAD_END, WALK2 = 150, 170, 174, 224, 242


def ground(p, rnd):
    for y in range(44, H):
        for x in range(W):
            if y < YARD or y >= WALK2:
                c = SNOW[1] if (x * 7 + y * 3) % 23 else SNOW[2]
            elif y < WALK or ROAD_END <= y < WALK2:
                c = SNOW[2] if ((x // 16) + (y // 16)) % 2 else SNOW[1]
                if x % 16 == 0 or y % 16 == 4:
                    c = SNOW[0]
            elif y < CURB:
                c = SNOW[0] if y == WALK else hx('#5a6a80')
            else:
                c = ROAD[1] if (x + y) % 37 else ROAD[2]
            p.set(x, y, c)
    for _ in range(10):                                              # medanos sobre la calle
        cx = rnd.randrange(W); cy = rnd.randrange(CURB + 8, ROAD_END - 6)
        p.ellipse(cx, cy, rnd.randrange(14, 30), rnd.randrange(3, 5), SNOW[1])
        p.hline(cx - 6, cx + 6, cy - 3, SNOW[3])
    for x in range(30, 200, 7):                                      # huellas de Juan en la vereda
        p.set(x, WALK - 8 + (3 if (x // 7) % 2 else 0), SNOW[0])


SHADOW = hx('#3c4c70')


def cast_shadow(scene, spr, x, bottom, k=0.32, shear=0.45, a=0.42):
    """Sombra proyectada sobre el piso: la silueta aplastada y corrida hacia
    abajo a la derecha (luz desde arriba a la izquierda)."""
    done = set()
    h = spr.h
    for sy in range(h):
        for sx in range(spr.w):
            if spr.get(sx, sy)[3] < 200:
                continue
            up = (h - 1 - sy)
            gx = int(x + sx + up * shear)
            gy = int(bottom - 1 + up * k * 0.25)
            for yy in (gy, gy + 1):
                if (gx, yy) in done or not (0 <= gx < scene.w and 0 <= yy < scene.h):
                    continue
                done.add((gx, yy))
                c = scene.get(gx, yy)
                scene.set(gx, yy, mix(c[:3], SHADOW, a))


def place(scene, spr, x, bottom, shadow=True, **kw):
    if shadow:
        cast_shadow(scene, spr, x, bottom, **kw)
    scene.img.alpha_composite(spr.img, (int(x), int(bottom - spr.h)))


def drift(scene, x0, x1, y, rnd):
    """Nieve acumulada contra la base de un muro."""
    for x in range(int(x0), int(x1)):
        hgt = 2 + int(2 * math.sin(x * 0.21) + rnd.random())
        for k in range(hgt):
            scene.set(x, y - k, SNOW[3] if k == hgt - 1 else SNOW[2])


def roof_back(w, h, seed):
    """Techo de una casa de enfrente visto desde atras: manto de nieve limpio,
    tejas asomando solo en el alero, una chimenea. Sin ruido."""
    rnd = random.Random(seed)
    p = Pix(w, h)
    tile = [hx('#3a2a42'), hx('#4a3450'), hx('#2a1e30')]
    for y in range(h):
        inset = max(0, 6 - y)
        for x in range(inset, w - inset):
            c = SNOW[2] if x < w * 0.55 else SNOW[1]                   # luz a la izquierda
            if y >= h - 6:                                             # alero con tejas
                c = tile[(x // 5) % 2] if y > h - 5 else tile[2]
            p.set(x, y, c)
    for k in (8, 15):                                                  # dos ondas de nieve
        for x in range(6, w - 6):
            p.set(x, k + (1 if (x // 9) % 2 else 0), SNOW[1] if x < w * 0.55 else SNOW[0])
    p.hline(6, w - 7, 0, SNOW[4])
    cx = rnd.randrange(10, w - 14)
    p.rect(cx, 2, 6, 8, BRK[1]); p.hline(cx, cx + 5, 2, SNOW[4]); p.vline(cx + 5, 3, 9, BRK[0])
    return ob.finish(p)


def bush(w=22):
    p = Pix(w, 16)
    p.ellipse(w / 2, 10, w / 2 - 1, 6, hx('#1e3a34')); p.ellipse(w / 2 - 3, 8, w / 3, 4, hx('#2f5a4a'))
    p.ellipse(w / 2 - 1, 6, w / 2 - 3, 3, SNOW[3]); p.ellipse(w / 2 - 4, 5, w / 4, 1.6, SNOW[4])
    return ob.finish(p)


def build():
    rnd = random.Random(1957)
    scene = Pix(W, H)
    backdrop(scene, rnd, y_base=52)
    ground(scene, rnd)
    scene.px = scene.img.load()

    # --- casas con volumen (las nuevas), la de los Salvo primero
    salvo = hs.chalet_salvo_deep(7)
    cal = hs.chalet_californiano(11)
    cal2 = hs.chalet_californiano(23); cal2.img = cal2.img.transpose(0); cal2.px = cal2.img.load()
    salvo2 = hs.chalet_salvo_deep(31); salvo2.img = salvo2.img.transpose(0); salvo2.px = salvo2.img.load()
    for spr, x, bottom in ((salvo, 2, 140), (cal, 140, 136), (salvo2, 262, 140), (cal2, 392, 136)):
        place(scene, spr, x, bottom, k=0.5, shear=0.25, a=0.30)
    place(scene, pino(), 118, 146); place(scene, ob.tree_b(), 250, 148); place(scene, pino(), 372, 146)

    # --- tapiales, cercos y portones al frente de cada jardin
    for x0, w in ((0, 50), (146, 40), (270, 50)):
        t = tapial(w); place(scene, t, x0, 152, a=0.38); drift(scene, x0, x0 + w, 153, rnd)
    for x0 in (76, 196, 330, 420):
        place(scene, ob.fence(), x0, 152)
    place(scene, ob.gate(), 50, 154); place(scene, ob.mailbox(), 112, 156)
    place(scene, ob.hedge(), 226, 152)

    # --- vereda: farolas y un arbol
    lamps = [(150, 172), (390, 172)]
    for x, b in lamps:
        place(scene, farola(), x, b, k=0.5, shear=0.6)
    place(scene, ob.tree_a(), 300, 172)

    # --- calle (mas angosta): huellas, montones sobre los cordones, vehiculos
    for y0 in (186, 192, 206, 212):
        for x in range(W):
            if (x // 3 + y0) % 7:
                scene.set(x, y0, ROAD[0]); scene.set(x, y0 + 1, mix(ROAD[1], SNOW[0], 0.25))
    for x in range(0, W, 2):
        hgt = 2 + int(1.5 * math.sin(x * 0.1))
        for k in range(hgt):
            for xx in (x, x + 1):
                scene.set(xx, CURB + k, SNOW[2]); scene.set(xx, ROAD_END - 1 - k, SNOW[2])
    place(scene, cartel_esquina(), 444, 176)
    place(scene, auto_parado(), 452, 206)
    place(scene, vh.colectivo(True), 10, 214)
    place(scene, auto_volcado(), 340, 222)
    place(scene, vh.sedan('bordo', True), 214, 236)
    place(scene, papel(), 300, 200, shadow=False); place(scene, papel(), 318, 194, shadow=False)
    place(scene, papel(), 150, 218, shadow=False)
    place(scene, polsky_caido(), 140, 222)
    place(scene, ob.figure_snow(), 300, 216)

    # --- vereda de enfrente y sus jardines, cortados por el borde de abajo
    for x0, w in ((0, 72), (120, 60), (300, 90)):
        t = tapial(w); place(scene, t, x0, 254, a=0.38); drift(scene, x0, x0 + w, 255, rnd)
    place(scene, ob.gate(), 74, 256); place(scene, ob.fence(), 186, 254); place(scene, ob.fence(), 250, 254)
    place(scene, ob.streetlight(), 420, 250, k=0.5, shear=0.6)
    place(scene, ob.trash(), 396, 248)
    for x, b in ((20, 276), (150, 280), (260, 278), (436, 280)):
        place(scene, pino(), x, b)
    for x in (60, 100, 214, 330, 380):
        place(scene, bush(), x, 274)

    # luz: farolas y ventanas tibias sobre la nieve
    for x, b in lamps:
        glow(scene, x + 19, b - 44, 40, WARM[2], 70)

    # copos cayendo (dos tamanos) y brillo de la nieve
    for _ in range(260):
        x, y = rnd.randrange(W), rnd.randrange(H)
        scene.set(x, y, SNOW[4] if rnd.random() < 0.5 else SNOW[3])
        if rnd.random() < 0.15:
            scene.set(x + 1, y, SNOW[3]); scene.set(x, y + 1, SNOW[3])

    os.makedirs(OUT, exist_ok=True)
    scene.img.save(os.path.join(OUT, 'street_mockup.png'))
    scene.img.resize((W * 2, H * 2), 0).save(os.path.join(OUT, 'street_mockup_x2.png'))
    pieces = [farola(), cartel_esquina(), pino(), tapial(48), auto_parado(), auto_volcado(), polsky_caido()]
    wsum = sum(s.w for s in pieces) + 8 * (len(pieces) + 1)
    hmax = max(s.h for s in pieces) + 16
    sheet = Pix(wsum, hmax); x = 8
    for s in pieces:
        sheet.img.alpha_composite(s.img, (x, hmax - 8 - s.h)); x += s.w + 8
    sheet.img.resize((sheet.w * 4, sheet.h * 4), 0).save(os.path.join(OUT, 'street_pieces_x4.png'))


if __name__ == '__main__':
    build()
    print('ok')
