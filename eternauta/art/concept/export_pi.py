"""Exporta los entregables de arte de "Por implementar" (art/direccion/DIRECCION.md)
a art/concept/out/pi/, con la MISMA estructura que art/sprites/<hoja>/.
El worker solo copia cada carpeta a art/sprites/ y corre `npm run sprites:pack`:
no hay que redibujar nada.
Uso (desde eternauta/art/concept): python3 export_pi.py
"""
import json
import os
import shutil

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
PI = os.path.join(OUT, 'pi')
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))

DIRS = ['abajo', 'arriba', 'izquierda', 'derecha']     # orden de filas de chars2 (down, up, left, right)


def save(im, *path):
    p = os.path.join(PI, *path)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    im.save(p)
    return p


def chars2_frames(sheet_png, who):
    sh = Image.open(sheet_png).convert('RGBA')
    for r, d in enumerate(DIRS):
        for c in range(8):
            fr = sh.crop((c * 16, r * 32, (c + 1) * 16, (r + 1) * 32))
            name = f'{d}_caminar_{c + 1}.png' if c < 6 else f'{d}_quieto_{c - 5}.png'
            save(fr, 'chars2', who, name)


def main():
    if os.path.isdir(PI):
        shutil.rmtree(PI)
    # PI-3 · traje unificado (un PNG por cuadro, como art/sprites/chars2/<id>/)
    chars2_frames(os.path.join(OUT, 'suit_unify_chars2_juan_suit.png'), 'juan_suit')
    chars2_frames(os.path.join(OUT, 'suit_unify_chars2_juan_suit_rifle.png'), 'juan_suit_rifle')

    import house_v2 as V2
    import house_v3 as V3
    # PI-6 · planta baja (hoja objects)
    save(V3.escalera(), 'objects', 'stairs_attic.png')            # 32x48, reemplaza a stairs_up en la casa
    save(V3.CAMA, 'objects', 'kid_bed.png')                        # 20x30
    save(V2.PILETA, 'objects', 'sink.png')                         # 32x24
    save(V2.DIBUJO, 'objects', 'kid_drawing.png')                  # 14x12
    save(V2.FOTO, 'objects', 'wedding_photo.png')                  # 12x11
    save(V2.ventana_trasera(False), 'objects', 'window_back.png')  # 32x16, la ventana de Martita
    save(V2.NIEVE_PISO, 'objects', 'snow_drift.png')               # 27x5, nieve que entró (ventana abierta)
    save(V2.pared_trasera(16), 'objects', 'back_wall.png')         # 16x16, se repite en la fila 15
    # PI-1 · lamparita apagada
    shutil.copy(os.path.join(OUT, 'light3_hanging_lamp_off.png'), os.path.join(PI, 'objects', 'hanging_lamp_off.png'))
    # PI-5 · glifo de click derecho (hoja buttons)
    os.makedirs(os.path.join(PI, 'buttons'), exist_ok=True)
    shutil.copy(os.path.join(OUT, 'hud_mouse_r.png'), os.path.join(PI, 'buttons', 'mouse_r.png'))

    # PI-7 · copos (sprites sueltos; encendido = con halo cian, apagado = 28% más oscuro)
    import nieve as N
    GLOW = N.GLOW

    def flake(pts, size, on, halo_r):
        pad = halo_r if on else 0
        S = size + pad * 2
        im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
        cx = cy = (size // 2) + pad
        if on:
            for dy in range(-halo_r, halo_r + 1):
                for dx in range(-halo_r, halo_r + 1):
                    if abs(dx) + abs(dy) == halo_r:
                        im.putpixel((cx + dx, cy + dy), GLOW + (150,))
        for (x, y, c) in pts:
            if c == N.SH:
                col = c
            else:
                col = c if on else tuple(int(v * 0.72) for v in c)
            im.putpixel((x + pad, y + pad), col + (255,))
        return im
    os.makedirs(os.path.join(PI, 'snow_flakes'), exist_ok=True)
    save(Image.new('RGBA', (1, 1), (200, 226, 238, 255)), 'snow_flakes', 'back_on.png')
    save(Image.new('RGBA', (1, 1), (120, 150, 180, 255)), 'snow_flakes', 'back_off.png')
    save(flake(N.SPR_MID, 3, True, 2), 'snow_flakes', 'mid_on.png')        # 7x7
    save(flake(N.SPR_MID, 3, False, 0), 'snow_flakes', 'mid_off.png')      # 3x3
    save(flake(N.SPR_FRONT, 6, True, 3), 'snow_flakes', 'front_on.png')    # 12x12
    save(flake(N.SPR_FRONT, 6, False, 0), 'snow_flakes', 'front_off.png')  # 6x6

    # PI-9 · marco de la vista del altillo: imagen 480x270, el vidrio transparente salvo
    # la escarcha y los reflejos (que quedan semitransparentes encima del paisaje).
    import vista as VI
    black = Image.new('RGB', (480, 270), (0, 0, 0))
    white = Image.new('RGB', (480, 270), (255, 255, 255))

    def comp(bg):
        base = VI.wall()
        base.paste(bg.crop((VI.GX0, VI.GY0, VI.GX1 + 1, VI.GY1 + 1)), (VI.GX0, VI.GY0))
        im = VI.frame_layer(base)
        mx, my = VI.mullions(im)
        VI.frost_and_reflect(im, mx, my)
        return im
    a, b = comp(black), comp(white)
    over = Image.new('RGBA', (480, 270), (0, 0, 0, 0))
    pa, pb, po = a.load(), b.load(), over.load()
    for y in range(270):
        for x in range(480):
            ca, cb = pa[x, y], pb[x, y]
            if ca == cb:
                po[x, y] = ca + (255,)
            else:
                alpha = 1 - (cb[0] - ca[0]) / 255
                if alpha > 0.02:
                    col = tuple(min(255, int(ca[i] / max(alpha, 1e-3))) for i in range(3))
                    po[x, y] = col + (int(alpha * 255),)
    save(over, 'views', 'attic_frame.png')
    json.dump({'glass': [VI.GX0, VI.GY0, VI.GX1 - VI.GX0 + 1, VI.GY1 - VI.GY0 + 1]},
              open(os.path.join(PI, 'views', 'attic_frame.json'), 'w'))
    print('ok', PI)


if __name__ == '__main__':
    main()
