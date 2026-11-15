"""Vista desde la ventana del altillo (pag. 019): ilustracion a pantalla completa.

Al interactuar con una ventana se abre una "vista": una ilustracion en pixel
art mas grande que el juego, enmarcada por la ventana. Esta es la de la noche
del choque: la esquina con el auto parado contra el farol, el otro volcado,
el cartel de calles, el chalet de enfrente, los pinos, el tapial con la mano
enguantada que cuelga, y la nevada que brilla.
"""
import math
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'tools', 'art'))
from pixel import Pix, hx, mix  # noqa: E402

OUT = os.path.join(HERE, 'out')
W, H = 480, 270
NIGHT = [hx('#07081a'), hx('#0e1228'), hx('#18203c')]
SNOW = [hx('#6f8ca8'), hx('#8eaec6'), hx('#b4d2e2'), hx('#d8eef6'), hx('#f4fcff')]
BRK = [hx('#3a1c22'), hx('#5a2a30'), hx('#7a3a3a'), hx('#965050')]
ROOF = [hx('#1e1626'), hx('#2a1e30'), hx('#3a2a42')]
PINE = [hx('#0e1a1c'), hx('#16282a'), hx('#22383a')]
CAR = [hx('#14262a'), hx('#1e3a3e'), hx('#2f5a5c'), hx('#4a8a86')]
CHROME = [hx('#5c6672'), hx('#a8b4c0'), hx('#e2ecf2')]
IRON = [hx('#101018'), hx('#22222e'), hx('#3a3a4a')]
WOOD = [hx('#2a1a12'), hx('#4a2e1c'), hx('#6e4628'), hx('#93603a')]
WARM = hx('#ffe0a0')


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


def sky(p, rnd):
    for y in range(H):
        p.hline(0, W - 1, y, mix(NIGHT[0], NIGHT[2], min(1, y / 160)))
    for _ in range(160):
        x, y = rnd.randrange(W), rnd.randrange(0, 110)
        p.set(x, y, mix(NIGHT[2], SNOW[4], 0.3 + rnd.random() * 0.6))


