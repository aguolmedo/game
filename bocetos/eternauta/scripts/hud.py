"""Cajas estilo Stardew: borde de madera y pergamino."""


def wood_box(cv, x, y, w, h, fill='PAR', fill2='PAR2'):
    corners = [(x, y), (x + w - 1, y), (x, y + h - 1), (x + w - 1, y + h - 1)]
    saved = [cv.get(cx, cy) for cx, cy in corners]
    # sombra suave debajo
    cv.hline(x + 2, x + w - 1, y + h, 'N0', 0.5)
    cv.vline(x + w, y + 2, y + h, 'N0', 0.5)
    cv.rect(x, y, w, h, 'WD0')
    cv.rect(x + 1, y + 1, w - 2, h - 2, 'WD2')
    cv.hline(x + 1, x + w - 2, y + 1, 'WD3')
    cv.vline(x + 1, y + 1, y + h - 2, 'WD3')
    cv.hline(x + 2, x + w - 2, y + h - 2, 'WD1')
    cv.vline(x + w - 2, y + 2, y + h - 2, 'WD1')
    # vetas de madera
    for i in range(x + 5, x + w - 5, 9):
        cv.p(i, y + 1, 'WD2')
        cv.p(i + 4, y + h - 2, 'WD0')
    cv.rect(x + 3, y + 3, w - 6, h - 6, 'WD0')
    cv.rect(x + 4, y + 4, w - 8, h - 8, fill)
    cv.hline(x + 4, x + w - 5, y + 4, fill2)
    cv.vline(x + 4, y + 4, y + h - 5, fill2)
    for (cx, cy), c in zip(corners, saved):
        cv.p(cx, cy, c)
    # remaches en esquinas
    for (cx, cy) in ((x + 2, y + 2), (x + w - 3, y + 2), (x + 2, y + h - 3), (x + w - 3, y + h - 3)):
        cv.p(cx, cy, 'AM3')
    return (x + 4, y + 4, w - 8, h - 8)
