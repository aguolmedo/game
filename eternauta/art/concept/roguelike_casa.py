"""La casa como base del roguelike (diseño, NO toca el juego). 22/11.

Cuatro estaciones de mejora, cada una con su gente (docs/roguelike_narrativa.md, "La casa es la base"):
  Favalli  · banco del garaje · el rifle
  Elena    · banco del traje  · el traje
  Lucas    · la radio         · saber qué viene
  El electrógeno (nafta)      · luz y fuego

Se paga con el botín de la calle: chatarra, goma, nafta y piezas de cascarudo.
Reusa el material de los menús de madera (menus_madera.py) y los íconos de roguelike.py.

Salida: art/concept/out/roguelike/casa_*.png
"""
import os

from PIL import Image, ImageDraw, ImageEnhance

import menus_madera as mm
import roguelike as rg

OUT = rg.OUT
hx = rg.hx

# ------------------------------------------------------------------ las mejoras (diseño)
# (id, nombre, efecto en una línea, costo {botín: cantidad})
MEJORAS = {
    'favalli': ('Favalli', 'El rifle', [
        ('cerrojo', 'Cerrojo aceitado', 'Dispara más rápido: un tiro cada 0,45 s en vez de 0,55.', {'chatarra': 4}),
        ('cargador', 'Cargador de ocho', 'Ocho balas por cargador en vez de cinco.', {'chatarra': 6, 'pieza': 1}),
        ('punta', 'Punta de élitro', 'La bala atraviesa a dos cascarudos sin perder fuerza.', {'pieza': 3, 'chatarra': 2}),
    ]),
    'elena': ('Elena', 'El traje', [
        ('capa', 'Doble capa', 'El traje aguanta una mordida más (cuatro parches).', {'goma': 3}),
        ('remiendo', 'Remiendo rápido', 'Ponerse un parche tarda la mitad.', {'goma': 2, 'chatarra': 1}),
        ('hombreras', 'Hombreras de élitro', 'La primera mordida de cada ronda no rompe nada.', {'pieza': 2, 'goma': 2}),
    ]),
    'lucas': ('Lucas', 'La radio', [
        ('antena', 'Antena en el techo', 'Lucas agarra rumores de esta noche. Algunos son ciertos.', {'chatarra': 3}),
        ('valvulas', 'Válvulas nuevas', 'Más frecuencias: sobrevivientes que piden ayuda en la salida.', {'chatarra': 2, 'pieza': 1}),
        ('frecuencia', 'La frecuencia de ellos', 'Una voz que cuenta números. Avisa antes de algo grande.', {'pieza': 3}),
    ]),
    'luz': ('Electrógeno', 'Luz y fuego', [
        ('bengala', 'Bengala', 'Una por salida: los cascarudos se frenan en su luz.', {'nafta': 2}),
        ('molotov', 'Botella de nafta', 'Una por salida: fuego en el piso por unos segundos.', {'nafta': 2, 'chatarra': 1}),
        ('farol', 'Farol de mano', 'Luz alrededor de Juan: de noche se ve más lejos.', {'nafta': 3, 'chatarra': 2}),
    ]),
}

# ------------------------------------------------------------------ íconos de las mejoras (16x16)
I = {  # paleta chica compartida
    'g0': hx('3a3e4a'), 'g1': hx('5c6270'), 'g2': hx('8a90a0'), 'g3': hx('c8ccd4'),
    'w0': hx('4a2e1c'), 'w1': hx('6e4428'), 'w2': hx('8a5a34'), 'w3': hx('b07a48'),
    'oil': hx('d8b040'), 'oil2': hx('f4dc7a'),
    'r0': hx('201a22'), 'r1': hx('342a30'), 'r2': hx('4a3c42'), 'r3': hx('6a5a5c'),
    'e0': hx('0e0c14'), 'e1': hx('1e1c2a'), 'e2': hx('3a3850'), 'ehi': hx('8a90b8'),
    'suit': hx('cfc6ae'), 'suit2': hx('9a927c'), 'suit3': hx('e8e1cc'),
    'fire': hx('ff9a3a'), 'fire2': hx('ffd36a'), 'fire0': hx('c8401e'),
    'glass': hx('9fc8d8'), 'glass2': hx('e6f6fb'),
    'cyan': rg.CONT, 'red': hx('b03a2e'), 'brass': hx('c8a050'), 'brass2': hx('f0d080'),
}


def ic(fn):
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    fn(im, ImageDraw.Draw(im))
    rg.outline(im)
    return im


