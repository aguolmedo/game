"""Retratos de diálogo del elenco con la factura de juan_suit (diseño 32x32, se
muestra a 64x64 con pixeles dobles). Concepto, no toca el juego.

Método (respeta el diseño de cada sprite, que es lo que el usuario eligió):
  1. Base: cabeza y hombros del sprite (16x16 desde el tope) -> Scale2x -> 32x32.
     Scale2x redondea diagonales sin inventar colores. Mismo encuadre que juan_suit
     (la cabeza ocupa ~28 de 32).
  2. Contorno de 1 px (Scale2x lo deja de 2).
  3. Luz desde arriba a la izquierda: borde de arriba/izquierda de cada material
     un tono más claro, borde de abajo/derecha un tono más oscuro -> 4-5 tonos.
  4. Retoques a mano por personaje (brillos de ojos, anteojos, boca).
Salida: out/p32_<who>.png (32x32), out/p32_<who>_x2.png (64x64, como en el juego)
y out/p32_lamina.png (comparación con el retrato actual y el de juan_suit).
"""
import json
import os

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
A = os.path.join(ROOT, 'public', 'assets')
OUT = os.path.join(HERE, 'out')
D = json.load(open(os.path.join(A, 'chars2.json')))
SHEET = Image.open(os.path.join(A, 'chars2.png')).convert('RGBA')
CW, CH = D['cell']['w'], D['cell']['h']
IDLE = D['idle'][0]
CLEAR = (0, 0, 0, 0)


def sprite(who):
    b = D['blocks'][who]
    return SHEET.crop((b['x'] + IDLE * CW, b['y'], b['x'] + (IDLE + 1) * CW, b['y'] + CH))


def top_of(im):
    for y in range(im.height):
        if any(im.getpixel((x, y))[3] for x in range(im.width)):
            return y
    return 0


def scale2x(im):
    w, h = im.size
    src = im.load()
    out = Image.new('RGBA', (w * 2, h * 2), CLEAR)
    o = out.load()

    def g(x, y):
        x = min(max(x, 0), w - 1)
        y = min(max(y, 0), h - 1)
        return src[x, y]
    for y in range(h):
        for x in range(w):
            P = src[x, y]
            A_, B, C_, D_ = g(x, y - 1), g(x + 1, y), g(x - 1, y), g(x, y + 1)
            e0 = e1 = e2 = e3 = P
            if C_ == A_ and C_ != D_ and A_ != B:
                e0 = A_
            if A_ == B and A_ != C_ and B != D_:
                e1 = B
            if D_ == C_ and D_ != B and C_ != A_:
                e2 = C_
            if B == D_ and B != A_ and D_ != C_:
                e3 = D_
            o[2 * x, 2 * y], o[2 * x + 1, 2 * y] = e0, e1
            o[2 * x, 2 * y + 1], o[2 * x + 1, 2 * y + 1] = e2, e3
    return out


def lum(c):
    return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]


def is_outline(c):
    return c[3] and lum(c) < 70


def shade(c, k):
    return tuple(max(0, min(255, int(v * k))) for v in c[:3]) + (255,)


def lighten(c):
    # luz cálida: hacia el blanco-crema
    return tuple(max(0, min(255, int(v + (255 - v) * 0.28 + 4))) for v in c[:3]) + (255,)


def thin_outline(im):
    """El contorno doble de Scale2x pasa a 1 px: el pixel de contorno que está del
    lado de adentro (sin vecino transparente) toma el color del material vecino, en sombra."""
    w, h = im.size
    src = im.copy().load()
    px = im.load()
    for y in range(h):
        for x in range(w):
            c = src[x, y]
            if not is_outline(c):
                continue
            nb = [src[x + dx, y + dy] if 0 <= x + dx < w and 0 <= y + dy < h else CLEAR
                  for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))]
            if any(n[3] == 0 for n in nb):
                continue            # borde de afuera: queda
            mats = [n for n in nb if n[3] and not is_outline(n)]
            if len(mats) >= 2:
                px[x, y] = shade(max(mats, key=lum), 0.78)
    return im


