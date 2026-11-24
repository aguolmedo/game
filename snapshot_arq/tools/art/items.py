"""Iconos de items 16x16 y atlas 1x, mismo estilo que los personajes.

Ids exactos del contrato v3: tela, guantes, botas, casco, tiras, oxigeno,
traje, rifle. Materiales del comic: tela engomada, goma, casco de buzo con
visor circular, tiras de goma, cilindro de oxigeno y rifle de los anos 50.
"""
from pixel import Pix, hx, mix

# ---- paleta de objetos (3-4 tonos por material)
CANVAS = hx('#a89060'); CANVAS2 = hx('#7a6440'); CANVAS3 = hx('#c8b078'); CANVAS4 = hx('#5a4230')
RUB = hx('#c9a24a'); RUB2 = hx('#8a6a30'); RUB3 = hx('#e8c878'); RUB4 = hx('#5e4620')
BOOT = hx('#4a5a3a'); BOOT2 = hx('#303d28'); BOOT3 = hx('#6a7a4e'); SOLE = hx('#26261e')
MET = hx('#8a96a0'); MET2 = hx('#5c6672'); MET3 = hx('#b4c0c6'); MET4 = hx('#3b4350')
GLS = hx('#2f7088'); GLS2 = hx('#bdeffa'); GLS3 = hx('#1f4a60')
RUBR = hx('#4a4a52'); RUBR2 = hx('#31313a'); RUBR3 = hx('#6a6a74'); RUBR4 = hx('#1f1f26')
OXY = hx('#4e6a5c'); OXY2 = hx('#33483e'); OXY3 = hx('#6e8e7a'); OXY4 = hx('#263630')
LABEL = hx('#d8d0b0'); LABEL2 = hx('#9a9278')
SUIT = hx('#7a7150'); SUIT2 = hx('#554d34'); SUIT3 = hx('#a09868'); SUIT4 = hx('#3a3524')
GLOVE = hx('#3d3a30'); GLOVE2 = hx('#28261e')
WOOD = hx('#8a5a30'); WOOD2 = hx('#5a3a20'); WOOD3 = hx('#b8804a')
BAR = hx('#5c6672'); BAR2 = hx('#343a44'); BAR3 = hx('#8a96a0')
SKIN = hx('#b97a62'); DARK = hx('#141018')

NAMES = ['tela', 'guantes', 'botas', 'casco', 'tiras', 'oxigeno', 'traje', 'rifle']


def icon_tela():
    """Rollo de tela encerada, con el extremo enrollado a la vista."""
    p = Pix(16, 16)
    # cuerpo del rollo, esquinas redondeadas
    for y in range(4, 12):
        x0, x1 = (4, 12) if y in (4, 11) else (3, 13)
        p.hline(x0, x1, y, CANVAS)
    # luz arriba-izquierda y sombra abajo-derecha
    p.hline(5, 11, 4, CANVAS3)
    p.vline(3, 5, 10, CANVAS3)
    p.hline(4, 12, 11, CANVAS2)
    p.vline(13, 5, 10, CANVAS2)
    # extremo enrollado (espiral)
    p.ellipse(4.4, 8, 2.3, 3.4, CANVAS3)
    p.ellipse(4.4, 8, 1.5, 2.5, CANVAS)
    p.ellipse(4.4, 8, 0.7, 1.3, CANVAS2)
    p.set(3, 6, CANVAS3)
    # pliegues sueltos del paño
    p.hline(6, 9, 6, CANVAS2)
    p.hline(8, 12, 9, CANVAS2)
    p.set(10, 6, CANVAS3)
    # correa que ata el rollo, con hebilla
    p.rect(7, 3, 2, 10, CANVAS4)
    p.set(7, 3, CANVAS2)
    p.rect(7, 7, 2, 2, CANVAS3)
    p.set(7, 7, LABEL)
    # brillo de la cera
    p.set(11, 5, CANVAS3)
    p.set(12, 6, CANVAS3)
    return p


