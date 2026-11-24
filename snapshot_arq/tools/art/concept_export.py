"""Exporta el arte del concepto (art/concept) a public/assets/ del juego.

Uso: python3 tools/art/concept_export.py
Nunca escribe dentro de art/concept/ (si un generador guarda en su OUT, se
parchea a un directorio temporal antes de llamarlo).
"""
import json
import os
import shutil
import sys
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent.parent
CONCEPT = ROOT / 'art' / 'concept'
ART = ROOT / 'tools' / 'art'
OUT = ROOT / 'public' / 'assets'

sys.dont_write_bytecode = True
sys.path.insert(0, str(CONCEPT))
sys.path.insert(0, str(ART))
sys.path.insert(0, str(ROOT / 'tools'))
from sprites import skip_if_edited  # noqa: E402  hojas editadas a mano

from pixel import Pix, hx, mix  # noqa: E402
import characters as ch        # noqa: E402
import calco_juan              # noqa: E402
import suit                    # noqa: E402
import houses as houses_art    # noqa: E402
import street                  # noqa: E402
import trees                   # noqa: E402
import vehicles                # noqa: E402
import house                   # noqa: E402
import garage                  # noqa: E402
import props                   # noqa: E402
import window_view             # noqa: E402
import lighting                # noqa: E402
import character_views         # noqa: E402
import cascarudos              # noqa: E402
import fx                      # noqa: E402
import fx_shooting             # noqa: E402
import title_bg                # noqa: E402


# --------------------------------------------------------------- helpers
def to_img(obj):
    if isinstance(obj, Image.Image):
        return obj.convert('RGBA')
    return obj.img.convert('RGBA')


def save_png(img, name):
    if skip_if_edited(name):
        return
    path = OUT / name
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path)
    print(f"{str(path.relative_to(ROOT)):<34} {img.width}x{img.height}")


def save_json(data, name, detail=''):
    if skip_if_edited(name):
        return
    path = OUT / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n',
                    encoding='utf-8')
    print(f"{str(path.relative_to(ROOT)):<34} {detail}")


def pack(items, maxw=512, pad=2):
    """Acomoda [(nombre, objeto_img)] en filas. Devuelve (Pix, frames)."""
    placed = []
    x, y, rowh = pad, pad, 0
    for name, obj in items:
        img = to_img(obj)
        w, h = img.size
        if x + w + pad > maxw and x > pad:
            x = pad
            y += rowh + pad
            rowh = 0
        placed.append((name, img, x, y, w, h))
        x += w + pad
        rowh = max(rowh, h)
    W = max(px + w for _, _, px, _, w, _ in placed) + pad
    H = y + rowh + pad
    atlas = Pix(W, H)
    frames = {}
    for name, img, px, py, w, h in placed:
        atlas.img.alpha_composite(img, (px, py))
        frames[name] = [px, py, w, h]
    atlas.px = atlas.img.load()
    return atlas, frames


def save_atlas(atlas, png, meta, items, detail):
    if skip_if_edited(png):
        return
    save_png(atlas.img, png)
    save_json({'frames': dict(items)}, meta, detail)


def export_chars2():
    atlas, data = character_views.build()
    save_png(atlas.img, 'chars2.png')
    save_json(data, 'chars2.json', f"{len(data['blocks'])} personajes")


