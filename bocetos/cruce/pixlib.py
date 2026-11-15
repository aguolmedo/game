"""Mini librería de pixel art para bocetos (PIL)."""
from PIL import Image
import math, random

def hexc(h):
    if isinstance(h, tuple):
        return h if len(h) == 4 else h + (255,)
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)

def lerp(a, b, t):
    a, b = hexc(a), hexc(b)
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3)) + (255,)

class Canvas:
    def __init__(self, w=320, h=180, bg=None):
        self.w, self.h = w, h
        self.im = Image.new('RGBA', (w, h), hexc(bg) if bg else (0, 0, 0, 0))
        self.p = self.im.load()

    def px(self, x, y, c):
        x, y = int(x), int(y)
        if 0 <= x < self.w and 0 <= y < self.h:
            self.p[x, y] = hexc(c)

    def get(self, x, y):
        return self.p[x, y]

    def blend(self, x, y, c, a):
        x, y = int(x), int(y)
        if 0 <= x < self.w and 0 <= y < self.h and a > 0:
            o, c = self.p[x, y], hexc(c)
            a = min(1, a)
            self.p[x, y] = tuple(int(o[i] * (1 - a) + c[i] * a) for i in range(3)) + (255,)

    def rect(self, x, y, w, h, c):
        for yy in range(int(y), int(y + h)):
            for xx in range(int(x), int(x + w)):
                self.px(xx, yy, c)

    def rect_blend(self, x, y, w, h, c, a):
        for yy in range(int(y), int(y + h)):
            for xx in range(int(x), int(x + w)):
                self.blend(xx, yy, c, a)

    def ellipse(self, cx, cy, rx, ry, c, a=None):
        for yy in range(int(cy - ry), int(cy + ry) + 1):
            for xx in range(int(cx - rx), int(cx + rx) + 1):
                if ((xx - cx) / max(rx, .5)) ** 2 + ((yy - cy) / max(ry, .5)) ** 2 <= 1:
                    if a is None:
                        self.px(xx, yy, c)
                    else:
                        self.blend(xx, yy, c, a)

    def glow(self, cx, cy, r, c, maxa):
        for yy in range(int(cy - r), int(cy + r) + 1):
            for xx in range(int(cx - r), int(cx + r) + 1):
                d = math.hypot(xx - cx, yy - cy)
                if d < r:
                    self.blend(xx, yy, c, maxa * (1 - d / r) ** 2)

    def noise(self, x, y, w, h, colors, rng, weights=None):
        for yy in range(int(y), int(y + h)):
            for xx in range(int(x), int(x + w)):
                self.px(xx, yy, rng.choices(colors, weights)[0])

    def sprite(self, rows, x, y, pal, flip=False, shadow=True):
        hgt = len(rows)
        wid = max(len(r) for r in rows)
        if shadow:
            self.ellipse(x + wid / 2 - .5, y + hgt - .5, wid / 2 - 1, 1.6, '#000000', .28)
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                if ch in pal:
                    xx = x + (wid - 1 - i if flip else i)
                    self.px(xx, y + j, pal[ch])

    def save(self, path1x, path4x, scale=4):
        self.im.save(path1x)
        self.im.resize((self.w * scale, self.h * scale), Image.NEAREST).save(path4x)


def walk_frame(rows, split=6, start=14):
    """Frame B de caminata: levanta la pierna izquierda 1px."""
    rows = [list(r.ljust(12, '.')) for r in rows]
    out = [r[:] for r in rows]
    n = len(rows)
    for c in range(split):
        for r in range(start, n - 1):
            out[r][c] = rows[r + 1][c]
        out[n - 1][c] = '.'
    return [''.join(r) for r in out]

