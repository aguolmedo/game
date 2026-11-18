"""Planta baja completa (diseño, no toca el juego).
Qué faltaba / no tenía sentido:
  - Cuarto de Martita: la ventana está en una pared INTERIOR (da al living) -> se
    reemplaza por un dibujo de Martita pegado en la pared. La cuna (Martita ya
    camina y habla) -> camita (`cot`, ya existe).
  - Cocina: sin pileta ni sillas -> pileta enlozada con canilla (nueva) y dos sillas
    (`chair`, `chair_front`, ya existen).
  - Dormitorio: pared vacía -> foto de casamiento enmarcada (nueva).
  - Garaje-entrada: piso vacío -> escoba con balde y bidón (ya existen).
Base: captura sin luz y sin zoom (art/direccion/doc/capturas/raw_house_full.png).
Mapa -> pantalla: sx = mx + 16, sy = my + 7 (vista 480x270).
Salida: out/house_v2.png (x4), out/house_v2_compare.png, out/house_v2_sprites_x8.png,
y los sprites nuevos out/hv2_<nombre>.png (listos para art/sprites/).
"""
import json
import os

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
A = os.path.join(ROOT, 'public', 'assets')
OUT = os.path.join(HERE, 'out')
CAP = os.path.join(ROOT, 'art', 'direccion', 'doc', 'capturas', 'raw_house_full.png')
OX, OY = 16, 7


def frame(sheet, name):
    d = json.load(open(os.path.join(A, sheet + '.json')))
    fr = d.get('frames', d)[name]
    im = Image.open(os.path.join(A, sheet + '.png')).convert('RGBA')
    x, y, w, h = fr[:4]
    return im.crop((x, y, x + w, y + h))


def hx(s):
    s = s.lstrip('#')
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


def grid(rows, pal):
    w = max(len(r) for r in rows)
    im = Image.new('RGBA', (w, len(rows)), (0, 0, 0, 0))
    px = im.load()
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch != '.':
                px[x, y] = hx(pal[ch])
    return im


# ------------------------------------------------------------------ sprites nuevos
# Dibujo de Martita: hoja con crayón (casa con techo rojo, sol, tres monigotes), con chinche.
DIBUJO = grid([
    '......r.......',
    '.oooooOoooooo.',
    '.pppppppppppy.',
    '.pyypppppppyyo',
    '.pyypppRpppppo',
    '.pppppRRRppppo',
    '.ppppRRRRRpppo',
    '.pppppwbwppppo',
    '.pkppkpwbwpkpo',
    '.kkkkkkkkkkkko',
    '.pkppkppppkppo',
    '.oooooooooooo.',
], {'o': '#8a7f6a', 'O': '#6a6052', 'p': '#f2ecd8', 'y': '#f0c040', 'R': '#c04a3a',
    'w': '#d8b070', 'b': '#5a3e2c', 'k': '#3a5a8a', 'r': '#c04a3a'})

# Foto de casamiento: marco de madera oscura, foto sepia de una pareja.
FOTO = grid([
    '.oooooooooo.',
    'ommmmmmmmmmo',
    'omsssssssssmo'[:12],
    'omsSSssSSssm',
    'omsSSssSSssm',
    'omsddsswwssm',
    'omsddsswwssm',
    'omsddswwwwsm',
    'omssssssssm.'[:11] + 'm',
    'ommmmmmmmmmo',
    '.oooooooooo.',
], {'o': '#2a1d1f', 'm': '#5e3a24', 's': '#c8b48c', 'S': '#7a6248', 'd': '#3a2a20', 'w': '#ece4d0'})

# Camita de Martita (22x20): cabecera de madera, almohada, frazada rosa con lunares.
CAMITA = grid([
    '.oooooooooooooooooooo.',
    'oBBBBBBBBBBBBBBBBBBBBo',
    'obBBBBBBBBBBBBBBBBBBbo',
    'obbbbbbbbbbbbbbbbbbbbo',
    'oWWWWWWWWWWWWWWWWWWWWo',
    'oWwwwwwWWWWWWWWWWWWWWo',
    'oWwwwwwWWWWWWWWWWWWWWo',
    'oWWWWWWWWWWWWWWWWWWWWo',
    'oppppppppppppppppppppo',
    'oPPPPPPPPPPPPPPPPPPPPo',
    'oPPPPPdPPPPPPPdPPPPPPo',
    'oPPPPPPPPPPPPPPPPPPPPo',
    'oPPPPPPPPPPdPPPPPPPPPo',
    'oPPdPPPPPPPPPPPPPdPPPo',
    'oPPPPPPPPPPPPPPPPPPPPo',
    'oqqqqqqqqqqqqqqqqqqqqo',
    'obbbbbbbbbbbbbbbbbbbbo',
    'oBBBBBBBBBBBBBBBBBBBBo',
    'oooooooooooooooooooooo',
    '.oo................oo.',
], {'o': '#2a1d1f', 'B': '#8a5a34', 'b': '#5e3a24', 'W': '#ece6d8', 'w': '#ffffff',
    'p': '#e8b0b8', 'P': '#d88a98', 'd': '#f4e4e8', 'q': '#b06a7a'})

