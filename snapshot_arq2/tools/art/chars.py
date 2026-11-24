"""Genera los personajes 16x32 (4 direcciones x 4 pasos + 2 idle) en 1x.

Estilo Stardew-like: cabeza grande, cara legible, pelo con volumen, ropa con
3 tonos, contorno de color. El traje sigue el comic: casco redondo de vidrio
con marco metalico, valvula de respiracion, guantes y botas pesadas.
"""
from pixel import Pix, hx, mix

# ------------------------------------------------------------------ paleta
SKIN = hx('#e2ab8a'); SKIN2 = hx('#b97a62'); SKIN3 = hx('#7e4c44'); SKIN_HI = hx('#f2c6a0')
EYE = hx('#1a1426'); EYE_HI = hx('#f4fbff'); MOUTH = hx('#9a5256'); NOSE = hx('#c98a6e')
HAIR_J = hx('#2c2028'); HAIR_J2 = hx('#1c1620'); HAIR_J3 = hx('#4e3a40')
HAIR_F = hx('#4a4450'); HAIR_F2 = hx('#2e2a36'); HAIR_F3 = hx('#6a6070')
HAIR_LW = hx('#cfc9c0'); HAIR_LW2 = hx('#98928c'); HAIR_LW3 = hx('#ece7de')
HAIR_P = hx('#c8cad6'); HAIR_P2 = hx('#9296a8'); HAIR_P3 = hx('#e8eaf4')
GLASS_RIM = hx('#241e30'); GLASS_LENS = hx('#a8c8d8'); GLASS_HI = hx('#e8f8ff')

SHIRT = hx('#c9d2e4'); SHIRT2 = hx('#8e98ba'); SHIRT3 = hx('#e8eef8')
PANTS = hx('#3b4458'); PANTS2 = hx('#272d3e')
SHOE = hx('#3a2a2a'); SHOE2 = hx('#241a1a')
TIE = hx('#7a2e3a'); TIE2 = hx('#a8434a')
# Lucas: saco oscuro, camisa clara y corbata oscura.
LJACKET = hx('#3a3f52'); LJACKET2 = hx('#252938'); LJACKET3 = hx('#565d74')
LSHIRT = hx('#d8d8e0'); LSHIRT2 = hx('#a8aab8'); LTIE = hx('#5e2230'); LTIE2 = hx('#8a3442')
# Polsky: traje oscuro y corbata; cuerpo pesado.
PSUIT = hx('#34333e'); PSUIT2 = hx('#22212c'); PSUIT3 = hx('#50505f')
PSHIRT = hx('#cfd0d8'); PSHT2 = hx('#9a9ca8'); PTIE = hx('#3a5044'); PTIE2 = hx('#5c7462')
# Favalli: sweater tejido de cuello alto, claro con franjas oscuras.
KNIT = hx('#b9b09a'); KNIT2 = hx('#827a66'); KNIT3 = hx('#d9d2ba')
KNIT4 = hx('#5e574a')

# traje aislante
SUIT = hx('#7a7150'); SUIT2 = hx('#554d34'); SUIT3 = hx('#a09868'); SUIT4 = hx('#3a3524')
METAL = hx('#8a96a0'); METAL2 = hx('#5c6672'); METAL3 = hx('#b4c0c6'); METAL4 = hx('#3b4350')
GLASS = hx('#2f7088'); GLASS2 = hx('#bdeffa'); GLASS3 = hx('#1f4a60')
GLOVE = hx('#3d3a30'); GLOVE2 = hx('#28261e'); GLOVE3 = hx('#5c5646')
BOOT = hx('#332e26'); BOOT2 = hx('#211e18'); BOOT3 = hx('#544a3a')
HOSE = hx('#22283a'); HOSE2 = hx('#4a5468'); HOSE3 = hx('#8a96a0')

# ------------------------------------------------------------------ helpers
FACE_ROWS = {
    2: (5, 10), 3: (4, 11), 4: (3, 12), 5: (2, 13), 6: (2, 13),
    7: (2, 13), 8: (2, 13), 9: (2, 13), 10: (2, 13), 11: (2, 13),
    12: (3, 12), 13: (4, 11), 14: (5, 10),
}
SIDE_ROWS = {
    2: (5, 10), 3: (3, 11), 4: (2, 12), 5: (2, 12), 6: (2, 12),
    7: (2, 12), 8: (2, 12), 9: (2, 12), 10: (2, 12), 11: (2, 12),
    12: (3, 11), 13: (4, 10), 14: (5, 9),
}


def band(p, y, x0, x1, c, a=255):
    p.hline(x0, x1, y, c, a)


def skin_head_down(p, dy=0):
    for y, (x0, x1) in FACE_ROWS.items():
        band(p, y + dy, x0, x1, SKIN)
    # sombra del lado derecho y bajo el menton
    for y, (x0, x1) in FACE_ROWS.items():
        if y >= 7:
            p.set(x1 + dy * 0, y + dy, SKIN2)
    band(p, 13 + dy, 5, 10, SKIN2)
    band(p, 14 + dy, 5, 10, SKIN2)
    # mejillas/menton iluminados a la izquierda
    for y in (8, 9, 10, 11):
        p.set(4, y + dy, SKIN_HI)
    p.set(5, 12 + dy, SKIN_HI)


def ears_down(p, dy=0):
    p.rect(1, 8 + dy, 2, 3, SKIN)
    p.rect(13, 8 + dy, 2, 3, SKIN)
    p.set(1, 10 + dy, SKIN2)
    p.set(14, 10 + dy, SKIN2)
    p.set(1, 8 + dy, SKIN_HI)


def eyes_down(p, dy=0, blink=False):
    if blink:
        band(p, 9 + dy, 5, 6, EYE)
        band(p, 9 + dy, 9, 10, EYE)
        p.set(5, 10 + dy, SKIN2)
        p.set(10, 10 + dy, SKIN2)
        return
    for x0 in (5, 9):
        p.rect(x0, 9 + dy, 2, 2, EYE)
        p.set(x0, 9 + dy, EYE_HI)
    # parpado inferior suave
    p.set(6, 11 + dy, SKIN2)
    p.set(10, 11 + dy, SKIN2)


