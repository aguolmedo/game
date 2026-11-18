"""Retratos 32x32 dibujados a mano (factura de juan_suit), calcados del sprite.
Cada fila: (sangría, pixeles). '.' = transparente. Se muestran a 64x64 (x2).
Salida: out/p32h_<who>.png, out/p32h_<who>_x2.png, out/p32h_lamina.png
"""
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(HERE, 'out')


def hx(s):
    s = s.lstrip('#')
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


SKIN = {'T': '#f4caa8', 'L': '#e2ab8c', 'R': '#bb7f68', 'D': '#8c5650', 'O': '#3f2a2a',
        'e': '#1c1420', 'w': '#f0ece2', 'm': '#8a4848', 'n': '#b06a5c', 'X': '#241a1c'}

# ------------------------------------------------------------------ Juan
JUAN_PAL = dict(SKIN, **{
    'o': '#2a1d1f', 'h': '#5a3e2c', 'H': '#7e5a40', 'i': '#9a7050', 's': '#3a281e', 'b': '#3a281e',
    'J': '#ece6d2', 'j': '#cfc6ae', 'k': '#9a927c', 't': '#2b2f3e', 'u': '#444a60',
})
JUAN = [
    (10, 'oooooooooooo'),
    (8, 'ooHHiiHHhhhhhhoo'),
    (6, 'oohHHiiHHHhhhhhhhhoo'),
    (5, 'ohhHHHHhhhhhhhhhhhhsso'),
    (4, 'ohhHHhhhhHhhhhhhhhhhhssso'),
    (3, 'ohhhHhhhhhhhhhHhhhhhhhhssso'),
    (3, 'ohhhhhhhhhhhhhhhhhhhhhhssso'),
    (3, 'oshhhhhhhhhhhhhhhhhshhhssso'),
    (3, 'osshhhhhhhhhhhhhhhhshhhhsso'),
    (3, 'osshhhhhLLhhhhhhhLLLshhhsso'),
    (3, 'ossshhLLLLLLhhLLLLLLLLshsso'),
    (3, 'OsssLLLLLLLLLLLLLLLLLLLLsso'),
    (3, 'ORsLLbbbbbLLLLLLLbbbbbLLRsO'),
    (3, 'ORLLLLLLLLLLLLLLLLLLLLLLRRO'),
    (3, 'ORLLLweeLLLLTLLLLLweeLLLRRO'),
    (3, 'DRLLLLeeLLLLTLLLLLLeeLLLRRD'),
    (3, 'DRRLLLLLLLLLTRLLLLLLLLLLRRD'),
    (3, 'ODRLLLLLLLLLTRLLLLLLLLLRRDO'),
    (3, '.ORLLLLLLLLRRRRLLLLLLLLRRO.'),
    (4, 'ORLLLLLLLLLLLLLLLLLLLLRRO'),
    (4, 'ORLLLLLLLmmmmmmLLLLLLLRRO'),
    (4, 'ORRLLLLLLLnnnnLLLLLLLRRRO'),
    (5, 'ORRLLLLLLLLLLLLLLLLRRRO'),
    (6, 'ORRRLLLLLLLLLLLLRRRRO'),
    (8, 'OORRRRLLLLLLRRRROO'),
    (10, 'XtuRRRRRRRRutX'),
    (2, 'XXJJJJjjjttuDRRRRRDuttjjjkkkXX'),
    (1, 'XJJJJJjjjjttuuuuuuuuttjjjjkkkkX'),
    (0, 'XJJJJJjjjjjjtttttttttjjjjjkkkkkX'),
    (0, 'XJJJJJJjjjjjjjjJjjjjjjjjkkkkkkkX'),
    (0, 'XJJJJJjjjjjjjjjJjjjjjjjjkkkkkkkX'),
    (0, 'XJJJJJjjjjjjjjjJjjjjjjjjkkkkkkkX'),
]

