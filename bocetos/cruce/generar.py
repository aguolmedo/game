"""Genera los bocetos de 'El Cruce'. Uso: python3 generar.py"""
import os, math, random
from pixlib import Canvas, hexc, lerp, text, text_width, box, bar, walk_frame, UI, big_text, big_width

OUT = os.path.dirname(os.path.abspath(__file__))

# ------------------------------------------------------------------ paleta sprites
SP = {
    'k': '#2b1d2e', 's': '#eab48c', 'S': '#c88a66', 'b': '#2f4f96', 'B': '#213a70',
    'r': '#c0392b', 'w': '#f2ecdc', 'y': '#e6b84a', 'h': '#1e1a26', 'g': '#e4dccb',
    'l': '#3a2a22', 'n': '#6b4428', 'f': '#8a6240', 'F': '#6a4630', 'd': '#c45a6e',
    'D': '#9a4054', 'm': '#8a7058', 'M': '#5e4a3a', 'c': '#c8a466', 'C': '#9a7a46',
    'p': '#a0623a', 'P': '#7a4628', 'o': '#e0cfa0',
}

HEADS = {
    'sm': ["...kkkkkk...", ".kkhhhhhhkk.", "khhhhhyhhhhk", ".kkkkkkkkkk.",
           "..kssssssk..", "..kskssksk..", "..kssssssk..", "..khsSSshk.."],
    'gran': ["....krrk....", "...khhhhk...", "...khyyhk...", "..kkhhhhkk..",
             "..kssssssk..", "..kskssksk..", "..kssssssk..", "...kssssk..."],
    'arr': ["............", "....kkkk....", "...knnnnk...", "kkknnnnnnkkk",
            "..kssssssk..", "..kskssksk..", "..kssssssk..", "..knssssnk.."],
    'bel': ["............", "...knnnnk...", "..knssssnk..", "..knssssnk..",
            "..kssssssk..", "..kskssksk..", "..kssssssk..", "...kssssk..."],
    'pat': ["....kkkk....", "...knnnnk...", "..knnnnnnk..", "..knssssnk..",
            "..knssssnk..", "..kskssksk..", "..knssssnk..", "...kssssk..."],
}
LEGS = ["..kggggggk..", "..kggkkggk..", "..kggkkggk..", "..kllkkllk..", "..kllkkllk..", ".kkllkkllkk."]
BODIES = {
    'uniform': ["...krrrrk...", "kybbbwwbbbyk", "kbbbbwwbbbbk", "kbBbbyybbBbk",
                "ksBbbbbbbBsk", ".kBbbbbbbBk."] + LEGS,
    'poncho': ["..kppppppk..", ".kppppppppk.", "kppppppppppk", "krrrrrrrrrrk",
               "k" + "o" * 10 + "k", ".kPPPPPPPPk."] + LEGS,
    'habit': ["..kffffffk..", "kffffffffffk", "kffffffffffk", "kFwwwwwwwwFk",
              "ksFffffffFsk", ".kFfffwffFk.", ".kFfffwffFk.", ".kFffffffFk.",
              ".kFffffffFk.", ".kFffffffFk.", ".kkffffffkk.", "..kllkkllk.."],
    'dress': ["...kwwwwk...", "..kddddddk..", ".kddddddddk.", ".ksddddddsk.",
              ".kDddddddDk.", ".kDddddddDk.", "kDddddddddDk", "kDddddddddDk",
              "kDddddddddDk", "kDDDDDDDDDDk", ".kkkkkkkkkk.", "...kk..kk..."],
}
SM = HEADS['sm'] + BODIES['uniform']
SMP = HEADS['sm'] + BODIES['poncho']
GRAN = HEADS['gran'] + BODIES['uniform']
ARR = HEADS['arr'] + BODIES['poncho']
BEL = HEADS['bel'] + BODIES['habit']
PAT = HEADS['pat'] + BODIES['dress']

MULA = ["..k.k...........", "..kmk...........", ".kmmmk.kkkkkk...", "kmmkmkkcccccck..",
        "kmmmmmkcCcCcck..", ".kkmmmkcccccckk.", "...kmmmmmmmmmmmk", "...kmmmmmmmmmmk.",
        "...kMMMMMMMMMk..", "...kMkkMk.kMkkMk", "...kMkkMk.kMkkMk", "...kkkkkk.kkkkkk"]
