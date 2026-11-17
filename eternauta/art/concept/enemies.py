"""Concept art de enemigos (direccion de arte 2, hecho a mano por Opus).

Los Manos: alienigenas del tamano de un humano (16x32, misma grilla que el
elenco), craneo alto y pelado, pelo blanco revuelto hacia atras, ojos muy
abiertos y hundidos, piel lila, remera negra ajustada, cinturon con barras
(la glandula del terror), pantalon negro fruncido al tobillo. La mano de
muchos dedos es su firma. Flotan envueltos en un aura punteada como en las
vinetas de Solano Lopez.

Cascarudos: rediseno con volumen (caparazon esferico sombreado por normal,
pronoto, cabeza con mandibulas, antenas segmentadas, patas articuladas) y el
teledirector que les ponen los Manos en la espalda.

Salida: art/concept/out/enemy_*.png
"""
import math
import os
import random
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'tools', 'art'))
sys.path.insert(0, HERE)
from pixel import Pix, hx, mix  # noqa: E402
from characters import sprite as human_sprite  # noqa: E402

OUT = os.path.join(HERE, 'out')

# ------------------------------------------------------------------ Mano
MANO_PAL = {k: hx(v) for k, v in {
    'S': '#cf9cb4', 's': '#a06e8e', 'd': '#6a4262', 'h': '#efc8d8',   # piel lila
    'H': '#dcd8e2', 'I': '#9e98ae', 'J': '#f6f4fa',                   # pelo blanco
    'E': '#eee8f0', 'e': '#160e1c', 'm': '#5a3050',                   # ojos, boca
    'T': '#2a2434', 't': '#1a1622', 'u': '#463e58',                   # remera negra
    'L': '#3a3448', 'l': '#c4c0d4',                                   # cinturon, barras
    'P': '#2c2836', 'p': '#1c1824',                                   # pantalon
    'B': '#282430', 'b': '#16141c',                                   # zapatillas
}.items()}

MANO = {
    # de frente, la mano derecha abierta sobre el pecho (vineta de la pag. 1)
    'front': [
        "................",
        "......hSSs......",
        "...J.hSSSSs.J...",
        "..JIhSSSSSSsIJ..",
        "..JhSSSSSSSSsJ..",
        ".JHhSssSSssSsHJ.",
        ".HISdddSSddds IH.".replace(' ', ''),
        "..ISEeESSEeEsI..",
        ".JISdddhsdddsIJ.",
        "..ISdSSddSSdsI..",
        "...SdSSSSSSds...",
        "...SdSmmmmSds...",
        "....SdSSSSds....",
        ".....sSSSSs.....",
        "......dssd......",
        "....uTTTTTTt....",
        "...uTTTThThTSt..",
        "..uuTTThThThtt..",
        "..uuTTSTSTSTtt..",
        "..STTSSSSTTTTS..",
        "..SSSsSTTTTTtS..",
        "..sTTTTTTTTTtS..",
        "....LlLlLlLL.S..",
        "....LlLlLlLL.S..",
        "....PPPPPPpp.S..",
        ".....PPPPPp.sSs.",
        ".....PPp.Pp.S.S.",
        ".....PPp.Pp.s.s.",
        ".....ppp.pp.....",
        "......S..S......",
        ".....BBB.BBB....",
        ".....bbb.bbb....",
    ],
    'side': [
        "................",
        ".....hSSS.......",
        "....hSSSSS......",
        "...JhSSSSSS.....",
        "..JHSSSSSSSs....",
        ".JHISSSSsSSSs...",
        "..HISSSSSdddS...",
        ".JIISsSSSdEeS...",
        "..IISSsSSSddSh..",
        "..IISSdSSSSSSS..",
        "...ISSsSSSdSs...",
        "....SSSSSSSmm...",
        "....sSSSSSSSs...",
        ".....ssSSSSs....",
        "......dssd......",
        ".....uTTTTt.....",
        "....uTTTTTTt....",
        "....uTuuTTTt....",
        "....uTuuTTTt....",
        "....TTSSTTTt....",
        "....TTSSTTTt....",
        "....TTSsTTtt....",
        "....LLSsLlLl....",
        "....LLssLLLL....",
        ".....PSSSPp.....",
        ".....PShShp.....",
        ".....PSPSPp.....",
        ".....PSPSPp.....",
        "......pppp......",
        ".......SS.......",
        "......BBBBBB....",
        "......bbbbbb....",
    ],
    'back': [
        "................",
        "......hSSs......",
        "...J.hSSSSs.J...",
        "..JIhSSSSSSsIJ..",
        "..JIHJHHJHHJIJ..",
        ".JHJHHJHJHHJHIJ.",
        ".HIHJIHHJIHJIIH.",
        ".JIHIHJIHIHJHIJ.",
        "..IIHIIJIIHIII..",
        ".J.IIHIIIHIII.I.",
        "...SIIHIIIIIs...",
        "...SSIIIIIIss...",
        "....sSSSSSSs....",
        ".....sSSSSs.....",
        "......dssd......",
        "....uTTTTTTt....",
        "...uTTTTTTTTt...",
        "..uuTTTTTTTTtt..",
        "..uuTTTTTTTTtt..",
        "..STTTTTTTTTts..",
        "..STTTTTTTTTts..",
        "..STTTTTTTTTts..",
        "..S.LLLLLLLL.s..",
        "..S.LLLLLLLL.s..",
        "..S.PPPPPPpp.s..",
        ".sSs.PPPPPp.sss.",
        ".S.S.PPp.Pp.S.S.",
        ".s.s.PPp.Pp.s.s.",
        ".....ppp.pp.....",
        "......S..S......",
        ".....BBB.BBB....",
        ".....bbb.bbb....",
    ],
}


