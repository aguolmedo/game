#!/usr/bin/env python3
"""Hojas de sprites editables a mano: split / pack / check.

Cada sprite vive como PNG suelto en art/sprites/<hoja>/<nombre>.png y se
rearma public/assets/<hoja>.png + .json con `pack`. Ver docs/sprites_pipeline.md.

Uso:
  python3 tools/sprites.py split [hoja...] [--force]
  python3 tools/sprites.py pack  [hoja...]
  python3 tools/sprites.py check [hoja...]
"""
import json
import shutil
import sys
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'public' / 'assets'
SPRITES = ROOT / 'art' / 'sprites'

# Hojas por tipo (formato de public/assets/<hoja>.json)
ATLAS = ['buttons', 'cascarudos', 'fx', 'fx_shooting', 'houses', 'interior2',
         'objects', 'props', 'street2', 'tiles', 'items', 'cursor']
BLOCKS = ['chars2', 'portraits_dlg', 'portraits_panel']
IMAGES = ['title', 'title_sky', 'snow', 'shadow', 'footprint', 'death_panel',
          'views/attic_pan', 'views/attic_pan_dark', 'views/living']
SHEETS = ATLAS + BLOCKS + IMAGES

PAD = 2          # separación entre sprites al reempaquetar
MIN_WIDTH = 256  # ancho mínimo de hoja al reempaquetar

_warned = set()


# ------------------------------------------------------------------ helpers
def kind(sheet):
    if sheet in ATLAS:
        return 'atlas'
    if sheet in BLOCKS:
        return 'blocks'
    if sheet in IMAGES:
        return 'image'
    raise SystemExit(f"hoja desconocida: {sheet}")


def sheet_of(path):
    """'views/attic_pan.png' -> 'views/attic_pan' (sirve para png y json)."""
    name = str(path).replace('\\', '/')
    for ext in ('.png', '.json'):
        if name.endswith(ext):
            name = name[:-len(ext)]
    return name


def skip_if_edited(path):
    """True si la hoja se edita a mano (art/sprites/<hoja>/ existe)."""
    name = sheet_of(path)
    if not (SPRITES / name).is_dir():
        return False
    if name not in _warned:
        _warned.add(name)
        print(f"{name}: editada a mano en art/sprites, no se regenera")
    return True


def block_size(meta):
    cell = meta['cell']
    cols = meta.get('cols') or 1
    rows = meta.get('rows') or 1
    return cell['w'] * cols, cell['h'] * rows, cell['w'], cell['h']


def layout_key(k):
    return 'blocks' if k == 'blocks' else 'frames'


def write_sheet_meta(folder, sheet):
    text = json.dumps(sheet, ensure_ascii=False, indent=1) + '\n'
    (folder / '_sheet.json').write_text(text, encoding='utf-8')


def load_sheet_meta(folder):
    return json.loads((folder / '_sheet.json').read_text(encoding='utf-8'))


def sprite_files(folder):
    return {p.stem: p for p in sorted(folder.glob('*.png'))}


def shelf(order, maxw, pad=PAD):
    """Estantes: order = [(nombre, w, h)] ya ordenado. Devuelve (layout, W, H)."""
    layout = {}
    x, y, rowh = pad, pad, 0
    for name, w, h in order:
        if x + w + pad > maxw and x > pad:
            x = pad
            y += rowh + pad
            rowh = 0
        layout[name] = [x, y, w, h]
        x += w + pad
        rowh = max(rowh, h)
    W = max(r[0] + r[2] for r in layout.values()) + pad
    H = max(r[1] + r[3] for r in layout.values()) + pad
    return layout, W, H


def compose_json(sheet, layout, meta, names):
    """Json de la hoja respetando el orden de claves original."""
    key = layout_key(sheet['kind'])
    out = {}
    for k in sheet['keys']:
        if k == key:
            if sheet['kind'] == 'atlas':
                out[k] = {n: list(layout[n]) for n in names}
            else:
                out[k] = {n: {'x': layout[n][0], 'y': layout[n][1]}
                          for n in names}
        else:
            out[k] = meta[k]
    return out


# ---- chars2: cada personaje es una carpeta de cuadros numerados, para que
# LibreSprite los abra como animacion (detecta la secuencia _1, _2, ...).
FRAMED = ['chars2']
DIR_ES = {'down': 'abajo', 'up': 'arriba', 'left': 'izquierda', 'right': 'derecha'}


def frame_files(meta):
    """[(columna, fila, nombre_de_archivo)] para un bloque de personaje."""
    out = []
    for row, d in enumerate(meta['dirs']):
        for anim, cols in (('caminar', meta['walk']), ('quieto', meta['idle'])):
            for i, col in enumerate(cols, 1):
                out.append((col, row, f"{DIR_ES.get(d, d)}_{anim}_{i}.png"))
    return out


