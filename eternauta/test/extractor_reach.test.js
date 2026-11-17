import test from 'node:test';
import assert from 'node:assert/strict';
import { garage } from '../src/maps/garage.js';
import { pickAt, pickTarget } from '../src/interaction.js';

// Mismo candidato que arma mapView.addObject().
function candidateOf(obj) {
  const anchorX = (obj.x + obj.tw / 2) * 16;
  const anchorY = (obj.y + obj.th) * 16;
  return {
    id: obj.id,
    kind: 'object',
    x: anchorX,
    y: anchorY,
    w: obj.tw * 16,
    h: obj.th * 16,
    ref: obj,
  };
}

test('garage: el extractor se alcanza desde el piso frente al portón', () => {
  const obj = garage.objects.find((o) => o.id === 'extractor');
  assert.ok(obj, 'falta el extractor en el mapa del garaje');
  assert.equal(obj.reach, 56, 'el extractor tiene que traer su propio alcance');

  const cand = candidateOf(obj);
  // bounds.minFeet del garaje es 54: el jugador llega hasta ahí.
  const player = { x: cand.x, feet: 54, dir: 'up' };

  const byFacing = pickTarget(player, [cand], { dir: 'up', reach: 22 });
  assert.equal(byFacing.target && byFacing.target.id, 'extractor');

  const byMouse = pickAt(player, [cand], { x: cand.x, y: cand.y - 8 }, { dir: 'up', reach: 28 });
  assert.equal(byMouse.target && byMouse.target.id, 'extractor');
  assert.equal(byMouse.near, true);
});

test('garage: sin el alcance propio el extractor queda fuera de alcance', () => {
  const obj = garage.objects.find((o) => o.id === 'extractor');
  const plain = { ...obj };
  delete plain.reach;
  const cand = candidateOf(plain);
  const player = { x: cand.x, feet: 54, dir: 'up' };

  assert.equal(pickTarget(player, [cand], { dir: 'up', reach: 22 }).target, null);

  const byMouse = pickAt(player, [cand], { x: cand.x, y: cand.y - 8 }, { dir: 'up', reach: 28 });
  assert.equal(byMouse.target && byMouse.target.id, 'extractor');
  assert.equal(byMouse.near, false, 'a 38 px no llega con el alcance normal');
});
