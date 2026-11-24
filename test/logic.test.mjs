// node --test test/
import test from 'node:test';
import assert from 'node:assert/strict';
import { newFarm, act, tick, resolve, stage, key, migrate, canPlace, blocked, fruitReady } from '../src/state.js';
import { WET, DAY, CROPS, RES_SPOTS, TREE_FRUIT, BUILDINGS, ITEMS, STORY, DAILY, RECIPES, MUSEUM_ALL, ACHIEVEMENTS } from '../src/data.js';
import { walkable, grass, isWater, riverX, BRIDGES, POND, PIER, SPAWN } from '../src/island.js';

// freie Rasenkachel suchen
const freeTile = (s, from = [-6, 2]) => {
  for (let r = 0; r < 20; r++) for (let x = from[0] - r; x <= from[0] + r; x++) for (let z = from[1] - r; z <= from[1] + r; z++) if (canPlace(s, x, z)) return [x, z];
  throw new Error('kein Platz');
};
const firstRes = kind => Object.keys(RES_SPOTS).find(k => RES_SPOTS[k] === kind).split(',').map(Number);

test('Insel: Wasser, Brücken, Steg, Startpunkt', () => {
  assert.ok(walkable(SPAWN.x, SPAWN.z), 'Startpunkt ist begehbar');
  assert.ok(isWater(riverX(3), 3) && !walkable(riverX(3), 3), 'Fluss ist Wasser');
  for (const b of BRIDGES) assert.ok(walkable(riverX(b), b), 'Brücke ist begehbar');
  assert.ok(isWater(POND.cx, POND.cz), 'Teich');
  assert.ok(walkable(PIER.x, PIER.z1 - 0.5) && isWater(PIER.x + 1.5, PIER.z1 - 0.5), 'Steg ragt ins Meer');
  assert.ok(isWater(0, 30) && !walkable(0, 30), 'Meer');
  for (const [k, kind] of Object.entries(RES_SPOTS)) {
    const [x, z] = k.split(',').map(Number);
    assert.ok(walkable(x, z), `${kind} ${k} steht an Land`);
    assert.ok(TREE_FRUIT[k] || kind === 'rock');
  }
  const s = newFarm();
  for (const B of Object.values(BUILDINGS)) assert.ok(blocked(s, B.cx, B.cz), 'Gebäude blockieren');
});

test('Blumen pflanzen, gießen, wachsen, pflücken, blühen nach', () => {
  const s = newFarm('Test');
  const [x, z] = freeTile(s);
  assert.ok(act(s, { t: 'plant', x, z, item: 's_tulpe' }).ok);
  assert.equal(s.inv.s_tulpe, 3);
  assert.equal(act(s, { t: 'plant', x, z, item: 's_tulpe' }).ok, false, 'Platz belegt');
  tick(s, 10, true);
  const dry = s.tiles[key(x, z)].c.g;
  assert.ok(dry > 0 && dry < 10, 'trocken wächst es langsam');
  const r = resolve(s, { x, z: z - 0.9, ry: 0 }, 'can');
  assert.equal(r.a.t, 'water');
  assert.ok(act(s, r.a).ok);
  assert.equal(s.tiles[key(x, z)].w, WET);
  for (let i = 0; i < CROPS.tulpe.grow; i++) tick(s, 1, true);
  assert.equal(stage(s.tiles[key(x, z)].c), 3);
  const h = resolve(s, { x, z: z - 0.9, ry: 0 }, 'hand');
  assert.equal(h.a.t, 'harvest');
  assert.ok(act(s, h.a).ok);
  assert.equal(s.inv.tulpe, 1);
  assert.ok(s.tiles[key(x, z)].c, 'Blume bleibt stehen und blüht nach');
  assert.ok(stage(s.tiles[key(x, z)].c) < 3);
});

test('ungültige Netz-Eingaben werden abgelehnt', () => {
  const s = newFarm();
  for (const a of [null, 1, {}, { t: '__proto__' }, { t: 'plant', x: 'a', z: 0, item: 's_tulpe' }, { t: 'water', x: 0, z: 0, dx: 1, dz: 1 },
    { t: 'buy', id: 'toString', n: 1 }, { t: 'buy', id: 's_tulpe', n: -5 }, { t: 'sell', id: 'apfel', n: 1e9 },
    { t: 'place', x: 0, z: 0, item: 'constructor' }, { t: 'order', i: '0' }, { t: 'donate', id: 'apfel' }, { t: 'fish', x: 0, z: 2 }]) {
    assert.equal(act(s, a).ok, false, JSON.stringify(a));
  }
  assert.equal(s.money, 800);
});

