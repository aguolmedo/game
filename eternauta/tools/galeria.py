"""Arma galeria/: todo el arte del juego ordenado por tipo, para mirarlo.

No mueve nada: los archivos originales quedan donde los usan el juego y los
generadores. La galeria tiene enlaces (symlinks) a los originales, vistas
ampliadas de las hojas del juego y un index.html para recorrerla.

    python3 tools/galeria.py      (desde eternauta/)
"""
import html
import os
import re
import shutil

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
G = os.path.join(ROOT, 'galeria')
ASSETS = os.path.join(ROOT, 'public', 'assets')
CONCEPT = os.path.join(ROOT, 'art', 'concept', 'out')
DECKS = os.path.join(ROOT, 'art', 'direccion')
BOCETOS = os.path.join(ROOT, '..', 'bocetos')
REF = os.path.join(ROOT, 'ref')

CHARS = ['juan', 'favalli', 'lucas', 'polsky', 'elena', 'martita']

# --- 1. En el juego: hoja -> carpeta. ES LA VERDAD: lo ultimo que usa el juego.
GAME = {
    'personajes': ['chars2', 'portraits_dlg', 'portraits_panel'],
    'enemigos': ['cascarudos'],
    'escenarios': ['tiles', 'houses', 'interior2', 'street2', 'snow', 'title', 'title_sky',
                   'views/attic_pan', 'views/attic_pan_dark', 'views/living'],
    'objetos': ['objects', 'props', 'items'],
    'efectos': ['fx', 'fx_shooting', 'shadow', 'footprint'],
    'interfaz': ['buttons', 'cursor', 'death_panel'],
}
# hojas que el juego todavia carga pero ya no usa (reemplazadas por chars2/portraits_dlg)
GAME_OLD = ['chars', 'portraits']

# --- 2. Concept art: SOLO lo que todavia no esta en el juego. Lo demas -> viejo.
CONCEPT_RULES = [
    (r'^(enemy_mano|duo_mano)', 'enemigos/manos'),
    (r'^enemy_(cascarudos|lineup)', 'enemigos/cascarudos'),
    (r'^duo_', 'retratos-dialogo'),
    (r'^light_', 'iluminacion-apagon'),
]


def reset():
    if os.path.islink(G) or os.path.isfile(G):
        os.remove(G)
    elif os.path.isdir(G):
        shutil.rmtree(G)
    os.makedirs(G)


def link(src, dst):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    os.symlink(os.path.relpath(src, os.path.dirname(dst)), dst)


