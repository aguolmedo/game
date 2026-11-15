import random
import math
from lib import Canvas, C, draw_text, text_width, snowfall, snow_ground, shadow, blit_grid
from chars import suit_grid, suit_map
from hud import wood_box

cv = Canvas(bg=C['N1'])
rnd = random.Random(21)

Y_FENCE, Y_WALK, Y_CURB, Y_STREET, Y_CURB2, Y_WALK2 = 58, 62, 84, 88, 148, 152

# ------------------------------------------------ suelo
# jardines (nieve mas profunda, sombras)
snow_ground(cv, 0, 0, 320, Y_WALK, seed=1, levels=('N4', 'SN0', 'SN1', 'SN2'), cuts=(0.2, 0.5, 0.86),  cell=12, bias=0.05)
# vereda: nieve + juntas de baldosa insinuadas
snow_ground(cv, 0, Y_WALK, 320, Y_CURB - Y_WALK, seed=2, levels=('N4', 'SN0', 'SN1', 'SN2'), cuts=(0.2, 0.5, 0.86),  cell=9, bias=0.08)
for y in range(Y_WALK, Y_CURB):
    for x in range(0, 320):
        if (y - Y_WALK) % 8 == 7 or x % 8 == 7:
            if rnd.random() < 0.35:
                cv.p(x, y, 'SN0', 0.6)
# cordon
cv.hline(0, 319, Y_CURB, 'SN3', glow='cold')
cv.rect(0, Y_CURB + 1, 320, 2, 'G3')
cv.rect(0, Y_CURB + 3, 320, 1, 'G2')
for x in range(0, 320, 12):
    cv.vline(x, Y_CURB + 1, Y_CURB + 3, 'G2')
# calle: empedrado cubierto, mas oscuro (sin luz)
snow_ground(cv, 0, Y_STREET, 320, Y_CURB2 - Y_STREET, seed=3, levels=('#2c4a66', 'SN0', 'SN0', 'SN1'), cuts=(0.3, 0.5, 0.8),  cell=14, bias=-0.06)
# huellas de neumaticos (bandas suaves)
for ty in (106, 114):
    for x in range(0, 320):
        wob = int(1.5 * math.sin(x * 0.045 + ty))
        for dy in range(2):
            y = ty + dy + wob
            if rnd.random() < 0.55:
                cv.p(x, y, '#2c4a66' if rnd.random() < 0.8 else 'G2', glow='none')
# cordon de enfrente
cv.rect(0, Y_CURB2, 320, 1, 'G2')
cv.hline(0, 319, Y_CURB2 + 1, 'SN3', glow='cold')
cv.rect(0, Y_CURB2 + 2, 320, 2, 'G3')
cv.rect(0, Y_CURB2 + 3, 320, 1, 'G2')
snow_ground(cv, 0, Y_WALK2, 320, 180 - Y_WALK2, seed=4, levels=('N4', 'SN0', 'SN1', 'SN2'), cuts=(0.2, 0.5, 0.86),  cell=9, bias=0.08)

