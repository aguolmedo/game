"""Cascarudos: escarabajos gigantes negros del comic (diseno §11.3).

Caparazon eliptico negro-azulado con brillo frio, linea central del elitro,
6 patas finas que alternan, antenas y mandibulas. Vista 3/4 desde arriba,
contorno de color, luz arriba-izquierda. 4 direcciones x 4 cuadros de
caminata + 1 de golpe (blanco) + 3 de muerte (patas arriba).
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.dont_write_bytecode = True
sys.path.insert(0, HERE)
from pixel import Pix, hx  # noqa: E402

B0 = hx('#0e0c14')    # profundo
B1 = hx('#1e1c2a')    # base
B2 = hx('#3a3850')    # luz
HI = hx('#8a90b8')    # brillo
COLD = hx('#9aa4c8')  # brillo frio del acorazado

TYPES = {             # w, h, patas gruesas, placas, filas de patas
    'cascarudo': (20, 16, False, False),
    'veloz': (14, 12, False, False),
    'acorazado': (28, 22, True, True),
}
DIRS = ('down', 'up', 'left', 'right')


def shell(p, cx, cy, rx, ry, plates=False, belly=False):
    """Caparazon: elipse con luz arriba-izquierda y sombra abajo-derecha."""
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2
            if d > 1.0:
                continue
            c = B1 if not belly else B2
            if d > 0.55:
                lit = (x + 0.5 - cx) < 0 and (y + 0.5 - cy) < 0
                c = B2 if lit else B0
            if d > 0.9 and (x + 0.5 - cx) > 0:
                c = B0
            p.set(x, y, c)
    # costura central del elitro (linea oscura + filo de luz)
    p.vline(int(cx), int(cy - ry) + 1, int(cy + ry) - 1, B0)
    p.vline(int(cx) - 1, int(cy - ry) + 2, int(cy + ry) - 3, B2)
    # brillo especular (arriba a la izquierda)
    gx, gy = int(cx - rx * 0.42), int(cy - ry * 0.42)
    p.set(gx, gy, HI)
    p.set(gx - 1, gy, B2); p.set(gx, gy - 1, B2)
    if plates:                                    # placas del acorazado
        for k in range(3):
            yy = int(cy - ry * 0.55 + k * ry * 0.5)
            for x in range(int(cx - rx * 0.8), int(cx + rx * 0.8) + 1):
                if p.get(x, yy)[3]:
                    p.set(x, yy, B0)
        for x in range(int(cx - rx * 0.7), int(cx + rx * 0.7) + 1):
            yy = int(cy - ry * 0.15 + abs(x - cx) * 0.3)
            if p.get(x, yy)[3]:
                p.set(x, yy, COLD if (x + yy) % 5 else B2)


def leg(p, x0, y0, x1, y1, thick=False):
    """Pata fina de dos tramos (rodilla) con garra clara."""
    mx = (x0 + x1) / 2 + (1.5 if x1 > x0 else -1.5)
    my = y0 - 1.5 if y1 > y0 else y0 + 1.5
    n = int(max(abs(x1 - x0), abs(y1 - y0), 1))
    for i in range(n + 1):
        t = i / n
        if t < 0.5:
            x = x0 + (mx - x0) * t * 2
            y = y0 + (my - y0) * t * 2
        else:
            x = mx + (x1 - mx) * (t - 0.5) * 2
            y = my + (y1 - my) * (t - 0.5) * 2
        p.set(x, y, B0)
        if thick:
            p.set(x + 1, y, B0)
            p.set(x, y + 1, B0)
    p.set(x1, y1, B2)                              # garra
    p.set(x1, y1 - 0.5, B2)


def legs_walk(p, cx, cy, rx, ry, direction, k, thick=False):
    """6 patas que alternan la pisada cuadro a cuadro."""
    phase = (0, 1, 0, 1)[k % 4]
    if direction in ('down', 'up'):
        for i, sy in enumerate((-0.5, 0.0, 0.5)):
            for side in (-1, 1):
                sw = 1 if (i + phase) % 2 else -1
                x0 = cx + side * (rx - 0.8)
                y0 = cy + ry * sy + (0.6 if direction == 'down' else -0.6)
                x1 = cx + side * (rx + 2.6)
                y1 = y0 + sw * 1.6 + (1.2 if direction == 'down' else -1.2)
                leg(p, x0, y0, x1, y1, thick)
    else:
        for i, sy in enumerate((-0.5, 0.0, 0.5)):
            for side in (-1, 1):
                sw = 1 if (i + phase) % 2 else -1
                x0 = cx + rx * sy * 0.9
                y0 = cy + side * (ry - 0.8)
                x1 = x0 + sw * 1.8
                y1 = cy + side * (ry + 2.8)
                leg(p, x0, y0, x1, y1, thick)


def head(p, hx_, hy, direction):
    """Cabeza chica con mandibulas y antenas, fuera del caparazon."""
    if direction == 'down':
        p.ellipse(hx_, hy, 2.3, 1.5, B0)
        p.set(hx_ - 1, hy, B2)
        p.set(hx_ - 2, hy + 1, B2); p.set(hx_ + 2, hy + 1, B2)      # mandibulas
        p.set(hx_ - 3, hy + 1, B0); p.set(hx_ - 4, hy + 2, B2)      # antenas
        p.set(hx_ + 3, hy + 1, B0); p.set(hx_ + 4, hy + 2, B2)
    elif direction == 'up':
        p.ellipse(hx_, hy, 2.1, 1.4, B0)
        p.set(hx_ - 4, hy - 2, B0); p.set(hx_ - 5, hy - 3, B2)
        p.set(hx_ + 4, hy - 2, B0); p.set(hx_ + 5, hy - 3, B2)
        p.set(hx_ - 1, hy - 2, B2); p.set(hx_ + 1, hy - 2, B2)      # mandibulas
    else:
        p.ellipse(hx_, hy, 1.7, 2.2, B0)
        p.set(hx_ - 1, hy - 1, B2)
        p.set(hx_ + 2, hy - 1, B2); p.set(hx_ + 2, hy + 1, B2)      # mandibulas
        p.set(hx_ + 2, hy - 3, B0); p.set(hx_ + 4, hy - 4, B2)      # antenas
        p.set(hx_ + 2, hy + 3, B0); p.set(hx_ + 4, hy + 4, B2)


def beetle(kind, direction='down', k=0):
    w, h, thick, plates = TYPES[kind]
    p = Pix(w, h)
    cx = w / 2 - (0.8 if direction == 'right' else 0)
    cy = h / 2 + (0.4 if direction == 'up' else 0)
    rx = w * 0.36
    ry = h * 0.32
    if direction == 'right':
        rx = w * 0.37; ry = h * 0.30
    bob = (0, 1, 0, 1)[k % 4] if kind != 'acorazado' else 0
    cy += bob * 0.35
    shell(p, cx, cy, rx, ry, plates)
    if direction == 'down':
        head(p, cx, cy + ry * 0.80, direction)
    elif direction == 'up':
        head(p, cx, cy - ry * 0.80, direction)
    else:
        head(p, cx + rx * 0.86, cy, direction)
    legs_walk(p, cx, cy, rx, ry, direction, k, thick)
    p.outline(0.56, 0.22)
    return p


def hit_frame(kind):
    """Cuadro de golpe: toda la silueta en blanco (destello)."""
    w, h, thick, plates = TYPES[kind]
    p = Pix(w, h)
    cx, cy = w / 2, h / 2
    shell(p, cx, cy, w * 0.36, h * 0.32, plates)
    head(p, cx, cy + h * 0.26, 'down')
    legs_walk(p, cx, cy, w * 0.36, h * 0.32, 'down', 0, thick)
    for y in range(h):
        for x in range(w):
            if p.get(x, y)[3]:
                c = p.get(x, y)[:3]
                p.set(x, y, hx('#f4f4ff') if c != B0 else hx('#c8cce8'))
    p.outline(0.56, 0.22)
    return p


def death_frame(kind, k):
    """Patas arriba: panza clara medio hundida y patas al aire que se aflojan."""
    w, h, thick, plates = TYPES[kind]
    p = Pix(w, h)
    cx, cy = w / 2, h / 2 + 1.5
    rx, ry = w * 0.34, h * 0.28
    p.ellipse(cx, cy, rx, ry, B0)
    p.ellipse(cx - 0.5, cy - 0.5, rx * 0.80, ry * 0.74, B1)
    p.ellipse(cx - 1.5, cy - 1.5, rx * 0.44, ry * 0.42, B2)
    p.vline(int(cx), int(cy - ry) + 2, int(cy + ry) - 1, B0)
    p.set(int(cx - rx * 0.4), int(cy - ry * 0.4), HI)
    # patas al aire (se dibujan despues para que se vean)
    reach = (5.0, 3.2, 1.6)[k]
    for i, sy in enumerate((-0.55, 0.0, 0.55)):
        for side in (-1, 1):
            x0 = cx + side * rx * 0.65
            y0 = cy + ry * sy
            x1 = cx + side * (rx * 0.65 + reach * 0.55)
            y1 = y0 - reach * (1.0 - 0.18 * i)
            leg(p, x0, y0, x1, y1, thick)
    # cabeza caida al costado
    hx_ = cx + rx + 1
    p.ellipse(hx_, cy + 2, 1.5, 1.2, B0)
    p.set(hx_ - 1, cy + 2, B2)
    p.outline(0.56, 0.22)
    return p


def build():
    """[(nombre, Pix)]: tipo:dir:cuadro, tipo:hit, tipo:death:n."""
    frames = []
    for kind in TYPES:
        for direction in DIRS:
            for k in range(4):
                p = beetle(kind, 'right' if direction == 'left' else direction, k)
                if direction == 'left':
                    p.img = p.img.transpose(0)
                    p.px = p.img.load()
                frames.append((f'{kind}:{direction}:{k}', p))
        frames.append((f'{kind}:hit', hit_frame(kind)))
        for k in range(3):
            frames.append((f'{kind}:death:{k}', death_frame(kind, k)))
    return frames


if __name__ == '__main__':
    from PIL import Image
    frames = build()
    print('ok', len(frames))
