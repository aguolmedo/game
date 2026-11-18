"""Planta baja v3 (diseño, no toca el juego). Correcciones del usuario 18/11 sobre v2:
  - La ventana de Martita (pared trasera) quedaba tapada por el inventario: el
    inventario BAJA al borde de la pantalla y la cámara puede bajar ~17 px de mundo
    más allá del mapa, así la pared trasera queda arriba del HUD.
  - La alacena tapaba la puerta de la cocina: la pileta va al rincón izquierdo, la
    puerta queda libre y la alacena va a la derecha (antes de la cocina a gas).
  - El cajón del cuarto de Martita no hace nada: se saca.
  - La camita era muy chica: camita vertical de 20x30 (cabecera arriba), como la
    cama de los padres.
  - La escalera tiene que leerse "subís al altillo": escalera rebatible de madera
    que sube a una trampa abierta en el techo, con la tapa colgando y el cordón.
Salida: out/house_v3.png (plano entero x4), out/house_v3_compare.png,
out/house_v3_martita.png (como se ve jugando, con zoom), out/house_v3_sprites_x8.png,
sprites nuevos out/hv3_*.png.
"""
import json
import os

from PIL import Image, ImageDraw, ImageFont

import house_v2 as V2

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(HERE, 'out')
CAPS = os.path.join(ROOT, 'art', 'direccion', 'doc', 'capturas')
OX, OY = V2.OX, V2.OY
grid, put, patch, frame = V2.grid, V2.put, V2.patch, V2.frame

# ------------------------------------------------------------------ escalera rebatible
INK = (31, 22, 26, 255)
W_HI, W_LI, W_BA, W_DA = (192, 138, 82, 255), (176, 124, 70, 255), (138, 90, 52, 255), (94, 58, 36, 255)
DARK = (24, 18, 26, 255)
WARM = [(255, 232, 176, 255), (236, 171, 76, 255), (184, 112, 40, 255)]


def escalera():
    im = Image.new('RGBA', (32, 48), (0, 0, 0, 0))
    px = im.load()
    # trampa del techo abierta (arriba): marco de madera + hueco oscuro con luz del altillo
    for y in range(0, 10):
        for x in range(8, 26):
            edge = x in (8, 25) or y in (0, 9)
            px[x, y] = INK if edge else (W_BA if x in (9, 24) or y in (1, 8) else DARK)
    for x in range(10, 24):                                   # luz de la vela de arriba
        px[x, 2] = WARM[0] if 13 <= x <= 20 else WARM[1]
        if (x % 2 == 0):
            px[x, 3] = WARM[1] if 12 <= x <= 21 else WARM[2]
        if (x % 3 == 0) and 12 <= x <= 21:
            px[x, 4] = WARM[2]
    # tapa colgando de la bisagra (izquierda), con el cordón
    for y in range(1, 19):
        for x in range(3, 8):
            px[x, y] = INK if x in (3, 7) or y in (1, 18) else (W_LI if x == 4 else W_BA)
        if y % 6 == 0:
            for x in range(4, 7):
                px[x, y] = W_DA
    for y in range(19, 26):                                    # cordón
        px[5, y] = (200, 190, 170, 255)
    px[5, 26] = (176, 78, 74, 255)
    px[4, 26] = INK
    px[6, 26] = INK
    # largueros: se abren hacia abajo (perspectiva)
    for y in range(9, 48):
        t = (y - 9) / 38
        xl = round(11 - t * 4)
        xr = round(22 + t * 4)
        for (x, c) in ((xl - 1, INK), (xl, W_LI), (xl + 1, W_DA), (xr - 1, W_LI), (xr, W_BA), (xr + 1, INK)):
            px[x, y] = c
        # peldaños cada 6 filas
        if (y - 12) % 6 == 0 and y < 46:
            for x in range(xl + 2, xr - 1):
                px[x, y] = W_HI
                px[x, y + 1] = W_BA
                px[x, y + 2] = INK
    for x in range(5, 28):                                     # sombra en el piso
        if x not in range(9, 24):
            continue
        px[x, 47] = (0, 0, 0, 60)
    return im


