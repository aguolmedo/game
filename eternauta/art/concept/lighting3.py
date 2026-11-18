"""Luz del apagón, parte 2 (concepto, NO es código del juego).
Extiende la propuesta aprobada del altillo (lighting2.py, light_flicker.gif) a la
CALLE y a la PLANTA BAJA, con las mismas reglas, y dibuja la lamparita APAGADA.

Decisiones (18/11):
  1. Oscuridad: legible. Lejos de la luz todo se lee (repaleta nocturna, sin negro).
  2. Lamparita del techo: cuadro apagado propio (sin cono ni charco, vidrio frío).
  3. Calle: farolas APAGADAS; la nieve es la luz del suelo (los pixeles de nieve
     no se apagan, se enfrían); una sola vela en una ventana; las demás oscuras.
  4. Planta baja: lámpara de aceite (cálida) + la ventana y el ojo de buey de la
     puerta como fuentes frías (haz inclinado de la nevada).
  El HUD NUNCA se oscurece.

  5b. El pucho del cenicero (planta baja, mesa ratona): brasa chica que
     respira despacio + humo; misma luz roja de brasa, radio 18-26 px.
  5. El pucho (idea del usuario): Lucas fuma en el apagón. La brasa es una luz
     chica y roja que se aviva cuando pita y se apaga despacio; un hilo de humo.

Base: capturas del juego SIN la capa de luz (art/direccion/doc/capturas/raw_*.png, 1920x1080 -> 480x270).
Salida: out/light3_*.png / .gif
"""
import math
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from lighting2 import night, band, lum, clamp, CANDLE_COL, SNOW_COL  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
CAPS = os.path.join(ROOT, 'art', 'direccion', 'doc', 'capturas')
OUT = os.path.join(HERE, 'out')


def cap(name):
    im = Image.open(os.path.join(CAPS, name + '.png')).convert('RGB')
    return im.resize((480, 270), Image.NEAREST)


def is_snow(c):
    """Nieve / hielo: claro y frío (o blanco)."""
    return lum(c) > 150 and c[2] >= c[0] - 6


def relight(src, warm=(), beams=(), glass=(), snow_glows=False, hud=(), flicker=0.0, vig_room=None):
    """warm: [(x, y, R)] fuentes cálidas · beams: [(x0, x1, ytop, slope, length)]
    glass: [(x0, y0, x1, y1)] vidrios que brillan cian · hud: rects que no se tocan."""
    w, h = src.size
    out = src.copy()
    px = out.load()
    sp = src.load()
    rx0, ry0, rx1, ry1 = vig_room or (0, 0, w, h)
    for y in range(h):
        for x in range(w):
            c = sp[x, y]
            n = night(c)
            lv = 0
            lcol = CANDLE_COL
            for src_ in warm:
                cx, cy, R = src_[:3]
                d = math.hypot(x - cx, (y - cy) * 1.25) / (R + (flicker if len(src_) < 5 else src_[4]))
                b = band(max(0.0, 1 - d) ** 1.6, x, y)
                if b > lv:
                    lv = b
                    lcol = src_[3] if len(src_) > 3 else CANDLE_COL
            sv = 0
            for (x0, x1, yt, slope, L) in beams:
                if y > yt:
                    k = y - yt
                    if k < L and x0 + k * slope <= x <= x1 + k * slope:
                        sv = max(sv, band(0.85 * (1 - k / L), x, y, cuts=(0.1, 0.28, 0.48, 0.9)))
            e = min(x - rx0, rx1 - 1 - x, y - ry0, ry1 - 1 - y)
            vig = 0.76 if e < 10 else 0.88 if e < 22 else 1.0
            if lv:
                t = lv / 4
                lit = tuple(c[i] * lcol[i] for i in range(3))
                n = tuple(n[i] * (1 - t) + lit[i] * t for i in range(3))
            elif sv:
                t = sv / 4 * 0.8
                lit = tuple(c[i] * SNOW_COL[i] * 0.8 for i in range(3))
                n = tuple(n[i] * (1 - t) + lit[i] * t for i in range(3))
            elif snow_glows and is_snow(c):
                # la nieve no se apaga: se enfría y queda como luz del suelo
                L = lum(c)
                n = (L * 0.50, L * 0.72, L * 0.92)
            else:
                n = tuple(v * vig for v in n)
            px[x, y] = tuple(clamp(v) for v in n)
    for (x0, y0, x1, y1) in glass:
        for y in range(y0, y1):
            for x in range(x0, x1):
                c = sp[x, y]
                if lum(c) > 110:
                    L = lum(c)
                    px[x, y] = (clamp(L * 0.62), clamp(L * 0.98), clamp(L * 1.12))
    for (x0, y0, x1, y1) in hud:
        out.paste(src.crop((x0, y0, x1, y1)), (x0, y0))
    return out


