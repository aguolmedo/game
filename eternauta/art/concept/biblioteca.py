"""Mapa especial: la Biblioteca Nacional Mariano Moreno (diseño, NO toca el juego). 22/11.

Guiño a "El atajo: La batalla de la Biblioteca Nacional" (Sasturain y Solano López, 2007, para la muestra
H.G.O. + El Eternauta). En esa historieta un Mano TRAE EL EDIFICIO DEL FUTURO con un materializador
sobre el baldío del Palacio Unzué ("parece una construcción de los extraterrestres", dice Favalli), y
encierra a Salvo, Favalli, Franco y Mosca en la sala de lectura, detrás de una mesa llena de libros.
Franco le tira un explosivo al tablero del Mano y los hombres-robot quedan libres.

Para nosotros calza con el continuum: el edificio es una anomalía de otro tiempo, y tiene estática en
los bordes (como la llegada del viejo y el borde del loop).

El edificio (Clorindo Testa, Bullrich, Cazzaniga; 1961-1992): un bloque de hormigón a la vista,
casi rectangular, sobre cuatro núcleos macizos (escaleras y ascensores adentro). La sala de lectura
arriba, por encima de las copas de los árboles, abierta a la ciudad. Abajo, una explanada pública y
el parque de la Plaza del Lector, en lo alto de la barranca de Recoleta. Testa decía que evoca un
gliptodonte. Los depósitos de libros están enterrados.

Salida: art/concept/out/biblioteca/*.png
"""
import math
import os
import random
import sys

from PIL import Image, ImageDraw, ImageEnhance

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import roguelike as rg  # noqa: E402
import manzanas as mz  # noqa: E402
import enemies  # noqa: E402

OUT = os.path.join(HERE, 'out', 'biblioteca')
os.makedirs(OUT, exist_ok=True)
hx = rg.hx
SNOW = mz.SNOW
CONT = rg.CONT

# hormigón a la vista: gris cálido, con las marcas de las tablas del encofrado
CON = [hx('3e3c3a'), hx('5e5a54'), hx('7e7a70'), hx('9e998c'), hx('bab5a6'), hx('d2cdbe')]
GLASS = [hx('141a2a'), hx('22304a'), hx('3a5070'), hx('7a96b0')]
WARM = hx('ffcf6e')


