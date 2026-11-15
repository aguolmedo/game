import random
import math
from lib import Canvas, C, draw_text, text_width, snowfall, snow_ground, shadow, blit_grid, mix
from chars import juan_grid, juan_map, fav_grid, fav_map, lucas_grid, lucas_map, pol_grid, pol_map, back_view
from hud import wood_box

cv = Canvas(bg=C['N1'])
rnd = random.Random(5)

WALL_B = 64      # base de la pared del fondo
DLG_Y = 122

# ------------------------------------------------ pared del fondo: tablas verticales
WALL = ['#2a1e2e', '#33243a', '#3e2c44']
for x in range(320):
    plank = x // 9
    base = WALL[plank % 3 if plank % 3 != 2 else 1]
    for y in range(0, WALL_B):
        col = base
        if x % 9 == 0:
            col = '#1c1422'
        elif x % 9 == 1:
            col = WALL[2]
        elif (y * 3 + plank * 7) % 23 == 0:
            col = '#241a28'          # veta / nudo
        cv.p(x, y, col)
# zocalo
cv.rect(0, WALL_B - 3, 320, 3, '#4a3226')
cv.hline(0, 319, WALL_B - 3, '#6a4630')
cv.hline(0, 319, WALL_B, '#1c1422')

# ------------------------------------------------ techo inclinado (altillo)
def slope(side):
    for y in range(0, 46):
        span = int(64 - y * 64 / 46)
        for i in range(span):
            x = i if side == 0 else 319 - i
            col = '#1a1220'
            if (y + (i if side == 0 else i)) % 7 == 0:
                col = '#241a2a'
            cv.p(x, y, col)
        edge = span if side == 0 else 319 - span
        cv.p(edge, y, '#4a3646'); cv.p(edge + (1 if side == 0 else -1), y, '#140e18')
    # viga diagonal
    for t in range(0, 46):
        x = int(64 - t * 64 / 46)
        xx = x - 8 if side == 0 else 319 - x + 8
        for d in range(3):
            px = xx + d if side == 0 else xx - d
            if 0 <= px < 320:
                cv.p(px, t, '#3a2630' if d < 2 else '#140e18')


slope(0)
slope(1)
cv.rect(0, 0, 320, 4, '#140e18')
cv.hline(0, 319, 4, '#3a2630')

# ------------------------------------------------ ventana con la nevada afuera
wx, wy, ww, wh = 200, 12, 44, 38
cv.rect(wx - 4, wy - 4, ww + 8, wh + 9, '#140e18')
# exterior
for y in range(wy, wy + wh):
    t = (y - wy) / wh
    col = 'N0' if t < 0.3 else ('N1' if t < 0.65 else 'N2')
    cv.hline(wx, wx + ww - 1, y, col)
# techos vecinos nevados (brillan)
for i in range(ww):
    h = 8 + int(4 * abs(math.sin((i + 3) * 0.16)))
    for y in range(wy + wh - h, wy + wh):
        cv.p(wx + i, y, 'N1' if y > wy + wh - h + 1 else 'SN2', glow='cold' if y <= wy + wh - h + 1 else None)
