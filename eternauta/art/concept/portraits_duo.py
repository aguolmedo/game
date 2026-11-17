"""Retratos de dialogo en duotono (el estilo aprobado con el del Mano).

La vineta del comic a 56x56, aclarada (gamma 0.6) y reducida a 5 tonos de un
solo color, de la tinta al papel. Cada personaje tiene su tinte; la cara llena
el cuadro. Salida: out/duo_<nombre>.png, out/duo_<nombre>_x6.png, out/duo_sheet_x4.png
"""
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..', '..', 'tools', 'art'))
from portraits import FACES, COMIC, tones, colorize  # noqa: E402
from pixel import hx, mix  # noqa: E402

OUT = os.path.join(HERE, 'out')
REF = os.path.join(HERE, '..', '..', 'ref')


def duo(ink, paper):
    """5 tonos: tinta, 3 intermedios y papel."""
    a, b = hx(ink), hx(paper)
    return [mix(a, b, t) for t in (0, 0.28, 0.55, 0.8, 1)]


# tinte por personaje: (tinta, papel)
TINTS = {
    'mano': ('#160c1a', '#f6e2ee'),     # el de referencia
    'juan': ('#1c1210', '#f6e4cc'),     # sepia calido
    'favalli': ('#141420', '#e8e6dc'),
    'lucas': ('#181612', '#efe8d6'),
    'polsky': ('#121820', '#e4ecf0'),
    'elena': ('#1e1018', '#f8e6dc'),
    'martita': ('#1c1410', '#fbf0d8'),
    'traje': ('#0e1620', '#dcecf2'),     # frio, como la nevada
}
SRC = {k: (os.path.join(COMIC, p), box) for k, (p, box) in FACES.items()}
# recortes mas ajustados que los de portraits.py: la cara llena el cuadro
SRC['juan'] = (os.path.join(COMIC, 'p033.jpg'), (830, 300, 1000, 470))
SRC['traje'] = (os.path.join(COMIC, 'p041.jpg'), (180, 318, 300, 438))
SRC['martita'] = (os.path.join(COMIC, 'p034.jpg'), (440, 572, 590, 722))
SRC['mano'] = (os.path.join(REF, 'manos', 'mano_cara.png'), (300, 0, 650, 350))


def portrait(name, size=56):
    path, box = SRC[name]
    im = Image.open(path).crop(box).convert('L').point(lambda v: int(255 * (v / 255) ** 0.6))
    q = tones(im, (size, size), blur=1.1, contrast=1.1)
    return colorize(q, duo(*TINTS[name]))


def build():
    ims = []
    for n in TINTS:
        im = portrait(n)
        im.save(os.path.join(OUT, f'duo_{n}.png'))
        im.resize((336, 336), Image.NEAREST).save(os.path.join(OUT, f'duo_{n}_x6.png'))
        ims.append(im.resize((224, 224), Image.NEAREST))
    sheet = Image.new('RGB', (4 * 236 + 12, 2 * 236 + 12), (17, 22, 42))
    for i, im in enumerate(ims):
        sheet.paste(im, (12 + (i % 4) * 236, 12 + (i // 4) * 236))
    sheet.save(os.path.join(OUT, 'duo_sheet_x4.png'))
    print('ok', len(ims))


if __name__ == '__main__':
    build()