test('kaufen, verkaufen, Upgrades, Level-Sperren', () => {
  const s = newFarm();
  assert.equal(act(s, { t: 'buy', id: 's_kuerbis', n: 1 }).ok, false, 'erst ab Level 6');
  assert.ok(act(s, { t: 'buy', id: 's_tulpe', n: 5 }).ok);
  assert.equal(s.money, 700);
  s.inv.apfel = 3;
  assert.ok(act(s, { t: 'sell', id: 'apfel', n: 3 }).ok);
  assert.equal(s.money, 700 + 300);
  s.money = 10000; s.level = 2;
  assert.ok(act(s, { t: 'upgrade', id: 'q_fruit' }).ok);
  s.inv.apfel = 1;
  act(s, { t: 'sellAll' });
  assert.equal(s.inv.apfel, undefined);
  assert.ok(act(s, { t: 'buy', id: 'mehl', n: 2 }).ok);
});

test('Bäume schütteln: Obst, wächst nach drei Tagen nach', () => {
  const s = newFarm();
  const [x, z] = firstRes('tree'), k = key(x, z), fruit = TREE_FRUIT[k];
  assert.ok(fruitReady(s, k));
  const r = resolve(s, { x, z: z - 0.9, ry: 0 }, 'hand');
  assert.equal(r.a.t, 'shake');
  assert.ok(act(s, r.a).ok);
  assert.equal(s.inv[fruit], 3);
  assert.equal(fruitReady(s, k), false);
  act(s, { t: 'shake', x, z }); // danach höchstens Äste & Co.
  assert.equal(s.inv[fruit], 3);
  for (let i = 0; i < 3; i++) tick(s, DAY, true);
  assert.ok(fruitReady(s, k), 'nach 3 Tagen wieder Obst');
  const [px, pz] = firstRes('palm');
  act(s, { t: 'shake', x: px, z: pz });
  assert.equal(s.inv.kokosnuss, 2);
});

test('Holz, Felsen, Muscheln, Unkraut, Ausgraben, Insekten, Kochen & Werkeln', () => {
  const s = newFarm();
  const tree = firstRes('tree');
  for (let i = 0; i < 3; i++) assert.ok(act(s, { t: 'chop', x: tree[0], z: tree[1] }).ok);
  assert.equal(act(s, { t: 'chop', x: tree[0], z: tree[1] }).ok, false, 'nur 3× pro Tag');
  assert.ok(s.inv.holz >= 3);
  const rocks = Object.keys(RES_SPOTS).filter(k => RES_SPOTS[k] === 'rock');
  const normal = rocks.find(k => k !== s.rock).split(',').map(Number), lucky = s.rock.split(',').map(Number);
  assert.ok(act(s, { t: 'mine', x: normal[0], z: normal[1] }).ok);
  assert.ok((s.inv.stein || 0) + (s.inv.lehm || 0) + (s.inv.eisen || 0) === 1);
  const m = s.money;
  assert.ok(act(s, { t: 'mine', x: lucky[0], z: lucky[1] }).ok);
  assert.ok(s.money > m, 'Glücksfelsen gibt Taler');
  const [sx, sz] = Object.keys(s.shells)[0].split(',').map(Number), shell = s.shells[key(sx, sz)];
  assert.equal(resolve(s, { x: sx, z: sz - 0.9, ry: 0 }, 'net').a?.t, 'pick', 'Muschel mit jedem Werkzeug aufheben');
  assert.ok(act(s, { t: 'pick', x: sx, z: sz }).ok);
  assert.equal(s.inv[shell], 1);
  const [wx, wz] = Object.keys(s.weeds)[0].split(',').map(Number);
  assert.ok(act(s, { t: 'pick', x: wx, z: wz }).ok);
  assert.equal(s.inv.unkraut, 1);
  assert.equal(s.digs.length, 5, 'fünf Stern-Risse pro Tag');
  const [dx, dz] = s.digs[0].split(',').map(Number);
  const out = act(s, { t: 'dig', x: dx, z: dz });
  assert.ok(out.ok && out.newAlbum, 'Fund landet im Sammelbuch');
  assert.equal(act(s, { t: 'dig', x: dx, z: dz }).ok, false);
  s.dayTime = 0.3;
  assert.ok(act(s, { t: 'bug', x: 0, z: 0 }).ok);
  s.inv.weizen = 3;
  assert.ok(act(s, { t: 'craft', id: 'brot' }).ok);
  assert.equal(s.inv.brot, 1);
  assert.equal(act(s, { t: 'craft', id: 'brot' }).ok, false, 'Zutaten fehlen');
  assert.equal(act(s, { t: 'craft', id: '__proto__' }).ok, false);
  s.inv.holz = 6; s.inv.ast = 2;
  assert.ok(act(s, { t: 'craft', id: 'r_bank' }).ok);
  assert.equal(s.inv.bank, 1);
  for (const r of Object.values(RECIPES)) for (const id of Object.keys(r.in)) assert.ok(ITEMS[id], 'Zutat existiert: ' + id);
  tick(s, DAY, true);
  assert.equal(s.res[tree.join(',')], 3, 'morgens wieder voll');
  assert.ok(Object.keys(s.shells).length >= 5, 'neue Muscheln am Strand');
});

