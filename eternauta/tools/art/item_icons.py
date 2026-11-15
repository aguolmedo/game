"""Iconos 16x16 de la barra/mochila para TODOS los items (completa items.png).

Usa los objetos del concepto (art/concept/props.py, garage.py) centrados en
16x16, con variantes de estado para el mate y la pava. Se agrega al atlas
existente sin tocar los iconos que ya estaban.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(ROOT, 'art', 'concept'))
from PIL import Image  # noqa: E402
from pixel import Pix, hx  # noqa: E402
import props as pr  # noqa: E402
import garage as gg  # noqa: E402

ASSETS = os.path.join(ROOT, 'public', 'assets')
GOURD = [hx('#4a2c18'), hx('#7a5230'), hx('#a07448'), hx('#c89a68')]
YERBA = [hx('#3a5a2a'), hx('#5a8a3a'), hx('#8ab85a')]
TIN = [hx('#5a6270'), hx('#9aa4b0'), hx('#d8e0e6')]
STEAM = hx('#e8f4f8')


def center(p, size=16):
    img = p.img if hasattr(p, 'img') else p
    box = img.getbbox() or (0, 0, img.width, img.height)
    img = img.crop(box)
    if img.width > size or img.height > size:
        k = min(size / img.width, size / img.height)
        img = img.resize((max(1, int(img.width * k)), max(1, int(img.height * k))), Image.NEAREST)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.alpha_composite(img, ((size - img.width) // 2, size - img.height - 1))
    return out


def mate(state):
    p = Pix(16, 16)
    p.ellipse(8, 10, 5, 5, GOURD[1])                                  # calabaza
    p.ellipse(6, 9, 2, 3, GOURD[2]); p.set(5, 8, GOURD[3])
    p.rect(4, 5, 9, 2, GOURD[0])                                      # boca
    if state in ('yerba', 'cebado', 'lavado'):
        c = YERBA if state != 'lavado' else [hx('#6a6a3a'), hx('#9a9a5a'), hx('#b8b878')]
        p.hline(5, 11, 5, c[1]); p.hline(6, 10, 6, c[0]); p.set(6, 5, c[2])
    p.vline(11, 1, 6, TIN[1]); p.set(12, 1, TIN[2]); p.set(11, 0, TIN[2])   # bombilla
    if state == 'cebado':
        p.set(7, 3, STEAM); p.set(8, 2, STEAM); p.set(7, 1, STEAM)
    p.outline(0.56, 0.22)
    return p


def pava(state):
    p = Pix(16, 16)
    body = [hx('#24384e'), hx('#3a5a7a'), hx('#6a8aaa')]
    if state == 'hervida':
        body = [hx('#4a2a2a'), hx('#7a3a3a'), hx('#a85a5a')]
    p.ellipse(7, 11, 5.5, 4, body[1]); p.hline(3, 10, 8, body[2])
    p.rect(12, 9, 3, 2, body[1]); p.set(14, 8, body[1])               # pico
    for x in range(4, 11):                                            # manija
        p.set(x, 4 if 5 <= x <= 9 else 5, hx('#24242c'))
    p.set(4, 6, hx('#24242c')); p.set(10, 6, hx('#24242c'))
    if state in ('caliente', 'hervida'):
        p.set(14, 6, STEAM); p.set(15, 4, STEAM)
    if state == 'hervida':
        p.set(13, 5, STEAM); p.set(14, 3, STEAM); p.set(15, 1, STEAM); p.set(12, 2, STEAM)
    p.outline(0.56, 0.22)
    return p


def yerba():
    p = Pix(16, 16)
    p.rect(4, 2, 8, 13, hx('#d8c070')); p.vline(11, 2, 14, hx('#a8904a'))
    p.rect(4, 6, 8, 5, hx('#3a6a3a')); p.hline(5, 10, 8, hx('#e8e0c0'))
    p.hline(4, 11, 2, hx('#f0e0a0'))
    p.outline(0.56, 0.22)
    return p


def secador():
    p = Pix(16, 16)
    p.ellipse(7, 6, 5, 3.5, hx('#b8343a')); p.hline(4, 9, 4, hx('#e06a6a'))
    p.rect(11, 5, 4, 3, hx('#8a2a2e')); p.rect(5, 9, 3, 6, hx('#8a2a2e')); p.vline(5, 9, 14, hx('#b8343a'))
    p.circle(4, 6, 1.5, hx('#2a2a30'))
    p.outline(0.56, 0.22)
    return p


def balas():
    p = Pix(16, 16)
    p.rect(2, 7, 12, 7, hx('#6a5a3a')); p.hline(2, 13, 7, hx('#8a7a52'))
    for x in (4, 7, 10):
        p.rect(x, 2, 2, 6, hx('#c8a050')); p.set(x, 2, hx('#e8d8a0')); p.set(x, 1, hx('#8a8a92'))
    p.outline(0.56, 0.22)
    return p


def calentador():
    p = Pix(16, 16)
    p.rect(3, 8, 10, 6, TIN[1]); p.hline(3, 12, 8, TIN[2]); p.vline(12, 8, 13, TIN[0])
    p.rect(5, 6, 6, 2, hx('#3a3a42'))
    p.set(7, 4, hx('#5aa0ff')); p.set(8, 3, hx('#a0d0ff')); p.set(9, 4, hx('#5aa0ff'))
    p.outline(0.56, 0.22)
    return p


def vela():
    p = Pix(16, 16)
    p.rect(6, 6, 4, 8, hx('#efe6d0')); p.vline(9, 6, 13, hx('#c8bea8'))
    p.rect(4, 13, 8, 2, hx('#8a8a92'))
    p.set(8, 3, hx('#ffe080')); p.set(8, 4, hx('#ffb040')); p.set(8, 5, hx('#3a3a3a'))
    p.outline(0.56, 0.22)
    return p


def libros():
    p = Pix(16, 16)
    for k, c in enumerate(('#7a2a32', '#2a4a6a', '#3a5a3a')):
        p.rect(2, 12 - k * 3, 12, 3, hx(c)); p.hline(2, 13, 12 - k * 3, hx('#e8e0c8'))
    p.outline(0.56, 0.22)
    return p


def tijera():
    p = Pix(16, 16)
    for k in range(8):
        p.set(4 + k, 4 + k, TIN[2]); p.set(11 - k, 4 + k, TIN[1])
    p.circle(4, 13, 1.8, hx('#2a4a8a')); p.circle(11, 13, 1.8, hx('#2a4a8a'))
    p.outline(0.56, 0.22)
    return p


NEW = {
    'mate_vacio': lambda: center(mate('vacio')),
    'mate_yerba': lambda: center(mate('yerba')),
    'mate_cebado': lambda: center(mate('cebado')),
    'mate_lavado': lambda: center(mate('lavado')),
    'yerba': lambda: center(yerba()),
    'pava_fria': lambda: center(pava('fria')),
    'pava_caliente': lambda: center(pava('caliente')),
    'pava_hervida': lambda: center(pava('hervida')),
    'nafta': lambda: center(gg.bidon()),
    'secador': lambda: center(secador()),
    'balas': lambda: center(balas()),
    'calentador': lambda: center(calentador()),
    'vela': lambda: center(vela()),
    'libros': lambda: center(libros()),
    'tijera': lambda: center(tijera()),
    'lata': lambda: center(pr.lata()),
    'latas': lambda: center(pr.lata(hx('#3a7a4a'))),
    'frascos': lambda: center(pr.frasco()),
    'pan': lambda: center(pr.pan()),
    'lista': lambda: center(pr.lista()),
    'naipes': lambda: center(pr.naipe('oro')),
    'anotador': lambda: center(pr.anotador()),
    'sifon': lambda: center(pr.sifon()),
    'vino': lambda: center(pr.botella_vino()),
    'vaso': lambda: center(pr.vaso_vino()),
    'cenicero': lambda: center(pr.cenicero()),
    'lampara_aceite': lambda: center(pr.lampara_aceite()),
}


def build():
    png = os.path.join(ASSETS, 'items.png'); js = os.path.join(ASSETS, 'items.json')
    data = json.load(open(js))
    frames = data['frames']
    old = Image.open(png).convert('RGBA')
    add = [n for n in NEW if n not in frames]
    cols = max(1, old.width // 17)
    rows_needed = (len(add) + cols - 1) // cols
    out = Image.new('RGBA', (max(old.width, cols * 17), old.height + 1 + rows_needed * 17), (0, 0, 0, 0))
    out.alpha_composite(old, (0, 0))
    for i, n in enumerate(add):
        x = (i % cols) * 17; y = old.height + 1 + (i // cols) * 17
        out.alpha_composite(NEW[n](), (x, y))
        frames[n] = [x, y, 16, 16]
    out.save(png)
    json.dump(data, open(js, 'w'), indent=1)
    return add


if __name__ == '__main__':
    added = build()
    print(f'items.png: +{len(added)} iconos ->', ', '.join(added))
