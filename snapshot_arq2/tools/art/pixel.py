"""Mini libreria de dibujo pixel 1x con contornos de color.

Todo se dibuja en RGBA transparente; el contorno se calcula al final a partir
del color vecino (un paso mas oscuro y violaceo), nunca negro puro.
"""
from PIL import Image

OUTLINE_MIX = (26, 20, 38)


def hx(s):
    s = s.lstrip('#')
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


def mix(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def shade(c, t):
    """t<0 oscurece hacia violaceo, t>0 aclara hacia calido."""
    if t < 0:
        return mix(c, OUTLINE_MIX, -t)
    return mix(c, (255, 244, 220), t)


def tint(c, other, t):
    return mix(c, other, t)


class Pix:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        self.px = self.img.load()

    def set(self, x, y, c, a=255):
        x, y = int(x), int(y)
        if not (0 <= x < self.w and 0 <= y < self.h):
            return
        if isinstance(c, str):
            c = hx(c)
        self.px[x, y] = (c[0], c[1], c[2], a)

    def get(self, x, y):
        return self.px[int(x), int(y)]

    def rect(self, x, y, w, h, c, a=255):
        for j in range(int(y), int(y + h)):
            for i in range(int(x), int(x + w)):
                self.set(i, j, c, a)

    def hline(self, x0, x1, y, c, a=255):
        for x in range(int(min(x0, x1)), int(max(x0, x1)) + 1):
            self.set(x, y, c, a)

    def vline(self, x, y0, y1, c, a=255):
        for y in range(int(min(y0, y1)), int(max(y0, y1)) + 1):
            self.set(x, y, c, a)

    def frame(self, x, y, w, h, c, a=255):
        self.hline(x, x + w - 1, y, c, a)
        self.hline(x, x + w - 1, y + h - 1, c, a)
        self.vline(x, y, y + h - 1, c, a)
        self.vline(x + w - 1, y, y + h - 1, c, a)

    def ellipse(self, cx, cy, rx, ry, c, a=255):
        for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
            for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
                d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2
                if d <= 1.0:
                    self.set(x, y, c, a)

    def circle(self, cx, cy, r, c, a=255):
        self.ellipse(cx, cy, r, r, c, a)

    def outline(self, strength=0.62, dark=0.28):
        """Agrega 1px de contorno alrededor de la silueta, del color vecino
        oscurecido (no negro). Usa 4-vecinos + diagonales para cerrar huecos."""
        base = self.img.copy()
        bp = base.load()
        for y in range(self.h):
            for x in range(self.w):
                if bp[x, y][3] != 0:
                    continue
                acc = [0, 0, 0]
                n = 0
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1),
                               (1, 1), (-1, 1), (1, -1), (-1, -1)):
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < self.w and 0 <= yy < self.h:
                        c = bp[xx, yy]
                        if c[3] != 0:
                            # los diagonales pesan menos
                            w = 2 if dx == 0 or dy == 0 else 1
                            acc[0] += c[0] * w
                            acc[1] += c[1] * w
                            acc[2] += c[2] * w
                            n += w
                if n:
                    avg = tuple(a / n for a in acc)
                    c = mix(avg, OUTLINE_MIX, strength)
                    c = tuple(int(v * (1 - dark)) for v in c)
                    self.px[x, y] = (c[0], c[1], c[2], 255)

    def paste(self, other, x, y):
        self.img.alpha_composite(other.img, (int(x), int(y)))

    def copy(self):
        p = Pix(self.w, self.h)
        p.img = self.img.copy()
        p.px = p.img.load()
        return p

    def save(self, path):
        self.img.save(path)