def grid(rows, pal, w=16, h=32):
    p = Pix(w, h)
    for y, row in enumerate(rows):
        assert len(row) == w, (y, row, len(row))
        for x, ch in enumerate(row):
            if ch != '.':
                p.set(x, y, pal[ch])
    return p


def mano(view='front'):
    p = grid(MANO[view], MANO_PAL)
    p.outline(0.56, 0.22)
    return p


def aura(sprite, pad=10, seed=3, night=True):
    """Aura punteada como en el comic: una llamarada ovalada de bordes en
    punta, blanca y densa pegada al cuerpo, que se deshace en puntos."""
    w, h = sprite.w + pad * 2, sprite.h + pad * 2
    out = Pix(w, h)
    rnd = random.Random(seed)
    cx, cy = w / 2, h / 2 + 1
    rx, ry = w / 2 - 0.5, h / 2 - 0.5
    spikes = [rnd.uniform(0.0, 1.0) for _ in range(40)]
    glow, glow2 = hx('#f4f6ff'), hx('#a8bcff')
    for y in range(h):
        for x in range(w):
            dx, dy = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            rr = math.hypot(dx, dy)
            th = (math.atan2(dy, dx) / (2 * math.pi)) % 1
            edge = 0.72 + 0.28 * spikes[int(th * 40) % 40] ** 2
            t = rr / edge
            if t > 1:
                continue
            prob = 1.0 if t < 0.72 else (1 - (t - 0.72) / 0.28) ** 1.2
            if rnd.random() < prob:
                c = glow if t < 0.82 else glow2
                out.set(x, y, c, int(255 * (0.9 - 0.6 * max(0, t - 0.5))))
    out.paste(sprite, pad, pad)
    return out


def mano_hand():
    """Detalle 24x24: la mano de muchos dedos, abierta, palma al frente."""
    S, s, d, h = (MANO_PAL[k] for k in 'Ssdh')
    p = Pix(24, 24)
    # muneca y palma
    p.rect(10, 18, 4, 6, S); p.vline(13, 18, 23, s)
    p.ellipse(12, 15, 4.5, 3.6, S)
    p.hline(9, 14, 17, s)
    # dedos largos en abanico: 9 dedos finos de distinto largo
    n = 9
    for i in range(n):
        a = math.radians(-150 + i * (120 / (n - 1)))
        ln = 9 + 2 * math.sin(math.pi * i / (n - 1))
        x0, y0 = 12 + math.cos(a) * 3.6, 14 + math.sin(a) * 3.0
        for k in range(int(ln)):
            x = x0 + math.cos(a) * k
            y = y0 + math.sin(a) * k
            p.set(round(x), round(y), h if k < ln - 2 and i < n // 2 else S)
        tx, ty = x0 + math.cos(a) * (ln - 1), y0 + math.sin(a) * (ln - 1)
        p.set(round(tx), round(ty), d)                       # una
    p.set(10, 14, h); p.set(11, 13, h)
    p.outline(0.56, 0.22)
    return p


# ------------------------------------------------------------- cascarudos
B0, B1, B2, B3 = hx('#0c0a14'), hx('#1c1a2a'), hx('#34324c'), hx('#565a7e')
SPEC = hx('#b4bce0')
METAL, METAL2, LED = hx('#7c8698'), hx('#4a5262'), hx('#ff6a4a')
LIGHT = (-0.45, -0.75, 0.5)


def shaded_ellipse(p, cx, cy, rx, ry, spec=True, ridge=False):
    ln = math.sqrt(sum(c * c for c in LIGHT))
    L = tuple(c / ln for c in LIGHT)
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            nx, ny = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            d = nx * nx + ny * ny
            if d > 1:
                continue
            nz = math.sqrt(1 - d)
            lam = nx * L[0] + ny * L[1] + nz * L[2]
            c = B0 if lam < 0.15 else B1 if lam < 0.5 else B2 if lam < 0.78 else B3
            if spec and lam > 0.93:
                c = SPEC
            if ridge and d > 0.82:
                c = B0 if nx > -0.2 else B2
            p.set(x, y, c)


def jleg(p, pts, c=B1):
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        n = int(max(abs(x1 - x0), abs(y1 - y0), 1))
        for i in range(n + 1):
            p.set(round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n), c)
    for x, y in pts[1:-1]:
        p.set(x, y, B2)                                   # articulacion
    p.set(*pts[-1], B3)                                   # garra


