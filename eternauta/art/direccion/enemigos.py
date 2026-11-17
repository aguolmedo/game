"""Direccion de arte 2: enemigos (cascarudos y Manos) -> enemigos.html.

Reusa deck.css y las funciones de build.py. Las imagenes salen de
art/concept/enemies.py (copiadas a img/enemy_*.png).
Imprimir a PDF igual que el primer deck (Chromium headless).
"""
import os

from build import HERE, esc, slide

CASC_PAL = [('Caparazón', ['#0c0a14', '#1c1a2a', '#34324c', '#565a7e', '#b4bce0']),
            ('Teledirector', ['#4a5262', '#7c8698', '#c4ccd8', '#ff6a4a']),
            ('Piel de Mano', ['#6a4262', '#a06e8e', '#cf9cb4', '#efc8d8']),
            ('Ropa de Mano', ['#1a1622', '#2a2434', '#463e58', '#c4c0d4']),
            ('Pelo y aura', ['#9e98ae', '#dcd8e2', '#a8bcff', '#f4f6ff'])]


def build():
    s = []
    s.append(slide('''
      <div class="cover" style="top:110px;bottom:auto">
        <div class="kicker">El Eternauta · dirección de arte II</div>
        <h1>Enemigos</h1>
        <p>Los cascarudos y los Manos: la invasión con la misma técnica que el elenco.</p>
        <img class="pixelated fill" src="img/enemy_lineup_x5.png" style="margin-top:28px">
        <div class="meta">Versión 1 · noviembre 2026</div>
      </div>''', 'cover-slide'))

    s.append(slide('''
      <div class="kicker">La invasión</div>
      <h2>Quién manda a quién</h2>
      <div class="rules four">
        <div class="rule"><span class="n">0</span><h3>Ellos</h3><p>Nunca se ven. "El odio cósmico." No tienen sprite: se sienten en la nieve, la luz y las órdenes.</p></div>
        <div class="rule"><span class="n">1</span><h3>Los Manos</h3><p>Esclavos de Ellos que dirigen la invasión. Del tamaño de un hombre. Tienen <b>una mano con muchos dedos</b> y una <b>glándula del terror</b>: si sienten miedo, mueren.</p></div>
        <div class="rule"><span class="n">2</span><h3>Teledirigidos</h3><p>Gurbos y hombres-robot: quedan para otra entrega.</p></div>
        <div class="rule"><span class="n">3</span><h3>Cascarudos</h3><p>Escarabajos gigantes, la tropa de choque. Los Manos los manejan con un <b>teledirector</b> pegado al caparazón.</p></div>
      </div>
      <p class="foot">Este deck diseña los niveles 1 y 3, los que aparecen en la demo.</p>'''))

    s.append(slide('''
      <div class="kicker">Escala</div>
      <h2>Misma grilla, siluetas distintas</h2>
      <div class="split">
        <img class="pixelated fill" src="img/enemy_lineup_x5.png">
        <table class="specs">
          <tr><td>Mano</td><td>16×32, igual que Juan; flota 1–2 px sobre la nieve</td></tr>
          <tr><td>Aura del Mano</td><td>+10 px por lado, capa aparte (aditiva)</td></tr>
          <tr><td>Cascarudo de frente</td><td>32×28 (2×2 baldosas)</td></tr>
          <tr><td>Cascarudo de perfil</td><td>36×22</td></tr>
          <tr><td>Acorazado</td><td>mismo cuerpo, con placas y cuerno</td></tr>
          <tr><td>Lectura</td><td>humanos cálidos · Manos lila/negro con halo · cascarudos negro-azul frío</td></tr>
        </table>
      </div>'''))

    groups = ''.join(
        f'<div class="pgroup"><div class="label">{esc(n)}</div><div class="sw">' +
        ''.join(f'<div><span style="background:{h}"></span><code>{h}</code></div>' for h in hs) +
        '</div></div>' for n, hs in CASC_PAL)
    s.append(slide(f'''
      <div class="kicker">Color</div>
      <h2>Paleta de la invasión</h2>
      <p class="lead">Los enemigos son <b>fríos</b>: negro azulado y lila, con brillos de nieve. La única nota cálida es el <b>punto rojo del teledirector</b>, que dice "esto lo maneja alguien".</p>
      <div class="palette">{groups}</div>'''))

    s.append(slide('''
      <div class="kicker">Enemigos · 01</div>
      <h2>Los Manos</h2>
      <p class="role">"Nosotros, los Manos, que sólo vivíamos pensando en lo bello…"</p>
      <div class="char">
        <div class="refs"><div class="label">En el cómic</div><img class="ref" src="img/m_cuerpo.png"><img class="ref" src="img/m_color.png"></div>
        <div class="pix">
          <div class="label">Retrato (diálogo)</div>
          <img class="portrait" src="img/enemy_mano_dlg_ink_x6.png">
        </div>
        <div class="pix sprite-col">
          <div class="label">Sprite 16×32</div>
          <img class="sprite" src="img/enemy_mano_front_x8.png">
          <div class="real"><img src="img/enemy_mano_front.png" class="x1"><img src="img/enemy_mano_front.png" class="x2"><span>tamaño real · ×2</span></div>
        </div>
        <div class="notes"><div class="label">Rasgos clave</div><ul>
          <li>Pelado, con pelo blanco revuelto hacia atrás.</li>
          <li>Ojos enormes y hundidos: triste, no monstruoso.</li>
          <li>Piel lila, para separarlo de los humanos.</li>
          <li>Remera negra, cinturón con barras, pantalón fruncido.</li>
          <li>Mano de muchos dedos sobre el pecho.</li>
        </ul></div>
      </div>''', 'char-slide'))

    s.append(slide('''
      <div class="kicker">Los Manos · vistas</div>
      <h2>Frente, perfil, espalda y la mano</h2>
      <div class="split">
        <div class="views" style="display:flex;gap:18px;align-items:flex-end">
          <img class="pixelated" src="img/enemy_mano_front_x8.png" style="width:128px">
          <img class="pixelated" src="img/enemy_mano_side_x8.png" style="width:128px">
          <img class="pixelated" src="img/enemy_mano_back_x8.png" style="width:128px">
          <img class="pixelated" src="img/enemy_mano_hand_x10.png" style="width:220px">
        </div>
        <ul class="big">
          <li><b>Perfil:</b> frente que se va para atrás, nariz larga, boca fina caída; el brazo cuelga hasta la rodilla.</li>
          <li><b>Espalda:</b> la mata de pelo blanco tapa la nuca; las dos manos cuelgan con los dedos largos.</li>
          <li><b>La mano</b> (detalle para el retrato y las viñetas): palma chica y <b>nueve dedos finos en abanico</b>. Es su nombre: hay que mostrarla siempre que se pueda.</li>
          <li>No caminan: <b>se deslizan</b> con un vaivén de 1 px, los brazos quietos.</li>
        </ul>
      </div>'''))

    s.append(slide('''
      <div class="kicker">Los Manos · en el juego</div>
      <h2>El aura y la glándula del terror</h2>
      <div class="split">
        <img class="pixelated fill" src="img/enemy_mano_aura_x6.png" style="max-height:520px;object-fit:contain">
        <ul class="big">
          <li><b>El aura punteada</b> de las viñetas: blanca y densa pegada al cuerpo, se deshace en puntos con bordes en llamarada. Va en una capa aparte, aditiva, y <b>tiñe la nieve</b> alrededor: en la oscuridad se lo ve venir.</li>
          <li>El punteado <b>titila</b> (2–3 patrones que se alternan), no se mueve.</li>
          <li><b>No se los mata a balazos:</b> la glándula del terror. Si Juan lo acorrala, el aura se pone roja, el Mano se tapa la cara con la mano de muchos dedos y se apaga en puntos.</li>
          <li>Hablan en globos con <b>borde punteado</b>, no de línea, para que se note que no son humanos.</li>
        </ul>
      </div>'''))

    s.append(slide('''
      <div class="kicker">Enemigos · 02</div>
      <h2>Cascarudos: de mancha a escarabajo</h2>
      <div>
        <div class="label">Hoy en el juego</div>
        <img class="pixelated" src="img/cascarudos_now.png" style="width:100%;height:auto;object-fit:contain">
        <p class="lead small">Manchas negras de 14–28 px: de lejos no se sabe qué son ni para dónde miran.</p>
        <div class="label" style="margin-top:14px">Rediseño</div>
        <img class="pixelated" src="img/enemy_cascarudos_x5.png" style="width:100%;height:auto;object-fit:contain">
        <p class="lead small"><b>Rediseño:</b> caparazón con volumen (luz arriba a la izquierda y brillo especular), costura del élitro, pronoto con borde, cabeza con mandíbulas, antenas segmentadas y <b>seis patas articuladas</b>. Arriba a la derecha, el <b>teledirector</b> con su luz roja. Común (2 pasos de frente y de perfil) y acorazado.</p>
      </div>'''))

    s.append(slide('''
      <div class="kicker">Cascarudos · en el juego</div>
      <h2>Tres tipos, una silueta</h2>
      <div class="rules">
        <div class="rule"><span class="n">1</span><h3>Común</h3><p>32×28. Avanza en línea recta, en grupo. Patas alternadas en trípode: 4 cuadros por dirección.</p></div>
        <div class="rule"><span class="n">2</span><h3>Veloz</h3><p>Mismo dibujo al 70% (22×20), sin teledirector visible. Corre en zigzag.</p></div>
        <div class="rule"><span class="n">3</span><h3>Acorazado</h3><p>Placas transversales con filo claro y cuerno. Aguanta varios tiros; se lo da vuelta.</p></div>
      </div>
      <ul class="big" style="margin-top:22px">
        <li><b>El teledirector es el punto débil:</b> si se le pega a la luz roja, el cascarudo queda dando vueltas, sin dueño.</li>
        <li>Golpe: un cuadro blanco. Muerte: <b>patas arriba</b>, con la panza más clara y las patas pataleando 3 cuadros.</li>
        <li>Sombra ovalada en la nieve, más ancha que la del Mano (que, al flotar, casi no tiene).</li>
      </ul>'''))

    s.append(slide('''
      <div class="kicker">Cómo seguimos</div>
      <h2>Plan de construcción (DeepSeek)</h2>
      <div class="rules four">
        <div class="rule"><span class="n">1</span><h3>Mano</h3><p>Pasar las grillas de <code>art/concept/enemies.py</code> a <code>tools/art</code>: 4 direcciones, vaivén de 4 cuadros, cuadro de "se tapa la cara" y muerte en puntos.</p></div>
        <div class="rule"><span class="n">2</span><h3>Aura</h3><p>3 patrones de punteado que titilan; capa aditiva y luz sobre la nieve.</p></div>
        <div class="rule"><span class="n">3</span><h3>Cascarudos</h3><p>Reemplazar <code>tools/art/cascarudos.py</code> por el nuevo dibujo: 4 direcciones × 4 pasos, golpe, muerte, las tres variantes.</p></div>
        <div class="rule"><span class="n">4</span><h3>Retrato</h3><p>Retrato de diálogo del Mano en tinta (56×56) y el globo de borde punteado.</p></div>
      </div>
      <p class="foot">Conceptos: <code>art/concept/enemies.py</code> → <code>art/concept/out/enemy_*.png</code> · referencias en <code>ref/manos/</code></p>'''))

    css = open(os.path.join(HERE, 'deck.css')).read()
    doc = f'''<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>El Eternauta · Enemigos</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Silkscreen&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>{css}</style></head><body>{''.join(s)}</body></html>'''
    with open(os.path.join(HERE, 'enemigos.html'), 'w') as f:
        f.write(doc)
    print('slides:', len(s))


if __name__ == '__main__':
    build()
