"""Menús de madera (diseño, no toca el juego). Pedido del usuario 19/11:
"rehacé esos menús (Inventario / Fabricar / Opciones) con el material del cartel del título,
y el de fin de partida cuando te matan, que quedó medio croto. Buen gusto."

Reglas:
  - Mismo material que el cartel del título (src/titleUi.js woodSign): marco de tres tonos con
    contorno #1a1426, tablas horizontales con juntas, labio de luz arriba, clavos en las esquinas.
  - Adentro nada de papel rayado: lo que hay que leer va TALLADO en la madera (huecos con sombra
    arriba-izquierda y labio de luz abajo-derecha). Letra crema con sombra, como en el título.
  - Pestañas = tablitas clavadas arriba del cartel; la elegida es más clara y queda pegada al cartel.
  - La elección es la misma barra cálida del título (con el copito) o un marco ámbar en los casilleros.
  - Adentro de la casa, sin nieve. El fin de partida es afuera: cartel con nieve sobre dos postes.
Salida: out/menus_madera_{inventario,fabricar,opciones,fin}.png (1920x1080) y out/menus_madera.png (lámina)
"""
import json
import os

from PIL import Image, ImageDraw, ImageEnhance, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(HERE, 'out')
CAPS = os.path.join(ROOT, 'art', 'direccion', 'doc', 'capturas')
SPR = os.path.join(ROOT, 'art', 'sprites')
W, H = 480, 270

FONT = json.load(open(os.path.join(ROOT, 'public', 'assets', 'font.json')))


def hx(h, a=255):
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


OUTL = hx('1a1426')
W0, W1, W2, W3 = hx('5a3820'), hx('7a4e2c'), hx('8a5a34'), hx('a06a3c')
FACE_HI = hx('9a663a')                          # tabla elegida (más clara)
SEAM = hx('4a2a1a', 140)
GRAIN = hx('4a2a1a', 90)
NAIL, NAIL_HI = hx('2a2634'), hx('8a94a8')
CREAM, CREAM2, AM3 = hx('fff8e2'), hx('d9ad7c'), hx('ffcf6e')
SH = hx('3a1c0c')
FALTA = hx('f09a7a')
OKC = hx('b8d890')
ICE, ICE2, ICE3 = hx('eefaff'), hx('c8e2ee'), hx('9fdcee')
CARVE, CARVE_D = hx('5e3a22'), hx('3e2416')