# ------------------------------------------------------------------ camita grande (vertical)
CAMA = grid([
    '.oooooooooooooooooo.',
    'oBBBBBBBBBBBBBBBBBBo',
    'obBBBBBBBBBBBBBBBBbo',
    'obbbbbbbbbbbbbbbbbbo',
    'oWWWWWWWWWWWWWWWWWWo',
    'oWwwwwwwwwwwwwwwwWWo',
    'oWwwwwwwwwwwwwwwwWWo',
    'oWWWWWWWWWWWWWWWWWWo',
    'oppppppppppppppppppo',
    'oPPPPPPPPPPPPPPPPPPo',
    'oPPPdPPPPPPPdPPPPPPo',
    'oPPPPPPPPPPPPPPPPdPo',
    'oPPPPPPPdPPPPPPPPPPo',
    'oPdPPPPPPPPPPPdPPPPo',
    'oPPPPPPPPPPPPPPPPPPo',
    'oPPPPPdPPPPPPPPPPPPo',
    'oPPPPPPPPPPPdPPPPdPo',
    'oPPdPPPPPPPPPPPPPPPo',
    'oPPPPPPPPdPPPPPPPPPo',
    'oPPPPPPPPPPPPPPdPPPo',
    'oPPPPdPPPPPPPPPPPPPo',
    'oPPPPPPPPPPPPPPPPPPo',
    'oqqqqqqqqqqqqqqqqqqo',
    'oqPPqqPPqqPPqqPPqqqo',
    'obbbbbbbbbbbbbbbbbbo',
    'oBBBBBBBBBBBBBBBBBBo',
    'oBbbbbbbbbbbbbbbbbBo',
    'oooooooooooooooooooo',
    '.oo..............oo.',
    '.oo..............oo.',
], {'o': '#2a1d1f', 'B': '#8a5a34', 'b': '#5e3a24', 'W': '#ece6d8', 'w': '#ffffff',
    'p': '#e8b0b8', 'P': '#d88a98', 'd': '#f4e4e8', 'q': '#b06a7a'})


def build_full():
    # base SIN HUD (si no, el HUD queda pegado en el mundo y en los parches)
    cap = Image.open(os.path.join(CAPS, 'raw_house_full_nohud.png')).convert('RGBA').resize((480, 270), Image.NEAREST)
    v = cap.copy()
    # --- escalera: tapar la vieja (32x32 en 16..48, 48..80) con piso/pared limpios y poner la rebatible
    patch(v, (48, 16, 80, 48), (16, 16))          # pared (zócalo) de al lado
    patch(v, (48, 48, 80, 80), (16, 48))          # parquet de al lado
    # --- Martita: ventana interior -> dibujo; cuna fuera; cajón fuera
    patch(v, (160, 144, 192, 176), (192, 144))
    patch(v, (160, 208, 192, 240), (160, 176))
    patch(v, (240, 208, 256, 224), (240, 176))    # cajón (240..256, 176..192) -> piso de abajo
    put(v, V2.DIBUJO, 200, 164)
    put(v, CAMA, 164, 214)
    # --- cocina: tapar alacena vieja (276..324, 156..192) con pared/piso de la derecha
    patch(v, (340, 140, 388, 192), (276, 140))
    put(v, V2.PILETA, 274, 194)                   # rincón izquierdo
    put(v, frame('interior2', 'alacena'), 342, 194)   # a la derecha: la puerta (320..336) queda libre
    ch = frame('objects', 'chair')
    put(v, ch, 320, 224)
    put(v, ch.transpose(Image.FLIP_LEFT_RIGHT), 384, 224)
    # --- dormitorio, garaje
    put(v, V2.FOTO, 30, 162)
    put(v, frame('interior2', 'broom_bucket'), 410, 112)
    put(v, frame('interior2', 'bidon'), 308, 112)
    # --- pared trasera + ventana de Martita (abierta: nieve que entró)
    put(v, V2.pared_trasera(416), 16, 256)
    put(v, V2.ventana_trasera(False), 192, 256)
    put(v, V2.NIEVE_PISO, 194, 240)
    # --- escalera nueva al final (queda encima del zócalo)
    put(v, escalera(), 16, 80)
    return cap, v


