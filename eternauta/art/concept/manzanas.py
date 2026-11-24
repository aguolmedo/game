"""Las manzanas del barrio (roguelike, primera iteración). Diseño, NO toca el juego. 22/11.

El barrio es una GRILLA de piezas de 20x20 baldosas (320x320 px de mundo), como las salas de un
roguelike. Cada pieza tiene salidas fijas para encastrar con las demás:
  - este/oeste: la calzada en las filas 15-17
  - norte/sur:  la calzada en las columnas 9-11
Cada loop arma el barrio con otro orden (docs/roguelike_narrativa.md, "El mapa cambia en cada loop").

Primera tanda, cinco formas distintas (para que no sea siempre una calle horizontal):
  1. La casa de Juan       cuadra recta (O-E). Siempre la primera.
  2. La esquina del choque cruce en T (O-E-N) con la ferretería en la ochava.
  3. La plaza              abierta, caminos en diagonal; sale al norte por la plaza.
  4. Las vías              paso a nivel del Mitre: las vías parten la pieza en dos.
  5. La cortada            callejón sin salida con el almacén al fondo. Botín y trampa.

Todo con las baldosas y sprites del juego (art/sprites). Lo que no existía (bicicleta, banco,
busto, hamaca, baranda, vagón, barrera, garita, cruz de San Andrés, vidriera rota, medianeras)
se dibuja acá con las mismas reglas: contorno de color, 3-4 tonos, luz arriba-izquierda, nieve arriba.

Salida: art/concept/out/manzanas/*.png
"""
import math
import os
import random

from PIL import Image, ImageDraw, ImageEnhance

import roguelike as rg

HERE = os.path.dirname(os.path.abspath(__file__))
SPR = rg.SPR
OUT = os.path.join(HERE, 'out', 'manzanas')
os.makedirs(OUT, exist_ok=True)
hx = rg.hx
T = 16
N = 20
MW = MH = N * T


def spr(folder, name):
    return Image.open(os.path.join(SPR, folder, name + '.png')).convert('RGBA')


def tile(name):
    return spr('tiles', name)


def flip(im):
    return im.transpose(Image.FLIP_LEFT_RIGHT)


# ------------------------------------------------------------------ paleta de detalles
SNOW = [hx('9fb6c8'), hx('c5d8e4'), hx('e2f4ff'), hx('f6fcff')]
STONE = [hx('5a6a80'), hx('8aa4b8'), hx('b8ccd8'), hx('c5d8e4')]
IRON = [hx('1a1c26'), hx('2a2e3c'), hx('444a5c'), hx('6a7286')]
WOOD = [hx('3a2418'), hx('5a3820'), hx('7a4e2c'), hx('a06a3c')]
BRICK = [hx('4a2222'), hx('6e3430'), hx('8a4a3e'), hx('a8645a')]
RED = [hx('5a1a1a'), hx('8a2a24'), hx('b03a2e'), hx('d86a5a')]
GREEN = [hx('1e3a2c'), hx('2e5a40'), hx('3e7a52'), hx('6aa07a')]
GLASS = [hx('2a3a52'), hx('3e5a7a'), hx('6a8eaa'), hx('cfe6f2')]


