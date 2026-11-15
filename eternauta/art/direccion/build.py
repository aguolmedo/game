"""Arma la presentacion de direccion de arte (deck.html) para imprimir a PDF."""
import html
import os

HERE = os.path.dirname(os.path.abspath(__file__))

CHARS = [
    dict(id='juan', name='Juan Salvo', role='El protagonista. Lo manejás vos.',
         refs=['c_tres_caras', 'c_juan_close'],
         traits=['Mandíbula cuadrada, mentón duro, cejas marcadas.',
                 'Pelo corto, castaño medio, peinado con raya.',
                 'Campera clara con cierre sobre polera oscura de cuello alto.',
                 'Cara seria; casi nunca sonríe.'],
         pal=['#5a3e2c', '#cfc6ae', '#2b2f3e', '#3b3f4c', '#e2ab8c']),
    dict(id='juan_suit', name='El traje', role='El ícono de la historia: sin él, la nevada mata.',
         refs=['c_traje_p041_cara', 'c_traje_p041_cuerpo'],
         traits=['Casero: tela engomada clara cosida a mano, con parches.',
                 'Visera elíptica horizontal de marco grueso: se ve oscura, con los ojos de Juan.',
                 'Filtro hecho con una lata atada con alambre.',
                 'Tiras de goma enrolladas; un guante desparejo; rifle.'],
         pal=['#cfc9b8', '#a19c8e', '#22303e', '#4a4e56', '#6a4a2e']),
    dict(id='favalli', name='Favalli', role='El profesor de física. La cabeza fría del grupo.',
         refs=['c_favalli_close', 'c_favalli_sweater'],
         traits=['Anteojos de marco negro muy grueso: su firma.',
                 'Pelo oscuro, grueso y ondulado; bigote tupido.',
                 'Cara ancha y pesada, cejas espesas.',
                 'Sweater claro de cuello alto acanalado, con dos franjas oscuras en el pecho.'],
         pal=['#2a2226', '#1a1622', '#d8cfb6', '#3a3440', '#e2ab8c']),
    dict(id='lucas', name='Lucas', role='Empleado de banco. El que entra en pánico.',
         refs=['c_lucas', 'c_tres_caras'],
         traits=['Flaco y alto, de mediana edad.',
                 'Pelado arriba, pelo claro y ralo a los costados.',
                 'Cara larga muy surcada: frente con arrugas, ojos hundidos, cejas pesadas.',
                 'Saco claro abierto sobre camisa y corbata oscuras.'],
         pal=['#cfc6b0', '#bdb6a2', '#34374a', '#5e2a32', '#e2ab8c']),
    dict(id='polsky', name='Polsky', role='El jubilado vecino. Sale a buscar a su familia… y no vuelve.',
         refs=['c_polsky_escalera', 'c_polsky_edith'],
         traits=['Viejo y flaco, encorvado; cara larga y huesuda.',
                 'Pelo blanco revuelto, peinado para atrás.',
                 'Nariz grande, ojos hundidos, mejillas marcadas.',
                 'Traje oscuro con camisa blanca y corbata.'],
         pal=['#d8d6d0', '#3a3946', '#d8d8de', '#3c5446', '#e2ab8c']),
    dict(id='elena', name='Elena', role='La mujer de Juan.',
         refs=['c_elena_close', 'c_elena_juan'],
         traits=['Pelo rubio ondulado hasta los hombros, con raya al costado.',
                 'Cara suave; labios marcados.',
                 'Vestido oscuro de mangas largas, con cuello claro.',
                 'Siempre cerca de Martita.'],
         pal=['#d8b070', '#6e4a62', '#ece4d0', '#a8505a', '#e2ab8c']),
    dict(id='martita', name='Martita', role='La hija de Juan y Elena.',
         refs=['c_martita'],
         traits=['Nena chica: un tercio más baja que los adultos.',
                 'Pelo liso, rubio claro, con flequillo recto.',
                 'Vestido claro con cuello blanco, medias blancas, zapatitos rojos.',
                 'El único toque de rojo vivo en la casa.'],
         pal=['#e2c890', '#e6dcc4', '#ffffff', '#a83a3a', '#e2ab8c']),
]

