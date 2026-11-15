"""Libreria comun: paleta, canvas con glow, fuente pixel 5x7, sprites."""
import random
from PIL import Image, ImageChops

OUTDIR = "/home/mateyfasito/dev/game/bocetos/eternauta"
W, H = 320, 180
SCALE = 4


def hx(s):
    s = s.lstrip('#')
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


# ---------------------------------------------------------------- PALETA
PAL = {
    # contorno / noche
    'OUT': '#1a1426', 'N0': '#0b0c1d', 'N1': '#12142b', 'N2': '#1b1f3f',
    'N3': '#262b55', 'N4': '#353c6e',
    'V1': '#2e2448', 'V2': '#4a3a6e', 'V3': '#6a5a96',
    'G1': '#2b2e40', 'G2': '#3f4358', 'G3': '#5a5f7a', 'G4': '#8a8fa8',
    # nieve
    'SN0': '#3a6584', 'SN1': '#5a92b0', 'SN2': '#86c6da', 'SN3': '#bdeffa',
    'SN4': '#effeff', 'GL': '#7fd8f0',
    # ambar
    'AM0': '#5e3220', 'AM1': '#a8582a', 'AM2': '#e8963a', 'AM3': '#ffcf6e',
    'AM4': '#fff0b8',
    # madera / pergamino (HUD)
    'WD0': '#2e1a10', 'WD1': '#5a3420', 'WD2': '#8a5a30', 'WD3': '#b98448',
    'PAR': '#ecd6a4', 'PAR2': '#d4b47c', 'INK': '#3a2418',
    # piel
    'SK': '#e2ab8a', 'SK2': '#b97a62', 'SK3': '#7e4c44',
    # tejas
    'RF0': '#2a1a2e', 'RF1': '#4a2838', 'RF2': '#6e3a44',
    # follaje
    'LF0': '#14232f', 'LF1': '#1f3442', 'LF2': '#2d4a56',
    # auto
    'CA0': '#1f3644', 'CA1': '#2f5462', 'CA2': '#4c7f88',
    # barra de aire
    'AIR0': '#1d5650', 'AIR1': '#2f8f7a', 'AIR2': '#58d6b0',
    # impermeable
    'RC0': '#4a4230', 'RC1': '#6e6646', 'RC2': '#948a5e',
    # rojo carta
    'RED': '#b8434a', 'BLU': '#3f6fb0', 'GRN': '#3f8a52',
}
C = {k: hx(v) for k, v in PAL.items()}


