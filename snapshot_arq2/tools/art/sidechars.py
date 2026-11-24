"""Elena y Martita en 16x32 (4 direcciones x 6 frames), mismo estilo.

Se generan aparte de chars.py para no tocar el atlas de los cuatro hombres:
el exportador pega los dos bloques al final de chars.png.
"""
from pixel import Pix, hx, mix
import chars as C

# Paletas propias (pelo claro ondulado de Elena; nena rubia con flequillo).
EH = hx('#d8ae68'); EH2 = hx('#a87c44'); EH3 = hx('#efd090'); EH4 = hx('#7a5830')
EDRESS = hx('#7a4a5a'); EDRESS2 = hx('#5a3444'); EDRESS3 = hx('#9a6474')
EAPRON = hx('#d8c8b0'); EAPRON2 = hx('#b0a088')
MHAIR = hx('#e0c088'); MHAIR2 = hx('#b08c50'); MHAIR3 = hx('#f4dca8')
MDRESS = hx('#c8d0e0'); MDRESS2 = hx('#98a4bc'); MDRESS3 = hx('#e8eef8')
SKIN = C.SKIN; SKIN2 = C.SKIN2; SKIN_HI = C.SKIN_HI
EYE = C.EYE; EYE_HI = C.EYE_HI; MOUTH = C.MOUTH; NOSE = C.NOSE

CELL_W, CELL_H, COLS, ROWS = 16, 32, 6, 4


def face(p, dy=0, blink=False, brow=None):
    for x0 in (5, 9):
        if blink:
            C.band(p, 9 + dy, x0, x0 + 1, EYE)
        else:
            p.rect(x0, 9 + dy, 2, 2, EYE)
            p.set(x0, 9 + dy, EYE_HI)
        p.set(x0 + 1, 11 + dy, SKIN2)
    p.set(7, 11 + dy, NOSE)
    C.band(p, 12 + dy, 7, 8, MOUTH)
    p.set(7, 12 + dy, hx('#7e4248'))
    if brow:
        C.band(p, 8 + dy, 5, 6, brow)
        C.band(p, 8 + dy, 9, 10, brow)


def hair_front(p, dy=0, child=False, blink=False):
    """Pelo claro con raya al costado y ondas hasta el hombro."""
    if child:
        C.band(p, 2 + dy, 4, 11, MHAIR)
        C.band(p, 3 + dy, 3, 12, MHAIR)
        C.band(p, 4 + dy, 3, 12, MHAIR)
        C.band(p, 5 + dy, 3, 12, MHAIR)
        # flequillo recto sobre la frente
        C.band(p, 6 + dy, 3, 12, MHAIR2)
        C.band(p, 7 + dy, 3, 12, MHAIR)
        p.set(4, 8 + dy, MHAIR2); p.set(11, 8 + dy, MHAIR2)
        C.band(p, 3 + dy, 4, 8, MHAIR3)
        p.set(3, 4 + dy, MHAIR3)
    else:
        C.band(p, 2 + dy, 4, 11, EH)
        C.band(p, 3 + dy, 3, 12, EH)
        C.band(p, 4 + dy, 2, 13, EH)
        C.band(p, 5 + dy, 2, 13, EH)
        C.band(p, 6 + dy, 2, 13, EH2)
        C.band(p, 7 + dy, 2, 3, EH)
        C.band(p, 7 + dy, 12, 13, EH)
        # ondas laterales largas hasta el hombro
        for y in range(7, 15):
            p.set(1, y + dy, EH if y % 2 else EH2)
            p.set(2, y + dy, EH)
            p.set(13, y + dy, EH if y % 2 else EH2)
            p.set(14, y + dy, EH2)
        p.set(1, 8 + dy, EH3); p.set(2, 7 + dy, EH3)
        p.set(13, 9 + dy, EH3)
        p.set(4, 3 + dy, EH3); p.set(5, 3 + dy, EH3)