test('Angeln: Fluss, Teich und Meer haben eigene Fische', () => {
  const s = newFarm();
  s.up.rod = 3;
  const caught = where => { const out = act(s, { t: 'fish', ...where }); assert.ok(out.ok); return out.caught; };
  const sea = new Set(), river = new Set();
  for (let i = 0; i < 60; i++) { sea.add(caught({ x: 0, z: 26 })); river.add(caught({ x: Math.round(riverX(3)), z: 3 })); }
  assert.ok(![...river].includes('hai') && [...river].some(f => ['barsch', 'forelle', 'krebs', 'hecht', 'lachs'].includes(f)));
  assert.ok([...sea].some(f => ['makrele', 'krabbe', 'tintenfisch', 'kugelfisch'].includes(f)));
  assert.equal(act(s, { t: 'fish', x: 0, z: 2 }).ok, false, 'auf dem Rasen kann man nicht angeln');
});

test('Museum: jedes Stück einmal ausstellen', () => {
  const s = newFarm();
  s.inv.barsch = 2; s.inv.ammonit = 1;
  assert.ok(act(s, { t: 'donate', id: 'barsch' }).ok);
  assert.equal(act(s, { t: 'donate', id: 'barsch' }).ok, false, 'nicht doppelt');
  assert.equal(s.inv.barsch, 1);
  assert.ok(act(s, { t: 'donate', id: 'ammonit' }).ok);
  assert.equal(Object.keys(s.museum).length, 2);
  assert.ok(MUSEUM_ALL.length > 30);
  const r = resolve(s, { x: BUILDINGS.museum.cx, z: BUILDINGS.museum.z1 + 1.2, ry: Math.PI }, 'hand');
  assert.equal(r.ui, 'museum');
});

test('Obstbaum aufstellen und pflücken', () => {
  const s = newFarm();
  s.money = 5000; s.level = 3;
  assert.ok(act(s, { t: 'buy', id: 'orangenbaum', n: 1 }).ok);
  const [x, z] = freeTile(s);
  assert.ok(act(s, { t: 'place', x, z, item: 'orangenbaum', r: 0 }).ok);
  assert.equal(act(s, { t: 'use', x, z }).ok, false, 'noch nicht reif');
  for (let i = 0; i < 2 * DAY; i++) tick(s, 1, true);
  assert.ok(act(s, { t: 'use', x, z }).ok);
  assert.equal(s.inv.orange, 3);
});

test('alte Spielstände werden ergänzt', () => {
  const s = newFarm();
  delete s.stats.orders; delete s.up.rod; delete s.shells; s.money = null;
  migrate(s);
  assert.equal(s.up.rod, 1);
  assert.equal(s.stats.orders, 0);
  assert.ok(Object.keys(s.shells).length);
  assert.equal(s.money, 0);
});

