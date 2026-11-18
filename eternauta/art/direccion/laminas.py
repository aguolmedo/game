"""Láminas en alta resolución para art/direccion/DIRECCION.md.
Salen SIEMPRE de public/assets (lo que está en el juego) escaladas en múltiplos
enteros (vecino más cercano) a ~2400 px de ancho, para verse nítidas en 2K.
Uso (desde eternauta/): python3 art/direccion/laminas.py
"""
import json
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
A = os.path.join(ROOT, 'public', 'assets')
OUT = os.path.join(ROOT, 'art', 'direccion', 'doc', 'laminas')
os.makedirs(OUT, exist_ok=True)

TARGET_W = 2400
BG = (27, 22, 30)
CARD = (44, 38, 50)
INK = (238, 228, 210)
DIM = (160, 150, 140)
FONT = '/usr/share/fonts/noto/NotoSans-Regular.ttf'
BOLD = '/usr/share/fonts/noto/NotoSans-Bold.ttf'
f_lbl = ImageFont.truetype(FONT, 26)
f_ttl = ImageFont.truetype(BOLD, 40)


def img(name):
    return Image.open(os.path.join(A, name)).convert('RGBA')


def js(name):
    with open(os.path.join(A, name)) as fh:
        return json.load(fh)


def up(im, k):
    return im.resize((im.width * k, im.height * k), Image.NEAREST)