PALETTE = [
    ('Noche', ['#0b0c1d', '#1b2440', '#2e3c5a', '#3a2a42']),
    ('Nieve que brilla', ['#7896b0', '#9fbfd4', '#c8e2ee', '#eefaff']),
    ('Madera', ['#3a2418', '#5e3a24', '#8a5a34', '#b07c46']),
    ('Ladrillo', ['#5a2a30', '#7a3a3a', '#965050', '#6a5a58']),
    ('Luz de lámpara', ['#7a3c18', '#b87028', '#ecab4c', '#ffe8b0']),
    ('Piel', ['#8c5650', '#bb7f68', '#e2ab8c', '#f4caa8']),
]


def esc(s):
    return html.escape(s)


def slide(body, cls=''):
    return f'<section class="slide {cls}">{body}</section>'


def char_slide(i, c):
    refs = ''.join(f'<img class="ref" src="img/{r}.jpg">' for r in c['refs']) or \
        '<div class="ref-empty">Sin primer plano en las páginas leídas:<br>diseñada a partir del guion (pág. 021).</div>'
    traits = ''.join(f'<li>{esc(t)}</li>' for t in c['traits'])
    chips = ''.join(f'<span class="chip" style="background:{h}" title="{h}"></span>' for h in c['pal'])
    return slide(f'''
      <div class="kicker">Personajes · {i:02d}</div>
      <h2>{esc(c["name"])}</h2>
      <p class="role">{esc(c["role"])}</p>
      <div class="char">
        <div class="refs"><div class="label">En el cómic</div>{refs}</div>
        <div class="pix">
          <div class="label">Retrato (diálogo)</div>
          <img class="portrait" src="img/{c["id"]}_portrait_x6.png">
          <div class="chips">{chips}</div>
        </div>
        <div class="pix sprite-col">
          <div class="label">Sprite 16×32</div>
          <img class="sprite" src="img/{c["id"]}_sprite_x8.png">
          <div class="real"><img src="img/{c["id"]}_sprite.png" class="x1"><img src="img/{c["id"]}_sprite.png" class="x2"><span>tamaño real · ×2</span></div>
        </div>
        <div class="notes"><div class="label">Rasgos clave</div><ul>{traits}</ul></div>
      </div>''', 'char-slide')


