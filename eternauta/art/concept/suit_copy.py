"""PI-3 v2: la cabeza del sprite de Juan con traje es COPIA del retrato juan_suit.
El retrato es un diseño de 32x32 (pixeles dobles); la cabeza (x3-30, y0-27) se
reduce a la mitad -> 14x14, que es el tamaño de la cabeza del sprite (x1-14, y2-15).
Cada bloque 2x2 -> 1 px: si el bloque tiene un rasgo (ojo, ceja, nariz, costura,
parche, brillo, filtro) gana el rasgo; si no, el color mayoritario.
Salida: out/suit_copy_*.png
"""
import os
from collections import Counter
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(HERE, 'out')
P32 = Image.open(os.path.join(ROOT, 'art', 'sprites', 'portraits_dlg', 'juan_suit.png')).convert('RGBA').resize((32, 32), Image.NEAREST)

FEATURES = [  # de mayor a menor prioridad
    (31, 35, 48), (59, 60, 75),            # ojos
    (129, 134, 138),                       # brillo del ojo
    (45, 44, 48),                          # cejas
    (128, 117, 110),                       # nariz
    (200, 220, 230),                       # brillo de la visera
    (111, 108, 102),                       # costura
    (142, 134, 110), (188, 180, 160),      # parche
    (164, 172, 182), (140, 132, 120),      # filtro
]


def reduce(ox, oy, w=14, h=14):
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    for by in range(h):
        for bx in range(w):
            blk = []
            for dy in range(2):
                for dx in range(2):
                    X, Y = ox + bx * 2 + dx, oy + by * 2 + dy
                    if 0 <= X < 32 and 0 <= Y < 32:
                        blk.append(P32.getpixel((X, Y)))
            op = [p for p in blk if p[3]]
            if len(op) < 2:
                continue
            pick = None
            for f in FEATURES:
                if any(p[:3] == f for p in op):
                    pick = f + (255,)
                    break
            if pick is None:
                pick = Counter(op).most_common(1)[0][0]
            out.putpixel((bx, by), pick)
    return out


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    font = ImageFont.truetype('/usr/share/fonts/noto/NotoSans-Regular.ttf', 24)
    vars_ = {(ox, oy): reduce(ox, oy) for ox in (2, 3) for oy in (0, 1)}
    K = 16
    lam = Image.new('RGB', (len(vars_) * (14 * K + 30) + 32 * 8 + 60, 14 * K + 70), (27, 22, 30))
    d = ImageDraw.Draw(lam)
    for i, ((ox, oy), im) in enumerate(vars_.items()):
        bg = Image.new('RGBA', im.size, (70, 84, 72, 255)); bg.alpha_composite(im)
        lam.paste(bg.resize((14 * K, 14 * K), Image.NEAREST).convert('RGB'), (20 + i * (14 * K + 30), 50))
        d.text((20 + i * (14 * K + 30), 12), f'grilla {ox},{oy}', font=font, fill=(238, 228, 210))
        im.save(os.path.join(OUT, f'suit_copy_head_{ox}{oy}.png'))
    lam.paste(P32.resize((32 * 7, 32 * 7), Image.NEAREST).convert('RGB'), (len(vars_) * (14 * K + 30) + 30, 50))
    d.text((len(vars_) * (14 * K + 30) + 30, 12), 'retrato', font=font, fill=(238, 228, 210))
    lam.save(os.path.join(OUT, 'suit_copy_variantes.png'))
    print('ok')