def fit_k(w, target=TARGET_W):
    return max(1, target // max(1, w))


def save(im, name):
    im.save(os.path.join(OUT, name + '.png'))
    print('ok', name, im.size)


def grid(items, k, cols, title=None, pad=24, card=CARD):
    """items: [(rótulo, imagen)] -> lámina con tarjetas a escala k."""
    cw = max(i.width for _, i in items) * k + pad * 2
    ch = max(i.height for _, i in items) * k + pad * 2 + 40
    rows = (len(items) + cols - 1) // cols
    top = 80 if title else pad
    out = Image.new('RGB', (cols * (cw + pad) + pad, top + rows * (ch + pad)), BG)
    d = ImageDraw.Draw(out)
    if title:
        d.text((pad, 20), title, font=f_ttl, fill=INK)
    for n, (lbl, im) in enumerate(items):
        x = pad + (n % cols) * (cw + pad)
        y = top + (n // cols) * (ch + pad)
        d.rounded_rectangle((x, y, x + cw, y + ch), 14, fill=card)
        big = up(im, k)
        out.paste(big, (x + (cw - big.width) // 2, y + pad + (ch - 40 - pad * 2 - big.height)), big)
        d.text((x + pad, y + ch - 44), lbl, font=f_lbl, fill=DIM)
    return out


def sheet(name, title, bg=(70, 84, 72)):
    """Hoja entera, escalada a lo ancho, sobre un fondo neutro."""
    im = img(name)
    k = fit_k(im.width + 8)
    base = Image.new('RGBA', (im.width + 8, im.height + 8), bg + (255,))
    base.alpha_composite(im, (4, 4))
    big = up(base, k)
    out = Image.new('RGB', (big.width + 48, big.height + 110), BG)
    d = ImageDraw.Draw(out)
    d.text((24, 20), title, font=f_ttl, fill=INK)
    out.paste(big, (24, 86))
    return out


# ---------------------------------------------------------------- personajes
c2 = js('chars2.json')
ch = img('chars2.png')
cw, chh = c2['cell']['w'], c2['cell']['h']
dirs = c2['dirs']


def cell(who, d, col):
    b = c2['blocks'][who]
    row = dirs.index(d)
    return ch.crop((b['x'] + col * cw, b['y'] + row * chh, b['x'] + (col + 1) * cw, b['y'] + (row + 1) * chh))


idle = c2['idle'][0]
save(grid([(w, cell(w, 'down', idle)) for w in c2['ids']], 9, len(c2['ids']), 'Elenco · sprites 16×32 (reposo, de frente)'), 'personajes_elenco')
save(grid([(f'{w} · {d}', cell(w, d, idle)) for w in ('juan', 'juan_suit') for d in dirs], 10, 8, 'Juan y el traje · cuatro direcciones'), 'personajes_direcciones')

# ---------------------------------------------------------------- animaciones
walk = c2['walk']
times = c2['times']
for who in ('juan', 'juan_suit'):
    items = []
    for d in dirs:
        for i, col in enumerate(walk):
            items.append((f'{d} {i + 1} · {times[i]}ms', cell(who, d, col)))
    save(grid(items, 7, 6, f'Caminata · {who} · 6 cuadros por dirección'), f'anim_caminata_{who}')
# gif de caminata (frente y perfil) para ver el ritmo
for who in ('juan', 'juan_suit'):
    frames = []
    for i, col in enumerate(walk):
        f = Image.new('RGB', (4 * (cw + 4), chh + 4), (70, 84, 72))
        for j, d in enumerate(dirs):
            f.paste(cell(who, d, col), (2 + j * (cw + 4), 2), cell(who, d, col))
        frames.append(up(f, 10))
    frames[0].save(os.path.join(OUT, f'anim_caminata_{who}.gif'), save_all=True,
                   append_images=frames[1:], duration=times, loop=0)
    print('ok', f'anim_caminata_{who}.gif')

# ---------------------------------------------------------------- retratos
pd = js('portraits_dlg.json')
pim = img('portraits_dlg.png')
pw, ph = pd['cell']['w'], pd['cell']['h']
items = [(n, pim.crop((b['x'], b['y'], b['x'] + pw, b['y'] + ph))) for n, b in pd['blocks'].items()]
save(grid(items, 4, 8, 'Retratos de diálogo · en el juego (64×64)'), 'retratos_dialogo')
pp = js('portraits_panel.json')
ppi = img('portraits_panel.png')
items = []
for n, b in pp['blocks'].items():
    w, h = pp['cell']['w'], pp['cell']['h']
    items.append((n, ppi.crop((b['x'], b['y'], b['x'] + w, b['y'] + h))))
save(grid(items, 8, 7, 'Retratos de panel · en el juego (32×32)'), 'retratos_panel')
DUO = os.path.join(ROOT, 'art', 'concept', 'out')
duo = [(n, Image.open(os.path.join(DUO, f'duo_{n}.png')).convert('RGBA'))
       for n in ('juan', 'favalli', 'lucas', 'polsky', 'elena', 'martita', 'traje', 'mano')
       if os.path.exists(os.path.join(DUO, f'duo_{n}.png'))]
if duo:
    save(grid(duo, 5, 8, 'Retratos duotono · estilo aprobado, todavía no en el juego (56×56)'), 'retratos_duotono')

# ---------------------------------------------------------------- objetos / construcción / interfaz / enemigos / efectos
for name, title, out in [
    ('objects.png', 'Objetos · hoja objects', 'objetos_objects'),
    ('props.png', 'Objetos · props (mesas, sillas, superficies)', 'objetos_props'),
    ('items.png', 'Ítems del inventario', 'inventario_items'),
    ('tiles.png', 'Construcción · baldosas (pisos, paredes)', 'construccion_tiles'),
    ('interior2.png', 'Construcción · interior', 'construccion_interior'),
    ('houses.png', 'Construcción · casas', 'construccion_casas'),
    ('street2.png', 'Construcción · calle', 'construccion_calle'),
    ('buttons.png', 'Interfaz · botones y glifos', 'interfaz_botones'),
    ('death_panel.png', 'Interfaz · cartel de muerte', 'interfaz_muerte'),
    ('cascarudos.png', 'Enemigos · cascarudos', 'enemigos_cascarudos'),
    ('fx.png', 'Efectos · fx', 'efectos_fx'),
    ('fx_shooting.png', 'Efectos · disparo', 'efectos_disparo'),
]:
    save(sheet(name, title), out)

cd = js('cursor.json')
ci = img('cursor.png')
items = [(n, ci.crop((x, y, x + w, y + h))) for n, (x, y, w, h) in cd['frames'].items() if n != 'arrow']
save(grid(items, 8, 4, 'Interfaz · cursor (cuadros 32×32, se dibuja a la mitad)'), 'interfaz_cursor')

# ---------------------------------------------------------------- paleta (de la dirección v2)
PAL = {
    'Noche': ['#0b0c1d', '#1b2440', '#2e3c5a', '#3a2a42'],
    'Nieve que brilla': ['#7896b0', '#9fbfd4', '#c8e2ee', '#eefaff'],
    'Madera': ['#3a2418', '#5e3a24', '#8a5a34', '#b07c46'],
    'Ladrillo': ['#5a2a30', '#7a3a3a', '#965050', '#6a5a58'],
    'Luz de lámpara': ['#7a3c18', '#b87028', '#ecab4c', '#ffe8b0'],
    'Piel': ['#8c5650', '#bb7f68', '#e2ab8c', '#f4caa8'],
}
sw, gap = 150, 24
out = Image.new('RGB', (len(PAL) * (4 * sw // 2 + gap) + gap + 380, 80 + 2 * (sw // 2) + 120), BG)
d = ImageDraw.Draw(out)
d.text((gap, 20), 'Paleta', font=f_ttl, fill=INK)
x = gap
for fam, cols in PAL.items():
    d.text((x, 90), fam, font=f_lbl, fill=INK)
    for i, c in enumerate(cols):
        cx = x + (i % 2) * (sw // 2 + 4)
        cy = 130 + (i // 2) * (sw // 2 + 4)
        d.rectangle((cx, cy, cx + sw // 2, cy + sw // 2), fill=c)
    for i, c in enumerate(cols):
        d.text((x + sw + 20, 130 + i * 36), c, font=f_lbl, fill=DIM)
    x += sw + 20 + 130 + gap
save(out.crop((0, 0, x, out.height)), 'paleta')
