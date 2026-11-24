"""Tiles 16x16 para el altillo, la casa y la calle nevada.

Paleta limitada por material (3-4 tonos, sombras frias), sin ruido: la
variacion es deliberada (cada 3ra tabla un tono, un nudo suelto, dos brillos).
"""
from random import Random
from pixel import Pix, hx, mix, shade

T = 16

# ---- maderas y materiales
WOOD = [hx('#7a4c2a'), hx('#7f4f2c'), hx('#84522f'), hx('#895532')]
WSEAM = hx('#4a2a1c'); WHI = hx('#b88048'); WDEEP = hx('#5e3820')
PLANK = [hx('#4a2e36'), hx('#553640'), hx('#5e3c44'), hx('#68424a')]
PSEAM = hx('#2e1c26'); PHI = hx('#7a525a')
ROOF = [hx('#2a1c30'), hx('#33223a'), hx('#3a2a42')]
RSEAM = hx('#1c1222')
PARQ = [hx('#a8723c'), hx('#ac773f'), hx('#b07b42'), hx('#9e6b38')]
PJOINT = hx('#6e4624'); PHI2 = hx('#d29a5e')
BRK = [hx('#7a3a3a'), hx('#8a4444'), hx('#965050')]
MORTAR = hx('#6a5a58'); BRKD = hx('#5a2a30')
PLAST = [hx('#c8bc9c'), hx('#bcae90'), hx('#d4c8a8')]
PLASD = hx('#a29478')
SNOW = [hx('#8aaac2'), hx('#9fbfd4'), hx('#b2cede')]
SNOW_HI = hx('#e2f4ff'); SNOW_D = hx('#7896b0')
ROAD = [hx('#242938'), hx('#2b3142'), hx('#333a4e')]
HEDGE = [hx('#1e3026'), hx('#294234'), hx('#345340')]
TRIM = hx('#e0d6bc'); TRIM_D = hx('#b0a48c')
WD_BASE = [hx('#3a2418'), hx('#5e3a24'), hx('#8a5a34')]


def pack(items, width=512, pad=1):
    """Atlas simple por filas; items = [(name, Pix)]."""
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


# ------------------------------------------------------------------ madera
def wood(i):
    p = Pix(T, T)
    # Tablas largas: lineas horizontales cada 8 px; las juntas verticales
    # aparecen solo cada tanto para que no se lea como ladrillo.
    for r in range(2):
        y0 = r * 8
        t = WOOD[(i + r * 2) % 4]
        p.rect(0, y0, T, 8, t)
        p.hline(0, T - 1, y0, WSEAM)
        p.hline(0, T - 1, y0 + 1, mix(t, WHI, 0.18))
        p.hline(0, T - 1, y0 + 7, mix(t, WDEEP, 0.28))
        if i == 1 and r == 0:
            jx = (i * 5 + 3) % 10 + 2
            p.vline(jx, y0 + 1, y0 + 6, mix(WSEAM, t, 0.30))
        if i == 4 and r == 1:
            jx = (i * 3 + 5) % 10 + 3
            p.vline(jx, y0 + 1, y0 + 6, mix(WSEAM, t, 0.30))
        gx = (i * 3 + r * 5 + 2) % 12 + 1
        p.hline(gx, gx + 3, y0 + 4, mix(t, WDEEP, 0.22))
        if (i + r) % 3 == 0:
            p.set(gx, y0 + 6, mix(t, WDEEP, 0.45))
        if i == 2 and r == 1:
            p.rect(5, y0 + 3, 2, 2, WDEEP)
            p.set(5, y0 + 3, mix(WDEEP, WHI, 0.15))
        if i == 4 and r == 0:
            p.hline(10, 12, y0 + 2, mix(t, WHI, 0.22))
    return p


