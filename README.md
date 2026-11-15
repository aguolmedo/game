# game — El Eternauta (demo) + bocetos

Juegos chicos de pixel art hechos con Three.js + Vite. El proyecto principal es
una demo jugable de **El Eternauta — la nevada**; en `bocetos/` quedan los
estudios de arte previos.

## Demo jugable

**[▶ Jugar la demo](https://aguolmedo.github.io/game/)** (GitHub Pages)

*El Eternauta* (1957): H. G. Oesterheld y F. Solano López. Demo fan sin fines de
lucro: el arte es generado para esta demo, inspirado en el cómic.

Controles: joystick (Gamepad API) o teclado — WASD/flechas, `E`, `F`, `I`, `Q`/`R`, `Esc`.
Detalle completo en [`eternauta/README.md`](eternauta/README.md).

## Estructura

```
eternauta/            Demo jugable (Three.js + Vite, resolución interna 480x270)
  src/                Escenas, mapas, UI, lógica de juego
  public/assets/      Sprites y datos exportados (PNG + JSON)
  tools/art/          Generadores de arte en Python/Pillow
  tools/export_assets.py
  test/               Tests de lógica (node --test)
  docs/               Guion, referencias visuales y capturas
bocetos/              Estudios de arte previos (solo lectura)
  eternauta/          Sprites, fondos y scripts del Eternauta
  cruce/              Bocetos del Cruce de los Andes (San Martín)
```

## Desarrollo

```bash
cd eternauta
npm install
npm run dev        # servidor de desarrollo
npm run build      # build de producción en eternauta/dist/
npm test           # 246 tests
npm run assets     # regenera public/assets (requiere Pillow)
```

## Deploy

El workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
compila y publica `eternauta/dist/` en GitHub Pages en cada push a `main`.

Para activarlo la primera vez: **Settings → Pages → Source: GitHub Actions**.

## Notas

- Los escaneos del cómic usados como referencia (`eternauta/ref/`) **no** están
  en el repositorio: son material con derechos de autor y además pesan ~80 MB.
- `_archive/` (briefs, logs y backups del proceso de desarrollo) está ignorado
  por git.
