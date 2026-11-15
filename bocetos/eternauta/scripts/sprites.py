from PIL import Image
from lib import Canvas, C, draw_text, text_width, blit_grid, grid_to_image, shadow, snowfall, OUTDIR
from chars import CHARS

for name, fr, cmap in CHARS:
    for g in fr:
        assert len(g) == 32, (name, len(g))
        for j, r in enumerate(g):
            assert len(r) == 16, (name, j, r, len(r))
            for ch in r:
                assert ch in '. ' or ch in cmap, (name, ch)

cv = Canvas(bg=C['G1'])
# fondo neutro con damero suave de 16px
for y in range(0, 180, 16):
    for x in range(0, 320, 16):
        if (x // 16 + y // 16) % 2 == 0:
            cv.rect(x, y, 16, 16, '#30334a')

title = "PERSONAJES - EL ETERNAUTA"
cv.rect(0, 0, 320, 14, 'N1')
cv.hline(0, 319, 14, 'V2')
draw_text(cv, (320 - text_width(title)) // 2, 4, title, 'SN3', shadow='N0', glow='cold')

COLW = 320 // 3
for idx, (name, fr, cmap) in enumerate(CHARS):
    col, row = idx % 3, idx // 3
    cx = col * COLW + COLW // 2
    top = 32 + row * 76
    # panel
    cv.rect(cx - 34, top - 4, 68, 46, 'N2')
    cv.frame(cx - 34, top - 4, 68, 46, 'V2')
    cv.hline(cx - 33, cx + 32, top - 3, 'V1')
    for k, g in enumerate(fr):
        x = cx - 19 + k * 22
        y = top + 4
        shadow(cv, x + 8, y + 30, 6, 2.2, 0.8)
        blit_grid(cv, g, cmap, x, y)
    # etiquetas de frame
    draw_text(cv, cx - 34 + 3, top - 1, "1", 'G3')
    draw_text(cv, cx + 34 - 7, top - 1, "2", 'G3')
    lw = text_width(name)
    cv.rect(cx - lw // 2 - 3, top + 46, lw + 6, 11, 'N1')
    cv.frame(cx - lw // 2 - 3, top + 46, lw + 6, 11, 'V2')
    draw_text(cv, cx - lw // 2, top + 48, name, 'AM3', shadow='AM0')

cv.apply_glow()
cv.save('sprites')

# tira limpia con transparencia (16x32 por celda) para el juego / LibreSprite
strip = Image.new('RGBA', (16 * 2, 32 * len(CHARS)), (0, 0, 0, 0))
for i, (name, fr, cmap) in enumerate(CHARS):
    for k, g in enumerate(fr):
        strip.paste(grid_to_image(g, cmap), (k * 16, i * 32))
strip.save(f"{OUTDIR}/sprites_tira_1x.png")
print("ok")