def flame(im, x, y):
    px = im.load()
    for (dx, dy, col) in ((0, 0, (255, 246, 200)), (0, -1, (255, 214, 120)),
                          (0, -2, (255, 170, 70)), (1, 0, (255, 220, 140))):
        px[x + dx, y + dy] = col


def kill_glow(im, src, box):
    """Farola apagada: lo que estaba pintado como halo cálido vuelve a la noche."""
    px = im.load()
    sp = src.load()
    x0, y0, x1, y1 = box
    for y in range(y0, y1):
        for x in range(x0, x1):
            c = sp[x, y]
            if c[0] > c[2] + 20 and lum(c) > 120:     # halo cálido pintado
                L = lum(c) * 0.55
                px[x, y] = tuple(clamp(v) for v in (L * 0.49, L * 0.55, L * 0.79))


def x3(im):
    return im.resize((im.width * 3, im.height * 3), Image.NEAREST)


def save_set(name, src, make, times=(180, 120, 160, 110, 140)):
    frames = [x3(make(f)) for f in (0, 2, -1, 3, 1)]
    frames[0].save(os.path.join(OUT, f'light3_{name}.png'))
    frames[0].save(os.path.join(OUT, f'light3_{name}.gif'), save_all=True,
                   append_images=frames[1:], duration=list(times), loop=0)
    W, H = frames[0].size
    cmp_ = Image.new('RGB', (W * 2 + 24, H), (17, 22, 42))
    cmp_.paste(x3(src), (0, 0))
    cmp_.paste(frames[0], (W + 24, 0))
    cmp_.save(os.path.join(OUT, f'light3_{name}_compare.png'))
    print('ok', name)


# ------------------------------------------------------------------ planta baja
CASA_HUD = [(5, 4, 313, 19), (374, 199, 477, 212), (247, 221, 477, 236), (148, 241, 333, 266)]


def casa(f):
    src = CASA
    im = relight(
        src,
        warm=[(78, 118, 70),                               # lámpara de aceite, mesita junto a la escalera
              (210, 143, 20 + 2 * f, EMBER_COL, 0)],       # el pucho del cenicero (mesa ratona)
        beams=[(148, 188, 64, 0.35, 60),                   # haz de la ventana
               (352, 366, 64, 0.35, 36)],                  # ojo de buey de la puerta sellada
        glass=[(148, 26, 190, 64), (350, 30, 368, 48)],
        hud=CASA_HUD, flicker=f, vig_room=(22, 10, 480, 270))
    flame(im, 78, 117)
    # brasa del cenicero: respira despacio (nadie lo fuma) + hilo de humo
    px = im.load()
    hot = (255, 200, 120) if f >= 2 else (255, 138, 74)
    px[209, 143] = hot
    px[210, 143] = (255, 138, 74)
    px[210, 144] = (200, 80, 44)
    smoke(im, 210, 143, int(f) % 3)
    return im


# ------------------------------------------------------------------ calle
CALLE_HUD = [(5, 4, 313, 19), (6, 23, 56, 43), (374, 181, 477, 194), (247, 221, 477, 236), (148, 241, 333, 266)]