def i_cerrojo(im, d):
    d.rectangle([1, 7, 12, 9], fill=I['g1'])               # caño/cajón
    d.line([(1, 7), (12, 7)], fill=I['g2'])
    d.rectangle([6, 4, 7, 7], fill=I['g2'])                 # manija del cerrojo
    d.rectangle([5, 3, 8, 4], fill=I['g3'])
    d.point([(13, 8)], fill=I['g0'])
    for (x, y) in ((10, 11), (11, 13), (9, 13)):              # gotas de aceite
        d.point([(x, y)], fill=I['oil'])
    d.point([(10, 10)], fill=I['oil2'])


def i_cargador(im, d):
    d.rectangle([4, 2, 10, 13], fill=I['g1'])
    d.line([(4, 2), (10, 2)], fill=I['g3'])
    d.line([(5, 3), (5, 12)], fill=I['g2'])
    for k in range(4):                                       # balas asomando
        d.rectangle([6 + k % 2 * 2, 1 - (k > 1), 7 + k % 2 * 2, 1 - (k > 1)], fill=I['brass'])
    d.rectangle([7, 0, 8, 1], fill=I['brass2'])
    d.rectangle([11, 9, 13, 13], fill=I['g0'])               # "8" en un costado (marquita)
    d.point([(12, 10), (12, 12)], fill=I['g3'])


def i_punta(im, d):
    d.rectangle([2, 7, 9, 9], fill=I['brass'])               # casquillo
    d.line([(2, 7), (9, 7)], fill=I['brass2'])
    d.polygon([(10, 6), (14, 8), (10, 10)], fill=I['e1'])      # punta de élitro
    d.line([(10, 7), (13, 8)], fill=I['ehi'])
    d.point([(1, 8)], fill=I['w1'])


def i_capa(im, d):
    d.polygon([(3, 2), (12, 2), (13, 12), (8, 14), (2, 12)], fill=I['suit2'])
    d.polygon([(4, 3), (11, 3), (12, 11), (8, 13), (3, 11)], fill=I['suit'])
    d.line([(4, 3), (11, 3)], fill=I['suit3'])
    d.rectangle([5, 6, 10, 9], fill=I['r2'])                 # segunda capa: goma cosida
    for x in range(5, 11, 2):
        d.point([(x, 5), (x, 10)], fill=I['w0'])             # puntadas


def i_remiendo(im, d):
    d.rectangle([3, 4, 12, 12], fill=I['r1'])
    d.rectangle([4, 5, 11, 11], fill=I['r2'])
    d.line([(4, 5), (11, 5)], fill=I['r3'])
    for x in range(4, 12, 2):
        d.point([(x, 3), (x, 13)], fill=I['suit3'])
    d.line([(10, 1), (14, 5)], fill=I['g3'])                 # aguja
    d.point([(14, 6)], fill=I['g2'])


def i_hombreras(im, d):
    d.polygon([(2, 9), (5, 4), (11, 4), (14, 9), (11, 11), (5, 11)], fill=I['e1'])
    d.polygon([(4, 9), (6, 5), (10, 5), (12, 9)], fill=I['e2'])
    d.line([(8, 4), (8, 11)], fill=I['e0'])
    d.line([(6, 5), (7, 5)], fill=I['ehi'])
    d.point([(11, 6)], fill=I['ehi'])
    d.line([(3, 12), (13, 12)], fill=I['suit2'])             # la correa


def i_estatica(im, d):
    d.rectangle([2, 5, 13, 13], fill=I['w1'])                # la radio
    d.rectangle([3, 6, 12, 12], fill=I['w2'])
    d.rectangle([4, 7, 8, 11], fill=I['w0'])                 # parlante
    for y in range(7, 12, 2):
        d.line([(4, y), (8, y)], fill=I['w3'])
    d.point([(11, 8)], fill=I['brass2'])
    d.point([(11, 10)], fill=I['brass'])
    for (x, y) in ((1, 2), (4, 1), (9, 2), (13, 1), (14, 3)):  # estática
        d.point([(x, y)], fill=I['cyan'])


def i_mapa(im, d):
    d.rectangle([1, 2, 14, 13], fill=hx('d8ccac'))
    d.line([(1, 2), (14, 2)], fill=hx('f0e6c8'))
    d.line([(5, 2), (5, 13)], fill=hx('b8aa88'))
    d.line([(10, 2), (10, 13)], fill=hx('b8aa88'))
    d.line([(1, 7), (14, 7)], fill=hx('8a7a60'))             # la calle
    d.line([(7, 2), (7, 13)], fill=hx('8a7a60'))
    d.rectangle([10, 9, 12, 11], fill=I['w2'])               # la mochila marcada
    d.point([(9, 8), (13, 8), (9, 12), (13, 12)], fill=I['cyan'])


