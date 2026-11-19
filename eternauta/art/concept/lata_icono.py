# Ícono de inventario de la lata (16x16), a la escala de los otros ítems del traje.
# Uso: python3 art/concept/lata_icono.py [salida.png] [verde]
import sys
from PIL import Image
OUT = (38, 34, 46)
T_HI, T_MID, T_DK, T_IN = (216, 224, 230), (154, 164, 176), (106, 115, 128), (84, 92, 106)
LABEL = {'rojo': ((200, 80, 72), (168, 58, 58), (122, 38, 48)),
         'verde': ((96, 156, 104), (62, 122, 76), (38, 84, 56))}
CREAM = (244, 238, 224)

def lata(color='rojo'):
    L_HI, L_MID, L_DK = LABEL[color]
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = im.load()
    def p(x, y, c): px[x, y] = c + (255,)
    x0, x1 = 3, 12              # cuerpo x 3..12 (10 px)
    # tapa elíptica (filas 2..4)
    for x in range(x0 + 2, x1 - 1): p(x, 1, OUT)
    p(x0 + 1, 2, OUT); p(x1 - 1, 2, OUT)
    for x in range(x0 + 2, x1 - 1): p(x, 2, T_HI)
    p(x0, 3, OUT); p(x1, 3, OUT)
    p(x0 + 1, 3, T_HI)
    for x in range(x0 + 2, x1 - 1): p(x, 3, T_IN)          # hueco de la tapa
    p(x1 - 1, 3, T_MID)
    p(x0, 4, OUT); p(x1, 4, OUT)
    for x in range(x0 + 1, x1): p(x, 4, T_MID if x < x1 - 2 else T_DK)
    # cuerpo (filas 5..13)
    for y in range(5, 14):
        p(x0, y, OUT); p(x1, y, OUT)
        for x in range(x0 + 1, x1):
            if y in (5, 13):            # rebordes de lata
                c = T_HI if x <= x0 + 2 else (T_DK if x >= x1 - 2 else T_MID)
            elif y in (6, 12):          # filete de la etiqueta
                c = L_DK
            else:
                c = L_HI if x <= x0 + 2 else (L_DK if x >= x1 - 2 else L_MID)
            p(x, y, c)
    for x in range(x0 + 2, x1 - 1):                       # franja crema con su sombra
        p(x, 9, CREAM)
        p(x, 10, L_DK if x > x0 + 2 else L_MID)
    # fondo elíptico
    p(x0, 14, OUT); p(x1, 14, OUT)
    for x in range(x0 + 1, x1): p(x, 14, T_DK)
    for x in range(x0 + 1, x1): p(x, 15, OUT)
    p(x0, 14, (0, 0, 0)); px[x0, 14] = (0, 0, 0, 0); px[x1, 14] = (0, 0, 0, 0)
    p(x0 + 1, 14, OUT); p(x1 - 1, 14, OUT)
    px[x0 + 1, 15] = (0, 0, 0, 0); px[x1 - 1, 15] = (0, 0, 0, 0)
    return im

if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else 'lata.png'
    lata(sys.argv[2] if len(sys.argv) > 2 else 'rojo').save(out)
