"""chars2: 9 personajes x 4 direcciones x (6 caminata + 2 reposo).

Generaliza la tecnica de art/concept/walk.py (cabeza fija que solo se
desplaza, BOB, piernas en tijera, brazos opuestos, tiempos desparejos) a
todos los personajes, usando las grillas y paletas de characters.py.
Celdas 16x32; filas down, up, left, right; columnas 0-5 caminata, 6-7 reposo.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.join(ROOT, 'art', 'concept'))
sys.path.insert(0, HERE)

from pixel import Pix, hx, shade  # noqa: E402
import characters as ch    # noqa: E402
import suit                # noqa: E402
import walk                # noqa: E402

W, H = 16, 32
BOB = walk.BOB
TIMES = list(walk.TIMES)
IDS = ['juan', 'juan_suit', 'juan_suit_rifle', 'favalli', 'lucas', 'polsky',
       'elena', 'martita', 'polsky_coat']
DIRS = ['down', 'up', 'left', 'right']
WOMEN = ('elena', 'martita')
SUITS = ('juan_suit', 'juan_suit_rifle')

# abrigo oscuro de Polsky (recoloreo de su saco, sin tocar art/concept)
COAT = {'T': '#2e2e3a', 't': '#1c1c26', 'u': '#4a4a5c'}

# perfil y espalda chicos de Martita (11 filas, se dibujan desde y=7)
MARTITA_SIDE = [
    "................",
    "....HHHHHH......",
    "...HHHHHHHHH....",
    "...HHHHHHHHHSS..",
    "...HHHHHHHSSSSS.",
    "...IHHHHHSSSbS..",
    "...IHHHHsSSSeS..",
    "...IHHHHssSSSS..",
    "....IHHsSSSSSs..",
    ".....ssSSSSSs...",
    "......ssssss....",
]
MARTITA_BACK = [
    "................",
    "....JJHHHH......",
    "...JHHHHHHHH....",
    "..JHHHHHHHHHI...",
    "..HHHHHHHHHHI...",
    "..HHHJHHJHHHI...",
    "..IHHHHHHHHHI...",
    "..IHHHHHHHHII...",
    "..sIHHHHHHIIs...",
    "...sSSSSSSs.....",
    "....ssssss......",
]


def palette(name):
    if name == 'juan_suit_rifle':
        return ch.palette('juan_suit')
    if name == 'polsky_coat':
        p = ch.palette('polsky')
        p.update({k: hx(v) for k, v in COAT.items()})
        return p
    return ch.palette(name)


def grid(name):
    return ch.GRIDS['polsky' if name == 'polsky_coat' else name]


def blit(p, rows, x0, y0, pal):
    for j, row in enumerate(rows):
        for i, c in enumerate(row):
            if c == '.':
                continue
            col = pal.get(c)
            if col:
                p.set(x0 + i, y0 + j, col)


# ------------------------------------------------------------ piernas
# El pie que da el paso baja entero; el otro sube 2 px y se abre 1 px, con la
# punta apuntando al piso (talon levantado). Los dos extremos duran 2 cuadros.
LIFT_L = (0, 0, 1, 2, 2, 1)
LIFT_R = (2, 2, 1, 0, 0, 1)


def legs_front(p, pal, k, bob, neutral=False):
    hip = 25 + bob
    lift = (0, 0) if neutral else (LIFT_L[k], LIFT_R[k])
    for side, (x0, lf) in enumerate(((4, lift[0]), (9, lift[1]))):
        x = x0 + ((-1 if side == 0 else 1) if lf else 0)   # el pie que sube se abre
        foot = 29 - lf
        for y in range(hip, foot + 1):           # pierna recta desde la cadera
            p.set(x, y, pal['P'])
            p.set(x + 1, y, pal['P'])
            p.set(x + 2, y, pal['p'])
        p.hline(x - 1, x + 2, foot + 1, pal['B'])
        p.hline(x - 1, x + 2, foot + 2, pal['b'])
    p.hline(4, 11, hip, pal['P'])


# x del pie en cada cuadro (mira a la derecha): la pierna apoyada retrocede de
# a poco, la que vuela vuelve adelante. Los apoyos son los cuadros 0-2 y 3-5.
SIDE_NEAR = (10, 9, 8, 3, 5, 6)
SIDE_FAR = (3, 4, 6, 10, 9, 7)
SKIRT_NEAR = (9, 9, 8, 5, 5, 6)      # pollera: medio paso
SKIRT_FAR = (5, 5, 6, 9, 9, 8)


def side_pose(k):
    """(x cercana, x lejana, levantada cercana, levantada lejana)."""
    if k is None:
        return 7, 7, 0, 0
    return SIDE_NEAR[k], SIDE_FAR[k], 1 if k in (3, 4) else 0, 1 if k in (0, 1) else 0


def legs_side(p, pal, k, bob, neutral=False):
    """Perfil: tijera desde la cadera, pierna lejana un tono mas oscura."""
    hip_x, hip_y = 7, 24 + bob
    near_x, far_x, lf_near, lf_far = side_pose(None if neutral else k)
    for near, (fx, lf) in enumerate(((far_x, lf_far), (near_x, lf_near))):
        foot_y = 29 - lf
        for y in range(hip_y, foot_y + 1):
            t = (y - hip_y) / max(1, foot_y - hip_y)
            x = round(hip_x + (fx - hip_x) * t)
            p.hline(x, x + 1, y, pal['P'] if near else pal['p'])
            p.set(x + 1, y, pal['p'])            # borde en sombra
        shoe = pal['B'] if near else pal['b']
        p.hline(fx - 1, fx + 2, foot_y + 1, shoe)
        p.set(fx + 2, foot_y, shade(shoe, 0.3))     # luz de la bota
        p.hline(fx - 1, fx + (1 if lf else 2), foot_y + 2, pal['b'])


# ------------------------------------------------------------ brazos
# El brazo va al reves que la pierna: cuando un pie adelanta, la mano del otro
# lado baja (viene hacia camara).
def arms_front(p, pal, k, bob, back=False, neutral=False):
    swing = (0, 0) if neutral else [(-1, 2), (0, 2), (0, 0), (2, -1), (2, 0), (0, 0)][k]
    for x, sw, sh in ((2, swing[0], 'u'), (13, swing[1], 't')):
        top = 18 + bob
        end = 22 + bob + sw
        for y in range(top, end + 1):
            p.set(x, y, pal[sh])
        p.set(x, end + 1, pal['s'] if back else pal['S'])
        p.set(x, end + 2, pal['s'])
        p.set(x, end + 3, pal['s'])


def arm_side(p, pal, k, bob, neutral=False):
    """Manga al frente del torso y mano a la cadera; la mano va y viene."""
    sw = 0 if neutral else [-2, -1, 0, 2, 1, 0][k]
    dx = 1 if sw > 0 else 0
    for y in range(17, 23):
        p.hline(9 + dx, 10 + dx, y + bob, pal['t'])
        p.set(8 + dx, y + bob, pal['u'])         # luz del hombro
    p.rect(9 + dx, 23 + bob, 2, 2, pal['S'])     # mano a la altura de la cadera
    p.set(10 + dx, 24 + bob, pal['s'])


# ------------------------------------------------------------ cabezas
def side_head(p, name, pal, y0):
    """Perfil (mira a la derecha) desde walk.HEAD_SIDE, recoloreado."""
    if name == 'martita':
        blit(p, MARTITA_SIDE, 0, 7, pal)
        return
    rows = [list(r) for r in walk.HEAD_SIDE]
    if name == 'lucas':                        # calvicie: corona de piel
        for y in range(1, 8):
            for x in range(3, 12):
                if rows[y][x] in 'HIJ':
                    rows[y][x] = 'h' if x < 7 and y < 4 else ('S' if x < 9 else 's')
    if name == 'polsky':                       # pelo blanco revuelto
        for (x, y, c) in ((4, 0, 'J'), (6, 0, 'H'), (9, 0, 'H'), (3, 1, 'J'),
                          (10, 1, 'I'), (11, 2, 'H'), (2, 2, 'J')):
            rows[y][x] = c
    blit(p, rows, 0, y0, pal)
    S, s, d = pal['S'], pal['s'], pal['d']
    # oreja al centro
    p.set(8, 10 + y0, s); p.set(9, 10 + y0, s)
    p.set(8, 11 + y0, d); p.set(9, 11 + y0, s)
    if name == 'favalli':                      # patilla del anteojo, lente y bigote
        G, g, q = pal['G'], pal['g'], pal['q']
        p.frame(11, 7 + y0, 4, 4, G)
        p.rect(12, 8 + y0, 2, 2, g)
        p.set(12, 9 + y0, pal['e']); p.set(12, 8 + y0, q)
        p.hline(9, 10, 8 + y0, G)
        for x in (12, 13, 14):
            p.set(x, 10 + y0, pal['M'])
        p.set(13, 11 + y0, pal['M'])
    if name == 'polsky':                       # nariz grande
        p.set(14, 9 + y0, S); p.set(14, 10 + y0, s); p.set(15, 10 + y0, s)
    if name == 'elena':                        # mechon que cae al costado
        p.set(3, 14 + y0, pal['H']); p.set(3, 15 + y0, pal['I'])


def back_head(p, name, pal, y0):
    if name == 'martita':
        blit(p, MARTITA_BACK, 0, 7, pal)
        return
    rows = [list(r) for r in walk.HEAD_BACK]
    if name == 'lucas':                        # calvo arriba, pelo a los costados
        for y in range(1, 9):
            for x in range(4, 11):
                if rows[y][x] in 'HIJ':
                    rows[y][x] = 'h' if (x < 8 and y < 4) else ('S' if x < 9 else 's')
        for y in range(7, 12):                 # pelo claro en la nuca y los costados
            rows[y][2] = 'H'; rows[y][3] = 'I'
            rows[y][12] = 'I'; rows[y][13] = 'H'
    if name == 'polsky':                       # revuelto: dos mechones
        rows[0][4] = 'J'; rows[0][7] = 'H'; rows[1][3] = 'J'
        rows[1][10] = 'I'; rows[2][12] = 'H'
    blit(p, rows, 0, y0, pal)


def woman_hair(p, name, pal, back=False):
    """Pelo largo hasta el hombro de Elena, sobre el torso."""
    if name != 'elena':
        return
    H, I, J = pal['H'], pal['I'], pal['J']
    if back:
        for y in range(14, 22):
            x = 3 + (y % 2)
            p.set(x, y, H); p.set(x + 1, y, I)
            p.set(12 - (y % 2), y, H); p.set(11 - (y % 2), y, I)
        for x in range(5, 11):
            p.set(x, 15 + (x % 2), H)
        for (x, y) in ((5, 8), (7, 10), (10, 7), (9, 12), (6, 17), (10, 19)):
            p.set(x, y, J if (x + y) % 2 else I)
    else:
        for y in range(13, 21):
            x = 2 + (y % 2)
            p.set(x, y, H); p.set(x + 1, y, I)
            p.set(x, y - 1, J if y % 3 == 0 else H)


# ------------------------------------------------------------ torso
def torso_side(p, name, pal, y0):
    blit(p, walk.TORSO_SIDE, 3, y0, pal)
    S = 3
    if name in ('lucas', 'polsky', 'polsky_coat'):          # corbata al frente
        for y in range(y0 + 2, y0 + 8):
            p.set(9, y, pal['R'])
        p.set(10, y0 + 2, pal['R'])
    if name == 'favalli':                                   # franjas del sweater
        for yy in (2, 5):
            p.hline(4, 10, y0 + yy, pal['C'])
    if name == 'polsky_coat':                               # cuello levantado
        for x in (3, 4, 9, 10):
            p.set(x, y0 - 1, pal['T'])
        p.hline(3, 10, y0 - 2, pal['t'])


def torso_back(p, name, pal, y0):
    blit(p, walk.TORSO_BACK, 3, y0, pal)
    if name in ('lucas', 'polsky', 'polsky_coat'):
        p.set(8, y0, pal['R']); p.set(8, y0 + 1, pal['R'])
    if name == 'favalli':
        for yy in (2, 5):
            p.hline(3, 12, y0 + yy, pal['C'])
    if name == 'polsky_coat':
        for x in range(3, 13):
            p.set(x, y0 - 1, pal['T'] if x % 2 else pal['t'])


def skirt(p, name, pal, k, y0, side=False):
    """Pollera: se abre 1 px a los lados, ruedo que vaiven, pies alternos."""
    sway = 0 if k is None else [1, 0, -1, -1, 0, 1][k]
    rows = 4 if name == 'martita' else 5
    for j in range(rows):
        y = y0 + j
        wide = 1 if j >= rows - 2 else 0
        x0, x1 = (4 - wide, 11 + wide) if side else (3 - wide, 12 + wide)
        p.hline(x0, x1, y, pal['T'])
        p.set(x0, y, pal['u'])
        p.set(x1, y, pal['t'])
        if j == rows - 1:
            p.set(x0 + 1, y, pal['t'])
    hem_y = y0 + rows
    x0, x1 = (3, 12) if side else (2, 13)
    p.hline(x0 + sway, x1 + sway, hem_y, pal['t'])
    p.hline(x0 + 2 + sway, x1 - 2 + sway, hem_y, pal['u'] if name == 'martita' else pal['T'])
    # pies: uno adelante y otro atras (medio paso), el de atras levanta el talon
    near_x, far_x = (7, 7) if k is None else (SKIRT_NEAR[k], SKIRT_FAR[k])
    for near, fx in ((0, far_x), (1, near_x)):
        lf = 0 if k is None else (1 if (near and k in (3, 4)) or (not near and k in (0, 1)) else 0)
        foot = 29 - lf
        for y in range(hem_y + 1, foot + 1):
            p.set(fx, y, pal['S']); p.set(fx + 1, y, pal['s'])
        p.hline(fx - 1, fx + (2 if near else 1), foot + 1, pal['B'] if near else pal['b'])
        p.hline(fx - 1, fx + (2 if near else 1), foot + 2, pal['b'])


# ------------------------------------------------------------ frentes
def front_frame(name, k=None, bob=None):
    """Frente armada por partes (caminata). k=None => reposo."""
    neutral = k is None
    kk = 0 if neutral else k
    bob = (0 if neutral else BOB[kk]) if bob is None else bob
    pal = palette(name)
    p = Pix(W, H)
    if name in WOMEN:
        rows = grid(name)
        top = 7 if name == 'martita' else 0
        body_y = 18 if name == 'martita' else 17
        dress_end = 26 if name == 'martita' else 27
        feet = rows[dress_end + 1:32]
        lift = (0, 0) if neutral else (LIFT_L[kk] > 0, LIFT_R[kk] > 0)
        for fy in range(len(feet)):
            y = dress_end + 1 + fy
            for x, c in enumerate(feet[fy]):
                if c == '.':
                    continue
                lf = 1 if lift[1 if x > 7 else 0] else 0
                p.set(x, y - lf, pal[c])
        blit(p, rows[body_y:dress_end - 1], 0, body_y + bob, pal)
        hem = rows[dress_end]
        sway = 0 if neutral else [1, 0, -1, -1, 0, 1][kk]
        blit(p, rows[dress_end - 1:dress_end], sway, dress_end - 1 + bob, pal)
        for x, c in enumerate(hem):
            if c != '.':
                p.set(x + sway, dress_end + bob, pal[c])
        blit(p, rows[top:body_y], 0, top + bob, pal)
        p.outline(0.56, 0.22)
        return p
    # hombres
    legs_front(p, pal, kk, bob, neutral)
    blit(p, grid(name)[0:17], 0, bob, pal)
    blit(p, [r[3:13] for r in grid(name)[17:25]], 3, 17 + bob, pal)
    arms_front(p, pal, kk, bob, neutral=neutral)
    if name == 'polsky_coat':
        for x in (2, 3, 12, 13):
            p.set(x, 15 + bob, pal['T'])
        p.hline(2, 3, 16 + bob, pal['t'])
        p.hline(12, 13, 16 + bob, pal['t'])
        for y in range(17, 22):                    # solapas del abrigo
            p.set(4, y + bob, pal['u'])
            p.set(11, y + bob, pal['u'])
    p.outline(0.56, 0.22)
    return p


def back_frame(name, k=None, bob=None):
    neutral = k is None
    kk = 0 if neutral else k
    bob = (0 if neutral else BOB[kk]) if bob is None else bob
    pal = palette(name)
    p = Pix(W, H)
    if name in WOMEN:
        small = name == 'martita'
        y0 = (18 if small else 17) + bob
        back_head(p, name, pal, 7 + bob if small else bob)
        blit(p, walk.TORSO_BACK, 3, y0, pal)
        woman_hair(p, name, pal, back=True)
        skirt(p, name, pal, kk, y0 + (4 if small else 5))
    else:
        legs_front(p, pal, kk, bob, neutral)
        back_head(p, name, pal, bob)
        torso_back(p, name, pal, 17 + bob)
        arms_front(p, pal, kk, bob, back=True, neutral=neutral)
    p.outline(0.56, 0.22)
    return p


def side_frame(name, k=None, bob=None):
    neutral = k is None
    kk = 0 if neutral else k
    bob = (0 if neutral else BOB[kk]) if bob is None else bob
    pal = palette(name)
    p = Pix(W, H)
    if name in WOMEN:
        small = name == 'martita'
        y0 = (18 if small else 17) + bob
        side_head(p, name, pal, 7 + bob if small else bob)
        blit(p, walk.TORSO_SIDE, 3, y0, pal)
        woman_hair(p, name, pal, back=False)
        skirt(p, name, pal, kk, y0 + (4 if small else 5), side=True)
    else:
        legs_side(p, pal, kk, bob, neutral)
        side_head(p, name, pal, bob)
        torso_side(p, name, pal, 17 + bob)
        arm_side(p, pal, kk, bob, neutral=neutral)
    p.outline(0.56, 0.22)
    return p


# ------------------------------------------------------------ el traje
C = suit.C
SKIN_GLASS = hx('#d8b49c')       # los ojos, detras del vidrio
SKIN_GLASS2 = hx('#7a5a4e')      # sombra del menton

# Cabeza del traje: capucha redonda con la visera centrada a la altura de los
# ojos (antes quedaba alta y parecia que miraba para arriba).
HOOD_FRONT = (8, 9.6, 6.4, 6.6)
VISOR_FRONT = (8.0, 10.0, 5.0, 3.3)
HOOD_SIDE = (7.2, 9.2, 5.0, 6.4)
VISOR_SIDE = (9.9, 9.6, 2.6, 3.4)


def suit_hood(p, cx, cy, rx, ry):
    """Capucha del concepto, con la luz de arriba a la izquierda como el cuerpo
    (suit.hood la trae al reves por defecto)."""
    suit.hood(p, cx, cy, rx, ry, light_dx=1)


def suit_eyes(p, cx, cy):
    """Dos ojos de 1 px detras del vidrio y una sombra de menton."""
    ix, iy = round(cx), round(cy)
    for ex in (ix - 2, ix + 1):
        p.set(ex, iy, SKIN_GLASS)
    p.set(ix, iy + 2, SKIN_GLASS2)


def suit_legs_front(p, k, bob, back=False):
    """Piernas del traje de frente/espalda: el pie que da el paso baja entero y
    se abre 1 px; el otro sube 2 px con la punta apuntando al piso."""
    rows = suit.BODY_BACK if back else suit.BODY_FRONT
    legs = rows[12:]
    lift = (0, 0) if k is None else (LIFT_L[k], LIFT_R[k])
    for side, lf in enumerate(lift):
        x0 = 0 if side == 0 else 7
        strip = [r[:7] if side == 0 else r[7:] for r in legs]
        dx = (-1 if side == 0 else 1) if lf else 0      # el pie que sube se abre
        dy = 27 + bob - lf
        suit.blit(p, strip[:4], x0 + dx, dy)           # pantalon, sello y bota
        suit.blit(p, strip[4:], x0 + dx, dy + (1 if lf else 0))   # suela


def suit_legs_side(p, k, bob):
    """Perfil: tijera marcada desde la cadera (el traje es voluminoso), la
    pierna lejana un tono mas oscura y el pie de atras con el talon alto."""
    if k is None:
        poses = ((7, 0), (7, 0))
    else:
        poses = ((SIDE_FAR[k], 1 if k in (0, 1) else 0),
                 (SIDE_NEAR[k], 1 if k in (3, 4) else 0))
    for near, (fx, lf) in enumerate(poses):
        hip_x, hip_y = 7, 24 + bob
        foot_y = 29 - lf
        fill = C['F'] if near else C['f']
        edge = C['f'] if near else C['D']
        for y in range(hip_y, foot_y + 1):             # pierna recta
            t = (y - hip_y) / max(1, foot_y - hip_y)
            x = round(hip_x + (fx - hip_x) * t)
            p.hline(x, x + 2, y, fill)
            p.set(x + 2, y, edge)
        p.hline(fx, fx + 2, foot_y, C['T'] if near else C['t'])    # sello de goma
        p.hline(fx - 1, fx + 2, foot_y + 1, C['B'] if near else C['b'])
        p.set(fx + 2, foot_y, C['D'])                              # luz de la bota
        p.hline(fx - 1, fx + (1 if lf else 2), foot_y + 2, C['b'])
    p.hline(5, 11, 24 + bob, C['f'])              # sombra bajo la panza


def suit_arm_side(p, k, bob):
    """Manga y guante al frente del torso; se hamacan con el paso."""
    sw = 0 if k is None else (-1, -1, 0, 1, 1, 0)[k]
    for y in range(19, 23):                      # borra el guante de la grilla
        p.hline(8, 9, y + bob, C['F'])
    for y in range(17, 23):                      # manga
        p.hline(9 + sw, 10 + sw, y + bob, C['f'])
        p.set(9 + sw, y + bob, C['F'])           # luz del hombro
    p.rect(9 + sw, 22 + bob, 2, 2, C['K'])       # guante
    p.set(10 + sw, 23 + bob, C['D'])


def suit_gloves_front(p, k, bob, back=False):
    """Guantes del traje (uno de cocina, desparejo): van al reves que la pierna.
    Se borran los de la grilla para poder moverlos 1 px."""
    rows = suit.BODY_BACK if back else suit.BODY_FRONT
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch in 'KQkq':
                p.set(i, 15 + bob + j, C['F'])              # limpia la grilla
    sw = (0, 0) if k is None else (1 if LIFT_L[k] else 0, 1 if LIFT_R[k] else 0)
    for x, dy, fill, edge in ((1, sw[0], 'K', 'k'), (13, sw[1], 'Q', 'q')):
        p.rect(x, 24 + bob + dy, 2, 2, C[fill])
        p.set(x + 1, 26 + bob + dy, C[edge])


def suit_frame(name, direction, k=None, bob=None):
    rifle = name == 'juan_suit_rifle'
    neutral = k is None
    kk = 0 if neutral else k
    bob = (0 if neutral else BOB[kk]) if bob is None else bob
    p = Pix(W, H)
    if direction in ('down', 'up'):
        rows = suit.BODY_BACK if direction == 'up' else suit.BODY_FRONT
        suit.blit(p, rows[:12], 0, 15 + bob)
        suit_legs_front(p, None if neutral else kk, bob, back=direction == 'up')
        suit_gloves_front(p, None if neutral else kk, bob, back=direction == 'up')
        if not rifle:
            p.hline(4, 11, 15 + bob, C['c'])                     # cuello de goma
        suit_hood(p, HOOD_FRONT[0], HOOD_FRONT[1] + bob, HOOD_FRONT[2], HOOD_FRONT[3])
        if direction == 'down':
            suit.visor(p, VISOR_FRONT[0], VISOR_FRONT[1] + bob, VISOR_FRONT[2], VISOR_FRONT[3])
            suit_eyes(p, VISOR_FRONT[0], VISOR_FRONT[1] + bob)
            suit.filter_can(p, 10.8, 14.0 + bob, 1.5)
        else:
            p.vline(8, 3 + bob, 14 + bob, C['f'])          # costura de la capucha
            for i in range(9):                              # rifle cruzado
                p.set(12 - i // 2, 13 + i + bob, C['R'])
            p.vline(12, 11 + bob, 13 + bob, C['r'])
        if rifle:
            stock = [(2 + i, 27 - i + bob) for i in range(5)]
            barrel = [(7 + i, 22 - i + bob) for i in range(9)]
            suit.rifle_line(p, stock, barrel)
            p.rect(4, 24 + bob, 2, 2, C['K'])
            p.rect(10, 18 + bob, 2, 2, C['Q'])
    else:                                        # right
        rows = suit.BODY_SIDE
        suit.blit(p, rows[:10], 0, 15 + bob)
        suit_legs_side(p, None if neutral else kk, bob)
        if rifle:
            stock = [(3 + i, 23 + bob) for i in range(5)]
            barrel = [(8 + i, 22 + bob) for i in range(7)]
            suit.rifle_line(p, stock, barrel)
            p.rect(6, 22 + bob, 2, 3, C['K'])
            p.rect(11, 21 + bob, 2, 2, C['Q'])
        else:
            for i in range(9):
                p.set(4 - i // 4, 17 + i + bob, C['R'])
            p.vline(3, 13 + bob, 16 + bob, C['r'])
        suit_hood(p, HOOD_SIDE[0], HOOD_SIDE[1] + bob, HOOD_SIDE[2], HOOD_SIDE[3])
        suit.visor(p, VISOR_SIDE[0], VISOR_SIDE[1] + bob, VISOR_SIDE[2], VISOR_SIDE[3])
        suit.filter_can(p, 11.2, 13.9 + bob, 1.2)
        p.hline(5, 11, 15 + bob, C['c'])
        suit_arm_side(p, None if neutral else kk, bob)
    p.outline(0.56, 0.22)
    return p


# ------------------------------------------------------------ atlas
def base_sprite(name, direction):
    """Cuadro de reposo de referencia (frente: la grilla de characters)."""
    if name in SUITS:
        return None                      # el traje arma tambien el reposo
    if direction == 'down' and name != 'polsky_coat':
        return ch.sprite(name)
    return None


def frame(name, direction, col):
    """col 0-5 caminata, 6-7 reposo. Se arma mirando a la derecha; left es espejo."""
    mirrored = direction == 'left'
    d = 'right' if mirrored else direction
    if name in SUITS:
        if col < 6:
            p = suit_frame(name, d, k=col)
        else:
            p = suit_frame(name, d, bob=0 if col == 6 else 1)   # respiracion de 1 px
    else:
        sp = base_sprite(name, d) if col == 6 else None
        k = None if col >= 6 else col
        bob = 1 if col == 7 else None
        if sp is not None:
            p = sp
        elif d == 'down':
            p = front_frame(name, k=k, bob=bob)
        elif d == 'up':
            p = back_frame(name, k=k, bob=bob)
        else:
            p = side_frame(name, k=k, bob=bob)
    if mirrored:
        p.img = p.img.transpose(0)                 # FLIP_LEFT_RIGHT
        p.px = p.img.load()
    return p


def build():
    cols_per_char = 8
    atlas = Pix(cols_per_char * W * len(IDS), H * len(DIRS))
    blocks = {}
    for ci, name in enumerate(IDS):
        bx = ci * cols_per_char * W
        blocks[name] = {'x': bx, 'y': 0}
        for di, direction in enumerate(DIRS):
            for col in range(cols_per_char):
                p = frame(name, direction, col)
                atlas.img.alpha_composite(p.img, (bx + col * W, di * H))
    data = {
        'cell': {'w': W, 'h': H},
        'cols': cols_per_char,
        'rows': len(DIRS),
        'dirs': DIRS,
        'walk': [0, 1, 2, 3, 4, 5],
        'idle': [6, 7],
        'times': TIMES,
        'ids': IDS,
        'blocks': blocks,
    }
    return atlas, data


if __name__ == '__main__':
    from PIL import Image
    atlas, data = build()
    atlas.img.save('/tmp/chars2_raw.png')
    atlas.img.resize((atlas.w * 6, atlas.h * 6), Image.NEAREST).save('/tmp/chars2_raw_x6.png')
    print('ok', atlas.w, atlas.h)
