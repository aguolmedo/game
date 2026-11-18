"""HUD (diseño, no toca el juego): glifo de click derecho + lugar del aviso.
Salida: out/hud_mouse_r.png (11x13, para art/sprites/buttons/), out/hud_glifos_x10.png,
out/hud_aviso_A.png / _B.png / hud_hoy.png (capturas x4)."""
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(HERE, 'out')
CAP = os.path.join(ROOT, 'art', 'direccion', 'doc', 'capturas')

mouse = Image.open(os.path.join(ROOT, 'art', 'sprites', 'buttons', 'mouse.png')).convert('RGBA')
# click derecho: el botón prendido (crema) pasa al lado derecho, espejado sobre la división
E, D = (0xfb, 0xf4, 0xdc, 255), (0xc8, 0xc9, 0xd2, 255)
mr = mouse.copy()
px = mr.load()
for y in (3, 4, 5):
    for x in (3, 4):
        px[x, y] = D
    for x in (6, 7):
        px[x, y] = E
    px[8, y] = D
mr.save(os.path.join(OUT, 'hud_mouse_r.png'))

font = ImageFont.truetype('/usr/share/fonts/noto/NotoSans-Regular.ttf', 22)
g = Image.new('RGB', (2 * 13 * 10 + 60, 13 * 10 + 50), (27, 22, 30))
d = ImageDraw.Draw(g)
for i, (lbl, im) in enumerate((('mouse (click izq.)', mouse), ('mouse_r (click der.)', mr))):
    bg = Image.new('RGBA', im.size, (70, 84, 72, 255)); bg.alpha_composite(im)
    g.paste(bg.resize((110, 130), Image.NEAREST).convert('RGB'), (20 + i * 160, 40))
    d.text((20 + i * 160, 8), lbl, font=font, fill=(238, 228, 210))
g.save(os.path.join(OUT, 'hud_glifos_x10.png'))

toast = Image.open(os.path.join(CAP, 'hud_toast.png')).convert('RGBA').resize((480, 270), Image.NEAREST)
clean = Image.open(os.path.join(CAP, 'esc_altillo.png')).convert('RGBA').resize((480, 270), Image.NEAREST)
TBOX = (165, 22, 316, 35)
# escena sin interfaz para tapar la barra vieja: la captura sin luz del altillo
# tiene HUD, así que se toma la franja de una fila más arriba (piso de madera)
clean_noui = clean.copy()
for yy in range(220, 237):
    clean_noui.paste(clean.crop((0, yy - 18, 480, yy - 17)), (0, yy))
tbox = toast.crop(TBOX)


def bar(base):
    """Barra de acciones nueva: [mouse] Usar  [mouse_r] Mirar  [mouse] Mochila, alineada a la derecha."""
    y0, y1 = 220, 237
    bgc = base.getpixel((300, 228))
    segA = base.crop((253, y0, 301, y1))           # glifo + Usar
    mirar = base.crop((375, y0, 406, y1))          # la palabra Mirar
    segC = base.crop((411, y0, 477, y1))           # glifo + Mochila
    gl = base.crop((302, y0, 315, y1))             # caja del glifo viejo (para el fondo)
    glr = Image.new('RGBA', gl.size, bgc)
    glr.alpha_composite(mr, (0, 4))
    parts = [segA, glr, Image.new('RGBA', (3, y1 - y0), bgc), mirar, Image.new('RGBA', (6, y1 - y0), bgc), segC]
    w = sum(p.width for p in parts)
    out = base.copy()
    x = 477 - w
    # la barra vieja era más larga: se tapa con la barra de fondo y se dibuja la
    # nueva (más corta) alineada a la derecha; a la izquierda vuelve la escena.
    out.paste(Image.new('RGBA', (477 - 245, y1 - y0), bgc), (245, y0))
    out.paste(clean_noui.crop((245, y0, x - 6, y1)), (245, y0))
    for p in parts:
        out.paste(p, (x, y0))
        x += p.width
    return out


def x4(im):
    return im.resize((1920, 1080), Image.NEAREST).convert('RGB')


x4(toast).save(os.path.join(OUT, 'hud_hoy.png'))
# A: el aviso baja, centrado, arriba de la barra de acciones y los 8 casilleros
a = clean.copy()
a.paste(tbox, ((480 - tbox.width) // 2, 220 - tbox.height - 3))
x4(bar(a)).save(os.path.join(OUT, 'hud_aviso_A.png'))
# B: el aviso va abajo a la izquierda, apilado hacia arriba (como Stardew)
b = clean.copy()
b.paste(tbox, (6, 252 - tbox.height))
older = tbox.copy()
older.putalpha(150)
b.alpha_composite(older, (6, 252 - 2 * tbox.height - 2))
x4(bar(b)).save(os.path.join(OUT, 'hud_aviso_B.png'))
print('ok')