def canvas(w, h):
    im = Image.new('RGBA', (w + 2, h + 2), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


def done(im):
    rg.outline(im)
    return im


def snowcap(d, x0, x1, y, thick=2):
    """Nieve arriba de algo: un borde blanco con bultitos."""
    for x in range(x0, x1 + 1):
        t = thick + (1 if (x * 7) % 5 == 0 else 0)
        d.line([(x, y - t + 1), (x, y)], fill=SNOW[2])
        d.point((x, y - t + 1), fill=SNOW[3])
    d.line([(x0, y + 1), (x1, y + 1)], fill=SNOW[0])


# ------------------------------------------------------------------ detalles nuevos (sprites)
def bicicleta():
    """La bicicleta apoyada en la ferretería (p041), con la rueda grande a la vista."""
    im, d = canvas(26, 16)
    for cx in (6, 20):
        d.ellipse([cx - 5, 5, cx + 5, 15], outline=IRON[1])
        d.ellipse([cx - 4, 6, cx + 4, 14], outline=IRON[2])
        d.point((cx, 10), fill=IRON[3])
    d.line([(6, 10), (12, 5), (20, 10)], fill=RED[2])           # cuadro
    d.line([(12, 5), (11, 10), (6, 10)], fill=RED[1])
    d.line([(11, 10), (17, 5)], fill=RED[2])
    d.line([(17, 5), (19, 2)], fill=IRON[2])                    # manubrio
    d.line([(18, 2), (21, 2)], fill=IRON[3])
    d.rectangle([10, 3, 13, 4], fill=WOOD[1])                   # asiento
    snowcap(d, 10, 13, 3, 1)
    d.line([(17, 1), (21, 1)], fill=SNOW[2])
    return done(im)


def banco():
    """Banco de plaza: tablas de madera sobre patas de hierro, con nieve."""
    im, d = canvas(30, 16)
    d.rectangle([1, 4, 28, 6], fill=WOOD[2])                    # respaldo
    d.line([(1, 4), (28, 4)], fill=WOOD[3])
    d.rectangle([1, 9, 28, 11], fill=WOOD[1])                   # asiento
    d.line([(1, 9), (28, 9)], fill=WOOD[3])
    d.line([(1, 7), (28, 7)], fill=WOOD[0])
    for x in (3, 26):
        d.line([(x, 3), (x, 15)], fill=IRON[1])
        d.point((x, 3), fill=IRON[3])
    snowcap(d, 1, 28, 3, 2)
    snowcap(d, 2, 27, 8, 1)
    return done(im)


def busto():
    """Un prócer de bronce sobre su pedestal, con un gorro de nieve."""
    im, d = canvas(18, 34)
    d.rectangle([2, 20, 15, 33], fill=STONE[1])                 # pedestal
    d.rectangle([3, 21, 14, 32], fill=STONE[2])
    d.line([(3, 21), (3, 32)], fill=STONE[3])
    d.rectangle([1, 30, 16, 33], fill=STONE[0])
    d.rectangle([5, 25, 12, 27], fill=STONE[1])                 # placa
    d.rectangle([4, 12, 13, 20], fill=hx('3a4a3a'))             # hombros de bronce verdoso
    d.ellipse([5, 3, 12, 13], fill=hx('4a5e48'))                # cabeza
    d.point([(7, 7), (10, 7)], fill=hx('22302a'))
    d.line([(6, 4), (9, 4)], fill=hx('7a9a72'))
    d.line([(5, 13), (12, 13)], fill=hx('2a3a2a'))
    snowcap(d, 5, 12, 3, 2)
    snowcap(d, 4, 13, 12, 1)
    snowcap(d, 1, 16, 20, 2)
    return done(im)


def hamaca():
    """Hamaca de plaza: el caballete de hierro y dos asientos quietos."""
    im, d = canvas(36, 30)
    for x0, x1 in ((2, 6), (33, 29)):
        d.line([(x0, 29), (x1, 2)], fill=IRON[2])
    d.line([(4, 2), (31, 2)], fill=IRON[1])
    d.line([(4, 3), (31, 3)], fill=IRON[0])
    for sx in (11, 22):
        d.line([(sx, 3), (sx, 20)], fill=IRON[3])
        d.line([(sx + 5, 3), (sx + 5, 20)], fill=IRON[3])
        d.rectangle([sx - 1, 20, sx + 6, 22], fill=WOOD[2])
        snowcap(d, sx - 1, sx + 6, 20, 1)
    snowcap(d, 4, 31, 2, 1)
    return done(im)


def baranda(w=32):
    """Barandita baja de hierro de la plaza (barrotes con punta)."""
    im, d = canvas(w, 14)
    d.line([(0, 4), (w - 1, 4)], fill=IRON[2])
    d.line([(0, 11), (w - 1, 11)], fill=IRON[1])
    for x in range(1, w, 4):
        d.line([(x, 3), (x, 13)], fill=IRON[1])
        d.point((x, 2), fill=IRON[3])
    snowcap(d, 0, w - 1, 3, 1)
    return done(im)


def vagon():
    """Vagón de carga del Mitre detenido en las vías: madera roja, puerta corrediza, nieve."""
    im, d = canvas(104, 50)
    d.rectangle([2, 8, 101, 40], fill=RED[1])
    d.rectangle([3, 9, 100, 39], fill=RED[2])
    for x in range(8, 100, 6):
        d.line([(x, 10), (x, 38)], fill=RED[1])                 # tablas
    d.line([(3, 9), (100, 9)], fill=RED[3])
    d.rectangle([38, 12, 64, 38], fill=RED[0])                  # puerta corrediza
    d.rectangle([40, 14, 62, 36], fill=RED[1])
    d.line([(40, 25), (62, 25)], fill=RED[0])
    d.line([(36, 11), (66, 11)], fill=IRON[1])                  # riel de la puerta
    d.rectangle([2, 40, 101, 43], fill=IRON[1])                 # bastidor
    for cx in (16, 30, 72, 86):
        d.ellipse([cx - 6, 38, cx + 6, 49], fill=IRON[1])
        d.ellipse([cx - 3, 41, cx + 3, 47], fill=IRON[2])
        d.point((cx, 44), fill=IRON[3])
    d.text = None
    for x, y in ((8, 16), (9, 16), (10, 16), (12, 16), (14, 16)):   # "F.C." pintado (rayitas)
        d.point((x, y), fill=hx('e8e1cc'))
    d.rectangle([8, 19, 20, 20], fill=hx('e8e1cc'))
    snowcap(d, 2, 101, 7, 3)
    return done(im)


def barrera(rota=True):
    """Barrera del paso a nivel: poste con contrapeso y el brazo rayado. Rota: el brazo caído."""
    im, d = canvas(60, 40)
    d.rectangle([4, 10, 8, 39], fill=IRON[2])                   # poste
    d.line([(4, 10), (4, 39)], fill=IRON[3])
    d.rectangle([1, 30, 11, 39], fill=STONE[1])                 # base
    d.rectangle([0, 6, 6, 12], fill=IRON[1])                    # contrapeso
    if rota == 'alta':
        pts = [(8, 12), (14, 0)]
    elif rota:
        pts = [(8, 12), (58, 34)]                               # caída, apoyada en la nieve
    else:
        pts = [(8, 12), (58, 12)]
    x0, y0 = pts[0]
    x1, y1 = pts[1]
    n = int(math.hypot(x1 - x0, y1 - y0))
    for i in range(n):
        x = x0 + (x1 - x0) * i / n
        y = y0 + (y1 - y0) * i / n
        c = RED[2] if (i // 5) % 2 == 0 else hx('eeeae0')
        d.rectangle([x, y, x + 1, y + 1], fill=c)
    snowcap(d, 0, 6, 6, 1)
    return done(im)


def garita():
    """Garita del guardabarrera: casilla de madera verde, ventanita y techo a un agua."""
    im, d = canvas(30, 40)
    d.polygon([(0, 10), (29, 6), (29, 10), (0, 14)], fill=WOOD[1])   # techo
    d.rectangle([2, 13, 27, 39], fill=GREEN[1])
    d.rectangle([3, 14, 26, 38], fill=GREEN[2])
    for x in range(6, 26, 4):
        d.line([(x, 15), (x, 38)], fill=GREEN[1])
    d.rectangle([6, 18, 15, 25], fill=WOOD[0])                  # ventanita
    d.rectangle([7, 19, 14, 24], fill=GLASS[1])
    d.line([(7, 19), (10, 19)], fill=GLASS[3])
    d.rectangle([18, 22, 24, 38], fill=WOOD[1])                 # puerta
    d.point((23, 30), fill=hx('c8a050'))
    snowcap(d, 0, 29, 9, 3)
    return done(im)


def cruz_san_andres():
    """La señal del paso a nivel: cruz blanca con borde rojo sobre un poste."""
    im, d = canvas(22, 42)
    d.rectangle([10, 10, 12, 41], fill=IRON[2])
    d.line([(10, 10), (10, 41)], fill=IRON[3])
    for (a, b) in (((1, 1), (21, 15)), ((21, 1), (1, 15))):
        d.line([a, b], fill=RED[1], width=4)
        d.line([a, b], fill=hx('eeeae0'), width=2)
    snowcap(d, 9, 13, 9, 1)
    return done(im)


def alambrado(w=32):
    """Alambrado de las vías: postes de cemento y tres hilos."""
    im, d = canvas(w, 18)
    for x in range(1, w, 16):
        d.rectangle([x, 2, x + 1, 17], fill=STONE[1])
        d.point((x, 2), fill=STONE[3])
        snowcap(d, x, x + 1, 2, 1)
    for y in (5, 10, 14):
        d.line([(0, y), (w - 1, y)], fill=IRON[2])
    return done(im)


def medianera(h=96, w=12):
    """Pared alta de ladrillo vista desde arriba (las medianeras que encajonan la cortada)."""
    im, d = canvas(w, h)
    d.rectangle([0, 0, w - 1, h - 1], fill=BRICK[1])
    for y in range(4, h, 6):
        off = 0 if (y // 6) % 2 else 3
        for x in range(off, w, 6):
            d.rectangle([x, y, x + 4, y + 3], fill=BRICK[2])
            d.point((x, y), fill=BRICK[3])
    d.rectangle([0, 0, w - 1, 3], fill=STONE[2])                # remate
    snowcap(d, 0, w - 1, 2, 2)
    return done(im)


def vidrios():
    """Vidrios rotos en la vereda frente a la vidriera del almacén."""
    im = Image.new('RGBA', (34, 10), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    rng = random.Random(21)
    for _ in range(14):
        x, y = rng.randrange(1, 32), rng.randrange(1, 9)
        if rng.random() < 0.5:
            d.line([(x, y), (x + 1, y - 1)], fill=GLASS[3])
        else:
            d.point((x, y), fill=GLASS[2])
    return im


def vidriera_rota(shop):
    """Rompe la vidriera del almacén: agujero oscuro y rajaduras en estrella."""
    im = shop.copy()
    d = ImageDraw.Draw(im)
    cx, cy = 30, 44
    d.polygon([(cx - 6, cy - 2), (cx - 1, cy - 5), (cx + 5, cy - 1), (cx + 2, cy + 4), (cx - 4, cy + 3)],
              fill=hx('0e1018'))
    for a in range(0, 360, 40):
        r = 9 + (a % 3) * 3
        x1, y1 = cx + math.cos(math.radians(a)) * r, cy + math.sin(math.radians(a)) * r * 0.6
        d.line([(cx, cy), (x1, y1)], fill=GLASS[3])
    return im


def cajon_frutas():
    im = spr('objects', 'crate').copy()
    d = ImageDraw.Draw(im)
    for (x, y, c) in ((4, 3, hx('d8a030')), (7, 3, hx('c84030')), (10, 4, hx('d8a030')),
                      (5, 5, hx('c84030')), (9, 2, hx('e8c050'))):
        d.rectangle([x, y, x + 1, y + 1], fill=c)
    return im


def buzon_correo():
    """El buzón rojo del Correo, de columna, con su gorro de nieve."""
    im, d = canvas(12, 24)
    d.rectangle([2, 4, 9, 23], fill=RED[2])
    d.line([(2, 4), (2, 23)], fill=RED[3])
    d.line([(9, 4), (9, 23)], fill=RED[1])
    d.ellipse([1, 0, 10, 7], fill=RED[2])
    d.line([(4, 8), (7, 8)], fill=IRON[0])                      # la boca
    d.rectangle([4, 12, 7, 14], fill=hx('e8c050'))              # chapita
    d.rectangle([1, 21, 10, 23], fill=RED[0])
    snowcap(d, 2, 9, 1, 2)
    return done(im)


def arbol_vereda(rng=None, snowy=True):
    """Plátano de vereda pelado en invierno, con su cantero de tierra y nieve."""
    t = OB('tree_b')
    im = Image.new('RGBA', (t.width + 4, t.height + 4), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx = t.width // 2 + 2
    d.rectangle([cx - 6, t.height - 2, cx + 6, t.height + 3], fill=hx('3a2e2a'))   # cantero
    d.rectangle([cx - 5, t.height - 1, cx + 5, t.height + 2], fill=SNOW[1])
    im.alpha_composite(t, (2, 0))
    return im


def pared_ns(h):
    """Pared de ladrillo que corre de norte a sur, vista desde arriba: el lomo con nieve
    y, abajo, la cara que mira a la cámara."""
    im, d = canvas(10, h + 18)
    d.rectangle([1, 0, 8, h], fill=BRICK[1])
    for y in range(2, h, 5):
        d.line([(2, y), (7, y)], fill=BRICK[2])
        d.point((2 if (y // 5) % 2 else 5, y + 2), fill=BRICK[0])
    d.rectangle([1, 0, 8, 1], fill=SNOW[2])
    d.line([(1, 0), (1, h)], fill=SNOW[1])                      # nieve en el lomo
    d.line([(4, 0), (4, h)], fill=SNOW[2])
    d.rectangle([0, h, 9, h + 17], fill=BRICK[1])               # la cara del final
    for y in range(h + 2, h + 17, 4):
        off = 0 if ((y - h) // 4) % 2 else 2
        for x in range(off, 10, 5):
            d.rectangle([x, y, x + 3, y + 2], fill=BRICK[2])
    snowcap(d, 0, 9, h, 2)
    return done(im)


def pared_eo(w):
    """Pared de ladrillo de este a oeste: se ve la cara entera, con nieve arriba."""
    im, d = canvas(w, 22)
    d.rectangle([0, 2, w - 1, 21], fill=BRICK[1])
    for y in range(4, 21, 4):
        off = 0 if (y // 4) % 2 else 3
        for x in range(off, w, 6):
            d.rectangle([x, y, x + 4, y + 2], fill=BRICK[2])
            d.point((x, y), fill=BRICK[3])
    d.rectangle([0, 2, w - 1, 3], fill=STONE[2])
    snowcap(d, 0, w - 1, 2, 2)
    return done(im)


def caminos(im, shapes):
    """Caminos de la plaza: nieve pisada (más oscura y gris) con borde, en curvas y diagonales."""
    mask = Image.new('L', im.size, 0)
    md = ImageDraw.Draw(mask)
    for kind, args in shapes:
        if kind == 'line':
            (a, b, w) = args
            md.line([a, b], fill=255, width=w)
        elif kind == 'circle':
            (cx, cy, r) = args
            md.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    px, mp = im.load(), mask.load()
    rng = random.Random(8)
    for y in range(im.height):
        for x in range(im.width):
            if not mp[x, y]:
                continue
            edge = any(0 <= x + dx < im.width and 0 <= y + dy < im.height and not mp[x + dx, y + dy]
                       for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            if edge:
                px[x, y] = hx('c5d8e4') if y % 2 else hx('b8ccd8')
            else:
                r = rng.random()
                px[x, y] = hx('8ea8bc') if r < 0.82 else (hx('7e96aa') if r < 0.95 else hx('a8c2d4'))
    # pisadas sobre los caminos
    return im


def poste():
    """Poste grueso de madera (el del colectivo de la p041), con un aislador y el cable cortado."""
    im, d = canvas(10, 70)
    d.rectangle([3, 4, 7, 69], fill=WOOD[1])
    d.line([(3, 4), (3, 69)], fill=WOOD[2])
    d.line([(7, 4), (7, 69)], fill=WOOD[0])
    d.rectangle([0, 8, 9, 9], fill=WOOD[0])                     # travesaño
    d.point([(1, 7), (8, 7)], fill=hx('e8e1cc'))                # aisladores
    d.line([(8, 7), (9, 14)], fill=IRON[0])                     # cable caído
    snowcap(d, 3, 7, 4, 2)
    return done(im)


def huellas(n=6, step=(3, 7), start=(0, 0)):
    """Rastro de pisadas en la nieve (footprint.png del juego)."""
    fp = spr('footprint', 'footprint')
    w = start[0] + step[0] * n + fp.width + 4
    h = start[1] + step[1] * n + fp.height + 4
    im = Image.new('RGBA', (max(1, w), max(1, h)), (0, 0, 0, 0))
    for i in range(n):
        x = start[0] + step[0] * i + (2 if i % 2 else -2) + 2
        y = start[1] + step[1] * i
        im.alpha_composite(fp, (max(0, x), max(0, y)))
    return im


# ------------------------------------------------------------------ piso
# S nieve del jardín · g pasto bajo la verja · v vereda · r calzada · p camino de la plaza
# t balasto de las vías · b baldosa del pasaje · x negro (fuera)
def gravel(rng):
    im = Image.new('RGBA', (T, T), hx('4a4a52'))
    d = ImageDraw.Draw(im)
    for _ in range(26):
        x, y = rng.randrange(T), rng.randrange(T)
        d.point((x, y), fill=[hx('3a3a42'), hx('6a6a72'), hx('5a5258')][rng.randrange(3)])
    for _ in range(6):
        x, y = rng.randrange(T), rng.randrange(T)
        d.rectangle([x, y, x + 1, y], fill=SNOW[1])
    return im


def ground(grid, seed):
    rng = random.Random(seed)
    im = Image.new('RGBA', (MW, MH), (0, 0, 0, 255))
    snows = [tile(f'snow_{i}') for i in range(6)]
    for y, row in enumerate(grid):
        for x, ch in enumerate(row):
            if ch == 'S':
                t = snows[rng.choice([0, 0, 0, 1, 2, 3, 4, 5])]
            elif ch == 'g':
                t = tile('grass_0')
            elif ch == 'v':
                t = tile(f'sidewalk_{(x + y) % 2}')
            elif ch == 'r':
                t = tile(f'road_{rng.randrange(2)}')
            elif ch == 'p':
                t = tile(f'path_{rng.randrange(2)}')
            elif ch == 't':
                t = gravel(rng)
            elif ch == 'b':
                t = tile('tile_0') if (x + y) % 2 else tile('tile_1')
            else:
                t = Image.new('RGBA', (T, T), (10, 8, 16, 255))
            im.alpha_composite(t, (x * T, y * T))
    # cordones: donde la vereda toca la calzada
    d = ImageDraw.Draw(im)

    def at(x, y):
        return grid[y][x] if 0 <= x < N and 0 <= y < N else None

    for y in range(N):
        for x in range(N):
            if grid[y][x] not in 'vb':
                continue
            X, Y = x * T, y * T
            if at(x, y + 1) == 'r':        # calzada abajo: se ve la cara del cordón
                d.line([(X, Y + 12), (X + 15, Y + 12)], fill=hx('c5d8e4'))
                d.line([(X, Y + 13), (X + 15, Y + 13)], fill=hx('b8ccd8'))
                d.line([(X, Y + 14), (X + 15, Y + 14)], fill=hx('8aa4b8'))
                d.line([(X, Y + 15), (X + 15, Y + 15)], fill=hx('5a6a80'))
            if at(x, y - 1) == 'r':        # calzada arriba: solo el canto
                d.line([(X, Y), (X + 15, Y)], fill=hx('1a1e2a'))
                d.line([(X, Y + 1), (X + 15, Y + 1)], fill=hx('c5d8e4'))
            if at(x + 1, y) == 'r':
                d.line([(X + 15, Y), (X + 15, Y + 15)], fill=hx('5a6a80'))
                d.line([(X + 14, Y), (X + 14, Y + 15)], fill=hx('c5d8e4'))
            if at(x - 1, y) == 'r':
                d.line([(X, Y), (X, Y + 15)], fill=hx('5a6a80'))
                d.line([(X + 1, Y), (X + 1, Y + 15)], fill=hx('c5d8e4'))
    # rieles: dos líneas de acero sobre durmientes donde hay balasto
    for y in range(N):
        for x in range(N):
            if grid[y][x] != 't':
                continue
    return im


def rails(im, y0, x0=0, x1=MW, cut=None):
    """Dos vías (cuatro rieles) sobre durmientes, a lo ancho. cut=(a,b): tramo con tablones del paso."""
    d = ImageDraw.Draw(im)
    for track in (y0, y0 + 30):
        for x in range(x0, x1, 6):
            d.rectangle([x, track - 2, x + 3, track + 12], fill=WOOD[0])
            d.line([(x, track - 2), (x, track + 12)], fill=WOOD[1])
        for ry in (track, track + 10):
            d.line([(x0, ry), (x1, ry)], fill=IRON[3])
            d.line([(x0, ry + 1), (x1, ry + 1)], fill=IRON[1])
    if cut:
        a, b = cut
        d.rectangle([a, y0 - 4, b, y0 + 44], fill=WOOD[2])
        for yy in range(y0 - 4, y0 + 45, 4):
            d.line([(a, yy), (b, yy)], fill=WOOD[1])
        for track in (y0, y0 + 30):
            for ry in (track, track + 10):
                d.line([(a, ry), (b, ry)], fill=IRON[3])
        for x in range(a, b, 9):
            for _ in range(2):
                d.point((x + 3, y0 + 8 + (x % 17)), fill=SNOW[2])


# ------------------------------------------------------------------ escena: piso + objetos ordenados por la base
class Manzana:
    def __init__(self, name, grid, seed):
        self.name = name
        self.grid = grid
        self.base = ground(grid, seed)
        self.objs = []          # (base_y, x, y, img)
        self.marks = []         # (kind, x, y) para el plano de juego
        self.rng = random.Random(seed)

    def put(self, img, left, base, z=None):
        self.objs.append((base if z is None else z, int(left), int(base - img.height), img))

    def floor(self, img, x, y):
        self.base.alpha_composite(img, (int(x), int(y)))

    def mark(self, kind, x, y):
        self.marks.append((kind, x, y))

    def render(self):
        im = self.base.copy()
        for _, x, y, img in sorted(self.objs, key=lambda o: o[0]):
            im.alpha_composite(img, (x, y))
        return im


# piezas del juego
def S2(name):
    return spr('street2', name)


def OB(name):
    return spr('objects', name)


def HOUSE(name):
    return spr('houses', name)


def south_verja(m, x0, x1, seed=0):
    """La vereda de enfrente: verjas, cercos y arbustos cortados por el borde de abajo."""
    if OPEN_SUR[0] and x0 < 144 < x1:
        OPEN_SUR[0] = False
        south_verja(m, x0, 144, seed)
        south_verja(m, 192, x1, seed + 1)
        OPEN_SUR[0] = True
        m.mark('salida_s', 160, MH - 6)
        return
    seq = ['tapial80', 'hedge', 'fence', 'tapial48', 'hedge', 'fence']
    x = x0
    i = seed
    while x < x1:
        name = seq[i % len(seq)]
        im = S2(name) if name.startswith('tapial') else OB(name)
        if x + im.width > x1:
            im = im.crop((0, 0, x1 - x, im.height))
        m.put(im, x, MH + 4)
        x += im.width
        i += 1


def medano(m, x, base, big=False):
    im = OB('snow_mound')
    if big:
        im = im.resize((48, 24), Image.NEAREST)
    m.put(im, x, base)
    m.mark('spawn', x + im.width // 2, base - 4)


def papeles(m, pts):
    for (x, y) in pts:
        m.floor(S2('papel'), x, y)


# ------------------------------------------------------------------ las cinco manzanas
OPEN_SUR = [False]   # variante con salida al sur (para encastrar con una pieza de abajo que sale al norte)


def grid_from(rows):
    assert len(rows) == N and all(len(r) == N for r in rows), [len(r) for r in rows]
    if OPEN_SUR[0]:
        rows = list(rows)
        for y in (18, 19):
            rows[y] = rows[y][:9] + 'rrr' + rows[y][12:]
    return rows


def casa_de_juan():
    g = grid_from([
        'SSSSSSSSSSSSSSSSSSSS',
        'SSSSSSSSSSSSSSSSSSSS',
        'SSSSSSSSSSSSSSSSSSSS',
        'SSSSSSSSSSSSSSSSSSSS',
        'SSSSSSSSSSSSSSSSSSSS',
        'SSSSSSSSSSSSSSSSSSSS',
        'SSSSSSSSSSSSSSSSSSSS',
        'SSSSSSSSSSSSSSSSSSSS',
        'SSSSSSSSSSSSSSSSSSSS',
        'SSSSSSSSSSSSSSSSSSSS',
        'SSSSSSSSSSSSSSSSSSSS',
        'gggggggggggggggggggg',
        'vvvvvvvvvvvvvvvvvvvv',
        'vvvvvvvvvvvvvvvvvvvv',
        'vvvvvvvvvvvvvvvvvvvv',
        'rrrrrrrrrrrrrrrrrrrr',
        'rrrrrrrrrrrrrrrrrrrr',
        'rrrrrrrrrrrrrrrrrrrr',
        'vvvvvvvvvvvvvvvvvvvv',
        'SSSSSSSSSSSSSSSSSSSS',
    ])
    m = Manzana('La casa de Juan', g, 1)
    # el chalet de los Salvo y su vecino, con sus verjas
    m.put(HOUSE('salvo_7'), 20, 176)
    m.put(OB('chalet_c'), 214, 168)
    m.put(S2('pino_0'), 152, 180)
    m.put(S2('pino_2'), 290, 178)
    m.put(OB('tree_b'), 188, 170)
    for name, x in (('tapial80', 0), ('gate', 66), ('tapial48', 98), ('fence', 146), ('tapial48', 178),
                    ('gate', 226), ('tapial48', 258), ('fence', 306)):
        im = S2(name) if name.startswith('tapial') else OB(name)
        if x + im.width > MW:
            im = im.crop((0, 0, MW - x, im.height))
        m.put(im, x, 192)
    m.put(OB('mailbox'), 56, 200)
    m.put(S2('bush30'), 120, 190)
    m.put(S2('farola'), 166, 222)
    # Juan salió por el portón: el rastro baja a la vereda
    m.floor(huellas(6, (2, 6)), 78, 194)
    # la calzada: el auto tapado de nieve y Polsky (si la historia lo mató)
    m.put(S2('sedan_teal_snow'), 214, 282)
    m.put(S2('polsky_caido'), 120, 262)
    medano(m, 20, 268)
    medano(m, 260, 254)
    papeles(m, [(96, 226), (180, 250), (40, 300)])
    south_verja(m, 0, MW, 0)
    for x in (30, 262):
        m.put(arbol_vereda(), x, 236)
    m.mark('entrada', 4, 256)
    m.mark('salida_e', MW - 4, 256)
    m.mark('casa', 82, 150)
    return m


def esquina_del_choque():
    g = grid_from([
        'SSSSSSSvvrrrvvSSSSSS',
        'SSSSSSSvvrrrvvSSSSSS',
        'SSSSSSSvvrrrvvSSSSSS',
        'SSSSSSSvvrrrvvSSSSSS',
        'SSSSSSSvvrrrvvSSSSSS',
        'SSSSSSSvvrrrvvSSSSSS',
        'SSSSSSSvvrrrvvSSSSSS',
        'SSSSSSSvvrrrvvSSSSSS',
        'SSSSSSSvvrrrvvSSSSSS',
        'SSSSSSSvvrrrvvSSSSSS',
        'SSSSSSSvvrrrvvSSSSSS',
        'vvvvvvvvvrrrvvgggggg',
        'vvvvvvvvvrrrvvvvvvvv',
        'vvvvvvvvvrrrvvvvvvvv',
        'vvvvvvvvvrrrvvvvvvvv',
        'rrrrrrrrrrrrrrrrrrrr',
        'rrrrrrrrrrrrrrrrrrrr',
        'rrrrrrrrrrrrrrrrrrrr',
        'vvvvvvvvvvvvvvvvvvvv',
        'SSSSSSSSSSSSSSSSSSSS',
    ])
    m = Manzana('La esquina del choque', g, 2)
    # la ferretería en la ochava, del lado izquierdo de la bocacalle
    m.put(S2('pino_3'), -6, 150)
    m.put(OB('shop_ferreteria'), 26, 184)
    m.put(OB('crate'), 4, 196)
    m.put(spr('objects', 'box'), 6, 184)
    m.put(bicicleta(), 74, 204)                                 # apoyada en la vidriera (p041)
    m.put(S2('fallen_1'), 46, 210)                              # el del umbral
    m.put(OB('crate'), 104, 200)                                # la caja de municiones
    m.mark('botin', 112, 192)
    m.put(buzon_correo(), 116, 232)
    for (x, b) in ((106, 70), (106, 150), (206, 40)):
        m.put(arbol_vereda(), x, b)
    # del otro lado de la bocacalle, un chalet con su cerco
    m.put(OB('chalet_b'), 232, 168)
    m.put(OB('tree_a'), 214, 150)
    for name, x in (('hedge', 224), ('gate', 256), ('fence', 288)):
        m.put(OB(name), x, 192)
    # la bocacalle que sube: nieve acumulada y un auto abandonado
    medano(m, 150, 70)
    m.put(OB('snow_drift'), 156, 30)
    papeles(m, [(152, 120), (170, 160), (60, 230)])
    # el choque en la esquina: volcado en el cruce y el de trompa contra la farola torcida
    farola = S2('farola').rotate(-14, expand=True, resample=Image.NEAREST)
    m.put(farola, 222, 214)
    m.put(S2('cartel_esquina'), 212, 214)
    m.put(S2('auto_parado'), 236, 292)
    m.put(S2('auto_volcado'), 122, 284)
    m.put(OB('figure_snow'), 70, 258)
    medano(m, 12, 300)
    south_verja(m, 0, MW, 2)
    m.mark('entrada', 4, 256)
    m.mark('salida_e', MW - 4, 256)
    m.mark('salida_n', 160, 4)
    return m


def la_plaza():
    g = grid_from([
        'SSSSSSSSSSSSSSSSSSSS',
        'SSSSSSSSSSSSSSSSSSSS',
        'SSSSSSSSSSSSSSSSSSSS',
        'SSSSSSSSSSSSSSSSSSSS',
        'SSSSSSSSSSSSSSSSSSSS',
        'SSSSSSSSSSSSSSSSSSSS',
        'SSSSSSSSSSSSSSSSSSSS',
        'SSSSSSSSSSSSSSSSSSSS',
        'SSSSSSSSSSSSSSSSSSSS',
        'SSSSSSSSSSSSSSSSSSSS',
        'SSSSSSSSSSSSSSSSSSSS',
        'SSSSSSSSSSSSSSSSSSSS',
        'SSSSSSSSSSSSSSSSSSSS',
        'vvvvvvvvvvvvvvvvvvvv',
        'vvvvvvvvvvvvvvvvvvvv',
        'rrrrrrrrrrrrrrrrrrrr',
        'rrrrrrrrrrrrrrrrrrrr',
        'rrrrrrrrrrrrrrrrrrrr',
        'vvvvvvvvvvvvvvvvvvvv',
        'SSSSSSSSSSSSSSSSSSSS',
    ])
    m = Manzana('La plaza', g, 3)
    caminos(m.base, [('circle', (160, 118, 38)), ('line', ((160, 0), (160, 212), 40)),
                     ('line', ((20, 14), (160, 118), 18)), ('line', ((300, 14), (160, 118), 18)),
                     ('line', ((20, 206), (160, 118), 18)), ('line', ((300, 206), (160, 118), 18))])
    for (x, y) in ((158, 30), (162, 60), (157, 170), (161, 196)):
        m.floor(huellas(3, (1, 9)), x, y)
    # baranda baja alrededor, con la entrada en el medio
    for x in range(0, MW, 32):
        if 128 <= x < 192:
            continue
        m.put(baranda(32), x, 210)
    # el busto en el centro de la rotonda, bancos en los caminos
    m.put(busto(), 151, 130)
    m.put(banco(), 96, 92)
    m.put(banco(), 194, 92)
    m.put(banco(), 96, 168)
    m.put(banco(), 194, 168)
    m.put(hamaca(), 248, 64)
    # árboles grandes: pinos y los pelados de invierno
    for (n, x, b) in (('pino_0', 10, 70), ('pino_2', 270, 118), ('pino_1', 40, 190), ('pino_3', 262, 196)):
        m.put(S2(n), x, b)
    for (x, b) in ((100, 40), (206, 46), (24, 130)):
        m.put(OB('tree_b'), x, b)
    m.put(OB('tree_a'), 228, 172)
    m.put(OB('streetlight'), 128, 72)
    m.put(OB('streetlight'), 180, 162)
    # médanos grandes: la plaza es abierta, salen de todos lados
    medano(m, 60, 54, big=True)
    medano(m, 226, 150, big=True)
    medano(m, 130, 196)
    m.put(S2('fallen_2'), 170, 60)
    papeles(m, [(110, 150), (220, 90), (60, 230), (250, 236)])
    m.put(S2('sedan_bordo_snow'), 30, 284)
    south_verja(m, 0, MW, 4)
    m.mark('entrada', 4, 256)
    m.mark('salida_e', MW - 4, 256)
    m.mark('salida_n', 160, 4)
    return m


def las_vias():
    g = grid_from([
        'SSSSSSSvvrrrvvSSSSSS',
        'SSSSSSSvvrrrvvSSSSSS',
        'SSSSSSSvvrrrvvSSSSSS',
        'SSSSSSSvvrrrvvSSSSSS',
        'SSSSSSSvvrrrvvSSSSSS',
        'ttttttttttttttttttttt'[:N],
        'tttttttttttttttttttt',
        'tttttttttttttttttttt',
        'tttttttttttttttttttt',
        'SSSSSSSvvrrrvvSSSSSS',
        'SSSSSSSvvrrrvvSSSSSS',
        'gggggggvvrrrvvgggggg',
        'vvvvvvvvvrrrvvvvvvvv',
        'vvvvvvvvvrrrvvvvvvvv',
        'vvvvvvvvvrrrvvvvvvvv',
        'rrrrrrrrrrrrrrrrrrrr',
        'rrrrrrrrrrrrrrrrrrrr',
        'rrrrrrrrrrrrrrrrrrrr',
        'vvvvvvvvvvvvvvvvvvvv',
        'SSSSSSSSSSSSSSSSSSSS',
    ])
    m = Manzana('Las vías', g, 4)
    rails(m.base, 86, cut=(144, 192))
    # alambrado a los dos lados de las vías, abierto en el paso
    for x in range(0, 144, 32):
        m.put(alambrado(32), x, 80)
        m.put(alambrado(32), x, 152)
    for x in range(192, MW, 32):
        m.put(alambrado(32), x, 80)
        m.put(alambrado(32), x, 152)
    # el vagón detenido tapa media vía: hay que rodearlo
    m.put(vagon(), 18, 124)
    m.put(barrera(rota=True), 196, 84, z=84)
    m.put(barrera(rota='alta'), 120, 160, z=160)
    m.put(cruz_san_andres(), 122, 80)
    m.put(flip(cruz_san_andres()), 196, 156)
    m.put(garita(), 238, 78)
    # abajo, las casas de la cuadra con su verja; arriba, fondos de terrenos
    m.put(OB('chalet_c'), 24, 186)
    m.put(OB('chalet_d'), 226, 186)
    for (n, x) in (('tapial80', 0), ('gate', 80), ('tapial48', 224), ('fence', 272), ('fence', 304)):
        im = S2(n) if n.startswith('tapial') else OB(n)
        if x + im.width > MW:
            im = im.crop((0, 0, MW - x, im.height))
        m.put(im, x, 192)
    for (n, x, b) in (('pino_1', 40, 70), ('pino_3', 250, 66)):
        m.put(S2(n), x, b)
    m.put(OB('tree_b'), 210, 40)
    m.put(OB('hedge'), 0, 70)
    m.put(OB('hedge'), 290, 70)
    medano(m, 80, 40)
    medano(m, 150, 300)
    papeles(m, [(160, 40), (230, 230), (60, 240)])
    m.put(S2('fallen_0'), 252, 110)                             # alguien que no llegó a cruzar
    m.mark('botin', 270, 104)
    south_verja(m, 0, MW, 1)
    m.mark('entrada', 4, 256)
    m.mark('salida_e', MW - 4, 256)
    m.mark('salida_n', 160, 4)
    return m


def la_cortada():
    g = grid_from([
        'SSSSSSSSSSSSSSSSSSSS',
        'SSSSSSSSSSSSSSSSSSSS',
        'SSSSSSSSSSSSSSSSSSSS',
        'SSSSSSSSSSSSSSSSSSSS',
        'SSSSSSSSSSSSSSSSSSSS',
        'SSSSSbbbbbbbbbbSSSSS',
        'SSSSSbbbbbbbbbbSSSSS',
        'SSSSSbbbbbbbbbbSSSSS',
        'SSSSSSSSbbbbSSSSSSSS',
        'SSSSSSSSbbbbSSSSSSSS',
        'SSSSSSSSbbbbSSSSSSSS',
        'ggggggggbbbbgggggggg',
        'vvvvvvvvbbbbvvvvvvvv',
        'vvvvvvvvvvvvvvvvvvvv',
        'vvvvvvvvvvvvvvvvvvvv',
        'rrrrrrrrrrrrrrrrrrrr',
        'rrrrrrrrrrrrrrrrrrrr',
        'rrrrrrrrrrrrrrrrrrrr',
        'vvvvvvvvvvvvvvvvvvvv',
        'SSSSSSSSSSSSSSSSSSSS',
    ])
    m = Manzana('La cortada', g, 5)
    # el almacén al fondo del pasaje, con la vidriera rota
    m.put(OB('tree_b'), 64, 70)
    m.put(S2('pino_1'), 236, 80)
    m.put(vidriera_rota(OB('shop_almacen')), 120, 84)
    m.floor(vidrios(), 140, 86)
    m.put(S2('fallen_2'), 172, 98)                              # el cliente caído en la puerta
    m.put(OB('bottle'), 112, 98)
    m.put(cajon_frutas(), 96, 100)
    m.put(cajon_frutas(), 204, 100)
    m.put(OB('crate'), 206, 90)
    m.put(OB('trash'), 222, 100)
    m.mark('botin', 160, 104)
    m.mark('botin', 104, 92)
    # paredes de ladrillo: el patio del fondo y el pasaje angosto
    m.put(pared_eo(48), 80, 130)
    m.put(pared_eo(48), 192, 130)
    m.put(pared_ns(48), 74, 128, z=128)
    m.put(pared_ns(48), 236, 128, z=128)
    m.put(pared_ns(62), 122, 198, z=198)
    m.put(pared_ns(62), 188, 198, z=198)
    # una farola sola en el pasaje y el rastro de alguien que entró
    m.put(OB('streetlight'), 134, 164)
    m.floor(huellas(7, (1, -9)), 158, 128)
    papeles(m, [(150, 112), (172, 150)])
    medano(m, 168, 140)
    # a los costados, casas con sus verjas
    m.put(OB('chalet_d'), 8, 176)
    m.put(OB('chalet_c'), 232, 168)
    for (n, x) in (('tapial80', 0), ('tapial48', 80), ('tapial48', 192), ('gate', 240), ('tapial48', 272)):
        m.put(S2(n) if n.startswith('tapial') else OB(n), x, 192)
    m.put(S2('cartel_esquina'), 110, 214)
    for x in (40, 262):
        m.put(arbol_vereda(), x, 236)
    m.put(S2('sedan_crema_snow'), 40, 282)
    medano(m, 250, 270)
    south_verja(m, 0, MW, 3)
    m.mark('entrada', 4, 256)
    m.mark('salida_e', MW - 4, 256)
    m.mark('trampa', 160, 150)
    return m


MANZANAS = [casa_de_juan, esquina_del_choque, la_plaza, las_vias, la_cortada]


# ------------------------------------------------------------------ nevada y luz del apagón
def nevada(im, seed=0, n=140):
    rng = random.Random(seed)
    d = ImageDraw.Draw(im)
    for _ in range(n):
        x, y = rng.randrange(im.width), rng.randrange(im.height)
        c = SNOW[3] if rng.random() < 0.7 else rg.CONT
        d.point((x, y), fill=c)
        if rng.random() < 0.2:
            d.point([(x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)], fill=SNOW[1])
    return im


def apagon(im):
    """La regla del apagón (DIRECCION.md): desatura 30% y multiplica 0.49/0.55/0.79; lo nevado
    (claro y frío) es emisivo y toma el cian de la nieve: 0.62/0.92/1.12."""
    src = im.load()
    out = Image.new('RGBA', im.size)
    o = out.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = src[x, y]
            L = 0.299 * r + 0.587 * g + 0.114 * b
            if L > 150 and b >= r:
                k = (0.85, 0.93, 1.0)
                dr, dg, db = r + (L - r) * 0.3, g + (L - g) * 0.3, b + (L - b) * 0.3
                o[x, y] = (min(255, int(dr * k[0])), min(255, int(dg * k[1])), min(255, int(db * k[2])), a)
            else:
                dr, dg, db = r + (L - r) * 0.3, g + (L - g) * 0.3, b + (L - b) * 0.3
                o[x, y] = (int(dr * 0.49), int(dg * 0.55), int(db * 0.79), a)
    return out


# ------------------------------------------------------------------ plano de juego y fichas
MARK = {'spawn': hx('e0503a'), 'botin': hx('ffcf6e'), 'entrada': hx('b8d890'),
        'salida_e': hx('b8d890'), 'salida_n': hx('b8d890'), 'salida_s': hx('b8d890'), 'trampa': hx('e0503a'), 'casa': hx('9fdcee')}


def plano(m, img):
    """El plano de juego: la manzana apagada, con salidas, médanos (de donde salen) y botín."""
    p = ImageEnhance.Brightness(ImageEnhance.Color(img).enhance(0.3)).enhance(0.55)
    d = ImageDraw.Draw(p)
    for kind, x, y in m.marks:
        c = MARK[kind]
        if kind == 'spawn':
            d.ellipse([x - 6, y - 6, x + 6, y + 6], outline=c, width=2)
            d.line([(x - 3, y - 3), (x + 3, y + 3)], fill=c, width=2)
            d.line([(x - 3, y + 3), (x + 3, y - 3)], fill=c, width=2)
        elif kind == 'botin':
            d.rectangle([x - 4, y - 4, x + 4, y + 4], fill=c)
        elif kind in ('entrada', 'salida_e'):
            d.polygon([(x - 6 if kind == 'entrada' else x - 8, y - 8), (x + 4 if kind == 'entrada' else x - 1, y),
                       (x - 6 if kind == 'entrada' else x - 8, y + 8)], fill=c)
        elif kind == 'salida_n':
            d.polygon([(x - 8, y + 8), (x, y), (x + 8, y + 8)], fill=c)
        elif kind == 'salida_s':
            d.polygon([(x - 8, y - 8), (x, y), (x + 8, y - 8)], fill=c)
        elif kind == 'trampa':
            d.polygon([(x, y - 9), (x + 9, y + 7), (x - 9, y + 7)], outline=c, width=2)
            d.line([(x, y - 3), (x, y + 2)], fill=c, width=2)
        elif kind == 'casa':
            d.rectangle([x - 6, y - 4, x + 6, y + 6], outline=c, width=2)
            d.polygon([(x - 8, y - 4), (x, y - 11), (x + 8, y - 4)], outline=c)
    return p


FICHA = {
    'La casa de Juan': ('Cuadra recta · siempre la primera', [
        'El chalet de los Salvo y el del vecino, con sus verjas.',
        'El rastro de Juan baja del portón a la vereda.',
        'En la calzada, el auto tapado y Polsky (si murió).',
        'Salidas: oeste y este. Dos médanos.']),
    'La esquina del choque': ('Cruce en T · oeste, este y norte', [
        'La ferretería en la ochava: la caja de municiones,',
        'la bicicleta apoyada y el del umbral (p041).',
        'El volcado en el cruce y el de trompa contra la',
        'farola torcida. La bocacalle sube al norte.']),
    'La plaza': ('Abierta · se cruza en diagonal', [
        'Baranda baja, el busto con gorro de nieve, bancos,',
        'la hamaca quieta y árboles pelados.',
        'Médanos grandes: salen de todos lados y hay poco',
        'reparo. Se sale al norte por el camino.']),
    'Las vías': ('Paso a nivel · las vías parten la pieza', [
        'El Mitre: barrera caída, garita del guardabarrera,',
        'la cruz de San Andrés y un vagón detenido que tapa',
        'media vía. Solo se cruza por los tablones del paso.',
        'Del otro lado, alguien que no llegó a cruzar.']),
    'La cortada': ('Callejón sin salida · botín y trampa', [
        'Un pasaje angosto entre medianeras que termina en',
        'el almacén con la vidriera rota (p041).',
        'Al fondo está lo mejor, pero si te alcanzan adentro',
        'no hay por dónde salir.']),
}


def text(img, x, y, s, c, k=1, shadow=hx('0a0810')):
    """La letra del juego, escalada k."""
    d = ImageDraw.Draw(img)
    for dx, dy, col in ((0, k, shadow), (0, 0, c)):
        cx = x
        for ch in s:
            if ch == ' ':
                cx += 4 * k
                continue
            g = rg.FONT['glyphs'].get(ch) or rg.FONT['glyphs']['?']
            for gy, row in enumerate(g):
                for gx, p in enumerate(row):
                    if p == '#':
                        d.rectangle([cx + gx * k + dx, y + gy * k + dy, cx + gx * k + dx + k - 1,
                                     y + gy * k + dy + k - 1], fill=col)
            cx += (len(g[0]) + rg.FONT['spacing']) * k


def ficha(i, m, img):
    """Lámina 1920x1080: la manzana grande (×3), el plano y la descripción."""
    W, H = 1920, 1080
    out = Image.new('RGBA', (W, H), hx('14101c'))
    big = rg.zoom(nevada(img.copy(), i), 3)
    out.alpha_composite(big, (40, 60))
    sub, lines = FICHA[m.name]
    x = 1040
    text(out, x, 70, f'{i + 1}. {m.name}', hx('fff8e2'), 5)
    text(out, x, 130, sub.replace('·', '-'), hx('ffcf6e'), 3)
    for j, ln in enumerate(lines):
        text(out, x, 200 + j * 34, ln.replace('·', '-'), hx('d9ad7c'), 3)
    # plano de juego (×1, entero) con su leyenda y la versión del apagón
    py = 380
    text(out, x, py, 'Plano de juego', hx('fff8e2'), 3)
    out.alpha_composite(plano(m, img), (x, py + 44))
    lx = x + 350
    dd = ImageDraw.Draw(out)
    for j, (k, lbl) in enumerate((('spawn', 'Médano: salen'), ('botin', 'Botín'), ('entrada', 'Salida'),
                                  ('trampa', 'Trampa'))):
        yy = py + 50 + j * 34
        dd.rectangle([lx, yy, lx + 16, yy + 16], fill=MARK[k])
        text(out, lx + 28, yy + 1, lbl, hx('d9ad7c'), 2)
    text(out, x, py + 384, 'En el apagón', hx('fff8e2'), 3)
    out.alpha_composite(rg.zoom(apagon(nevada(img.copy(), i + 10)).crop((0, 0, MW, MH // 2 + 40)), 1),
                        (x, py + 428))
    return out


STATIC = [(hx('120e1c'), 50), (hx('1c1830'), 18), (hx('2a2444'), 12), (hx('4a3e78'), 7),
          (hx('6a5a9a'), 4), (rg.CONT, 5), (hx('dff6ff'), 2), (hx('1a2a3a'), 2)]


def _static_color(rng):
    r = rng.random() * 100
    acc = 0
    for c, w in STATIC:
        acc += w
        if r < acc:
            return c
    return STATIC[0][0]


def borde_del_loop(im, filled, seed=0, band=28):
    """Donde no hay pieza, el loop se termina: estática del continuum (la misma de la llegada).
    Contra los bordes, la pieza se deshace en cuadraditos con tramado Bayer (la llegada al revés).
    Adentro de la estática, a veces se entrevé el fantasma de otra noche."""
    rng = random.Random(seed)
    W, H = im.size
    cols, rows = W // MW, H // MH
    px = im.load()

    def empty(cx, cy):
        return not (0 <= cx < cols and 0 <= cy < rows) or not filled[cy][cx]

    # distancia de cada pixel lleno al borde del loop (huecos y borde del mapa)
    ghost = None
    for cy in range(rows):
        for cx in range(cols):
            if filled[cy][cx]:
                continue
            # fantasma de otra noche: una pieza cualquiera, en bloques de 4 y muy apagada
            gm = MANZANAS[rng.randrange(len(MANZANAS))]().render()
            gm = gm.resize((MW // 4, MH // 4), Image.NEAREST).resize((MW, MH), Image.NEAREST)
            gp = gm.load()
            for y in range(0, MH, 2):
                for x in range(0, MW, 2):
                    c = _static_color(rng)
                    if rng.random() < 0.16:
                        g = gp[x, y]
                        c = (g[0] // 3 + 10, g[1] // 3 + 12, g[2] // 3 + 30, 255)
                    for dy in (0, 1):
                        for dx in (0, 1):
                            px[cx * MW + x + dx, cy * MH + y + dy] = c
            # rayas de interferencia, como una radio mal sintonizada
            for _ in range(5):
                yy = cy * MH + rng.randrange(MH)
                x0 = cx * MW + rng.randrange(MW // 2)
                for x in range(x0, min(cx * MW + MW, x0 + rng.randrange(40, 160))):
                    if rng.random() < 0.85:
                        px[x, yy] = rg.CONT if rng.random() < 0.5 else hx('4a3e78')
    # la pieza se deshace contra el borde del loop
    for cy in range(rows):
        for cx in range(cols):
            if not filled[cy][cx]:
                continue
            sides = {'n': empty(cx, cy - 1), 's': empty(cx, cy + 1), 'o': empty(cx - 1, cy), 'e': empty(cx + 1, cy)}
            if not any(sides.values()):
                continue
            for y in range(0, MH, 2):
                for x in range(0, MW, 2):
                    dists = []
                    if sides['n']:
                        dists.append(y)
                    if sides['s']:
                        dists.append(MH - 1 - y)
                    if sides['o']:
                        dists.append(x)
                    if sides['e']:
                        dists.append(MW - 1 - x)
                    d = min(dists)
                    if d >= band:
                        continue
                    t = 1 - d / band                       # 1 en el borde, 0 adentro
                    thr = BAYER[(y // 2) % 4][(x // 2) % 4] / 16
                    X, Y = cx * MW + x, cy * MH + y
                    if t * t > thr:
                        c = _static_color(rng)
                    elif t > thr:                         # franja intermedia: el pixel queda en bloque de 4
                        bx, by = X - X % 4, Y - Y % 4
                        c = px[bx, by]
                    else:
                        continue
                    for dy in (0, 1):
                        for dx in (0, 1):
                            px[X + dx, Y + dy] = c
    return im


BAYER = rg.BAYER


def barrio(orden, seed=0, lit=True):
    """Arma un barrio: grilla de piezas (orden = filas de índices; 'n' en texto = variante con salida
    al sur; None = hueco). Los huecos y el borde del mapa son el borde del loop."""
    rows = len(orden)
    cols = max(len(r) for r in orden)
    im = Image.new('RGBA', (cols * MW, rows * MH), hx('0a0810'))
    filled = [[False] * cols for _ in range(rows)]
    for ry, row in enumerate(orden):
        for cx, idx in enumerate(row):
            if idx is None:
                continue
            filled[ry][cx] = True
            sur = isinstance(idx, str)          # la variante con salida al sur
            OPEN_SUR[0] = sur
            m = MANZANAS[int(idx)]()
            OPEN_SUR[0] = False
            im.alpha_composite(m.render(), (cx * MW, ry * MH))
    nevada(im, seed, n=140 * rows * cols)
    if lit:
        im = apagon(im)
    return borde_del_loop(im, filled, seed)       # la estática no la toca la luz: es del continuum


if __name__ == '__main__':
    imgs = []
    for i, fn in enumerate(MANZANAS):
        m = fn()
        img = m.render()
        imgs.append((m, img))
        rg.zoom(nevada(img.copy(), i), 4).save(os.path.join(OUT, f'manzana_{i + 1}.png'))
        ficha(i, m, img).save(os.path.join(OUT, f'ficha_{i + 1}.png'))
    # dos loops distintos con las mismas cinco piezas (fila de arriba: variantes con salida al sur)
    loop_a = [[None, '2', '4', None], [0, 1, 3, 4]]
    loop_b = [[None, None, '3', '4'], [0, 4, 2, 1]]
    for name, orden in (('loop_a', loop_a), ('loop_b', loop_b)):
        rg.zoom(barrio(orden, seed=len(name), lit=False), 2).save(os.path.join(OUT, f'barrio_{name}.png'))
        rg.zoom(barrio(orden, seed=len(name), lit=True), 2).save(os.path.join(OUT, f'barrio_{name}_apagon.png'))
    print('ok')