def build_martita(full_v):
    """Como se ve jugando (zoom 1.5, worldPx 6) dentro del cuarto de Martita, con la
    cámara bajando 17 px de mundo más allá del mapa y el inventario al borde."""
    info = json.load(open(os.path.join(CAPS, 'raw_martita_zoom.json')))
    cx, cy = info['cam']['x'], info['cam']['y']
    k = info['vp']['worldPx']
    SHIFT = 17                                     # px de mundo que baja la cámara
    W, H = 1920, 1080
    # mundo a partir del plano 1x corregido (mismas coords de mapa): recorte y x6
    wx0, wy0 = cx, cy + SHIFT
    world = Image.new('RGBA', (W // k, H // k), (11, 12, 29, 255))
    src = full_v.crop((wx0 + OX, wy0 + OY, wx0 + OX + W // k, wy0 + OY + H // k))
    world.alpha_composite(src)
    # debajo del mapa (afuera de la casa): noche
    map_bottom = 256 - wy0
    d = ImageDraw.Draw(world)
    d.rectangle((0, map_bottom, W // k, H // k), fill=(11, 12, 29, 255))
    big = world.resize((W, H), Image.NEAREST)
    # HUD: tomado de una captura del juego (1x -> x4)
    hud = Image.open(os.path.join(CAPS, 'hud_inventario.png')).convert('RGBA')
    def cut(box):
        x0, y0, x1, y1 = [v * 4 for v in box]
        return hud.crop((x0, y0, x1, y1)), (x0, y0)
    for box in ((5, 4, 313, 19), (247, 221, 477, 236)):
        im, pos = cut(box)
        big.alpha_composite(im, pos)
    hot, (hx, hy) = cut((148, 241, 333, 267))
    big.alpha_composite(hot, (hx, H - hot.height))          # el inventario baja al borde
    return big.convert('RGB')


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    esc = escalera()
    esc.save(os.path.join(OUT, 'hv3_escalera_rebatible.png'))
    CAMA.save(os.path.join(OUT, 'hv3_camita.png'))
    cap, v = build_full()
    v.resize((1920, 1080), Image.NEAREST).save(os.path.join(OUT, 'house_v3.png'))
    cmp_ = Image.new('RGB', (960 * 2 + 20, 540), (17, 14, 20))
    cmp_.paste(cap.resize((960, 540), Image.NEAREST).convert('RGB'), (0, 0))
    cmp_.paste(v.resize((960, 540), Image.NEAREST).convert('RGB'), (980, 0))
    cmp_.save(os.path.join(OUT, 'house_v3_compare.png'))
    build_martita(v).save(os.path.join(OUT, 'house_v3_martita.png'))
    font = ImageFont.truetype('/usr/share/fonts/noto/NotoSans-Regular.ttf', 22)
    items = [('escalera rebatible', esc), ('camita', CAMA), ('pileta', V2.PILETA), ('dibujo', V2.DIBUJO), ('foto', V2.FOTO)]
    K = 8
    lam = Image.new('RGB', (sum(i.width * K + 40 for _, i in items) + 20, 48 * K + 70), (27, 22, 30))
    dr = ImageDraw.Draw(lam)
    x = 20
    for lbl, im in items:
        bg = Image.new('RGBA', im.size, (70, 84, 72, 255))
        bg.alpha_composite(im)
        lam.paste(bg.resize((im.width * K, im.height * K), Image.NEAREST).convert('RGB'), (x, 50))
        dr.text((x, 12), lbl, font=font, fill=(238, 228, 210))
        x += im.width * K + 40
    lam.save(os.path.join(OUT, 'house_v3_sprites_x8.png'))
    print('ok')