def face_down(p, cfg, dy=0, blink=False):
    if cfg.get('round_face'):
        # mejillas llenas (Polsky): cara mas redonda
        p.set(2, 4 + dy, SKIN)
        p.set(13, 4 + dy, SKIN)
        p.set(1, 6 + dy, SKIN)
        p.set(14, 6 + dy, SKIN)
        p.set(1, 7 + dy, SKIN)
        p.set(14, 7 + dy, SKIN)
    eyes_down(p, dy, blink)
    # nariz
    if cfg.get('big_nose'):
        p.rect(7, 10 + dy, 2, 1, NOSE)
        p.set(8, 10 + dy, SKIN2)
        p.set(7, 11 + dy, NOSE)
        p.set(8, 11 + dy, SKIN2)
    else:
        p.set(7, 11 + dy, NOSE)
    if cfg.get('jaw'):
        # mandibula cuadrada de Juan: linea de menton
        band(p, 13 + dy, 5, 10, SKIN2)
        p.set(7, 13 + dy, SKIN3)
        p.set(8, 13 + dy, SKIN3)
    # boca
    band(p, 12 + dy, 7, 8, MOUTH)
    p.set(7, 12 + dy, hx('#6e3a40'))
    if cfg.get('stubble'):
        for x in (5, 6, 9, 10):
            p.set(x, 12 + dy, SKIN3 if x % 2 else SKIN2)
    if cfg.get('mustache'):
        band(p, 11 + dy, 5, 10, cfg['hair2'])
        p.set(5, 12 + dy, cfg['hair2'])
        p.set(10, 12 + dy, cfg['hair2'])
    if cfg.get('lined'):
        # cara larga y surcada (Lucas): arrugas de frente y surcos nasales
        band(p, 6 + dy, 5, 6, SKIN2)
        band(p, 6 + dy, 9, 10, SKIN2)
        p.set(5, 11 + dy, SKIN2)
        p.set(10, 11 + dy, SKIN2)
        p.set(5, 12 + dy, SKIN2)
        p.set(10, 12 + dy, SKIN2)
        p.set(4, 10 + dy, SKIN2)
    if cfg.get('glasses'):
        # anteojos de marco grueso (Favalli)
        for x0 in (4, 9):
            p.rect(x0, 8 + dy, 3, 3, GLASS_RIM)
            p.rect(x0 + 1, 9 + dy, 1, 1, GLASS_LENS)
            p.set(x0 + 1, 9 + dy, GLASS_HI)
        p.set(7, 9 + dy, GLASS_RIM)
        p.set(8, 9 + dy, GLASS_RIM)
        p.set(3, 9 + dy, GLASS_RIM)
        p.set(12, 9 + dy, GLASS_RIM)
    else:
        # cejas
        band(p, 8 + dy, 5, 6, cfg['brow'])
        band(p, 8 + dy, 9, 10, cfg['brow'])
        if cfg.get('heavy_brow'):
            p.set(4, 8 + dy, cfg['brow'])
            p.set(11, 8 + dy, cfg['brow'])


def hair_down(p, style, dy=0, blink=False):
    """Pelo sobre la cabeza de frente. Deja la cara visible desde y=7."""
    if style == 'juan':
        band(p, 2 + dy, 5, 10, HAIR_J)
        band(p, 3 + dy, 4, 11, HAIR_J)
        band(p, 4 + dy, 3, 12, HAIR_J)
        for y in (5, 6):
            band(p, y + dy, 2, 13, HAIR_J)
        # lado corto
        for y in (7, 8, 9):
            p.rect(2, y + dy, 2, 1, HAIR_J)
            p.rect(12, y + dy, 2, 1, HAIR_J)
        # flequillo y linea de peine
        band(p, 7 + dy, 4, 11, HAIR_J2)
        band(p, 6 + dy, 4, 9, HAIR_J3)
        p.set(5, 6 + dy, HAIR_J3)
        p.set(5, 5 + dy, HAIR_J3)
        p.set(11, 5 + dy, HAIR_J2)
        p.set(12, 5 + dy, HAIR_J2)
    elif style == 'favalli':
        # calvicie: corona de piel, pelo raleado a los costados y atras
        band(p, 2 + dy, 6, 9, SKIN)
        band(p, 3 + dy, 5, 10, SKIN)
        band(p, 4 + dy, 4, 11, SKIN)
        band(p, 5 + dy, 3, 12, SKIN)
        p.set(6, 3 + dy, SKIN_HI)
        p.set(7, 2 + dy, SKIN_HI)
        # mechones grises
        for x, y in ((4, 3), (5, 2), (9, 2), (10, 3), (3, 4), (11, 4), (12, 5)):
            p.set(x, y + dy, HAIR_F)
        for y in (6, 7, 8, 9):
            p.rect(2, y + dy, 2, 1, HAIR_F)
            p.rect(12, y + dy, 2, 1, HAIR_F)
        for x in (2, 3):
            p.set(x, 5 + dy, HAIR_F3)
        p.set(13, 6 + dy, HAIR_F2)
        band(p, 7 + dy, 3, 4, HAIR_F)
        band(p, 7 + dy, 11, 12, HAIR_F)
    elif style == 'lucas':
        # calvo con pelo blanco ralo a los costados y entradas marcadas
        # coronilla despejada: solo se ilumina la piel
        p.set(6, 3 + dy, SKIN_HI)
        p.set(7, 2 + dy, SKIN_HI)
        p.set(9, 3 + dy, SKIN_HI)
        p.set(8, 2 + dy, SKIN_HI)
        # mechones ralos sobre las sienes
        p.set(4, 4 + dy, HAIR_LW2)
        p.set(5, 4 + dy, HAIR_LW)
        p.set(10, 4 + dy, HAIR_LW)
        p.set(11, 4 + dy, HAIR_LW2)
        # pelo lateral, 2 px, de y5 a y10
        for y in (5, 6, 7, 8, 9, 10):
            p.set(2, y + dy, HAIR_LW3)
            p.set(3, y + dy, HAIR_LW)
            p.set(12, y + dy, HAIR_LW)
            p.set(13, y + dy, HAIR_LW2)
        # entradas: la frente queda libre en las esquinas
        p.set(3, 5 + dy, SKIN)
        p.set(12, 5 + dy, SKIN)
        p.set(4, 5 + dy, SKIN)
        p.set(11, 5 + dy, SKIN)
        p.set(3, 10 + dy, HAIR_LW3)
        p.set(12, 10 + dy, HAIR_LW3)
    elif style == 'polsky':
        # pelo blanco con volumen, peinado hacia atras
        band(p, 2 + dy, 5, 10, HAIR_P)
        band(p, 3 + dy, 3, 12, HAIR_P)
        band(p, 4 + dy, 2, 13, HAIR_P)
        for y in (5, 6):
            band(p, y + dy, 2, 13, HAIR_P)
        # entradas suaves: frente despejada desde y7
        band(p, 7 + dy, 3, 4, HAIR_P)
        band(p, 7 + dy, 11, 12, HAIR_P)
        for y in (8, 9):
            p.set(2, y + dy, HAIR_P)
            p.set(13, y + dy, HAIR_P)
        # lineas del peine hacia atras
        p.vline(5, 2 + dy, 5 + dy, HAIR_P2)
        p.vline(8, 2 + dy, 5 + dy, HAIR_P2)
        p.vline(11, 2 + dy, 5 + dy, HAIR_P2)
        p.set(4, 5 + dy, HAIR_P2)
        p.set(12, 5 + dy, HAIR_P2)
        # brillo de la luz de arriba a la izquierda
        band(p, 3 + dy, 4, 7, HAIR_P3)
        p.set(3, 4 + dy, HAIR_P3)
        p.set(9, 2 + dy, HAIR_P3)