def hair_back(p, dy=0, child=False):
    if child:
        for y in range(2, 12):
            x0, x1 = C.FACE_ROWS[y]
            C.band(p, y + dy, x0, x1, MHAIR)
        C.band(p, 4 + dy, 4, 11, MHAIR3)
        C.band(p, 10 + dy, 4, 11, MHAIR2)
    else:
        for y in range(2, 17):
            x0, x1 = C.FACE_ROWS[min(y, 14)]
            C.band(p, y + dy, x0 - 1 if y < 14 else 1, x1 + 1 if y < 14 else 14, EH)
        C.band(p, 4 + dy, 3, 12, EH3)
        for x in (5, 8, 11):
            p.vline(x, 3 + dy, 12 + dy, EH2)
        for y in range(13, 17):
            p.set(1, y + dy, EH2); p.set(2, y + dy, EH)
            p.set(13, y + dy, EH); p.set(14, y + dy, EH2)


def torso_elena(p, dy=0, arm_l=0, arm_r=0):
    # cuello y escote
    C.band(p, 14 + dy, 6, 9, SKIN2)
    C.band(p, 15 + dy, 5, 10, EAPRON)
    for y in range(16, 23):
        x0, x1 = (4, 11)
        C.band(p, y + dy, x0, x1, EDRESS)
        p.set(x0, y + dy, EDRESS3)
        p.set(x1, y + dy, EDRESS2)
    # delantal claro sobre el vestido
    C.band(p, 17 + dy, 6, 9, EAPRON)
    C.band(p, 18 + dy, 6, 9, EAPRON2)
    p.set(7, 20 + dy, EAPRON); p.set(8, 20 + dy, EAPRON2)
    # mangas y manos
    for side, arm in (('l', arm_l), ('r', arm_r)):
        ax = 2 if side == 'l' else 12
        for y in range(16, 21):
            p.set(ax, y + dy - (1 if arm else 0), EDRESS)
            p.set(ax + 1, y + dy - (1 if arm else 0), EDRESS2)
        hy = 21 + dy - (1 if arm else 0)
        p.rect(ax, hy, 2, 2, SKIN)
        p.set(ax + 1, hy + 1, SKIN2)
    # pollera acampanada
    for y in range(23, 30):
        w = 5 + (y - 23) // 3
        C.band(p, y + dy, 8 - w, 7 + w, EDRESS)
        p.set(8 - w, y + dy, EDRESS2)
        p.set(7 + w, y + dy, EDRESS2)
    C.band(p, 23 + dy, 4, 11, EDRESS3)
    # pies
    p.rect(4, 30 + dy, 3, 2, hx('#3a2a2a'))
    p.rect(9, 30 + dy, 3, 2, hx('#3a2a2a'))
    p.set(4, 30 + dy, hx('#5a4038')); p.set(9, 30 + dy, hx('#5a4038'))


def torso_martita(p, dy=0, arm_l=0, arm_r=0):
    C.band(p, 14 + dy, 6, 9, SKIN2)
    for y in range(16, 23):
        x0, x1 = (5, 10)
        C.band(p, y + dy, x0, x1, MDRESS)
        p.set(x0, y + dy, MDRESS3)
        p.set(x1, y + dy, MDRESS2)
    for side, arm in (('l', arm_l), ('r', arm_r)):
        ax = 3 if side == 'l' else 11
        for y in range(16, 20):
            p.set(ax, y + dy - (1 if arm else 0), MDRESS)
        hy = 20 + dy - (1 if arm else 0)
        p.rect(ax, hy, 2, 2, SKIN)
    # pollerita corta
    for y in range(22, 27):
        w = 5 + (y - 22) // 2
        C.band(p, y + dy, 8 - w, 7 + w, MDRESS)
        p.set(8 - w, y + dy, MDRESS2)
        p.set(7 + w, y + dy, MDRESS2)
    C.band(p, 22 + dy, 3, 12, MDRESS3)
    # piernitas y zapatitos
    p.rect(5, 27 + dy, 2, 3, SKIN)
    p.rect(9, 27 + dy, 2, 3, SKIN)
    p.rect(4, 30 + dy, 3, 1, hx('#d05050'))
    p.rect(9, 30 + dy, 3, 1, hx('#d05050'))


def draw_down(cfg, pose, blink=False):
    p = Pix(16, 32)
    dy = pose.get('bob', 0)
    C.skin_head_down(p, dy)
    C.ears_down(p, dy)
    face(p, dy, blink, cfg['brow'])
    hair_front(p, dy, cfg['child'], blink)
    (torso_martita if cfg['child'] else torso_elena)(
        p, dy, pose.get('arm_l', 0), pose.get('arm_r', 0))
    return p


