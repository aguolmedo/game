"""La nevada (diseño, no toca el juego).
Por qué hoy no se ve (src/snow.js + public/assets/snow.png):
  1. El copo es una cruz de 3x3 pero se dibuja en un plano de 2x2: se pierde la
     forma y queda una mancha de 1-2 px.
  2. Celeste/blanco sobre calle y cielo celeste/blanco, y los de atrás al 55%.
Propuesta: tres capas, siempre a tamaño real y sin transparencia.
  - atrás:   puntos de 1 px #c8e2ee, lentos (muchos).
  - medio:   cruz 3x3 blanca con una sombra de 1 px abajo-derecha (#4a6a8a).
  - adelante: estrella 5x5, pocas, rápidas, con sombra.
  La sombra es lo que la hace leerse sobre la nieve clara; sobre fondo oscuro manda el blanco.
Salida: out/nieve_compare.gif (hoy | propuesta), out/nieve_copos_x10.png, out/nieve_*.png (sprites).
"""
import math
import os
import random

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(HERE, 'out')
BASE = os.path.join(ROOT, 'art', 'direccion', 'doc', 'capturas', 'raw_street.png')

C_OLD = (127, 216, 240)
W = (255, 255, 255)
w = (238, 250, 255)
SH = (74, 106, 138)

SPR_MID = [(1, 0, w), (0, 1, w), (1, 1, W), (2, 1, w), (1, 2, w), (2, 2, SH), (3, 2, None), (2, 3, None)]
SPR_MID = [(1, 0, w), (0, 1, w), (1, 1, W), (2, 1, w), (1, 2, w), (2, 2, SH)]
SPR_FRONT = [(2, 0, w), (1, 1, w), (2, 1, W), (3, 1, w), (0, 2, w), (1, 2, W), (2, 2, W), (3, 2, W), (4, 2, w),
             (1, 3, w), (2, 3, W), (3, 3, w), (2, 4, w), (3, 4, SH), (4, 3, SH), (5, 2, SH), (3, 5, SH)]


def sprite(pts, size):
    im = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    for (x, y, c) in pts:
        im.putpixel((x, y), c + (255,))
    return im


def blend(px, x, y, c, a):
    if 0 <= x < 480 and 0 <= y < 270:
        o = px[x, y]
        px[x, y] = tuple(int(o[i] * (1 - a) + c[i] * a) for i in range(3))


def make_flakes(seed, layers):
    rnd = random.Random(seed)
    fl = []
    for kind, n, vmin, vmax in layers:
        for _ in range(n):
            fl.append(dict(kind=kind, x=rnd.uniform(0, 480), y=rnd.uniform(0, 270),
                           v=rnd.uniform(vmin, vmax), sway=rnd.uniform(2, 7), ph=rnd.uniform(0, 6.28)))
    return fl


def draw(base, flakes, t, new):
    im = base.copy()
    px = im.load()
    for f in flakes:
        x = int((f['x'] + math.sin(t * 1.3 + f['ph']) * f['sway'] + t * 6) % 480)
        y = int((f['y'] + t * f['v']) % 270)
        if not new:
            if f['kind'] == 'back':        # 3x3 aplastado a 2x2 al 55%: queda una mancha
                for dx, dy in ((0, 0), (1, 0), (0, 1)):
                    blend(px, x + dx, y + dy, C_OLD, 0.55)
                blend(px, x + 1, y + 1, (239, 254, 255), 0.55)
            else:                          # front: 3x3 a 1.5 ~ cruz difusa al 95%
                for dx, dy in ((1, 0), (0, 1), (1, 1), (2, 1), (1, 2)):
                    blend(px, x + dx, y + dy, C_OLD if (dx, dy) != (1, 1) else (239, 254, 255), 0.95)
        else:
            if f['kind'] == 'back':
                blend(px, x, y, (200, 226, 238), 1)
            elif f['kind'] == 'mid':
                for (dx, dy, c) in SPR_MID:
                    blend(px, x + dx, y + dy, c, 1)
            else:
                for (dx, dy, c) in SPR_FRONT:
                    blend(px, x + dx, y + dy, c, 1)
    return im


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    base = Image.open(BASE).convert('RGB').resize((480, 270), Image.NEAREST)
    old = make_flakes(1, [('back', 80, 12, 42), ('front', 30, 12, 42)])
    new = make_flakes(2, [('back', 90, 8, 16), ('mid', 45, 18, 30), ('front', 12, 40, 60)])
    frames = []
    for i in range(30):
        t = i * 0.08
        a = draw(base, old, t, False).resize((960, 540), Image.NEAREST)
        b = draw(base, new, t, True).resize((960, 540), Image.NEAREST)
        f = Image.new('RGB', (1940, 580), (17, 14, 20))
        f.paste(a, (0, 40))
        f.paste(b, (980, 40))
        d = ImageDraw.Draw(f)
        font = ImageFont.truetype('/usr/share/fonts/noto/NotoSans-Regular.ttf', 24)
        d.text((10, 6), 'hoy', font=font, fill=(238, 228, 210))
        d.text((990, 6), 'propuesta: 3 capas + sombra de 1 px', font=font, fill=(238, 228, 210))
        frames.append(f)
    frames[0].save(os.path.join(OUT, 'nieve_compare.gif'), save_all=True, append_images=frames[1:], duration=80, loop=0)
    frames[0].save(os.path.join(OUT, 'nieve_compare.png'))
    # sprites
    mid = sprite(SPR_MID, 3)
    front = sprite(SPR_FRONT, 6)
    back = sprite([(0, 0, (200, 226, 238))], 1)
    for n, im in (('nieve_atras', back), ('nieve_medio', mid), ('nieve_adelante', front)):
        im.save(os.path.join(OUT, n + '.png'))
    lam = Image.new('RGB', (3 * 120 + 40, 150), (70, 84, 72))
    for i, im in enumerate((back, mid, front)):
        lam.paste(im.resize((im.width * 14, im.height * 14), Image.NEAREST), (20 + i * 130, 30), im.resize((im.width * 14, im.height * 14), Image.NEAREST))
    lam.save(os.path.join(OUT, 'nieve_copos_x10.png'))
    print('ok')