# --------------------------------------------------------------- retratos
def export_portraits():
    scale = lambda obj: to_img(obj).resize((64, 64), Image.NEAREST)
    dlg_items = [
        ('juan', scale(ch.portrait('juan'))),           # mismo modelo que el resto
        ('favalli', scale(ch.portrait('favalli'))),
        ('lucas', scale(ch.portrait('lucas'))),
        ('polsky', scale(ch.portrait('polsky'))),
        ('elena', scale(ch.portrait('elena'))),
        ('martita', scale(ch.portrait('martita'))),
        ('juan_suit', scale(suit.portrait_suit())),
        ('juan_rifle', scale(suit.portrait_rifle())),
    ]
    atlas, frames = pack(dlg_items, maxw=64 * len(dlg_items) + 3 * len(dlg_items) + 8)
    save_png(atlas.img, 'portraits_dlg.png')
    blocks = {n: {'x': f[0], 'y': f[1]} for n, f in frames.items()}
    save_json({'cell': {'w': 64, 'h': 64}, 'blocks': blocks}, 'portraits_dlg.json',
              f"{len(blocks)} retratos 64x64")
    panel_items = [(n, to_img(ch.portrait(n))) for n in
                   ('juan', 'favalli', 'lucas', 'polsky', 'elena', 'martita')]
    panel_items.append(('juan_suit', to_img(suit.portrait_suit())))
    atlas, frames = pack(panel_items, maxw=32 * len(panel_items) + 3 * len(panel_items) + 8)
    save_png(atlas.img, 'portraits_panel.png')
    blocks = {n: {'x': f[0], 'y': f[1]} for n, f in frames.items()}
    save_json({'cell': {'w': 32, 'h': 32}, 'blocks': blocks}, 'portraits_panel.json',
              f"{len(blocks)} retratos 32x32")


# --------------------------------------------------------------- casas
def export_houses():
    items = [
        ('salvo_7', houses_art.front_gable_house('salvo', 7)),
        ('salvo_31', houses_art.front_gable_house('salvo', 31)),
        ('californiano_11', houses_art.front_gable_house('californiano', 11)),
        ('californiano_23', houses_art.front_gable_house('californiano', 23)),
    ]
    atlas, frames = pack(items, maxw=4 * 130 + 8)
    save_atlas(atlas, 'houses.png', 'houses.json', frames, f"{len(frames)} casas")


# --------------------------------------------------------------- calle
def export_street2():
    if 'crema' not in vehicles.PAINT:
        c = vehicles.CREAM
        vehicles.PAINT['crema'] = [c[0], c[1], c[2], c[3],
                                   mix(c[3], (255, 255, 255), 0.35)]
    items = [
        ('farola', street.farola()),
        ('cartel_esquina', street.cartel_esquina()),
        ('tapial48', street.tapial(48)),
        ('tapial80', street.tapial(80)),
        ('polsky_caido', street.polsky_caido()),
        ('papel', street.papel()),
        ('bush30', street.bush(30)),
        ('pino_0', trees.pine(True, glow=False, seed=3, w=36, h=64)),
        ('pino_1', trees.pine(True, glow=True, seed=8, w=36, h=64)),
        ('pino_2', trees.pine(True, glow=False, seed=13, w=36, h=64)),
        ('pino_3', trees.pine(True, glow=True, seed=18, w=36, h=64)),
        ('sedan_teal_snow', vehicles.sedan('teal', snowy=True)),
        ('sedan_bordo_snow', vehicles.sedan('bordo', snowy=True)),
        ('sedan_celeste_snow', vehicles.sedan('celeste', snowy=True)),
        ('sedan_crema_snow', vehicles.sedan('crema', snowy=True)),
        ('sedan_teal', vehicles.sedan('teal')),
        ('sedan_bordo', vehicles.sedan('bordo')),
        ('colectivo_snow', vehicles.colectivo(True)),
        ('auto_volcado', street.auto_volcado()),
        ('auto_parado', street.auto_parado()),
        ('fallen_0', window_view.fallen('#3a2a24', '#5a4030', 1)),
        ('fallen_1', window_view.fallen('#2a3a4a', '#d8d6d0', 2)),
        ('fallen_2', window_view.fallen('#4a2a2a', '#3a2a20', 3)),
    ]
    atlas, frames = pack(items, maxw=560)
    save_atlas(atlas, 'street2.png', 'street2.json', frames, f"{len(frames)} piezas")


# --------------------------------------------------------------- interiores
def export_interior2():
    items = [
        ('door_porthole', house.door_porthole()),
        ('wall_clock', house.wall_clock()),
        ('railing', house.railing()),
        ('garage_door', house.garage_door()),
        ('extractor', house.extractor()),
        ('bed', house.bed()),
        ('nightstand', house.nightstand()),
        ('crib', house.crib()),
        ('toy_horse', house.toy_horse()),
        ('alacena', house.alacena()),
        ('oil_lamp_lit', house.oil_lamp_lit()),
        ('double_door', garage.double_door()),
        ('generator', garage.generator()),
        ('bidon', garage.bidon()),
        ('bulb', garage.bulb()),
        ('broom_bucket', garage.broom_bucket()),
        ('stool', garage.stool()),
        ('bench_suit', garage.bench_suit()),
        ('oil_stain', garage.oil_stain(20, 8)),
    ]
    atlas, frames = pack(items, maxw=512)
    save_atlas(atlas, 'interior2.png', 'interior2.json', frames, f"{len(frames)} muebles")