def light(im):
    """Arriba/izquierda de cada material, un tono más claro; abajo/derecha, más oscuro."""
    w, h = im.size
    src = im.copy().load()
    px = im.load()
    for y in range(h):
        for x in range(w):
            c = src[x, y]
            if not c[3] or is_outline(c):
                continue
            up = src[x, y - 1] if y > 0 else CLEAR
            lf = src[x - 1, y] if x > 0 else CLEAR
            dn = src[x, y + 1] if y < h - 1 else CLEAR
            rt = src[x + 1, y] if x < w - 1 else CLEAR
            if (up != c and up[3] == 0) or (lf != c and (lf[3] == 0 or is_outline(lf)) and x < w // 2):
                px[x, y] = lighten(c)
            elif (rt != c and (rt[3] == 0 or is_outline(rt)) and x >= w // 2) or (dn != c and dn[3] == 0):
                px[x, y] = shade(c, 0.80)
    return im


def base(who):
    s = sprite(who)
    t = max(0, top_of(s) - 1)
    head = s.crop((0, t, 16, t + 16))
    return light(thin_outline(scale2x(head)))


# ---------------------------------------------------------------- retoques
def touch(im, pts):
    px = im.load()
    for (x, y, c) in pts:
        px[x, y] = c


def find(im, color, region=None):
    x0, y0, x1, y1 = region or (0, 0, im.width, im.height)
    return [(x, y) for y in range(y0, y1) for x in range(x0, x1) if im.getpixel((x, y))[:3] == color]


WHITE = (240, 236, 226, 255)
GLINT = (255, 255, 255, 255)


def juan(im):
    # ojos: el pixel de arriba-izquierda de cada ojo lleva brillo
    eyes = find(im, (0x1c, 0x14, 0x20), (6, 12, 26, 22))
    seen = set()
    for (x, y) in sorted(eyes):
        key = (x // 6)
        if key in seen:
            continue
        seen.add(key)
        touch(im, [(x + 1, y, WHITE)])
    return im


def favalli(im):
    # cristales de los anteojos: brillo en diagonal arriba a la izquierda de cada uno
    lens = find(im, (0xa9, 0xc4, 0xcf), (4, 14, 28, 24))
    seen = set()
    for (x, y) in sorted(lens, key=lambda p: (p[1], p[0])):
        key = (x // 8)
        if key in seen:
            continue
        seen.add(key)
        touch(im, [(x, y, GLINT), (x + 1, y + 1, (0xee, 0xf8, 0xfb, 255))])
    return im


CAST = {'juan': juan, 'favalli': favalli}


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    font = ImageFont.truetype('/usr/share/fonts/noto/NotoSans-Regular.ttf', 26)
    BG = (20, 16, 22, 255)
    ref = Image.open(os.path.join(ROOT, 'art', 'sprites', 'portraits_dlg', 'juan_suit.png')).convert('RGBA')
    cols = [('referencia: juan_suit', ref)]
    rows = []
    for who, fn in CAST.items():
        im = fn(base(who))
        im.save(os.path.join(OUT, f'p32_{who}.png'))
        x2 = im.resize((64, 64), Image.NEAREST)
        x2.save(os.path.join(OUT, f'p32_{who}_x2.png'))
        old = Image.open(os.path.join(ROOT, 'art', 'sprites', 'portraits_dlg', f'{who}.png')).convert('RGBA')
        rows.append((who, old, x2))
    K = 5
    cw = 64 * K + 30
    lam = Image.new('RGB', (cw * 3 + 30, len(rows) * (64 * K + 60) + 20), (27, 22, 30))
    d = ImageDraw.Draw(lam)
    for r, (who, old, new) in enumerate(rows):
        y0 = 10 + r * (64 * K + 60)
        for i, (lbl, im) in enumerate(((f'{who} · hoy', old), (f'{who} · rework', new), ('referencia: juan_suit', ref))):
            bg = Image.new('RGBA', (64, 64), BG)
            bg.alpha_composite(im)
            lam.paste(bg.resize((64 * K, 64 * K), Image.NEAREST).convert('RGB'), (20 + i * cw, y0 + 40))
            d.text((20 + i * cw, y0 + 4), lbl, font=font, fill=(238, 228, 210))
    lam.save(os.path.join(OUT, 'p32_lamina.png'))
    print('ok')


# ====================================================================== v2
# Pedido del usuario: "esto no estaba mal (la v1 automática), un poco más pequeña
# y con hombros como en el traje".
#   - Cabeza: Scale2x + luz, y después se sacan columnas/filas DUPLICADAS en zonas
#     lisas (nunca las que tocan ojos, boca o anteojos) -> cabeza ~24 de alto.
#   - Hombros: el cuerpo del sprite (4 filas bajo el mentón) a x2, a todo el ancho,
#     en las últimas 8 filas, como el cuello/hombros de juan_suit.

PROTECT = {
    (0x1c, 0x14, 0x20), (0xa9, 0xc4, 0xcf), (0xee, 0xf8, 0xfb), (0x8a, 0x48, 0x48),
    (0x1a, 0x16, 0x22), (0x17, 0x12, 0x16), (0xa8, 0x50, 0x5a), (0xb8, 0x5a, 0x5e),
    (0xf0, 0xec, 0xe2), (0xff, 0xff, 0xff),
}


def _col_ok(im, x):
    return not any(im.getpixel((x, y))[:3] in PROTECT and im.getpixel((x, y))[3] for y in range(im.height))


SKIN_C = {(0xe2, 0xab, 0x8c), (0xf4, 0xca, 0xa8), (0xbb, 0x7f, 0x68)}


def _brow_row(im, y):
    """Fila con un trazo oscuro que tiene piel justo abajo (cejas)."""
    if y < 0 or y + 1 >= im.height:
        return False
    hits = 0
    for x in range(im.width):
        c, below = im.getpixel((x, y)), im.getpixel((x, y + 1))
        if c[3] and lum(c) < 90 and below[:3] in SKIN_C:
            hits += 1
    return hits >= 4


def _row_ok(im, y):
    if _brow_row(im, y) or _brow_row(im, y - 1):
        return False
    return not any(im.getpixel((x, y))[:3] in PROTECT and im.getpixel((x, y))[3] for x in range(im.width))


def carve(im, ncols, nrows):
    """Saca ncols columnas y nrows filas que repiten a su vecina (y no tocan rasgos)."""
    for _ in range(ncols):
        w, h = im.size
        best, bx = -1, None
        for x in range(2, w - 2):
            if not _col_ok(im, x):
                continue
            same = sum(im.getpixel((x, y)) == im.getpixel((x + 1, y)) for y in range(h))
            # repartir los cortes: preferir columnas lejos del centro de los ojos
            if same > best:
                best, bx = same, x
        if bx is None:
            break
        im = Image.merge('RGBA', [Image.new('L', (w - 1, h))] * 4) if False else _drop_col(im, bx)
    for _ in range(nrows):
        w, h = im.size
        best, by = -1, None
        for y in range(2, h - 2):
            if not _row_ok(im, y):
                continue
            same = sum(im.getpixel((x, y)) == im.getpixel((x, y + 1)) for x in range(w))
            if same > best:
                best, by = same, y
        if by is None:
            break
        im = _drop_row(im, by)
    return im


def _drop_col(im, x):
    w, h = im.size
    out = Image.new('RGBA', (w - 1, h), CLEAR)
    out.paste(im.crop((0, 0, x, h)), (0, 0))
    out.paste(im.crop((x + 1, 0, w, h)), (x, 0))
    return out


def _drop_row(im, y):
    w, h = im.size
    out = Image.new('RGBA', (w, h - 1), CLEAR)
    out.paste(im.crop((0, 0, w, y)), (0, 0))
    out.paste(im.crop((0, y + 1, w, h)), (0, y))
    return out


def chin_of(s, t):
    """Última fila de la cabeza: la fila anterior a donde el cuerpo se ensancha de nuevo."""
    widths = []
    for y in range(t, t + 22):
        xs = [x for x in range(16) if s.getpixel((x, y))[3]]
        widths.append((y, (max(xs) - min(xs) + 1) if xs else 0))
    # el mentón es el ancho mínimo después de la mitad de la cabeza
    cand = [(w, y) for (y, w) in widths[6:] if w]
    return min(cand)[1]


# fila del mentón (última fila de cabeza) en cada sprite, mirada en los volcados
CHIN = {'juan': 15, 'favalli': 15, 'lucas': 15, 'polsky': 15, 'polsky_coat': 13,
        'elena': 15, 'martita': 17}


EYE = (0x1c, 0x14, 0x20)
MOUTH = (0x8a, 0x48, 0x48)
HAIR_HL = {'juan': (0x7e, 0x5a, 0x40), 'favalli': (0x4c, 0x3e, 0x44), 'lucas': (0x6e, 0x66, 0x58),
           'polsky': (0xf4, 0xf2, 0xec), 'polsky_coat': (0xf4, 0xf2, 0xec), 'elena': (0xf2, 0xd6, 0x98),
           'martita': (0xf6, 0xe6, 0xb4)}


def details(im, who):
    """Aprovecha la definición extra, sin cargar: 1 brillo por ojo, 3 mechones,
    luz en la nariz, labio de abajo un tono más claro."""
    px = im.load()
    w, h = im.size
    eyes = [(x, y) for y in range(h) for x in range(w) if px[x, y][:3] == EYE]
    done = set()
    for (x, y) in sorted(eyes, key=lambda p: (p[1], p[0])):
        side = x < w // 2
        if side in done:
            continue
        done.add(side)
        px[x, y] = (0xf0, 0xec, 0xe2, 255)          # brillo arriba-izquierda del ojo
    hl = HAIR_HL.get(who)
    if hl:
        top = next((y for y in range(h) if any(px[x, y][3] for x in range(w))), 0)
        for x in range(w // 2 - 6, w // 2 + 7, 5):    # 3 mechones con luz en la segunda fila del pelo
            y = top + 2
            if 0 <= x < w and px[x, y][3] and lum(px[x, y]) < 200:
                px[x, y] = hl + (255,)
    mouth = [(x, y) for y in range(h) for x in range(w) if px[x, y][:3] == MOUTH]
    if mouth:
        ybot = max(y for _, y in mouth)
        for (x, y) in mouth:
            if y == ybot:
                px[x, y] = (0xa8, 0x5c, 0x56, 255)       # labio de abajo
    return im


def portrait_v2(who, head_rows=24, cut_cols=4):
    s = sprite(who)
    t = top_of(s)
    chin = CHIN[who]
    head = s.crop((0, t, 16, chin + 1))
    hd = thin_outline(scale2x(head))     # sin paso de luz: queda el sombreado del sprite
    bb = hd.getbbox()
    hd = hd.crop((bb[0], 0, bb[2], hd.height))
    hd = carve(hd, cut_cols, max(0, hd.height - head_rows))
    body = s.crop((0, chin + 1, 16, chin + 5))
    bd = thin_outline(scale2x(body))
    hd = details(hd, who)
    out = Image.new('RGBA', (32, 32), CLEAR)
    top = 32 - bd.height - hd.height
    out.alpha_composite(bd, (0, 32 - bd.height))
    out.alpha_composite(hd, ((32 - hd.width) // 2, max(0, top)))
    return out


if __name__ == '__main__' and os.environ.get('V2'):
    BG = (20, 16, 22, 255)
    ref = Image.open(os.path.join(ROOT, 'art', 'sprites', 'portraits_dlg', 'juan_suit.png')).convert('RGBA')
    font = ImageFont.truetype('/usr/share/fonts/noto/NotoSans-Regular.ttf', 26)
    names = os.environ['V2'].split(',')
    K = 5
    cw = 64 * K + 30
    lam = Image.new('RGB', (cw * (len(names) + 1) + 30, 64 * K + 70), (27, 22, 30))
    d = ImageDraw.Draw(lam)
    for i, who in enumerate(names + ['juan_suit']):
        if who == 'juan_suit':
            x2 = ref
        else:
            im = portrait_v2(who)
            fn = CAST.get(who)
            if fn:
                im = fn(im)
            im.save(os.path.join(OUT, f'p32v2_{who}.png'))
            x2 = im.resize((64, 64), Image.NEAREST)
            x2.save(os.path.join(OUT, f'p32v2_{who}_x2.png'))
        bg = Image.new('RGBA', (64, 64), BG)
        bg.alpha_composite(x2)
        lam.paste(bg.resize((64 * K, 64 * K), Image.NEAREST).convert('RGB'), (20 + i * cw, 50))
        d.text((20 + i * cw, 10), who if who != 'juan_suit' else 'referencia: juan_suit', font=font, fill=(238, 228, 210))
    lam.save(os.path.join(OUT, 'p32v2_lamina.png'))
    print('ok v2')
