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

test('Erfolge werden einmal vergeben und belohnt', async () => {
  const { ACHIEVEMENTS } = await import('../src/data.js');
  const s = newFarm();
  assert.ok(act(s, { t: 'till', x: -6, z: 0, dx: 1, dz: 0 }).ok);
  act(s, { t: 'plant', x: -6, z: 0, dx: 1, dz: 0, item: 's_karotte' });
  s.tiles[key(-6, 0)].c.g = 999;
  const money = s.money, out = act(s, { t: 'harvest', x: -6, z: 0, dx: 1, dz: 0 });
  assert.deepEqual(out.ach, ['ernte1']);
  assert.equal(s.money, money + ACHIEVEMENTS.find(a => a.id === 'ernte1').reward);
  s.tiles[key(-6, 0)].c = { k: 'karotte', g: 999 };
  assert.equal(act(s, { t: 'harvest', x: -6, z: 0, dx: 1, dz: 0 }).ach, undefined);
  for (const a of ACHIEVEMENTS) a.test(newFarm()); // keine Ausnahme bei leerem Hof
});

test('Holz, Stein, Schütteln, Ausgraben, Insekten, Kochen & Werkeln', async () => {
  const { RES_SPOTS, RECIPES } = await import('../src/data.js');
  const s = newFarm();
  const tree = Object.keys(RES_SPOTS).find(k => RES_SPOTS[k] === 'tree').split(',').map(Number);
  const rock = Object.keys(RES_SPOTS).find(k => RES_SPOTS[k] === 'rock').split(',').map(Number);
  for (let i = 0; i < 3; i++) assert.ok(act(s, { t: 'chop', x: tree[0], z: tree[1] }).ok);
  assert.equal(act(s, { t: 'chop', x: tree[0], z: tree[1] }).ok, false, 'nur 3× pro Tag');
  assert.ok(s.inv.holz >= 3);
  assert.ok(act(s, { t: 'mine', x: rock[0], z: rock[1] }).ok);
  assert.ok(act(s, { t: 'shake', x: tree[0], z: tree[1] }).ok);
  assert.equal(act(s, { t: 'shake', x: tree[0], z: tree[1] }).ok, false);
  assert.equal(s.digs.length, 4, 'vier Grabstellen pro Tag');
  const [dx, dz] = s.digs[0].split(',').map(Number);
  const out = act(s, { t: 'dig', x: dx, z: dz });
  assert.ok(out.ok && out.newAlbum, 'Fund landet im Sammelbuch');
  assert.equal(act(s, { t: 'dig', x: dx, z: dz }).ok, false);
  s.dayTime = 0.3;
  assert.ok(act(s, { t: 'bug', x: 0, z: 0 }).ok);
  assert.equal(s.stats.bugs, 1);
  s.inv.weizen = 3;
  assert.ok(act(s, { t: 'craft', id: 'brot' }).ok);
  assert.equal(s.inv.brot, 1);
  assert.equal(act(s, { t: 'craft', id: 'brot' }).ok, false, 'Zutaten fehlen');
  assert.equal(act(s, { t: 'craft', id: '__proto__' }).ok, false);
  s.inv.holz = 6;
  assert.ok(act(s, { t: 'craft', id: 'r_bank' }).ok);
  assert.equal(s.inv.bank, 1);
  for (const r of Object.values(RECIPES)) assert.ok(Object.keys(r.in).length, 'jedes Rezept hat Zutaten');
  tick(s, DAY, true);
  assert.equal(s.res[tree.join(',')], 3, 'morgens wieder voll');
});

test('Pflanzen außerhalb der Saison wachsen langsamer', async () => {
  const s = newFarm();
  act(s, { t: 'till', x: -6, z: 0, dx: 1, dz: 0 });
  s.inv.s_melone = 1;
  act(s, { t: 'plant', x: -6, z: 0, dx: 1, dz: 0, item: 's_melone' });
  s.tiles[key(-6, 0)].w = 999;
  tick(s, 10, true);
  assert.equal(Math.round(s.tiles[key(-6, 0)].c.g), 5, 'Melone im Frühling: halbe Geschwindigkeit');
});

test('Nachbarn: Gespräche, Geschenke, Briefe', async () => {
  const s = newFarm();
  assert.ok(act(s, { t: 'talk', id: 'mira' }).ok);
  act(s, { t: 'talk', id: 'mira' });
  assert.equal(s.npc.mira.f, 15, 'nur einmal pro Tag Freundschaft durchs Reden');
  s.inv.kuchen = 2;
  const out = act(s, { t: 'gift', id: 'mira', item: 'kuchen' });
  assert.equal(out.reaction, 'love');
  assert.equal(act(s, { t: 'gift', id: 'mira', item: 'kuchen' }).ok, false, 'ein Geschenk pro Tag');
  assert.equal(act(s, { t: 'gift', id: '__proto__', item: 'kuchen' }).ok, false);
  s.npc.mira.f = 250;
  tick(s, DAY, true);
  assert.equal(s.mail.length, 1, 'Brief bei 2 Herzen');
  assert.equal(s.mail[0].from, 'mira');
  assert.ok(act(s, { t: 'mail', i: 0 }).ok);
  assert.ok(s.inv.kuchen >= 2, 'Geschenk aus dem Brief');
  assert.ok(s.orders.every(o => o.npc), 'Aufträge kommen von Nachbarn');
});

test('Zuhause: Möbel stellen, Teppiche, Wandschmuck, Kollision, Schlafen', async () => {
  const S = await import('../src/state.js');
  const s = newFarm();
  s.inv.bett = 1; s.inv.teppich = 1; s.inv.bild = 2; s.inv.stuhl = 1;
  assert.ok(act(s, { t: 'hplace', x: 1, z: -2, item: 'bett', r: 0 }).ok, 'Doppelbett 2×2');
  assert.equal(act(s, { t: 'hplace', x: 2, z: -1, item: 'stuhl', r: 0 }).ok, false, 'Bett belegt die Kachel');
  assert.ok(act(s, { t: 'hplace', x: -2, z: 0, item: 'teppich', r: 0 }).ok, 'Teppich');
  assert.ok(act(s, { t: 'hplace', x: -2, z: 0, item: 'stuhl', r: 0 }).ok, 'Stuhl auf dem Teppich');
  assert.ok(act(s, { t: 'hplace', x: -1, z: -2, item: 'bild', r: 0 }).ok, 'Bild an der Rückwand');
  assert.equal(act(s, { t: 'hplace', x: 0, z: 0, item: 'bild', r: 0 }).ok, false, 'Bild nicht mitten im Raum');
  assert.equal(act(s, { t: 'hplace', x: 3, z: 0, item: 'bett', r: 0 }).ok, false, 'nicht über den Rand');
  assert.ok(S.blocked(s, S.HOME_X + 1.5, -1.5), 'man läuft nicht durchs Bett');
  assert.ok(!S.blocked(s, S.HOME_X, 1), 'freier Boden');
  assert.ok(act(s, { t: 'hpick', x: 2, z: -1 }).ok, 'Bett wieder aufheben (beliebige Kachel)');
  assert.equal(s.inv.bett, 1);
  s.money = 1000;
  assert.ok(act(s, { t: 'hstyle', kind: 'wall', id: 'rosa' }).ok);
  assert.equal(act(s, { t: 'hstyle', kind: 'wall', id: '<x>' }).ok, false);
  s.dayTime = 0.5;
  assert.equal(S.sleepThrough(s), false, 'tagsüber nicht');
  s.dayTime = 0.8;
  const d = s.day;
  assert.ok(S.sleepThrough(s));
  assert.equal(s.day, d + 1);
});
