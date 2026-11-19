# Lámina de "Manos": cosas en el piso, silueta al dejar (válida / inválida) y cargar un mueble liviano.
# Base: captura del juego a 1x (art/direccion/doc/capturas/raw_house_v4.png, cámara x=-16). Uso: python3 art/concept/manos.py
import json, os, sys
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from menus_madera import FONT, hx, CREAM, CREAM2, AM3, FALTA, OUTL

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
A = os.path.join(ROOT, 'public', 'assets')
OUT = os.path.join(ROOT, 'art', 'concept', 'out')
base = Image.open(os.path.join(ROOT, 'art/direccion/doc/capturas/raw_house_v4.png')).convert('RGBA').resize((480, 270), Image.NEAREST)
CX, CY, CW, CH = 120, 70, 140, 100          # recorte en coords de mundo
def sheet(n): return Image.open(os.path.join(A, n + '.png')).convert('RGBA'), json.load(open(os.path.join(A, n + '.json')))
items, itemsD = sheet('items'); objs, objsD = sheet('objects'); chars = Image.open(os.path.join(A, 'chars2.png')).convert('RGBA')
def frame(im, d, name): x, y, w, h = d['frames'][name]; return im.crop((x, y, x + w, y + h))
def juan(dir_row, col=6): return chars.crop((col * 16, dir_row * 32, col * 16 + 16, dir_row * 32 + 32))

def panel():
    return base.crop((CX + 16, CY, CX + 16 + CW, CY + CH))
def put(p, spr, wx, wy_bottom, alpha=1.0, tint=None):
    s = spr.copy()
    if tint:
        px = s.load()
        for y in range(s.height):
            for x in range(s.width):
                r, g, b, a = px[x, y]
                if a: px[x, y] = tuple(round(c * 0.45 + t * 0.55) for c, t in zip((r, g, b), tint)) + (a,)
    if alpha < 1:
        s.putalpha(s.getchannel('A').point(lambda a: round(a * alpha)))
    p.alpha_composite(s, (round(wx - CX - s.width / 2), round(wy_bottom - CY - s.height)))
def shadow(p, wx, wy, w):
    for x in range(w - 2):
        X, Y = round(wx - CX - (w - 2) / 2 + x), wy - CY - 1
        r, g, b, a = p.getpixel((X, Y)); p.putpixel((X, Y), (round(r * .55), round(g * .5), round(b * .6), 255))
def corners(p, x, y, w, h, col=(255, 224, 150, 255), dark=(26, 20, 38, 220), n=4):
    x -= CX; y -= CY
    for (px_, py_, dx, dy) in ((x, y, 1, 1), (x + w - 1, y, -1, 1), (x, y + h - 1, 1, -1), (x + w - 1, y + h - 1, -1, -1)):
        for i in range(n):
            for (qx, qy) in ((px_ + i * dx, py_), (px_, py_ + i * dy)):
                p.putpixel((qx + (1 if dx > 0 else -1) * 0 + 1, qy + 1), dark)
        for i in range(n):
            p.putpixel((px_ + i * dx, py_), col); p.putpixel((px_, py_ + i * dy), col)
def sparkle(p, x, y):
    for (dx, dy) in ((0, 0), (-1, 1), (1, -1)): p.putpixel((x - CX + dx, y - CY + dy), (255, 245, 210, 255))
