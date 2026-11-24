"""Fondo del titulo de El Eternauta, con el mismo arte que el resto del juego.

Dos capas de 512x286 (el juego es 480x270, con 16 px de bleed a los costados y
8 arriba/abajo para el parallax suave):
  title_sky.png  cielo nocturno, estrellas y la silueta de techos lejanos
                 (street.backdrop), con los postes y cables de la avenida.
  title.png      la fila de casas con hastial de frente (houses.front_gable_house
                 'salvo' y 'californiano'), pinos (uno con la nieve que brilla),
                 tapial/postes del cartel, porton, farola y la nieve con medanos.
title.json guarda las anclas para animar en runtime: chimeneas (humo), ventanas
encendidas (luz calida) y la caja del cartel de madera.

Nunca escribe dentro de art/concept/: solo importa sus generadores.
"""
import json
import math
import random
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent.parent
CONCEPT = ROOT / 'art' / 'concept'
ART = ROOT / 'tools' / 'art'
OUT = ROOT / 'public' / 'assets'

sys.dont_write_bytecode = True
sys.path.insert(0, str(CONCEPT))
sys.path.insert(0, str(ART))

from pixel import Pix, hx, mix  # noqa: E402
import houses as hs             # noqa: E402
import trees as tr              # noqa: E402
import street as st             # noqa: E402
import objects as ob            # noqa: E402

W, H = 480, 270
OX, OY = 16, 8
LW, LH = W + OX * 2, H + OY * 2
SKY_TOP = hx('#04050c')
SKY_LOW = st.NIGHT[0]

# caja del cartel de madera que dibuja src/menus.js (misma en las dos capas)
SIGN = {'x': 160, 'y': 118, 'w': 160, 'h': 84}
POST = 9

STAR = [hx('#5e6e94'), hx('#9fb4d4'), hx('#eaf6ff')]
WARM = (255, 196, 112)


# ------------------------------------------------------------------ helpers
def blit(dst, src, x, y):
    """alpha_composite tolerando destinos negativos (casas cortadas al borde)."""
    x, y = int(x), int(y)
    sx0, sy0 = max(0, -x), max(0, -y)
    dx0, dy0 = max(0, x), max(0, y)
    w = min(src.w - sx0, dst.w - dx0)
    h = min(src.h - sy0, dst.h - dy0)
    if w <= 0 or h <= 0:
        return
    crop = src.img.crop((sx0, sy0, sx0 + w, sy0 + h))
    dst.img.alpha_composite(crop, (dx0, dy0))
    dst.px = dst.img.load()


def mirror(spr):
    q = Pix(spr.w, spr.h)
    q.img = spr.img.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    q.px = q.img.load()
    return q


def place(scene, spr, x, bottom, k=0.42, shear=0.28, a=0.30):
    """Casa/pino sobre la nieve: sombra proyectada fria + sprite."""
    st.cast_shadow(scene, spr, OX + x, OY + bottom, k=k, shear=shear, a=a)
    blit(scene, spr, OX + x, OY + bottom - spr.h)


def spill(p, cx, cy, rx, ry, col=WARM, a=0.18):
    """Derrame calido suave (solo pisa pixeles opacos)."""
    cx, cy = OX + cx, OY + cy
    for y in range(int(cy - ry), int(cy + ry) + 1):
        for x in range(int(cx - rx), int(cx + rx) + 1):
            d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2
            if d <= 1.0 and 0 <= x < p.w and 0 <= y < p.h:
                c = p.get(x, y)
                if c[3]:
                    p.set(x, y, mix(c[:3], col, a * (1.0 - d)), c[3])


def drift(p, x0, x1, y, rnd, depth=3):
    """Nieve acumulada contra una base (en coordenadas de diseno)."""
    for x in range(int(x0), int(x1)):
        x += OX
        hgt = depth + int(2 * math.sin((x - OX) * 0.21) + rnd.random())
        for k in range(hgt + 1):
            c = st.SNOW[4] if k == hgt else st.SNOW[2]
            p.set(x, OY + y - k, c)


