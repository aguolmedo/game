"""Planta baja v4 + casco (diseño, no toca el juego). Observaciones del usuario 19/11:
  1. Living: el sofá quedaba en medio de la alfombra, de espaldas a la mesa, tapando a
     Elena. Va contra la pared del fondo, bajo la ventana, mirando a la mesa; los dos
     sillones a los costados; Elena queda en el lado abierto de la alfombra.
  2. Garaje-entrada: el bidón y la rueda tapaban el paso del hall (el vano de la columna
     18). Van al rincón de abajo a la derecha, junto a la escoba.
  3. Escalera rebatible: gustó la idea, no el dibujo. v4 = 32x64: sube hasta el borde de
     arriba de la pared (el techo), con la trampa abierta en el cielo raso y la luz del
     altillo cayendo; largueros gruesos que se abren hacia abajo (perspectiva), peldaños
     cada vez más separados, sombra en la pared y en el piso; la tapa cuelga de la bisagra.
  4. Casco (ítem `casco`): pasa al traje nuevo (cabeza = retrato juan_suit), SIN ojos:
     es la máscara vacía. Dos vidrios para elegir.
Base: capturas del juego a 1x sin HUD (art/concept/capturas_planta.mjs).
Salida: out/house_v4_*.png, out/hv4_escalera.png, out/casco_v2_*.png
"""
import os

from PIL import Image, ImageDraw, ImageFont

import suit_unify as SU

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(HERE, 'out')
CAPS = os.path.join(ROOT, 'art', 'direccion', 'doc', 'capturas')
CAM = (-16, 0)                      # cámara de las capturas (mundo -> vista: x - cam)
FONT = ImageFont.truetype('/usr/share/fonts/noto/NotoSans-Regular.ttf', 24)
BOLD = ImageFont.truetype('/usr/share/fonts/noto/NotoSans-Bold.ttf', 28)
BG, INKT, DIM = (27, 22, 30), (238, 228, 210), (160, 150, 140)


def rgba(h, a=255):
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


# ------------------------------------------------------------------ escalera v4 (32x64)
OUTL = rgba('3a2418')                 # contorno: un tono más oscuro que la madera, no negro
W_HI, W_LI, W_BA, W_DA = rgba('d9a66a'), rgba('c08a52'), rgba('8a5a34'), rgba('5e3a24')
HOLE = [rgba('ffe2a0'), rgba('e8a850'), rgba('a8642c'), rgba('5a3020'), rgba('2a1a1e')]
SHADOW = (20, 10, 16, 70)
HINGE, CORD, KNOB = rgba('8a8c94'), rgba('d8ccb0'), rgba('b04e4a')


PL_HI, PL_LO, PL_DK = rgba('f2e6cc'), rgba('cdbb9c'), rgba('8a7a66')   # labio del cielo raso