def cascarudo(view='down', armored=False, step=0):
    """Escarabajo gigante en 3/4 desde arriba. down: 32x28, right: 36x22."""
    k = 1 if step else 0
    if view == 'down':
        w, h = 32, 28
        p = Pix(w, h)
        cx = 16
        # patas (detras): 3 por lado
        for sgn in (-1, 1):
            o = (k if sgn > 0 else -k)
            jleg(p, [(cx + sgn * 8, 9), (cx + sgn * 13, 6 + o), (cx + sgn * 14, 2 + o)])
            jleg(p, [(cx + sgn * 9, 14), (cx + sgn * 14, 14 - o), (cx + sgn * 15, 18 - o)])
            jleg(p, [(cx + sgn * 7, 18), (cx + sgn * 12, 20 + o), (cx + sgn * 14, 24 + o)])
        # antenas segmentadas, cortas y hacia adelante
        for sgn in (-1, 1):
            pts = [(cx + sgn * 3 - (1 if sgn > 0 else 0), 23), (cx + sgn * 5, 25), (cx + sgn * 6, 27)]
            jleg(p, pts, B2)
        # elitros (cuerpo) + pronoto + cabeza
        shaded_ellipse(p, cx, 10.5, 10.5, 9.5)
        p.vline(cx, 2, 19, B0); p.vline(cx - 1, 3, 17, B2)       # costura del elitro
        for yy in (7, 11, 15):                                   # estrias
            p.set(cx - 6, yy, B0); p.set(cx + 5, yy, B0)
        shaded_ellipse(p, cx, 18.5, 7.5, 3.6, ridge=True)
        shaded_ellipse(p, cx, 22, 4.2, 2.6)
        # mandibulas
        for sgn in (-1, 1):
            p.set(cx + sgn * 2 - (1 if sgn > 0 else 0), 24, B2)
            p.set(cx + sgn * 3 - (1 if sgn > 0 else 0), 25, B1)
            p.set(cx + sgn * 2 - (1 if sgn > 0 else 0), 26, B3)
        # ojos
        p.set(cx - 4, 21, hx('#5a2a3a')); p.set(cx + 3, 21, hx('#5a2a3a'))
        tele = (cx + 2, 8)
    else:
        w, h = 36, 22
        p = Pix(w, h)
        cy = 11
        for i, lx in enumerate((10, 16, 22)):
            o = (k if i % 2 else -k)
            jleg(p, [(lx, cy + 4), (lx - 2 + o, cy + 8), (lx - 3 + o, cy + 10)])
            jleg(p, [(lx + 1, cy + 2), (lx + 2 - o, cy + 6), (lx + 1 - o, cy + 9)], B0)
        jleg(p, [(31, cy + 1), (33, cy - 3), (34, cy - 5), (33, cy - 7)], B2)
        shaded_ellipse(p, 13, cy - 1, 11.5, 7.5)
        p.hline(3, 23, cy - 1, B0); p.hline(4, 21, cy - 2, B2)
        shaded_ellipse(p, 25, cy, 3.6, 5.2, ridge=True)
        shaded_ellipse(p, 30, cy + 1, 3, 3.4)
        p.set(32, cy + 4, B2); p.set(33, cy + 5, B3); p.set(31, cy + 5, B1)
        p.set(31, cy, hx('#5a2a3a'))
        tele = (14, cy - 7)
    if armored:                                       # placas del acorazado
        PL = hx('#7a86b0')
        if view == 'down':
            for k2, yy in enumerate((5, 9, 13)):
                for x in range(cx - 9, cx + 10):
                    y = yy + abs(x - cx) // 4
                    if p.get(x, y)[3] and p.get(x, y)[:3] != SPEC:
                        p.set(x, y, B0)
                        if p.get(x, y + 1)[3]:
                            p.set(x, y + 1, PL if x < cx else B2)
            for x, y in ((cx - 1, 20), (cx, 20), (cx, 19), (cx - 1, 19)):   # cuerno
                p.set(x, y, B3)
            p.set(cx - 1, 18, SPEC)
        else:
            for xx in (7, 12, 17):
                for y in range(p.h):
                    x = xx + (y - 6) // 4
                    if p.get(x, y)[3] and y < 12:
                        p.set(x, y, B0); p.set(x - 1, y, PL)
            p.set(33, 8, B3); p.set(34, 7, B3); p.set(34, 6, SPEC)
    # teledirector: cajita metalica con luz, atada al caparazon
    tx, ty = tele
    p.rect(tx - 2, ty - 1, 4, 3, METAL)
    p.hline(tx - 2, tx + 1, ty + 1, METAL2)
    p.set(tx - 2, ty - 1, hx('#c4ccd8'))
    p.set(tx + 1, ty - 2, METAL2); p.set(tx + 1, ty - 3, LED)
    p.outline(0.5, 0.2)
    return p


