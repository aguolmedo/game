# v3 asset contract (480x270, 16 px tiles)

All art is generated with Python + PIL in `tools/art/`. Never edit `bocetos/`.
Style: Stardew-like pixel art, 3/4 top-down, 16 px tile grid, limited palettes
(3-4 tones per material), hue-shifted shadows (cooler/purple), warm highlights,
colored dark outlines (never pure black), light from top-left, selective 1 px
rim. Flat color areas, a FEW detail pixels. No gradients, no dithering/noise.
Reference for technique only: `ref/stardew_interior.png`, `ref/stardew_exterior.png`.
Comic fidelity: `docs/guion.md` + `ref/comic_*.png`. 1957 Vicente Lopez at night.

## Files
- `public/assets/tiles.png` + `tiles.json`: 16x16 tiles. JSON: `{"frames": {name: [x,y,16,16]}}`.
- `public/assets/objects.png` + `objects.json`: object sprites, variable size.
  JSON: `{"frames": {name: [x,y,w,h]}}`. Sprite is anchored by its BOTTOM CENTER.
- `public/assets/buttons.png` + `buttons.json`: controller + keyboard glyphs.
- `public/assets/title.png`: 480x270 title background (no text; menu is drawn in JS).
- `public/assets/footprint.png`: 6x3 snow footprint (dark blue-grey, RGBA).
- `public/assets/chars.png` + `chars.json` (16x32 atlas, 5 characters x 6 frames x 4 dirs).
- `public/assets/items.png` + `items.json` (16x16 icons).
- `public/assets/font.json` (5x7 pixel font, with Spanish accents and ¿ ¡).
- `public/assets/ui.png` + `ui.json` (small wooden UI pieces, optional).
- `public/assets/shadow.png`, `snow.png` (existing, keep).

## Tiles (exact names, 16x16)
Attic floor: `wood_0 wood_1 wood_2 wood_3 wood_4 wood_5` (warm brown planks,
variations: every 3rd plank a tone off, sparse knots/1 px grain).
Attic walls: `plank_0 plank_1 plank_2` (dark purple-brown horizontal boards),
`roof_0 roof_1 roof_2` (dark sloping roof boards/rafters), `beam_0` vertical beam.
Rug: `rug_0 rug_1 rug_2 rug_3` (2x2 patterned rug, muted red/ochre, border).
Stairs down: `stair_0 stair_1 stair_2 stair_3` (2x2, wooden steps + dark hole).
House floor: `parquet_0 parquet_1 parquet_2` (honey wood), `tile_0 tile_1`
(pale checkered garage tiles), `brick_0 brick_1` (red-brown brick wall),
`plaster_0 plaster_1` (cream wall), `trim_0` (skirting board).
Street: `snow_0..snow_5` (night snow: blue-white, 3 tone, sparse sparkle),
`path_0 path_1` (trampled grey snow), `sidewalk_0 sidewalk_1` (snowy pavement
slabs), `curb_0` (curb edge), `road_0 road_1` (dark snow-dusted asphalt),
`hedge_0 hedge_1` (snow-topped hedge), `grass_0` (snowy grass).
`black` = 16x16 near-black fill (used for map borders).

## Objects (exact names; suggested size in px, keep these or +-16)
### Attic (interior scaled to 16 px grid)
- `table_truco` 48x32: wooden truco table, 3x2 tiles, cards fanned, small bottle.
- `chair` 16x24: wooden chair seen from behind/side (used around the table).
- `chair_front` 16x24: chair facing camera (empty).
- `shelf` 48x32: wall shelf with books, jars and a small violin.
- `radio_cabinet` 32x24: wooden sideboard with the valve radio on top (dial, grille).
- `radio` 16x16: valve radio close-up (for pickup/icon-like prop).
- `window_glow` 32x32: 2x2 window with wooden frame, glowing snow outside.
- `hanging_lamp` 16x32: lamp hanging from the ceiling, warm glow pool included.
- `coat_stand` 16x40: wooden coat stand with hats/coats.
- `crate` 16x16: wooden crate, container.
- `box` 16x16: cardboard box (container variant).
- `suitcase` 16x16: old leather suitcase.
- `tool_table` 48x32: workbench with tools, cloth, rubber strips, scissors.
- `violin_bench` 32x24: Polsky's small bench with violin parts and tools.
- `air_tank` 16x24: oxygen cylinder (green/grey).
- `stairs_down` 32x32: visual 2x2 stairwell going down (wood, dark opening).
- `door` 16x32: interior wooden door (1x2).
- `speaker` 16x24: round black speaker on a stand (comic p027).
- `book` 8x8, `bottle` 8x16, `jar` 8x8, `cards` 8x8, `cup` 8x8, `violin` 16x8,
  `tools` 8x8, `rag` 8x8: tiny floor/shelf props (soft shadow added in code).
