import random
from lib import Canvas, C, mix, draw_text, text_width, text_mask, snowfall, snow_ground

cv = Canvas()
rnd = random.Random(7)

# ---- cielo: bandas con dither ordenado
bands = ['N0', 'N1', 'N2', 'V1', 'N3']
edges = [0, 34, 70, 100, 124, 140]
for b in range(len(bands)):
    y0, y1 = edges[b], edges[b + 1]
    cv.rect(0, y0, 320, y1 - y0, bands[b])
    if b + 1 < len(bands):
        # transicion: 2 filas sparse + 2 checker
        cv.dither(0, y1 - 4, 320, 2, bands[b], bands[b + 1], 'sparse')
        cv.dither(0, y1 - 2, 320, 2, bands[b], bands[b + 1], 'checker')

# nubes bajas violaceas
for (cx, cy, rx, ry) in ((60, 92, 70, 8), (250, 86, 90, 9), (160, 104, 80, 6)):
    cv.ellipse(cx, cy, rx, ry, 'V2', 0.35, ring_dither=0.6)

# ---- titulo
TITLE = "EL ETERNAUTA"
S = 3
tw = text_width(TITLE, S)
tx, ty = (320 - tw) // 2, 26
pts = text_mask(TITLE, S)
pset = set(pts)
# halo grande difuso (anillos)
for r, a in ((4, 0.10), (3, 0.14), (2, 0.2)):
    done = set()
    for (x, y) in pts:
        for dx in range(-r, r + 1):
            for dy in range(-r, r + 1):
                if abs(dx) + abs(dy) == r and (x + dx, y + dy) not in pset:
                    done.add((x + dx, y + dy))
    for (x, y) in done:
        cv.p(tx + x, ty + y, 'GL', a)
# sombra proyectada
for (x, y) in pts:
    cv.p(tx + x + 2, ty + y + 2, 'N0')
# contorno
for (x, y) in pts:
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
        if (x + dx, y + dy) not in pset:
            cv.p(tx + x + dx, ty + y + dy, 'OUT')
# relleno con gradiente vertical y brillo
th = 7 * S
for (x, y) in pts:
    t = y / th
    col = 'SN4' if t < 0.25 else ('SN3' if t < 0.55 else ('SN2' if t < 0.85 else 'SN1'))
    cv.p(tx + x, ty + y, col)
    # brillo: diagonal de 1px arriba a la izquierda de cada trazo
    if (x - 1, y) not in pset and (x, y - 1) not in pset:
        cv.p(tx + x, ty + y, 'SN4')
# destellos sobre las letras
for (sx, sy) in ((tx + 4, ty + 1), (tx + 118, ty + 2), (tx + tw - 10, ty + 1)):
    cv.p(sx, sy - 2, 'SN4'); cv.p(sx, sy - 3, 'GL', 0.6)
    cv.p(sx - 2, sy, 'SN4'); cv.p(sx + 2, sy, 'SN4')

# linea decorativa + subtitulo
sub = "la nevada"
sw = text_width(sub, 2)
sx, sy = (320 - sw) // 2, ty + th + 9
cv.hline(sx - 28, sx - 8, sy + 7, 'V3'); cv.p(sx - 30, sy + 7, 'V2')
cv.hline(sx + sw + 7, sx + sw + 27, sy + 7, 'V3'); cv.p(sx + sw + 29, sy + 7, 'V2')
cv.p(sx - 5, sy + 7, 'SN3'); cv.p(sx + sw + 4, sy + 7, 'SN3')
draw_text(cv, sx, sy, sub, 'AM3', scale=2, shadow='AM0', outline='OUT', glow='warm')

# ---- casas bajas / chalets
GROUND = 150


