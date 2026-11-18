"""Mano que señala, dibujada a mano copiando fila a fila el indice del guante
abierto de Wiercioch (mismo ancho, misma inclinacion, mismo sombreado), sobre
su puño original. P1 = largo original, P2 = 2 filas mas largo, TAP = P1 bajado 1 px."""
import os
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, '..', 'wip_mano_senala', 'ref_native')
fi = Image.open(os.path.join(REF, 'c32_fist.png')).convert('RGBA')
op = Image.open(os.path.join(REF, 'c32_open.png')).convert('RGBA')
COL = {'o': (235, 225, 204, 255), '#': (42, 24, 18, 255), 'd': (144, 127, 105, 255), 's': (198, 184, 159, 255)}

# (y, x_inicio, pixeles) — copiado del indice de c32_open filas 3..9, subido 1 fila
P1 = [(2, 4, '####'), (3, 3, '#soos#'), (4, 3, '#ooooo#'), (5, 3, '#ooooos#'),
      (6, 4, '#ooooo#'), (7, 4, '#dsoooo#')]
P2 = [(0, 2, '####'), (1, 1, '#soos#'), (2, 1, '#ooooo#'), (3, 2, '#ooooo#'),
      (4, 2, '#ooooos#'), (5, 3, '#ooooo#'), (6, 3, '#sooooo#'), (7, 4, '#dsoooo#')]

def draw(rows):
    im = fi.copy(); px = im.load()
    for y, x0, s in rows:
        for i, ch in enumerate(s):
            px[x0 + i, y] = COL[ch]
    return im

def shift(im, dx, dy):
    out = Image.new('RGBA', im.size, (0, 0, 0, 0)); out.alpha_composite(im, (dx, dy)); return out

p1, p2 = draw(P1), draw(P2)
tap1 = shift(draw(P1[1:] and [(3, 4, '####')] + P1[2:]), 0, 1)   # dedo 1 fila mas corto y bajado
tap2 = shift(draw([(1, 2, '####')] + P2[2:]), 0, 1)
for n, im in [('P1', p1), ('P2', p2), ('P1_tap', tap1), ('P2_tap', tap2)]:
    im.save(os.path.join(HERE, f'point_{n}.png'))

S = 8; BG = (90, 110, 90, 255)
cur = Image.open(os.path.join(HERE, '..', '..', 'sprites', 'cursor', 'hand.png')).convert('RGBA')
items = [('actual', cur), ('abierta orig', op), ('P1', p1), ('P1 toque', tap1), ('P2 largo', p2), ('P2 toque', tap2), ('puno orig', fi)]
lam = Image.new('RGBA', (len(items) * 34 * S, 34 * S + 22), (30, 22, 22, 255)); d = ImageDraw.Draw(lam)
for i, (t, im) in enumerate(items):
    c = Image.new('RGBA', (34, 34), BG); c.alpha_composite(im, (1, 1))
    lam.paste(c.resize((34 * S, 34 * S), Image.NEAREST), (i * 34 * S, 22)); d.text((i * 34 * S + 6, 5), t, fill=(240, 230, 210))
lam.save(os.path.join(HERE, 'lamina_indice.png'))
# tamaño real en juego (x2 de pantalla tipica) sobre fondo oscuro
g = Image.new('RGBA', (7 * 20, 20), (52, 40, 38, 255))
for i, (_, im) in enumerate(items): g.alpha_composite(im.resize((16, 16), Image.NEAREST), (i * 20 + 2, 2))
g.resize((g.width * 4, g.height * 4), Image.NEAREST).save(os.path.join(HERE, 'lamina_indice_enjuego.png'))