# ------------------------------------------------ chalet principal
def chalet(x0, x1, roof_top, wall_top, wall_bot, lit_left=True, chimney=None, seed=0):
    r = random.Random(seed)
    # sombra del alero sobre la nieve del jardin
    cv.rect(x0 - 2, wall_bot, x1 - x0 + 5, 3, 'SN0', glow='none')
    # pared
    for y in range(wall_top, wall_bot):
        for x in range(x0, x1):
            col = 'G3'
            if y >= wall_bot - 5:
                col = 'G2' if (x + y) % 2 else 'G1'     # zocalo de piedra
            elif (x * 3 + y * 5) % 11 == 0:
                col = 'G2'
            cv.p(x, y, col, glow='none')
    cv.vline(x0, wall_top, wall_bot - 1, 'OUT')
    cv.vline(x1 - 1, wall_top, wall_bot - 1, 'OUT')
    cv.vline(x1 - 2, wall_top, wall_bot - 1, 'G2')
    cv.hline(x0, x1 - 1, wall_top, 'N2')   # sombra del alero
    cv.hline(x0, x1 - 1, wall_top + 1, 'G2')
    # techo a cuatro aguas visto desde arriba (faldon frontal grande)
    rt, rb = roof_top, wall_top
    ridge_l, ridge_r = x0 + 16, x1 - 16
    for y in range(rt, rb):
        t = (y - rt) / (rb - rt)
        xl = int(ridge_l - t * 20)
        xr = int(ridge_r + t * 20)
        for x in range(xl, xr + 1):
            row = (y - rt) // 3
            k = (x + (row % 2) * 2) % 4
            col = 'RF1'
            if (y - rt) % 3 == 2:
                col = 'RF0'
            elif k == 0:
                col = 'RF0'
            elif (y - rt) % 3 == 0 and k == 2:
                col = 'RF2'
            # aguas laterales mas oscuras
            if x < ridge_l - t * 20 + t * 10 or x > ridge_r + t * 20 - t * 10:
                if col == 'RF1':
                    col = 'RF0' if (x + y) % 2 else 'RF1'
            cv.p(x, y, col)
        cv.p(xl, y, 'OUT'); cv.p(xr, y, 'OUT')
    cv.hline(ridge_l, ridge_r, rt, 'OUT')
    cv.hline(int(ridge_l - 20), int(ridge_r + 20), rb - 1, 'OUT')
    # nieve en el techo: cubre la parte superior, borde irregular
    for x in range(ridge_l - 20, ridge_r + 21):
        depth = int((rb - rt) * 0.55 + 3 * math.sin(x * 0.37 + seed) + r.randint(0, 2))
        for y in range(rt, rt + depth):
            t = (y - rt) / (rb - rt)
            if ridge_l - t * 20 < x < ridge_r + t * 20:
                col = 'SN3' if y < rt + depth - 2 else 'SN2'
                if (x + y) % 9 == 0:
                    col = 'SN2'
                cv.p(x, y, col, glow='cold')
    cv.hline(ridge_l, ridge_r, rt, 'SN4', glow='cold')
    # chimenea
    if chimney:
        cx = x0 + chimney
        cv.rect(cx, rt - 6, 8, 12, 'RF2')
        cv.rect(cx + 5, rt - 6, 3, 12, 'RF0')
        for yy in range(rt - 5, rt + 6, 3):
            cv.hline(cx, cx + 7, yy, 'RF0')
        cv.frame(cx - 1, rt - 7, 10, 14, 'OUT')
        cv.rect(cx - 1, rt - 9, 10, 3, 'SN3', glow='cold')
        cv.hline(cx, cx + 7, rt - 10, 'SN4', glow='cold')
    return (x0, x1, wall_top, wall_bot)


