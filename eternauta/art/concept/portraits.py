"""Retratos de dialogo y vistas "muy iguales al comic".

Se toma el primer plano de la vineta (la copia escaneada del dueno) y se pasa
a pixel art: escala de grises, contraste, reduccion a 64x64 y 5 tonos de
tinta, sin tramado. Despues se colorea con una paleta: TINTA (blanco y negro
como el comic), CALIDA (sepia, piel) o NOCHE (para las vistas por la ventana).
"""
import os
import random
import sys

from PIL import Image, ImageEnhance, ImageFilter, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')
sys.path.insert(0, os.path.join(ROOT, 'tools', 'art'))
sys.path.insert(0, HERE)
from pixel import Pix, hx, mix  # noqa: E402

OUT = os.path.join(HERE, 'out')
COMIC = os.path.join(ROOT, 'ref', 'comic')

INK = [(20, 18, 28), (58, 52, 68), (122, 112, 128), (200, 190, 168), (242, 234, 214)]
WARM = [(28, 16, 26), (84, 44, 48), (168, 98, 82), (230, 170, 136), (250, 226, 196)]
NIGHT = [(9, 10, 26), (28, 38, 70), (72, 104, 144), (166, 198, 218), (240, 250, 255)]

# (pagina, recorte) del mejor primer plano de cada personaje
FACES = {
    'juan': ('p033.jpg', (805, 295, 1005, 495)),
    'favalli': ('p033.jpg', (92, 60, 262, 230)),
    'lucas': ('p033.jpg', (676, 98, 806, 228)),
    'polsky': ('p019.jpg', (95, 290, 265, 460)),
    'elena': ('p021.jpg', (790, 300, 960, 470)),
    'traje': ('p041.jpg', (170, 295, 330, 455)),
    'martita': ('p034.jpg', (470, 562, 640, 732)),
}


def tones(im, size, blur=1.2, contrast=1.25, cutoff=2):
    g = ImageOps.grayscale(im)
    g = ImageOps.autocontrast(g, cutoff=cutoff)
    g = g.filter(ImageFilter.GaussianBlur(blur)).resize(size, Image.LANCZOS)
    g = ImageEnhance.Contrast(g).enhance(contrast)
    th = [48, 96, 150, 205]
    return g.point(lambda v: sum(v > t for t in th))


def colorize(q, pal):
    out = Image.new('RGB', q.size)
    src, dst = q.load(), out.load()
    for y in range(q.size[1]):
        for x in range(q.size[0]):
            dst[x, y] = pal[src[x, y]]
    return out


def portrait(name, pal=WARM, size=56, clean=False):
    """Retrato de dialogo: el primer plano del comic a 56 px (se nota el pixel
    art del juego sin perder los rasgos), 5 tonos."""
    page, box = FACES[name]
    q = tones(Image.open(os.path.join(COMIC, page)).crop(box), (size, size), blur=1.3)
    if clean:
        q = q.filter(ImageFilter.ModeFilter(3))
    return colorize(q, pal)


def window_view():
    """La esquina del choque (pag. 019) vista por la ventana del altillo."""
    src = Image.open(os.path.join(COMIC, 'p019.jpg')).convert('RGB')
    panel = src.crop((456, 520, 856, 745)).copy()
    # tapar el globo de texto con cielo de noche (tinta)
    from PIL import ImageDraw
    d = ImageDraw.Draw(panel)
    d.rectangle((110, 0, 400, 66), fill=(0, 0, 0))
    d.rectangle((0, 0, 400, 3), fill=(0, 0, 0))
    q = tones(panel, (230, 128), blur=1.5, contrast=1.1, cutoff=1)
    img = colorize(q, NIGHT).convert('RGBA')
    p = Pix(230, 128); p.img = img; p.px = img.load()
    rnd = random.Random(19)
    for _ in range(170):                                             # nevada que brilla
        x, y = rnd.randrange(230), rnd.randrange(128)
        p.set(x, y, hx('#f4fcff') if rnd.random() < 0.6 else hx('#bdeffa'))
    for y in range(128):                                              # halo calido del farol
        for x in range(230):
            dd = ((x - 30) ** 2 + ((y - 14) * 1.3) ** 2) ** 0.5 / 34
            if dd < 1:
                c = p.get(x, y); p.set(x, y, mix(c[:3], hx('#ffd890'), 0.30 * (1 - dd) ** 2))
    big = p.img.resize((460, 256), Image.NEAREST)
    import window_view as wv
    frame = Pix(480, 270)
    frame.img = Image.new('RGBA', (480, 270), (0, 0, 0, 255))
    frame.img.alpha_composite(big, (10, 7))
    frame.px = frame.img.load()
    wv.window_frame(frame, b=12, m=6)
    return frame