def escalera():
    """Escalera rebatible: cuelga de su tapa, que quedó abierta bajo la trampa del techo."""
    im = Image.new('RGBA', (32, 64), (0, 0, 0, 0))
    px = im.load()

    def blend(x, y, c):
        if 0 <= x < 32 and 0 <= y < 64:
            b = px[x, y]
            if b[3] == 0:
                px[x, y] = c
            else:
                a = c[3] / 255
                px[x, y] = tuple(round(b[i] * (1 - a) + c[i] * a) for i in range(3)) + (255,)

    BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
    # 1. trampa: hueco en el borde de arriba de la pared, con la luz del altillo en degradé
    for y in range(0, 10):
        for x in range(9, 23):
            d = abs(x - 15.5) / 7 * 0.25 + y / 9        # más luz arriba y al centro
            lvl = d * 4 + (BAYER[y % 4][x % 4] / 16 - 0.5) * 0.9
            px[x, y] = HOLE[max(0, min(4, int(lvl)))]
        px[8, y] = OUTL
        px[23, y] = OUTL
        px[9, y] = blend_c(HOLE[1], W_LI, 0.5) if y < 6 else W_BA     # jamba con luz
        px[22, y] = W_DA                                               # jamba en sombra
    # labio del cielo raso: del color de la pared, con volumen
    for x in range(7, 25):
        px[x, 10] = PL_HI
        px[x, 11] = PL_LO
        px[x, 12] = PL_DK
    px[7, 10] = px[24, 10] = PL_LO

    # 2. la tapa abierta: panel de tablas que cuelga del labio (se ve su cara de adentro)
    for y in range(13, 25):
        for x in range(7, 25):
            edge = x in (7, 24) or y == 24
            c = OUTL if edge else (W_LI if y == 13 else W_BA)
            if not edge and x in (11, 15, 20) and y > 13:
                c = W_DA                                   # juntas de las tablas
            px[x, y] = c
    for x in (8, 23):
        px[x, 13] = HINGE                                  # bisagras
    for y in range(13, 26):
        blend(25, y, SHADOW)
    # 3. largueros: arrancan en la tapa y se abren hacia el piso (más cerca de la cámara)
    TOP, BOT = 15, 63
    def rails_at(y):
        t = (y - TOP) / (BOT - TOP)
        return round(11 - t * 5), round(20 + t * 5)
    for y in range(TOP, BOT + 1):
        xl, xr = rails_at(y)
        if y >= 32:                                        # en el piso, sombra suave debajo
            for x in range(xl + 2, xr):
                blend(x + 2, y, (20, 10, 16, 28))
        blend(xr + 2, y, SHADOW)
        for x, c in ((xl - 1, OUTL), (xl, W_HI), (xl + 1, W_BA), (xl + 2, OUTL),
                     (xr - 2, OUTL), (xr - 1, W_LI), (xr, W_BA), (xr + 1, OUTL)):
            px[x, y] = c
    # peldaños planos: se ve su cara de arriba; más separados y más gruesos abajo
    WARM_HI = blend_c(HOLE[0], W_HI, 0.45)
    for i, (y, th) in enumerate(((19, 1), (25, 1), (32, 2), (40, 2), (49, 2), (58, 3))):
        xl, xr = rails_at(y)
        for x in range(xl + 2, xr - 1):
            px[x, y - 1] = OUTL
            for k in range(th):
                px[x, y + k] = (WARM_HI if i < 2 else W_HI) if k == 0 else W_LI
            px[x, y + th] = W_DA                           # canto del peldaño
            px[x, y + th + 1] = OUTL
            blend(x + 1, y + th + 2, SHADOW)
    # cordón con su tirador, colgando del borde de la tapa
    for y in range(25, 34):
        px[8, y] = CORD
        blend(9, y, SHADOW)
    px[8, 34], px[7, 34], px[9, 34], px[8, 35] = KNOB, OUTL, OUTL, OUTL

    # patas
    xl, xr = rails_at(BOT)
    for x in range(xl - 1, xr + 4):
        blend(x, 63, SHADOW)
    for x in (xl, xl + 1, xr - 1, xr):
        px[x, 63] = W_DA
    return im


def blend_c(a, b, t):
    return tuple(round(a[i] * (1 - t) + b[i] * t) for i in range(3)) + (255,)


# ------------------------------------------------------------------ casco v2 (16x16)
CC = dict(SU.C)
CC.update({'D': (24, 27, 36), 'd': (40, 46, 60), 'u': (110, 128, 146), 'c': (150, 225, 240)})
CASCO_BASE = {r - 1: row for r, row in SU.HEAD16.items()}          # sube 1 fila: entra en 16
VIDRIOS = {
    # A: vidrio oscuro, la máscara vacía; un reflejo frío arriba a la izquierda
    'A': {7: '.oLPQTTTTTTQPIo.', 8: '.oPUuDDDDDDDQPo.', 9: '.oPuDDDDDDDdQIo.',
          10: '.oQDDDDDDDddTIo.', 11: '.oLIQTTTTTTQILo.'},
    # B: el mismo vidrio con un destello cian de la nevada (como los vidrios del apagón)
    'B': {7: '.oLPQTTTTTTQPIo.', 8: '.oPUcDDDDDDDQPo.', 9: '.oPcDDDDDDudQIo.',
          10: '.oQDDDDDDuddTIo.', 11: '.oLIQTTTTTTQILo.'},
}