def calle(f):
    src = CALLE
    im = relight(src, warm=[(168, 78, 22)], snow_glows=True, hud=[], flicker=f * 0.5)
    # farola apagada: la base es una captura SIN capa de luz, así que no hay halo
    # ventanas: solo la izquierda conserva una vela; la derecha y la buhardilla, oscuras
    px = im.load()
    sp = src.load()
    for (x0, y0, x1, y1, lit) in ((152, 62, 184, 92, True), (248, 62, 280, 92, False), (198, 18, 232, 38, False), (214, 72, 222, 80, False)):
        for y in range(y0, y1):
            for x in range(x0, x1):
                c = sp[x, y]
                if c[0] > c[2] + 30 and lum(c) > 120:     # vidrio amarillo encendido
                    if lit:
                        k = 0.75 if ((x + y) % 2 == 0 and y > (y0 + y1) // 2) else 0.5
                        px[x, y] = (clamp(c[0] * k), clamp(c[1] * k * 0.85), clamp(c[2] * k * 0.6))
                    else:
                        L = lum(c) * 0.3
                        px[x, y] = (clamp(L * 0.5), clamp(L * 0.6), clamp(L * 0.9))
    flame(im, 168, 84)
    for (x0, y0, x1, y1) in CALLE_HUD:
        im.paste(src.crop((x0, y0, x1, y1)), (x0, y0))
    return im


# ------------------------------------------------------------------ altillo + pucho
ALTILLO_HUD = [(5, 4, 313, 19), (247, 221, 477, 236), (148, 241, 333, 266)]
EMBER_COL = (1.22, 0.80, 0.58)      # la brasa: más roja que la vela
LUCAS_MOUTH = (266, 53)             # comisura de Lucas (derecha de la mesa)
CANDLE_ALT = (235, 80)
# ciclo del pucho: (intensidad 0..1, ms). Reposo largo, pitada, se apaga despacio.
PUCHO = [(0.0, 420), (0.0, 420), (0.05, 380), (0.55, 110), (1.0, 160), (1.0, 220),
         (0.7, 160), (0.4, 180), (0.2, 220), (0.0, 420)]
CANDLE_JIT = [0, 2, -1, 3, 1, 0, 2, -1, 1, 3]
SMOKE = [(0, -3), (1, -5), (0, -7), (1, -9), (2, -11)]


def ember(im, x, y, k):
    px = im.load()
    # el cigarrillo: 2 px de papel desde la comisura; la brasa va en la punta
    px[x, y] = (196, 190, 178)
    px[x + 1, y] = (176, 170, 160)
    x += 2
    if k < 0.3:
        px[x, y] = (178, 58, 30)                       # brasa dormida: 1 px
        return
    px[x, y] = (255, 214, 140) if k > 0.8 else (240, 120, 50)
    px[x + 1, y] = (226, 84, 36)
    if k > 0.8:
        px[x, y - 1] = (255, 150, 70)


def smoke(im, x, y, step):
    px = im.load()
    for i, (dx, dy) in enumerate(SMOKE):
        if (i + step) % 3 == 0:
            continue
        c = px[x + dx, y + dy]
        px[x + dx, y + dy] = tuple(clamp(v * 0.55 + 46) for v in c)   # humo gris, apenas


def altillo(i):
    src = ALTILLO
    k, _ = PUCHO[i]
    R_ember = 8 + 18 * k
    im = relight(src,
                 warm=[(CANDLE_ALT[0], CANDLE_ALT[1], 95, CANDLE_COL, CANDLE_JIT[i]),
                       (LUCAS_MOUTH[0] + 2, LUCAS_MOUTH[1], R_ember, EMBER_COL, 0)],
                 beams=[], hud=ALTILLO_HUD, flicker=0, vig_room=(0, 0, 480, 270))
    flame(im, CANDLE_ALT[0], CANDLE_ALT[1] - 3)
    ember(im, LUCAS_MOUTH[0], LUCAS_MOUTH[1], k)
    smoke(im, LUCAS_MOUTH[0] + 2, LUCAS_MOUTH[1], i)
    return im


def save_altillo():
    frames = [x3(altillo(i)) for i in range(len(PUCHO))]
    frames[0].save(os.path.join(OUT, 'light3_altillo_pucho.gif'), save_all=True,
                   append_images=frames[1:], duration=[ms for _, ms in PUCHO], loop=0)
    frames[4].save(os.path.join(OUT, 'light3_altillo_pucho_pitada.png'))
    frames[0].save(os.path.join(OUT, 'light3_altillo_pucho_reposo.png'))
    # detalle de la cara de Lucas, reposo | pitada, x10
    a = altillo(0).crop((236, 26, 296, 76))
    b = altillo(4).crop((236, 26, 296, 76))
    det = Image.new('RGB', (a.width * 2 + 4, a.height), (17, 22, 42))
    det.paste(a, (0, 0))
    det.paste(b, (a.width + 4, 0))
    det.resize((det.width * 10, det.height * 10), Image.NEAREST).save(
        os.path.join(OUT, 'light3_pucho_detalle_x10.png'))
    print('ok altillo + pucho')


# ------------------------------------------------------------------ lamparita apagada
def lamp_off():
    on = Image.open(os.path.join(ROOT, 'art', 'sprites', 'objects', 'hanging_lamp.png')).convert('RGBA')
    off = on.copy()
    px = off.load()
    REMAP = {
        (242, 212, 136): (122, 110, 96),   # interior de la pantalla, sin luz
        (208, 160, 80): (98, 86, 72),
        (154, 112, 48): (76, 64, 54),
        (255, 232, 176): (128, 132, 138),  # vidrio de la lamparita, frío
        (236, 171, 76): (92, 96, 104),
    }
    for y in range(32):
        for x in range(16):
            p = px[x, y]
            if not p[3]:
                continue
            if p[:3] in ((255, 214, 140), (255, 200, 110)):   # cono y charco pintados
                px[x, y] = (0, 0, 0, 0)
            elif p[:3] in REMAP:
                px[x, y] = REMAP[p[:3]] + (255,)
    off.save(os.path.join(OUT, 'light3_hanging_lamp_off.png'))
    sheet = Image.new('RGBA', (16 * 2 + 6, 34), (40, 34, 30, 255))
    sheet.alpha_composite(on, (2, 1))
    sheet.alpha_composite(off, (20, 1))
    sheet.resize((sheet.width * 10, sheet.height * 10), Image.NEAREST).save(
        os.path.join(OUT, 'light3_hanging_lamp_x10.png'))
    print('ok lamp_off')


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    CASA = cap('raw_house')
    CALLE = cap('raw_street')
    ALTILLO = cap('raw_attic')
    save_altillo()
    save_set('casa', CASA, casa)
    save_set('calle', CALLE, calle)
    lamp_off()
