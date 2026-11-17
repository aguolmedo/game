#!/usr/bin/env python3
"""Pruebas de tools/sprites.py (Python + Pillow, sin dependencias nuevas).

Uso: python3 tools/test_sprites.py
"""
import json
import sys
import tempfile
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import sprites  # noqa: E402


def _overlap(a, b):
    return not (a[0] + a[2] <= b[0] or b[0] + b[2] <= a[0] or
                a[1] + a[3] <= b[1] or b[1] + b[3] <= a[1])


def _rects(name, sheet_meta, data):
    if sheet_meta['kind'] == 'atlas':
        return {n: list(r) for n, r in data['frames'].items()}
    bw, bh, _, _ = sprites.block_size(sheet_meta['meta'])
    return {n: [b['x'], b['y'], bw, bh] for n, b in data['blocks'].items()}


def _assert_pack_ok(name, sprites_root, assets_root):
    """Cada rectángulo del json contiene exactamente el PNG del sprite."""
    folder = sprites_root / name
    sheet_meta = json.loads((folder / '_sheet.json').read_text())
    data = json.loads((assets_root / (name + '.json')).read_text())
    rects = _rects(name, sheet_meta, data)
    files = sprites.sprite_files(folder)
    assert set(rects) == set(files), f"{name}: ids distintos de los PNG"
    with Image.open(assets_root / (name + '.png')) as sheet:
        sheet = sheet.convert('RGBA')
        for n, r in rects.items():
            with Image.open(files[n]) as sprite:
                sprite = sprite.convert('RGBA')
            assert (r[2], r[3]) == sprite.size, \
                f"{name}/{n}: rect {r[2]}x{r[3]} != png {sprite.size}"
            assert r[0] >= 0 and r[1] >= 0, f"{name}/{n}: rect negativo"
            assert r[0] + r[2] <= sheet.width and \
                r[1] + r[3] <= sheet.height, f"{name}/{n}: fuera de la hoja"
            crop = sheet.crop((r[0], r[1], r[0] + r[2], r[1] + r[3]))
            assert crop.tobytes() == sprite.tobytes(), \
                f"{name}/{n}: píxeles distintos"
    names = list(rects)
    for i, a in enumerate(names):
        for b in names[i + 1:]:
            assert not _overlap(rects[a], rects[b]), \
                f"{name}: {a} y {b} se superponen"


def test_split_pack_identico():
    """Split + pack de todas las hojas deja píxeles y json iguales."""
    with tempfile.TemporaryDirectory(prefix='sprites_test_') as td:
        tmp = Path(td)
        spr, out = tmp / 'sprites', tmp / 'assets'
        for name in sprites.SHEETS:
            sprites.split_sheet(name, sprites.ASSETS, spr, force=True,
                                quiet=True)
            sprites.pack_sheet(name, out, spr, quiet=True)
            with Image.open(sprites.ASSETS / (name + '.png')) as a, \
                    Image.open(out / (name + '.png')) as b:
                assert a.convert('RGBA').tobytes() == \
                    b.convert('RGBA').tobytes(), f"{name}: píxeles distintos"
            if sprites.kind(name) != 'image':
                ja = json.loads((sprites.ASSETS / (name + '.json')).read_text())
                jb = json.loads((out / (name + '.json')).read_text())
                assert ja == jb, f"{name}: json distinto"


def test_agrandar_interior2():
    """Agrandar 4 px un PNG de interior2 reempaqueta exacto y sin choques."""
    with tempfile.TemporaryDirectory(prefix='sprites_test_') as td:
        tmp = Path(td)
        spr, out = tmp / 'sprites', tmp / 'assets'
        sprite = 'bed'
        sprites.split_sheet('interior2', sprites.ASSETS, spr, force=True,
                            quiet=True)
        png = spr / 'interior2' / (sprite + '.png')
        with Image.open(png) as im:
            old = im.size
            bigger = Image.new('RGBA', (old[0] + 4, old[1] + 4), (0, 0, 0, 0))
            bigger.paste(im.convert('RGBA'), (0, 0))
            bigger.save(png)
        sprites.pack_sheet('interior2', out, spr, quiet=True)
        _assert_pack_ok('interior2', spr, out)
        data = json.loads((out / 'interior2.json').read_text())
        x, y, w, h = data['frames'][sprite]
        assert (w, h) == (old[0] + 4, old[1] + 4), \
            f"{sprite}: el json no apunta al PNG agrandado ({w}x{h})"
        meta = json.loads((spr / 'interior2' / '_sheet.json').read_text())
        assert w + x <= meta['size'][0] and h + y <= meta['size'][1], \
            'el _sheet.json no se actualizó'


def test_bloque_con_tamaño_incorrecto():
    """Un PNG de bloque que no mide lo que el cuadro falla con mensaje claro."""
    with tempfile.TemporaryDirectory(prefix='sprites_test_') as td:
        tmp = Path(td)
        spr, out = tmp / 'sprites', tmp / 'assets'
        sprites.split_sheet('chars2', sprites.ASSETS, spr, force=True,
                            quiet=True)
        png = spr / 'chars2' / 'juan' / 'abajo_caminar_1.png'
        with Image.open(png) as im:
            im.crop((0, 0, im.width - 4, im.height)).save(png)
        try:
            sprites.pack_sheet('chars2', out, spr, quiet=True)
        except SystemExit as err:
            msg = str(err)
            assert 'chars2/juan/abajo_caminar_1.png tiene que medir 16x32' in msg, msg
        else:
            raise AssertionError('pack no falló con un bloque de tamaño mal')


def main():
    tests = [test_split_pack_identico, test_agrandar_interior2,
             test_bloque_con_tamaño_incorrecto]
    for test in tests:
        test()
        print(f"OK  {test.__name__}")
    print(f"\n{len(tests)} test(s) OK")
    return 0


if __name__ == '__main__':
    sys.exit(main())
