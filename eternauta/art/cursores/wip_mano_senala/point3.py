from PIL import Image, ImageDraw
import importlib.util
spec=importlib.util.spec_from_file_location('p2','point2.py'); p2=importlib.util.module_from_spec(spec); spec.loader.exec_module(p2)
COL=p2.COL
SEP={12:7,13:8,14:8,15:9,16:9,17:9,18:8,19:7}   # linea pulgar | mano
def fix_thumb(im):
    px=im.load()
    for y,sep in SEP.items():
        # borde izquierdo real de la mano en esa fila
        left=next(x for x in range(32) if px[x,y][3])
        for x in range(left+1, sep):
            ch='o'
            if x==left+1: ch='s'                 # sombra del lado izquierdo (como la ref)
            if y>=18: ch='s' if x<sep-1 else 'd' # base del pulgar
            px[x,y]=COL[ch]+(255,)
        px[left,y]=COL['#']+(255,)
        px[sep,y]=COL['d' if y>=18 else '#']+(255,)
    # tapa del pulgar (fila 12) redondeada: el contorno de arriba ya existe en la fila 11
    return im
def tap_frame():
    # toque: el dedo se acorta 1 fila y la mano entera baja 1 px en diagonal
    t=fix_thumb(p2.pointer(press=1))
    out=Image.new('RGBA',(32,32),(0,0,0,0)); out.alpha_composite(t,(1,1))
    return out
P=fix_thumb(p2.pointer()); T=tap_frame()
P.save('point_v3.png'); T.save('tap_v3.png')
old=Image.open('point_v2.png').convert('RGBA')
S=10; BG=(52,40,38,255)
lam=Image.new('RGBA',(3*36*S,36*S+30),(30,22,22,255)); d=ImageDraw.Draw(lam)
for i,(t,im) in enumerate([('v2 (en el juego)',old),('v3',P),('toque v3',T)]):
    c=Image.new('RGBA',(36,36),BG); c.alpha_composite(im,(2,2))
    lam.paste(c.resize((36*S,36*S),Image.NEAREST),(i*36*S,24)); d.text((i*36*S+8,4),t,fill=(240,230,210))
lam.save('/home/mateyfasito/dev/game/eternauta/art/cursores/mano_senala_v4.png')
