"""Prototipo de caminata (Juan): 6 cuadros por direccion, armado por partes.

Basado en Pixelblog 55 (Slynyrd): ciclo de 6 cuadros, el cabeceo vende el
movimiento (baja 1, baja 1, sube de golpe), tiempos desparejos (los extremos
duran mas) y miembros de largo/grosor constantes. La cabeza NUNCA cambia de
forma entre cuadros: solo se desplaza.
"""
import os
from characters import GRIDS, palette
from pixel import Pix

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')

BOB = [0, 1, 1, 0, 1, 1]               # cabeceo por cuadro (px hacia abajo)
TIMES = [150, 95, 95, 150, 95, 95]      # ms: contacto mas largo

HEAD_SIDE = [
    "................",
    ".....HHHHH......",
    "...JHHHHHHHH....",
    "..JHHHHHHHHHH...",
    "..HHHHHHHHHHHH..",
    "..HHHHHHHHHSSS..",
    "..IHHHHHHHSSSS..",
    "..IHHHHHHSSbbS..",
    "..IHHHHsSSSeSS..",
    "..IIHHHssSSeSSh.",
    "...IHHHsSSSSSSs.",
    "...IIHHSSSSSSS..",
    "....IHsSSSSSmS..",
    ".....ssSSSSSSs..",
    "......ssSSSSs...",
    ".....sssssss....",
    ".....ssss.......",
]
HEAD_BACK = [
    "................",
    ".....HHHHHH.....",
    "...JHHHHHHHHH...",
    "..JJHHHHHHHHHI..",
    "..JHHHHHHHHHHI..",
    "..HHHHHHHHHHHI..",
    "..HHHHHHHHHHHI..",
    "..IHHHHHHHHHHI..",
    "..IHHHHHHHHHII..",
    "..sIHHHHHHHHIs..",
    "..sIIHHHHHHIIs..",
    "...IIIHHHHIII...",
    "...SIIIIIIIIS...",
    "...SSIIIIIISS...",
    "....sSSSSSSs....",
    ".....ssssss.....",
    "......ssss......",
]
TORSO_FRONT = [r[3:13] for r in GRIDS['juan'][17:25]]    # sin los brazos (x 3..12)
TORSO_BACK = [
    "TCCCCCCT",
    "uTTTTTTTTt",
    "uTTTTTTTTt",
    "uTTTuTTTTt",
    "uTTTTTTTTt",
    "uTTTTTTTTt",
    "uTTTTTTTTt",
    "TTTTTTTTTT",
]
TORSO_SIDE = [
    "..uTTTCC",
    ".uuTTTTCt",
    ".uTTTTTTt",
    ".uTTTTTTt",
    ".uTTTTTTt",
    ".uTTTTTTt",
    ".tTTTTTTt",
    ".tttttttt",
]


def blit(p, rows, x0, y0, pal):
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != '.':
                p.set(x0 + i, y0 + j, pal[ch])


def legs_front(p, pal, k, bob):
    """Piernas de frente: la del paso adelante llega al piso, la de atras
    levanta el talon (pie 1-2 px mas arriba). Largo constante."""
    hip = 25 + bob
    lift = [(0, 2), (0, 1), (0, 0), (2, 0), (1, 0), (0, 0)][k]
    inward = 1 if k in (2, 5) else 0              # en el paso cruzado se juntan
    for side, (x0, lf) in enumerate(((4 + inward, lift[0]), (9 - inward, lift[1]))):
        foot = 29 - lf
        shade = 'P' if side == 0 else 'p'
        for y in range(hip, foot + 1):
            p.set(x0, y, pal['P']); p.set(x0 + 1, y, pal['P']); p.set(x0 + 2, y, pal[shade])
        p.hline(x0 - (1 if side == 0 else 0), x0 + 2 + (0 if side == 0 else 1), foot + 1, pal['B'])
        p.hline(x0 - (1 if side == 0 else 0), x0 + 2 + (0 if side == 0 else 1), foot + 2, pal['b'])
    p.hline(4, 11, hip, pal['P'])


def arms_front(p, pal, k, bob, back=False):
    """Brazos al costado; el que va adelante baja 1 px (se acerca a camara)."""
    swing = [(-1, 1), (0, 1), (0, 0), (1, -1), (1, 0), (0, 0)][k]   # (izq, der)
    for x, sw, sh in ((2, swing[0], 'u'), (13, swing[1], 't')):
        top = 18 + bob
        end = 23 + bob + sw
        for y in range(top, end + 1):
            p.set(x, y, pal[sh])
        p.set(x, end + 1, pal['S'] if not back else pal['s'])
        p.set(x, end + 2, pal['s'])


