"""El traje (concept detallado), fiel a las paginas 040-042 del comic.

Mameluco amplio de tela engomada CLARA con pliegues gruesos; capucha que
envuelve la cabeza; visor redondo de marco grueso (se ve oscuro, con la cara
de Juan apenas visible); filtro redondo saliente a la altura de la boca;
sellos de goma en cuello, munecas, cintura y tobillos; guantes de goma,
botas, cartuchera y el rifle.
"""
import math
import os
from characters import GRIDS, palette, portrait, from_grid
from pixel import Pix, hx, mix

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')

C = {k: hx(v) for k, v in {
    'F': '#cfc9b8', 'f': '#a19c8e', 'D': '#6f6c66', 'W': '#ece8dc',     # tela engomada
    'c': '#6a6660', 'C': '#8c8880',                                      # sellos de goma
    'L': '#6a4a2e', 'l': '#46301e', 'Y': '#b89a5a',                      # cartuchera y hebilla
    'K': '#7a7e84', 'k': '#55585e',                                      # guantes
    'Q': '#b8a87a', 'q': '#8a7c56',                                      # guante de cocina desparejo
    'P': '#bcb4a0', 'Z': '#8e866e',                                      # parche y su costura
    'T': '#3a3634', 't': '#5a5650',                                      # tiras de goma enrolladas
    'B': '#2e2a2a', 'b': '#1c1a1a',                                      # botas
    'R': '#3a2a20', 'r': '#6a5a4a',                                      # rifle: madera, metal
}.items()}
RIM, RIM2, RIM_HI = hx('#3e434c'), hx('#262a32'), hx('#8a94a0')
GLASS = hx('#22303e')
FILTER, FILTER2, FILTER_HI = hx('#4a4e56'), hx('#2c2f36'), hx('#a4acb6')

BODY_FRONT = [
    "....TtTtTtTt....",
    "..WWFFFZFFFFff..",
    ".WWZPPZFfFFFFff.",
    ".WFZPPZZFFFFFff.",
    ".WFZZZZFfFFFFDf.",
    ".WFFFFFZFfFFFDf.",
    ".WFfFFFFFFFFFDf.",
    ".tFFFFFZFFFFFDt.",
    ".TLLLLLLLLLLLLT.",
    ".KFFFFFZFFFFFFQ.",
    ".KKFFFFfFZZZZQQ.",
    "..kFFFFfFZPPZq..",
    "...FFFFZFZZZZ...",
    "...FFFF.FFFFf...",
    "...TtTt.TtTt....",
    "..BBBBB.BBBBB...",
    "..bbbbb.bbbbb...",
]
BODY_SIDE = [
    ".....tTtTtT.....",
    "....WFFFFFFf....",
    "...WFFFFFFFFf...",
    "...WFFfFFFFFf...",
    "...WFFFfFFFDf...",
    "...WFFFFKKFDf...",
    "...WFFFFKKFDf...",
    "...WFFFFkkFDf...",
    "...tLLLLLLLLT...",
    "...FFFFFFFFFf...",
    "....FFFfFFFf....",
    "....FFFfFFFf....",
    "....FFFFFFFf....",
    "....FFF.FFFf....",
    "....TtT.TtT.....",
    "...BBBBBBBBBB...",
    "...bbbbbbbbbb...",
]
BODY_BACK = [
    "....TtTtTtTt....",
    "..WWFFFFFFFFff..",
    ".WWFFFFFFFFFRff.",
    ".WFZZZFFFFFRFff.",
    ".WFZPZFFFFRFFDf.",
    ".WFFFFFFFRFFFDf.",
    ".WFFFFFFRFFFFDf.",
    ".WFFFFFRFFFFFDf.",
    ".tLLLLRLLLLLLLT.",
    ".KFFFRFFFFFFFFK.",
    ".KKFFFFfFFFFFKK.",
    "..kFFFFfFFFFFk..",
    "...FFFFfFFFFf...",
    "...FFFF.FFFFf...",
    "...tTtT.TtTt....",
    "..BBBBB.BBBBB...",
    "..bbbbb.bbbbb...",
]