def build():
    s = []
    s.append(slide('''
      <img class="bleed" src="img/cover_bg.png">
      <div class="cover">
        <div class="kicker">El Eternauta · demo</div>
        <h1>Dirección de arte</h1>
        <p>El cómic de Oesterheld y Solano López (1957), contado con la técnica del pixel art de Stardew Valley.</p>
        <div class="meta">Versión 2 · noviembre 2026</div>
      </div>''', 'cover-slide'))

    s.append(slide('''
      <div class="kicker">La idea</div>
      <h2>Lo que se ve es el cómic. Cómo se dibuja es Stardew.</h2>
      <div class="two">
        <figure><img src="img/c_tres_caras.jpg"><figcaption><b>Contenido: el cómic.</b> Caras, ropa, la casa de Vicente López, el traje. Todo sale de las viñetas y del guion.</figcaption></figure>
        <figure><img src="img/stardew_interior.jpg"><figcaption><b>Técnica: Stardew.</b> Vista 3/4 desde arriba, formas limpias, colores cálidos y mucho objeto chico en pantalla. Solo como referencia: no se copia nada.</figcaption></figure>
      </div>'''))

    s.append(slide('''
      <div class="kicker">Principios</div>
      <h2>Tres reglas</h2>
      <div class="rules">
        <div class="rule"><span class="n">1</span><h3>Fiel al cómic</h3><p>Cada personaje se reconoce de una viñeta concreta. Si el cómic lo muestra, se dibuja así; si no lo muestra, no se inventa.</p></div>
        <div class="rule"><span class="n">2</span><h3>Simpleza con detalle</h3><p>Zonas grandes de color plano y pocos píxeles de detalle, puestos donde mira el ojo: caras, manos, el reflejo del visor.</p></div>
        <div class="rule"><span class="n">3</span><h3>Escala chica</h3><p>Grilla de 16 px y vista de 480×270. Muchos objetos chicos con espacio para caminar entre ellos, como en Stardew.</p></div>
      </div>'''))

    s.append(slide('''
      <div class="kicker">Técnica</div>
      <h2>Simpleza con detalle</h2>
      <div class="split">
        <ul class="big">
          <li><b>3–4 tonos por material:</b> base, sombra, sombra profunda y un brillo.</li>
          <li><b>Sombras más frías</b> (hacia el violeta) y <b>luces más cálidas.</b></li>
          <li><b>Contorno de color,</b> un tono más oscuro que el relleno. Nunca negro puro.</li>
          <li><b>Luz desde arriba a la izquierda,</b> siempre. Sombra redonda bajo cada cosa.</li>
          <li><b>Repetición con variación:</b> cada tanto, una tabla de otro tono o un nudo en la madera.</li>
          <li>Si se ve recargado, <b>sacá píxeles</b>. Si se ve chato, <b>un brillo y una línea de sombra</b>.</li>
        </ul>
        <div class="stack">
          <img class="pixelated fill" src="img/objects_attic.png">
          <img class="pixelated fill" src="img/tiles_strip.png">
        </div>
      </div>'''))

    s.append(slide('''
      <div class="kicker">Escala</div>
      <h2>Todo vive en una grilla de 16 px</h2>
      <div class="split">
        <img class="shot" src="img/g_attic_grid.png">
        <table class="specs">
          <tr><td>Vista</td><td>480×270, escalado entero</td></tr>
          <tr><td>Personaje</td><td>1×2 baldosas (16×32)</td></tr>
          <tr><td>Silla · radio</td><td>1×1 a 1×2</td></tr>
          <tr><td>Mesa para cuatro</td><td>3×2</td></tr>
          <tr><td>Ventana · puerta</td><td>2×2 · 1×2</td></tr>
          <tr><td>Objetos chicos</td><td>8–16 px</td></tr>
          <tr><td>Interiores</td><td>Compactos, entran enteros en pantalla</td></tr>
          <tr><td>Exteriores</td><td>Mapas grandes; la cámara sigue a Juan</td></tr>
          <tr><td>Interfaz</td><td>Chica: barra de 20 px, letra de 7 px</td></tr>
        </table>
      </div>'''))

    groups = ''.join(
        f'<div class="pgroup"><div class="label">{esc(n)}</div><div class="sw">' +
        ''.join(f'<div><span style="background:{h}"></span><code>{h}</code></div>' for h in hs) +
        '</div></div>' for n, hs in PALETTE)
    s.append(slide(f'''
      <div class="kicker">Color</div>
      <h2>Paleta</h2>
      <p class="lead">Noche fría y nieve azulada afuera; madera, ladrillo y luz de lámpara adentro. El contraste cálido/frío cuenta la historia: adentro se está a salvo, afuera la nieve mata.</p>
      <div class="palette">{groups}</div>'''))

    s.append(slide('''
      <div class="kicker">Personajes</div>
      <h2>El elenco</h2>
      <p class="lead">Rediseño completo a partir de las viñetas. Misma altura y proporciones para todos los adultos; Martita, un tercio más baja.</p>
      <img class="lineup" src="img/lineup.png">
      <div class="names"><span>Juan</span><span>Traje</span><span>Favalli</span><span>Lucas</span><span>Polsky</span><span>Elena</span><span>Martita</span></div>'''))

    for i, c in enumerate(CHARS, 1):
        s.append(char_slide(i, c))


    s.append(slide('''
      <div class="kicker">Ambientes · en el juego hoy</div>
      <h2>El altillo y la casa</h2>
      <div class="two">
        <figure><img src="img/g_attic.png"><figcaption><b>El altillo, el "laboratorio".</b> Techo a dos aguas con vigas y avioncitos colgados, ladrillo a la vista, la radio y su parlante de embudo, y la mesa de truco bajo la lámpara.</figcaption></figure>
        <figure><img src="img/house_mockup_x2.png"><figcaption><b>La planta baja (rediseño).</b> Seis ambientes como en el cómic: living con escalera de baranda de hierro, hall con la puerta sellada, garage-esclusa, dormitorio, cuarto de Martita y cocina con azulejos.</figcaption></figure>
      </div>'''))

    s.append(slide("""
      <div class="kicker">Rediseño · animación</div>
      <h2>Caminar de verdad</h2>
      <div class="split">
        <img class="pixelated fill" src="img/walk_strip.png">
        <div>
          <p class="lead">La caminata actual temblequea: la cabeza cambia de forma entre cuadros y las piernas casi no se mueven. La nueva:</p>
          <ul class="big">
            <li><b>6 cuadros</b> por dirección, no 4.</li>
            <li><b>Cabeceo que vende el paso:</b> baja 1, baja 1, sube de golpe.</li>
            <li><b>La cabeza nunca cambia de forma:</b> solo se desplaza.</li>
            <li><b>Tijera de piernas en el perfil,</b> brazos al revés que las piernas.</li>
            <li><b>Tiempos desparejos:</b> el contacto dura 150 ms, los intermedios 95.</li>
          </ul>
          <p class="foot2">Prototipo animado en <code>art/concept/out/walk_*.gif</code></p>
        </div>
      </div>"""))

    s.append(slide("""
      <div class="kicker">Rediseño · el traje</div>
      <h2>El traje casero, como en la página 41</h2>
      <div class="suit">
        <div class="refs"><img class="ref" src="img/c_traje_p041_cara.jpg"><img class="ref" src="img/c_traje_p041_cuerpo.jpg"></div>
        <img class="portrait big" src="img/suit_portrait_x8.png">
        <div class="views"><img src="img/suit_front_x8.png"><img src="img/suit_side_x8.png"><img src="img/suit_back_x8.png">
          <div class="vlabels"><span>frente</span><span>perfil</span><span>espalda</span></div></div>
      </div>
      <p class="lead small">Lo cosen a mano en la casa (págs. 032–042): tela engomada clara con <b>parches y costuras a mano</b> · capucha · <b>visera elíptica horizontal</b> con marco tosco, bulones y alambre · filtro hecho con <b>una lata atada</b> · <b>tiras de goma enrolladas</b> en cuello, cintura y tobillos · un guante desparejo · rifle.</p>"""))

    s.append(slide("""
      <div class="kicker">Rediseño · la calle</div>
      <h2>Vicente López, 1957, de noche</h2>
      <div class="split wide-left">
        <img class="shot" src="img/street_mockup_x2.png">
        <div>
          <img class="ref-strip" src="img/c_choque.jpg">
          <img class="ref-strip" src="img/c_avenida.jpg">
          <ul class="todo">
            <li><b>Fondo poblado:</b> segunda fila de techos, chimeneas, tanques de agua, pinos, postes y cables.</li>
            <li>Chalets con jardín y <b>tapial de reja</b> o cerco.</li>
            <li><b>Farolas de brazo curvo</b>, el <b>colectivo nocturno</b> detenido.</li>
            <li>La <b>esquina del choque</b> con el cartel de calles; Polsky en la nieve.</li>
          </ul>
        </div>
      </div>
      <img class="pixelated pieces" src="img/street_pieces_x4.png">"""))

    s.append(slide("""
      <div class="kicker">Rediseño · la planta baja</div>
      <h2>Una casa que se entiende</h2>
      <div class="split wide-left">
        <img class="shot" src="img/house_mockup_x2.png">
        <ul class="big">
          <li><b>Arriba:</b> living (escalera, ventana, sillón, radio) · hall (puerta con ojo de buey <b>sellada</b>, perchero, reloj) · <b>garage-esclusa</b>, la salida a la calle (pág. 040).</li>
          <li><b>Abajo:</b> dormitorio (cama, velador, ropero con el rifle) · cuarto de Martita (cuna, caballito) · cocina (azulejos, alacena con frascos, lámpara de aceite).</li>
          <li>Paredes interiores <b>vistas de frente</b>, como en Stardew, para que cada ambiente se lea solo.</li>
        </ul>
      </div>
      <img class="pixelated pieces" src="img/house_pieces_x4.png">"""))

    s.append(slide("""
      <div class="kicker">Rediseño · el garaje</div>
      <h2>El garaje-esclusa: por acá se sale</h2>
      <div class="two">
        <figure><img src="img/garage_mockup_x2.png"><figcaption><b>Como en las págs. 040–042:</b> estantes con latas y frascos, la manguera enrollada, el neumático, el balde con la escoba, baldosas claras. La <b>puerta de dos hojas</b> a la calle con el <b>extractor</b> hecho con el secador de Elena; el traje colgado esperando a Juan; el banco con la tela engomada y las tiras de goma.</figcaption></figure>
        <figure><img src="img/garage_lit_x2.png"><figcaption><b>La única luz eléctrica de la casa:</b> el electrógeno a nafta de Favalli alimenta una lamparita que cuelga del cable y titila. Por la rendija de la puerta se cuela la luz fría de la nieve.</figcaption></figure>
      </div>
      <img class="pixelated pieces" src="img/garage_pieces_x4.png">"""))

    s.append(slide("""
      <div class="kicker">Rediseño · casas</div>
      <h2>Casas con otro nivel de detalle</h2>
      <div class="split">
        <img class="pixelated fill" src="img/houses_detail_x4.png">
        <ul class="big">
          <li><b>La perspectiva de Stardew:</b> la fachada es el <b>hastial de frente</b>; los dos faldones se van hacia atrás <b>subiendo en la pantalla</b>, sin fuga. Cumbrera vertical, faldón izquierdo con luz y derecho en sombra, tejas en filas paralelas al borde.</li>
          <li><b>La casa de los Salvo</b> (pág. 030): planta baja de ladrillo, hastial de tablas con <b>la ventana del altillo</b> encendida (las siluetas del truco), chimenea sobre el faldón.</li>
          <li><b>La californiana</b>, típica del conurbano de los 40–50: revoque blanco y tejas coloniales.</li>
          <li>La nieve se apoya en lo horizontal: el manto arriba del techo, la cumbrera, alféizares, maceteros, escalones.</li>
        </ul>
      </div>"""))

    s.append(slide("""
      <div class="kicker">Rediseño · árboles</div>
      <h2>Pinos con textura</h2>
      <img class="pixelated fill" src="img/pines_x6.png">
      <ul class="big" style="margin-top:20px">
        <li>La textura sale de <b>mechones de agujas que caen en capas</b>: cada uno con luz arriba a la izquierda, panza en sombra y borde dentado. La silueta queda irregular, no un triángulo.</li>
        <li>En la versión nevada, <b>la nieve se apoya arriba de cada mechón</b>; tronco con corteza veteada y raíces abiertas.</li>
        <li>El tercero es el <b>pino de la nevada</b>: copos que brillan pegados a las ramas.</li>
      </ul>"""))

    s.append(slide("""
      <div class="kicker">Rediseño · vehículos</div>
      <h2>Autos y colectivo de los 50</h2>
      <img class="pixelated fill" src="img/vehicles_x4.png">
      <ul class="big" style="margin-top:22px">
        <li><b>Vista 3/4 desde arriba</b>, como el camión de Stardew: techo, capot y parabrisas se ven desde arriba con brillos; el costado más oscuro con la moldura cromada.</li>
        <li>Sedanes <b>de dos tonos</b> con techo crema, cubiertas de <b>banda blanca</b>, paragolpes y parrilla cromados, faros redondos.</li>
        <li>El <b>colectivo</b> bordó y crema, con cartel de recorrido y una <b>guarda de fileteado porteño</b>.</li>
      </ul>"""))

    s.append(slide("""
      <div class="kicker">Rediseño · objetos</div>
      <h2>Mesas vestidas, objetos con sentido</h2>
      <div class="split">
        <div>
          <img class="pixelated fill" src="img/dressed_tables_x6.png">
          <img class="pixelated fill" src="img/props_x6.png" style="margin-top:14px">
        </div>
        <ul class="big">
          <li><b>Cada superficie se viste</b> con objetos chicos (4–12 px) que se leen por su silueta: naipes españoles, <b>anotador con porotos</b>, <b>sifón</b>, vino, el cenicero de Favalli humeando, el <b>mate</b>.</li>
          <li>Cocina: mantel a cuadros, latas, frascos, pava, pan, la lámpara de aceite y la lista de Elena.</li>
          <li><b>Los objetos que se juntan están apoyados donde tienen sentido:</b> los guantes en el banco del laboratorio, la tela engomada a medio cortar con la tijera, la lata del filtro en la alacena, las botas junto al perchero. Un brillito avisa que se pueden agarrar.</li>
        </ul>
      </div>"""))

    s.append(slide("""
      <div class="kicker">Propuesta innovadora</div>
      <h2>Retratos de diálogo: el cómic en pixel art</h2>
      <div class="split">
        <div>
          <img class="pixelated fill" src="img/dialog_portraits_x4.png">
          <p class="lead small">Cada retrato sale del primer plano de su viñeta: el dibujo de Solano López pasado a 56×56 con 5 tonos, para que se note el pixel art del juego. Arriba en <b>tinta</b>, como el cómic; abajo <b>a color</b>, con sombras frías y luces cálidas como el resto del juego. Elena sale de la pág. 021 y Martita de la pág. 034.</p>
        </div>
        <figure><img class="shot" src="img/dialog_mock_x2.png"><figcaption>En el juego: el sprite chico camina, y al hablar aparece el retrato grande, idéntico al cómic.</figcaption></figure>
      </div>"""))

    s.append(slide("""
      <div class="kicker">Propuesta innovadora</div>
      <h2>La vista desde el altillo</h2>
      <div class="split wide-left">
        <img class="shot" src="img/view_pan_b_x2.png">
        <div>
          <img class="ref-strip" src="img/c_panoramica.jpg" style="width:100%;height:170px">
          <p class="lead small">Basada en la panorámica de la <b>pág. 020</b>: el barrio visto desde arriba, todo cubierto por la nevada fosforescente.</p>
          <ul class="todo">
            <li>Se arma <b>con el motor del juego</b>: los mismos sprites, en capas — nuestro techo nevado y la chimenea adelante, la calle al medio, las casas de enfrente y los techos lejanos atrás.</li>
            <li>La vista es <b>más ancha que la pantalla</b>: la cámara se desliza despacio, como recorriendo la calle con la mirada.</li>
            <li>El colectivo con los faros todavía prendidos, autos abandonados, la esquina del choque, gente caída y el cadáver sobre el tapial.</li>
          </ul>
        </div>
      </div>
      <img class="pixelated fill" src="img/panorama.png" style="margin-top:14px;max-height:150px;object-fit:cover;object-position:top">"""))

    s.append(slide("""
      <div class="kicker">Propuesta innovadora</div>
      <h2>La vista desde el living</h2>
      <div class="split wide-left">
        <img class="shot" src="img/view_living_x2.png">
        <div>
          <img class="ref-strip" src="img/c_ventana_living.jpg" style="width:100%;height:170px">
          <p class="lead small">Hay <b>dos ventanas</b> y cada una muestra algo distinto. Arriba, el altillo da la panorámica. Abajo, el living mira <b>a la altura de la calle</b> (pág. 034):</p>
          <ul class="todo">
            <li>Enfrente, <b>la casa de los Ramírez</b> (nueva, hermética) con <b>la luz de una vela</b> y la silueta de Ramírez con el candelabro.</li>
            <li>Adelante, nuestro jardín: portón, tapiales, arbustos. En la calle, un auto tapado de nieve y alguien caído.</li>
            <li>El <b>cortinado bordó</b> del living enmarca la vista.</li>
          </ul>
        </div>
      </div>"""))

    s.append(slide("""
      <div class="kicker">Rediseño · el traje</div>
      <h2>Juan con el rifle</h2>
      <div class="split">
        <img class="pixelated fill" src="img/suit_rifle_x8.png">
        <ul class="big">
          <li>"No te olvides del rifle" (pág. 041): al salir, Juan lleva <b>el rifle en las manos</b>.</li>
          <li><b>De frente</b>, cruzado sobre el pecho; <b>de perfil</b>, apuntando hacia adelante mientras avanza; en el <b>retrato</b>, al hombro.</li>
          <li>Culata de madera, caño de metal oscuro con un brillo; las manos enguantadas (una desapareja) lo agarran.</li>
        </ul>
      </div>"""))

    s.append(slide("""
      <div class="kicker">Iluminación</div>
      <h2>Se cortó la luz</h2>
      <div class="two">
        <figure><img src="img/street_before_x2.png"><figcaption><b>Antes del corte</b> (la partida de truco, pág. 018): luz eléctrica cálida, farolas y ventanas encendidas.</figcaption></figure>
        <figure><img src="img/street_blackout_x2.png"><figcaption><b>Después del corte</b> (pág. 019: "¿Algún fusible?"): no hay farolas ni ventanas eléctricas. <b>La nieve es la luz</b>: "emanaban una débil luz de trasmundo" (pág. 020). Solo quedan velas que titilan.</figcaption></figure>
      </div>"""))

    s.append(slide("""
      <div class="kicker">Iluminación</div>
      <h2>Velas, aceite y la nieve que brilla</h2>
      <div class="two">
        <figure><img src="img/attic_dark_x2.png"><figcaption><b>Adentro:</b> una vela sobre la mesa ilumina las caras; la lámpara de aceite en la cocina; el <b>electrógeno a nafta</b> de Favalli (pág. 041) da la única luz eléctrica, inestable, en el taller. La ventana brilla fría por la nieve de afuera. (El HUD no se oscurece en el juego.)</figcaption></figure>
        <figure><img src="img/view_living_dark_x2.png"><figcaption><b>Afuera:</b> todo oscuro salvo la nieve, que tiñe de cian lo que tiene cerca, y una sola luz cálida en el barrio: <b>la vela de Ramírez</b>. Por eso Martita la ve enseguida (pág. 034).</figcaption></figure>
      </div>"""))

    s.append(slide("""
      <div class="kicker">Propuesta innovadora</div>
      <h2>Contarlo como una historieta</h2>
      <div class="two">
        <figure><img src="img/ui_balloons_x2.png"><figcaption><b>Globos y cartuchos.</b> Los personajes hablan en globos rotulados en mayúsculas, con la cola hacia quien habla. El Eternauta narra en cartuchos amarillos, como en el cómic. El HUD de abajo queda como está.</figcaption></figure>
        <figure><img src="img/ui_panels_x2.png"><figcaption><b>Escenas en viñetas.</b> En los momentos clave (el choque, la muerte de Polsky, la primera salida) la pantalla se parte en viñetas con primeros planos de <b>nuestros personajes</b> (el modelo del juego) y medianiles; se avanza con <b>(A)</b>. Los retratos calcados del cómic quedan para el diálogo.</figcaption></figure>
      </div>"""))

    s.append(slide('''
      <div class="kicker">Interfaz</div>
      <h2>Botones de joystick, chiquitos</h2>
      <div class="split">
        <div>
          <p class="lead">Botones redondos gorditos con aro oscuro y letra blanca: <b style="color:#86c898">A</b>, <b style="color:#e06a6a">B</b>, <b style="color:#7aa8e8">X</b> y <b style="color:#ecc24c">Y</b>. Gatillos y bumpers grises, cruceta oscura. Si jugás con teclado, se cambian solos por teclitas.</p>
          <ul class="todo">
            <li>Corregir las letras de START y BACK en el tamaño grande.</li>
            <li>La X grande se lee como un 8.</li>
          </ul>
          <figure><img src="img/buttons_ref2.jpg" class="ref-small"><figcaption>Referencia de estilo elegida.</figcaption></figure>
        </div>
        <img class="pixelated fill" src="img/buttons_game.png">
      </div>'''))

    s.append(slide('''
      <div class="kicker">Cómo seguimos</div>
      <h2>Plan de construcción (DeepSeek)</h2>
      <div class="rules four">
        <div class="rule"><span class="n">1</span><h3>Personajes</h3><p>Los 7 sprites nuevos con la caminata de 6 cuadros en 4 direcciones; retratos de diálogo sacados del cómic; Juan con el traje casero y el rifle.</p></div>
        <div class="rule"><span class="n">2</span><h3>Escenarios</h3><p>Calle con casas de hastial de frente, autos, pinos y el choque; planta baja; garaje-esclusa como salida; mesas vestidas y objetos donde tienen sentido.</p></div>
        <div class="rule"><span class="n">3</span><h3>Luz</h3><p>Antes y después del corte: la nieve como fuente de luz, velas y lámpara de aceite que titilan, la lamparita del electrógeno.</p></div>
        <div class="rule"><span class="n">4</span><h3>Historieta</h3><p>Globos y cartuchos, escenas en viñetas, y las dos vistas por la ventana (altillo y living).</p></div>
      </div>
      <p class="foot">Cada paso se revisa con capturas al lado del concepto y de la viñeta. Archivos: <code>art/concept/</code> (generadores y PNGs) · <code>docs/guion.md</code> · <code>docs/referencias_visuales.md</code>.</p>'''))

    css = open(os.path.join(HERE, 'deck.css')).read()
    doc = f'''<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>El Eternauta · Dirección de arte</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Silkscreen&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>{css}</style></head><body>{''.join(s)}</body></html>'''
    with open(os.path.join(HERE, 'deck.html'), 'w') as f:
        f.write(doc)
    print('slides:', len(s))


if __name__ == '__main__':
    build()
