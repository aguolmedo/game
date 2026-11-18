"""Ventanas (diseño, no toca el juego). Pedido 18/11: "los marcos de las ventanas son feos".
Hoy (window_glow 32x32): marco marrón liso de 4 px por lado + travesaño de 4 px:
parece un cajón con cuatro vidrios chicos, sin volumen.
Propuestas (32x32, misma huella que window_glow):
  A · madera fina: marco de 2 px con bisel (luz arriba-izq, sombra abajo-der), cruz de
      1 px, alféizar que sobresale con sombra, reflejo en diagonal en el vidrio.
  B · pintada + cortinas: el mismo marco pintado crema (como los marcos de los chalets
      de afuera) y cortinas a los costados.
Salida: out/ventana_A.png, out/ventana_B.png, out/ventanas_x8.png, out/ventanas_living.png
"""
import os

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(HERE, 'out')

INK = (42, 29, 31)
GLASS = [(238, 250, 255), (200, 226, 238), (159, 191, 212), (120, 150, 176)]   # nieve de afuera
REFL = (255, 255, 255)


def window(frame_light, frame_base, frame_dark, curtains=None):
    im = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    px = im.load()
    x0, y0, x1, y1 = 3, 2, 28, 25          # marco exterior (inclusive)
    # contorno
    for x in range(x0, x1 + 1):
        px[x, y0] = px[x, y1] = INK + (255,)
    for y in range(y0, y1 + 1):
        px[x0, y] = px[x1, y] = INK + (255,)
    # marco de 2 px con bisel
    for y in range(y0 + 1, y1):
        for x in range(x0 + 1, x1):
            edge = min(x - x0, x1 - x, y - y0, y1 - y)
            if edge <= 2:
                top_left = (y - y0 <= 2 and x - x0 > 0) or (x - x0 <= 2)
                bot_right = (y1 - y <= 2) or (x1 - x <= 2)
                c = frame_light if top_left and not bot_right else (frame_dark if bot_right else frame_base)
                if edge == 2:
                    c = frame_dark if top_left else frame_light   # canto interior invertido
                px[x, y] = c + (255,)
    # vidrio: gradiente de la nevada + reflejo en diagonal
    gx0, gy0, gx1, gy1 = x0 + 3, y0 + 3, x1 - 3, y1 - 3
    for y in range(gy0, gy1 + 1):
        band = GLASS[min(3, (y - gy0) * 4 // (gy1 - gy0 + 1))]
        for x in range(gx0, gx1 + 1):
            px[x, y] = band + (255,)
    for k in range(0, 9):
        for (dx, dy) in ((k, -k), (k + 1, -k)):
            X, Y = gx0 + 2 + dx, gy0 + 9 + dy
            if gx0 <= X <= gx1 and gy0 <= Y <= gy1:
                px[X, Y] = REFL + (255,)
    for (fx, fy) in ((gx0 + 14, gy0 + 3), (gx0 + 5, gy0 + 13), (gx0 + 16, gy0 + 12)):
        px[fx, fy] = REFL + (255,)
    # cruz de 1 px (parante y travesaño)
    mx, my = (gx0 + gx1) // 2, (gy0 + gy1) // 2
    for y in range(gy0, gy1 + 1):
        px[mx, y] = frame_base + (255,)
    for x in range(gx0, gx1 + 1):
        px[x, my] = frame_base + (255,)
    px[mx, my] = frame_light + (255,)
    # alféizar que sobresale + sombra en la pared
    for x in range(x0 - 2, x1 + 3):
        px[x, y1 + 1] = INK + (255,)
        px[x, y1 + 2] = frame_light + (255,)
        px[x, y1 + 3] = frame_base + (255,)
        px[x, y1 + 4] = INK + (255,)
    for x in range(x0 - 1, x1 + 2):
        px[x, y1 + 5] = (0, 0, 0, 70)
    if curtains:
        cl, cb, cd = curtains
        for y in range(y0 - 1, y1 + 2):
            w = 4 if y < y0 + 4 else (5 if y < y1 - 6 else 6)      # la cortina se abre abajo
            for i in range(w):
                c = cl if i == 1 else (cd if i == w - 1 else cb)
                if (y + i) % 5 == 0 and 0 < i < w - 1:
                    c = cd                                       # pliegues
                px[x0 - 2 + i, y] = c + (255,)
                px[x1 + 2 - i, y] = c + (255,)
            px[x0 - 3, y] = INK + (255,)
            px[x1 + 3, y] = INK + (255,)
        for x in range(x0 - 3, x1 + 4):                          # barral
            px[x, y0 - 2] = INK + (255,)
            px[x, y0 - 1] = (110, 84, 60, 255) if x not in (x0 - 3, x1 + 3) else INK + (255,)
    return im


WOOD = ((176, 124, 70), (138, 90, 52), (94, 58, 36))
CREAM = ((244, 240, 228), (220, 212, 192), (168, 156, 132))
CURT = ((214, 120, 110), (176, 78, 74), (120, 46, 50))

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    A = window(*WOOD)
    B = window(*CREAM, curtains=CURT)
    A.save(os.path.join(OUT, 'ventana_A.png'))
    B.save(os.path.join(OUT, 'ventana_B.png'))
    hoy = Image.open(os.path.join(ROOT, 'art', 'sprites', 'objects', 'window_glow.png')).convert('RGBA')
    font = ImageFont.truetype('/usr/share/fonts/noto/NotoSans-Regular.ttf', 24)
    K = 8
    lam = Image.new('RGB', (3 * (34 * K + 30) + 30, 34 * K + 60), (27, 22, 30))
    d = ImageDraw.Draw(lam)
    for i, (lbl, im) in enumerate((('hoy', hoy), ('A · madera fina', A), ('B · pintada + cortinas', B))):
        bg = Image.new('RGBA', (34, 34), (214, 206, 186, 255))
        bg.alpha_composite(im, (1, 1))
        lam.paste(bg.resize((34 * K, 34 * K), Image.NEAREST).convert('RGB'), (20 + i * (34 * K + 30), 46))
        d.text((20 + i * (34 * K + 30), 10), lbl, font=font, fill=(238, 228, 210))
    lam.save(os.path.join(OUT, 'ventanas_x8.png'))
    # en el living (captura sin luz ni zoom): window_living = put(96, base 48) -> pantalla +16,+7
    cap = Image.open(os.path.join(ROOT, 'art', 'direccion', 'doc', 'capturas', 'raw_house_full.png')).convert('RGBA').resize((480, 270), Image.NEAREST)
    crop = (60, 8, 260, 120)
    rows = []
    for im in (None, A, B):
        c = cap.copy()
        if im is not None:
            wall = c.crop((112 + 40, 23, 112 + 72, 55))          # pared limpia de al lado
            c.paste(wall, (112, 23))
            c.alpha_composite(im, (112, 23))
        rows.append(c.crop(crop).resize(((crop[2] - crop[0]) * 4, (crop[3] - crop[1]) * 4), Image.NEAREST).convert('RGB'))
    out = Image.new('RGB', (rows[0].width * 3 + 40, rows[0].height), (17, 14, 20))
    for i, r in enumerate(rows):
        out.paste(r, (i * (r.width + 20), 0))
    out.save(os.path.join(OUT, 'ventanas_living.png'))
    print('ok')