def casco(v):
    rows = dict(CASCO_BASE)
    rows.update(VIDRIOS[v])
    rows[15] = '...oKKKKKKKKo...'                                     # boca de la capucha (vacía)
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = im.load()
    for y, row in rows.items():
        for x, ch in enumerate(row):
            if ch != '.':
                px[x, y] = CC[ch] + (255,)
    return im


# ------------------------------------------------------------------ armado
def cap(name):
    return Image.open(os.path.join(CAPS, name)).convert('RGBA').resize((480, 270), Image.NEAREST)


def put(base, im, left, bottom):
    base.alpha_composite(im, (left - CAM[0], bottom - im.height - CAM[1]))


def label(img, text, sub=None):
    h = 46 if sub is None else 78
    out = Image.new('RGB', (img.width, img.height + h), BG)
    out.paste(img.convert('RGB'), (0, h))
    d = ImageDraw.Draw(out)
    d.text((6, 6), text, font=BOLD, fill=INKT)
    if sub:
        d.text((6, 42), sub, font=FONT, fill=DIM)
    return out


def row(images, gap=24):
    w = sum(i.width for i in images) + gap * (len(images) - 1)
    h = max(i.height for i in images)
    out = Image.new('RGB', (w, h), BG)
    x = 0
    for i in images:
        out.paste(i, (x, 0))
        x += i.width + gap
    return out


def col(images, gap=24):
    w = max(i.width for i in images)
    h = sum(i.height for i in images) + gap * (len(images) - 1)
    out = Image.new('RGB', (w, h), BG)
    y = 0
    for i in images:
        out.paste(i, (0, y))
        y += i.height + gap
    return out


def crop_world(im, box, k):
    x0, y0, x1, y1 = box
    c = im.crop((x0 - CAM[0], y0 - CAM[1], x1 - CAM[0], y1 - CAM[1]))
    return c.resize((c.width * k, c.height * k), Image.NEAREST)


def on_bg(im, k, color=(70, 84, 72, 255)):
    bg = Image.new('RGBA', im.size, color)
    bg.alpha_composite(im)
    return bg.resize((im.width * k, im.height * k), Image.NEAREST)


def near(a, b, tol=14):
    return all(abs(a[i] - b[i]) <= tol for i in range(3))


