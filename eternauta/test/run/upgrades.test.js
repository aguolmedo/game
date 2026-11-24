import test from 'node:test';
import assert from 'node:assert/strict';
import { emptySave } from '../../src/run/save.js';
import {
  STATIONS,
  UPGRADES,
  STATION_INFO,
  nextUpgrade,
  upgradeState,
  canAfford,
  buyUpgrade,
  effects,
} from '../../src/run/upgrades.js';

function saveWith({ botin = {}, mejoras = {} } = {}) {
  const base = emptySave();
  return {
    ...base,
    botin: { ...base.botin, ...botin },
    mejoras: { ...base.mejoras, ...mejoras },
  };
}

const EFFECT_FIELDS = {
  favalli: ['fireRate', 'magSize', 'pierceDamage'],
  elena: ['integrityMax', 'patchTime', 'firstBiteFree'],
  lucas: ['rumor', 'sobreviviente', 'frecuencia'],
  luz: ['bengalas', 'molotovs', 'farol'],
};

test('hay 4 estaciones con 3 mejoras cada una, en orden', () => {
  assert.deepEqual(STATIONS, ['favalli', 'elena', 'lucas', 'luz']);
  for (const station of STATIONS) {
    assert.equal(UPGRADES[station].length, 3);
  }
  assert.deepEqual(UPGRADES.favalli.map((u) => u.id), ['cerrojo', 'cargador', 'punta']);
  assert.deepEqual(UPGRADES.elena.map((u) => u.id), ['capa', 'remiendo', 'hombreras']);
  assert.deepEqual(UPGRADES.lucas.map((u) => u.id), ['antena', 'valvulas', 'frecuencia']);
  assert.deepEqual(UPGRADES.luz.map((u) => u.id), ['bengala', 'molotov', 'farol']);
});

test('todas las mejoras tienen id, name, desc y costo', () => {
  const ids = new Set();
  for (const station of STATIONS) {
    for (const upgrade of UPGRADES[station]) {
      assert.equal(typeof upgrade.id, 'string');
      assert.equal(typeof upgrade.name, 'string');
      assert.equal(typeof upgrade.desc, 'string');
      assert.equal(typeof upgrade.cost, 'object');
      assert.equal(ids.has(upgrade.id), false);
      ids.add(upgrade.id);
    }
  }
  assert.equal(ids.size, 12);
});

test('los costos son los del diseño', () => {
  assert.deepEqual(UPGRADES.favalli[0].cost, { chatarra: 4 });
  assert.deepEqual(UPGRADES.favalli[1].cost, { chatarra: 6, pieza: 1 });
  assert.deepEqual(UPGRADES.favalli[2].cost, { pieza: 3, chatarra: 2 });
  assert.deepEqual(UPGRADES.elena[0].cost, { goma: 3 });
  assert.deepEqual(UPGRADES.elena[1].cost, { goma: 2, chatarra: 1 });
  assert.deepEqual(UPGRADES.elena[2].cost, { pieza: 2, goma: 2 });
  assert.deepEqual(UPGRADES.lucas[0].cost, { chatarra: 3 });
  assert.deepEqual(UPGRADES.lucas[1].cost, { chatarra: 2, pieza: 1 });
  assert.deepEqual(UPGRADES.lucas[2].cost, { pieza: 3 });
  assert.deepEqual(UPGRADES.luz[0].cost, { nafta: 2 });
  assert.deepEqual(UPGRADES.luz[1].cost, { nafta: 2, chatarra: 1 });
  assert.deepEqual(UPGRADES.luz[2].cost, { nafta: 3, chatarra: 2 });
});

test('STATION_INFO tiene quien y qué por estación', () => {
  for (const station of STATIONS) {
    assert.equal(typeof STATION_INFO[station].who, 'string');
    assert.equal(typeof STATION_INFO[station].what, 'string');
  }
  assert.equal(STATION_INFO.luz.who, 'Electrógeno');
});

test('nextUpgrade avanza y da null al final', () => {
  for (const station of STATIONS) {
    for (let level = 0; level < 3; level += 1) {
      assert.equal(nextUpgrade(saveWith({ mejoras: { [station]: level } }), station), UPGRADES[station][level]);
    }
    assert.equal(nextUpgrade(saveWith({ mejoras: { [station]: 3 } }), station), null);
  }
  assert.equal(nextUpgrade(emptySave(), 'ferreteria'), null);
  assert.equal(nextUpgrade(null, 'favalli'), UPGRADES.favalli[0]);
});

test('upgradeState da hecho, disponible y bloqueado', () => {
  const save = saveWith({ mejoras: { favalli: 1 } });
  assert.equal(upgradeState(save, 'favalli', 0), 'hecho');
  assert.equal(upgradeState(save, 'favalli', 1), 'disponible');
  assert.equal(upgradeState(save, 'favalli', 2), 'bloqueado');
  assert.equal(upgradeState(emptySave(), 'elena', 0), 'disponible');
  assert.equal(upgradeState(emptySave(), 'elena', 1), 'bloqueado');
});

