"""Efectos de disparo del rifle: trazadora, estela, fogonazo, chispas de
impacto, pedazos de caparazon, copos de nieve, vainas y animacion del
cerrojo.

Todo 1x, paleta corta, areas planas, luz arriba-izquierda y contorno de
color (un paso mas oscuro, nunca negro) donde el tamano lo permite.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.dont_write_bytecode = True
sys.path.insert(0, HERE)
from pixel import Pix, hx  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(ROOT, 'public', 'assets')

# ---- calidos del fogonazo
F0 = hx('#fff8d8')
F1 = hx('#ffd24a')
F2 = hx('#ef8a28')
F3 = hx('#b0441c')

# ---- trazadora
T0 = hx('#ffffff')
T1 = hx('#fff4c0')
T2 = hx('#ecab4c')
T3 = hx('#a86a24')
T4 = hx('#4a2a14')

# ---- nieve
SN0 = hx('#f4fcff')
SN1 = hx('#bde6f4')
SN2 = hx('#7fb4d4')

# ---- caparazon
CH0 = hx('#0e0c14')
CH1 = hx('#1e1c2a')
CH2 = hx('#8a90b8')

# ---- vaina de laton
CA0 = hx('#f0d488')
CA1 = hx('#c8a24a')
CA2 = hx('#8a5a2a')
CA3 = hx('#3a2a18')

# ---- metal del cerrojo y guante
ME0 = hx('#8a90b8')
ME1 = hx('#3a3850')
ME2 = hx('#1e1c2a')
GL0 = hx('#6a5850')
GL1 = hx('#4a3a3a')
GL2 = hx('#241c22')
WARM = hx('#ffd24a')
SPARK_OUT = hx('#7a2a12')   # contorno calido oscuro de las chispas
MOUTH = hx('#241a10')       # boca de la vaina


def border(p, color):
    """1 px de contorno alrededor de la silueta, de un color fijo."""
    base = p.img.copy()
    bp = base.load()
    for y in range(p.h):
        for x in range(p.w):
            if bp[x, y][3] != 0:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1),
                           (1, 1), (-1, 1), (1, -1), (-1, -1)):
                xx, yy = x + dx, y + dy
                if 0 <= xx < p.w and 0 <= yy < p.h and bp[xx, yy][3] != 0:
                    p.set(x, y, color)
                    break


# ------------------------------------------------------------- trazadora
def bullet():
    """Trazadora horizontal, vuela hacia +x (la punta a la derecha)."""
    p = Pix(9, 4)
    p.rect(1, 1, 3, 1, T2)      # cola naranja
    p.rect(1, 2, 3, 1, T3)      # cola en sombra
    p.rect(4, 1, 4, 1, T1)      # nucleo
    p.rect(4, 2, 4, 1, T1)
    p.set(6, 1, T0)             # brillo arriba del nucleo
    border(p, T4)
    return p


def trail():
    """Brasa de la estela: naranja fuerte para que se lea sobre la nieve
    clara, con el centro calido y las esquinas oscuras."""
    p = Pix(3, 3)
    p.rect(0, 0, 3, 3, T3)
    p.set(1, 1, T1)
    p.set(0, 1, T2); p.set(2, 1, T2); p.set(1, 0, T2); p.set(1, 2, T2)
    return p


# --------------------------------------------------------------- fogonazo
def flash(size, arm, diagonal=False):
    """Estrella de 4 puntas con el centro en el medio geometrico del cuadro."""
    p = Pix(size, size)
    c = size // 2
    p.ellipse(c + 0.5, c + 0.5, 2.6, 2.6, F2)
    p.ellipse(c + 0.5, c + 0.5, 1.9, 1.9, F1)
    p.ellipse(c + 0.5, c + 0.5, 1.2, 1.2, F0)
    for d in range(3, arm + 1):
        col = F2 if d < arm else F3
        p.set(c + d, c, col)
        p.set(c - d, c, col)
        p.set(c, c + d, col)
        p.set(c, c - d, col)
    if diagonal:
        for d in (2, 3):
            col = F1 if d == 2 else F3
            for sx in (1, -1):
                for sy in (1, -1):
                    p.set(c + sx * d, c + sy * d, col)
    p.outline(0.56, 0.22)
    return p


def flash_0():
    return flash(11, 4)


def flash_1():
    return flash(13, 5, diagonal=True)


# ---------------------------------------------------------------- chispas
def spark(size, reach):
    p = Pix(size, size)
    c = size // 2
    p.set(c, c, F0)
    for i in range(1, reach + 1):
        col = F1 if i < reach else F2
        p.set(c + i, c, col)
        p.set(c - i, c, col)
        p.set(c, c + i, col)
        p.set(c, c - i, col)
    border(p, SPARK_OUT)        # contorno calido un paso mas oscuro
    return p


def spark_0():
    return spark(5, 2)


def spark_1():
    return spark(7, 3)


# -------------------------------------------------------------- caparazon
def chitin_0():
    p = Pix(3, 3)
    p.set(0, 0, CH2)            # brillo frio arriba-izquierda
    p.set(1, 0, CH1)
    p.set(0, 1, CH1)
    p.set(1, 1, CH0)
    p.set(2, 1, CH1)
    p.set(1, 2, CH0)
    return p


def chitin_1():
    p = Pix(2, 2)
    p.set(0, 0, CH2)
    p.set(1, 0, CH1)
    p.set(0, 1, CH1)
    p.set(1, 1, CH0)
    return p


# ------------------------------------------------------------------ nieve
def puff_0():
    p = Pix(4, 4)
    p.set(1, 0, SN0); p.set(2, 0, SN0)
    p.set(0, 1, SN0); p.set(1, 1, SN0); p.set(2, 1, SN1); p.set(3, 1, SN1)
    p.set(0, 2, SN1); p.set(1, 2, SN1); p.set(2, 2, SN1); p.set(3, 2, SN2)
    p.set(1, 3, SN2); p.set(2, 3, SN2)
    return p


def puff_1():
    p = Pix(6, 6)
    p.set(1, 1, SN0); p.set(2, 1, SN0); p.set(3, 1, SN0); p.set(4, 1, SN0)
    p.set(0, 2, SN0); p.set(1, 2, SN0); p.set(2, 2, SN0)
    p.set(3, 2, SN1); p.set(4, 2, SN1); p.set(5, 2, SN1)
    p.set(0, 3, SN1); p.set(1, 3, SN1); p.set(2, 3, SN1)
    p.set(3, 3, SN1); p.set(4, 3, SN2); p.set(5, 3, SN2)
    p.set(1, 4, SN2); p.set(2, 4, SN2); p.set(3, 4, SN2); p.set(4, 4, SN2)
    p.set(5, 0, SN1)            # copito suelto
    p.set(1, 5, SN2)            # copito suelto abajo
    return p


# ----------------------------------------------------------------- vainas
def casing_0():
    """Vaina servida, acostada de costado."""
    p = Pix(4, 2)
    p.set(1, 0, CA0); p.set(2, 0, CA0)
    p.set(1, 1, CA1); p.set(2, 1, CA2)
    border(p, CA3)
    return p


def casing_1():
    """La misma vaina caida: torcida, con la boca oscura a la vista."""
    p = Pix(4, 3)
    p.set(1, 0, MOUTH)          # boca oscura de la vaina
    p.set(2, 0, CA2)
    p.set(1, 1, CA0)            # brillo del laton
    p.set(2, 1, CA1)            # base
    p.set(1, 2, CA1)
    p.set(2, 2, CA2)            # sombra abajo
    border(p, CA3)
    return p


# ---------------------------------------------------------------- cerrojo
def bolt(knob_y, warm=False):
    """Palanca del cerrojo con la mano enguantada. knob_y: 0 arriba, 2 medio,
    4 abajo."""
    p = Pix(8, 5)
    # manopla (izquierda, agarrando)
    p.rect(0, 2, 2, 1, GL0)
    p.rect(0, 3, 1, 1, GL0)
    p.set(1, 3, GL1); p.set(2, 3, GL1)
    p.set(0, 4, GL1); p.set(1, 4, GL2); p.set(2, 4, GL2)
    # cuerpo metalico del cerrojo
    p.rect(3, 2, 4, 1, ME0)
    p.rect(3, 3, 4, 1, ME1)
    p.set(7, 2, ME1)
    p.set(7, 3, ME2)
    if knob_y == 2:
        p.set(6, 2, ME0)        # palanca al medio, apoyada
        p.set(7, 2, ME0)
        if warm:
            p.set(5, 2, WARM)   # brillo calido del roce
    elif knob_y == 0:
        p.set(6, 1, ME0)        # palanca arriba
        p.set(6, 0, ME1)
    else:
        p.set(6, 3, ME0)        # palanca abajo
        p.set(6, 4, ME1)
    return p


def bolt_0():
    return bolt(0)


def bolt_1():
    return bolt(2, warm=True)


def bolt_2():
    return bolt(4)


# ------------------------------------------------------------------ click
def click():
    """Chasquido en seco: sin bala, solo el golpe del percutor.
    Chispa chica y fria (no se confunde con el fogonazo) con contorno oscuro
    para que se lea sobre la nieve y sobre el muro claro."""
    p = Pix(7, 7)
    c = 3
    p.set(c, c, T1)                                   # nucleo calido
    p.set(c - 1, c, SN1); p.set(c + 1, c, SN1)
    p.set(c, c - 1, SN1); p.set(c, c + 1, SN1)
    p.set(c - 2, c, SN2); p.set(c + 2, c, SN2)
    p.set(c, c - 2, SN2); p.set(c, c + 2, SN2)
    p.set(c + 1, c - 1, SN2); p.set(c + 2, c - 2, SN2)  # polvillo del percutor
    p.set(c + 1, c + 2, SN2)
    p.outline(0.56, 0.22)                              # contorno un paso mas oscuro
    return p


def build():
    """[(nombre, Pix)] con nombres unicos para el atlas."""
    return [
        ('bullet', bullet()),
        ('trail', trail()),
        ('flash_0', flash_0()),
        ('flash_1', flash_1()),
        ('spark_0', spark_0()),
        ('spark_1', spark_1()),
        ('chitin_0', chitin_0()),
        ('chitin_1', chitin_1()),
        ('puff_0', puff_0()),
        ('puff_1', puff_1()),
        ('casing_0', casing_0()),
        ('casing_1', casing_1()),
        ('bolt_0', bolt_0()),
        ('bolt_1', bolt_1()),
        ('bolt_2', bolt_2()),
        ('click', click()),
    ]


def pack(items, maxw=96, pad=4):
    """Empaquetado simple en filas con 4 px de padding."""
    placed = []
    x, y, rowh = pad, pad, 0
    for name, p in items:
        if x + p.w + pad > maxw and x > pad:
            x = pad
            y += rowh + pad
            rowh = 0
        placed.append((name, p, x, y))
        x += p.w + pad
        rowh = max(rowh, p.h)
    W = max(px + p.w for _, p, px, _ in placed) + pad
    H = y + rowh + pad
    atlas = Pix(W, H)
    frames = {}
    for name, p, px, py in placed:
        atlas.paste(p, px, py)
        frames[name] = [px, py, p.w, p.h]
    return atlas, frames


def main():
    items = build()
    atlas, frames = pack(items)
    os.makedirs(OUT, exist_ok=True)
    png = os.path.join(OUT, 'fx_shooting.png')
    meta = os.path.join(OUT, 'fx_shooting.json')
    atlas.img.save(png)
    with open(meta, 'w', encoding='utf-8') as f:
        f.write(json.dumps({'frames': frames}, ensure_ascii=False, indent=1)
                + '\n')
    # preview ampliado sobre fondo oscuro
    from PIL import Image
    bg = Image.new('RGBA', atlas.img.size, (30, 26, 40, 255))
    bg.alpha_composite(atlas.img)
    bg.resize((atlas.w * 8, atlas.h * 8), Image.NEAREST).save(
        '/tmp/fx_shooting_x8.png')
    print('ok', len(frames), 'cuadros', f'{atlas.w}x{atlas.h}')


if __name__ == '__main__':
    main()