def hair_up(p, style, dy=0):
    """Vista de espaldas: pelo (o cabeza pelada) entera."""
    if style in ('juan', 'favalli'):
        base, dark, hi = (HAIR_J, HAIR_J2, HAIR_J3) if style == 'juan' else (HAIR_F, HAIR_F2, HAIR_F3)
        for y, (x0, x1) in FACE_ROWS.items():
            band(p, y + dy, x0, x1, base)
        for y in range(2, 12):
            x0, x1 = FACE_ROWS[y]
            p.set(x1, y + dy, dark)
        band(p, 4 + dy, 4, 9, hi)
        band(p, 3 + dy, 5, 8, hi)
        if style == 'favalli':
            # corona rala: se ve la piel en la nuca
            band(p, 3 + dy, 6, 9, SKIN)
            band(p, 4 + dy, 5, 10, SKIN)
            band(p, 5 + dy, 5, 10, SKIN)
            p.set(6, 3 + dy, SKIN_HI); p.set(9, 3 + dy, SKIN_HI)
            p.set(5, 4 + dy, SKIN_HI); p.set(10, 5 + dy, SKIN2)
        p.set(11, 5 + dy, dark)
        p.set(12, 6 + dy, dark)
        # cuello
        band(p, 13 + dy, 5, 10, base)
        band(p, 14 + dy, 6, 9, SKIN2)
    elif style == 'lucas':
        # nuca y coronilla despejadas, pelo blanco ralo a los lados
        for y, (x0, x1) in FACE_ROWS.items():
            band(p, y + dy, x0, x1, SKIN)
        band(p, 3 + dy, 5, 9, SKIN_HI)
        band(p, 4 + dy, 5, 10, SKIN_HI)
        p.set(8, 2 + dy, SKIN_HI)
        for y in (5, 6, 7, 8, 9, 10):
            p.set(2, y + dy, HAIR_LW3 if y < 8 else HAIR_LW)
            p.set(3, y + dy, HAIR_LW)
            p.set(12, y + dy, HAIR_LW)
            p.set(13, y + dy, HAIR_LW2)
        p.set(4, 5 + dy, HAIR_LW2)
        p.set(11, 5 + dy, HAIR_LW2)
        p.set(4, 6 + dy, HAIR_LW)
        p.set(11, 6 + dy, HAIR_LW)
        band(p, 13 + dy, 5, 10, SKIN2)
        band(p, 14 + dy, 6, 9, SKIN2)
    elif style == 'polsky':
        # pelo blanco peinado hacia atras, con lineas del peine
        for y, (x0, x1) in FACE_ROWS.items():
            band(p, y + dy, x0, x1, HAIR_P)
        for y in range(2, 12):
            x0, x1 = FACE_ROWS[y]
            p.set(x1, y + dy, HAIR_P2)
        p.vline(5, 2 + dy, 8 + dy, HAIR_P2)
        p.vline(8, 2 + dy, 8 + dy, HAIR_P2)
        p.vline(11, 2 + dy, 8 + dy, HAIR_P2)
        band(p, 3 + dy, 4, 7, HAIR_P3)
        band(p, 4 + dy, 3, 6, HAIR_P3)
        p.set(3, 5 + dy, HAIR_P3)
        p.set(12, 6 + dy, HAIR_P2)
        band(p, 13 + dy, 5, 10, SKIN2)
        band(p, 14 + dy, 6, 9, SKIN2)
    # orejas
    p.rect(1, 8 + dy, 1, 3, SKIN2)
    p.rect(14, 8 + dy, 1, 3, SKIN2)


def torso_down(p, cfg, dy=0, arm_l=0, arm_r=0):
    body = cfg['body']
    body2 = cfg['body2']
    body3 = cfg['body3']
    heavy = cfg.get('heavy')
    style = cfg['style']
    # cuello
    if style == 'knit':
        band(p, 14 + dy, 5, 10, body2)          # cuello alto tejido
        band(p, 15 + dy, 4, 11, body)
    else:
        band(p, 14 + dy, 6, 9, SKIN2)
    # hombros y torso
    for y in range(15, 23):
        if heavy:
            x0, x1 = (3, 12) if y > 15 else (4, 11)
        else:
            x0, x1 = (4, 11) if y > 15 else (5, 10)
        band(p, y + dy, x0, x1, body)
        p.set(x1, y + dy, body2)
        p.set(x0, y + dy, body3)
    if heavy:
        # barriga: el torso se ensancha y cae mas abajo
        band(p, 20 + dy, 3, 12, body)
        p.set(3, 20 + dy, body3)
        p.set(12, 20 + dy, body2)
        band(p, 21 + dy, 3, 12, body)
        p.set(12, 21 + dy, body2)
    # brazos (2 px) con manos
    for side, arm in (('l', arm_l), ('r', arm_r)):
        ax = (1 if side == 'l' else 13) if heavy else (2 if side == 'l' else 12)
        for y in range(16, 22):
            p.set(ax, y + dy - (1 if arm else 0), body)
            p.set(ax + 1, y + dy - (1 if arm else 0), body2)
        hy = 21 + dy - (1 if arm else 0)
        p.rect(ax, hy, 2, 2, SKIN)
        p.set(ax + 1, hy + 1, SKIN2)
    # detalles segun ropa
    if style == 'shirt':
        # camisa abierta con cuello
        band(p, 15 + dy, 6, 9, SHIRT3)
        p.set(5, 16 + dy, SHIRT2); p.set(10, 16 + dy, SHIRT2)
        p.set(7, 17 + dy, body2); p.set(8, 17 + dy, body2)
        p.set(7, 18 + dy, SHIRT3)
        band(p, 19 + dy, 6, 9, SHIRT2)
    elif style == 'suit':
        # saco con solapas, camisa clara y corbata
        shirt = cfg.get('shirt', SHIRT3)
        shirt2 = cfg.get('shirt2', SHIRT2)
        tie = cfg.get('tie', TIE)
        tie2 = cfg.get('tie2', TIE2)
        p.set(5, 15 + dy, body3); p.set(10, 15 + dy, body3)
        for k in range(4):
            p.set(6 + k, 16 + dy + k, body3)
            p.set(9 - k, 16 + dy + k, body2)
        band(p, 16 + dy, 7, 8, shirt)
        p.set(8, 17 + dy, shirt); p.set(8, 18 + dy, shirt2)
        p.set(7, 17 + dy, tie); p.set(7, 18 + dy, tie); p.set(7, 19 + dy, tie2)
        p.set(8, 19 + dy, body2)
        p.set(4, 20 + dy, body3); p.set(11, 20 + dy, body2)
    elif style == 'sweater':
        band(p, 15 + dy, 5, 10, body3)
        band(p, 16 + dy, 6, 9, body2)
        band(p, 20 + dy, 5, 10, body3)
        for x in range(5, 11, 2):
            p.set(x, 21 + dy, body2)
    elif style == 'knit':
        # sweater de cuello alto, franjas oscuras en el pecho y punto
        p.hline(5, 10, 15 + dy, body3)
        band(p, 18 + dy, 4, 11, body2)
        band(p, 20 + dy, 4, 11, KNIT4)
        for x in (5, 9):
            p.set(x, 17 + dy, body2)
            p.set(x, 19 + dy, body3)
        p.set(7, 19 + dy, body3)
        band(p, 21 + dy, 4, 11, body2)
    # cinturon
    band(p, 22 + dy, 3 if heavy else 4, 12 if heavy else 11, body2)
    p.set(7, 22 + dy, hx('#3a2a1e')); p.set(8, 22 + dy, hx('#3a2a1e'))