def i_antena(im, d):
    """Antena de radioaficionado en el techo: mástil y travesaños (tipo yagi), contra el cielo."""
    d.line([(8, 15), (8, 2)], fill=I['g2'])
    for y, w in ((3, 3), (6, 5), (9, 6)):
        d.line([(8 - w, y), (8 + w, y)], fill=I['g1'])
        d.point([(8 - w, y), (8 + w, y)], fill=I['g3'])
    d.polygon([(1, 15), (8, 11), (15, 15)], fill=I['w1'])   # el techo a dos aguas
    d.line([(1, 15), (8, 11)], fill=I['w3'])
    d.point([(3, 1), (13, 2)], fill=I['cyan'])


def i_valvulas(im, d):
    """Tres válvulas de vidrio con el filamento prendido."""
    for x0, h in ((1, 10), (6, 12), (11, 9)):
        top = 15 - h
        d.rounded_rectangle([x0, top, x0 + 3, 13], 1, fill=I['glass'])
        d.line([(x0, top + 1), (x0, 12)], fill=I['glass2'])
        d.rectangle([x0 + 1, top + 4, x0 + 2, 11], fill=I['fire'])
        d.point([(x0 + 1, top + 5)], fill=I['fire2'])
        d.rectangle([x0, 13, x0 + 3, 14], fill=I['g0'])


def i_frecuencia(im, d):
    d.line([(8, 14), (8, 6)], fill=I['g2'])                  # antena
    d.line([(5, 14), (8, 10), (11, 14)], fill=I['g1'])
    d.point([(8, 5)], fill=I['red'])
    for r, c in ((3, I['cyan']), (5, I['ehi']), (7, I['e2'])):
        d.arc([8 - r, 5 - r, 8 + r, 5 + r], 200, 340, fill=c)


def i_bengala(im, d):
    d.rectangle([6, 7, 9, 14], fill=I['red'])
    d.line([(6, 7), (6, 14)], fill=hx('d86a5a'))
    d.rectangle([6, 6, 9, 6], fill=I['g2'])
    d.polygon([(7, 1), (10, 5), (5, 5)], fill=I['fire'])
    d.point([(7, 3), (7, 4)], fill=I['fire2'])
    d.point([(4, 2), (11, 3), (12, 1)], fill=I['fire2'])


def i_molotov(im, d):
    d.rectangle([5, 6, 10, 14], fill=hx('3a6a4a'))           # botella verde
    d.line([(6, 7), (6, 13)], fill=hx('6aa07a'))
    d.rectangle([7, 3, 8, 6], fill=hx('3a6a4a'))
    d.rectangle([6, 9, 9, 11], fill=hx('d8ccac'))            # etiqueta
    d.line([(8, 1), (9, 3)], fill=hx('e8e1cc'))              # trapo
    d.point([(9, 0), (10, 1)], fill=I['fire'])
    d.point([(10, 0)], fill=I['fire2'])


def i_farol(im, d):
    d.arc([4, 0, 11, 6], 180, 360, fill=I['g1'])             # asa
    d.rectangle([4, 4, 11, 13], fill=I['g0'])
    d.rectangle([5, 5, 10, 12], fill=I['glass'])
    d.rectangle([7, 7, 8, 10], fill=I['fire2'])
    d.point([(7, 8)], fill=hx('fff8e2'))
    d.line([(5, 5), (10, 5)], fill=I['glass2'])
    d.rectangle([3, 13, 12, 14], fill=I['g1'])


ICONOS = {
    'cerrojo': i_cerrojo, 'cargador': i_cargador, 'punta': i_punta,
    'capa': i_capa, 'remiendo': i_remiendo, 'hombreras': i_hombreras,
    'antena': i_antena, 'valvulas': i_valvulas, 'frecuencia': i_frecuencia,
    'bengala': i_bengala, 'molotov': i_molotov, 'farol': i_farol,
}
BOTIN = {'chatarra': rg.icon(rg.chatarra), 'goma': rg.icon(rg.goma), 'nafta': rg.icon(rg.nafta),
         'pieza': rg.icon(rg.pieza_cascarudo)}
TENGO = {'chatarra': 5, 'goma': 3, 'nafta': 1, 'pieza': 2}   # lo que hay en la casa (mock)


