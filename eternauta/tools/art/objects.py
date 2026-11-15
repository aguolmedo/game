"""Objetos sueltos (muebles y props) con ancla abajo-centro.

Estilo: 3/4, tonos planos, sombras frias, 1-2 brillos calidos, contorno de
color y sombra suave pintada solo para los muebles de piso.
"""
from pixel import Pix, hx, mix, shade

# ------------------------------------------------------------------ paletas
WD = [hx('#3a2418'), hx('#5e3a24'), hx('#8a5a34'), hx('#b07c46')]
WD_HI = hx('#d6a066')
LW = [hx('#4a3420'), hx('#7a5834'), hx('#a8824e'), hx('#d0aa74')]
MT = [hx('#2a3242'), hx('#4a5668'), hx('#76869a'), hx('#a8b8c6')]
RD = [hx('#4a1c22'), hx('#6e2a32'), hx('#94404a'), hx('#b8605e')]
CR = [hx('#8a7a60'), hx('#c0ac88'), hx('#e0cca4'), hx('#fbf3dc')]
NG = [hx('#10162a'), hx('#1b2440'), hx('#2e3c5a')]
SN = [hx('#7896b0'), hx('#9fbfd4'), hx('#c8e2ee'), hx('#eefaff')]
GL = [hx('#7a3c18'), hx('#b87028'), hx('#ecab4c'), hx('#ffe8b0')]
BK = [hx('#14121c'), hx('#241f2e'), hx('#3a3444'), hx('#5a5468')]
BR = [hx('#5a3c1c'), hx('#9a7030'), hx('#d0a050'), hx('#f2d488')]
GR = [hx('#1e3a34'), hx('#2f5a4a'), hx('#4a8a6e'), hx('#86c898')]
LEATHER = [hx('#3a2018'), hx('#5e3424'), hx('#8a5034'), hx('#b06c44')]

# ------------------------------------------------------------------ helpers
def box(p, x, y, w, h, pal=WD, hi=True):
    p.rect(x, y, w, h, pal[2])
    if hi:
        p.hline(x, x + w - 1, y, pal[3])
    p.vline(x, y, y + h - 1, pal[3] if hi else pal[2])
    p.hline(x, x + w - 1, y + h - 1, pal[0])
    p.vline(x + w - 1, y, y + h - 1, pal[0])


def panel(p, x, y, w, h, pal=WD):
    p.rect(x + 1, y + 1, w - 2, h - 2, pal[1])
    p.hline(x, x + w - 1, y, pal[0])
    p.vline(x, y, y + h - 1, pal[0])
    p.hline(x, x + w - 1, y + h - 1, pal[3])
    p.vline(x + w - 1, y, y + h - 1, pal[3])


def shadow(p, cx, bottom, rx, ry=2, a=90):
    """Sombra suave azul-violacea bajo el mueble (solo pixeles vacios)."""
    for y in range(bottom - ry, bottom + ry + 1):
        for x in range(cx - rx, cx + rx + 1):
            d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - bottom) / ry) ** 2
            if d <= 1.0 and 0 <= x < p.w and 0 <= y < p.h:
                if p.get(x, y)[3] == 0:
                    p.set(x, y, (20, 16, 34), int(a * (1.0 - d * 0.45)))


def glow(p, cx, cy, rx, ry, c=(255, 200, 110), a=40):
    for y in range(int(cy - ry), int(cy + ry) + 1):
        for x in range(int(cx - rx), int(cx + rx) + 1):
            d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2
            if d <= 1.0 and 0 <= x < p.w and 0 <= y < p.h:
                if p.get(x, y)[3] == 0:
                    p.set(x, y, c, int(a * (1.0 - d * 0.5)))


def spill(p, cx, cy, rx, ry, col=(255, 190, 100), a=0.30):
    """Tine los pixeles ya opacos (derrame de luz sobre pared/piso)."""
    for y in range(int(cy - ry), int(cy + ry) + 1):
        for x in range(int(cx - rx), int(cx + rx) + 1):
            d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2
            if 0 <= d <= 1.0 and 0 <= x < p.w and 0 <= y < p.h:
                c = p.get(x, y)
                if c[3]:
                    p.set(x, y, mix(c[:3], col, a * (1.0 - d)))


def finish(p, sh=None, outline=True):
    if outline:
        p.outline(0.56, 0.20)
    if sh:
        shadow(p, *sh)
    return p


