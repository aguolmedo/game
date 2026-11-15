"""Iluminacion "despues del corte" (pag. 019: se corta la luz; pag. 020: la
nieve "emanaba una debil luz de trasmundo").

Pasada sobre cualquier escena ya pintada:
  1. todo se oscurece y se enfria (no hay luz electrica)
  2. lo que era luz electrica (ventanas, farolas) se apaga
  3. la NIEVE es la fuente de luz: brilla fria y fantasmal, y tine de cian lo
     que tiene cerca
  4. solo quedan luces calidas chicas: velas y lamparas de aceite
"""
import math

from PIL import Image, ImageFilter


def lum(c):
    return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]


def is_snow(c):
    r, g, b = c[:3]
    return b >= r and b > 150 and lum(c) > 140 and (b - r) < 90


def is_electric(c):
    r, g, b = c[:3]
    return r > 190 and g > 120 and b < 150 and r - b > 80


def blackout(img, candles=(), snow_glow=0.85, darkness=0.36):
    img = img.convert('RGBA')
    w, h = img.size
    src = img.load()
    # mascara de emision: la nieve
    emit = Image.new('L', (w, h), 0)
    ep = emit.load()
    for y in range(h):
        for x in range(w):
            c = src[x, y]
            if c[3] and is_snow(c):
                ep[x, y] = int(min(255, (lum(c) - 105) * 4.5))
    halo = emit.filter(ImageFilter.GaussianBlur(6))
    hp = halo.load()
    out = Image.new('RGBA', (w, h))
    op = out.load()
    night = (14, 18, 40)
    ghost = (150, 225, 240)
    for y in range(h):
        for x in range(w):
            r, g, b, a = src[x, y]
            if is_electric((r, g, b)):                       # se apaga la luz electrica
                r, g, b = 40, 46, 70
            k = darkness
            nr = r * k + night[0] * (1 - k)
            ng = g * k + night[1] * (1 - k)
            nb = b * k + night[2] * (1 - k)
            e = ep[x, y] / 255
            if e:                                            # la nieve brilla por si misma: luz de trasmundo
                nr = nr + (min(255, r * 0.80 + 20) - nr) * e * snow_glow
                ng = ng + (min(255, g * 0.92 + 40) - ng) * e * snow_glow
                nb = nb + (min(255, b * 0.98 + 50) - nb) * e * snow_glow
            hl = hp[x, y] / 255 * 0.6                        # tinte cian alrededor de la nieve
            nr += (ghost[0] - nr) * hl * 0.35
            ng += (ghost[1] - ng) * hl * 0.45
            nb += (ghost[2] - nb) * hl * 0.5
            op[x, y] = (int(min(255, nr)), int(min(255, ng)), int(min(255, nb)), a)
    # velas y lamparas de aceite: luz calida chica
    for (cx, cy, rad) in candles:
        for y in range(int(cy - rad), int(cy + rad)):
            for x in range(int(cx - rad), int(cx + rad)):
                if 0 <= x < w and 0 <= y < h:
                    d = math.hypot(x - cx, (y - cy) * 1.2) / rad
                    if d < 1:
                        r, g, b, a = op[x, y]
                        t = (1 - d) ** 2 * 0.75
                        op[x, y] = (int(r + (255 - r) * t), int(g + (200 - g) * t * 0.85), int(b + (120 - b) * t * 0.4), a)
        for dx, dy in ((0, 0), (0, -1), (1, 0)):
            if 0 <= cx + dx < w and 0 <= cy + dy < h:
                op[cx + dx, cy + dy] = (255, 244, 200, 255)
    return out
