"""Efectos chicos: fogonazo del rifle, impacto, salpicadura de nieve y brillo.

Todo 1x, con contorno de color y 3-4 tonos; luz arriba a la izquierda.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.dont_write_bytecode = True
sys.path.insert(0, HERE)
from pixel import Pix, hx  # noqa: E402

F0 = hx('#fff8d8')   # blanco caliente
F1 = hx('#ffd24a')   # amarillo
F2 = hx('#ef8a28')   # naranja
F3 = hx('#b0441c')   # rojo oscuro
SN0 = hx('#f4fcff')
SN1 = hx('#bde6f4')
SN2 = hx('#7fb4d4')


def fogonazo_0():
    p = Pix(16, 16)
    p.ellipse(7.5, 8.5, 2.6, 2.2, F2)
    p.ellipse(7.5, 8.5, 1.8, 1.5, F1)
    p.ellipse(7, 8, 0.9, 0.8, F0)
    for dx, dy in ((0, -4), (0, 4), (-4, 0), (4, 0), (-3, -3), (3, 3), (-3, 3), (3, -3)):
        p.set(7 + dx, 8 + dy, F1 if abs(dx) + abs(dy) < 5 else F3)
    p.outline(0.56, 0.22)
    return p


def fogonazo_1():
    p = Pix(16, 16)
    p.ellipse(7.5, 8.5, 4.6, 3.8, F3)
    p.ellipse(7.5, 8.5, 3.6, 3.0, F2)
    p.ellipse(7.2, 8.2, 2.4, 2.0, F1)
    p.ellipse(7, 8, 1.2, 1.0, F0)
    for dx, dy in ((0, -6), (0, 6), (-6, 0), (6, 0), (-4, -4), (4, 4), (-4, 4), (4, -4)):
        p.set(7 + dx, 8 + dy, F2)
        p.set(7 + dx // 2, 8 + dy // 2, F1)
    p.outline(0.56, 0.22)
    return p


def fogonazo_2():
    p = Pix(16, 16)
    for k in range(10):
        import math
        a = math.radians(k * 36 + 12)
        x = 7 + round(5.2 * math.cos(a))
        y = 8 + round(4.4 * math.sin(a))
        p.set(x, y, F2 if k % 2 else F1)
        p.set(7 + round(3.6 * math.cos(a)), 8 + round(3.0 * math.sin(a)), F3)
    p.set(7, 8, F1)
    return p


def impacto():
    p = Pix(8, 8)
    p.set(4, 4, F0); p.set(3, 4, F1); p.set(4, 3, F1)
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
        p.set(4 + dx * 2, 4 + dy * 2, F2 if (dx + dy) % 2 else F1)
    p.set(4, 0, F3); p.set(0, 4, F3); p.set(7, 4, F3); p.set(4, 7, F3)
    return p


def salpicadura():
    p = Pix(10, 10)
    # monton de nieve levantado por la bota (base ancha, copos que vuelan)
    for x, y in ((2, 8), (3, 8), (4, 8), (5, 8), (6, 8), (3, 7), (4, 7), (5, 7),
                 (6, 7), (7, 7), (2, 9), (3, 9), (4, 9), (5, 9), (6, 9), (7, 9)):
        p.set(x, y, SN0 if y < 9 else SN1)
    for x, y in ((2, 9), (6, 9), (3, 6), (5, 6), (2, 5), (7, 6), (4, 4), (6, 3),
                 (1, 6), (8, 5), (5, 2), (3, 3), (8, 8), (1, 9)):
        p.set(x, y, SN1 if (x + y) % 3 else SN0)
    p.set(4, 1, SN0); p.set(6, 2, SN0); p.set(0, 7, SN2); p.set(9, 7, SN2)
    return p


def sparkle(big=False):
    p = Pix(7, 7)
    c = 3
    p.set(c, c, SN0)
    arms = 2 if not big else 3
    for i in range(1, arms + 1):
        p.set(c + i, c, SN1 if i < arms else SN0)
        p.set(c - i, c, SN1 if i < arms else SN0)
        p.set(c, c + i, SN1 if i < arms else SN0)
        p.set(c, c - i, SN1 if i < arms else SN0)
    if big:
        for dx, dy in ((1, 1), (-1, 1), (1, -1), (-1, -1)):
            p.set(c + dx, c + dy, SN2)
        p.set(c, c, SN0)
    return p


def build():
    """[(nombre, Pix)] con nombres unicos para el atlas."""
    return [
        ('fogonazo_0', fogonazo_0()),
        ('fogonazo_1', fogonazo_1()),
        ('fogonazo_2', fogonazo_2()),
        ('impacto', impacto()),
        ('salpicadura', salpicadura()),
        ('sparkle_0', sparkle(False)),
        ('sparkle_1', sparkle(True)),
    ]


if __name__ == '__main__':
    from PIL import Image
    items = build()
    W = sum(p.w + 6 for _, p in items) + 6
    H = max(p.h for _, p in items) + 12
    sheet = Image.new('RGBA', (W, H), (30, 26, 40, 255))
    x = 6
    for _, p in items:
        sheet.alpha_composite(p.img, (x, 6))
        x += p.w + 6
    sheet.resize((W * 8, H * 8), Image.NEAREST).save('/tmp/fx_x8.png')
    print('ok', W, H)