def split_frames(img, folder, layout, meta):
    _, _, cw, ch = block_size(meta)
    for n, (x, y, _, _) in layout.items():
        d = folder / n
        d.mkdir()
        for col, row, fname in frame_files(meta):
            fx, fy = x + col * cw, y + row * ch
            img.crop((fx, fy, fx + cw, fy + ch)).save(d / fname)


def assemble_frames(name, folder, meta):
    """{id: Image del bloque} armado desde las carpetas de cuadros."""
    bw, bh, cw, ch = block_size(meta)
    out = {}
    for d in sorted(p for p in folder.iterdir() if p.is_dir()):
        block = Image.new('RGBA', (bw, bh), (0, 0, 0, 0))
        for col, row, fname in frame_files(meta):
            f = d / fname
            if not f.exists():
                raise SystemExit(f"{name}/{d.name}/{fname}: falta ese cuadro")
            with Image.open(f) as im:
                if im.size != (cw, ch):
                    raise SystemExit(f"{name}/{d.name}/{fname} tiene que medir "
                                     f"{cw}x{ch} (mide {im.size[0]}x{im.size[1]})")
                block.paste(im.convert('RGBA'), (col * cw, row * ch))
        out[d.name] = block
    return out


def open_img(x):
    return x.copy() if isinstance(x, Image.Image) else Image.open(x)


# ------------------------------------------------------------------ split
def split_sheet(name, assets=ASSETS, sprites=SPRITES, force=False,
                quiet=False):
    folder = sprites / name
    if folder.exists() and not force:
        print(f"{name}: ya está en art/sprites (no se pisa, usá --force)")
        return False
    png = assets / (name + '.png')
    if not png.exists():
        print(f"{name}: falta {png.relative_to(ROOT)}")
        return False
    k = kind(name)
    img = Image.open(png).convert('RGBA')
    if folder.exists():
        shutil.rmtree(folder)
    folder.mkdir(parents=True)
    if k == 'image':
        shutil.copyfile(png, folder / png.name)
        layout = {png.stem: [0, 0, img.width, img.height]}
        meta, keys, newline = {}, [], True
    else:
        raw = (assets / (name + '.json')).read_text(encoding='utf-8')
        data = json.loads(raw)
        newline = raw.endswith('\n')
        if k == 'atlas':
            layout = {n: list(r) for n, r in data['frames'].items()}
            meta = {key: val for key, val in data.items() if key != 'frames'}
        else:
            bw, bh, _, _ = block_size(data)
            layout = {n: [b['x'], b['y'], bw, bh]
                      for n, b in data['blocks'].items()}
            meta = {key: val for key, val in data.items() if key != 'blocks'}
        keys = list(data)
        if name in FRAMED:
            split_frames(img, folder, layout, data)
        else:
            for n, (x, y, w, h) in layout.items():
                img.crop((x, y, x + w, y + h)).save(folder / (n + '.png'))
    sheet = {'kind': k, 'size': [img.width, img.height], 'layout': layout,
             'meta': meta, 'keys': keys, 'newline': newline}
    write_sheet_meta(folder, sheet)
    if not quiet:
        print(f"{name}: {len(layout)} sprite(s) -> art/sprites/{name}/")
    return True


# ------------------------------------------------------------------ pack
def pack_sheet(name, assets=ASSETS, sprites=SPRITES, quiet=False):
    folder = sprites / name
    meta_path = folder / '_sheet.json'
    if not meta_path.exists():
        print(f"{name}: falta art/sprites/{name}/_sheet.json "
              f"(corré `sprites.py split`)")
        return False
    sheet = load_sheet_meta(folder)
    k = sheet['kind']
    files = (assemble_frames(name, folder, sheet['meta']) if name in FRAMED
             else sprite_files(folder))
    if k == 'image':
        return _pack_image(name, sheet, files, folder, assets, quiet)

    saved = sheet['layout']
    names_saved = list(saved)
    added = sorted(n for n in files if n not in saved)
    removed = [n for n in names_saved if n not in files]
    sizes = {}
    for n, p in files.items():
        with open_img(p) as im:
            sizes[n] = im.size
    if not files:
        print(f"{name}: no hay PNGs en art/sprites/{name}/")
        return False

    if k == 'blocks':
        bw, bh, cw, ch = block_size(sheet['meta'])
        for n in sorted(files):
            if sizes[n] != (bw, bh):
                raise SystemExit(
                    f"{name}/{n}.png tiene que medir {bw}x{bh}: "
                    f"los cuadros son de {cw}x{ch}")

    changed = bool(added or removed) or any(
        sizes[n] != tuple(saved[n][2:]) for n in sizes)

    if not changed:
        W, H = sheet['size']
        layout = {n: list(saved[n]) for n in names_saved}
        names = names_saved
    else:
        order = sorted(((n, sizes[n][0], sizes[n][1]) for n in files),
                       key=lambda t: (-t[2], -t[1], t[0]))
        placed, W, H = shelf(order, max(MIN_WIDTH, sheet['size'][0]))
        names = [n for n in names_saved if n in files] + added
        layout = {n: placed[n] for n in names}

    meta = dict(sheet['meta'])
    if 'w' in meta and 'h' in meta:      # cursor: el json guarda el tamaño
        meta['w'], meta['h'] = W, H
    if 'ids' in meta:                    # chars2: orden de los personajes
        meta['ids'] = list(meta['ids']) + [n for n in added
                                           if n not in meta['ids']]
    data = compose_json(sheet, layout, meta, names)

    canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for n, (x, y, _, _) in layout.items():
        with open_img(files[n]) as im:
            canvas.paste(im.convert('RGBA'), (x, y))
    assets.mkdir(parents=True, exist_ok=True)
    canvas.save(assets / (name + '.png'))
    newline = '\n' if sheet.get('newline', True) else ''
    (assets / (name + '.json')).write_text(
        json.dumps(data, ensure_ascii=False, indent=1) + newline,
        encoding='utf-8')

    if changed:
        sheet['size'] = [W, H]
        sheet['layout'] = layout
        sheet['meta'] = meta
        write_sheet_meta(folder, sheet)
    if not quiet:
        accion = 'reempaquetada' if changed else 'igual'
        print(f"{name}: {len(layout)} sprite(s) {accion} -> {W}x{H}")
    return True