def draw_up(cfg, pose, blink=False):
    p = Pix(16, 32)
    dy = pose.get('bob', 0)
    hair_back(p, dy, cfg['child'])
    if cfg['child']:
        torso_martita(p, dy, pose.get('arm_r', 0), pose.get('arm_l', 0))
    else:
        torso_elena(p, dy, pose.get('arm_r', 0), pose.get('arm_l', 0))
    return p


def draw_side(cfg, pose, blink=False):
    p = Pix(16, 32)
    dy = pose.get('bob', 0)
    for y, (x0, x1) in C.SIDE_ROWS.items():
        C.band(p, y + dy, x0, x1, SKIN)
        p.set(x1, y + dy, SKIN2)
    p.set(1, 10 + dy, SKIN); p.set(1, 11 + dy, SKIN2)
    p.rect(7, 9 + dy, 2, 2, SKIN2)
    p.rect(4, 9 + dy, 2, 2, EYE)
    p.set(4, 9 + dy, EYE_HI)
    C.band(p, 8 + dy, 4, 5, cfg['brow'])
    C.band(p, 12 + dy, 3, 4, MOUTH)
    # pelo de perfil
    color = MHAIR if cfg['child'] else EH
    dark = MHAIR2 if cfg['child'] else EH2
    hi = MHAIR3 if cfg['child'] else EH3
    for y in range(2, 7):
        C.band(p, y + dy, 2, 13, color)
    for y in range(7, 15):
        p.set(8, y + dy, color); p.set(9, y + dy, color)
        p.set(10, y + dy, dark)
        p.set(11, y + dy, color)
        p.set(12, y + dy, dark)
        p.set(13, y + dy, color)
    C.band(p, 3 + dy, 3, 8, hi)
    p.set(12, 8 + dy, hi)
    if cfg['child']:
        C.band(p, 6 + dy, 2, 3, dark)
    # cuerpo de perfil
    body = MDRESS if cfg['child'] else EDRESS
    body2 = MDRESS2 if cfg['child'] else EDRESS2
    body3 = MDRESS3 if cfg['child'] else EDRESS3
    for y in range(15, 23):
        C.band(p, y + dy, 4, 11, body)
        p.set(4, y + dy, body3)
        p.set(11, y + dy, body2)
    for y in range(23, 30 if not cfg['child'] else 27):
        w = 4 + (y - 23) // 3
        C.band(p, y + dy, 8 - w, 7 + w, body)
    p.rect(5, 30 + dy, 3, 2, hx('#3a2a2a'))
    return p


CFG_ELENA = dict(child=False, brow=EH2)
CFG_MARTITA = dict(child=True, brow=MHAIR2)


def build_frames(kind):
    cfg = CFG_ELENA if kind == 'elena' else CFG_MARTITA
    frames = [[], [], [], []]
    poses = C.WALK_POSES + C.IDLE_POSES
    for i, pose in enumerate(poses):
        blink = i == 5
        frames[0].append(draw_down(cfg, pose, blink))
        frames[1].append(draw_up(cfg, pose, blink))
        frames[2].append(draw_side(cfg, pose, blink))
        frames[3].append(C.mirror(frames[2][-1]))
    return frames


ORDER = ['elena', 'martita']


def build():
    atlas = Pix(CELL_W * COLS * len(ORDER), CELL_H * ROWS)
    blocks = {}
    for ci, kind in enumerate(ORDER):
        frames = build_frames(kind)
        bx = ci * CELL_W * COLS
        for d in range(ROWS):
            for k in range(COLS):
                atlas.paste(frames[d][k], bx + k * CELL_W, d * CELL_H)
        blocks[kind] = bx
    return atlas, blocks


def build_portraits():
    port = Pix(32 * len(ORDER), 32)
    for i, kind in enumerate(ORDER):
        head = build_frames(kind)[0][4]
        crop = head.img.crop((0, 0, 16, 16)).resize((32, 32), 0)
        port.img.alpha_composite(crop, (i * 32, 0))
    return port


def preview(path, scale=5):
    atlas, _ = build()
    bg = Pix(atlas.w, atlas.h)
    bg.img.alpha_composite(atlas.img)
    bg.img.resize((atlas.w * scale, atlas.h * scale), 0).save(path)