def dialog_mock():
    """El dialogo con el retrato grande, sobre el altillo."""
    base = Image.open(os.path.join(ROOT, 'art', 'direccion', 'img', 'g_attic.png')).convert('RGBA')
    base = base.resize((480, 270), Image.NEAREST)
    p = Pix(480, 270); p.img = base; p.px = base.load()
    for y in range(270):                                              # oscurecer un poco la escena
        for x in range(480):
            c = p.get(x, y); p.set(x, y, mix(c[:3], (10, 10, 24), 0.35))
    box = (96, 186, 372, 76)
    x, y, w, h = box
    wood = [hx('#3a2418'), hx('#6e4628'), hx('#93603a'), hx('#f2e6c8')]
    p.rect(x, y, w, h, wood[1]); p.frame(x, y, w, h, wood[0]); p.frame(x + 2, y + 2, w - 4, h - 4, wood[2])
    p.rect(x + 76, y + 6, w - 82, h - 12, wood[3])
    por = portrait_hue('favalli').convert('RGBA')
    p.rect(x + 6, y + 6, 66, 66, wood[0])
    p.rect(x + 7, y + 7, 64, 64, (42, 34, 54))
    p.img.alpha_composite(por, (x + 11, y + 11))
    from comic_ui import draw_text, wrap
    p.rect(x + 8, y - 10, 52, 12, wood[1]); p.frame(x + 8, y - 10, 52, 12, wood[0])
    draw_text(p, x + 14, y - 7, 'FAVALLI', wood[3])
    for i, l in enumerate(wrap('NO HARA FALTA OXIGENO. BASTARA CON UN FILTRO QUE DEJE FUERA LAS PARTICULAS.', 270)):
        draw_text(p, x + 84, y + 14 + i * 11, l, hx('#2a1e18'))
    return p


def build():
    os.makedirs(OUT, exist_ok=True)
    names = list(FACES)
    S = 5
    sheet = Image.new('RGB', (len(names) * (56 * S + 10) + 10, 2 * (56 * S + 10) + 10), (18, 22, 44))
    for i, n in enumerate(names):
        for j, im in enumerate((portrait(n, INK), portrait_hue(n))):
            im.save(os.path.join(OUT, f'dlg_{n}_{"ink" if j == 0 else "color"}.png'))
            sheet.paste(im.resize((56 * S, 56 * S), Image.NEAREST), (10 + i * (56 * S + 10), 10 + j * (56 * S + 10)))
    sheet.save(os.path.join(OUT, 'dialog_portraits_x4.png'))
    v = window_view()
    v.img.save(os.path.join(OUT, 'view_attic_comic.png'))
    v.img.resize((960, 540), Image.NEAREST).save(os.path.join(OUT, 'view_attic_comic_x2.png'))
    m = dialog_mock()
    m.img.resize((960, 540), Image.NEAREST).save(os.path.join(OUT, 'dialog_mock_x2.png'))



# ---------------------------------------------------------------- color por zonas
RAMPS = {
    'skin': [(42, 22, 32), (110, 58, 52), (184, 112, 90), (226, 168, 136), (246, 208, 176)],
    'hair_brown': [(30, 20, 20), (58, 38, 32), (94, 64, 48), (138, 100, 72), (176, 136, 104)],
    'hair_dark': [(20, 16, 24), (36, 28, 36), (58, 46, 54), (90, 74, 80), (138, 122, 122)],
    'hair_white': [(42, 42, 54), (106, 106, 122), (168, 168, 180), (216, 216, 222), (244, 244, 246)],
    'cloth_cream': [(42, 36, 48), (94, 86, 72), (154, 144, 122), (207, 198, 174), (236, 230, 212)],
    'cloth_dark': [(20, 20, 32), (38, 37, 47), (58, 57, 70), (86, 85, 106), (138, 138, 160)],
    'hair_blonde': [(42, 30, 24), (110, 78, 44), (176, 132, 72), (216, 176, 112), (242, 214, 152)],
    'glass': [(14, 20, 32), (28, 42, 60), (52, 78, 100), (110, 146, 172), (190, 220, 232)],
}
PANEL = (42, 34, 54)

