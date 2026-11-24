// node --test test/
import test from 'node:test';
import assert from 'node:assert/strict';
import { newFarm, act, tick, resolve, stage, key, migrate } from '../src/state.js';
import { WET, DAY, CROPS } from '../src/data.js';

test('anbauen, gießen, wachsen, ernten', () => {
  const s = newFarm('Test');
  assert.ok(act(s, { t: 'till', x: -6, z: 0, dx: 1, dz: 0 }).ok);
  assert.ok(act(s, { t: 'plant', x: -6, z: 0, dx: 1, dz: 0, item: 's_karotte' }).ok);
  assert.equal(s.inv.s_karotte, 5);
  tick(s, 30, true);
  assert.equal(s.tiles[key(-6, 0)].c.g, 0, 'ohne Wasser kein Wachstum');
  assert.ok(act(s, { t: 'water', x: -6, z: 0, dx: 1, dz: 0 }).ok);
  assert.equal(s.tiles[key(-6, 0)].w, WET);
  for (let i = 0; i < 70; i++) tick(s, 1, true);
  assert.equal(stage(s.tiles[key(-6, 0)].c), 3);
  const r = resolve(s, { x: -6, z: -1, ry: 0 }, 'hoe');
  assert.equal(r.a.t, 'harvest');
  const out = act(s, r.a);
  assert.ok(out.ok);
  assert.equal(s.inv.karotte, 1);
  assert.equal(s.tiles[key(-6, 0)].c, undefined);
  assert.ok(s.xp > 0);
});

test('ungültige Netz-Eingaben werden abgelehnt', () => {
  const s = newFarm();
  for (const a of [null, 1, {}, { t: '__proto__' }, { t: 'till', x: 'a', z: 0, dx: 1, dz: 0 }, { t: 'till', x: 0, z: 0, dx: 1, dz: 1 },
    { t: 'buy', id: 'toString', n: 1 }, { t: 'buy', id: 's_karotte', n: -5 }, { t: 'sell', id: 'karotte', n: 1e9 },
    { t: 'place', x: 0, z: 0, item: 'constructor' }, { t: 'order', i: '0' }]) {
    assert.equal(act(s, a).ok, false, JSON.stringify(a));
  }
  assert.equal(s.money, 150);
});

test('kaufen, verkaufen, Upgrades, Level-Sperren', () => {
  const s = newFarm();
  assert.equal(act(s, { t: 'buy', id: 's_kuerbis', n: 1 }).ok, false);
  assert.ok(act(s, { t: 'buy', id: 's_karotte', n: 5 }).ok);
  assert.equal(s.money, 100);
  s.inv.karotte = 3;
  assert.ok(act(s, { t: 'sell', id: 'karotte', n: 3 }).ok);
  assert.equal(s.money, 100 + 3 * CROPS.karotte.sell);
  s.money = 10000; s.level = 2;
  assert.ok(act(s, { t: 'upgrade', id: 'q_veg' }).ok);
  s.inv.karotte = 1;
  act(s, { t: 'sellAll' });
  assert.equal(s.inv.karotte, undefined);
  assert.equal(act(s, { t: 'buyAnimal', id: 'huhn' }).ok, false, 'kein Stall');
  assert.ok(act(s, { t: 'upgrade', id: 'coop' }).ok);
  assert.ok(act(s, { t: 'buyAnimal', id: 'huhn' }).ok);
});

test('Tiere: füttern, produzieren, einsammeln', () => {
  const s = newFarm();
  s.money = 5000; s.level = 3; s.up.coop = 1;
  act(s, { t: 'buyAnimal', id: 'huhn' });
  const id = s.animals[0].id;
  assert.equal(act(s, { t: 'animal', id }).ok, false, 'kein Futter');
  s.inv.weizen = 1;
  assert.ok(act(s, { t: 'animal', id }).ok);
  assert.equal(s.animals[0].fed, DAY);
  for (let i = 0; i < 95; i++) tick(s, 1, true);
  assert.ok(s.animals[0].ready);
  assert.ok(act(s, { t: 'animal', id }).ok);
  assert.ok(s.inv.ei >= 1);
});

test('Maschinen, Sprinkler, neuer Tag', () => {
  const s = newFarm();
  s.level = 6; s.money = 99999;
  act(s, { t: 'buy', id: 'm_mayo', n: 1 });
  assert.ok(act(s, { t: 'place', x: 5, z: 0, item: 'm_mayo', r: 0 }).ok);
  s.inv.ei = 2;
  assert.ok(act(s, { t: 'use', x: 5, z: 0 }).ok);
  assert.equal(act(s, { t: 'pickup', x: 5, z: 0 }).ok, false, 'arbeitet noch');
  for (let i = 0; i < 121; i++) tick(s, 1, true);
  act(s, { t: 'use', x: 5, z: 0 });
  assert.equal(s.inv.mayo, 2);
  act(s, { t: 'buy', id: 'sprinkler', n: 1 });
  assert.ok(act(s, { t: 'place', x: -3, z: 0, item: 'sprinkler', r: 0 }).ok);
  tick(s, 0.1, true);
  assert.equal(s.tiles[key(-3, 1)].w > 0, true);
  const day = s.day;
  tick(s, DAY, true);
  assert.equal(s.day, day + 1);
  assert.equal(s.orders.length, 3);
});

test('alte Spielstände werden ergänzt', () => {
  const s = newFarm();
  delete s.stats.orders; delete s.up.rod;
  migrate(s);
  assert.equal(s.up.rod, 1);
  assert.equal(s.stats.orders, 0);
});

test('Doppeltipp kauft/liefert nicht doppelt', () => {
  const s = newFarm();
  s.money = 99999; s.level = 9;
  assert.ok(act(s, { t: 'upgrade', id: 'hoe', lvl: 1 }).ok);
  assert.equal(act(s, { t: 'upgrade', id: 'hoe', lvl: 1 }).ok, false);
  assert.equal(s.up.hoe, 2);
  const [o0, o1] = s.orders;
  s.inv[o0.item] = 99; s.inv[o1.item] = 99;
  assert.ok(act(s, { t: 'order', i: 0, item: o0.item, n: o0.n }).ok);
  assert.equal(act(s, { t: 'order', i: 0, item: o0.item, n: o0.n }).ok, s.orders[0].item === o0.item && s.orders[0].n === o0.n);
});

test('migrate gibt Dinge unter Gebäuden zurück und repariert Zahlen', () => {
  const s = newFarm();
  s.obj['11,-6'] = { k: 'm_mayo', r: 0, n: 2, t: 0, o: 3 };
  s.money = null;
  migrate(s);
  assert.equal(s.obj['11,-6'], undefined);
  assert.equal(s.inv.m_mayo, 1);
  assert.equal(s.inv.mayo, 3);
  assert.equal(s.inv.ei, 2);
  assert.equal(s.money, 0);
});