# ---------------------------------------------------------------- fuente 3x5
_F = {
 'A': "010101111101101", 'B': "110101110101110", 'C': "011100100100011", 'D': "110101101101110",
 'E': "111100110100111", 'F': "111100110100100", 'G': "011100101101011", 'H': "101101111101101",
 'I': "111010010010111", 'J': "001001001101010", 'K': "101101110101101", 'L': "100100100100111",
 'M': "101111111101101", 'N': "110101101101101", 'O': "010101101101010", 'P': "110101110100100",
 'Q': "010101101110011", 'R': "110101110101101", 'S': "011100010001110", 'T': "111010010010010",
 'U': "101101101101111", 'V': "101101101101010", 'W': "101101111111101", 'X': "101101010101101",
 'Y': "101101010010010", 'Z': "111001010100111",
 '0': "111101101101111", '1': "010110010010111", '2': "110001010100111", '3': "110001010001110",
 '4': "101101111001001", '5': "111100110001110", '6': "011100111101111", '7': "111001010010010",
 '8': "111101111101111", '9': "111101111001110",
 '.': "000000000000010", ',': "000000000010100", ':': "000010000010000", '!': "010010010000010",
 '?': "110001010000010", '-': "000000111000000", "'": "010010000000000", ' ': "000000000000000",
 '¡': "010000010010010", '¿': "010000010100011", '°': "010101010000000", '·': "000000010000000",
 '[': "110100100100110", ']': "011001001001011", '/': "001001010100100", '"': "101101000000000",
}
_ACC = {'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U'}

def text_width(s, scale=1):
    return max(0, len(s) * 4 * scale - scale)

def text(cv, x, y, s, col, scale=1, outline=None, shadow=None):
    s = s.upper()
    if outline:
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, -1), (-1, 1), (1, 1)):
            text(cv, x + dx, y + dy, s, outline, scale)
    if shadow:
        text(cv, x + scale, y + scale, s, shadow, scale)
    cx = x
    for ch in s:
        acc = tilde = False
        if ch in _ACC:
            ch, acc = _ACC[ch], True
        if ch == 'Ñ':
            ch, tilde = 'N', True
        g = _F.get(ch, _F['?'])
        for r in range(5):
            for c in range(3):
                if g[r * 3 + c] == '1':
                    cv.rect(cx + c * scale, y + r * scale, scale, scale, col)
        if acc:
            cv.rect(cx + 2 * scale, y - 2 * scale, scale, scale, col)
        if tilde:
            cv.rect(cx, y - 2 * scale, 3 * scale, scale, col)
        cx += 4 * scale
    return cx - x

# ---------------------------------------------------------------- fuente grande 5x7
_B = {
 'A': ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
 'C': ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
 'D': ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
 'E': ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
 'L': ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
 'N': ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
 'O': ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
 'R': ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
 'S': ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
 'U': ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
 ' ': ["00000"] * 7,
}

def big_width(s, scale=1):
    return max(0, len(s) * 6 * scale - scale)

def big_text(cv, x, y, s, col, scale=1, outline=None):
    if outline:
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, -1), (-1, 1), (1, 1)):
            big_text(cv, x + dx, y + dy, s, outline, scale)
    cx = x
    for ch in s.upper():
        g = _B.get(ch, _B[' '])
        for r in range(7):
            for c in range(5):
                if g[r][c] == '1':
                    cv.rect(cx + c * scale, y + r * scale, scale, scale, col)
        cx += 6 * scale

# ---------------------------------------------------------------- UI estilo Stardew
UI = dict(dark='#3d2414', wood='#8c5a2b', woodl='#c48a4a', paper='#f6e4bf', ink='#4a2a18')

def box(cv, x, y, w, h):
    cv.rect(x, y, w, h, UI['dark'])
    cv.rect(x + 1, y + 1, w - 2, h - 2, UI['wood'])
    cv.rect(x + 2, y + 2, w - 4, 1, UI['woodl'])
    cv.rect(x + 3, y + 3, w - 6, h - 6, UI['dark'])
    cv.rect(x + 4, y + 4, w - 8, h - 8, UI['paper'])
    for (cx, cy) in ((x + 1, y + 1), (x + w - 2, y + 1), (x + 1, y + h - 2), (x + w - 2, y + h - 2)):
        cv.px(cx, cy, UI['woodl'])

def bar(cv, x, y, w, frac, col, icon_col, label):
    cv.rect(x, y, 5, 5, UI['dark'])
    cv.rect(x + 1, y + 1, 3, 3, icon_col)
    cv.rect(x + 7, y, w, 5, UI['dark'])
    cv.rect(x + 8, y + 1, w - 2, 3, '#6b4a30')
    fw = int((w - 2) * frac)
    cv.rect(x + 8, y + 1, fw, 3, col)
    cv.rect(x + 8, y + 1, fw, 1, lerp(col, '#ffffff', .35))
    text(cv, x + w + 10, y, label, UI['ink'])
