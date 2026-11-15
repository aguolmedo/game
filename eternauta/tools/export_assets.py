"""Exporta todos los assets 1x del juego El Eternauta a public/assets/.

Los generadores viven en tools/art/ (Python + Pillow). La fuente chica y el
snow/shadow salen de bocetos/eternauta (solo lectura: nunca se escribe ahi).

Uso: python3 tools/export_assets.py
"""
import importlib.util
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / 'tools' / 'art'
BOCETOS = ROOT.parent / 'bocetos' / 'eternauta'
SCRIPTS = BOCETOS / 'scripts'
OUT = ROOT / 'public' / 'assets'

sys.dont_write_bytecode = True
sys.path.insert(0, str(ART))
import chars as art_chars        # noqa: E402
import items as art_items        # noqa: E402
import tiles as art_tiles        # noqa: E402
import objects as art_objects    # noqa: E402
import buttons as art_buttons    # noqa: E402
import font_extra                # noqa: E402
import sidechars                 # noqa: E402
from pixel import Pix            # noqa: E402

if (ART / 'title_bg.py').exists():
    import title_bg              # noqa: E402
else:
    title_bg = None


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


lib = load_module('bocetos_lib', SCRIPTS / 'lib.py')

ASSETS = [
    'title.png', 'tiles.png', 'tiles.json', 'objects.png', 'objects.json',
    'buttons.png', 'buttons.json', 'chars.png', 'chars.json',
    'portraits.png', 'portraits.json', 'items.png', 'items.json',
    'font.json', 'snow.png', 'shadow.png', 'footprint.png', 'manifest.json',
]


def save_img(img, name):
    img.save(OUT / name)
    print(f"{name:<16} {img.width}x{img.height} {img.mode}")


def save_json(data, name, detail=''):
    text = json.dumps(data, ensure_ascii=False, indent=1) + '\n'
    (OUT / name).write_text(text, encoding='utf-8')
    print(f"{name:<16} {detail}")


def export_atlas(mod, png, meta, detail):
    atlas, frames = mod.build()
    save_img(atlas.img, png)
    save_json({'frames': {k: list(v) for k, v in frames.items()}}, meta, detail)


def export_title():
    # el titulo usa el mismo arte que el resto del juego (casas, pinos, calle)
    if title_bg is not None:
        title_bg.main()
    else:
        save_img(art_tiles.build()[0].img.convert('RGBA'), 'title.png')


def export_chars():
    atlas, blocks = art_chars.build_atlas()
    side_atlas, side_blocks = sidechars.build()
    combined = Pix(atlas.w + side_atlas.w, atlas.h)
    combined.img.alpha_composite(atlas.img, (0, 0))
    combined.img.alpha_composite(side_atlas.img, (atlas.w, 0))
    all_blocks = dict(blocks)
    for name, x in side_blocks.items():
        all_blocks[name] = x + atlas.w
    save_img(combined.img, 'chars.png')
    boxed = {}
    for name, x in all_blocks.items():
        boxed[name] = {'x': x if isinstance(x, int) else x[0], 'y': 0,
                       'w': 16 * 6, 'h': 32 * 4}
    order = ['juan', 'juan_suit', 'favalli', 'lucas', 'polsky', 'elena', 'martita']
    data = {
        'cell': {'w': 16, 'h': 32},
        'cols': 6,
        'rows': 4,
        'walkFrames': [0, 1, 2, 3],
        'idleFrames': [4, 5],
        'dirs': ['down', 'up', 'left', 'right'],
        'order': order,
        'labels': {name: name for name in order},
        'blocks': {name: boxed[name] for name in order},
    }
    save_json(data, 'chars.json', f"{len(order)} personajes")

    portraits = art_chars.build_portraits()
    side_portraits = sidechars.build_portraits()
    port = Pix(portraits.w + side_portraits.w, 32)
    port.img.alpha_composite(portraits.img, (0, 0))
    port.img.alpha_composite(side_portraits.img, (portraits.w, 0))
    save_img(port.img, 'portraits.png')
    save_json({'cell': {'w': 32, 'h': 32}, 'order': order}, 'portraits.json',
              f"{len(order)} retratos")


def export_items():
    atlas = art_items.build_atlas()
    save_img(atlas.img, 'items.png')
    frames = {entry['id']: [entry['x'], entry['y'], entry['w'], entry['h']]
              for entry in art_items.build_json()}
    save_json({'cell': {'w': 16, 'h': 16}, 'frames': frames}, 'items.json',
              f"{len(frames)} items")


def export_font():
    glyphs = {ch: list(rows) for ch, rows in lib.F.items()}
    glyphs.update({ch: list(rows) for ch, rows in font_extra.extra().items()})
    if '…' not in glyphs:
        glyphs['…'] = ['.....', '.....', '.....', '.....', '.....', '#.#.#', '.....']
    if '+' not in glyphs:
        glyphs['+'] = ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....']
    if 'ü' not in glyphs:
        glyphs['ü'] = ['..#..', '.....', '.###.', '#...#', '#...#', '#...#', '.###.']
    save_json({'spacing': 1, 'glyphs': glyphs}, 'font.json', f"{len(glyphs)} glyphs")


def export_snow_shadow():
    img = Image.new('RGBA', (3, 3), (0, 0, 0, 0))
    img.putpixel((1, 1), lib.C['SN4'] + (255,))
    for x, y in ((1, 0), (0, 1), (2, 1), (1, 2)):
        img.putpixel((x, y), lib.C['GL'] + (255,))
    save_img(img, 'snow.png')
    img = Image.new('RGBA', (16, 6), (0, 0, 0, 0))
    px = img.load()
    for y in range(6):
        for x in range(16):
            d = ((x + 0.5 - 8) / 8) ** 2 + ((y + 0.5 - 3) / 3) ** 2
            if d <= 1.0:
                a = int(150 * (1 - d * 0.55))
                px[x, y] = (24, 18, 38, a)
    save_img(img, 'shadow.png')


def export_footprint():
    if hasattr(art_objects, 'footprint'):
        img = art_objects.footprint()
        save_img(img.img if hasattr(img, 'img') else img, 'footprint.png')
    else:
        img = Image.new('RGBA', (6, 3), (0, 0, 0, 0))
        for x, y in ((1, 0), (2, 0), (3, 1), (4, 1), (1, 2), (2, 2)):
            img.putpixel((x, y), (28, 32, 54, 200))
        save_img(img, 'footprint.png')


def export_manifest():
    save_json({'assets': ASSETS, 'version': 3}, 'manifest.json',
              f"{len(ASSETS)} archivos")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    export_title()
    export_atlas(art_tiles, 'tiles.png', 'tiles.json', 'tiles 16x16')
    export_atlas(art_objects, 'objects.png', 'objects.json', 'objetos del mundo')
    export_atlas(art_buttons, 'buttons.png', 'buttons.json', 'glifos de botones')
    export_chars()
    export_items()
    sys.path.insert(0, str(Path(__file__).resolve().parent / 'art'))
    import item_icons
    item_icons.build()   # completa items.png con los iconos de los items nuevos
    export_font()
    export_snow_shadow()
    export_footprint()
    export_manifest()


if __name__ == '__main__':
    main()
