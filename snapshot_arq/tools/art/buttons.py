"""Glyphs de botones de joystick y teclas para la UI (atlas 1x).

Referencias de estilo: ref/buttons_ref1.png y ref/buttons_ref2.png.
Botones redondos gordos con aro oscuro, circulo interno y letra blanca;
bumpers/pills gris claro; dpad/stick oscuros; teclas color crema con letra
oscura. Todo con contorno oscuro de 1 px y brillo arriba a la izquierda.
"""
from pixel import Pix, hx

# ---- paleta
INK = hx('#1a1722')
WHITE = hx('#f6f4ee')
GREY_HI = hx('#f0f0f2'); GREY = hx('#c8c9d2'); GREY_MID = hx('#9a9ca8')
GREY_D = hx('#63656f'); GREY_DD = hx('#3e404a')
CREAM = hx('#e8e0c8'); CREAM_HI = hx('#fbf4dc'); CREAM_D = hx('#b8ac90')
CREAM_DD = hx('#7a6e58'); TEXT_DARK = hx('#3a2e24')

FACE = {
    'a': (hx('#62c04a'), hx('#2e7a2c'), hx('#9ee07a')),
    'b': (hx('#d23a3a'), hx('#8c1e22'), hx('#f06a5e')),
    'x': (hx('#3a72d8'), hx('#1e3f8a'), hx('#7aa8f4')),
    'y': (hx('#e8b93a'), hx('#9a6a12'), hx('#ffe08a')),
}

# fuente minima 3x5 para letras, numeros y textos de botones
FONT3 = {
    'A': ('.#.', '#.#', '###', '#.#', '#.#'),
    'B': ('##.', '#.#', '##.', '#.#', '##.'),
    'C': ('.##', '#..', '#..', '#..', '.##'),
    'D': ('##.', '#.#', '#.#', '#.#', '##.'),
    'E': ('###', '#..', '##.', '#..', '###'),
    'F': ('###', '#..', '##.', '#..', '#..'),
    'G': ('.##', '#..', '#.#', '#.#', '.##'),
    'H': ('#.#', '#.#', '###', '#.#', '#.#'),
    'I': ('###', '.#.', '.#.', '.#.', '###'),
    'J': ('..#', '..#', '..#', '#.#', '.#.'),
    'K': ('#.#', '#.#', '##.', '#.#', '#.#'),
    'L': ('#..', '#..', '#..', '#..', '###'),
    'M': ('#.#', '###', '###', '#.#', '#.#'),
    'N': ('#.#', '##.', '#.#', '#.#', '#.#'),
    'O': ('###', '#.#', '#.#', '#.#', '###'),
    'P': ('##.', '#.#', '##.', '#..', '#..'),
    'Q': ('###', '#.#', '#.#', '###', '..#'),
    'R': ('##.', '#.#', '##.', '#.#', '#.#'),
    'S': ('.##', '#..', '.#.', '..#', '##.'),
    'T': ('###', '.#.', '.#.', '.#.', '.#.'),
    'U': ('#.#', '#.#', '#.#', '#.#', '###'),
    'V': ('#.#', '#.#', '#.#', '#.#', '.#.'),
    'W': ('#.#', '#.#', '###', '###', '#.#'),
    'X': ('#.#', '#.#', '.#.', '#.#', '#.#'),
    'Y': ('#.#', '#.#', '.#.', '.#.', '.#.'),
    'Z': ('###', '..#', '.#.', '#..', '###'),
    '0': ('###', '#.#', '#.#', '#.#', '###'),
    '1': ('.#.', '##.', '.#.', '.#.', '###'),
    '2': ('##.', '..#', '.#.', '#..', '###'),
    '3': ('##.', '..#', '.#.', '..#', '##.'),
    '4': ('#.#', '#.#', '###', '..#', '..#'),
    '5': ('###', '#..', '##.', '..#', '##.'),
    '6': ('.##', '#..', '###', '#.#', '###'),
    '7': ('###', '..#', '.#.', '.#.', '.#.'),
    '8': ('###', '#.#', '###', '#.#', '###'),
    '9': ('###', '#.#', '###', '..#', '##.'),
    ' ': ('...', '...', '...', '...', '...'),
}