# ------------------------------------------------------------------ Favalli
FAV_PAL = dict(SKIN, **{
    'o': '#130e18', 'h': '#2a2226', 'H': '#4c3e44', 'i': '#6a5860', 's': '#1c161f',
    'g': '#1a1622', 'G': '#3a3448',            # marco de los anteojos
    'c': '#a9c4cf', 'C': '#eef8fb', 'q': '#7f9aa8',   # cristal
    'M': '#171216',                             # bigote
    'J': '#f2ecd8', 'j': '#d8cfb6', 'k': '#a69e86', 'z': '#3a3440', 'Z': '#4e4858',
})
FAV = [
    (9, 'ooooooooooooooo'),
    (6, 'oohhHHhhiHhhHHhhhoo'),
    (4, 'oohHHhhhhhhHHhhhhhhhoo'),
    (3, 'ohhhhhHiHhhhhhhiHhhhhsso'),
    (2, 'ohhHhhhhhhhhHhhhhhhhhhhsso'),
    (2, 'ohhHHhhhhhhhhhhhhhhHHhhhsso'),
    (2, 'ohhhhhhHHhhhhHHhhhhhhhhhsso'),
    (2, 'oshhhhhhhhhhhhhhhhhhhhhhsso'),
    (2, 'osshhhhhhhhhhhhhhhhhhhhssso'),
    (3, 'osshhLLLLLLLLLLLLLLLLLhssso'),
    (3, 'OssLLLLLLLLLLLLLLLLLLLLLsso'),
    (3, 'ORLsssssLLLLLLLLLsssssLLRRO'),
    (3, 'ORggggggggLLLLLLggggggggRRO'),
    (2, 'DRRgCcccccgggggggCccccgRRRD'[0:0] + 'ODRgCcccccggLTLggCcccccgRRDO'),
    (2, 'ODRgcceeccgLLTLLgcceeccgRDO'),
    (2, 'ODRgcqqqqcgLLTLLgcqqqqcgRDO'),
    (3, 'ORgggggggLLLTRLLLgggggggRO'),
    (3, 'ORRLLLLLLLLLTRLLLLLLLLLRRO'),
    (3, 'ORLLLLLLLLLRRRRLLLLLLLLRRO'),
    (4, 'ORLLLLLMMMMMMMMMMMLLLLRRO'),
    (4, 'ORLLLLMMMMMMMMMMMMMLLLRRO'),
    (4, 'ORRLLLLLLmmmmmmmLLLLLRRRO'),
    (5, 'ORRLLLLLLnnnnnLLLLLLRRO'),
    (6, 'ORRRLLLLLLLLLLLLRRRRO'),
    (8, 'OORRRRLLLLLLRRRROO'),
    (9, 'XJjJjJjJjJjJjkkX'),
    (2, 'XXJJJJjjjjjjjjjjjjjjjjjjkkkkXX'),
    (1, 'XzzzzzzzzzzzzzzzzzzzzzzzzzzzzX'),
    (0, 'XZZzzzzzzzzzzzzzzzzzzzzzzzzzzzzX'),
    (0, 'XJJJJJJJjjjjjjjjjjjjjjjjjkkkkkkX'),
    (0, 'XzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzX'),
    (0, 'XJJJJJjjjjjjjjjjjjjjjjjjjkkkkkkX'),
]


def draw(rows, pal):
    im = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    px = im.load()
    for y, (pad, body) in enumerate(rows):
        assert pad + len(body) <= 32, (y, pad, len(body))
        for i, ch in enumerate(body):
            if ch != '.':
                px[pad + i, y] = hx(pal[ch])
    return im


CAST = {'juan': (JUAN, JUAN_PAL), 'favalli': (FAV, FAV_PAL)}

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    font = ImageFont.truetype('/usr/share/fonts/noto/NotoSans-Regular.ttf', 26)
    import json
    D = json.load(open(os.path.join(ROOT, 'public', 'assets', 'chars2.json')))
    sheet = Image.open(os.path.join(ROOT, 'public', 'assets', 'chars2.png')).convert('RGBA')
    ref = Image.open(os.path.join(ROOT, 'art', 'sprites', 'portraits_dlg', 'juan_suit.png')).convert('RGBA')
    K = 5
    cw = 64 * K + 30
    lam = Image.new('RGB', (cw * 3 + 30, len(CAST) * (64 * K + 60) + 20), (27, 22, 30))
    d = ImageDraw.Draw(lam)
    BG = (20, 16, 22, 255)
    for r, (who, (rows, pal)) in enumerate(CAST.items()):
        im = draw(rows, pal)
        im.save(os.path.join(OUT, f'p32h_{who}.png'))
        x2 = im.resize((64, 64), Image.NEAREST)
        x2.save(os.path.join(OUT, f'p32h_{who}_x2.png'))
        b = D['blocks'][who]
        spr = sheet.crop((b['x'] + 6 * 16, b['y'], b['x'] + 7 * 16, b['y'] + 21))
        head = Image.new('RGBA', (64, 64), BG)
        big = spr.resize((48, 63), Image.NEAREST)
        head.alpha_composite(big, (8, 1))
        y0 = 10 + r * (64 * K + 60)
        for i, (lbl, pic) in enumerate(((f'{who} · hoy (cabeza)', head), (f'{who} · rework 32', x2), ('referencia: juan_suit', ref))):
            bg = Image.new('RGBA', (64, 64), BG)
            bg.alpha_composite(pic)
            lam.paste(bg.resize((64 * K, 64 * K), Image.NEAREST).convert('RGB'), (20 + i * cw, y0 + 40))
            d.text((20 + i * cw, y0 + 4), lbl, font=font, fill=(238, 228, 210))
    lam.save(os.path.join(OUT, 'p32h_lamina.png'))
    print('ok')