def icon_guantes():
    """Un guante de goma grueso, con cuatro dedos y puno ancho."""
    p = Pix(16, 16)
    # dedos (bloque con puntas redondeadas)
    for y in range(2, 10):
        x0, x1 = (5, 11) if y == 2 else (4, 11)
        p.hline(x0, x1, y, RUB)
    # separaciones entre dedos
    for x in (6, 8, 10):
        p.vline(x, 2, 5, RUB2)
    # pulgar
    p.rect(2, 6, 2, 3, RUB)
    p.set(2, 6, RUB3)
    p.set(3, 8, RUB2)
    # luz y sombra de la palma
    p.hline(5, 7, 3, RUB3)
    p.vline(4, 4, 8, RUB3)
    p.vline(11, 3, 9, RUB2)
    p.hline(5, 10, 9, RUB2)
    # puno de goma
    p.rect(3, 10, 10, 3, RUB2)
    p.hline(3, 12, 10, RUB3)
    p.hline(3, 12, 12, RUB4)
    p.set(3, 11, RUB3)
    # brillo
    p.set(5, 5, RUB3)
    p.set(5, 6, RUB3)
    return p


def icon_botas():
    """Par de botas de goma, cana alta y suela gruesa."""
    p = Pix(16, 16)
    for ox in (2, 9):
        # cana
        p.rect(ox + 1, 3, 4, 8, BOOT)
        p.set(ox + 1, 3, BOOT3)
        p.set(ox + 4, 3, BOOT2)
        p.vline(ox + 1, 4, 10, BOOT3)
        p.vline(ox + 4, 4, 10, BOOT2)
        # borde doblado de la cana
        p.hline(ox + 1, ox + 4, 3, BOOT3)
        p.hline(ox + 1, ox + 4, 4, BOOT2)
        # pie y puntera
        p.rect(ox, 10, 5, 3, BOOT)
        p.set(ox, 10, BOOT3)
        p.set(ox + 4, 10, BOOT2)
        p.hline(ox, ox + 4, 12, BOOT2)
        # suela
        p.rect(ox - 1, 13, 7, 2, SOLE)
        p.set(ox - 1, 13, hx('#3a3a2c'))
        p.set(ox + 5, 13, SOLE)
        # cordones
        p.set(ox + 2, 6, BOOT3)
        p.set(ox + 3, 7, BOOT3)
        p.set(ox + 2, 8, BOOT3)
    return p


def icon_casco():
    """Casco de buzo: domo redondo, visor circular y filtro oscuro redondo."""
    p = Pix(16, 16)
    p.circle(8, 7, 6.6, MET2)
    p.circle(8, 7, 5.9, MET)
    # visor de vidrio
    p.circle(8, 7, 4.8, GLS)
    p.circle(8, 7, 4.1, GLS3)
    p.circle(8, 7, 3.7, GLS)
    # cara de Juan dentro del visor
    for y, x0, x1 in ((4, 6, 9), (5, 5, 10), (6, 5, 10),
                      (7, 5, 10), (8, 5, 10), (9, 6, 9)):
        band_y = y
        for x in range(x0, x1 + 1):
            p.set(x, band_y, mix(SKIN, GLS3, 0.34))
    p.rect(5, 6, 2, 2, mix(hx('#1a1426'), GLS3, 0.25))
    p.rect(9, 6, 2, 2, mix(hx('#1a1426'), GLS3, 0.25))
    p.set(5, 6, GLS2)
    p.set(9, 6, GLS2)
    p.set(7, 8, mix(hx('#7e4c44'), GLS3, 0.3))
    # brillo del vidrio
    p.set(4, 4, GLS2)
    p.set(3, 5, GLS2)
    p.set(3, 6, mix(GLS2, GLS3, 0.4))
    # aro metalico del visor
    for a in range(-6, 7):
        for b in range(-6, 7):
            rr = (a * a + b * b) ** 0.5
            if 4.8 < rr <= 5.5:
                p.set(int(8 + a), int(7 + b), MET3 if a + b < 0 else MET4)
    # pernos del domo
    p.set(2, 7, MET3); p.set(13, 7, MET4)
    p.set(8, 1, MET3)
    # collar metalico
    p.rect(3, 13, 10, 2, MET2)
    p.hline(4, 11, 13, MET3)
    p.set(3, 14, MET4); p.set(12, 14, MET4)
    # filtro redondo oscuro delante de la boca, con aro metalico
    p.circle(8, 11.2, 2.6, MET2)
    p.circle(8, 11.2, 2.1, hx('#1a1a22'))
    p.circle(8, 11.2, 1.0, hx('#2a2a34'))
    p.set(6, 10, MET3)
    p.set(5, 11, MET3)
    # conector y manguera corta hacia el costado
    p.set(10, 12, MET2)
    p.set(11, 13, MET2)
    p.set(11, 14, hx('#22283a'))
    return p


