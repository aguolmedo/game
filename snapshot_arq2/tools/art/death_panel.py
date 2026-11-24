"""Vineta de muerte: ilustracion de historieta 1x para la escena de la arena.

Genera public/assets/death_panel.png (350x160) y death_panel.json.
El marco de papel, el cartucho y el texto los dibuja el juego encima, para
que la fuente y los glifos queden nitidos. Aca va solo la ilustracion:
calle nocturna despues del apagon, Juan tirado boca abajo en la nieve
(traje casero de art/concept/suit.py, al doble), el rifle caido, la grieta
en la visera y los cascarudos rodeandolo. La animacion de copos la hace JS.

Uso: python3 tools/art/death_panel.py
No escribe nada dentro de art/concept/: solo lee e importa.
"""
import json
import math
import os
import random
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent.parent
CONCEPT = ROOT / 'art' / 'concept'
ART = ROOT / 'tools' / 'art'
OUT = ROOT / 'public' / 'assets'
CASC = OUT / 'cascarudos.png'
CASC_JSON = OUT / 'cascarudos.json'

sys.dont_write_bytecode = True
sys.path.insert(0, str(ART))
sys.path.insert(0, str(CONCEPT))

from pixel import Pix, hx, mix  # noqa: E402
import suit                      # noqa: E402
import street                    # noqa: E402
import lighting                  # noqa: E402

W, H = 350, 160
GROUND = 96
ROAD_TOP = 118
ROAD_BOTTOM = 150

INK = hx('#16131c')

# Paletas del comic (mismas que art/concept/street.py).
NIGHT = [hx('#0b0c1d'), hx('#121630'), hx('#1b2440')]
SNOW = [hx('#7896b0'), hx('#8eaec6'), hx('#a6c4d8'), hx('#c8e2ee'), hx('#eefaff')]
ROAD = [hx('#1e2232'), hx('#262b3e'), hx('#30364c')]
SIL = [hx('#151a2e'), hx('#1c2238'), hx('#262e48')]
WARM = [hx('#b87028'), hx('#ecab4c'), hx('#ffe8b0')]
SHADOW = hx('#3c4c70')


def ellipse(p, cx, cy, rx, ry, col, a=255):
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1:
                p.set(x, y, col, a)


def soft_shadow(p, cx, cy, rx, ry, a=110):
    """Sombra azulada bajo un bicho o el cuerpo (solo pixeles pintados)."""
    for y in range(int(cy - ry), int(cy + ry) + 1):
        for x in range(int(cx - rx), int(cx + rx) + 1):
            d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2
            if d > 1:
                continue
            c = p.get(x, y)
            if c[3] == 0:
                continue
            k = a / 255 * (1 - d * 0.35)
            p.set(x, y, mix(c[:3], SHADOW, k))


def sky(p, rnd):
    # cielo en bandas planas (sin degradé)
    bands = [(0, 18, NIGHT[0]), (18, 38, mix(NIGHT[0], NIGHT[1], 0.5)),
             (38, 60, NIGHT[1]), (60, GROUND + 2, NIGHT[2])]
    for y0, y1, col in bands:
        p.rect(0, y0, W, y1 - y0, col)
    for _ in range(40):                               # estrellas
        p.set(rnd.randrange(W), rnd.randrange(2, 52),
              mix(NIGHT[2], SNOW[3], 0.3 + rnd.random() * 0.5))
    # luna chica y fria
    for k in range(7):
        for i in range(7):
            if (i - 3) ** 2 + (k - 3) ** 2 <= 9:
                p.set(298 + i, 14 + k, mix(NIGHT[2], SNOW[2], 0.55))
    p.rect(301, 14, 4, 4, mix(NIGHT[2], SNOW[3], 0.4))


