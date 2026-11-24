// Fachada de menús. Las pantallas viven en src/menus/; acá se reexporta la
// misma API pública de siempre, así nadie que importe este archivo cambia.
export { promptBox } from './menus/shared.js';
export { titleOptionRects, TitleMenu } from './menus/title.js';
export {
  CONTROLS_HEADERS, CONTROLS_NOTES, CONTROLS_ROWS, controlsTexts,
} from './menus/controls.js';
export {
  PAUSE_BOX, pauseTabRects, pauseSlotRects, pauseRecipeRects, pauseOptionRects,
  pauseCraftButtonRect, hintLayout, PauseMenu,
} from './menus/pause.js';
export {
  chestBox, chestTitleRect, chestSlotRects, ChestPanel,
} from './menus/chest.js';
export { moveSlot } from './menu.js';