def lamina_iconos():
    cv = mm.Canvas(Image.new('RGBA', (mm.W, mm.H), hx('2a2433')))
    y = 14
    for key, (who, what, mejoras) in MEJORAS.items():
        cv.text(14, y + 10, f'{who}', mm.CREAM)
        cv.text(14, y + 22, what, mm.CREAM2)
        for i, (mid, name, desc, cost) in enumerate(mejoras):
            x = 100 + i * 124
            mm.carve(cv, x, y, 36, 36)
            cv.im.alpha_composite(rg.zoom(ic(ICONOS[mid]), 2), (x + 2, y + 2))
            cv.px = cv.im.load()
            lines = mm.wrap(cv, name, 74)
            for j, ln in enumerate(lines):
                cv.text(x + 42, y + 2 + j * 10, ln, mm.CREAM)
            cx = x + 42
            cy = y + 4 + len(lines) * 10
            for b, n in cost.items():
                cv.im.alpha_composite(BOTIN[b], (cx, cy))
                cv.px = cv.im.load()
                cv.text(cx + 16, cy + 4, str(n), mm.CREAM2)
                cx += 26
        y += 62
    return cv.im


# ------------------------------------------------------------------ pantalla del taller
def head(name, k=2):
    spr = Image.open(os.path.join(rg.SPR, 'chars2', name, 'abajo_quieto_1.png')).convert('RGBA')
    return rg.zoom(spr.crop((0, 0, 16, 16)), k)