def blit(p, rows, x0, y0):
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != '.':
                p.set(x0 + i, y0 + j, C[ch])


def hood(p, cx, cy, rx, ry, light_dx=-1, n=2.8):
    for y in range(p.h):
        for x in range(p.w):
            d = abs((x + 0.5 - cx) / rx) ** n + abs((y + 0.5 - cy) / ry) ** n
            if d <= 1:
                side = (x + 0.5 - cx) * -light_dx
                c = C['F']
                if d > 0.62 and side < 0:
                    c = C['f']
                if d > 0.85 and side < 0:
                    c = C['D']
                if d > 0.7 and side > 0 and y < cy:
                    c = C['W']
                p.set(x, y, c)


def visor(p, cx, cy, rx, ry, face=None, face_dy=0, rivets=0):
    """Visera iconica: elipse horizontal (mas ancha que alta), marco grueso."""
    m = min(rx, ry)
    for y in range(p.h):
        for x in range(p.w):
            dn = math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry)
            edge = (1 - dn) * m                    # distancia aprox. al borde en px
            if dn > 1:
                continue
            if edge >= 1.6:
                base = GLASS
                if face is not None:
                    fc = face.get(x, y + face_dy) if 0 <= y + face_dy < face.h else (0, 0, 0, 0)
                    if fc[3]:
                        base = mix(fc[:3], GLASS, 0.55)
                p.set(x, y, base)
            else:
                upper_left = (x + 0.5 < cx) and (y + 0.5 < cy)
                p.set(x, y, RIM_HI if (upper_left and edge < 0.8) else (RIM if edge < 0.9 else RIM2))
    for ang in range(200, 250, 7 if rx < 6 else 3):          # reflejo arriba a la izquierda
        a = math.radians(ang)
        p.set(round(cx - 0.5 + (rx - 2.6) * math.cos(a)), round(cy - 0.5 + (ry - 2.2) * math.sin(a)),
              hx('#c8dce6'))
    for k in range(rivets):                                  # bulones desparejos (casero)
        a = math.radians(k * 360 / rivets + 15 + (k % 3) * 6)
        p.set(round(cx - 0.5 + (rx - 0.8) * math.cos(a)), round(cy - 0.5 + (ry - 0.8) * math.sin(a)), RIM_HI)
    if rivets:                                               # vuelta de alambre a cada lado
        for dy in (-1, 0, 1):
            p.set(round(cx - rx - 0.5), round(cy - 0.5 + dy), hx('#8c8478'))
            p.set(round(cx + rx - 0.5), round(cy - 0.5 + dy), hx('#8c8478'))


def filter_can(p, cx, cy, r):
    """Filtro casero: una lata atada a la valvula, con bandas y alambre."""
    x0, x1 = round(cx - r), round(cx + r)
    y0, y1 = round(cy - r * 0.9), round(cy + r * 0.9)
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            c = FILTER
            if x == x0:
                c = FILTER_HI
            elif x == x1:
                c = FILTER2
            if r >= 3 and (y - y0) % 3 == 0:
                c = mix(c, FILTER_HI, 0.35)
            p.set(x, y, c)
    p.hline(x0, x1, y0, FILTER_HI)
    if r >= 3:
        p.hline(x0 - 1, x1 + 1, round(cy), hx('#8c8478'))          # alambre que la ata
        for x in range(x0 + 1, x1, 2):
            p.set(x, y1, FILTER2)


def sprite_front():
    p = Pix(16, 32)
    blit(p, BODY_FRONT, 0, 15)
    hood(p, 8, 8.2, 6.0, 7.8)
    face = from_grid(GRIDS['juan'], palette('juan'))
    visor(p, 7.9, 8.6, 5.6, 3.4, face=face, face_dy=1)
    filter_can(p, 10.8, 13.0, 1.8)
    p.hline(4, 11, 15, C['c'])
    p.outline(0.56, 0.22)
    return p