# ====================================================================== noche
# Pedido 18/11: "la nieve es un poco brillante y después baja, cuando estás afuera
# sobre todo". La nevada del Eternauta es fosforescente: cada copo se ENCIENDE y se
# APAGA despacio mientras cae (ciclo propio, desfasado). Encendido: centro blanco +
# halo cian de 1 px. Apagado: el copo de siempre, más azulado. Se nota de noche.
GLOW = (150, 225, 240)        # el cian de la nieve que brilla (SNOW_GLOW de lighting.js)


def draw_night(base, flakes, t):
    im = base.copy()
    px = im.load()
    for f in flakes:
        x = int((f['x'] + math.sin(t * 1.3 + f['ph']) * f['sway'] + t * 6) % 480)
        y = int((f['y'] + t * f['v']) % 270)
        b = 0.5 + 0.5 * math.sin(t * f.get('blink', 1.6) + f['ph'] * 3)    # 0 apagado .. 1 encendido
        if f['kind'] == 'back':
            c = (200, 226, 238) if b > 0.5 else (120, 150, 180)
            blend(px, x, y, c, 1)
            continue
        pts = SPR_MID if f['kind'] == 'mid' else SPR_FRONT
        cx, cy = (1, 1) if f['kind'] == 'mid' else (2, 2)
        if b > 0.55:              # halo cian alrededor (solo bordes, a 1 px)
            r = 2 if f['kind'] == 'mid' else 3
            for dy in range(-r, r + 1):
                for dx in range(-r, r + 1):
                    if abs(dx) + abs(dy) == r:
                        blend(px, x + cx + dx, y + cy + dy, GLOW, 0.35 + 0.4 * (b - 0.55) / 0.45)
        for (dx, dy, c) in pts:
            if c == SH:
                c2 = SH
            elif b > 0.55:
                c2 = c
            else:                 # apagado: más azul y menos blanco
                c2 = tuple(int(v * 0.72) for v in c)
            blend(px, x + dx, y + dy, c2, 1)
    return im


def night_gif():
    import lighting3 as L3
    raw = Image.open(os.path.join(ROOT, 'art', 'direccion', 'doc', 'capturas', 'raw_street.png')).convert('RGB').resize((480, 270), Image.NEAREST)
    L3.CALLE = raw
    base = L3.calle(0).convert('RGB')
    flakes = make_flakes(3, [('back', 90, 8, 16), ('mid', 45, 18, 30), ('front', 12, 40, 60)])
    rnd = random.Random(9)
    for f in flakes:
        f['blink'] = rnd.uniform(0.9, 2.2)
    frames = [draw_night(base, flakes, i * 0.08).resize((1440, 810), Image.NEAREST) for i in range(48)]
    frames[0].save(os.path.join(OUT, 'nieve_noche.gif'), save_all=True, append_images=frames[1:], duration=80, loop=0)
    frames[10].save(os.path.join(OUT, 'nieve_noche.png'))
    print('ok noche')


if __name__ == '__main__':
    night_gif()
