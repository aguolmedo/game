"""Concept art de personajes (direccion de arte, hecho a mano por Opus).

Sprites de frente 16x32 dibujados pixel a pixel en grillas de texto, y
retratos 32x32 construidos por rasgos. Fiel al comic (Oesterheld / Solano
Lopez, 1957) con la tecnica Stardew: formas limpias, 3-4 tonos por
material, contorno de color, detalle solo en caras y manos.

Claves de color en las grillas:
  .  vacio              S s d h  piel: base, sombra, profunda, luz
  H I J  pelo: base, sombra, luz          b  cejas      M  bigote
  e  ojo   m  boca      G g q  anteojos: marco, lente, brillo
  T t u  prenda principal: base, sombra, luz
  C c  prenda interior / franjas   R  corbata   L  cinturon
  P p  pantalon        B b  zapatos       K  guantes   w  medias
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'tools', 'art'))
from pixel import Pix, hx, mix  # noqa: E402

SKIN = {'S': '#e2ab8c', 's': '#bb7f68', 'd': '#8c5650', 'h': '#f4caa8'}
COMMON = {'e': '#1c1420', 'm': '#8a4848', 'G': '#1a1622', 'g': '#a9c4cf', 'q': '#eef8fb',
          'P': '#3b3f4c', 'p': '#2a2d38', 'B': '#4a3226', 'b': '#2e1e18', 'w': '#ece6da'}

PALETTES = {
    'juan': {'H': '#5a3e2c', 'I': '#3a281e', 'J': '#7e5a40', 'b': '#3a281e',
             'T': '#cfc6ae', 't': '#9a927c', 'u': '#e8e1cc', 'C': '#2b2f3e', 'c': '#1d202c'},
    'favalli': {'H': '#2a2226', 'I': '#171216', 'J': '#4c3e44', 'b': '#171216', 'M': '#171216',
                'T': '#d8cfb6', 't': '#a69e86', 'u': '#eee8d4', 'C': '#3a3440', 'c': '#26222c'},
    'lucas': {'H': '#cfc6b0', 'I': '#9e9682', 'J': '#ebe4d0', 'b': '#6e6658',
              'T': '#bdb6a2', 't': '#8f8a7a', 'u': '#dcd6c4', 'C': '#34374a', 'c': '#23253a',
              'R': '#5e2a32'},
    'polsky': {'H': '#d8d6d0', 'I': '#a8a49c', 'J': '#f4f2ec', 'b': '#a8a49c',
               'T': '#3a3946', 't': '#26252f', 'u': '#56556a', 'C': '#d8d8de', 'c': '#a8a8b4',
               'R': '#3c5446'},
    'elena': {'H': '#d8b070', 'I': '#a87e48', 'J': '#f2d698', 'b': '#a87e48', 'm': '#a8505a',
              'T': '#6e4a62', 't': '#4c3246', 'u': '#8e6880', 'C': '#ece4d0', 'c': '#bcb29c',
              'B': '#3a2430', 'b': '#24161e'},
    'martita': {'H': '#e2c890', 'I': '#b09060', 'J': '#f6e6b4', 'b': '#b09060', 'm': '#b85a5e',
                'T': '#e6dcc4', 't': '#b6ab92', 'u': '#faf4e4', 'C': '#ffffff', 'c': '#d8d0c0',
                'B': '#a83a3a', 'b': '#6e2228'},
    'juan_suit': {'T': '#3e4350', 't': '#2a2e38', 'u': '#5c6272', 'L': '#5a4a36',
                  'G': '#8a96a2', 'g': '#5c6672', 'q': '#c4ced6', 'M': '#2a2f3c',
                  'K': '#1e1c22', 'B': '#24222a', 'b': '#16151a'},
}

LEGS = [
    "..s.PPPPPPPP.s..",
    "....PPPppPPP....",
    "....PPP..PPp....",
    "....PPP..PPp....",
    "....PPp..PPp....",
    "...BBBb..BBBb...",
    "...bbbb..bbbb...",
]

GRIDS = {
    'lucas': [
        "................",
        "......SSSS......",
        "....ShhSSSSS....",
        "...ShhSSSSSSs...",
        "...SSSSSSSSSs...",
        "..HSSSSSSSSSsH..",
        "..HbbbSSSSbbbH..",
        "..IsdeSSSSedsI..",
        "..IsSeSSSSeSsI..",
        "..sSdSShsSSdSs..",
        "..sSdSShsSSdSs..",
        "...SdSsddsSdS...",
        "...SdSSSSSSdS...",
        "...SSSmmmmSSS...",
        "....sSSSSSSs....",
        ".....ssssss.....",
        "......ssss......",
        "...uTTCCCCTTt...",
        "..uuTTCRRCTTtt..",
        "..uTTTCRRCTTTt..",
        "..uTTTcRRcTTTt..",
        "..uTtTcRRcTtTt..",
        "..uTTTccccTTTt..",
        "..uTTTCCCCTTTt..",
        "..STTTPPPPTTTs..",
    ] + LEGS,
    'juan': [
        "................",
        ".....HHHHHH.....",
        "...JHHHHHHHHH...",
        "..JJHHHHHHHHHI..",
        "..JHHHHHHHHHHI..",
        "..HHSSHHSSSSHI..",
        "..HSSSSSSSSSSI..",
        "..IbbbSSSSbbbI..",
        "..ISSeSSSSeSSI..",
        "..sSSeSSSSeSSs..",
        "..sSSSShsSSSSs..",
        "...SSSSssSSSS...",
        "...SSSSSSSSSS...",
        "...SSSsmmsSSS...",
        "...sSSSSSSSSs...",
        "....ssSSSSss....",
        "......ssss......",
        "...uTCCCCCCTt...",
        "..uuTTCCCCTTtt..",
        "..uTTTTttTTTTt..",
        "..uTTTTttTTTTt..",
        "..uTuTTttTTtTt..",
        "..uTTTTttTTTTt..",
        "..uTTTTttTTTTt..",
        "..STTTTTTTTTTs..",
    ] + LEGS,
    'favalli': [
        "......HHHH......",
        "...JHHHJHHHH....",
        "..JHHJHHHJHHHI..",
        ".JHHHHHHHHHHHHI.",
        ".HHJHHHHHJHHHHI.",
        ".HHHSSHSSSSHHHI.",
        "..HSSSSSSSSSSI..",
        "..IbbbbSSbbbbI..",
        "..sGGGGGGGGGGs..",
        "..sGgeGSSGegGs..",
        "..sGqgGShGgqGs..",
        "...SGGGhsGGGS...",
        "...SSSSssSSSS...",
        "...SSMMMMMMSS...",
        "...sSSSmmSSSs...",
        "....sSSSSSSs....",
        ".....uTtTtT.....",
        "...uTTTTTTTTt...",
        "..uuTTTTTTTTtt..",
        "..CCCCCCCCCCCC..",
        "..uTTTTTTTTTTt..",
        "..CCCCCCCCCCCC..",
        "..uTTTTTTTTTTt..",
        "..uTTTTTTTTTTt..",
        "..SuTtTtTtTtTs..",
    ] + LEGS,
    'polsky': [
        "....JJHHHH......",
        "..JJHHHHHHHI....",
        ".JHHHHHHHHHHI...",
        ".HHHHHHHHHHHHI..",
        ".IHHSSSSSSSHHI..",
        "..HSShhSSSSSHI..",
        "..IsSSSSSSSSsI..",
        "..IIIISSSSIIII..",
        "..sSdeSSSSedSs..",
        "..sSdeShsSedSs..",
        "...SSShhsSSSS...",
        "...SdShhssSdS...",
        "...SdSddddSdS...",
        "...SSSmmmmSSS...",
        "....sSSSSSSs....",
        ".....ssSSss.....",
        "......ssss......",
        "...uTTCCCCTTt...",
        "..uuTTCRRCTTtt..",
        "..uTTTCRRCTTTt..",
        "..uTTTTRRTTTTt..",
        "..uTTTTTTTTTTt..",
        "..uTTTTuTTTTTt..",
        "..uTTTTTTTTTTt..",
        "..STTTTTTTTTTs..",
    ] + LEGS,
    'elena': [
        ".....JJHHH......",
        "...JJHHHHHHI....",
        "..JHHHHHHHHHHI..",
        ".JHHHHHHJHHHHHI.",
        ".HHHJHHHHHHHHHI.",
        ".HHHSSSSSSHHHHI.",
        ".HHSSSSSSSSSHHI.",
        ".HHSbbSSSSbbSHI.",
        ".HHSSeSSSSeSSHI.",
        ".IHSSeSSSSeSSHI.",
        ".IHSSSShsSSSSHI.",
        ".IHSSSSssSSSSHI.",
        ".IHShSSSSSShSHI.",
        ".IHHSSSmmSSSHHI.",
        ".IHHsSSSSSSsHHI.",
        "..IHHssSSssHHI..",
        "..IH..ssss..HI..",
        "....uTTCCTTt....",
        "...uuTTTTTTtt...",
        "..uuTTTTTTTTtt..",
        "..uTTTTTTTTTTt..",
        "..uTTTTttTTTTt..",
        "..STTTTTTTTTTs..",
        "..s.uTTTTTTt.s..",
        "...uTTTTTTTTt...",
        "...uTTTTTTTTt...",
        "..uTTTTTTTTTTt..",
        "..tttttttttttt..",
        ".....SS..SS.....",
        ".....SS..SS.....",
        "....BBB..BBB....",
        "....bbb..bbb....",
    ],
    'martita': [
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "......HHHH......",
        "....JHHHHHHI....",
        "...JHHHHHHHHI...",
        "...HHHHHHHHHI...",
        "...HHHHHHHHHI...",
        "...HSSSSSSSSI...",
        "...HSeSSSSeSI...",
        "...HSeSSSSeSI...",
        "...HShSssShSI...",
        "...IHSSmmSSHI...",
        "...IH.ssss.HI...",
        ".....uTTTTt.....",
        "....uuTCCTtt....",
        "...SuTTTTTTtS...",
        "...SuTTTTTTts...",
        "....uTTTTTTt....",
        "...uTTTTTTTTt...",
        "...uTTTTTTTTt...",
        "..uTTTTTTTTTTt..",
        "..tttttttttttt..",
        ".....SS..SS.....",
        ".....SS..SS.....",
        ".....ww..ww.....",
        "....BBB..BBB....",
        "....bbb..bbb....",
    ],
    'juan_suit': [
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "..GGGGGGGGGGGG..",
        "..GqGGGggGGGqG..",
        "..uTTTTMMTTTTt..",
        ".uuTTTTMMTTTTtt.",
        ".uTTTTGGGGTTTTt.",
        ".uTTTTGqqGTTTTt.",
        ".uTTTTTggTTTTTt.",
        ".uTTTTTTTTTTTTt.",
        ".tLLLLLLLLLLLLt.",
        ".KKTTTTTTTTTTKK.",
        ".KK.TTTTTTTT.KK.",
        "....TTTttTTT....",
        "....TTT..TTt....",
        "....TTT..TTt....",
        "...BBBB..BBBB...",
        "...BBBB..BBBB...",
        "...bbbb..bbbb...",
    ],
}

NAMES = {
    'juan': 'Juan Salvo', 'juan_suit': 'Juan con el traje', 'favalli': 'Favalli',
    'lucas': 'Lucas', 'polsky': 'Polsky', 'elena': 'Elena', 'martita': 'Martita',
}


def palette(name):
    pal = {}
    pal.update(SKIN)
    pal.update(COMMON)
    pal.update(PALETTES[name])
    return {k: hx(v) for k, v in pal.items()}


def from_grid(rows, pal):
    p = Pix(16, 32)
    for y, row in enumerate(rows):
        assert len(row) == 16, (y, row, len(row))
        for x, ch in enumerate(row):
            if ch != '.':
                p.set(x, y, pal[ch])
    return p


def helmet(p, pal, cx=7.5, cy=8.0, r=7.2):
    """Escafandra del comic: capucha acolchada oscura con un visor redondo de
    vidrio, de marco grueso, delante de la cara. Reflejo arriba a la izquierda."""
    juan = from_grid(GRIDS['juan'], palette('juan'))
    glass = hx('#9ec2d0')
    hood, hood2, hood3 = hx('#4a505e'), hx('#30343f'), hx('#646b7c')
    rim, rim2 = hx('#8a96a2'), hx('#c4ced6')
    vx, vy, vr = cx, cy + 1.0, 4.6
    for y in range(32):
        for x in range(16):
            d = math.hypot(x + 0.5 - cx - 0.5, y + 0.5 - cy)
            if d > r:
                continue
            dv = math.hypot(x + 0.5 - vx - 0.5, y + 0.5 - vy)
            if dv <= vr - 1:
                inner = juan.get(x, y + 1)
                base = inner[:3] if inner[3] else hx('#2c3644')
                p.set(x, y, mix(base, glass, 0.32))
            elif dv <= vr:
                p.set(x, y, rim2 if (y < vy and x < vx) else rim)
            else:
                c = hood3 if (x + 0.5 < cx and y + 0.5 < cy) else hood
                if d > r - 1.1 and x + 0.5 > cx:
                    c = hood2
                p.set(x, y, c)
    # costuras del acolchado
    for y in (3, 13):
        for x in range(4, 12, 2):
            if p.get(x, y)[3] and p.get(x, y)[:3] in (hood, hood3):
                p.set(x, y, hood2)
    p.set(5, 7, hx('#f2fbff')); p.set(6, 6, hx('#f2fbff'))
    return p


def sprite(name):
    pal = palette(name)
    p = from_grid(GRIDS[name], pal)
    if name == 'juan_suit':
        helmet(p, pal)
        for y in (15, 16):
            for x in range(2, 14):
                pass
        top = from_grid(GRIDS[name][15:17] + [''.ljust(16, '.')] * 0, pal) if False else None
        ring = Pix(16, 32)
        for y in (15, 16):
            for x, ch in enumerate(GRIDS[name][y]):
                if ch != '.':
                    ring.set(x, y, pal[ch])
        p.paste(ring, 0, 0)
    p.outline(0.56, 0.22)
    return p


# --------------------------------------------------------------- retratos
def portrait(name):
    """Retrato 32x32 (busto) construido por rasgos, pensado para el dialogo."""
    pal = palette(name)
    p = Pix(32, 32)
    S, s, d, h = pal['S'], pal['s'], pal['d'], pal['h']
    cfg = PORTRAIT[name]

    # hombros / ropa
    cfg['body'](p, pal)
    # cuello
    p.rect(13, 21, 6, 6, s)
    # cabeza
    if cfg.get('hair_back'):
        cfg['hair_back'](p, pal)
    hw, hh, cy = cfg['head']
    p.ellipse(16, cy, hw, hh, S)
    # mandibula cuadrada o larga
    if cfg.get('jaw'):
        jy0, jw = cfg['jaw']
        p.rect(16 - jw, jy0, jw * 2, 3, S)
    # sombra lado derecho (luz desde arriba a la izquierda)
    for y in range(32):
        for x in range(19, 32):
            c = p.get(x, y)
            if c[3] and c[:3] == S and (x - 16) ** 2 / hw ** 2 + (y - cy) ** 2 / hh ** 2 > 0.45:
                p.set(x, y, s)
    # orejas
    p.ellipse(16 - hw - 0.2, cy + 1, 1.4, 2.4, s)
    p.ellipse(16 + hw + 0.2, cy + 1, 1.4, 2.4, s)
    cfg['face'](p, pal)
    cfg['hair'](p, pal)
    p.outline(0.56, 0.22)
    return p


def eyes(p, pal, y=14, xl=12, xr=19, deep=False, white=True):
    if deep:
        p.hline(xl - 1, xl + 2, y - 1, pal['d'])
        p.hline(xr - 1, xr + 2, y - 1, pal['d'])
    for x in (xl, xr):
        p.rect(x, y, 2, 2, pal['e'])
        p.set(x, y, hx('#5a4a5a'))
        if white:
            p.set(x + 1, y, hx('#f6f0e8'))


def brows(p, c, y=12, xl=11, xr=18, w=4, thick=1, slant=0):
    for t in range(thick):
        p.hline(xl, xl + w - 1, y + t, c)
        p.hline(xr, xr + w - 1, y + t, c)
    if slant:
        p.set(xl, y + thick, c)
        p.set(xr + w - 1, y + thick, c)


def nose(p, pal, y0=14, y1=18, big=False):
    p.vline(16, y0, y1, pal['s'])
    p.vline(15, y0 + 1, y1, pal['h'])
    p.set(15, y1 + 1, pal['d']); p.set(17, y1 + 1, pal['d'])
    if big:
        p.rect(14, y1 - 1, 4, 2, pal['S'])
        p.hline(15, 16, y1 - 1, pal['h'])
        p.set(17, y1, pal['s'])


def mouth(p, pal, y=21, x0=14, x1=18):
    p.hline(x0, x1, y, pal['m'])
    p.hline(x0 + 1, x1 - 1, y + 1, pal['s'])


# --- cuerpos de retrato
def body_jacket_open(p, pal):
    p.ellipse(16, 33, 14, 8, pal['T'])
    p.ellipse(11, 31, 5, 5, pal['u'])
    p.ellipse(22, 31, 5, 5, pal['t'])
    for y in range(25, 32):
        w = (y - 24)
        p.hline(16 - w, 15 + w, y, pal['C'])
    p.rect(15, 26, 2, 6, pal['R'])
    p.set(15, 26, mix(pal['R'], hx('#ffffff'), 0.25))


def body_zip(p, pal):
    p.ellipse(16, 33, 14, 8, pal['T'])
    p.ellipse(11, 31, 5, 5, pal['u'])
    p.ellipse(22, 31, 5, 5, pal['t'])
    p.rect(12, 24, 8, 4, pal['C'])
    p.hline(12, 19, 24, mix(pal['C'], hx('#ffffff'), 0.15))
    p.vline(16, 28, 31, pal['t'])
    p.set(16, 28, hx('#c0c4cc'))


def body_sweater_stripes(p, pal):
    p.ellipse(16, 33, 15, 9, pal['T'])
    p.ellipse(10, 31, 5, 5, pal['u'])
    for yy in (27, 30):
        for x in range(1, 31):
            if p.get(x, yy)[3]:
                p.set(x, yy, pal['C'])
                if p.get(x, yy + 1)[3]:
                    p.set(x, yy + 1, pal['C'])
    p.rect(11, 22, 10, 5, pal['T'])
    for x in range(11, 21, 2):
        p.vline(x, 22, 26, pal['t'])


def body_suit_tie(p, pal):
    p.ellipse(16, 33, 14, 8, pal['T'])
    p.ellipse(11, 31, 5, 5, pal['u'])
    for y in range(25, 31):
        w = (y - 24)
        p.hline(16 - w, 15 + w, y, pal['C'])
    p.rect(15, 26, 2, 6, pal['R'])


def body_dress(p, pal):
    p.ellipse(16, 33, 13, 8, pal['T'])
    p.ellipse(11, 31, 4, 5, pal['u'])
    p.rect(13, 25, 6, 2, pal['C'])
    p.set(16, 27, pal['c'])


def body_child(p, pal):
    p.ellipse(16, 34, 11, 7, pal['T'])
    p.rect(13, 27, 6, 2, pal['C'])


# --- caras
def face_juan(p, pal):
    brows(p, pal['b'], y=12, thick=2)
    eyes(p, pal)
    nose(p, pal)
    mouth(p, pal, x0=14, x1=18)
    p.set(11, 22, pal['s']); p.set(20, 22, pal['s'])     # mandibula marcada
    p.hline(13, 18, 24, pal['s'])


def face_favalli(p, pal):
    brows(p, pal['b'], y=11, thick=2, w=5, xl=10, xr=17)
    # anteojos de marco grueso negro, lentes claros con los ojos detras
    for x0 in (8, 17):
        p.rect(x0 + 1, 14, 5, 4, pal['g'])
        p.frame(x0, 13, 7, 6, pal['G'])
        p.hline(x0, x0 + 6, 14, pal['G'])
        p.rect(x0 + 3, 15, 2, 2, pal['e'])
        p.set(x0 + 1, 15, pal['q']); p.set(x0 + 2, 15, pal['q'])
    p.hline(15, 16, 14, pal['G'])
    nose(p, pal, y0=17, y1=19)
    p.rect(12, 20, 8, 2, pal['M'])                     # bigote
    p.set(12, 21, pal['S']); p.set(19, 21, pal['S'])
    p.hline(14, 17, 23, pal['m'])


def face_lucas(p, pal):
    p.hline(12, 19, 8, pal['s']); p.hline(13, 18, 10, pal['s'])   # frente surcada
    brows(p, pal['b'], y=12, thick=2)
    eyes(p, pal, deep=True)
    nose(p, pal, y0=14, y1=20)
    for y, x in ((20, 12), (21, 12), (22, 13), (20, 20), (21, 20), (22, 19)):
        p.set(x, y, pal['d'])
    mouth(p, pal, y=23, x0=14, x1=18)
    p.vline(10, 16, 19, pal['s']); p.vline(22, 16, 19, pal['d'])


def face_polsky(p, pal):
    p.hline(12, 19, 9, pal['s'])
    brows(p, pal['I'], y=12, thick=2, slant=1)
    eyes(p, pal, deep=True)
    nose(p, pal, y0=14, y1=19, big=True)
    for y, x in ((21, 12), (22, 13), (21, 20), (22, 19)):
        p.set(x, y, pal['d'])
    mouth(p, pal, y=23, x0=14, x1=18)


def face_elena(p, pal):
    brows(p, pal['b'], y=12, w=3, xl=12, xr=18)
    eyes(p, pal)
    p.set(11, 14, pal['e']); p.set(21, 14, pal['e'])     # pestanas
    nose(p, pal, y0=15, y1=18)
    p.hline(14, 17, 21, pal['m']); p.hline(15, 16, 22, mix(pal['m'], hx('#ffffff'), 0.2))
    p.set(11, 18, mix(pal['S'], hx('#e07a7a'), 0.35)); p.set(21, 18, mix(pal['S'], hx('#e07a7a'), 0.35))


def face_martita(p, pal):
    eyes(p, pal, y=16, xl=12, xr=18)
    p.set(16, 19, pal['s'])
    p.hline(15, 17, 21, pal['m'])
    p.set(11, 19, mix(pal['S'], hx('#e07a7a'), 0.45)); p.set(21, 19, mix(pal['S'], hx('#e07a7a'), 0.45))


# --- pelos
def hair_juan(p, pal):
    H, I, J = pal['H'], pal['I'], pal['J']
    p.ellipse(16, 7, 9, 5, H)
    p.rect(7, 7, 2, 7, H); p.rect(23, 7, 2, 7, I)
    p.hline(9, 22, 10, H)
    p.hline(9, 13, 11, H)                                 # raya al costado
    for x in range(10, 20, 3):
        p.set(x, 5, J); p.set(x + 1, 4, J)
    p.hline(19, 23, 9, I)


def hair_favalli(p, pal):
    H, I, J = pal['H'], pal['I'], pal['J']
    p.ellipse(16, 7, 10, 6, H)
    p.rect(6, 7, 3, 7, H); p.rect(23, 7, 3, 7, I)
    for k, x in enumerate(range(8, 25, 4)):                 # ondas
        p.hline(x, x + 2, 4 + (k % 2), J)
        p.hline(x - 1, x + 1, 8 + (k % 2), I)
    p.hline(10, 22, 10, H)


def hair_lucas(p, pal):
    H, I, J = pal['H'], pal['I'], pal['J']
    p.ellipse(12, 6, 3, 2, pal['h'])                       # calva con brillo
    for x0, c in ((7, H), (23, I)):
        p.rect(x0, 10, 2, 6, c)
        p.set(x0 + (1 if x0 < 16 else -1), 9, c)
    p.set(8, 16, J); p.set(23, 16, I)


def hair_polsky(p, pal):
    H, I, J = pal['H'], pal['I'], pal['J']
    p.ellipse(16, 6, 10, 5, H)
    p.rect(6, 6, 3, 9, H); p.rect(23, 6, 3, 9, I)
    for x in range(7, 25, 3):                                # peinado para atras, revuelto
        p.vline(x, 2, 5, J if x < 16 else I)
    p.set(5, 4, H); p.set(26, 3, I); p.set(4, 8, I); p.set(27, 7, I)
    p.hline(11, 21, 10, pal['S'])


def hair_elena_back(p, pal):
    H, I, J = pal['H'], pal['I'], pal['J']
    p.ellipse(16, 10, 11, 9, H)
    p.rect(5, 10, 5, 14, H); p.rect(22, 10, 5, 14, I)
    for y in range(11, 24, 3):                               # ondas a los hombros
        p.set(5 + (y % 2), y, J); p.set(26 - (y % 2), y, I)
    p.ellipse(5, 23, 3, 2.5, H); p.ellipse(27, 23, 3, 2.5, I)


def hair_elena(p, pal):
    H, I, J = pal['H'], pal['I'], pal['J']
    p.ellipse(16, 6, 9, 4, H)
    p.hline(10, 19, 3, J); p.hline(9, 14, 4, J)
    p.rect(8, 7, 7, 3, H)                                    # raya al costado: mechon que cae
    p.set(8, 10, H); p.set(9, 10, H)
    p.rect(18, 7, 6, 2, I)


def hair_martita_back(p, pal):
    H, I = pal['H'], pal['I']
    p.ellipse(16, 12, 11, 9, H)
    p.rect(5, 12, 5, 12, H); p.rect(22, 12, 5, 12, I)


def hair_martita(p, pal):
    H, I, J = pal['H'], pal['I'], pal['J']
    p.ellipse(16, 9, 9, 5, H)
    p.rect(8, 9, 16, 4, H)                                    # flequillo recto
    for x in range(9, 23, 2):
        p.set(x, 13, H)
    p.hline(11, 20, 5, J); p.hline(10, 14, 6, J)
    p.rect(20, 9, 4, 4, I)


PORTRAIT = {
    'juan': dict(head=(7.5, 10, 14), jaw=(19, 6), body=body_zip, face=face_juan, hair=hair_juan),
    'favalli': dict(head=(8, 10, 14), jaw=(19, 7), body=body_sweater_stripes, face=face_favalli,
                    hair=hair_favalli),
    'lucas': dict(head=(7, 12, 14), body=body_jacket_open, face=face_lucas, hair=hair_lucas),
    'polsky': dict(head=(7, 11, 14), body=body_suit_tie, face=face_polsky, hair=hair_polsky),
    'elena': dict(head=(7, 9, 15), body=body_dress, face=face_elena, hair=hair_elena,
                  hair_back=hair_elena_back),
    'martita': dict(head=(7.5, 8, 16), body=body_child, face=face_martita, hair=hair_martita,
                    hair_back=hair_martita_back),
}


def portrait_suit():
    p = Pix(32, 32)
    pal = palette('juan_suit')
    hood, hood2, hood3 = hx('#4a505e'), hx('#30343f'), hx('#646b7c')
    p.ellipse(16, 34, 15, 9, pal['T'])
    p.ellipse(10, 31, 5, 5, pal['u'])
    face = portrait('juan')
    glass = hx('#9ec2d0')
    for y in range(32):
        for x in range(32):
            dd = math.hypot(x + 0.5 - 16, y + 0.5 - 14)
            if dd > 13.5:
                continue
            dv = math.hypot(x + 0.5 - 16, y + 0.5 - 15)
            if dv <= 8.2:
                c = face.get(x, y)
                base = c[:3] if c[3] else hx('#2c3644')
                p.set(x, y, mix(base, glass, 0.30))
            elif dv <= 10:
                p.set(x, y, hx('#c4ced6') if (y < 15 and x < 16) else hx('#8a96a2'))
            else:
                col = hood3 if (x < 14 and y < 12) else hood
                if dd > 12.4 and x > 16:
                    col = hood2
                p.set(x, y, col)
    for y in (4, 25):
        for x in range(7, 26, 3):
            if p.get(x, y)[3]:
                p.set(x, y, hood2)
    for ang in range(200, 245, 4):
        a = math.radians(ang)
        p.set(round(16 + 6.5 * math.cos(a)), round(15 + 6.5 * math.sin(a)), hx('#f4fcff'))
    p.rect(14, 24, 4, 3, hx('#5c6672')); p.hline(14, 17, 24, hx('#c4ced6'))   # valvula
    p.outline(0.56, 0.22)
    return p


ORDER = ['juan', 'juan_suit', 'favalli', 'lucas', 'polsky', 'elena', 'martita']


def render(out_dir):
    os.makedirs(out_dir, exist_ok=True)
    for name in ORDER:
        sp = sprite(name)
        po = portrait_suit() if name == 'juan_suit' else portrait(name)
        sp.img.save(os.path.join(out_dir, f'{name}_sprite.png'))
        po.img.save(os.path.join(out_dir, f'{name}_portrait.png'))
        sp.img.resize((16 * 8, 32 * 8), 0).save(os.path.join(out_dir, f'{name}_sprite_x8.png'))
        po.img.resize((32 * 6, 32 * 6), 0).save(os.path.join(out_dir, f'{name}_portrait_x6.png'))


if __name__ == '__main__':
    render(os.path.join(HERE, 'out'))
    print('ok')