CAMPANA = ["...kk...", "..kyyk..", ".kyyyyk.", ".kyywyk.", "kyyyyyyk", "kkkkkkkk", "...kk..."]
FLAME = ["...o...", "..oyo..", ".oyyyo.", "orryyro"]
FPAL = {'o': '#f08030', 'y': '#ffe070', 'r': '#d84a20'}


def sprite_scaled(cv, rows, x, y, s, pal=SP):
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch in pal:
                cv.rect(x + i * s, y + j * s, s, s, pal[ch])


# ------------------------------------------------------------------ montañas
def md(n, rough, rng):
    size = 1
    while size < n:
        size *= 2
    a = [0.0] * (size + 1)
    a[0], a[size] = rng.random(), rng.random()
    step, scale = size, 1.0
    while step > 1:
        half = step // 2
        for i in range(half, size, step):
            a[i] = (a[i - half] + a[i + half]) / 2 + (rng.random() - .5) * scale
        step, scale = half, scale * rough
    lo, hi = min(a), max(a)
    return [(v - lo) / (hi - lo + 1e-9) for v in a[:n]]


def mountains(cv, rng, base, amp, peaks, col, snowline, bottom, haze=None, haze_a=0.0,
              rough=.55, light='right', rim=None, jag_amp=None):
    n = cv.w
    nz = md(n + 1, rough, rng)
    hf = md(n + 1, .9, rng)
    jag_amp = amp * .3 if jag_amp is None else jag_amp
    ys = []
    for x in range(n):
        h = nz[x] * amp * .7
        for (px, ph, pw) in peaks:
            d = abs(x - px) / pw
            if d < 1:
                h = max(h, ph * (1 - d ** 1.1) + nz[x] * amp * .3)
        h += (hf[x] - .5) * jag_amp
        ys.append(int(base - h))
    sm = [sum(ys[max(0, x - 2):x + 3]) / len(ys[max(0, x - 2):x + 3]) for x in range(n)]
    slope = [sm[min(n - 1, x + 1)] - sm[max(0, x - 1)] for x in range(n)]
    sgn = 1 if light == 'right' else -1
    mid_l, mid_s = lerp(col['lit'], col['shade'], .45), lerp(col['snow_lit'], col['snow_shade'], .45)
    jag = md(n + 1, .8, rng)
    sbot = [snowline + int(jag[x] * 12) - 6 + max(0, int((snowline - ys[x]) * .3)) for x in range(n)]

    def face(x, y, top):
        depth = y - top
        xs = x - int(depth * .5 * sgn) + int(2 * math.sin(y / 5 + x / 17))
        s = slope[max(0, min(n - 1, xs))] * sgn
        return 'lit' if s > .6 else ('shade' if s < -.3 else 'mid')

    for x in range(n):
        top = ys[x]
        for y in range(max(top, 0), bottom):
            f = face(x, y, top)
            if y < sbot[x]:
                c = {'lit': col['snow_lit'], 'shade': col['snow_shade'], 'mid': mid_s}[f]
            else:
                c = {'lit': col['lit'], 'shade': col['shade'], 'mid': mid_l}[f]
                if (y + int(x * .4 * sgn)) % 9 == 0 and rng.random() < .22:
                    c = col['deep']
            if y == top and rim and f != 'shade':
                c = rim
            cv.px(x, y, c)
    # vetas de nieve que bajan por las canaletas
    for x0 in rng.sample(range(n), n // 14):
        L = rng.randint(4, 16)
        for k in range(L):
            x, y = x0 - int(k * .5 * sgn), sbot[x0] + k
            if 0 <= x < n and y >= ys[x] and y < bottom:
                f = face(x, y, ys[x])
                c = col['snow_lit'] if f == 'lit' else col['snow_shade']
                cv.px(x, y, c)
                if k < L // 2:
                    cv.px(x + 1, y, c)
    if haze:
        for x in range(n):
            for y in range(max(ys[x], 0), bottom):
                t = (y - (base - amp * .3)) / max(1, bottom - (base - amp * .3))
                if t > 0:
                    cv.blend(x, y, haze, min(1, t) * haze_a)
    return ys


def sky(cv, stops, y0=0, y1=None):
    y1 = y1 or cv.h
    for y in range(y0, y1):
        t = (y - y0) / max(1, y1 - y0 - 1)
        for i in range(len(stops) - 1):
            if stops[i][0] <= t <= stops[i + 1][0]:
                tt = (t - stops[i][0]) / (stops[i + 1][0] - stops[i][0])
                c = lerp(stops[i][1], stops[i + 1][1], tt)
                break
        cv.rect(0, y, cv.w, 1, c)


# ================================================================== 1. TÍTULO / FONDO
def andes_background(seed=1817):
    rng = random.Random(seed)
    cv = Canvas()
    sky(cv, [(0, '#141633'), (.32, '#36295a'), (.55, '#7e4468'), (.75, '#d9776a'), (1, '#f6c27a')], 0, 135)
    cv.rect(0, 135, 320, 45, '#f6c27a')
    for _ in range(55):  # estrellas
        x, y = rng.randrange(320), rng.randrange(55)
        cv.blend(x, y, '#ffffff', (1 - y / 55) * rng.uniform(.4, 1))
    for (x, y) in ((40, 12), (190, 8), (282, 20)):  # estrellas grandes
        for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
            cv.blend(x + dx, y + dy, '#fff6d8', .9 if (dx, dy) == (0, 0) else .45)
    # sol naciendo detrás del Aconcagua
    cv.glow(250, 108, 90, '#ffb070', .55)
    cv.glow(250, 108, 34, '#fff0c0', .7)
    cv.ellipse(250, 108, 12, 12, '#fff3cf')
    # nubes finas de amanecer
    for (x, y, rx) in ((60, 72, 34), (110, 80, 22), (190, 66, 40), (300, 78, 28), (20, 88, 18), (160, 92, 26)):
        cv.ellipse(x, y, rx, 1.5, '#f2a088', .55)
        cv.ellipse(x - 3, y - 1, rx * .7, 1, '#ffd6ae', .55)
    # capas de cordillera (lejos -> cerca)
    mountains(cv, rng, 128, 26, [(232, 82, 80), (120, 52, 55)],
              dict(lit='#c3a6c6', shade='#8a7aa8', deep='#7a6a98', snow_lit='#ffe6dc', snow_shade='#c4b6dc'),
              snowline=78, bottom=150, haze='#f0b0a0', haze_a=.55, rim='#fff0e0')
    mountains(cv, rng, 146, 28, [(60, 62, 60), (165, 42, 45)],
              dict(lit='#86699a', shade='#584a7c', deep='#4c4070', snow_lit='#f6c8c0', snow_shade='#9a8fc0'),
              snowline=104, bottom=168, haze='#d08a8a', haze_a=.5, rim='#ffd8c8')
    # neblina en el valle
    for y in range(138, 158):
        a = .35 * (1 - abs(y - 148) / 10)
        for x in range(320):
            cv.blend(x, y, '#f6c0a8', a * (0.7 + 0.3 * math.sin(x / 13 + y)))
    mountains(cv, rng, 164, 18, [(275, 44, 60), (20, 26, 35)],
              dict(lit='#4c3f6c', shade='#342b52', deep='#2a2346', snow_lit='#e0aab2', snow_shade='#6c6898'),
              snowline=134, bottom=180, haze='#7a4a6a', haze_a=.35, rim='#f0a090')
    # cóndores
    for (x, y, s) in ((112, 58, 1), (132, 50, 1), (96, 66, 0)):
        rows = ["kk.....kk", "..kk.kk..", "....k...."] if s else ["k...k", ".k.k.", "..k.."]
        for j, r in enumerate(rows):
            for i, ch in enumerate(r):
                if ch == 'k':
                    cv.px(x + i, y + j, '#2a2040')
    # cresta frontal con la columna en silueta
    ridge = [int(170 - 10 * math.sin((x + 30) / 70) - x * .03) for x in range(320)]
    for x in range(320):
        cv.rect(x, ridge[x], 1, 180 - ridge[x], '#1a162c')
        cv.px(x, ridge[x], '#6a3a5a')
    sil = '#1a162c'
    x = 26
    i = 0
    while x < 230:
        gy = ridge[x]
        if i % 3 == 2:  # mula
            cv.rect(x, gy - 5, 6, 3, sil); cv.rect(x - 1, gy - 7, 2, 3, sil)
            cv.px(x, gy - 2, sil); cv.px(x + 5, gy - 2, sil); cv.px(x, gy - 1, sil); cv.px(x + 5, gy - 1, sil)
            cv.rect(x + 1, gy - 7, 4, 2, sil)
            x += 11
        else:  # soldado
            cv.rect(x, gy - 6, 2, 5, sil); cv.px(x, gy - 8, sil); cv.px(x + 1, gy - 8, sil)
            cv.px(x, gy - 7, sil); cv.px(x + 1, gy - 7, sil); cv.px(x, gy - 1, sil); cv.px(x + 1, gy - 1, sil)
            cv.px(x + 2, gy - 9, sil)  # fusil
            cv.px(x + 2, gy - 10, sil)
            x += 7
        i += 1
    # bandera de los Andes al frente
    fx = 236
    gy = ridge[fx]
    cv.rect(fx, gy - 16, 1, 16, sil)
    cv.rect(fx - 1, gy - 6, 3, 6, sil)
    cv.rect(fx + 1, gy - 16, 6, 2, '#74acdf')
    cv.rect(fx + 1, gy - 14, 6, 2, '#f4f4f4')
    cv.px(fx + 7, gy - 15, '#74acdf'); cv.px(fx + 7, gy - 13, '#f4f4f4')
    return cv


def titulo():
    cv = andes_background()
    cv.save(f'{OUT}/fondo_andes_1x.png', f'{OUT}/fondo_andes.png')
    t, s = 'EL CRUCE', 4
    tw = big_width(t, s)
    x, y = (320 - tw) // 2, 14
    big_text(cv, x, y + 3, t, '#2a1a30', s, outline='#2a1a30')
    big_text(cv, x, y, t, '#ffeab8', s, outline='#2a1a30')
    for yy in range(y, y + 7 * s):  # degradé en el título
        for xx in range(x, x + tw):
            if cv.get(xx, yy)[:3] == hexc('#ffeab8')[:3]:
                c = lerp('#fff8e0', '#f09a50', (yy - y) / (7 * s))
                if (yy - y) % s == 0 and (yy - y) // s == 0:
                    c = '#ffffff'
                cv.px(xx, yy, c)
    sub = 'DE LOS ANDES'
    big_text(cv, (320 - big_width(sub, 1)) // 2, 50, sub, '#f6d6a8', 1, outline='#2a1a30')
    yr = '· 1817 ·'
    text(cv, (320 - text_width(yr)) // 2, 62, yr, '#f6d6a8', 1, outline='#2a1a30')
    msg = 'APRETÁ ESPACIO'
    text(cv, (320 - text_width(msg)) // 2, 172, msg, '#e8b8a0')
    cv.save(f'{OUT}/titulo_1x.png', f'{OUT}/titulo.png')


# ================================================================== 2. EL PLUMERILLO
def alamo(cv, x, y, rng, h=13):
    cv.ellipse(x + 3, y, 5, 1.5, '#000000', .25)
    cv.rect(x - 1, y - 4, 2, 4, '#5a3a22')
    cy = y - 3 - h
    for yy in range(int(cy - h), int(cy + h) + 1):
        for xx in range(x - 5, x + 6):
            d = ((xx - x + .5) / 4.6) ** 2 + ((yy - cy) / h) ** 2
            if d <= 1:
                if d > .78:
                    c = '#2f4f22'
                elif xx < x:
                    c = rng.choice(['#6fa63e', '#6fa63e', '#88bd4e'])
                else:
                    c = rng.choice(['#4a7a2e', '#4a7a2e', '#3a6226'])
                cv.px(xx, yy, c)


def tent(cv, cx, top):
    cv.ellipse(cx + 2, top + 12, 14, 2.5, '#000000', .25)
    for i in range(12):
        for xx in range(cx - i - 1, cx + i + 2):
            y = top + i
            if xx in (cx - i - 1, cx + i + 1):
                c = '#5a4a3a'
            elif abs(xx - cx) <= (i - 4) // 2 and i >= 5:
                c = '#3a2e28'
            elif xx == cx:
                c = '#b8ab90'
            elif xx < cx:
                c = '#f2ead6'
            else:
                c = '#cfc3a8'
            cv.px(xx, y, c)
    cv.rect(cx - 13, top + 12, 27, 1, '#5a4a3a')
    cv.px(cx, top - 1, '#5a4a3a'); cv.px(cx, top - 2, '#5a4a3a')


def fire(cv, x, y):
    cv.glow(x, y, 26, '#ffa040', .35)
    for dx, dy in ((-4, 0), (4, 0), (-3, 2), (3, 2), (0, 3), (-3, -2), (3, -2), (0, -2)):
        cv.px(x + dx, y + dy, '#7a7a86')
    cv.rect(x - 3, y, 7, 1, '#6a4428')
    cv.sprite(FLAME, x - 3, y - 4, FPAL, shadow=False)


def cannon(cv, x, y, flip=False):
    cv.ellipse(x + 9, y + 9, 9, 1.5, '#000000', .25)
    cv.rect(x + 3, y + 5, 10, 2, '#7a5230')
    cv.rect(x, y + 2, 18, 4, '#2b1d2e')
    cv.rect(x + 1, y + 3, 16, 2, '#9a7438')
    cv.rect(x + 1, y + 3, 16, 1, '#c89a50')
    cv.rect((x + 16) if not flip else x, y + 1, 2, 6, '#2b1d2e')
    cv.ellipse(x + 6, y + 7, 3, 3, '#2b1d2e')
    cv.ellipse(x + 6, y + 7, 2, 2, '#7a5230')
    cv.px(x + 6, y + 7, '#2b1d2e')


def plumerillo():
    rng = random.Random(1816)
    cv = Canvas()
    sky(cv, [(0, '#8fbce6'), (1, '#e2edf4')], 0, 34)
    mountains(cv, rng, 30, 10, [(90, 22, 40), (240, 26, 50)],
              dict(lit='#a8b4cc', shade='#8290b0', deep='#76839f', snow_lit='#ffffff', snow_shade='#d8e2f0'),
              snowline=17, bottom=36, haze='#dce8f0', haze_a=.6)
    cv.noise(0, 32, 320, 148, ['#5e8c3a', '#6a9a42', '#557f35', '#74a64a'], rng, [4, 4, 2, 1])
    for _ in range(140):  # matas y flores
        x, y = rng.randrange(320), rng.randrange(36, 180)
        if rng.random() < .8:
            cv.px(x, y, '#44702c'); cv.px(x + 1, y - 1, '#44702c'); cv.px(x + 2, y, '#44702c')
        else:
            cv.px(x, y, rng.choice(['#f6f0d0', '#f0d050', '#e08aa0']))
    # acequia
    cv.rect(0, 41, 320, 1, '#3e6226')
    cv.noise(0, 42, 320, 3, ['#4a86c0', '#4a86c0', '#8ac0e8'], rng)
    cv.rect(0, 45, 320, 1, '#3e6226')
    # caminos de tierra
    dirt = ['#c9a26a', '#bf975e', '#d4b07a']
    cv.noise(0, 80, 320, 13, dirt, rng)
    cv.noise(150, 46, 15, 82, dirt, rng)
    for x in range(320):
        cv.px(x, 79 + (rng.random() < .3), '#a8824e'); cv.px(x, 93 - (rng.random() < .3), '#a8824e')
    cv.rect(148, 40, 19, 7, '#9a6a3a')  # puentecito sobre la acequia
    for x in range(149, 166, 3):
        cv.rect(x, 40, 1, 7, '#6a4428')
    # fila de álamos
    for x in range(6, 320, 13):
        if 140 < x < 172:
            continue
        alamo(cv, x, 40, rng, h=12 + rng.randint(-1, 2))
    # carpas
    for (cx, ty) in ((24, 52), (58, 52), (92, 52), (124, 56), (26, 100), (60, 104)):
        tent(cv, cx, ty)
    fire(cv, 100, 112)
    cv.sprite(GRAN, 82, 100, SP)
    cv.sprite(ARR, 108, 101, SP, flip=True)
    # herrería de Beltrán
    hx, hy = 214, 48
    cv.ellipse(hx + 24, hy + 30, 26, 3, '#000000', .25)
    cv.rect(hx, hy + 10, 48, 20, '#c79a6a')
    for _ in range(40):
        cv.px(hx + rng.randrange(48), hy + 10 + rng.randrange(20), '#b0845a')
    for i in range(11):
        cv.rect(hx - 3 + i // 3, hy + i, 54 - 2 * (i // 3), 1, '#9a7a44' if i % 2 else '#b8955a')
    cv.rect(hx - 3, hy + 10, 54, 1, '#6a4a28')
    cv.rect(hx + 6, hy + 18, 8, 12, '#3a2620')
    cv.rect(hx + 28, hy + 16, 10, 7, '#3a2620')
    cv.rect(hx + 29, hy + 17, 8, 5, '#ff8a30')
    cv.rect(hx + 30, hy + 19, 6, 3, '#ffd060')
    cv.glow(hx + 33, hy + 22, 18, '#ff9a40', .3)
    cv.rect(hx + 18, hy + 33, 7, 2, '#4a4a56'); cv.rect(hx + 20, hy + 35, 3, 3, '#3a3a46')  # yunque
    cv.sprite(CAMPANA, hx + 2, hy + 32, SP)
    cv.sprite(CAMPANA, hx + 9, hy + 34, SP)
    cannon(cv, hx + 30, hy + 32)
    cv.sprite(BEL, hx + 20, hy + 38, SP)
    # bandera y patricia
    fx, fy = 178, 50
    cv.rect(fx, fy, 1, 27, '#8a8a8a')
    cv.rect(fx + 1, fy, 10, 3, '#74acdf'); cv.rect(fx + 1, fy + 3, 10, 3, '#f4f4f4')
    cv.px(fx + 6, fy + 2, '#e6b84a'); cv.px(fx + 6, fy + 3, '#e6b84a')
    cv.sprite(PAT, 186, 58, SP)
    # corral con mulas
    cx0, cy0, cw, ch = 248, 98, 66, 26
    for x in range(cx0, cx0 + cw + 1, 6):
        cv.rect(x, cy0, 1, 3, '#5a3a20'); cv.rect(x, cy0 + ch, 1, 3, '#5a3a20')
    for y in range(cy0, cy0 + ch + 1, 6):
        cv.rect(cx0, y, 1, 3, '#5a3a20'); cv.rect(cx0 + cw, y, 1, 3, '#5a3a20')
    cv.rect(cx0, cy0 + 1, cw, 1, '#9a6a3a'); cv.rect(cx0, cy0 + ch + 1, cw, 1, '#9a6a3a')
    cv.rect(cx0, cy0, 1, ch, '#9a6a3a'); cv.rect(cx0 + cw, cy0, 1, ch, '#9a6a3a')
    cv.sprite(MULA, 258, 104, SP)
    cv.sprite(MULA, 286, 108, SP, flip=True)
    cv.sprite(MULA, 266, 112, SP)
    # San Martín y un arriero con mula en el camino
    cv.sprite(SM, 154, 70, SP)
    cv.sprite(ARR, 60, 72, SP)
    cv.sprite(MULA, 40, 78, SP, flip=True)
    # HUD: reloj
    box(cv, 246, 3, 70, 26)
    text(cv, 252, 9, 'ENE · 1817', UI['ink'])
    text(cv, 252, 17, 'EL PLUMERILLO', '#8c3a1a')
    # diálogo
    box(cv, 4, 127, 312, 50)
    cv.rect(10, 133, 40, 38, UI['dark'])
    cv.rect(11, 134, 38, 36, '#bcd4e8')
    sprite_scaled(cv, BEL[:12], 12, 135, 3)
    text(cv, 57, 135, 'FRAY LUIS BELTRÁN', '#8c3a1a')
    cv.rect(57, 141, text_width('FRAY LUIS BELTRÁN'), 1, '#d8b88a')
    text(cv, 57, 148, 'GENERAL, LAS CAMPANAS DE LAS IGLESIAS', UI['ink'])
    text(cv, 57, 157, 'YA SON CAÑONES. ¿QUÉ MÁS NECESITA?', UI['ink'])
    for i in range(3):  # flechita "siguiente"
        cv.rect(302 + i, 164 + i, 5 - 2 * i, 1, '#8c3a1a')
    cv.save(f'{OUT}/plumerillo_1x.png', f'{OUT}/plumerillo.png')


# ================================================================== 3. EL CRUCE (etapa)
def rock(cv, cx, cy, r, rng):
    cv.ellipse(cx + 2, cy + r * .6, r + 1, r * .35, '#000000', .2)
    for yy in range(int(cy - r * .8), int(cy + r * .6) + 1):
        for xx in range(int(cx - r), int(cx + r) + 1):
            d = ((xx - cx) / r) ** 2 + ((yy - cy) / (r * .75)) ** 2
            if d <= 1:
                if d > .8:
                    c = '#3a3a4e'
                elif yy < cy - r * .35 + (xx - cx) * .2:
                    c = '#f4f8fc' if xx < cx + r * .3 else '#d4dff0'
                else:
                    c = '#7b7b92' if xx < cx else '#5a5a6e'
                    if rng.random() < .08:
                        c = '#4a4a5e'
                cv.px(xx, yy, c)


def cruce():
    rng = random.Random(9)
    cv = Canvas()
    sky(cv, [(0, '#6f98cc'), (1, '#d6e4f2')], 0, 70)
    mountains(cv, rng, 66, 20, [(250, 50, 60), (90, 34, 50)],
              dict(lit='#c9d4e6', shade='#97a6c4', deep='#8796b4', snow_lit='#ffffff', snow_shade='#d0dcee'),
              snowline=44, bottom=80, haze='#e6eef8', haze_a=.6, light='left')
    snow = ['#eef3fa', '#e6edf6', '#f6f9fd']
    cv.noise(0, 74, 320, 106, snow, rng, [4, 2, 2])
    for y in range(74, 180, 9):  # ondas de viento en la nieve
        for x in range(rng.randrange(-30, 0), 320, rng.randrange(40, 70)):
            for i in range(rng.randrange(8, 18)):
                cv.px(x + i, y + int(math.sin(i / 3) * 1.2), '#d6e0ee')

    def yc(x):
        return 150 - x * .26 + 6 * math.sin(x / 28)

    # precipicio abajo a la derecha
    for x in range(120, 320):
        edge = int(yc(x) + 12 + max(0, 160 - x) * .6)
        for y in range(edge, 180):
            t = (y - edge) / 40
            c = lerp('#7d94bc', '#2e3a62', min(1, t))
            cv.px(x, y, c)
        cv.px(x, edge, '#3a3a4e'); cv.px(x, edge + 1, '#5a5a6e'); cv.px(x, edge - 1, '#f4f8fc')
    for i in range(14):  # bruma del abismo
        cv.ellipse(rng.randrange(150, 330), rng.randrange(150, 182), rng.randrange(10, 26), 1.5, '#e6eef8', .3)
    # sendero pisado
    for x in range(320):
        c0 = yc(x)
        for y in range(int(c0 - 6), int(c0 + 6)):
            cv.px(x, y, rng.choice(['#c3ccdb', '#b8c2d3', '#cdd5e2']))
        cv.px(x, int(c0 - 7), '#dbe3ee')
        if x % 5 == 0:
            cv.px(x, int(c0 + rng.randint(-3, 3)), '#9eaabe')
    # rocas
    for (x, y, r) in ((20, 92, 9), (48, 84, 5), (120, 82, 7), (160, 96, 4), (200, 82, 6), (300, 88, 5),
                      (14, 132, 4), (90, 108, 3), (232, 92, 3), (60, 172, 6), (100, 168, 4)):
        rock(cv, x, y, r, rng)
    # columna del ejército (avanza hacia la derecha/arriba)
    def put(rows, x, flip=False):
        h = len(rows)
        cv.sprite(rows, x, int(yc(x + 6)) + 2 - h, SP, flip=flip)

    put(MULA, 10, True)
    put(ARR, 32)
    put(walk_frame(GRAN), 50)
    put(MULA, 66, True)
    put(GRAN, 88)
    put(MULA, 104, True)
    put(walk_frame(ARR), 126)
    # cañón arrastrado con sogas
    cxp = 146
    cy = int(yc(cxp + 9)) - 7
    cannon(cv, cxp, cy)
    put(ARR, 172)
    put(walk_frame(ARR), 186)
    for i in range(cxp + 18, 176):
        cv.px(i, int(cy + 3 + (i - cxp - 18) * ((yc(176) - 10 - cy - 3) / (176 - cxp - 18))), '#c8b080')
    put(GRAN, 206)
    put(MULA, 222, True)
    put(walk_frame(GRAN), 246)
    put(SMP, 266)
    # globito "!" sobre el granadero apunado
    bx, by = 206 + 1, int(yc(212)) - 32
    cv.rect(bx, by, 9, 9, '#2b1d2e'); cv.rect(bx + 1, by + 1, 7, 7, '#ffffff')
    cv.px(bx + 3, by + 9, '#2b1d2e'); cv.px(bx + 4, by + 10, '#2b1d2e'); cv.px(bx + 4, by + 9, '#ffffff')
    cv.rect(bx + 4, by + 2, 1, 3, '#c0392b'); cv.px(bx + 4, by + 6, '#c0392b')
    # viento y nieve
    for _ in range(260):
        x, y = rng.randrange(320), rng.randrange(180)
        if rng.random() < .3:
            cv.blend(x, y, '#ffffff', .9); cv.blend(x - 1, y - 1, '#ffffff', .45); cv.blend(x - 2, y - 2, '#ffffff', .2)
        else:
            cv.blend(x, y, '#ffffff', rng.uniform(.5, 1))
    # HUD
    box(cv, 3, 3, 122, 44)
    text(cv, 9, 9, 'DÍA 9 · PASO DE LOS PATOS', UI['ink'])
    bar(cv, 9, 18, 48, .55, '#d08a3a', '#a0522d', 'COMIDA')
    bar(cv, 9, 26, 48, .30, '#5aa0d8', '#e6eef8', 'ABRIGO')
    bar(cv, 9, 34, 48, .72, '#e0c040', '#c0392b', 'MORAL')
    box(cv, 252, 3, 65, 26)
    text(cv, 258, 9, '3.700 M', UI['ink'])
    text(cv, 258, 17, '-14°C', '#2f5f9a')
    # evento
    box(cv, 64, 138, 192, 38)
    m = '¡UN GRANADERO ESTÁ APUNADO!'
    text(cv, 160 - text_width(m) // 2, 145, m, '#8c3a1a')
    text(cv, 76, 157, '[A] DARLE AJO Y CEBOLLA', UI['ink'])
    text(cv, 76, 165, '[B] SEGUIR LA MARCHA', UI['ink'])
    cv.save(f'{OUT}/cruce_1x.png', f'{OUT}/cruce.png')


# ================================================================== 4. HOJA DE SPRITES
def sprites():
    cv = Canvas(bg='#f3e6c8')
    t = 'PERSONAJES · EL CRUCE'
    text(cv, (320 - text_width(t, 2)) // 2, 7, t, UI['ink'], 2)
    cv.rect(10, 20, 300, 1, '#d8b88a')
    chars = [('SAN MARTÍN', SM), ('CON PONCHO', SMP), ('GRANADERO', GRAN),
             ('ARRIERO', ARR), ('BELTRÁN', BEL), ('PATRICIA', PAT)]
    for i, (name, rows) in enumerate(chars):
        x0 = 10 + i * 50
        cv.sprite(rows, x0 + 10, 30, SP)
        cv.sprite(walk_frame(rows), x0 + 26, 30, SP)
        text(cv, x0 + 25 - text_width(name) // 2, 56, name, UI['ink'])
    props = [('MULA', lambda x, y: cv.sprite(MULA, x - 8, y + 4, SP)),
             ('CAÑÓN', lambda x, y: cannon(cv, x - 9, y + 5)),
             ('CAMPANA', lambda x, y: cv.sprite(CAMPANA, x - 4, y + 8, SP)),
             ('FOGATA', lambda x, y: fire(cv, x, y + 12)),
             ('CARPA', lambda x, y: tent(cv, x, y + 2))]
    for i, (name, draw) in enumerate(props):
        cx = 35 + i * 62
        draw(cx, 70)
        text(cv, cx - text_width(name) // 2, 92, name, UI['ink'])
    cv.rect(10, 102, 300, 1, '#d8b88a')
    sprite_scaled(cv, SM, 14, 110, 3)
    sprite_scaled(cv, GRAN, 56, 110, 3)
    text(cv, 14, 173, 'X3', '#8c6a4a')
    pal = ['#2b1d2e', '#eab48c', '#c88a66', '#2f4f96', '#213a70', '#c0392b', '#e6b84a', '#f2ecdc',
           '#6b4428', '#8a6240', '#c45a6e', '#8a7058', '#c8a466', '#a0623a', '#74acdf', '#5e8c3a',
           '#c9a26a', '#eef3fa', '#7b7b92', '#141633', '#7e4468', '#d9776a', '#f6c27a', '#86699a']
    text(cv, 110, 112, 'PALETA', UI['ink'])
    for i, c in enumerate(pal):
        x, y = 110 + (i % 12) * 16, 122 + (i // 12) * 16
        cv.rect(x, y, 13, 13, '#4a2a18'); cv.rect(x + 1, y + 1, 11, 11, c)
    cv.save(f'{OUT}/sprites_1x.png', f'{OUT}/sprites.png')


if __name__ == '__main__':
    titulo()
    plumerillo()
    cruce()
    sprites()
    print('ok')