def plank(i):
    p = Pix(T, T)
    for r in range(2):
        y0 = r * 8
        t = PLANK[(i % 2) + (1 if (r == 1 and i % 3 == 0) else 0)]
        p.rect(0, y0, T, 8, t)
        p.hline(0, T - 1, y0, mix(t, PHI, 0.22))
        p.hline(0, T - 1, y0 + 1, mix(t, PHI, 0.10))
        p.hline(0, T - 1, y0 + 6, mix(t, PSEAM, 0.55))
        p.hline(0, T - 1, y0 + 7, PSEAM)
        if (i + r) % 2 == 0:
            jx = (i * 5 + r * 7) % 16
            p.vline(jx, y0 + 1, y0 + 5, PSEAM)
            p.set(jx + 1, y0 + 2, mix(t, PHI, 0.20))
            p.set(jx - 1, y0 + 3, mix(PSEAM, PHI, 0.35))
        if i == 2 and r == 1:
            p.set(9, y0 + 3, mix(PSEAM, PHI, 0.20))
    return p


def roof(i):
    p = Pix(T, T)
    p.rect(0, 0, T, T, ROOF[i % 3])
    for y0 in (0, 4, 8, 12):
        p.hline(0, T - 1, y0, RSEAM)
        p.hline(0, T - 1, y0 + 1, mix(ROOF[i % 3], (90, 70, 100), 0.22))
        jx = (i * 5 + y0) % 16
        p.vline(jx, y0, y0 + 3, RSEAM)
        p.set((jx + 3) % 16, y0 + 2, mix(RSEAM, (80, 62, 90), 0.3))
    return p


def beam():
    p = roof(0)
    # viga vertical centrada, madera oscura calida
    p.rect(5, 0, 6, T, hx('#5a3a24'))
    p.vline(5, 0, T - 1, hx('#2e1c18'))
    p.vline(10, 0, T - 1, hx('#2e1c18'))
    p.vline(6, 0, T - 1, hx('#7a4e2c'))
    p.vline(9, 0, T - 1, hx('#3e2618'))
    p.set(7, 6, hx('#a87446')); p.set(8, 6, hx('#a87446'))
    p.set(7, 7, hx('#3e2618')); p.set(8, 7, hx('#3e2618'))
    return p


def parquet(i):
    p = Pix(T, T)
    # Entablonado largo: lineas horizontales suaves y juntas verticales ralas.
    for r in range(2):
        y0 = r * 8
        t = PARQ[(i + r * 2) % 4]
        p.rect(0, y0, T, 8, t)
        p.hline(0, T - 1, y0, mix(PJOINT, t, 0.45))
        p.hline(0, T - 1, y0 + 1, mix(t, PHI2, 0.30))
        p.hline(0, T - 1, y0 + 7, mix(t, PJOINT, 0.35))
        if i == 2 and r == 0:
            jx = (i * 3 + 4) % 12 + 2
            p.vline(jx, y0 + 1, y0 + 6, mix(PJOINT, t, 0.40))
        if i == 4 and r == 1:
            jx = (i * 5 + 2) % 12 + 2
            p.vline(jx, y0 + 1, y0 + 6, mix(PJOINT, t, 0.40))
        gx = (i * 5 + r * 7 + 3) % 12 + 2
        p.hline(gx, gx + 3, y0 + 4, mix(t, PJOINT, 0.28))
        if (i + r) % 4 == 0:
            p.set(gx + 1, y0 + 5, mix(t, PJOINT, 0.55))
    return p