# ---- Pared trasera (exterior) de la fila de abajo, vista desde arriba: el canto
# de la pared, como los tabiques. 16 px de alto (fila 15 del mapa).
def pared_trasera(w):
    pal = {'o': '#1f161a', 'p': '#7a4a3a', 'P': '#965a46', 'q': '#5a3430', 'n': '#eefaff'}
    rows = ['o' * w,
            'n' * w,                                   # nieve sobre el canto (afuera)
            'P' * w, 'p' * w, 'p' * w, 'q' * w,
            'p' * w, 'p' * w, 'q' * w, 'p' * w, 'p' * w, 'q' * w,
            'p' * w, 'p' * w, 'q' * w, 'o' * w]
    return grid(rows, pal)


def ventana_trasera(abierta):
    """Ventana de 32x16 en la pared trasera. Cerrada: vidrio con la nevada del
    patio. Abierta: el hueco muestra el patio nevado (blanco), las hojas van aparte."""
    W, H = 32, 16
    pal = {'o': '#1f161a', 'F': '#8a5a34', 'f': '#5e3a24', 'G': '#c8e2ee', 'g': '#9fbfd4',
           'w': '#eefaff', 'S': '#b07c46', 'n': '#ffffff', 'd': '#7896b0'}
    rows = ['o' * W, 'o' + 'F' * 30 + 'o']
    flakes = {(5, 4), (11, 6), (22, 5), (27, 8), (8, 9), (19, 9), (25, 3)}
    for y in range(2, 11):
        r = 'oF'
        for x in range(2, 30):
            if x in (15, 16) and not abierta:
                r += 'f'
            elif abierta:
                r += 'n' if (x * 3 + y * 5) % 7 else 'd'      # patio nevado con huellas de luz
            else:
                r += 'w' if (x, y) in flakes else ('G' if y < 5 else 'g')
        rows.append(r + 'Fo')
    rows += ['o' + 'F' * 30 + 'o', 'o' + 'S' * 30 + 'o', 'oSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSo'.replace('S', 'f'),
             'o' * W, '.' * W]
    return grid(rows[:H], pal)


# hojas de la ventana abiertas hacia adentro (sobre el piso) + nieve que entró
HOJAS = grid([
    '.oooooooooo..............oooooooooo.',
    'oFggggggggFo............oFggggggggFo',
    'oFgwggggggFo............oFggggwgggFo',
    'oFggggggggFo............oFggggggggFo',
    '.oooooooooo..............oooooooooo.',
], {'o': '#1f161a', 'F': '#8a5a34', 'g': '#9fbfd4', 'w': '#eefaff'})
NIEVE_PISO = grid([
    '.......n......n.........n..',
    '..n.......nnnnnnn....n.....',
    '......nnnnnnnnnnnnnnn......',
    '...nnnnnnnnwwwwnnnnnnnnn...',
    '.nnnnnnwwwwwwwwwwwwnnnnnnn.',
], {'n': '#eefaff', 'w': '#ffffff'})

# Pileta enlozada con canilla y mueble bajo mesada (32x24).
PILETA = grid([
    '.............gg.................',
    '............gGGg................',
    '.............gg.................',
    '.............gg.................',
    '............gGGg................',
    'oooooooooooooooooooooooooooooooo',
    'oWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWo',
    'oWeeeeeeeeeeeeeWWddddddddddddddo',
    'oWeEEEEEEEEEEEeWWdDDDDDDDDDDDDdo',
    'oWeEEEEEEEEEEEeWWdDDDDDDDDDDDDdo',
    'oWeeeeeeeeeeeeeWWddddddddddddddo',
    'oWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWo',
    'oooooooooooooooooooooooooooooooo',
    'obbbbbbbbbbbbbbobbbbbbbbbbbbbbbo',
    'obBBBBBBBBBBBBbobBBBBBBBBBBBBBbo',
    'obBBBBBBBBBBBBbobBBBBBBBBBBBBBbo',
    'obBBBBBBBBBkBBbobBkBBBBBBBBBBBbo',
    'obBBBBBBBBBBBBbobBBBBBBBBBBBBBbo',
    'obBBBBBBBBBBBBbobBBBBBBBBBBBBBbo',
    'obBBBBBBBBBBBBbobBBBBBBBBBBBBBbo',
    'obbbbbbbbbbbbbbobbbbbbbbbbbbbbbo',
    'oooooooooooooooooooooooooooooooo',
    '.oo..........................oo.',
    '.oo..........................oo.',
], {'o': '#2a1d1f', 'g': '#5a6270', 'G': '#a8b0bc', 'W': '#e8e8e2', 'e': '#9aa4b0',
    'E': '#6a7684', 'd': '#b8a888', 'D': '#d8c8a4', 'b': '#5e3a24', 'B': '#8a5a34', 'k': '#d8b070'})


def put(base, im, mx, mbase):
    """Esquina inferior izquierda en coords del mapa (como put() de src/maps/house.js)."""
    base.alpha_composite(im, (mx + OX, mbase + OY - im.height))


