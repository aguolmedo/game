"""Vista por la ventana del altillo (diseño, no toca el juego). Pedido 18/11: "el marco
de cuando ves por la ventana es feo".
Hoy (src/scenes/view.js drawFrame): toda la pantalla es madera chata con rayitas
sueltas, travesaños de 8-10 px que parten el paisaje, nada dice "adentro del altillo".
Propuesta:
  - Alrededor, la pared de LADRILLO del altillo (no madera infinita).
  - Marco de 14 px con bisel (luz arriba-izq, sombra abajo-der) y veta que sigue la tabla.
  - Travesaños finos de 6 px con bisel.
  - ESCARCHA tramada en las esquinas de cada vidrio (afuera hiela).
  - Dos reflejos en diagonal en el vidrio. Alféizar con volumen.
  - La nevada nueva (PI-7) cae detrás del vidrio.
Salida: out/vista.gif, out/vista.png, out/vista_compare.png
"""
import math
import os
import random

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(HERE, 'out')
PAN = Image.open(os.path.join(ROOT, 'public', 'assets', 'views', 'attic_pan.png')).convert('RGB')

INK = (31, 22, 26)
W_HI, W_LI, W_BA, W_DA = (192, 138, 82), (160, 106, 60), (122, 78, 44), (74, 42, 26)
BRICK = [(90, 42, 48), (110, 56, 56), (78, 36, 42)]     # ladrillo de adentro, de noche: no compite con la vista
MORTAR = (52, 40, 44)
FROST = (238, 250, 255)
BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]

FX0, FY0, FX1, FY1 = 22, 10, 457, 236           # marco exterior
T = 14                                           # ancho del marco
GX0, GY0, GX1, GY1 = FX0 + T, FY0 + T, FX1 - T, FY1 - T   # vidrio
MW = 6                                           # travesaños