btn, btnD = sheet('buttons')
def label(p, s, x, y, col=CREAM, glyph=None):
    if glyph:
        gimg = frame(btn, btnD, glyph); gw = gimg.width + 4
        x += gw
    w = sum((len((FONT['glyphs'].get(c) or FONT['glyphs']['?'])[0]) + FONT['spacing']) if c != ' ' else 4 for c in s)
    x -= CX; y -= CY
    for j in range(11):
        for i in range(w + 6):
            if 0 <= x - 3 + i < CW and 0 <= y - 2 + j < CH:
                r, g, b, a = p.getpixel((x - 3 + i, y - 2 + j)); p.putpixel((x - 3 + i, y - 2 + j), (round(r * .25 + 26 * .75), round(g * .25 + 20 * .75), round(b * .25 + 38 * .75), 255))
    if glyph:
        for j in range(13):
            for i in range(gw):
                X, Y = x - gw - 3 + i, y - 3 + j
                if 0 <= X < CW and 0 <= Y < CH:
                    r, g_, b, a = p.getpixel((X, Y)); p.putpixel((X, Y), (round(r * .25 + 26 * .75), round(g_ * .25 + 20 * .75), round(b * .25 + 38 * .75), 255))
        p.alpha_composite(gimg, (x - gw - 1, y - 2))
    cx = x
    for ch in s:
        if ch == ' ': cx += 4; continue
        g = FONT['glyphs'].get(ch) or FONT['glyphs']['?']
        for gy, row in enumerate(g):
            for gx, c in enumerate(row):
                if c == '#' and 0 <= cx + gx < CW: p.putpixel((cx + gx, y + gy), col)
        cx += len(g[0]) + FONT['spacing']

mate = frame(items, itemsD, 'mate_cebado'); chair = frame(objs, objsD, 'chair')
JX, JF = 184, 150                                       # Juan, x y pies (mundo)

JX, JF = 166, 128                                       # Juan mirando a la derecha; casillero de adelante: x 176..192
# 1 · en el piso: se agarra con Manos, no se junta sola
p1 = panel(); shadow(p1, 184, 127, 12); put(p1, mate, 184, 127); sparkle(p1, 189, 114); put(p1, juan(3), JX, JF)
corners(p1, 176, 111, 16, 17); label(p1, 'Agarrar Mate', 150, 82, glyph='key_r')
# 2 · dejar: silueta válida en el casillero de adelante
p2 = panel(); put(p2, mate, 184, 127, alpha=.55); put(p2, juan(3), JX, JF); corners(p2, 176, 112, 16, 16)
label(p2, 'Dejar Mate', 154, 82, glyph='key_r')
# 3 · mouse en un lugar inválido (la pared del hall): silueta rojiza, sin cuadradito
p3 = panel(); put(p3, juan(3), JX, JF); put(p3, mate, 200, 120, alpha=.45, tint=(240, 154, 122))
label(p3, 'No entra ahi', 172, 82, col=FALTA)
# 4 · cargando una silla: sobre la cabeza, silueta donde se apoya
p4 = panel(); put(p4, chair, 184, 151, alpha=.55); put(p4, juan(3), JX, JF); put(p4, chair, JX, JF - 26)
corners(p4, 176, 127, 16, 24); label(p4, 'Apoyar la silla', 146, 82, glyph='key_r')

K = 4; GAP = 16; TOP = 22
sheet_ = Image.new('RGBA', (CW * K * 2 + GAP * 3, (CH * K + TOP * 2) * 2 + GAP), hx('1a1426'))
caps = ['En el piso: se agarra con Manos', 'Dejar: silueta en el casillero', 'Lugar invalido (mouse)', 'Cargar un mueble liviano']
from menus_madera import Canvas
for i, p in enumerate((p1, p2, p3, p4)):
    x = GAP + (i % 2) * (CW * K + GAP); y = (i // 2) * (CH * K + TOP * 2 + GAP) + TOP * 2
    sheet_.alpha_composite(p.resize((CW * K, CH * K), Image.NEAREST), (x, y))
    t = Image.new('RGBA', (CW * K // 2, TOP), (0, 0, 0, 0)); c = Canvas(t.resize((480, 270))); c.im = Image.new('RGBA', (240, 12), hx('1a1426')); c.px = c.im.load()
    c.text(0, 2, caps[i], CREAM2, shadow=None)
    sheet_.alpha_composite(c.im.resize((240 * 3, 12 * 3), Image.NEAREST), (x, y - TOP * 2 + 4))
os.makedirs(OUT, exist_ok=True); sheet_.save(os.path.join(OUT, 'manos.png')); print('ok', sheet_.size)
