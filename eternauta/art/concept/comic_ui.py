"""Propuesta: interfaz de historieta.

1) Globos de dialogo que salen del personaje (rotulado en mayusculas, tinta
   negra, cola hacia quien habla) y cartuchos de narracion arriba, con la
   voz del Eternauta contando la historia, como en el comic.
2) Escenas clave en vinetas: la pantalla se parte en paneles con calles
   (medianiles), primeros planos grandes y cartucho.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')
sys.path.insert(0, os.path.join(ROOT, 'tools', 'art'))
from pixel import Pix, hx  # noqa: E402
from PIL import Image  # noqa: E402

OUT = os.path.join(HERE, 'out')
INK = hx('#16131c')
PAPER = hx('#f6f1e4')
CAPTION = hx('#efe0a8')
FONT = json.load(open(os.path.join(ROOT, 'public', 'assets', 'font.json')))
GL = FONT['glyphs']


def text_w(s):
    return sum((len(GL[c][0]) if c in GL else 3) + 1 for c in s) - 1


def draw_text(p, x, y, s, col):
    for c in s:
        g = GL.get(c) or GL.get(c.upper())
        if g is None:
            x += 4
            continue
        for j, row in enumerate(g):
            for i, ch in enumerate(row):
                if ch == '#':
                    p.set(x + i, y + j, col)
        x += len(g[0]) + 1


def wrap(s, width):
    words, lines, cur = s.split(), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if text_w(t) <= width:
            cur = t
        else:
            lines.append(cur); cur = w
    lines.append(cur)
    return lines


def rounded(p, x, y, w, h, fill, border, r=3):
    for j in range(h):
        for i in range(w):
            cx = min(i, w - 1 - i); cy = min(j, h - 1 - j)
            if cx < r and cy < r and (r - cx - 0.5) ** 2 + (r - cy - 0.5) ** 2 > r * r:
                continue
            edge = cx == 0 or cy == 0 or (cx < r and cy < r and (r - cx - 0.5) ** 2 + (r - cy - 0.5) ** 2 > (r - 1.3) ** 2)
            p.set(x + i, y + j, border if edge else fill)


def balloon(p, text, x, y, tail_to, width=150):
    lines = wrap(text, width)
    w = max(text_w(l) for l in lines) + 12
    h = len(lines) * 9 + 9
    tx, ty = tail_to
    # cola
    bx = max(x + 8, min(tx, x + w - 10))
    for k in range(ty - (y + h) + 1):
        yy = y + h - 1 + k
        t = k / max(1, ty - (y + h))
        xa = round(bx + (tx - bx) * t)
        half = max(0, round(3 * (1 - t)))
        p.hline(xa - half - 1, xa + half + 1, yy, INK)
        if half:
            p.hline(xa - half, xa + half, yy, PAPER)
    rounded(p, x, y, w, h, PAPER, INK, r=5)
    p.hline(bx - 2, bx + 2, y + h - 1, PAPER)
    for i, l in enumerate(lines):
        draw_text(p, x + (w - text_w(l)) // 2, y + 5 + i * 9, l, INK)


def caption(p, text, x, y, width=200):
    lines = wrap(text, width)
    w = max(text_w(l) for l in lines) + 10
    h = len(lines) * 9 + 7
    p.rect(x + 2, y + 2, w, h, hx('#00000055'[:7]))
    p.rect(x, y, w, h, CAPTION)
    p.frame(x, y, w, h, INK)
    for i, l in enumerate(lines):
        draw_text(p, x + 5, y + 4 + i * 9, l, INK)


def base_attic():
    img = Image.open(os.path.join(ROOT, 'art', 'direccion', 'img', 'g_attic.png')).convert('RGBA')
    img = img.resize((480, 270), Image.NEAREST)
    p = Pix(480, 270); p.img = img; p.px = img.load()
    return p


def mock_balloons():
    p = base_attic()
    caption(p, 'SEPARADOS DEL MUNDO, COMO SI EL CHALECITO FUERA UNA ISLA...', 92, 30, 210)
    balloon(p, '¡TE DIJE QUE CANTAMOS FALTA ENVIDO!', 150, 62, (205, 100), 120)
    p.img.resize((960, 540), Image.NEAREST).save(os.path.join(OUT, 'ui_balloons_x2.png'))


def mock_panels():
    p = Pix(480, 270)
    p.img = Image.new('RGBA', (480, 270), PAPER + (255,)); p.px = p.img.load()
    attic = base_attic()
    def port(n):                                             # nuestro modelo (concepto), no el del dialogo
        im = Image.open(os.path.join(OUT, f'{n}_portrait.png')).convert('RGBA')
        return im.resize((96, 96), Image.NEAREST)

    def panel(x, y, w, h, fill=None):
        if fill is not None:
            p.img.alpha_composite(fill, (x, y))
        p.frame(x, y, w, h, INK); p.frame(x + 1, y + 1, w - 2, h - 2, INK)

    # panel 1: plano general del altillo
    crop = attic.img.crop((86, 40, 86 + 228, 40 + 120))
    panel(10, 10, 228, 120, crop)
    caption(p, 'UN RUIDO VIOLENTO, QUE VINO DE LA CALLE, ME INTERRUMPIO.', 16, 16, 150)
    # panel 2: primer plano de Favalli
    fav = port('favalli')
    bg = Image.new('RGBA', (110, 120), (42, 34, 54, 255)); bg.alpha_composite(fav, (7, 24))
    panel(246, 10, 110, 120, bg)
    balloon(p, '¡TU TE SIENTAS, JUAN!', 252, 16, (300, 46), 90)
    # panel 3: la ventana, la nieve que brilla
    win = Image.new('RGBA', (106, 120), (11, 12, 29, 255))
    wp = Pix(106, 120); wp.img = win; wp.px = win.load()
    import random
    rnd = random.Random(3)
    for _ in range(140):
        wp.set(rnd.randrange(106), rnd.randrange(120), hx('#eefaff') if rnd.random() < .5 else hx('#9fbfd4'))
    wp.rect(0, 92, 106, 28, hx('#a6c4d8'))
    panel(364, 10, 106, 120, wp.img)
    # tira de abajo: Juan + Lucas + texto
    juan = port('juan')
    bgj = Image.new('RGBA', (150, 120), (42, 34, 54, 255)); bgj.alpha_composite(juan, (27, 24))
    panel(10, 140, 150, 120, bgj)
    balloon(p, 'ME PARECIO OIR UN GRITO.', 20, 146, (70, 176), 110)
    luc = port('lucas')
    bgl = Image.new('RGBA', (150, 120), (42, 34, 54, 255)); bgl.alpha_composite(luc, (27, 24))
    panel(168, 140, 150, 120, bgl)
    balloon(p, '¿QUE FUE? ¿UN CHOQUE?', 178, 146, (226, 176), 110)
    narr = Image.new('RGBA', (144, 120), CAPTION + (255,))
    panel(326, 140, 144, 120, narr)
    np_ = Pix(144, 120); np_.img = Image.new('RGBA', (144, 120), (0, 0, 0, 0)); np_.px = np_.img.load()
    for i, l in enumerate(wrap('NADIE IMAGINABA LO QUE ESTABA CAYENDO DEL CIELO ESA NOCHE.', 124)):
        draw_text(np_, 10, 34 + i * 10, l, INK)
    p.img.alpha_composite(np_.img, (326, 140))
    p.img.resize((960, 540), Image.NEAREST).save(os.path.join(OUT, 'ui_panels_x2.png'))


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    mock_balloons()
    mock_panels()
    print('ok')