def wall():
    im = Image.new('RGB', (480, 270), MORTAR)
    px = im.load()
    rnd = random.Random(3)
    for row in range(0, 270 // 7 + 1):
        y0 = row * 7
        off = 0 if row % 2 == 0 else 9
        for bx in range(-18, 480, 18):
            c = BRICK[rnd.randrange(3)]
            for y in range(y0 + 1, min(270, y0 + 7)):
                for x in range(bx + off + 1, bx + off + 18):
                    if 0 <= x < 480:
                        px[x, y] = c
            for x in range(bx + off + 1, bx + off + 18):     # luz arriba del ladrillo
                if 0 <= x < 480 and y0 + 1 < 270:
                    px[x, y0 + 1] = tuple(min(255, v + 18) for v in c)
    return im


def bevel_rect(px, x0, y0, x1, y1, vertical):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            c = W_BA
            if x == x0 or y == y0:
                c = W_HI
            elif x == x1 or y == y1:
                c = W_DA
            elif (x == x0 + 1 or y == y0 + 1):
                c = W_LI
            # veta larga que sigue la tabla
            if c == W_BA:
                if vertical and (x * 7 + (y // 23)) % 9 == 0:
                    c = W_DA if (y // 11) % 3 else W_LI
                if not vertical and (y * 5 + (x // 29)) % 7 == 0:
                    c = W_DA if (x // 13) % 3 else W_LI
            px[x, y] = c


def frame_layer(base):
    im = base.copy()
    px = im.load()
    # contorno y marco (4 tablas)
    for x in range(FX0 - 1, FX1 + 2):
        px[x, FY0 - 1] = INK
        px[x, FY1 + 1] = INK
    for y in range(FY0 - 1, FY1 + 2):
        px[FX0 - 1, y] = INK
        px[FX1 + 1, y] = INK
    bevel_rect(px, FX0, FY0, FX1, GY0 - 1, False)       # arriba
    bevel_rect(px, FX0, GY1 + 1, FX1, FY1, False)       # abajo
    bevel_rect(px, FX0, GY0, GX0 - 1, GY1, True)        # izquierda
    bevel_rect(px, GX1 + 1, GY0, FX1, GY1, True)        # derecha
    # canto interior: sombra arriba/izq del vidrio, luz abajo/der (el vidrio está hundido)
    for x in range(GX0 - 1, GX1 + 2):
        px[x, GY0 - 1] = W_DA
        px[x, GY1 + 1] = W_HI
    for y in range(GY0 - 1, GY1 + 2):
        px[GX0 - 1, y] = W_DA
        px[GX1 + 1, y] = W_HI
    # alféizar con volumen
    for x in range(FX0 - 8, FX1 + 9):
        px[x, FY1 + 1] = INK
        for k, c in enumerate((W_HI, W_LI, W_BA, W_BA, W_BA, W_DA)):
            px[x, FY1 + 2 + k] = c
        px[x, FY1 + 8] = INK
        for k in range(1, 5):
            v = px[x, FY1 + 8 + k]
            px[x, FY1 + 8 + k] = tuple(int(c * (0.55 + k * 0.1)) for c in v)
    return im


def mullions(im):
    px = im.load()
    mx = (GX0 + GX1) // 2 - MW // 2
    my = (GY0 + GY1) // 2 - MW // 2
    bevel_rect(px, mx, GY0, mx + MW - 1, GY1, True)
    bevel_rect(px, GX0, my, GX1, my + MW - 1, False)
    for y in range(GY0, GY1 + 1):                        # sombra fina sobre el vidrio
        px[mx + MW, y] = tuple(int(v * 0.7) for v in px[mx + MW, y])
    for x in range(GX0, GX1 + 1):
        px[x, my + MW] = tuple(int(v * 0.7) for v in px[x, my + MW])
    return mx, my


def frost_and_reflect(im, mx, my):
    px = im.load()
    panes = [(GX0, GY0, mx - 1, my - 1), (mx + MW, GY0, GX1, my - 1),
             (GX0, my + MW, mx - 1, GY1), (mx + MW, my + MW, GX1, GY1)]
    for (x0, y0, x1, y1) in panes:
        for (cx, cy) in ((x0, y0), (x1, y0), (x0, y1), (x1, y1)):
            for y in range(y0, y1 + 1):
                for x in range(x0, x1 + 1):
                    d = math.hypot(x - cx, y - cy)
                    if d < 22:
                        k = 1 - d / 22
                        if k * 16 > BAYER[y % 4][x % 4] + 3:
                            o = px[x, y]
                            a = 0.55 + 0.4 * k
                            px[x, y] = tuple(int(o[i] * (1 - a) + FROST[i] * a) for i in range(3))
        # reflejo: dos rayas en diagonal, arriba a la izquierda de cada vidrio
        for s, (ox, w) in enumerate(((18, 3), (28, 1))):
            for t in range(0, 40):
                for k in range(w):
                    X, Y = x0 + ox + t + k, y0 + 40 - t
                    if x0 <= X <= x1 and y0 <= Y <= y1:
                        o = px[X, Y]
                        px[X, Y] = tuple(min(255, int(o[i] * 0.75 + 255 * 0.25)) for i in range(3))


def compose(pan_x, flakes=None, t=0.0):
    base = wall()
    glass = PAN.crop((pan_x, 15, pan_x + 480, 285))
    if flakes:
        import nieve as N
        glass = N.draw_night(glass, flakes, t)
    base.paste(glass.crop((GX0, GY0, GX1 + 1, GY1 + 1)), (GX0, GY0))
    im = frame_layer(base)
    mx, my = mullions(im)
    frost_and_reflect(im, mx, my)
    return im


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    import nieve as N
    fl = N.make_flakes(8, [('back', 60, 8, 16), ('mid', 28, 18, 30), ('front', 6, 40, 60)])
    rnd = random.Random(2)
    for f in fl:
        f['blink'] = rnd.uniform(0.9, 2.2)
    frames = [compose(200 + i, fl, i * 0.08).resize((1440, 810), Image.NEAREST) for i in range(40)]
    frames[0].save(os.path.join(OUT, 'vista.gif'), save_all=True, append_images=frames[1:], duration=80, loop=0)
    frames[5].save(os.path.join(OUT, 'vista.png'))
    hoy = Image.open(os.path.join(ROOT, 'art', 'direccion', 'doc', 'capturas', 'esc_vista_altillo.png')).convert('RGB').resize((960, 540), Image.NEAREST)
    cmp_ = Image.new('RGB', (960 * 2 + 20, 540), (17, 14, 20))
    cmp_.paste(hoy, (0, 0))
    cmp_.paste(frames[5].resize((960, 540), Image.NEAREST), (980, 0))
    cmp_.save(os.path.join(OUT, 'vista_compare.png'))
    print('ok')