def icon_tiras():
    """Rollo de tiras de goma, con una punta suelta."""
    p = Pix(16, 16)
    # bobina (dona) de goma
    p.circle(7.4, 8, 6.2, RUBR2)
    p.circle(7.4, 8, 5.4, RUBR)
    p.circle(7.4, 8, 3.4, RUBR3)
    p.circle(7.4, 8, 3.0, RUBR2)
    p.circle(7.4, 8, 2.2, RUBR4)
    # vueltas de la bobina
    for a in range(-6, 7):
        for b in range(-6, 7):
            rr = (a * a + b * b) ** 0.5
            if 4.2 < rr <= 4.8 and a + b < 0:
                p.set(int(7.4 + a), int(8 + b), RUBR3)
            if 5.6 < rr <= 6.1 and a + b > 0:
                p.set(int(7.4 + a), int(8 + b), RUBR2)
    # tira suelta que sale por arriba a la derecha
    for i in range(4):
        p.set(11 + i, 5 - i, RUBR)
        p.set(11 + i, 6 - i, RUBR2)
    p.set(12, 4, RUBR3)
    p.set(14, 1, RUBR2)
    # segunda punta abajo a la izquierda
    for i in range(3):
        p.set(3 + i, 12 - i, RUBR)
        p.set(3 + i, 13 - i, RUBR2)
    p.set(3, 12, RUBR3)
    return p


def icon_oxigeno():
    """Cilindro de oxigeno verde, con valvula y etiqueta."""
    p = Pix(16, 16)
    # cuerpo redondeado
    p.rect(4, 3, 8, 11, OXY)
    p.set(4, 3, OXY2); p.set(11, 3, OXY2)
    p.set(5, 2, OXY); p.set(10, 2, OXY)
    p.hline(5, 10, 2, OXY)
    # luz y sombra
    p.vline(4, 3, 13, OXY3)
    p.vline(5, 4, 13, OXY3)
    p.vline(11, 4, 13, OXY2)
    p.hline(4, 11, 13, OXY2)
    # base
    p.rect(3, 14, 10, 1, OXY4)
    p.set(3, 13, OXY2)
    # hombro y valvula
    p.hline(5, 10, 3, OXY2)
    p.rect(7, 0, 2, 2, MET2)
    p.set(7, 0, MET3)
    p.rect(6, 1, 4, 1, MET2)
    p.set(6, 1, MET3)
    # etiqueta clara con "O2"
    p.rect(4, 7, 8, 3, LABEL)
    p.rect(4, 9, 8, 1, LABEL2)
    # O
    for x, y in ((5, 7), (6, 7), (7, 7), (5, 8), (7, 8), (5, 9), (6, 9), (7, 9)):
        p.set(x, y, OXY4)
    # 2
    for x, y in ((9, 7), (10, 7), (10, 8), (9, 9), (10, 9)):
        p.set(x, y, OXY4)
    return p