def patch(base, src_box_map, dst_xy_map):
    x0, y0, x1, y1 = src_box_map
    piece = base.crop((x0 + OX, y0 + OY, x1 + OX, y1 + OY))
    base.paste(piece, (dst_xy_map[0] + OX, dst_xy_map[1] + OY))


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for n, im in (('dibujo_martita', DIBUJO), ('foto_casamiento', FOTO), ('pileta', PILETA), ('camita', CAMITA)):
        im.save(os.path.join(OUT, f'hv2_{n}.png'))
    cap = Image.open(CAP).convert('RGBA').resize((480, 270), Image.NEAREST)
    v2 = cap.copy()

    # Cuarto de Martita: tapar la ventana (pared interior) con la misma pared de al lado
    patch(v2, (160, 144, 192, 176), (192, 144))
    # tapar la cuna con piso del mismo cuarto (2 baldosas más abajo)
    patch(v2, (160, 208, 192, 240), (160, 176))
    put(v2, DIBUJO, 200, 164)                                   # dibujo pegado en la pared
    cot = CAMITA
    put(v2, CAMITA, 164, 208)                                   # camita (nueva)
    # Cocina: pileta entre la alacena y la cocina, sillas en la mesa
    put(v2, PILETA, 340, 194)
    ch = frame('objects', 'chair')
    put(v2, ch, 320, 224)                                       # silla a la izquierda
    put(v2, ch.transpose(Image.FLIP_LEFT_RIGHT), 384, 224)      # y a la derecha
    # Pared trasera (exterior) a lo largo de toda la fila de abajo, con la ventana
    # de Martita (la del objetivo) en el medio de su cuarto.
    base_cerrada = v2.copy()
    for st, im_ in (('abierta', v2), ('cerrada', base_cerrada)):
        put(im_, pared_trasera(416), 16, 256)
        # 18/11: el usuario eligió el dibujo de la ventana cerrada para los dos
        # estados ("más simple y mejor"). Abierta = misma ventana + nieve que entró.
        put(im_, ventana_trasera(False), 192, 256)
        if st == 'abierta':
            put(im_, NIEVE_PISO, 194, 240)
            px_ = im_.load()
            for (fx, fy) in ((200, 226), (214, 218), (206, 210), (220, 230), (198, 216)):
                px_[fx + OX, fy + OY] = (238, 250, 255, 255)        # copos entrando
    # Dormitorio: foto sobre la cama
    for im_ in (v2, base_cerrada):
        put(im_, FOTO, 30, 162)
    # Garaje-entrada: escoba con balde y bidón
    for im_ in (v2, base_cerrada):
        put(im_, frame('interior2', 'broom_bucket'), 410, 112)
        put(im_, frame('interior2', 'bidon'), 308, 112)
    base_cerrada.resize((1920, 1080), Image.NEAREST).save(os.path.join(OUT, 'house_v2_ventana_cerrada.png'))
    vz = Image.new('RGB', (2 * 112 * 6 + 20, 80 * 6), (17, 14, 20))
    vz.paste(v2.crop((160 + OX - 8, 200 + OY - 16, 160 + OX + 104, 256 + OY + 8)).resize((112 * 6, 80 * 6), Image.NEAREST).convert('RGB'), (0, 0))
    vz.paste(base_cerrada.crop((160 + OX - 8, 200 + OY - 16, 160 + OX + 104, 256 + OY + 8)).resize((112 * 6, 80 * 6), Image.NEAREST).convert('RGB'), (112 * 6 + 20, 0))
    vz.save(os.path.join(OUT, 'house_v2_ventana_x6.png'))

    v2.resize((1920, 1080), Image.NEAREST).save(os.path.join(OUT, 'house_v2.png'))
    cmp_ = Image.new('RGB', (960 * 2 + 20, 540), (17, 14, 20))
    cmp_.paste(cap.resize((960, 540), Image.NEAREST).convert('RGB'), (0, 0))
    cmp_.paste(v2.resize((960, 540), Image.NEAREST).convert('RGB'), (980, 0))
    cmp_.save(os.path.join(OUT, 'house_v2_compare.png'))

    font = ImageFont.truetype('/usr/share/fonts/noto/NotoSans-Regular.ttf', 22)
    items = [('dibujo de Martita', DIBUJO), ('foto de casamiento', FOTO), ('pileta', PILETA), ('camita', CAMITA)]
    K = 8
    lam = Image.new('RGB', (sum(i.width * K + 40 for _, i in items) + 20, 32 * K + 70), (27, 22, 30))
    d = ImageDraw.Draw(lam)
    x = 20
    for lbl, im in items:
        bg = Image.new('RGBA', im.size, (70, 84, 72, 255)); bg.alpha_composite(im)
        lam.paste(bg.resize((im.width * K, im.height * K), Image.NEAREST).convert('RGB'), (x, 50))
        d.text((x, 12), lbl, font=font, fill=(238, 228, 210))
        x += im.width * K + 40
    lam.save(os.path.join(OUT, 'house_v2_sprites_x8.png'))
    print('ok')