def house(p, x, w, h, col, rnd):
    """Casa de fondo: pared en silueta y techo nevado a dos aguas."""
    top = GROUND - h
    half = w // 2
    # techo cubierto de nieve, mas ancho que alto
    for k in range(half):
        row = top - k // 2
        fill = SNOW[0] if k < half - 4 else SNOW[1]
        p.hline(x + k, x + w - 1 - k, row, fill)
        p.set(x + k, row, SNOW[2])
        p.set(x + w - 1 - k, row, SNOW[0])
    p.rect(x, top, w, h + 10, col)
    # alero: sombra oscura y borde de nieve
    p.hline(x - 1, x + w, top, mix(col, NIGHT[0], 0.35))
    p.hline(x, x + w - 1, top - 1, SNOW[2])
    if rnd.random() < 0.6:                            # chimenea
        cx = x + rnd.randrange(8, max(9, w - 10))
        p.rect(cx, top - half // 2 - 7, 4, 10, col)
        p.hline(cx, cx + 3, top - half // 2 - 7, SNOW[3])
    # ventanas apagadas con reflejo frio
    for wx in (x + 6, x + w - 14):
        if wx < x + 3 or wx + 8 > x + w - 3:
            continue
        p.rect(wx, top + 7, 8, 8, mix(col, NIGHT[0], 0.45))
        p.frame(wx, top + 7, 8, 8, mix(col, SNOW[0], 0.30))
        p.vline(wx + 3, top + 7, top + 14, mix(col, SNOW[0], 0.22))
        p.vline(wx + 4, top + 7, top + 14, mix(col, NIGHT[0], 0.3))
        p.set(wx + 1, top + 8, SNOW[1])
    if rnd.random() < 0.5:                            # puerta
        dx = x + w // 2 - 3
        p.rect(dx, top + h - 2, 6, 12, mix(col, NIGHT[0], 0.4))
        p.frame(dx, top + h - 2, 6, 12, mix(col, SNOW[0], 0.2))


def rooftops(p, rnd):
    x = -6
    while x < W:
        w = rnd.choice((30, 38, 46, 54))
        h = rnd.choice((20, 24, 30))
        house(p, x, w, h, SIL[rnd.randrange(len(SIL))], rnd)
        x += w + rnd.choice((4, 8, 14))
    # pinos en silueta sobre la nieve
    for cx, base in ((24, GROUND + 4), (330, GROUND + 4)):
        for yy in range(base - 30, base + 1):
            ww = (yy - (base - 30)) // 3 + 1
            p.hline(cx - ww, cx + ww, yy, hx('#141d24'))
        p.set(cx, base - 30, SNOW[2])
    # farola de brazo curvo
    p.rect(66, GROUND - 48, 2, 48, SIL[0])
    p.rect(65, GROUND - 50, 3, 2, SIL[0])
    for k in range(10):
        a = math.radians(180 + k * 9)
        p.set(67 + round(6 * math.cos(a)), GROUND - 49 + round(6 * math.sin(a)), SIL[0])
    p.rect(73, GROUND - 52, 6, 2, SIL[0])
    p.hline(72, 79, GROUND - 53, SNOW[2])


def ground(p, rnd):
    # vereda y calle cubiertas de nieve, con brillo frio
    p.rect(0, GROUND, W, H - GROUND, SNOW[0])
    for y in range(GROUND, H):
        for x in range(W):
            c = SNOW[0]
            if (x * 5 + y * 3) % 23 == 0:
                c = SNOW[1]
            if y >= ROAD_TOP and y < ROAD_BOTTOM:
                c = ROAD[0]
                if (x + y * 3) % 29 == 0:
                    c = ROAD[1]
                if (x * 3 + y) % 13 == 0:
                    c = mix(ROAD[0], SNOW[0], 0.35)
            elif y >= ROAD_BOTTOM:
                c = SNOW[1] if (x + y) % 17 else SNOW[2]
            elif y >= GROUND + 14 and y < ROAD_TOP:
                c = SNOW[1] if (x + y // 4) % 23 == 0 else SNOW[0]
                if y == GROUND + 14:
                    c = mix(SNOW[0], ROAD[0], 0.35)
            p.set(x, y, c)
    # cordones con nieve acumulada
    p.hline(0, W - 1, ROAD_TOP, mix(SNOW[0], ROAD[0], 0.5))
    p.hline(0, W - 1, ROAD_TOP + 1, SNOW[1])
    p.hline(0, W - 1, ROAD_BOTTOM - 1, SNOW[0])
    p.hline(0, W - 1, ROAD_BOTTOM, SNOW[1])
    for _ in range(6):                                # medanos de nieve
        cx = rnd.randrange(W)
        cy = rnd.randrange(ROAD_TOP + 9, ROAD_BOTTOM - 4)
        rx = rnd.randrange(14, 30)
        ellipse(p, cx, cy, rx, rnd.randrange(3, 5), SNOW[1])
        p.hline(cx - rx // 2, cx + rx // 2, cy - 2, SNOW[2])
    # huellas: la salida de Juan termina aca
    for k in range(10):
        x = 78 - k * 7
        y = 134 - (k % 2) * 3
        p.set(x, y, ROAD[0])
        p.set(x + 1, y, ROAD[0])
    # chispas de nieve
    for _ in range(26):
        x, y = rnd.randrange(W), rnd.randrange(GROUND + 4, H - 2)
        p.set(x, y, SNOW[2])


def load_casc():
    img = Image.open(CASC).convert('RGBA')
    frames = json.loads(CASC_JSON.read_text())['frames']
    return img, frames


def tint_sprite(img, tint=(18, 24, 50), k=0.35, rim=None):
    """Oscurece un sprite para la noche y le pone rim light frio arriba."""
    out = img.convert('RGBA').copy()
    px = out.load()
    w, h = out.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            r, g, b = mix((r, g, b), tint, k)
            if rim:
                above = px[x, y - 1] if y > 0 else (0, 0, 0, 0)
                left = px[x - 1, y] if x > 0 else (0, 0, 0, 0)
                if above[3] == 0 or left[3] == 0:
                    r, g, b = mix((r, g, b), rim, 0.55)
            px[x, y] = (r, g, b, a)
    return out


def paste_img(p, img, x, y):
    p.img.alpha_composite(img, (int(x), int(y)))
    p.px = p.img.load()


def juan_lying():
    """El traje del comic, acostado: giramos el sprite de frente y lo
    escalamos x2. La cabeza queda a la izquierda."""
    base = suit.sprite_front().img
    lying = base.rotate(90, expand=True)             # 32x16
    lying = lying.resize((lying.width * 2, lying.height * 2), Image.NEAREST)
    return tint_sprite(lying, k=0.28, rim=hx('#9fdcee'))


def crack_visor(p, x, y):
    """Grieta en la visera eliptica: tinta quebrada + un brillo."""
    pts = [(0, 0), (1, 0), (1, -1), (2, -1), (2, 0), (3, 0), (3, 1),
           (4, 1), (4, 2), (5, 2), (5, 3), (6, 4), (4, 4), (3, 5)]
    for dx, dy in pts:
        p.set(x + dx, y + dy, INK)
    p.set(x + 2, y - 2, hx('#eefaff'))
    p.set(x + 1, y + 1, mix(hx('#22303e'), SNOW[3], 0.55))


def make_rifle():
    """Rifle de la epoca tirado en la nieve, 1x (despues va al doble)."""
    p = Pix(34, 9)
    stock = [hx('#3a2416'), hx('#6a4426'), hx('#94643a')]
    barrel = [hx('#1a1c22'), hx('#3a3e48'), hx('#7a828e')]
    for k in range(10):                              # culata
        p.set(2 + k, 4, stock[1]); p.set(2 + k, 5, stock[0]); p.set(2 + k, 3, stock[2])
    for k in range(21):                              # cuerpo y cano
        p.set(11 + k, 4, barrel[1]); p.set(11 + k, 5, barrel[0])
    p.set(31, 3, barrel[2]); p.set(32, 3, barrel[2])
    p.set(13, 3, barrel[2]); p.set(14, 3, barrel[2])
    p.set(16, 6, stock[0]); p.set(17, 6, stock[0])   # guardamonte
    for x in range(15, 28, 2):                       # nieve apoyada arriba
        p.set(x, 2, SNOW[2])
    return p


def draw_juan(p, rnd):
    lying = juan_lying()                             # 64x32
    x, y = 116, 102
    for k in range(32):                              # sombra alargada
        ellipse(p, x + 4 + k * 2, y + 34, 4, 3, mix(SNOW[0], SHADOW, 0.55))
    paste_img(p, lying, x, y)
    # la nieve ya empieza a taparlo
    for k in range(3):
        ellipse(p, x + 46 + k * 5, y + 27 - k, 9, 4, SNOW[1])
    ellipse(p, x + 54, y + 22, 12, 4, SNOW[1])
    p.hline(x + 42, x + 63, y + 21, SNOW[2])
    ellipse(p, x + 22, y + 30, 10, 3, SNOW[1])      # falda de nieve en el pecho
    p.hline(x + 14, x + 29, y + 29, SNOW[2])
    for k in range(4):                               # grumos sobre la espalda
        p.set(x + 24 + k * 6, y + 8 + (k % 2), SNOW[2])
    crack_visor(p, x + 13, y + 16)
    # un brazo estirado adelante (guante del traje)
    for k in range(7):
        p.set(x - 1 - k, y + 20 + k // 3, suit.C['f'])
        p.set(x - 1 - k, y + 21 + k // 3, suit.C['D'])
    p.rect(x - 10, y + 21, 4, 3, suit.C['K'])
    p.set(x - 9, y + 21, suit.C['k'])
    return (x, y)


def draw_rifle(p):
    rifle = make_rifle()
    up = rifle.img.resize((rifle.w * 2, rifle.h * 2), Image.NEAREST)
    up = tint_sprite(up, k=0.30, rim=None)
    paste_img(p, up, 188, 126)
    for k in range(30):
        p.set(190 + k * 2, 146, mix(SNOW[0], SHADOW, 0.45))


def draw_cascarudos(p, rnd):
    atlas, frames = load_casc()
    spots = [
        ('veloz:left:1', 18, 118, 2),
        ('cascarudo:down:0', 196, 88, 2),
        ('cascarudo:right:2', 266, 104, 2),
        ('veloz:right:0', 302, 92, 2),
    ]
    for name, x, y, scale in spots:
        f = frames[name]
        soft_shadow(p, x + f[2], y + f[3] * scale - 4, f[2], 5, 120)
    for name, x, y, scale in spots:
        f = frames[name]
        crop = atlas.crop((f[0], f[1], f[0] + f[2], f[1] + f[3]))
        crop = crop.resize((f[2] * scale, f[3] * scale), Image.NEAREST)
        crop = tint_sprite(crop, k=0.16, rim=hx('#7f9ab8'))
        paste_img(p, crop, x, y)


def build():
    rnd = random.Random(1957)
    p = Pix(W, H)
    sky(p, rnd)
    rooftops(p, rnd)
    ground(p, rnd)
    p.px = p.img.load()

    # apagon: la nieve es la unica luz (art/concept/lighting.py). Solo al
    # fondo, para que Juan y los bichos conserven su lectura.
    dark = lighting.blackout(p.img, snow_glow=0.42, darkness=0.52)
    p.img = dark
    p.px = p.img.load()

    draw_cascarudos(p, rnd)
    draw_rifle(p)
    draw_juan(p, rnd)

    OUT.mkdir(parents=True, exist_ok=True)
    p.img.save(OUT / 'death_panel.png')

    flakes = []
    for i in range(48):
        flakes.append([
            round(rnd.uniform(0, W), 1),
            round(rnd.uniform(0, H), 1),
            round(rnd.uniform(9, 22), 1),
            round(rnd.uniform(1, 4), 1),
            round(rnd.uniform(0, math.tau), 2),
            rnd.choice((1, 1, 1, 2)),
        ])
    meta = {
        'image': 'death_panel.png',
        'size': [W, H],
        'flakes': flakes,
    }
    (OUT / 'death_panel.json').write_text(
        json.dumps(meta, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'death_panel.png {W}x{H} + death_panel.json ({len(flakes)} copos)')


if __name__ == '__main__':
    build()
