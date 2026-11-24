// Inselleben-Erweiterungen: Zeitung, Fotobuch, Jahrestage, Katalog, Wochenziele, Wetter, Gärtnerei-Technik,
// Schatzkarte, Edelstein-Werkzeuge, Kochwettbewerb, Nachtmarkt, Tauschstand, Sternenrakete
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newFarm, migrate, act, tick, key, canPlace, bindInv } from '../src/state.js';
import * as X from '../src/extras.js';
import { ITEMS, DAY, CROPS, WEEKDAYS } from '../src/data.js';

const old = () => JSON.parse(readFileSync(new URL('./fixtures/old-save.json', import.meta.url), 'utf8'));
const freeSpot = (s, skip = []) => { for (let x = -18; x <= 18; x++) for (let z = -6; z <= 20; z++) if (canPlace(s, x, z) && !skip.includes(key(x, z))) return [x, z]; };
const nextDay = s => { const d = s.day; s.dayTime = 1; tick(s, 0.01, true); assert.equal(s.day, d + 1); };

test('Alter Spielstand bekommt Zeitung, Fotobuch, Jahrestage, Katalog und Wochenziele', () => {
  const s = migrate(old());
  assert.equal(s.paper.day, s.day);
  assert.ok(s.book.length >= 1 && s.book[0].k === 'start');
  assert.match(s.anniv.founded, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(s.week.goals.length, 3);
  assert.ok(X.WEATHER[s.wxNext]);
  // Was aufgestellt ist, steht im Katalog
  for (const o of Object.values(s.obj)) if (X.catalogOk(o.k)) assert.ok(s.catalog[o.k]);
  // zweimal laden ändert nichts mehr
  const again = migrate(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(again.book, s.book);
  assert.deepEqual(again.anniv, s.anniv);
});

test('Wetter mit Vorhersage: morgen kommt, was die Zeitung sagt', () => {
  const s = migrate(newFarm('T'));
  for (let i = 0; i < 12; i++) {
    const fore = s.wxNext;
    nextDay(s);
    assert.equal(s.weather, fore);
    assert.ok(X.WEATHER[s.weather]);
    assert.equal(s.paper.day, s.day);
  }
  s.weather = 'storm';
  assert.ok(X.isWet(s));
  s.weather = 'fog';
  assert.ok(!X.isWet(s));
});

test('Wetter-Fische und -Insekten gibt es nur bei ihrem Wetter', () => {
  const s = migrate(newFarm('T'));
  s.weather = 'fog';
  const seen = new Set();
  for (let i = 0; i < 400; i++) { const o = act(s, { t: 'bug', x: 0, z: 5 }); if (o.ok) seen.add(o.caught); }
  assert.ok(seen.has('nebelfalter'), 'im Nebel: Nebelfalter');
  assert.ok(!seen.has('gewitterkaefer'));
});

test('Fotobuch: Momente kommen einmal', () => {
  const s = migrate(newFarm('T'));
  s.stats.fish = 1;
  const o = { fx: [] };
  X.checkMoments(s, o);
  assert.equal(o.moment?.k, 'fish1');
  X.checkMoments(s, (o.moment = null, o));
  assert.ok(!o.moment);
  assert.equal(s.book.filter(p => p.k === 'fish1').length, 1);
});

test('Jahrestage: eigener Tag heute = Geschenk, Fotobuch-Seite, Feuerwerk', () => {
  const s = migrate(newFarm('T')), t = X.realToday();
  assert.equal(X.annivToday(s), null, 'am Gründungstag selbst noch kein Jubiläum');
  const r = act(s, { t: 'anniv', op: 'add', name: 'Unser Jahrestag', date: `2020-${t.md}` });
  assert.ok(r.ok);
  assert.equal(X.annivToday(s)?.name, 'Unser Jahrestag');
  assert.ok(X.fireworksTonight(s));
  assert.ok(s.mail.some(m => /Unser Jahrestag/.test(m.title)));
  const mails = s.mail.length;
  tick(s, 0.01, true);
  assert.equal(s.mail.length, mails, 'nur einmal pro Jahr');
  assert.ok(act(s, { t: 'anniv', op: 'founded', date: `${t.y - 2}-${t.md}` }).ok);
  assert.equal(X.annivToday(s).years, 2);
  assert.equal(act(s, { t: 'anniv', op: 'add', name: '', date: 'kaputt' }).ok, false);
});

test('Katalog: alles einmal Besessene nachbestellen', () => {
  const s = migrate(newFarm('T'));
  s.money = 100000;
  bindInv(s, 'host');
  s.level = 5;
  assert.ok(act(s, { t: 'buy', id: 'stuhl', n: 1 }).ok);
  assert.ok(s.catalog.stuhl);
  assert.ok(act(s, { t: 'catbuy', id: 'stuhl' }).ok);
  assert.equal(s.inv.stuhl, 2);
  assert.equal(act(s, { t: 'catbuy', id: 'klavier' }).ok, false, 'nie besessen');
});

test('Wochenziele: gemeinsam schaffen, seltener Preis per Post', () => {
  const s = migrate(newFarm('T'));
  s.week = { start: s.day, goals: [{ i: 0, p: 0, done: 0 }, { i: 3, p: 0, done: 0 }, { i: 11, p: 0, done: 0 }], prize: 'sternglobus' };
  const out = { fx: [] };
  X.weekEvent(s, 'fish', 20, out);
  assert.ok(out.weekGoal);
  X.weekEvent(s, 'chop', 25, out);
  X.weekEvent(s, 'mine', 12, out);
  assert.ok(s.week.won);
  assert.ok(s.mail.some(m => m.item === 'sternglobus'));
});

test('Gewächshaus und Sprinkler', () => {
  const s = migrate(newFarm('T'));
  const [x, z] = freeSpot(s);
  s.obj[key(x, z)] = { k: 'sprinkler', r: 0 };
  const off = Object.keys(CROPS).find(k => !CROPS[k].sea.includes('spring') && CROPS[k].sea.length < 4);
  s.tiles[key(x + 1, z)] = { w: 0, c: { k: off, g: 0 } };
  s.weather = 'sun';
  tick(s, 1, true);
  assert.ok(s.tiles[key(x + 1, z)].w > 0, 'Sprinkler gießt');
  const g1 = s.tiles[key(x + 1, z)].c.g;
  s.obj[key(x, z + 1)] = { k: 'gewaechshaus', r: 0 };
  tick(s, 1, true);
  assert.ok(s.tiles[key(x + 1, z)].c.g - g1 > 0.9, 'im Gewächshaus volle Geschwindigkeit außerhalb der Saison');
});

test('Schatzkarte: vier Stücke, Kreuz, großer Schatz', () => {
  const s = migrate(newFarm('T'));
  bindInv(s, 'host');
  s.tmap = { n: 3, spot: null };
  let out = { fx: [] };
  for (let i = 0; i < 200 && !s.tmap.spot; i++) X.mapPiece(s, out);
  assert.ok(s.tmap.spot, 'Kreuz gesetzt');
  const [x, z] = s.tmap.spot.split(',').map(Number), money = s.money;
  out = act(s, { t: 'dig', x, z });
  assert.ok(out.ok);
  assert.ok(s.money >= money + 15000);
  assert.equal(s.inv.schatzkiste, 1);
  assert.equal(s.tmap.spot, null);
});

test('Edelstein-Werkzeuge: bauen ohne Bauplan, Vorteile wirken', () => {
  const s = migrate(newFarm('T'));
  bindInv(s, 'host');
  Object.assign(s.inv, { amethyst: 2, holz: 10, eisen: 10 });
  assert.ok(act(s, { t: 'craft', id: 't_kristallaxt' }).ok);
  assert.equal(s.inv.kristallaxt, 1);
  const tree = Object.keys(s.res).find(k => X && s.res[k] === 3 && !s.obj[k]);
  assert.ok(tree);
});

test('Kochwettbewerb: Jury bewertet, Sieg = Geheimrezept', () => {
  const s = migrate(newFarm('T'));
  bindInv(s, 'host');
  while (s.day % 7 !== 1) nextDay(s); // Sonntag
  assert.equal(WEEKDAYS[(s.day - 1) % 7], 'Sonntag');
  s.dayTime = (10 - 6) / 18;
  assert.ok(s.cook && !s.cook.done);
  s.inv.apfelkuchen = 2;
  const r = act(s, { t: 'cookin', id: 'apfelkuchen', name: 'Shawn' });
  assert.ok(r.ok, r.msg);
  assert.equal(r.cookVotes.length, 3);
  s.dayTime = (18.5 - 6) / 18;
  tick(s, 0.01, true);
  assert.ok(s.cook.done);
  assert.ok(s.recipes.x_sternentorte, 'Geheimrezept gelernt');
  assert.equal(act(s, { t: 'cookin', id: 'apfelkuchen', name: 'Shawn' }).ok, false, 'vorbei');
});

test('Nachtmarkt: freitags ab 18 Uhr, echt oder gefälscht', () => {
  const s = migrate(newFarm('T'));
  bindInv(s, 'host');
  while ((s.day - 1) % 7 !== 5) nextDay(s);
  assert.ok(s.night?.offers.length === 4);
  assert.ok(s.night.offers.some(o => !o.fake), 'mindestens ein echtes Stück');
  assert.equal(act(s, { t: 'nightbuy', i: 0 }).ok, false, 'vor 18 Uhr zu');
  s.dayTime = (19 - 6) / 18;
  s.money = 100000;
  for (let i = 0; i < 4; i++) assert.ok(act(s, { t: 'nightbuy', i }).ok);
  const real = s.night.offers.filter(o => !o.fake).length;
  assert.equal(real, s.night.offers.filter(o => s.inv[o.id]).length);
});

test('Tauschstand: anbieten, Nachbarn kaufen, tauschen', () => {
  const s = migrate(newFarm('T'));
  bindInv(s, 'host');
  s.inv.apfel = 10;
  assert.ok(act(s, { t: 'stalladd', id: 'apfel', n: 5, price: 400, name: 'Shawn' }).ok);
  assert.equal(s.inv.apfel, 5);
  const m = s.money;
  for (let i = 0; i < 50 && s.stall.offers.length; i++) tick(s, 25, true);
  assert.equal(s.stall.offers.length, 0, 'verkauft');
  assert.equal(s.money, m + 400);
  // Tausch zwischen zwei Taschen
  s.inv.holz = 3;
  assert.ok(act(s, { t: 'stalladd', id: 'holz', n: 3, want: 'apfel', wn: 2, name: 'Shawn' }).ok);
  bindInv(s, 'u_abcdefgh');
  s.inv.apfel = 2;
  assert.ok(act(s, { t: 'stallswap', i: 0, name: 'Mia' }).ok);
  assert.equal(s.inv.holz, 3);
  assert.equal(s.pinv.host.apfel, 7);
});

test('Fünf Sterne: Sternenfest und Sternenrakete', () => {
  const s = migrate(newFarm('T'));
  s.stars = 5;
  nextDay(s);
  assert.ok(s.mail.some(m => m.item === 'sternenrakete'));
  assert.equal(s.fw?.day, s.day - (s.fw.day === s.day ? 0 : 1) + (s.fw.day === s.day ? 0 : 1));
  const [x, z] = freeSpot(s);
  s.obj[key(x, z)] = { k: 'sternenrakete', r: 0 };
  s.fw = null;
  assert.ok(act(s, { t: 'fwstart', x, z }).ok);
  assert.ok(X.fireworksTonight(s));
  assert.equal(act(s, { t: 'fwstart', x, z }).ok, false, 'nur einmal am Tag');
});