def icon_traje():
    """Traje doblado con el casco de buzo apoyado encima."""
    p = Pix(16, 16)
    # casco pequeno arriba
    p.circle(8, 4, 3.8, MET2)
    p.circle(8, 4, 3.2, MET)
    p.circle(8, 4, 2.0, GLS)
    p.circle(7.7, 3.8, 1.3, GLS3)
    p.set(6, 2, GLS2)
    p.set(5, 3, GLS2)
    # collar del casco
    p.rect(5, 7, 6, 1, MET2)
    # cuerpo doblado del traje
    p.rect(3, 8, 10, 3, SUIT)
    p.rect(2, 11, 12, 3, SUIT)
    p.set(3, 8, SUIT3); p.set(2, 11, SUIT3)
    p.set(12, 8, SUIT2); p.set(13, 11, SUIT2)
    # pliegues gruesos
    p.vline(5, 8, 13, SUIT2)
    p.vline(8, 8, 13, SUIT2)
    p.vline(11, 8, 13, SUIT2)
    p.hline(4, 7, 8, SUIT3)
    p.hline(3, 12, 13, SUIT2)
    # cinturon
    p.rect(2, 11, 12, 1, SUIT4)
    p.set(7, 11, MET2); p.set(8, 11, MET3)
    # guantes a los costados
    p.rect(1, 10, 2, 2, GLOVE)
    p.rect(13, 10, 2, 2, GLOVE)
    p.set(1, 10, hx('#5c5646'))
    p.set(13, 10, GLOVE2)
    return p


def icon_rifle():
    """Rifle de los anos 50: culata de madera y canon metalico en diagonal."""
    p = Pix(16, 16)
    # culata y cuerpo de madera (abajo a la izquierda)
    p.rect(1, 12, 3, 3, WOOD)
    p.set(1, 12, WOOD3)
    p.set(2, 14, WOOD2)
    p.set(3, 14, WOOD2)
    p.rect(3, 11, 2, 3, WOOD)
    p.set(3, 11, WOOD3)
    p.rect(4, 10, 2, 2, WOOD)
    p.set(4, 10, WOOD3)
    # empunadura y guardamonte
    p.rect(5, 9, 2, 3, WOOD2)
    p.set(5, 9, WOOD)
    p.set(6, 11, WOOD2)
    p.set(7, 11, WOOD2)
    # recamara metalica
    p.rect(6, 8, 3, 3, BAR)
    p.set(6, 8, BAR3)
    p.set(8, 10, BAR2)
    # cerrojo
    p.set(9, 9, BAR3)
    p.set(9, 10, BAR2)
    p.set(10, 10, BAR2)
    # canon en diagonal hacia arriba a la derecha
    for i in range(6):
        p.set(9 + i, 8 - i, BAR3)
        p.set(9 + i, 9 - i, BAR2)
    p.set(14, 2, BAR3)
    p.set(14, 3, BAR2)
    p.set(13, 2, BAR2)
    # correa de cuero
    p.set(4, 13, WOOD2)
    p.set(5, 12, WOOD2)
    p.set(6, 12, WOOD2)
    return p


DRAW = {
    'tela': icon_tela, 'guantes': icon_guantes, 'botas': icon_botas,
    'casco': icon_casco, 'tiras': icon_tiras, 'oxigeno': icon_oxigeno,
    'traje': icon_traje, 'rifle': icon_rifle,
}


def build_atlas():
    atlas = Pix(16 * len(NAMES), 16)
    for i, name in enumerate(NAMES):
        icon = DRAW[name]()
        icon.outline(strength=0.55, dark=0.3)
        atlas.paste(icon, i * 16, 0)
    return atlas


def build_json():
    return [{'id': name, 'x': i * 16, 'y': 0, 'w': 16, 'h': 16}
            for i, name in enumerate(NAMES)]


def preview(path, scale=8):
    from PIL import Image
    atlas = build_atlas()
    bg = Image.new('RGBA', atlas.img.size, (36, 40, 60, 255))
    bg.alpha_composite(atlas.img)
    bg.resize((atlas.w * scale, atlas.h * scale), 0).save(path)
