"""Click normal = toda la mano se hunde (no se mueve el dedo).
A: baja 1 px en diagonal. B: baja 1 px y se aplasta 1 fila (palma). C: A + un tono mas oscura.
Base: point_P1.png y point_P2.png. Salida: hundir_<base>_<var>.png, hundir_anim.gif, lamina_hundir.png"""
import os
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__))
O, S_, D, K = (235, 225, 204, 255), (198, 184, 159, 255), (144, 127, 105, 255), (42, 24, 18, 255)

def shift(im, dx, dy):
    out = Image.new('RGBA', im.size, (0, 0, 0, 0)); out.alpha_composite(im, (dx, dy)); return out

def squash(im, row=16):
    """saca una fila de la palma: arriba de 'row' baja 1 px, abajo queda fijo"""
    out = Image.new('RGBA', im.size, (0, 0, 0, 0))
    out.alpha_composite(im.crop((0, 0, 32, row)), (0, 1))
    out.alpha_composite(im.crop((0, row + 1, 32, 32)), (0, row + 1))
    return out

def darker(im):
    m = {O: S_, S_: D}
    out = im.copy(); px = out.load()
    for y in range(32):
        for x in range(32):
            if px[x, y] in m: px[x, y] = m[px[x, y]]
    return out

def soft(im):
    """solo la base clara pasa a sombra clara: hundida pero legible"""
    out = im.copy(); px = out.load()
    for y in range(32):
        for x in range(32):
            if px[x, y] == O: px[x, y] = (220, 208, 184, 255)
    return out

VARS = {'A': lambda im: shift(im, 1, 1),
        'B': lambda im: shift(squash(im), 1, 1),
        'C': lambda im: soft(shift(im, 1, 1))}
bases = {b: Image.open(os.path.join(HERE, f'point_{b}.png')).convert('RGBA') for b in ('P1', 'P2')}
SC = 8; BG = (90, 110, 90, 255); BOX = 34 * SC
frames = []
for b, im in bases.items():
    for v, f in VARS.items():
        f(im).save(os.path.join(HERE, f'hundir_{b}_{v}.png'))

def sheet(pressed):
    c = Image.new('RGBA', (3 * BOX, 2 * BOX + 22), (30, 22, 22, 255)); d = ImageDraw.Draw(c)
    for j, (b, im) in enumerate(bases.items()):
        for i, (v, f) in enumerate(VARS.items()):
            t = Image.new('RGBA', (34, 34), BG); t.alpha_composite(f(im) if pressed else im, (1, 1))
            c.paste(t.resize((BOX, BOX), Image.NEAREST), (i * BOX, 22 + j * BOX))
            if j == 0: d.text((i * BOX + 6, 5), {'A': 'A baja 1px', 'B': 'B baja + aplasta', 'C': 'C baja + sombra'}[v], fill=(240, 230, 210))
    return c.convert('RGB')

up, down = sheet(False), sheet(True)
up.save(os.path.join(HERE, 'lamina_hundir.png'))
up.save(os.path.join(HERE, 'hundir_anim.gif'), save_all=True, append_images=[down, up, down, up],
        duration=[700, 140, 350, 140, 700], loop=0)