def frame_front(k, back=False):
    pal = palette('juan')
    p = Pix(16, 32)
    bob = BOB[k]
    legs_front(p, pal, k, bob)
    blit(p, HEAD_BACK if back else GRIDS['juan'][:17], 0, bob, pal)
    blit(p, TORSO_BACK if back else TORSO_FRONT, 3, 17 + bob, pal)
    arms_front(p, pal, k, bob, back)
    p.outline(0.56, 0.22)
    return p


def legs_side(p, pal, k, bob):
    """Perfil (mira a la derecha): las piernas hacen tijera desde la cadera."""
    hip_x, hip_y = 6, 25 + bob
    # (x del pie de la pierna cercana, x del pie de la lejana, talon levantado lejana)
    poses = [(10, 3, 1), (9, 4, 1), (7, 6, 0), (3, 10, 1), (4, 9, 1), (6, 7, 0)]
    near_x, far_x, lift = poses[k]
    for leg, (fx, col, lf) in enumerate(((far_x, 'p', lift if k < 3 else 0),
                                         (near_x, 'P', lift if k >= 3 else 0))):
        foot_y = 29 - lf
        for y in range(hip_y, foot_y + 1):
            t = (y - hip_y) / max(1, foot_y - hip_y)
            x = round(hip_x + (fx - hip_x) * t)
            p.hline(x, x + 2, y, pal[col])
        shoe = pal['B'] if leg == 1 else pal['b']
        p.hline(fx, fx + 3, foot_y + 1, shoe)
        p.hline(fx, fx + 3, foot_y + 2, pal['b'])


def arm_side(p, pal, k, bob):
    sw = [-2, -1, 0, 2, 1, 0][k]                   # opuesto a la pierna cercana
    for y in range(18, 25):
        t = (y - 18) / 6
        x = 7 + round(sw * t)
        p.hline(x, x + 1, y + bob, pal['T'] if y < 23 else pal['t'])
        p.set(x - 1, y + bob, pal['u'])
    hx_ = 7 + sw
    p.rect(hx_, 25 + bob, 2, 2, pal['S'])
    p.set(hx_ + 1, 26 + bob, pal['s'])


def frame_side(k, flip=False):
    pal = palette('juan')
    p = Pix(16, 32)
    bob = BOB[k]
    legs_side(p, pal, k, bob)
    blit(p, HEAD_SIDE, 0, bob, pal)
    blit(p, TORSO_SIDE, 3, 17 + bob, pal)
    arm_side(p, pal, k, bob)
    p.outline(0.56, 0.22)
    if flip:
        p.img = p.img.transpose(0)
        p.px = p.img.load()
    return p


def build():
    os.makedirs(OUT, exist_ok=True)
    rows = {
        'down': [frame_front(k) for k in range(6)],
        'up': [frame_front(k, back=True) for k in range(6)],
        'right': [frame_side(k) for k in range(6)],
        'left': [frame_side(k, flip=True) for k in range(6)],
    }
    S = 8
    for name, frames in rows.items():
        imgs = [f.img.resize((16 * S, 32 * S), 0) for f in frames]
        bg = []
        for im in imgs:
            from PIL import Image
            b = Image.new('RGBA', im.size, (42, 34, 54, 255))
            b.alpha_composite(im)
            bg.append(b.convert('P', palette=Image.ADAPTIVE))
        bg[0].save(os.path.join(OUT, f'walk_{name}.gif'), save_all=True, append_images=bg[1:],
                   duration=TIMES, loop=0, disposal=2)
    # tira para la presentacion
    from PIL import Image
    strip = Image.new('RGBA', (6 * 16 * S + 5 * 12, 3 * 32 * S + 2 * 16), (0, 0, 0, 0))
    for r, name in enumerate(('down', 'right', 'up')):
        for k, f in enumerate(rows[name]):
            strip.alpha_composite(f.img.resize((16 * S, 32 * S), 0), (k * (16 * S + 12), r * (32 * S + 16)))
    strip.save(os.path.join(OUT, 'walk_strip.png'))
    return rows


if __name__ == '__main__':
    build()
    print('ok')
