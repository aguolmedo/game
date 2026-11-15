"""Juan Salvo, calcado a mano pixel por pixel sobre la vineta de la pag. 033.

Cada coordenada sale de la grilla de 64x64 puesta sobre el primer plano del
comic. Estilo de historieta coloreada: trazo de tinta (K), color plano, un
tono de sombra. Nada de conversion automatica.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')
sys.path.insert(0, os.path.join(ROOT, 'tools', 'art'))
from pixel import Pix, hx  # noqa: E402

PAL = {
    'K': '#20161e',                                   # tinta
    'H': '#b89670', 'h': '#7a5a3e', 'L': '#dcc09a',   # pelo claro, como en el comic
    'S': '#ecb894', 's': '#c4806a', 'l': '#f8d8b8',   # piel
    'W': '#f2ece4', 'I': '#4a5260',                   # ojos
    'm': '#b06a5c',                                   # labio
    'T': '#2a2c3a', 't': '#454a5c',                   # polera
    'J': '#e2dac4', 'j': '#a49c84',                   # campera
}
P = {k: hx(v) for k, v in PAL.items()}
N = 64
img = Pix(N, N)


def px(x, y, k):
    img.set(x, y, P[k])


def run(y, x0, x1, k):
    for x in range(x0, x1 + 1):
        px(x, y, k)


def seg(pts, k):
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        n = max(abs(x1 - x0), abs(y1 - y0), 1)
        for i in range(n + 1):
            px(round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n), k)


# ---------------------------------------------------------------- 1. pelo (masa)
HAIR_X = {0: (7, 52), 1: (6, 53), 2: (5, 54), 3: (5, 55), 4: (4, 55)}
for y in range(0, 27):
    xl, xr = HAIR_X.get(y, (4 if y < 14 else 5, 56 if y < 18 else 55))
    run(y, xl, xr, 'H')

# ---------------------------------------------------------------- 2. cara (piel) bajo la linea del pelo
def hairline(x):
    if x <= 9:
        return 99
    if x <= 20:
        return 17
    if x <= 30:
        return 13
    if x <= 42:
        return 12
    if x <= 48:
        return 14
    return 99


FACE_X = {}
for y in range(12, 61):
    if y <= 30:
        FACE_X[y] = (9, 49)
    elif y <= 40:
        FACE_X[y] = (9, 48)
    elif y <= 46:
        FACE_X[y] = (10, 47)
    elif y <= 50:
        FACE_X[y] = (12, 45)
    elif y <= 54:
        FACE_X[y] = (14, 42)
    elif y <= 57:
        FACE_X[y] = (16, 38)
    else:
        FACE_X[y] = (19, 34)
for y, (xl, xr) in FACE_X.items():
    for x in range(xl, xr + 1):
        if y >= hairline(x):
            px(x, y, 'S')

# ---------------------------------------------------------------- 3. oreja, cuello, ropa
EAR = {25: (50, 52), 26: (49, 54), 27: (49, 54), 28: (49, 54)}
for y in range(29, 41):
    EAR[y] = (49, 56)
for y in range(41, 45):
    EAR[y] = (49, 55)
EAR[45] = (50, 53); EAR[46] = (50, 53)
for y, (a, b) in EAR.items():
    run(y, a, b, 'S')
for y in range(47, 59):                                      # cuello en sombra
    run(y, 36 if y > 52 else 44, 50, 's')
for y in range(47, 51):                                      # cuello de la polera (arriba a la derecha)
    run(y, 50, 63, 'T')
for y in range(51, 57):
    run(y, 44, 63, 'T')
for y in range(57, 64):
    run(y, 22, 63, 'T')
run(47, 50, 63, 't'); run(57, 22, 40, 't')                    # borde del cuello alto
seg([(52, 52), (63, 50)], 't'); seg([(30, 60), (44, 58)], 't')
for y in range(54, 64):                                      # campera clara (izquierda)
    run(y, 0, min(21, 4 + (y - 54) * 2), 'J')
seg([(0, 58), (8, 63)], 'j'); seg([(4, 54), (21, 63)], 'K')

# ---------------------------------------------------------------- 4. sombras de la cara
for y in range(26, 47):                                      # costado izquierdo (borde sombreado)
    run(y, 9, 11 if y < 40 else 12, 's')
for y in range(30, 47):                                      # mejilla derecha hacia la oreja
    run(y, 43, 48 if y < 41 else 47, 's')
for y in range(24, 30):                                      # bajo el pelo a la derecha
    run(y, 45, 49, 's')
run(55, 22, 30, 's'); run(56, 21, 31, 's')                    # bajo el labio / menton
run(33, 12, 19, 's'); run(33, 27, 35, 's')                    # ojeras
for y in range(36, 41):
    run(y, 24, 26, 's')                                       # lado derecho de la nariz
for y in range(33, 40):
    px(22, y, 'l'); px(23, y, 'l')                            # dorso de la nariz con luz
for y, a, b in ((14, 26, 34), (15, 23, 36), (16, 22, 37), (17, 23, 35), (18, 25, 32)):
    run(y, a, b, 'l')                                         # frente con luz, siguiendo la forma

# ---------------------------------------------------------------- 5. pelo: mechones peinados para atras
for a, b in (((10, 16), (16, 6)), ((13, 15), (22, 4)), ((17, 14), (27, 3)), ((22, 12), (32, 2)),
             ((27, 11), (37, 2)), ((33, 10), (42, 3)), ((38, 10), (47, 4)), ((43, 12), (51, 6)),
             ((47, 14), (54, 9))):
    seg([a, b], 'h')
for a, b in (((12, 13), (18, 5)), ((19, 11), (26, 4)), ((29, 9), (35, 3)), ((40, 8), (45, 4))):
    seg([a, b], 'L')
for a, b in (((15, 15), (24, 3)), ((30, 10), (40, 2)), ((45, 12), (53, 7))):
    seg([a, b], 'K')
for y in range(14, 31):                                      # costado del pelo en sombra
    run(y, 5, 8, 'h')
for y in range(15, 26):
    run(y, 50, 55, 'h')

# ---------------------------------------------------------------- 6. tinta: contornos
seg([(4, 4), (4, 14), (5, 15), (5, 24), (6, 26)], 'K')        # contorno izquierdo del pelo
seg([(55, 1), (55, 4), (56, 5), (56, 24)], 'K')               # contorno derecho del pelo
seg([(8, 26), (8, 36), (9, 37), (9, 42), (10, 43), (10, 46), (11, 47), (11, 48), (12, 49), (13, 50),
     (13, 51), (14, 52), (15, 53), (15, 54), (16, 55), (17, 56), (18, 57), (19, 58), (20, 59), (24, 59),
     (25, 60), (33, 60), (34, 59), (35, 59), (36, 58), (37, 57), (38, 56), (39, 56), (40, 55), (41, 54),
     (42, 53), (43, 52), (44, 51), (45, 50), (46, 49), (47, 48), (47, 47), (48, 46), (48, 42)], 'K')   # cara y mandibula
# oreja
seg([(49, 26), (49, 44)], 'K'); seg([(50, 25), (52, 25), (53, 26), (54, 26), (55, 27), (55, 28), (56, 29), (56, 40),
     (55, 41), (55, 43), (54, 44), (53, 45), (52, 46), (50, 46)], 'K')
seg([(52, 30), (53, 33), (53, 37), (52, 40), (51, 43)], 'K')
run(44, 51, 53, 'K'); run(45, 51, 52, 'K')

# ---------------------------------------------------------------- 7. arrugas, cejas, ojos
run(20, 13, 26, 's'); run(21, 31, 44, 's'); run(23, 15, 24, 's'); run(23, 33, 42, 's')
run(24, 12, 20, 'K'); run(25, 10, 21, 'K'); run(26, 9, 14, 'K')                       # ceja izquierda
run(23, 30, 37, 'K'); run(24, 26, 38, 'K'); run(25, 24, 31, 'K')                      # ceja derecha
# ojo izquierdo
run(28, 11, 20, 'K')
px(10, 29, 'K'); run(29, 11, 13, 'W'); run(29, 14, 16, 'I'); run(29, 17, 19, 'W'); px(20, 29, 'K')
px(11, 30, 'K'); run(30, 12, 13, 'W'); run(30, 14, 16, 'I'); run(30, 17, 18, 'W'); px(19, 30, 'K')
px(14, 29, 'W'); px(15, 30, 'K')
run(31, 12, 19, 's')
# ojo derecho
run(28, 26, 36, 'K')
px(25, 29, 'K'); run(29, 26, 28, 'W'); run(29, 29, 31, 'I'); run(29, 32, 35, 'W'); px(36, 29, 'K')
px(26, 30, 'K'); run(30, 27, 28, 'W'); run(30, 29, 31, 'I'); run(30, 32, 34, 'W'); px(35, 30, 'K')
px(29, 29, 'W'); px(30, 30, 'K')
run(31, 27, 35, 's')

# ---------------------------------------------------------------- 8. nariz (la sombra negra de abajo, como en el comic)
seg([(21, 31), (20, 36), (19, 37), (18, 40)], 'K')
run(41, 17, 19, 'K'); run(41, 25, 26, 'K')
run(42, 16, 22, 'K'); run(42, 24, 27, 'K')
run(43, 17, 26, 'K')
run(44, 19, 24, 'K')
px(23, 42, 's')
# surcos nasogenianos
seg([(28, 41), (30, 43), (31, 45), (32, 47)], 's'); seg([(14, 44), (13, 46)], 's')

# ---------------------------------------------------------------- 9. boca
run(47, 16, 30, 's')
run(48, 14, 31, 'K'); px(14, 49, 'K'); px(15, 49, 'K')
run(49, 17, 29, 'm')
run(50, 18, 28, 'l')
run(51, 19, 27, 's')

# rayado de la mejilla derecha y barba de un dia (como el comic)
for k in range(5):
    seg([(36 + k * 2, 44), (39 + k * 2, 35)], 's')
for (x, y) in ((18, 53), (21, 54), (24, 53), (27, 54), (30, 53), (20, 56), (26, 57), (31, 56), (34, 52), (16, 51)):
    px(x, y, 's')
# mas mechones finos en el pelo
for a, b in (((8, 20), (12, 9)), ((24, 12), (29, 5)), ((35, 10), (39, 4)), ((48, 16), (53, 12))):
    seg([a, b], 'h')

img.outline(0.6, 0.3)

if __name__ == '__main__':
    from PIL import Image
    out = os.path.join(HERE, 'out')
    img.img.save(os.path.join(out, 'calco_juan.png'))
    ref = Image.open(os.path.join(ROOT, 'ref', 'comic', 'p033.jpg')).crop((805, 295, 1005, 495)).convert('RGBA').resize((384, 384))
    o = Image.new('RGBA', (384 * 2 + 30, 404), (34, 30, 52, 255))
    o.alpha_composite(ref, (10, 10)); o.alpha_composite(img.img.resize((384, 384), Image.NEAREST), (404, 10))
    o.save(os.path.join(out, 'calco_juan_compare.png'))
    print('ok')