def legs_down(p, cfg, dy=0, lift_l=0, lift_r=0, dx_l=0, dx_r=0):
    pants = cfg['pants']; pants2 = cfg['pants2']; shoe = cfg['shoe']; shoe2 = cfg.get('shoe2', SHOE2)
    heavy = cfg.get('heavy')
    # izquierda / derecha, con aire en el medio; el cuerpo pesado usa piernas anchas
    for side, lift, dx in (('l', lift_l, dx_l), ('r', lift_r, dx_r)):
        if heavy:
            x0 = (3 if side == 'l' else 9) + dx
            pw = 4
        else:
            x0 = (4 if side == 'l' else 9) + dx
            pw = 3
        top = 23
        bottom = 29 - lift
        for y in range(top, bottom):
            p.rect(x0, y, pw, 1, pants)
            p.set(x0, y, pants)
            p.set(x0 + pw - 1, y, pants2)
        # cana del pantalon
        p.set(x0 + 1, bottom - 2, pants2)
        # zapatos
        p.rect(x0 - 1, bottom, pw + 2, 2, shoe)
        p.set(x0 - 1, bottom, shoe)
        p.set(x0 + pw, bottom, shoe2)
        p.set(x0, bottom, shoe2)
        p.set(x0 + 1, bottom, shoe2)
        p.set(x0 + pw - 1, bottom, shoe2)
        p.set(x0 - 1, bottom + 1, shoe2)
        p.set(x0 + pw, bottom + 1, shoe2)


def draw_down(cfg, pose, blink=False):
    p = Pix(16, 32)
    dy = pose.get('bob', 0)
    skin_head_down(p, dy)
    hair_down(p, cfg['hair'], dy, blink)
    face_down(p, cfg, dy, blink)
    ears_down(p, dy)
    torso_down(p, cfg, dy, pose.get('arm_l', 0), pose.get('arm_r', 0))
    legs_down(p, cfg, dy, pose.get('lift_l', 0), pose.get('lift_r', 0),
              pose.get('dx_l', 0), pose.get('dx_r', 0))
    return p


def draw_up(cfg, pose, blink=False):
    p = Pix(16, 32)
    dy = pose.get('bob', 0)
    # cabeza de espaldas
    hair_up(p, cfg['hair'], dy)
    # torso de espaldas
    body = cfg['body']; body2 = cfg['body2']; body3 = cfg['body3']
    heavy = cfg.get('heavy')
    if cfg['style'] == 'knit':
        band(p, 14 + dy, 5, 10, body2)
        band(p, 15 + dy, 4, 11, body)
    else:
        band(p, 14 + dy, 6, 9, SKIN2)
    for y in range(15, 23):
        if heavy:
            x0, x1 = (3, 12) if y > 15 else (4, 11)
        else:
            x0, x1 = (4, 11) if y > 15 else (5, 10)
        band(p, y + dy, x0, x1, body)
        p.set(x0, y + dy, body3)
        p.set(x1, y + dy, body2)
    if heavy:
        band(p, 20 + dy, 3, 12, body)
        p.set(3, 20 + dy, body3)
        p.set(12, 20 + dy, body2)
        band(p, 21 + dy, 3, 12, body)
    # costura central
    p.vline(7, 16 + dy, 21 + dy, body2)
    if cfg['style'] == 'knit':
        band(p, 18 + dy, 4, 11, body2)
        band(p, 20 + dy, 4, 11, KNIT4)
    for side, arm in (('l', pose.get('arm_r', 0)), ('r', pose.get('arm_l', 0))):
        ax = (1 if side == 'l' else 13) if heavy else (2 if side == 'l' else 12)
        for y in range(16, 22):
            p.set(ax, y + dy - (1 if arm else 0), body)
            p.set(ax + 1, y + dy - (1 if arm else 0), body2)
        hy = 21 + dy - (1 if arm else 0)
        p.rect(ax, hy, 2, 2, SKIN)
    band(p, 22 + dy, 3 if heavy else 4, 12 if heavy else 11, body2)
    legs_down(p, cfg, dy, pose.get('lift_l', 0), pose.get('lift_r', 0),
              pose.get('dx_l', 0), pose.get('dx_r', 0))
    return p


