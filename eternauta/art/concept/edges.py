"""Suavizado de bordes en interiores (como Stardew).

  1. sombra de contacto: el piso se oscurece de a poco cerca de las paredes
  2. paredes con canto: tabiques con luz arriba-izq y sombra abajo-der
  3. marco alrededor del interior con esquinas redondeadas (no corte seco)
  4. umbrales de madera donde cambia el tipo de piso
"""
from pixel import hx, mix

WALL = ('plank_', 'black')
SHADE = (16, 10, 24)
TOP = [hx('#1e1620'), hx('#2e2232'), hx('#463648'), hx('#5e4c5e')]
SILL = [hx('#4a2e1c'), hx('#7a5034'), hx('#a0703e')]


def kind(name):
    if name.startswith('black'):
        return 'void'
    if name.startswith('plank_'):
        return 'wall'
    for f in ('parquet', 'wood', 'tile', 'plaster', 'rg_', 'stair', 'woodsh'):
        if name.startswith(f):
            return 'floor:' + f.rstrip('_')
    return 'wallface'                                  # pared vista de frente (yeso, ladrillo, zocalo)


def soften(sc, grid, T=16):
    rows, cols = len(grid), len(grid[0])
    K = [[kind(grid[y][x]) for x in range(cols)] for y in range(rows)]

    def at(px, py):
        tx, ty = px // T, py // T
        if 0 <= tx < cols and 0 <= ty < rows:
            return K[ty][tx]
        return 'void'

    W, H = cols * T, rows * T
    # 1) sombra de contacto sobre el piso
    for y in range(H):
        for x in range(W):
            k = at(x, y)
            if not k.startswith('floor'):
                continue
            best = 9
            for d in range(1, 5):
                for dx, dy in ((d, 0), (-d, 0), (0, d), (0, -d)):
                    if at(x + dx, y + dy) in ('wall', 'void', 'wallface'):
                        best = min(best, d)
                if best < 9:
                    break
            if best < 9:
                t = (0.38, 0.24, 0.13, 0.06)[best - 1]
                c = sc.get(x, y)
                sc.set(x, y, mix(c[:3], SHADE, t))
    # 2) tabiques con canto (luz arriba-izq, sombra abajo-der)
    for ty in range(rows):
        for tx in range(cols):
            if K[ty][tx] != 'wall':
                continue
            x0, y0 = tx * T, ty * T                      # se conserva la textura del tabique
            left_open = tx > 0 and K[ty][tx - 1] != 'wall'
            right_open = tx < cols - 1 and K[ty][tx + 1] != 'wall'
            top_open = ty > 0 and K[ty - 1][tx] != 'wall'
            bot_open = ty < rows - 1 and K[ty + 1][tx] != 'wall'
            if left_open:
                for y in range(y0, y0 + T):
                    sc.set(x0, y, TOP[3]); sc.set(x0 + 1, y, TOP[2])
            if right_open:
                for y in range(y0, y0 + T):
                    sc.set(x0 + T - 1, y, TOP[0]); sc.set(x0 + T - 2, y, TOP[0])
            if top_open:
                for x in range(x0, x0 + T):
                    sc.set(x, y0, TOP[3])
            if bot_open:
                for x in range(x0, x0 + T):
                    sc.set(x, y0 + T - 1, TOP[0]); sc.set(x, y0 + T - 2, TOP[1])
    # 3) marco alrededor del interior: borde de luz y esquinas redondeadas
    for y in range(H):
        for x in range(W):
            if at(x, y) != 'void':
                continue
            n = [at(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))]
            if any(k != 'void' for k in n):
                sc.set(x, y, TOP[2])

    # 4) umbrales donde cambia el piso
    for ty in range(rows):
        for tx in range(cols):
            a = K[ty][tx]
            if not a.startswith('floor'):
                continue
            for dx, dy in ((1, 0), (0, 1)):
                nx, ny = tx + dx, ty + dy
                if nx >= cols or ny >= rows:
                    continue
                b = K[ny][nx]
                if b.startswith('floor') and b != a and 'rg' not in a + b and 'stair' not in a + b:
                    if dx:
                        x = nx * T
                        for y in range(ty * T, ty * T + T):
                            sc.set(x - 1, y, SILL[0]); sc.set(x, y, SILL[2]); sc.set(x + 1, y, SILL[1])
                    else:
                        y = ny * T
                        for x in range(tx * T, tx * T + T):
                            sc.set(x, y - 1, SILL[0]); sc.set(x, y, SILL[2]); sc.set(x, y + 1, SILL[1])
    return sc
