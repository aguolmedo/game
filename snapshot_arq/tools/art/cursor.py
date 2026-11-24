"""Cursor de mouse pixel-art (flecha + manito) para el Eternauta.

Mismo lenguaje visual que el resto de la UI: pocas tintas, contorno oscuro
violaceo de 1 px y brillo calido arriba a la izquierda. La manito es original
(no se copia ningun cursor de otro juego ni pack).
"""
from pixel import Pix, hx, OUTLINE_MIX

# ---- paleta de guante de cuero calido
OUT = OUTLINE_MIX
DEEP = hx('#5c1c0c')
DARK = hx('#8f3412')
BASE = hx('#c8611c')
LIGHT = hx('#ea9130')
HILITE = hx('#ffd27a')

# version apagada para "no llegas"
FAR_DEEP = hx('#4a423e')
FAR_DARK = hx('#6e645e')
FAR_BASE = hx('#94887e')
FAR_LIGHT = hx('#b8aca0')
FAR_HILITE = hx('#ded2c4')

W, H = 22, 26
TIP = (3, 2)          # hotspot de la manito
PRESS_TIP = (3, 3)
ARROW_TIP = (2, 2)


def _blank():
    return Pix(W, H)


def _hand_shape(fill, ox=0, oy=0, press=False):
    """Silueta de la manito apuntando arriba a la izquierda."""
    p = _blank()
    y0 = oy + (1 if press else 0)
    # dedo indice largo en diagonal (3 px de ancho, punta redondeada)
    for i in range(9):
        p.rect(ox + 3 + i, y0 + 2 + i, 3, 3, fill)
    p.set(ox + 5, y0 + 2, (0, 0, 0), 0)
    # palma y base de los dedos plegados
    p.ellipse(ox + 12.5, oy + 14.5, 6.5, 6.0, fill)
    # pulgar
    p.ellipse(ox + 7.5, oy + 12.5, 3.0, 2.6, fill)
    # muescas entre los dedos plegados (desde el borde inferior)
    for nx in (12, 15, 17):
        for ny in range(oy + 18, oy + 23):
            p.set(ox + nx, ny, (0, 0, 0), 0)
    return p


def hand(palette=None, press=False):
    deep, dark, base, light, hilite = palette or (DEEP, DARK, BASE, LIGHT, HILITE)
    p = _blank()
    # sombra abajo-derecha y brillo arriba-izquierda (1 px de borde)
    p.paste(_hand_shape(deep, 1, 1, press), 0, 0)
    p.paste(_hand_shape(light, -1, -1, press), 0, 0)
    p.paste(_hand_shape(base, 0, 0, press), 0, 0)

    # surcos de los dedos plegados
    for x in (14, 16):
        for y in range(13, 18):
            if p.get(x, y)[3]:
                p.set(x, y, dark)
    # nudillos con un pixel de brillo
    for x, y in ((11, 13), (13, 14), (15, 15)):
        if p.get(x, y)[3]:
            p.set(x, y, light)
    # brillo del dedo indice por el lado izquierdo
    for i in range(7):
        if p.get(3 + i, 3 + i)[3]:
            p.set(3 + i, 3 + i, light)
    tip = (TIP[0], TIP[1] + (1 if press else 0))
    if p.get(*tip)[3]:
        p.set(*tip, hilite)

    p.outline(strength=0.78, dark=0.22)
    return p


ARROW = [
    '#......',
    '##.....',
    '###....',
    '####...',
    '#####..',
    '######.',
    '#######',
    '##..###',
    '#...###',
    '....###',
    '....##.',
]


def arrow(palette=None):
    deep, dark, base, light, hilite = palette or (DEEP, DARK, BASE, LIGHT, HILITE)
    ox, oy = ARROW_TIP

    def draw(fill, dx, dy):
        p = Pix(W, H)
        for y, row in enumerate(ARROW):
            for x, ch in enumerate(row):
                if ch == '#':
                    p.set(ox + dx + x, oy + dy + y, fill)
        return p

    p = _blank()
    p.paste(draw(deep, 1, 1), 0, 0)
    p.paste(draw(light, -1, -1), 0, 0)
    p.paste(draw(base, 0, 0), 0, 0)
    # filo luminoso del lado izquierdo del triangulo
    for y in range(oy + 1, oy + 9):
        xx = 1
        while xx < W and not p.get(xx, y)[3]:
            xx += 1
        if xx < W:
            p.set(xx, y, light)
    if p.get(ox, oy)[3]:
        p.set(ox, oy, hilite)
    p.outline(strength=0.78, dark=0.22)
    return p


def far_palette():
    return (FAR_DEEP, FAR_DARK, FAR_BASE, FAR_LIGHT, FAR_HILITE)


def build():
    pixes = [
        ('arrow', arrow()),
        ('hand', hand()),
        ('hand_press', hand(press=True)),
        ('hand_far', hand(far_palette())),
    ]
    atlas_w = 1 + sum(p.w + 1 for _, p in pixes)
    atlas_h = H + 2
    atlas = Pix(atlas_w, atlas_h)
    frames = {}
    x = 1
    for name, p in pixes:
        atlas.paste(p, x, 1)
        frames[name] = [x, 1, p.w, p.h]
        x += p.w + 1
    hotspots = {
        'arrow': list(ARROW_TIP),
        'hand': list(TIP),
        'hand_press': list(PRESS_TIP),
        'hand_far': list(TIP),
    }
    return atlas, frames, hotspots


def preview(path, scale=8):
    from PIL import Image
    atlas, frames, _ = build()
    crops = []
    for name in ('arrow', 'hand', 'hand_press', 'hand_far'):
        x, y, w, h = frames[name]
        crops.append(atlas.img.crop((x, y, x + w, y + h)))
    cw = max(c.width for c in crops) + 2
    ch = max(c.height for c in crops) + 2
    strip = Image.new('RGBA', (cw * len(crops), ch), (0, 0, 0, 0))
    for i, c in enumerate(crops):
        strip.alpha_composite(c, (i * cw, 0))
    pad = 6
    out = Image.new('RGBA', (strip.width + pad * 2, strip.height * 2 + pad * 3),
                    (24, 22, 38, 255))
    band = Image.new('RGBA', (out.width, strip.height + pad), (128, 92, 58, 255))
    out.alpha_composite(band, (0, strip.height + pad * 2))
    out.alpha_composite(strip, (pad, pad))
    out.alpha_composite(strip, (pad, strip.height + pad * 2 + pad // 2))
    out.resize((out.width * scale, out.height * scale), 0).save(path)


if __name__ == '__main__':
    import sys
    out = sys.argv[1] if len(sys.argv) > 1 else '/tmp/cursor_preview.png'
    preview(out)
    print(out)