def window(x, y, w, h, lit):
    cv.rect(x - 1, y - 1, w + 2, h + 2, 'OUT')
    if lit:
        cv.rect(x, y, w, h, 'AM2', glow='warm')
        cv.rect(x + 1, y + 1, w - 2, h // 2, 'AM3', glow='warm')
        cv.p(x + 1, y + 1, 'AM4', glow='warm'); cv.p(x + 2, y + 1, 'AM4', glow='warm')
        # cortina
        cv.vline(x, y, y + h - 1, 'AM1'); cv.vline(x + w - 1, y, y + h - 1, 'AM1')
        # silueta adentro (alguien mirando)
        cv.rect(x + w // 2 + 1, y + h - 5, 3, 5, 'AM0')
        cv.rect(x + w // 2 + 1, y + h - 7, 3, 2, 'AM0')
    else:
        cv.rect(x, y, w, h, 'N2')
        cv.dither(x, y + h // 2, w, h - h // 2, 'N2', 'N1')
        cv.p(x + 1, y + 1, 'N4'); cv.p(x + 2, y + 1, 'N3'); cv.p(x + 1, y + 2, 'N3')
    cv.vline(x + w // 2, y, y + h - 1, 'WD0')
    cv.hline(x, x + w - 1, y + h // 2 - 1, 'WD0')
    # persianas abiertas a los lados
    cv.rect(x - 4, y - 1, 3, h + 2, 'WD1'); cv.rect(x + w + 1, y - 1, 3, h + 2, 'WD1')
    for yy in range(y, y + h, 2):
        cv.hline(x - 4, x - 2, yy, 'WD0'); cv.hline(x + w + 1, x + w + 3, yy, 'WD0')
    # nieve en el alfeizar
    cv.hline(x - 2, x + w + 1, y + h + 1, 'SN3', glow='cold')
    cv.hline(x - 1, x + w, y + h + 2, 'OUT')


x0, x1, wt, wb = chalet(92, 206, 3, 30, 56, chimney=84, seed=2)
window(106, 36, 14, 12, True)
window(176, 36, 14, 12, False)
# puerta con escalones
cv.rect(141, 38, 14, 18, 'OUT')
cv.rect(142, 39, 12, 17, 'WD1')
cv.rect(142, 39, 12, 2, 'WD0')
cv.vline(148, 41, 55, 'WD0')
cv.rect(144, 42, 3, 5, 'WD2'); cv.rect(150, 42, 3, 5, 'WD2')
cv.p(152, 48, 'AM3')
cv.rect(139, 56, 18, 2, 'G3'); cv.hline(139, 156, 56, 'SN3', glow='cold')
# luz de la ventana sobre la nieve (trapecio calido)
for y in range(57, 72):
    t = (y - 57) / 15
    xl, xr = int(104 - t * 6), int(122 + t * 6)
    for x in range(xl, xr):
        if t < 0.6 or (x + y) % 2 == 0:
            cv.p(x, y, 'AM2', 0.28 * (1 - t * 0.6))

# casa vecina (derecha, oscura)
chalet(238, 336, 8, 32, 56, seed=5)
window(256, 38, 12, 11, False)
window(296, 38, 12, 11, False)

# ------------------------------------------------ rejas
def fence(xa, xb, gate=None):
    for x in range(xa, xb):
        if gate and gate[0] <= x < gate[1]:
            continue
        cv.p(x, Y_FENCE + 3, 'G1')
        cv.p(x, Y_FENCE + 4, 'OUT')
        if x % 4 == 0:
            cv.vline(x, Y_FENCE - 5, Y_FENCE + 3, 'OUT')
            cv.p(x, Y_FENCE - 6, 'G2')
        cv.p(x, Y_FENCE - 2, 'OUT')
    for x in range(xa, xb, 4):
        if gate and gate[0] <= x < gate[1]:
            continue
        cv.p(x, Y_FENCE - 7, 'SN3', glow='cold')


fence(86, 212, gate=(140, 158))
fence(232, 320)
# pilares del porton
for px in (136, 158):
    cv.rect(px, Y_FENCE - 8, 4, 13, 'G3'); cv.vline(px + 3, Y_FENCE - 8, Y_FENCE + 4, 'G2')
    cv.frame(px - 1, Y_FENCE - 9, 6, 15, 'OUT')
    cv.rect(px - 1, Y_FENCE - 11, 6, 2, 'SN3', glow='cold')

# ------------------------------------------------ arboles
def tree(cx, base, r, seed):
    rr = random.Random(seed)
    shadow(cv, cx, base + 1, r * 0.9, 3, 0.9)
    cv.rect(cx - 2, base - 12, 5, 13, 'WD0')
    cv.vline(cx - 2, base - 12, base, 'OUT'); cv.vline(cx + 2, base - 12, base, 'WD1')
    cv.vline(cx + 3, base - 12, base, 'OUT')
    cy = base - 12 - r * 0.7
    # copa en tres tonos + borde
    cv.ellipse(cx, cy, r + 1, r * 0.8 + 1, 'OUT')
    cv.ellipse(cx, cy, r, r * 0.8, 'LF0')
    for _ in range(6):
        a = rr.uniform(0, math.tau)
        cv.ellipse(cx + math.cos(a) * r * 0.45, cy + math.sin(a) * r * 0.35 - 2,
                   r * 0.45, r * 0.35, 'LF1')
    cv.ellipse(cx - r * 0.25, cy - r * 0.3, r * 0.5, r * 0.32, 'LF2', ring_dither=0.6)
    # nieve acumulada arriba (brilla)
    for x in range(int(cx - r), int(cx + r) + 1):
        for y in range(int(cy - r), int(cy)):
            d = ((x - cx) / r) ** 2 + ((y - cy) / (r * 0.8)) ** 2
            if d <= 1.0 and y < cy - r * 0.8 * 0.55 + 2 * math.sin(x * 0.7 + seed):
                cv.p(x, y, 'SN3' if d < 0.75 else 'SN2', glow='cold')


tree(36, 78, 18, 1)
tree(300, 80, 16, 3)
tree(64, 178, 17, 4)
tree(244, 180, 19, 5)

# ------------------------------------------------ farol
fx, fb = 216, 80
cv.tint_ellipse(fx + 1, fb + 10, 58, 20, C['AM3'], 0.32)
shadow(cv, fx + 1, fb + 1, 3, 1.5, 0.9)
cv.rect(fx - 1, fb - 2, 5, 3, 'OUT')
cv.vline(fx, fb - 40, fb, 'OUT'); cv.vline(fx + 1, fb - 40, fb, 'G3'); cv.vline(fx + 2, fb - 40, fb, 'OUT')
cv.hline(fx - 5, fx + 7, fb - 40, 'OUT')
cv.vline(fx - 5, fb - 40, fb - 37, 'OUT'); cv.vline(fx + 7, fb - 40, fb - 37, 'OUT')
for (lx) in (fx - 7, fx + 5):
    cv.rect(lx, fb - 37, 5, 6, 'AM3', glow='warm')
    cv.rect(lx + 1, fb - 36, 3, 3, 'AM4', glow='warm')
    cv.frame(lx - 1, fb - 38, 7, 8, 'OUT')
    cv.hline(lx - 1, lx + 5, fb - 39, 'SN3', glow='cold')
cv.p(fx + 1, fb - 42, 'OUT'); cv.p(fx + 1, fb - 41, 'G2')

# ------------------------------------------------ auto de los 50 abandonado
ax, ay = 12, 98
L = 86
shadow(cv, ax + L // 2, ay + 30, L // 2 + 4, 5, 1.0)


def rounded(x0, x1, y0, y1, col, r, only=None):
    for y in range(y0, y1):
        for x in range(x0, x1):
            dx = max(x0 + r - x, 0, x - (x1 - 1 - r))
            dy = max(y0 + r - y, 0, y - (y1 - 1 - r))
            if dx * dx + dy * dy <= r * r + 1:
                cv.p(x, y, col)


# silueta general (contorno)
rounded(ax - 1, ax + L + 1, ay + 3, ay + 29, 'OUT', 6)
rounded(ax + 21, ax + 63, ay - 8, ay + 12, 'OUT', 5)
# lateral
rounded(ax, ax + L, ay + 4, ay + 28, 'CA1', 5)
cv.rect(ax + 2, ay + 21, L - 4, 6, 'CA0')
cv.hline(ax + 1, ax + L - 2, ay + 17, 'G4')
cv.hline(ax + 3, ax + L - 4, ay + 18, 'CA0')
# cubierta superior (capot y baul) vista de arriba
rounded(ax + 1, ax + 24, ay + 4, ay + 13, 'CA2', 4)
rounded(ax + 60, ax + L - 1, ay + 4, ay + 13, 'CA2', 4)
cv.hline(ax + 2, ax + 23, ay + 12, 'CA0'); cv.hline(ax + 61, ax + L - 3, ay + 12, 'CA0')
# cabina: techo
rounded(ax + 22, ax + 62, ay - 7, ay + 4, 'CA1', 4)
# parabrisas (inclinado) y luneta
for j in range(0, 10):
    cv.hline(ax + 56 + j // 2, ax + 59 + j // 2, ay - 6 + j, 'N2')
    cv.hline(ax + 23 - j // 3, ax + 26 - j // 3, ay - 6 + j, 'N2')
cv.vline(ax + 57, ay - 5, ay - 1, 'N4'); cv.p(ax + 24, ay - 4, 'N4')
# ventanillas laterales
cv.rect(ax + 26, ay + 4, 32, 7, 'N2')
cv.hline(ax + 27, ax + 56, ay + 4, 'N4')
cv.vline(ax + 41, ay + 4, ay + 10, 'CA1')
cv.hline(ax + 26, ax + 57, ay + 11, 'CA0')
# nieve sobre techo, capot y baul (con bordes redondeados y goteo)
rounded(ax + 25, ax + 56, ay - 7, ay + 2, 'SN3', 3)
rounded(ax + 3, ax + 22, ay + 3, ay + 10, 'SN3', 3)
rounded(ax + 63, ax + L - 3, ay + 3, ay + 10, 'SN3', 3)
for (xa, xb, yb) in ((ax + 25, ax + 56, ay + 2), (ax + 3, ax + 22, ay + 10), (ax + 63, ax + L - 3, ay + 10)):
    for x in range(xa + 1, xb - 1):
        cv.p(x, yb - 1, 'SN2', glow='cold')
        if x % 5 == 2:
            cv.p(x, yb, 'SN2', glow='cold')
    for y in range(ay - 7, yb):
        for x in range(xa, xb):
            if cv.get(x, y) == C['SN3']:
                cv.p(x, y, 'SN3', glow='cold')
cv.hline(ax + 27, ax + 53, ay - 7, 'SN4', glow='cold')
# faros, paragolpes cromados, luz trasera
cv.rect(ax + L - 3, ay + 13, 3, 3, 'SN2')
cv.rect(ax + L - 4, ay + 19, 5, 3, 'G4'); cv.hline(ax + L - 4, ax + L, ay + 21, 'G3')
cv.rect(ax - 1, ay + 19, 4, 3, 'G4')
cv.rect(ax + 1, ay + 13, 2, 3, 'RED')
# ruedas con guardabarros
for wx in (ax + 15, ax + 70):
    rounded(wx - 8, wx + 9, ay + 18, ay + 30, 'CA0', 5)
    cv.ellipse(wx + 0.5, ay + 27, 6, 4.5, 'OUT')
    cv.ellipse(wx + 0.5, ay + 27, 4, 3, 'G1')
    cv.ellipse(wx + 0.5, ay + 27, 2, 1.5, 'G3')
    cv.hline(wx - 7, wx + 7, ay + 18, 'G3')
# puerta delantera ABIERTA: hueco oscuro con asiento + hoja hacia el espectador
cv.rect(ax + 42, ay + 4, 16, 22, 'OUT')
cv.rect(ax + 43, ay + 5, 14, 20, 'N0')
cv.rect(ax + 43, ay + 13, 12, 7, '#4a2a30')
cv.hline(ax + 43, ax + 54, ay + 13, '#6e3c42')
cv.rect(ax + 52, ay + 6, 4, 4, 'G2'); cv.p(ax + 53, ay + 7, 'G1')
cv.rect(ax + 43, ay + 22, 10, 3, 'SN2', glow='cold')   # entro nieve
hx0 = ax + 58
for k in range(0, 10):
    top = ay + 4 + k
    for y in range(top, top + 21):
        col = 'CA1' if k > 0 else 'CA0'
        if top + 2 <= y < top + 8 and 1 <= k <= 8:
            col = 'N2' if k > 2 else 'N3'          # vidrio de la ventanilla
        if y == top + 13:
            col = 'G4'
        cv.p(hx0 + k, y, col)
    cv.p(hx0 + k, top - 1, 'OUT'); cv.p(hx0 + k, top + 21, 'OUT')
cv.vline(hx0 + 10, ay + 13, ay + 34, 'OUT')
for k in range(1, 9):
    cv.p(hx0 + k, ay + 4 + k - 1, 'SN3', glow='cold')

# ------------------------------------------------ nevada
snowfall(cv, 120, seed=9, region=(0, 0, 320, 180))

cv.apply_glow()
# ------------------------------------------------ huellas de Juan desde el porton
jx, jy = 160, 90
for k in range(14):
    yy = Y_FENCE + 6 + k * 4
    if yy > jy + 26:
        break
    xx = 147 + (k % 2) * 4 + int(k * 1.0)
    cv.rect(xx, yy, 2, 2, 'N2', glow='none')
    cv.p(xx, yy + 2, 'SN2', glow='none'); cv.p(xx + 1, yy + 2, 'SN2', glow='none')

# ------------------------------------------------ Juan con el traje
shadow(cv, jx + 8, jy + 30, 7, 2.4, 1.0)
blit_grid(cv, suit_grid, suit_map, jx, jy)
snowfall(cv, 14, seed=31, region=(140, 80, 200, 130))

# vineta noir: esquinas mas oscuras (anillos cuantizados)
for y in range(180):
    for x in range(320):
        d = ((x - 160) / 190) ** 2 + ((y - 95) / 120) ** 2
        if d > 1.0:
            cv.p(x, y, 'N0', 0.38)
        elif d > 0.75:
            cv.p(x, y, 'N0', 0.18)

# ------------------------------------------------ HUD (despues del glow)
bx, by, bw, bh = wood_box(cv, 4, 4, 74, 24)
# icono: copo de nieve
ix, iy = bx + 3, by + 3
for d in range(-4, 5):
    cv.p(ix + 4 + d, iy + 5, 'SN0'); cv.p(ix + 4, iy + 5 + d, 'SN0')
for d in (-3, -2, 2, 3):
    cv.p(ix + 4 + d, iy + 5 + d, 'SN1'); cv.p(ix + 4 + d, iy + 5 - d, 'SN1')
cv.p(ix + 4, iy + 5, 'SN4')
draw_text(cv, bx + 15, by + 2, "03:12", 'INK', scale=2, shadow='PAR2')

ax2, ay2, aw, ah = 4, 31, 74, 15
cv.hline(ax2 + 2, ax2 + aw - 1, ay2 + ah, 'N0', 0.5)
cv.rect(ax2, ay2, aw, ah, 'WD0')
cv.rect(ax2 + 1, ay2 + 1, aw - 2, ah - 2, 'WD2')
cv.hline(ax2 + 1, ax2 + aw - 2, ay2 + 1, 'WD3')
cv.vline(ax2 + 1, ay2 + 1, ay2 + ah - 2, 'WD3')
cv.hline(ax2 + 2, ax2 + aw - 2, ay2 + ah - 2, 'WD1')
draw_text(cv, ax2 + 4, ay2 + 4, "AIRE", 'PAR', shadow='WD0')
# barra
bx0, by0, bwid = ax2 + 31, ay2 + 3, aw - 35
cv.rect(bx0, by0, bwid, ah - 6, 'WD0')
cv.rect(bx0 + 1, by0 + 1, bwid - 2, ah - 8, 'N1')
fill = int((bwid - 2) * 0.68)
cv.rect(bx0 + 1, by0 + 1, fill, ah - 8, 'AIR1')
cv.hline(bx0 + 1, bx0 + fill, by0 + 1, 'AIR2')
cv.hline(bx0 + 1, bx0 + fill, by0 + 2, 'AIR2')
cv.hline(bx0 + 1, bx0 + fill, by0 + ah - 8, 'AIR0')
for t in range(bx0 + 8, bx0 + bwid - 2, 8):
    cv.vline(t, by0 + 1, by0 + ah - 8, 'WD0', 0.35)
cv.p(bx0 + 2, by0 + 2, 'SN4')

cv.save('calle')
print('ok')
