// Fixtures de los paneles de menú sin Three ni DOM: el prototipo real con los
// campos mínimos que leen los tests de hints y rects. Si PauseMenu/ChestPanel
// cambian de campos, se ajusta acá.
import { PauseMenu, ChestPanel } from '../../src/menus.js';

export function makePauseMenu(overrides = {}) {
  return Object.assign(Object.create(PauseMenu.prototype), {
    tab: 0, cursor: { index: 0 }, pending: null, ...overrides,
  });
}

export function makeChestPanel(overrides = {}) {
  return Object.assign(Object.create(ChestPanel.prototype), {
    index: 0, container: { name: 'Cajón', items: [{ id: 'tiras', n: 3 }] }, ...overrides,
  });
}
