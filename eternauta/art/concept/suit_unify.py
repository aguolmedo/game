"""PI-3: Juan con traje unificado al retrato juan_suit 64x64 (concepto, no toca el juego).
PI-2: retratos de diálogo = cabezas de los sprites (maqueta).

Reglas PI-3 (bajadas del retrato, que está hecho a 2x = diseño de 32x32):
  - Visera: se ve la CARA de Juan adentro (piel en sombra, cejas, ojos, nariz),
    no un vidrio azul marino. Marco gris-azulado con brillo arriba a la izquierda.
  - Capucha: costura central punteada y parche cuadrado arriba a la izquierda.
  - Filtro de lata abajo a la derecha (ya estaba).
  - La silueta NO cambia: solo se recolorea el interior, así el cuerpo y la
    animación siguen encajando. Como la cabeza solo se desplaza entre cuadros,
    el cambio se aplica a todos los cuadros por desplazamiento.

Salida: out/suit_unify_*.png / .gif  (hoja candidata: out/suit_unify_chars2_juan_suit*.png)
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
DIRS = D['dirs']
IDLE = D['idle'][0]

# paleta del retrato juan_suit
C = {
    'f': (120, 103, 97),   # piel en sombra (dentro de la visera)
    'g': (103, 84, 81),    # piel, más sombra
    'n': (128, 117, 110),  # puente de la nariz
    'r': (45, 44, 48),     # cejas
    'e': (31, 35, 48),     # ojo
    'w': (129, 134, 138),  # brillo del ojo
    'a': (142, 134, 110),  # parche (borde)
    'b': (188, 180, 160),  # parche (centro)
    'J': (111, 108, 102),  # costura
    'P': (138, 148, 160),  # marco de la visera, luz
    'Q': (62, 67, 76),     # marco, sombra
    'T': (38, 42, 50),     # marco, sombra profunda
    'U': (200, 220, 230),  # brillo del vidrio
}

# Frente: COPIA a mano del retrato (diseño 32x32 -> cabeza 16 px), filas 2..15.
# '.' = transparente. Reemplaza toda la cabeza.
C.update({
    'o': (49, 46, 51), 'O': (92, 88, 92),            # contorno
    'H': (236, 232, 220), 'L': (207, 201, 184), 'I': (161, 156, 142),
    'Y': (164, 172, 182), 'Z': (74, 78, 86), 'K': (44, 47, 54), 'k': (140, 132, 120),
})
HEAD16 = {
    2:  '....ooOOOOoo....',
    3:  '..oIILLLJHHHHOo.',
    4:  '.oIaaaLLLHHHHHo.',
    5:  '.oIabaLLJLLLHHo.',
    6:  '.oIaaaLLLLLLLHo.',
    7:  '.oILLLLLJLLLLHo.',
    8:  '.oLPQTTTTTTQPIo.',
    9:  '.oPUrrffrrrgQPo.',
    10: '.oPfewfnfewgQIo.',
    11: '.oQgfffnffggTIo.',
    12: '.oLIQTTTTTTQILo.',
    13: '.oLLLLLkYYYYYZo.',
    14: '.oILLLLLZZZZZKo.',
    15: '..oIILLLKKKKKo..',
}
# (versión anterior, recoloreo parcial; se deja de usar)
FRONT = {
    3: '--------J-------',
    4: '----aaa---------',
    5: '----aba-J-------',
    6: '----aaa---------',
    7: '---PPPPPQQQQ----',
    8: '---PUrrffrrgT---',
    9: '---Pfewfnfewg---',
    10: '---Pffffnfggg---',
    11: '---QgffggfggT---',
    12: '----QQQTTTT-----',
}
# Espalda: costura punteada (filas 3..13, x8)
BACK_SEAM = [(8, y) for y in range(3, 14, 2)]
# Perfiles: el vidrio azul se vuelve cara
SIDE_MAP = {(34, 48, 62): C['f'], (38, 42, 50): C['g'], (200, 220, 230): C['e']}


def cell(block, d, col, sheet=SHEET):
    b = D['blocks'][block]
    r = DIRS.index(d)
    return sheet.crop((b['x'] + col * CW, b['y'] + r * CH, b['x'] + (col + 1) * CW, b['y'] + (r + 1) * CH))


def new_head(old, d):
    """old: cuadro de reposo 16x32 -> cuadro de reposo con la cabeza nueva."""
    im = old.copy()
    px = im.load()
    if d == 'down':
        for y, row in HEAD16.items():
            for x, ch in enumerate(row):
                px[x, y] = (0, 0, 0, 0) if ch == '.' else C[ch] + (255,)
    elif d == 'up':
        for (x, y) in BACK_SEAM:
            if px[x, y][3]:
                px[x, y] = C['J'] + (255,)
    else:
        for y in range(2, 13):
            for x in range(16):
                p = px[x, y]
                if p[3] and p[:3] in SIDE_MAP:
                    px[x, y] = SIDE_MAP[p[:3]] + (255,)
        # ceja: el pixel de arriba del ojo
        for y in range(2, 13):
            for x in range(16):
                if px[x, y][:3] == C['e'] and y > 2 and px[x, y - 1][:3] in (C['f'], C['g']):
                    px[x, y - 1] = C['r'] + (255,)
    return im


def best_offset(frame, ref):
    """Desplazamiento (dx, dy) de la cabeza de reposo dentro de este cuadro."""
    best, arg = None, (0, 0)
    for dy in range(-3, 4):
        for dx in range(-2, 3):
            s = 0
            for y in range(2, 16):
                for x in range(16):
                    X, Y = x + dx, y + dy
                    if not (0 <= X < 16 and 0 <= Y < 32):
                        continue
                    if ref.getpixel((x, y)) != frame.getpixel((X, Y)):
                        s += 1
            if best is None or s < best:
                best, arg = s, (dx, dy)
    return arg


def apply(frame, old_idle, new_idle):
    dx, dy = best_offset(frame, old_idle)
    out = frame.copy()
    px = out.load()
    for y in range(2, 16):
        for x in range(16):
            X, Y = x + dx, y + dy
            if not (0 <= X < 16 and 0 <= Y < 32):
                continue
            o, n = old_idle.getpixel((x, y)), new_idle.getpixel((x, y))
            if o != n and frame.getpixel((X, Y)) == o:
                px[X, Y] = n
    return out


def rebuild(block):
    cols = D['cols']
    b = D['blocks'][block]
    out = SHEET.crop((b['x'], b['y'], b['x'] + cols * CW, b['y'] + len(DIRS) * CH))
    for d in DIRS:
        old_idle = cell(block, d, IDLE)
        new_idle = new_head(old_idle, d)
        r = DIRS.index(d)
        for col in range(cols):
            fr = apply(cell(block, d, col), old_idle, new_idle)
            out.paste(fr, (col * CW, r * CH))
    return out


def up(im, k):
    return im.resize((im.width * k, im.height * k), Image.NEAREST)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    font = ImageFont.truetype('/usr/share/fonts/noto/NotoSans-Regular.ttf', 26)
    sheets = {blk: rebuild(blk) for blk in ('juan_suit', 'juan_suit_rifle')}
    for blk, sh in sheets.items():
        sh.save(os.path.join(OUT, f'suit_unify_chars2_{blk}.png'))

    # lámina: antes (fila de arriba) / después, 4 direcciones, + el retrato de referencia
    portrait = Image.open(os.path.join(ROOT, 'art', 'sprites', 'portraits_dlg', 'juan_suit.png')).convert('RGBA')
    K = 10
    lam = Image.new('RGB', (4 * 18 * K + 64 * 5 + 80, 2 * 34 * K + 70), (27, 22, 30))
    dr = ImageDraw.Draw(lam)
    for row, (lbl, src) in enumerate((('hoy', None), ('unificado', sheets['juan_suit']))):
        for i, d in enumerate(DIRS):
            if src is None:
                c = cell('juan_suit', d, IDLE)
            else:
                c = src.crop((IDLE * CW, i * CH, (IDLE + 1) * CW, (i + 1) * CH))
            bg = Image.new('RGBA', (18, 34), (70, 84, 72, 255))
            bg.alpha_composite(c, (1, 1))
            lam.paste(up(bg, K).convert('RGB'), (20 + i * 18 * K, 50 + row * 34 * K))
        dr.text((20, 10 + row * 34 * K + (0 if row == 0 else 10)), lbl, font=font, fill=(238, 228, 210))
    lam.paste(up(portrait, 5).convert('RGB'), (4 * 18 * K + 50, 50))
    dr.text((4 * 18 * K + 50, 10), 'referencia: retrato juan_suit', font=font, fill=(238, 228, 210))
    lam.save(os.path.join(OUT, 'suit_unify_lamina.png'))

    # caminata unificada (gif, 4 direcciones)
    frames = []
    for col in D['walk']:
        f = Image.new('RGB', (4 * 20, 34), (70, 84, 72))
        for i in range(4):
            c = sheets['juan_suit'].crop((col * CW, i * CH, (col + 1) * CW, (i + 1) * CH))
            f.paste(c, (2 + i * 20, 1), c)
        frames.append(up(f, 10))
    frames[0].save(os.path.join(OUT, 'suit_unify_caminata.gif'), save_all=True,
                   append_images=frames[1:], duration=D['times'], loop=0)

    # PI-2: retratos = cabezas de sprite. Dos encuadres para elegir:
    #   A) cabeza 16x16 a x4 = 64x64 (llena el recuadro)
    #   B) cabeza y hombros 16x21 a x3 = 48x63, centrado en el recuadro de 64
    def top_of(c):
        for y in range(CH):
            if any(c.getpixel((x, y))[3] for x in range(CW)):
                return y
        return 0

    def head_of(who):
        src = sheets.get(who)
        return src.crop((IDLE * CW, 0, (IDLE + 1) * CW, CH)) if src else cell(who, 'down', IDLE)

    BOX = (42, 34, 54, 255)
    rows = []
    for lbl, h, k in (('A · cabeza ×4', 16, 4), ('B · cabeza y hombros ×3', 21, 3)):
        row = []
        for who in D['ids']:
            c = head_of(who)
            t = max(0, top_of(c) - 1)
            crop = c.crop((0, t, 16, t + h))
            box = Image.new('RGBA', (64, 64), BOX)
            big = up(crop, k)
            box.alpha_composite(big, ((64 - big.width) // 2, 64 - big.height if k == 3 else 0))
            row.append((who, box))
        rows.append((lbl, row))
    S3 = 3
    cw = 64 * S3 + 20
    lam2 = Image.new('RGB', (len(D['ids']) * cw + 20, len(rows) * (64 * S3 + 90) + 10), (27, 22, 30))
    dr2 = ImageDraw.Draw(lam2)
    for r, (lbl, row) in enumerate(rows):
        y0 = 10 + r * (64 * S3 + 90)
        dr2.text((20, y0), lbl, font=font, fill=(238, 228, 210))
        for i, (who, bx) in enumerate(row):
            lam2.paste(up(bx, S3).convert('RGB'), (20 + i * cw, y0 + 40))
            dr2.text((20 + i * cw, y0 + 40 + 64 * S3 + 4), who, font=font, fill=(160, 150, 140))
    lam2.save(os.path.join(OUT, 'pi2_retratos_cabezas.png'))
    print('ok')