def _text_width(text, scale=1, spacing=1):
    return sum(len(FONT3.get(ch, FONT3[' '])[0]) + spacing for ch in text) * scale - spacing * scale


def _draw_text(p, text, x, y, color, scale=1, spacing=1, outline=None):
    cx = x
    for ch in text:
        rows = FONT3.get(ch, FONT3[' '])
        w = len(rows[0])
        points = []
        for j, row in enumerate(rows):
            for i, v in enumerate(row):
                if v != '#':
                    continue
                for sy in range(scale):
                    for sx in range(scale):
                        points.append((cx + i * scale + sx, y + j * scale + sy))
        if outline:
            s = set(points)
            for px, py in points:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    if (px + dx, py + dy) not in s:
                        p.set(px + dx, py + dy, outline)
        for px, py in points:
            p.set(px, py, color)
        cx += (w + spacing) * scale


def rrect(p, x, y, w, h, r, c):
    """Rectangulo redondeado pixel a pixel."""
    for yy in range(h):
        for xx in range(w):
            dx = min(xx, w - 1 - xx)
            dy = min(yy, h - 1 - yy)
            if dx < r and dy < r:
                if (r - dx - 0.5) ** 2 + (r - dy - 0.5) ** 2 > r * r:
                    continue
            p.set(x + xx, y + yy, c)


def face_button(size, letter, colors):
    base, dark, hi = colors
    p = Pix(size, size)
    c = size / 2
    r = size / 2 - 0.2
    p.circle(c, c, r, INK)
    p.circle(c, c, r - 0.9, dark)
    p.circle(c, c, r - 1.9, base)
    p.circle(c, c, r - 2.9, hi)
    # brillo del aro arriba-izquierda
    for a in range(-int(r) - 1, int(r) + 2):
        for b in range(-int(r) - 1, int(r) + 2):
            rr = (a * a + b * b) ** 0.5
            if r - 1.0 < rr <= r - 0.2 and a + b < 0:
                p.set(int(c + a), int(c + b), hi)
    # letra blanca con contorno oscuro
    scale = 2 if size >= 18 else 1
    tw = _text_width(letter, scale, 1)
    th = 5 * scale
    _draw_text(p, letter, (size - tw) // 2, (size - th) // 2, WHITE,
               scale=scale, spacing=1, outline=dark)
    return p


