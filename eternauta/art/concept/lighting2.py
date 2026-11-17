"""Rediseno de la luz del apagon (concepto, no es codigo del juego).

HOY (src/lighting.js): un velo azul plano al 62% sobre toda la pantalla, un
tinte cian 'lighter' que levanta los negros y charcos de luz con degrade suave.
Resultado: todo gris-azulado, sin contraste, luces borrosas -> "un filtro".

PROPUESTA: la oscuridad se PINTA, no se superpone.
  1. Repaleta nocturna: cada color se desatura y se MULTIPLICA por un tono
     frio. Los negros quedan negros (nada se levanta) y el contraste se
     conserva.
  2. Mapa de luz por fuente, cuantizado en 4 bandas con tramado Bayer 4x4 en
     los bordes: charcos escalonados, pixel art, nada de degrade suave.
  3. Cada banda de luz recolorea hacia la luz de su fuente: la vela calienta
     (naranja-ambar), la ventana enfria (cian de la nevada).
  4. La ventana es una fuente: la nieve de afuera brilla y entra un haz
     inclinado que cae en el piso.
  5. Las esquinas se hunden un escalon mas (vineta escalonada).

Salida: out/light_*.png
"""
import math
import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
SRC = os.path.join(HERE, '..', 'direccion', 'img', 'g_attic.png')   # captura 2x
ROOM = (64, 22, 416, 247)          # el altillo en coordenadas 1x (sin HUD)
CANDLE = (235, 131)                # la vela sobre la mesa (1x)
WINDOW = (162, 52, 192, 78)        # vidrio de la ventana (1x)

BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def base():
    im = Image.open(SRC).convert('RGB')
    im = im.resize((im.width // 2, im.height // 2), Image.NEAREST)
    return im.crop(ROOM)


def clamp(v):
    return max(0, min(255, int(v)))


def lum(c):
    return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]


# ------------------------------------------------------------------ hoy
def today(im):
    """Reproduce src/lighting.js modo apagon (velo + agujero + tinte + charco)."""
    w, h = im.size
    out = im.copy()
    px = out.load()
    cx, cy = CANDLE[0] - ROOM[0], CANDLE[1] - ROOM[1]
    r = 46
    for y in range(h):
        for x in range(w):
            c = px[x, y]
            d = math.hypot(x - cx, (y - cy) * 1.2) / r
            hole = 0
            if d < 1:
                hole = 0.74 * (1 - d / 0.55 * 0.5) if d < 0.55 else 0.74 * 0.5 * (1 - (d - 0.55) / 0.45)
            a = 0.62 * (1 - hole)
            veil = (0x0e, 0x12, 0x28)
            c = tuple(c[i] * (1 - a) + veil[i] * a for i in range(3))
            tint = (0x96, 0xe1, 0xf0)
            c = tuple(c[i] + tint[i] * 0.06 for i in range(3))
            if d < 0.95:
                dd = d / 0.95
                g = 0.34 * (1 - dd / 0.45 * 0.58) if dd < 0.45 else 0.34 * 0.42 * (1 - (dd - 0.45) / 0.55)
                warm = (0xff, 0xd0, 0x8a)
                c = tuple(c[i] + warm[i] * g for i in range(3))
            px[x, y] = tuple(clamp(v) for v in c)
    return out


# ------------------------------------------------------------- propuesta
NIGHT_MUL = (0.49, 0.55, 0.79)      # multiplicador frio de la noche
CANDLE_COL = (1.10, 0.96, 0.76)     # recoloreo calido
SNOW_COL = (0.62, 0.92, 1.12)       # recoloreo frio de la nevada


def night(c):
    L = lum(c)
    d = tuple(c[i] * 0.45 + L * 0.55 for i in range(3))
    return tuple(d[i] * NIGHT_MUL[i] for i in range(3))


def band(v, x, y, cuts=(0.12, 0.32, 0.56, 0.8)):
    """Nivel 0..4 con tramado Bayer en el borde de cada banda."""
    t = (BAYER[y % 4][x % 4] + 0.5) / 16 - 0.5
    v = v + t * 0.09
    return sum(v > k for k in cuts)


def proposal(im, flicker=0.0):
    w, h = im.size
    out = im.copy()
    px = out.load()
    cx, cy = CANDLE[0] - ROOM[0], CANDLE[1] - ROOM[1]
    wx0, wy0, wx1, wy1 = (WINDOW[0] - ROOM[0], WINDOW[1] - ROOM[1],
                          WINDOW[2] - ROOM[0], WINDOW[3] - ROOM[1])
    R = 75 + flicker
    for y in range(h):
        for x in range(w):
            c = px[x, y]
            n = night(c)
            # vela: caida cuadratica, charco algo mas ancho que alto
            d = math.hypot(x - cx, (y - cy) * 1.25) / R
            lv = band(max(0.0, 1 - d) ** 1.6, x, y)
            # haz de la ventana: paralelogramo que baja e inclina a la derecha
            sv = 0
            if y > wy1:
                k = (y - wy1)
                xl, xr = wx0 + k * 0.35, wx1 + k * 0.35
                if xl <= x <= xr and k < 50:
                    sv = band(0.85 * (1 - k / 50), x, y, cuts=(0.1, 0.28, 0.48, 0.9))
            # vineta escalonada
            e = min(x, w - 1 - x, y, h - 1 - y)
            vig = 0.76 if e < 10 else 0.88 if e < 22 else 1.0
            if lv:
                t = lv / 4
                lit = tuple(c[i] * CANDLE_COL[i] for i in range(3))
                n = tuple(n[i] * (1 - t) + lit[i] * t for i in range(3))
            elif sv:
                t = sv / 4 * 0.8
                lit = tuple(c[i] * SNOW_COL[i] * 0.8 for i in range(3))
                n = tuple(n[i] * (1 - t) + lit[i] * t for i in range(3))
            else:
                n = tuple(v * vig for v in n)
            px[x, y] = tuple(clamp(v) for v in n)
    # el vidrio brilla: la nevada de afuera es la luz
    for y in range(wy0, wy1):
        for x in range(wx0, wx1):
            c = im.getpixel((x, y))
            if c[2] > 120 and c[2] >= c[0]:
                L = lum(c)
                px[x, y] = (clamp(L * 0.62), clamp(L * 0.98), clamp(L * 1.12))
    # la llama: 2 px blancos-amarillos y un pixel ambar arriba
    for (dx, dy, col) in ((0, 0, (255, 246, 200)), (0, -1, (255, 214, 120)),
                          (0, -2, (255, 170, 70)), (1, 0, (255, 220, 140))):
        px[cx + dx, cy + dy - 3] = col
    return out


def x4(im):
    return im.resize((im.width * 3, im.height * 3), Image.NEAREST)


def build():
    os.makedirs(OUT, exist_ok=True)
    src = base()
    a, b = today(src), proposal(src)
    x4(a).save(os.path.join(OUT, 'light_today_x3.png'))
    x4(b).save(os.path.join(OUT, 'light_proposal_x3.png'))
    # comparacion lado a lado
    W, H = a.width * 3, a.height * 3
    cmp_ = Image.new('RGB', (W * 2 + 24, H), (17, 22, 42))
    cmp_.paste(x4(a), (0, 0)); cmp_.paste(x4(b), (W + 24, 0))
    cmp_.save(os.path.join(OUT, 'light_compare_x3.png'))
    # parpadeo de la vela: el borde de las bandas se mueve 1-2 px
    frames = [x4(proposal(src, f)) for f in (0, 2, -1, 3, 1)]
    frames[0].save(os.path.join(OUT, 'light_flicker.gif'), save_all=True,
                   append_images=frames[1:], duration=[180, 120, 160, 110, 140], loop=0)
    print('ok')


if __name__ == '__main__':
    build()
