"""Cursores nuevos: el clasico (flecha) y la mano, del pack descargado
(src_*.png, pixel art a 10x), reducidos a 1x y recoloreados en marron.

Salida: cursor_<variante>.png y la hoja de muestra muestra_x6.png
"""
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SCALE = 10

# blanco -> base, gris claro -> sombra, gris oscuro -> sombra profunda, negro -> contorno
VARIANTS = {
    'cuero': {(255, 255, 255): (234, 145, 48), (204, 204, 204): (200, 97, 28), (144, 144, 144): (143, 52, 18), (0, 0, 0): (49, 28, 28)},
    'madera': {(255, 255, 255): (176, 124, 70), (204, 204, 204): (138, 90, 52), (144, 144, 144): (94, 58, 36), (0, 0, 0): (42, 24, 18)},
    'crudo': {(255, 255, 255): (238, 230, 212), (204, 204, 204): (204, 190, 166), (144, 144, 144): (148, 130, 106), (0, 0, 0): (42, 24, 18)},
    'blanquito': {(255, 255, 255): (244, 240, 230), (204, 204, 204): (206, 198, 184), (144, 144, 144): (150, 138, 124), (0, 0, 0): (42, 24, 18)},
    'beige': {(255, 255, 255): (226, 210, 178), (204, 204, 204): (190, 170, 134), (144, 144, 144): (138, 116, 86), (0, 0, 0): (42, 24, 18)},
}


def load(name):
    im = Image.open(os.path.join(HERE, f'src_{name}.png')).convert('RGBA')
    return im.resize((im.width // SCALE, im.height // SCALE), Image.NEAREST)


def recolor(im, pal):
    out = im.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a:
                px[x, y] = pal[(r, g, b)] + (255,)
    return out


# variante elegida para el juego
GAME_VARIANT = 'crudo'


def press_far(pal):
    """Apretando: cada tono baja un escalon. Lejos: los mismos tonos en gris."""
    base, shad, deep, out = (pal[k] for k in ((255, 255, 255), (204, 204, 204),
                                               (144, 144, 144), (0, 0, 0)))
    darker = tuple(int(c * 0.72) for c in deep)
    press = {base: shad, shad: deep, deep: darker, out: out}
    gray = lambda c: (int(sum(c) / 3),) * 3
    far = {c: tuple(int(v * 0.8) for v in gray(c)) for c in (base, shad, deep)}
    far[out] = (52, 46, 44)
    return press, far


GAME_DIR = os.path.join(HERE, '..', 'sprites', 'cursor')


def to_game():
    """Escribe los 4 estados en art/sprites/cursor/ y ajusta los hotspots."""
    import json
    pal = VARIANTS[GAME_VARIANT]
    PRESS, FAR = press_far(pal)
    arrow = recolor(load('cursor'), pal)
    hand = recolor(load('pointer'), pal)
    press = Image.new('RGBA', (hand.width + 1, hand.height + 1), (0, 0, 0, 0))
    press.alpha_composite(recolor(hand, PRESS), (1, 1))     # se hunde 1 px
    hand_pad = Image.new('RGBA', press.size, (0, 0, 0, 0))
    hand_pad.alpha_composite(hand, (0, 0))
    far = Image.new('RGBA', press.size, (0, 0, 0, 0))
    far.alpha_composite(recolor(hand, FAR), (0, 0))
    for n, im in (('arrow', arrow), ('hand', hand_pad), ('hand_press', press), ('hand_far', far)):
        im.save(os.path.join(GAME_DIR, n + '.png'))
    path = os.path.join(GAME_DIR, '_sheet.json')
    sheet = json.load(open(path))
    sheet['meta']['hotspots'] = {'arrow': [0, 0], 'hand': [1, 1],
                                 'hand_press': [2, 2], 'hand_far': [1, 1]}
    with open(path, 'w') as f:
        f.write(json.dumps(sheet, ensure_ascii=False, indent=1) + '\n')
    print(f'cursores {GAME_VARIANT} -> art/sprites/cursor/ (corré npm run sprites:pack)')


def build():
    rows = []
    for v, pal in VARIANTS.items():
        row = []
        for n in ('cursor', 'pointer'):
            im = recolor(load(n), pal)
            im.save(os.path.join(HERE, f'{n}_{v}.png'))
            row.append(im)
        rows.append(row)
    # muestra: cada variante sobre fondo oscuro y claro, a 6x
    k, pad = 6, 8
    cw = max(i.width for r in rows for i in r) * k + pad
    ch = max(i.height for r in rows for i in r) * k + pad
    bgs = [(27, 36, 64), (200, 190, 168)]
    sheet = Image.new('RGBA', (cw * 4 + pad, ch * len(rows) + pad), (17, 22, 42, 255))
    for j, row in enumerate(rows):
        for b, bg in enumerate(bgs):
            for i, im in enumerate(row):
                x, y = pad + (b * 2 + i) * cw, pad + j * ch
                sheet.paste(bg + (255,), (x, y, x + cw - pad, y + ch - pad))
                big = im.resize((im.width * k, im.height * k), Image.NEAREST)
                sheet.alpha_composite(big, (x + 4, y + 4))
    sheet.save(os.path.join(HERE, 'muestra_x6.png'))
    print('ok')


if __name__ == '__main__':
    import sys
    build()
    if '--juego' in sys.argv:
        to_game()