def scale(img, s):
    return img.resize((img.width * s, img.height * s), Image.NEAREST)


def on_bg(pix, bg, pad=0):
    im = Image.new('RGBA', (pix.w + pad * 2, pix.h + pad * 2), bg + (255,))
    im.alpha_composite(pix.img, (pad, pad))
    return im


NIGHT = hx('#1b2440')
SNOW = hx('#c8e2ee')


def lineup():
    """Escala: Juan, Juan con traje, Mano, cascarudo, acorazado sobre nieve."""
    items = [human_sprite('juan'), human_sprite('juan_suit'), aura(mano('front'), pad=6),
             cascarudo('down'), cascarudo('right'), cascarudo('down', armored=True)]
    W = sum(i.w for i in items) + 8 * (len(items) + 1)
    H = 52
    im = Image.new('RGBA', (W, H), NIGHT + (255,))
    for x in range(W):                               # piso nevado
        for y in range(40, H):
            im.putpixel((x, y), (SNOW if (x * 7 + y * 3) % 11 else hx('#9fbfd4')) + (255,))
    x = 8
    for it in items:
        base = 42 if it.h != 44 else 42 + 6
        im.alpha_composite(it.img, (x, base - it.h))
        x += it.w + 8
    return im


def portrait(src, pal, size=56):
    from portraits import tones, colorize
    im = Image.open(src).convert('L').point(lambda v: int(255 * (v / 255) ** 0.6))
    q = tones(im, (size, size), blur=1.1, contrast=1.1)
    return colorize(q, pal)


INK = [(20, 18, 28), (58, 52, 68), (122, 112, 128), (200, 190, 168), (242, 234, 214)]
LILAC = [(22, 12, 26), (70, 36, 66), (140, 88, 126), (210, 158, 186), (246, 226, 238)]


def build(ref_face=None):
    os.makedirs(OUT, exist_ok=True)
    for v in ('front', 'side', 'back'):
        m = mano(v)
        m.save(os.path.join(OUT, f'enemy_mano_{v}.png'))
        scale(m.img, 8).save(os.path.join(OUT, f'enemy_mano_{v}_x8.png'))
    a = aura(mano('front'))
    scale(on_bg(a, NIGHT), 6).save(os.path.join(OUT, 'enemy_mano_aura_x6.png'))
    scale(on_bg(mano_hand(), hx('#2a2434'), 2), 10).save(os.path.join(OUT, 'enemy_mano_hand_x10.png'))
    row = Image.new('RGBA', (32 * 4 + 36 * 2 + 10 * 7, 34), (0, 0, 0, 0))
    x = 10
    for c in (cascarudo('down'), cascarudo('down', step=1), cascarudo('right'),
              cascarudo('right', step=1), cascarudo('down', armored=True),
              cascarudo('right', armored=True)):
        row.alpha_composite(c.img, (x, 32 - c.h))
        x += c.w + 10
    scale(on_bg(Pix.__new__(Pix) if False else _wrap(row), SNOW), 5).save(
        os.path.join(OUT, 'enemy_cascarudos_x5.png'))
    scale(lineup(), 5).save(os.path.join(OUT, 'enemy_lineup_x5.png'))
    if ref_face and os.path.exists(ref_face):
        for name, pal in (('ink', INK), ('lilac', LILAC)):
            im = portrait(ref_face, pal)
            im.save(os.path.join(OUT, f'enemy_mano_dlg_{name}.png'))
            scale(im, 6).save(os.path.join(OUT, f'enemy_mano_dlg_{name}_x6.png'))
    print('ok')


def _wrap(img):
    p = Pix(img.width, img.height)
    p.img = img
    p.px = img.load()
    return p


if __name__ == '__main__':
    build(sys.argv[1] if len(sys.argv) > 1 else None)