test('upgradeState es defensivo con estación o índice inválidos', () => {
  const save = emptySave();
  assert.equal(upgradeState(save, 'ferreteria', 0), 'bloqueado');
  assert.equal(upgradeState(save, 'favalli', -1), 'bloqueado');
  assert.equal(upgradeState(save, 'favalli', 3), 'bloqueado');
  assert.equal(upgradeState(save, 'favalli', 1.5), 'bloqueado');
  assert.equal(upgradeState(null, 'favalli', 0), 'disponible');
});

test('canAfford compara contra el botín guardado', () => {
  const save = saveWith({ botin: { chatarra: 4, goma: 1 } });
  assert.equal(canAfford(save, { chatarra: 4 }), true);
  assert.equal(canAfford(save, { chatarra: 5 }), false);
  assert.equal(canAfford(save, { chatarra: 2, goma: 1 }), true);
  assert.equal(canAfford(save, { chatarra: 2, pieza: 1 }), false);
  assert.equal(canAfford(save, null), true);
  assert.equal(canAfford(save, undefined), true);
  assert.equal(canAfford(save, {}), true);
});

test('no se compra sin botín: reason falta y save intacto', () => {
  const save = saveWith({ botin: { chatarra: 1 } });
  const result = buyUpgrade(save, 'favalli');
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'falta');
  assert.deepEqual(result.save, save);
});

test('no se puede saltear: siempre compra la que sigue', () => {
  const save = saveWith({ botin: { chatarra: 100, pieza: 100, goma: 100, nafta: 100 } });
  const first = buyUpgrade(save, 'favalli');
  assert.equal(first.save.mejoras.favalli, 1);
  assert.equal(nextUpgrade(first.save, 'favalli').id, 'cargador');
  assert.equal(upgradeState(first.save, 'favalli', 1), 'disponible');
});

test('comprar descuenta exacto y sube un nivel', () => {
  const save = saveWith({ botin: { chatarra: 10, pieza: 1 } });
  const first = buyUpgrade(save, 'favalli');
  assert.equal(first.ok, true);
  assert.equal(first.reason, null);
  assert.equal(first.save.mejoras.favalli, 1);
  assert.equal(first.save.botin.chatarra, 6);
  assert.equal(first.save.botin.pieza, 1);

  const second = buyUpgrade(first.save, 'favalli');
  assert.equal(second.ok, true);
  assert.equal(second.save.mejoras.favalli, 2);
  assert.equal(second.save.botin.chatarra, 0);
  assert.equal(second.save.botin.pieza, 0);
});

test('comprar con la plata justa deja el botín en cero', () => {
  const save = saveWith({ botin: { goma: 3 } });
  const result = buyUpgrade(save, 'elena');
  assert.equal(result.ok, true);
  assert.equal(result.save.botin.goma, 0);
  assert.equal(result.save.mejoras.elena, 1);
});

test('con las 3 mejoras da completo', () => {
  for (const station of STATIONS) {
    const save = saveWith({
      botin: { chatarra: 99, goma: 99, nafta: 99, pieza: 99 },
      mejoras: { [station]: 3 },
    });
    const result = buyUpgrade(save, station);
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'completo');
    assert.deepEqual(result.save, save);
  }
  const unknown = buyUpgrade(emptySave(), 'ferreteria');
  assert.equal(unknown.ok, false);
  assert.equal(unknown.reason, 'completo');
});

test('buyUpgrade no muta el save ni los datos de UPGRADES', () => {
  const save = saveWith({ botin: { chatarra: 10, pieza: 1 } });
  const saveBefore = JSON.stringify(save);
  const upgradesBefore = JSON.stringify(UPGRADES);
  const result = buyUpgrade(save, 'favalli');
  assert.equal(JSON.stringify(save), saveBefore);
  assert.equal(JSON.stringify(UPGRADES), upgradesBefore);
  assert.notEqual(result.save, save);
  assert.notEqual(result.save.botin, save.botin);
  assert.notEqual(result.save.mejoras, save.mejoras);
});

test('effects arranca con los valores base', () => {
  assert.deepEqual(effects(emptySave()), {
    fireRate: 0.55,
    magSize: 5,
    pierceDamage: 0.5,
    integrityMax: 3,
    patchTime: 1.5,
    firstBiteFree: false,
    rumor: false,
    sobreviviente: false,
    frecuencia: false,
    bengalas: 0,
    molotovs: 0,
    farol: false,
  });
  assert.deepEqual(effects(null), effects(emptySave()));
  assert.deepEqual(effects({}), effects(emptySave()));
});

test('effects cambia en cada nivel de cada estación', () => {
  const base = effects(emptySave());
  for (const station of STATIONS) {
    const active = effects(saveWith({ mejoras: { [station]: 3 } }));
    EFFECT_FIELDS[station].forEach((field, i) => {
      const needed = i + 1;
      assert.notDeepEqual(active[field], base[field], `${station}.${field} tiene que cambiar en el nivel 3`);
      for (let level = 0; level <= 3; level += 1) {
        const got = effects(saveWith({ mejoras: { [station]: level } }))[field];
        const expected = level >= needed ? active[field] : base[field];
        assert.equal(got, expected, `${station}.${field} en nivel ${level}`);
      }
    });
  }
});
