import * as THREE from 'three';

function pixelTexture(texture) {
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.flipY = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo cargar ${url} (${res.status})`);
  return res.json();
}

/** Carga texturas y datos de public/assets/. baseUrl = import.meta.env.BASE_URL */
export async function loadAssets(baseUrl = './') {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const url = (name) => `${base}assets/${name}`;
  const loader = new THREE.TextureLoader();
  const texture = async (name) => pixelTexture(await loader.loadAsync(url(name)));

  const [
    tiles, objects, buttons, chars, items, portraits, title, shadow, snow, footprint,
    chars2, portraitsDlg, portraitsPanel, houses, street2, interior2, props,
    cascarudos, fx, viewAtticPan, viewAtticPanDark, viewLiving, titleSky,
    deathPanel, cursor, viewAtticFrame, titleLogo,
    snowBackOn, snowBackOff, snowMidOn, snowMidOff, snowFrontOn, snowFrontOff,
    tilesData, objectsData, buttonsData, charsData, itemsData, portraitsData, font,
    chars2Data, portraitsDlgData, portraitsPanelData, housesData, street2Data,
    interior2Data, propsData, cascarudosData, fxData, titleData,
    deathPanelData, cursorData,
    roguelikeLlegada1, roguelikeLlegada2, roguelikeLlegada3, roguelikeLlegada4,
    roguelikeLlegada5, roguelikeLlegada6, roguelikeLlegada7,
    roguelikeCuartoVacio, roguelikeCuartoLlegada, roguelikeCuartoGag,
  ] = await Promise.all([
    texture('tiles.png'),
    texture('objects.png'),
    texture('buttons.png'),
    texture('chars.png'),
    texture('items.png'),
    texture('portraits.png'),
    texture('title.png'),
    texture('shadow.png'),
    texture('snow.png'),
    texture('footprint.png'),
    texture('chars2.png'),
    texture('portraits_dlg.png'),
    texture('portraits_panel.png'),
    texture('houses.png'),
    texture('street2.png'),
    texture('interior2.png'),
    texture('props.png'),
    texture('cascarudos.png'),
    texture('fx.png'),
    texture('views/attic_pan.png'),
    texture('views/attic_pan_dark.png'),
    texture('views/living.png'),
    texture('title_sky.png'),
    texture('death_panel.png'),
    texture('cursor.png'),
    texture('views/attic_frame.png'),
    texture('title_logo.png'),
    texture('snow_flakes/back_on.png'),
    texture('snow_flakes/back_off.png'),
    texture('snow_flakes/mid_on.png'),
    texture('snow_flakes/mid_off.png'),
    texture('snow_flakes/front_on.png'),
    texture('snow_flakes/front_off.png'),
    fetchJson(url('tiles.json')),
    fetchJson(url('objects.json')),
    fetchJson(url('buttons.json')),
    fetchJson(url('chars.json')),
    fetchJson(url('items.json')),
    fetchJson(url('portraits.json')),
    fetchJson(url('font.json')),
    fetchJson(url('chars2.json')),
    fetchJson(url('portraits_dlg.json')),
    fetchJson(url('portraits_panel.json')),
    fetchJson(url('houses.json')),
    fetchJson(url('street2.json')),
    fetchJson(url('interior2.json')),
    fetchJson(url('props.json')),
    fetchJson(url('cascarudos.json')),
    fetchJson(url('fx.json')),
    fetchJson(url('title.json')),
    fetchJson(url('death_panel.json')),
    fetchJson(url('cursor.json')),
    texture('roguelike/llegada_1.png'),
    texture('roguelike/llegada_2.png'),
    texture('roguelike/llegada_3.png'),
    texture('roguelike/llegada_4.png'),
    texture('roguelike/llegada_5.png'),
    texture('roguelike/llegada_6.png'),
    texture('roguelike/llegada_7.png'),
    texture('roguelike/cuarto_vacio.png'),
    texture('roguelike/cuarto_llegada.png'),
    texture('roguelike/cuarto_gag.png'),
  ]);

  return {
    tiles, objects, buttons, chars, items, portraits, title, shadow, snow, footprint,
    chars2, portraitsDlg, portraitsPanel, houses, street2, interior2, props,
    cascarudos, fx, viewAtticPan, viewAtticPanDark, viewLiving, titleSky,
    deathPanel, cursor, viewAtticFrame, titleLogo,
    snowFlakes: {
      backOn: snowBackOn, backOff: snowBackOff,
      midOn: snowMidOn, midOff: snowMidOff,
      frontOn: snowFrontOn, frontOff: snowFrontOff,
    },
    tilesData, objectsData, buttonsData, charsData, itemsData, portraitsData, font,
    chars2Data, portraitsDlgData, portraitsPanelData, housesData, street2Data,
    interior2Data, propsData, cascarudosData, fxData, titleData,
    deathPanelData, cursorData,
    roguelike: {
      llegada: [
        roguelikeLlegada1, roguelikeLlegada2, roguelikeLlegada3, roguelikeLlegada4,
        roguelikeLlegada5, roguelikeLlegada6, roguelikeLlegada7,
      ],
      cuarto: {
        vacio: roguelikeCuartoVacio,
        llegada: roguelikeCuartoLlegada,
        gag: roguelikeCuartoGag,
      },
    },
  };
}