def draw_side(cfg, pose, blink=False):
    """Perfil mirando a la izquierda; luego se espeja para la derecha."""
    p = Pix(16, 32)
    dy = pose.get('bob', 0)
    # cabeza de perfil
    for y, (x0, x1) in SIDE_ROWS.items():
        band(p, y + dy, x0, x1, SKIN)
        p.set(x1, y + dy, SKIN2)
    if cfg.get('big_nose'):
        p.set(1, 9 + dy, SKIN_HI)
        p.set(1, 10 + dy, NOSE)
        p.set(1, 11 + dy, NOSE)
        p.set(2, 12 + dy, SKIN2)
    else:
        p.set(1, 10 + dy, SKIN); p.set(1, 11 + dy, SKIN2)  # nariz
        p.set(2, 12 + dy, SKIN2)
    # oreja
    p.rect(7, 9 + dy, 2, 2, SKIN2)
    p.set(7, 9 + dy, SKIN_HI)
    # ojo
    if blink:
        band(p, 9 + dy, 4, 5, EYE)
    else:
        p.rect(4, 9 + dy, 2, 2, EYE)
        p.set(4, 9 + dy, EYE_HI)
    band(p, 8 + dy, 4, 5, cfg['brow'])
    band(p, 12 + dy, 3, 4, MOUTH)
    p.set(6, 11 + dy, NOSE)
    if cfg.get('glasses'):
        p.rect(3, 8 + dy, 4, 3, GLASS_RIM)
        p.rect(4, 9 + dy, 2, 1, GLASS_LENS)
        p.set(4, 9 + dy, GLASS_HI)
        p.set(7, 9 + dy, GLASS_RIM)
    if cfg.get('mustache'):
        band(p, 11 + dy, 2, 4, cfg['hair2'])
    if cfg.get('lined'):
        p.set(4, 11 + dy, SKIN2)
        p.set(5, 11 + dy, SKIN2)
        p.set(5, 7 + dy, SKIN2)
    # pelo de perfil (lado de atras = derecha)
    style = cfg['hair']
    if style == 'juan':
        band(p, 2 + dy, 5, 10, HAIR_J)
        band(p, 3 + dy, 4, 11, HAIR_J)
        band(p, 4 + dy, 3, 12, HAIR_J)
        for y in (5, 6, 7, 8, 9, 10):
            p.rect(9, y + dy, 4, 1, HAIR_J)
        band(p, 5 + dy, 8, 12, HAIR_J2)
        band(p, 6 + dy, 9, 12, HAIR_J2)
        band(p, 4 + dy, 5, 8, HAIR_J3)
        p.set(11, 7 + dy, HAIR_J2)
    elif style == 'favalli':
        for y in (2, 3, 4, 5):
            p.rect(8, y + dy, 4, 1, SKIN)
        p.set(9, 2 + dy, SKIN_HI)
        for y in (5, 6, 7, 8, 9, 10):
            p.rect(10, y + dy, 3, 1, HAIR_F)
        band(p, 4 + dy, 8, 10, HAIR_F)
        p.set(11, 5 + dy, HAIR_F2)
        p.set(12, 6 + dy, HAIR_F2)
        band(p, 7 + dy, 9, 10, HAIR_F2)
    elif style == 'lucas':
        # coronilla despejada, pelo blanco ralo en la nuca y la patilla
        for y in (2, 3, 4, 5):
            p.rect(6, y + dy, 6, 1, SKIN)
        p.set(8, 2 + dy, SKIN_HI)
        p.set(9, 3 + dy, SKIN_HI)
        p.set(10, 4 + dy, SKIN_HI)
        for y in (5, 6, 7, 8, 9, 10):
            p.set(10, y + dy, HAIR_LW)
            p.set(11, y + dy, HAIR_LW2)
            p.set(12, y + dy, HAIR_LW2)
        p.set(9, 4 + dy, HAIR_LW)
        p.set(9, 5 + dy, HAIR_LW)
        band(p, 7 + dy, 9, 12, HAIR_LW)
        band(p, 8 + dy, 10, 12, HAIR_LW2)
        p.set(9, 6 + dy, HAIR_LW2)
    elif style == 'polsky':
        # pelo blanco peinado hacia atras, con volumen
        band(p, 2 + dy, 5, 11, HAIR_P)
        band(p, 3 + dy, 4, 12, HAIR_P)
        for y in (4, 5, 6, 7, 8, 9, 10):
            p.rect(7, y + dy, 5, 1, HAIR_P)
        band(p, 3 + dy, 5, 8, HAIR_P3)
        band(p, 4 + dy, 7, 11, HAIR_P2)
        band(p, 5 + dy, 8, 12, HAIR_P2)
        p.set(11, 6 + dy, HAIR_P2)
        p.set(12, 7 + dy, HAIR_P2)
        p.set(7, 4 + dy, HAIR_P)
        p.set(8, 3 + dy, HAIR_P3)
    # torso de perfil
    body = cfg['body']; body2 = cfg['body2']; body3 = cfg['body3']
    heavy = cfg.get('heavy')
    for y in range(15, 23):
        if heavy:
            x0, x1 = (4, 12) if y > 15 else (5, 11)
        else:
            x0, x1 = (5, 11) if y > 15 else (6, 10)
        band(p, y + dy, x0, x1, body)
        p.set(x1, y + dy, body2)
        p.set(x0, y + dy, body3)
    band(p, 15 + dy, 6, 9, cfg.get('body3', body3))
    if cfg['style'] == 'knit':
        band(p, 14 + dy, 5, 10, body2)
        band(p, 18 + dy, 5, 11, body2)
        band(p, 20 + dy, 5, 11, KNIT4)
    band(p, 22 + dy, 4 if heavy else 5, 12 if heavy else 11, body2)
    # brazo visible (balancea)
    arm = pose.get('arm_l', 0)
    ax = 6 + (1 if arm else 0)
    for y in range(16, 22):
        p.set(ax, y + dy, body)
        p.set(ax + 1, y + dy, body2)
        p.set(ax + 2, y + dy, body2)
    p.rect(ax, 21 + dy, 3, 2, SKIN)
    p.set(ax + 2, 22 + dy, SKIN2)
    # piernas: una adelante (izq) y otra atras (der)
    pants = cfg['pants']; pants2 = cfg['pants2']; shoe = cfg['shoe']; shoe2 = cfg.get('shoe2', SHOE2)
    lf = pose.get('lift_l', 0); lb = pose.get('lift_r', 0)
    dxf = -1 + pose.get('dx_l', 0); dxb = 1 + pose.get('dx_r', 0)
    pw = 4 if heavy else 3
    for x0, lift, dx in ((3 if heavy else 4, lf, dxf), (8 if heavy else 7, lb, dxb)):
        top = 23
        bottom = 29 - lift
        for y in range(top, bottom):
            p.rect(x0 + dx, y, pw, 1, pants)
            p.set(x0 + dx + pw - 1, y, pants2)
        p.rect(x0 + dx - 1, bottom, pw + 1, 2, shoe)
        p.set(x0 + dx - 1, bottom, shoe)
        p.set(x0 + dx + 1, bottom, shoe2)
        p.set(x0 + dx + pw - 1, bottom, shoe2)
    return p


# ------------------------------------------------------------------ variantes
CFG_JUAN = dict(
    hair='juan', hair2=HAIR_J2, brow=HAIR_J2, body=SHIRT, body2=SHIRT2, body3=SHIRT3,
    pants=PANTS, pants2=PANTS2, shoe=SHOE, shoe2=SHOE2, style='shirt', jaw=True,
)
CFG_FAVALLI = dict(
    hair='favalli', hair2=HAIR_F2, brow=HAIR_F2, body=KNIT, body2=KNIT2, body3=KNIT3,
    pants=hx('#3a3040'), pants2=hx('#272232'), shoe=SHOE, shoe2=SHOE2,
    style='knit', glasses=True, mustache=True,
)
CFG_LUCAS = dict(
    hair='lucas', hair2=HAIR_LW2, brow=HAIR_LW2, body=LJACKET, body2=LJACKET2, body3=LJACKET3,
    pants=hx('#3a3a40'), pants2=hx('#26262c'), shoe=hx('#2c2420'), shoe2=SHOE2,
    style='suit', shirt=LSHIRT, shirt2=LSHIRT2, tie=LTIE, tie2=LTIE2, lined=True,
)
CFG_POLSKY = dict(
    hair='polsky', hair2=HAIR_P2, brow=HAIR_P2, body=PSUIT, body2=PSUIT2, body3=PSUIT3,
    pants=hx('#33333e'), pants2=hx('#22222c'), shoe=SHOE, shoe2=SHOE2,
    style='suit', shirt=PSHIRT, shirt2=PSHT2, tie=PTIE, tie2=PTIE2,
    heavy=True, round_face=True, big_nose=True, stubble=True,
)

