"""Casas con detalle (nivel Stardew), Vicente Lopez anos 50, de noche y nevado.

Principios: el techo es un VOLUMEN (faldon que baja hacia nosotros, tejas en
filas, alero grueso que tira sombra sobre la pared), la fachada tiene
profundidad (alfeizares, marcos, postigos, escalones, umbral), materiales con
3-4 tonos y desgaste puntual (un ladrillo mas oscuro, una teja corrida), y la
nieve se apoya en todo lo horizontal: cumbrera, alfeizares, macetas, escalones.

  chalet_salvo     la casa del comic: planta baja de ladrillo, techo a dos
                   aguas con la BUHARDILLA del altillo encendida, chimenea
  chalet_californiano  estilo tipico del conurbano 1940-50: revoque blanco,
                   tejas coloniales rojas, galeria con arcos, rejas, zocalo
                   de piedra laja
"""
import math
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'tools', 'art'))
from pixel import Pix, hx, mix  # noqa: E402

OUT = os.path.join(HERE, 'out')
SNOW = [hx('#6f8ca8'), hx('#8eaec6'), hx('#b4d2e2'), hx('#d8eef6'), hx('#f4fcff')]
SNOW_SH = hx('#5a6e94')
BRK = [hx('#4a2026'), hx('#6a2e32'), hx('#82403e'), hx('#9a5248')]
MORTAR = hx('#5a4a50')
SLATE = [hx('#1e1828'), hx('#2c2236'), hx('#3a2e46'), hx('#4c3c58')]    # tejas oscuras (salvo)
CLAY = [hx('#5a2418'), hx('#7e3420'), hx('#a0482a'), hx('#c06438')]    # tejas coloniales
STUCCO = [hx('#8a8494'), hx('#aaa4b2'), hx('#c8c2cc'), hx('#e2dce2')]  # revoque blanco de noche
STONE = [hx('#3e3a46'), hx('#56505e'), hx('#6e6878'), hx('#8a8494')]
WOOD = [hx('#2a1a12'), hx('#4a2e1c'), hx('#6e4628'), hx('#93603a')]
GREEN = [hx('#16282a'), hx('#22403e'), hx('#2f5a54'), hx('#4a7e6e')]  # postigos
IRON = [hx('#121018'), hx('#24202c'), hx('#3a3444')]
WARM = [hx('#7a3c18'), hx('#c0782c'), hx('#f0b450'), hx('#ffe6a8')]
NIGHTGLASS = [hx('#101a2e'), hx('#1c2a44'), hx('#2e4060')]


def poly(p, pts, c):
    ys = [y for _, y in pts]
    for y in range(int(min(ys)), int(max(ys)) + 1):
        xs = []
        for i in range(len(pts)):
            (x1, y1), (x2, y2) = pts[i], pts[(i + 1) % len(pts)]
            if (y1 <= y < y2) or (y2 <= y < y1):
                xs.append(x1 + (y - y1) * (x2 - x1) / (y2 - y1))
        xs.sort()
        for a, b in zip(xs[::2], xs[1::2]):
            p.hline(round(a), round(b) - 1, y, c)


def brick_wall(p, x0, y0, w, h, rnd):
    p.rect(x0, y0, w, h, MORTAR)
    for r, y in enumerate(range(y0, y0 + h, 4)):
        off = 0 if r % 2 else 4
        for x in range(x0 - off, x0 + w, 8):
            c = BRK[1 + (rnd.random() < 0.3)] if rnd.random() > 0.06 else BRK[0]
            xa, xb = max(x0, x + 1), min(x0 + w - 1, x + 7)
            if xa <= xb:
                p.rect(xa, y, xb - xa + 1, 3, c)
                p.hline(xa, xb, y, mix(c, BRK[3], 0.45))           # luz arriba del ladrillo