def chalet(x, w, h, roof_h, lit=(), chimney=None, seed=0):
    """fachada (silueta) con techo a dos aguas de tejas y nieve arriba"""
    wall_top = GROUND - h
    # pared
    cv.rect(x, wall_top, w, h, 'N2')
    cv.dither(x, wall_top, w, h, 'N2', 'G1', 'sparse')
    cv.vline(x + w - 1, wall_top, GROUND - 1, 'N1')
    # techo (triangulo ancho, aleros 3px)
    apex = x + w // 2
    for j in range(roof_h):
        y = wall_top - roof_h + j
        half = int((w // 2 + 3) * (j + 1) / roof_h)
        for i in range(apex - half, apex + half + 1):
            # textura de tejas: filas de 3px con arcos
            row = j // 3
            k = (i + (row % 2) * 2) % 4
            col = 'RF1'
            if j % 3 == 2:
                col = 'RF0'
            elif k == 0:
                col = 'RF0'
            elif j % 3 == 0 and k == 2:
                col = 'RF2'
            cv.p(i, y, col)
        # contorno lateral
        cv.p(apex - half, y, 'OUT'); cv.p(apex + half, y, 'OUT')
    # nieve en el techo: tapa irregular sobre el tercio superior + borde de alero
    r2 = random.Random(seed)
    cap = roof_h // 2 + 1
    for j in range(cap):
        y = wall_top - roof_h + j
        half = int((w // 2 + 3) * (j + 1) / roof_h)
        for i in range(apex - half, apex + half + 1):
            if j < cap - 2 or r2.random() < 0.55:
                cv.p(i, y, 'SN3' if j < 2 or r2.random() < 0.3 else 'SN2', glow='cold')
    cv.hline(x - 3, x + w + 2, wall_top, 'SN2', glow='cold')
    cv.hline(x - 2, x + w + 1, wall_top + 1, 'OUT')
    # chimenea
    if chimney:
        cx = x + chimney
        top = wall_top - roof_h + 2
        cv.rect(cx, top - 7, 5, 10, 'G1')
        cv.vline(cx + 4, top - 7, top + 2, 'N1')
        cv.hline(cx - 1, cx + 5, top - 8, 'SN3', glow='cold')
    # ventanas
    wins = []
    nwin = max(1, w // 18)
    for k in range(nwin):
        wx = x + 5 + k * ((w - 10) // nwin) + ((w - 10) // nwin - 7) // 2
        wy = wall_top + 6
        wins.append((wx, wy))
    for k, (wx, wy) in enumerate(wins):
        if k in lit:
            cv.rect(wx, wy, 7, 9, 'AM2', glow='warm')
            cv.rect(wx + 1, wy + 1, 5, 4, 'AM3', glow='warm')
            cv.p(wx + 1, wy + 1, 'AM4', glow='warm')
            cv.vline(wx + 3, wy, wy + 8, 'AM1')
            cv.hline(wx, wx + 6, wy + 4, 'AM1')
            # luz sobre la nieve debajo
            cv.ellipse(wx + 3.5, GROUND + 4, 9, 3, 'AM2', 0.25, ring_dither=0.5)
        else:
            cv.rect(wx, wy, 7, 9, 'N1')
            cv.p(wx + 1, wy + 1, 'N3')
            cv.vline(wx + 3, wy, wy + 8, 'N0')
        cv.frame(wx - 1, wy - 1, 9, 11, 'OUT')
        # nieve en el alfeizar
        cv.hline(wx - 1, wx + 7, wy + 10, 'SN2', glow='cold')
    # puerta
    dx = x + w // 2 - 3 if nwin != 2 else x + w // 2 - 3
    cv.rect(dx, GROUND - 11, 6, 11, 'WD0')
    cv.frame(dx - 1, GROUND - 12, 8, 13, 'OUT')


# lejanas (mas oscuras): silueta plana
for x, w, h in ((0, 40, 22), (38, 36, 18), (150, 44, 20), (276, 50, 24)):
    top = GROUND - h - 6
    cv.rect(x, top, w, h + 6, 'N1')
    for j in range(10):
        cv.hline(x + w // 2 - j * w // 20 - 2, x + w // 2 + j * w // 20 + 2, top - 10 + j, 'N1')

chalet(14, 62, 30, 20, lit=(2,), chimney=12, seed=1)
chalet(96, 48, 26, 16, lit=(), chimney=None, seed=2)
chalet(196, 70, 32, 22, lit=(0,), chimney=50, seed=3)
chalet(282, 50, 24, 16, lit=(1,), seed=4)

# arbol pelado (silueta)
def bare_tree(x, base, h, seed=0):
    """arbol pelado: tronco + ramas recursivas, nieve en las puntas"""
    rr = random.Random(seed)
    cv.rect(x, base - h // 2, 3, h // 2, 'N0')
    cv.vline(x + 2, base - h // 2, base - 1, 'V1')

    def branch(bx, by, ang, L, depth):
        import math
        for t in range(L):
            px = bx + math.cos(ang) * t
            py = by - math.sin(ang) * t
            cv.p(round(px), round(py), 'N0')
            if depth == 0 and t == L - 1:
                cv.p(round(px), round(py) - 1, 'SN2', glow='cold')
        ex, ey = bx + math.cos(ang) * (L - 1), by - math.sin(ang) * (L - 1)
        if depth > 0:
            for d in (-0.45, 0.4):
                branch(ex, ey, ang + d + rr.uniform(-0.15, 0.15), int(L * 0.7), depth - 1)
    import math
    branch(x + 1, base - h // 2, math.pi / 2, h // 4, 0)
    for a in (1.15, 1.95, 1.55):
        branch(x + 1, base - h // 2 - 2, a, h // 3, 3)


bare_tree(172, GROUND, 52, 1)
bare_tree(84, GROUND, 40, 2)

# ---- suelo nevado con brillo
snow_ground(cv, 0, GROUND, 320, 180 - GROUND, seed=11, cell=14)
cv.hline(0, 319, GROUND, 'SN3', glow='cold')
# vereda insinuada
for x in range(0, 320, 2):
    cv.p(x, GROUND + 9, 'SN0')
# huellas que se alejan
for k in range(9):
    fx = 60 + k * 11
    fy = 172 - k * 2 + (k % 2) * 2
    cv.rect(fx, fy, 2, 1, 'SN0')
    cv.p(fx, fy + 1, 'N4')

# ---- farol (de pie, estilo plaza)
fx = 140
cv.vline(fx, GROUND - 46, GROUND + 2, 'OUT')
cv.vline(fx + 1, GROUND - 46, GROUND + 2, 'G2')
cv.rect(fx - 2, GROUND, 6, 3, 'OUT')
cv.hline(fx - 4, fx + 5, GROUND - 46, 'OUT')
cv.rect(fx - 3, GROUND - 54, 8, 8, 'AM3', glow='warm')
cv.rect(fx - 2, GROUND - 53, 6, 6, 'AM4', glow='warm')
cv.frame(fx - 4, GROUND - 55, 10, 10, 'OUT')
cv.hline(fx - 5, fx + 6, GROUND - 56, 'OUT')
cv.hline(fx - 4, fx + 5, GROUND - 57, 'SN3', glow='cold')
cv.p(fx, GROUND - 58, 'OUT'); cv.p(fx + 1, GROUND - 58, 'OUT')
# cono de luz y charco calido en la nieve
for j in range(GROUND - 45, GROUND):
    t = (j - (GROUND - 45)) / 45
    half = int(4 + t * 16)
    for i in range(fx - half, fx + half + 2):
        if (i + j) % 2 == 0 or abs(i - fx) < half * 0.6:
            cv.p(i, j, 'AM2', 0.10)
cv.tint_ellipse(fx + 0.5, GROUND + 6, 26, 6, C['AM2'], 0.4)

# auto abandonado lejano (silueta 50s redondeada) con puerta abierta
ax, ay = 226, GROUND + 19
cv.ellipse(ax + 16, ay + 4, 20, 3, 'SN0', 0.8)
car = [
    "..........OOOOOOOOOO..............",
    "........OONNNNNNNNNNOO............",
    ".......ONNWWWNNNWWWNNNO...........",
    "....OOONNNWWWNNNWWWNNNNOOOOO......",
    "..OONNNNNNNNNNNNNNNNNNNNNNNNNOO...",
    ".ONNNNNNNNNNNNNNNNNNNNNNNNNNNNNO..",
    "ONNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNO.",
    "ONNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNO.",
    ".OOOTTTOOOOOOOOOOOOOOOOOTTTOOOO...",
    "...OTTTO...............OTTTO......",
    "....OOO.................OOO.......",
]
for j, row in enumerate(car):
    for i, ch in enumerate(row):
        if ch == 'O': cv.p(ax + i, ay - 6 + j, 'N0')
        elif ch == 'N': cv.p(ax + i, ay - 6 + j, 'N1')
        elif ch == 'W': cv.p(ax + i, ay - 6 + j, 'N3')
        elif ch == 'T': cv.p(ax + i, ay - 6 + j, 'G1')
cv.hline(ax + 10, ax + 19, ay - 7, 'SN3', glow='cold')
cv.hline(ax + 3, ax + 28, ay - 3, 'SN2', glow='cold')
cv.hline(ax + 1, ax + 2, ay - 1, 'SN2', glow='cold')
# puerta abierta (hacia el espectador)
cv.rect(ax + 21, ay - 3, 3, 9, 'N0')
cv.rect(ax + 24, ay - 1, 6, 8, 'N1')
cv.frame(ax + 24, ay - 1, 6, 8, 'N0')
cv.hline(ax + 25, ax + 28, ay - 1, 'SN2', glow='cold')

# ---- nevada
snowfall(cv, 260, seed=5, region=(0, 0, 320, 180))
# rehacer el titulo para que la nieve no lo tape (solo relleno)
for (x, y) in pts:
    t = y / th
    col = 'SN4' if t < 0.25 else ('SN3' if t < 0.55 else ('SN2' if t < 0.85 else 'SN1'))
    if (x - 1, y) not in pset and (x, y - 1) not in pset:
        col = 'SN4'
    cv.p(tx + x, ty + y, col)
for (x, y) in pts:
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        if (x + dx, y + dy) not in pset:
            cv.p(tx + x + dx, ty + y + dy, 'OUT')
draw_text(cv, sx, sy, sub, 'AM3', scale=2, shadow='AM0', outline='OUT', glow='warm')

# vineta: oscurecer bordes 1-2px
for x in range(320):
    for y in (0, 179):
        cv.p(x, y, 'N0', 0.6)

cv.apply_glow()
cv.save('titulo')
print('ok')