cv.rect(wx + 6, wy + wh - 6, 3, 3, 'AM2', glow='warm')
snowfall(cv, 46, seed=12, region=(wx, wy, wx + ww, wy + wh), big=0.25)
# marco
cv.frame(wx - 1, wy - 1, ww + 2, wh + 2, 'WD0')
cv.rect(wx - 3, wy - 3, ww + 6, 2, 'WD2'); cv.hline(wx - 3, wx + ww + 2, wy - 3, 'WD3')
cv.rect(wx - 3, wy - 3, 2, wh + 6, 'WD2'); cv.rect(wx + ww + 1, wy - 3, 2, wh + 6, 'WD1')
cv.rect(wx + ww // 2 - 1, wy, 2, wh, 'WD1'); cv.vline(wx + ww // 2 - 1, wy, wy + wh - 1, 'WD2')
cv.rect(wx, wy + wh // 2 - 1, ww, 2, 'WD1'); cv.hline(wx, wx + ww - 1, wy + wh // 2 - 1, 'WD2')
# nieve acumulada en los vidrios (esquinas inferiores de cada paño)
for (px0, py0) in ((wx, wy + wh // 2 - 2), (wx + ww // 2 + 1, wy + wh // 2 - 2), (wx, wy + wh - 1), (wx + ww // 2 + 1, wy + wh - 1)):
    for k in range(5):
        cv.hline(px0, px0 + 4 - k, py0 - k, 'SN3', glow='cold')
    for k in range(3):
        cv.hline(px0 + ww // 2 - 6 + k, px0 + ww // 2 - 2, py0 - k, 'SN3', glow='cold')
# alfeizar
cv.rect(wx - 5, wy + wh + 2, ww + 10, 3, 'WD2'); cv.hline(wx - 5, wx + ww + 4, wy + wh + 2, 'WD3')
cv.hline(wx - 5, wx + ww + 4, wy + wh + 5, '#140e18')

# ------------------------------------------------ estante con libros (pared)
sx, sy = 92, 22
cv.rect(sx, sy, 50, 2, 'WD2'); cv.hline(sx, sx + 49, sy + 2, '#140e18')
books = ['#5a2a30', '#2e3e5a', '#4a4a2a', '#6a4a2a', '#3a2a4a', '#5a2a30', '#2a4a3a']
bx = sx + 2
for i, bc in enumerate(books):
    h = 9 + (i * 5) % 4
    cv.rect(bx, sy - h, 4, h, bc)
    cv.vline(bx + 3, sy - h, sy - 1, '#140e18')
    cv.p(bx + 1, sy - h + 2, 'PAR2')
    bx += 5
cv.rect(bx + 3, sy - 8, 5, 8, '#3a5a4a')        # frasco / botella
cv.rect(bx + 4, sy - 11, 3, 3, '#3a5a4a'); cv.p(bx + 4, sy - 7, '#6a9a7a')
# calendario 1957
cv.rect(160, 12, 18, 22, 'PAR2'); cv.frame(159, 11, 20, 24, '#140e18')
cv.rect(160, 12, 18, 6, 'RED')
for yy in range(20, 33, 3):
    for xx in range(161, 177, 3):
        cv.p(xx, yy, 'INK')
cv.p(169, 9, 'G3')

# ------------------------------------------------ piso de tablas
for y in range(WALL_B + 1, DLG_Y + 60):
    row = (y - WALL_B) // 6
    for x in range(320):
        col = '#3a2622' if row % 2 else '#33201e'
        if (y - WALL_B) % 6 == 0:
            col = '#1e1216'
        elif (x + row * 37) % 53 == 0:
            col = '#1e1216'
        elif (y - WALL_B) % 6 == 1:
            col = '#46302a'
        cv.p(x, y, col)

# luz fria que entra por la ventana sobre el piso
for y in range(WALL_B + 1, 112):
    t = (y - WALL_B) / 48
    xl = int(wx - 6 + t * 18)
    xr = int(wx + ww + 6 + t * 30)
    for x in range(xl, xr):
        if t < 0.55 or (x + y) % 2 == 0:
            cv.p(x, y, 'GL', 0.13 * (1 - t * 0.5))

# ------------------------------------------------ luz calida de la lampara
LX, LY = 152, 26
cv.tint_ellipse(LX, 86, 110, 44, C['AM3'], 0.32)
for y in range(30, 100):
    t = (y - 30) / 70
    half = 6 + t * 70
    for x in range(int(LX - half), int(LX + half)):
        if (x + y) % 2 == 0:
            cv.p(x, y, 'AM3', 0.06)

# ------------------------------------------------ radio a valvulas (capilla) sobre mesita
rx0, ry0 = 22, 26
# mesita
cv.rect(rx0 - 4, 56, 38, 4, 'WD2'); cv.hline(rx0 - 4, rx0 + 33, 56, 'WD3')
cv.frame(rx0 - 5, 55, 40, 6, '#140e18')
for lx in (rx0 - 3, rx0 + 30):
    cv.rect(lx, 61, 3, 18, 'WD1'); cv.vline(lx + 2, 61, 78, 'WD0')
shadow(cv, rx0 + 14, 80, 20, 3, 0.9)
# cuerpo con arco arriba
RW, RH = 30, 30
for y in range(RH):
    for x in range(RW):
        cx = x - RW / 2 + 0.5
        top_arc = 10 - math.sqrt(max(0, (RW / 2) ** 2 - cx * cx)) * 10 / (RW / 2)
        if y >= top_arc:
            col = 'WD2'
            if x < 3:
                col = 'WD3'
            elif x > RW - 4:
                col = 'WD1'
            cv.p(rx0 + x, ry0 + y, col)
            if y < top_arc + 1 or x == 0 or x == RW - 1 or y == RH - 1:
                cv.p(rx0 + x, ry0 + y, '#140e18')
# tela del parlante con varillas
for y in range(ry0 + 9, ry0 + 20):
    for x in range(rx0 + 6, rx0 + 24):
        cx = x - (rx0 + 15)
        if y - (ry0 + 9) >= abs(cx) * 0.35 - 1:
            col = 'PAR2' if (x + y) % 2 else '#a88a5a'
            if (x - rx0) % 4 == 2:
                col = 'WD1'
            cv.p(x, y, col)
# dial iluminado
cv.rect(rx0 + 8, ry0 + 21, 14, 4, 'AM3', glow='warm')
cv.hline(rx0 + 8, rx0 + 21, ry0 + 21, 'AM4', glow='warm')
cv.vline(rx0 + 14, ry0 + 21, ry0 + 24, 'AM1')
for k in range(rx0 + 9, rx0 + 21, 3):
    cv.p(k, ry0 + 24, 'AM1')
cv.frame(rx0 + 7, ry0 + 20, 16, 6, '#140e18')
# perillas
for kx in (rx0 + 6, rx0 + 22):
    cv.rect(kx, ry0 + 27, 3, 2, 'WD0'); cv.p(kx + 1, ry0 + 27, 'PAR2')

# ------------------------------------------------ perchero con impermeable y mascara
px0 = 286
cv.rect(px0, 22, 3, 56, 'WD1'); cv.vline(px0 + 2, 22, 77, 'WD0'); cv.vline(px0 - 1, 22, 77, '#140e18')
cv.rect(px0 - 6, 76, 15, 3, 'WD1')
shadow(cv, px0 + 1, 79, 9, 2, 0.9)
# impermeable colgado
for y in range(28, 64):
    t = (y - 28) / 36
    half = int(4 + t * 6)
    for x in range(px0 + 1 - half, px0 + 2 + half):
        col = 'RC1'
        if x > px0 + half - 2:
            col = 'RC0'
        if x < px0 - half + 2:
            col = 'RC2'
        cv.p(x, y, col)
    cv.p(px0 - half, y, '#140e18'); cv.p(px0 + 2 + half, y, '#140e18')
cv.hline(px0 - 9, px0 + 11, 64, '#140e18')
for by in range(34, 62, 6):
    cv.p(px0 + 1, by, 'RC2')
# escafandra casera en el gancho
cv.ellipse(px0 + 1.5, 24, 7, 6, '#140e18')
cv.ellipse(px0 + 1.5, 24, 6, 5, '#8a96a0')
cv.rect(px0 - 2, 22, 8, 4, '#2f7088')
cv.hline(px0 - 2, px0 + 1, 22, '#bdeffa')
cv.p(px0 - 3, 20, '#b4c0c6')

# ------------------------------------------------ sillas de atras (respaldos)
for chx in (114, 170):
    cv.rect(chx, 46, 3, 22, 'WD1'); cv.rect(chx + 17, 46, 3, 22, 'WD1')
    cv.rect(chx, 46, 20, 3, 'WD2'); cv.hline(chx, chx + 19, 46, 'WD3')
    cv.frame(chx - 1, 45, 22, 5, '#140e18')

# ------------------------------------------------ personajes de atras (de frente), de la cintura para arriba
blit_grid(cv, juan_grid, juan_map, 116, 40, rows=(0, 26))
blit_grid(cv, fav_grid, fav_map, 172, 40, rows=(0, 26))

# ------------------------------------------------ mesa
TX0, TX1, TY0, TY1 = 98, 210, 62, 90
shadow(cv, 154, 112, 64, 7, 1.0)
for y in range(TY0, TY1):
    for x in range(TX0, TX1):
        col = 'WD2'
        if (y - TY0) % 7 == 0:
            col = 'WD1'                        # juntas de tablas
        elif (x * 5 + y * 3) % 29 == 0:
            col = 'WD1'
        cv.p(x, y, col)
cv.hline(TX0, TX1 - 1, TY0, 'WD3')
cv.frame(TX0 - 1, TY0 - 1, TX1 - TX0 + 2, TY1 - TY0 + 6, '#140e18')
cv.rect(TX0, TY1, TX1 - TX0, 4, 'WD1')
cv.hline(TX0, TX1 - 1, TY1, 'WD0')
for lx in (TX0 + 2, TX1 - 6):
    cv.rect(lx, TY1 + 4, 4, 16, 'WD1'); cv.vline(lx + 3, TY1 + 4, TY1 + 19, 'WD0')
    cv.vline(lx - 1, TY1 + 4, TY1 + 19, '#140e18'); cv.vline(lx + 4, TY1 + 4, TY1 + 19, '#140e18')
# manos de los de atras sobre la mesa
for hx_ in (118, 129, 174, 185):
    cv.rect(hx_, TY0 + 1, 3, 2, 'SK'); cv.hline(hx_, hx_ + 2, TY0 + 3, 'SK2')
    cv.p(hx_ - 1, TY0 + 1, '#140e18'); cv.p(hx_ + 3, TY0 + 1, '#140e18')
# luz de la lampara sobre la mesa
cv.tint_ellipse(154, 76, 50, 14, C['AM4'], 0.32)


# ------------------------------------------------ cartas de truco (baraja espanola) y porotos
def card(x, y, suit, back=False, rot=False):
    w, h = (7, 5) if rot else (5, 7)
    cv.rect(x - 1, y - 1, w + 2, h + 2, '#140e18')
    if back:
        cv.rect(x, y, w, h, '#7a2e3a')
        cv.dither(x + 1, y + 1, w - 2, h - 2, '#7a2e3a', '#a8434a')
        return
    cv.rect(x, y, w, h, 'PAR')
    cv.hline(x, x + w - 1, y + h - 1, 'PAR2')
    sc = {'oro': 'AM2', 'copa': 'RED', 'espada': 'BLU', 'basto': 'GRN'}[suit]
    cx, cy = x + w // 2, y + h // 2
    if suit == 'oro':
        cv.rect(cx - 1, cy - 1, 3, 3, sc); cv.p(cx, cy, 'AM4')
    elif suit == 'copa':
        cv.hline(cx - 1, cx + 1, cy - 1, sc); cv.p(cx, cy, sc); cv.hline(cx - 1, cx + 1, cy + 1, sc)
    elif suit == 'espada':
        cv.vline(cx, cy - 2, cy + 1, sc); cv.hline(cx - 1, cx + 1, cy + 1, sc)
    else:
        cv.vline(cx, cy - 2, cy + 2, sc); cv.p(cx - 1, cy - 2, sc); cv.p(cx + 1, cy + 2, 'WD1')


# mazo al centro
for k in range(3):
    card(150 - k, 72 - k, None, back=True)
# cartas jugadas
card(136, 70, 'espada'); card(164, 69, 'oro'); card(143, 79, 'copa', rot=True)
card(158, 80, 'basto')
# manos de cartas boca abajo frente a cada jugador
for (cx_, cy_) in ((121, 66), (124, 66), (178, 66), (181, 66)):
    card(cx_, cy_, None, back=True)
for (cx_, cy_) in ((113, 82), (116, 83), (189, 82), (192, 83)):
    card(cx_, cy_, None, back=True, rot=True)
# porotos para anotar los tantos (dos montoncitos)
pr = random.Random(77)
for (cx_, cy_, n) in ((108, 73, 12), (203, 74, 8)):
    for i in range(n):
        ang = pr.uniform(0, math.tau); rr_ = pr.uniform(0, 4)
        bx_, by_ = int(cx_ + math.cos(ang) * rr_ * 1.3), int(cy_ + math.sin(ang) * rr_)
        cv.p(bx_, by_, '#e0d0b0'); cv.p(bx_ + 1, by_, '#a89070')
# vaso y botella de vino
cv.rect(197, 63, 3, 8, '#2a3a2a'); cv.rect(198, 60, 1, 3, '#2a3a2a'); cv.p(197, 64, '#5a7a5a')
cv.frame(196, 62, 5, 10, '#140e18')
cv.rect(110, 64, 3, 4, '#a8b8c0'); cv.hline(110, 112, 66, '#7a2e3a')
# cenicero con humo
cv.rect(186, 73, 6, 2, 'G3'); cv.hline(186, 191, 73, 'G4')
for k, (dx, dy) in enumerate(((2, -1), (3, -2), (2, -3), (1, -4), (2, -5), (3, -6))):
    cv.p(186 + dx, 73 + dy, 'G4', 0.6 - k * 0.07)

# ------------------------------------------------ jugadores de adelante (de espaldas) + sillas
lucas_back = back_view(lucas_grid)
pol_back = back_view(pol_grid, bald=True)
blit_grid(cv, lucas_back, lucas_map, 104, 78, rows=(0, 26))
blit_grid(cv, pol_back, pol_map, 184, 78, rows=(0, 26))
for chx in (102, 182):
    # respaldo de silla visto de atras
    cv.rect(chx, 98, 20, 3, 'WD2'); cv.hline(chx, chx + 19, 98, 'WD3')
    cv.rect(chx, 101, 3, 21, 'WD1'); cv.rect(chx + 17, 101, 3, 21, 'WD1')
    for sl in (chx + 7, chx + 11):
        cv.rect(sl, 101, 2, 10, 'WD1')
    cv.rect(chx, 110, 20, 2, 'WD1')
    cv.frame(chx - 1, 97, 22, 5, '#140e18')
    cv.vline(chx - 1, 101, 121, '#140e18'); cv.vline(chx + 20, 101, 121, '#140e18')
    cv.vline(chx + 2, 101, 121, 'WD0'); cv.vline(chx + 19, 101, 121, 'WD0')

# ------------------------------------------------ lampara colgante
cv.vline(LX, 4, LY - 6, '#140e18')
cv.vline(LX + 1, 4, LY - 6, 'G2')
for j in range(7):
    half = 3 + j
    for x in range(LX - half, LX + half + 2):
        col = '#3a4a3a' if x < LX + half - 1 else '#26302a'
        if j == 6:
            col = 'AM3'
        cv.p(x, LY - 6 + j, col, glow='warm' if j == 6 else None)
    cv.p(LX - half - 1, LY - 6 + j, '#140e18'); cv.p(LX + half + 2, LY - 6 + j, '#140e18')
cv.hline(LX - 3, LX + 4, LY + 1, 'AM4', glow='warm')
cv.hline(LX - 2, LX + 3, LY + 2, 'AM3', glow='warm')
cv.hline(LX - 1, LX + 2, LY - 6, '#5a6a5a')

# vineta oscura en los bordes del cuarto
for y in range(DLG_Y):
    for x in range(320):
        d = ((x - 154) / 200) ** 2 + ((y - 70) / 110) ** 2
        if d > 1.0:
            cv.p(x, y, 'N0', 0.35)
        elif d > 0.7:
            cv.p(x, y, 'N0', 0.16)

cv.apply_glow()

# ------------------------------------------------ caja de dialogo estilo Stardew
cv.rect(0, DLG_Y - 2, 320, 60, 'N0', 0.5)
tx, ty, tw, th = wood_box(cv, 4, DLG_Y, 234, 54)
draw_text(cv, tx + 8, ty + 8, "Che, Juan... mirá la nieve.", 'INK', shadow='PAR2')
draw_text(cv, tx + 8, ty + 24, "Brilla.", 'INK', shadow='PAR2')
# destellito al lado de "Brilla."
sx_ = tx + 8 + text_width("Brilla.") + 6
for dx, dy in ((0, -2), (0, 2), (-2, 0), (2, 0)):
    cv.p(sx_ + dx, ty + 27 + dy, 'SN1')
cv.p(sx_, ty + 27, 'SN0')
# flechita de "continuar"
ax_, ay_ = tx + tw - 10, ty + th - 8
for k in range(4):
    cv.hline(ax_ - 3 + k, ax_ + 3 - k, ay_ + k, 'RED')
cv.hline(ax_ - 3, ax_ + 3, ay_ - 1, '#7a2e3a')

# retrato
px, py, pw, ph = wood_box(cv, 242, DLG_Y, 74, 54)
cv.rect(px, py, pw, ph, '#2a2238')
for y in range(py, py + ph):
    for x in range(px, px + pw):
        if (y - py) > ph * 0.55 and (x + y) % 2 == 0:
            cv.p(x, y, '#352a46')
cv.hline(px, px + pw - 1, py, '#1c1626')
cv.vline(px, py, py + ph - 1, '#1c1626')

P = [
    "",
    "",
    "...........OOOOOOOOOO",
    ".........OOHHHHLLLHHHOO",
    "........OHHHHLLLLHHHHHhO",
    ".......OHHHHLLHHHHHHHHhhO",
    ".......OHHHHHHHHHHHHHHhhO",
    "......OHHHHHHHHHHHHHHHhhhO",
    "......OHHHHSSSSSSSSSSSHhhO",
    "......OHHSSSSSSSSSSSSSShhO",
    "......OHSSSSSSSSSSSSSSSShO",
    "......OSSBBBBSSSSSSBBBBSsO",
    "......OSGGGGGGSSSSGGGGGGsO",
    "......OSGQSSSGGGGGGQSSSGsO",
    "......OSGSEESGSSSSGSEESGsO",
    "......OSGSSSSGSSnSGSSSSGsO",
    "......OSGGGGGGSSnSGGGGGGsO",
    "......OSSSSSSSSSnnSSSSSSsO",
    "......OsSSSSSSSnnnSSSSSSsO",
    "......OsSSSSSSSSSSSSSSSssO",
    ".......OsSSSSMMMMMMSSSssO",
    ".......OssSSSSSSSSSSSsssO",
    "........OssSSSSSSSSSsssO",
    ".........OOssssssssssOO",
    "...........OddddddddO",
    ".......OOOJWWWddddWWWJOOO",
    ".....OOJJJJWWWWRRWWWWJJJJOO",
    "....OJJJJJJkWWWRRWWWkJJJJjjO",
    "...OJJJJJJJJkWRRRRWkJJJJJjjjO",
    "..OJJJJJJJJJJkRRRRkJJJJJJjjjjO",
    "..OJJJJJJJJJJJkRRkJJJJJJJjjjjO",
    "..OJJJJJJJJJJJJRRJJJJJJJJjjjjO",
]
PM = dict(O='OUT', H='#1e1a26', h='#120f18', L='#3c3448', S='SK', s='SK2', d='SK3', n='SK2',
          B='#1e1a26', G='#4a4250', Q='#d8e8ff', E='#1a1426', M='#8a4a48', W='#dcdce6',
          R='#7a2e3a', J='#6b4a3a', j='#4a3028', k='#8a6450')
P = [r.ljust(32, '.') for r in P]
for r in P:
    assert len(r) == 32, r
pox, poy = px + (pw - 32) // 2, py + 1
blit_grid(cv, P, PM, pox, poy)
# luz calida de la lampara en el lado izquierdo de la cara
for j, r in enumerate(P):
    for i, ch in enumerate(r):
        if ch in 'Ss' and i < 11:
            cv.p(pox + i, poy + j, 'AM3', 0.3)
# placa con el nombre
name = "Favalli"
nw = text_width(name)
nx, ny = px + (pw - nw) // 2, py + ph - 11
cv.rect(nx - 4, ny - 2, nw + 8, 11, 'WD2')
cv.hline(nx - 4, nx + nw + 3, ny - 2, 'WD3')
cv.frame(nx - 5, ny - 3, nw + 10, 13, 'WD0')
draw_text(cv, nx, ny, name, 'PAR', shadow='WD0')

cv.save('altillo')
print('ok')
