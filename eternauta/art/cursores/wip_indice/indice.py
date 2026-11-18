"""Mano que señala hecha con el dedo indice REAL del guante abierto (Wiercioch)
injertado sobre su puño. Variantes: A = injerto directo, B = dedo 2 px mas largo,
C = B + toque (dedo encogido 1 px). Salida: lamina_indice.png (x8) y los 32x32."""
import os
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, '..', 'wip_mano_senala', 'ref_native')
op = Image.open(os.path.join(REF, 'c32_open.png')).convert('RGBA')
fi = Image.open(os.path.join(REF, 'c32_fist.png')).convert('RGBA')
OUT = (42, 24, 18, 255)
# borde derecho (contorno) del indice en el guante abierto, por fila
SEP = {0: 0, 1: 0, 2: 0, 3: 8, 4: 8, 5: 9, 6: 10, 7: 10, 8: 11, 9: 11}

def finger(stretch=0):
    """recorta el indice (filas 3..9) y lo estira 'stretch' filas repitiendo la fila 5"""
    rows = []
    for y in range(3, 10):
        rows.append([op.getpixel((x, y)) if x <= SEP[y] else (0, 0, 0, 0) for x in range(32)])
        if y == 5:
            for _ in range(stretch):
                rows.append(list(rows[-1]))
    return rows

def pointer(stretch=0, drop=0):
    im = fi.copy()
    rows = finger(stretch)
    top = 10 - len(rows) + drop          # el dedo termina justo donde arranca el nudillo
    px = im.load()
    for i, row in enumerate(rows):
        y = top + i
        if y < 0:
            continue
        for x, p in enumerate(row):
            if p[3] and (y < 7 or x <= SEP.get(i + 3 - (len(rows) - 7), 11)):
                px[x, y] = p
    # contorno a la derecha del dedo donde no toca el puño
    for y in range(32):
        for x in range(31):
            if px[x, y][3] and px[x, y] != OUT and not px[x + 1, y][3]:
                px[x + 1, y] = OUT
    return im

A = pointer(0); B = pointer(2); C = pointer(2, drop=1)
for n, im in [('A', A), ('B', B), ('C_toque', C)]:
    im.save(os.path.join(HERE, f'point_{n}.png'))

S = 8; BG = (90, 110, 90, 255)
cur = Image.open(os.path.join(HERE, '..', '..', 'sprites', 'cursor', 'hand.png')).convert('RGBA')
items = [('actual', cur), ('abierta (orig)', op), ('A injerto', A), ('B largo', B), ('C toque', C), ('puño (orig)', fi)]
lam = Image.new('RGBA', (len(items) * 34 * S, 34 * S + 22), (30, 22, 22, 255))
d = ImageDraw.Draw(lam)
for i, (t, im) in enumerate(items):
    c = Image.new('RGBA', (34, 34), BG); c.alpha_composite(im, (1, 1))
    lam.paste(c.resize((34 * S, 34 * S), Image.NEAREST), (i * 34 * S, 22))
    d.text((i * 34 * S + 6, 5), t, fill=(240, 230, 210))
lam.save(os.path.join(HERE, 'lamina_indice.png'))