def sprite_side():
    p = Pix(16, 32)
    blit(p, BODY_SIDE, 0, 15)
    # rifle colgado a la espalda
    for k in range(9):
        p.set(4 - k // 4, 17 + k, C['R'])
    p.vline(3, 13, 16, C['r'])
    hood(p, 7.5, 8.2, 5.6, 7.8)
    visor(p, 11.2, 8.6, 2.6, 3.4)
    filter_can(p, 12.6, 12.4, 1.6)
    p.hline(5, 11, 15, C['c'])
    p.outline(0.56, 0.22)
    return p


def sprite_back():
    p = Pix(16, 32)
    blit(p, BODY_BACK, 0, 15)
    hood(p, 8, 8.2, 6.0, 7.8)
    p.vline(8, 2, 13, C['f'])                 # costura de la capucha
    for y in range(13, 22):                   # rifle cruzado en la espalda
        x = 12 - (y - 13) // 2
        p.set(x, y, C['R'])
    p.vline(12, 11, 13, C['r'])
    p.outline(0.56, 0.22)
    return p


def portrait_suit():
    p = Pix(32, 32)
    # hombros del mameluco
    for y in range(24, 32):
        for x in range(32):
            if ((x - 16) / 15) ** 2 + ((y - 34) / 9) ** 2 <= 1:
                p.set(x, y, C['F'] if x < 21 else C['f'])
    for x in range(3, 30, 4):                  # pliegues
        p.vline(x, 28, 31, C['f'])
    for x in range(8, 25):                                       # tira de goma enrollada al cuello
        p.set(x, 26, C['T'] if x % 2 else C['t']); p.set(x, 27, C['t'] if x % 2 else C['T'])
    hood(p, 16, 13.5, 11.5, 13.5, n=3.0)
    for y in range(2, 10):                     # costura central cosida a mano
        if y % 2 == 0:
            p.set(16, y, C['D'])
    for k in range(7):                         # costura curva del costado
        p.set(6 + k // 2, 9 + k, C['D'] if k % 2 == 0 else C['f'])
        p.set(26 - k // 2, 9 + k, C['D'] if k % 2 == 0 else C['f'])
    p.rect(8, 4, 4, 3, C['P']); p.frame(8, 4, 4, 3, C['Z'])            # parche
    face = portrait('juan')
    visor(p, 15.8, 14.8, 10.6, 6.2, face=face, face_dy=0, rivets=10)
    filter_can(p, 22.0, 22.5, 3.2)
    p.outline(0.56, 0.22)
    return p


def hero(scale=1):
    """Ilustracion de modelo grande (48x96): el traje entero con el rifle."""
    big = Pix(48, 96)
    # cuerpo: escalado del sprite de frente x3 como base, luego detalle
    base = sprite_front()
    up = base.img.resize((48, 96), 0)
    big.img.alpha_composite(up)
    big.px = big.img.load()
    pf = Pix(48, 96)
    pf.img = big.img.copy(); pf.px = pf.img.load()
    return pf


def build():
    os.makedirs(OUT, exist_ok=True)
    sheet = {'front': sprite_front(), 'side': sprite_side(), 'back': sprite_back()}
    for k, v in sheet.items():
        v.img.save(os.path.join(OUT, f'suit_{k}.png'))
        v.img.resize((16 * 8, 32 * 8), 0).save(os.path.join(OUT, f'suit_{k}_x8.png'))
    po = portrait_suit()
    po.img.save(os.path.join(OUT, 'suit_portrait.png'))
    po.img.resize((32 * 8, 32 * 8), 0).save(os.path.join(OUT, 'suit_portrait_x8.png'))
    # reemplaza el concepto anterior del traje
    sheet['front'].img.save(os.path.join(OUT, 'juan_suit_sprite.png'))
    sheet['front'].img.resize((16 * 8, 32 * 8), 0).save(os.path.join(OUT, 'juan_suit_sprite_x8.png'))
    po.img.save(os.path.join(OUT, 'juan_suit_portrait.png'))
    po.img.resize((32 * 6, 32 * 6), 0).save(os.path.join(OUT, 'juan_suit_portrait_x6.png'))



# ---------------------------------------------------------------- con el rifle en las manos
STOCK = [hx('#3a2416'), hx('#6a4426'), hx('#94643a')]
BARREL = [hx('#1a1c22'), hx('#3a3e48'), hx('#7a828e')]


def rifle_line(p, pts_stock, pts_barrel):
    for x, y in pts_stock:
        p.set(x, y, STOCK[1]); p.set(x, y + 1, STOCK[0]); p.set(x - 1, y, STOCK[2])
    for x, y in pts_barrel:
        p.set(x, y, BARREL[1]); p.set(x, y + 1, BARREL[0])
    x, y = pts_barrel[-1]
    p.set(x, y - 1, BARREL[2])


def sprite_front_rifle():
    """De frente, el rifle cruzado sobre el pecho, listo (pags. 041-042)."""
    p = Pix(16, 32)
    blit(p, BODY_FRONT, 0, 15)
    hood(p, 8, 8.2, 6.0, 7.8)
    face = from_grid(GRIDS['juan'], palette('juan'))
    visor(p, 7.9, 8.6, 5.6, 3.4, face=face, face_dy=1)
    filter_can(p, 10.8, 13.0, 1.8)
    stock = [(2 + k, 27 - k) for k in range(5)]
    barrel = [(7 + k, 22 - k) for k in range(9)]
    rifle_line(p, stock, barrel)
    p.rect(4, 24, 2, 2, C['K']); p.rect(10, 18, 2, 2, C['Q'])                 # las manos lo agarran
    p.outline(0.56, 0.22)
    return p


def sprite_side_rifle():
    """De perfil, avanzando con el rifle apuntando hacia adelante."""
    p = Pix(20, 32)
    blit(p, BODY_SIDE, 0, 15)
    hood(p, 7.5, 8.2, 5.6, 7.8)
    visor(p, 11.2, 8.6, 2.6, 3.4)
    filter_can(p, 12.6, 12.4, 1.6)
    stock = [(3 + k, 23) for k in range(5)]
    barrel = [(8 + k, 22) for k in range(11)]
    rifle_line(p, stock, barrel)
    p.rect(6, 22, 2, 3, C['K']); p.rect(11, 21, 2, 2, C['Q'])
    p.outline(0.56, 0.22)
    return p


def portrait_rifle():
    """Retrato con el rifle al hombro (para el dialogo de la salida)."""
    p = portrait_suit()
    for k in range(22):                                                         # caño al hombro
        x, y = 6 + k, 31 - k // 2
        p.set(x, y, BARREL[1]); p.set(x, y - 1, BARREL[2] if k % 4 == 0 else BARREL[1])
    for k in range(7):
        p.set(2 + k, 31, STOCK[1]); p.set(2 + k, 30, STOCK[2])
    return p


def build_rifle():
    from PIL import Image
    imgs = [sprite_front_rifle(), sprite_side_rifle()]
    for i, s in enumerate(imgs):
        s.img.save(os.path.join(OUT, f'suit_rifle_{i}.png'))
    po = portrait_rifle()
    W = 256 + sum(s.w * 8 + 24 for s in imgs) + 24
    sheet = Image.new('RGBA', (W, 270), (42, 34, 54, 255))
    sheet.alpha_composite(po.img.resize((256, 256), Image.NEAREST), (8, 8))
    x = 280
    for s in imgs:
        sheet.alpha_composite(s.img.resize((s.w * 8, s.h * 8), Image.NEAREST), (x, 8)); x += s.w * 8 + 24
    sheet.save(os.path.join(OUT, 'suit_rifle_x8.png'))


if __name__ == '__main__':
    build()
    print('ok')