WALK_POSES = [
    dict(bob=0, lift_l=0, lift_r=0, dx_l=-1, dx_r=1, arm_l=0, arm_r=1),
    dict(bob=-1, lift_l=1, lift_r=0, dx_l=0, dx_r=0, arm_l=0, arm_r=1),
    dict(bob=0, lift_l=0, lift_r=0, dx_l=1, dx_r=-1, arm_l=1, arm_r=0),
    dict(bob=-1, lift_l=0, lift_r=1, dx_l=0, dx_r=0, arm_l=1, arm_r=0),
]
IDLE_POSES = [dict(bob=0), dict(bob=1)]


def mirror(p):
    out = Pix(p.w, p.h)
    out.img = p.img.transpose(0)  # FLIP_LEFT_RIGHT
    out.px = out.img.load()
    return out


# ------------------------------------------------------------------ traje
def suit_head_down(p, dy=0, blink=False):
    cx, cy = 7.5, 8.0
    # domo metalico redondo (4 tonos, luz arriba-izquierda)
    p.circle(cx, cy, 6.7, METAL4)
    p.circle(cx, cy, 6.0, METAL2)
    p.circle(cx, cy, 5.5, METAL)
    # visor de vidrio circular, con anillo metalico alrededor
    p.circle(cx, cy, 4.9, GLASS)
    p.circle(cx, cy, 4.3, GLASS3)
    p.circle(cx, cy, 4.0, GLASS)
    # cara de Juan dentro del vidrio, atenuada por el cristal
    face_in = ((4, 5, 10), (5, 4, 11), (6, 4, 11), (7, 4, 11), (8, 4, 11),
               (9, 4, 11), (10, 4, 11), (11, 4, 11), (12, 5, 10))
    for y, x0, x1 in face_in:
        band(p, y + dy, x0, x1, mix(SKIN, GLASS3, 0.3))
    # pelo asomando arriba
    band(p, 4 + dy, 6, 9, mix(HAIR_J, GLASS3, 0.3))
    p.set(4, 5 + dy, mix(HAIR_J2, GLASS3, 0.3))
    p.set(5, 4 + dy, mix(HAIR_J2, GLASS3, 0.3))
    p.set(10, 4 + dy, mix(HAIR_J2, GLASS3, 0.3))
    p.set(11, 5 + dy, mix(HAIR_J2, GLASS3, 0.3))
    # ojos legibles (2 px + brillo)
    band(p, 7 + dy, 5, 6, mix(HAIR_J2, GLASS3, 0.35))
    band(p, 7 + dy, 9, 10, mix(HAIR_J2, GLASS3, 0.35))
    p.rect(5, 8 + dy, 2, 2, EYE)
    p.rect(9, 8 + dy, 2, 2, EYE)
    if blink:
        band(p, 8 + dy, 5, 6, mix(SKIN3, GLASS3, 0.3))
        band(p, 8 + dy, 9, 10, mix(SKIN3, GLASS3, 0.3))
    else:
        p.set(5, 8 + dy, mix(EYE_HI, GLASS2, 0.25))
        p.set(9, 8 + dy, mix(EYE_HI, GLASS2, 0.25))
    # nariz y sombra del menton
    p.rect(7, 10 + dy, 2, 1, mix(NOSE, GLASS3, 0.3))
    p.set(8, 10 + dy, mix(SKIN2, GLASS3, 0.4))
    band(p, 11 + dy, 5, 10, mix(SKIN2, GLASS3, 0.4))
    # brillo del visor arriba a la izquierda
    p.set(4, 4 + dy, GLASS2)
    p.set(3, 5 + dy, GLASS2)
    p.set(3, 6 + dy, mix(GLASS2, GLASS3, 0.35))
    # anillo metalico que sujeta el vidrio (biselado)
    for a in range(-6, 7):
        for b in range(-6, 7):
            rr = (a * a + b * b) ** 0.5
            if 4.9 < rr <= 5.5:
                p.set(int(cx + a), int(cy + dy + b), METAL3 if a + b < 0 else METAL4)
            elif 6.0 < rr <= 6.7:
                p.set(int(cx + a), int(cy + dy + b), METAL3 if a + b < 0 else METAL4)
    # costura/remaches del domo
    p.set(4, 3 + dy, METAL3); p.set(11, 3 + dy, METAL4)
    p.set(2, 8 + dy, METAL3); p.set(13, 8 + dy, METAL4)
    p.set(7, 1 + dy, METAL3); p.set(8, 14 + dy, METAL4)
    # collar metalico del traje
    band(p, 14 + dy, 3, 12, METAL2)
    band(p, 15 + dy, 3, 12, METAL)
    band(p, 15 + dy, 4, 11, METAL4)
    p.set(4, 14 + dy, METAL3); p.set(11, 14 + dy, METAL3)
    # filtro redondo oscuro delante de la boca (p040-p042):
    # aro metalico claro, cuerpo negro y centro apenas mas claro
    p.circle(7.5, 11.3 + dy, 2.6, METAL3)
    p.circle(7.5, 11.3 + dy, 2.1, hx('#141018'))
    p.circle(7.5, 11.3 + dy, 1.1, hx('#2a2a34'))
    p.set(6, 10 + dy, METAL2)
    # conector y manguera del filtro al pecho
    p.set(10, 13 + dy, METAL3)
    p.set(10, 14 + dy, METAL2)
    for x, y in ((10, 14), (10, 15), (10, 16), (9, 17), (9, 18), (8, 19), (8, 20)):
        p.set(x, y + dy, HOSE)
        p.set(x + 1, y + dy, HOSE2)
    p.set(10, 15 + dy, HOSE3)
    p.set(9, 17 + dy, HOSE3)


