from PIL import Image, ImageDraw
COL={'o':(0xeb,0xe1,0xcc),'s':(0xc6,0xb8,0x9f),'d':(0x90,0x7f,0x69),'#':(0x2a,0x18,0x12)}
fist=Image.open('/home/mateyfasito/dev/game/eternauta/art/sprites/cursor/hand_fist.png').convert('RGBA')
# (fila, contorno izq, relleno, contorno der o None si se funde con el puño)
# Escalera regular: el borde izquierdo avanza 1 px cada 2 filas; el derecho
# igual hasta la fila 4 y despues 1 px por fila (el dedo se ensancha parejo al
# llegar al nudillo, sin saltos).
LEFT={1:0,2:0,3:1,4:1,5:2,6:2,7:3,8:3,9:4,10:4,11:4}
RIGHT={1:6,2:6,3:7,4:7,5:8,6:9,7:10,8:11,9:12,10:13,11:None}
def _fill(y):
    r=RIGHT[y] if RIGHT[y] is not None else 13
    w=r-LEFT[y]-1
    if y==1: return 's'+'o'*(w-2)+'s'
    pre='ds' if y>=7 else 's'
    body=list(pre+'o'*(w-len(pre)))
    if y==4: body[2]='s'; body[3]='s'     # pliegue de la articulacion
    return ''.join(body)
FINGER=[(y,LEFT[y],_fill(y),RIGHT[y]) for y in range(1,12)]
def pointer(press=0):
    im=fist.copy(); px=im.load()
    rows=FINGER
    if press:   # toque: la punta baja 1 fila (se saca la fila del pliegue)
        top=[r for r in FINGER if r[0]<=4]; rest=[r for r in FINGER if r[0]>=6]
        rows=[(y+1,l,f,rr) for (y,l,f,rr) in top]+rest
    # limpiar la zona del dedo (incluye el nudillo del indice doblado)
    for y in range(0,12):
        for x in range(0,14 if y>=7 else 12):
            if y<=6 or x<=[r for r in FINGER if r[0]==y][0][3] if [r for r in FINGER if r[0]==y and r[3]] else x<=12:
                px[x,y]=(0,0,0,0)
    capy=rows[0][0]-1; capl=rows[0][1]+1; capr=rows[0][3]-1
    for x in range(capl,capr+1): px[x,capy]=COL['#']+(255,)
    for (y,l,fill,r) in rows:
        px[l,y]=COL['#']+(255,)
        for i,ch in enumerate(fill): px[l+1+i,y]=COL[ch]+(255,)
        if r is not None: px[r,y]=COL['#']+(255,)
    return im
P=pointer(); T=pointer(press=1); P.save('point_v2.png'); T.save('tap_v2.png')
old=Image.open('point_a.png').convert('RGBA')
S=10; BG=(52,40,38,255)
lam=Image.new('RGBA',(3*36*S,36*S+30),(30,22,22,255)); d=ImageDraw.Draw(lam)
for i,(t,im) in enumerate([('antes (A)',old),('ahora',P),('toque',T)]):
    c=Image.new('RGBA',(36,36),BG); c.alpha_composite(im,(2,2))
    lam.paste(c.resize((36*S,36*S),Image.NEAREST),(i*36*S,24)); d.text((i*36*S+8,4),t,fill=(240,230,210))
lam.save('/home/mateyfasito/dev/game/eternauta/art/cursores/mano_senala_v2.png')