def taller(estacion='favalli', elegida=1, hechas=1):
    """El cartel de madera de la mochila, pero con las cuatro estaciones como pestañas
    (la cabeza de cada uno), la lista de mejoras de la estación y la ficha de la elegida."""
    cv = mm.Canvas(mm.bg('esc_garage.png'))
    BX, BY, BW, BH = 40, 44, 400, 176
    keys = list(MEJORAS)
    tw, tg = 88, 6
    tx0 = BX + (BW - (4 * tw + 3 * tg)) // 2

    def tab(i, active):
        key = keys[i]
        x = tx0 + i * (tw + tg)
        if active:
            mm.wood(cv, x, BY - 21, tw, 27, seams=0, nails=False, shadow=False, face=mm.FACE_HI)
            cv.rect(x + 4, BY + 2, tw - 8, 4, mm.FACE_HI)
        else:
            mm.wood(cv, x, BY - 18, tw, 24, seams=0, nails=False)
        hy = BY - (19 if active else 16)
        if key == 'luz':
            g = rg.zoom(ic(i_bengala), 1)
            cv.im.alpha_composite(g, (x + 6, hy + 1))
        else:
            cv.im.alpha_composite(head(key, 1), (x + 6, hy + 1))
        cv.px = cv.im.load()
        cv.text(x + 26, hy + 6, MEJORAS[key][0], mm.CREAM if active else mm.CREAM2)

    for i in range(4):
        if keys[i] != estacion:
            tab(i, False)
    mm.wood(cv, BX, BY, BW, BH, seams=20)
    tab(keys.index(estacion), True)

    who, what, mejoras = MEJORAS[estacion]
    # izquierda: las tres mejoras de la estación, en fila (es un camino: se hacen en orden)
    lx, ly = BX + 16, BY + 18
    cv.text(lx, ly, what, mm.CREAM2)
    for i, (mid, name, desc, cost) in enumerate(mejoras):
        y = ly + 14 + i * 30
        mm.carve(cv, lx, y, 168, 26)
        if i == elegida:
            mm.select_bar(cv, lx + 2, y + 2, 165, 23)
        icon = ic(ICONOS[mid])
        if i > hechas:     # bloqueada: se ve apagada
            icon = ImageEnhance.Brightness(ImageEnhance.Color(icon).enhance(0.2)).enhance(0.55)
        cv.im.alpha_composite(icon, (lx + 5, y + 5))
        cv.px = cv.im.load()
        col = mm.CREAM if i <= hechas else mm.CREAM2
        cv.text(lx + 26, y + 9, name, col)
        if i < hechas:
            for (cx_, cy_) in ((156, 13), (157, 14), (158, 15), (159, 14), (160, 13), (161, 12), (162, 11)):
                cv.rect(lx + cx_, y + cy_, 1, 2, mm.OKC)      # tilde verde: hecho
        elif i > hechas:
            for k in range(3):   # candadito tallado
                cv.rect(lx + 156, y + 12, 6, 5, mm.CARVE_D)
            cv.rect(lx + 157, y + 9, 4, 3, mm.CARVE_D)
            cv.rect(lx + 158, y + 10, 2, 2, mm.CARVE)
    # derecha: ficha de la elegida
    mid, name, desc, cost = mejoras[elegida]
    fx, fy = BX + 200, BY + 18
    fw = BX + BW - 18 - fx
    mm.carve(cv, fx, fy, 38, 38)
    cv.im.alpha_composite(rg.zoom(ic(ICONOS[mid]), 2), (fx + 3, fy + 3))
    cv.px = cv.im.load()
    cv.text(fx + 46, fy + 6, name, mm.CREAM)
    cv.text(fx + 46, fy + 18, f'{who}, {what.lower()}', mm.AM3)
    for j, line in enumerate(mm.wrap(cv, desc, fw)):
        cv.text(fx, fy + 48 + j * 11, line, mm.CREAM2)
    # lo que cuesta, con lo que hay en la casa
    cy = fy + 78
    cv.rect(fx, cy, fw, 1, mm.SEAM)
    cv.text(fx, cy + 6, 'Con lo que trajiste de afuera', mm.CREAM2)
    can = True
    for j, (b, n) in enumerate(cost.items()):
        x = fx + j * 100
        mm.carve(cv, x, cy + 18, 18, 18)
        cv.im.alpha_composite(BOTIN[b], (x + 1, cy + 19))
        cv.px = cv.im.load()
        have = TENGO[b]
        ok = have >= n
        can = can and ok
        cv.text(x + 24, cy + 24, f'{have}/{n}', mm.OKC if ok else mm.FALTA)
    # botón
    bw = 96
    bx, by = fx + (fw - bw) // 2, BY + BH - 30
    mm.wood(cv, bx, by, bw, 20, seams=0, nails=False, face=mm.W2 if can else mm.W1)
    cv.ctext(bx + bw // 2, by + 7, 'Hacer' if can else 'Falta botín', mm.CREAM if can else mm.CREAM2)
    mm.prompts(cv, [('key_q', 'Estación'), ('mouse', 'Hacer'), ('key_esc', '  Cerrar')], BX + BW, BY + BH + 12)
    return cv.im


# ------------------------------------------------------------------ el garaje como base
def garaje_base():
    """La captura del garaje (mundo ×6) con cada uno en su estación y su cartelito."""
    im = Image.open(os.path.join(mm.CAPS, 'esc_garage.png')).convert('RGBA')
    k = 6

    def put(sprite, x, y):
        im.alpha_composite(rg.zoom(sprite, k), (x, y))

    spr = lambda n, v='abajo': Image.open(os.path.join(rg.SPR, 'chars2', n, f'{v}_quieto_1.png')).convert('RGBA')
    put(spr('favalli'), 296, 398)                 # detrás del banco de herramientas
    put(spr('elena'), 1146, 450)                  # al lado del traje colgado
    radio = Image.open(os.path.join(rg.SPR, 'objects', 'radio.png')).convert('RGBA')
    put(radio, 1640, 330)                         # la radio sobre la caja
    put(spr('lucas', 'derecha'), 1544, 420)
    # tapo el objetivo viejo con el de la salida
    d = ImageDraw.Draw(im)
    d.rectangle([24, 20, 1252, 78], fill=(20, 16, 26, 255))
    ui = Image.new('RGBA', (480, 270), (0, 0, 0, 0))
    cv = mm.Canvas(ui)
    cv.rect(10, 9, 4, 4, mm.AM3)
    cv.text(18, 8, 'Objetivo: Volvé a salir. La mochila de otra vez quedó en la calle.', mm.CREAM, shadow=hx('0a0810'))
    # cartelitos de madera de cada estación (en px de UI)
    for (x, y, t) in ((52, 198, 'Favalli: el rifle'), (270, 98, 'Elena: el traje'),
                      (368, 156, 'Lucas: la radio'), (320, 176, 'Electrógeno: luz')):
        w = cv.measure(t) + 12
        mm.wood(cv, x, y, w, 15, seams=0, nails=False)
        cv.text(x + 6, y + 5, t, mm.CREAM)
    im.alpha_composite(cv.im.resize((1920, 1080), Image.NEAREST))
    return im


if __name__ == '__main__':
    for mid, fn in ICONOS.items():
        ic(fn).save(os.path.join(OUT, f'mejora_{mid}.png'))
    rg.zoom(lamina_iconos(), 4).save(os.path.join(OUT, 'casa_mejoras.png'))
    for est, el, he in (('favalli', 1, 1), ('elena', 0, 0), ('lucas', 2, 1), ('luz', 0, 0)):
        rg.zoom(taller(est, el, he), 4).save(os.path.join(OUT, f'casa_taller_{est}.png'))
    garaje_base().save(os.path.join(OUT, 'casa_garaje.png'))
    print('ok')