def suit_head_side(p, dy=0, blink=False):
    cx, cy = 7.5, 8.0
    # domo metalico
    p.circle(cx, cy, 6.7, METAL4)
    p.circle(cx, cy, 6.0, METAL2)
    p.circle(cx, cy, 5.5, METAL)
    # visor circular hacia el frente (izquierda)
    vx, vy = 5.3, 8.0
    p.circle(vx, vy, 5.0, METAL2)
    p.circle(vx, vy, 4.3, GLASS)
    p.circle(vx, vy, 3.7, GLASS3)
    p.circle(vx, vy, 3.4, GLASS)
    # cara de perfil dentro del vidrio
    for y, x0, x1 in ((5, 3, 7), (6, 3, 8), (7, 3, 8), (8, 3, 8),
                      (9, 3, 8), (10, 3, 8), (11, 3, 7), (12, 4, 6)):
        band(p, y + dy, x0, x1, mix(SKIN, GLASS3, 0.3))
    band(p, 4 + dy, 5, 7, mix(HAIR_J, GLASS3, 0.3))
    p.set(4, 5 + dy, mix(HAIR_J2, GLASS3, 0.3))
    p.set(8, 5 + dy, mix(HAIR_J2, GLASS3, 0.3))
    # ojo, nariz, boca
    p.rect(3, 8 + dy, 2, 1, EYE if not blink else mix(SKIN3, GLASS3, 0.3))
    if not blink:
        p.set(3, 8 + dy, mix(EYE_HI, GLASS2, 0.25))
    p.set(1, 9 + dy, mix(NOSE, GLASS3, 0.3))
    p.set(1, 10 + dy, mix(SKIN2, GLASS3, 0.4))
    p.set(2, 11 + dy, mix(MOUTH, GLASS3, 0.3))
    p.set(3, 12 + dy, mix(SKIN2, GLASS3, 0.4))
    # brillo del vidrio
    p.set(3, 4 + dy, GLASS2)
    p.set(2, 5 + dy, GLASS2)
    p.set(2, 6 + dy, mix(GLASS2, GLASS3, 0.4))
    # anillo metalico del visor y remaches del domo
    for a in range(-6, 7):
        for b in range(-6, 7):
            rr = (a * a + b * b) ** 0.5
            if 4.8 < rr <= 5.3:
                p.set(int(vx + a), int(vy + dy + b), METAL3 if a + b < 0 else METAL4)
            if 6.0 < rr <= 6.7:
                p.set(int(cx + a), int(cy + dy + b), METAL3 if a + b < 0 else METAL4)
    p.set(1, 8 + dy, METAL3); p.set(13, 8 + dy, METAL4)
    p.set(7, 1 + dy, METAL3); p.set(8, 14 + dy, METAL4)
    # collar metalico
    band(p, 14 + dy, 2, 12, METAL2)
    band(p, 15 + dy, 2, 12, METAL)
    band(p, 15 + dy, 3, 11, METAL4)
    # filtro redondo oscuro a la altura de la boca: aro claro y cuerpo negro
    p.circle(2.3, 11.0 + dy, 2.5, METAL3)
    p.circle(2.3, 11.0 + dy, 2.0, hx('#141018'))
    p.circle(2.3, 11.0 + dy, 1.0, hx('#2a2a34'))
    p.set(1, 9 + dy, METAL3)
    p.set(1, 13 + dy, METAL3)
    # manguera del filtro hacia el pecho
    for x, y in ((4, 13), (4, 14), (4, 15), (5, 16), (5, 17), (5, 18), (5, 19)):
        p.set(x, y + dy, HOSE)
        p.set(x + 1, y + dy, HOSE2)
    p.set(4, 14 + dy, HOSE3)
    p.set(5, 17 + dy, HOSE3)


def suit_head_up(p, dy=0):
    cx, cy = 7.5, 8.0
    # domo metalico (visto de atras)
    p.circle(cx, cy, 6.7, METAL4)
    p.circle(cx, cy, 6.0, METAL2)
    p.circle(cx, cy, 5.5, METAL)
    # placa trasera redonda con rejilla de ventilacion
    p.circle(cx, cy - 0.3, 4.3, METAL2)
    p.circle(cx, cy - 0.3, 3.6, METAL)
    for yy in (5, 7, 9):
        p.hline(5, 10, yy + dy, METAL4)
        p.hline(5, 10, yy + 1 + dy, METAL3)
    p.vline(7, 4 + dy, 11 + dy, METAL2)
    # anillo exterior biselado y remaches
    for a in range(-6, 7):
        for b in range(-6, 7):
            rr = (a * a + b * b) ** 0.5
            if 6.0 < rr <= 6.7:
                p.set(int(cx + a), int(cy + dy + b), METAL3 if a + b < 0 else METAL4)
    for x, y in ((3, 8), (12, 8), (7, 1 + dy), (8, 14 + dy)):
        p.set(x, y, METAL3)
        p.set(x, y + 1, METAL4)
    # collar metalico
    band(p, 14 + dy, 3, 12, METAL2)
    band(p, 15 + dy, 3, 12, METAL)
    # tanque de aire / mochila
    p.rect(4, 15 + dy, 8, 9, METAL2)
    p.rect(5, 16 + dy, 6, 7, METAL)
    band(p, 16 + dy, 5, 10, METAL3)
    p.vline(8, 16 + dy, 22 + dy, METAL4)
    # mangueras del tanque al casco
    for x in (3, 12):
        p.vline(x, 13 + dy, 20 + dy, HOSE)
        p.set(x + 1, 13 + dy, HOSE2)


def suit_torso_down(p, dy=0, arm_l=0, arm_r=0):
    band(p, 14 + dy, 3, 12, METAL2)
    # cuerpo pesado
    for y in range(16, 25):
        x0, x1 = (3, 12) if y > 16 else (4, 11)
        band(p, y + dy, x0, x1, SUIT)
        p.set(x0, y + dy, SUIT3)
        p.set(x1, y + dy, SUIT2)
    band(p, 18 + dy, 3, 12, SUIT2)
    band(p, 19 + dy, 4, 11, SUIT3)
    # correa y hebilla
    band(p, 21 + dy, 3, 12, SUIT4)
    p.rect(7, 20 + dy, 3, 3, METAL)
    p.set(8, 21 + dy, METAL3)
    # brazos gruesos con guantes
    for side, arm in (('l', arm_l), ('r', arm_r)):
        ax = 1 if side == 'l' else 13
        for y in range(16, 23):
            p.set(ax, y + dy - (1 if arm else 0), SUIT)
            p.set(ax + 1, y + dy - (1 if arm else 0), SUIT2)
        hy = 22 + dy - (1 if arm else 0)
        p.rect(ax, hy, 2, 2, GLOVE)
        p.set(ax, hy, GLOVE3)
        p.set(ax + 1, hy + 1, GLOVE2)
    # manguera del casco al pecho
    for x, y in ((10, 16), (10, 17), (9, 18), (9, 19), (8, 20)):
        p.set(x, y + dy, HOSE)
        p.set(x + 1, y + dy, HOSE2)
    # piernas anchas y botas, con aire en el medio
    for side in ('l', 'r'):
        x0 = 3 if side == 'l' else 9
        for y in range(25, 29):
            p.rect(x0, y + dy, 4, 1, SUIT)
            p.set(x0 + 3, y + dy, SUIT2)
            p.set(x0, y + dy, SUIT3)
        p.rect(x0 - 1, 29 + dy, 5, 2, BOOT)
        p.set(x0 - 1, 29 + dy, BOOT3)
        p.set(x0 + 2, 29 + dy, BOOT2)
        p.rect(x0 - 1, 30 + dy, 5, 1, BOOT2)
        p.set(x0 - 2, 30 + dy, BOOT2)


def draw_suit_down(pose, blink=False):
    p = Pix(16, 32)
    dy = pose.get('bob', 0)
    suit_torso_down(p, dy, pose.get('arm_l', 0), pose.get('arm_r', 0))
    suit_head_down(p, dy, blink)
    return p


def draw_suit_up(pose, blink=False):
    p = Pix(16, 32)
    dy = pose.get('bob', 0)
    suit_torso_down(p, dy, pose.get('arm_r', 0), pose.get('arm_l', 0))
    suit_head_up(p, dy)
    return p