# ------------------------------------------------------------------ primitivas
class Canvas:
    def __init__(self, bg):
        self.im = bg.copy().convert('RGBA')
        self.px = self.im.load()

    def dot(self, x, y, c):
        if 0 <= x < W and 0 <= y < H:
            if c[3] == 255:
                self.px[x, y] = c
            else:
                b = self.px[x, y]
                a = c[3] / 255
                self.px[x, y] = tuple(round(b[i] * (1 - a) + c[i] * a) for i in range(3)) + (255,)

    def rect(self, x, y, w, h, c):
        for j in range(h):
            for i in range(w):
                self.dot(x + i, y + j, c)

    def rrect(self, x, y, w, h, r, c):
        for j in range(h):
            dy = min(j, h - 1 - j)
            inset = r - dy if dy < r else 0
            self.rect(x + inset, y + j, w - inset * 2, 1, c)

    def sprite(self, path, x, y, k=1):
        im = Image.open(path).convert('RGBA')
        if k != 1:
            im = im.resize((im.width * k, im.height * k), Image.NEAREST)
        self.im.alpha_composite(im, (x, y))
        self.px = self.im.load()

    # -------- texto con la letra del juego
    def measure(self, s, k=1):
        n = 0
        for ch in s:
            g = FONT['glyphs'].get(ch) or FONT['glyphs'].get('?')
            n += (len(g[0]) + FONT['spacing']) * k if ch != ' ' else 4 * k
        return n - FONT['spacing'] * k

    def text(self, x, y, s, c, k=1, shadow=SH):
        for dx, dy, col in (((0, k, shadow),) if shadow else ()) + ((0, 0, c),):
            cx = x
            for ch in s:
                if ch == ' ':
                    cx += 4 * k
                    continue
                g = FONT['glyphs'].get(ch) or FONT['glyphs']['?']
                for gy, row in enumerate(g):
                    for gx, p in enumerate(row):
                        if p == '#':
                            self.rect(cx + gx * k + dx, y + gy * k + dy, k, k, col)
                cx += (len(g[0]) + FONT['spacing']) * k

    def ctext(self, cx, y, s, c, k=1, shadow=SH):
        self.text(cx - self.measure(s, k) // 2, y, s, c, k, shadow)


def wood(cv, x, y, w, h, seams=16, nails=True, snow=False, shadow=True, face=W2):
    """El cartel del título (woodSign), con las juntas cada `seams` px."""
    if shadow:
        cv.rrect(x + 2, y + 3, w, h, 3, (8, 8, 18, 110))
    cv.rrect(x, y, w, h, 3, OUTL)
    cv.rrect(x + 1, y + 1, w - 2, h - 2, 3, W0)
    cv.rrect(x + 2, y + 2, w - 4, h - 4, 2, W1)
    cv.rrect(x + 4, y + 4, w - 8, h - 8, 1, face)
    cv.rect(x + 5, y + 4, w - 10, 1, W3)
    cv.rect(x + 5, y + 5, w - 10, 1, (214, 160, 102, 90))
    if seams:
        for sy in range(y + 4 + seams, y + h - 6, seams):
            cv.rect(x + 6, sy, w - 12, 1, SEAM)
            cv.rect(x + 6, sy + 1, w - 12, 1, (214, 160, 102, 30))
    # vetas cortas en los márgenes
    for gx, gy, gh in ((x + 6, y + 31, 6), (x + w - 7, y + 47, 7), (x + 7, y + h - 40, 5), (x + w - 8, y + 20, 4)):
        if y + 8 < gy < y + h - 8:
            cv.rect(gx, gy, 1, gh, GRAIN)
    if nails:
        for nx, ny in ((x + 6, y + 6), (x + w - 8, y + 6), (x + 6, y + h - 8), (x + w - 8, y + h - 8)):
            cv.rect(nx, ny, 2, 2, NAIL)
            cv.dot(nx, ny, NAIL_HI)
    if snow:
        snowcap(cv, x, y, w)


def snowcap(cv, x, y, w):
    for i in range(w - 10):
        px = x + 5 + i
        bump = 1 if (i * 7 + 3) % 11 == 0 else 0
        dip = 1 if (i * 5 + 1) % 17 == 0 else 0
        cv.rect(px, y - 3 - bump + dip, 1, 3 + bump - dip, ICE)
        cv.dot(px, y, ICE2)
    for i in (9, 37, 71, 103, 151, 203, 241):
        if i < w - 12:
            cv.rect(x + 5 + i, y, 1, 2, ICE2)
            cv.dot(x + 6 + i, y, ICE3)


def carve(cv, x, y, w, h, fill=CARVE):
    """Hueco tallado en la madera: sombra arriba-izquierda, labio de luz abajo-derecha."""
    cv.rect(x, y, w, h, fill)
    cv.rect(x, y, w, 1, CARVE_D)
    cv.rect(x, y, 1, h, CARVE_D)
    cv.rect(x + 1, y + 1, w - 1, 1, (30, 16, 10, 70))
    cv.rect(x, y + h, w + 1, 1, W3)
    cv.rect(x + w, y, 1, h, W3)


def select_bar(cv, x, y, w, h):
    cv.rrect(x, y, w, h, 2, (255, 207, 110, 72))
    cv.rect(x + 2, y, w - 4, 1, (255, 224, 150, 140))
    cv.rect(x + 2, y + h - 1, w - 4, 1, (122, 60, 24, 76))


def flake(cv, x, y, c=CREAM):
    for dx, dy in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1), (-2, -2), (2, -2), (-2, 2), (2, 2)):
        cv.dot(x + dx, y + dy, c)