def lum(c):
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def mix(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


# ---------------------------------------------------------------- CANVAS
class Canvas:
    def __init__(self, w=W, h=H, bg=C['N1']):
        self.w, self.h = w, h
        self.img = Image.new('RGB', (w, h), bg)
        self.px = self.img.load()
        self.gcold = Image.new('L', (w, h), 0)   # emisores frios (nieve)
        self.gwarm = Image.new('L', (w, h), 0)   # emisores calidos
        self.gc = self.gcold.load()
        self.gw = self.gwarm.load()

    def inb(self, x, y):
        return 0 <= x < self.w and 0 <= y < self.h

    def p(self, x, y, c, a=1.0, glow=None):
        x, y = int(x), int(y)
        if not self.inb(x, y):
            return
        if isinstance(c, str):
            c = C[c] if c in C else hx(c)
        if a >= 1.0:
            self.px[x, y] = c
        else:
            self.px[x, y] = mix(self.px[x, y], c, a)
        if glow == 'cold':
            self.gc[x, y] = 255
        elif glow == 'warm':
            self.gw[x, y] = 255
        elif glow == 'none' or (glow is None and a >= 1.0):
            self.gc[x, y] = 0
            self.gw[x, y] = 0

    def get(self, x, y):
        return self.px[x, y]

    def rect(self, x, y, w, h, c, a=1.0, glow=None):
        for j in range(y, y + h):
            for i in range(x, x + w):
                self.p(i, j, c, a, glow)

    def hline(self, x0, x1, y, c, a=1.0, glow=None):
        for i in range(min(x0, x1), max(x0, x1) + 1):
            self.p(i, y, c, a, glow)

    def vline(self, x, y0, y1, c, a=1.0, glow=None):
        for j in range(min(y0, y1), max(y0, y1) + 1):
            self.p(x, j, c, a, glow)

    def frame(self, x, y, w, h, c):
        self.hline(x, x + w - 1, y, c)
        self.hline(x, x + w - 1, y + h - 1, c)
        self.vline(x, y, y + h - 1, c)
        self.vline(x + w - 1, y, y + h - 1, c)

    def dither(self, x, y, w, h, c1, c2, mode='checker', glow=None):
        """mode: checker (50%), sparse (25% c2), dense (75% c2)"""
        for j in range(y, y + h):
            for i in range(x, x + w):
                if mode == 'checker':
                    use2 = (i + j) % 2 == 0
                elif mode == 'sparse':
                    use2 = (i % 2 == 0 and j % 2 == 0)
                else:
                    use2 = not (i % 2 == 0 and j % 2 == 0)
                self.p(i, j, c2 if use2 else c1, glow=glow)

    def ellipse(self, cx, cy, rx, ry, c, a=1.0, glow=None, ring_dither=None):
        for j in range(int(cy - ry) - 1, int(cy + ry) + 2):
            for i in range(int(cx - rx) - 1, int(cx + rx) + 2):
                d = ((i + 0.5 - cx) / rx) ** 2 + ((j + 0.5 - cy) / ry) ** 2
                if d <= 1.0:
                    if ring_dither and d > ring_dither and (i + j) % 2:
                        continue
                    self.p(i, j, c, a, glow)

    def tint_ellipse(self, cx, cy, rx, ry, c, a):
        """pool de luz cuantizado: 3 anillos con borde con dither"""
        for k, (s, aa) in enumerate(((1.0, a * 0.45), (0.72, a * 0.75), (0.45, a))):
            self.ellipse(cx, cy, rx * s, ry * s, c, aa, ring_dither=0.8)

    # -- glow: anillos en diamante (1 y 2 px) alrededor de emisores
    def apply_glow(self):
        for mask, col, levels in ((self.gcold, C['GL'], (0.42, 0.16)),
                                  (self.gwarm, C['AM2'], (0.45, 0.2))):
            prev = mask
            for a in levels:
                d = dilate(prev)
                ring = ImageChops.subtract(d, prev)
                rp = ring.load()
                for y in range(self.h):
                    for x in range(self.w):
                        if rp[x, y]:
                            cur = self.px[x, y]
                            if lum(cur) < lum(col):
                                self.px[x, y] = mix(cur, col, a)
                prev = d

    def save(self, name):
        self.img.save(f"{OUTDIR}/{name}_1x.png")
        self.img.resize((self.w * SCALE, self.h * SCALE), Image.NEAREST).save(
            f"{OUTDIR}/{name}.png")


def dilate(m):
    w, h = m.size
    out = m.copy()
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        sh = Image.new('L', (w, h), 0)
        sh.paste(m, (dx, dy))
        out = ImageChops.lighter(out, sh)
    return out


# ---------------------------------------------------------------- NIEVE
def snowfall(cv, n, seed=1, region=None, big=0.18):
    rnd = random.Random(seed)
    x0, y0, x1, y1 = region or (0, 0, cv.w, cv.h)
    for _ in range(n):
        x = rnd.randrange(x0, x1)
        y = rnd.randrange(y0, y1)
        r = rnd.random()
        if r < big:      # copo grande (cruz)
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                cv.p(x + dx, y + dy, 'SN3')
            for dx, dy in ((1, 1), (-1, 1), (1, -1), (-1, -1)):
                cv.p(x + dx, y + dy, 'GL', 0.35)
            for dx, dy in ((2, 0), (-2, 0), (0, 2), (0, -2)):
                cv.p(x + dx, y + dy, 'GL', 0.2)
            cv.p(x, y, 'SN4')
        elif r < 0.6:    # copo chico con halo
            cv.p(x, y, 'SN4')
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                cv.p(x + dx, y + dy, 'GL', 0.33)
        else:            # copo lejano tenue
            cv.p(x, y, 'SN2', 0.85)


BAYER4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def value_noise(w, h, cell, seed):
    rnd = random.Random(seed)
    gw, gh = w // cell + 2, h // cell + 2
    grid = [[rnd.random() for _ in range(gw)] for _ in range(gh)]

    def f(x, y):
        gx, gy = x / cell, y / cell
        ix, iy = int(gx), int(gy)
        tx, ty = gx - ix, gy - iy
        tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty)
        a = grid[iy][ix] + (grid[iy][ix + 1] - grid[iy][ix]) * tx
        b = grid[iy + 1][ix] + (grid[iy + 1][ix + 1] - grid[iy + 1][ix]) * tx
        return a + (b - a) * ty
    return f


