import test from 'node:test';
import assert from 'node:assert/strict';
import { garage } from '../../src/maps/garage.js';
import { pickAt, pickTarget } from '../../src/interaction.js';
import { objectAccessTiles, playerInAccess } from '../../src/reach.js';

// Mismo candidato que arma mapView.addObject() (sin el recorte de textura).
function candidateOf(obj) {
  const w = obj.tw * 16;
  const h = obj.th * 16;
  return {
    id: obj.id,
    kind: 'object',
    priority: 1,
    x: (obj.x + obj.tw / 2) * 16,
    y: (obj.y + obj.th) * 16,
    w,
    h,
    cursorBox: { x: obj.x * 16, y: obj.y * 16, w, h },
    ref: obj,
  };
}

test('garage: el extractor se alcanza desde el piso frente al portón', () => {
  const obj = garage.objects.find((o) => o.id === 'extractor');
  assert.ok(obj, 'falta el extractor en el mapa del garaje');
  assert.equal(obj.reach, undefined, 'ya no hay alcances por objeto');

  // Cuelga de la pared: el acceso es el piso de la fila 3, frente al portón.
  assert.ok(objectAccessTiles(obj, garage).has('8,3'), 'falta el casillero de acceso');
  const cand = candidateOf(obj);
  const player = { x: 8 * 16 + 8, feet: 3 * 16 + 12, dir: 'up' };
  assert.ok(playerInAccess(player, cand, garage), 'el jugador está en un acceso');

  const byFacing = pickTarget(player, [cand], { dir: 'up', map: garage });
  assert.equal(byFacing.target && byFacing.target.id, 'extractor');

  const byMouse = pickAt(player, [cand], { x: 136, y: 10 }, { dir: 'up', map: garage });
  assert.equal(byMouse.target && byMouse.target.id, 'extractor');
  assert.equal(byMouse.near, true);
});

test('garage: el extractor no se alcanza desde otro casillero', () => {
  const obj = garage.objects.find((o) => o.id === 'extractor');
  const cand = candidateOf(obj);
  // Dos tiles a la derecha del acceso: no hay alcance.
  const player = { x: 10 * 16 + 8, feet: 3 * 16 + 12, dir: 'up' };
  assert.equal(playerInAccess(player, cand, garage), false);
  assert.equal(pickTarget(player, [cand], { dir: 'up', map: garage }).target, null);
  const byMouse = pickAt(player, [cand], { x: 136, y: 10 }, { dir: 'up', map: garage });
  assert.equal(byMouse.near, false, 'se puede apuntar de lejos, pero no llegar');
});