def bumper(w, h, label, scale=1):
    p = Pix(w, h)
    r = min(3, h // 2 - 1)
    rrect(p, 0, 0, w, h, r, INK)
    rrect(p, 1, 1, w - 2, h - 2, max(1, r - 1), GREY_D)
    rrect(p, 2, 2, w - 4, h - 4, max(1, r - 2), GREY)
    p.hline(3, w - 4, 2, GREY_HI)
    p.hline(3, w - 4, h - 3, GREY_MID)
    tw = _text_width(label, scale, 1)
    th = 5 * scale
    _draw_text(p, label, (w - tw) // 2, (h - th) // 2, GREY_DD,
               scale=scale, spacing=1)
    return p


def trigger(w, h, label, scale=1):
    p = Pix(w, h)
    rrect(p, 0, 0, w, h, min(4, w // 3), INK)
    rrect(p, 1, 1, w - 2, h - 2, min(3, w // 3 - 1), GREY_D)
    rrect(p, 2, 2, w - 4, h - 4, min(2, w // 3 - 2), GREY)
    p.hline(3, w - 4, 2, GREY_HI)
    p.hline(3, w - 4, h - 3, GREY_MID)
    # muesca de gatillo en el borde inferior externo
    p.set(w - 2, h - 4, GREY_D)
    p.set(w - 1, h - 5, INK)
    tw = _text_width(label, scale, 1)
    th = 5 * scale
    _draw_text(p, label, (w - tw) // 2, (h - th) // 2, GREY_DD,
               scale=scale, spacing=1)
    return p


def pill(w, h, label, scale=1, spacing=0):
    p = Pix(w, h)
    r = min(3, h // 2 - 1)
    rrect(p, 0, 0, w, h, r, INK)
    rrect(p, 1, 1, w - 2, h - 2, max(1, r - 1), GREY_D)
    rrect(p, 2, 2, w - 4, h - 4, max(1, r - 2), GREY)
    p.hline(3, w - 4, 2, GREY_HI)
    p.hline(3, w - 4, h - 3, GREY_MID)
    tw = _text_width(label, scale, spacing)
    th = 5 * scale
    _draw_text(p, label, (w - tw) // 2, (h - th) // 2, GREY_DD,
               scale=scale, spacing=spacing)
    return p


def dpad(size):
    p = Pix(size, size)
    c = size / 2
    p.circle(c, c, size / 2 - 0.2, INK)
    p.circle(c, c, size / 2 - 1.0, GREY_DD)
    bar = max(3, size // 3)
    x0 = (size - bar) // 2
    y0 = (size - bar) // 2
    p.rect(1, y0, size - 2, bar, GREY_D)
    p.rect(x0, 1, bar, size - 2, GREY_D)
    # puntas redondeadas
    for x, y in ((1, y0), (1, y0 + bar - 1), (size - 2, y0), (size - 2, y0 + bar - 1),
                 (x0, 1), (x0 + bar - 1, 1), (x0, size - 2), (x0 + bar - 1, size - 2)):
        p.set(x, y, GREY_DD)
    # luz arriba-izquierda y sombra abajo-derecha
    p.hline(2, size - 3, y0, GREY_MID)
    p.vline(x0, 2, size - 3, GREY_MID)
    p.hline(2, size - 3, y0 + bar - 1, GREY_DD)
    p.vline(x0 + bar - 1, 2, size - 3, GREY_DD)
    p.rect(x0, y0, bar, bar, GREY_MID)
    return p


def stick(size):
    p = Pix(size, size)
    c = size / 2
    r = size / 2 - 0.2
    p.circle(c, c, r, INK)
    p.circle(c, c, r - 1.0, GREY_DD)
    p.circle(c, c, r - 2.2, GREY_D)
    dot = size / 5
    p.circle(c, c, dot, GREY_MID)
    p.circle(c, c, dot * 0.55, GREY)
    for a in range(-int(r) - 1, int(r) + 2):
        for b in range(-int(r) - 1, int(r) + 2):
            rr = (a * a + b * b) ** 0.5
            if r - 1.2 < rr <= r - 0.4 and a + b < 0:
                p.set(int(c + a), int(c + b), GREY_MID)
    return p


def arrow_pill(w, h, direction, half_h):
    p = Pix(w, h)
    r = min(3, h // 2 - 1)
    rrect(p, 0, 0, w, h, r, INK)
    rrect(p, 1, 1, w - 2, h - 2, max(1, r - 1), GREY_D)
    rrect(p, 2, 2, w - 4, h - 4, max(1, r - 2), GREY)
    p.hline(3, w - 4, 2, GREY_HI)
    cx = w // 2
    cy = h // 2
    for dy in range(-half_h, half_h + 1):
        depth = half_h - abs(dy)
        if direction == 'right':
            x0, x1 = cx - half_h, cx - half_h + depth
        else:
            x0, x1 = cx + half_h - depth, cx + half_h
        p.hline(x0, x1, cy + dy, GREY_DD)
    # brillo del borde superior del triangulo
    p.set(cx - half_h, cy - half_h + 1, GREY_D)
    return p


def keycap(w, label, scale=1, spacing=1):
    h = 11
    p = Pix(w, h)
    rrect(p, 0, 0, w, h, 2, INK)
    rrect(p, 1, 1, w - 2, h - 2, 1, CREAM_DD)
    rrect(p, 2, 2, w - 4, h - 4, 1, CREAM)
    p.hline(3, w - 4, 2, CREAM_HI)
    p.hline(3, w - 4, h - 3, CREAM_D)
    tw = _text_width(label, scale, spacing)
    th = 5 * scale
    _draw_text(p, label, (w - tw) // 2, (h - th) // 2, TEXT_DARK,
               scale=scale, spacing=spacing)
    return p


def key_arrow():
    p = keycap(11, '')
    # flecha hacia arriba en el centro
    for x, y in ((5, 3), (4, 4), (5, 4), (6, 4), (5, 5), (5, 6), (5, 7)):
        p.set(x, y, TEXT_DARK)
    return p


def mouse_icon():
    """Mouse de 11x13 para los prompts cuando se juega con el puntero."""
    w, h = 11, 13
    p = Pix(w, h)
    rrect(p, 0, 0, w, h, 4, INK)
    rrect(p, 1, 1, w - 2, h - 2, 3, GREY_DD)
    rrect(p, 2, 2, w - 4, h - 4, 2, GREY)
    p.hline(3, w - 4, 2, GREY_HI)
    p.hline(3, w - 4, h - 3, GREY_MID)
    # division de botones y ruedita
    p.vline(5, 2, 6, GREY_DD)
    p.hline(2, w - 3, 6, GREY_DD)
    p.rect(5, 3, 1, 3, GREY_D)
    # boton izquierdo iluminado
    for x, y in ((3, 3), (4, 3), (3, 4), (4, 4), (3, 5), (4, 5)):
        p.set(x, y, CREAM_HI)
    return p


def build():
    pixes = []

    # ---- set chico (UI en juego)
    for k in ('a', 'b', 'x', 'y'):
        pixes.append((k, face_button(11, k.upper(), FACE[k])))
    pixes.append(('lb', bumper(15, 9, 'LB')))
    pixes.append(('rb', bumper(15, 9, 'RB')))
    pixes.append(('lt', trigger(12, 13, 'LT')))
    pixes.append(('rt', trigger(12, 13, 'RT')))
    pixes.append(('start', pill(20, 9, 'START')))
    pixes.append(('back', pill(20, 9, 'BACK')))
    pixes.append(('dpad', dpad(9)))
    pixes.append(('stick', stick(11)))
    pixes.append(('left', arrow_pill(11, 7, 'left', 2)))
    pixes.append(('right', arrow_pill(11, 7, 'right', 2)))
    pixes.append(('mouse', mouse_icon()))

    # ---- set grande (pantalla de controles)
    for k in ('a', 'b', 'x', 'y'):
        pixes.append((k + '_l', face_button(20, k.upper(), FACE[k])))
    pixes.append(('lb_l', bumper(22, 14, 'LB', 2)))
    pixes.append(('rb_l', bumper(22, 14, 'RB', 2)))
    pixes.append(('lt_l', trigger(20, 18, 'LT', 2)))
    pixes.append(('rt_l', trigger(20, 18, 'RT', 2)))
    pixes.append(('start_l', pill(34, 14, 'START', 2)))
    pixes.append(('back_l', pill(34, 14, 'BACK', 2)))
    pixes.append(('dpad_l', dpad(16)))
    pixes.append(('stick_l', stick(20)))
    pixes.append(('left_l', arrow_pill(18, 12, 'left', 4)))
    pixes.append(('right_l', arrow_pill(18, 12, 'right', 4)))

    # ---- teclas de teclado
    for name, label in (('key_e', 'E'), ('key_f', 'F'), ('key_i', 'I'),
                        ('key_q', 'Q'), ('key_r', 'R')):
        pixes.append((name, keycap(11, label)))
    pixes.append(('key_esc', keycap(17, 'ESC')))
    pixes.append(('key_space', keycap(29, 'SPACE')))
    pixes.append(('key_tab', keycap(15, 'TAB')))
    pixes.append(('key_arrow', key_arrow()))
    for n in range(1, 9):
        pixes.append((f'key_{n}', keycap(11, str(n))))

    # ---- empaquetado simple por filas
    atlas_w = 256
    x, y, row_h = 1, 1, 0
    placed = []
    for name, p in pixes:
        if x + p.w + 1 > atlas_w:
            x = 1
            y += row_h + 1
            row_h = 0
        placed.append((name, p, x, y))
        x += p.w + 1
        row_h = max(row_h, p.h)
    atlas_h = y + row_h + 1

    atlas = Pix(atlas_w, atlas_h)
    frames = {}
    for name, p, px, py in placed:
        atlas.paste(p, px, py)
        frames[name] = [px, py, p.w, p.h]
    return atlas, frames


def preview(path, scale=6):
    from PIL import Image
    atlas, _ = build()
    bg = Image.new('RGBA', atlas.img.size, (36, 40, 60, 255))
    bg.alpha_composite(atlas.img)
    bg.resize((atlas.w * scale, atlas.h * scale), 0).save(path)
