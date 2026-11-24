"""Arte de concepto del roguelike (diseño, NO toca el juego). 22/11.

Narrativa en docs/roguelike_narrativa.md:
  - El Eternauta viejo (el viajero) cae en el universo 16 bits: la tinta se CUANTIZA en píxeles.
  - El gag: aparece en la silla de al lado del programador, que está haciendo este juego.
  - La calle es el roguelike: botín (chatarra, goma, nafta, pieza de cascarudo) y la mochila
    que queda tirada en la nieve al morir ("esto es mío... de otra vez").

Todo parte de los sprites del juego (art/sprites/chars2, items, props): se recolorean y
se retocan pixel a pixel, con la misma regla de contorno de color (nunca negro).

Salida: art/concept/out/roguelike/*.png (sprites 1x y láminas escaladas).
"""
import os
import random

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SPR = os.path.join(ROOT, 'art', 'sprites')
OUT = os.path.join(HERE, 'out', 'roguelike')
os.makedirs(OUT, exist_ok=True)


def hx(h, a=255):
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def mix(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3)) + (a[3] if len(a) > 3 else 255,)


VIOLET = (26, 20, 38, 255)
WARM = (255, 244, 220, 255)


def dark(c, t):
    return mix(c, VIOLET, t)


def light(c, t):
    return mix(c, WARM, t)


def lum(c):
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def load(*p):
    return Image.open(os.path.join(SPR, *p)).convert('RGBA')


# piel del juego (no se recolorea)
SKIN = [hx('e2ab8c'), hx('bb7f68'), hx('f4caa8'), hx('8c5650')]
S_BASE, S_SH, S_HI, S_DEEP = SKIN
EYE = hx('1c1420')


def is_skin(c):
    return any(sum(abs(c[i] - s[i]) for i in range(3)) < 12 for s in SKIN)


def is_edge(px, w, h, x, y):
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nx, ny = x + dx, y + dy
        if not (0 <= nx < w and 0 <= ny < h) or px[nx, ny][3] < 128:
            return True
    return False


def remap(im, box, ramp, keep_skin=True, outline_lum=None):
    """Recolorea una zona por luminancia (por rango, no por valor) a una rampa
    [oscuro, sombra, base, luz]. El borde de la silueta pasa a contorno de color."""
    px = im.load()
    x0, y0, x1, y1 = box
    inner = [(x, y) for x in range(x0, x1) for y in range(y0, y1)
             if px[x, y][3] and not (keep_skin and is_skin(px[x, y])) and not is_edge(px, im.width, im.height, x, y)]
    vals = sorted({lum(px[x, y]) for x, y in inner})
    edges = [(x, y) for x in range(x0, x1) for y in range(y0, y1)
             if px[x, y][3] and not (keep_skin and is_skin(px[x, y])) and is_edge(px, im.width, im.height, x, y)]
    rank = {v: i for i, v in enumerate(vals)}
    n = max(1, len(vals) - 1)
    new = {}
    for x, y in inner:
        t = rank[lum(px[x, y])] / n
        new[(x, y)] = ramp[min(3, int(t * 3.999))][:3] + (px[x, y][3],)
    for x, y in edges:
        new[(x, y)] = dark(ramp[0], 0.45)[:3] + (px[x, y][3],)
    for (x, y), c in new.items():
        px[x, y] = c


def put(im, pts, c):
    px = im.load()
    for x, y in pts:
        if 0 <= x < im.width and 0 <= y < im.height:
            px[x, y] = c


# ------------------------------------------------------------------ personajes
# El Eternauta viejo (p014-p015): casi calvo con mechones blancos, arrugas hondas, ojos hundidos y
# cansados, manos grandes; "su ropa tiene una trama gruesa y áspera, como un tejido raro".
# Base: Lucas (el calvo del juego). Ropa: túnica de trama rara, gris verdoso apagado, que no es
# de ninguna época; un hilo cian del continuum en los bordes (lo único que trae de afuera).
TUNIC = [hx('3e3c3a'), hx('5f5d52'), hx('7f7c68'), hx('a29d84')]
TUNIC_WEAVE = hx('6c6a5a')
CONT = hx('9fdcee')                 # cian del continuum (el mismo de la nieve)
TUFT = [hx('c9c5bc'), hx('e9e6de'), hx('fbf8f0')]


def eternauta(view='abajo'):
    im = load('chars2', 'lucas', f'{view}_quieto_1.png')
    px = im.load()
    # ropa entera (saco + pantalón) a la trama rara
    remap(im, (0, 16, 16, 30), TUNIC)
    # trama: punteo en diagonal sobre la base, áspero
    for y in range(17, 29):
        for x in range(1, 15):
            if px[x, y][:3] == TUNIC[2][:3] and (x + 2 * y) % 4 == 0:
                px[x, y] = TUNIC_WEAVE
            elif px[x, y][:3] == TUNIC[1][:3] and (x + 2 * y) % 4 == 2:
                px[x, y] = TUNIC[0]
    if view == 'abajo':
        # la camisa y la corbata de Lucas pasan a ser túnica (base con trama)
        for y in range(16, 24):
            for x in range(4, 12):
                if not is_skin(px[x, y]):
                    px[x, y] = TUNIC[2] if (x + 2 * y) % 4 else TUNIC_WEAVE
        for y in range(17, 24):
            px[4, y] = TUNIC[1]; px[11, y] = TUNIC[1]
        put(im, [(7, y) for y in range(19, 24)], TUNIC[1])   # cruce de la túnica
        # cuello abierto: la V de piel donde Lucas tenía camisa y corbata
        for y, xs in ((16, range(6, 10)), (17, range(6, 10)), (18, range(7, 9))):
            for x in xs:
                px[x, y] = S_SH if y == 16 else S_BASE
        px[7, 19], px[8, 19] = TUNIC[1], TUNIC[1]
        # hilo del continuum en el ruedo y los puños
        put(im, [(3, 24), (12, 24)], CONT)
        put(im, [(4, 28), (11, 28)], dark(CONT, 0.35))
        # mechones blancos desgreñados a los costados (más que Lucas) y sobre las orejas
        put(im, [(1, 5), (1, 6), (2, 4), (13, 4), (14, 5), (14, 6)], TUFT[1])
        put(im, [(1, 7), (14, 7), (2, 8), (13, 8)], TUFT[0])
        put(im, [(0, 5), (15, 5)], dark(TUFT[0], 0.35))
        put(im, [(2, 3), (13, 3)], TUFT[2])
        # frente: dos arrugas largas
        put(im, [(5, 3), (6, 3), (8, 3), (9, 3), (10, 3)], S_SH)
        put(im, [(6, 5), (7, 5), (9, 5)], S_SH)
        # ojos hundidos y cansados: párpado caído (fila 7 piel oscura sobre el ojo)
        put(im, [(5, 7), (11, 7)], S_DEEP)
        put(im, [(4, 7), (10, 7), (6, 7), (12, 7)], S_SH)
        # cejas blancas, cortas y caídas hacia afuera
        put(im, [(4, 6), (5, 6), (10, 6), (11, 6)], TUFT[0])
        put(im, [(3, 7), (12, 7)], TUFT[0])
        put(im, [(3, 6), (12, 6), (6, 6), (9, 6)], S_BASE)
        # boca fina y cansada
        put(im, [(6, 13), (7, 13), (8, 13), (9, 13)], S_DEEP)
        put(im, [(5, 13), (10, 13)], S_SH)
    return im