def amber_frame(cv, x, y, w, h):
    cv.rect(x - 1, y - 1, w + 2, 1, AM3)
    cv.rect(x - 1, y + h, w + 2, 1, AM3)
    cv.rect(x - 1, y - 1, 1, h + 2, AM3)
    cv.rect(x + w, y - 1, 1, h + 2, AM3)
    for cx, cy in ((x - 2, y - 2), (x + w + 1, y - 2), (x - 2, y + h + 1), (x + w + 1, y + h + 1)):
        cv.dot(cx, cy, AM3)


def prompts(cv, items, right, y):
    """Barra de glifos de abajo, en una tablita oscura (como 'Elegir' en el título)."""
    ws = [12 + cv.measure(lbl) for _, lbl in items]
    total = sum(ws) + 10 * (len(items) - 1) + 10
    x = right - total
    cv.rrect(x, y - 3, total, 15, 2, (20, 14, 24, 245))
    cx = x + 5
    for (glyph, lbl), w in zip(items, ws):
        cv.sprite(os.path.join(SPR, 'buttons', f'{glyph}.png'), cx, y - 1)
        cv.text(cx + 13, y + 1, lbl, CREAM, shadow=hx('0a0810'))
        cx += w + 10


def wrap(cv, s, width):
    out, line = [], ''
    for word in s.split(' '):
        t = (line + ' ' + word).strip()
        if cv.measure(t) > width and line:
            out.append(line)
            line = word
        else:
            line = t
    out.append(line)
    return out


def bg(name, k=0.3):
    im = Image.open(os.path.join(CAPS, name)).convert('RGB').resize((W, H), Image.NEAREST)
    im = ImageEnhance.Color(im).enhance(0.55)
    return ImageEnhance.Brightness(im).enhance(k).convert('RGBA')


# ------------------------------------------------------------------ mochila
BX, BY, BW, BH = 52, 40, 376, 164          # cartel de la mochila
TABS = ['Inventario', 'Fabricar', 'Opciones']


