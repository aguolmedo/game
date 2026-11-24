import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeViewport, updateViewport, snapCamera, viewToWorld, worldToView, viewport,
} from '../src/viewport.js';
import { WorldScene } from '../src/scenes/world.js';

test('computeViewport: zoom por resolución (diseño T2)', () => {
  assert.deepEqual(computeViewport(480, 270), {
    scale: 1, worldPx: 2, worldW: 240, worldH: 135, zoom: 2,
  });
  assert.deepEqual(computeViewport(960, 540), {
    scale: 2, worldPx: 3, worldW: 320, worldH: 180, zoom: 1.5,
  });
  assert.deepEqual(computeViewport(1440, 810), {
    scale: 3, worldPx: 5, worldW: 288, worldH: 162, zoom: 5 / 3,
  });
  assert.deepEqual(computeViewport(1920, 1080), {
    scale: 4, worldPx: 6, worldW: 320, worldH: 180, zoom: 1.5,
  });
});

test('computeViewport: ventanas chicas no bajan de 1x', () => {
  const v = computeViewport(320, 200);
  assert.equal(v.scale, 1);
  assert.equal(v.worldPx, 2);
});

test('computeViewport con zoom:false usa la vista de UI 480x270', () => {
  for (const [w, h] of [[480, 270], [960, 540], [1440, 810], [1920, 1080]]) {
    const v = computeViewport(w, h, { zoom: false });
    assert.equal(v.worldPx, v.scale);
    assert.equal(v.worldW, 480);
    assert.equal(v.worldH, 270);
    assert.equal(v.zoom, 1);
  }
});

test('snapCamera redondea a 1/worldPx', () => {
  assert.equal(snapCamera(100.37, 3), Math.round(100.37 * 3) / 3);
  assert.equal(snapCamera(-16.1, 2), -16);
  assert.equal(snapCamera(12.9, 1), 13);
});

test('screenToWorld / worldToView con zoom: ida y vuelta', () => {
  const cam = { x: 320.5, y: 100.25 };
  for (const zoom of [1, 1.5, 2, 5 / 3]) {
    for (const v of [{ x: 0, y: 0 }, { x: 17, y: 133 }, { x: 479, y: 269 }]) {
      const world = viewToWorld(v, cam, zoom);
      const back = worldToView(world.x, world.y, cam, zoom);
      assert.ok(Math.abs(back.x - v.x) < 1e-9, `x ${zoom} ${v.x}`);
      assert.ok(Math.abs(back.y - v.y) < 1e-9, `y ${zoom} ${v.y}`);
    }
  }
});

test('WorldScene.worldToView aplica cámara y zoom del viewport', () => {
  updateViewport(960, 540, true); // zoom 1.5, mundo 320x180
  try {
    const fake = { cam: { x: 100, y: 40 } };
    const p = WorldScene.prototype.worldToView.call(fake, 180, 80);
    assert.deepEqual(p, { x: (180 - 100) * 1.5, y: (80 - 40) * 1.5 });
  } finally {
    updateViewport(480, 270, false); // vuelve al estado seguro (480x270)
    assert.equal(viewport.worldW, 480);
    assert.equal(viewport.zoom, 1);
  }
});