def eternauta_sentado():
    """De frente, sentado en la silla de visitas: las piernas se acortan y se doblan."""
    st = eternauta('abajo')
    im = Image.new('RGBA', (16, 32), (0, 0, 0, 0))
    im.paste(st.crop((0, 0, 16, 25)), (0, 3))           # el cuerpo baja 3 px
    knees = st.crop((0, 25, 16, 32))
    im.alpha_composite(knees.crop((0, 0, 16, 4)), (0, 28))  # muslos cortos hacia adelante
    return im


# El programador (2026): buzo con capucha, auriculares al cuello, anteojos que reflejan la pantalla,
# barba de unos días. Es un personaje genérico, NO el usuario. Base: Juan.
HOOD = [hx('2a3236'), hx('3b484a'), hx('4f5f5e'), hx('6a7c78')]
JEANS = [hx('232a3c'), hx('2f3a54'), hx('3e4c6a'), hx('52628a')]
HAIR = [hx('1e1820'), hx('2e2430'), hx('40343e'), hx('564852')]
PHONES, PHONES_HI = hx('22222c'), hx('5a5a6c')
LENS, LENS_HI = hx('5d8a96'), CONT


def programador(view='abajo'):
    im = load('chars2', 'juan', f'{view}_quieto_1.png')
    px = im.load()
    remap(im, (0, 0, 16, 12), HAIR)      # pelo
    remap(im, (0, 16, 16, 25), HOOD)                    # buzo
    remap(im, (0, 25, 16, 30), JEANS)                   # jean
    remap(im, (0, 30, 16, 32), [hx('8a8a98'), hx('b4b4c0'), hx('d8d8de'), hx('f0f0f4')])  # zapatillas
    if view == 'abajo':
        # pelo revuelto: puntas arriba
        put(im, [(5, 0), (9, 0)], HAIR[1])
        put(im, [(11, 0)], HAIR[0])
        put(im, [(6, 5), (9, 5)], HAIR[2])
        # sin anteojos (en 16 px se leían como lentes de sol): ojeras de trasnoche
        put(im, [(4, 10), (10, 10)], S_SH)
        put(im, [(3, 7), (12, 7)], HAIR[0])  # patillas
        # barba de días: punteo en mandíbula y mentón
        for x, y in ((4, 13), (11, 13), (6, 14), (9, 14), (7, 15)):
            if is_skin(px[x, y]):
                px[x, y] = hx('9a6a58')
        # el buzo es liso: se borra el cierre de la campera de Juan
        for y in range(18, 25):
            for x in range(5, 11):
                if not is_skin(px[x, y]):
                    px[x, y] = HOOD[2]
        # auriculares al cuello
        put(im, [(4, 16), (5, 16), (10, 16), (11, 16)], PHONES)
        put(im, [(3, 17), (12, 17)], PHONES)
        put(im, [(4, 17), (11, 17)], PHONES_HI)
        # capucha arrugada en el cuello y cordones
        put(im, [(6, 16), (7, 16), (8, 16), (9, 16)], HOOD[3])
        put(im, [(6, 18), (6, 19), (9, 18), (9, 19)], hx('d9d2bc'))
        put(im, [(6, 20), (9, 20)], hx('a89f88'))
        # bolsillo canguro
        put(im, [(5, 22), (6, 22), (7, 22), (8, 22), (9, 22), (10, 22)], HOOD[0])
    elif view == 'arriba':
        # capucha caída en la espalda
        for x in range(5, 11):
            px[x, 16] = HOOD[3]
            px[x, 17] = HOOD[2] if x in (5, 10) else HOOD[1]
        put(im, [(6, 18), (7, 18), (8, 18), (9, 18)], HOOD[0])
        # vincha de los auriculares cruzando la nuca
        put(im, [(3, 14), (4, 15), (11, 15), (12, 14)], PHONES)
        put(im, [(5, 16), (10, 16)], PHONES_HI)
    return im


def sheet_personajes():
    cells = [eternauta('abajo'), eternauta('derecha'), eternauta('arriba'), eternauta_sentado(),
             programador('abajo'), programador('derecha'), programador('arriba')]
    for i, c in enumerate(cells):
        c.save(os.path.join(OUT, f'pj_{i}.png'))
    return cells


def zoom(im, k):
    return im.resize((im.width * k, im.height * k), Image.NEAREST)



# ------------------------------------------------------------------ el cuarto del programador
import json  # noqa: E402

W, H = 480, 270
FONT = json.load(open(os.path.join(ROOT, 'public', 'assets', 'font.json')))
BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