# zonas en coordenadas de 56 px: cara (elipse), pelo arriba, ropa abajo
ZONES = {
    'juan': dict(face=(30, 28, 15, 19), hair='hair_brown', hair_y=13, cloth='cloth_cream', cloth_y=47),
    'favalli': dict(face=(28, 31, 18, 20), hair='hair_dark', hair_y=10, cloth='cloth_cream', cloth_y=50),
    'polsky': dict(face=(31, 34, 19, 22), hair='hair_white', hair_y=22, cloth='cloth_dark', cloth_y=54),
    'lucas': dict(face=(28, 26, 13, 17), hair='skin', hair_y=10, cloth='cloth_cream', cloth_y=42),
    'elena': dict(face=(31, 32, 20, 20), hair='hair_blonde', hair_y=12, cloth='cloth_dark', cloth_y=52),
    'martita': dict(face=(28, 31, 14, 15), hair='hair_blonde', hair_y=16, cloth='cloth_cream', cloth_y=52),
    'traje': dict(face=(25, 25, 9, 8), hair='cloth_cream', hair_y=56, cloth='cloth_cream', cloth_y=0,
                  inner='glass'),
}


def portrait_color(name, size=56):
    from collections import deque
    page, box = FACES[name]
    q = tones(Image.open(os.path.join(COMIC, page)).crop(box), (size, size), blur=1.3)
    z = ZONES[name]
    fx, fy, rx, ry = z['face']
    src = q.load()
    out = Image.new('RGB', (size, size)); dst = out.load()
    for y in range(size):
        for x in range(size):
            t = src[x, y]
            inside = ((x - fx) / rx) ** 2 + ((y - fy) / ry) ** 2 <= 1
            if name == 'traje':
                ramp = 'skin' if inside else 'cloth_cream'
                if inside and t <= 1:
                    ramp = 'glass'
            elif inside:
                ramp = 'skin'
            elif y >= z['cloth_y']:
                ramp = z['cloth']
            elif y < z['hair_y'] or abs(x - fx) > rx * 0.8:
                ramp = z['hair']
            else:
                ramp = 'skin'
            dst[x, y] = RAMPS[ramp][t]
    # fondo de papel conectado al borde -> color del panel
    seen = set()
    dq = deque([(x, y) for x in range(size) for y in (0, size - 1)] + [(x, y) for y in range(size) for x in (0, size - 1)])
    while dq:
        x, y = dq.popleft()
        if (x, y) in seen or not (0 <= x < size and 0 <= y < size):
            continue
        if src[x, y] < 4 or ((x - fx) / rx) ** 2 + ((y - fy) / ry) ** 2 <= 1.15:
            continue
        seen.add((x, y)); dst[x, y] = PANEL
        dq.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return out


# rampa con cambio de tono: sombras frias (azul-violeta), luces calidas (piel)
HUE = [(24, 22, 44), (70, 58, 92), (156, 104, 108), (228, 164, 132), (248, 222, 196)]


def portrait_hue(name, size=56, pal=HUE):
    from collections import deque
    page, box = FACES[name]
    q = tones(Image.open(os.path.join(COMIC, page)).crop(box), (size, size), blur=1.3)
    out = colorize(q, pal)
    src, dst = q.load(), out.load()
    z = ZONES[name]
    fx0, fy0, rx0, ry0 = z['face']
    if name != 'traje':                                        # pelo con su color
        for y in range(size):
            for x in range(size):
                inside = ((x - fx0) / rx0) ** 2 + ((y - fy0) / (ry0 * 0.9)) ** 2 <= 1
                top = y < z['hair_y'] and not inside and name != 'lucas'
                side = y < fy0 + 4 and not inside and rx0 * 0.85 < abs(x - fx0) < rx0 * 1.5
                if (top or side) and src[x, y] >= 1:
                    dst[x, y] = RAMPS[z['hair']][src[x, y]]
    cut = z['cloth_y'] if name != 'traje' else size
    fx, fy, rx, ry = z['face']
    seen = set()
    dq = deque([(x, 0) for x in range(size)] + [(0, y) for y in range(size)] + [(size - 1, y) for y in range(size)])
    while dq:
        x, y = dq.popleft()
        if (x, y) in seen or not (0 <= x < size and 0 <= y < cut):
            continue
        if src[x, y] < 4 or ((x - fx) / rx) ** 2 + ((y - fy) / ry) ** 2 <= 1.0:
            continue
        seen.add((x, y)); dst[x, y] = PANEL
        dq.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return out


if __name__ == '__main__':
    build()
    print('ok')