def far_row(p, rnd):
    x = -20
    while x < W:
        w = rnd.choice((50, 70, 90)); top = rnd.randrange(112, 132)
        c = mix(NIGHT[2], hx('#2a3450'), rnd.random())
        poly(p, [(x, 160), (x, top + 10), (x + w // 2, top), (x + w, top + 10), (x + w, 160)], c)
        for k in range(w // 2):
            p.set(x + k, top + 10 - k * 10 // (w // 2), SNOW[1])
        x += w - 6


def chalet(p):
    # muro de ladrillo
    p.rect(250, 128, 170, 80, BRK[1])
    for y in range(130, 208, 5):
        off = 0 if (y // 5) % 2 else 6
        p.hline(250, 419, y, BRK[0])
        for x in range(250 + off, 420, 12):
            p.vline(x, y + 1, y + 4, BRK[0])
    p.vline(250, 128, 207, BRK[3]); p.vline(419, 128, 207, BRK[0])
    # techo a dos aguas cargado de nieve
    poly(p, [(236, 132), (335, 70), (434, 132)], ROOF[1])
    poly(p, [(240, 128), (335, 72), (430, 128), (418, 124), (335, 80), (252, 124)], SNOW[3])
    poly(p, [(256, 124), (335, 82), (414, 124), (400, 122), (335, 90), (270, 122)], SNOW[2])
    p.rect(372, 70, 14, 34, BRK[2]); p.rect(370, 66, 18, 6, SNOW[4]); p.vline(385, 72, 103, BRK[0])
    # ventanas oscuras con postigos, una puerta
    for wx in (272, 372):
        p.rect(wx - 8, 146, 6, 30, CAR[1]); p.rect(wx + 26, 146, 6, 30, CAR[1])
        p.rect(wx, 146, 24, 30, NIGHT[1]); p.frame(wx, 146, 24, 30, WOOD[2])
        p.vline(wx + 12, 146, 175, WOOD[2]); p.hline(wx, wx + 23, 160, WOOD[2])
        p.hline(wx - 2, wx + 25, 176, SNOW[3])
    p.rect(318, 160, 30, 48, WOOD[1]); p.frame(318, 160, 30, 48, WOOD[0])
    p.rect(322, 166, 22, 18, WOOD[2]); p.rect(339, 186, 3, 3, CHROME[1])


def pine(p, cx, base, h):
    p.rect(cx - 3, base - 12, 6, 12, WOOD[0])
    tiers = 6
    for t in range(tiers):
        top = base - h + t * h // (tiers + 1)
        bot = top + h // 3
        half = 8 + t * (h // 14)
        poly(p, [(cx, top), (cx + half, bot), (cx - half, bot)], PINE[1] if t % 2 else PINE[2])
        poly(p, [(cx, top), (cx + half - 2, bot - 3), (cx - half + 2, bot - 3)], PINE[0])
        p.hline(cx - half + 3, cx - 2, bot - 2, SNOW[3]); p.hline(cx - half + 1, cx + 2, bot - 1, SNOW[2])
    p.set(cx, base - h, SNOW[4])


def ground(p):
    for y in range(206, H):
        p.hline(0, W - 1, y, mix(SNOW[2], SNOW[3], (y - 206) / 64))
    for k, (cx, cy, rx) in enumerate(((90, 214, 70), (210, 220, 50), (420, 212, 80))):
        p.ellipse(cx, cy, rx, 6, SNOW[3]); p.hline(cx - rx // 2, cx + rx // 2, cy - 5, SNOW[4])


def lamppost(p):
    p.rect(146, 40, 8, 176, IRON[1]); p.vline(146, 40, 215, IRON[2])
    p.rect(140, 210, 20, 6, IRON[0])
    p.rect(136, 22, 28, 18, IRON[1]); p.rect(140, 26, 20, 12, WARM); p.rect(134, 18, 32, 5, SNOW[4])
    for y in range(0, 80):                                         # halo de la farola
        for x in range(100, 200):
            d = math.hypot(x - 150, (y - 32) * 1.25) / 46
            if d < 1:
                c = p.get(x, y)
                p.set(x, y, mix(c[:3], WARM, 0.22 * (1 - d) ** 2))


def car_upright(p):
    """El auto del 50 parado sobre la cola contra el farol (pag. 019): se ve la
    trompa desde arriba: paragolpes y parrilla cromada, faros redondos, el capot
    abombado bajando hacia el parabrisas, guardabarros redondeados."""
    cx = 186
    # carroceria: ancha en los guardabarros, mas angosta en el techo (abajo)
    rows = []
    for y in range(84, 214):
        t = (y - 84) / 130
        half = 30 - int(8 * t) + (3 if 96 < y < 128 else 0)
        rows.append((y, half))
    for y, half in rows:
        lean = int((y - 84) * 0.12)
        x0, x1 = cx - half + lean, cx + half + lean
        p.hline(x0, x1, y, CAR[1])
        p.hline(x0, x0 + 4, y, CAR[3]); p.hline(x0 + 5, x0 + 10, y, CAR[2])     # luz del lado izquierdo
        p.hline(x1 - 5, x1, y, CAR[0])
    # paragolpes cromado y parrilla
    p.rect(156, 86, 62, 6, CHROME[1]); p.hline(156, 217, 86, CHROME[2]); p.hline(156, 217, 91, CHROME[0])
    p.rect(166, 94, 42, 12, IRON[0])
    for x in range(168, 207, 4):
        p.vline(x, 95, 105, CHROME[1])
    p.hline(166, 207, 94, CHROME[2])
    # faros redondos con aro cromado (uno encendido, el otro roto)
    for (fx, lit) in ((160, True), (212, False)):
        p.circle(fx, 102, 6, CHROME[1]); p.circle(fx, 102, 4.5, WARM if lit else hx('#2a3440'))
        p.set(fx - 2, 100, hx('#ffffff') if lit else CHROME[0])
    # patente
    p.rect(176, 108, 22, 8, hx('#e8e4d8')); p.frame(176, 108, 22, 8, IRON[1])
    p.hline(178, 195, 111, IRON[1]); p.hline(178, 190, 113, IRON[1])
    # capot abombado con la moldura central y el adorno
    for y in range(118, 150):
        lean = int((y - 84) * 0.12)
        p.set(cx + lean, y, CAR[3]); p.set(cx + 1 + lean, y, CAR[0])
    p.rect(cx - 1 + 4, 116, 4, 3, CHROME[2])
    # parabrisas partido, techo y luneta hacia abajo
    for y in range(152, 176):
        lean = int((y - 84) * 0.12)
        half = 20 - (y - 152) // 6
        p.hline(cx - half + lean, cx + half + lean, y, hx('#34526a'))
        p.set(cx + lean, y, CAR[0])
        if y < 158:
            p.hline(cx - half + lean + 3, cx - half + lean + 8, y, hx('#6e92ac'))
    # ruedas asomando a los costados
    p.ellipse(150, 196, 6, 13, IRON[0]); p.ellipse(222, 192, 6, 13, IRON[0])
    p.ellipse(150, 196, 2.5, 6, CHROME[0]); p.ellipse(222, 192, 2.5, 6, CHROME[0])
    # nieve sobre el paragolpes y los guardabarros
    p.rect(154, 80, 66, 6, SNOW[4]); p.hline(158, 214, 79, SNOW[3])
    for (x0, x1, y) in ((150, 162, 124), (210, 224, 128)):
        p.hline(x0, x1, y, SNOW[3]); p.hline(x0 + 2, x1 - 2, y - 1, SNOW[4])


def car_overturned(p):
    """El otro auto, volcado: panza arriba con el chasis, el escape y las ruedas al aire."""
    pts = []
    for x in range(262, 450):
        t = (x - 262) / 188
        top = 214 - int(14 * math.sin(math.pi * t))           # techo redondo (abajo) / panza arriba
        pts.append((x, top))
    for x, top in pts:
        p.vline(x, top, 248, CAR[1])
        p.set(x, top, CAR[3]); p.set(x, top + 1, CAR[2])
        p.vline(x, 240, 248, CAR[0])
    p.rect(276, 214, 160, 6, IRON[1]); p.hline(276, 435, 214, IRON[2])   # chasis
    p.rect(300, 208, 70, 3, IRON[0]); p.circle(372, 209, 2, CHROME[0])     # escape
    for wx in (296, 412):
        p.ellipse(wx, 204, 14, 9, IRON[0]); p.ellipse(wx, 203, 6, 4, CHROME[1]); p.set(wx - 2, 201, CHROME[2])
        p.ellipse(wx, 196, 13, 3.5, SNOW[3]); p.hline(wx - 8, wx + 6, 194, SNOW[4])
    p.rect(264, 238, 184, 4, CHROME[1]); p.hline(264, 447, 238, CHROME[2])   # moldura cromada
    for x in range(268, 446, 2):                                          # vidrios rotos al pie
        if (x * 7) % 5 == 0:
            p.set(x, 250, hx('#a8c4d8'))
    p.hline(266, 446, 212, SNOW[4]); p.hline(270, 440, 213, SNOW[3])


def corner_sign(p):
    p.rect(232, 60, 4, 150, IRON[1])
    p.rect(204, 58, 60, 12, hx('#e8e4d8')); p.frame(204, 58, 60, 12, IRON[0])
    for x in range(210, 258, 6):
        p.rect(x, 62, 4, 4, IRON[1])
    p.rect(222, 74, 26, 30, hx('#e8e4d8')); p.frame(222, 74, 26, 30, IRON[0])
    for y in range(80, 100, 6):
        p.rect(226, y, 18, 3, IRON[1])
    p.hline(204, 263, 57, SNOW[4]); p.hline(222, 247, 73, SNOW[4])


def wall_with_hand(p):
    """Tapial bajo con la mano enguantada colgando, cubierta de nieve."""
    p.rect(330, 230, 150, 40, BRK[1])
    for y in range(232, 270, 6):
        off = 0 if (y // 6) % 2 else 7
        p.hline(330, 479, y, BRK[0])
        for x in range(330 + off, 480, 14):
            p.vline(x, y + 1, y + 5, BRK[0])
    p.rect(326, 224, 154, 8, SNOW[4]); p.hline(326, 479, 231, SNOW[2])
    # mano: palma sobre el borde, dedos colgando
    glove = [hx('#2a2830'), hx('#3e3c46'), hx('#5a5866')]
    p.ellipse(392, 230, 18, 7, glove[1])
    for k, fx in enumerate((378, 387, 396, 405)):
        ln = 18 + (k % 2) * 5
        p.rect(fx, 232, 7, ln, glove[1]); p.vline(fx, 232, 231 + ln, glove[2]); p.rect(fx, 231 + ln, 7, 2, glove[0])
    p.hline(380, 406, 225, SNOW[4]); p.hline(384, 400, 226, SNOW[3])


def snowfall(p, rnd, n=520):
    for _ in range(n):
        x, y = rnd.randrange(W), rnd.randrange(H)
        big = rnd.random()
        if big > 0.93:
            for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1)):
                p.set(x + dx, y + dy, SNOW[4])
            for dx, dy in ((-1, 0), (2, 0), (0, -1), (0, 2), (1, -1), (1, 2), (-1, 1), (2, 1)):
                if 0 <= x + dx < W and 0 <= y + dy < H:
                    c = p.get(x + dx, y + dy)
                    p.set(x + dx, y + dy, mix(c[:3], hx('#bdeffa'), 0.45))
        elif big > 0.6:
            p.set(x, y, SNOW[4])
        else:
            c = p.get(x, y)
            p.set(x, y, mix(c[:3], SNOW[3], 0.7))


def window_frame(p, b=22, m=10):
    """La ventana del altillo: marco de madera, cruz de cuatro vidrios,
    reflejo de la lampara en el vidrio y escarcha en las esquinas."""
    for (x, y, w, h) in ((0, 0, W, b), (0, H - b, W, b), (0, 0, b, H), (W - b, 0, b, H),
                         (W // 2 - m // 2, 0, m, H), (0, H // 2 - m // 2, W, m)):
        p.rect(x, y, w, h, WOOD[2])
    for x0, x1 in ((b - 1, b - 1), (W - b, W - b), (W // 2 - m // 2 - 1, W // 2 - m // 2 - 1),
                   (W // 2 + m // 2, W // 2 + m // 2)):
        p.vline(x0, 0, H - 1, WOOD[0])
    for y0 in (b - 1, H - b, H // 2 - m // 2 - 1, H // 2 + m // 2):
        p.hline(0, W - 1, y0, WOOD[0])
    p.hline(0, W - 1, 2, WOOD[3]); p.vline(2, 0, H - 1, WOOD[3])
    p.hline(b, W - b, H // 2 - m // 2, WOOD[3]); p.vline(W // 2 - m // 2, b, H - b, WOOD[3])
    for k in range(0, W, 9):                                          # veta de la madera
        p.set(k, 9, WOOD[1]); p.set(k + 4, H - 10, WOOD[1])
    # reflejo calido de la lampara del altillo y vetas de luz en el vidrio
    for (gx, gy) in ((b, b), (W // 2 + m // 2 + 1, b), (b, H // 2 + m // 2 + 1), (W // 2 + m // 2 + 1, H // 2 + m // 2 + 1)):
        for k in range(0, 40, 2):
            x, y = gx + 20 + k, gy + 6 + k
            if x < W - b and y < H - b:
                c = p.get(x, y); p.set(x, y, mix(c[:3], hx('#ffffff'), 0.10))
    for y in range(b, H // 2 - m // 2):                              # reflejo de la lampara del altillo
        for x in range(b, W // 2 - m // 2):
            d = math.hypot(x - 96, (y - 92) * 1.4) / 30
            if d < 1:
                c = p.get(x, y); p.set(x, y, mix(c[:3], WARM, 0.16 * (1 - d) ** 2))
    # escarcha en las esquinas de cada vidrio
    for (cx, cy, sx, sy) in ((b, b, 1, 1), (W - b - 1, b, -1, 1), (b, H - b - 1, 1, -1), (W - b - 1, H - b - 1, -1, -1)):
        for i in range(18):
            for j in range(18 - i):
                if (i * 7 + j * 3) % 5 < 2:
                    x, y = cx + sx * i, cy + sy * j
                    c = p.get(x, y); p.set(x, y, mix(c[:3], SNOW[4], 0.35 * (1 - (i + j) / 18)))


def place_new_cars(p):
    """Los autos nuevos (vista 3/4) a doble tamano: uno parado contra la farola,
    nariz arriba; el otro volcado con las ruedas al aire."""
    sys.path.insert(0, HERE)
    import vehicles as vh
    from PIL import Image
    up = vh.sedan('teal', True).img.rotate(84, expand=True, resample=Image.NEAREST)
    up = up.resize((up.width * 2, up.height * 2), Image.NEAREST)
    p.img.alpha_composite(up, (152, 214 - up.height))
    over = vh.sedan('celeste', False).img.transpose(Image.FLIP_TOP_BOTTOM)
    over = over.resize((over.width * 2, over.height * 2), Image.NEAREST)
    p.img.alpha_composite(over, (300, 250 - over.height + 20))
    p.px = p.img.load()
    for x in range(300, 300 + over.width):                         # nieve sobre la panza
        for y in range(250 - over.height + 20, 270):
            c = p.get(x, y)
            if c[3] and c[:3] != SNOW[3]:
                p.set(x, y - 1, SNOW[3]); p.set(x, y - 2, SNOW[4]); break


def build():
    rnd = random.Random(19)
    p = Pix(W, H)
    sky(p, rnd)
    far_row(p, rnd)
    pine(p, 64, 214, 150)
    chalet(p)
    pine(p, 452, 210, 120)
    ground(p)
    corner_sign(p)
    lamppost(p)
    place_new_cars(p)
    wall_with_hand(p)
    snowfall(p, rnd)
    window_frame(p)
    os.makedirs(OUT, exist_ok=True)
    p.img.save(os.path.join(OUT, 'view_attic_window.png'))
    p.img.resize((W * 2, H * 2), 0).save(os.path.join(OUT, 'view_attic_window_x2.png'))



# ------------------------------------------------------------ vista con el motor del juego
def build_game_view():
    """La vista desde el altillo dibujada con los sprites del juego (3/4 desde
    arriba) a doble tamano: la casa de enfrente con volumen, el choque como
    caos (un auto dado vuelta contra la farola doblada, otro volcado), vidrios,
    restos, marcas de frenada, humo, y el cadaver caido sobre el tapial con la
    mano enguantada colgando (pag. 019)."""
    sys.path.insert(0, HERE)
    import houses as hs
    import vehicles as vh
    import street as st
    from PIL import Image
    w, h = 240, 135
    sc = Pix(w, h)
    rnd = random.Random(1957)
    # cielo y techos lejanos
    for y in range(h):
        sc.hline(0, w - 1, y, mix(NIGHT[0], NIGHT[2], min(1, y / 40)))
    for _ in range(50):
        sc.set(rnd.randrange(w), rnd.randrange(0, 16), SNOW[3])
    for x0, ww, top in ((0, 40, 18), (36, 50, 14), (180, 60, 16)):
        poly(sc, [(x0, 34), (x0, top + 6), (x0 + ww // 2, top), (x0 + ww, top + 6), (x0 + ww, 34)], hx('#1c2238'))
        for k in range(ww // 2):
            sc.set(x0 + k, top + 6 - k * 6 // (ww // 2), SNOW[1])
    # jardin nevado, vereda, cordon y calle
    for y in range(30, h):
        for x in range(w):
            if y < 84:
                c = SNOW[2] if (x * 7 + y * 3) % 19 else SNOW[3]
            elif y < 96:
                c = SNOW[2] if ((x // 16) + (y // 16)) % 2 else SNOW[1]
                if x % 16 == 0:
                    c = SNOW[0]
            elif y < 99:
                c = hx('#5a6a80')
            else:
                c = hx('#262b3e') if (x + y) % 31 else hx('#30364c')
            sc.set(x, y, c)
    # la casa de enfrente (con volumen) y un pino
    house = hs.chalet_salvo_deep(41)
    house.img = house.img.transpose(Image.FLIP_LEFT_RIGHT); house.px = house.img.load()
    st.place(sc, house, 118, 76, k=0.5, shear=0.25, a=0.3)
    st.place(sc, st.pino(), 84, 84)
    st.place(sc, st.pino(), 222, 84)
    # tapial con el cadaver caido encima, el brazo colgando hacia la vereda
    t = st.tapial(110); st.place(sc, t, 110, 92, a=0.38)
    coat = [hx('#141218'), hx('#24222c'), hx('#3a3846')]
    bx, by = 132, 68
    sc.ellipse(bx + 14, by + 4, 16, 5, coat[1])                                   # torso y piernas sobre el tapial
    sc.hline(bx + 2, bx + 26, by + 1, coat[2]); sc.hline(bx + 4, bx + 24, by + 8, coat[0])
    sc.rect(bx + 26, by + 3, 10, 4, coat[1]); sc.rect(bx + 34, by + 4, 3, 3, hx('#1e1814'))   # zapato
    sc.ellipse(bx - 1, by + 5, 4, 4, hx('#4a3a32')); sc.ellipse(bx - 2, by + 4, 2, 2, hx('#6a5446'))  # cabeza
    for k in range(16):                                                            # el brazo que cuelga
        x = bx + 6 + (1 if k > 8 else 0)
        sc.set(x, by + 9 + k, coat[1]); sc.set(x + 1, by + 9 + k, coat[0]); sc.set(x - 1, by + 9 + k, coat[2])
    glove = hx('#2a2830')
    sc.rect(bx + 4, by + 25, 6, 4, glove)                                          # mano enguantada
    for fx in (bx + 4, bx + 6, bx + 8, bx + 9):
        sc.vline(fx, by + 29, by + 31, glove)
    for x in range(bx + 2, bx + 28, 2):
        sc.set(x, by, SNOW[3]); sc.set(x + 1, by, SNOW[4])                         # nieve sobre la espalda
    # marcas de frenada que se cruzan
    for k in range(70):
        x = 20 + k * 2; y = 122 - int(14 * math.sin(k / 70 * math.pi * 0.8))
        sc.set(x, y, hx('#14182a')); sc.set(x, y + 4, hx('#14182a'))
    # farola doblada sobre la vereda
    for k in range(40):
        x = 40 + (k * k) // 90; y = 94 - k
        sc.set(x, y, IRON[1]); sc.set(x + 1, y, IRON[2])
    sc.rect(52, 50, 8, 4, IRON[1]); sc.rect(53, 54, 6, 2, hx('#3a3a2a'))          # farol apagado, roto
    # auto dado vuelta contra la farola (panza arriba, girado)
    a = vh.sedan('teal', False).img.transpose(Image.FLIP_TOP_BOTTOM).rotate(-16, expand=True, resample=Image.NEAREST)
    sc.img.alpha_composite(a, (24, 64)); sc.px = sc.img.load()
    # otro auto volcado de costado en la calle
    b = vh.sedan('bordo', False).img.rotate(100, expand=True, resample=Image.NEAREST)
    sc.img.alpha_composite(b, (150, 82)); sc.px = sc.img.load()
    # restos: vidrios, un paragolpes, una taza que rodo, papeles
    for _ in range(40):
        x, y = rnd.randrange(30, 200), rnd.randrange(100, 132)
        sc.set(x, y, hx('#bfe0ee') if rnd.random() < .6 else hx('#7a96aa'))
    sc.rect(110, 118, 16, 2, CHROME[1]); sc.hline(110, 125, 118, CHROME[2])
    sc.circle(132, 112, 3, CHROME[1]); sc.set(131, 111, CHROME[2])
    sc.rect(96, 104, 5, 3, hx('#e8e4d8')); sc.rect(140, 126, 4, 3, hx('#e8e4d8'))
    # humo que sale del auto dado vuelta
    for k in range(18):
        x = 60 + int(4 * math.sin(k * 0.6)) + k // 3; y = 66 - k * 2
        sc.set(x, y, hx('#8a92a4')); sc.set(x + 1, y, hx('#6a7286'))
    # cartel de esquina torcido
    for k in range(30):
        sc.set(212 + k // 10, 96 - k, IRON[1])
    sc.rect(204, 62, 22, 5, hx('#e8e4d8')); sc.hline(206, 222, 64, IRON[1])
    # nevada
    for _ in range(140):
        x, y = rnd.randrange(w), rnd.randrange(h)
        sc.set(x, y, SNOW[4] if rnd.random() < .6 else SNOW[3])
    big = sc.img.resize((w * 2, h * 2), Image.NEAREST)
    frame = Pix(480, 270); frame.img = big.convert('RGBA'); frame.px = frame.img.load()
    window_frame(frame, b=12, m=6)
    frame.img.save(os.path.join(OUT, 'view_attic_game.png'))
    frame.img.resize((960, 540), Image.NEAREST).save(os.path.join(OUT, 'view_attic_game_x2.png'))
    return frame


# ------------------------------------------------------------ panoramica (pag. 020)
def fallen(coat_hex, hair_hex, seed=0):
    """Una persona caida boca abajo en la nieve, con su abrigo."""
    rnd = random.Random(seed)
    p = Pix(26, 12)
    coat = hx(coat_hex)
    p.ellipse(13, 6, 9, 3.2, coat); p.hline(6, 18, 4, mix(coat, hx('#ffffff'), 0.2))
    p.rect(20, 5 + rnd.choice((0, 1)), 5, 2, coat); p.rect(24, 5, 2, 2, hx('#bb7f68'))
    p.ellipse(5, 6, 2.6, 2.4, hx(hair_hex))
    p.rect(17, 8, 7, 2, mix(coat, hx('#000000'), 0.3))
    p.hline(3, 22, 2, SNOW[3])
    import objects as ob
    return ob.finish(p, (13, 11, 11, 1))


def own_roof(sc, y0, w, h):
    """Nuestro propio techo visto desde la buhardilla: un manto de nieve limpio
    con ondas suaves, tejas que asoman en pocas filas, el borde del alero
    marcado y nuestra chimenea en primer plano."""
    tiles = [hx('#1e1828'), hx('#2c2236'), hx('#3a2e46')]
    for y in range(y0, h):
        for x in range(w):
            band = (y - y0)
            wave = int(3 * math.sin(x * 0.03 + band * 0.2))
            c = SNOW[2] if (band + wave) % 14 < 11 else SNOW[1]
            if band > 34 and (x // 40 + band // 9) % 5 == 0:          # tejas que asoman
                c = tiles[1] if band % 4 else tiles[0]
            sc.set(x, y, c)
    for x in range(w):                                                 # borde del alero
        sc.set(x, y0, SNOW[4]); sc.set(x, y0 + 1, SNOW[3]); sc.set(x, y0 + 2, SNOW[0])
    cx0 = 30                                                           # nuestra chimenea
    for y in range(y0 - 40, h):
        for x in range(cx0, cx0 + 30):
            row = (y - (y0 - 40)) // 4
            col = (x - cx0 + (4 if row % 2 else 0)) // 8
            c = BRK[2] if (row + col) % 3 else BRK[1]
            if (y - (y0 - 40)) % 4 == 3 or (x - cx0 + (4 if row % 2 else 0)) % 8 == 0:
                c = BRK[0]
            if x > cx0 + 23:
                c = mix(c, hx('#140c18'), 0.5)
            sc.set(x, y, c)
    sc.rect(cx0 - 4, y0 - 46, 38, 7, SNOW[4]); sc.hline(cx0 - 4, cx0 + 33, y0 - 39, SNOW[1])


def build_panorama():
    sys.path.insert(0, HERE)
    import street as st
    import houses as hs
    import vehicles as vh
    import trees as tr
    from PIL import Image
    PW, PH = 960, 300
    st.W, st.H = PW, PH
    rnd = random.Random(1957)
    sc = Pix(PW, PH)
    st.backdrop(sc, rnd, y_base=52)
    st.ground(sc, rnd)
    sc.px = sc.img.load()
    # casas de enfrente con volumen, alternadas y espejadas
    xs = 0; k = 0
    while xs < PW:
        if k % 2 == 0:
            hspr = hs.chalet_salvo_deep(7 + k * 5)
        else:
            hspr = hs.chalet_californiano(11 + k * 5)
        if k % 3 == 2:
            hspr.img = hspr.img.transpose(Image.FLIP_LEFT_RIGHT); hspr.px = hspr.img.load()
        st.place(sc, hspr, xs, 140 if k % 2 == 0 else 136, k=0.5, shear=0.25, a=0.3)
        if k % 2 == 1:
            st.place(sc, tr.pine(True, glow=(k % 4 == 1), seed=k * 3, w=30, h=54), xs + hspr.w - 6, 148)
        xs += hspr.w + 24; k += 1
    for x0 in range(0, PW, 130):                                       # tapiales y cercos
        t = st.tapial(56); st.place(sc, t, x0, 152, a=0.38); st.drift(sc, x0, x0 + 56, 153, rnd)
        st.place(sc, st.ob.fence(), x0 + 70, 152)
    for x, b in ((150, 172), (430, 172), (700, 172)):
        st.place(sc, st.farola(), x, b, k=0.5, shear=0.6)
    # calle: huellas de ruedas y montones sobre el cordon
    for y0 in (186, 192, 206, 212):
        for x in range(PW):
            if (x // 3 + y0) % 7:
                sc.set(x, y0, hx('#1e2232'))
    # autos abandonados en el medio de la calle, el colectivo con las luces prendidas
    st.place(sc, vh.colectivo(True), 40, 214)
    for xh in range(160, 200):                                         # haz de los faros en la nieve
        for yy in range(196, 208):
            c = sc.get(xh, yy); sc.set(xh, yy, mix(c[:3], hx('#ffe6a8'), 0.18 * (1 - (xh - 160) / 40)))
    st.place(sc, vh.sedan('celeste', True), 250, 210)
    st.place(sc, vh.sedan('teal', True), 520, 222)
    # la esquina del choque: farola doblada, un auto dado vuelta, otro de trompa
    for k2 in range(40):
        x = 760 + (k2 * k2) // 90; y = 172 - k2
        sc.set(x, y, IRON[1]); sc.set(x + 1, y, IRON[2])
    up = vh.sedan('teal', False).img.transpose(Image.FLIP_TOP_BOTTOM).rotate(-16, expand=True, resample=Image.NEAREST)
    sc.img.alpha_composite(up, (740, 176)); sc.px = sc.img.load()
    nose = vh.sedan('bordo', False).img.rotate(100, expand=True, resample=Image.NEAREST)
    sc.img.alpha_composite(nose, (850, 150)); sc.px = sc.img.load()
    st.place(sc, st.cartel_esquina(), 900, 176)
    for _ in range(60):                                                # vidrios rotos
        x, y = rnd.randrange(720, 920), rnd.randrange(186, 222)
        sc.set(x, y, hx('#bfe0ee') if rnd.random() < .6 else hx('#7a96aa'))
    # el cadaver caido sobre el tapial con la mano colgando (cerca del choque)
    coat = [hx('#141218'), hx('#24222c'), hx('#3a3846')]
    bx, by = 800, 136
    sc.ellipse(bx + 14, by + 4, 16, 5, coat[1]); sc.hline(bx + 2, bx + 26, by + 1, coat[2])
    sc.ellipse(bx - 1, by + 5, 4, 4, hx('#4a3a32'))
    for k2 in range(14):
        sc.set(bx + 6, by + 9 + k2, coat[1]); sc.set(bx + 7, by + 9 + k2, coat[0])
    sc.rect(bx + 4, by + 23, 6, 4, hx('#2a2830'))
    # gente caida en la vereda y en la calle
    for (x, y, c, hcol, s_) in ((330, 168, '#3a2a24', '#5a4030', 1), (600, 166, '#2a3a4a', '#d8d6d0', 2),
                                (470, 214, '#4a2a2a', '#3a2a20', 3), (650, 238, '#26252f', '#6a5446', 4)):
        st.place(sc, fallen(c, hcol, s_), x, y)
    st.place(sc, st.papel(), 380, 200, shadow=False); st.place(sc, st.papel(), 560, 196, shadow=False)
    # nuestro techo en primer plano, con la chimenea
    own_roof(sc, 246, PW, PH)
    # nevada fosforescente: copos chicos y algunos grandes con halo
    for _ in range(900):
        x, y = rnd.randrange(PW), rnd.randrange(PH)
        if rnd.random() < 0.08:
            for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1)):
                sc.set(x + dx, y + dy, SNOW[4]) if x + dx < PW and y + dy < PH else None
            for dx, dy in ((-1, 0), (2, 0), (0, -1), (0, 2), (2, 1), (1, 2), (-1, 1), (1, -1)):
                if 0 <= x + dx < PW and 0 <= y + dy < PH:
                    c = sc.get(x + dx, y + dy); sc.set(x + dx, y + dy, mix(c[:3], hx('#bdeffa'), 0.5))
        else:
            sc.set(x, y, SNOW[4] if rnd.random() < 0.6 else SNOW[3])
    sc.img.save(os.path.join(OUT, 'panorama.png'))
    sc.img.resize((PW, PH), Image.NEAREST).save(os.path.join(OUT, 'panorama_x1.png'))
    # lo que se ve por la ventana en un momento del paneo (enfocado en el choque)
    for name, x0 in (('view_pan_a', 0), ('view_pan_b', 480)):
        part = sc.img.crop((x0, 30, x0 + 480, 300))
        frame = Pix(480, 270); frame.img = part.convert('RGBA'); frame.px = frame.img.load()
        window_frame(frame, b=12, m=6)
        frame.img.resize((960, 540), Image.NEAREST).save(os.path.join(OUT, f'{name}_x2.png'))
    st.W, st.H = 480, 270


# ------------------------------------------------------------ vista desde el living (pag. 034)
def curtains(frame, w=480, h=270):
    """Cortinado de terciopelo bordo, en pixel art: cada pliegue es un tubo con
    luz y sombra (4 tonos, sin degradado); recogido al medio con cordon dorado
    y borla; abajo se abre; arriba una galeria con feston y borlitas."""
    V = [hx('#2a0e16'), hx('#4a1a24'), hx('#6e2a34'), hx('#94404a'), hx('#b8606a')]
    GOLD = [hx('#6a4a1a'), hx('#b08a3a'), hx('#e8c46a')]
    tie_y = 150
    for side in (0, 1):
        for y in range(18, h):
            if y < tie_y:
                width = int(58 - (y - 18) / (tie_y - 18) * 30)            # se angosta hacia el cordon
            else:
                width = int(28 + ((y - tie_y) / (h - tie_y)) ** 0.8 * 26)  # y se abre abajo
            folds = 2.5
            for i in range(width):
                ph = (i / max(1, width)) * folds * 2 * math.pi
                v = math.cos(ph + (0.0 if side == 0 else math.pi))
                k = 3 if v > 0.55 else 2 if v > -0.1 else 1 if v > -0.7 else 0
                if i == width - 1:
                    k = 0                                                 # borde interior oscuro
                if y > h - 5 and (i // 6) % 2 == 0:
                    k = max(0, k - 1)                                     # ruedo ondulado
                x = i if side == 0 else w - 1 - i
                c = V[k]
                if k == 3 and math.cos(ph + (0.0 if side == 0 else math.pi)) > 0.92:
                    c = V[4]                                              # brillo en la cresta del pliegue
                frame.set(x, y, c)
        # cordon dorado y borla
        for i in range(0, 32):
            x = i if side == 0 else w - 1 - i
            frame.set(x, tie_y, GOLD[1]); frame.set(x, tie_y + 1, GOLD[0]); frame.set(x, tie_y - 1, GOLD[2])
        bx = 30 if side == 0 else w - 31
        frame.rect(bx - 2, tie_y + 2, 5, 4, GOLD[1]); frame.hline(bx - 2, bx + 2, tie_y + 2, GOLD[2])
        for k in range(5):
            frame.vline(bx - 2 + k, tie_y + 6, tie_y + 14 + (k % 2) * 2, GOLD[1] if k % 2 else GOLD[0])
    # galeria arriba con feston
    for x in range(w):
        for y in range(0, 18):
            ph = (x / 24) * 2 * math.pi
            k = 3 if math.cos(ph) > 0.5 else 2 if math.cos(ph) > -0.3 else 1
            frame.set(x, y, V[k])
        scal = 18 + int(6 * abs(math.sin(math.pi * x / 24)))             # festones
        for y in range(18, scal):
            frame.set(x, y, V[1] if y < scal - 1 else V[0])
        frame.set(x, 2, GOLD[2]); frame.set(x, 3, GOLD[1])
    for x in range(12, w, 24):                                           # borlitas
        frame.vline(x, 24, 28, GOLD[1]); frame.set(x, 29, GOLD[2])


def build_living_view():
    sys.path.insert(0, HERE)
    import street as st
    import houses as hs
    import trees as tr
    from PIL import Image
    w, h = 240, 135
    sc = Pix(w, h)
    rnd = random.Random(34)
    st.W, st.H = w, h
    for y in range(h):
        sc.hline(0, w - 1, y, mix(NIGHT[0], NIGHT[2], min(1, y / 30)))
    for _ in range(40):
        sc.set(rnd.randrange(w), rnd.randrange(0, 20), SNOW[3])
    for y in range(26, h):                                                # jardines y calle
        for x in range(w):
            if y < 90:
                c = SNOW[2]
            elif y < 96:
                c = SNOW[1] if (x // 16) % 2 else SNOW[2]
            elif y < 98:
                c = hx('#5a6a80')
            elif y < 114:
                c = hx('#262b3e') if (x + y) % 31 else hx('#30364c')
            elif y < 117:
                c = hx('#5a6a80')
            else:
                c = SNOW[2] if (x * 7 + y) % 23 else SNOW[3]
            sc.set(x, y, c)
    for y0 in (102, 108):                                                 # huellas de ruedas
        for x in range(w):
            if (x // 3 + y0) % 7:
                sc.set(x, y0, hx('#1e2232'))
    # la casa de los Ramirez enfrente: nueva, hermetica; una vela en la ventana
    ram = hs.chalet_californiano(77)
    base = 88
    st.place(sc, ram, 62, base, k=0.5, shear=0.25, a=0.3)
    wx, wy = 62 + 72, base - ram.h + 68
    for yy in range(wy, wy + 18):
        for xx in range(wx, wx + 22):
            c = sc.get(xx, yy)
            sc.set(xx, yy, mix(c[:3], hx('#2a1c18'), 0.55))
    sc.ellipse(wx + 11, wy + 9, 9, 7, hx('#ffb040'))                       # luz de vela
    sc.ellipse(wx + 11, wy + 9, 5, 4, hx('#ffe6a8'))
    sc.rect(wx + 8, wy + 5, 5, 13, hx('#140c10'))                           # silueta de Ramirez
    sc.ellipse(wx + 10, wy + 4, 2.5, 3, hx('#140c10'))
    sc.rect(wx + 13, wy + 8, 3, 1, hx('#140c10')); sc.set(wx + 15, wy + 6, hx('#fff4c0'))   # candelabro
    st.place(sc, tr.pine(True, seed=21, w=30, h=54), 26, 90)
    st.place(sc, tr.pine(True, glow=True, seed=24, w=30, h=54), 196, 92)
    t = st.tapial(100); st.place(sc, t, 60, 94, a=0.38)
    import vehicles as vh
    st.place(sc, vh.sedan('celeste', True), 150, 116)                     # auto abandonado, tapado de nieve
    st.place(sc, fallen('#3a2a24', '#5a4030', 9), 40, 112)                # alguien caido en la calle
    # nuestro jardin en primer plano: portón, cerco y arbustos, mas grandes y cortados
    st.place(sc, st.ob.gate(), 100, 132)
    st.place(sc, st.tapial(90), 0, 134, a=0.38); st.place(sc, st.tapial(90), 150, 134, a=0.38)
    for x in (20, 190):
        st.place(sc, st.bush(30), x, 135)
    for _ in range(170):
        x, y = rnd.randrange(w), rnd.randrange(h)
        sc.set(x, y, SNOW[4] if rnd.random() < .6 else SNOW[3])
    st.W, st.H = 480, 270
    big = sc.img.resize((w * 2, h * 2), Image.NEAREST)
    frame = Pix(480, 270); frame.img = big.convert('RGBA'); frame.px = frame.img.load()
    window_frame(frame, b=12, m=6)
    curtains(frame)
    frame.img.resize((960, 540), Image.NEAREST).save(os.path.join(OUT, 'view_living_x2.png'))
    return frame


if __name__ == '__main__':
    build()
    print('ok')