def snow_ground(cv, x, y, w, h, seed=3, levels=('SN0', 'SN1', 'SN2', 'SN3'),
                cuts=(0.22, 0.55, 0.86), cell=10, glow=True, sparkle=0.006, bias=0.0):
    """suelo nevado: ruido suave cuantizado con dither Bayer + destellos"""
    rnd = random.Random(seed)
    nz = value_noise(w, h, cell, seed)
    nz2 = value_noise(w, h, max(3, cell // 3), seed + 99)
    g = 'cold' if glow else None
    for j in range(h):
        for i in range(w):
            v = 0.7 * nz(i, j) + 0.3 * nz2(i, j) + bias
            v += (BAYER4[(y + j) % 4][(x + i) % 4] / 16.0 - 0.5) * 0.12
            k = sum(1 for c in cuts if v > c)
            col = levels[k]
            if rnd.random() < sparkle:
                col = 'SN4'
            cv.p(x + i, y + j, col, glow=g)


def shadow(cv, cx, cy, rx, ry, a=0.45):
    cv.ellipse(cx, cy, rx, ry, 'N1', a * 0.6)
    cv.ellipse(cx, cy, rx * 0.7, ry * 0.7, 'N1', a * 0.6)


# ---------------------------------------------------------------- FUENTE
F = {}


def _g(ch, *rows):
    F[ch] = rows


_g('A', ".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#")
_g('B', "####.", "#...#", "#...#", "####.", "#...#", "#...#", "####.")
_g('C', ".###.", "#...#", "#....", "#....", "#....", "#...#", ".###.")
_g('D', "####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####.")
_g('E', "#####", "#....", "#....", "####.", "#....", "#....", "#####")
_g('F', "#####", "#....", "#....", "####.", "#....", "#....", "#....")
_g('G', ".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".####")
_g('H', "#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#")
_g('I', ".###.", "..#..", "..#..", "..#..", "..#..", "..#..", ".###.")
_g('J', "..###", "...#.", "...#.", "...#.", "#..#.", "#..#.", ".##..")
_g('K', "#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#")
_g('L', "#....", "#....", "#....", "#....", "#....", "#....", "#####")
_g('M', "#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#")
_g('N', "#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#")
_g('O', ".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###.")
_g('P', "####.", "#...#", "#...#", "####.", "#....", "#....", "#....")
_g('Q', ".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#")
_g('R', "####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#")
_g('S', ".####", "#....", "#....", ".###.", "....#", "....#", "####.")
_g('T', "#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#..")
_g('U', "#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###.")
_g('V', "#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#..")
_g('W', "#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#")
_g('X', "#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#")
_g('Y', "#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#..")
_g('Z', "#####", "....#", "...#.", "..#..", ".#...", "#....", "#####")
_e = "....."
_g('a', _e, _e, ".###.", "....#", ".####", "#...#", ".####", _e)
_g('b', "#....", "#....", "####.", "#...#", "#...#", "#...#", "####.", _e)
_g('c', _e, _e, ".###.", "#....", "#....", "#....", ".###.", _e)
_g('d', "....#", "....#", ".####", "#...#", "#...#", "#...#", ".####", _e)
_g('e', _e, _e, ".###.", "#...#", "#####", "#....", ".###.", _e)
_g('f', "..##.", ".#...", "####.", ".#...", ".#...", ".#...", ".#...", _e)
_g('g', _e, _e, ".####", "#...#", "#...#", ".####", "....#", ".###.")
_g('h', "#....", "#....", "####.", "#...#", "#...#", "#...#", "#...#", _e)
_g('i', "..#..", _e, ".##..", "..#..", "..#..", "..#..", ".###.", _e)
_g('j', "...#.", _e, "..##.", "...#.", "...#.", "...#.", "#..#.", ".##..")
_g('k', "#....", "#....", "#..#.", "#.#..", "##...", "#.#..", "#..#.", _e)
_g('l', ".##..", "..#..", "..#..", "..#..", "..#..", "..#..", "...##", _e)
_g('m', _e, _e, "##.#.", "#.#.#", "#.#.#", "#.#.#", "#...#", _e)
_g('n', _e, _e, "####.", "#...#", "#...#", "#...#", "#...#", _e)
_g('o', _e, _e, ".###.", "#...#", "#...#", "#...#", ".###.", _e)
_g('p', _e, _e, "####.", "#...#", "#...#", "####.", "#....", "#....")
_g('q', _e, _e, ".####", "#...#", "#...#", ".####", "....#", "....#")
_g('r', _e, _e, "#.##.", "##..#", "#....", "#....", "#....", _e)
_g('s', _e, _e, ".####", "#....", ".###.", "....#", "####.", _e)
_g('t', ".#...", ".#...", "####.", ".#...", ".#...", ".#..#", "..##.", _e)
_g('u', _e, _e, "#...#", "#...#", "#...#", "#..##", ".##.#", _e)
_g('v', _e, _e, "#...#", "#...#", "#...#", ".#.#.", "..#..", _e)
_g('w', _e, _e, "#...#", "#...#", "#.#.#", "#.#.#", ".#.#.", _e)
_g('x', _e, _e, "#...#", ".#.#.", "..#..", ".#.#.", "#...#", _e)
_g('y', _e, _e, "#...#", "#...#", "#...#", ".####", "....#", ".###.")
_g('z', _e, _e, "#####", "...#.", "..#..", ".#...", "#####", _e)
for base, acc in (('a', 'á'), ('e', 'é'), ('o', 'ó'), ('u', 'ú')):
    F[acc] = ("...#.", "..#..") + tuple(F[base][2:])
F['í'] = ("...#.", "..#..", ".##..", "..#..", "..#..", "..#..", ".###.", _e)
F['ñ'] = (".#.#.", "#.#..", "####.", "#...#", "#...#", "#...#", "#...#", _e)
_g('0', ".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###.")
_g('1', "..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###.")
_g('2', ".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####")
_g('3', "####.", "....#", "....#", ".###.", "....#", "....#", "####.")
_g('4', "...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#.")
_g('5', "#####", "#....", "####.", "....#", "....#", "#...#", ".###.")
_g('6', ".###.", "#....", "#....", "####.", "#...#", "#...#", ".###.")
_g('7', "#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#...")
_g('8', ".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###.")
_g('9', ".###.", "#...#", "#...#", ".####", "....#", "....#", ".###.")
_g('.', ".", ".", ".", ".", ".", ".", "#")
_g(',', "..", "..", "..", "..", "..", ".#", ".#", "#.")
_g(':', ".", ".", "#", ".", ".", "#", ".")
_g('!', "#", "#", "#", "#", "#", ".", "#")
_g('?', ".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#..")
_g('-', "...", "...", "...", "###", "...", "...", "...")
_g("'", "#", "#", ".", ".", ".", ".", ".")
_g('(', ".#", "#.", "#.", "#.", "#.", "#.", ".#")
_g(')', "#.", ".#", ".#", ".#", ".#", ".#", "#.")
_g('/', "....#", "...#.", "...#.", "..#..", ".#...", ".#...", "#....")
_g(' ', "...", "...", "...", "...", "...", "...", "...")


def text_width(s, scale=1, spacing=1):
    w = 0
    for ch in s:
        w += (len(F[ch][0]) + spacing) * scale
    return w - spacing * scale


def text_mask(s, scale=1, spacing=1):
    """devuelve lista de (x,y) pixeles encendidos"""
    pts = []
    x = 0
    for ch in s:
        g = F[ch]
        for j, row in enumerate(g):
            for i, v in enumerate(row):
                if v == '#':
                    for sy in range(scale):
                        for sx in range(scale):
                            pts.append((x + i * scale + sx, j * scale + sy))
        x += (len(g[0]) + spacing) * scale
    return pts


def draw_text(cv, x, y, s, col, scale=1, shadow=None, glow=None, outline=None):
    pts = text_mask(s, scale)
    if outline:
        sset = set(pts)
        for (px, py) in pts:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, 1), (1, -1), (-1, -1)):
                q = (px + dx, py + dy)
                if q not in sset:
                    cv.p(x + q[0], y + q[1], outline)
    if shadow:
        for (px, py) in pts:
            cv.p(x + px + 1, y + py + 1, shadow)
    for (px, py) in pts:
        cv.p(x + px, y + py, col, glow=glow)


# ---------------------------------------------------------------- SPRITES
def mirror_rows(grid, start):
    g = [list(r) for r in grid]
    for j in range(start, len(g)):
        g[j] = g[j][::-1]
    return [''.join(r) for r in g]


def blit_grid(cv, grid, cmap, x, y, rows=None):
    for j, row in enumerate(grid):
        if rows and not (rows[0] <= j < rows[1]):
            continue
        for i, ch in enumerate(row):
            if ch == '.' or ch == ' ':
                continue
            col = cmap[ch]
            glow = None
            if isinstance(col, tuple) and len(col) == 2 and isinstance(col[1], str):
                col, glow = col
            cv.p(x + i, y + j, col, glow=glow)


def grid_to_image(grid, cmap):
    im = Image.new('RGBA', (len(grid[0]), len(grid)), (0, 0, 0, 0))
    for j, row in enumerate(grid):
        for i, ch in enumerate(row):
            if ch in '. ':
                continue
            col = cmap[ch]
            if isinstance(col, tuple) and len(col) == 2 and isinstance(col[1], str):
                col = col[0]
            if isinstance(col, str):
                col = C[col] if col in C else hx(col)
            im.putpixel((i, j), col + (255,))
    return im