# --------------------------------------------------------------- objetos
def export_props():
    items = [
        ('naipe_espada', props.naipe('espada')),
        ('naipe_oro', props.naipe('oro')),
        ('naipe_basto', props.naipe('basto')),
        ('naipe_basto_back', props.naipe('basto', back=True)),
        ('anotador', props.anotador()),
        ('sifon', props.sifon()),
        ('vaso', props.vaso_vino()),
        ('botella', props.botella_vino()),
        ('cenicero', props.cenicero()),
        ('mate', props.mate()),
        ('lata_roja', props.lata()),
        ('lata_verde', props.lata(hx('#3a7a4a'))),
        ('frasco', props.frasco()),
        ('frasco_marron', props.frasco(hx('#6a3a2a'))),
        ('pan', props.pan()),
        ('pava', props.pava()),
        ('lampara_aceite', props.lampara_aceite()),
        ('lista', props.lista()),
        ('valvula', props.valvula()),
        ('destornillador', props.destornillador()),
        ('pinza', props.pinza()),
        ('tela', props.tela_engomada()),
        ('rollo', props.rollo_cinta()),
        ('dressed_truco', props.dressed_truco_table()),
        ('dressed_kitchen', props.dressed_kitchen_table()),
    ]
    # Los objetos chicos llevan contorno oscuro: se leen sobre cualquier tapa.
    items = [(n, p if n.startswith('dressed_') else props.outlined(p)) for n, p in items]
    atlas, frames = pack(items, maxw=512)
    save_atlas(atlas, 'props.png', 'props.json', frames, f"{len(frames)} objetos")


# --------------------------------------------------------------- vistas
def export_views():
    tmp = Path(tempfile.mkdtemp(prefix='eternauta_views_'))
    old = window_view.OUT
    window_view.OUT = str(tmp)
    try:
        window_view.build_panorama()
        pano = Image.open(tmp / 'panorama.png').convert('RGBA')
        save_png(pano, 'views/attic_pan.png')
        dark = lighting.blackout(pano)
        save_png(dark, 'views/attic_pan_dark.png')
        living = window_view.build_living_view()
        save_png(to_img(living), 'views/living.png')
    finally:
        window_view.OUT = old
        shutil.rmtree(tmp, ignore_errors=True)


# --------------------------------------------------------------- atlas nuevos
def export_cascarudos():
    items = cascarudos.build()
    atlas, frames = pack(items, maxw=560)
    save_atlas(atlas, 'cascarudos.png', 'cascarudos.json', frames,
               f"{len(frames)} cuadros")


def export_fx():
    items = fx.build()
    atlas, frames = pack(items, maxw=256)
    save_atlas(atlas, 'fx.png', 'fx.json', frames, f"{len(frames)} efectos")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'views').mkdir(parents=True, exist_ok=True)
    export_chars2()
    export_portraits()
    export_houses()
    export_street2()
    export_interior2()
    export_props()
    export_views()
    export_cascarudos()
    export_fx()
    # estos tres escriben public/assets por su cuenta: se saltean si se
    # editan a mano en art/sprites/ (ver docs/sprites_pipeline.md)
    if not skip_if_edited('fx_shooting.png'):
        fx_shooting.main()   # efectos del disparo (atlas propio)
    editada = skip_if_edited('title.png')
    editada = skip_if_edited('title_sky.png') or editada
    if not editada:
        title_bg.main()      # fondo del titulo (casas, pinos, calle)
    if not skip_if_edited('items.png'):
        import item_icons
        item_icons.build()   # iconos 16x16 de todos los items


if __name__ == '__main__':
    main()