def wood_grain(p, x, y, w, h, pal=WD, step=5):
    for yy in range(y + step, y + h - 1, step + 2):
        p.hline(x + 1, x + w - 2, yy, pal[1])
    p.set(x + w // 2, y + h // 3, pal[1])


# ================================================================== ALTILLO
def table_truco():
    p = Pix(48, 32)
    # patas
    for lx in (4, 39):
        p.rect(lx, 24, 5, 8, WD[1])
        p.vline(lx + 1, 24, 31, WD[2])
        p.vline(lx + 4, 24, 31, WD[0])
    # faldon
    p.rect(2, 19, 44, 5, WD[1])
    p.hline(2, 45, 19, WD[0])
    p.hline(2, 45, 20, WD[2])
    p.hline(2, 45, 23, WD[0])
    # tapa
    p.rect(1, 8, 46, 12, WD[2])
    p.hline(1, 46, 8, WD_HI)
    p.hline(1, 46, 9, WD[3])
    p.hline(1, 46, 18, WD[1])
    p.hline(1, 46, 19, WD[0])
    for sx in (13, 25, 36):
        p.vline(sx, 9, 17, WD[1])
    p.set(8, 12, WD[1]); p.set(9, 12, WD[1]); p.set(31, 15, WD[1])
    # punos de las esquinas
    for cx, cy in ((2, 9), (45, 9), (2, 18), (45, 18)):
        p.set(cx, cy, WD[0])
    # paño de juego
    p.rect(7, 11, 23, 9, RD[1])
    p.hline(7, 29, 11, RD[2])
    p.hline(7, 29, 19, RD[0])
    p.hline(8, 28, 13, mix(RD[1], RD[3], 0.25))
    # naipes abanicados (separados por un pixel oscuro)
    for (cx, cy, s) in ((13, 13, 0), (18, 12, 1), (23, 14, 2)):
        p.rect(cx, cy, 4, 4, mix(CR[1], BK[0], 0.45))
        p.rect(cx, cy, 4, 3, CR[3])
        p.hline(cx, cx + 3, cy + 2, CR[1])
        p.set(cx + 1, cy + 1, RD[1] if s != 1 else BK[0])
        p.set(cx + 2, cy + 1, RD[0] if s != 1 else BK[0])
    # vaso
    p.rect(3, 13, 4, 5, CR[2])
    p.hline(3, 6, 13, CR[3])
    p.hline(3, 6, 17, CR[0])
    p.set(2, 14, CR[1])
    # botella
    p.rect(39, 6, 4, 10, GR[1])
    p.rect(40, 3, 2, 4, GR[0])
    p.rect(39, 2, 4, 1, GR[2])
    p.set(40, 1, BR[1]); p.set(41, 1, BR[1])
    p.set(39, 8, GR[2]); p.set(39, 9, GR[2])
    p.hline(39, 42, 15, GR[0])
    p.rect(38, 10, 6, 3, CR[1])
    p.set(40, 11, RD[1]); p.set(41, 11, RD[0])
    return finish(p, (24, 30, 22, 3))


def chair():
    p = Pix(16, 24)
    p.rect(2, 1, 2, 13, WD[1])
    p.rect(12, 1, 2, 13, WD[1])
    p.vline(2, 1, 13, WD[2])
    p.vline(12, 1, 13, WD[2])
    for yy in (2, 6, 10):
        p.rect(2, yy, 12, 2, WD[2])
        p.hline(2, 13, yy, WD[3])
        p.hline(2, 13, yy + 1, WD[0])
    for vx in (5, 8, 11):
        p.vline(vx, 3, 12, WD[1])
    p.rect(1, 13, 14, 4, WD[2])
    p.hline(1, 14, 13, WD[3])
    p.hline(1, 14, 16, WD[0])
    p.rect(2, 17, 2, 7, WD[1])
    p.rect(12, 17, 2, 7, WD[1])
    p.vline(3, 17, 23, WD[2])
    p.vline(13, 17, 23, WD[0])
    p.rect(3, 19, 10, 1, WD[1])
    return finish(p, (8, 23, 8, 2))


def chair_front():
    p = Pix(16, 24)
    for vx in (3, 6, 9, 12):
        p.vline(vx, 1, 11, WD[1])
        p.set(vx, 1, WD[2])
    p.rect(2, 4, 12, 2, WD[2])
    p.rect(2, 9, 12, 2, WD[2])
    p.hline(2, 13, 4, WD[3]); p.hline(2, 13, 5, WD[1])
    p.hline(2, 13, 9, WD[3]); p.hline(2, 13, 10, WD[1])
    p.rect(1, 12, 14, 5, WD[2])
    p.hline(1, 14, 12, WD[3])
    p.hline(1, 14, 15, WD[1])
    p.hline(2, 13, 16, WD[0])
    p.rect(2, 17, 2, 7, WD[1])
    p.rect(12, 17, 2, 7, WD[1])
    p.vline(3, 17, 23, WD[2])
    p.vline(13, 17, 23, WD[0])
    p.rect(4, 18, 8, 1, WD[0])
    return finish(p, (8, 23, 8, 2))


def shelf():
    p = Pix(48, 29)
    # estantes con escuadras
    for sy in (12, 25):
        p.rect(1, sy, 46, 2, WD[2])
        p.hline(1, 46, sy, WD[3])
        p.hline(1, 46, sy + 1, WD[0])
    for bx in (4, 41):
        p.rect(bx, 14, 2, 3, WD[1])
    # libros parados
    cols = [RD[1], GR[1], CR[1], BK[2], RD[2], BR[1]]
    x = 3
    for i, c in enumerate(cols):
        h = 7 + (i % 3)
        p.rect(x, 12 - h, 2, h, c)
        p.vline(x + 1, 12 - h, 11, mix(c, BK[0], 0.35))
        p.hline(x, x + 1, 12 - h + 1, mix(c, CR[3], 0.25))
        x += 3
    p.rect(21, 5, 4, 7, GR[1])            # frasco con tapa
    p.rect(21, 4, 4, 1, MT[2])
    p.set(22, 7, GR[3]); p.set(22, 8, GR[3])
    p.rect(26, 7, 3, 5, GL[1])            # frasquito miel
    p.rect(26, 6, 3, 1, WD[1])
    p.hline(28, 31, 11, WD[1]); p.hline(29, 31, 10, RD[1])
    p.rect(32, 8, 2, 4, CR[2])
    # estante bajo: caja, libros, violin
    p.rect(3, 18, 7, 6, BR[1])
    p.hline(3, 9, 18, BR[2]); p.hline(3, 9, 23, BR[0])
    p.rect(11, 20, 6, 4, CR[1])
    p.hline(11, 16, 20, CR[3]); p.hline(11, 16, 23, CR[0])
    p.rect(18, 19, 4, 5, GR[1])
    p.rect(18, 18, 4, 1, GR[0])
    p.set(19, 21, GR[3])
    # violin apoyado a la derecha
    p.rect(36, 16, 2, 9, LEATHER[2])
    p.rect(34, 18, 8, 7, LEATHER[2])
    p.set(34, 20, LEATHER[1]); p.set(41, 20, LEATHER[1])
    p.set(34, 22, LEATHER[1]); p.set(41, 22, LEATHER[1])
    p.vline(37, 17, 18, BK[0]); p.vline(38, 17, 18, BK[0])
    p.set(36, 21, LEATHER[3]); p.set(39, 21, LEATHER[3])
    p.set(37, 23, BK[0]); p.set(38, 23, BK[0])
    return finish(p)


def radio_cabinet():
    p = Pix(32, 24)
    for lx in (3, 27):
        p.rect(lx, 20, 2, 4, WD[1])
    box(p, 2, 12, 28, 9, WD)
    panel(p, 4, 13, 11, 7)
    panel(p, 17, 13, 11, 7)
    p.set(15, 15, BR[2]); p.set(16, 15, BR[2])
    p.set(15, 17, BR[1]); p.set(16, 17, BR[1])
    p.hline(2, 29, 11, WD[3])
    p.hline(2, 29, 12, WD[2])
    # radio a valvulas arriba
    box(p, 5, 2, 22, 9, LW)
    p.rect(7, 4, 9, 5, LW[0])
    for yy in (4, 6, 8):
        p.hline(7, 15, yy, LW[2])
    p.circle(20, 6, 3, BR[1])
    p.circle(20, 6, 2, GL[2])
    p.set(20, 6, GL[3])
    p.set(24, 4, BK[1]); p.set(24, 9, BK[1])
    p.set(23, 6, BR[1]); p.set(25, 6, BR[1])
    p.hline(6, 25, 3, LW[3])
    return finish(p, (16, 23, 14, 2))


def radio():
    p = Pix(16, 16)
    box(p, 1, 3, 14, 11, LW)
    p.rect(3, 5, 6, 7, LW[0])
    for yy in (5, 7, 9, 11):
        p.hline(3, 8, yy, LW[2])
    p.rect(10, 5, 4, 5, GL[1])
    p.hline(10, 13, 5, GL[2])
    p.set(11, 7, GL[3]); p.set(12, 7, GL[3])
    p.set(11, 8, GL[0]); p.set(12, 8, GL[0])
    p.set(10, 11, BR[2]); p.set(13, 11, BR[2])
    p.hline(2, 13, 4, LW[3])
    p.hline(2, 13, 13, LW[0])
    p.rect(2, 14, 2, 1, WD[1]); p.rect(12, 14, 2, 1, WD[1])
    return finish(p, (8, 15, 7, 1))


def window_glow():
    p = Pix(32, 32)
    p.rect(1, 1, 30, 27, WD[1])
    p.hline(1, 30, 1, WD[3])
    p.vline(1, 1, 27, WD[2])
    p.hline(1, 30, 27, WD[0])
    p.vline(30, 1, 27, WD[0])
    # vidrios con nieve que brilla
    for (gx, gy, gw, gh) in ((4, 4, 11, 9), (17, 4, 11, 9), (4, 16, 11, 8), (17, 16, 11, 8)):
        p.rect(gx, gy, gw, gh, SN[2])
        p.rect(gx, gy, gw, 3, SN[3])
        p.hline(gx, gx + gw - 1, gy + gh - 1, SN[1])
        p.set(gx + 2, gy + 4, SN[3]); p.set(gx + 6, gy + 2, SN[3])
        p.set(gx + 8, gy + 6, SN[0]); p.set(gx + 3, gy + 7, SN[3])
    # copos
    for (sx, sy) in ((7, 7), (20, 6), (24, 9), (9, 19), (21, 20), (26, 22)):
        p.set(sx, sy, SN[3])
    # silueta de techo lejano
    p.hline(5, 13, 12, SN[1]); p.hline(18, 26, 12, SN[1])
    p.hline(5, 13, 11, SN[0]); p.hline(18, 26, 11, SN[0])
    # marco central
    p.rect(15, 3, 2, 22, WD[2])
    p.hline(15, 16, 3, WD[3])
    p.rect(3, 14, 26, 2, WD[2])
    p.hline(3, 28, 14, WD[3])
    # alfeizar
    p.rect(0, 28, 32, 3, WD[2])
    p.hline(0, 31, 28, WD[3])
    p.hline(0, 31, 30, WD[0])
    return finish(p)


def hanging_lamp():
    p = Pix(16, 32)
    p.vline(8, 0, 6, BK[1])
    p.set(8, 0, BK[2])
    rows = [(4, 4), (3, 6), (2, 8), (1, 10), (0, 12)]
    for i, (x, w) in enumerate(rows):
        p.rect(x, 6 + i, w, 1, BR[2] if i < 3 else BR[1])
    for i, (x, w) in enumerate(rows):
        p.set(x, 6 + i, BR[3])
    p.hline(0, 11, 10, BR[0])
    p.hline(1, 10, 11, GL[3])
    p.hline(2, 9, 12, GL[2])
    p.set(7, 13, GL[3]); p.set(8, 13, GL[3])
    finish(p)
    glow(p, 8, 18, 6, 8, (255, 214, 140), 20)
    glow(p, 8, 29, 7, 3, (255, 200, 110), 32)
    return p


def coat_stand():
    p = Pix(16, 40)
    p.rect(7, 4, 2, 34, WD[1])
    p.vline(8, 4, 37, WD[2])
    p.rect(7, 2, 2, 2, WD[2])
    # base
    for (ax, ay) in ((2, 39), (7, 39), (13, 39)):
        p.set(ax, ay, WD[1])
    p.hline(3, 12, 38, WD[1])
    p.hline(2, 13, 37, WD[2])
    p.hline(2, 13, 39, WD[0])
    # ganchos
    p.hline(4, 7, 8, MT[1]); p.hline(8, 11, 10, MT[1])
    # sombrero colgado a la izquierda
    p.rect(1, 9, 6, 1, BK[2])
    p.rect(2, 5, 4, 4, BK[2])
    p.hline(2, 5, 5, BK[3])
    p.rect(1, 6, 6, 1, BK[1])
    # abrigo largo
    p.rect(1, 13, 6, 19, LEATHER[1])
    p.rect(1, 13, 6, 3, LEATHER[2])
    p.set(2, 17, BR[1]); p.set(2, 21, BR[1]); p.set(2, 25, BR[1])
    p.vline(4, 15, 30, LEATHER[0])
    p.hline(1, 6, 31, LEATHER[0])
    p.set(1, 14, LEATHER[3])
    # tapado gris a la derecha
    p.rect(10, 12, 5, 17, MT[1])
    p.rect(10, 12, 5, 3, MT[2])
    p.vline(13, 14, 27, MT[0])
    p.hline(10, 14, 28, MT[0])
    p.set(10, 13, MT[3]); p.set(11, 13, MT[3])
    return finish(p, (8, 39, 6, 2))


def crate():
    p = Pix(16, 16)
    box(p, 1, 3, 14, 13, WD)
    p.hline(1, 14, 3, WD_HI)
    p.rect(1, 4, 14, 2, WD[2])
    p.hline(2, 13, 6, WD[1])
    p.hline(2, 13, 10, WD[1])
    for i in range(9):
        p.set(3 + i, 5 + i, WD[0])
        p.set(12 - i, 5 + i, WD[0])
    p.set(4, 6, WD[0]); p.set(11, 12, WD[0])
    p.set(7, 4, WD[3]); p.set(8, 4, WD[1])
    return finish(p, (8, 15, 7, 2))


def cardboard_box():
    p = Pix(16, 16)
    c = [hx('#4a341c'), hx('#6e5030'), hx('#96703e'), hx('#b8905a')]
    box(p, 1, 4, 14, 11, c, hi=False)
    p.hline(1, 14, 4, c[2])
    p.hline(1, 14, 5, c[0])
    p.vline(8, 4, 14, c[1])
    p.rect(2, 5, 5, 2, c[2])
    p.rect(9, 5, 5, 2, c[2])
    p.hline(2, 6, 6, c[0]); p.hline(9, 13, 6, c[0])
    p.rect(5, 9, 6, 4, CR[2])
    p.hline(5, 10, 9, CR[0])
    p.set(6, 11, CR[1]); p.set(7, 11, CR[1])
    p.set(2, 14, c[0])
    return finish(p, (8, 15, 7, 2))


def suitcase():
    p = Pix(16, 16)
    p.rect(5, 2, 6, 1, LEATHER[0])
    p.vline(5, 3, 5, LEATHER[0]); p.vline(10, 3, 5, LEATHER[0])
    p.rect(4, 5, 8, 2, LEATHER[0])
    box(p, 1, 6, 14, 8, LEATHER)
    p.hline(2, 13, 9, LEATHER[1])
    p.hline(2, 13, 13, LEATHER[0])
    p.rect(3, 7, 2, 1, BR[2]); p.rect(11, 7, 2, 1, BR[2])
    p.set(3, 8, BR[1]); p.set(11, 8, BR[1])
    for x in range(3, 13, 2):
        p.set(x, 12, LEATHER[3])
    p.set(2, 7, LEATHER[3]); p.set(13, 7, LEATHER[3])
    return finish(p, (8, 14, 7, 2))


def tool_table():
    p = Pix(48, 32)
    for lx in (3, 41):
        p.rect(lx, 20, 4, 12, WD[1])
        p.vline(lx + 1, 20, 31, WD[2])
        p.vline(lx + 3, 20, 31, WD[0])
    p.rect(2, 17, 44, 4, WD[1])
    p.hline(2, 45, 17, WD[2]); p.hline(2, 45, 20, WD[0])
    p.rect(1, 8, 46, 10, WD[2])
    p.hline(1, 46, 8, WD_HI)
    p.hline(1, 46, 9, WD[3])
    p.hline(1, 46, 17, WD[0])
    p.vline(15, 9, 16, WD[1]); p.vline(31, 9, 16, WD[1])
    # mordaza a la izquierda
    p.rect(2, 7, 5, 3, MT[1])
    p.rect(2, 10, 5, 2, MT[0])
    p.set(3, 8, MT[3]); p.set(5, 8, MT[3])
    # martillo
    p.rect(10, 4, 2, 8, WD[1])
    p.rect(8, 3, 6, 2, MT[1])
    p.hline(8, 13, 3, MT[3])
    # tela / trapo
    p.rect(19, 10, 12, 7, CR[1])
    p.hline(19, 30, 10, CR[3])
    p.hline(19, 30, 16, CR[0])
    p.vline(24, 11, 15, CR[0])
    p.set(21, 12, CR[2]); p.set(27, 13, CR[2])
    # tiras de goma enrolladas
    p.circle(36, 13, 4, BK[1])
    p.circle(36, 13, 3, BK[0])
    p.circle(36, 13, 2, BK[1])
    p.set(36, 13, BK[2])
    p.set(34, 14, BK[2]); p.set(38, 12, BK[2])
    # tijeras
    p.set(33, 6, MT[2]); p.set(34, 7, MT[2]); p.set(35, 8, MT[2]); p.set(36, 9, MT[1])
    p.set(36, 6, MT[2]); p.set(35, 7, MT[2]); p.set(34, 8, MT[2]); p.set(33, 9, MT[1])
    p.set(32, 5, MT[1]); p.set(37, 5, MT[1])
    p.set(32, 4, MT[0]); p.set(37, 4, MT[0])
    return finish(p, (24, 31, 22, 3))


def violin_bench():
    p = Pix(32, 24)
    for lx in (3, 27):
        p.rect(lx, 16, 2, 8, WD[1])
        p.vline(lx, 16, 23, WD[2])
    p.rect(2, 20, 28, 1, WD[1])
    p.rect(1, 12, 30, 4, WD[2])
    p.hline(1, 30, 12, WD_HI)
    p.hline(1, 30, 15, WD[0])
    p.hline(2, 29, 16, WD[0])
    # violin en partes
    p.rect(3, 5, 9, 6, LEATHER[2])
    p.set(3, 6, LEATHER[1]); p.set(11, 6, LEATHER[1])
    p.set(3, 9, LEATHER[1]); p.set(11, 9, LEATHER[1])
    p.hline(4, 10, 7, LEATHER[3])
    p.set(5, 7, LEATHER[0]); p.set(9, 7, LEATHER[0])
    p.hline(12, 16, 6, LEATHER[0])
    p.set(17, 5, LEATHER[1]); p.set(17, 6, LEATHER[1])
    p.vline(7, 11, 11, LEATHER[0])
    # piezas sueltas
    p.hline(20, 26, 10, LEATHER[2])
    p.set(26, 9, LEATHER[1])
    p.rect(21, 8, 2, 2, BK[0])
    p.rect(24, 6, 4, 1, MT[2])
    p.set(23, 7, MT[1])
    # virutas
    p.set(18, 13, LEATHER[3]); p.set(19, 14, LEATHER[3])
    p.set(14, 10, LEATHER[3])
    return finish(p, (16, 23, 13, 2))


def air_tank():
    p = Pix(16, 24)
    p.rect(5, 6, 7, 15, GR[1])
    p.rect(5, 5, 7, 1, GR[2])
    p.set(5, 4, GR[2]); p.set(11, 4, GR[2])
    p.hline(5, 11, 20, GR[0])
    p.rect(4, 20, 9, 3, GR[0])
    p.vline(6, 7, 19, GR[2])
    p.vline(10, 7, 19, GR[0])
    p.rect(4, 12, 9, 2, CR[1])
    p.set(6, 12, CR[2])
    # valvula
    p.rect(7, 1, 3, 4, MT[1])
    p.rect(6, 1, 5, 1, BR[1])
    p.set(8, 0, MT[2])
    p.hline(9, 13, 6, BK[1])
    p.set(13, 7, BK[1]); p.set(13, 8, BK[1])
    return finish(p, (8, 23, 6, 2))


def _stairwell(up=False):
    p = Pix(32, 32)
    p.rect(0, 0, 32, 32, WD[1])
    p.hline(0, 31, 0, WD[2]); p.vline(0, 0, 31, WD[2])
    p.hline(0, 31, 31, WD[0]); p.vline(31, 0, 31, WD[0])
    p.hline(0, 31, 1, WD[2]); p.hline(0, 31, 30, WD[0])
    def bounds(y):
        t = (y - 4) / 25.0
        return int(round(10 - 6 * t)), int(round(21 + 6 * t))
    # hueco y paredes laterales en perspectiva
    for y in range(4, 30):
        lx, rx = bounds(y)
        p.hline(lx, rx, y, hx('#120c16'))
        p.hline(lx - 2, lx - 1, y, mix(WD[1], WD[0], 0.25))
        p.hline(rx + 1, rx + 2, y, mix(WD[1], WD[0], 0.45))
        p.set(lx - 3, y, WD[0]); p.set(rx + 3, y, WD[0])
    faces = ['#9a6c40', '#8a5e36', '#7a5230', '#6a4628', '#5a3a22', '#4a2e1c']
    if up:
        faces = ['#b88450', '#a87444', '#966438', '#845630', '#724a28', '#604020']
    for i in range(6):
        y = 28 - i * 4
        lx, rx = bounds(y)
        c = hx(faces[i])
        p.rect(lx, y - 3, rx - lx + 1, 3, c)
        p.hline(lx, rx, y - 3, mix(c, (240, 210, 160), 0.45))
        p.hline(lx, rx, y - 2, mix(c, (240, 210, 160), 0.12))
        p.hline(lx, rx, y, mix(c, (16, 10, 20), 0.55))
    if up:
        lx, rx = bounds(5)
        p.rect(lx, 3, rx - lx + 1, 3, mix(GL[0], BK[0], 0.35))
        p.hline(lx + 1, rx - 1, 4, GL[2])
        p.hline(lx + 2, rx - 2, 5, GL[3])
    else:
        p.rect(5, 25, 22, 4, hx('#0c080e'))
        p.hline(6, 25, 25, hx('#24141e'))
    # baranda izquierda
    for i in range(8):
        x = 5 + i // 3
        y = 27 - i * 3
        p.set(x, y, WD[3]); p.set(x, y + 1, WD[0])
    p.set(5, 28, WD[1]); p.set(5, 29, WD[0])
    return finish(p)


def stairs_up():
    return _stairwell(True)


def stairs_down():
    return _stairwell(False)


def door():
    p = Pix(16, 32)
    p.rect(0, 0, 16, 32, WD[1])
    p.hline(0, 15, 0, WD[3])
    p.rect(2, 2, 12, 29, WD[2])
    p.vline(14, 2, 30, WD[0]); p.hline(2, 13, 31, WD[0])
    panel(p, 4, 5, 8, 9)
    panel(p, 4, 16, 8, 11)
    p.set(11, 17, BR[2]); p.set(11, 18, BR[1])
    p.rect(2, 7, 1, 3, MT[1]); p.rect(2, 22, 1, 3, MT[1])
    p.hline(0, 15, 1, WD[3])
    return finish(p)


def speaker():
    p = Pix(16, 24)
    p.ellipse(8, 8, 7, 7, BK[1])
    p.circle(8, 8, 6, BK[2])
    p.circle(8, 8, 4, BK[1])
    p.circle(8, 8, 2, BK[0])
    p.set(5, 5, BK[3]); p.set(6, 5, BK[3]); p.set(5, 6, BK[3])
    p.set(8, 8, BK[3])
    p.rect(7, 15, 2, 6, MT[1])
    p.rect(5, 21, 6, 3, MT[1])
    p.hline(5, 10, 21, MT[2]); p.hline(5, 10, 23, MT[0])
    return finish(p, (8, 23, 7, 2))


# ------------------------------------------------------------ props chicos
def book():
    p = Pix(8, 8)
    p.rect(1, 1, 6, 6, RD[1])
    p.rect(1, 1, 6, 1, RD[2])
    p.vline(2, 2, 6, RD[0])
    p.rect(2, 2, 5, 5, CR[2])
    p.hline(3, 6, 2, CR[3]); p.hline(3, 6, 6, CR[0])
    p.hline(4, 6, 4, CR[1])
    p.set(1, 2, RD[2]); p.set(1, 6, RD[0])
    return finish(p)


def bottle():
    p = Pix(8, 16)
    p.rect(2, 5, 4, 10, GR[1])
    p.rect(3, 2, 2, 3, GR[1])
    p.rect(3, 1, 2, 1, BR[1])
    p.vline(2, 6, 14, GR[2])
    p.vline(5, 6, 14, GR[0])
    p.rect(2, 4, 4, 1, GR[0])
    p.rect(2, 8, 4, 3, CR[1])
    p.set(3, 9, RD[1])
    return finish(p)


def jar():
    p = Pix(8, 8)
    p.rect(1, 2, 6, 5, CR[2])
    p.rect(2, 3, 4, 4, GL[1])
    p.rect(1, 1, 6, 1, MT[1])
    p.set(2, 4, GL[3]); p.set(3, 4, GL[3])
    p.set(3, 5, GL[2]); p.set(4, 5, GL[2])
    p.vline(6, 3, 6, CR[0])
    p.hline(2, 5, 6, CR[1])
    return finish(p)


def cards():
    p = Pix(8, 8)
    for (cx, cy) in ((1, 2), (3, 1), (2, 4)):
        p.rect(cx, cy, 4, 3, CR[3])
        p.hline(cx, cx + 3, cy + 2, CR[1])
        p.set(cx + 1, cy + 1, RD[1] if (cx + cy) % 2 else BK[0])
    return finish(p)


def cup():
    p = Pix(8, 8)
    p.rect(1, 2, 5, 4, CR[2])
    p.hline(1, 5, 2, CR[3])
    p.hline(1, 5, 5, CR[0])
    p.vline(5, 3, 4, CR[1])
    p.set(6, 3, CR[1]); p.set(6, 4, CR[1])
    p.hline(2, 4, 3, hx('#6a4a2a'))
    p.hline(1, 5, 6, CR[0])
    return finish(p)


def violin():
    p = Pix(16, 8)
    p.rect(1, 2, 8, 5, LEATHER[2])
    p.set(1, 3, LEATHER[1]); p.set(8, 3, LEATHER[1])
    p.set(1, 5, LEATHER[1]); p.set(8, 5, LEATHER[1])
    p.hline(2, 7, 4, LEATHER[3])
    p.set(2, 3, BK[0]); p.set(6, 3, BK[0])
    p.hline(9, 13, 3, LEATHER[1])
    p.hline(9, 13, 4, LEATHER[1])
    p.set(14, 2, LEATHER[2]); p.set(14, 3, LEATHER[2])
    p.set(5, 4, BK[0]); p.set(4, 4, MT[2]); p.set(6, 4, MT[2])
    return finish(p)


def tools():
    p = Pix(8, 8)
    p.set(1, 5, MT[1]); p.set(2, 4, MT[2]); p.set(3, 3, MT[2]); p.set(4, 2, MT[1])
    p.set(1, 3, WD[1]); p.set(2, 4, WD[1])
    p.set(6, 2, MT[2]); p.set(5, 3, MT[1]); p.set(4, 4, MT[1]); p.set(3, 5, MT[0])
    p.set(6, 5, BR[1]); p.set(5, 5, BR[1])
    p.set(1, 1, MT[2]); p.set(2, 2, MT[2])
    return finish(p)


def rag():
    p = Pix(8, 8)
    p.rect(1, 2, 6, 4, CR[1])
    p.set(0, 3, CR[1]); p.set(7, 4, CR[1])
    p.hline(1, 6, 2, CR[2])
    p.hline(1, 6, 5, CR[0])
    p.set(2, 3, CR[2]); p.set(4, 4, CR[0]); p.set(5, 3, CR[0])
    p.set(1, 6, CR[0])
    return finish(p)


# ================================================================== CASA
def sofa():
    p = Pix(48, 24)
    for lx in (5, 41):
        p.rect(lx, 21, 3, 3, WD[0])
    p.rect(2, 16, 44, 6, RD[1])
    p.hline(2, 45, 16, RD[2])
    p.hline(2, 45, 21, RD[0])
    p.rect(4, 10, 40, 7, RD[1])
    def seat(x, w):
        p.rect(x, 10, w, 6, RD[2])
        p.hline(x, x + w - 1, 10, RD[3])
        p.hline(x, x + w - 1, 15, RD[1])
        p.vline(x, 11, 14, RD[1])
        p.vline(x + w - 1, 11, 14, RD[1])
        p.set(x + 2, 13, RD[3])
    seat(6, 17)
    seat(25, 17)
    p.rect(3, 2, 42, 9, RD[1])
    p.hline(3, 44, 2, RD[3])
    p.hline(3, 44, 3, RD[2])
    p.hline(3, 44, 10, RD[0])
    p.vline(23, 3, 9, RD[0]); p.vline(24, 3, 9, RD[0])
    p.hline(4, 22, 4, RD[2]); p.hline(25, 43, 4, RD[2])
    p.rect(1, 7, 5, 13, RD[1])
    p.rect(42, 7, 5, 13, RD[1])
    p.vline(1, 8, 18, RD[2]); p.vline(46, 8, 18, RD[0])
    p.hline(1, 5, 7, RD[2]); p.hline(42, 46, 7, RD[2])
    p.set(2, 8, RD[3]); p.set(43, 8, RD[3])
    return finish(p, (24, 23, 22, 3))


def armchair():
    p = Pix(16, 24)
    p.rect(3, 21, 2, 3, WD[0]); p.rect(11, 21, 2, 3, WD[0])
    p.rect(2, 17, 12, 4, RD[1])
    p.rect(3, 12, 10, 5, RD[2])
    p.hline(3, 12, 12, RD[3])
    p.hline(3, 12, 16, RD[1])
    p.rect(2, 2, 12, 11, RD[1])
    p.hline(2, 13, 2, RD[3])
    p.hline(2, 13, 3, RD[2])
    p.vline(7, 3, 11, RD[0]); p.vline(8, 3, 11, RD[0])
    p.rect(1, 8, 3, 12, RD[1])
    p.rect(12, 8, 3, 12, RD[1])
    p.vline(1, 9, 18, RD[2]); p.vline(14, 9, 18, RD[0])
    p.hline(1, 3, 8, RD[2]); p.hline(12, 14, 8, RD[2])
    p.set(2, 9, RD[3])
    return finish(p, (8, 23, 7, 2))


def living_table():
    p = Pix(32, 24)
    for lx in (3, 26):
        p.rect(lx, 16, 3, 8, WD[1])
        p.vline(lx + 1, 16, 23, WD[2])
        p.vline(lx + 2, 16, 23, WD[0])
    p.rect(2, 13, 28, 4, WD[1])
    p.hline(2, 29, 13, WD[2]); p.hline(2, 29, 16, WD[0])
    p.rect(1, 7, 30, 7, WD[2])
    p.hline(1, 30, 7, WD_HI)
    p.hline(1, 30, 8, WD[3])
    p.hline(1, 30, 13, WD[1])
    p.hline(1, 30, 14, WD[0])
    p.vline(16, 9, 12, WD[1])
    p.set(2, 8, WD[0]); p.set(29, 8, WD[0])
    # revista y cenicero
    p.rect(5, 9, 8, 4, CR[2])
    p.rect(5, 9, 8, 1, CR[3])
    p.hline(5, 12, 12, CR[0])
    p.set(7, 10, RD[1]); p.set(8, 10, RD[1])
    p.circle(18, 11, 2, BK[2])
    p.set(18, 11, BK[0]); p.set(19, 10, CR[2])
    p.set(20, 10, CR[1]); p.set(21, 11, CR[1])
    return finish(p, (16, 23, 14, 3))


def oil_lamp():
    p = Pix(8, 12)
    p.rect(1, 9, 6, 3, BR[1])
    p.hline(1, 6, 9, BR[2]); p.hline(1, 6, 11, BR[0])
    p.rect(2, 8, 4, 1, BR[0])
    p.rect(2, 4, 4, 4, hx('#b8dce8'))
    p.vline(2, 4, 7, hx('#e0f4fa'))
    p.vline(5, 4, 7, hx('#7aa8bc'))
    p.rect(3, 6, 2, 2, GL[3])
    p.set(3, 7, GL[2]); p.set(4, 6, GL[3])
    p.rect(3, 3, 2, 1, BR[1])
    p.hline(1, 6, 4, hx('#7aa8bc'))
    finish(p)
    glow(p, 4, 6, 4, 4, (255, 220, 150), 40)
    return p


def wardrobe():
    p = Pix(32, 32)
    p.rect(2, 2, 28, 28, WD[1])
    p.hline(2, 29, 2, WD[3]); p.hline(2, 29, 3, WD[2])
    p.hline(0, 31, 0, WD[2]); p.rect(0, 0, 32, 2, WD[1])
    p.vline(1, 0, 30, WD[1]); p.vline(30, 0, 30, WD[0])
    p.vline(2, 4, 29, WD[2]); p.vline(29, 4, 29, WD[0])
    p.rect(4, 5, 11, 22, WD[1])
    p.rect(17, 5, 11, 22, WD[1])
    panel(p, 5, 6, 9, 20)
    panel(p, 18, 6, 9, 20)
    p.vline(15, 4, 28, WD[0]); p.vline(16, 4, 28, WD[0])
    p.set(14, 16, BR[2]); p.set(17, 16, BR[2])
    p.set(14, 17, BR[1]); p.set(17, 17, BR[1])
    p.rect(3, 28, 26, 2, WD[1])
    p.hline(3, 28, 28, WD[2]); p.hline(3, 28, 29, WD[0])
    p.rect(4, 30, 3, 2, WD[0]); p.rect(25, 30, 3, 2, WD[0])
    return finish(p, (16, 31, 14, 2))


def exit_door():
    p = Pix(32, 32)
    p.rect(0, 0, 32, 32, WD[1])
    p.hline(0, 31, 0, WD[3]); p.hline(0, 31, 1, WD[2])
    p.vline(0, 0, 31, WD[2]); p.vline(31, 0, 31, WD[0])
    p.rect(2, 2, 28, 29, WD[0])
    p.rect(3, 3, 12, 28, WD[1])
    p.rect(17, 3, 12, 28, WD[1])
    for x in (3, 17):
        panel(p, x + 1, 5, 10, 10)
        panel(p, x + 1, 17, 10, 11)
    p.vline(15, 3, 30, WD[0]); p.vline(16, 3, 30, WD[0])
    # picaportes redondos
    p.circle(14, 16, 1, BR[2]); p.set(14, 16, BR[3])
    p.circle(17, 16, 1, BR[2]); p.set(17, 16, BR[3])
    p.set(13, 15, BR[1]); p.set(18, 15, BR[1])
    # buzón
    p.rect(13, 12, 6, 1, MT[0])
    p.hline(0, 31, 30, WD[0])
    return finish(p)


def garage_shelf():
    p = Pix(48, 32)
    for sx in (1, 44):
        p.rect(sx, 2, 3, 30, MT[1])
        p.vline(sx, 2, 31, MT[2])
        p.vline(sx + 2, 2, 31, MT[0])
    for sy in (11, 23, 31):
        p.rect(1, sy, 46, 2, MT[1])
        p.hline(1, 46, sy, MT[2])
        p.hline(1, 46, sy + 1, MT[0])
    # estante alto: latas y frascos
    cans = [(GL[1], 4), (RD[1], 9), (GR[1], 14), (CR[1], 19), (GL[2], 25), (RD[2], 31), (GR[2], 37)]
    for c, x in cans:
        p.rect(x, 6, 4, 5, c)
        p.hline(x, x + 3, 6, mix(c, (255, 255, 255), 0.25))
        p.hline(x, x + 3, 7, mix(c, (20, 16, 34), 0.35))
        p.hline(x, x + 3, 10, mix(c, (20, 16, 34), 0.5))
    # estante medio: frascos
    for x, c in ((4, GR[1]), (10, GL[1]), (16, RD[1]), (22, GR[2]), (28, CR[1])):
        p.rect(x, 16, 5, 7, c)
        p.hline(x, x + 4, 16, mix(c, (255, 255, 255), 0.3))
        p.rect(x, 15, 5, 1, MT[1])
        p.set(x + 1, 18, mix(c, (255, 255, 255), 0.4))
    p.rect(35, 17, 4, 6, GL[1]); p.rect(36, 15, 2, 2, GL[0])
    p.rect(41, 16, 3, 7, BK[1])
    # estante bajo: cajas y botellas
    p.rect(4, 27, 9, 4, BR[1]); p.hline(4, 12, 27, BR[2])
    p.rect(15, 26, 6, 5, CR[1]); p.hline(15, 20, 26, CR[2])
    p.rect(25, 26, 3, 5, GR[1]); p.rect(26, 24, 1, 2, GR[0])
    p.rect(31, 26, 3, 5, RD[1]); p.rect(32, 24, 1, 2, RD[0])
    p.rect(38, 27, 7, 4, MT[1]); p.hline(38, 44, 27, MT[2])
    return finish(p)


def workbench():
    p = Pix(48, 32)
    for lx in (3, 41):
        p.rect(lx, 18, 3, 14, MT[1])
        p.vline(lx, 18, 31, MT[2])
        p.vline(lx + 2, 18, 31, MT[0])
    p.rect(2, 14, 44, 3, MT[0])
    p.rect(4, 24, 40, 2, MT[1])
    p.hline(4, 43, 24, MT[2])
    p.rect(1, 9, 46, 5, MT[1])
    p.hline(1, 46, 9, MT[3])
    p.hline(1, 46, 10, MT[2])
    p.hline(1, 46, 13, MT[0])
    p.vline(24, 10, 13, MT[0])
    # extractor de aire: caja metalica con aspas
    p.rect(33, 1, 12, 9, MT[1])
    p.hline(33, 44, 1, MT[3]); p.vline(33, 1, 9, MT[2])
    p.vline(44, 1, 9, MT[0]); p.hline(33, 44, 9, MT[0])
    p.circle(39, 5, 3, MT[0])
    p.circle(39, 5, 2, MT[2])
    p.set(39, 4, MT[3]); p.set(40, 5, MT[3]); p.set(38, 6, MT[1]); p.set(39, 6, MT[1])
    p.set(39, 5, MT[0])
    p.vline(39, 10, 13, MT[0])
    # secador de Elena sobre la mesa
    p.rect(6, 4, 6, 4, CR[2])
    p.rect(6, 4, 6, 1, CR[3])
    p.rect(12, 5, 3, 2, MT[2])
    p.set(15, 5, MT[3]); p.set(15, 6, MT[1])
    p.rect(7, 8, 2, 1, CR[1])
    p.set(7, 9, BK[1]); p.set(8, 10, BK[1]); p.set(9, 11, BK[1])
    p.set(10, 12, BK[1]); p.set(11, 13, BK[1]); p.set(13, 13, BK[1])
    # herramientas colgadas
    p.vline(27, 4, 8, WD[1]); p.rect(25, 3, 5, 2, MT[1]); p.hline(25, 29, 3, MT[3])
    p.vline(30, 4, 8, MT[1]); p.set(30, 3, MT[2])
    # lata de cemento con pincel
    p.rect(16, 10, 5, 3, MT[1])
    p.hline(16, 20, 10, MT[2])
    p.set(18, 9, WD[1]); p.set(18, 8, WD[1]); p.set(18, 7, WD[0])
    return finish(p, (24, 31, 23, 3))


def tire():
    p = Pix(16, 16)
    p.ellipse(8, 9, 7, 6, BK[0])
    p.ellipse(8, 9, 6, 5, BK[1])
    p.ellipse(8, 9, 3, 2, BK[0])
    p.set(8, 8, BK[3])
    for dx in (-5, -4, 4, 5):
        p.set(8 + dx, 9, BK[2])
    p.set(4, 6, BK[3]); p.set(5, 5, BK[3])
    for x in range(3, 14):
        d = 1.0 - ((x + 0.5 - 8) / 6.6) ** 2
        if d > 0:
            ty = int(round(9 - 5.2 * d ** 0.5))
            p.set(x, ty, SN[2])
            if x % 3:
                p.set(x, ty + 1, SN[1])
    p.set(2, 12, BK[0])
    return finish(p, (8, 15, 7, 2))


def bucket():
    p = Pix(8, 8)
    p.rect(1, 3, 6, 4, MT[1])
    p.rect(2, 7, 4, 1, MT[1])
    p.hline(1, 6, 3, MT[2])
    p.hline(1, 6, 6, MT[0])
    p.vline(1, 4, 6, MT[0]); p.vline(6, 4, 6, MT[0])
    p.set(2, 4, MT[3]); p.set(3, 4, MT[3])
    p.set(2, 2, MT[1]); p.set(3, 1, MT[1]); p.set(4, 1, MT[1]); p.set(5, 2, MT[1])
    return finish(p)


def hose():
    p = Pix(16, 16)
    p.circle(8, 8, 6, BK[1])
    p.circle(8, 8, 5, BK[0])
    p.circle(8, 8, 4, BK[1])
    p.circle(8, 8, 3, BK[0])
    p.circle(8, 8, 2, BK[1])
    p.circle(8, 8, 1, BK[0])
    p.set(8, 8, BK[1])
    p.set(4, 5, BK[2]); p.set(5, 4, BK[2]); p.set(6, 4, BK[2])
    p.set(11, 9, BK[2])
    p.rect(11, 1, 2, 2, MT[1])
    p.set(11, 0, MT[2])
    return finish(p)


def cans():
    p = Pix(8, 8)
    for x, c in ((1, RD[1]), (4, GR[1])):
        p.rect(x, 2, 3, 5, c)
        p.hline(x, x + 2, 2, MT[2])
        p.hline(x, x + 2, 3, mix(c, (255, 255, 255), 0.3))
        p.hline(x, x + 2, 6, mix(c, (20, 16, 34), 0.4))
    p.set(2, 4, CR[3]); p.set(5, 5, CR[3])
    return finish(p)


def cot():
    p = Pix(32, 16)
    p.rect(1, 3, 30, 2, MT[1])
    p.rect(1, 5, 30, 7, CR[1])
    p.hline(1, 30, 5, CR[3])
    p.rect(2, 6, 26, 5, hx('#3f5a6e'))
    p.hline(2, 27, 6, hx('#5a7a8e'))
    p.hline(2, 27, 10, hx('#2a3e4e'))
    p.rect(4, 5, 7, 4, CR[3])
    p.hline(4, 10, 8, CR[0])
    p.rect(22, 6, 8, 5, hx('#7a4a54'))
    p.hline(22, 29, 6, hx('#96606a'))
    p.hline(22, 29, 10, hx('#5a3440'))
    p.vline(1, 5, 12, MT[1]); p.vline(30, 5, 12, MT[0])
    p.rect(2, 12, 2, 3, MT[1]); p.rect(28, 12, 2, 3, MT[1])
    p.hline(1, 30, 12, MT[0])
    p.rect(12, 12, 8, 1, MT[1])
    return finish(p, (16, 15, 15, 2))


def stove():
    p = Pix(16, 24)
    p.rect(1, 5, 14, 16, hx('#4a4a56'))
    p.hline(1, 14, 5, hx('#6a6a78'))
    p.vline(1, 5, 20, hx('#5e5e6c'))
    p.vline(14, 5, 20, hx('#33333c'))
    p.rect(1, 4, 14, 2, hx('#2e2e36'))
    p.circle(5, 4, 1, hx('#1e1e26'))
    p.circle(11, 4, 1, hx('#1e1e26'))
    p.hline(1, 14, 3, hx('#4a4a56'))
    # pava
    p.rect(7, 0, 5, 3, BK[2])
    p.rect(8, 3, 3, 1, BK[1])
    p.set(12, 1, BK[1]); p.set(13, 0, BK[1])
    p.set(7, 0, BK[3]); p.set(8, 0, BK[3])
    # puerta horno
    p.rect(3, 10, 10, 8, hx('#3a3a44'))
    p.hline(3, 12, 10, hx('#1e1e26'))
    p.rect(4, 12, 8, 5, hx('#2a2a32'))
    p.hline(4, 11, 12, GL[1])
    p.hline(4, 11, 13, GL[0])
    p.rect(4, 11, 8, 1, MT[2])
    p.rect(2, 21, 2, 3, hx('#2e2e36')); p.rect(12, 21, 2, 3, hx('#2e2e36'))
    p.hline(1, 14, 20, hx('#26262e'))
    return finish(p, (8, 23, 7, 2))


# ================================================================== CALLE
FONT = {
    'A': ('010', '101', '111', '101', '101'),
    'C': ('011', '100', '100', '100', '011'),
    'E': ('111', '100', '110', '100', '111'),
    'F': ('111', '100', '110', '100', '100'),
    'I': ('111', '010', '010', '010', '111'),
    'L': ('100', '100', '100', '100', '111'),
    'M': ('101', '111', '111', '101', '101'),
    'N': ('101', '111', '111', '111', '101'),
    'R': ('110', '101', '110', '101', '101'),
    'T': ('111', '010', '010', '010', '010'),
    '0': ('111', '101', '101', '101', '111'),
    '1': ('010', '110', '010', '010', '111'),
}


def line(p, x0, y0, x1, y1, c):
    dx, dy = abs(x1 - x0), abs(y1 - y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx - dy
    while True:
        p.set(x0, y0, c)
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 > -dy:
            err -= dy; x0 += sx
        if e2 < dx:
            err += dx; y0 += sy


def text(p, x, y, s, c, scale=1):
    for ch in s.upper():
        g = FONT.get(ch)
        if g:
            for j, row in enumerate(g):
                for i, bit in enumerate(row):
                    if bit == '1':
                        p.rect(x + i * scale, y + j * scale, scale, scale, c)
        x += 4 * scale


# ------------------------------------------------------------- casas
def _window(p, x, y, w, h, lit=False, shutters=True):
    frame = hx('#2e2234'); trim = hx('#6a5a64')
    p.rect(x - 1, y - 1, w + 2, h + 2, frame)
    p.hline(x - 1, x + w, y - 1, trim)
    p.vline(x - 1, y - 1, y + h, trim)
    if lit:
        p.rect(x, y, w, h, GL[1])
        p.rect(x + 1, y + 1, w - 2, h - 2, GL[2])
        p.rect(x + 2, y + 2, w - 4, h - 4, GL[3])
        p.hline(x, x + w - 1, y + h - 1, GL[0])
    else:
        p.rect(x, y, w, h, NG[1])
        p.hline(x, x + w - 1, y, NG[2])
        p.set(x + 1, y + 1, NG[2]); p.set(x + 2, y + 1, NG[2])
        p.set(x + 1, y + 2, NG[2])
        p.hline(x, x + w - 1, y + h - 1, NG[0])
    p.vline(x + w // 2, y, y + h - 1, frame)
    p.hline(x, x + w - 1, y + h // 2, frame)
    p.rect(x - 2, y + h + 1, w + 4, 1, trim)
    if shutters:
        p.rect(x - 4, y, 3, h, hx('#26382f'))
        p.rect(x + w + 1, y, 3, h, hx('#1e2e27'))
        for yy in range(y + 1, y + h, 3):
            p.set(x - 3, yy, hx('#3a5446'))
            p.set(x + w + 2, yy, hx('#2c463a'))


def _house_door(p, x, y, w, h):
    frame = hx('#2a1e2a'); wood = hx('#3a2428')
    p.rect(x - 1, y - 1, w + 2, h + 1, frame)
    p.rect(x, y, w, h, wood)
    p.vline(x + 1, y + 1, y + h - 1, hx('#4e3236'))
    p.hline(x, x + w - 1, y, hx('#4e3236'))
    panel(p, x + 2, y + 3, w - 4, (h - 8) // 2)
    panel(p, x + 2, y + 5 + (h - 8) // 2, w - 4, (h - 8) // 2)
    p.set(x + w - 3, y + h // 2, BR[2])
    p.set(x + w - 3, y + h // 2 + 1, BR[1])
    p.rect(x - 2, y + h, w + 4, 1, hx('#4a4450'))
    p.rect(x - 3, y + h + 1, w + 6, 1, hx('#3a3442'))


def _drift(p, ground, seed, h):
    for x in range(p.w):
        dh = 4 + (1 if (x * 5 + seed) % 7 == 0 else 0) + (2 if (x + seed * 3) % 17 == 0 else 0)
        top = h - dh
        p.vline(x, top, h - 1, SN[1])
        p.set(x, top, SN[2])
        p.set(x, top + 1, SN[2] if x % 3 else SN[1])
        p.set(x, h - 1, SN[0])


def _chalet(w, h, seed=1, storeys=2, wall='plaster', roofk=0, lit=0):
    p = Pix(w, h)
    cx = w // 2
    half = w // 2 - 3
    roof_top = 4
    wall_top = int(h * 0.43) if storeys == 2 else int(h * 0.42)
    ground = h - 5
    rise = wall_top - roof_top - 2
    shingle = [hx('#31263c'), hx('#2a2234'), hx('#382a40')][roofk]
    shingle_d = mix(shingle, (14, 10, 24), 0.45)
    # techo a dos aguas
    for x in range(1, w - 1):
        top = roof_top + int(round(abs(x - cx) * rise / half))
        p.vline(x, top, wall_top - 3, shingle)
        yy = top + 7
        while yy < wall_top - 3:
            p.set(x, yy, shingle_d)
            yy += 5
    # nieve sobre las aguas
    for x in range(1, w - 1):
        top = roof_top + int(round(abs(x - cx) * rise / half))
        th = 4 + (1 if (x * 5 + seed) % 9 == 0 else 0) + (1 if (x + seed) % 13 == 0 else 0)
        p.vline(x, top, top + th - 1, SN[1])
        p.set(x, top, SN[3])
        p.set(x, top + 1, SN[2])
        p.set(x, top + th - 1, SN[1])
        p.set(x, top + th, mix(SN[0], (30, 30, 48), 0.45))
    # alero y tejas bajo la nieve
    p.rect(0, wall_top - 3, w, 2, mix(shingle, (10, 8, 20), 0.5))
    p.hline(0, w - 1, wall_top - 3, mix(SN[0], (50, 52, 70), 0.4))
    # chimenea
    chx = int(cx + half * 0.55)
    croof = roof_top + int(abs(chx - cx) * rise / half)
    ctop = max(1, croof - 11)
    cbot = min(wall_top - 2, croof + 8)
    p.rect(chx, ctop, 7, cbot - ctop, hx('#3e2a30'))
    for yy in range(ctop + 3, cbot, 4):
        p.hline(chx, chx + 6, yy, hx('#2a1a22'))
        p.set(chx + (2 if (yy // 4) % 2 else 5), yy - 1, hx('#4e363a'))
    p.rect(chx - 1, ctop - 2, 9, 2, SN[2])
    p.hline(chx - 1, chx + 7, ctop - 2, SN[3])
    p.set(chx, ctop - 3, SN[3]); p.set(chx + 5, ctop - 3, SN[3])
    # pared
    wall_base = hx('#4a4a60') if wall == 'plaster' else hx('#523038')
    wall_hi = hx('#5a5a72') if wall == 'plaster' else hx('#623a42')
    wall_dk = hx('#38384c') if wall == 'plaster' else hx('#3c2228')
    p.rect(1, wall_top, w - 2, ground - wall_top, wall_base)
    p.hline(1, w - 2, wall_top, wall_hi)
    if wall == 'brick':
        for yy in range(wall_top + 4, ground, 4):
            p.hline(2, w - 3, yy, wall_dk)
            off = 0 if (yy // 4) % 2 else 5
            for xx in range(2 + off, w - 2, 10):
                p.vline(xx, yy + 1, yy + 3, wall_dk)
    else:
        for xx in range(3, w - 3, 17):
            p.vline(xx, wall_top + 3, ground - 3, mix(wall_base, wall_hi, 0.35))
        p.hline(2, w - 3, wall_top + 2, mix(wall_base, wall_hi, 0.5))
    p.vline(1, wall_top, ground - 1, wall_hi)
    p.vline(w - 2, wall_top, ground - 1, wall_dk)
    p.rect(1, ground - 2, w - 2, 2, hx('#3a3a48'))
    p.hline(1, w - 2, ground - 2, hx('#54546a'))
    lights = []
    # ventanas y puerta segun plantas
    if storeys == 2:
        uy = wall_top + 4
        for i, wx in enumerate((int(w * 0.14), int(w * 0.58))):
            ww, wh = 12, 12
            l = (i == lit)
            _window(p, wx, uy, ww, wh, l)
            if l:
                lights.append((wx, uy, ww, wh))
        p.hline(2, w - 3, wall_top + 19, mix(wall_base, wall_hi, 0.45))
        p.hline(2, w - 3, wall_top + 20, mix(wall_base, wall_dk, 0.25))
        ly = ground - 23
        for wx in (int(w * 0.14), int(w * 0.70)):
            _window(p, wx, ly, 12, 13, False)
        _house_door(p, cx - 6, ground - 20, 12, 19)
        # ventanita en el gablete
        gy = roof_top + rise // 2 + 4
        p.rect(cx - 3, gy, 6, 7, hx('#2e2234'))
        if lit == 2:
            p.rect(cx - 2, gy + 1, 4, 5, GL[2])
            p.rect(cx - 1, gy + 2, 2, 3, GL[3])
            lights.append((cx - 2, gy + 1, 4, 5))
        else:
            p.rect(cx - 2, gy + 1, 4, 5, NG[1])
            p.set(cx - 1, gy + 2, NG[2])
    else:
        wy = wall_top + 7
        for i, wx in enumerate((max(4, int(w * 0.07)), int(w * 0.40))):
            ww, wh = 14, 14
            p.rect(wx - 2, wy + wh + 1, ww + 4, 1, hx('#6a5a64'))
            l = (i == lit)
            _window(p, wx, wy, ww, wh, l)
            if l:
                lights.append((wx, wy, ww, wh))
        _house_door(p, w - 15, ground - 20, 11, 19)
    # copos y nieve al pie
    _drift(p, ground, seed, h)
    for i in range(4):
        sx = (seed * 13 + i * 17) % (w - 6) + 3
        sy = wall_top + (seed * 7 + i * 11) % max(1, ground - wall_top - 4)
        p.set(sx, sy, mix(SN[2], wall_base, 0.55))
    p = finish(p)
    for (lx, ly, lw, lh) in lights:
        spill(p, lx + lw / 2, ly + lh / 2, lw * 1.25, lh * 1.25, (255, 196, 110), 0.30)
        glow(p, lx + lw / 2, ly + lh / 2, lw * 0.9, lh * 0.9, (255, 190, 100), 30)
    return p


def chalet_a():
    return _chalet(96, 80, seed=1, storeys=2, wall='plaster', roofk=0, lit=0)


def chalet_b():
    return _chalet(80, 64, seed=2, storeys=1, wall='brick', roofk=1, lit=0)


def chalet_c():
    return _chalet(64, 64, seed=3, storeys=1, wall='plaster', roofk=2, lit=1)


def chalet_d():
    return _chalet(80, 80, seed=4, storeys=2, wall='brick', roofk=0, lit=2)


# ------------------------------------------------------------- negocios
def _shop(kind):
    w, h = 80, 64
    p = Pix(w, h)
    ground = h - 5
    dark = kind == 'ferreteria'
    wall = hx('#4e2c30') if dark else hx('#3e463c')
    wall_hi = hx('#5e383c') if dark else hx('#4c5648')
    wall_dk = hx('#382026') if dark else hx('#2c342c')
    p.rect(0, 6, w, ground - 6, wall)
    for yy in range(10, ground, 4):
        p.hline(1, w - 2, yy, wall_dk)
        off = 0 if (yy // 4) % 2 else 5
        for xx in range(2 + off, w - 2, 10):
            p.vline(xx, yy + 1, yy + 3, wall_dk)
    p.hline(0, w - 1, 6, wall_hi)
    p.vline(0, 6, ground - 1, wall_hi)
    p.vline(w - 1, 6, ground - 1, wall_dk)
    # cornisa y techo plano con nieve
    p.rect(0, 2, w, 5, hx('#2a2434'))
    p.hline(0, w - 1, 2, hx('#3c3446'))
    for x in range(w):
        th = 3 + (1 if (x * 7 + (1 if dark else 2)) % 9 == 0 else 0)
        p.vline(x, 0, th - 1, SN[1])
        p.set(x, 0, SN[3]); p.set(x, 1, SN[2])
        p.set(x, th, mix(SN[0], (40, 40, 56), 0.4))
    # cartel pintado a mano
    p.rect(11, 12, 58, 11, hx('#2a1c18'))
    p.rect(12, 13, 56, 9, hx('#6a4a2e'))
    p.hline(12, 67, 13, hx('#8a6440'))
    p.hline(12, 67, 21, hx('#4a3220'))
    label = 'FERRETERIA' if dark else 'ALMACEN'
    tw = len(label) * 4 - 1
    col = hx('#e8d8b0')
    text(p, 40 - tw // 2 + 1, 16, label, hx('#3a2418'))
    text(p, 40 - tw // 2, 15, label, col)
    # toldo con nieve
    aw = hx('#8a3a3a') if dark else hx('#3c5a48')
    aw2 = hx('#c8b48a')
    for x in range(4, 76):
        c = aw if ((x - 4) // 5) % 2 == 0 else aw2
        p.vline(x, 26, 33, c)
        if (x - 4) % 5 == 0:
            p.set(x, 33, mix(c, (20, 16, 30), 0.5))
    p.rect(4, 26, 72, 1, SN[2])
    p.hline(4, 75, 24, SN[3]); p.hline(4, 75, 25, SN[1])
    p.set(12, 27, SN[3]); p.set(44, 27, SN[3]); p.set(63, 27, SN[3])
    p.hline(4, 75, 23, mix(SN[0], (40, 40, 56), 0.5))
    # vidriera oscura con mercaderia
    p.rect(7, 36, 42, 19, hx('#2a2434'))
    p.rect(8, 37, 40, 17, NG[1])
    p.hline(8, 47, 37, NG[2])
    line(p, 12, 38, 20, 38, NG[2]); line(p, 13, 38, 19, 44, mix(NG[2], NG[0], 0.4))
    for sx in (11, 22, 33):
        p.hline(sx, sx + 8, 46, hx('#3a3446'))
        for k in range(3):
            p.rect(sx + k * 3, 42, 2, 4, [RD[1], GR[1], CR[1]][(k + sx) % 3])
    p.rect(8, 50, 40, 2, hx('#3a3446'))
    p.vline(27, 37, 53, hx('#2a2434'))
    p.hline(8, 47, 50, hx('#3a3446'))
    p.rect(6, 35, 44, 1, hx('#544a5a'))
    p.rect(6, 55, 44, 1, hx('#1e1a28'))
    # puerta
    dx = 54
    p.rect(dx - 1, 34, 20, ground - 33, hx('#241c28'))
    p.rect(dx, 35, 18, ground - 35, hx('#3a2a2c'))
    p.rect(dx + 2, 37, 14, 8, NG[1])
    p.hline(dx + 2, dx + 15, 37, NG[2])
    p.set(dx + 3, 38, NG[2]); p.set(dx + 4, 38, NG[2])
    panel(p, dx + 2, 47, 14, 8)
    p.set(dx + 14, 46, BR[2]); p.set(dx + 14, 47, BR[1])
    p.hline(dx - 2, dx + 19, ground - 1, hx('#4a4450'))
    # nieve al pie y copos
    _drift(p, ground, 7 if dark else 9, h)
    p = finish(p)
    return p


def shop_ferreteria():
    return _shop('ferreteria')


def shop_almacen():
    return _shop('almacen')


# ------------------------------------------------------------- cercos
def fence():
    p = Pix(32, 16)
    p.rect(0, 6, 32, 1, hx('#5a4a3e'))
    p.rect(0, 10, 32, 1, hx('#4a3a30'))
    for i in range(7):
        x = 1 + i * 4
        p.rect(x, 2, 3, 13, hx('#6a5444'))
        p.set(x + 1, 1, hx('#6a5444'))
        p.vline(x, 2, 14, hx('#7e6450'))
        p.vline(x + 2, 2, 14, hx('#46362c'))
        p.hline(x, x + 2, 2, SN[2])
        p.set(x + 1, 1, SN[2])
    p.hline(0, 31, 5, SN[2])
    p.set(6, 4, SN[3]); p.set(18, 4, SN[3]); p.set(27, 4, SN[3])
    p.hline(0, 31, 15, hx('#2a222c'))
    return finish(p)


def gate():
    p = Pix(32, 32)
    for x in (1, 28):
        p.rect(x, 4, 3, 27, hx('#5a4636'))
        p.vline(x, 4, 30, hx('#7a6048'))
        p.vline(x + 2, 4, 30, hx('#3a2c24'))
        p.rect(x, 2, 4, 3, hx('#6a5444'))
        p.rect(x - 1, 1, 6, 1, SN[2])
        p.set(x, 0, SN[3]); p.set(x + 3, 0, SN[3])
    p.rect(5, 8, 22, 3, hx('#6a5444'))
    p.rect(5, 21, 22, 3, hx('#6a5444'))
    for i in range(4):
        x = 6 + i * 6
        p.rect(x, 6, 4, 24, hx('#6a5444'))
        p.vline(x, 6, 29, hx('#7e6450'))
        p.vline(x + 3, 6, 29, hx('#46362c'))
    line(p, 6, 26, 24, 10, hx('#4a3a30'))
    p.hline(5, 26, 5, SN[2])
    p.set(8, 4, SN[3]); p.set(17, 4, SN[3]); p.set(24, 4, SN[3])
    p.rect(14, 17, 3, 2, MT[1])
    p.rect(15, 19, 1, 2, MT[0])
    return finish(p)


def hedge():
    p = Pix(32, 16)
    p.rect(0, 4, 32, 11, hx('#243a2c'))
    p.rect(0, 6, 32, 9, hx('#2e4a36'))
    for i in range(6):
        x = 2 + i * 5
        p.rect(x, 8 + (i % 2), 3, 2, hx('#3c5c42'))
        p.set(x, 8 + (i % 2), hx('#4c6e50'))
    p.rect(0, 11, 32, 4, hx('#1e3026'))
    p.hline(0, 31, 15, hx('#1a2820'))
    for x in range(32):
        th = 4 + (1 if (x * 5) % 7 == 0 else 0) + (1 if x % 11 == 0 else 0)
        p.vline(x, 0, th, SN[1])
        p.set(x, 0, SN[2])
        p.set(x, th, mix(SN[0], hx('#1e3026'), 0.5))
    p.hline(0, 31, 0, SN[2])
    p.set(6, 1, SN[3]); p.set(15, 1, SN[3]); p.set(25, 1, SN[3])
    return finish(p)


# ------------------------------------------------------------- arboles
def _clump(p, cx, cy, r, base, hi):
    p.circle(cx, cy, r, base)
    p.circle(cx - 1, cy - 1, max(1, r - 2), hi)
    for x in range(cx - r, cx + r + 1):
        d = 1 - ((x + 0.5 - cx) / (r + 0.2)) ** 2
        if d > 0:
            ty = int(round(cy - r * d ** 0.5))
            p.set(x, ty, SN[2])
            p.set(x, ty + 1, SN[1])


def tree_a():
    p = Pix(32, 48)
    trunk = hx('#3a2a24'); trunk_hi = hx('#54402e'); trunk_dk = hx('#241a18')
    p.rect(14, 26, 4, 21, trunk)
    p.vline(15, 26, 46, trunk_hi)
    p.vline(17, 26, 46, trunk_dk)
    p.set(13, 46, trunk); p.set(12, 47, trunk)
    p.set(18, 46, trunk_dk); p.set(19, 47, trunk_dk)
    p.set(15, 35, trunk_dk); p.set(16, 40, trunk_dk)
    line(p, 16, 34, 9, 26, trunk)
    line(p, 16, 31, 23, 24, trunk)
    line(p, 16, 28, 12, 20, trunk_dk)
    line(p, 16, 26, 21, 18, trunk_dk)
    crown = hx('#1a2c34'); crown_hi = hx('#263e48')
    for (cx, cy, r) in ((16, 22, 7), (9, 16, 6), (23, 15, 6), (16, 10, 7), (12, 25, 5), (22, 25, 5)):
        _clump(p, cx, cy, r, crown, crown_hi)
    for (cx, cy) in ((16, 12), (10, 15), (22, 16), (17, 22)):
        p.set(cx, cy, crown_hi)
    for (sx, sy) in ((8, 17), (20, 12), (14, 21), (24, 22)):
        p.set(sx, sy, SN[3])
    return finish(p)


def tree_b():
    p = Pix(24, 40)
    trunk = hx('#3a2a26'); hi = hx('#564036')
    p.rect(10, 22, 3, 17, trunk)
    p.vline(10, 22, 38, hi)
    p.vline(12, 22, 38, hx('#241a18'))
    p.set(9, 38, trunk); p.set(8, 39, trunk)
    p.set(13, 38, hx('#241a18')); p.set(14, 39, hx('#241a18'))
    branches = [(11, 26, 3, 14), (11, 22, 18, 11), (11, 18, 6, 6),
                (11, 16, 17, 4), (11, 13, 20, 15), (5, 12, 2, 7),
                (17, 9, 21, 5), (7, 8, 8, 3)]
    for (x0, y0, x1, y1) in branches:
        line(p, x0, y0, x1, y1, trunk)
    for (x0, y0, x1, y1) in branches[:5]:
        line(p, x0, y0 - 1, x1, y1 - 1, SN[1])
        p.set(x1, y1 - 2, SN[2])
    p.set(6, 5, SN[2]); p.set(7, 5, SN[1])
    p.set(17, 3, SN[2]); p.set(18, 3, SN[1])
    p.set(21, 4, SN[1]); p.set(2, 6, SN[1])
    p.set(11, 17, trunk); p.set(15, 14, trunk)
    return finish(p)


# ------------------------------------------------------------- calle
def streetlight(lit=True):
    p = Pix(16, 48)
    pole = hx('#2e303c'); pole_hi = hx('#4a4e5e'); pole_dk = hx('#1e2028')
    p.rect(7, 14, 2, 31, pole)
    p.vline(7, 14, 44, pole_hi)
    p.vline(8, 14, 44, pole_dk)
    p.rect(5, 16, 6, 2, pole)
    p.hline(5, 10, 16, pole_hi)
    p.rect(6, 44, 4, 2, pole)
    p.rect(4, 46, 8, 2, pole)
    p.hline(4, 11, 46, pole_hi)
    p.rect(3, 47, 10, 1, pole_dk)
    # farol
    p.rect(7, 2, 2, 2, pole)
    p.hline(6, 9, 4, pole_hi)
    p.rect(5, 5, 6, 1, pole)
    p.rect(4, 6, 8, 1, pole_hi)
    p.rect(3, 7, 10, 6, pole_dk)
    if lit:
        p.rect(4, 7, 8, 6, GL[2])
        p.rect(5, 8, 6, 4, GL[3])
    else:
        p.rect(4, 7, 8, 6, NG[1])
        p.set(5, 8, NG[2]); p.set(6, 8, NG[2])
    p.hline(4, 11, 7, hx('#3a3020'))
    p.vline(7, 7, 12, hx('#4a3a24'))
    p.vline(8, 7, 12, hx('#4a3a24'))
    p.rect(3, 13, 10, 2, pole)
    p.hline(3, 12, 13, pole_hi)
    p.hline(4, 11, 14, pole_dk)
    p.set(8, 3, GL[2] if lit else NG[2])
    finish(p)
    if lit:
        glow(p, 8, 10, 8, 11, (255, 196, 104), 40)
        glow(p, 8, 10, 5, 6, (255, 224, 160), 34)
    return p


def car():
    p = Pix(48, 24)
    body = hx('#2c4a52'); body_hi = hx('#3e6a72'); body_dk = hx('#162a32')
    # silueta redondeada
    p.ellipse(5, 14, 4, 4, body)
    p.ellipse(43, 14, 4, 4, body)
    p.rect(5, 10, 38, 7, body)
    p.rect(3, 13, 42, 4, body)
    # cabina
    p.rect(15, 5, 19, 6, body)
    p.rect(17, 3, 15, 2, body)
    p.rect(17, 5, 15, 4, NG[1])
    p.rect(18, 6, 5, 3, NG[1])
    p.rect(27, 6, 5, 3, NG[1])
    line(p, 32, 5, 34, 8, body_dk)
    line(p, 14, 5, 12, 8, body_dk)
    # luces y cromados
    p.hline(6, 41, 10, body_hi)
    p.hline(7, 40, 11, body_hi)
    p.hline(4, 43, 16, body_dk)
    p.hline(17, 31, 8, body_dk)
    p.set(19, 6, NG[2]); p.set(20, 6, NG[2])
    p.set(28, 6, GL[1]); p.set(29, 6, GL[2])
    p.set(18, 8, GL[0]); p.set(28, 8, GL[0])
    p.rect(1, 12, 2, 3, MT[2]); p.rect(45, 12, 2, 3, MT[1])
    p.set(1, 11, MT[3]); p.set(46, 11, MT[3])
    p.set(45, 13, GL[3])
    p.set(2, 14, RD[1]); p.set(2, 15, RD[0])
    p.vline(25, 10, 15, body_dk)
    p.set(24, 12, MT[2]); p.set(24, 13, MT[2])
    # pasarruedas y ruedas
    p.ellipse(12, 18, 6, 3, body_dk)
    p.ellipse(36, 18, 6, 3, body_dk)
    for wx in (12, 36):
        p.circle(wx, 19, 4, BK[0])
        p.circle(wx, 19, 3, BK[1])
        p.circle(wx, 19, 1, MT[1])
        p.set(wx - 1, 18, MT[2])
        p.set(wx, 22, BK[0])
    # nieve: techo, capo y baul
    for x in range(17, 32):
        th = 1 + (1 if (x * 5) % 7 < 3 else 0)
        p.vline(x, 3 - th, 2, SN[1])
        p.set(x, 3 - th, SN[3])
        p.set(x, 2, SN[2] if x % 3 else SN[1])
    for x in range(6, 14):
        p.set(x, 9, SN[2]); p.set(x, 8, SN[1])
        if x % 4 == 0:
            p.set(x, 7, SN[3])
    for x in range(35, 44):
        p.set(x, 9, SN[2]); p.set(x, 8, SN[1])
        if x % 4 == 1:
            p.set(x, 7, SN[3])
    # nieve acumulada sobre las ruedas (no tapa el auto)
    for wx in (12, 36):
        for x in range(wx - 4, wx + 5):
            d = 1 - ((x - wx) / 5.0) ** 2
            if d > 0:
                ty = int(round(23 - 1.6 * d ** 0.5))
                p.set(x, ty, SN[2])
                p.set(x, ty + 1, SN[1])
    p.set(10, 22, SN[3]); p.set(38, 22, SN[3])
    return finish(p)


def _shear(src, k):
    out = Pix(src.w, src.h)
    for x in range(src.w):
        dy = int(round((x - src.w / 2.0) * k))
        for y in range(src.h):
            c = src.get(x, y)
            if c[3]:
                out.set(x, y + dy, c[:3], c[3])
    return out


def bus():
    p = Pix(64, 36)
    red = hx('#6a2a2e'); red_hi = hx('#8a3a38'); red_dk = hx('#421a20')
    cream = hx('#c0ac86'); cream_hi = hx('#ded0aa')
    # carroceria
    p.rect(2, 8, 60, 21, red)
    p.hline(2, 61, 8, red_hi)
    p.hline(2, 61, 15, red_dk)
    p.hline(2, 61, 17, red_hi)
    p.hline(2, 61, 28, red_dk)
    p.rect(4, 26, 56, 2, cream)
    p.hline(4, 59, 26, cream_hi)
    p.rect(2, 7, 60, 2, red_dk)
    # techo con nieve
    for x in range(2, 62):
        th = 2 + (1 if (x * 5) % 8 < 3 else 0)
        p.vline(x, 7 - th, 7, SN[1])
        p.set(x, 7 - th, SN[2])
        p.set(x, 7 - th + 1, SN[1])
    # ventanillas
    for i, wx in enumerate((7, 19, 31, 43)):
        warm = i in (1, 3)
        p.rect(wx, 10, 9, 6, NG[0])
        p.rect(wx + 1, 11, 7, 4, GL[2] if warm else NG[1])
        if warm:
            p.hline(wx + 1, wx + 7, 11, GL[3])
        p.set(wx + 2, 11, GL[3] if warm else NG[2])
        p.hline(wx, wx + 8, 16, red_dk)
    # frente: rejilla, faros, paragolpes
    p.rect(54, 18, 8, 10, red_dk)
    p.vline(55, 19, 26, MT[2]); p.vline(57, 19, 26, MT[1])
    p.vline(59, 19, 26, MT[2]); p.vline(61, 19, 26, MT[1])
    p.circle(57, 27, 1, GL[3]); p.set(57, 27, GL[3])
    p.rect(52, 17, 2, 3, MT[2])
    p.rect(61, 28, 2, 2, MT[1])
    # numero 10 grande
    text(p, 23, 16, '10', cream_hi, 2)
    p.rect(2, 27, 5, 3, red_dk)
    p.set(4, 21, red_dk); p.set(15, 21, red_dk); p.set(27, 21, red_dk)
    # ruedas
    for wx in (13, 48):
        p.circle(wx, 31, 4, BK[0])
        p.circle(wx, 31, 3, BK[1])
        p.circle(wx, 31, 1, MT[1])
        p.set(wx, 30, MT[2])
    # nieve al pie
    for x in range(0, 64):
        dh = 2 + (1 if (x * 7) % 11 < 3 else 0)
        p.vline(x, 36 - dh, 35, SN[1])
        p.set(x, 36 - dh, SN[2])
        if x % 5 == 0:
            p.set(x, 35 - dh, SN[3])
    p = finish(p)
    return _shear(p, 0.075)


# ------------------------------------------------------------- props calle
def snow_mound():
    p = Pix(32, 16)
    p.rect(0, 12, 32, 4, SN[1])
    p.ellipse(7, 11, 7, 4, SN[0])
    p.ellipse(17, 10, 10, 6, SN[0])
    p.ellipse(26, 11, 6, 4, SN[0])
    p.ellipse(6, 10, 5, 3, SN[1])
    p.ellipse(17, 9, 8, 5, SN[1])
    p.ellipse(26, 10, 4, 3, SN[1])
    p.ellipse(17, 8, 6, 4, SN[2])
    p.ellipse(6, 9, 4, 2, SN[2])
    p.hline(4, 9, 6, SN[3]); p.hline(15, 21, 4, SN[3]); p.hline(24, 28, 8, SN[2])
    p.set(8, 4, SN[3]); p.set(18, 3, SN[3]); p.set(23, 6, SN[2])
    p.hline(1, 30, 13, SN[0]); p.hline(2, 29, 14, mix(SN[0], (40, 50, 70), 0.4))
    p.set(11, 10, SN[3]); p.set(28, 12, SN[2])
    return finish(p, (16, 15, 13, 2, 70))


def mailbox():
    p = Pix(8, 16)
    p.rect(3, 8, 2, 8, WD[1])
    p.vline(3, 8, 15, WD[2])
    p.rect(1, 2, 7, 6, hx('#2e4a44'))
    p.rect(1, 2, 7, 2, hx('#3e6258'))
    p.hline(1, 7, 7, hx('#1e302c'))
    p.rect(3, 4, 3, 1, hx('#16201e'))
    p.rect(6, 1, 1, 3, RD[1])
    p.set(6, 0, RD[2])
    p.hline(1, 7, 0, SN[2]); p.set(2, 1, SN[2])
    return finish(p)


def trash():
    p = Pix(8, 16)
    p.rect(1, 4, 6, 10, MT[1])
    p.vline(1, 4, 13, MT[2])
    p.vline(6, 4, 13, MT[0])
    for yy in (6, 9, 12):
        p.hline(1, 6, yy, MT[0])
    p.rect(1, 14, 6, 1, MT[0])
    p.rect(0, 2, 8, 2, MT[1])
    p.hline(0, 7, 2, MT[2])
    p.hline(0, 7, 3, MT[0])
    p.hline(1, 5, 1, SN[2]); p.set(0, 2, SN[2]); p.set(7, 3, SN[1])
    p.set(2, 6, MT[3])
    return finish(p)


def figure_snow():
    p = Pix(24, 12)
    # cuerpo boca abajo (saco oscuro)
    p.rect(4, 4, 13, 6, hx('#2a2430'))
    p.hline(5, 16, 4, hx('#3e3644'))
    p.set(6, 6, hx('#1a1620')); p.set(9, 7, hx('#1a1620')); p.set(13, 5, hx('#1a1620'))
    p.set(7, 5, hx('#4a4250')); p.set(12, 4, hx('#4a4250'))
    # cabeza y pelo blanco
    p.rect(1, 4, 4, 4, hx('#241e28'))
    p.rect(1, 3, 4, 2, hx('#c8c8d2'))
    p.set(1, 2, hx('#dcdce6')); p.set(2, 2, hx('#dcdce6')); p.set(4, 3, hx('#a8a8b8'))
    p.set(2, 5, hx('#6a5a56')); p.set(3, 5, hx('#6a5a56'))
    # brazo estirado sobre la nieve
    p.hline(16, 21, 9, hx('#2a2430'))
    p.hline(16, 21, 8, hx('#3e3644'))
    p.rect(21, 8, 2, 2, hx('#1a1620'))
    p.set(22, 8, hx('#b8a898'))
    # bota asomando
    p.rect(16, 4, 3, 2, hx('#1e1a24'))
    p.set(19, 4, hx('#3a3440'))
    # nieve que lo cubre a medias
    p.ellipse(11, 10, 12, 3, SN[1])
    p.ellipse(8, 10, 7, 2, SN[2])
    p.ellipse(17, 10, 6, 2, SN[2])
    for x in range(5, 16, 2):
        p.set(x, 8, SN[2])
    p.set(8, 7, SN[3]); p.set(12, 8, SN[3]); p.set(14, 7, SN[3])
    p.set(5, 9, SN[3]); p.set(19, 9, SN[2]); p.set(2, 9, SN[2])
    p.set(10, 3, SN[3]); p.set(20, 3, SN[2]); p.set(3, 8, SN[1])
    return finish(p)


def sign_ferreteria():
    p = Pix(16, 16)
    p.vline(4, 2, 5, MT[1]); p.vline(11, 2, 5, MT[1])
    p.rect(2, 5, 12, 10, hx('#3a2418'))
    p.rect(3, 6, 10, 8, hx('#6a4a2e'))
    p.hline(3, 12, 6, hx('#8a6440'))
    # martillo y llave cruzados
    line(p, 5, 12, 10, 8, MT[2])
    p.rect(4, 11, 3, 2, MT[1]); p.set(4, 11, MT[3])
    line(p, 10, 12, 5, 8, BR[2])
    p.set(5, 8, BR[3]); p.set(10, 12, BR[1])
    p.set(4, 12, MT[0]); p.set(11, 8, BR[0])
    p.hline(2, 13, 4, SN[2]); p.set(3, 3, SN[2]); p.set(10, 3, SN[3])
    return finish(p)


def sign_almacen():
    p = Pix(16, 16)
    p.vline(4, 2, 5, MT[1]); p.vline(11, 2, 5, MT[1])
    p.rect(2, 5, 12, 10, hx('#3a2418'))
    p.rect(3, 6, 10, 8, hx('#6a4a2e'))
    p.hline(3, 12, 6, hx('#8a6440'))
    # botella y lata
    p.rect(5, 8, 2, 5, GR[1]); p.rect(5, 7, 2, 1, GR[0])
    p.set(5, 9, GR[3])
    p.rect(8, 8, 4, 5, CR[1])
    p.hline(8, 11, 8, CR[3]); p.hline(8, 11, 9, RD[1])
    p.hline(8, 11, 12, CR[0])
    p.hline(2, 13, 4, SN[2]); p.set(3, 3, SN[2]); p.set(10, 3, SN[3])
    return finish(p)


def arrow_marker():
    p = Pix(16, 24)
    p.rect(4, 11, 2, 13, WD[1])
    p.vline(4, 11, 23, WD[2])
    p.vline(5, 11, 23, WD[0])
    p.rect(0, 3, 16, 9, hx('#4a3220'))
    p.rect(1, 4, 14, 7, hx('#7a5834'))
    p.hline(1, 14, 4, hx('#9a7040'))
    p.hline(1, 14, 10, hx('#4a3220'))
    # flecha pintada apuntando a la derecha
    p.rect(3, 6, 7, 2, CR[3])
    p.rect(3, 7, 7, 1, CR[2])
    for i in range(3):
        p.vline(10 + i, 5 - i, 8 + i, CR[3])
        p.set(10 + i, 8 + i, CR[2])
    p.set(13, 6, CR[2]); p.set(13, 7, CR[2])
    p.hline(1, 14, 2, SN[2]); p.set(3, 1, SN[3]); p.set(11, 1, SN[2])
    p.rect(4, 23, 3, 1, hx('#2a1c18'))
    return finish(p)


# ------------------------------------------------------------- footprint
def footprint():
    p = Pix(6, 3)
    c = hx('#2a3850'); hi = hx('#3e5070')
    p.set(2, 0, c); p.set(3, 0, c)
    p.hline(1, 4, 1, c)
    p.set(5, 1, c)
    p.set(2, 2, c); p.set(3, 2, c)
    p.set(2, 1, hi); p.set(4, 1, hi)
    return p


# ------------------------------------------------------------- build

def model_plane():
    """Avion de modelismo colgado de una viga (el altillo-laboratorio)."""
    p = Pix(20, 16)
    p.vline(10, 0, 5, BK[2])                   # hilo
    p.rect(3, 8, 14, 3, CR[2])                 # fuselaje
    p.hline(3, 16, 8, CR[3])
    p.hline(3, 16, 10, CR[1])
    p.rect(8, 6, 4, 7, RD[2])                  # ala (vista 3/4)
    p.hline(8, 11, 6, RD[3])
    p.hline(8, 11, 12, RD[1])
    p.rect(2, 6, 2, 3, RD[2])                  # cola
    p.set(17, 9, BK[1])                        # helice
    p.vline(18, 7, 11, BK[2])
    return finish(p)


NAMES = [
    'table_truco', 'chair', 'chair_front', 'shelf', 'radio_cabinet', 'radio',
    'window_glow', 'hanging_lamp', 'coat_stand', 'crate', 'box', 'suitcase',
    'tool_table', 'violin_bench', 'air_tank', 'stairs_down', 'door', 'speaker',
    'book', 'bottle', 'jar', 'cards', 'cup', 'violin', 'tools', 'rag',
    'sofa', 'armchair', 'living_table', 'oil_lamp', 'wardrobe', 'stairs_up',
    'exit_door', 'garage_shelf', 'workbench', 'tire', 'bucket', 'hose', 'cans',
    'cot', 'stove',
    'chalet_a', 'chalet_b', 'chalet_c', 'chalet_d', 'shop_ferreteria',
    'shop_almacen', 'fence', 'gate', 'hedge', 'tree_a', 'tree_b', 'streetlight',
    'car', 'bus', 'snow_mound', 'mailbox', 'trash', 'figure_snow',
    'sign_ferreteria', 'sign_almacen', 'arrow_marker', 'model_plane',
]

DRAW = {
    'box': cardboard_box,
    'hedge': hedge,
    'tire': tire,
}


def pack(items, width=512, pad=1):
    frames, x, y, rowh = {}, 0, 0, 0
    for name, p in items:
        if x + p.w + pad > width:
            x, y, rowh = 0, y + rowh + pad, 0
        frames[name] = [x, y, p.w, p.h]
        x += p.w + pad
        rowh = max(rowh, p.h)
    atlas = Pix(width, y + rowh)
    for name, p in items:
        atlas.paste(p, frames[name][0], frames[name][1])
    return atlas, frames


def build():
    items = []
    for name in NAMES:
        fn = DRAW.get(name) or globals()[name]
        items.append((name, fn()))
    return pack(items)