def ground(p, rnd):
    top = 120
    for dy in range(top, H):
        k = min(1.0, (dy - top) / 34.0)          # sombra junto a la silueta
        c = mix(mix(st.SNOW[0], hx('#4e6880'), 0.35), st.SNOW[1], k)
        if dy > 232:                              # el frente, un poco mas frio
            c = mix(c, st.SNOW[0], min(0.55, (dy - 232) / 60.0))
        p.hline(0, LW - 1, OY + dy, c)
    # borde trasero: la nieve del fondo en sombra, sin linea blanca dura
    for x in range(-OX, W + OX):
        hh = 2 + int(1.6 * math.sin((x + 9) / 27.0) + 1)
        for i in range(hh):
            c = st.SNOW[2] if i == hh - 1 else st.SNOW[0]
            p.set(OX + x, OY + top - i, c)
        if (x * 7) % 31 == 0:
            p.set(OX + x, OY + top - hh, st.SNOW[3])
    for x in range(-OX, W + OX):                      # sombra bajo la silueta
        if (x // 5) % 3:
            p.set(OX + x, OY + top + 1, mix(st.SNOW[0], hx('#4e6880'), 0.5))
    # medanos grandes y chatos en el primer plano
    for (cx, cy, rx, ry) in ((96, 246, 92, 9), (386, 252, 88, 8), (236, 266, 120, 7),
                             (196, 232, 46, 5), (312, 236, 40, 4)):
        p.ellipse(OX + cx, OY + cy, rx, ry, st.SNOW[1])
        p.ellipse(OX + cx, OY + cy - 1, max(3, rx - 3), max(2, ry - 2), st.SNOW[2])
        p.hline(OX + cx - rx + 6, OX + cx + rx - 8, OY + cy - ry + 2, st.SNOW[3])
        p.set(OX + cx + rx // 3, OY + cy - ry + 2, st.SNOW[4])
    # banco del borde inferior (enmarca la pantalla)
    for x in range(LW):
        hh = 3 + int(1.5 * math.sin(x / 31.0))
        for i in range(hh):
            p.set(x, OY + H - 1 - i, st.SNOW[3] if i == hh - 1 else st.SNOW[2])
    # huellas que van del porton al fondo (alguien llego a casa)
    fy = 250
    step = 0
    while fy > 206:
        fx = 240 + int(4 * math.sin(step * 1.7)) + (3 if step % 2 else -3)
        p.set(OX + fx, OY + fy, st.SNOW[0])
        p.set(OX + fx + 1, OY + fy, st.SNOW[0])
        p.set(OX + fx, OY + fy - 1, mix(st.SNOW[0], st.SNOW[1], 0.4))
        fy -= 7
        step += 1
    # chispas de nieve, pocas y solo arriba de los brillos
    for _ in range(22):
        x = rnd.randrange(8, W + OX * 2)
        y = rnd.randrange(OY + 128, OY + H - 2)
        p.set(x, y, st.SNOW[4] if rnd.random() < 0.5 else st.SNOW[3])


def posts(p):
    """Postes de madera que sostienen el cartel del menu (debajo del cartel)."""
    for px in (SIGN['x'] + 14, SIGN['x'] + SIGN['w'] - 22):
        top = SIGN['y'] + SIGN['h'] - 10
        p.rect(OX + px, OY + top, POST, 268 - top, hx('#5a3820'))
        p.vline(OX + px + 1, OY + top, OY + 266, hx('#8a5a34'))
        p.vline(OX + px + 3, OY + top, OY + 266, hx('#6a4228'))
        p.vline(OX + px + POST - 1, OY + top, OY + 266, hx('#3a2418'))
        p.hline(OX + px, OX + px + POST - 1, OY + top, hx('#a06a3c'))
        p.hline(OX + px, OX + px + POST - 1, OY + 260, hx('#8a5a34'))
    # travesano bajo el cartel
    p.rect(OX + SIGN['x'] + 12, OY + SIGN['y'] + SIGN['h'] - 12,
           SIGN['w'] - 24, 4, hx('#6a4228'))
    p.hline(OX + SIGN['x'] + 12, OX + SIGN['x'] + SIGN['w'] - 13,
            OY + SIGN['y'] + SIGN['h'] - 12, hx('#8a5a34'))


def build_sky():
    p = Pix(LW, LH)
    horizon = hx('#090d1d')
    glow = hx('#10182a')
    for y in range(LH):
        dy = y - OY
        if dy < 60:
            c = mix(SKY_TOP, horizon, dy / 60.0)
        elif dy < 130:
            c = mix(horizon, glow, (dy - 60) / 70.0)
        else:
            c = glow
        p.hline(0, LW - 1, y, c)
    rnd = random.Random(1957)
    for _ in range(170):
        x = rnd.randrange(LW)
        y = rnd.randrange(2, OY + 68)
        r = rnd.random()
        c = STAR[0] if r < 0.6 else (STAR[1] if r < 0.92 else STAR[2])
        p.set(x, y, c)
        if r > 0.972:                                # estrella grande de 5 px
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                p.set(x + dx, y + dy, mix(c, SKY_TOP, 0.45))
    # silueta lejana: street.backdrop, pero con el cielo recortado para que
    # los techos nevados se lean contra nuestro cielo mas oscuro.
    tmp = Pix(W, H)
    st.backdrop(tmp, random.Random(1957), y_base=72)
    for y in range(0, 84):
        sky = mix(st.NIGHT[0], st.NIGHT[2], (y / 80.0) * 0.8)
        for x in range(W):
            c = tmp.get(x, y)
            if c[3] == 0:
                continue
            if c[:3] == sky:
                tmp.set(x, y, c, 0)                  # cielo del backdrop: afuera
    strip = tmp.img.crop((0, 0, W, 84))
    p.img.alpha_composite(strip, (OX, OY + 50))
    p.px = p.img.load()
    # bleed: espejar 16 px de la silueta en los margenes
    left = p.img.crop((OX, OY + 50, OX + 16, OY + 134))
    p.img.alpha_composite(left.transpose(Image.Transpose.FLIP_LEFT_RIGHT), (0, OY + 50))
    right = p.img.crop((OX + W - 16, OY + 50, OX + W, OY + 134))
    p.img.alpha_composite(right.transpose(Image.Transpose.FLIP_LEFT_RIGHT), (OX + W, OY + 50))
    p.px = p.img.load()
    return p


def build_scene():
    p = Pix(LW, LH)
    rnd = random.Random(1957)
    ground(p, rnd)

    # 4 casas con hastial: dos al frente y dos atras, con aire de barrio
    back_l = mirror(hs.front_gable_house('salvo', 31))
    back_r = hs.front_gable_house('salvo', 7)
    front_l = mirror(hs.front_gable_house('californiano', 11))
    front_r = hs.front_gable_house('californiano', 23)
    place(p, back_l, 50, 256)
    place(p, back_r, 306, 256)
    place(p, front_l, -30, 270, a=0.26)
    place(p, front_r, 386, 270, a=0.26)

    # pinos: uno con la nieve que brilla, uno nevado; enmarcan la escena
    glow_pine = tr.pine(True, glow=True, seed=8, w=36, h=84)
    plain_pine = tr.pine(True, glow=False, seed=13, w=34, h=78)
    place(p, glow_pine, -10, 266)
    place(p, plain_pine, 456, 266)

    # el jardin de la casa de la izquierda: tapial bajo con nieve
    for x0, w in ((-2, 44), (100, 26)):
        t = st.tapial(w)
        place(p, t, x0, 250, a=0.34)
        drift(p, x0, x0 + w, 251, rnd)
    place(p, ob.mailbox(), 94, 248)

    # medanos al pie de las casas
    for x0 in (8, 150, 330, 430):
        place(p, ob.snow_mound(), x0, 268, a=0.22)
    drift(p, -10, 130, 266, rnd, depth=2)
    drift(p, 340, 496, 266, rnd, depth=2)

    # el pasillo central: porton, buzon, arbusto, farola y los postes del cartel
    place(p, ob.gate(), 224, 268, a=0.28)
    place(p, ob.mailbox(), 266, 266, a=0.24)
    place(p, st.bush(26), 188, 266, a=0.22)
    farola = st.farola()
    place(p, farola, 314, 266, a=0.22)
    posts(p)
    place(p, ob.snow_mound(), 164, 269, a=0.18)
    place(p, ob.snow_mound(), 290, 269, a=0.18)
    blit(p, st.papel(), OX + 206, OY + 262)
    blit(p, st.papel(), OX + 342, OY + 258)

    # luz calida: una ventana de cada casa y la farola sobre la nieve
    for (cx, cy) in ((64, 238), (144, 224), (336, 224), (416, 238)):
        spill(p, cx, cy + 9, 15, 9, WARM, 0.20)
        spill(p, cx, cy + 2, 10, 6, WARM, 0.10)
    for (cx, cy) in ((112, 189), (368, 189)):
        spill(p, cx, cy + 4, 9, 6, WARM, 0.12)
    spill(p, 326, 252, 20, 10, WARM, 0.16)
    spill(p, 326, 225, 9, 7, WARM, 0.12)
    return p


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    sky = build_sky()
    scene = build_scene()
    sky.img.save(OUT / 'title_sky.png')
    scene.img.save(OUT / 'title.png')
    data = {
        'size': [LW, LH],
        'design': [W, H],
        'offset': [OX, OY],
        'sign': SIGN,
        'chimneys': [[80, 139], [400, 139]],
        'windows': {
            'lit': [[64, 238], [144, 224], [336, 224], [416, 238]],
            'attic': [[112, 189], [368, 189]],
        },
        'lamps': [[326, 222]],
    }
    (OUT / 'title.json').write_text(
        json.dumps(data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'public/assets/title_sky.png  {LW}x{LH}')
    print(f'public/assets/title.png      {LW}x{LH}')
    print('public/assets/title.json     anclas de humo y ventanas')


if __name__ == '__main__':
    main()