def _pack_image(name, sheet, files, folder, assets, quiet):
    if len(files) != 1:
        print(f"{name}: tiene que haber un solo PNG en art/sprites/{name}/")
        return False
    src = next(iter(files.values()))
    with Image.open(src) as im:
        size = [im.width, im.height]
    dest = assets / (name + '.png')
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, dest)
    layout = {src.stem: [0, 0, size[0], size[1]]}
    if sheet['size'] != size or sheet['layout'] != layout:
        sheet['size'] = size
        sheet['layout'] = layout
        write_sheet_meta(folder, sheet)
    if not quiet:
        print(f"{name}: imagen {size[0]}x{size[1]}")
    return True


# ------------------------------------------------------------------ check
def check(sheets):
    bad = []
    with tempfile.TemporaryDirectory(prefix='eternauta_sprites_') as td:
        tmp = Path(td)
        sprites_tmp = tmp / 'sprites'
        assets_tmp = tmp / 'assets'
        for name in sheets:
            split_sheet(name, ASSETS, sprites_tmp, force=True, quiet=True)
            pack_sheet(name, assets_tmp, sprites_tmp, quiet=True)
            diffs = _diff_sheet(name, assets_tmp)
            if diffs:
                bad.append(name)
                print(f"{name}: " + ', '.join(diffs))
            else:
                print(f"OK  {name}")
    if bad:
        print(f"\n{len(bad)} hoja(s) con diferencias: {', '.join(bad)}")
        return False
    print(f"\n{len(sheets)} hoja(s) OK")
    return True


def _diff_sheet(name, assets_tmp):
    diffs = []
    ref = ASSETS / (name + '.png')
    new = assets_tmp / (name + '.png')
    if not new.exists():
        return ['no se generó el png']
    with Image.open(ref) as a, Image.open(new) as b:
        a = a.convert('RGBA')
        b = b.convert('RGBA')
        if a.size != b.size:
            diffs.append(f"tamaño {a.size} != {b.size}")
        elif a.tobytes() != b.tobytes():
            diffs.append('píxeles distintos')
    if kind(name) != 'image':
        ja = json.loads((ASSETS / (name + '.json')).read_text(encoding='utf-8'))
        jb = json.loads((assets_tmp / (name + '.json')).read_text(
            encoding='utf-8'))
        if ja != jb:
            diffs.append('json distinto')
        elif (ASSETS / (name + '.json')).read_bytes() != \
                (assets_tmp / (name + '.json')).read_bytes():
            diffs.append('json con otra indentación/salto de línea')
    return diffs


# ------------------------------------------------------------------ cli
USAGE = __doc__


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    if not argv or argv[0] in ('-h', '--help'):
        print(USAGE)
        return 0 if argv else 2
    cmd, rest = argv[0], argv[1:]
    force = '--force' in rest
    names = [a for a in rest if a != '--force']
    unknown = [n for n in names if n not in SHEETS]
    if unknown:
        print(f"hoja desconocida: {', '.join(unknown)}")
        print(USAGE)
        return 2
    names = names or SHEETS
    if cmd == 'split':
        for name in names:
            split_sheet(name, force=force)
        return 0
    if cmd == 'pack':
        ok = True
        for name in names:
            ok = pack_sheet(name) and ok
        return 0 if ok else 1
    if cmd == 'check':
        return 0 if check(names) else 1
    print(f"comando desconocido: {cmd}")
    print(USAGE)
    return 2


if __name__ == '__main__':
    sys.exit(main())