class Scene:
    """Lienzo de 480x270 con capa emisiva (lo que brilla no se oscurece con la noche)."""

    def __init__(self, bg=(18, 14, 24, 255), size=(W, H)):
        self.w, self.h = size
        self.im = Image.new('RGBA', size, bg)
        self.glow = Image.new('RGBA', size, (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.im)
        self.g = ImageDraw.Draw(self.glow)

    def spr(self, im, x, y, glow=False):
        (self.glow if glow else self.im).alpha_composite(im, (int(x), int(y)))

    def rect(self, x, y, w, h, c, glow=False):
        (self.g if glow else self.d).rectangle([x, y, x + w - 1, y + h - 1], fill=c)

    def dot(self, x, y, c, glow=False):
        (self.g if glow else self.d).point((x, y), fill=c)

    def text(self, x, y, s, c, shadow=None, target=None):
        im = target or self.im
        d = ImageDraw.Draw(im)
        for dx, dy, col in (((0, 1, shadow),) if shadow else ()) + ((0, 0, c),):
            cx = x
            for ch in s:
                if ch == ' ':
                    cx += 4
                    continue
                g = FONT['glyphs'].get(ch) or FONT['glyphs']['?']
                for gy, row in enumerate(g):
                    for gx, p in enumerate(row):
                        if p == '#':
                            d.point((cx + gx + dx, y + gy + dy), fill=col)
                cx += len(g[0]) + FONT['spacing']

    @staticmethod
    def measure(s):
        n = 0
        for ch in s:
            g = FONT['glyphs'].get(ch) or FONT['glyphs']['?']
            n += 4 if ch == ' ' else len(g[0]) + FONT['spacing']
        return n - FONT['spacing']

    def light(self, sources, night=True):
        """La regla del apagón: repaleta nocturna legible (desatura 30%, multiplica
        0.49/0.55/0.79) y 4 bandas por fuente, tramado Bayer solo en el borde entre bandas."""
        src = self.im.load()
        out = Image.new('RGBA', (self.w, self.h))
        o = out.load()
        for y in range(self.h):
            for x in range(self.w):
                r, g, b, a = src[x, y]
                L = 0.299 * r + 0.587 * g + 0.114 * b
                dr, dg, db = (r + (L - r) * 0.3, g + (L - g) * 0.3, b + (L - b) * 0.3)
                nr, ng, nb = dr * 0.49, dg * 0.55, db * 0.79
                best, tint = 0, (1, 1, 1)
                for (sx, sy, R, t, sq) in sources:
                    dx, dy = (x - sx), (y - sy) * sq
                    d = (dx * dx + dy * dy) ** 0.5
                    k = max(0.0, 1 - d / R) * 4
                    band = int(k + (BAYER[y % 4][x % 4] / 16 - 0.5) * 0.55)
                    band = max(0, min(4, band))
                    if band > best:
                        best, tint = band, t
                f = best / 4
                lr, lg, lb = min(255, r * tint[0]), min(255, g * tint[1]), min(255, b * tint[2])
                o[x, y] = (int(nr + (lr - nr) * f), int(ng + (lg - ng) * f), int(nb + (lb - nb) * f), a)
        out.alpha_composite(self.glow)
        self.im = out
        self.d = ImageDraw.Draw(self.im)


T_WARM = (1.25, 1.06, 0.80)      # vela / lámpara
T_SCREEN = (0.62, 0.92, 1.12)    # pantalla (el cian de la nieve)
T_WHITE = (1.35, 1.35, 1.40)     # la mancha blanca de la llegada


def tile(name):
    return load('tiles', name + '.png')


def obj(name, folder='objects'):
    return load(folder, name + '.png')


def recolor(im, ramp):
    im = im.copy()
    remap(im, (0, 0, im.width, im.height), ramp, keep_skin=False)
    return im


# El mundo va con el zoom del juego: 320x180 de mundo ×6 = 1920x1080; la UI (480x270) va ×4.
WW, WH = 320, 180
RX0, RX1, RY0, RWALL, RY1 = 16, 304, 8, 52, 172
WALL = [hx('4a5058'), hx('5e6670'), hx('6c757e'), hx('7c858e')]   # pintura gris azulada


def room_base(sc, rng):
    sc.rect(RX0 - 8, RY0 - 6, RX1 - RX0 + 16, RY1 - RY0 + 12, hx('2a2433'))
    sc.rect(RX0 - 8, RY0 - 6, RX1 - RX0 + 16, 2, hx('3e364a'))
    # pared del fondo: pintura lisa con un grano apenas visible (no azulejos)
    sc.rect(RX0, RY0, RX1 - RX0, RWALL - RY0 - 6, WALL[2])
    for _ in range(260):
        sc.dot(rng.randrange(RX0, RX1), rng.randrange(RY0, RWALL - 6), WALL[1] if rng.random() < 0.6 else WALL[3])
    sc.rect(RX0, RY0, RX1 - RX0, 2, WALL[0])                          # sombra bajo el techo
    # zócalo
    sc.rect(RX0, RWALL - 6, RX1 - RX0, 5, hx('b8b2a0'))
    sc.rect(RX0, RWALL - 6, RX1 - RX0, 1, hx('d4cebc'))
    sc.rect(RX0, RWALL - 2, RX1 - RX0, 2, hx('6a6458'))
    # piso de parquet
    pq = [tile('parquet_0'), tile('parquet_1'), tile('parquet_2')]
    for y in range(RWALL, RY1, 16):
        for x in range(RX0, RX1, 16):
            t = pq[rng.randrange(3)]
            sc.spr(t.crop((0, 0, min(16, RX1 - x), min(16, RY1 - y))), x, y)
    for x in range(RX0, RX1):
        sc.dot(x, RWALL, hx('2a1e1c', 120))


def rug(sc, x, y, cols, rows):
    ramp = [hx('22283a'), hx('333c54'), hx('46506c'), hx('8a8064')]
    t = [tile(f'rg_{i}') for i in range(9)]
    im = Image.new('RGBA', (cols * 16, rows * 16), (0, 0, 0, 0))
    for j in range(rows):
        for i in range(cols):
            r = 0 if j == 0 else (2 if j == rows - 1 else 1)
            c = 0 if i == 0 else (2 if i == cols - 1 else 1)
            im.alpha_composite(t[r * 3 + c], (i * 16, j * 16))
    sc.spr(recolor(im, ramp), x, y)    # se recolorea entera: si no, cada baldosa saca contorno


def window(sc, x, y, w=52, h=34, open_=True):
    """La ventana del guionista (p013): de noche, abierta, con estrellas. Una sola chispa cian."""
    fr, fr2, fr3 = hx('d8d2c2'), hx('a8a294'), hx('6e6a62')
    sc.rect(x - 2, y - 2, w + 4, h + 4, fr3)
    sc.rect(x - 1, y - 1, w + 2, h + 2, fr)
    sc.rect(x, y, w, h, hx('0c1024'), glow=True)
    rng = random.Random(7)
    for _ in range(26):
        sx, sy = x + rng.randrange(w), y + rng.randrange(h - 6)
        sc.dot(sx, sy, hx('fff8e2') if rng.random() < 0.4 else hx('8a90b8'), glow=True)
    # techos del barrio en silueta contra el cielo
    for i in range(0, w, 13):
        hh = 6 + (i * 7) % 5
        sc.rect(x + i, y + h - hh, 12, hh, hx('060810'), glow=True)
        sc.rect(x + i + 4, y + h - hh - 3, 4, 3, hx('060810'), glow=True)
    sc.rect(x + 17, y + h - 9, 2, 2, hx('ffcf6e'), glow=True)        # una sola ventana prendida
    sc.dot(x + 38, y + 9, CONT, glow=True)                           # el primer copo
    # marco: travesaño y hoja abierta
    sc.rect(x + w // 2 - 1, y, 2, h, fr2)
    sc.rect(x, y + h // 2 - 1, w, 2, fr2)
    if open_:
        sc.rect(x + w + 2, y - 2, 6, h + 6, fr2)
        sc.rect(x + w + 3, y, 4, h + 2, hx('2a3048'))
    sc.rect(x - 4, y + h + 2, w + 8, 3, fr)                          # alféizar
    sc.rect(x - 4, y + h + 5, w + 8, 1, fr3)


def framed_page(sc, x, y):
    """Un cuadro con una página de historieta en tinta (abstracta: viñetas y manchas, no una copia)."""
    sc.rect(x, y, 16, 21, hx('2a2026'))
    sc.rect(x + 1, y + 1, 14, 19, hx('efe8d8'))
    ink = hx('1a1622')
    for (a, b, c, d) in ((2, 2, 11, 6), (2, 9, 5, 7), (8, 9, 5, 7), (2, 17, 11, 2)):
        sc.rect(x + a, y + b, c, d, hx('c8c0ac'))
        sc.rect(x + a, y + b + d - 2, c, 2, ink)
    sc.rect(x + 9, y + 11, 3, 4, ink)
    sc.rect(x + 3, y + 3, 4, 2, ink)


def desk(sc, x, y, w=88):
    top, top2, edge, leg = hx('c8b89a'), hx('b0a084'), hx('7a6a56'), hx('3a3a44')
    sc.rect(x, y, w, 18, top)
    sc.rect(x, y, w, 1, hx('ddd0b4'))
    for i in range(0, w, 22):
        sc.rect(x + i, y + 4 + (i % 3), 10, 1, top2)
    sc.rect(x, y + 18, w, 4, edge)
    sc.rect(x, y + 22, w, 1, hx('2a2433'))
    for lx in (x + 2, x + w - 5):
        sc.rect(lx, y + 23, 3, 14, leg)
    sc.rect(x + 6, y + 36, w - 12, 2, hx('2a1e1c', 110))            # sombra en el piso


def monitor(sc, x, y, cuant=False):
    """Pantalla de 30x20 con ESTE juego abierto: la calle nevada en miniatura."""
    sc.rect(x, y, 32, 22, hx('1c1c26'))
    sc.rect(x + 1, y + 1, 30, 20, hx('2a2a36'))
    sx, sy = x + 2, y + 2
    sc.rect(sx, sy, 28, 17, hx('5a6a86'), glow=True)                  # cielo de la calle
    sc.rect(sx, sy + 11, 28, 6, hx('d8e4ee'), glow=True)              # nieve
    sc.rect(sx + 3, sy + 5, 8, 6, hx('8a4a3a'), glow=True)            # casita
    sc.rect(sx + 2, sy + 4, 10, 1, hx('4a3a5a'), glow=True)
    sc.rect(sx + 6, sy + 8, 2, 3, hx('ffcf6e'), glow=True)
    sc.rect(sx + 18, sy + 8, 2, 4, hx('e8e1cc'), glow=True)           # el del traje
    sc.dot(sx + 18, sy + 8, hx('5d8a96'), glow=True)
    for (a, b) in ((24, 13), (21, 14), (26, 12)):
        sc.rect(sx + a, sy + b, 2, 1, hx('1a1622'), glow=True)        # cascarudos
    rng = random.Random(3)
    for _ in range(14):
        sc.dot(sx + rng.randrange(28), sy + rng.randrange(11), hx('fbffff'), glow=True)
    # pie del monitor
    sc.rect(x + 13, y + 22, 6, 3, hx('2a2a36'))
    sc.rect(x + 9, y + 25, 14, 2, hx('1c1c26'))


def desk_lamp(sc, x, y):
    """Lámpara de escritorio articulada (la lámpara del guionista, en 2026)."""
    c, c2 = hx('2e2e3a'), hx('4a4a5a')
    sc.rect(x, y + 14, 8, 2, c)
    for i in range(8):
        sc.dot(x + 4 - i // 3, y + 13 - i, c2)
    for i in range(6):
        sc.dot(x + 2 + i, y + 5 - i // 2, c2)
    sc.rect(x + 6, y, 7, 4, c)
    sc.rect(x + 7, y + 3, 5, 2, hx('ffe7a8'), glow=True)


def office_chair_back(sc, x, y):
    c, c2, c3 = hx('24242e'), hx('34343f'), hx('474756')
    sc.rect(x + 1, y, 16, 15, c)
    sc.rect(x, y + 1, 18, 13, c)
    sc.rect(x + 2, y + 1, 14, 2, c3)
    sc.rect(x + 2, y + 3, 14, 9, c2)
    sc.rect(x + 8, y + 15, 2, 4, c)
    sc.rect(x + 2, y + 19, 14, 2, c)
    for wx in (x + 1, x + 8, x + 15):
        sc.rect(wx, y + 21, 2, 1, hx('101016'))


def visit_chair(sc, x, y):
    """La silla de visitas de la p013: madera oscura, dos remates redondos en el respaldo."""
    ch = recolor(obj('chair_front'), [hx('2a1a16'), hx('3e2820'), hx('543628'), hx('6e4a34')])
    sc.spr(ch, x, y)
    # los dos remates redondos van en los postes de ADELANTE (con el viejo sentado, los de
    # atrás quedaban al lado de la cabeza y se leían como cuernos)
    for kx in (x + 1, x + 13):
        sc.rect(kx, y + 13, 2, 2, hx('6e4a34'))
        sc.dot(kx, y + 13, hx('9a6e50'))


def mochila_cuarto(sc, x, y):
    """Una mochila tirada en el piso del cuarto (guiño a la que queda en la nieve)."""
    sc.spr(mochila_sprite(), x, y)


def build_room(state='vacio'):
    """state: 'vacio' (programa solo), 'llegada' (la mancha blanca en la silla), 'gag' (el viejo sentado).
    Mundo de 320x180 (se ve ×6)."""
    import math
    rng = random.Random(11)
    sc = Scene(size=(WW, WH))
    room_base(sc, rng)
    window(sc, 40, 12, w=44, h=26)
    framed_page(sc, 100, 16)
    sc.spr(obj('shelf'), 236, 12)
    rug(sc, 120, 120, 5, 3)
    sc.spr(obj('bed', 'interior2'), 22, 118)
    # escritorio, monitor, teclado, mate, taza, lámpara
    desk(sc, 120, 54)
    monitor(sc, 150, 30)
    sc.rect(152, 60, 22, 4, hx('3a3a46'))
    for i in range(10):
        sc.dot(153 + i * 2, 61, hx('5a5a6a'))
    sc.spr(load('props', 'mate.png'), 128, 52)
    sc.spr(obj('cup'), 182, 56)
    desk_lamp(sc, 192, 40)
    # cajas y una pila de historietas abajo a la derecha, y la mochila
    sc.spr(obj('box'), 268, 140)
    sc.spr(obj('book'), 252, 156)
    sc.spr(obj('book'), 254, 152)
    mochila_cuarto(sc, 232, 150)
    # el programador, de espaldas, en la silla de escritorio
    sc.spr(programador('arriba'), 156, 64)
    office_chair_back(sc, 155, 82)
    # la silla de visitas, al lado del escritorio
    visit_chair(sc, 216, 66)
    lights = [(196, 46, 92, T_WARM, 1.25), (166, 42, 56, T_SCREEN, 1.6)]
    if state == 'llegada':
        blob = eternauta_sentado()
        bl = Image.new('RGBA', blob.size, (0, 0, 0, 0))
        bp, op = blob.load(), bl.load()
        for yy in range(32):
            for xx in range(16):
                if bp[xx, yy][3]:
                    op[xx, yy] = hx('ffffff') if (xx + yy) % 5 else hx('dff6ff')
        sc.spr(bl, 216, 62, glow=True)
        r2 = random.Random(5)
        for _ in range(34):
            a_ = r2.random() * 6.283
            rr = 11 + r2.random() * 16
            sc.dot(int(224 + math.cos(a_) * rr), int(78 + math.sin(a_) * rr * 0.8),
                   CONT if r2.random() < 0.6 else hx('ffffff'), glow=True)
        lights.append((224, 78, 70, T_WHITE, 1.0))
    elif state == 'gag':
        sc.spr(eternauta_sentado(), 216, 62)
        for (a_, b_) in ((215, 88), (232, 86), (217, 72)):
            sc.dot(a_, b_, CONT, glow=True)
    sc.light(lights)
    return sc


def compose(world, ui=None):
    """Mundo ×6 + UI ×4 = 1920x1080, como el juego (zoom del mundo 1.5x)."""
    big = zoom(world.im, 6)
    if ui is not None:
        big.alpha_composite(zoom(ui, 4))
    return big


# ------------------------------------------------------------------ diálogo (mock al estilo del juego)
def head_portrait(spr16):
    """Retrato = la cabeza del sprite (filas 0-16) ×4 sobre fondo oscuro (regla del 18/11)."""
    head = spr16.crop((0, 0, 16, 16))
    pt = Image.new('RGBA', (16, 16), hx('2a2638'))
    pt.alpha_composite(head)
    return pt.resize((64, 64), Image.NEAREST)


def dialog(sc, who, spr16, line):
    x, y, w, h = 10, 176, 460, 86
    sc.rect(x - 1, y - 1, w + 2, h + 2, hx('2a1a12'))
    sc.rect(x, y, w, h, hx('8a5a34'))
    sc.rect(x + 3, y + 3, w - 6, h - 6, hx('efdfb6'))
    for ly in range(y + 12, y + h - 4, 9):
        sc.rect(x + 80, ly, w - 90, 1, hx('e2cfa2'))
    sc.rect(x + 7, y + 8, 66, 66, hx('1a1426'))
    sc.spr(head_portrait(spr16), x + 8, y + 9)
    nw = Scene.measure(who) + 10
    nx = x + 80 + (w - 90) // 2 - nw // 2
    sc.rect(nx - 1, y + 4, nw + 2, 13, hx('2a1a12'))
    sc.rect(nx, y + 5, nw, 11, hx('9a6a3a'))
    sc.text(nx + 5, y + 7, who, hx('fff8e2'), shadow=hx('3a1c0c'))
    sc.text(x + 86, y + 26, line, hx('3a2a20'))
    sc.text(x + w - 66, y + h - 14, 'Siguiente', hx('3a2a20'))


GAG = [
    ('El Eternauta', 'eternauta', 'Llevo no sé cuántas veces la misma noche. Salgo, me matan, y vuelvo al truco.'),
    ('Programador', 'programador', 'Ah, sí... es que el juego todavía no tiene final.'),
    ('El Eternauta', 'eternauta', '¿El qué?'),
    ('Programador', 'programador', 'Te estoy programando. Esto es un roguelike.'),
    ('El Eternauta', 'eternauta', '...¿Un qué?'),
]


def wrap_line(s, width):
    words, lines, cur = s.split(' '), [], ''
    for w_ in words:
        t = (cur + ' ' + w_).strip()
        if Scene.measure(t) > width:
            lines.append(cur)
            cur = w_
        else:
            cur = t
    lines.append(cur)
    return lines


def gag_frames():
    base = build_room('gag')
    frames = []
    for who, key, line in GAG:
        ui = Scene(bg=(0, 0, 0, 0))
        spr16 = eternauta('abajo') if key == 'eternauta' else programador('abajo')
        x, y, w, h = 10, 176, 460, 86
        dialog(ui, who, spr16, '')
        for i, ln in enumerate(wrap_line(line, w - 100)):
            ui.text(x + 86, y + 26 + i * 12, ln, hx('3a2a20'))
        frames.append(compose(base, ui.im))
    return frames



# ------------------------------------------------------------------ la llegada: la tinta se cuantiza
INK, PAPER = hx('16121c'), hx('efe8d8')


def silhouette(im):
    a = im.split()[3]
    return a.point(lambda v: 255 if v > 0 else 0)


def ink_version(spr, k=4):
    """Versión en tinta (tipo historieta) a k× del sprite: negro, papel y rayado para los medios.
    No es un dibujo de Solano López: es el MISMO sprite traducido a tinta."""
    big = spr.resize((spr.width * k, spr.height * k), Image.BICUBIC)
    sil = silhouette(spr.resize((spr.width * k, spr.height * k), Image.NEAREST))
    out = Image.new('RGBA', big.size, (0, 0, 0, 0))
    b, o, m = big.load(), out.load(), sil.load()
    for y in range(big.height):
        for x in range(big.width):
            if not m[x, y]:
                continue
            L = lum(b[x, y]) / 255
            if L < 0.30:
                c = INK
            elif L < 0.52:
                c = INK if (x + y) % 3 == 0 else PAPER          # rayado diagonal
            elif L < 0.66:
                c = INK if (x - y) % 5 == 0 else PAPER          # rayado fino
            else:
                c = PAPER
            o[x, y] = c
    # contorno de pluma: 1 px de tinta alrededor
    sm = sil.load()
    for y in range(big.height):
        for x in range(big.width):
            if sm[x, y] and any(not (0 <= x + dx < big.width and 0 <= y + dy < big.height) or not sm[x + dx, y + dy]
                                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                o[x, y] = INK
    return out


def blockify(im, block):
    w, h = im.width // block, im.height // block
    small = im.resize((w, h), Image.NEAREST)
    return small.resize(im.size, Image.NEAREST)


def bayer_mix(a, b, t):
    """Mezcla a→b con tramado Bayer 4x4 (t=0 todo a, t=1 todo b)."""
    out = a.copy()
    o, bp = out.load(), b.load()
    for y in range(a.height):
        for x in range(a.width):
            if BAYER[(y // 4) % 4][(x // 4) % 4] / 16 < t:
                o[x, y] = bp[x, y]
    return out


def hands_up(spr):
    """Variante: se mira las manos (las sube delante del pecho)."""
    im = spr.copy()
    px = im.load()
    for x, y in ((1, 24), (2, 24), (13, 24), (14, 24), (1, 25), (14, 25)):
        if is_skin(px[x, y]):
            px[x, y] = TUNIC[1]
    # antebrazos que suben y las dos manos grandes delante del pecho, palmas para arriba
    put(im, [(3, 21), (3, 22), (12, 21), (12, 22)], TUNIC[1])
    put(im, [(4, 19), (5, 19), (6, 19), (9, 19), (10, 19), (11, 19)], S_HI)
    put(im, [(4, 20), (5, 20), (6, 20), (9, 20), (10, 20), (11, 20)], S_BASE)
    put(im, [(4, 21), (5, 21), (6, 21), (9, 21), (10, 21), (11, 21)], S_SH)
    put(im, [(5, 20), (10, 20)], S_SH)   # el pliegue de la palma
    return im


def llegada_strip():
    st = eternauta('abajo')
    k = 4
    ink = ink_version(st, k)
    color = st.resize((64, 128), Image.NEAREST)
    sil = silhouette(color)
    rng = random.Random(9)
    frames = []
    # 1 estática del continuum con la forma apenas insinuada
    f = Image.new('RGBA', (64, 128), (0, 0, 0, 0))
    fp, sp = f.load(), sil.load()
    for y in range(128):
        for x in range(64):
            pr = 0.35 if sp[x, y] else 0.05
            if rng.random() < pr:
                f.putpixel((x, y), [CONT, hx('ffffff'), hx('6a5a9a'), hx('2e2a4a')][rng.randrange(4)])
    frames.append(('1. estática', blockify(f, 2)))
    # 2 la mancha blanca (p013)
    f = Image.new('RGBA', (64, 128), (0, 0, 0, 0))
    f.paste(hx('ffffff'), mask=sil)
    for y in range(0, 128, 2):
        for x in range(64):
            if sp[x, y] and rng.random() < 0.12:
                f.putpixel((x, y), hx('dff6ff'))
    frames.append(('2. la mancha', f))
    # 3 tinta
    frames.append(('3. tinta', ink))
    # 4 la tinta se cuadricula
    frames.append(('4. cuadritos', blockify(ink, 2)))
    # 5 cuadraditos y los primeros colores
    frames.append(('5. agarra color', bayer_mix(blockify(ink, 4), color, 0.5)))
    # 6 el sprite del juego
    frames.append(('6. 16 bits', color))
    # 7 se mira las manos
    frames.append(('7. ¿y esto?', hands_up(st).resize((64, 128), Image.NEAREST)))
    # lámina
    sc = Scene(bg=hx('120e1c'), size=(7 * 84 + 8, 160))
    r2 = random.Random(2)
    for _ in range(500):
        sc.dot(r2.randrange(sc.w), r2.randrange(sc.h), [hx('1e1a30'), hx('2a2444'), hx('1a2a3a')][r2.randrange(3)])
    for i, (lbl, im) in enumerate(frames):
        x = 18 + i * 84
        if i in (1, 2):   # halo
            sc.rect(x - 2, 8, 68, 132, hx('2a2a44'))
        sc.spr(im, x, 10)
        sc.text(x + 32 - Scene.measure(lbl) // 2, 146, lbl, hx('fff8e2'), shadow=hx('000000'))
    zoom(sc.im, 3).save(os.path.join(OUT, 'llegada_tira.png'))
    for i, (lbl, im) in enumerate(frames):
        im.save(os.path.join(OUT, f'llegada_{i + 1}.png'))
    return frames


# ------------------------------------------------------------------ botín y la mochila en la nieve
def icon(draw_fn):
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    draw_fn(im)
    outline(im)
    return im


def outline(im):
    """Contorno de color (un paso más oscuro y violáceo del vecino), como pixel.py."""
    px = im.load()
    add = {}
    for y in range(im.height):
        for x in range(im.width):
            if px[x, y][3]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < im.width and 0 <= ny < im.height and px[nx, ny][3] == 255 and (nx, ny) not in add:
                    add[(x, y)] = dark(px[nx, ny], 0.62)
                    break
    for (x, y), c in add.items():
        px[x, y] = c


def chatarra(im):
    """Chatarra: una chapa doblada, un bulón y un resorte. Gris acero con óxido."""
    d = ImageDraw.Draw(im)
    g0, g1, g2, g3 = hx('4a4e5a'), hx('6c7280'), hx('9aa0ac'), hx('c8ccd4')
    rust, rust2 = hx('8a4a2a'), hx('b06a3a')
    d.polygon([(2, 9), (8, 5), (11, 7), (6, 12), (2, 12)], fill=g1)
    d.line([(3, 9), (8, 6)], fill=g3)
    d.line([(3, 11), (6, 11)], fill=g0)
    im.putpixel((5, 10), rust)
    im.putpixel((6, 9), rust2)
    d.rectangle([10, 9, 13, 10], fill=g2)                  # bulón
    d.rectangle([12, 8, 13, 11], fill=g1)
    im.putpixel((10, 9), g3)
    for i in range(4):                                     # resorte
        im.putpixel((9 + i, 3 + (i % 2)), g2)
        im.putpixel((9 + i, 4 - (i % 2)), g0)


def goma(im):
    """Tira de goma (de cámara de neumático) enrollada: lo que remienda el traje."""
    d = ImageDraw.Draw(im)
    r0, r1, r2, r3 = hx('201a22'), hx('342a30'), hx('4a3c42'), hx('6a5a5c')
    d.ellipse([2, 4, 11, 12], fill=r1)
    d.ellipse([4, 6, 9, 10], fill=r0)
    d.arc([2, 4, 11, 12], 200, 300, fill=r3)
    d.rectangle([9, 9, 14, 11], fill=r2)                   # la punta suelta
    d.line([(10, 9), (13, 9)], fill=r3)
    im.putpixel((5, 7), r2)


def pieza_cascarudo(im):
    """Pedazo de élitro: negro azulado brillante (paleta de los cascarudos), con su brillo frío."""
    d = ImageDraw.Draw(im)
    c0, c1, c2, hi = hx('0e0c14'), hx('1e1c2a'), hx('3a3850'), hx('8a90b8')
    d.polygon([(3, 12), (5, 4), (10, 2), (13, 6), (11, 13)], fill=c1)
    d.polygon([(5, 11), (6, 5), (9, 4), (10, 10)], fill=c2)
    d.line([(8, 3), (8, 12)], fill=c0)                     # la línea del élitro
    d.line([(6, 5), (7, 4)], fill=hi)
    im.putpixel((11, 6), hi)
    im.putpixel((10, 11), hx('5a2a3a'))                    # el borde roto, con algo de adentro


def nafta(im):
    im.alpha_composite(load('items', 'nafta.png'))


def mochila_sprite():
    """La mochila de lona del juego (16x14): solapa, correas y hebilla. Es la misma del cuarto."""
    im = Image.new('RGBA', (16, 14), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    l0, l1, l2, l3 = hx('4a3a26'), hx('6a5636'), hx('857048'), hx('a08a5c')
    d.rounded_rectangle([2, 2, 13, 13], 2, fill=l1)
    d.rectangle([3, 3, 12, 12], fill=l2)
    d.rounded_rectangle([3, 1, 12, 7], 2, fill=l1)         # solapa
    d.line([(4, 2), (11, 2)], fill=l3)
    d.line([(3, 7), (12, 7)], fill=l0)
    d.rectangle([7, 6, 8, 8], fill=hx('c8a86a'))           # hebilla
    d.line([(5, 8), (5, 12)], fill=l1)                     # correas
    d.line([(10, 8), (10, 12)], fill=l1)
    d.rectangle([4, 10, 11, 12], fill=l1)                  # bolsillo
    d.line([(4, 10), (11, 10)], fill=l3)
    outline(im)
    return im


def mochila_nieve(t=0):
    """La mochila de 'otra vez' tirada en la nieve: acostada, con nieve encima y medio enterrada,
    y un temblor cian del continuum en el borde (no es de esta noche). t = cuadro del temblor (0-2)."""
    im = Image.new('RGBA', (22, 18), (0, 0, 0, 0))
    im.alpha_composite(mochila_sprite(), (3, 2))
    d = ImageDraw.Draw(im)
    sn0, sn1, sn2 = hx('9fb6c8'), hx('c8dceb'), hx('eefaff')
    # nieve acumulada sobre la solapa
    d.line([(6, 2), (13, 2)], fill=sn2)
    d.line([(5, 3), (9, 3)], fill=sn1)
    d.point([(12, 3)], fill=sn1)
    # medio enterrada: montoncito que tapa la base
    d.ellipse([0, 11, 21, 17], fill=sn1)
    d.ellipse([2, 12, 19, 16], fill=sn2)
    d.line([(1, 16), (20, 16)], fill=sn0)
    px = im.load()
    edge = [(x, y) for y in range(18) for x in range(22) if px[x, y][3] and y < 12 and
            any(not (0 <= x + dx < 22 and 0 <= y + dy < 18) or not px[x + dx, y + dy][3]
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
    for i, (x, y) in enumerate(edge):
        k = (i + t * 2) % 5
        if k == 0:
            px[x, y] = CONT
        elif k == 1:
            px[x, y] = hx('dff6ff')
    return im


def lamina_botin():
    items = [('Chatarra', icon(chatarra)), ('Goma', icon(goma)), ('Nafta', icon(nafta)),
             ('Pieza de cascarudo', icon(pieza_cascarudo)), ('Mochila', mochila_sprite())]
    for n, im in items:
        im.save(os.path.join(OUT, f'item_{n.split()[0].lower()}.png'))
    for t in range(3):
        mochila_nieve(t).save(os.path.join(OUT, f'mochila_nieve_{t}.png'))
    sc = Scene(bg=hx('3a3446'), size=(300, 96))
    for i, (n, im) in enumerate(items):
        x = 10 + i * 58
        sc.rect(x, 10, 40, 40, hx('2a2433'))
        sc.rect(x + 1, 11, 38, 38, hx('4a4258'))
        sc.spr(zoom(im, 2), x + 20 - im.width, 30 - im.height)
        for j, ln in enumerate(wrap_line(n, 54)):
            sc.text(x + 20 - Scene.measure(ln) // 2, 54 + j * 10, ln, hx('fff8e2'), shadow=hx('000000'))
    for t in range(3):
        sc.spr(zoom(mochila_nieve(t), 1), 236 + t * 0, 0) if False else None
    zoom(sc.im, 4).save(os.path.join(OUT, 'botin.png'))


def street_scene():
    """La calle en el loop: un cascarudo muerto que soltó botín, y la mochila de 'otra vez'."""
    import math
    rng = random.Random(4)
    sc = Scene(size=(WW, WH))
    sw = [tile('sidewalk_0'), tile('sidewalk_1')]
    rd = [tile('road_0'), tile('road_1')]
    sn = [tile(f'snow_{i}') for i in range(6)]
    for y in range(0, WH, 16):
        for x in range(0, WW, 16):
            if y < 48:
                t = sn[rng.randrange(6)]
            elif y < 112:
                t = sw[rng.randrange(2)]
            elif y < 120:
                t = tile('curb_0')
            else:
                t = rd[rng.randrange(2)]
            sc.spr(t, x, y)
    # tapial y farola
    tp = load('street2', 'tapial80.png')
    sc.spr(tp, 0, 48 - tp.height + 6)
    sc.spr(tp, 160, 48 - tp.height + 6)
    far = load('street2', 'farola.png')
    sc.spr(far, 270, 100 - far.height)          # apagada: en el apagón las farolas no andan
    # montoncitos de nieve sobre la vereda
    for (x, y) in ((30, 64), (130, 100), (250, 60), (290, 150), (60, 150)):
        sc.spr(obj('snow_mound'), x, y)
    # cascarudo muerto (patas arriba) con lo que soltó
    dead = load('cascarudos', 'cascarudo:death:2.png')
    sc.spr(dead, 92, 74)
    sc.spr(icon(chatarra), 110, 80)
    sc.spr(icon(goma), 86, 90)
    sp0 = load('fx', 'sparkle_0.png')
    sc.spr(sp0, 116, 76, glow=True)
    sc.spr(sp0, 92, 86, glow=True)
    # otro cascarudo vivo que viene por la calle
    sc.spr(load('cascarudos', 'cascarudo:left:1.png'), 280, 128)
    sc.spr(load('cascarudos', 'veloz:left:2.png'), 300, 150)
    # la mochila de "otra vez", medio enterrada, con su temblor cian
    sc.spr(mochila_nieve(0), 214, 80, glow=True)   # no es de esta noche: no la toca la luz
    for i in range(12):
        a = i * 0.52
        sc.dot(int(225 + math.cos(a) * 16), int(90 + math.sin(a) * 10), CONT, glow=True)
    # Juan con el traje, yendo a buscarla
    sc.spr(load('chars2', 'juan_suit_rifle', 'derecha_caminar_2.png'), 168, 70)
    # copos fosforescentes
    for _ in range(70):
        sc.dot(rng.randrange(WW), rng.randrange(WH), hx('eefaff') if rng.random() < 0.7 else CONT, glow=True)
    sc.light([(225, 90, 30, (0.9, 1.1, 1.25), 1.3), (106, 84, 26, (1.1, 1.05, 0.95), 1.2), (160, 60, 260, (0.95, 1.0, 1.1), 1.6)])
    # UI: el aviso
    ui = Scene(bg=(0, 0, 0, 0))
    msg = 'Esto es mío... de otra vez.'
    mw = Scene.measure(msg) + 16
    ui.rect(240 - mw // 2, 196, mw, 15, hx('1a1426', 220))
    ui.text(240 - mw // 2 + 8, 200, msg, hx('fff8e2'), shadow=hx('000000'))
    return compose(sc, ui.im)


if __name__ == '__main__':
    cells = sheet_personajes()
    bg = Image.new('RGBA', (len(cells) * 20 + 4, 36), hx('6c6a78'))
    for i, c in enumerate(cells):
        bg.alpha_composite(c, (4 + i * 20, 2))
    zoom(bg, 8).save(os.path.join(OUT, 'personajes.png'))
    for st in ('vacio', 'llegada', 'gag'):
        compose(build_room(st)).save(os.path.join(OUT, f'cuarto_{st}.png'))
    for i, f in enumerate(gag_frames()):
        f.save(os.path.join(OUT, f'gag_{i + 1}.png'))
    llegada_strip()
    lamina_botin()
    street_scene().save(os.path.join(OUT, 'calle_mochila.png'))
    print('ok')