test('Doppeltipp kauft/liefert nicht doppelt', () => {
  const s = newFarm();
  s.money = 99999; s.level = 9;
  assert.ok(act(s, { t: 'upgrade', id: 'can', lvl: 1 }).ok);
  assert.equal(act(s, { t: 'upgrade', id: 'can', lvl: 1 }).ok, false);
  assert.equal(s.up.can, 2);
  const [o0] = s.orders;
  s.inv[o0.item] = 99;
  assert.ok(act(s, { t: 'order', i: 0, item: o0.item, n: o0.n }).ok);
  assert.equal(act(s, { t: 'order', i: 0, item: o0.item, n: o0.n }).ok, s.orders[0].item === o0.item && s.orders[0].n === o0.n);
});

test('Erfolge werden einmal vergeben und belohnt', () => {
  const s = newFarm();
  const [x, z] = firstRes('tree');
  const money = s.money, out = act(s, { t: 'shake', x, z });
  assert.deepEqual(out.ach, ['obst1']);
  assert.equal(s.money, money + ACHIEVEMENTS.find(a => a.id === 'obst1').reward);
  for (const a of ACHIEVEMENTS) a.test(newFarm()); // keine Ausnahme bei leerer Insel
});

test('Nachbarn: Gespräche, Geschenke, Briefe, Wünsche', () => {
  const s = newFarm();
  assert.ok(act(s, { t: 'talk', id: 'mira' }).ok);
  act(s, { t: 'talk', id: 'mira' });
  assert.equal(s.npc.mira.f, 15, 'nur einmal pro Tag Freundschaft durchs Reden');
  s.inv.kirschtorte = 2;
  const out = act(s, { t: 'gift', id: 'mira', item: 'kirschtorte' });
  assert.equal(out.reaction, 'love');
  assert.equal(act(s, { t: 'gift', id: 'mira', item: 'kirschtorte' }).ok, false, 'ein Geschenk pro Tag');
  s.npc.mira.f = 250;
  tick(s, DAY, true);
  assert.equal(s.mail.length, 1, 'Brief bei 2 Herzen');
  assert.ok(act(s, { t: 'mail', i: 0 }).ok);
  assert.ok(s.inv.apfelkuchen >= 1, 'Geschenk aus dem Brief');
  assert.ok(s.orders.every(o => o.npc && ITEMS[o.item]), 'Wünsche kommen von Nachbarn');
});

test('Zuhause: Möbel stellen, Kollision, Schlafen', async () => {
  const S = await import('../src/state.js');
  const s = newFarm();
  s.inv.bett = 1; s.inv.stuhl = 1;
  assert.ok(act(s, { t: 'hplace', x: 1, z: -2, item: 'bett', r: 0 }).ok, 'Doppelbett 2×2');
  assert.equal(act(s, { t: 'hplace', x: 2, z: -1, item: 'stuhl', r: 0 }).ok, false, 'Bett belegt die Kachel');
  assert.ok(S.blocked(s, S.HOME_X + 1.5, -1.5), 'man läuft nicht durchs Bett');
  assert.ok(!S.blocked(s, S.HOME_X, 1), 'freier Boden');
  s.dayTime = 0.8;
  const d = s.day;
  assert.ok(S.sleepThrough(s));
  assert.equal(s.day, d + 1);
});

test('Quests: Geschichte und Tagesaufgaben mit Belohnung', () => {
  const s = newFarm();
  assert.equal(s.daily.length, 3);
  const trees = Object.keys(RES_SPOTS).filter(k => RES_SPOTS[k] === 'tree').slice(0, 3);
  for (const k of trees) { const [x, z] = k.split(',').map(Number); act(s, { t: 'shake', x, z }); }
  assert.ok(s.quest.done, 'erste Quest: 3 Bäume geschüttelt');
  const m = s.money, out = act(s, { t: 'claim', q: 'story' });
  assert.ok(out.ok);
  assert.equal(s.money, m + STORY[0].money);
  assert.equal(s.quest.i, 1);
  assert.equal(act(s, { t: 'claim', q: 'story' }).ok, false, 'nicht doppelt');
  assert.equal(act(s, { t: 'claim', q: 7 }).ok, false);
  for (const q of STORY) for (const id of Object.keys(q.items || {})) assert.ok(id in ITEMS, 'Belohnung existiert: ' + id);
  for (const d of DAILY) assert.equal(d.length, 4);
});