def find_sprite(screen, sprite, k):
    """Dónde está `sprite` (x k) en la captura: busca su primer pixel opaco y verifica."""
    sp = sprite.convert('RGBA').load()
    pts = [(x, y, sp[x, y][:3]) for y in range(sprite.height) for x in range(sprite.width) if sp[x, y][3] == 255]
    fx, fy, fc = pts[0]
    sc = screen.load()
    W, H = screen.size
    for Y in range(0, H - sprite.height * k):
        for X in range(0, W - sprite.width * k):
            if not near(sc[X, Y], fc):
                continue
            ox, oy = X - fx * k, Y - fy * k
            ok = all(0 <= ox + x * k < W and 0 <= oy + y * k < H and near(sc[ox + x * k + k // 2, oy + y * k + k // 2], c)
                     for x, y, c in pts[::5])
            if ok:
                return ox, oy
    return None


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    esc = escalera()
    esc.save(os.path.join(OUT, 'hv4_escalera.png'))
    hoy = cap('raw_house_v4_npc.png')
    prop = cap('raw_house_v4_prop.png')
    put(prop, esc, 16, 80)
    for im in (hoy, prop):                       # tapar al jugador fuera de cuadro
        ImageDraw.Draw(im).rectangle((470, 0, 480, 20), fill=(17, 15, 26, 255))

    # plano entero
    prop.resize((1920, 1080), Image.NEAREST).convert('RGB').save(os.path.join(OUT, 'house_v4.png'))
    row([label(hoy.resize((960, 540), Image.NEAREST), 'Hoy'),
         label(prop.resize((960, 540), Image.NEAREST), 'Propuesta v4')], gap=20
        ).save(os.path.join(OUT, 'house_v4_compare.png'))

    # detalles x4: living, entrada, escalera
    K = 4
    living = (8, 40, 200, 150)
    entrada = (296, 40, 440, 150)
    det = col([
        row([label(crop_world(hoy, living, K), 'Living hoy', 'el sofá de espaldas a la mesa, tapando a Elena'),
             label(crop_world(prop, living, K), 'Living v4', 'sofá bajo la ventana, mirando a la mesa; sillones a los lados')]),
        row([label(crop_world(hoy, entrada, K), 'Entrada hoy', 'el bidón y la rueda tapan el paso del hall'),
             label(crop_world(prop, entrada, K), 'Entrada v4', 'al rincón, junto a la escoba; el paso queda libre')]),
    ])
    det.save(os.path.join(OUT, 'house_v4_detalles.png'))

    # escalera: sprite viejo y nuevo (x10) + en la escena (x6)
    old = Image.open(os.path.join(ROOT, 'art', 'sprites', 'objects', 'stairs_attic.png')).convert('RGBA')
    k = 10
    old_big = Image.new('RGBA', (32 * k, 64 * k), (70, 84, 72, 255))
    old_big.alpha_composite(on_bg(old, k), (0, 16 * k))
    zona = (8, 8, 88, 96)
    row([label(old_big, 'Hoy (32x48)'), label(on_bg(esc, k), 'v4 (32x64)'),
         label(crop_world(hoy, zona, 7), 'Hoy, en la casa'), label(crop_world(prop, zona, 7), 'v4, en la casa')]
        ).save(os.path.join(OUT, 'hv4_escalera_x10.png'))

    # casco: viejo, A y B (x16), en el estante del garaje (captura del juego) y en la mochila
    old_c = Image.open(os.path.join(ROOT, 'art', 'sprites', 'items', 'casco.png')).convert('RGBA')
    cas = {v: casco(v) for v in 'AB'}
    for v, im in cas.items():
        im.save(os.path.join(OUT, f'casco_v2_{v}.png'))
    ref = Image.open(os.path.join(ROOT, 'art', 'sprites', 'portraits_dlg', 'juan_suit.png')).convert('RGBA')
    gar = Image.open(os.path.join(CAPS, 'esc_garage.png')).convert('RGBA')
    pos = (180, 162)   # medido a mano en esc_garage.png
    estantes = []
    for name, im in (('Hoy', old_c), ('A', cas['A']), ('B', cas['B'])):
        g = gar.copy()
        if pos:
            ox, oy = pos
            # borrar el viejo con la pared de al lado (16 px a la izquierda) y pegar el nuevo
            g.paste(gar.crop((ox - 96, oy, ox, oy + 96)), (ox, oy))
            g.alpha_composite(im.resize((96, 96), Image.NEAREST), (ox, oy))
            g = g.crop((ox - 150, oy - 60, ox + 330, oy + 200))
        estantes.append(label(g, f'{name}, en el estante'))
    top = row([label(on_bg(ref, 4), 'Referencia', 'retrato juan_suit'),
               label(on_bg(old_c, 16), 'Hoy'),
               label(on_bg(cas['A'], 16), 'A · vidrio oscuro'),
               label(on_bg(cas['B'], 16), 'B · destello de nieve')])
    col([top, row(estantes)]).save(os.path.join(OUT, 'casco_v2.png'))
    print('ok', 'casco en', pos)