def mochila(active):
    cv = Canvas(bg('raw_attic.png'))
    # pestañas: tablitas clavadas arriba del cartel (se dibujan antes; la elegida después)
    tw, tg = 100, 8
    tx0 = BX + (BW - (3 * tw + 2 * tg)) // 2
    for i, name in enumerate(TABS):
        if i == active:
            continue
        x = tx0 + i * (tw + tg)
        wood(cv, x, BY - 16, tw, 22, seams=0, nails=False)
        cv.ctext(x + tw // 2, BY - 10, name, CREAM2)
    wood(cv, BX, BY, BW, BH, seams=20)
    x = tx0 + active * (tw + tg)
    wood(cv, x, BY - 19, tw, 25, seams=0, nails=False, shadow=False, face=FACE_HI)
    cv.rect(x + 4, BY + 2, tw - 8, 4, FACE_HI)           # se funde con el cartel
    cv.rect(x + 1, BY + 2, 3, 3, W1)
    cv.rect(x + tw - 4, BY + 2, 3, 3, W1)
    cv.ctext(x + tw // 2, BY - 12, TABS[active], CREAM)
    for nx in (x + 6, x + tw - 8):
        cv.rect(nx, BY - 13, 2, 2, NAIL)
        cv.dot(nx, BY - 13, NAIL_HI)
    return cv


def inventario():
    cv = mochila(0)
    items = ['guantes', 'pava_fria', 'lata', None, 'botas', 'casco',
             'mate_cebado', None, None, None, None, None,
             None, None, None, None, None, None]
    S, G = 22, 3
    gx, gy = BX + 18, BY + 20
    for i, it in enumerate(items):
        x = gx + (i % 6) * (S + G)
        y = gy + (i // 6) * (S + G)
        carve(cv, x, y, S, S)
        if it:
            cv.sprite(os.path.join(SPR, 'items', f'{it}.png'), x + 3, y + 3)
    amber_frame(cv, gx, gy, S, S)
    # ficha del objeto elegido: tallada a la derecha
    fx, fy, fw = gx + 6 * (S + G) + 10, gy, BX + BW - 18 - (gx + 6 * (S + G) + 10)
    carve(cv, fx, fy, 38, 38)
    cv.sprite(os.path.join(SPR, 'items', 'guantes.png'), fx + 3, fy + 3, 2)
    cv.text(fx + 46, fy + 4, 'Guantes de goma', CREAM)
    cv.text(fx + 46, fy + 16, 'Para el traje', AM3)
    for j, line in enumerate(wrap(cv, 'Guantes de goma gruesos, de los de trabajo.', fw)):
        cv.text(fx, fy + 48 + j * 11, line, CREAM2)
    # junta y lo que falta, quemado en la madera
    ly = BY + BH - 36
    cv.rect(BX + 16, ly, BW - 32, 1, SEAM)
    cv.rect(BX + 16, ly + 1, BW - 32, 1, (214, 160, 102, 60))
    cv.text(BX + 18, ly + 9, 'Para el traje faltan:', CREAM2)
    cv.text(BX + 18 + cv.measure('Para el traje faltan: '), ly + 9, 'Tela engomada, Tiras de goma', FALTA)
    prompts(cv, [('key_q', 'Pestaña'), ('mouse', 'Elegir'), ('mouse_r', 'Mirar'), ('key_esc', 'Cerrar')], BX + BW, BY + BH + 12)
    return cv


def fabricar():
    cv = mochila(1)
    # receta: fila tallada, elegida con la barra cálida del título
    rx, ry, rw = BX + 16, BY + 20, BW - 32
    carve(cv, rx, ry, rw, 30)
    select_bar(cv, rx + 2, ry + 2, rw - 3, 27)
    cv.sprite(os.path.join(SPR, 'items', 'traje.png') if os.path.exists(os.path.join(SPR, 'items', 'traje.png'))
              else os.path.join(SPR, 'items', 'tela.png'), rx + 7, ry + 7)
    cv.text(rx + 30, ry + 6, 'Traje aislante', CREAM)
    cv.text(rx + 30, ry + 17, 'El traje hermético que armaron entre todos.', CREAM2)
    # materiales en dos columnas
    cv.text(rx + 2, ry + 38, 'Materiales', CREAM2)
    mats = [('tela', 'Tela engomada', 0, 1), ('guantes', 'Guantes de goma', 1, 1),
            ('botas', 'Botas de goma', 1, 1), ('tiras', 'Tiras de goma', 0, 2),
            ('casco', 'Casco de buzo', 1, 1), ('lata', 'Lata para el filtro', 1, 1)]
    for i, (it, name, have, need) in enumerate(mats):
        x = rx + 2 + (i % 2) * 176
        y = ry + 50 + (i // 2) * 21
        carve(cv, x, y, 18, 18)
        cv.sprite(os.path.join(SPR, 'items', f'{it}.png'), x + 1, y + 1)
        ok = have >= need
        cv.text(x + 24, y + 6, name, CREAM if ok else CREAM2)
        cnt = f'{have}/{need}'
        cv.text(x + 160 - cv.measure(cnt), y + 6, cnt, OKC if ok else FALTA)
    # botón Fabricar: tablita aparte, apagada mientras falte algo
    bw = 96
    bx, by = BX + (BW - bw) // 2, BY + BH - 30
    wood(cv, bx, by, bw, 20, seams=0, nails=False, face=W1)
    cv.ctext(bx + bw // 2, by + 7, 'Fabricar', CREAM2)
    prompts(cv, [('key_q', 'Pestaña'), ('mouse', 'Fabricar'), ('key_esc', 'Cerrar')], BX + BW, BY + BH + 12)
    return cv


def opciones():
    cv = mochila(2)
    rows = ['Reanudar', 'Volver al título']
    y0 = BY + 30
    for i, r in enumerate(rows):
        y = y0 + i * 26
        if i == 0:
            select_bar(cv, BX + 40, y - 4, BW - 80, 23)
            flake(cv, BX + BW // 2 - cv.measure(r, 2) // 2 - 10, y + 7)
        cv.ctext(BX + BW // 2, y, r, CREAM if i == 0 else CREAM2, k=2)
    cv.ctext(BX + BW // 2, y0 + 50, 'Volver al título pierde la partida.', FALTA)
    # objetivo: una plaquita tallada
    py = BY + BH - 50
    carve(cv, BX + 40, py, BW - 80, 34)
    cv.ctext(BX + BW // 2, py + 7, 'Objetivo actual', CREAM2)
    cv.ctext(BX + BW // 2, py + 20, 'Cebate un mate antes de seguir la partida.', CREAM)
    prompts(cv, [('key_q', 'Pestaña'), ('mouse', 'Elegir'), ('key_esc', 'Cerrar')], BX + BW, BY + BH + 12)
    return cv


# ------------------------------------------------------------------ fin de partida
def fin():
    cv = Canvas(bg('arena.png', 0.5))
    bw, bh = 280, 176
    bx, by = (W - bw) // 2, 30
    # postes clavados en la nieve
    for px in (bx + 34, bx + bw - 44):
        cv.rect(px, by + 20, 10, H - by - 20, OUTL)
        cv.rect(px + 1, by + 20, 8, H - by - 20, W1)
        cv.rect(px + 1, by + 20, 2, H - by - 20, W3)
        cv.rect(px + 7, by + 20, 2, H - by - 20, W0)
        cv.rrect(px - 6, H - 10, 22, 10, 4, ICE2)
        cv.rrect(px - 4, H - 12, 18, 6, 3, ICE)
    wood(cv, bx, by, bw, bh, seams=0, snow=True)
    cv.ctext(W // 2, by + 14, 'FIN DE LA SALIDA', hx('ffe8b0'), k=2)
    cv.rect(bx + 40, by + 34, bw - 80, 1, W3)
    cv.rect(bx + 40, by + 35, bw - 80, 1, (42, 26, 20, 140))
    # tres números tallados: Ronda, Bajas, Puntos
    cw, gap = 74, 10
    cx0 = bx + (bw - (3 * cw + 2 * gap)) // 2
    for i, (lbl, val) in enumerate((('Ronda', '3'), ('Bajas', '14'), ('Puntos', '1.250'))):
        x = cx0 + i * (cw + gap)
        carve(cv, x, by + 44, cw, 38)
        cv.ctext(x + cw // 2, by + 49, lbl, CREAM2)
        cv.ctext(x + cw // 2, by + 62, val, CREAM, k=2)
    # mejor marca
    best = 'Mejor: Ronda 3 — 1.250 pts'
    badge = '¡Nueva marca!'
    tw_ = cv.measure(best) + 14 + cv.measure(badge)
    sx = W // 2 - tw_ // 2
    cv.text(sx, by + 92, best, CREAM2)
    flake(cv, sx + cv.measure(best) + 6, by + 95, AM3)
    cv.text(sx + cv.measure(best) + 14, by + 92, badge, AM3)
    # opciones como en el título
    for i, r in enumerate(('Otra vez', 'Volver al título')):
        y = by + 112 + i * 24
        if i == 0:
            select_bar(cv, bx + 30, y - 4, bw - 60, 22)
            flake(cv, W // 2 - cv.measure(r, 2) // 2 - 10, y + 7)
        cv.ctext(W // 2, y, r, CREAM if i == 0 else CREAM2, k=2)
    prompts(cv, [('mouse', 'Elegir')], W // 2 + 30, by + bh + 14)
    return cv


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    shots = {'inventario': inventario(), 'fabricar': fabricar(), 'opciones': opciones(), 'fin': fin()}
    big = {}
    for k, cv in shots.items():
        big[k] = cv.im.resize((W * 4, H * 4), Image.NEAREST).convert('RGB')
        big[k].save(os.path.join(OUT, f'menus_madera_{k}.png'))
    lam = Image.new('RGB', (960 * 2 + 20, 540 * 2 + 20), (17, 14, 20))
    for i, k in enumerate(shots):
        lam.paste(big[k].resize((960, 540), Image.NEAREST), ((i % 2) * 980, (i // 2) * 560))
    lam.save(os.path.join(OUT, 'menus_madera.png'))
    print('ok')