### House (living + garage)
- `sofa` 48x24, `armchair` 16x24, `living_table` 32x24, `oil_lamp` 8x12.
- `wardrobe` 32x32 (container with doors), `stairs_up` 32x32 (2x2 stairwell up).
- `exit_door` 32x32: double street door with panels/round handles (comic p042).
- `garage_shelf` 48x32: shelves with cans/jars/bottles.
- `workbench` 48x32: garage bench, extractor fan + Elena's hair dryer.
- `tire` 16x16, `bucket` 8x8, `hose` 16x16 (coiled on wall), `cans` 8x8.
- `cot` 32x16: small bed/cot (Martita rests).
- `stove` 16x24: kitchen stove with kettle.
### Street (exterior, night snow, Vicente Lopez)
- `chalet_a` 96x80, `chalet_b` 80x64, `chalet_c` 64x64, `chalet_d` 80x80:
  two-storey/suburban chalets with gabled snowy roofs, chimneys, a lit window.
- `shop_ferreteria` 80x64, `shop_almacen` 80x64: low storefronts, hand-painted
  sign, dark windows, snow on the awning (end of the street goal).
- `fence` 32x16 (wooden slats + snow), `gate` 32x32, `hedge` 32x16.
- `tree_a` 32x48, `tree_b` 24x40: bare/leafy trees with snow on branches.
- `streetlight` 16x48: 1950s lamppost, warm glow halo around the lamp.
- `car` 48x24: rounded 1950s car buried in snow.
- `bus` 64x32: colectivo number 10, big grille and round headlights, tilted.
- `snow_mound` 32x16, `mailbox` 8x16, `trash` 8x16.
- `figure_snow` 24x12: small dark figure lying in the snow (Polsky), mostly covered.
- `sign_ferreteria` 16x16 / `sign_almacen` 16x16: hanging shop signs.
- `arrow_marker` 16x24: small wooden arrow sign pointing right (goal marker).

## Button glyphs (`buttons.png`/`buttons.json`)
Style refs: `ref/buttons_ref1.png`, `ref/buttons_ref2.png`. Generic controller,
no brand logos. 1 px dark outline, 1 px top-left highlight, chunky flat colors.
Small set (in-game, ~9-13 px):
`a` green, `b` red, `x` blue, `y` yellow round ~11x11 with dark ring + inner
circle + white letter; `lb`/`rb` light grey rounded bumper ~15x9; `lt`/`rt`
taller trigger ~12x13; `start`/`back` light grey pill ~18x9; `dpad` dark round
9x9 cross; `stick` dark round with dot 11x11; `left`/`right` small grey
triangle pills ~11x7.
Large set for Controles screen (~18-22 px): same names suffixed `_l`
(`a_l`, `b_l`, `x_l`, `y_l`, `lb_l`, `rb_l`, `lt_l`, `rt_l`, `start_l`,
`back_l`, `dpad_l`, `stick_l`, `left_l`, `right_l`).
Keyboard twins (small, cream keycap with dark rim, 11-13 px wide):
`key_e key_f key_i key_esc key_q key_r key_space key_tab key_arrow key_1
key_2 key_3 key_4 key_5 key_6 key_7 key_8`.

## Characters (16x32, 4 dirs x 6 frames: 4 walk + 2 idle)
Fix per `docs/guion.md` "Personajes":
- Juan: young, square jaw, short dark hair, dark high-neck sweater.
- Juan with suit: light rubberized one-piece suit, round diving helmet with
  circular glass visor and metal ring, round dark filter at the mouth, thick
  gloves/boots. Keep the current recognizable look, refine if needed.
- Favalli: older, dark thinning hair/bald crown, THICK round glasses, mustache,
  knitted high-neck sweater (light with darker chest stripes allowed).
- Lucas: middle-aged, BALDING with sparse white/light-grey hair at the sides,
  long lined face, NO glasses, light shirt + tie + dark jacket. NOT young.
- Polsky: old, WHITE hair combed back (not bald), round face, big nose,
  dark suit + tie, heavier body.
Portraits are the 2x upscaled head of idle-down frame (keep current mechanism).

## Items (16x16 icons)
`tela` (rolled waxed cloth), `casco` (diving helmet with round visor),
`guantes` (rubber gloves), `botas` (rubber boots), `tiras` (coil of rubber
strips), `oxigeno` (oxygen cylinder), `traje` (folded/hanging suit with helmet),
`rifle` (1950s rifle). Exactly these ids.

## Title background
480x270. Night in Vicente Lopez: dark starry sky, low chalets with snowy gabled
roofs and chimneys, one warm lit window (the only light in the block), a
streetlamp, fence, trees, snow; empty lower third for the menu. Subtle, not busy.

## Preview
Add `tools/art/preview.py` that loads the produced atlases, crops a frame and
writes a large nearest-neighbour PNG to /tmp for visual checking (use it and
LOOK at the results before saying done).