# ------------------------------------------------------------------ rug 2x2
def rug_tiles():
    """Alfombra 2x2 (32x32) sobria: borde fino, trama y un rombo chico."""
    deep = hx('#4a1820'); base = hx('#6a2a32'); mid = hx('#7a3038')
    accent = hx('#a87848'); hi = hx('#8e3c46')
    big = Pix(32, 32)
    big.rect(0, 0, 32, 32, deep)
    big.rect(2, 2, 28, 28, base)
    # trama de tejido, muy suave
    for y in range(4, 30, 4):
        big.hline(4, 27, y, mix(base, hi, 0.35))
    for x in range(4, 30, 4):
        big.vline(x, 4, 27, mix(base, mid, 0.45))
    # lineas de borde
    big.hline(3, 28, 3, accent)
    big.vline(3, 3, 28, accent)
    big.hline(3, 28, 28, mix(accent, deep, 0.45))
    big.vline(28, 3, 28, mix(accent, deep, 0.45))
    # rombo central chico
    for k, c in ((0, deep), (1, accent), (2, mid), (3, hi)):
        for x in range(16 - k, 16 + k):
            big.set(x, 16 - 3 + k, c)
            big.set(x, 16 + 3 - k, c)
    big.set(15, 15, hi); big.set(16, 15, hi)
    out = []
    for ty in range(2):
        for tx in range(2):
            q = Pix(T, T)
            q.img = big.img.crop((tx * 16, ty * 16, tx * 16 + 16, ty * 16 + 16))
            q.px = q.img.load()
            out.append(q)
    return out


# ------------------------------------------------------------------ escalera
def stair_tiles():
    p = Pix(32, 32)
    base, hi, dk = hx('#6e4326'), hx('#96703e'), hx('#3a2418')
    p.rect(0, 0, 32, 32, base)
    p.hline(0, 31, 0, hi); p.hline(0, 31, 31, dk)
    p.vline(0, 0, 31, hi); p.vline(31, 0, 31, dk)
    # hueco
    p.rect(2, 2, 28, 28, hx('#2a1a20'))
    tones = ['#8a5c34', '#7a5030', '#6a4428', '#5a3a24', '#4a2e1e', '#3a2418']
    for s, t in enumerate(tones):
        y0 = 3 + s * 3
        p.rect(3, y0, 26, 2, hx(t))
        p.hline(3, 28, y0, mix(hx(t), hi, 0.4))
        p.hline(3, 28, y0 + 1, mix(hx(t), (20, 14, 26), 0.5))
        p.vline(3, y0, y0 + 1, mix(hx(t), (20, 14, 26), 0.4))
    p.rect(3, 21, 26, 9, hx('#140c18'))
    p.hline(3, 28, 21, hx('#22141e'))
    # pasamano a la derecha
    p.vline(29, 2, 27, hx('#4a2e1c')); p.vline(30, 2, 27, dk)
    out = []
    for ty in range(2):
        for tx in range(2):
            q = Pix(T, T)
            q.img = p.img.crop((tx * 16, ty * 16, tx * 16 + 16, ty * 16 + 16))
            q.px = q.img.load()
            out.append(q)
    return out