def draw_suit_side(pose, blink=False):
    p = Pix(16, 32)
    dy = pose.get('bob', 0)
    # torso perfil
    for y in range(16, 25):
        x0, x1 = (4, 11) if y > 16 else (5, 10)
        band(p, y + dy, x0, x1, SUIT)
        p.set(x0, y + dy, SUIT3)
        p.set(x1, y + dy, SUIT2)
    band(p, 18 + dy, 4, 11, SUIT2)
    band(p, 21 + dy, 3, 12, SUIT4)
    p.rect(8, 20 + dy, 2, 3, METAL)
    # brazo
    arm = pose.get('arm_l', 0)
    ax = 6 + (1 if arm else 0)
    for y in range(16, 23):
        p.rect(ax, y + dy, 3, 1, SUIT)
        p.set(ax + 2, y + dy, SUIT2)
    p.rect(ax, 22 + dy, 3, 2, GLOVE)
    p.set(ax + 2, 23 + dy, GLOVE2)
    # piernas y botas (dos patas bien separadas)
    for x0, lift, dx, back in ((2, pose.get('lift_l', 0), -1, 0), (8, pose.get('lift_r', 0), 1, 1)):
        for y in range(25, 29 - lift):
            p.rect(x0 + dx, y + dy, 4, 1, SUIT)
            p.set(x0 + dx + 3, y + dy, SUIT2)
            p.set(x0 + dx, y + dy, SUIT3)
        by = 29 - lift + dy + (1 if back else 0)
        p.rect(x0 + dx - 1, by, 5, 2, BOOT)
        p.set(x0 + dx - 1, by, BOOT3)
        p.set(x0 + dx + 3, by, BOOT2)
        p.set(x0 + dx - 1, by + 1, BOOT2)
    suit_head_side(p, dy, blink)
    return p


# ------------------------------------------------------------------ atlas
CHAR_ORDER = ['juan', 'juan_suit', 'favalli', 'lucas', 'polsky']
CHAR_LABEL = {
    'juan': 'Juan Salvo', 'juan_suit': 'Juan Salvo (traje)',
    'favalli': 'Favalli', 'lucas': 'Lucas', 'polsky': 'Polsky',
}
CELL_W, CELL_H = 16, 32
COLS, ROWS = 6, 4


def build_frames(kind):
    """Devuelve 4 filas (down/up/left/right) x 6 frames (4 walk + 2 idle)."""
    frames = [[], [], [], []]
    for i, pose in enumerate(WALK_POSES):
        blink = False
        if kind == 'juan':
            frames[0].append(draw_down(CFG_JUAN, pose, blink))
            frames[1].append(draw_up(CFG_JUAN, pose, blink))
            frames[2].append(draw_side(CFG_JUAN, pose, blink))
            frames[3].append(mirror(frames[2][-1]))
        elif kind == 'favalli':
            frames[0].append(draw_down(CFG_FAVALLI, pose, blink))
            frames[1].append(draw_up(CFG_FAVALLI, pose, blink))
            frames[2].append(draw_side(CFG_FAVALLI, pose, blink))
            frames[3].append(mirror(frames[2][-1]))
        elif kind == 'lucas':
            frames[0].append(draw_down(CFG_LUCAS, pose, blink))
            frames[1].append(draw_up(CFG_LUCAS, pose, blink))
            frames[2].append(draw_side(CFG_LUCAS, pose, blink))
            frames[3].append(mirror(frames[2][-1]))
        elif kind == 'polsky':
            frames[0].append(draw_down(CFG_POLSKY, pose, blink))
            frames[1].append(draw_up(CFG_POLSKY, pose, blink))
            frames[2].append(draw_side(CFG_POLSKY, pose, blink))
            frames[3].append(mirror(frames[2][-1]))
        elif kind == 'juan_suit':
            frames[0].append(draw_suit_down(pose, blink))
            frames[1].append(draw_suit_up(pose, blink))
            frames[2].append(draw_suit_side(pose, blink))
            frames[3].append(mirror(frames[2][-1]))
    # idle: bob sutil + parpadeo en el segundo frame
    for d in range(4):
        for j, pose in enumerate(IDLE_POSES):
            blink = j == 1
            if kind == 'juan':
                f = (draw_down(CFG_JUAN, pose, blink) if d == 0 else
                     draw_up(CFG_JUAN, pose, blink) if d == 1 else
                     draw_side(CFG_JUAN, pose, blink))
            elif kind == 'favalli':
                f = (draw_down(CFG_FAVALLI, pose, blink) if d == 0 else
                     draw_up(CFG_FAVALLI, pose, blink) if d == 1 else
                     draw_side(CFG_FAVALLI, pose, blink))
            elif kind == 'lucas':
                f = (draw_down(CFG_LUCAS, pose, blink) if d == 0 else
                     draw_up(CFG_LUCAS, pose, blink) if d == 1 else
                     draw_side(CFG_LUCAS, pose, blink))
            elif kind == 'polsky':
                f = (draw_down(CFG_POLSKY, pose, blink) if d == 0 else
                     draw_up(CFG_POLSKY, pose, blink) if d == 1 else
                     draw_side(CFG_POLSKY, pose, blink))
            else:
                f = (draw_suit_down(pose, blink) if d == 0 else
                     draw_suit_up(pose, blink) if d == 1 else
                     draw_suit_side(pose, blink))
            if d == 3:
                f = mirror(f)
            frames[d].append(f)
    # contorno final de cada frame
    for row in frames:
        for f in row:
            f.outline()
    return frames


def build_atlas():
    atlas = Pix(CELL_W * COLS * len(CHAR_ORDER), CELL_H * ROWS)
    blocks = {}
    for ci, kind in enumerate(CHAR_ORDER):
        frames = build_frames(kind)
        bx = ci * CELL_W * COLS
        for d in range(ROWS):
            for k in range(COLS):
                atlas.paste(frames[d][k], bx + k * CELL_W, d * CELL_H)
        blocks[kind] = bx
    return atlas, blocks


def build_portraits():
    """Retrato 32x32 por personaje a partir de la cabeza de frente."""
    names = CHAR_ORDER
    port = Pix(32 * len(names), 32)
    for i, kind in enumerate(names):
        frames = build_frames(kind)
        head = frames[0][4]  # idle de frente
        crop = head.img.crop((0, 0, 16, 16)).resize((32, 32), 0)
        port.img.alpha_composite(crop, (i * 32, 0))
    return port


def preview(path, scale=5):
    """Hoja de control: todos los frames ampliados con etiquetas simples."""
    atlas, _ = build_atlas()
    # fondo damero
    from PIL import Image
    bg = Image.new('RGBA', atlas.img.size, (36, 40, 60, 255))
    bg.alpha_composite(atlas.img)
    bg = bg.resize((atlas.w * scale, atlas.h * scale), 0)
    bg.save(path)