def preview(src, dst, target=900):
    """Hoja del juego ampliada (entera) sobre fondo gris, para verla bien."""
    im = Image.open(src).convert('RGBA')
    k = max(1, min(8, target // max(im.width, 1)))
    bg = Image.new('RGBA', im.size, (118, 128, 146, 255))
    bg.alpha_composite(im)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    bg.resize((im.width * k, im.height * k), Image.NEAREST).save(dst)


def build():
    reset()
    sections = []      # (titulo, [(subcarpeta, [rutas relativas a G])])

    # 1. en el juego
    sub = []
    for folder, names in GAME.items():
        files = []
        for n in names:
            src = os.path.join(ASSETS, n + '.png')
            if not os.path.exists(src):
                continue
            base = os.path.basename(n)
            dst = os.path.join(G, '1-en-el-juego', folder, base + '.png')
            preview(src, dst)
            files.append(os.path.relpath(dst, G))
        if folder == 'personajes':
            files = char_crops() + files
        sub.append((folder, files))
    sections.append(('1 · En el juego (lo último: esto manda)', sub))

    # 2. concept art
    buckets = {}
    discards = []
    for f in sorted(os.listdir(CONCEPT)):
        if not f.endswith(('.png', '.gif')):
            continue
        dest = None
        for rx, d in CONCEPT_RULES:
            if re.match(rx, f):
                dest = d
                break
        if dest is None:
            discards.append(f)
            continue
        buckets.setdefault(dest, []).append(f)
    sub = []
    for folder in sorted(buckets):
        files = []
        for f in buckets[folder]:
            dst = os.path.join(G, '2-concept-art', folder, f)
            link(os.path.join(CONCEPT, f), dst)
            files.append(os.path.relpath(dst, G))
        sub.append((folder, files))
    sections.append(('2 · Concept art (diseños que todavía no están en el juego)', sub))

    # 3. direccion de arte
    files = []
    for f in sorted(os.listdir(DECKS)):
        if f.endswith('.pdf'):
            dst = os.path.join(G, '3-direccion-de-arte', f)
            link(os.path.join(DECKS, f), dst)
            files.append(os.path.relpath(dst, G))
    sections.append(('3 · Dirección de arte (PDF)', [('', files)]))

    # 4. bocetos originales
    sub = []
    for game in sorted(os.listdir(BOCETOS)):
        d = os.path.join(BOCETOS, game)
        if not os.path.isdir(d):
            continue
        files = []
        for f in sorted(os.listdir(d)):
            if f.endswith('.png') and not f.endswith('_1x.png'):
                dst = os.path.join(G, '4-bocetos', game, f)
                link(os.path.join(d, f), dst)
                files.append(os.path.relpath(dst, G))
        sub.append((game, files))
    sections.append(('4 · Bocetos iniciales (viejos, solo referencia)', sub))

    # 5. referencias (del cómic y de estilo; el cómic entero queda en ref/comic)
    files = []
    for f in sorted(os.listdir(REF)):
        p = os.path.join(REF, f)
        if f.endswith(('.png', '.jpg')):
            dst = os.path.join(G, '5-referencias', f)
            link(p, dst)
            files.append(os.path.relpath(dst, G))
    manos = []
    for f in sorted(os.listdir(os.path.join(REF, 'manos'))):
        dst = os.path.join(G, '5-referencias', 'manos', f)
        link(os.path.join(REF, 'manos', f), dst)
        manos.append(os.path.relpath(dst, G))
    link(os.path.join(REF, 'comic'), os.path.join(G, '5-referencias', 'comic-completo'))
    sections.append(('5 · Referencias', [('', files), ('manos', manos)]))

    # 6. viejo: concept art ya pasado al juego o descartado, y hojas sin uso
    files = []
    for n in GAME_OLD:
        dst = os.path.join(G, '6-viejo', 'hojas-sin-uso', n + '.png')
        preview(os.path.join(ASSETS, n + '.png'), dst)
        files.append(os.path.relpath(dst, G))
    old = []
    for f in discards:
        dst = os.path.join(G, '6-viejo', 'concept', f)
        link(os.path.join(CONCEPT, f), dst)
        old.append(os.path.relpath(dst, G))
    sections.append(('6 · Viejo (no usar: confunde)', [('hojas sin uso', files), ('concept viejo', old)]))

    write_index(sections)
    n = sum(len(fs) for _, sub in sections for _, fs in sub)
    print(f'galeria: {n} archivos -> {G}/index.html')


def char_crops():
    """Un recorte por personaje de chars2 (4 direcciones x 8 cuadros), x4."""
    import json
    d = json.load(open(os.path.join(ASSETS, 'chars2.json')))
    sheet = Image.open(os.path.join(ASSETS, 'chars2.png')).convert('RGBA')
    cw, ch = d['cell']['w'] * d['cols'], d['cell']['h'] * d['rows']
    out = []
    for cid in d['ids']:
        b = d['blocks'][cid]
        dst = os.path.join(G, '1-en-el-juego', 'personajes', f'sprite_{cid}.png')
        preview_img(sheet.crop((b['x'], b['y'], b['x'] + cw, b['y'] + ch)), dst, k=4)
        out.append(os.path.relpath(dst, G))
    return out


def preview_img(im, dst, k=4):
    bg = Image.new('RGBA', im.size, (118, 128, 146, 255))
    bg.alpha_composite(im)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    bg.resize((im.width * k, im.height * k), Image.NEAREST).save(dst)


def write_index(sections):
    out = []
    nav = ''.join(f'<a href="#s{i}">{html.escape(t)}</a>' for i, (t, _) in enumerate(sections))
    for i, (title, sub) in enumerate(sections):
        out.append(f'<h2 id="s{i}">{html.escape(title)}</h2>')
        for folder, files in sub:
            if folder:
                out.append(f'<h3>{html.escape(folder)}</h3>')
            cards = []
            for f in files:
                name = html.escape(os.path.basename(f))
                if f.endswith('.pdf'):
                    cards.append(f'<a class="card pdf" href="{f}">📄 {name}</a>')
                else:
                    cards.append(f'<a class="card" href="{f}"><img src="{f}" loading="lazy"><span>{name}</span></a>')
            out.append('<div class="grid">' + ''.join(cards) + '</div>')
    doc = f'''<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>El Eternauta · Galería</title><style>
body{{background:#11162a;color:#dfe6f2;font:15px system-ui,sans-serif;margin:0 24px 60px}}
nav{{position:sticky;top:0;background:#11162a;padding:12px 0;display:flex;gap:14px;flex-wrap:wrap;border-bottom:1px solid #2e3c5a;z-index:2}}
nav a{{color:#9fbfd4;text-decoration:none}}
h1{{font-weight:600;margin:24px 0 4px}} h2{{margin-top:40px;color:#ecab4c}} h3{{color:#9fbfd4;margin:22px 0 8px}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}}
.card{{background:#1b2440;border:1px solid #2e3c5a;border-radius:6px;padding:8px;color:#dfe6f2;text-decoration:none;display:flex;flex-direction:column;gap:6px}}
.card img{{width:100%;height:180px;object-fit:contain;image-rendering:pixelated;background:#76808f}}
.card span{{font-size:12px;color:#9aa6bc;word-break:break-all}}
.pdf{{justify-content:center;min-height:60px;font-size:16px}}
</style></head><body><h1>El Eternauta · Galería de arte</h1>
<p><b>Lo que está en el juego es lo último y manda.</b> El concept art es solo lo que falta llevar al juego. Lo de “Viejo” no se usa. Generada con <code>python3 tools/galeria.py</code>; los archivos son enlaces a los originales.</p>
<nav>{nav}</nav>{''.join(out)}</body></html>'''
    with open(os.path.join(G, 'index.html'), 'w') as f:
        f.write(doc)


if __name__ == '__main__':
    build()
