"""Mockup de la planta baja del chalet de los Salvo (pags. 021-025, 032, 040).

Plano (28x16 tiles = 448x256, entra en la vista de 480x270):

  arriba:  LIVING (escalera con baranda de hierro, ventana, sillon, radio,
           biblioteca) | HALL (puerta de calle con ojo de buey ovalado,
           SELLADA con tiras de goma; perchero; reloj de pared) | GARAGE
           (la camara de salida: porton a la calle, extractor hecho con el
           secador de Elena, estante, banco)
  abajo:   DORMITORIO (cama, mesa de luz con velador, ropero con el rifle)
           | CUARTO DE MARTITA (cuna de barrotes, caballito) | COCINA
           (pared de azulejos, alacena con frascos, mesa con latas y la
           lampara de aceite, cocina a gas)
"""
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')
sys.path.insert(0, os.path.join(ROOT, 'tools', 'art'))
import objects as ob  # noqa: E402
from pixel import Pix, hx, mix  # noqa: E402
from PIL import Image  # noqa: E402

OUT = os.path.join(HERE, 'out')
COLS, ROWS = 28, 16
IRON = [hx('#1c1a22'), hx('#2e2b36'), hx('#4a4656')]
TAPE = hx('#3a3634')


# ------------------------------------------------------------ piezas nuevas
def door_porthole():
    """Puerta de calle con ojo de buey ovalado y barrotes (pag. 022), sellada."""
    p = Pix(20, 34)
    ob.box(p, 1, 1, 18, 32, ob.WD)
    p.frame(3, 4, 14, 26, ob.WD[1])
    for y in range(7, 19):                                     # ojo de buey ovalado
        for x in range(5, 15):
            if ((x + 0.5 - 10) / 4.6) ** 2 + ((y + 0.5 - 13) / 5.8) ** 2 <= 1:
                p.set(x, y, ob.NG[1])
    for x in (8, 10, 12):
        p.vline(x, 8, 18, IRON[1])
    p.set(7, 9, ob.SN[2])
    p.rect(15, 20, 2, 2, ob.BR[2])                               # picaporte
    for k in range(18):                                          # tiras de goma que la sellan
        p.set(1 + k, 2 + k + k // 2, TAPE); p.set(18 - k, 2 + k + k // 2, TAPE)
    p.vline(1, 1, 32, TAPE); p.vline(18, 1, 32, TAPE)
    return ob.finish(p, (10, 33, 9, 1))


def wall_clock():
    p = Pix(12, 18)
    p.rect(3, 0, 6, 16, ob.WD[1]); p.vline(3, 0, 15, ob.WD[2])
    p.circle(6, 5, 3.6, ob.CR[3]); p.set(6, 3, ob.BK[1]); p.set(6, 4, ob.BK[1]); p.set(7, 5, ob.BK[1])
    p.vline(6, 10, 13, ob.BR[2]); p.rect(5, 13, 3, 2, ob.BR[2])     # pendulo
    return ob.finish(p)


def railing():
    """Baranda de hierro de la escalera (pag. 022): pasamanos en diagonal."""
    p = Pix(16, 36)
    for k in range(14):
        y = 4 + k * 2
        p.set(1 + k, y, IRON[2]); p.set(1 + k, y + 1, IRON[1])
        if k % 3 == 0:
            p.vline(1 + k, y + 1, min(35, y + 10), IRON[1])
    p.circle(2, 4, 1.6, IRON[2])                                 # bocha del arranque
    return ob.finish(p)


def garage_door():
    p = Pix(48, 34)
    ob.box(p, 1, 1, 46, 32, ob.MT)
    for y in range(4, 32, 4):
        p.hline(3, 44, y, ob.MT[0]); p.hline(3, 44, y + 1, ob.MT[2])
    p.rect(21, 26, 6, 2, ob.BK[1])
    p.hline(1, 46, 0, ob.SN[3])
    return ob.finish(p, (24, 33, 22, 1))


def extractor():
    """El extractor improvisado con el secador de pelo de Elena (pag. 040)."""
    p = Pix(16, 20)
    p.circle(8, 7, 6, ob.MT[1]); p.circle(8, 7, 4.5, ob.BK[1])
    for a in range(0, 360, 60):
        r = math.radians(a)
        p.set(8 + round(3 * math.cos(r)), 7 + round(3 * math.sin(r)), ob.MT[3])
    p.set(8, 7, ob.MT[2])
    p.rect(9, 13, 6, 3, ob.RD[2]); p.rect(13, 12, 3, 5, ob.RD[1])  # el secador, colgado
    p.vline(4, 13, 19, ob.BK[2])                                  # cable
    return ob.finish(p)


def bed():
    p = Pix(32, 34)
    ob.box(p, 1, 1, 30, 8, ob.WD)                                 # respaldo
    p.rect(3, 9, 26, 22, ob.CR[2]); p.hline(3, 28, 9, ob.CR[3])
    p.rect(5, 10, 9, 5, ob.CR[3]); p.rect(18, 10, 9, 5, ob.CR[3])   # almohadas
    p.rect(3, 16, 26, 15, hx('#6e4a62')); p.hline(3, 28, 16, hx('#8e6880'))
    for y in range(19, 31, 4):
        p.hline(4, 27, y, hx('#5c3c52'))
    p.rect(1, 30, 30, 3, ob.WD[1])
    return ob.finish(p, (16, 33, 15, 1))


def nightstand():
    p = Pix(16, 28)
    ob.box(p, 2, 14, 12, 12, ob.WD)
    p.hline(5, 10, 19, ob.WD[3])
    p.rect(6, 9, 4, 5, ob.CR[2])                                  # velador
    p.rect(4, 3, 8, 6, ob.GL[2]); p.hline(4, 11, 3, ob.GL[3]); p.hline(4, 11, 8, ob.GL[1])
    p.rect(9, 11, 4, 3, ob.RD[1])                                 # libro
    return ob.finish(p, (8, 27, 6, 1))


def crib():
    """Cuna de barrotes (pag. 021)."""
    p = Pix(28, 26)
    p.rect(2, 10, 24, 12, ob.CR[2]); p.rect(4, 11, 8, 4, ob.CR[3])
    p.hline(1, 26, 2, ob.WD[2]); p.hline(1, 26, 22, ob.WD[1])
    for x in range(1, 27, 3):
        p.vline(x, 2, 23, ob.WD[2] if x < 14 else ob.WD[1])
    p.rect(14, 13, 8, 6, hx('#a8c4d8'))                           # mantita
    return ob.finish(p, (14, 25, 12, 1))


def toy_horse():
    """Caballito de juguete (pag. 021)."""
    p = Pix(16, 16)
    p.rect(4, 6, 8, 4, ob.CR[3]); p.rect(10, 2, 3, 6, ob.CR[3])
    p.set(11, 3, ob.BK[1]); p.rect(9, 2, 2, 3, ob.RD[2])
    p.vline(5, 10, 13, ob.CR[1]); p.vline(10, 10, 13, ob.CR[1])
    for x in range(2, 15):                                        # balancin
        p.set(x, 14 - (1 if 4 < x < 12 else 0), ob.RD[1])
    p.set(4, 6, ob.RD[2])
    return ob.finish(p, (8, 15, 6, 1))


def alacena():
    """Alacena con puertas de vidrio y frascos grandes oscuros (pag. 025)."""
    p = Pix(48, 36)
    ob.box(p, 1, 1, 46, 34, ob.LW)
    for x0 in (4, 25):
        p.rect(x0, 4, 19, 14, ob.NG[1])
        p.frame(x0, 4, 19, 14, ob.LW[0])
        for k, jx in enumerate(range(x0 + 2, x0 + 17, 5)):
            p.rect(jx, 9, 4, 8, mix(ob.GR[0], ob.BK[1], 0.4) if k % 2 else ob.BR[1])
            p.hline(jx, jx + 3, 8, ob.MT[2]); p.set(jx, 10, ob.CR[3])
    p.rect(4, 21, 40, 11, ob.LW[1]); p.vline(24, 21, 31, ob.LW[0])
    p.set(21, 26, ob.BR[3]); p.set(27, 26, ob.BR[3])
    return ob.finish(p, (24, 35, 22, 1))


def oil_lamp_lit():
    p = Pix(10, 14)
    p.rect(3, 9, 4, 4, ob.BR[2]); p.hline(2, 7, 12, ob.BR[1])
    p.rect(3, 3, 4, 6, hx('#f6e8c0')); p.set(4, 5, ob.GL[3]); p.set(5, 6, ob.GL[2])
    return p


# ------------------------------------------------------------ armado
def load_tiles():
    img = Image.open(os.path.join(ROOT, 'public', 'assets', 'tiles.png')).convert('RGBA')
    fr = json.load(open(os.path.join(ROOT, 'public', 'assets', 'tiles.json')))['frames']
    return {k: img.crop((v[0], v[1], v[0] + v[2], v[1] + v[3])) for k, v in fr.items()}


def plan():
    g = [['black'] * COLS for _ in range(ROWS)]
    def fill(x0, y0, x1, y1, fn):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                g[y][x] = fn(x, y)
    alt = lambda a, b: (lambda x, y: a if (x + y) % 2 else b)
    # banda de arriba: paredes (filas 1-2) y pisos (3-8)
    fill(1, 1, 26, 1, lambda x, y: f'plaster_{x % 2}')
    fill(1, 2, 26, 2, lambda x, y: 'trim_0')
    fill(1, 3, 11, 8, lambda x, y: f'parquet_{(x * 7 + y) % 3}')       # living
    fill(13, 3, 17, 8, lambda x, y: f'parquet_{(x + y) % 3}')           # hall
    fill(19, 3, 26, 8, lambda x, y: f'plaster_{(x * 3 + y) % 2}')       # garage: piso de cemento
    # pared del medio vista de frente (filas 9-10); azulejos sobre la cocina
    fill(1, 9, 26, 9, lambda x, y: 'tile_1' if x >= 17 else f'plaster_{x % 2}')
    fill(1, 10, 26, 10, lambda x, y: 'tile_0' if x >= 17 else 'trim_0')
    # banda de abajo (11-14)
    fill(1, 11, 8, 14, lambda x, y: f'parquet_{(x + y * 2) % 3}')      # dormitorio
    fill(10, 11, 15, 14, lambda x, y: f'wood_{(x + y) % 6}')           # cuarto de Martita
    fill(17, 11, 26, 14, alt('tile_0', 'tile_1'))                       # cocina
    # tabiques (vistos desde arriba) y puertas
    for x in (12, 18):
        fill(x, 1, x, 8, lambda xx, yy: f'plank_{yy % 3}')
    for x in (9, 16):
        fill(x, 9, x, 14, lambda xx, yy: f'plank_{yy % 3}')
    for x, y in ((12, 5), (12, 6), (18, 6), (18, 7)):
        g[y][x] = f'parquet_{x % 3}'
    for x in (5, 14, 20):                                                  # vanos en la pared del medio
        for y in (9, 10):
            g[y][x] = f'parquet_{(x + y) % 3}' if x < 17 else 'tile_0'
    # escalera
    for (x, y, t) in ((1, 3, 'stair_0'), (2, 3, 'stair_1'), (1, 4, 'stair_2'), (2, 4, 'stair_3')):
        g[y][x] = t
    # alfombra del living
    for j in range(3):
        for i in range(5):
            c = 0 if i == 0 else 2 if i == 4 else 1
            r = 0 if j == 0 else 2 if j == 2 else 1
            g[5 + j][5 + i] = f'rg_{r * 3 + c}'
    return g


def build():
    tiles = load_tiles()
    g = plan()
    sc = Pix(COLS * 16, ROWS * 16)
    for y in range(ROWS):
        for x in range(COLS):
            sc.img.alpha_composite(tiles[g[y][x]], (x * 16, y * 16))
    sc.px = sc.img.load()
    import edges
    edges.soften(sc, g)

    def put(spr, tx, ty_bottom, ox=0, oy=0):
        img = spr.img if hasattr(spr, 'img') else spr
        sc.img.alpha_composite(img, (int(tx * 16 + ox), int(ty_bottom * 16 - img.height + oy)))

    # living
    put(railing(), 3, 5, -4, 0)
    put(ob.window_glow(), 6, 3, 8, -2)
    put(ob.shelf(), 9, 3, 0, -2)
    put(ob.sofa(), 5, 4, 8, 0)
    put(ob.radio_cabinet(), 2, 8, 0, 0)
    put(ob.living_table(), 6, 7, 8, 0)
    put(ob.armchair(), 10, 6)
    put(ob.armchair(), 4, 7, 2, 0)
    # hall
    put(door_porthole(), 14, 3, 6, 1)
    put(ob.coat_stand(), 13, 4, 0, 0)
    put(wall_clock(), 16, 2, 6, -8)
    # garage
    put(garage_door(), 22, 3, 0, 1)
    put(extractor(), 25, 2, 4, -4)
    put(ob.garage_shelf(), 19, 4, 0, 0)
    put(ob.workbench(), 23, 8, 8, 0)
    put(ob.tire(), 19, 8, 2, 0)
    put(ob.cans(), 21, 8, 4, -2); put(ob.bucket(), 26, 6, 4, 0)
    # dormitorio
    put(bed(), 1, 13, 4, 0)
    put(nightstand(), 3, 12, 6, 0)
    put(ob.wardrobe(), 6, 12, 8, 0)
    # cuarto de Martita
    put(crib(), 10, 13, 4, 0)
    put(toy_horse(), 13, 14, 4, 0)
    put(ob.box(Pix(16, 16), 1, 4, 14, 11, ob.LW) or Pix(1, 1), 15, 12)
    # cocina
    put(alacena(), 17, 12, 4, 0)
    put(ob.stove(), 25, 12, 4, 0)
    put(ob.living_table(), 21, 14, 0, 0)
    put(oil_lamp_lit(), 21, 13, 10, 2)
    put(ob.cans(), 22, 13, 6, 3); put(ob.jar(), 21, 13, 2, 3)

    # luz calida de las lamparas / ventana fria
    def glow(cx, cy, r, col, a):
        for y in range(int(cy - r), int(cy + r)):
            for x in range(int(cx - r), int(cx + r)):
                if 0 <= x < sc.w and 0 <= y < sc.h:
                    d = math.hypot(x - cx, (y - cy) * 1.3) / r
                    if d < 1:
                        c = sc.get(x, y)
                        sc.set(x, y, mix(c[:3], col, (1 - d) ** 2 * a))
    glow(21 * 16 + 15, 13 * 16 - 4, 52, hx('#ffd890'), 0.35)          # lampara de aceite
    glow(3 * 16 + 14, 12 * 16 - 20, 34, hx('#ffd890'), 0.30)          # velador
    glow(7 * 16, 3 * 16 + 8, 40, hx('#bdeffa'), 0.18)                 # ventana nevada

    os.makedirs(OUT, exist_ok=True)
    full = Pix(480, 270)
    full.img = Image.new('RGBA', (480, 270), (11, 12, 29, 255))
    full.img.alpha_composite(sc.img, ((480 - sc.w) // 2, (270 - sc.h) // 2))
    full.img.save(os.path.join(OUT, 'house_mockup.png'))
    full.img.resize((960, 540), 0).save(os.path.join(OUT, 'house_mockup_x2.png'))
    pieces = [door_porthole(), wall_clock(), railing(), garage_door(), extractor(), bed(),
              nightstand(), crib(), toy_horse(), alacena()]
    wsum = sum(s.w for s in pieces) + 8 * (len(pieces) + 1)
    hmax = max(s.h for s in pieces) + 16
    sheet = Pix(wsum, hmax); x = 8
    for s in pieces:
        sheet.img.alpha_composite(s.img, (x, hmax - 8 - s.h)); x += s.w + 8
    sheet.img.resize((sheet.w * 4, sheet.h * 4), 0).save(os.path.join(OUT, 'house_pieces_x4.png'))


if __name__ == '__main__':
    build()
    print('ok')