# ------------------------------------------------------------------ pisos casa
def check_tile(i):
    p = Pix(T, T)
    a, b = hx('#bcb8b0'), hx('#a6a29a')
    grout = hx('#7e7c76')
    for y in range(T):
        for x in range(T):
            c = a if ((x // 8) + (y // 8) + i) % 2 == 0 else b
            p.set(x, y, c)
    p.hline(0, T - 1, 0, mix(a, (255, 250, 235), 0.20))
    p.vline(0, 0, T - 1, mix(a, (255, 250, 235), 0.14))
    p.hline(0, T - 1, 7, grout); p.hline(0, T - 1, 15, grout)
    p.vline(7, 0, T - 1, grout); p.vline(15, 0, T - 1, grout)
    if i == 1:
        p.set(11, 12, hx('#8e8c86')); p.set(12, 12, hx('#8e8c86'))
        p.set(11, 13, hx('#8e8c86'))
    return p


def brick(i):
    p = Pix(T, T)
    p.rect(0, 0, T, T, MORTAR)
    for r in range(4):
        y0 = r * 4
        off = 0 if (r + i) % 2 else 4
        for k in range(3):
            x0 = ((off + k * 8) % 16)
            w = 8
            if x0 + w > 16:
                w = 16 - x0
            c = BRK[(i + r + k) % 3]
            p.rect(x0, y0, w, 3, c)
            p.hline(x0, x0 + w - 1, y0, mix(c, (220, 200, 190), 0.16))
            p.hline(x0, x0 + w - 1, y0 + 2, mix(c, BRKD, 0.55))
    return p


def plaster(i):
    p = Pix(T, T)
    p.rect(0, 0, T, T, PLAST[i % 3])
    rnd = Random(30 + i)
    for _ in range(3):
        x, y = rnd.randrange(2, 14), rnd.randrange(2, 14)
        p.set(x, y, mix(PLAST[i % 3], PLASD, 0.35))
    p.hline(0, T - 1, 0, mix(PLAST[i % 3], (255, 250, 235), 0.20))
    return p


def trim(i):
    p = Pix(T, T)
    p.rect(0, 0, T, T, PLAST[0])
    p.hline(0, T - 1, 0, mix(PLAST[0], (255, 250, 235), 0.20))
    p.rect(0, 10, T, 3, TRIM)
    p.hline(0, T - 1, 10, mix(TRIM, (255, 252, 240), 0.5))
    p.hline(0, T - 1, 12, TRIM_D)
    p.rect(0, 13, T, 3, mix(TRIM, PLASD, 0.45))
    p.hline(0, T - 1, 15, mix(TRIM_D, (40, 34, 44), 0.5))
    return p


# ------------------------------------------------------------------ calle
def snow(i):
    p = Pix(T, T)
    p.rect(0, 0, T, T, SNOW[1])
    # un manchon suave y una chispa: nada de ruido
    x, y = (i * 5 + 2) % 11, (i * 3 + 4) % 10
    p.rect(x, y, 4, 2, SNOW[2])
    p.set(x, y, mix(SNOW[2], SNOW_HI, 0.25))
    p.set(x + 1, y + 2, mix(SNOW[2], SNOW[1], 0.55))
    if i % 3 == 0:
        sx, sy = (i * 6 + 4) % 13 + 1, (i * 4 + 6) % 13 + 1
        p.set(sx, sy, SNOW_HI)
        p.set(sx - 1, sy, mix(SNOW_HI, SNOW[1], 0.55))
        p.set(sx, sy - 1, mix(SNOW_HI, SNOW[1], 0.55))
    return p


def path(i):
    p = Pix(T, T)
    base = hx('#8ca4b8')
    p.rect(0, 0, T, T, base)
    x, y = 2 + (i * 4) % 7, 2 + (i * 3) % 7
    p.rect(x, y, 4, 2, mix(base, SNOW[2], 0.55))
    p.set(x, y, mix(base, SNOW_HI, 0.25))
    # huellas pisoteadas (alternadas para no repetir tanto)
    bx, by = 2 + (i * 5) % 7, 3 + (i * 4) % 6
    d = hx('#647c90'); d2 = hx('#566e82')
    p.rect(bx, by, 2, 2, d)
    p.set(bx, by + 2, d2)
    if i == 0:
        p.rect(bx + 3, by + 3, 2, 2, d)
    p.set(bx + 1, by + 1, mix(base, SNOW_HI, 0.30))
    p.set(2 + (i * 7) % 11, 2 + (i * 5) % 11, mix(base, SNOW_HI, 0.5))
    return p


def sidewalk(i):
    p = Pix(T, T)
    base = hx('#a8c2d4'); grout = hx('#7e94a8')
    p.rect(0, 0, T, T, base)
    # losas de 16 px: una junta por tile, bien suave
    p.hline(0, T - 1, 0, grout)
    p.vline(0, 0, T - 1, grout)
    p.hline(0, T - 1, 1, mix(base, SNOW_HI, 0.35))
    p.set(3, 3, mix(base, SNOW_HI, 0.55))
    p.set(12, 11, mix(base, SNOW_HI, 0.45))
    if i == 1:
        p.set(7, 7, mix(base, grout, 0.45))
        p.set(8, 7, mix(base, grout, 0.35))
    return p


def curb(i):
    p = Pix(T, T)
    pave = hx('#9fb9cc'); stone = hx('#b8ccd8'); sd = hx('#8aa4b8')
    p.rect(0, 0, T, 8, pave)
    p.hline(0, T - 1, 0, mix(pave, SNOW_HI, 0.4))
    p.rect(0, 8, T, 3, stone)
    p.hline(0, T - 1, 8, mix(stone, SNOW_HI, 0.3))
    p.hline(0, T - 1, 10, sd)
    p.rect(0, 11, T, 5, ROAD[0])
    for x, y in ((2, 12), (9, 13), (13, 12)):
        p.set(x, y, mix(ROAD[0], SNOW[2], 0.6))
    return p


def road(i):
    p = Pix(T, T)
    p.rect(0, 0, T, T, ROAD[i % 2])
    # una linea tenue de junta y dos manchones de nieve pisada
    p.hline(0, T - 1, 8, mix(ROAD[0], (18, 20, 32), 0.35))
    p.set(3 + i * 3, 4, mix(SNOW[1], ROAD[1], 0.45))
    p.set(10 + i * 2, 12, mix(SNOW[1], ROAD[1], 0.35))
    if i == 1:
        p.hline(4, 7, 5, mix(ROAD[2], SNOW[1], 0.22))
        p.set(12, 2, mix(SNOW_HI, ROAD[1], 0.65))
    return p


def hedge(i):
    p = Pix(T, T)
    p.rect(0, 0, T, T, HEDGE[0])
    p.rect(0, 3, T, 13, HEDGE[1])
    rnd = Random(90 + i)
    for k in range(3):
        x, y = rnd.randrange(0, 14), rnd.randrange(5, 13)
        p.rect(x, y, 2, 2, HEDGE[2])
        p.set(x, y, mix(HEDGE[2], (120, 170, 140), 0.25))
    if i == 1:
        p.set(4, 9, mix(HEDGE[0], (10, 16, 18), 0.4))
        p.set(5, 9, mix(HEDGE[0], (10, 16, 18), 0.4))
    # copo de nieve arriba, borde irregular
    for x in range(T):
        h = 3 + (1 if (x * 7 + i * 3) % 5 == 0 else 0) + (1 if (x + i) % 6 == 0 else 0)
        p.vline(x, 0, h, SNOW[2] if x % 4 else SNOW[1])
        p.set(x, 0, SNOW_HI)
    p.hline(0, T - 1, 0, SNOW_HI)
    return p


def grass(i):
    p = Pix(T, T)
    p.rect(0, 0, T, T, hx('#24382c'))
    p.rect(0, 2, 10, 8, SNOW[1])
    p.rect(9, 7, 7, 7, SNOW[2])
    p.rect(0, 11, 6, 5, SNOW[1])
    p.hline(0, 9, 2, SNOW_HI)
    p.hline(9, 15, 7, mix(SNOW[2], SNOW_HI, 0.5))
    p.set(11, 4, mix(hx('#24382c'), (90, 120, 80), 0.4))
    p.set(12, 5, mix(hx('#24382c'), (90, 120, 80), 0.3))
    p.set(3, 10, SNOW_HI)
    return p


def black():
    p = Pix(T, T)
    p.rect(0, 0, T, T, hx('#0b0c1d'))
    return p



# ------------------------------------------------------------- interiores v4
SHADOW_C = (22, 14, 28)


def brickbase(i):
    """Ladrillo con zocalo de madera: la fila baja de la pared."""
    p = brick(i)
    p.rect(0, 11, T, 5, WD_BASE[1])
    p.hline(0, T - 1, 11, WD_BASE[2])
    p.hline(0, T - 1, 12, mix(WD_BASE[1], WD_BASE[2], 0.4))
    p.hline(0, T - 1, 15, WD_BASE[0])
    p.set((i * 7 + 4) % 16, 13, WD_BASE[0])
    return p


def eave():
    """Techo que remata en una cenefa de madera sobre la pared."""
    p = roof(1)
    p.rect(0, 11, T, 5, hx('#5a3a24'))
    p.hline(0, T - 1, 11, hx('#8a5a34'))
    p.hline(0, T - 1, 15, hx('#2e1c18'))
    p.set(4, 13, hx('#3e2618')); p.set(12, 13, hx('#3e2618'))
    return p


def wood_shadow(i, side=None):
    """Piso con la sombra que tira la pared (arriba) o un costado."""
    p = wood(i)
    for x in range(T):
        for y in range(T):
            t = 0
            if side is None:
                t = 0.5 if y < 3 else (0.25 if y < 5 else 0)
            elif side == 'l':
                t = 0.45 if x < 3 else (0.2 if x < 5 else 0)
            elif side == 'r':
                t = 0.45 if x > 12 else (0.2 if x > 10 else 0)
            if t:
                p.set(x, y, mix(p.get(x, y)[:3], SHADOW_C, t))
    return p


def rug9():
    """Alfombra estirable (9 piezas): borde con guarda y trama con rombos."""
    deep = hx('#4a1820'); base = hx('#6a2a32'); mid = hx('#7a3038')
    accent = hx('#c09050'); hi = hx('#8e3c46')
    big = Pix(48, 48)
    big.rect(0, 0, 48, 48, deep)
    big.rect(2, 2, 44, 44, base)
    big.frame(3, 3, 42, 42, accent)
    big.frame(5, 5, 38, 38, mix(accent, base, 0.55))
    for cx in (16, 32):
        for cy in (16, 32):
            for k in range(3):
                big.set(cx - k, cy - 2 + k, hi); big.set(cx + k, cy - 2 + k, hi)
                big.set(cx - k, cy + 2 - k, hi); big.set(cx + k, cy + 2 - k, hi)
            big.set(cx, cy, accent)
    big.hline(2, 45, 46, mix(deep, (0, 0, 0), 0.3))
    out = []
    for ty in range(3):
        for tx in range(3):
            q = Pix(T, T)
            q.img = big.img.crop((tx * 16, ty * 16, tx * 16 + 16, ty * 16 + 16))
            q.px = q.img.load()
            out.append(q)
    return out


# ------------------------------------------------------------------ build
def build():
    items = []
    for i in range(6):
        items.append((f'wood_{i}', wood(i)))
    for i in range(3):
        items.append((f'plank_{i}', plank(i)))
    for i in range(3):
        items.append((f'roof_{i}', roof(i)))
    items.append(('beam_0', beam()))
    for i, q in enumerate(rug_tiles()):
        items.append((f'rug_{i}', q))
    for i, q in enumerate(stair_tiles()):
        items.append((f'stair_{i}', q))
    for i in range(3):
        items.append((f'parquet_{i}', parquet(i)))
    for i in range(2):
        items.append((f'tile_{i}', check_tile(i)))
    for i in range(2):
        items.append((f'brick_{i}', brick(i)))
    for i in range(2):
        items.append((f'plaster_{i}', plaster(i)))
    items.append(('trim_0', trim(0)))
    for i in range(6):
        items.append((f'snow_{i}', snow(i)))
    for i in range(2):
        items.append((f'path_{i}', path(i)))
    for i in range(2):
        items.append((f'sidewalk_{i}', sidewalk(i)))
    items.append(('curb_0', curb(0)))
    for i in range(2):
        items.append((f'road_{i}', road(i)))
    for i in range(2):
        items.append((f'hedge_{i}', hedge(i)))
    items.append(('grass_0', grass(0)))
    for i in range(2):
        items.append((f'brickbase_{i}', brickbase(i)))
    items.append(('eave_0', eave()))
    for i in range(2):
        items.append((f'woodsh_{i}', wood_shadow(i)))
    items.append(('woodshl_0', wood_shadow(3, 'l')))
    items.append(('woodshr_0', wood_shadow(5, 'r')))
    for i, q in enumerate(rug9()):
        items.append((f'rg_{i}', q))
    items.append(('black', black()))
    return pack(items)