def concrete(d, box, tone=3, rng=None, marks=True):
    """Superficie de hormigón: tono base, tablas del encofrado (líneas horizontales) y manchas."""
    rng = rng or random.Random(1)
    x0, y0, x1, y1 = box
    d.rectangle(box, fill=CON[tone])
    if marks:
        for y in range(y0 + 2, y1, 3):
            for x in range(x0, x1 + 1):
                if (x * 13 + y * 7) % 11 < 7:
                    d.point((x, y), fill=CON[tone - 1] if tone > 0 else CON[0])
    for _ in range(max(1, (x1 - x0) * (y1 - y0) // 60)):
        x, y = rng.randint(x0, x1), rng.randint(y0, y1)
        d.line([(x, y), (x, min(y1, y + rng.randint(1, 5)))], fill=CON[max(0, tone - 1)])   # chorreaduras


def snow_line(d, x0, x1, y, thick=2):
    mz.snowcap(d, x0, x1, y, thick)


# ------------------------------------------------------------------ el edificio
def edificio():
    """El bloque sobre sus cuatro patas, visto en 3/4 desde arriba (~272x200).
    De arriba a abajo: el techo nevado, la fachada de la sala de lectura (franja de vidrio entre
    vigas de hormigón, con las aletas verticales), la panza escalonada que se mete hacia adentro,
    la sombra de la explanada y las patas macizas (las dos de atrás, más oscuras)."""
    W, H = 272, 210
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    rng = random.Random(7)
    # --- patas de atrás (en la sombra)
    for lx in (70, 186):
        d.polygon([(lx, 110), (lx + 16, 110), (lx + 20, 186), (lx - 4, 186)], fill=CON[1])
        d.line([(lx + 2, 120), (lx + 2, 180)], fill=CON[0])
    # --- sombra bajo el bloque (la explanada cubierta)
    d.rectangle([20, 128, 252, 186], fill=hx('1e1c24'))
    for y in range(130, 186, 2):
        d.line([(24, y), (248, y)], fill=hx('24222c'))
    # --- panza escalonada: tres escalones que se meten hacia adentro (el "gliptodonte")
    steps = [(10, 262, 112, 120), (24, 248, 120, 127), (40, 232, 127, 133)]
    for i, (a, b, t, bt) in enumerate(steps):
        concrete(d, (a, t, b, bt), 2 - min(i, 1), rng)
        d.line([(a, bt), (b, bt)], fill=CON[0])
    # --- patas de adelante: macizas, más anchas abajo, con ranuras de las escaleras
    for lx in (28, 214):
        poly = [(lx, 116), (lx + 30, 116), (lx + 36, 196), (lx - 6, 196)]
        d.polygon(poly, fill=CON[3])
        d.polygon([(lx, 116), (lx + 6, 116), (lx, 196), (lx - 6, 196)], fill=CON[4])   # canto con luz
        d.polygon([(lx + 24, 116), (lx + 30, 116), (lx + 36, 196), (lx + 30, 196)], fill=CON[2])
        for y in range(120, 194, 3):
            d.line([(lx + 4, y), (lx + 28, y)], fill=CON[2])
        for k, y in enumerate(range(128, 188, 14)):                   # ranuras de la escalera
            d.rectangle([lx + 12, y, lx + 15, y + 8], fill=GLASS[0])
            d.point((lx + 12, y), fill=GLASS[2])
        d.rectangle([lx - 8, 194, lx + 38, 199], fill=CON[1])          # zapata
        snow_line(d, lx - 8, lx + 38, 194, 2)
    # --- fachada de la sala de lectura (lo que mira a la cámara)
    concrete(d, (6, 52, 266, 112), 3, rng)
    d.rectangle([6, 52, 266, 57], fill=CON[4])                         # viga de arriba
    d.rectangle([6, 100, 266, 112], fill=CON[3])                       # viga de abajo
    for y in range(102, 112, 3):
        d.line([(6, y), (266, y)], fill=CON[2])
    # franja de vidrio de la sala, con las aletas verticales de hormigón
    d.rectangle([12, 62, 260, 94], fill=GLASS[1])
    d.rectangle([12, 62, 260, 65], fill=GLASS[0])                      # sombra del alero
    for x in range(12, 261, 12):
        d.rectangle([x, 60, x + 3, 96], fill=CON[4])
        d.line([(x + 3, 62), (x + 3, 96)], fill=CON[2])
    # adentro: lámparas cálidas de las mesas, gente que no hay, estantes
    for x in range(20, 258, 24):
        d.rectangle([x, 84, x + 5, 85], fill=WARM)
        d.point((x + 2, 83), fill=hx('fff0c0'))
    for x in range(16, 258, 12):
        d.line([(x + 1, 88), (x + 7, 88)], fill=GLASS[2])
    # reflejo del cielo en el vidrio
    for x in range(16, 256, 12):
        d.line([(x + 4, 67), (x + 7, 70)], fill=GLASS[3])
    d.rectangle([6, 96, 266, 99], fill=CON[2])                         # antepecho
    snow_line(d, 6, 266, 99, 1)
    # --- el techo nevado (la cara de arriba), con las cajas de máquinas y claraboyas
    d.polygon([(10, 16), (262, 16), (266, 52), (6, 52)], fill=CON[3])
    d.rectangle([8, 18, 264, 50], fill=SNOW[2])
    for y in range(20, 50, 4):
        for x in range(10, 262, 9):
            if (x + y) % 3 == 0:
                d.point((x, y), fill=SNOW[1])
    for (a, b, c, e) in ((40, 22, 80, 34), (190, 24, 226, 38), (118, 20, 150, 28)):
        concrete(d, (a, b, c, e), 3, rng)
        d.rectangle([a, b, c, b + 2], fill=SNOW[3])
        d.line([(a, e), (c, e)], fill=CON[1])
    for x in range(96, 176, 10):                                       # claraboyas de la sala
        d.rectangle([x, 38, x + 6, 44], fill=GLASS[2])
        d.line([(x, 38), (x + 6, 38)], fill=GLASS[3])
    d.line([(6, 52), (266, 52)], fill=CON[1])
    d.line([(10, 16), (262, 16)], fill=CON[4])
    mz.rg.outline(im)
    return im


def materializador():
    """El tablero del Mano: consola de metal con perillas y una antena que tira el rayo cian."""
    im = Image.new('RGBA', (34, 40), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    I = mz.IRON
    d.polygon([(2, 22), (31, 22), (31, 38), (2, 38)], fill=I[2])
    d.polygon([(4, 18), (29, 18), (31, 22), (2, 22)], fill=I[3])       # tapa inclinada
    for x in range(6, 28, 5):
        d.point((x, 20), fill=[CONT, hx('e0503a'), hx('ffcf6e')][x % 3])
    d.rectangle([6, 26, 27, 32], fill=I[0])                            # pantallita
    for x in range(7, 27, 2):
        d.point((x, 29 + (x % 3) - 1), fill=CONT)
    d.line([(16, 18), (16, 4)], fill=I[3])                             # antena
    d.ellipse([10, 0, 22, 8], outline=I[3])
    d.point((16, 4), fill=CONT)
    mz.snowcap(d, 4, 29, 18, 1)
    rg.outline(im)
    return im


def hombre_robot(base='lucas', view='abajo'):
    """Hombre-robot: un vecino capturado, gris, con la mirada en blanco y el aparato del Mano en la nuca."""
    im = mz.spr('chars2', f'{base}/{view}_quieto_1')
    im = ImageEnhance.Color(im).enhance(0.25)
    im = ImageEnhance.Brightness(im).enhance(0.85)
    px = im.load()
    if view == 'abajo':
        for x, y in ((5, 8), (11, 8), (5, 9), (11, 9), (4, 8), (10, 8)):
            if px[x, y][3] and px[x, y][0] < 60:
                px[x, y] = hx('dff6ff')                                # ojos en blanco
        for x, y in ((1, 9), (14, 9)):
            px[x, y] = hx('6a7286')
        px[14, 8] = CONT                                                # lucecita del aparato
    else:
        for x in range(6, 10):
            px[x, 13] = hx('6a7286')
        px[7, 12] = CONT
    return im


def palacio_fantasma():
    """El Palacio Unzué, que estaba en ese baldío: academicista francés, techo de pizarra (mansarda),
    ventanas altas. Aparece como 'imagen emergente' hecha de estática cian (otro tiempo, mismo lugar)."""
    W, H = 150, 96
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    c1, c2 = CONT + (0,), hx('dff6ff')
    body = [(6, 40, 144, 94)]
    rng = random.Random(4)
    mask = Image.new('L', (W, H), 0)
    md = ImageDraw.Draw(mask)
    md.rectangle([6, 40, 144, 94], fill=255)
    md.polygon([(10, 40), (20, 18), (130, 18), (140, 40)], fill=255)   # mansarda
    md.rectangle([60, 6, 90, 20], fill=255)                            # cúpula central
    md.polygon([(58, 8), (75, 0), (92, 8)], fill=255)
    for x in range(16, 140, 14):
        md.rectangle([x, 24, x + 5, 32], fill=0)                       # buhardillas
        md.rectangle([x, 50, x + 6, 66], fill=0)                       # ventanas altas
        md.rectangle([x, 74, x + 6, 88], fill=0)
    md.rectangle([66, 70, 84, 94], fill=0)                             # la puerta
    mp = mask.load()
    px = im.load()
    for y in range(H):
        for x in range(W):
            if mp[x, y] and rng.random() < 0.42:
                px[x, y] = (CONT[0], CONT[1], CONT[2], 150) if rng.random() < 0.7 else (223, 246, 255, 170)
    # el borde se lee más: contorno punteado
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            if mp[x, y] and (not mp[x + 1, y] or not mp[x - 1, y] or not mp[x, y + 1] or not mp[x, y - 1]):
                if rng.random() < 0.8:
                    px[x, y] = (223, 246, 255, 210)
    return im


def arbol_grande(seed=0):
    """Una tipa / un gomero del parque, con la copa cargada de nieve (más grande que los de la calle)."""
    rng = random.Random(seed)
    im = Image.new('RGBA', (56, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rectangle([25, 38, 31, 62], fill=mz.WOOD[1])
    d.line([(25, 38), (25, 62)], fill=mz.WOOD[2])
    d.line([(28, 46), (20, 36)], fill=mz.WOOD[1])
    G = [hx('16302a'), hx('1e3c32'), hx('2a4e40'), hx('3a6450')]
    for _ in range(26):
        cx, cy = rng.randint(10, 46), rng.randint(8, 36)
        r = rng.randint(7, 11)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=G[rng.randrange(1, 3)])
    for _ in range(18):
        cx, cy = rng.randint(10, 46), rng.randint(6, 30)
        r = rng.randint(3, 6)
        d.ellipse([cx - r, cy - r, cx + r, cy + r - 2], fill=G[3])
    for _ in range(40):                                                # nieve en lo alto de la copa
        cx, cy = rng.randint(8, 48), rng.randint(2, 26)
        d.line([(cx, cy), (cx + rng.randint(2, 6), cy)], fill=SNOW[2] if rng.random() < 0.7 else SNOW[3])
    rg.outline(im)
    return im


def escalinata(w=96, h=26):
    """La escalinata ancha que sube del parque a la explanada."""
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for i, y in enumerate(range(0, h, 4)):
        d.rectangle([0, y, w - 1, y + 1], fill=CON[4])
        d.rectangle([0, y + 2, w - 1, y + 3], fill=CON[2])
        mz.snowcap(d, 0, w - 1, y, 1)
    rg.outline(im)
    return im


# ------------------------------------------------------------------ piezas del entorno
def sombra(w, h=None, a=90):
    """Sombra proyectada blanda (elipse) para dar peso a lo que está parado en la nieve."""
    h = h or max(3, w // 4)
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse([0, 0, w - 1, h - 1], fill=(40, 52, 80, a))
    d.ellipse([w // 6, h // 5, w - 1 - w // 6, h - 1 - h // 5], fill=(30, 40, 66, min(255, a + 40)))
    return im


def fuente():
    """La fuente central de la Plaza del Lector: pileta redonda con el agua helada y nieve en el borde."""
    im = Image.new('RGBA', (56, 34), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse([0, 6, 55, 33], fill=CON[2])
    d.ellipse([2, 6, 53, 29], fill=CON[4])
    d.ellipse([6, 9, 49, 27], fill=hx('7a9ab4'))                       # hielo
    d.ellipse([10, 11, 45, 25], fill=hx('9fbcd0'))
    d.line([(14, 14), (24, 12)], fill=hx('e6f6fb'))
    d.line([(30, 20), (40, 18)], fill=hx('e6f6fb'))
    d.rectangle([25, 2, 30, 18], fill=CON[3])                          # el surtidor
    d.ellipse([22, 0, 33, 6], fill=CON[4])
    mz.snowcap(d, 22, 33, 1, 1)
    for x in range(2, 54, 3):
        d.point((x, 7 + (1 if x % 2 else 0)), fill=SNOW[3])
    rg.outline(im)
    return im


def reja(w=32, h=30):
    """La reja alta (2 m) que rodea la Plaza del Lector."""
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    I = mz.IRON
    d.line([(0, 4), (w - 1, 4)], fill=I[2])
    d.line([(0, h - 4), (w - 1, h - 4)], fill=I[1])
    for x in range(1, w, 3):
        d.line([(x, 2), (x, h - 1)], fill=I[1])
        d.point((x, 1), fill=I[3])
    mz.snowcap(d, 0, w - 1, 3, 1)
    rg.outline(im)
    return im


def mitre():
    """El monumento a Mitre (1927) en lo alto de la Plaza Mitre: pedestal escalonado de granito
    y el jinete de bronce con nieve en los hombros y en el lomo del caballo."""
    im = Image.new('RGBA', (60, 92), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    G = [hx('5e5a62'), hx('7e7a82'), hx('a09ca4'), hx('c4c0c8')]
    for i, (a, t, b) in enumerate(((2, 80, 57), (6, 74, 53), (10, 68, 49))):   # gradas
        d.rectangle([a, t, b, t + 6], fill=G[2])
        d.line([(a, t + 5), (b, t + 5)], fill=G[0])
        mz.snowcap(d, a, b, t, 1)
    d.rectangle([14, 34, 45, 68], fill=G[1])                           # el pedestal alto
    d.rectangle([14, 34, 18, 68], fill=G[2])
    d.rectangle([12, 30, 47, 35], fill=G[3])
    d.rectangle([20, 44, 39, 54], fill=G[0])                           # la placa
    mz.snowcap(d, 12, 47, 30, 2)
    B = [hx('1e2a24'), hx('2e4038'), hx('46604e'), hx('6a8a72')]       # bronce verdoso
    d.polygon([(14, 30), (16, 18), (24, 14), (40, 14), (44, 10), (48, 12), (46, 20), (42, 22), (40, 30)],
              fill=B[1])                                               # caballo
    for lx in (17, 22, 36, 40):
        d.line([(lx, 22), (lx, 30)], fill=B[0])
    d.rectangle([26, 4, 31, 15], fill=B[2])                            # jinete
    d.ellipse([26, 0, 31, 5], fill=B[2])
    d.line([(44, 10), (49, 13)], fill=B[2])
    mz.snowcap(d, 24, 42, 14, 1)
    mz.snowcap(d, 26, 31, 1, 1)
    rg.outline(im)
    return im


def gomero(seed=0):
    """Gomero / ombú centenario de la barranca: copa enorme y raíces que se abren."""
    rng = random.Random(seed)
    im = Image.new('RGBA', (96, 96), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    W_ = mz.WOOD
    d.polygon([(40, 92), (44, 56), (54, 56), (58, 92)], fill=W_[1])
    for (a, b) in (((40, 92), (26, 95)), ((58, 92), (74, 95)), ((46, 92), (40, 95)), ((54, 92), (60, 95))):
        d.line([a, b], fill=W_[0], width=2)
    d.line([(44, 60), (44, 90)], fill=W_[2])
    G = [hx('122820'), hx('1a362c'), hx('24463a'), hx('34604c')]
    for _ in range(46):
        cx, cy = rng.randint(14, 82), rng.randint(10, 56)
        r = rng.randint(8, 14)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=G[rng.randrange(1, 3)])
    for _ in range(26):
        cx, cy = rng.randint(14, 82), rng.randint(6, 46)
        r = rng.randint(4, 8)
        d.ellipse([cx - r, cy - r, cx + r, cy + r - 3], fill=G[3])
    for _ in range(80):
        cx, cy = rng.randint(10, 86), rng.randint(2, 44)
        d.line([(cx, cy), (cx + rng.randint(2, 7), cy)], fill=SNOW[2] if rng.random() < 0.7 else SNOW[3])
    rg.outline(im)
    return im


# ------------------------------------------------------------------ el mapa exterior: la manzana entera
EW, EH = 640, 528
LAS_HERAS = (0, 36)        # calzada de arriba (y)
MESETA = (52, 268)         # lo alto de la barranca
TALUD = (268, 336)         # la barranca
BAJA = (336, 420)          # la plaza de abajo
LIBERTADOR = (436, 528)    # la avenida (dos manos y el cantero)
AGUERO = (124, 156)        # calle que baja (x)
AUSTRIA = (608, 640)


def talud(d, x0, x1, y0, y1, rng):
    """La cara de la barranca vista en 3/4: pasto nevado en pendiente, más oscuro abajo,
    con vetas de nieve que bajan y un labio claro arriba."""
    for y in range(y0, y1):
        t = (y - y0) / (y1 - y0)
        c = rg.mix(hx('b8ccd8'), hx('6e8aa2'), t)
        d.line([(x0, y), (x1, y)], fill=c)
    # curvas de nivel suaves (la pendiente se lee por bandas) y matas nevadas sueltas
    for k, yy in enumerate(range(y0 + 12, y1 - 4, 14)):
        for x in range(x0, x1, 2):
            off = int(2 * math.sin(x * 0.05 + k))
            d.point((x, yy + off), fill=hx('9cb4c6') if k % 2 else hx('a8c0d0'))
    for _ in range((x1 - x0) // 14):
        x = rng.randint(x0, x1)
        y = rng.randint(y0 + 6, y1 - 6)
        L = rng.randint(2, 4)
        d.line([(x, y), (x, y + L)], fill=hx('5e7890'))
        d.point((x, y - 1), fill=SNOW[3])
    for _ in range((x1 - x0) // 40):                                    # matas
        x = rng.randint(x0 + 4, x1 - 10)
        y = rng.randint(y0 + 10, y1 - 10)
        d.ellipse([x, y, x + 9, y + 5], fill=hx('2a4e40'))
        d.ellipse([x + 1, y - 1, x + 8, y + 2], fill=SNOW[2])
    d.line([(x0, y0), (x1, y0)], fill=SNOW[3])
    d.line([(x0, y0 + 1), (x1, y0 + 1)], fill=SNOW[2])
    d.line([(x0, y1 - 1), (x1, y1 - 1)], fill=hx('4a5e74'))


def exterior():
    rng = random.Random(3)
    base = Image.new('RGBA', (EW, EH), (0, 0, 0, 255))
    d = ImageDraw.Draw(base)
    snows = [mz.tile(f'snow_{i}') for i in range(6)]
    T = 16

    def tile_at(x, y):
        if AGUERO[0] <= x < AGUERO[1] or x >= AUSTRIA[0]:
            return mz.tile(f'road_{rng.randrange(2)}')
        if y < LAS_HERAS[1]:
            return mz.tile(f'road_{rng.randrange(2)}')
        if y < MESETA[0] or LIBERTADOR[0] - 16 <= y < LIBERTADOR[0]:
            return mz.tile(f'sidewalk_{(x + y) // 16 % 2}')
        if y >= LIBERTADOR[0]:
            if 476 <= y < 492:
                return None                                            # el cantero del medio
            return mz.tile(f'road_{rng.randrange(2)}')
        return snows[rng.choice([0, 0, 0, 1, 2, 3, 4, 5])]

    for y in range(0, EH, T):
        for x in range(0, EW, T):
            t = tile_at(x, y)
            if t is None:
                d.rectangle([x, y, x + 15, y + 15], fill=hx('24382c'))
                d.rectangle([x, y + 2, x + 15, y + 9], fill=SNOW[1])
                continue
            base.alpha_composite(t, (x, y))
    # veredas de las calles que bajan (Agüero y Austria): bordes
    for xx in (AGUERO[0] - 1, AGUERO[1], AUSTRIA[0] - 1):
        d.line([(xx, LAS_HERAS[1]), (xx, LIBERTADOR[0])], fill=hx('5a6a80'))
    # la barranca: a los dos lados de Agüero
    talud(d, 0, AGUERO[0] - 2, TALUD[0], TALUD[1], rng)
    talud(d, AGUERO[1] + 1, AUSTRIA[0] - 2, TALUD[0], TALUD[1], rng)
    # Agüero baja: la calzada se oscurece en la pendiente
    for y in range(TALUD[0], TALUD[1]):
        t = (y - TALUD[0]) / (TALUD[1] - TALUD[0])
        for x in range(AGUERO[0], AGUERO[1]):
            if (x + y) % 3 == 0:
                d.point((x, y), fill=rg.mix(hx('242938'), hx('141826'), t))
    # Plaza del Lector (esquina Las Heras y Agüero): caminos, la fuente, bancos y la reja alta
    mz.caminos(base, [('circle', (230, 116, 34)), ('line', ((230, 52), (230, 186), 14)),
                      ('line', ((160, 116), (300, 116), 14))])
    # la explanada bajo el edificio y la escalinata que baja por la barranca
    d.rectangle([300, 170, 590, 266], fill=CON[2])
    for y in range(172, 266, 8):
        d.line([(300, y), (590, y)], fill=CON[1])
    for y in range(TALUD[0], TALUD[1], 4):                             # la escalinata central
        d.rectangle([414, y, 478, y + 1], fill=CON[4])
        d.rectangle([414, y + 2, 478, y + 3], fill=CON[2])
        mz.snowcap(d, 414, 478, y, 1)
    # rampa en zigzag a la derecha (la que usa cualquiera que no quiera subir escalones)
    for (a, b) in (((500, 268), (580, 300)), ((580, 300), (520, 334))):
        d.line([a, b], fill=hx('8ea8bc'), width=10)
        d.line([(a[0], a[1] - 5), (b[0], b[1] - 5)], fill=SNOW[2])
    # la plaza de abajo (hoy Plaza Evita, sobre lo que eran los jardines del Unzué): caminos
    mz.caminos(base, [('line', ((446, 336), (446, 420), 22)), ('line', ((180, 380), (600, 380), 14)),
                      ('circle', (300, 384, 20))])
    # Plaza Mitre, del otro lado de Agüero: el camino que sube al monumento
    mz.caminos(base, [('line', ((62, 160), (62, 420), 16))])
    for y in range(TALUD[0], TALUD[1], 4):
        d.rectangle([48, y, 76, y + 1], fill=CON[4])
        d.rectangle([48, y + 2, 76, y + 3], fill=CON[2])

    m = mz.Manzana('La Biblioteca', ['S' * mz.N] * mz.N, 9)
    m.base = base

    def P(img, x, base_y, sh=0, z=None):
        if sh:
            m.put(sombra(sh), x + img.width // 2 - sh // 2, base_y + sombra(sh).height // 2, z=(base_y - 1))
        m.put(img, x, base_y, z=z)

    # --- arriba: Las Heras, la vereda de enfrente y su verja
    for x in range(0, EW, 48):
        m.put(mz.S2('tapial48'), x, 6, z=0)
    # Plaza del Lector: reja alta con portón sobre Las Heras, fuente, bancos y árboles
    for x in range(160, 300, 32):
        if not (214 <= x < 246):
            m.put(reja(32, 22), x, 70, z=70)
    for x in range(160, 300, 32):
        m.put(reja(32, 22), x, 196, z=196)
    P(fuente(), 202, 134, 0)
    for (x, b) in ((172, 100), (262, 100), (172, 160), (262, 160)):
        P(mz.banco(), x, b)
    for (x, b, s_) in ((150, 92, 11), (270, 70, 12), (150, 196, 13)):
        P(arbol_grande(s_), x, b, 40)
    # --- el edificio, con la estática del continuum en los bordes
    P(edificio(), 314, 250, 0, z=250)
    m.put(escalinata(64, 20), 414, 290, z=290)
    sp = Image.new('RGBA', (EW, EH), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sp)
    for _ in range(320):
        side = rng.random()
        if side < 0.4:
            x, y = rng.randint(310, 590), rng.randint(34, 50)
        elif side < 0.7:
            x, y = rng.randint(306, 322), rng.randint(40, 250)
        else:
            x, y = rng.randint(578, 594), rng.randint(40, 250)
        sd.rectangle([x, y, x + 1, y + 1], fill=[CONT, hx('dff6ff'), hx('6a5a9a')][rng.randrange(3)])
    # el materializador del Mano en la explanada, con su rayo
    P(materializador(), 536, 264, 30)
    for i in range(9):
        sd.line([(552 + i % 2, 226 - i * 14), (548 + (i * 7) % 9, 214 - i * 14)], fill=CONT)
    m.put(sp, 0, EH, z=900)
    P(enemies.aura(enemies.mano('front'), pad=5).img, 562, 268, 0)
    for (b_, x, y) in (('lucas', 356, 264), ('polsky', 388, 260), ('polsky_coat', 484, 262), ('lucas', 508, 265)):
        P(hombre_robot(b_, 'abajo'), x, y, 12)
    # árboles de la meseta que tapan el edificio (profundidad): adelante y a los costados
    for (x, b, s_) in ((286, 236, 21), (600, 214, 22), (598, 130, 23)):
        P(arbol_grande(s_), x, b, 40)
    # --- Plaza Mitre: el monumento en lo alto, el gomero enorme
    P(mitre(), 32, 230, 50)
    P(gomero(5), -20, 200, 70)
    P(mz.S2('pino_2'), 80, 130, 28)
    # --- la barranca: gomeros y tipas en la pendiente
    P(gomero(7), 170, 322, 70)
    P(arbol_grande(31), 330, 318, 40)
    P(arbol_grande(32), 540, 330, 40)
    # --- la plaza de abajo: el Palacio Unzué que ya no está (imagen emergente), bancos, faroles
    m.put(palacio_fantasma(), 470, 418, z=300)
    for (x, b) in ((210, 372), (360, 372)):
        P(mz.banco(), x, b)
    for x in (250, 420):
        P(mz.OB('streetlight'), x, 368, 10)
    P(arbol_grande(41), 160, 420, 40)
    P(gomero(9), 20, 430, 70)
    mz.medano(m, 300, 412)
    mz.medano(m, 560, 410)
    # --- Av. del Libertador: dos manos, cantero con árboles pelados, el colectivo
    for x in (40, 200, 360, 520):
        P(mz.OB('tree_b'), x, 486, 16)
    P(mz.S2('colectivo_snow'), 60, 474)
    P(mz.S2('sedan_crema_snow'), 300, 470)
    P(mz.S2('sedan_teal_snow'), 420, 524)
    P(mz.S2('auto_volcado'), 180, 526)
    P(mz.S2('cartel_esquina'), AGUERO[1] + 2, 432)
    P(mz.S2('cartel_esquina'), AUSTRIA[0] - 22, 432)
    mz.papeles(m, [(300, 428), (500, 430), (220, 120)])
    # Juan y Favalli suben por la escalinata (de espaldas)
    P(mz.spr('chars2', 'juan_suit_rifle/arriba_quieto_1'), 430, 352, 12)
    P(mz.spr('chars2', 'favalli/arriba_quieto_1'), 452, 360, 12)
    im = m.render()
    return mz.nevada(im, 5, n=700)


# ------------------------------------------------------------------ la sala de lectura
def mesa_lectura(w=96):
    """Mesa larga de la sala, de madera, con lámparas y libros."""
    im = Image.new('RGBA', (w, 30), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    W_ = mz.WOOD
    d.rectangle([0, 6, w - 1, 17], fill=W_[2])
    d.line([(0, 6), (w - 1, 6)], fill=W_[3])
    d.rectangle([0, 18, w - 1, 21], fill=W_[1])
    for lx in (2, w - 5):
        d.rectangle([lx, 22, lx + 2, 29], fill=W_[0])
    for x in range(10, w - 8, 24):                                     # lámparas de bronce
        d.rectangle([x, 2, x + 7, 4], fill=hx('2e5a40'))
        d.line([(x + 3, 5), (x + 3, 8)], fill=hx('c8a050'))
        d.rectangle([x + 1, 5, x + 6, 5], fill=WARM)
    rng = random.Random(w)
    for x in range(4, w - 6, 7):
        if rng.random() < 0.6:
            c = rng.choice([hx('8a2a24'), hx('2e4a6a'), hx('3e6a4a'), hx('c8a050'), hx('e8e1cc')])
            d.rectangle([x, 10, x + 4, 13], fill=c)
            d.line([(x, 10), (x + 4, 10)], fill=hx('f0e8d0'))
    rg.outline(im)
    return im


LOMOS = [hx('8a2a24'), hx('2e4a6a'), hx('3e6a4a'), hx('c8a050'), hx('e8e1cc'), hx('5a3050'), hx('6a4a2a')]


def estante(w=64, h=56):
    """Estantería de pared llena de lomos."""
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, w - 1, h - 1], fill=mz.WOOD[1])
    rng = random.Random(w + h)
    for sy in range(3, h - 4, 13):
        d.rectangle([2, sy, w - 3, sy + 10], fill=mz.WOOD[0])
        x = 3
        while x < w - 4:
            bw = rng.choice([2, 2, 3])
            bh = rng.randint(7, 10)
            d.rectangle([x, sy + 10 - bh, x + bw - 1, sy + 10], fill=rng.choice(LOMOS))
            x += bw + (1 if rng.random() < 0.2 else 0)
        d.rectangle([1, sy + 11, w - 2, sy + 12], fill=mz.WOOD[2])
    rg.outline(im)
    return im


def barricada():
    """La mesa volcada de costado con pilas de libros: Martín Fierro, Facundo, Los siete locos,
    Ficciones, Operación Masacre, Rayuela... (los de la viñeta 38 de El atajo)."""
    im = Image.new('RGBA', (110, 40), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rectangle([4, 18, 104, 37], fill=mz.WOOD[1])                    # la tapa de la mesa, de canto
    d.line([(4, 18), (104, 18)], fill=mz.WOOD[3])
    for x in range(10, 104, 12):
        d.line([(x, 20), (x, 36)], fill=mz.WOOD[0])
    rng = random.Random(38)
    x = 0
    while x < 108:                                                     # pilas de libros encima
        h = rng.randint(4, 7)
        y = 18
        for _ in range(h):
            bw = rng.randint(8, 12)
            c = rng.choice(LOMOS)
            d.rectangle([x, y - 3, x + bw, y - 1], fill=c)
            d.line([(x, y - 3), (x + bw, y - 3)], fill=hx('f0e8d0'))
            y -= 3
        x += rng.randint(7, 11)
    rg.outline(im)
    return im


def sala():
    """La sala de lectura (nivel 5): ventanal corrido sobre las copas, hormigón, mesas largas.
    La barricada de libros, el Mano con su tablero y los hombres-robot que avanzan."""
    WW, WH = 320, 180
    rng = random.Random(5)
    im = Image.new('RGBA', (WW, WH), (12, 10, 18, 255))
    d = ImageDraw.Draw(im)
    # piso de parquet
    pq = [mz.tile('parquet_0'), mz.tile('parquet_1'), mz.tile('parquet_2')]
    for y in range(56, WH, 16):
        for x in range(0, WW, 16):
            im.alpha_composite(pq[rng.randrange(3)], (x, y))
    # pared del fondo: hormigón con el ventanal corrido, aletas verticales, la noche y los árboles
    concrete(d, (0, 0, WW - 1, 56), 3, rng)
    d.rectangle([0, 8, WW - 1, 46], fill=GLASS[0])
    for x in range(0, WW, 4):                                          # copas nevadas afuera, abajo
        h = 8 + int(5 * math.sin(x * 0.13) + 3 * math.sin(x * 0.41))
        d.line([(x, 46 - h), (x, 46)], fill=hx('16302a'))
        d.line([(x, 46 - h), (x + 3, 46 - h)], fill=SNOW[1])
    for _ in range(40):
        d.point((rng.randrange(WW), rng.randrange(10, 30)), fill=SNOW[3] if rng.random() < 0.6 else CONT)
    for x in range(0, WW, 14):
        d.rectangle([x, 6, x + 3, 48], fill=CON[4])
        d.line([(x + 3, 8), (x + 3, 48)], fill=CON[2])
    d.rectangle([0, 46, WW - 1, 56], fill=CON[3])
    for y in range(48, 56, 3):
        d.line([(0, y), (WW - 1, y)], fill=CON[2])
    # sombras de contacto al pie de la pared
    for x in range(WW):
        d.point((x, 56), fill=hx('1a1416'))
    objs = []

    def put(img, x, base):
        objs.append((base, x, base - img.height, img))

    put(estante(64, 40), 4, 98)
    put(estante(64, 40), 252, 98)
    for (x, b) in ((96, 92), (96, 122), (200, 92)):
        put(mesa_lectura(96), x, b)
    put(barricada(), 30, 156)
    # detrás de la barricada: Juan y Favalli (de espaldas, mirando al Mano)
    put(mz.spr('chars2', 'juan_suit_rifle/arriba_quieto_1'), 52, 170)
    put(mz.spr('chars2', 'favalli/arriba_quieto_1'), 84, 172)
    # el Mano con su tablero y los hombres-robot
    put(materializador(), 236, 140)
    put(enemies.aura(enemies.mano('front'), pad=5).img, 262, 140)
    for (bb, x, b) in (('lucas', 200, 150), ('polsky', 168, 140), ('polsky_coat', 220, 168), ('lucas', 150, 166)):
        put(hombre_robot(bb, 'abajo'), x, b)
    # libros tirados en el piso
    for (x, y) in ((130, 150), (110, 160), (190, 130), (170, 172)):
        c = rng.choice(LOMOS)
        d.rectangle([x, y, x + 6, y + 4], fill=c)
        d.line([(x, y), (x + 6, y)], fill=hx('f0e8d0'))
    for _, x, y, img in sorted(objs, key=lambda o: o[0]):
        im.alpha_composite(img, (x, y))
    return im


def ficha_texto(img, lines, x, y, k=2, color=hx('d9ad7c')):
    for j, ln in enumerate(lines):
        mz.text(img, x, y + j * (10 * k + 4), ln, color, k)


if __name__ == '__main__':
    ext = exterior()
    rg.zoom(ext, 3).save(os.path.join(OUT, 'biblioteca_exterior.png'))
    rg.zoom(mz.apagon(ext), 3).save(os.path.join(OUT, 'biblioteca_exterior_apagon.png'))
    s = sala()
    # la sala con la luz del apagón y las lámparas: usamos la luz del cuarto del programador
    sc = rg.Scene(size=(320, 180))
    sc.im = s
    sc.light([(120, 80, 120, rg.T_WARM, 1.2), (240, 120, 70, (0.8, 1.05, 1.25), 1.2)])
    rg.zoom(sc.im, 6).save(os.path.join(OUT, 'biblioteca_sala.png'))
    rg.zoom(edificio(), 6).save(os.path.join(OUT, 'biblioteca_edificio_x6.png'))
    print('ok')
