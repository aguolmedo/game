"""Exporta el arte del roguelike (diseñado en art/concept/roguelike*.py y manzanas.py) al juego.

- Sprites sueltos a art/sprites/<hoja>/ (después: npm run sprites:pack):
    items   : botín (chatarra, goma, pieza_cascarudo, mochila) y los 12 íconos de mejora (mejora_*)
    objects : piezas del barrio (bicicleta, banco_plaza, busto, hamaca, baranda, vagon, barrera_*, garita,
              cruz_san_andres, alambrado, pared_*, vidrios, almacen_roto, cajon_frutas, buzon_correo,
              arbol_vereda, poste) y la mochila de otra vez (mochila_nieve_0..2), eternauta_sentado
    tiles   : balasto_0..2, via_0, via_tablon_0, nieve_pisada_0..1, estatica_0..3
    chars2  : eternauta_viejo y programador (32 cuadros cada uno; caminar = quieto por ahora)
- Imágenes de escena a public/assets/roguelike/:
    llegada_1..7.png (64x128: la tinta se cuantiza), cuarto_vacio/llegada/gag.png (320x180, luz horneada)

No pisa nada que ya exista con otro nombre. Uso: python3 tools/art/export_roguelike.py
"""
import os
import random
import sys

from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'art', 'concept'))
import roguelike as rg  # noqa: E402
import roguelike_casa as rc  # noqa: E402
import manzanas as mz  # noqa: E402

SPR = os.path.join(ROOT, 'art', 'sprites')
PUB = os.path.join(ROOT, 'public', 'assets', 'roguelike')
os.makedirs(PUB, exist_ok=True)
written = []


def save(img, *parts):
    path = os.path.join(*parts)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path)
    written.append(os.path.relpath(path, ROOT))


def fit16(img):
    """Centra en 16x16 (o recorta) para la hoja de ítems."""
    out = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    out.alpha_composite(img.crop((0, 0, min(16, img.width), min(16, img.height))),
                        ((16 - min(16, img.width)) // 2, (16 - min(16, img.height)) // 2))
    return out


def trim(img):
    box = img.getbbox()
    return img.crop(box) if box else img


# ------------------------------------------------------------------ items
def items():
    save(fit16(rg.icon(rg.chatarra)), SPR, 'items', 'chatarra.png')
    save(fit16(rg.icon(rg.goma)), SPR, 'items', 'goma.png')
    save(fit16(rg.icon(rg.pieza_cascarudo)), SPR, 'items', 'pieza_cascarudo.png')
    save(fit16(rg.mochila_sprite()), SPR, 'items', 'mochila.png')
    for mid, fn in rc.ICONOS.items():
        save(fit16(rc.ic(fn)), SPR, 'items', f'mejora_{mid}.png')


# ------------------------------------------------------------------ objects
def objects():
    o = {
        'bicicleta': mz.bicicleta(), 'banco_plaza': mz.banco(), 'busto': mz.busto(), 'hamaca': mz.hamaca(),
        'baranda': mz.baranda(32), 'vagon': mz.vagon(), 'barrera_caida': mz.barrera(rota=True),
        'barrera_alta': mz.barrera(rota='alta'), 'garita': mz.garita(), 'cruz_san_andres': mz.cruz_san_andres(),
        'alambrado': mz.alambrado(32), 'pared_ns_48': mz.pared_ns(48), 'pared_ns_62': mz.pared_ns(62),
        'pared_eo_48': mz.pared_eo(48), 'vidrios': mz.vidrios(), 'cajon_frutas': mz.cajon_frutas(),
        'buzon_correo': mz.buzon_correo(), 'arbol_vereda': mz.arbol_vereda(), 'poste': mz.poste(),
        'almacen_roto': mz.vidriera_rota(mz.OB('shop_almacen')),
        'eternauta_sentado': rg.eternauta_sentado(),
    }
    for t in range(3):
        o[f'mochila_nieve_{t}'] = rg.mochila_nieve(t)
    for name, img in o.items():
        save(trim(img) if name not in ('eternauta_sentado',) else img, SPR, 'objects', f'{name}.png')


# ------------------------------------------------------------------ tiles
def tiles():
    rng = random.Random(1)
    for i in range(3):
        save(mz.gravel(rng), SPR, 'tiles', f'balasto_{i}.png')
    # vía: balasto + durmientes + dos rieles (una vía por fila de baldosa)
    via = mz.gravel(random.Random(9))
    d = ImageDraw.Draw(via)
    for x in range(0, 16, 6):
        d.rectangle([x, 1, x + 3, 14], fill=mz.WOOD[0])
        d.line([(x, 1), (x, 14)], fill=mz.WOOD[1])
    for ry in (4, 11):
        d.line([(0, ry), (15, ry)], fill=mz.IRON[3])
        d.line([(0, ry + 1), (15, ry + 1)], fill=mz.IRON[1])
    save(via, SPR, 'tiles', 'via_0.png')
    tab = Image.new('RGBA', (16, 16), mz.WOOD[2])
    d = ImageDraw.Draw(tab)
    for y in range(0, 16, 4):
        d.line([(0, y), (15, y)], fill=mz.WOOD[1])
    for ry in (4, 11):
        d.line([(0, ry), (15, ry)], fill=mz.IRON[3])
    save(tab, SPR, 'tiles', 'via_tablon_0.png')
    # nieve pisada de los caminos de la plaza
    for i in range(2):
        t = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
        r = random.Random(30 + i)
        px = t.load()
        for y in range(16):
            for x in range(16):
                v = r.random()
                px[x, y] = rg.hx('8ea8bc') if v < 0.82 else (rg.hx('7e96aa') if v < 0.95 else rg.hx('a8c2d4'))
        save(t, SPR, 'tiles', f'nieve_pisada_{i}.png')
    # estática del continuum (borde del loop): 4 cuadros para animar
    for f in range(4):
        t = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
        r = random.Random(100 + f)
        d = ImageDraw.Draw(t)
        for y in range(0, 16, 2):
            for x in range(0, 16, 2):
                d.rectangle([x, y, x + 1, y + 1], fill=mz._static_color(r))
        if f % 2 == 0:
            yy = r.randrange(16)
            d.line([(r.randrange(8), yy), (15, yy)], fill=rg.CONT)
        save(t, SPR, 'tiles', f'estatica_{f}.png')


# ------------------------------------------------------------------ personajes (chars2)
def chars():
    for cid, fn in (('eternauta_viejo', rg.eternauta), ('programador', rg.programador)):
        views = {'abajo': fn('abajo'), 'arriba': fn('arriba'), 'derecha': fn('derecha')}
        views['izquierda'] = views['derecha'].transpose(Image.FLIP_LEFT_RIGHT)
        for d_, img in views.items():
            for k in range(1, 7):
                save(img, SPR, 'chars2', cid, f'{d_}_caminar_{k}.png')
            for k in range(1, 3):
                save(img, SPR, 'chars2', cid, f'{d_}_quieto_{k}.png')


# ------------------------------------------------------------------ imágenes de escena
def escenas():
    for i, (lbl, im) in enumerate(rg.llegada_strip()):
        save(im, PUB, f'llegada_{i + 1}.png')
    for st in ('vacio', 'llegada', 'gag'):
        save(rg.build_room(st).im, PUB, f'cuarto_{st}.png')


if __name__ == '__main__':
    items()
    objects()
    tiles()
    chars()
    escenas()
    print('\n'.join(written))
    print(f'{len(written)} archivos. Ahora: npm run sprites:pack')