def stucco_wall(p, x0, y0, w, h, rnd):
    p.rect(x0, y0, w, h, STUCCO[1])
    for _ in range(w * h // 90):                                   # textura muy sutil
        p.set(x0 + rnd.randrange(w), y0 + rnd.randrange(h), STUCCO[0 if rnd.random() < .4 else 2])
    p.vline(x0, y0, y0 + h - 1, STUCCO[3])


def window(p, x, y, w, h, lit, rnd, shutters=True, reja=False, arch=False):
    # marco hundido + vidrio + cortinas
    p.rect(x - 2, y - 2, w + 4, h + 4, WOOD[1])
    glass = WARM[2] if lit else NIGHTGLASS[1]
    p.rect(x, y, w, h, glass)
    if arch:
        for k in range(w // 2):
            cut = int(round((w // 2) - math.sqrt(max(0, (w / 2) ** 2 - (k - w / 2 + 0.5) ** 2))))
        for xx in range(w):
            dx = xx + 0.5 - w / 2
            top = int(round(w / 2 - math.sqrt(max(0, (w / 2) ** 2 - dx * dx))))
            for yy in range(0, min(top, h)):
                p.set(x + xx, y + yy, WOOD[1])
    if lit:
        p.rect(x, y, 3, h, WARM[1]); p.rect(x + w - 3, y, 3, h, WARM[1])   # cortinas
        p.hline(x, x + w - 1, y, WARM[1])
        p.rect(x + 4, y + h - 6, w - 8, 2, WARM[3])                          # luz del centro
    else:
        p.set(x + 2, y + 2, NIGHTGLASS[2]); p.set(x + 3, y + 3, NIGHTGLASS[2])
    for k in range(2):                                        # el vidrio esta hundido: sombra del marco
        p.hline(x, x + w - 1, y + k, mix(p.get(x + 1, y + k)[:3], hx('#140c18'), 0.5 - k * 0.2))
        p.vline(x + k, y, y + h - 1, mix(p.get(x + k, y + 3)[:3], hx('#140c18'), 0.45 - k * 0.2))
    p.vline(x + w // 2, y, y + h - 1, WOOD[2]); p.hline(x, x + w - 1, y + h // 2, WOOD[2])
    if reja:
        for xx in range(x + 1, x + w, 3):
            p.vline(xx, y, y + h - 1, IRON[1])
        p.hline(x, x + w - 1, y + 2, IRON[2])
    # alfeizar con nieve
    p.rect(x - 3, y + h + 2, w + 6, 2, STONE[2]); p.hline(x - 3, x + w + 2, y + h + 4, STONE[0])
    p.rect(x - 3, y + h, w + 6, 2, SNOW[4]); p.set(x - 3, y + h + 2, SNOW[3])
    if shutters:
        for sx in (x - 2 - 7, x + w + 2):
            p.rect(sx, y - 2, 7, h + 4, GREEN[2])
            for yy in range(y, y + h + 2, 3):
                p.hline(sx + 1, sx + 5, yy, GREEN[1])
            p.vline(sx, y - 2, y + h + 1, GREEN[3]); p.vline(sx + 6, y - 2, y + h + 1, GREEN[0])
            p.hline(sx, sx + 6, y - 3, SNOW[4])


def snow_cap(p, pts_top, depth, rnd):
    """Manto de nieve sobre un borde superior: grosor ondulado y sombra abajo."""
    for x, y in pts_top:
        d = depth + int(2 * math.sin(x * 0.35) + (rnd.random() < .3))
        for k in range(d):
            p.set(x, y + k, SNOW[4] if k < 2 else SNOW[3])
        p.set(x, y + d, SNOW_SH)


def icicles(p, x0, x1, y, rnd):
    for x in range(x0, x1, 3):
        if rnd.random() < 0.55:
            ln = rnd.randrange(2, 6)
            for k in range(ln):
                p.set(x, y + k, SNOW[4] if k == 0 else SNOW[2])


def shingles(p, pts, rows_dy, pal, rnd):
    """Rellena el faldon con filas de tejas que se superponen."""
    poly(p, pts, pal[1])
    ys = [y for _, y in pts]
    for y in range(int(min(ys)) + 2, int(max(ys)), rows_dy):
        off = (y // rows_dy) % 2 * 3
        for x in range(0, p.w):
            c = p.get(x, y)
            if c[3] and c[:3] in (pal[1], pal[2]):
                p.set(x, y, pal[0])                                     # junta de la fila
                if (x + off) % 6 == 0:
                    p.set(x, y + 1, pal[0])                             # junta vertical
                    p.set(x, y + 2, pal[0])
                elif (x + off) % 6 == 1:
                    p.set(x, y + 1, pal[3])                             # borde de luz de la teja
        for x in range(0, p.w, 1):
            if rnd.random() < 0.02:
                c = p.get(x, y + 2)
                if c[3]:
                    p.set(x, y + 2, pal[2])


def side_wall(p, x0, y_top, y_bot, depth, roof_y, material):
    """Costado de la casa en perspectiva: pared lateral oscura que se va hacia
    atras y arriba, y el faldon lateral del techo encima."""
    rise = depth // 2
    for i in range(depth):
        top = y_top - i * rise // depth
        bot = y_bot - i * rise // depth
        for y in range(top, bot):
            c = material(i, y)
            p.set(x0 + i, y, mix(c, hx('#140c18'), 0.45 + i * 0.01))
    for i in range(depth):                                    # nieve en el borde de arriba del costado
        top = y_top - i * rise // depth
        p.set(x0 + i, top, SNOW[3]); p.set(x0 + i, top - 1, SNOW[4])


def chalet_salvo(seed=7):
    rnd = random.Random(seed)
    W, H = 134, 128
    p = Pix(W, H)
    # costado en perspectiva (a la derecha)
    side_wall(p, 112, 72, 118, 14, 72, lambda i, y: BRK[1] if (y // 4 + i // 4) % 2 else BRK[2])
    # paredes laterales en sombra (dan volumen)
    brick_wall(p, 8, 70, 104, 46, rnd)
    for y in range(70, 116):
        for x in range(8, 14):
            c = p.get(x, y); p.set(x, y, mix(c[:3], hx('#140c18'), 0.35))
        for x in range(106, 112):
            c = p.get(x, y); p.set(x, y, mix(c[:3], hx('#140c18'), 0.55))
    # zocalo de piedra
    p.rect(6, 114, 108, 6, STONE[1]); p.hline(6, 113, 114, STONE[3])
    for x in range(8, 112, 9):
        p.vline(x, 115, 119, STONE[0])
    # sombra del alero sobre la pared
    for y in range(70, 76):
        for x in range(8, 112):
            c = p.get(x, y); p.set(x, y, mix(c[:3], hx('#140c18'), 0.55 - (y - 70) * 0.08))
    # techo: faldon delantero (trapecio) con tejas oscuras
    roof = [(22, 14), (98, 14), (118, 68), (2, 68)]
    shingles(p, roof, 4, SLATE, rnd)
    # hastiales (los costados del techo) mas oscuros
    poly(p, [(2, 68), (22, 14), (14, 68)], SLATE[0]); poly(p, [(118, 68), (98, 14), (106, 68)], SLATE[0])
    # alero grueso
    p.rect(0, 66, W, 5, WOOD[1]); p.hline(0, W - 1, 66, WOOD[3]); p.hline(0, W - 1, 70, WOOD[0])
    # cumbrera con nieve gruesa y manto en el faldon
    snow_cap(p, [(x, 12) for x in range(20, 100)], 7, rnd)
    for k, (x0, y0, w) in enumerate(((10, 52, 26), (78, 48, 30), (40, 60, 22), (88, 60, 18), (26, 36, 18))):
        for x in range(x0, x0 + w):
            d = 2 + int(1.5 * math.sin((x - x0) / w * math.pi) * 2)
            for yy in range(d):
                if p.get(x, y0 + yy)[3]:
                    p.set(x, y0 + yy, SNOW[3] if yy == 0 else SNOW[2])
    p.rect(0, 64, W, 3, SNOW[4]); p.hline(0, W - 1, 66, SNOW[3])
    icicles(p, 2, W - 2, 71, rnd)
    # buhardilla (el altillo) encendida en el centro del techo
    poly(p, [(46, 52), (46, 34), (60, 22), (74, 34), (74, 52)], WOOD[2])
    window(p, 52, 34, 16, 14, True, rnd, shutters=False)
    p.hline(54, 65, 44, WOOD[0])                                    # siluetas jugando al truco
    p.rect(55, 40, 3, 4, WOOD[0]); p.rect(61, 39, 3, 5, WOOD[0])
    poly(p, [(42, 36), (60, 18), (78, 36), (74, 36), (60, 22), (46, 36)], SLATE[2])
    snow_cap(p, [(x, 18 + abs(x - 60)) for x in range(43, 78)], 3, rnd)
    # chimenea de ladrillo
    brick_wall(p, 84, 2, 12, 26, rnd); p.vline(95, 2, 27, BRK[0])
    p.rect(82, 0, 16, 4, SNOW[4]); p.hline(82, 97, 4, SNOW_SH)
    # fachada: dos ventanas con postigos verdes, puerta con alerito y escalones
    window(p, 22, 80, 18, 20, True, rnd)
    window(p, 82, 80, 18, 20, False, rnd)
    p.rect(52, 82, 18, 32, WOOD[1]); p.frame(52, 82, 18, 32, WOOD[0])
    p.rect(55, 85, 12, 10, WOOD[2]); p.rect(55, 98, 12, 12, WOOD[2])
    p.rect(58, 87, 6, 5, WARM[2])                                   # mirilla con luz
    p.rect(65, 100, 2, 2, hx('#c8b070'))
    # porche: alero que sobresale con dos postes y su sombra sobre la pared
    for y in range(80, 112):
        for x in range(50, 76):
            c = p.get(x, y)
            if c[3] and (x > 72 or y < 84):
                p.set(x, y, mix(c[:3], hx('#140c18'), 0.35))
    p.rect(44, 74, 34, 5, WOOD[2]); p.hline(44, 77, 74, WOOD[3]); p.hline(44, 77, 78, WOOD[0])
    p.rect(42, 71, 38, 3, SNOW[4]); p.hline(42, 79, 74, SNOW[3])
    for px_ in (45, 75):
        p.rect(px_, 79, 3, 34, WOOD[2]); p.vline(px_, 79, 112, WOOD[3]); p.vline(px_ + 2, 79, 112, WOOD[0])
    p.rect(73, 84, 3, 4, WARM[3])                                    # farolito
    p.rect(50, 114, 22, 3, STONE[2]); p.rect(48, 117, 26, 3, STONE[1])   # escalones
    p.hline(48, 73, 117, SNOW[4]); p.hline(50, 71, 114, SNOW[4])
    p.rect(77, 92, 4, 3, hx('#d8d0b0'))                              # numero de la casa
    # nieve acumulada contra la base, arbustos nevados
    for x in range(4, W - 4):
        d = 3 + int(2 * math.sin(x * 0.2))
        for k in range(d):
            p.set(x, 122 - k, SNOW[3] if k == d - 1 else SNOW[2])
    for bx in (12, 100):
        p.ellipse(bx, 116, 9, 6, GREEN[1]); p.ellipse(bx, 113, 8, 3, SNOW[3]); p.ellipse(bx - 2, 112, 4, 1.5, SNOW[4])
    p.outline(0.56, 0.22)
    return p


def chalet_californiano(seed=11):
    rnd = random.Random(seed)
    W, H = 124, 112
    p = Pix(W, H)
    stucco_wall(p, 6, 58, 100, 44, rnd)
    for y in range(58, 102):                                          # borde derecho en sombra (luz desde arriba-izq)
        for x in range(102, 106):
            c = p.get(x, y); p.set(x, y, mix(c[:3], hx('#1a1626'), 0.35))
    # zocalo de piedra laja irregular
    p.rect(4, 96, 104, 10, STONE[1])
    for _ in range(40):
        x, y = rnd.randrange(5, 106), rnd.randrange(97, 105)
        w = rnd.randrange(4, 9)
        p.hline(x, min(106, x + w), y, STONE[0 if rnd.random() < .5 else 2])
    p.hline(4, 107, 96, STONE[3])
    for y in range(58, 64):                                           # sombra del alero
        for x in range(6, 106):
            c = p.get(x, y); p.set(x, y, mix(c[:3], hx('#1a1626'), 0.5 - (y - 58) * 0.07))
    # techo de tejas coloniales (faldon) con nieve
    roof = [(2, 18), (110, 18), (110, 58), (2, 58)]
    poly(p, roof, CLAY[1])
    for y in range(20, 58, 3):                                        # tejas musleras: canales verticales
        for x in range(4, 108):
            if p.get(x, y)[3]:
                k = (x + (y // 3) % 2 * 2) % 5
                p.set(x, y, CLAY[0] if k == 0 else (CLAY[3] if k == 2 else CLAY[2 if k == 1 else 1]))
                if k == 0:
                    p.set(x, y + 1, CLAY[0])
    snow_cap(p, [(x, 16) for x in range(2, 110)], 8, rnd)
    for x0, y0, w in ((8, 44, 30), (60, 40, 34), (36, 52, 24)):
        for x in range(x0, x0 + w):
            d = 2 + int(2 * math.sin((x - x0) / w * math.pi))
            for yy in range(d):
                if p.get(x, y0 + yy)[3]:
                    p.set(x, y0 + yy, SNOW[3] if yy == 0 else SNOW[2])
    p.rect(0, 56, W, 3, SNOW[4]); p.hline(0, W - 1, 59, SNOW_SH)
    icicles(p, 2, W - 2, 60, rnd)
    # galeria con dos arcos y columnas
    p.rect(14, 66, 46, 30, hx('#2a2434'))
    for ax in (16, 38):                                                # arcos
        for xx in range(20):
            dx = xx + 0.5 - 10
            top = int(round(10 - math.sqrt(max(0, 100 - dx * dx))))
            for yy in range(0, top):
                p.set(ax + xx, 66 + yy, STUCCO[2])
    for cx in (14, 36, 58):                                            # columnas
        p.rect(cx, 66, 3, 30, STUCCO[3]); p.vline(cx + 2, 66, 95, STUCCO[0])
    p.rect(22, 72, 14, 22, WOOD[1]); p.rect(25, 76, 8, 6, WARM[2])     # puerta con vidrio
    p.rect(40, 74, 14, 14, IRON[1])                                    # reja de la galeria
    for xx in range(41, 54, 3):
        p.vline(xx, 74, 87, IRON[2])
    p.hline(14, 60, 95, SNOW[4]); p.hline(14, 60, 94, SNOW[3])         # nieve en el piso de la galeria
    # ventana grande con reja
    window(p, 72, 68, 22, 18, True, rnd, shutters=False, reja=True)
    p.rect(70, 92, 26, 4, hx('#5a3a24')); p.hline(70, 95, 91, SNOW[4])   # macetero con nieve
    # farol de pared
    p.rect(64, 70, 3, 5, WARM[3]); p.vline(65, 66, 69, IRON[1])
    # nieve contra la base
    for x in range(2, W - 2):
        d = 3 + int(2 * math.sin(x * 0.17 + 1))
        for k in range(d):
            p.set(x, 108 - k, SNOW[3] if k == d - 1 else SNOW[2])
    p.outline(0.56, 0.22)
    return p


def build():
    os.makedirs(OUT, exist_ok=True)
    a = chalet_salvo_deep(); b = chalet_californiano()
    a.img.save(os.path.join(OUT, 'house_salvo.png')); b.img.save(os.path.join(OUT, 'house_californiano.png'))
    from PIL import Image
    sheet = Image.new('RGBA', (a.w + b.w + 30, max(a.h, b.h) + 10), (18, 22, 44, 255))
    sheet.alpha_composite(a.img, (5, 5)); sheet.alpha_composite(b.img, (a.w + 25, 5 + a.h - b.h))
    sheet.resize((sheet.width * 4, sheet.height * 4), 0).save(os.path.join(OUT, 'houses_detail_x4.png'))



# ------------------------------------------------------------ con profundidad de verdad
def planter(p, x, y, w, rnd):
    """Macetero que sobresale bajo la ventana: cara frontal, borde de arriba
    con nieve y ramitas secas asomando."""
    p.rect(x, y, w, 6, WOOD[2]); p.hline(x, x + w - 1, y, WOOD[3]); p.hline(x, x + w - 1, y + 5, WOOD[0])
    p.vline(x + w - 1, y, y + 5, WOOD[1])
    for k in range(x + 2, x + w - 2, 3):
        p.vline(k, y - 3 - (k % 2), y - 1, hx('#3a2a20'))
    p.hline(x, x + w - 1, y - 1, SNOW[4]); p.hline(x + 1, x + w - 2, y - 2, SNOW[3])


def post(p, x, y0, y1, w=4):
    """Poste de madera en la esquina del cuerpo que avanza."""
    p.rect(x, y0, w, y1 - y0, WOOD[2])
    p.vline(x, y0, y1 - 1, WOOD[3]); p.vline(x + w - 1, y0, y1 - 1, WOOD[0])
    p.rect(x - 1, y0 - 2, w + 2, 3, WOOD[1]); p.hline(x - 1, x + w, y0 - 3, SNOW[4])


def plane_rows(p, pts, base, dark, light, step=4):
    """Faldon con filas de tejas paralelas al alero."""
    poly(p, pts, base)
    ys = [y for _, y in pts]
    for y in range(int(min(ys)) + 2, int(max(ys)), step):
        for x in range(p.w):
            c = p.get(x, y)
            if c[3] and c[:3] == base:
                p.set(x, y, dark)
                if (x + y // step * 3) % 6 == 0:
                    p.set(x, y + 1, dark); p.set(x, y + 2, dark)
                elif (x + y // step * 3) % 6 == 1:
                    p.set(x, y + 1, light)


def chalet_salvo_deep(seed=7):
    rnd = random.Random(seed)
    W, H = 128, 122
    p = Pix(W, H)
    # 1) alas (atras): techo que se aleja y pared de ladrillo
    roof = [(2, 12), (126, 12), (126, 58), (2, 58)]
    shingles(p, roof, 4, SLATE, rnd)
    snow_cap(p, [(x, 10) for x in range(2, 126)], 6, rnd)
    brick_wall(p, 8, 61, 112, 45, rnd)
    p.rect(6, 104, 116, 5, STONE[1]); p.hline(6, 121, 104, STONE[3])
    for y in range(61, 67):                                       # sombra del alero sobre la pared
        for x in range(8, 120):
            c = p.get(x, y); p.set(x, y, mix(c[:3], hx('#140c18'), 0.55 - (y - 61) * 0.08))
    p.rect(0, 56, W, 5, WOOD[1]); p.hline(0, W - 1, 56, WOOD[3]); p.hline(0, W - 1, 60, WOOD[0])
    p.rect(0, 54, W, 3, SNOW[4]); icicles(p, 2, W - 2, 61, rnd)
    # chimenea sobre el ala derecha
    brick_wall(p, 100, 0, 11, 32, rnd); p.vline(110, 0, 31, BRK[0]); p.rect(98, 0, 15, 3, SNOW[4])
    # ventanas de las alas, hundidas, con postigos y maceteros que sobresalen
    window(p, 16, 72, 16, 18, True, rnd)
    window(p, 96, 72, 16, 18, False, rnd)
    planter(p, 12, 96, 24, rnd); planter(p, 92, 96, 24, rnd)
    # 2) el cuerpo central que avanza: tira sombra sobre el ala derecha
    for y in range(61, 106):
        for x in range(88, 100):
            c = p.get(x, y)
            if c[3]:
                p.set(x, y, mix(c[:3], hx('#140c18'), 0.42 * (1 - (x - 88) / 12)))
    brick_wall(p, 42, 54, 44, 58, rnd)
    for y in range(54, 112):                                       # el frente esta mas cerca: un poco mas claro
        for x in range(42, 86):
            c = p.get(x, y); p.set(x, y, mix(c[:3], hx('#ffd8b0'), 0.06))
    p.rect(40, 110, 48, 5, STONE[2]); p.hline(40, 87, 110, STONE[3])
    # hastial de frente (madera) con la ventana del altillo encendida
    poly(p, [(64, 20), (88, 55), (40, 55)], WOOD[2])
    for x in range(42, 87, 4):
        for y in range(22, 54):
            if p.get(x, y)[:3] == WOOD[2]:
                p.set(x, y, WOOD[1])
    window(p, 57, 34, 14, 12, True, rnd, shutters=False)
    p.hline(59, 68, 42, WOOD[0]); p.rect(60, 38, 2, 4, WOOD[0]); p.rect(65, 37, 2, 5, WOOD[0])   # el truco
    # 3) techo del cuerpo central, como en Stardew: dos bandas gruesas de tejas
    #    que forman una "^" sobre el hastial; arriba nieve, abajo moldura de madera
    for y in range(14, 57):                                        # sombra suave sobre el techo de atras
        for x in range(92, 106):
            c = p.get(x, y)
            if c[3] and c[:3] in SLATE:
                p.set(x, y, mix(c[:3], hx('#0c0812'), 0.35 * (1 - (x - 92) / 12)))
    LIT = [hx('#3a2e46'), hx('#5a4a6a'), hx('#6e5c80'), hx('#8a789c')]
    def band(pts, pal, outer, inner):
        plane_rows(p, pts, pal[2], pal[0], pal[3])
        for (x0, y0), (x1, y1) in (outer,):                         # borde de arriba: nieve gruesa
            n = max(abs(x1 - x0), abs(y1 - y0))
            for k in range(n + 1):
                x = round(x0 + (x1 - x0) * k / n); y = round(y0 + (y1 - y0) * k / n)
                p.set(x, y - 1, SNOW[4]); p.set(x, y, SNOW[3]); p.set(x, y + 1, SNOW[2])
        for (x0, y0), (x1, y1) in (inner,):                         # borde de abajo: moldura de madera
            n = max(abs(x1 - x0), abs(y1 - y0))
            for k in range(n + 1):
                x = round(x0 + (x1 - x0) * k / n); y = round(y0 + (y1 - y0) * k / n)
                p.set(x, y, WOOD[3]); p.set(x, y + 1, WOOD[1]); p.set(x, y + 2, WOOD[0])
    plane_rows(p, [(64, 2), (64, 20), (36, 56), (36, 38)], LIT[2], LIT[0], LIT[3])        # faldon iluminado
    plane_rows(p, [(64, 2), (92, 38), (92, 56), (64, 20)], SLATE[1], SLATE[0], SLATE[2])   # faldon en sombra
    def line(x0, y0, x1, y1, cols):
        n = max(abs(x1 - x0), abs(y1 - y0))
        for k in range(n + 1):
            x = round(x0 + (x1 - x0) * k / n); y = round(y0 + (y1 - y0) * k / n)
            for t, c in enumerate(cols):
                p.set(x, y + t, c)
    line(64, 20, 36, 56, (WOOD[3], WOOD[1], WOOD[0]))                # molduras del hastial (frente)
    line(64, 20, 92, 56, (WOOD[2], WOOD[0], WOOD[0]))
    line(64, 1, 36, 37, (SNOW[4], SNOW[3], SNOW[1]))                 # limahoyas con nieve acumulada
    line(64, 1, 92, 37, (SNOW[4], SNOW[3], SNOW[1]))
    for y in range(1, 21):                                           # cumbrera vertical nevada
        p.set(63, y, SNOW[4]); p.set(64, y, SNOW[3]); p.set(65, y, SNOW[2])
    icicles(p, 36, 46, 55, rnd); icicles(p, 82, 92, 55, rnd)
    # 4) postes en las esquinas del cuerpo central
    post(p, 39, 56, 111); post(p, 85, 56, 111)
    # 5) puerta hundida en un arco, farolito, escalones que sobresalen
    p.rect(54, 76, 20, 35, hx('#1a1018'))
    for xx in range(20):
        dx = xx + 0.5 - 10
        top = int(round(10 - math.sqrt(max(0, 100 - dx * dx))))
        for yy in range(top):
            p.set(54 + xx, 76 + yy, mix(BRK[1], hx('#ffd8b0'), 0.06))
    p.rect(57, 80, 14, 30, WOOD[1]); p.frame(57, 80, 14, 30, WOOD[0])
    p.circle(64, 87, 3, WARM[2]); p.frame(60, 94, 8, 12, WOOD[2]); p.set(69, 99, hx('#c8b070'))
    p.rect(76, 82, 3, 4, WARM[3]); p.vline(77, 78, 81, IRON[1])
    p.rect(50, 114, 28, 3, STONE[2]); p.rect(46, 117, 36, 4, STONE[1])
    p.hline(46, 81, 117, SNOW[4]); p.hline(50, 77, 114, SNOW[4])
    # nieve contra la base y arbustos
    for x in range(2, W - 2):
        if not (44 < x < 84):
            d = 3 + int(2 * math.sin(x * 0.2))
            for k in range(d):
                p.set(x, 112 - k, SNOW[3] if k == d - 1 else SNOW[2])
    for bx in (10, 118):
        p.ellipse(bx, 108, 9, 6, GREEN[1]); p.ellipse(bx, 105, 8, 3, SNOW[3])
    p.outline(0.56, 0.22)
    return p



# ------------------------------------------------------------ hastial de frente (como Stardew)
def front_gable_house(style='salvo', seed=7):
    """La fachada es el hastial; los dos faldones se van hacia atras SUBIENDO en
    pantalla (paralelogramos), cumbrera vertical, borde trasero del techo arriba.
    Tejas en filas paralelas al borde; faldon izquierdo con luz, derecho en sombra."""
    rnd = random.Random(seed)
    W, H = 124, 132
    p = Pix(W, H)
    ax, ay = 62, 46          # punta del hastial (frente)
    D = 40                   # profundidad del techo (cuanto sube hacia atras)
    lx, rx_, ey = 4, 120, 82 # aleros izquierdo/derecho
    if style == 'salvo':
        ROOFP = [SLATE[0], SLATE[1], SLATE[2], SLATE[3]]
        LITP = [hx('#3a2e46'), hx('#5a4a6a'), hx('#6e5c80'), hx('#8a789c')]
    else:
        ROOFP = [CLAY[0], hx('#6a2c1c'), CLAY[1], CLAY[2]]
        LITP = [CLAY[1], CLAY[2], CLAY[3], hx('#d88a58')]

    def rake_y(x):           # altura del borde delantero del techo en x
        return ay + abs(x - ax) * (ey - ay) / (ax - lx)

    # 1) faldones que suben hacia atras
    for x in range(lx, rx_ + 1):
        y_front = rake_y(x)
        for y in range(int(y_front - D), int(y_front) + 1):
            left = x < ax
            pal = LITP if left else ROOFP
            d = y_front - y                                   # distancia al borde delantero
            row = int(d) // 5
            c = pal[2]
            if int(d) % 5 == 0:
                c = pal[0]                                    # junta de la fila (paralela al borde)
            elif int(d) % 5 == 1:
                c = pal[3] if left else pal[2]                # labio de luz de la teja
            if int(d) % 5 not in (0,) and (x + row * 4) % 9 == 0:
                c = pal[1]                                    # junta vertical
            if not left and x > ax + 1:
                c = mix(c, hx('#0c0812'), 0.15)
            p.set(x, y, c)
    for y in range(ay - D, ay + 1):                           # cumbrera vertical
        p.set(ax, y, LITP[3]); p.set(ax + 1, y, ROOFP[0])
    # nieve: manto en la parte de atras de los faldones y sobre la cumbrera
    for x in range(lx, rx_ + 1):
        top = int(rake_y(x) - D)
        depth = 9 + int(3 * math.sin(x * 0.17)) - int(abs(x - ax) * 0.05)
        for k in range(max(2, depth)):
            p.set(x, top + k, SNOW[4] if k < 2 else (SNOW[3] if x < ax else SNOW[2]))
        p.set(x, top + max(2, depth), SNOW_SH)
    for y in range(ay - D, ay):
        p.set(ax, y, SNOW[4]); p.set(ax + 1, y, SNOW[3])
    # 2) fachada: paredes y hastial
    wall_top = ey - 2
    if style == 'salvo':
        brick_wall(p, 12, wall_top, 100, 120 - wall_top, rnd)
    else:
        stucco_wall(p, 12, wall_top, 100, 120 - wall_top, rnd)
    for x in range(12, 112):                                  # hastial (triangulo) del frente
        yt = int(rake_y(x)) + 3
        for y in range(yt, wall_top + 1):
            if style == 'salvo':
                c = WOOD[2] if x % 5 else WOOD[1]             # tablas verticales
            else:
                c = STUCCO[2] if (x * 3 + y) % 31 else STUCCO[1]
            p.set(x, y, c)
    p.hline(12, 111, wall_top, WOOD[1]); p.hline(12, 111, wall_top + 1, WOOD[0])   # viga entre pisos
    for y in range(wall_top + 2, 120):                        # bordes de la fachada con luz/sombra
        p.set(12, y, mix(p.get(12, y)[:3], hx('#ffffff'), 0.15))
        p.set(111, y, mix(p.get(111, y)[:3], hx('#140c18'), 0.4))
    # moldura gruesa del borde delantero (rake) y alero
    for x in range(lx, rx_ + 1):
        y = int(rake_y(x))
        for t, c in enumerate((SNOW[4], WOOD[3] if x < ax else WOOD[2], WOOD[1], WOOD[0])):
            p.set(x, y + t - 1, c)
    icicles(p, lx + 2, lx + 18, ey + 3, rnd); icicles(p, rx_ - 18, rx_ - 2, ey + 3, rnd)
    # ventana del altillo en el hastial (encendida, el truco)
    window(p, ax - 8, ay + 12, 16, 13, True, rnd, shutters=False)
    p.hline(ax - 6, ax + 5, ay + 21, WOOD[0]); p.rect(ax - 5, ay + 17, 2, 4, WOOD[0]); p.rect(ax + 1, ay + 16, 2, 5, WOOD[0])
    # chimenea sobre el faldon derecho (frente + tapa)
    cx0, cy0 = 88, int(rake_y(88) - D) - 4
    brick_wall(p, cx0, cy0, 12, 26, rnd); p.vline(cx0 + 11, cy0, cy0 + 25, BRK[0])
    p.rect(cx0 - 2, cy0 - 3, 16, 4, SNOW[4]); p.hline(cx0 - 2, cx0 + 13, cy0 + 1, SNOW_SH)
    # planta baja: dos ventanas, puerta con alerito, escalones, maceteros
    window(p, 22, 92, 16, 16, True, rnd)
    window(p, 86, 92, 16, 16, False, rnd)
    p.rect(52, 94, 20, 26, WOOD[1]); p.frame(52, 94, 20, 26, WOOD[0])
    p.rect(55, 97, 14, 9, WOOD[2]); p.circle(62, 101, 2.5, WARM[2]); p.set(68, 108, hx('#c8b070'))
    p.rect(48, 89, 28, 4, WOOD[2]); p.hline(48, 75, 89, WOOD[3]); p.rect(46, 87, 32, 2, SNOW[4])
    p.rect(76, 96, 3, 4, WARM[3])
    p.rect(50, 120, 24, 3, STONE[2]); p.rect(46, 123, 32, 4, STONE[1]); p.hline(46, 77, 123, SNOW[4])
    planter(p, 18, 114, 24, rnd); planter(p, 82, 114, 24, rnd)
    p.rect(10, 120, 104, 3, STONE[1]); p.hline(10, 113, 120, STONE[3])
    for x in range(4, W - 4):                                 # nieve contra la base
        if not (46 < x < 78):
            d = 3 + int(2 * math.sin(x * 0.2))
            for k in range(d):
                p.set(x, 126 - k, SNOW[3] if k == d - 1 else SNOW[2])
    p.outline(0.56, 0.22)
    return p


# las escenas usan la casa con hastial de frente (perspectiva Stardew)
chalet_salvo_deep = lambda seed=7: front_gable_house('salvo', seed)
chalet_californiano = lambda seed=11: front_gable_house('californiano', seed)


if __name__ == '__main__':
    build()
    print('ok')
